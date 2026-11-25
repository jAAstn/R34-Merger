// api.js – zentraler Netzwerk-Client für HTML- und optionale JSON-API-Aufrufe.
import { state, parseFavoriteCount } from './core.js';
import { API_CONFIG, hasApiCredentials } from './config.js';

export class RequestError extends Error {
  constructor(message, { kind = 'network', status = 0, retryAfterMs = 0, cause } = {}) {
    super(message);
    this.name = 'RequestError';
    this.kind = kind;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    if (cause !== undefined) this.cause = cause;
  }
}

export class AbortError extends Error {
  constructor(message = 'Request aborted') {
    super(message);
    this.name = 'AbortError';
    this.kind = 'aborted';
  }
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 422]);
// Cloudflare antwortet bei Verdacht mit HTTP 200 und einer CAPTCHA-Seite.
const CAPTCHA_MARKER = /Rule34\.xxx CAPTCHA|captcha-box/i;
const CAPTCHA_COOLDOWN_MS = 30_000;

export class RateLimiter {
  constructor({ concurrency, minIntervalMs }) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new Error('concurrency must be >= 1');
    }
    if (!Number.isFinite(minIntervalMs) || minIntervalMs < 0) {
      throw new Error('minIntervalMs must be >= 0');
    }
    this.concurrency = concurrency;
    this.minIntervalMs = minIntervalMs;
    this.active = 0;
    this.nextStartAt = 0;
    this.queue = [];
  }

  async run(fn, signal) {
    throwIfAborted(signal);
    await this.#acquire(signal);
    try {
      throwIfAborted(signal);
      await this.#waitForTurn(signal);
      return await fn();
    } finally {
      this.active -= 1;
      this.#releaseNext();
    }
  }

  async #acquire(signal) {
    if (this.active < this.concurrency) {
      this.active += 1;
      return;
    }

    await new Promise((resolve, reject) => {
      const entry = { resolve, reject, signal, onAbort: null };
      if (signal) {
        entry.onAbort = () => {
          const index = this.queue.indexOf(entry);
          if (index !== -1) this.queue.splice(index, 1);
          reject(new AbortError());
        };
        signal.addEventListener('abort', entry.onAbort, { once: true });
      }
      this.queue.push(entry);
    });
  }

  #releaseNext() {
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry.onAbort) entry.signal?.removeEventListener('abort', entry.onAbort);
      if (entry.signal?.aborted) {
        entry.reject(new AbortError());
        continue;
      }
      this.active += 1;
      entry.resolve();
      return;
    }
  }

  // Sperrt wartende und neue Requests für `ms` – z. B. nach einer
  // Cloudflare-CAPTCHA-Seite, damit nicht alle parallelen Seiten weiterlaufen.
  pauseFor(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    this.nextStartAt = Math.max(this.nextStartAt, Date.now() + ms);
  }

  async #waitForTurn(signal) {
    // Der Startzeitpunkt wird sofort reserviert. Dadurch können auch mehrere
    // parallel laufende Aufrufe nicht als Burst mit demselben Timestamp starten.
    const now = Date.now();
    const startAt = Math.max(now, this.nextStartAt);
    this.nextStartAt = startAt + this.minIntervalMs;
    const waitMs = startAt - now;
    if (waitMs > 0) await sleep(waitMs, signal);
    throwIfAborted(signal);
  }
}

export const pageRequestLimiter = new RateLimiter(API_CONFIG.page);
export const metadataRequestLimiter = new RateLimiter(API_CONFIG.metadata);

export function isRetryableStatus(status) {
  return RETRYABLE_STATUSES.has(status);
}

export function isRetryableError(error) {
  if (isAbortError(error)) return false;
  if (error instanceof TypeError) return true;
  return error instanceof RequestError && (error.kind === 'network' || error.kind === 'timeout');
}

export function isAbortError(error) {
  return error instanceof AbortError || error?.name === 'AbortError';
}

export function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(String(value));
  if (Number.isFinite(date)) return Math.max(0, date - now);
  return 0;
}

