// Smoke-Test: lädt das gebaute Bundle (Rule34 Favorites Enhancer.js) in einer
// Mock-Browser-Umgebung und prüft, dass es ohne Fehler evaluiert und init()
// durchläuft. Wenn ein Git-Stand existiert (HEAD), wird zusätzlich das zuletzt
// committete Script als Baseline geladen und verglichen.
//
// Zusätzlich spielt der Scan-Flow-Test (runScanFlow) den kompletten
// Favoriten-Scan durch: getFavoritesCount (gemocktes Profil-HTML) →
// searchAllPages (gemockte Favoriten-Seite) → saveAllImagesToIndexedDB
// (gemockte IndexedDB) → renderResultsToGalleryChunked (gemockter DOM).
// Lauf: npm run test:smoke
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const BUILT = path.resolve('Rule34 Favorites Enhancer.js');

// Globale, die pro Env getauscht/restauriert werden
const GLOBALS = ['window', 'document', 'location', 'localStorage', 'history',
    'MutationObserver', 'IntersectionObserver', 'unsafeWindow', 'fetch',
    'indexedDB', 'DOMParser', 'alert'];

async function withEnv(env, fn) {
    const prev = {};
    for (const k of GLOBALS) { prev[k] = global[k]; global[k] = env[k]; }
    try {
        return await fn();
    } finally {
        for (const k of GLOBALS) global[k] = prev[k];
    }
}

async function waitFor(cond, timeoutMs, label) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (cond()) return;
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(label + ': Timeout nach ' + timeoutMs + 'ms');
}

// Baseline = committeter Stand aus Git (falls Repo verfügbar)
let baselineFile = null;
try {
    const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const rel = path.relative(repoRoot, BUILT).split(path.sep).join('/');
    const content = execFileSync('git', ['show', 'HEAD:' + rel], { encoding: 'utf8' });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r34fav-baseline-'));
    baselineFile = path.join(dir, 'baseline.js');
    fs.writeFileSync(baselineFile, content);
} catch {
    console.log('(kein Git-Baseline verfügbar – prüfe nur das Bundle)');
}

// ── Basis-Env (nur Evaluierung + init(), wie bisher) ────────────────────────
function makeBaseEnv() {
    const listeners = {};
    const mkEl = () => ({
        dataset: {}, style: { setProperty: () => {} },
        classList: { contains: () => false, add: () => {} },
        children: [], firstChild: null, parentElement: null, parentNode: null,
        nextElementSibling: null, tagName: 'DIV', id: '', href: '',
        textContent: '', innerHTML: '', value: '',
        addEventListener() {}, removeEventListener() {}, appendChild() {}, insertBefore() {}, remove() {},
        setAttribute() {}, getAttribute() { return null; }, replaceChild() {}, querySelector() { return mkEl(); },
        querySelectorAll() { return []; }, matches() { return false; }, closest() { return null; },
        insertAdjacentHTML() {}, contains() { return false; },
        getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0 }; },
    });
    const location = {
        href: 'https://rule34.xxx/index.php?page=favorites&s=view&id=1234',
        search: '?page=favorites&s=view&id=1234',
        origin: 'https://rule34.xxx',
        reload() {},
    };
    const document = {
        readyState: 'complete',
        cookie: '',
        documentElement: mkEl(),
        head: mkEl(),
        body: mkEl(),
        createElement: () => mkEl(),
        getElementById: () => mkEl(),
        querySelector: () => mkEl(),
        querySelectorAll: () => [],
        addEventListener: (ev, fn) => { listeners[ev] = fn; },
    };
    const emptyDb = {
        objectStoreNames: { contains: () => true },
        transaction() {
            return {
                objectStore: () => ({
                    get: () => {
                        const req = { result: undefined, onsuccess: null, onerror: null };
                        queueMicrotask(() => req.onsuccess?.());
                        return req;
                    },
                }),
            };
        },
    };
    const emptyIndexedDB = {
        open() {
            const req = { result: emptyDb, onsuccess: null, onerror: null, onupgradeneeded: null };
            queueMicrotask(() => req.onsuccess?.());
            return req;
        },
    };
    class DOMParser {
        parseFromString() {
            return {
                querySelectorAll: sel => sel === 'a'
                    ? [{ href: 'https://rule34.xxx/index.php?page=favorites&s=view&id=1234', textContent: 'Favorites: 50' }]
                    : [],
            };
        }
    }

    return {
        listeners, document,
        location,
        window: { addEventListener: (ev, fn) => { listeners['win:' + ev] = fn; }, location },
        unsafeWindow: { addFav: () => {} },
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        history: { pushState() {}, replaceState() {} },
        indexedDB: emptyIndexedDB,
        fetch: async () => ({ ok: true, status: 200, text: async () => '<a href="https://rule34.xxx/index.php?page=favorites&s=view&id=1234">Favorites: 50</a>' }),
        DOMParser,
        MutationObserver: class { observe() {} disconnect() {} },
        IntersectionObserver: class { observe() {} disconnect() {} },
        alert: () => {},
    };
}

