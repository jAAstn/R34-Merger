// Unit-Tests für den zentralen Netzwerk-Client (src/api.js).
// Die Tests verwenden ausschließlich gemockte Fetch-Responses und enthalten
// keine echten Zugangsdaten oder Netzwerkaufrufe.

globalThis.window = {
  location: { href: 'https://rule34.xxx/index.php?page=favorites&s=view&id=1234' },
};
globalThis.document = { baseURI: 'https://rule34.xxx/' };

const {
  AbortError,
  RateLimiter,
  RequestError,
  buildOfficialPostUrl,
  getRetryDelayMs,
  isAbortError,
  isRetryableError,
  isRetryableStatus,
  parseRetryAfter,
  pickPostMetadata,
  request,
  selectEnrichmentCandidates,
} = await import('../src/api.js');

let pass = 0;
let fail = 0;
const eq = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const check = (description, actual, expected) => {
  const ok = eq(actual, expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? '  ✓ ' : '  ✗ '}${description}${ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`}`);
};
const rejects = async (promise, predicate) => {
  try {
    await promise;
    return false;
  } catch (error) {
    return predicate(error);
  }
};
const response = ({ ok = true, status = 200, body = '', headers = {} } = {}) => ({
  ok,
  status,
  headers: { get: name => headers[name] ?? null },
  text: async () => body,
  json: async () => JSON.parse(body),
});

console.log('Retry-Status und Backoff:');
check('408/429/5xx sind retryable', [408, 429, 500, 503].every(isRetryableStatus), true);
check('404 ist nicht retryable', isRetryableStatus(404), false);
check('Retry-After als Sekunden', parseRetryAfter('2.5'), 2500);
check('Retry-After als HTTP-Datum', parseRetryAfter('Thu, 01 Jan 1970 00:00:10 GMT', 0), 10_000);
check('Exponentieller Backoff', getRetryDelayMs(1, { random: () => 0 }), 1000);
check('Backoff verdoppelt sich', getRetryDelayMs(3, { random: () => 0 }), 4000);
check('Retry-After wird nicht verkürzt', getRetryDelayMs(1, { retryAfterMs: 60_000, random: () => 0 }), 60_000);
check('AbortError ist nicht retryable', isRetryableError(new AbortError()), false);
check('TypeError ist retryable', isRetryableError(new TypeError('network')), true);

console.log('Zentraler Request-Client:');
let calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  return calls === 1
    ? response({ ok: false, status: 503 })
    : response({ body: 'ok' });
};
const retryResult = await request('https://example.test/retry', {
  maxAttempts: 2,
  retryDelay: () => 0,
  timeoutMs: 100,
});
check('503 wird einmal wiederholt', [retryResult, calls], ['ok', 2]);

calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  if (calls < 3) throw new TypeError('temporary network failure');
  return response({ body: '{"ok":true}' });
};
const networkResult = await request('https://example.test/network', {
  responseType: 'json',
  maxAttempts: 3,
  retryDelay: () => 0,
  timeoutMs: 100,
});
check('Network Errors werden retryt', [networkResult.ok, calls], [true, 3]);

calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  return response({ ok: false, status: 404 });
};
const noRetry = await rejects(
  request('https://example.test/not-found', {
    maxAttempts: 4,
    retryDelay: () => 0,
    timeoutMs: 100,
  }),
  error => error instanceof RequestError && error.status === 404 && error.kind === 'http',
);
check('404 wird nicht wiederholt', [noRetry, calls], [true, 1]);

console.log('Timeout und Abbruch:');
globalThis.fetch = async () => new Promise(() => {});
const timeoutError = await rejects(
  request('https://example.test/timeout', { maxAttempts: 1, timeoutMs: 10 }),
  error => error instanceof RequestError && error.kind === 'timeout',
);
check('Timeout wird als RequestError klassifiziert', timeoutError, true);
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => new Promise(() => {}),
});
const bodyTimeout = await rejects(
  request('https://example.test/body-timeout', { maxAttempts: 1, timeoutMs: 10 }),
  error => error instanceof RequestError && error.kind === 'timeout',
);
check('Timeout deckt auch Response-Body ab', bodyTimeout, true);

const abortController = new AbortController();
const abortPromise = request('https://example.test/abort', {
  maxAttempts: 1,
  timeoutMs: 10_000,
  signal: abortController.signal,
});
setTimeout(() => abortController.abort(), 5);
check('externer Abbruch wird nicht retryt', await rejects(
  abortPromise,
  error => isAbortError(error),
), true);