export function getRetryDelayMs(attempt, { retryAfterMs = 0, random = Math.random } = {}) {
  const exponential = API_CONFIG.retryBaseMs * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(random() * API_CONFIG.retryJitterMs);
  // Retry-After ist eine Server-Vorgabe und darf nicht durch unser eigenes
  // Backoff-Maximum verkürzt werden.
  return Math.max(retryAfterMs, Math.min(API_CONFIG.maxBackoffMs, exponential + jitter));
}

export function sleep(ms, signal) {
  if (ms <= 0) {
    throwIfAborted(signal);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    let timer;
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new AbortError());
    };
    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new AbortError();
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  let rejectAbort;
  const abortPromise = new Promise((_, reject) => { rejectAbort = reject; });
  const onAbort = () => {
    controller.abort();
    rejectAbort(new Error('request aborted'));
  };
  const timer = setTimeout(() => {
    timedOut = true;
    onAbort();
  }, timeoutMs);
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    abortPromise,
    get timedOut() { return timedOut; },
    cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

function safeUrlForLog(url) {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (/key|token|secret|auth/i.test(key)) parsed.searchParams.set(key, '[redacted]');
    }
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
}

function responseError(response, url) {
  return new RequestError(`HTTP ${response.status} for ${safeUrlForLog(url)}`, {
    kind: response.status >= 400 && response.status < 500 ? 'http' : 'server',
    status: response.status,
    retryAfterMs: parseRetryAfter(response.headers?.get?.('Retry-After')),
  });
}

export async function request(url, {
  method = 'GET',
  headers = {},
  body,
  signal,
  timeoutMs = API_CONFIG.timeoutMs,
  limiter,
  maxAttempts = API_CONFIG.maxAttempts,
  responseType = 'text',
  retryDelay = getRetryDelayMs,
} = {}) {
  const options = { method, headers, body, signal, timeoutMs, maxAttempts, responseType, retryDelay };
  if (limiter) return limiter.run(() => requestWithoutLimiter(url, options), signal);
  return requestWithoutLimiter(url, options);
}

async function requestWithoutLimiter(url, options) {
  const {
    method, headers, body, signal, timeoutMs, maxAttempts, responseType, retryDelay,
  } = options;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    throwIfAborted(signal);
    lastError = null;
    const timeout = withTimeout(signal, timeoutMs);
    try {
      let response;
      try {
        const fetchPromise = fetch(url, {
          method,
          headers,
          body,
          signal: timeout.signal,
        });
        // Promise.race erzwingt den Timeout auch bei Fetch-Mocks oder
        // Implementierungen, die den Abort-Signal nicht sofort beachten.
        response = await Promise.race([fetchPromise, timeout.abortPromise]);
      } catch (error) {
        if (signal?.aborted) throw new AbortError();
        if (isAbortError(error) && !timeout.timedOut) throw new AbortError();
        lastError = timeout.timedOut
          ? new RequestError(`Request timeout for ${safeUrlForLog(url)}`, { kind: 'timeout', cause: error })
          : new RequestError(`Network error for ${safeUrlForLog(url)}`, { kind: 'network', cause: error });
      }

      if (lastError) {
        if (attempt >= maxAttempts || !isRetryableError(lastError)) throw lastError;
        await sleep(retryDelay(attempt, { retryAfterMs: lastError.retryAfterMs }), signal);
        continue;
      }

      if (!response.ok) {
        const error = responseError(response, url);
        if (NO_RETRY_STATUSES.has(response.status) || !isRetryableStatus(response.status) || attempt >= maxAttempts) {
          throw error;
        }
        lastError = error;
        await sleep(retryDelay(attempt, { retryAfterMs: error.retryAfterMs }), signal);
        continue;
      }

      try {
        const bodyPromise = responseType === 'json'
          ? response.json()
          : responseType === 'blob'
            ? response.blob()
            : response.text();
        return await Promise.race([bodyPromise, timeout.abortPromise]);
      } catch (error) {
        if (signal?.aborted) throw new AbortError();
        if (isAbortError(error) && !timeout.timedOut) throw new AbortError();
        if (timeout.timedOut) {
          throw new RequestError(`Request timeout for ${safeUrlForLog(url)}`, {
            kind: 'timeout',
            cause: error,
          });
        }
        throw new RequestError(`Invalid response body for ${safeUrlForLog(url)}`, {
          kind: 'parse',
          cause: error,
        });
      }
    } catch (error) {
      if (error instanceof AbortError || error?.name === 'AbortError') throw error;
      if (error instanceof RequestError && (error.kind === 'http' || error.kind === 'parse')) throw error;
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableError(error)) throw error;
      await sleep(retryDelay(attempt), signal);
    } finally {
      timeout.cleanup();
    }
  }

  throw lastError ?? new RequestError(`Request failed for ${safeUrlForLog(url)}`);
}