function loadFile(file, env) {
    return withEnv(env, async () => {
        // vm.runInThisContext statt require(): das Bundle ist eine IIFE ohne
        // Exports; require() würde es im Modul-Cache halten und bei einer
        // zweiten Ausführung (Scan-Flow) nicht erneut ausführen.
        vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
        // Das Script startet sofort (Entry-Points laufen beim Evaluieren);
        // kurz warten, damit init() seine async-Pfade abarbeiten kann.
        await new Promise(resolve => setTimeout(resolve, 100));
    });
}

// ── Scan-Flow-Env: gemocktes fetch/IndexedDB/DOMParser mit echten Daten ─────
const PROFILE_HTML = '<html><body><a href="https://rule34.xxx/index.php?page=favorites&s=view&id=1234">Favorites: 50</a></body></html>';
const FAV_HTML = '<html><body><div class="image-list">'
    + '<span class="thumb"><a href="index.php?page=post&s=view&id=1"><img src="https://img.rule34.xxx/1/thumb_1.jpg?1"></a></span>'
    + '<span class="thumb"><a href="index.php?page=post&s=view&id=2"><img src="https://img.rule34.xxx/2/thumb_2.jpg?2"></a></span>'
    + '</div></body></html>';

function makeScanEnv(options = {}) {
    const {
        profileFails = false,
        cachedImages = null,
        pagerMaxPid = null,
        firstThumbId = null,
        savedUserId = null,
        prevFavCount = null,
    } = options;
    const storage = new Map();      // localStorage-Backing
    const idbStore = new Map();     // IndexedDB-Backing
    const elements = [];            // alle per createElement erzeugten Elemente
    let galleryInsertCount = 0;
    let profileFetches = 0;
    let favoritesFetches = 0;

    if (savedUserId !== null) storage.set('userId', JSON.stringify(String(savedUserId)));
    if (prevFavCount !== null) storage.set('prevFavCount', JSON.stringify(prevFavCount));
    if (cachedImages) {
        idbStore.set('allImagesPayload', {
            version: 4,
            userId: savedUserId === null ? '1234' : String(savedUserId),
            updatedAt: Date.now(),
            images: cachedImages,
        });
    }

    const mkEl = (tag = 'DIV') => {
        const el = {
            dataset: {}, style: {},
            classList: { contains: () => false, add: () => {} },
            children: [], firstChild: null, parentElement: null, parentNode: null,
            nextElementSibling: null, tagName: tag, id: '', href: '', src: '',
            title: '', alt: '', border: '', loading: '', decoding: '', referrerPolicy: '',
            textContent: '', value: '', disabled: false, opacity: '', cursor: '', display: '',
            addEventListener() {}, removeEventListener() {}, appendChild() {}, insertBefore() {}, remove() {},
            setAttribute() {}, getAttribute() { return null; }, replaceChild() {},
            querySelector() { return null; }, querySelectorAll() { return []; },
            matches() { return false; }, closest() { return null; },
            insertAdjacentHTML() {}, contains() { return false; },
            getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0 }; },
        };
        elements.push(el);
        return el;
    };

    const getElementById = (id) => {
        const found = elements.find(e => e.id === id);
        if (found) return found;
        const el = mkEl();
        el.id = id;
        return el;
    };

    // #content > div.image-list – die Zielgalerie von renderResultsToGalleryChunked
    const gallery = {
        dataset: {}, style: {},
        classList: { contains: () => false, add: () => {} },
        tagName: 'DIV', id: 'gallery',
        textContent: '', innerHTML: '',
        appendChild() {}, remove() {},
        insertBefore() { galleryInsertCount++; },
        querySelector() { return null; }, querySelectorAll() { return []; },
        matches() { return false; }, closest() { return null; },
        getAttribute() { return null; }, setAttribute() {},
        addEventListener() {}, removeEventListener() {},
        contains() { return false; },
    };

    const location = {
        href: 'https://rule34.xxx/index.php?page=favorites&s=view&id=1234',
        search: '?page=favorites&s=view&id=1234',
        origin: 'https://rule34.xxx',
        reload() {},
    };
    const document = {
        readyState: 'complete',
        cookie: '',
        visibilityState: 'visible',
        baseURI: 'https://rule34.xxx/',
        documentElement: mkEl(),
        head: mkEl(),
        body: mkEl(),
        createElement: (tag) => mkEl(tag),
        createDocumentFragment: () => ({ appendChild() {}, insertBefore() {} }),
        getElementById,
        querySelector: (sel) => {
            if (sel === '#content > div.image-list') return gallery;
            // init() liest die erste Thumb-ID direkt aus der aktuellen Seite.
            if (sel === '.thumb img' && firstThumbId !== null) {
                return { parentElement: { href: `index.php?page=post&s=view&id=${firstThumbId}` } };
            }
            return null;
        },
        querySelectorAll: (sel) => {
            // Pagination-Quelle: der Anker mit dem höchsten pid.
            if (typeof sel === 'string' && sel.includes('pid=') && pagerMaxPid !== null) {
                return [{
                    getAttribute: (name) => (name === 'onclick'
                        ? `document.location='?page=favorites&s=view&id=1234&pid=${pagerMaxPid}'; return false;`
                        : null),
                }];
            }
            if (sel === '.thumb img[src]' && firstThumbId !== null) {
                return [{ src: 'https://img.rule34.xxx/1/thumb_1.jpg?1', closest: () => ({ href: `index.php?page=post&s=view&id=${firstThumbId}` }) }];
            }
            return [];
        },
        addEventListener() {},
    };

    // IndexedDB-Mock (in-memory): open → transaction → objectStore (put/get)
    const fakeDb = {
        objectStoreNames: { contains: () => true },
        createObjectStore() {},
        transaction() {
            const tx = {
                objectStore: () => ({
                    put: (val, key) => { idbStore.set(key, val); },
                    delete: (key) => { idbStore.delete(key); },
                    get: (key) => {
                        const req = { onsuccess: null, onerror: null, result: idbStore.get(key) };
                        queueMicrotask(() => req.onsuccess && req.onsuccess());
                        return req;
                    },
                }),
                oncomplete: null, onerror: null, onabort: null,
            };
            queueMicrotask(() => tx.oncomplete && tx.oncomplete());
            return tx;
        },
    };
    const indexedDB = {
        open() {
            const req = { result: fakeDb, error: null, onupgradeneeded: null, onsuccess: null, onerror: null };
            queueMicrotask(() => {
                if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: fakeDb } });
                if (req.onsuccess) req.onsuccess();
            });
            return req;
        },
    };

    // DOMParser-Mock: liefert je nach HTML einen Profil- oder Favoriten-Doc
    class DOMParser {
        parseFromString(html) {
            if (html.includes('page=favorites&s=view&id=') && html.includes('Favorites:')) {
                return {
                    querySelectorAll: (sel) => sel === 'a'
                        ? [{ href: 'https://rule34.xxx/index.php?page=favorites&s=view&id=1234', textContent: 'Favorites: 50' }]
                        : [],
                    querySelector: () => null,
                };
            }
            const imgs = [
                { src: 'https://img.rule34.xxx/1/thumb_1.jpg?1', closest: () => ({ href: 'index.php?page=post&s=view&id=1' }), getAttribute: (a) => (a === 'src' ? 'https://img.rule34.xxx/1/thumb_1.jpg?1' : null) },
                { src: 'https://img.rule34.xxx/2/thumb_2.jpg?2', closest: () => ({ href: 'index.php?page=post&s=view&id=2' }), getAttribute: (a) => (a === 'src' ? 'https://img.rule34.xxx/2/thumb_2.jpg?2' : null) },
            ];
            return {
                querySelectorAll: (sel) => (sel === '.thumb img[src]' ? imgs : []),
                querySelector: (sel) => (sel === '.thumb img[src]' ? imgs[0] : null),
            };
        }
    }

    return {
        window: { addEventListener() {}, location },
        document,
        location,
        unsafeWindow: { addFav: () => {} },
        localStorage: {
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => storage.set(k, String(v)),
            removeItem: (k) => storage.delete(k),
        },
        history: { pushState() {}, replaceState() {} },
        fetch: async (url) => {
            if (String(url).includes('page=account')) {
                profileFetches++;
                if (profileFails) throw new TypeError('profile request blocked');
                return { ok: true, status: 200, text: async () => PROFILE_HTML };
            }
            if (String(url).includes('page=favorites')) {
                favoritesFetches++;
                return { ok: true, status: 200, text: async () => FAV_HTML };
            }
            return { ok: false, status: 404, text: async () => '' };
        },
        MutationObserver: class { observe() {} disconnect() {} },
        IntersectionObserver: class { constructor() {} observe() {} disconnect() {} },
        indexedDB,
        DOMParser,
        alert: () => {},
        // Assertions-Helfer
        elements, storage, idbStore, gallery, getElementById,
        get galleryInsertCount() { return galleryInsertCount; },
        get profileFetches() { return profileFetches; },
        get favoritesFetches() { return favoritesFetches; },
    };
}

