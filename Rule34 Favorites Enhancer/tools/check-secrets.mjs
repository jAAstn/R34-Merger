// Secret-Leak-Schutz für die lokale Entwicklung.
// Prüft nur Quell-/Dokumentationsdateien; Tests dürfen bewusst fake URLs und
// Testwerte verwenden. .env.local wird weder gelesen noch ausgegeben.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceFiles = [
  path.join(root, 'build.js'),
  path.join(root, '.env.example'),
  path.join(root, 'README.md'),
  path.join(root, 'CHANGELOG.md'),
  ...fs.readdirSync(path.join(root, 'src'), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
    .map(entry => path.join(root, 'src', entry.name)),
];

const problems = [];
const addProblem = (file, message) => problems.push(`${path.relative(root, file)}: ${message}`);

for (const file of sourceFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');

  // Konkrete .env-Zuweisungen dürfen nur in .env.example leer sein.
  for (const match of content.matchAll(/^[ \t]*RULE34_API_(?:KEY|USER_ID)[ \t]*=[ \t]*(.*)$/gm)) {
    const value = match[1].trim();
    if (value && !value.startsWith('#')) addProblem(file, 'enthält einen nicht-leeren API-Credential-Wert');
  }

  // Keine hart codierten Secret-Literale in Produktions-/Doku-Dateien.
  const literalSecret = /(?:api[_-]?key|apiKey)\s*[:=]\s*["'`]([^"'`\r\n]+)["'`]/i;
  const match = content.match(literalSecret);
  if (match) addProblem(file, 'enthält ein hart codiertes Secret-Literal');
}

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
if (/^RULE34_API_KEY[ \t]*=[ \t]*\S+/m.test(envExample)) {
  problems.push('.env.example: API-Key darf nicht als Beispielwert eingetragen sein');
}

const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
for (const pattern of ['.env.local', '.env.*.local']) {
  if (!gitignore.split(/\r?\n/).includes(pattern)) {
    problems.push(`.gitignore: Muster ${pattern} fehlt`);
  }
}

const bundle = path.join(root, 'Rule34 Favorites Enhancer.js');
if (fs.existsSync(bundle)) {
  const bundleContent = fs.readFileSync(bundle, 'utf8');
  if (bundleContent.includes('__RULE34_API_KEY__') || bundleContent.includes('__RULE34_API_USER_ID__')) {
    problems.push('Rule34 Favorites Enhancer.js: Build-Time-Marker wurden nicht ersetzt');
  }
  // Das committete Bundle muss credential-frei sein. Ein privater Build mit
  // Zugangsdaten darf nicht in Git landen – daher schlägt der Check hier fehl.
  // Muster aus dem Build von config.js: var injectedApiKey = true ? "<wert>" : "";
  const injected = bundleContent.matchAll(/injected(?:UserId|ApiKey)\s*=\s*[^;]*?"([^"]*)"/g);
  for (const [, value] of injected) {
    if (value) {
      problems.push('Rule34 Favorites Enhancer.js: enthält injizierte API-Zugangsdaten – nicht committen/veröffentlichen');
      break;
    }
  }
}

if (problems.length) {
  console.error('SECRET-LEAK-CHECK FEHLGESCHLAGEN');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`SECRET-LEAK-CHECK BESTANDEN – ${sourceFiles.length} Dateien geprüft, .env.local nicht gelesen.`);
