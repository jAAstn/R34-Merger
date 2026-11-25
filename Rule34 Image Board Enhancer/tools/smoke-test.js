// Smoke-Test: lädt das gebaute Bundle (Rule34 Image Board Enhancer.js) in einer
// Mock-Browser-Umgebung (rule34.xxx Post-Ansicht mit #image) und prüft, dass es
// ohne Fehler evaluiert und init() durchläuft. Wenn ein Git-Stand existiert
// (HEAD), wird zusätzlich das zuletzt committete Script als Baseline geladen
// und verglichen.
//
// Flow-Tests (Bundle):
// - UI-Flow: Toolbar + Settings-Modal (inkl. v2.0.7-Checkboxen), beide Panels,
//   Titel-Farben (#fff → grün/rot), input-Listener (Debounce), saveSettings
// - Single-Panel: nur main-Panel → Titel wird trotzdem gefärbt (v2.0.7)
// - Keyboard: isTyping-Guard – Shortcut feuert nicht bei Fokus im Input (v2.0.7)
// - Minus-Tag: data-minus-tag-Klick hängt " -tag" an (v2.0.7)
// - Media-Fit: Aspect-Guard + Metadaten-Robustheit Video/Bild (v2.0.8)
// - Pair-Dedup: umgekehrtes Paar ersetzt statt Duplikat (v2.0.8)
// - Pair-Input: +-Link ersetzt Paar in anderer Reihenfolge im Such-Input (v2.0.9)
// Lauf: npm run test:smoke (braucht node --no-experimental-webstorage)
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const BUILT = path.resolve('Rule34 Image Board Enhancer.js');

// Globale, die pro Env getauscht/restauriert werden
const GLOBALS = ['window', 'document', 'location', 'GM', 'HTMLInputElement',
    'MutationObserver', 'alert', 'prompt'];

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
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r34ibe-baseline-'));
    baselineFile = path.join(dir, 'baseline.js');
    fs.writeFileSync(baselineFile, content);
} catch {
    console.log('(kein Git-Baseline verfügbar – prüfe nur das Bundle)');
}

