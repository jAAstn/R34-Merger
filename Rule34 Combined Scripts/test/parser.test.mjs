// Unit-Tests für den Regel-Parser (src/parser.js) – reine Logik, kein DOM/GM nötig.
// Lauf: node test/parser.test.mjs
import { parseRulesInput, compileRules, anyRuleMatches, v2ToAst, normalizeTag } from '../src/parser.js';

let pass = 0, fail = 0;
const check = (desc, actual, expected) => {
    const ok = actual === expected;
    ok ? pass++ : fail++;
    console.log((ok ? '  ✓ ' : '  ✗ ') + desc + (ok ? '' : ` (erwartet ${expected}, war ${actual})`));
};

console.log('normalizeTag:');
check('"Furry Feral" → furry_feral', normalizeTag('Furry Feral'), 'furry_feral');
check('"  cat  " → cat', normalizeTag('  cat  '), 'cat');
check('leer/undefined → ""', normalizeTag(undefined), '');

console.log('einfache Regel:');
{
    const c = compileRules(parseRulesInput('furry'));
    check('furry matcht [furry]', anyRuleMatches(c, ['furry']), true);
    check('furry matcht [cat] nicht', anyRuleMatches(c, ['cat']), false);
    check('leere Tag-Liste → false', anyRuleMatches(c, []), false);
}

console.log('UND (& / Leerzeichen):');
{
    const c = compileRules(parseRulesInput('furry male'));
    check('furry male matcht [furry, male]', anyRuleMatches(c, ['furry', 'male']), true);
    check('furry male matcht [furry] nicht', anyRuleMatches(c, ['furry']), false);
    const c2 = compileRules(parseRulesInput('furry & male'));
    check('furry & male matcht [furry, male]', anyRuleMatches(c2, ['furry', 'male']), true);
}

console.log('ODER (|):');
{
    const c = compileRules(parseRulesInput('dog | cat'));
    check('dog | cat matcht [dog]', anyRuleMatches(c, ['dog']), true);
    check('dog | cat matcht [cat]', anyRuleMatches(c, ['cat']), true);
    check('dog | cat matcht [horse] nicht', anyRuleMatches(c, ['horse']), false);
}

console.log('NICHT (!):');
{
    const c = compileRules(parseRulesInput('!gore'));
    check('!gore matcht [scenery]', anyRuleMatches(c, ['scenery']), true);
    check('!gore matcht [gore] nicht', anyRuleMatches(c, ['gore']), false);
}

console.log('Wildcard (*):');
{
    const c = compileRules(parseRulesInput('furry*'));
    check('furry* matcht [furry_feral]', anyRuleMatches(c, ['furry_feral']), true);
    check('furry* matcht [furry]', anyRuleMatches(c, ['furry']), true);
    check('furry* matcht [cat] nicht', anyRuleMatches(c, ['cat']), false);
}

console.log('Kommentar (//):');
{
    const c = compileRules(parseRulesInput('cat // ist die beste'));
    check('cat // … matcht [cat]', anyRuleMatches(c, ['cat']), true);
    check('nur Kommentar → leere Regel', compileRules(parseRulesInput('// nur kommentar')).length, 0);
}

console.log('Komma/Trennung:');
{
    const c = compileRules(parseRulesInput('dog, cat'));
    check('dog, cat matcht [cat]', anyRuleMatches(c, ['cat']), true);
    check('dog, cat matcht [dog]', anyRuleMatches(c, ['dog']), true);
}

console.log('v2-Migration (orGroups, "-" = NICHT):');
{
    const ast = v2ToAst({ orGroups: [['-gore', 'scenery'], ['cat']] });
    const c = compileRules([ast]);
    check('(-gore + scenery) matcht [scenery]', anyRuleMatches(c, ['scenery']), true);
    check('(-gore + scenery) matcht [scenery, gore] nicht', anyRuleMatches(c, ['scenery', 'gore']), false);
    check('cat-Gruppe matcht [cat]', anyRuleMatches(c, ['cat']), true);
}

console.log('Klammern:');
{
    const c = compileRules(parseRulesInput('(a | b) c'));
    check('(a | b) c matcht [a, c]', anyRuleMatches(c, ['a', 'c']), true);
    check('(a | b) c matcht [a] nicht', anyRuleMatches(c, ['a']), false);
}

console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
