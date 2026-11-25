// build.js – baut aus den src/-Modulen die installierbare Einzeldatei.
//   npm install                     (einmalig, holt esbuild als Dev-Dependency)
//   npm run build                   -> ueberschreibt Steamy34.js mit dem aktuellen Stand
//                                      (die Version bleibt, sie kommt aus src/version.js)
//   npm run build -- --bump         -> baut und erhoeht danach die letzte Versionskomponente
//                                      in src/version.js (3.11.1-beta -> 3.11.2-beta)
//   node build.js --watch           -> baut einmal und dann bei jeder Aenderung unter src/ neu
//   node build.js --help            -> zeigt diese Hilfe an
//
// Die Versionsnummer kommt aus src/version.js – eine Quelle fuer @version im Build.
// ACHTUNG: Die im Skript angezeigte Version (CURRENT_VERSION) kommt aus dem
// CHANGELOG in src/changelog.js. Beim Erhoehen beide Stellen pflegen.
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const HELP = `build.js – baut die installierbare Einzeldatei aus den src/-Modulen

Verwendung:
  node build.js [optionen]

Optionen:
  --bump      Version erhoehen (letzte Zahl in src/version.js, z. B. 3.11.1-beta -> 3.11.2-beta)
  --watch     Einmal bauen, dann bei jeder Aenderung unter src/ automatisch neu bauen.
  --help      Diese Hilfe anzeigen

Beispiele:
  node build.js                     Build ohne Versionsaenderung
  node build.js --bump              Build + Version erhoehen
  node build.js --watch             Auto-Rebuild bei src/-Aenderungen (Entwicklung)

Hinweis: npm run build ist nur ein Wrapper fuer "node build.js";
Argumente muessen bei npm hinter "--" stehen: npm run build -- --bump
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(HELP);
    process.exit(0);
}

const OUT_FILE = path.join(import.meta.dirname, 'Steamy34.js');
const VERSION_FILE = path.join(import.meta.dirname, 'src', 'version.js');

const readVersion = () => fs.readFileSync(VERSION_FILE, 'utf8')
    .match(/VERSION\s*=\s*'([^']+)'/)[1];
const VERSION = readVersion();

// Letzte Zahl erhoehen, Suffix behalten ("3.11.1-beta" -> "3.11.2-beta").
// Bewusst als String-Parsing statt Float-Arithmetik.
const bumpVersion = () => {
    const m = VERSION.match(/^(\d+(?:\.\d+)*)(.*)$/);
    if (!m) throw new Error('Version nicht lesbar: ' + VERSION);
    const parts = m[1].split('.').map(Number);
    parts[parts.length - 1] += 1;
    const next = parts.join('.') + m[2];
    fs.writeFileSync(VERSION_FILE,
        "// Eine Quelle fuer die Versionsnummer (@version im Build)\nexport const VERSION = '" + next + "';\n");
    return next;
};

// Banner = Userscript-Metadaten + Erklaerung + aeusserer IIFE-Rahmen
// (identisch zum bisherigen Kopf der Einzeldatei, nur @version aus src/version.js).
const banner = `// ==UserScript==
// @name         Steamy34
// @namespace    jAstn
// @author       It's a Me, jAstn!
// @version      ${VERSION}
// @author       steamycorner
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZjVmOGYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM4YjNkZmYiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxNSIgZmlsbD0idXJsKCNnKSIvPjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIzLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iLjk1Ij48cGF0aCBkPSJNMjIgMjZjLTMuMi0zIDMuMi01LjYgMC04LjZzMy4yLTUuNiAwLTguNCIvPjxwYXRoIGQ9Ik0zMSAyNmMtMy4yLTMgMy4yLTUuNiAwLTguNnMzLjItNS42IDAtOC40Ii8+PHBhdGggZD0iTTQwIDI2Yy0zLjItMyAzLjItNS42IDAtOC42czMuMi01LjYgMC04LjQiLz48L2c+PHBhdGggZD0iTTE0IDMxaDM0djdhMTMgMTMgMCAwIDEtMTMgMTNoLThhMTMgMTMgMCAwIDEtMTMtMTN6IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTQ3LjUgMzQuNWgyLjVhNS41IDUuNSAwIDAgMSAwIDExaC00IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMy40IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cmVjdCB4PSIxMSIgeT0iNTMiIHdpZHRoPSI0MCIgaGVpZ2h0PSIzLjQiIHJ4PSIxLjciIGZpbGw9IiNmZmYiIG9wYWNpdHk9Ii45Ii8+PC9zdmc+
// @description  All-in-one rule34.xxx upgrade: dark / OLED mode, popup viewer, easy tag search with filters, follow artists and save searches with new-post counts, downloads named after the tags (press B), batch downloads, collections on all your devices, download and viewed buttons on thumbnails, blacklists of any length, infinite scroll and a phone layout. Designed by steamycorner, written with AI. A free fan-made hobby project, never monetized.
// @match        https://rule34.xxx/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_download
// @connect      rule34.xxx
// @connect      *.rule34.xxx
// @run-at       document-start
// @noframes
// ==/UserScript==