// ── Mock-Env: rule34.xxx Post-Ansicht mit #content #image ───────────────────
// `gm` setzt beliebige GM-Storage-Vorgaben (Keys wie in DEFAULT_SETTINGS);
// favoriteTags/favoriteTagsUSER sind Komfort-Shorthands. `video: true` baut
// eine Video-Post-Seite (kein #image, dafür #content video) für die
// Media-Fit-Flows (v2.0.8).
// v2.0.10: `customSelectors: true` modelliert ein Board, auf dem die DEFAULT-
// Selektoren NICHT matchen (das Bild liegt nur unter '.my-content .my-image',
// Thumbnails unter '.my-thumb'). Ohne diesen Schalter liefert der Mock das Bild
// unter '#content #image' UND '.my-content .my-image' – der Test könnte dann
// nicht unterscheiden, ob die Custom-Config angewandt wurde (Mutationstest!).
function makeEnv({ favoriteTags, favoriteTagsUSER, gm = {}, video = false, hostname = 'rule34.xxx', customSelectors = false } = {}) {
    const registry = new Map();     // id → Element (via insertAdjacentHTML registriert)
    const gmStore = new Map();
    const elements = [];            // alle erzeugten Elemente
    const docListeners = {};
    const winListeners = {};

    if (favoriteTags) gmStore.set('favoriteTags', favoriteTags);
    if (favoriteTagsUSER) gmStore.set('favoriteTagsUSER', favoriteTagsUSER);
    for (const [k, v] of Object.entries(gm)) gmStore.set(k, v);

    const getElementById = (id) => registry.get(id) || null;

    const mkEl = (tag = 'DIV') => {
        const el = {
            dataset: {}, style: {}, listeners: {},
            classList: { contains: () => false, add() {}, remove() {} },
            children: [], firstChild: null, parentElement: null, parentNode: null,
            nextElementSibling: null, tagName: tag, id: '', href: '', src: '',
            name: '', textContent: '', innerHTML: '', value: '', checked: false,
            open: false, scrollTop: 0, scrollHeight: 0, offsetParent: null,
            offsetWidth: 0, clientWidth: 0, clientHeight: 0, naturalWidth: 0,
            naturalHeight: 0, width: 0, height: 0, volume: 0, loop: false,
            autoplay: false, controls: false, complete: false,
            readyState: 0, videoWidth: 0, videoHeight: 0, preload: '',
            play() { return Promise.resolve(); }, pause() {},
            addEventListener(ev, fn) { this.listeners[ev] = fn; },
            removeEventListener() {},
            appendChild() {}, insertBefore() {}, remove() {}, replaceWith() {},
            setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
            replaceChild() {}, scrollIntoView() {},
            querySelector() { return null; }, querySelectorAll() { return []; },
            matches() { return false; }, closest() { return null; },
            insertAdjacentHTML() { registerHtmlIds(arguments[1]); },
            contains() { return false; },
            getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0 }; },
            // v2.0.10: Default = gerendert (1 Rect). Die Sidebar überschreibt das
            // explizit auf [] (unsichtbar), damit die Fit-Tests unverändert
            // 1000px Fensterbreite sehen.
            getClientRects() { return [{ left: 0, top: 0, right: 0, bottom: 0 }]; },
        };
        elements.push(el);
        return el;
    };

    // Simuliert, dass insertAdjacentHTML die id="-Attribute wirklich erzeugt:
    // extrahiert alle id="..." / id='...' aus dem HTML und registriert Elemente.
    const registerHtmlIds = (html) => {
        if (typeof html !== 'string') return;
        const idRe = /\bid=["']([^"']+)["']/g;
        let m;
        while ((m = idRe.exec(html)) !== null) {
            if (!registry.has(m[1])) {
                const el = mkEl();
                el.id = m[1];
                registry.set(m[1], el);
            }
        }
    };

    const imageEl = video ? null : mkEl('IMG');
    const videoEl = video ? mkEl('VIDEO') : null;
    const toolbarTarget = mkEl('DIV');       // .sidebar > div (nach configureSites)
    // v2.0.10: Sichtbarkeit wird über getClientRects() geprüft (nicht offsetParent,
    // das auch bei position:fixed null ist). Default: KEINE Rects = unsichtbar,
    // damit die Fensterbreite wie bisher nicht um die Sidebar reduziert wird
    // (die Fit-Tests erwarten 1000px Fensterbreite → 800x800 Fit).
    const sidebarEl = mkEl('DIV');           // .sidebar (unsichtbar)
    sidebarEl.getClientRects = () => [];
    const inputEl = mkEl('INPUT');
    inputEl.name = 'tags';
    inputEl.value = '';

    const location = {
        href: 'https://rule34.xxx/index.php?page=post&s=view&id=123',
        hostname,
        origin: 'https://rule34.xxx',
        reload() {},
    };

    const document = {
        readyState: 'complete',
        location,
        documentElement: mkEl(),
        head: mkEl(),
        body: mkEl(),
        activeElement: null,
        createElement: (tag) => mkEl(tag),
        getElementById,
        querySelector: (sel) => {
            // v2.0.10: Auf einem Custom-Selector-Board matchen die Defaults NICHT.
            switch (sel) {
                case '#content #image': return customSelectors ? null : (video ? null : imageEl);
                case '#content video': return customSelectors ? null : (video ? videoEl : null);
                case '.sidebar > div': return toolbarTarget;
                case '.sidebar': return sidebarEl;
                case '#tag-sidebar': return null;
                case 'input[name="tags"]': return inputEl;
                case '.thumb': return customSelectors ? null : mkEl('IMG');
                // v2.0.10: Custom-Site-Selektoren des runCustomSiteSelectorsFlow.
                // Das Bild existiert NUR unter '.my-content .my-image' – findet
                // createToolbar() es über den Default '#content #image', ist der
                // Fix kaputt (die Toolbar entstünde nicht).
                case '.my-content .my-image': return video ? null : imageEl;
                case '.my-content video': return video ? videoEl : null;
                case '.my-toolbar': return toolbarTarget;
                // Thumbnail-Treffer: nötig, damit createToolbar() die Toolbar
                // überhaupt anlegt (image || video || thumb).
                case '.my-thumb': return mkEl('IMG');
                case '#ibenhancer-favorite-tags > details > summary': return mkEl();
                case '#ibenhancerUSER-favorite-tags > details > summary': return mkEl();
                default: return null;
            }
        },
        querySelectorAll: (sel) => {
            if (sel === 'input[name="tags"]') return [inputEl];
            if (sel === 'video:not([id])') return [];
            return [];
        },
        addEventListener: (ev, fn) => { docListeners[ev] = fn; },
    };

    const window = {
        location,
        addEventListener: (ev, fn) => { winListeners[ev] = fn; },
        getComputedStyle: () => ({ marginLeft: '0px', marginRight: '0px' }),
    };

    // HTMLInputElement.prototype['value'] muss existieren (setupInputObserver
    // liest dessen Property-Descriptor für die value-Setter-Interception).
    class HTMLInputElement {
        get value() { return this._value || ''; }
        set value(v) { this._value = v; }
    }

    return {
        window, document, location,
        GM: {
            getValue: async (key, def) => (gmStore.has(key) ? gmStore.get(key) : def),
            setValue: async (key, val) => { gmStore.set(key, val); },
        },
        HTMLInputElement,
        MutationObserver: class { observe() {} disconnect() {} },
        alert: () => {},
        prompt: () => '{}',
        // Assertions-Helfer
        getElementById, hasId: (id) => registry.has(id),
        get inputEl() { return inputEl; },
        get imageEl() { return imageEl; },
        get videoEl() { return videoEl; },
        // v2.0.10: Für den fixed-Sidebar-Flow (Sichtbarkeits-Check).
        get sidebarEl() { return sidebarEl; },
        get toolbarTarget() { return toolbarTarget; },
        elements, registry, gmStore, docListeners, winListeners,
    };
}

