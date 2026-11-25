// build.js – baut aus den src/-Modulen die installierbare Einzeldatei.
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const HELP = `build.js – baut die installierbare Einzeldatei aus den src/-Modulen

Verwendung:
  node build.js [optionen]

Optionen:
  --no-bump   Version NICHT automatisch erhöhen (lokales Testen)
  --watch     Einmal bauen, dann bei jeder Änderung unter src/ neu bauen
  --help      Diese Hilfe anzeigen

Beispiele:
  node build.js
  node build.js --no-bump
  node build.js --watch

Hinweis: npm run build ist ein Wrapper für "node build.js";
Argumente müssen hinter "--" stehen: npm run build -- --no-bump

Zugangsdaten:
  Die beiden API-Variablen kommen aus .env.local bzw. aus der Umgebung und
  werden nur injiziert, wenn BEIDE gesetzt sind. Das committete Bundle enthaelt
  nie Zugangsdaten - fuer diesen Stand beide Variablen auf leere Strings setzen
  (leer, nicht null; sonst greift wieder .env.local). Der genaue Ablauf steht
  in der README im Abschnitt "Zugangsdaten: Repo-Pflicht und privater Build".
  npm run test:secrets weist ein Artefakt mit injizierten Werten zurueck.
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

const OUT_FILE = path.join(import.meta.dirname, 'Rule34 Favorites Enhancer.js');
const VERSION_FILE = path.join(import.meta.dirname, 'src', 'version.js');
const ENV_FILE = path.join(import.meta.dirname, '.env.local');

const readVersion = () => {
  const match = fs.readFileSync(VERSION_FILE, 'utf8').match(/VERSION\s*=\s*'([^']+)'/);
  if (!match) throw new Error('VERSION in src/version.js nicht gefunden');
  return match[1];
};

const readEnvFile = file => {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const separator = line.indexOf('=');
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      return [key, value];
    }));
};

const VERSION = readVersion();
const fileEnv = readEnvFile(ENV_FILE);
const envValue = key => process.env[key] ?? fileEnv[key] ?? '';
const apiUserId = envValue('RULE34_API_USER_ID').trim();
const apiKey = envValue('RULE34_API_KEY').trim();
const hasCompleteCredentials = Boolean(apiUserId && apiKey);
// Bei unvollständiger Konfiguration werden beide Werte verworfen. So kann ein
//zelner versehentlich gesetzter Key nicht trotz deaktivierter API im Bundle landen.
const buildApiUserId = hasCompleteCredentials ? apiUserId : '';
const buildApiKey = hasCompleteCredentials ? apiKey : '';

if ((apiUserId || apiKey) && !hasCompleteCredentials) {
  console.warn('WARNUNG: RULE34_API_USER_ID und RULE34_API_KEY müssen beide gesetzt sein; die API-Metadatenanreicherung bleibt deaktiviert.');
} else if (hasCompleteCredentials) {
  console.warn('WARNUNG: Der private Build enthält API-Zugangsdaten. Nicht veröffentlichen oder committen.');
}

const bumpVersion = () => {
  const [major, minor] = VERSION.split('.').map(Number);
  const next = `${major}.${minor + 1}`;
  fs.writeFileSync(
    VERSION_FILE,
    `// Eine Quelle für die Versionsnummer (@version im Build)\nexport const VERSION = '${next}';\n`,
  );
  return next;
};

const banner = `// ==UserScript==
// @name         Rule34 Favorites Enhancer
// @namespace    jAstn
// @author       It's a Me, jAstn!
// @version      ${VERSION}
// @description  Favoriten hervorheben, alle laden & sortieren (Score/Random) – direkt in der rule34-Galerie
// @match        https://rule34.xxx/index.php?page=post&s=list*
// @match        https://rule34.xxx/index.php?page=post&s=view&id=*
// @match        https://rule34.xxx/index.php?page=favorites&s=view&id=*
// @match        https://rule34.xxx/index.php?page=pool&s=show&id=*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAABOAACBEBD/UVH///9FPR7/AAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC
// @tag          Eigene Scripts
// @grant        unsafeWindow
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
    'use strict';
`;

const footer = `
})();`;

const options = {
  entryPoints: ['src/scan.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  banner: { js: banner },
  footer: { js: footer },
  outfile: OUT_FILE,
  define: {
    __RULE34_API_USER_ID__: JSON.stringify(buildApiUserId),
    __RULE34_API_KEY__: JSON.stringify(buildApiKey),
  },
  logLevel: 'info',
};

const WATCH = process.argv.includes('--watch');
const NO_BUMP = process.argv.includes('--no-bump');

const logBuild = () => {
  if (NO_BUMP) {
    console.log(`Build OK → Rule34 Favorites Enhancer.js (v${VERSION}) – Version NICHT erhöht (--no-bump)`);
  } else {
    const next = bumpVersion();
    console.log(`Build OK → Rule34 Favorites Enhancer.js (v${VERSION}) – Version erhöht: v${next}`);
  }
};

if (WATCH) {
  esbuild.context(options)
    .then(async context => {
      await context.rebuild();
      logBuild();
      console.log('Watch aktiv – warte auf Änderungen unter src/ (Strg+C zum Beenden)…');
      await context.watch();
    })
    .catch(() => process.exit(1));
} else {
  esbuild.build(options).then(logBuild).catch(() => process.exit(1));
}
