// Unit-Tests für die pure Helfer (src/core.js) – reine Logik, kein DOM/GM nötig.
// core.js liest window.location beim Modul-Load (pageType), daher wird vor dem
// Import ein minimales window/document-Stub gesetzt.
// Lauf: node test/parser.test.mjs
globalThis.window = { location: { href: 'https://rule34.xxx/index.php?page=favorites&s=view&id=1234' } };
globalThis.document = { baseURI: 'https://rule34.xxx/' };

const {
  PageType, getPageType, getIdFromUrl,
  getPostIdFromLink, getImageId, getThumbImgId,
  parseStoredJson, parseFavoriteCount, normalizeCacheImages,
  favoritePageCountFromPid, indexOfCachedId,
} = await import('../src/core.js');

let pass = 0, fail = 0;
const eq = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const check = (desc, actual, expected) => {
  const ok = eq(actual, expected);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`));
};

console.log('PageType-Erkennung:');
check('FAVORITE_VIEW erkannt', getPageType(), PageType.FAVORITE_VIEW);
globalThis.window.location.href = 'https://rule34.xxx/index.php?page=post&s=list&tags=cat';
check('POST_LIST erkannt', getPageType(), PageType.POST_LIST);
globalThis.window.location.href = 'https://rule34.xxx/index.php?page=post&s=view&id=42';
check('POST_VIEW erkannt', getPageType(), PageType.POST_VIEW);
globalThis.window.location.href = 'https://rule34.xxx/';
check('unbekannte URL → UNKNOWN', getPageType(), PageType.UNKNOWN);

console.log('getIdFromUrl:');
globalThis.window.location.href = 'https://rule34.xxx/index.php?page=favorites&s=view&id=1234';
check('id=1234 → "1234"', getIdFromUrl(), '1234');
globalThis.window.location.href = 'https://rule34.xxx/index.php?page=favorites&s=view&id=99&pid=50';
check('id mit weiteren Parametern', getIdFromUrl(), '99');
globalThis.window.location.href = 'https://rule34.xxx/';
check('kein id → null', getIdFromUrl(), null);

console.log('getPostIdFromLink:');
check('absoluter Link mit id', getPostIdFromLink('https://rule34.xxx/index.php?page=post&s=view&id=123'), '123');
check('relativer Link mit id', getPostIdFromLink('index.php?page=post&s=view&id=456'), '456');
check('Link ohne id → null', getPostIdFromLink('index.php?page=post&s=list'), null);
check('null/undefined → null', getPostIdFromLink(null), null);
check('id am Ende (kein &)', getPostIdFromLink('index.php?page=post&s=view&id=789'), '789');

console.log('getImageId:');
check('Objekt mit link', getImageId({ link: 'index.php?page=post&s=view&id=111' }), '111');
check('Objekt mit id (Zahl)', getImageId({ id: 222 }), '222');
check('Objekt mit id (String)', getImageId({ id: '333' }), '333');
check('Objekt mit src-Query', getImageId({ src: 'https://img.rule34.xxx/images/1/thumb_1.jpg?444' }), '444');
check('Objekt mit nicht-numerischer id → null', getImageId({ id: 'abc' }), null);
check('null → null', getImageId(null), null);

console.log('getThumbImgId:');
check('src mit numerischer Query', getThumbImgId({ src: 'https://img.rule34.xxx/images/1/thumb_1.jpg?555' }), '555');
check('src mit nicht-numerischer Query → null', getThumbImgId({ src: 'thumb.jpg?v=abc' }), null);
check('src ohne Query → null', getThumbImgId({ src: 'thumb.jpg' }), null);
check('leeres Objekt → null', getThumbImgId({}), null);

console.log('parseStoredJson:');
check('gültiges JSON', parseStoredJson('{"a":1}', null), { a: 1 });
check('"undefined" → Fallback', parseStoredJson('undefined', 'x'), 'x');
check('leerer String → Fallback', parseStoredJson('', 5), 5);
check('kaputtes JSON → Fallback', parseStoredJson('not json', 7), 7);
check('null → Fallback', parseStoredJson(null, 9), 9);

console.log('parseFavoriteCount:');
check('"1234" → 1234', parseFavoriteCount('1234'), 1234);
check('"1,234" → 1234', parseFavoriteCount('1,234'), 1234);
check('"Favorites: 56" → 56', parseFavoriteCount('Favorites: 56'), 56);
check('"0" → 0', parseFavoriteCount('0'), 0);
check('"abc" → null', parseFavoriteCount('abc'), null);
check('null → null', parseFavoriteCount(null), null);

console.log('normalizeCacheImages:');
check('Array → gefiltert', normalizeCacheImages([{ id: 1 }, { id: 2 }, {}]), [{ id: 1 }, { id: 2 }]);
check('Payload mit images', normalizeCacheImages({ version: 3, images: [{ id: 1 }, { id: 2 }] }), [{ id: 1 }, { id: 2 }]);
check('neuere Cache-Version → []', normalizeCacheImages({ version: 99, images: [{ id: 1 }] }), []);
check('images kein Array → []', normalizeCacheImages({ version: 3, images: 'x' }), []);
check('null → []', normalizeCacheImages(null), []);
check('leeres Objekt → []', normalizeCacheImages({}), []);

// ── Pagination-Quelle für die Seitenzahl (v4.35) ───────────────────────
console.log('favoritePageCountFromPid:');
check('pid 84750 → 1696 Seiten', favoritePageCountFromPid(84750), 1696);
check('pid 0 → 1 Seite', favoritePageCountFromPid(0), 1);
check('pid 49 → 1 Seite', favoritePageCountFromPid(49), 1);
check('pid 50 → 2 Seiten', favoritePageCountFromPid(50), 2);
check('ungültig → null', favoritePageCountFromPid(NaN), null);
check('negativ → null', favoritePageCountFromPid(-50), null);
check('eigenes perPage', favoritePageCountFromPid(100, 25), 5);

// ── Grenze des inkrementellen Scans (v4.35) ─────────────────────────────
console.log('indexOfCachedId:');
const cachedImages = [
  { id: '10' },
  { link: 'index.php?page=post&s=view&id=9' },
  { id: 8 },
];
check('findet id als String', indexOfCachedId(cachedImages, '9'), 1);
check('findet id als Zahl', indexOfCachedId(cachedImages, 8), 2);
check('nicht vorhanden → -1', indexOfCachedId(cachedImages, '7'), -1);
check('leere Liste → -1', indexOfCachedId([], '1'), -1);
check('null-ID → -1', indexOfCachedId(cachedImages, null), -1);

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
