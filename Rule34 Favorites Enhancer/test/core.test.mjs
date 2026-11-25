// Unit-Tests für core.js (ID-Extraktion) und storage.js (Queues) –
// reine Logik ohne echtes DOM/GM/IndexedDB. localStorage und setTimeout
// werden gemockt, damit die Queue-Funktionen deterministisch testbar sind.
// core.js liest window.location beim Modul-Load (pageType), daher wird vor
// dem Import ein minimales window/document-Stub gesetzt.
// Lauf: node test/core.test.mjs

globalThis.window = { location: { href: 'https://rule34.xxx/index.php?page=favorites&s=view&id=1234' } };
globalThis.document = { baseURI: 'https://rule34.xxx/' };

// ── Mocks ───────────────────────────────────────────────────────────────────
// localStorage (Map-basiert)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
// setTimeout/clearTimeout abfangen, damit saveQueuesDebounced() deterministisch ist
const pendingTimers = [];
globalThis.setTimeout = (fn, ms) => { pendingTimers.push({ fn, ms }); return pendingTimers.length; };
globalThis.clearTimeout = () => {};

const {
  getIdFromUrl, getPostIdFromLink, getImageId, getThumbImgId, state,
} = await import('../src/core.js');
const {
  getRemovalQueue, clearRemovalQueue, addToRemovalQueue, removeFromRemovalQueue,
  getAdditionalQueue, clearAdditionalQueue, addToAdditionalQueue, removeFromAdditionalQueue,
} = await import('../src/storage.js');

let pass = 0, fail = 0;
const eq = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const check = (desc, actual, expected) => {
  const ok = eq(actual, expected);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`));
};
const resetQueues = () => {
  store.clear();
  state.removalQueueCache = new Set();
  state.additionalQueueCache = new Set();
  state.queueSaveTimeout = null;
  state.userId = undefined;
};
const flushTimers = () => { while (pendingTimers.length) pendingTimers.shift().fn(); };

// ── ID-Extraktion (Ergänzungen zu test/parser.test.mjs) ────────────────────
console.log('ID-Extraktion (Ergänzungen):');
check('getImageId: link hat Vorrang vor id', getImageId({ link: 'index.php?page=post&s=view&id=7', id: 99 }), '7');
check('getImageId: closest(a[href]) statt link', getImageId({ closest: () => ({ href: 'index.php?page=post&s=view&id=123' }) }), '123');
check('getPostIdFromLink: URL-encoded-Parameter', getPostIdFromLink('index.php?page=post&s=view&id=456&tags=%20'), '456');
globalThis.window.location.href = 'https://rule34.xxx/index.php?page=favorites&s=view&id=777';
check('getIdFromUrl: id am URL-Ende ohne &', getIdFromUrl(), '777');
check('getThumbImgId: closest anchor gewinnt vor src-Query', getThumbImgId({ src: 'thumb.jpg?888', closest: () => ({ href: 'index.php?page=post&s=view&id=42' }) }), '42');

// ── removalQueue ───────────────────────────────────────────────────────────
console.log('removalQueue:');
resetQueues();
check('anfangs leer', getRemovalQueue(), []);
addToRemovalQueue('12');
check('add → String-Liste', getRemovalQueue(), ['12']);
addToRemovalQueue(13);
check('Zahl wird zu String', getRemovalQueue(), ['12', '13']);
addToRemovalQueue('12');
check('Duplikat wird dedupliziert', getRemovalQueue(), ['12', '13']);
removeFromRemovalQueue('12');
check('remove entfernt Eintrag', getRemovalQueue(), ['13']);
clearRemovalQueue();
check('clear leert alles', getRemovalQueue(), []);
check('clear löscht localStorage-Key', store.has('removalQueue'), false);

// ── additionalQueue ────────────────────────────────────────────────────────
console.log('additionalQueue:');
resetQueues();
check('anfangs leer', getAdditionalQueue(), []);
addToAdditionalQueue('9');
check('add', getAdditionalQueue(), ['9']);
removeFromAdditionalQueue('9');
check('remove', getAdditionalQueue(), []);
addToAdditionalQueue('7');
clearAdditionalQueue();
check('clear', getAdditionalQueue(), []);

// ── Debounced Persistenz ───────────────────────────────────────────────────
console.log('Debounced Persistenz (saveQueuesDebounced):');
resetQueues();
addToRemovalQueue('5');
check('vor Flush: nur im Cache', store.has('removalQueue'), false);
check('vor Flush: getRemovalQueue sieht Cache', getRemovalQueue(), ['5']);
flushTimers();
check('nach Flush: in localStorage', JSON.parse(store.get('removalQueue')), ['5']);
check('nach Flush: Cache geleert', state.removalQueueCache.size, 0);
check('nach Flush: getRemovalQueue weiterhin korrekt', getRemovalQueue(), ['5']);

resetQueues();
store.set('removalQueue', JSON.stringify(['1', '2']));
addToRemovalQueue('3');
flushTimers();
check('Cache wird mit Bestand gemerged', JSON.parse(store.get('removalQueue')).sort(), ['1', '2', '3']);

// ── Typ-Sicherheit & Scoped Keys ───────────────────────────────────────────
console.log('Typ-Sicherheit & Scoped Keys:');
resetQueues();
store.set('removalQueue', '{"x":1}');
check('Objekt-Wert statt Array → leeres Array', getRemovalQueue(), []);
resetQueues();
store.set('removalQueue', '"nicht-json');
check('kaputtes JSON → leeres Array', getRemovalQueue(), []);
resetQueues();
state.userId = '1234';
store.set('removalQueue:1234', JSON.stringify(['55']));
check('scoped Key (removalQueue:1234) wird gelesen', getRemovalQueue(), ['55']);
resetQueues();
state.userId = '1234';
store.set('additionalQueue', JSON.stringify(['a']));
store.set('additionalQueue:1234', JSON.stringify(['b']));
check('unscoped Key hat Vorrang vor scoped', getAdditionalQueue(), ['a']);

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