console.log('RateLimiter:');
const limiter = new RateLimiter({ concurrency: 2, minIntervalMs: 0 });
let active = 0;
let maxActive = 0;
await Promise.all(Array.from({ length: 6 }, () => limiter.run(async () => {
  active += 1;
  maxActive = Math.max(maxActive, active);
  await new Promise(resolve => setTimeout(resolve, 2));
  active -= 1;
})));
check('Concurrency wird begrenzt', maxActive <= 2, true);

const pacedLimiter = new RateLimiter({ concurrency: 2, minIntervalMs: 20 });
const starts = [];
await Promise.all([0, 1].map(() => pacedLimiter.run(async () => {
  starts.push(Date.now());
})));
check('Min-Interval verhindert Burst', starts[1] - starts[0] >= 15, true);

console.log('Credential-Sicherheit und URL-Fehler:');
check('ohne Build-Credentials wird keine API-URL gebaut', buildOfficialPostUrl('123'), null);
globalThis.fetch = async () => response({ ok: false, status: 400 });
let safeError = null;
try {
  await request('https://example.test/api?api_key=do-not-log-this&user_id=123', { maxAttempts: 1 });
} catch (error) {
  safeError = error;
}
check('API-Key wird aus Fehlermeldungen redigiert', [
  safeError?.message.includes('do-not-log-this'),
  safeError?.message.includes('redacted'),
], [false, true]);

// v4.31: Die API ignoriert `fields` und liefert immer den vollen Satz – der
// Parameter wurde deshalb entfernt. Ohne Credentials im Build gibt es keine URL.
console.log('Metadaten-Anreicherung:');
const apiUrl = buildOfficialPostUrl('42', { origin: 'https://api.test', userId: '7', apiKey: 'k' });
const parsedApiUrl = new URL(apiUrl);
check('kein fields-Parameter (No-Op der API)', parsedApiUrl.searchParams.has('fields'), false);
check('URL-Form wie erwartet', [
  parsedApiUrl.origin + parsedApiUrl.pathname,
  parsedApiUrl.searchParams.get('page'),
  parsedApiUrl.searchParams.get('s'),
  parsedApiUrl.searchParams.get('q'),
  parsedApiUrl.searchParams.get('json'),
  parsedApiUrl.searchParams.get('id'),
  parsedApiUrl.searchParams.get('user_id'),
  parsedApiUrl.searchParams.get('api_key'),
], ['https://api.test/index.php', 'dapi', 'post', 'index', '1', '42', '7', 'k']);
check('nur eine Credential → keine URL',
  buildOfficialPostUrl('42', { origin: 'https://api.test', userId: '7', apiKey: '' }), null);
check('gleiche ID wird nicht akzeptiert', pickPostMetadata([{ id: 43, score: 1 }], '42'), null);
check('pick: Array-Form', pickPostMetadata([{ id: 42, score: '17' }], '42'), { id: '42', score: 17 });
check('pick: { post: … }', pickPostMetadata({ post: { id: 42, score: '17' } }, '42'), { id: '42', score: 17 });
check('pick: { posts: [ … ] }', pickPostMetadata({ posts: [{ id: 42, score: '17' }] }, '42'), { id: '42', score: 17 });
check('pick: Score 0 bleibt 0', pickPostMetadata([{ id: 42, score: '0' }], '42'), { id: '42', score: 0 });
check('pick: fehlender Score → null', pickPostMetadata([{ id: 42 }], '42'), { id: '42', score: null });
check('pick: leere Antwort → null', pickPostMetadata([], '42'), null);
check('Kandidaten: nur ohne Score, dedupliziert',
  selectEnrichmentCandidates([{ id: '1', score: 5 }, { id: '2', score: null }, { id: '3' }, { id: '2', score: null }], 10)
    .map(post => post.id),
  ['2', '3']);
check('Kandidaten: maxItems begrenzt',
  selectEnrichmentCandidates([{ id: '1' }, { id: '2' }, { id: '3' }], 2).map(post => post.id),
  ['1', '2']);
check('Kandidaten: maxItems 0 → keine', selectEnrichmentCandidates([{ id: '1' }], 0).length, 0);
check('Kandidaten: Score 0 ist ein Wert, kein Loch',
  selectEnrichmentCandidates([{ id: '1', score: 0 }], 5).length, 0);

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
