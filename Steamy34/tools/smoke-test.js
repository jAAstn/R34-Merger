// Smoke-Test: lädt das gebaute Bundle (Steamy34.js) in einer Mock-Browser-
// Umgebung und prüft, dass es ohne Fehler evaluiert und die Init-Runde
// (DOMContentLoaded + load) durchläuft. Wenn ein Git-Stand existiert (HEAD),
// wird zusätzlich das zuletzt committete Script als Baseline geladen und das
// Verhalten verglichen (gleiche Fehler = gleiches Verhalten).
// Lauf: npm run test:smoke
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const BUILT = path.resolve('Steamy34.js');
const realSetTimeout = globalThis.setTimeout;

// Baseline = committeter Stand aus Git (falls Repo verfügbar)
let baselineFile = null;
try {
    const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const rel = path.relative(repoRoot, BUILT).split(path.sep).join('/');
    const content = execFileSync('git', ['show', 'HEAD:' + rel], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steamy34-baseline-'));
    baselineFile = path.join(dir, 'baseline.js');
    fs.writeFileSync(baselineFile, content);
} catch {
    console.log('(kein Git-Baseline verfügbar – prüfe nur das Bundle)');
}

function makeEnv() {
    const listeners = { document: {}, window: {} };

    const mkStyle = () => ({
        setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; },
    });
    const mkClassList = () => {
        const set = new Set();
        return {
            add: (...a) => a.forEach(x => set.add(x)),
            remove: (...a) => a.forEach(x => set.delete(x)),
            contains: x => set.has(x),
            toggle: (x, force) => {
                const on = force === undefined ? !set.has(x) : !!force;
                if (on) set.add(x); else set.delete(x);
                return on;
            },
            toString: () => [...set].join(' '),
        };
    };
    const mkEl = (tag = 'div') => {
        const el = {
            tagName: String(tag).toUpperCase(), nodeName: String(tag).toUpperCase(), nodeType: 1,
            dataset: {}, style: mkStyle(), classList: mkClassList(),
            children: [], childNodes: [], firstChild: null, firstElementChild: null, lastChild: null,
            parentElement: null, parentNode: null, nextElementSibling: null, previousElementSibling: null,
            id: '', className: '', value: '', checked: false, hidden: false, disabled: false,
            textContent: '', innerHTML: '', innerText: '', title: '', src: '', href: 'https://rule34.xxx/index.php?page=post&s=list&tags=all',
            offsetParent: null, offsetWidth: 0, offsetHeight: 0, scrollTop: 0, scrollHeight: 0, clientWidth: 0, clientHeight: 0,
            addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
            appendChild(c) { this.children.push(c); return c; }, append(...c) { this.children.push(...c); },
            prepend(...c) { this.children.unshift(...c); }, before() {}, after() {},
            replaceChildren(...c) { this.children = c; },
            insertBefore(c) { this.children.push(c); return c; }, replaceChild(c) { return c; },
            removeChild() {}, remove() {}, replaceWith() {}, cloneNode() { return mkEl(tag); },
            setAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; }, removeAttribute() {},
            removeAttributeNode() {}, setAttributeNS() {}, getAttributeNS() { return null; },
            querySelector() { return tag === 'template' ? null : mkEl(); },
            querySelectorAll() { return []; },
            getElementsByTagName() { return []; }, getElementsByClassName() { return []; },
            matches() { return false; }, closest() { return null; }, contains() { return false; },
            getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; },
            insertAdjacentHTML() {}, insertAdjacentElement() {}, insertAdjacentText() {},
            focus() {}, blur() {}, click() {}, scrollIntoView() {}, scrollTo() {},
            getRootNode() { return document; }, setSelectionRange() {}, select() {},
            add(c) { this.children.push(c); }, options: [], selectedIndex: -1, multiple: false, length: 0,
            animate() { return { finished: Promise.resolve(), cancel() {} }; },
            getContext() { return null; },
            attachShadow() { return mkEl(); },
            play() { return Promise.resolve(); }, pause() {}, load() {}, canPlayType() { return ''; },
        };
        return el;
    };

    const document = {
        readyState: 'loading',
        cookie: '',
        title: '',
        documentElement: mkEl('html'),
        head: mkEl('head'),
        body: mkEl('body'),
        activeElement: mkEl(),
        createElement: tag => mkEl(tag),
        createElementNS: (_ns, tag) => mkEl(tag),
        createTextNode: () => mkEl('text'),
        createDocumentFragment: () => mkEl('fragment'),
        getElementById: () => mkEl(),
        querySelector: () => mkEl(),
        querySelectorAll: () => [],
        getElementsByTagName: () => [],
        getElementsByClassName: () => [],
        addEventListener: (ev, fn) => { (listeners.document[ev] = listeners.document[ev] || []).push(fn); },
        removeEventListener() {},
        dispatchEvent: () => true,
        execCommand: () => false,
        getSelection: () => ({ toString: () => '' }),
        elementFromPoint: () => mkEl(),
        hasFocus: () => true,
    };

    const window = {
        addEventListener: (ev, fn) => { (listeners.window[ev] = listeners.window[ev] || []).push(fn); },
        removeEventListener() {},
        dispatchEvent: () => true,
        matchMedia: () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
        getComputedStyle: () => ({ getPropertyValue: () => '', display: 'block', visibility: 'visible', opacity: '1' }),
        requestAnimationFrame: fn => realSetTimeout(() => fn(0), 0),
        cancelAnimationFrame() {},
        scrollTo() {}, scrollBy() {}, open() { return null; }, close() {},
        innerWidth: 1280, innerHeight: 900, scrollX: 0, scrollY: 0, devicePixelRatio: 1,
        location: { href: 'https://rule34.xxx/index.php?page=post&s=list&tags=all', search: '?page=post&s=list&tags=all', hash: '', origin: 'https://rule34.xxx', pathname: '/index.php', hostname: 'rule34.xxx', assign() {}, replace() {}, reload() {} },
        history: { pushState() {}, replaceState() {}, back() {}, forward() {}, go() {}, length: 1, state: null },
        navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130', language: 'en', languages: ['en'], platform: 'Linux', maxTouchPoints: 0, clipboard: { writeText: async () => {} } },
        localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
        top: null, parent: null, frames: [], self: null,
    };
    window.top = window; window.parent = window; window.self = window;

    class Observer {
        observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    }

    const store = new Map();
    const GM = {
        getValue: (k, d) => (store.has(k) ? store.get(k) : d),
        setValue: (k, v) => store.set(k, v),
        deleteValue: k => store.delete(k),
        listValues: () => [...store.keys()],
        xmlhttpRequest: () => ({ abort() {} }),
        download: () => ({ abort() {} }),
        addStyle: () => mkEl('style'),
    };

    return {
        listeners, document, window, GM,
        globals: {
            window, document,
            location: window.location,
            navigator: window.navigator,
            history: window.history,
            localStorage: window.localStorage,
            matchMedia: window.matchMedia,
            getComputedStyle: window.getComputedStyle,
            requestAnimationFrame: window.requestAnimationFrame,
            cancelAnimationFrame: window.cancelAnimationFrame,
            MutationObserver: Observer,
            IntersectionObserver: Observer,
            ResizeObserver: Observer,
            PerformanceObserver: Observer,
            CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init && init.detail !== undefined ? { detail: init.detail } : {}); } },
            CSS: { escape: s => String(s).replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c), supports: () => false },
            Option: class { constructor(text = '', value = '') { this.text = text; this.value = value; this.selected = false; } },
            DOMParser: class { parseFromString() { return mkEl('document'); } },
            NodeFilter: { SHOW_ELEMENT: 1, SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
            AbortController: class { constructor() { this.signal = {}; } abort() {} },
            queueMicrotask: fn => realSetTimeout(fn, 0),
            btoa: s => Buffer.from(String(s), 'binary').toString('base64'),
            atob: s => Buffer.from(String(s), 'base64').toString('binary'),
            Event: class { constructor(type) { this.type = type; } },
            Image: class { constructor() { return mkEl('img'); } },
            Audio: class { constructor() { return mkEl('audio'); } },
            FileReader: class { readAsDataURL() {} readAsText() {} },
            Blob: class {}, File: class {},
            fetch: () => new Promise(() => {}),
            GM_getValue: GM.getValue, GM_setValue: GM.setValue,
            GM_deleteValue: GM.deleteValue, GM_listValues: GM.listValues,
            GM_xmlhttpRequest: GM.xmlhttpRequest, GM_download: GM.download,
            GM_addStyle: GM.addStyle, GM: GM, unsafeWindow: window,
        },
    };
}