function loadFile(file, env) {
    return withEnv(env, async () => {
        // vm.runInThisContext statt require(): das Bundle ist eine IIFE ohne
        // Exports; require() würde es im Modul-Cache halten und bei einer
        // zweiten Ausführung nicht erneut ausführen.
        vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
        // Das Script startet sofort (loadSettings + init laufen nach den
        // GM.getValue-Awaits); kurz warten, damit init() durchlaufen kann.
        await new Promise(resolve => setTimeout(resolve, 100));
    });
}

// ── UI-Flow: Toolbar + Settings + Panels + Titel-Farben + Save ──────────────
async function runUiFlow() {
    const env = makeEnv({ favoriteTags: { 'rule34.xxx': 'azex' } });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => env.hasId('ibenhancer'), 3000, 'Toolbar #ibenhancer');

        const problems = [];
        for (const id of ['ibenhancerSettingsSave', 'ibenhancerSettingsCancel', 'resizeButton', 'scrollButton']) {
            if (!env.hasId(id)) problems.push(`Settings-Element #${id} fehlt`);
        }
        for (const id of ['ibenhancer-favorite-tags', 'ibenhancer-favorite-tags-list',
            'ibenhancerUSER-favorite-tags', 'ibenhancerUSER-favorite-tags-list',
            'ibe-title-main', 'ibe-title-user']) {
            if (!env.hasId(id)) problems.push(`Panel-Element #${id} fehlt`);
        }
        // v2.0.7: neue Settings-Checkboxen
        for (const id of ['showFavoriteTagsUSERCheckbox', 'updateWithWindowResizeCheckbox',
            'updateScrollOnWindowResizeCheckbox', 'showFitButtonCheckbox', 'showScrollButtonCheckbox']) {
            if (!env.hasId(id)) problems.push(`Settings-Checkbox #${id} fehlt (v2.0.7)`);
        }

        const titleMain = env.getElementById('ibe-title-main');
        const titleUser = env.getElementById('ibe-title-user');
        if (!titleMain || !titleUser) {
            problems.push('Titel-Elemente fehlen (updateTitleColors kann nicht laufen)');
        } else {
            if (titleMain.style.color !== '#fff') problems.push(`Titel main initial: ${titleMain.style.color} (erwartet #fff)`);
            if (titleUser.style.color !== '#fff') problems.push(`Titel user initial: ${titleUser.style.color} (erwartet #fff)`);

            // value-Setter-Interception: input.value = 'azex' triggert
            // updateTitleColors synchron → main grün (Favorite-Tag), user rot.
            env.inputEl.value = 'azex';
            if (titleMain.style.color !== '#00FF00') problems.push(`Titel main nach 'azex': ${titleMain.style.color} (erwartet #00FF00)`);
            if (titleUser.style.color !== '#FF0000') problems.push(`Titel user nach 'azex': ${titleUser.style.color} (erwartet #FF0000)`);

            // v2.0.7: input-Listener (geteilte Debounce-Instanz) aktualisiert weiter
            const inputListener = env.docListeners.input;
            if (typeof inputListener !== 'function') {
                problems.push('input-Listener fehlt');
            } else {
                inputListener({ target: env.inputEl });
                await new Promise(r => setTimeout(r, 400));
                if (titleMain.style.color !== '#00FF00') problems.push(`Titel nach input-Event: ${titleMain.style.color} (erwartet #00FF00)`);
            }
        }

        // v2.0.7: saveSettings persistiert die neuen Optionen
        const saveBtn = env.getElementById('ibenhancerSettingsSave');
        const userCb = env.getElementById('showFavoriteTagsUSERCheckbox');
        const fitCb = env.getElementById('showFitButtonCheckbox');
        if (!saveBtn || !saveBtn.listeners || !saveBtn.listeners.click) {
            problems.push('saveSettings-Listener fehlt');
        } else if (!userCb || !fitCb) {
            problems.push('Neue Checkboxen fehlen für den Save-Test');
        } else {
            userCb.checked = true;
            fitCb.checked = true;
            saveBtn.listeners.click();
            if (env.gmStore.get('showFitButton') !== true) problems.push('saveSettings: showFitButton nicht persistiert');
            if (env.gmStore.get('updateWithWindowResize') !== false) problems.push('saveSettings: updateWithWindowResize nicht persistiert (false)');
            const savedUser = env.gmStore.get('showFavoriteTagsUSER');
            if (!savedUser || savedUser.draw !== true) problems.push('saveSettings: showFavoriteTagsUSER.draw nicht persistiert');
        }

        if (problems.length) return 'FEHLER: ' + problems.join('; ');
        return 'OK – Toolbar+Settings(+v2.0.7-Checkboxen)+Panels, Farben #fff→#00FF00/#FF0000, Save persistiert';
    });
}

