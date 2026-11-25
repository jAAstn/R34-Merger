# Rule34 Favorites Enhancer

> Userscript für https://rule34.xxx – hebt gespeicherte Favoriten hervor, lädt alle
> Favoriten eines Nutzers und sortiert sie direkt in der rule34-Galerie (Score/Random).

**Stand: v4.35** – Quelltext in `src/`, Build-Artefakt `Rule34 Favorites Enhancer.js`.
Änderungen stehen mit Begründung im [CHANGELOG](CHANGELOG.md).

## ✨ Features

- **Favoriten-Highlighting** – gespeicherte Favoriten bekommen auf Post-Listen und
  Favoriten-Seiten einen roten Rahmen (lebt mit, wenn Pagetual/Infinite-Scroll
  nachlädt).
- **Quick-Favorisieren** – über den `unsafeWindow.addFav`-Hook werden neu
  favorisierte Posts sofort in einer Warteschlange gespeichert (Cross-Tab-Sync via
  localStorage) und live markiert.
- **Favoriten-Scan** – der „Search“-Button lädt alle Favoriten-Seiten eines Nutzers
  (parallel, mit Retry/Backoff bei Rate-Limits) und speichert sie in einem
  IndexedDB-Cache. Schlägt eine Seite fehl, erscheint ein **„Retry“-Button**, der
  nur genau diese Seiten nachlädt (kein kompletter Neu-Scan).
- **Resume** – ein Voll-Scan sichert seinen Teilfortschritt alle 25 Seiten unter
  `scanPartial`; nach Cancel, Reload oder Absturz überspringt der nächste Scan
  die bereits geladenen Seiten. Der Status zeigt „scan incomplete (N/M) – click
  Search to resume“.
- **Count aus der Pagination** – die Seitenzahl kommt aus der Favoriten-Seite
  selbst (höchster `pid`), nicht aus einem zusätzlichen Profil-Request. Der
  Profil-Count wird nur ohne Pagination gefragt; fällt er aus, läuft der Scan
  trotzdem.
- **Sortierung** – Original / Score (absteigend) / Random direkt über Header-Buttons.
- **Diff-Modus** – „New (n)“-Button zeigt nur Favoriten, die beim letzten Scan neu
  hinzukamen (Ein/Aus schaltbar).
- **Export / Import** – Favoriten-Cache als JSON-Datei sichern und wiederherstellen.
  Der Export enthält zusätzlich einen **Storage-Snapshot** (`storage`-Feld): die
  Script-eigenen localStorage-Keys (`prevFavCount`, `userId`, Queues, Einstellungen)
  und den Session-Cookie `user_id`. Der Import restauriert beides – kein manuelles
  Übertragen der Anmeldung nötig. Import lädt die Daten **direkt** (kein erneuter Scan nötig).
- **Auto-Scan** – optionales Hintergrund-Polling (Aus / 5 Min / 15 Min) über das
  Cache-Panel; bei neuen Favoriten startet ein Incremental-Scan.
- **Cache-Info-Panel** – zeigt Bildanzahl, letztes Scan-Datum, Count-Quelle
  (exakt/geschätzt), laufenden bzw. unterbrochenen Scan und den letzten
  Seitenfehler, mit Buttons „Cache neu scannen“ (Voll-Scan) und „Cache löschen“
  (Reset + Reload).
- **Galerie-Renderer** – Ergebnisse werden chunked/lazy in die bestehende
  rule34-Gallery gerendert; „Remove“-Link entfernt Posts per `fetch` ohne
  Seiten-Reload (inkl. Cache-Bereinigung), danach erscheint ein **„Undo“**-Button,
  der den Post per Server-Add (`addfav.php`) wirklich wiederherstellt.
- **Netzwerk-Freundlichkeit** – alle Seiten- und Aktions-Fetches laufen durch einen
  zentralen Client mit Timeout, exponentiellem Backoff, Jitter, `Retry-After` und
  separaten Rate-Limitern (HTML: 2 parallel, 450 ms Startabstand; Metadaten:
  1 Request pro Sekunde). Die 450 ms sind gemessen: 6 Seiten mit 1 s Abstand =
  6,3 s, mit 0,35 s = 3,2 s, beide vollständig HTTP 200. Eine Cloudflare-CAPTCHA-
  Seite (HTTP 200 ohne Thumbnails) pausiert den Limiter 30 s.
- **Score-Nachtrag** – wenn lokale API-Zugangsdaten vorhanden sind, werden bis zu
  fünf Posts, deren Score im HTML nicht gefunden wurde, über die offizielle
  Rule34-API nachgetragen – seit v4.35 **nach** dem Rendern, die Galerie erscheint
  also sofort. Nur der **Score** – er ist der einzige von der API
  gelieferte Wert, den die Galerie auch anzeigt (Score-Sortierung, Thumb-Tooltip).
  Die API antwortet unabhängig von einem `fields`-Parameter mit dem vollen Satz,
  deshalb wird keiner gesendet. Die Favoriten-Seiten selbst bleiben HTML-Endpunkte,
  weil die API sie nicht ersetzt.