const REAL = {};
for (const k of ['document', 'window', 'location', 'navigator', 'history', 'localStorage', 'matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'PerformanceObserver', 'CustomEvent', 'Event', 'Image', 'Audio', 'FileReader', 'Blob', 'File', 'fetch', 'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues', 'GM_xmlhttpRequest', 'GM_download', 'GM_addStyle', 'GM', 'unsafeWindow', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'CSS', 'Option', 'DOMParser', 'NodeFilter', 'AbortController', 'queueMicrotask', 'btoa', 'atob']) {
    REAL[k] = Object.getOwnPropertyDescriptor(globalThis, k);
}

function restore() {
    for (const [k, d] of Object.entries(REAL)) {
        if (d) Object.defineProperty(globalThis, k, d);
        else delete globalThis[k];
    }
}

const norm = (e) => (e && (e.name ? e.name + ': ' : '') + (e.message || String(e))) || 'unbekannter Fehler';

function runCode(code) {
    const env = makeEnv();
    const errors = [];
    const logs = [];
    const addError = (where, e) => errors.push(where + ' ' + norm(e));
    const realLog = console.log;
    console.log = (...a) => { logs.push(a.map(String).join(' ')); };

    for (const [k, v] of Object.entries(env.globals)) {
        Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
    }
    // Timer, die das Script setzt, dürfen den Test nicht hängen lassen und
    // müssen Fehler einsammeln statt den Prozess zu beenden.
    Object.defineProperty(globalThis, 'setTimeout', {
        configurable: true, writable: true,
        value: (fn, ms, ...args) => realSetTimeout(() => {
            try { if (typeof fn === 'function') fn(...args); } catch (e) { addError('Timer:', e); }
        }, Math.min(Number(ms) || 0, 60)),
    });
    Object.defineProperty(globalThis, 'setInterval', { configurable: true, writable: true, value: () => 0 });
    Object.defineProperty(globalThis, 'clearInterval', { configurable: true, writable: true, value: () => {} });
    Object.defineProperty(globalThis, 'clearTimeout', { configurable: true, writable: true, value: () => {} });

    try {
        // Wie ein <script>-Tag im Browser: globaler Scope, kein Modul-Wrapper.
        new Function(code)();
    } catch (e) {
        addError('Beim Laden:', e);
    }

    const fire = (where, list) => {
        for (const fn of list || []) {
            try { fn({ type: where, target: env.document, preventDefault() {}, stopPropagation() {} }); }
            catch (e) { addError(where + ':', e); }
        }
    };
    fire('DOMContentLoaded', env.listeners.document['DOMContentLoaded']);
    fire('load', env.listeners.window['load']);
    env.document.readyState = 'complete';

    return new Promise(resolve => {
        realSetTimeout(() => { restore(); console.log = realLog; resolve({ errors, logs }); }, 400);
    });
}

const sameErrors = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

(async () => {
    const results = {};
    const files = [['Bundle', BUILT]];
    if (baselineFile) files.push(['Git-HEAD-Baseline', baselineFile]);
    const realLog = console.log;
    for (const [label, file] of files) {
        process.on('unhandledRejection', () => {});
        results[label] = await runCode(fs.readFileSync(file, 'utf8'));
        realLog(label + ':', results[label].errors.length ? results[label].errors.join(' | ') : 'keine Fehler');
    }
    if (baselineFile) {
        const sameLogs = results['Bundle'].logs.join('\n') === results['Git-HEAD-Baseline'].logs.join('\n');
        realLog('Konsolen-Ausgabe:', sameLogs ? 'identisch (' + results['Bundle'].logs.length + ' Zeilen)' : 'UNTERSCHIEDLICH');
        const ok = sameErrors(results['Bundle'].errors, results['Git-HEAD-Baseline'].errors) && sameLogs;
        console.log(ok
            ? 'SMOKE-TEST BESTANDEN – Bundle und Baseline verhalten sich gleich'
            : 'SMOKE-TEST FEHLGESCHLAGEN – Bundle und Baseline verhalten sich unterschiedlich');
        if (!ok) process.exit(1);
    } else if (results['Bundle'].errors.length === 0) {
        console.log('SMOKE-TEST BESTANDEN – Bundle evaluiert und läuft ohne Fehler');
    } else {
        process.exit(1);
    }
})();
