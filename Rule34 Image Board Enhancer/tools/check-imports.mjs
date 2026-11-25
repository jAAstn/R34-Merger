// Prüft für jedes src/-Modul: Wird ein Identifier aus einem ANDEREN Modul
// verwendet, ohne importiert zu sein? Kommentare, String-Literale und
// Objekt-Key-Definitionen werden entfernt, um False-Positives zu vermeiden.
// Lauf: node tools/check-imports.mjs
import fs from 'node:fs';

const EXPORTS = {
    'core.js': ['debounce', 'addGlobalStyle', 'isTyping', 'escapeAttr', 'escapeHtml', 'debugMode', 'getBaseTag', 'parseTagsString', 'getParsedTagsFromInput', 'computeFit', 'getPairSet', 'mergeTagsIntoList', 'state'],
    'settings.js': ['DEFAULT_SETTINGS', 'settings', 'loadSettings'],
    'css.js': ['MAIN_CSS', 'FAVORITE_TAGS_CSS', 'FAVORITE_TAGS_USER_CSS'],
    'media.js': ['getContentProps', 'scrollToContent', 'fitContent', 'enhanceContent', 'addWindowEvents', 'keyboardShortcuts'],
    'favorite-tags.js': ['createFavoriteTagsPanel', 'getTagsHtml'],
    'title-colors.js': ['parseSearchTokens', 'tokenMatchesDb', 'replaceTagInParsedList', 'addTagToInputWithReplace', 'updateTitleColors', 'setupInputObserver'],
    'toolbar.js': ['createToolbar', 'showSettings'],
    'sites.js': ['configureSites'],
    'version.js': ['VERSION'],
};

const files = Object.keys(EXPORTS);
let problems = 0;

for (const f of files) {
    let code = fs.readFileSync('src/' + f, 'utf8');
    // 1) Kommentare entfernen
    code = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    // 2) String-Literale (single/double quote) entfernen – enthalten keinen Code
    code = code.replace(/'(?:[^'\\n]|\.)*'|"(?:[^"\\n]|\.)*"/g, '""');
    // 3) Objekt-Key-Definitionen entfernen (z.B. "hideBlacklisted: true" → " true")
    code = code.replace(/\b[A-Za-z_$][\w$]*\s*:/g, '');

    const imported = new Set(
        [...code.matchAll(/import\s*\{([^}]+)\}\s*from/g)]
            .flatMap(m => m[1].split(',').map(x => x.trim()))
    );
    const definedLocally = new Set(
        [...code.matchAll(/(?:const|function|let|var)\s+([A-Za-z_$][\w$]*)/g)]
            .map(m => m[1])
    );

    for (const [other, names] of Object.entries(EXPORTS)) {
        if (other === f) continue;
        for (const name of names) {
            if (definedLocally.has(name) || imported.has(name)) continue;
            if (new RegExp('\b' + name + '\b').test(code)) {
                console.log(`FEHLT: ${f} verwendet "${name}" (aus ${other}), aber importiert es nicht`);
                problems++;
            }
        }
    }
}

console.log(problems === 0 ? 'ALLE IMPORTS VOLLSTÄNDIG' : problems + ' fehlende Imports!');
process.exit(problems === 0 ? 0 : 1);
