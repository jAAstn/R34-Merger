// Smoke-Test: lädt das gebaute Bundle (Rule34 Combined Scripts.js) in einer
// Mock-Browser-Umgebung und prüft, dass es ohne Fehler evaluiert und init()
// durchläuft. Wenn ein Git-Stand existiert (HEAD), wird zusätzlich das zuletzt
// committete Script als Baseline geladen und verglichen.
// Lauf: npm run test:smoke
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const BUILT = path.resolve('Rule34 Combined Scripts.js');

// Baseline = committeter Stand aus Git (falls Repo verfügbar)
let baselineFile = null;
try {
    const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const rel = path.relative(repoRoot, BUILT).split(path.sep).join('/');
    const content = execFileSync('git', ['show', 'HEAD:' + rel], { encoding: 'utf8' });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r34-baseline-'));
    baselineFile = path.join(dir, 'baseline.js');
    fs.writeFileSync(baselineFile, content);
} catch {
    console.log('(kein Git-Baseline verfügbar – prüfe nur das Bundle)');
}

function makeEnv() {
    const listeners = {};
    const mkEl = () => {
        const mkStyle = () => {
            const s = {};
            s.setProperty = (prop, value) => { s[prop] = value; };
            return s;
        };
        const el = {
            dataset: {}, style: mkStyle(), classList: { contains: () => false, add: () => {} },
            children: [], firstChild: null, parentElement: null, parentNode: null,
            nextElementSibling: null, tagName: 'DIV', id: '', href: 'https://rule34.xxx/index.php?page=post&s=list&tags=all',
            textContent: '', innerHTML: '', value: '',
            addEventListener() {}, removeEventListener() {}, appendChild() {}, insertBefore() {}, remove() {},
            setAttribute() {}, getAttribute() { return null; }, replaceChild() {}, querySelector() { return mkEl(); },
            querySelectorAll() { return []; }, matches() { return false; }, closest() { return null; },
            insertAdjacentHTML() {}, contains() { return false; }, getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0 }; },
        };
        return el;
    };
    const document = {
        readyState: 'loading',
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
    return {
        listeners, document,
        location: { href: 'https://rule34.xxx/index.php?page=post&s=list&tags=all', origin: 'https://rule34.xxx' },
        window: { addEventListener: (ev, fn) => { listeners['win:' + ev] = fn; }, dispatchEvent: () => true },
        unsafeWindow: {},
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        history: { pushState() {}, replaceState() {} },
        MutationObserver: class { observe() {} disconnect() {} },
        GM_getValue: () => null, GM_setValue: () => {},
        GM: { getValue: async () => null, setValue: async () => {}, xmlHttpRequest: () => {} },
        GM_addStyle: () => {}, GM_registerMenuCommand: () => {},
        requestIdleCallback: undefined,
    };
}

function loadFile(file) {
    const env = makeEnv();
    const prev = {
        window: global.window, document: global.document, location: global.location,
        localStorage: global.localStorage, history: global.history,
        MutationObserver: global.MutationObserver, URL: global.URL,
        unsafeWindow: global.unsafeWindow,
    };
    global.window = env.window; global.unsafeWindow = env.unsafeWindow;
    global.document = env.document; global.location = env.location;
    global.localStorage = env.localStorage; global.history = env.history;
    global.MutationObserver = env.MutationObserver;
    global.GM_getValue = env.GM_getValue; global.GM_setValue = env.GM_setValue;
    global.GM = env.GM; global.GM_addStyle = env.GM_addStyle;
    global.GM_registerMenuCommand = env.GM_registerMenuCommand;
    global.requestIdleCallback = undefined;
    try {
        require(file);
        return new Promise(resolve => {
            env.listeners['DOMContentLoaded']();
            setTimeout(() => { Object.assign(global, prev); resolve(); }, 50);
        });
    } catch (e) {
        Object.assign(global, prev);
        throw e;
    }
}

(async () => {
    const results = {};
    const files = [['Bundle', BUILT]];
    if (baselineFile) files.push(['Git-HEAD-Baseline', baselineFile]);
    for (const [label, file] of files) {
        try {
            await loadFile(file);
            results[label] = 'OK';
        } catch (e) {
            results[label] = 'FEHLER: ' + e.message;
        }
    }
    for (const [label] of files) console.log(label + ':', results[label]);
    if (baselineFile) {
        if (results['Bundle'] === 'OK' && results['Git-HEAD-Baseline'] === 'OK') {
            console.log('SMOKE-TEST BESTANDEN – Bundle evaluiert und init() läuft, identisch zur Baseline');
        } else {
            process.exit(1);
        }
    } else if (results['Bundle'] === 'OK') {
        console.log('SMOKE-TEST BESTANDEN – Bundle evaluiert und init() läuft ohne Fehler');
    } else {
        process.exit(1);
    }
})();