const FAV_COUNT_TTL_MS = 5_000;
let favCountCache = { uid: null, value: null, at: 0 };
const favCountInFlight = new Map();

// `force` umgeht den 5s-Cache (auch den cacheten Fehlerwert), damit ein
// fehlgeschlagener Count beim Klick auf Search erneut versucht wird.
export function getFavoritesCount(uid, options = {}) {
  const { force = false, ...requestOptions } = options;
  const key = String(uid);
  const now = Date.now();
  if (!force && favCountCache.uid === key && now - favCountCache.at < FAV_COUNT_TTL_MS) {
    return Promise.resolve(favCountCache.value);
  }
  if (!favCountInFlight.has(key)) {
    const requestPromise = request(
      `https://rule34.xxx/index.php?page=account&s=profile&id=${encodeURIComponent(key)}`,
      { ...requestOptions, limiter: requestOptions.limiter ?? pageRequestLimiter, responseType: 'text' },
    )
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const favLink = Array.from(doc.querySelectorAll('a'))
          .find(a => a.href.includes('page=favorites&s=view'));
        if (!favLink || favLink.textContent === null) {
          throw new RequestError('Favorites link not found', { kind: 'parse' });
        }
        const count = parseFavoriteCount(favLink.textContent);
        favCountCache = { uid: key, value: count, at: Date.now() };
        return count;
      })
      .catch(error => {
        if (isAbortError(error)) throw error;
        favCountCache = { uid: key, value: null, at: Date.now() };
        console.error('Error fetching favorites count:', error.message);
        return null;
      })
      .finally(() => favCountInFlight.delete(key));
    favCountInFlight.set(key, requestPromise);
  }
  return favCountInFlight.get(key);
}

export async function addFavorite(id, options = {}) {
  try {
    const text = await request(
      `https://rule34.xxx/public/addfav.php?id=${encodeURIComponent(id)}`,
      { ...options, limiter: options.limiter ?? pageRequestLimiter, responseType: 'text' },
    );
    return Number.parseInt(text, 10) === 3;
  } catch (error) {
    if (!isAbortError(error)) console.error('Add favorite failed:', error.message);
    return false;
  }
}

export async function removeFavorite(id, options = {}) {
  try {
    await request(
      `https://rule34.xxx/index.php?page=favorites&s=delete&id=${encodeURIComponent(id)}&return`,
      { ...options, limiter: options.limiter ?? pageRequestLimiter, responseType: 'text' },
    );
    return true;
  } catch (error) {
    if (!isAbortError(error)) console.error('Remove favorite failed:', error.message);
    throw error;
  }
}

export async function fetchFavoritesPage(page, options = {}) {
  const url = `https://rule34.xxx/index.php?page=favorites&s=view&id=${encodeURIComponent(state.userId)}&pid=${page * 50}`;
  try {
    const html = await request(url, {
      ...options,
      limiter: options.limiter ?? pageRequestLimiter,
      responseType: 'text',
      timeoutMs: options.timeoutMs ?? API_CONFIG.page.timeoutMs,
    });
    // CAPTCHA statt Fehlerseite: kein Retry-Hagel, sondern eine Pause für den
    // gesamten Seiten-Limiter. Die Seite gilt als fehlgeschlagen (Retry-Button).
    if (CAPTCHA_MARKER.test(html)) {
      pageRequestLimiter.pauseFor(CAPTCHA_COOLDOWN_MS);
      throw new RequestError(`CAPTCHA on page ${page}`, { kind: 'challenge', status: 200 });
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc.querySelector('.thumb img[src]')) {
      throw new RequestError('Favorites page contains no thumbnails', { kind: 'parse' });
    }
    return doc;
  } catch (error) {
    if (isAbortError(error)) throw error;
    state.lastScanError = `page ${page}: ${error.message}`;
    console.error(`Page ${page}: failed after retries.`, error.message);
    return null;
  }
}