/*
 * ===========================================================================
 *  STEAMY34  -  by steamycorner
 * ===========================================================================
 *
 *  A FAN-MADE HOBBY PROJECT
 *  Steamy34 is made for fun by a fan. It is free and will never be
 *  monetized: no ads, no paid features, no data collection. It is not
 *  made by or connected to rule34.xxx.
 *
 *
 *  WHAT IT DOES (the quick tips - "?" - show the keys & gestures)
 *
 *  Posts page
 *  - Modern thumbnails (original ratios or square tiles), size slider,
 *    VID / GIF labels, artist & character tags on every thumbnail.
 *  - Hover: videos play, images load in full quality, score & size show.
 *  - Infinite scrolling with "Page N" dividers.
 *  - Marks for posts you viewed (eye) or downloaded (arrow); switches to
 *    hide them. ♥ adds a post to your rule34 favourites.
 *  - Batch download: tick posts, download them all, or add them to a
 *    collection. A small panel shows progress with Pause / Cancel.
 *
 *  Popup viewer (every post opens in it)
 *  - Large picture or video, tags with + / ⊘, post info with ▲ vote,
 *    parent / child / pool links, comments below.
 *  - ← / → (or A / D – Settings → Viewing posts) browse, Esc or middle
 *    click closes, click to zoom. F favourite, C collection, T theater
 *    (all changeable); with WASD, W / S scroll.
 *  - Settings have a search field.
 *  - First start: a welcome guide to every feature, keys and gestures (again
 *    any time: Settings → Help → Welcome guide).
 *  - Auto next (slideshow), theater mode, video loop & speed,
 *    the next / previous post loaded in advance.
 *
 *  Search
 *  - Tags as bubbles (click to exclude), filter menus for score, size,
 *    sort, type and rating; pin a filter to keep it for every search.
 *  - Favourite tags, recent searches.
 *  - Tag suggestions while typing.
 *
 *  Following (artists)
 *  - The bell next to an artist (popup, post pages) follows them. The
 *    sidebar lists them with a count of their new posts; G (or a click)
 *    opens the Following window: circles, newest posts, NEW since your
 *    last visit.
 *
 *  Downloads
 *  - B (changeable) or the Download button saves the original in
 *    maximum resolution as [character] [series] [artist] #post.ext,
 *    e.g. [amelie lacroix] [overwatch] [someartist] #1234567.jpg (classic
 *    style in the settings). Costume versions and company names are left out.
 *  - Optional own download folder – any folder, e.g. Eagle's watch folder
 *    (Settings → Downloads → Choose folder…; Chrome / Edge / Brave).
 *  - Asks before downloading a post a second time (can be switched off).
 *
 *  Tags & blacklist
 *  - + / − add a tag to the search or take it out, ⊘ blacklists it
 *    (with Undo). The Blacklist window lists, sorts and edits everything.
 *
 *  Your stuff
 *  - Collections (your own folders), Stats (top artists / characters /
 *    series, last 14 days), backup & restore.
 *
 *  Look
 *  - White, Dark and OLED colour modes.
 *
 *  Phones (Firefox for Android + Tampermonkey)
 *  - Picture on top in the popup, swipe to browse, swipe down / Back to
 *    close; one ☰ Menu with Steamy34's tools and the site's pages.
 *
 *  Privacy
 *  - Nothing is collected. Everything stays in your browser's
 *    Tampermonkey storage; Settings -> Privacy & data shows all of it and
 *    deletes it. Steamy34 only talks to rule34.xxx itself.
 *
 *  Changelog: the CHANGELOG list further down ("What's new" in the
 *  script shows it once after notable updates).
 * ===========================================================================
 */

(function () {
'use strict';
`;

const footer = `
})();
`;

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
const BUMP = process.argv.includes('--bump');

const logBuild = () => {
    if (BUMP) {
        const next = bumpVersion();
        console.log(`Build OK -> Steamy34.js (v${VERSION}) – Version erhoeht: v${next}`);
    } else {
        console.log(`Build OK -> Steamy34.js (v${VERSION}) – Version unveraendert`);
    }
};

if (WATCH) {
    esbuild.context(options).then(async (ctx) => {
        await ctx.rebuild();
        logBuild();
        console.log('Watch aktiv – warte auf Aenderungen unter src/ (Strg+C zum Beenden)…');
        await ctx.watch();
    }).catch(() => process.exit(1));
} else {
    esbuild.build(options).then(logBuild).catch(() => process.exit(1));
}