// ── Single-Panel: nur main-Panel → Titel wird trotzdem gefärbt (v2.0.7) ──────
async function runSinglePanelFlow() {
    const env = makeEnv({
        gm: {
            showFavoriteTagsUSER: { draw: false, open: false },
            favoriteTags: { 'rule34.xxx': 'azex' },
        },
    });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => env.hasId('ibenhancer'), 3000, 'Toolbar');

        const problems = [];
        if (env.hasId('ibe-title-user')) problems.push('USER-Titel existiert trotz showFavoriteTagsUSER.draw=false');
        const titleMain = env.getElementById('ibe-title-main');
        if (!titleMain) {
            problems.push('Main-Titel fehlt');
        } else {
            env.inputEl.value = 'azex';
            if (titleMain.style.color !== '#00FF00') {
                problems.push(`Titel main (nur 1 Panel): ${titleMain.style.color} (erwartet #00FF00)`);
            }
        }
        return problems.length ? 'FEHLER: ' + problems.join('; ')
            : 'OK – nur main-Panel: Titel wird trotzdem grün (v2.0.7)';
    });
}

// ── Keyboard: isTyping-Guard – Shortcut feuert nicht bei Fokus im Input ─────
async function runKeyboardFlow() {
    const env = makeEnv({ gm: { resizeImageToFit: false } });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => env.hasId('ibenhancer'), 3000, 'Toolbar');

        // Fenster 1000x800 (Aspect 1.25), Bild 1000x1000 (Aspect 1) → Fit = 800x800
        env.document.documentElement.clientWidth = 1000;
        env.document.documentElement.clientHeight = 800;
        env.imageEl.naturalWidth = 1000;
        env.imageEl.naturalHeight = 1000;

        const problems = [];
        const keyup = env.docListeners.keyup;
        if (typeof keyup !== 'function') {
            problems.push('keyup-Listener fehlt');
        } else {
            // Fokus im Such-Input → Shortcut darf NICHT feuern (v2.0.7)
            env.document.activeElement = env.inputEl;
            keyup({ code: 'BracketLeft' });
            await new Promise(r => setTimeout(r, 60));
            if (env.imageEl.width !== 0) problems.push(`Fit feuerte trotz Fokus im Input (width=${env.imageEl.width})`);

            // Kein Fokus → Shortcut feuert → Bild wird auf 800x800 gefittet
            env.document.activeElement = null;
            keyup({ code: 'BracketLeft' });
            await new Promise(r => setTimeout(r, 60));
            if (env.imageEl.width !== 800) problems.push(`Fit nach Shortcut: width=${env.imageEl.width} (erwartet 800)`);
        }
        return problems.length ? 'FEHLER: ' + problems.join('; ')
            : 'OK – isTyping-Guard: kein Fit im Input, Fit ohne Fokus (800x800)';
    });
}