// ── Kompletter Scan-Flow (getFavoritesCount → searchAllPages → Render) ─────
async function runScanFlow() {
    const env = makeScanEnv();
    return withEnv(env, async () => {
        // Bundle frisch evaluieren (IIFE; vm statt require, damit die
        // Entry-Points auch beim zweiten Lauf erneut ausgeführt werden).
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        // 1) UI aufgebaut (createHeaderUI ist die erste sync-Zeile von init())
        await waitFor(() => {
            const btn = env.elements.find(el => el.textContent === 'Search');
            return btn && typeof btn.onclick === 'function';
        }, 2000, 'Search-Button');

        // 2) init() abschließen lassen: erst danach sind needScan/fullScan/
        // actualFavCount gesetzt. Sonst läuft scan() in den leeren
        // loadAllPages()-Pfad, bevor getFavoritesCount/IndexedDB fertig sind.
        await waitFor(
            () => env.getElementById('progress').textContent === 'need scan',
            3000, 'init() (Status "need scan")'
        );

        // 3) Scan auslösen: scan() → getFavoritesCount + searchAllPages →
        // saveAllImagesToIndexedDB → renderResultsToGalleryChunked. Der
        // zentrale RateLimiter (1 req/s) verzögert den ersten Fetch um ~1s –
        // daher pollen statt fixem Delay.
        const searchBtn = env.elements.find(el => el.textContent === 'Search');
        searchBtn.onclick();
        // v4.35: erst wird gerendert, dann (Score-Nachtrag +) gespeichert. Auf
        // den gespeicherten prevFavCount warten, nicht auf den Status.
        await waitFor(
            () => env.galleryInsertCount > 0 && env.storage.get('prevFavCount') !== null,
            10000, 'Scan-Flow'
        );

        const problems = [];
        const progress = env.getElementById('progress');
        const status = progress ? progress.textContent : '';

        if (env.storage.get('prevFavCount') !== '50') {
            problems.push(`prevFavCount=${JSON.stringify(env.storage.get('prevFavCount'))}`);
        }
        if (env.galleryInsertCount < 1) {
            problems.push('Galerie wurde nicht gerendert (insertBefore nie aufgerufen)');
        }
        const payload = env.idbStore.get('allImagesPayload');
        if (!payload || !Array.isArray(payload.images) || payload.images.length !== 2) {
            problems.push(`IndexedDB-Cache falsch (${payload ? payload.images?.length : 'kein Payload'} Bilder)`);
        } else {
            // v4.31: Der Cache enthält genau die Felder, die das Script auch
            // verwendet. Die ungenutzten API-Metadaten (rating/fileURL/
            // previewURL/width/height) dürfen nicht mehr mitschreiben.
            const expectedKeys = ['id', 'link', 'page', 'score', 'src'];
            const unexpected = Object.keys(payload.images[0])
                .filter(key => !expectedKeys.includes(key));
            if (unexpected.length) {
                problems.push(`unerwartete Cache-Felder: ${unexpected.join(', ')}`);
            }
            if (!expectedKeys.every(key => Object.hasOwn(payload.images[0], key))) {
                problems.push('Cache-Felder unvollständig');
            }
        }
        if (!/^scanned/.test(status)) {
            problems.push(`Status unerwartet: "${status}"`);
        }

        if (problems.length) return 'FEHLER: ' + problems.join('; ');
        return `OK – Status "${status}", prevFavCount=50, Galerie gerendert, IDB: ${payload.images.length} Bilder`;
    });
}

