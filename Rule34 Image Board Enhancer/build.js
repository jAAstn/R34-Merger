// build.js – baut aus den src/-Modulen die installierbare Einzeldatei.
//   npm install                     (einmalig, holt esbuild als Dev-Dependency)
//   npm run build                   → überschreibt Rule34 Image Board Enhancer.js mit dem aktuellen
//                                     Stand und erhöht danach automatisch die letzte Versionskomponente
//                                     (2.0.5 → 2.0.6 → …)
//   npm run build -- --no-bump      → baut, OHNE die Version zu erhöhen (lokales Testen)
//   node build.js --watch           → baut einmal und dann bei jeder Änderung unter src/ neu
//                                     (Entwicklung; Bump nur beim allerersten Build)
//   node build.js --help            → zeigt diese Hilfe an
//
// Die Versionsnummer kommt aus src/version.js – eine Quelle für @version im Build.
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
  node build.js                     Build + letzte Versionskomponente erhöhen (2.0.5 → 2.0.6)
  node build.js --no-bump           Build ohne Versionserhöhung
  node build.js --watch             Auto-Rebuild bei src/-Änderungen (Entwicklung)

Hinweis: npm run build ist nur ein Wrapper für "node build.js";
Argumente müssen bei npm hinter "--" stehen: npm run build -- --no-bump
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(HELP);
    process.exit(0);
}

const OUT_FILE = path.join(import.meta.dirname, 'Rule34 Image Board Enhancer.js');
const VERSION_FILE = path.join(import.meta.dirname, 'src', 'version.js');

const readVersion = () => fs.readFileSync(VERSION_FILE, 'utf8')
    .match(/VERSION\s*=\s*'([^']+)'/)[1];
const VERSION = readVersion();

// Nach erfolgreichem Build die LETZTE Versionskomponente erhöhen (2.0.5 → 2.0.6).
// Bewusst als String-Parsing statt Float-Arithmetik (2.0.5 + 0.001 ergäbe 2.001).
// Funktioniert damit für 2-teilige (4.16 → 4.17) UND 3-teilige Versionen.
const bumpVersion = () => {
    const parts = VERSION.split('.').map(Number);
    parts[parts.length - 1] += 1;
    const next = parts.join('.');
    fs.writeFileSync(VERSION_FILE,
        "// Eine Quelle für die Versionsnummer (@version im Build)\nexport const VERSION = '" + next + "';\n");
    return next;
};

// Banner = Userscript-Metadaten + äußerer IIFE-Rahmen
// (identisch zum Original v2.0.5, inkl. @name/@namespace/@version).
const banner = `// ==UserScript==
// @name         Image Board Enhancer Dual++
// @description  Auto Resize images and video on multiple image boards and enlarges thumbnails on mouse hover and adds content type icons to them. Added Header Color Validation & Fixes.
// @namespace    jAstn
// @author       It's a Me, jAstn!
// @version      ${VERSION}
// @match        https://rule34.xxx/index.php*
// @match        https://*.rule34.xxx/index.php*
// @grant        GM.setValue
// @grant        GM.getValue
// @icon         https://i.imgur.com/sUsekOa.png
// @run-at       document-body
// @tag          Eigene Scripts
// @noframes
// ==/UserScript==

(function () {
    'use strict';
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
        console.log(`Build OK → Rule34 Image Board Enhancer.js (v${VERSION}) – Version NICHT erhöht (--no-bump)`);
    } else {
        const next = bumpVersion();
        console.log(`Build OK → Rule34 Image Board Enhancer.js (v${VERSION}) – Version erhöht: v${next}`);
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
