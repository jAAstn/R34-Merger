// Unit-Tests für die Features:
// - Post-Aufbau in scan.js (extractImagesAndTags – nur id/link/score)
// - Filter-Pipeline in ui.js (getFilteredResults – Diff-Modus)
// Lauf: node test/features.test.mjs

// Eine Post-Liste verhindert den automatischen Favorite-Entry-Point beim
// Import; die extrahierten Funktionen bleiben dadurch vollständig side-effect-frei.
globalThis.window = { location: { href: 'https://rule34.xxx/index.php?page=post&s=list' } };
globalThis.document = {
  baseURI: 'https://rule34.xxx/',
  addEventListener() {},
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};
globalThis.unsafeWindow = { addFav: () => {} };
// localStorage-Mock: scan.js Entry-Points rufen loadSavedData() beim Modul-Load.
const mockStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (mockStore.has(k) ? mockStore.get(k) : null),
  setItem: (k, v) => mockStore.set(k, String(v)),
  removeItem: (k) => mockStore.delete(k),
};
// Für diese reinen Feature-Tests wird das Highlight-Cache-Startup deaktiviert.
mockStore.set('borderFavs', 'false');

// scan.js zieht ui.js → api.js; alle DOM-/Netzwerk-Aufrufe passieren erst zur
// Laufzeit, daher reicht für die puren Funktionen das Stub-Environment oben.
const { state } = await import('../src/core.js');
const { extractImagesAndTags } = await import('../src/scan.js');
const { getFilteredResults } = await import('../src/ui.js');
const { collectStorageSnapshot, restoreStorageSnapshot } = await import('../src/storage.js');

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (desc, actual, expected) => {
  const ok = eq(actual, expected);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`));
};

// ── Hilfsfunktionen ─────────────────────────────────────────────────────────
// Fake-<img>-Element wie es rule34 im DOM liefert.
function mkImg(id, score = null) {
  return {
    src: `https://img.rule34.xxx/thumbs/${id}.jpg?${id}`,
    getAttribute(a) { return a === 'src' ? this.src : null; },
    closest() { return { href: `index.php?page=post&s=view&id=${id}` }; },
    score,
  };
}
// Fake-Dokument wie es fetchFavoritesPage zurückgibt – inkl. Score-Script
// (die Scores stehen im HTML in posts[<id>] = { ... score: 'N' ... }).
function mkDoc(imgs, scores = {}) {
  const scriptHtml = Object.entries(scores)
    .map(([id, sc]) => `posts[${id}] = { score: '${sc}' };`)
    .join('\n');
  const script = { textContent: scriptHtml };
  return {
    querySelectorAll(sel) {
      if (sel === 'script') return scriptHtml ? [script] : [];
      if (sel === '.thumb img[src]') return imgs;
      return [];
    },
  };
}
function resetScanState() {
  state.images = undefined;
  state.allImages = [];
  state.allImageIds = new Set();
  state.results = [];
  state.resultIds = new Set();
  state.showOnlyNew = false;
  state.newSinceLastScan = new Set();
}

// ── Post-Aufbau ohne Tags (v4.29: Tag-Feature entfernt) ─────────────────────
console.log('Post-Aufbau (extractImagesAndTags, ohne tags):');
resetScanState();
extractImagesAndTags(mkDoc([mkImg(1), mkImg(2)], { 1: '10', 2: '-5' }), undefined, 0);
check('Post-Felder sind id/link/src/score/page', Object.keys(state.results[0]).sort(), ['id', 'link', 'page', 'score', 'src']);
check('kein tags-Feld im Post', 'tags' in state.results[0], false);
check('Score 1', state.results.find(p => p.id === '1')?.score, '10');
check('Score 2 (negativ)', state.results.find(p => p.id === '2')?.score, '-5');
resetScanState();
extractImagesAndTags(mkDoc([mkImg(3)], { 3: '0' }), undefined, 0);
check('Score 0 bleibt erhalten', state.results[0]?.score, '0');
resetScanState();
extractImagesAndTags(false, [{
  id: '4', link: 'index.php?page=post&s=view&id=4', src: 'cached.jpg', score: '2',
  rating: 's', fileURL: 'full.jpg', previewURL: 'preview.jpg', width: 800, height: 600,
}]);
// v4.31: Die API lieferte mehr, angezeigt wurde davon nichts. Alte Caches
// enthalten die Felder noch, das Script übernimmt sie aber nicht mehr.
check('Cache-Post: nur id/link/src/score/page', Object.keys(state.results[0]).sort(), ['id', 'link', 'page', 'score', 'src']);
check('veraltete Cache-Metadaten werden ignoriert', 'rating' in state.results[0], false);
check('Cache-Score bleibt erhalten', state.results[0]?.score, '2');

// ── Diff-Modus (getFilteredResults mit showOnlyNew) ─────────────────────────
console.log('Diff-Modus (getFilteredResults mit showOnlyNew):');
resetScanState();
state.results = [
  { id: '1' }, { id: '2' }, { id: '3' },
];
state.newSinceLastScan = new Set(['2', '3']);
state.showOnlyNew = true;
check('nur neue IDs', getFilteredResults().map(p => p.id), ['2', '3']);
state.showOnlyNew = false;
check('ausgeschaltet → alles', getFilteredResults().map(p => p.id), ['1', '2', '3']);
check('leeres newSinceLastScan → alles (auch aktiv)', (() => {
  state.newSinceLastScan = new Set();
  state.showOnlyNew = true;
  const r = getFilteredResults().map(p => p.id);
  state.newSinceLastScan = new Set(['2', '3']);
  return r;
})(), ['1', '2', '3']);

// ── Storage-Snapshot (Export/Import) ────────────────────────────────────────
console.log('Storage-Snapshot (collectStorageSnapshot/restoreStorageSnapshot):');
mockStore.clear();
mockStore.set('prevFavCount', '50');
mockStore.set('userId', '"1234"');
mockStore.set('borderFavs', 'false');
mockStore.set('fremderKey', 'bleibt draußen');
document.cookie = 'user_id=abc123; other=xyz';
const snap = collectStorageSnapshot();
check('Script-Keys erfasst', [snap.prevFavCount, snap.userId, snap.borderFavs], ['50', '"1234"', 'false']);
check('Fremder Key ignoriert', 'fremderKey' in snap, false);
check('Cookie user_id erfasst', snap.user_id, 'abc123');
check('Fremder Cookie ignoriert', 'other' in snap, false);
mockStore.clear();
document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
check('Restore schreibt Keys zurück', (() => {
  restoreStorageSnapshot(snap);
  return [mockStore.get('prevFavCount'), mockStore.get('userId'), mockStore.get('borderFavs')];
})(), ['50', '"1234"', 'false']);
check('Restore setzt Cookie', document.cookie.includes('user_id=abc123'), true);
check('Restore ignoriert fremde Keys', mockStore.has('fremderKey'), false);
check('Restore ohne Snapshot ist No-Op', (() => { restoreStorageSnapshot(null); return true; })(), true);
mockStore.clear();
document.cookie = '';

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
