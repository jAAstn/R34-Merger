// Unit-Tests für die pure Helfer (src/core.js, src/favorite-tags.js,
// src/title-colors.js) – reine Logik, kein DOM/GM nötig.
// core.js liest document.location.hostname beim Modul-Load (site-Erkennung),
// daher wird vor dem Import ein minimales document-Stub gesetzt.
// Lauf: node test/parser.test.mjs
globalThis.document = { location: { hostname: 'rule34.xxx' } };

const { getBaseTag, parseTagsString, computeFit, debounce, escapeAttr, escapeHtml, getPairSet, mergeTagsIntoList } = await import('../src/core.js');
const { getTagsHtml } = await import('../src/favorite-tags.js');
const { parseSearchTokens, tokenMatchesDb, replaceTagInParsedList } = await import('../src/title-colors.js');

let pass = 0, fail = 0;
const eq = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const check = (desc, actual, expected) => {
  const ok = eq(actual, expected);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${JSON.stringify(expected)}, war ${JSON.stringify(actual)})`));
};

console.log('getBaseTag:');
check('Pair-Tag → linker Teil', getBaseTag('(+mithrandirart+~+user:mithrandirart2+)'), 'mithrandirart');
check('einfacher Tag → unverändert', getBaseTag('azex'), 'azex');
check('user:-Tag → unverändert', getBaseTag('user:jastn'), 'user:jastn');
check('Pair-Tag mit Leerzeichen → getrimmt', getBaseTag('(+a b+~+user:x+)'), 'a b');

console.log('parseTagsString:');
check('einfacher Tag', parseTagsString('azex'), ['azex']);
check('mehrere Tags', parseTagsString('azex mithrandirart'), ['azex', 'mithrandirart']);
check('Pair-Tag → Kanon-Form', parseTagsString('(mithrandirart~user:mithrandirart2)'), ['(+mithrandirart+~+user:mithrandirart2+)']);
check('Pair-Tag mit Leerzeichen → +-Ersetzung', parseTagsString('(a b~user:x)'), ['(+a+b+~+user:x+)']);
check('user:-Tag bleibt', parseTagsString('user:jastn'), ['user:jastn']);
check('negiert → verworfen', parseTagsString('-azex'), []);
check('special (rating:) → verworfen', parseTagsString('rating:safe'), []);
check('comparison (score:>5) → verworfen', parseTagsString('score:>5'), []);
check('Mischung', parseTagsString('azex sort:score user:someone'), ['azex', 'user:someone']);
check('leerer String → null', parseTagsString(''), null);
check('nur Leerzeichen → null', parseTagsString('   '), null);

console.log('parseSearchTokens:');
check('einfacher Token', parseSearchTokens('azex'), ['azex']);
check('Ignorier-Liste gefiltert', parseSearchTokens('azex sort:score -animated height:>1000 -video -animation'), ['azex']);
check('user:-Präfix entfernt', parseSearchTokens('user:jastn azex'), ['jastn', 'azex']);
check('Großschreibung normalisiert', parseSearchTokens('AZEX'), ['azex']);
check('Pair-Tag in Suche', parseSearchTokens('(mithrandirart~user:mithrandirart2)'), ['mithrandirart', 'mithrandirart2']);
check('leerer Input → []', parseSearchTokens(''), []);

console.log('tokenMatchesDb:');
check('Treffer', tokenMatchesDb(['azex'], 'azex othertag'), true);
check('kein Treffer', tokenMatchesDb(['azex'], 'othertag'), false);
check('leere DB → false', tokenMatchesDb(['azex'], ''), false);
check('undefined DB → false', tokenMatchesDb(['azex'], undefined), false);
check('Pair-Liste: Basis-Treffer', tokenMatchesDb(['mithrandirart'], '(+mithrandirart+~+user:mithrandirart2+)'), true);
check('user:-DB → Basis-Treffer', tokenMatchesDb(['mithrandirart2'], 'user:mithrandirart2'), true);
check('user:-Token vs. user:-DB', tokenMatchesDb(['azex'], 'user:azex'), true);
check('Großschreibung in DB', tokenMatchesDb(['azex'], 'AZEX'), true);
check('leere Suchliste → false', tokenMatchesDb([], 'azex'), false);
check('mehrere Token, einer trifft', tokenMatchesDb(['azex', 'foo'], 'foo'), true);

console.log('computeFit:');
check('Fenster breiter als Content (Höhe begrenzt)', computeFit(1.25, 1, 1000, 800), { width: 800, height: 800 });
check('Content breiter als Fenster (Breite begrenzt)', computeFit(1.25, 2, 1000, 800), { width: 1000, height: 500 });
check('gleiche Aspect-Ratio → Else-Zweig', computeFit(1.25, 1.25, 1000, 800), { width: 1000, height: 800 });
check('4:3-Fenster vs. 4:3-Content', computeFit(4 / 3, 4 / 3, 640, 480), { width: 640, height: 480 });
// v2.0.8: Aspect-Guard – unbekannte Proportionen → null statt Infinity
check('0/0-Fall → null (v2.0.8-Guard)', computeFit(0, 0, 0, 0), null);
check('Content-Aspect 0 → null (v2.0.8-Guard)', computeFit(1.25, 0, 1000, 800), null);
check('Window-Aspect 0 → null (v2.0.8-Guard)', computeFit(0, 1, 1000, 800), null);
check('Window 0 → null (v2.0.8-Guard)', computeFit(1.25, 1, 0, 800), null);
check('normale Fälle weiterhin berechnet', computeFit(1.25, 1, 1000, 800), { width: 800, height: 800 });

console.log('replaceTagInParsedList (v2.0.9):');
const r = replaceTagInParsedList;
check('Pair in anderer Reihenfolge → ersetzt', r(['(+user:kaistar_+~+kaistar+)'], '( kaistar ~ user:kaistar_ )'), { list: ['( kaistar ~ user:kaistar_ )'], changed: true });
check('Pair in identischer Reihenfolge → unverändert', r(['(+kaistar+~+user:kaistar_+)'], '( kaistar ~ user:kaistar_ )'), { list: ['(+kaistar+~+user:kaistar_+)'], changed: false });
check('3er-Pair umsortiert → ersetzt', r(['(+c+~+a+~+b+)'], '( a ~ b ~ c )'), { list: ['( a ~ b ~ c )'], changed: true });
check('Pair ersetzt einfachen Tag mit gleicher Basis', r(['kaistar', 'azex'], '( kaistar ~ user:kaistar_ )'), { list: ['( kaistar ~ user:kaistar_ )', 'azex'], changed: true });
check('Pair ohne Match → angehängt', r(['azex'], '( kaistar ~ user:kaistar_ )'), { list: ['azex', '( kaistar ~ user:kaistar_ )'], changed: true });
check('einfacher Tag, kein Match → angehängt', r(['mithrandirart', 'azex'], 'other'), { list: ['mithrandirart', 'azex', 'other'], changed: true });
check('einfacher Tag, identisch → unverändert', r(['kaistar'], 'kaistar'), { list: ['kaistar'], changed: false });

console.log('escapeAttr (v2.0.7):');
check('& und " escaped', escapeAttr('a&b"c'), 'a&amp;b&quot;c');
check('Apostroph bleibt (doppelt-quotiertes Attribut)', escapeAttr("a'b"), "a'b");
check('ohne Sonderzeichen', escapeAttr('azex'), 'azex');

console.log('escapeHtml (v2.0.10):');
check('<> escaped', escapeHtml('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
check('& zuerst escaped', escapeHtml('a&<b>'), 'a&amp;&lt;b&gt;');
check('" und escaped', escapeHtml('a"b'), 'a&quot;b');
check("Apostroph escaped", escapeHtml("a'b"), 'a&#39;b');

console.log('getPairSet (v2.0.8):');
check('Pair-Tag → sortierte Mitglieder', getPairSet('(+kaistar+~+user:kaistar_+)'), ['kaistar', 'user:kaistar_']);
check('umgekehrte Reihenfolge → gleiche sortierte Liste', getPairSet('(+user:kaistar_+~+kaistar+)'), ['kaistar', 'user:kaistar_']);
check('3er-Pair → 3 sortierte Mitglieder', getPairSet('(+c+~+a+~+b+)'), ['a', 'b', 'c']);
check('Groß/Klein normalisiert', getPairSet('(+KAIstar+~+user:x+)'), ['kaistar', 'user:x']);
check('einfacher Tag → null', getPairSet('azex'), null);
check('user:-Tag → null', getPairSet('user:jastn'), null);

console.log('mergeTagsIntoList (v2.0.8):');
check('Pair umgekehrt → ersetzt (neue Reihenfolge, gleiche Position)', mergeTagsIntoList(['(+kaistar+~+user:kaistar_+)'], ['(+user:kaistar_+~+kaistar+)']), { list: ['(+user:kaistar_+~+kaistar+)'], changed: true });
check('identisches Paar → unverändert', mergeTagsIntoList(['(+kaistar+~+user:kaistar_+)'], ['(+kaistar+~+user:kaistar_+)']), { list: ['(+kaistar+~+user:kaistar_+)'], changed: false });
check('3er-Pair umsortiert → ersetzt', mergeTagsIntoList(['(+a+~+b+~+c+)'], ['(+c+~+a+~+b+)']), { list: ['(+c+~+a+~+b+)'], changed: true });
check('verschiedene Pairs → beide gespeichert', mergeTagsIntoList(['(+a+~+b+)'], ['(+c+~+d+)']), { list: ['(+a+~+b+)', '(+c+~+d+)'], changed: true });
check('einfacher Tag → angehängt', mergeTagsIntoList(['azex'], ['other']), { list: ['azex', 'other'], changed: true });
check('Basis-Ersetzung bleibt (einfach ↔ Pair)', mergeTagsIntoList(['mithrandirart'], ['(+mithrandirart+~+user:x+)']), { list: ['(+mithrandirart+~+user:x+)'], changed: true });
check('Pair ersetzt einfachen Tag mit gleicher Basis', mergeTagsIntoList(['kaistar'], ['(+kaistar+~+user:kaistar_+)']), { list: ['(+kaistar+~+user:kaistar_+)'], changed: true });

console.log('getTagsHtml / data-minus-tag (v2.0.7):');
const minusHtml = getTagsHtml('main', ['azex']);
check('Minus-Link nutzt data-minus-tag', minusHtml.includes('data-minus-tag="azex"'), true);
check('kein onclick im HTML', minusHtml.includes('onclick='), false);
check('Plus-Link escaped (data-add-tag)', minusHtml.includes('data-add-tag="azex"'), true);
const apostropheHtml = getTagsHtml('main', ["a'b"]);
check('Apostroph im data-minus-tag (kein Breakout)', apostropheHtml.includes('data-minus-tag="a\'b"'), true);
const userHtml = getTagsHtml('user', ['azex', 'rating:safe']);
check('USER-Variante: keine Metadaten-Sortierung', userHtml.indexOf('rating:safe') > userHtml.indexOf('azex'), true);
const mainHtmlSorted = getTagsHtml('main', ['azex', 'rating:safe']);
check('main-Variante: Metadaten-Tags ans Ende', mainHtmlSorted.indexOf('rating:safe') > mainHtmlSorted.indexOf('azex'), true);
check('Kommentar "//" beendet die Liste', getTagsHtml('main', ['azex', '//', 'foo']).includes('foo'), false);

// v2.0.10: Der dritte Link (Tag-Suche) war bis hierher unescapt – sowohl im
// href (Attribut-Breakout) als auch im Textinhalt (HTML-Injection).
console.log('getTagsHtml – Tag-Link escaped (v2.0.10):');
const xssHtml = getTagsHtml('main', ['a" onmouseover="alert(1)']);
check('Anfuehrungszeichen im href escaped', xssHtml.includes('tags=a&quot;'), true);
check('kein Attribut-Breakout (kein onmouseover= als Attribut)', /<a href="[^"]*" onmouseover=/.test(xssHtml), false);
// Präzise Prüfung des Text-Knotens des Tag-SUCH-Links (des DRITTEN <a>).
// Nicht per lastIndexOf('">'): der rohe '>' eines eingeschleusten Tags steht
// INNERHALB eines Attributwerts und würde die Sufe verwirren. Stattdessen über
// den bekannten Anker state.tagSearchLink lokalisieren – und weil escapeAttr
// im href-Wert kein rohes '"' hinterlässt, ist dessen schließendes Anführungs-
// zeichen eindeutig. Der Rest bis '</a>' ist der Text-Knoten.
const tagTextOf = (html) => {
    const hrefStart = html.indexOf('/index.php?page=post');
    if (hrefStart < 0) return null;
    const hrefEnd = html.indexOf('"', hrefStart);
    const afterHref = html.slice(hrefEnd + 1);
    return afterHref.slice(afterHref.indexOf('>') + 1).replace(/<\/a><\/span>$/, '');
};
const injectText = tagTextOf(getTagsHtml('main', ['<img src=x onerror=alert(1)>']));
check('kein Roh-< im Text-Knoten (keine HTML-Injection)', injectText.includes('<'), false);
check('kein Roh-" im Text-Knoten', injectText.includes('"'), false);
check('HTML-Tag als escapeter Text vorhanden', injectText.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
const breakoutText = tagTextOf(xssHtml);
check('Breakout-Tag: kein Roh-" im Text-Knoten', breakoutText.includes('"'), false);
check('Breakout-Tag: onmouseover escapet', breakoutText.includes('&quot;'), true);
check('harmloser Tag bleibt unverändert', tagTextOf(getTagsHtml('main', ['azex'])), 'azex');

console.log('debounce:');
(async () => {
  let calls = 0;
  const debounced = debounce(() => { calls++; }, 50);
  debounced(); debounced(); debounced();
  await new Promise(r => setTimeout(r, 120));
  const ok = calls === 1;
  ok ? pass++ : fail++;
  console.log((ok ? '  ✓ ' : '  ✗ ') + '3 schnelle Aufrufe → 1 Ausführung' + (ok ? '' : ` (${calls} Ausführungen)`));

  console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
  process.exit(fail === 0 ? 0 : 1);
})();