// ── Count-Fallback: Profil-Request fällt aus, Pagination liefert die Seitenzahl
async function runPaginationFallbackFlow() {
    const env = makeScanEnv({
        profileFails: true,
        pagerMaxPid: 50,        // 2 Seiten → Count 100 (geschätzt)
        firstThumbId: 1,
        savedUserId: '1234',
        prevFavCount: 100,
        cachedImages: [
            { id: '1', link: 'index.php?page=post&s=view&id=1', src: 'a.jpg', score: null, page: 0 },
            { id: '2', link: 'index.php?page=post&s=view&id=2', src: 'b.jpg', score: null, page: 0 },
        ],
    });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(
            () => env.getElementById('progress').textContent === 'scanned',
            3000, 'init() mit Pagination-Count'
        );
        const problems = [];
        if (env.profileFetches !== 0) problems.push(`Profil-Request trotz Pagination: ${env.profileFetches}`);
        if (env.favoritesFetches !== 0) problems.push(`Seiten-Requests ohne Scan: ${env.favoritesFetches}`);
        const payload = env.idbStore.get('allImagesPayload');
        if (!payload || payload.images.length !== 2) problems.push('Cache wurde verändert');
        if (problems.length) return 'FEHLER: ' + problems.join('; ');
        return 'OK – Status "scanned", 0 Requests, Cache unverändert';
    });
}

