// Unit-Tests für den Lösch-Pfad in src/features.js: hideEmptyThumbSpans darf
// nur wirklich leere Thumb-Container entfernen.
//
// Regression für v5.41: isSpanEmpty() prüfte nur "hat sichtbare Anker". Ein
// span.thumb mit Bild, aber ohne (oder nur mit verstecktem) Anker – z.B. ein
// Lazy-Platzhalter oder ein fehlgeschlagenes Laden – galt damit als leer und
// wurde über removePostContainer() samt posts[id]-Script endgültig gelöscht.
//
// Lauf: node test/features.test.mjs
import { parseHTML } from 'linkedom';

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (desc, actual, expected) => {
    const ok = eq(actual, expected);
    ok ? pass++ : fail++;
    console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`));
};

// Ein Dokument mit allen Fällen:
//   p1  Bild OHNE Anker                → muss bleiben (Regression)
//   p2  normaler Thumb mit Anker       → muss bleiben
//   p3  wirklich leer                  → wird entfernt (+ zugehöriges Script)
//   p4  nur unsichtbarer Link          → wird entfernt (Bestandsverhalten)
//   p5  leer, aber vom Tag-Hider versteckt → bleibt (Guard)
//   p6  Favoriten-Wrapper mit Bild ohne Anker → Wrapper + Script bleiben
//   p7  img in per display:none verstecktem Anker (Site-Blacklist) → wird entfernt
//   p8  1:1 das echte Favoriten-Markup (Wrapper > span.thumb > a#p8[display:none])
//       → Wrapper + posts[id]-Script werden entfernt
//   p9  r34-Platzhalterbild (img.blacklist-img) ohne Anker → wird entfernt
//   p10 echtes Bild + zusätzlicher versteckter Link → bleibt (sichtbarer Inhalt)
const FIXTURE = `<!DOCTYPE html><html><body>
<div id="content"><div class="image-list">
  <span class="thumb" id="p1"><img src="//img.rule34.xxx/1.jpg" alt="foo"></span>
  <script>posts[1] = {"tags":"foo"};</script>
  <span class="thumb" id="p2"><a href="index.php?page=post&amp;s=view&amp;id=2"><img src="//img.rule34.xxx/2.jpg" alt="bar"></a></span>
  <span class="thumb" id="p3"></span>
  <script>posts[3] = {"tags":"x"};</script>
  <span class="thumb" id="p4"><a href="index.php?page=post&amp;s=view&amp;id=4" style="display:none">leer</a></span>
  <span class="thumb" id="p5" data-r34th-hider-hidden="1"></span>
  <span style="align-self:flex-start;display:grid"><span class="thumb" id="p6"><img src="//img.rule34.xxx/6.jpg" alt="baz"></span><br></span>
  <script>posts[6] = {"tags":"baz"};</script>
  <span class="thumb" id="p7"><a href="index.php?page=post&amp;s=view&amp;id=7" style="display:none"><img src="//img.rule34.xxx/7.jpg" alt="blocked"></a></span>
  <script>posts[7] = {"tags":"blocked"};</script>
  <span style="align-self: flex-start; display: grid; grid-template-rows: auto 10px;"><span class="thumb"><a id="p8" href="index.php?page=post&amp;s=view&amp;id=8" style="display: none;"><img src="//img.rule34.xxx/thumbnail_8.jpg?8" alt="blocked"></a></span></span>
  <script>posts[8] = {"tags":"blocked2"};</script>
  <span class="thumb" id="p9"><img class="blacklist-img" src="//rule34.xxx/blacklisted.png" alt="blacklisted"></span>
  <span class="thumb" id="p10"><a href="index.php?page=post&amp;s=view&amp;id=10"><img src="//img.rule34.xxx/10.jpg" alt="ok"></a><a href="#" style="display:none">x</a></span>
</div></div></body></html>`;

const { document } = parseHTML(FIXTURE);
global.document = document;
global.location = { href: 'https://rule34.xxx/index.php?page=post&s=list&tags=all', origin: 'https://rule34.xxx' };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.GM_addStyle = () => {};
// updatePageIndicator registriert beim Modul-Load einen Listener – ein Stub
// genügt, die getestete Funktion braucht kein echtes window.
global.window = { addEventListener: () => {}, dispatchEvent: () => true };

const { hideEmptyThumbSpans } = await import('../src/features.js');

const alive = id => !!document.getElementById(id);
// Auf den Favoriten-Seiten sitzt die Post-ID auf dem Anker (a#p<id>), das
// span.thumb selbst hat keine id – so wie im echten Markup vom 2026-11-21.
const aliveAnchor = id => !!document.querySelector('a#p' + id);
const hasScript = id => Array.from(document.querySelectorAll('script'))
    .some(s => (s.textContent || '').includes(`posts[${id}]`));

console.log('hideEmptyThumbSpans:');

hideEmptyThumbSpans(document);

check('p1 (Bild ohne Anker) bleibt erhalten', alive('p1'), true);
check('p1 posts[id]-Script bleibt erhalten', hasScript(1), true);
check('p2 (normaler Thumb mit Anker) bleibt erhalten', alive('p2'), true);
check('p3 (wirklich leer) wird entfernt', alive('p3'), false);
check('p3 zugehöriges Script wird mit entfernt', hasScript(3), false);
check('p4 (nur unsichtbarer Link) wird entfernt', alive('p4'), false);
check('p5 (vom Tag-Hider versteckt) bleibt erhalten', alive('p5'), true);
check('p6 (Favoriten-Thumb mit Bild ohne Anker) bleibt erhalten', alive('p6'), true);
check('p6 Wrapper und posts[id]-Script bleiben erhalten', hasScript(6), true);
check('p7 (Bild im per display:none versteckten Anker) wird entfernt', alive('p7'), false);
check('p7 zugehöriges Script wird mit entfernt', hasScript(7), false);
check('p8 (echtes Favoriten-Markup, versteckter Anker a#p8) wird entfernt', aliveAnchor(8), false);
check('p8 posts[id]-Script wird mit entfernt', hasScript(8), false);
check('p9 (r34-Platzhalterbild ohne Anker) wird entfernt', alive('p9'), false);
check('p10 (echtes Bild + versteckter Zweitlink) bleibt erhalten', alive('p10'), true);

console.log('\nDirekter ctx (span selbst) – idempotent:');
hideEmptyThumbSpans(document.getElementById('p1'));
check('p1 nach zweitem Lauf weiterhin vorhanden', alive('p1'), true);

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