// ── Minus-Tag: data-minus-tag-Klick hängt " -tag" an (v2.0.7) ────────────────
async function runMinusTagFlow() {
    const env = makeEnv({});
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => env.hasId('ibenhancer'), 3000, 'Toolbar');

        const problems = [];
        const click = env.docListeners.click;
        if (typeof click !== 'function') {
            problems.push('click-Listener fehlt');
        } else {
            // Apostroph-Tag: früher hätte der Inline-onclick das Attribut aufgebrochen
            const fakeMinus = { dataset: { minusTag: "a'b" } };
            const fakeTarget = {
                closest: (sel) => (sel === '[data-minus-tag]' ? fakeMinus : null),
            };
            click({ target: fakeTarget, preventDefault() {} });
            if (env.inputEl.value !== " -a'b") {
                problems.push(`Minus-Tag: value=${JSON.stringify(env.inputEl.value)} (erwartet " -a'b")`);
            }
        }
        return problems.length ? 'FEHLER: ' + problems.join('; ')
            : 'OK – data-minus-tag hängt " -tag" an (ohne Inline-onclick)';
    });
}

// ── Media-Fit (v2.0.8): Aspect-Guard + Metadaten-Robustheit ─────────────────
// Fall A: Video mit bereits geladenen Metadaten (readyState >= 1) → fit läuft
//         sofort, ohne aufs loadedmetadata-Event zu warten.
// Fall B: Video ohne Metadaten (readyState 0) → Aspect-Guard (kein Infinity),
//         danach loadedmetadata feuern → fit läuft über den Listener.
// Fall C: Bereits geladenes Bild (complete && naturalWidth > 0) → fit läuft
//         sofort, ohne aufs (evtl. verpasste) load-Event zu warten.
async function runMediaFitFlow() {
    const results = [];

    // Fall A: Metadaten schon da
    const envA = makeEnv({ video: true, gm: { resizeImageToFit: true, resizeVideoToFit: true, autoScrollToContent: false } });
    envA.document.documentElement.clientWidth = 1000;
    envA.document.documentElement.clientHeight = 800;
    envA.videoEl.readyState = 1;
    envA.videoEl.videoWidth = 1000;
    envA.videoEl.videoHeight = 1000;
    await withEnv(envA, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => envA.hasId('ibenhancer'), 3000, 'Toolbar (A)');
        await waitFor(() => envA.videoEl.width === 800, 2000, 'Video-Fit bei readyState>=1');
        results.push('Video readyState>=1 → Sofort-Fit (800x800)');
    });

    // Fall B: Metadaten fehlen → Guard + loadedmetadata-Flow
    const envB = makeEnv({ video: true, gm: { resizeImageToFit: true, resizeVideoToFit: true, autoScrollToContent: false } });
    envB.document.documentElement.clientWidth = 1000;
    envB.document.documentElement.clientHeight = 800;
    envB.videoEl.readyState = 0;
    envB.videoEl.videoWidth = 0;
    envB.videoEl.videoHeight = 0;
    await withEnv(envB, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => envB.hasId('ibenhancer'), 3000, 'Toolbar (B)');
        await new Promise(r => setTimeout(r, 60));
        const problems = [];
        if (envB.videoEl.width !== 0) problems.push(`Aspect-Guard: width=${envB.videoEl.width} (erwartet 0, kein Infinity)`);
        // Metadaten nachreichen + Event feuern → Listener-Pfad
        envB.videoEl.videoWidth = 1000;
        envB.videoEl.videoHeight = 1000;
        if (!envB.videoEl.listeners.loadedmetadata) {
            problems.push('loadedmetadata-Listener fehlt (readyState=0)');
        } else {
            envB.videoEl.listeners.loadedmetadata();
            await waitFor(() => envB.videoEl.width === 800, 2000, 'Video-Fit nach loadedmetadata');
        }
        results.push(problems.length ? 'FEHLER: ' + problems.join('; ') : 'Video readyState=0 → Guard + loadedmetadata-Fit (800x800)');
    });

    // Fall C: Bild bereits geladen (complete)
    const envC = makeEnv({ gm: { resizeImageToFit: true, resizeVideoToFit: true, autoScrollToContent: false } });
    envC.document.documentElement.clientWidth = 1000;
    envC.document.documentElement.clientHeight = 800;
    envC.imageEl.complete = true;
    envC.imageEl.naturalWidth = 1000;
    envC.imageEl.naturalHeight = 1000;
    await withEnv(envC, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => envC.hasId('ibenhancer'), 3000, 'Toolbar (C)');
        await waitFor(() => envC.imageEl.width === 800, 2000, 'Bild-Fit bei complete');
        results.push('Bild complete → Sofort-Fit (800x800)');
    });

    return results.some(r => r.startsWith('FEHLER')) ? 'FEHLER: ' + results.join(' | ') : 'OK – ' + results.join(' | ');
}