// ── Inkrementell: neuer Favorit oben → genau eine Seite, kein Voll-Scan
async function runIncrementalFlow() {
    const env = makeScanEnv({
        pagerMaxPid: 0,         // 1 Seite
        firstThumbId: 1,        // neu oben (Cache beginnt mit id 2)
        savedUserId: '1234',
        prevFavCount: 50,
        cachedImages: [
            { id: '2', link: 'index.php?page=post&s=view&id=2', src: 'b.jpg', score: null, page: 0 },
        ],
    });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(
            () => env.getElementById('progress').textContent === 'scanned (new)',
            3000, 'init() erkennt neuen Favoriten'
        );
        const searchBtn = env.elements.find(el => el.textContent === 'Search');
        searchBtn.onclick();
        await waitFor(
            () => env.storage.get('prevFavCount') !== '50',
            10000, 'inkrementeller Scan'
        );
        const problems = [];
        const status = env.getElementById('progress').textContent;
        if (env.favoritesFetches !== 1) problems.push(`Seiten-Requests: ${env.favoritesFetches} (erwartet 1)`);
        const payload = env.idbStore.get('allImagesPayload');
        if (!payload || payload.images.length !== 2) {
            problems.push(`Cache: ${payload ? payload.images?.length : 'kein Payload'} Bilder (erwartet 2)`);
        }
        if (!/^scanned/.test(status)) problems.push(`Status unerwartet: "${status}"`);
        if (problems.length) return 'FEHLER: ' + problems.join('; ');
        return `OK – 1 Seiten-Request, Cache 2 Bilder, Status "${status}"`;
    });
}

(async () => {
    const results = {};
    const files = [['Bundle', BUILT]];
    if (baselineFile) files.push(['Git-HEAD-Baseline', baselineFile]);
    for (const [label, file] of files) {
        try {
            await loadFile(file, makeBaseEnv());
            results[label] = 'OK';
        } catch (e) {
            results[label] = 'FEHLER: ' + e.message;
        }
    }
    for (const [label] of files) console.log(label + ':', results[label]);

    let baselineOk = true;
    if (baselineFile) {
        baselineOk = results['Bundle'] === 'OK' && results['Git-HEAD-Baseline'] === 'OK';
        if (baselineOk) console.log('SMOKE-TEST BESTANDEN – Bundle evaluiert und init() läuft, identisch zur Baseline');
    } else if (results['Bundle'] === 'OK') {
        console.log('SMOKE-TEST BESTANDEN – Bundle evaluiert und init() läuft ohne Fehler');
    }

    let scanOk = false;
    try {
        const scanResult = await runScanFlow();
        console.log('Scan-Flow:', scanResult);
        scanOk = scanResult.startsWith('OK');
    } catch (e) {
        console.log('Scan-Flow: FEHLER: ' + e.message);
    }

    let paginationOk = false;
    try {
        const result = await runPaginationFallbackFlow();
        console.log('Count-Fallback:', result);
        paginationOk = result.startsWith('OK');
    } catch (e) {
        console.log('Count-Fallback: FEHLER: ' + e.message);
    }

    let incrementalOk = false;
    try {
        const result = await runIncrementalFlow();
        console.log('Incremental:', result);
        incrementalOk = result.startsWith('OK');
    } catch (e) {
        console.log('Incremental: FEHLER: ' + e.message);
    }

    process.exit(baselineOk && scanOk && paginationOk && incrementalOk ? 0 : 1);
})();
