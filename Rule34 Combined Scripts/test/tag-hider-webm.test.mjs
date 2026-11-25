// Unit-Tests für die webm/mp4/gif-Thumb-Integration in die Blacklist
// (src/tag-hider.js). Prüft das Verhalten, das auch im Standalone-Script
// "[v0.2] rule34 - webm-Thumbs hider" steckte – nur eben an den
// Blacklist-Toggle gekoppelt und mit Ausnahme-Checkbox im Regeln-Overlay.
//
// Lauf: node test/tag-hider-webm.test.mjs
import { parseHTML } from 'linkedom';

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (desc, actual, expected) => {
    const ok = eq(actual, expected);
    ok ? pass++ : fail++;
    console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`));
};

const LIST_URL = 'https://rule34.xxx/index.php?page=post&s=list&tags=all';
const FAVS_URL = 'https://rule34.xxx/index.php?page=favorites&s=view&id=999';

// Eine Suchergebnis-Seite: Thumb 1 + 3 sind webm/mp4/gif, 2 ist ein normales Bild.
const LIST_HTML = `<html><body><div id="content"><div class="image-list">
  <span class="thumb" id="p1"><a href="index.php?page=post&amp;s=view&amp;id=1"><img class="webm-thumb" alt="furry cat" title="furry cat"></a></span>
  <span class="thumb" id="p2"><a href="index.php?page=post&amp;s=view&amp;id=2"><img alt="dog scenery" title="dog scenery"></a></span>
  <span class="thumb" id="p3"><a href="index.php?page=post&amp;s=view&amp;id=3"><img class="webm-thumb"></a></span>
  <span class="thumb" id="p4"><a href="index.php?page=post&amp;s=view&amp;id=4"><img alt="gore" title="gore"></a></span>
</div></div></body></html>`;

// Favoriten-Seite: jeder Post steckt in einem äußeren Wrapper-<span> + <script>.
const FAVS_HTML = `<html><body><div id="content"><div class="image-list">
  <span style="display:grid"><span class="thumb" id="p1"><a href="index.php?page=post&amp;s=view&amp;id=1"><img class="webm-thumb" alt="furry"></a></span></span>
  <script>posts[1] = {"tags":"furry"};</script>
  <span style="display:grid"><span class="thumb" id="p2"><a href="index.php?page=post&amp;s=view&amp;id=2"><img alt="dog"></a></span></span>
  <script>posts[2] = {"tags":"dog"};</script>
</div></div></body></html>`;

let caseNo = 0;
// Frische TAG-Instanz pro Fall: das Modul liest seinen Zustand einmalig beim
// Import, deshalb wird der Import mit Cache-Buster wiederholt.
const load = async (html, url, seed = {}) => {
    const { window, document } = parseHTML(html);
    const store = { ...seed };
    global.window = window;
    global.document = document;
    global.location = { href: url, origin: new URL(url).origin };
    global.MutationObserver = window.MutationObserver;
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    global.GM_getValue = (k, fb) => (k in store ? store[k] : fb);
    global.GM_setValue = (k, v) => { store[k] = v; };
    global.GM_deleteValue = (k) => { delete store[k]; };
    global.GM_addStyle = () => {};
    global.requestIdleCallback = undefined;
    caseNo += 1;
    const { TAG } = await import(`../src/tag-hider.js?case=${caseNo}`);
    return { TAG, document, store };
};

const hidden = el => el.dataset.r34thHiderHidden === '1';
const styleCss = document => document.getElementById('r34th-webm-hide')?.textContent || '';
const rules = { main: [{ kind: 'word', value: 'gore' }], fav: [] };

// ------------------------------------------------------------------
console.log('Standard (Blacklist AN, Ausnahme nicht gesetzt):');
{
    const { TAG, document } = await load(LIST_HTML, LIST_URL, { r34th_config: { enabled: { main: true, fav: true }, rules } });
    TAG.processAll();
    check('webm-Thumb versteckt', hidden(document.getElementById('p1')), true);
    check('webm-Thumb OHNE alt/title trotzdem versteckt', hidden(document.getElementById('p3')), true);
    check('normales Bild sichtbar', hidden(document.getElementById('p2')), false);
    check('Tag-Regel greift weiterhin (gore)', hidden(document.getElementById('p4')), true);
    check('Frühes CSS gesetzt (Lazy-Load-Schutz)', styleCss(document).includes('img.webm-thumb'), true);
    check('Hidden-Count zählt webm mit', TAG.getHiddenCount(), 3);
}

console.log('\nBlacklist OFF → webm-Thumbs wieder normal sichtbar:');
{
    const { TAG, document } = await load(LIST_HTML, LIST_URL, { r34th_config: { enabled: { main: true, fav: true }, rules } });
    TAG.processAll();
    check('vorher versteckt', hidden(document.getElementById('p1')), true);
    TAG.toggle();
    check('Toggle → OFF', TAG.getEnabled(), false);
    check('webm-Thumb wieder sichtbar', hidden(document.getElementById('p1')), false);
    check('display zurückgesetzt', document.getElementById('p1').style.display, '');
    check('auch webm ohne Tags sichtbar', hidden(document.getElementById('p3')), false);
    check('Tag-Regel ebenfalls aus', hidden(document.getElementById('p4')), false);
    check('CSS geleert', styleCss(document), '');
    TAG.toggle();
    check('Toggle → ON', TAG.getEnabled(), true);
    check('webm-Thumb wieder versteckt', hidden(document.getElementById('p1')), true);
    check('CSS wieder gesetzt', styleCss(document).includes('span.thumb:has(img.webm-thumb)'), true);
}

console.log('\nAusnahme-Checkbox (gespeichert) → webm trotz Blacklist AN sichtbar:');
{
    const { TAG, document } = await load(LIST_HTML, LIST_URL, {
        r34th_config: { enabled: { main: true, fav: true }, rules, showWebm: { main: true, fav: false } },
    });
    TAG.processAll();
    check('Blacklist ist AN', TAG.getEnabled(), true);
    check('webm-Thumb sichtbar', hidden(document.getElementById('p1')), false);
    check('webm ohne Tags sichtbar', hidden(document.getElementById('p3')), false);
    check('normales Bild sichtbar', hidden(document.getElementById('p2')), false);
    check('Tag-Regel greift trotzdem', hidden(document.getElementById('p4')), true);
    check('CSS leer', styleCss(document), '');
}

console.log('\nCheckbox im „Edit blacklist rules“-Overlay:');
{
    const { TAG, document, store } = await load(LIST_HTML, LIST_URL, { r34th_config: { enabled: { main: true, fav: true }, rules } });
    TAG.processAll();
    check('webm-Thumb anfangs versteckt', hidden(document.getElementById('p1')), true);
    TAG.openRules();
    const box = document.querySelector('.r34-modal-box');
    const cb = box.querySelector('#r34th-show-webm');
    check('Checkbox vorhanden', !!cb && cb.type, 'checkbox');
    check('Checkbox startet aus (Ausnahme = nicht gesetzt)', cb.checked, false);
    check('Regel-Textarea gefüllt', box.querySelector('#r34th-rules-text').value, 'gore');
    // Haken setzen + Save klicken (Button mit afterClose = Save)
    cb.checked = true;
    [...box.querySelectorAll('.actions .r34-btn')].find(b => b.textContent === 'Save').click();
    check('Ausnahme gespeichert', store.r34th_config.showWebm.main, true);
    check('Regeln unverändert gespeichert', store.r34th_config.rules.main, rules.main);
    check('webm-Thumb nach Speichern sichtbar', hidden(document.getElementById('p1')), false);
    check('CSS geleert', styleCss(document), '');
}

console.log('\nCheckbox-Haken wieder entfernen → webm wieder versteckt:');
{
    const { TAG, document, store } = await load(LIST_HTML, LIST_URL, {
        r34th_config: { enabled: { main: true, fav: true }, rules, showWebm: { main: true, fav: true } },
    });
    TAG.processAll();
    check('webm-Thumb mit gespeicherter Ausnahme sichtbar', hidden(document.getElementById('p1')), false);
    TAG.openRules();
    const box = document.querySelector('.r34-modal-box');
    check('Checkbox zeigt gespeicherten Zustand', box.querySelector('#r34th-show-webm').checked, true);
    box.querySelector('#r34th-show-webm').checked = false;
    [...box.querySelectorAll('.actions .r34-btn')].find(b => b.textContent === 'Save').click();
    check('Ausnahme zurückgesetzt', store.r34th_config.showWebm.main, false);
    check('webm-Thumb wieder versteckt', hidden(document.getElementById('p1')), true);
}

console.log('\nProfil-Trennung (Favoriten hat eigenes showWebm):');
{
    const { TAG, document } = await load(FAVS_HTML, FAVS_URL, {
        r34th_config: { enabled: { main: true, fav: true }, rules, showWebm: { main: true, fav: false } },
    });
    TAG.processAll();
    const wrapper = document.querySelector('div.image-list > span');
    check('Favoriten: Wrapper mit webm-Thumb versteckt', hidden(wrapper), true);
    check('Favoriten: inneres span.thumb unberührt', hidden(document.getElementById('p1')), false);
    check('Favoriten: Webm-Ziel ist der Wrapper (keine Grid-Lücke)', wrapper.dataset.r34thHiderHidden, '1');
    check('Favoriten: CSS greift ebenfalls', styleCss(document).includes('span.thumb:has(img.webm-thumb)'), true);
}

console.log('\nBestands-Config ohne showWebm (Migration):');
{
    const { TAG, document, store } = await load(LIST_HTML, LIST_URL, { r34th_config: { enabled: { main: true, fav: true }, rules } });
    TAG.processAll();
    check('webm wird mitversteckt (Default = Haken aus)', hidden(document.getElementById('p1')), true);
    check('nicht-crashender Config-Shape', typeof store.r34th_config.showWebm, 'object');
}

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);