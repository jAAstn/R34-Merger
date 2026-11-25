// Unit-Tests für die Ende-/Retry-Erkennung des Infinite-Scrolls
// (src/infinite-scroll.js): parseThumbs (isList-Erkennung), classifyLoadResult
// (Ende/Retry/Append-Entscheidung) und backoffDelay – mit Fixtures für echte
// Liste, leere letzte Seite, Duplikat-Seite und Challenge-Seite OHNE
// Listen-Markup (der v5.37-Bug: solche 200er-Seiten wurden fälschlich als
// "Ende der Ergebnisse" gewertet).
// Lauf: node test/infinite-scroll.test.mjs
import { DOMParser } from 'linkedom';
import { parseThumbs, classifyLoadResult, backoffDelay } from '../src/infinite-scroll.js';

// parseThumbs nutzt den globalen DOMParser (wie im Browser) – linkedom reicht.
globalThis.DOMParser = DOMParser;

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (desc, actual, expected) => {
    const ok = eq(actual, expected);
    ok ? pass++ : fail++;
    console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`));
};

// --- Fixtures ---------------------------------------------------------------

// Echte Listen-Seite: div.image-list mit 3 span.thumb (id="p<id>"-Struktur wie
// rule34) + #paginator.
const LIST_FIXTURE = `<!DOCTYPE html><html><body>
<div id="content"><div class="image-list">
  <span class="thumb" id="p1001"><a href="index.php?page=post&amp;s=view&amp;id=1001"><img src="//img.rule34.xxx/thumb1.jpg" alt="foo bar" /></a></span>
  <span class="thumb" id="p1002"><a href="index.php?page=post&amp;s=view&amp;id=1002"><img src="//img.rule34.xxx/thumb2.jpg" alt="foo baz" /></a></span>
  <span class="thumb" id="p1003"><a href="index.php?page=post&amp;s=view&amp;id=1003"><img src="//img.rule34.xxx/thumb3.jpg" alt="foo qux" /></a></span>
</div>
<div id="paginator"><a href="index.php?page=post&amp;s=list&amp;tags=all&amp;pid=126">&gt;</a></div>
</div></body></html>`;

// Leere letzte Seite: Listen-Markup vorhanden, aber 0 Thumbs.
const EMPTY_FIXTURE = `<!DOCTYPE html><html><body>
<div id="content"><div class="image-list"></div></div>
<div id="paginator"><a href="index.php?page=post&amp;s=list&amp;tags=all&amp;pid=126">&gt;</a></div>
</body></html>`;

// Duplikat-Seite: rule34 wiederholt auf pid > letzte Seite die letzte Seite
// (gleiche Thumbs wie im Live-DOM, hier repräsentiert durch dieselben IDs).
const DUP_FIXTURE = `<!DOCTYPE html><html><body>
<div id="content"><div class="image-list">
  <span class="thumb" id="p1001"><a href="index.php?page=post&amp;s=view&amp;id=1001"><img src="//img.rule34.xxx/thumb1.jpg" alt="foo bar" /></a></span>
  <span class="thumb" id="p1002"><a href="index.php?page=post&amp;s=view&amp;id=1002"><img src="//img.rule34.xxx/thumb2.jpg" alt="foo baz" /></a></span>
</div>
</div></body></html>`;

// Favoriten-Seite (page=favorites&s=view): span.thumb steckt in einem äußeren
// Wrapper-Span mit <br> + "Remove"-Link; danach folgt das posts[id]-Script.
const FAV_FIXTURE = `<!DOCTYPE html><html><body>
<div id="content"><div class="image-list">
  <span style="align-self: flex-start; display: grid;">
    <span class="thumb" id="s1001"><a href="index.php?page=post&amp;s=view&amp;id=1001"><img src="//img.rule34.xxx/thumb1.jpg" alt="foo bar" /></a></span>
    <br>
    <a href="#" onclick="document.location='index.php?page=favorites&amp;s=delete&amp;id=1001'; return false;"><b>Remove</b></a>
  </span>
  <script type="text/javascript">
    posts[1001] = { tags: "foo bar".split(/ /g), rating: 'Explicit', score: '10' }
  </script>
  <span style="align-self: flex-start; display: grid;">
    <span class="thumb" id="s1002"><a href="index.php?page=post&amp;s=view&amp;id=1002"><img src="//img.rule34.xxx/thumb2.jpg" alt="foo baz" /></a></span>
    <br>
    <a href="#" onclick="document.location='index.php?page=favorites&amp;s=delete&amp;id=1002'; return false;"><b>Remove</b></a>
  </span>
  <script type="text/javascript">
    posts[1002] = { tags: "foo baz".split(/ /g), rating: 'Explicit', score: '20' }
  </script>
</div></div></body></html>`;

// Challenge-/Bot-Schutz-Seite: 200er-Antwort OHNE Listen-Markup (Cloudflare).
const CHALLENGE_FIXTURE = `<!DOCTYPE html><html><head><title>Just a moment…</title></head>
<body>
<div class="cf-browser-verification cf-im-under-attack">
  <form class="challenge-form" action="/cdn-cgi/challenge-platform/h/g/orchestrate/jsch/v1" method="POST">
    <input type="hidden" name="md" value="abc" />
  </form>
</div>
</body></html>`;

// --- parseThumbs: isList-Erkennung ------------------------------------------

console.log('parseThumbs:');
{
    const list = parseThumbs(LIST_FIXTURE);
    check('echte Liste → isList true', list.isList, true);
    check('echte Liste → 3 Thumbs', list.thumbs.length, 3);

    const empty = parseThumbs(EMPTY_FIXTURE);
    check('leere Seite → isList true (Listen-Markup vorhanden)', empty.isList, true);
    check('leere Seite → 0 Thumbs', empty.thumbs.length, 0);

    const dup = parseThumbs(DUP_FIXTURE);
    check('Duplikat-Seite → isList true', dup.isList, true);
    check('Duplikat-Seite → 2 Thumbs', dup.thumbs.length, 2);

    const challenge = parseThumbs(CHALLENGE_FIXTURE);
    check('Challenge-Seite → isList false', challenge.isList, false);
    check('Challenge-Seite → 0 Thumbs', challenge.thumbs.length, 0);
}

// --- parseThumbs: nodes (Container + posts[id]-Scripts) ----------------------

console.log('parseThumbs nodes:');
{
    // Normale Liste: kein Wrapper → der thumb selbst ist der Container.
    const list = parseThumbs(LIST_FIXTURE);
    check('Liste → 3 Container, keine Scripts', list.nodes.map(n => n.tagName), ['SPAN', 'SPAN', 'SPAN']);

    // Favoriten: Container = äußerer Wrapper (mit "Remove"-Link) + Script.
    const fav = parseThumbs(FAV_FIXTURE);
    check('Favoriten → 2 Thumbs erkannt', fav.thumbs.length, 2);
    check('Favoriten → 4 Knoten (Wrapper+Script je Post)', fav.nodes.length, 4);
    check('Favoriten → Reihenfolge Wrapper/Script', fav.nodes.map(n => n.tagName), ['SPAN', 'SCRIPT', 'SPAN', 'SCRIPT']);
    check('Favoriten → Container enthält "Remove"-Link', fav.nodes[0].querySelector('a[onclick*="favorites&s=delete"]')?.textContent.trim(), 'Remove');
    check('Favoriten → Container enthält Thumb', fav.nodes[0].querySelector('span.thumb')?.id, 's1001');
    check('Favoriten → Script gehört zum Post 1001', fav.nodes[1].textContent.includes('posts[1001]'), true);
    check('Favoriten → zweiter Container ist der Wrapper', fav.nodes[2].querySelector('span.thumb')?.id, 's1002');
}

// --- classifyLoadResult: Ende/Retry/Append ----------------------------------

console.log('classifyLoadResult:');
{
    const list = parseThumbs(LIST_FIXTURE);
    check('neue Posts → append', classifyLoadResult({ thumbs: list.thumbs, isList: true, existingIds: new Set(), newIds: ['1001', '1002', '1003'] }), 'append');

    check('leere Seite → end', classifyLoadResult({ thumbs: [], isList: true, existingIds: new Set(), newIds: [] }), 'end');

    check('nur Duplikate → end', classifyLoadResult({ thumbs: [{}, {}], isList: true, existingIds: new Set(['1001', '1002']), newIds: ['1001', '1002'] }), 'end');
    check('teils Duplikate → append', classifyLoadResult({ thumbs: [{}, {}], isList: true, existingIds: new Set(['1001']), newIds: ['1001', '1002'] }), 'append');
    check('keine IDs extrahierbar → append (nicht end)', classifyLoadResult({ thumbs: [{}, {}], isList: true, existingIds: new Set(), newIds: [] }), 'append');

    check('Challenge → retry', classifyLoadResult({ thumbs: [], isList: false, existingIds: new Set(), newIds: [] }), 'retry');
    // Entscheidend (v5.37-Bug): Challenge-Seite mit 0 Thumbs darf NICHT 'end' sein.
    check('Challenge mit 0 Thumbs → retry, NICHT end', classifyLoadResult({ thumbs: [], isList: false, existingIds: new Set(), newIds: [] }), 'retry');
}

// --- backoffDelay -----------------------------------------------------------

console.log('backoffDelay:');
check('attempt 0 → 1000 ms', backoffDelay(0), 1000);
check('attempt 1 → 2000 ms', backoffDelay(1), 2000);
check('attempt 2 → 4000 ms', backoffDelay(2), 4000);

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