// ── Pair-Dedup (v2.0.8): umgekehrtes Paar ersetzt statt Duplikat ────────────
async function runPairDedupFlow() {
    const env = makeEnv({ favoriteTags: { 'rule34.xxx': '(+kaistar+~+user:kaistar_+)' } });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => env.hasId('ibenhancer-favorite-tags-add-current'), 3000, 'Add-Button');

        const problems = [];
        const addBtn = env.getElementById('ibenhancer-favorite-tags-add-current');
        const saved = () => (env.gmStore.get('favoriteTags') || {})['rule34.xxx'] || '';
        const count = () => saved().trim().split(/\s+/).filter(t => t).length;
        if (!addBtn || !addBtn.listeners || !addBtn.listeners.click) {
            problems.push('add-current-Listener fehlt');
        } else {
            // 1) Umgekehrtes Paar abspeichern → ersetzt statt Duplikat
            env.inputEl.value = '( user:kaistar_ ~ kaistar )';
            addBtn.listeners.click({ preventDefault() {} });
            if (saved() !== '(+user:kaistar_+~+kaistar+)') {
                problems.push(`Pair-Dedup: gespeichert=${JSON.stringify(saved())} (erwartet '(+user:kaistar_+~+kaistar+)')`);
            }
            if (count() !== 1) problems.push(`Pair-Dedup: ${count()} Tags statt 1 nach Ersetzen`);

            // 2) Gleiches Paar erneut → unverändert (kein Duplikat)
            addBtn.listeners.click({ preventDefault() {} });
            if (count() !== 1) problems.push(`Pair-Dedup: ${count()} Tags statt 1 nach zweitem Klick`);

            // 3) Anderes Paar → wird angehängt
            env.inputEl.value = '( other ~ tag )';
            addBtn.listeners.click({ preventDefault() {} });
            if (count() !== 2) problems.push(`Pair-Dedup: ${count()} Tags statt 2 nach Anhängen`);
            if (!saved().includes('(+other+~+tag+)')) problems.push(`Pair-Dedup: neues Paar fehlt: ${JSON.stringify(saved())}`);
        }
        return problems.length ? 'FEHLER: ' + problems.join('; ')
            : 'OK – Pair-Dedup: umgekehrtes Paar ersetzt, identisch bleibt, anderes wird angehängt';
    });
}

// ── Pair-Input (v2.0.9): +-Link ersetzt Paar in anderer Reihenfolge im Such-Input ─
async function runPairInputFlow() {
    const env = makeEnv({ favoriteTags: { 'rule34.xxx': '(+kaistar+~+user:kaistar_+)' } });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => env.hasId('ibenhancer'), 3000, 'Toolbar');

        const problems = [];
        const click = env.docListeners.click;
        const addTagClick = (addTag) => click({
            target: { closest: (sel) => (sel === '[data-add-tag]' ? { dataset: { addTag } } : null) },
            preventDefault() {},
        });
        if (typeof click !== 'function') {
            problems.push('click-Listener fehlt');
        } else {
            // 1) Input enthält das Paar in umgekehrter Reihenfolge → +-Link ersetzt statt anhängt
            env.inputEl.value = '( user:kaistar_ ~ kaistar )';
            addTagClick('( kaistar ~ user:kaistar_ )');
            if (env.inputEl.value !== '( kaistar ~ user:kaistar_ )') {
                problems.push(`+-Link Pair-Ersetzung: value=${JSON.stringify(env.inputEl.value)} (erwartet '( kaistar ~ user:kaistar_ )')`);
            }
            if (env.inputEl.value.includes('(+')) problems.push('+-Link: kanonisches Duplikat verblieben');

            // 2) Leerer Input → Paar wird gesetzt
            env.inputEl.value = '';
            addTagClick('( kaistar ~ user:kaistar_ )');
            if (env.inputEl.value !== '( kaistar ~ user:kaistar_ )') {
                problems.push(`+-Link leerer Input: ${JSON.stringify(env.inputEl.value)}`);
            }

            // 3) Einfacher Tag mit gleicher Basis → wird durch das Paar ersetzt
            env.inputEl.value = 'kaistar azex';
            addTagClick('( kaistar ~ user:kaistar_ )');
            if (env.inputEl.value !== '( kaistar ~ user:kaistar_ ) azex') {
                problems.push(`+-Link Basis-Ersetzung: ${JSON.stringify(env.inputEl.value)} (erwartet '( kaistar ~ user:kaistar_ ) azex')`);
            }
        }
        return problems.length ? 'FEHLER: ' + problems.join('; ')
            : 'OK – +-Link: Paar in anderer Reihenfolge wird ersetzt statt doppelt angehängt (v2.0.9)';
    });
}