- **Scan abbrechen** – jeder Scan besitzt einen `AbortController`; während eines
  laufenden Scans erscheint ein **„Cancel“-Button**, der laufende Requests und
  Retry-Wartezeiten zentral abbricht. Bereits geladene Seiten bleiben im Cache.
- **Tab-Wechsel-Erkennung** – bei Rückkehr wird geprüft, ob neue Favoriten
  existieren. Während und unmittelbar nach einem laufenden Scan wird weder geprüft
  noch neu geladen, damit ein Scan sein frisch gerendertes Ergebnis nicht wegwirft.

## 🔨 Build / Entwicklung

Das Script wird nicht mehr direkt in einer Datei entwickelt, sondern in `src/`
(8 Module) und per esbuild zu einer installierbaren Einzeldatei gebaut:

```bash
npm install          # einmalig – holt esbuild + ESLint (Dev-Dependencies)
npm run build              # überschreibt Rule34 Favorites Enhancer.js und erhöht danach
                           # automatisch die Minor-Version (v4.16 → v4.17 → …)
npm run build -- --no-bump # baut, ohne die Version zu erhöhen (lokales Testen)
npm run test:parser   # pure Helfer (core.js)
npm run test:core     # ID-Extraktion + Queues (core.js/storage.js)
npm run test:features # Extraktion + Diff-Modus
npm run test:api      # Timeout, Retry, Rate-Limiter, Abbruch, Score-Nachtrag
npm run test:secrets  # Secret-Leak-Schutz für Quell-, Konfig- und Bundle-Dateien
npm run test:smoke    # Mock-Browser-Test: Bundle vs. Git-Stand, inkl. Scan-Flow,
                      # Count-Fallback (Profil-Request scheitert) und Incremental-Scan
npm run test:imports  # prüft, ob alle Module-Imports vollständig sind
npm test              # alles oben inkl. ESLint in einem Durchgang
npm run lint          # ESLint – eslint:recommended + eqeqeq
```

- **Quelle der Wahrheit:** `src/` – `Rule34 Favorites Enhancer.js` ist die gebaute,
  installierbare Datei und bleibt wie bisher Teil des Repos. Sie wird **immer
  credential-frei** committet (siehe unten).
- **Versionsnummer:** zentral in `src/version.js` – `npm run build` erhöht die
  Minor-Version nach jedem erfolgreichen Build automatisch. Für einen bereits
  vorbereiteten Stand `src/version.js` anpassen und mit `--no-bump` bauen, sonst
  ist das Artefakt eine Version im Rückstand.
- **Hinweis zu `npm run`:** Argumente müssen hinter `--` stehen
  (`npm run build -- --no-bump`), sonst interpretiert npm sie als eigene Optionen.
  Direkt mit `node build.js --no-bump` entfällt das.

### Zugangsdaten: Repo-Pflicht und privater Build

Im committeten Stand ist die API-Anreicherung **aus** – das Script läuft ohne
Zugangsdaten vollständig. Wer sie nutzen will, baut lokal. Die beiden Fälle
werden leicht verwechselt, deshalb hier getrennt:

|  | Repo-Stand (committet) | Privater Build (nur lokal) |
|---|---|---|
| Enthält Zugangsdaten | **nie** | einmalig eingebaut |
| Gehört nach | `origin/main` | in deine lokale Script-Installation |
| `npm run test:secrets` | grün | schlägt bewusst fehl |
| Committen / Pushen | ja | **nein** |

**1. Repo-Pflicht – das Bundle credential-frei bauen**

Der sichere Zustand ist die Voreinstellung: `build.js` injiziert nur dann Werte,
wenn **beide** Variablen gesetzt sind. Für den Repo-Stand also ohne Zugangsdaten
bauen:

```powershell
$env:RULE34_API_USER_ID = ''; $env:RULE34_API_KEY = ''
node build.js --no-bump
npm run test:secrets
```

Leere Strings verwenden, **nicht** `$null` – sonst greift `build.js` wieder auf
`.env.local` zurück und der Key landet trotzdem im Bundle. Wer `.env.local`
ohnehin nicht braucht, benennt sie für diesen einen Build kurz um.

**2. Privater Build – lokal, mit Score-Nachtrag**

```powershell
Copy-Item .env.example .env.local    # Vorlage ist absichtlich leer
# RULE34_API_USER_ID und RULE34_API_KEY in .env.local eintragen
npm run build
```

`build.js` warnt dann ausdrücklich, dass dieser Build Zugangsdaten enthält. Das
Ergebnis **nicht** committen und nicht weitergeben. Zurück bleibt ein Script,
das fehlende Scores aus der API nachträgt – der einzige spürbare Unterschied zum
öffentlichen Build.

**3. Vor dem nächsten Commit zurücksetzen**

