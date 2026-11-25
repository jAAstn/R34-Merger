// build.js – baut aus den src/-Modulen die installierbare Einzeldatei.
//   npm install                     (einmalig, holt esbuild als Dev-Dependency)
//   npm run build                   → überschreibt Rule34 Combined Scripts.js mit dem aktuellen
//                                     Stand und erhöht danach automatisch die Minor-Version
//                                     (v5.27 → v5.28 → …)
//   npm run build -- --no-bump      → baut, OHNE die Version zu erhöhen (lokales Testen)
//   node build.js --watch           → baut einmal und dann bei jeder Änderung unter src/ neu
//                                     (Entwicklung; Bump nur beim allerersten Build)
//   node build.js --help            → zeigt diese Hilfe an
//
// Die Versionsnummer kommt aus src/version.js – eine Quelle für @version im Build.
// Die Dateinamen-Konvention [vX.Y]Rule34 Combined Scripts.js entfällt als Versionsquelle.
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const HELP = `build.js – baut die installierbare Einzeldatei aus den src/-Modulen

Verwendung:
  node build.js [optionen]

Optionen:
  --no-bump   Version NICHT automatisch erhöhen (lokales Testen)
  --watch     Einmal bauen, dann bei jeder Änderung unter src/ automatisch neu bauen.
              Die Versionserhöhung passiert nur beim allerersten Build.
  --help      Diese Hilfe anzeigen

Beispiele:
  node build.js                     Build + Minor-Version erhöhen (v5.28 → v5.29)
  node build.js --no-bump           Build ohne Versionserhöhung
  node build.js --watch             Auto-Rebuild bei src/-Änderungen (Entwicklung)

Hinweis: npm run build ist nur ein Wrapper für "node build.js";
Argumente müssen bei npm hinter "--" stehen: npm run build -- --no-bump
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(HELP);
    process.exit(0);
}

const OUT_FILE = path.join(import.meta.dirname, 'Rule34 Combined Scripts.js');
const VERSION_FILE = path.join(import.meta.dirname, 'src', 'version.js');

const readVersion = () => fs.readFileSync(VERSION_FILE, 'utf8')
    .match(/VERSION\s*=\s*'([^']+)'/)[1];
const VERSION = readVersion();

// Nach erfolgreichem Build die Minor-Version erhöhen (bewusst als String-Parsing,
// NICHT als Float-Arithmetik – 5.27 + 0.01 ergäbe 5.2800000000000002).
const bumpVersion = () => {
    const [major, minor] = VERSION.split('.').map(Number);
    const next = major + '.' + (minor + 1);
    fs.writeFileSync(VERSION_FILE,
        "// Eine Quelle für die Versionsnummer (@version im Build, Dateinamen-Konvention [vX.Y]...)\nexport const VERSION = '" + next + "';\n");
    return next;
};

// Banner = Userscript-Metadaten + äußerer IIFE-Rahmen mit Duplicate-Guard
// (identisch zur bisherigen Einzeldatei).
const banner = `// ==UserScript==
// @name         Rule34 Combined Scripts
// @namespace    jAstn
// @author       It's a Me, jAstn!
// @version      ${VERSION}
// @description  Combines multiple scripts for rule34 with performance improvements, UI Panel, API key support + integrated Tag Hider++ (live toggle, no reload).
// @match        https://rule34.xxx/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAAAAGVQALYondf////+67aQPAAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      *
// @run-at       document-end
// @tag          Eigene Scripts
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // Duplicate-Guard (verhindert Doppel-Ausführung, falls alte Skripte noch aktiv sind)
    if (window.__r34CombinedV50Active) return;
    window.__r34CombinedV50Active = true;
`;

const footer = `
})();`;

const options = {
    entryPoints: ['src/init.js'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    banner: { js: banner },
    footer: { js: footer },
    outfile: OUT_FILE,
    logLevel: 'info',
};

const WATCH = process.argv.includes('--watch');
const NO_BUMP = process.argv.includes('--no-bump');

const logBuild = () => {
    if (NO_BUMP) {
        console.log(`Build OK → Rule34 Combined Scripts.js (v${VERSION}) – Version NICHT erhöht (--no-bump)`);
    } else {
        const next = bumpVersion();
        console.log(`Build OK → Rule34 Combined Scripts.js (v${VERSION}) – Version erhöht: v${next}`);
    }
};

if (WATCH) {
    // Watch-Modus: erster Build erhöht die Version (außer --no-bump), alle
    // weiteren Rebuilds bauen nur noch mit demselben Stand – ohne erneuten Bump.
    esbuild.context(options).then(async (ctx) => {
        await ctx.rebuild();
        logBuild();
        console.log('Watch aktiv – warte auf Änderungen unter src/ (Strg+C zum Beenden)…');
        await ctx.watch();
    }).catch(() => process.exit(1));
} else {
    esbuild.build(options).then(logBuild).catch(() => process.exit(1));
}