// ── Custom-Site-Config (v2.0.10): ALLE Selektoren werden angewandt ─────────
// Regression: der Setup-Prompt fragt containerDOM/imageDOM/thumbnailDOM ab,
// configureSites() übernahm aber nur toolbarDOM → auf fremden Boards blieben
// die Defaults stehen und das Bild wurde nie gefunden.
// WICHTIG: Hostname != rule34.xxx – configureSites() hat für rule34.xxx einen
// hartkodierten Sonderfall, der VOR der customSites-Prüfung greift und die
// Config komplett umgehen würde. Genau das prüft dieser Test mit.
async function runCustomSiteSelectorsFlow() {
    const cfg = {
        toolbarDOM: '.my-toolbar',
        containerDOM: '.my-content',
        imageDOM: '.my-image',
        thumbnailDOM: '.my-thumb',
    };
    const HOST = 'otherboard.example';
    const env = makeEnv({
        gm: { customSites: { [HOST]: cfg } },
        hostname: HOST,
        customSelectors: true,
    });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await new Promise(r => setTimeout(r, 150));

        const problems = [];
        // Bei gesetzter customSites-Config muss der Delete-Button erscheinen
        // (der Setup-Button nur, wenn KEINE Config existiert).
        if (!env.hasId('ibenhancerDeleteConfigButton')) problems.push('Delete-Button fehlt (customSites-Config nicht erkannt)');
        if (env.hasId('ibenhancerSetupButton')) problems.push('Setup-Button erscheint trotz vorhandener Config');
        // Und die Toolbar muss unter dem CUSTOM-Selektor sitzen, nicht beim Default.
        if (!env.registry.has('ibenhancer')) problems.push('Toolbar nicht erzeugt (imageDOM-Default passt nicht zur Custom-Config)');
        return problems.length ? 'FEHLER: ' + problems.join('; ')
            : 'OK – Custom-Site-Config: alle Selektoren angewandt (imageDOM/custom statt Default), Delete-Button aktiv';
    });
}

// ── Video-Volume (v2.0.10): NaN aus leerem Input darf nicht persistiert ─────
// Regression: parseFloat('') = NaN → `video.volume = NaN` wirft beim nächsten
// Laden einen TypeError und bricht init() ab. saveSettings() klemmt jetzt.
async function runVolumeNaNFlow() {
    const env = makeEnv({ gm: { videoVolume: 0.5 } });
    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => env.hasId('ibenhancerSettingsSave'), 3000, 'Settings-Modal');

        const problems = [];
        const saveBtn = env.getElementById('ibenhancerSettingsSave');
        const volInput = env.getElementById('videoVolumeInput');
        if (!saveBtn || !saveBtn.listeners || !saveBtn.listeners.click) {
            problems.push('saveSettings-Listener fehlt');
        } else if (!volInput) {
            problems.push('videoVolumeInput fehlt');
        } else {
            // 1) Leeres Feld → darf NICHT NaN persistieren
            volInput.value = '';
            saveBtn.listeners.click();
            const v1 = env.gmStore.get('videoVolume');
            if (!Number.isFinite(v1)) problems.push(`Leeres Feld persistiert ${v1} (erwartet: endlicher Wert, Fallback 0.5)`);
            if (v1 !== 0.5) problems.push(`Leeres Feld: videoVolume=${v1} (erwartet Fallback 0.5)`);

            // 2) Out-of-Range → geklemmt
            volInput.value = '5';
            saveBtn.listeners.click();
            if (env.gmStore.get('videoVolume') !== 1) problems.push(`Wert 5 nicht auf 1 geklemmt: ${env.gmStore.get('videoVolume')}`);

            // 3) Negativ → geklemmt
            volInput.value = '-3';
            saveBtn.listeners.click();
            if (env.gmStore.get('videoVolume') !== 0) problems.push(`Wert -3 nicht auf 0 geklemmt: ${env.gmStore.get('videoVolume')}`);

            // 4) Gültiger Wert bleibt unangetastet
            volInput.value = '0.25';
            saveBtn.listeners.click();
            if (env.gmStore.get('videoVolume') !== 0.25) problems.push(`Gültiger Wert verändert: ${env.gmStore.get('videoVolume')}`);
        }
        return problems.length ? 'FEHLER: ' + problems.join('; ')
            : 'OK – videoVolume: NaN abgefangen, Out-of-Range geklemmt, gültige Werte unverändert';
    });
}