// Die Zugangsdaten sind bewusst Parameter (Default: Build-Konfiguration), damit
// die URL-Form testbar ist, ohne echte Credentials zu brauchen.
// Ein `fields`-Parameter wird bewusst NICHT gesendet: die API liefert
// unabhängig davon immer den vollen Satz (live verifiziert, 23 Felder bei
// `fields=tag_info`); der Parameter war ein No-Op aus dem in v4.29 entfernten
// Tag-Feature und erzeugte nur falsche Erwartungen.
export function buildOfficialPostUrl(id, {
  origin = API_CONFIG.origin,
  userId = API_CONFIG.userId,
  apiKey = API_CONFIG.apiKey,
} = {}) {
  if (!userId || !apiKey) return null;
  const params = new URLSearchParams({
    page: 'dapi',
    s: 'post',
    q: 'index',
    json: '1',
    id: String(id),
    user_id: userId,
    api_key: apiKey,
  });
  return `${origin}/index.php?${params.toString()}`;
}

// Antwortform des Endpunkts tolerieren: die Payload kommt je nach Aufruf als
// Array, als { post: … } oder als { posts: [ … ] }. Nur der Score ist für das
// Script relevant – er ist das einzige Metadatenfeld, das die Galerie
// tatsächlich anzeigt (Score-Sortierung und Thumb-Tooltip).
export function pickPostMetadata(payload, id) {
  const post = Array.isArray(payload)
    ? payload[0]
    : Array.isArray(payload?.post)
      ? payload.post[0]
      : payload?.post
        ?? (Array.isArray(payload?.posts) ? payload.posts[0] : payload?.posts);
  if (!post || String(post.id) !== String(id)) return null;
  const score = Number(post.score);
  return { id: String(post.id), score: Number.isFinite(score) ? score : null };
}

// Kandidaten für die Anreicherung: nur Posts, deren Score im HTML nicht
// gefunden wurde. Duplikate (gleiche ID) werden zusammengefasst, damit ein Post
// nicht mehrfach angefragt wird.
export function selectEnrichmentCandidates(posts, maxItems) {
  if (!Array.isArray(posts)) return [];
  const limit = Number.isFinite(maxItems) && maxItems > 0 ? maxItems : 0;
  return posts
    .filter(post => post && (post.score === null || post.score === undefined))
    .filter((post, index, list) => list.findIndex(other => String(other.id) === String(post.id)) === index)
    .slice(0, limit);
}

export async function fetchPostMetadata(id, options = {}) {
  const url = buildOfficialPostUrl(id);
  if (!url) return null;
  const payload = await request(url, {
    ...options,
    limiter: options.limiter ?? metadataRequestLimiter,
    responseType: 'json',
    timeoutMs: options.timeoutMs ?? API_CONFIG.metadata.timeoutMs,
  });
  return pickPostMetadata(payload, id);
}

// Nur der fehlende Score wird nachgetragen – er ist der einzige Wert, den die
// Galerie anzeigt. Ohne Credentials (oeffentlicher Build) ist das ein No-Op.
export async function enrichPostMetadata(posts, options = {}) {
  if (!hasApiCredentials() || !Array.isArray(posts) || posts.length === 0) return posts;
  const candidates = selectEnrichmentCandidates(
    posts,
    options.maxItems ?? API_CONFIG.metadata.maxItemsPerScan,
  );

  for (const post of candidates) {
    try {
      const metadata = await fetchPostMetadata(post.id, options);
      if (metadata?.score !== null && metadata?.score !== undefined) {
        post.score = metadata.score;
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.warn(`Metadata enrichment failed for post ${post.id}: ${error.message}`);
      // Ein 404 kann einen einzelnen Post betreffen; Netzwerk-/Auth-/Parse-
      // Fehler gelten dagegen für den gesamten API-Weg. Weitere Kandidaten
      // würden denselbenFehler nur wiederholen (und bei CORS lange warten).
      if (error.status !== 404) break;
    }
  }
  return posts;
}