```powershell
$env:RULE34_API_USER_ID = ''; $env:RULE34_API_KEY = ''
node build.js --no-bump
git checkout -- "Rule34 Favorites Enhancer.js"   # credential-freie Fassung
```

`npm run test:secrets` prüft nicht nur Quell- und Konfigurationsdateien,
sondern auch das gebaute Artefakt: ein Bundle mit injizierten Zugangsdaten
wird abgelehnt. Das ist der Grund, warum die Vorlage in `.env.example` leere
Werte hat.

Ein API-Key, der einmal in Chat, Logs, einem Bundle oder einem gepushten Commit
gelandet ist, gehört im Rule34-Konto widerrufen und neu erzeugt. Eine bereits
gepushte Historie lässt sich nur per Rewrite bereinigen (Force-Push); die
Rotation schützt dich in jedem Fall, der Rewrite nur das Diff.

Die API wird ausschließlich zum Nachtragen fehlender Scores verwendet. Laden,
Entfernen und Wiederherstellen von Favoriten bleibt bei den HTML-Endpunkten.
Blockiert der Browser den Cross-Origin-Request, bleibt der HTML-Scan voll
funktionsfähig und die Anreicherung entfällt.

## 🧩 Module

| Modul | Inhalt |
|---|---|
| `core.js` | PageType, gemeinsames `state`-Objekt, pure Helfer (ID-Extraktion) |
| `storage.js` | IndexedDB-Cache + Removal/Additional-Queues (localStorage) |
| `api.js` | Zentraler Netzwerk-Client: HTML-/JSON-Requests, Timeout, Retry, Rate-Limit, optionales Score-Nachtragen |
| `config.js` | Build-Time-Konfiguration und Credential-Funktionen |
| `scan.js` | Extraktion, Scan-Orchestrierung, `init()`, Entry-Points (**Build-Einstieg**) |
| `ui.js` | Header-UI (Score/Random/Search/Cancel/Retry/Undo), Status, Chunked-Gallery-Renderer |
| `highlight.js` | exploreModule: Favoriten-Rahmen, `addFav`-Hook, MutationObserver |
| `version.js` | Versionsnummer (eine Quelle für `@version`) |

## 💾 Storage

| Key | Ort | Bedeutung |
|---|---|---|
| `R34FavDB` / `favoritesStore` / `allImagesPayload` | IndexedDB | Favoriten-Cache (global, Version 4) |
| `scanPartial` | IndexedDB | Teilfortschritt eines unterbrochenen Voll-Scans (Seitenliste + Bilder), wird bei Erfolg gelöscht |
| `allImagesPayload:{userId}` | IndexedDB | alter user-scoped Key – wird einmalig migriert |
| `removalQueue` | localStorage | entfernte Favoriten (Warteschlange) |
| `additionalQueue` | localStorage | frisch favorisierte Posts (Cross-Tab-Sync) |
| `fromBack`, `prevFavCount`, `userId` | localStorage | Scan-Status pro Nutzer |
| `borderFavs` | localStorage | roter Rahmen an/aus |

Der Cache-Payload je Post ist bewusst klein: `id`, `link`, `src`, `score` und
optional `page` (für den fortgesetzten Scan; alte Caches ohne das Feld bleiben
gültig). Die
API liefert zwar deutlich mehr (Maße, Rating, Full-File-URL), das Script zeigte
davon nie etwas – diese Felder werden seit v4.31 nicht mehr gespeichert.
`CACHE_VERSION` bleibt bei **4**: Altbestände werden ignoriert und beim nächsten
Scan ohne diese Felder überschrieben, ein erzwungener Voll-Scan ist dafür nicht
nötig.

## ⚠️ Wichtige Hinweise

- **Gleiche Installation:** `@name`, `@namespace` und die Versionshistorie bleiben
  beim Modul-Split erhalten – der Userscript-Manager behandelt das Script als
  dieselbe Installation, die Daten (IndexedDB/localStorage) bleiben unangetastet.
- **Kein Duplicate-Guard:** Anders als beim Combined Script hat dieses Script keinen
  Doppel-Ausführungs-Guard im Header. Falls eine alte Version separat installiert
  ist, alte Installation entfernen.
- **API-Zugangsdaten:** Niemals `RULE34_API_KEY` in `src/`, `.env.example`,
  Logs, Issues oder ein veröffentlichtes Bundle schreiben. `.env.local` ist
  ausschließlich für den privaten lokalen Build gedacht und darf **nicht**
  getrackt werden – `.gitignore` wirkt nicht rückwirkend auf bereits getrackte
  Dateien, ein einmal committetes `.env.local` muss per `git rm --cached` wieder
  heraus. `npm run test:secrets` deckt Quell-, Konfigurations- **und**
  Bundle-Dateien ab.
- **`@icon`:** PNG-Daten-URI (`data:image/png;base64,iVBORw0KGgo…`), konsistent mit
  dem Banner in `build.js`.