// ── Sidebar-Sichtbarkeit (v2.0.10): position:fixed wird korrekt erkannt ────
// Regression: offsetParent ist auch für position:fixed-Elemente null, eine
// fixed Sidebar wurde als unsichtbar gewertet und ihre Breite NICHT abgezogen
// → Bild zu groß gefittet. getClientRects() ist der korrekte Check.
async function runFixedSidebarFitFlow() {
    // Fenster 1000x800, Sidebar 200px breit + 0px Margen.
    // Erwartung: 1000 - 200 - 20 = 780 nutzbare Breite → Aspect 780/800 = 0.975.
    // Bild 1000x1000 (Aspect 1) → windowAspect < contentAspect → Else-Zweig:
    // Breite begrenzt → { width: 780, height: 780 }.
    const env = makeEnv({ gm: { resizeImageToFit: true, autoScrollToContent: false } });
    env.document.documentElement.clientWidth = 1000;
    env.document.documentElement.clientHeight = 800;
    env.imageEl.naturalWidth = 1000;
    env.imageEl.naturalHeight = 1000;
    // position:fixed simulieren: offsetParent === null, aber GERENDERT
    // (getClientRects() liefert Rects). Das ist genau der Fall, den der
    // offsetParent-Check fälschlich als "unsichtbar" wertete.
    env.sidebarEl.offsetParent = null;
    env.sidebarEl.offsetWidth = 200;
    env.sidebarEl.getClientRects = () => [{ left: 0, top: 0, right: 200, bottom: 800 }];

    return withEnv(env, async () => {
        vm.runInThisContext(fs.readFileSync(BUILT, 'utf8'), { filename: BUILT });
        await waitFor(() => env.hasId('ibenhancer'), 3000, 'Toolbar');
        // getContentProps + fitContent über den Tastatur-Shortcut auslösen.
        env.document.activeElement = null;
        env.docListeners.keyup({ code: 'BracketLeft' });
        await waitFor(() => env.imageEl.width !== 0, 2000, 'Fit mit fixed Sidebar');

        const problems = [];
        if (env.imageEl.width !== 780) {
            problems.push(`fixed-Sidebar nicht abgezogen: width=${env.imageEl.width} (erwartet 780 = 1000-200-20)`);
        }
        return problems.length ? 'FEHLER: ' + problems.join('; ')
            : 'OK – position:fixed-Sidebar wird als sichtbar erkannt und in der Breite abgezogen (780x780)';
    });
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
    const results = {};
    const files = [['Bundle', BUILT]];
    if (baselineFile) files.push(['Git-HEAD-Baseline', baselineFile]);
    for (const [label, file] of files) {
        try {
            await loadFile(file, makeEnv());
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

    const flows = [
        ['UI-Flow', runUiFlow],
        ['Single-Panel', runSinglePanelFlow],
        ['Keyboard', runKeyboardFlow],
        ['Minus-Tag', runMinusTagFlow],
        ['Media-Fit (v2.0.8)', runMediaFitFlow],
        ['Pair-Dedup (v2.0.8)', runPairDedupFlow],
        ['Pair-Input (v2.0.9)', runPairInputFlow],
        ['Custom-Site-Selektoren (v2.0.10)', runCustomSiteSelectorsFlow],
        ['Video-Volume (v2.0.10)', runVolumeNaNFlow],
        ['Fixed-Sidebar (v2.0.10)', runFixedSidebarFitFlow],
    ];
    let allFlowsOk = true;
    for (const [name, fn] of flows) {
        try {
            const result = await fn();
            console.log(name + ':', result);
            if (!result.startsWith('OK')) allFlowsOk = false;
        } catch (e) {
            console.log(name + ': FEHLER: ' + e.message);
            allFlowsOk = false;
        }
    }

    process.exit(baselineOk && allFlowsOk ? 0 : 1);
})();
