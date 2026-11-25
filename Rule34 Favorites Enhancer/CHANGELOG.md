# CHANGELOG – Rule34 Favorites Enhancer

> Userscript für https://rule34.xxx – hebt gespeicherte Favoriten hervor, lädt alle
> Favoriten eines Nutzers und sortiert sie direkt in der rule34-Galerie (Score/Random).

## ⚠️ WICHTIG FÜR KI-AGENTEN (bitte zuerst lesen)

1. **Versionsquelle:** Die Versionsnummer steht zentral in `src/version.js` und wird
   vom Build in `@version` übernommen. `npm run build` erhöht die Minor-Version nach
   jedem erfolgreichen Build automatisch (v4.16 → v4.17 → …); `--no-bump` baut, ohne
   zu erhöhen.
2. **Skript-Architektur (Kontext für jede Version):**
   - `scan.js` = Extraktion + Scan-Orchestrierung (`searchAllPages`/`searchNewPages`)
     + `init()` + Entry-Points. **Entry-Modul des Builds.**
   - `storage.js` = Daten-Schicht: IndexedDB-Cache (`R34FavDB`/`favoritesStore`,
     globaler Key `allImagesPayload`) + Removal/Additional-Queues (localStorage,
     debounced, Cross-Tab-Sync).
   - `highlight.js` = exploreModule: roter Rahmen auf Favoriten-Thumbnails,
     `unsafeWindow.addFav`-Hook, MutationObserver für pagetual.
   - `ui.js` = Header-UI (Score/Random/Search/Progress) + Chunked-Gallery-Renderer.
   - `api.js` = zentraler Netzwerk-Client (HTML/JSON, Timeout, Retry/Backoff,
     Rate-Limit, optionale offizielle Metadaten-API).
   - `config.js` = Build-Time-Konfiguration; Zugangsdaten kommen ausschließlich aus
     der lokalen, ignorierten `.env.local`.
   - `core.js` = PageType, gemeinsames `state`-Objekt (alle modul-übergreifenden
     Variablen), pure Helfer (ID-Extraktion – testbar).
3. **Storage:** IndexedDB für den Favoriten-Cache (ein globaler Key, kein User-Scope,
   Migration vom alten `allImagesPayload:{userId}`-Key), localStorage für Queues und
   Einstellungen (`removalQueue`, `additionalQueue`, `fromBack`, `prevFavCount`,
   `userId`, `borderFavs`).

---

## v4.35 – Pagination als Count-Quelle, Resume, inkrementelle Grenze, Durchsatz

**Ziel:** Die sieben Punkte aus der Bestandsaufnahme nach v4.34, in der
empfohlenen Reihenfolge (kleine, risikolose Schritte zuerst).

**1. Count primär aus der Pagination**
`init()` und `scan()` lesen die Seitenzahl jetzt aus der Pagination der
Favoriten-Seite (höchster `pid`, pure Helfer `favoritePageCountFromPid`). Der
Profil-Request entfällt damit im Normalfall komplett – er war die einzige
Stelle, die an Cloudflare/Timeouts scheitern konnte. Der exakte Count wird nur
noch ohne Pagination geholt.

**2. Regressionstests**
- `test/parser.test.mjs`: 12 neue Checks für `favoritePageCountFromPid`
  (84750 → 1696 Seiten) und `indexOfCachedId` (Grenze des Incremental-Scans).
- `tools/smoke-test.js`: zwei neue End-to-End-Szenarien – **Count-Fallback**
  (Profil-Request scheitert, Pagination liefert 2 Seiten → Status „scanned",
  Cache unverändert, 0 Requests) und **inkrementell** (neuer Favorit oben →
  genau 1 Seiten-Request, Cache 2 Bilder). Der Scan-Flow wartet jetzt auf den
  gespeicherten `prevFavCount` statt auf den Status, weil erst gerendert und
  dann gespeichert wird.

**3. Inkrementelles Abbruchkriterium**
`searchNewPages()` lädt Seite für Seite, bis eine Seite eine bereits gecachte ID
enthält. Der alte „nicht unter den ersten 10 Seiten gefunden → `searchAllPages(10)`"-
Fallback (1686 Seiten) ist weg: Wird die ID auf keiner Seite gefunden, ersetzen
die bereits geladenen Seiten den Cache – ohne zweiten Durchlauf.

**4. Resume / Teilfortschritt**
Während eines Voll-Scans wird alle 25 Seiten ein Teilfortschritt unter dem
eigenen IndexedDB-Key `scanPartial` gesichert (Seitenliste + Bilder, getrennt vom
regulären Cache). Nach Cancel, Reload oder Absturz meldet `init()`
„scan incomplete (N/M) – click Search to resume"; der nächste Voll-Scan
überspringt die gespeicherten Seiten. Bei Erfolg wird der Key gelöscht.
Cache-Einträge tragen dafür optional `page` (alte Caches bleiben gültig).
Hinweis: best-effort – verschieben neue Favoriten die Seitengrenzen, kann es an
den Rändern Doppel geben; die Dedupe über die Post-ID fängt das ab.

**5. Durchsatz (gemessen)**
`pageRequestLimiter` von 1000 ms auf **450 ms** pro Request gesenkt. Messung
direkt auf rule34.xxx (6 Favoriten-Seiten, je 50 Thumbnails): 1 s Abstand =
6,3 s, 0,35 s Abstand = 3,2 s – beide Läufe vollständig HTTP 200, keine
CAPTCHA-Seite. 450 ms bleibt bewusst über dem gemessenen Minimum. Rechnerisch
sinkt ein 1696-Seiten-Voll-Scan damit von ~28 auf ~13 Minuten (nicht in einem
langen Lauf nachgemessen).
Zusätzlich erkennt `fetchFavoritesPage()` die Cloudflare-CAPTCHA-Seite
(`Rule34.xxx CAPTCHA`, HTTP 200 ohne Thumbnails) und pausiert den Limiter 30 s,
statt vier schnelle Fehlversuche zu fahren.

**6. Status/Diagnose**
- Statuszeile mit **ETA** während des Scans (`scanning: 1234 / 1696  (full) · ETA 4:12`).
- Nach Erfolg steht „scanned" bzw. „scanned (new N)" statt des letzten Fortschrittstexts.
- Cache-Panel zeigt zusätzlich: Count + Quelle (exakt/geschätzt; bei Schätzung
  die Seitenzahl statt der gerundeten 84800), Scan-Fortschritt bzw.
  unterbrochenen Scan und den letzten Seitenfehler.

**7. Score-Nachtrag nach dem Rendern**
`finishScanAndDisplay()` rendert zuerst und trägt Scores danach nach (bis zu 5
API-Requests), erst dann wird gespeichert. Die Galerie erscheint damit sofort
statt bis zu ~5–20 s nach dem letzten Seiten-Request.

**Doku:** README auf v4.35 aktualisiert (Features, Storage-Keys, Cache-Felder,
Testumfang).

**Betroffen:** `core.js` (Helfer + State), `storage.js` (Teilfortschritt,
Cache-Feld `page`), `api.js` (CAPTCHA/Pause), `config.js` (450 ms), `scan.js`
(Count, Incremental, Resume, ETA, Render-Reihenfolge), `ui.js` (Diagnose,
Partial-Cleanup), Tests, Build-Artefakt @version 4.35.

---

## v4.34 – Count-Ausfall blockiert den Cache nicht mehr (kein Voll-Scan pro Klick)

**Problem (aus v4.33):** Fiel der Profil-Count-Request aus, stieg `init()` direkt
aus – **bevor** der IndexedDB-Cache geladen wurde. Folgen: Status dauerhaft
„favorites count unavailable“, `state.fullScan` blieb `true`, und jeder Klick auf
**Search** scannte alle Seiten neu (bei 84769 Favoriten: 1696 Seiten). Ein manuell
korrigiertes `prevFavCount` half nicht, weil `init()` die Vergleichslogik nie
erreichte. Außerdem landete die gerundete Seitengrenze als Baseline im Storage
(`prevFavCount: 84800` statt `84769`).

- **`init()` rechnet mit der Seitenzahl weiter:** Schlägt der Count fehl, wird er
  aus der Pagination der Favoriten-Seite abgeleitet (`favCountEstimated`). Erst
  wenn auch die fehlt, bleibt es beim alten Abbruch. Cache-Laden,
  Erste-ID-Vergleich und „scanned“/„scanned (new)“ laufen normal weiter – bei
  unverändertem Bestand steht nach dem Laden wieder „scanned“, und Search rendert
  den Cache statt 1696 Seiten zu laden.
- **Keine falsche Baseline mehr:** `finishScanAndDisplay()` speichert bei
  geschätztem Count `state.allImages.length` (die tatsächlich gecachte Menge)
  statt `Seiten × 50`.
- **Kein Fehlalarm durch Rundung:** `favCountOnLastUpdate` bleibt bei geschätztem
  Count leer (sonst hätte der Tab-Wechsel-Check 84800 ≠ 84769 als „neu“ gewertet
  und die Seite wiederholt neu geladen); der Zahlenvergleich in `init()` entfällt
  dann zugunsten des Erste-ID-Vergleichs.
- **`fullScan` wird nach einem abgeschlossenen Scan zurückgesetzt:** ein zweiter
  Klick auf Search prüft inkrementell (max. 10 Seiten) statt erneut alle Seiten
  zu laden. Ein Voll-Scan bleibt über „Cache neu scannen“ möglich.

**Korrektur (noch in v4.34):** Die Baseline wurde aus `state.allImages.length`
gebildet – bei einem **inkrementellen** Scan stehen dort aber nur die neu
geladenen Seiten, der übernommene Cache-Teil liegt in `state.loadedImages`
(angehängt erst in `saveAllImagesToIndexedDB()`). `prevFavCount` wäre damit z. B.
auf `50` statt `84769` gesetzt worden, was später einen Fehlalarm „scanned (new)“
auslöst. `saveAllImagesToIndexedDB()` gibt jetzt die Anzahl der tatsächlich
geschriebenen Einträge zurück; genau diese Zahl ist die Baseline.

**Betroffen:** `core.js` (`state.favCountEstimated`), `scan.js` (`init()`,
`scan()`, `finishScanAndDisplay()`), `storage.js` (`saveAllImagesToIndexedDB()`
liefert die Anzahl geschriebener Einträge), Build-Artefakt @version 4.34.

---

## v4.33 – „favorites count unavailable“ blockiert den Scan nicht mehr

**Problem:** Der Favoriten-Count wurde beim Seitenaufbau genau einmal geholt.
Scheiterte dieser eine Request (Timeout, Cloudflare-Challenge, kurzer
Netzwerkfehler), blieb `state.actualFavCount` leer und `scan()` stieg bei jedem
Klick auf **Search** sofort wieder aus – Status dauerhaft „favorites count
unavailable“, es passierte nichts mehr.

- **Retry beim Klick:** Fehlt der Count, holt `scan()` ihn jetzt erneut – mit
  `force: true` am 5s-Cache (auch am gecachten Fehlerwert) vorbei. Gelingt der
  Request, läuft der Scan normal weiter.
- **Notfall-Seitenzahl:** Schlägt auch der zweite Versuch fehl, wird die
  Seitenzahl aus der Pagination der aktuellen Favoriten-Seite gelesen (höchster
  `pid` im Paginator, `a[name="lastpage"]`). `actualFavCount` ist dann
  `Seiten × 50` – für die Seitenplanung exakt (`ceil(count / 50)` = Seiten), nur
  die Anzeige des Counts bleibt geschätzt. Der Scan ist damit auch dann möglich,
  wenn rule34 den Profil-Request blockt.
- **Status:** Beim Laden heißt es jetzt „favorites count unavailable – click
  Search“, damit der Retry sichtbar ist; während eines geschätzten Scans steht
  „scanning (count estimated)“.

**Betroffen:** `api.js` (`getFavoritesCount` mit `force`), `scan.js`
(`scan()`-Ablauf, Notfall-Seitenzahl), Build-Artefakt @version 4.33.

---

## v4.32 – Export/Import mit Storage-Snapshot

- **Export:** Die JSON-Datei enthält neben dem Favoriten-Cache jetzt ein
  `storage`-Feld: die Script-eigenen localStorage-Keys (`removalQueue`,
  `additionalQueue`, `fromBack`, `prevFavCount`, `userId`, `borderFavs`) und den
  Session-Cookie `user_id`. Fremde Keys/Cookies bleiben draußen.
- **Import:** Der Snapshot wird restauriert – localStorage-Keys werden
  zurückgeschrieben, `user_id` als Cookie auf `.rule34.xxx` gesetzt. Ein Import
  auf frischem Browser-Profil ist damit ohne manuelle Anmeldung lauffähig.
- `collectStorageSnapshot()`/`restoreStorageSnapshot()` in `storage.js`;
  fehlendes `storage`-Feld in alten Exporten ist unkritisch (Import überspringt
  den Restore).

---

## v4.31 – Metadaten ehrlich machen, Scans abbrechbar, kein Reload nach Scan

**Review aus einem frischen Chat-Kontext. Die zentrale API-Schicht aus v4.30 war
solide, aber die Metadatenanreicherung hatte keinen sichtbaren Effekt.**

**Live geprüft (ein Request mit lokalen Zugangsdaten):** `api.rule34.xxx`
ignoriert den `fields`-Parameter und liefert immer den vollen Satz (23 Felder,
auch bei `fields=tag_info`). Damit waren zwei Annahmen aus v4.30 falsch: der
Parameter war ein wirkungsloser Rest aus dem in v4.29 entfernten Tag-Feature,
und von den gelieferten Feldern zeigte die Galerie genau eines.

### Metadaten
- `fields=tag_info` entfernt (No-Op der API, irreführend).
- Anreicherung beschränkt sich auf den **Score** – das einzige Feld, das die
  Galerie tatsächlich anzeigt (Score-Sortierung, Thumb-Tooltip).
- `rating`, `fileURL`, `previewURL`, `width`, `height` fliegen aus Cache und
  Code. Sie wurden nie angezeigt und wucherten nur den Cache hoch.
- `syncMetadataToScanImages` → `syncScoresToScanImages`: spiegelt nur noch den
  Score zurück und überschreibt nie einen bereits im HTML gefundenen.
- `CACHE_VERSION` bleibt **4**. Alte Caches enthalten die Felder noch, werden
  aber ignoriert und beim nächsten Save ohne sie überschrieben – kein
  erzwungener Voll-Scan für die Nutzer.
- Neue Tests: URL-Form (ohne Credentials, ohne `fields`), Antwortform
  (`Array` / `{post}` / `{posts}`), Score-Normalisierung inkl. `0`,
  Kandidatenauswahl (nur ohne Score, dedupliziert, begrenzt).

### Scan abbrechbar
- `cancelScan()` war seit v4.30 exportiert, wurde aber nirgends aufgerufen –
  der AbortController feuerte nur beim Unload. Jetzt gibt es einen
  **Cancel-Knopf**, der nur während eines laufenden Scans sichtbar ist.
- `tools/check-imports.mjs` kennt `cancelScan` jetzt als Cross-Modul-Export
  und führt die testbaren Helfer aus `api.js` mit – genau diese Lücke in der
  Export-Liste hat den toten Code durchgelassen.

### Kein Reload nach dem Scan
- `switchedToFavPage()` prüft nicht mehr während eines laufenden Scans. Der
  Count-Request teilt sich `pageRequestLimiter` mit den Scan-Seiten und würde
  ohnehin bis Scan-Ende warten – und dann die gerade fertig gerenderte
  Galerie wegschmeißen.
- `fastCheckForScanIsNeeded()` zieht `state.actualFavCount` mit. Vorher blieb
  der Wert aus dem Seitenaufruf stehen, `finishScanAndDisplay` schrieb genau
  diesen veralteten Wert als `prevFavCount` zurück, und der nächste Aufruf
  meldete deshalb fälschlich „scanned (new)".
- Fehlende Baseline (`favCountOnLastUpdate` nicht endlich) übernimmt den Wert
  jetzt selbst, statt den Check dauerhaft wirkungslos zu lassen.

**Verifiziert:** 33/33 Unit-Tests, Import-Check, ESLint, Secret-Check,
Smoke-Test (Bundle + Git-HEAD-Baseline + Scan-Flow) – alle grün.

### Doku
- README auf v4.31 gebracht: Feature-Liste (Score-Nachtrag, Cancel-Knopf,
  Tab-Wechsel ohne Reload), Cache-Payload und Cache-Version.
- Neuer Abschnitt **„Zugangsdaten: Repo-Pflicht und privater Build“** mit einer
  Gegenüberstellung: was committet wird (nie Zugangsdaten) und was nur lokal
  entsteht. Drei Schritte: credential-frei bauen, privat bauen, vor dem Commit
  zurücksetzen.
- `.env.example` ist jetzt eine ausdrücklich leere Vorlage mit Ablauf-Kommentar,
  `build.js --help` verweist auf den Ablauf, und `npm test` bündelt alle
  Prüfungen inklusive ESLint in einem Durchgang.

---

## v4.30 – API-Härtung und optionale Metadaten

- Zentraler Request-Client für HTML- und JSON-Aufrufe mit Timeout, `AbortController`,
  Retry-Only-für-transiente-Fehler, exponentiellem Backoff mit Jitter und
  `Retry-After`-Unterstützung.
- Getrennte Rate-Limiter für Favoriten-HTML (2 parallel, 1 Request/Sekunde) und
  offizielle Metadaten-API (1 Request/Sekunde).
- Remove-/Undo-Aktionen und Favoriten-Seiten laufen nun über denselben Client;
  direkte `fetch`-Aufrufe im UI wurden entfernt.
- Optionales Enrichment fehlender Post-Metadaten über `api.rule34.xxx`, nur wenn
  beide Werte aus einer lokalen, ignorierten `.env.local` vorhanden sind.
- abbruchbare Scans und ein Cache-Format v4 für die zusätzlichen Metadatenfelder.
- API-Key-Leak-Prüfung und Tests für Timeout, Retry, Backoff, `Retry-After`,
  Abbruch und Rate-Limiter ergänzt.

### Sicherheitshinweis

Ein bereits offengelegter API-Key muss im Rule34-Konto widerrufen und neu erzeugt
werden. Zugangsdaten gehören ausschließlich in `.env.local`; private Builds mit
injizierten Zugangsdaten dürfen nicht veröffentlicht werden.

**Korrektur nach dem Merge:** Der erste Merge von v4.30 hatte Zugangsdaten in drei
getrackten Dateien – `.env.local` (trotz `.gitignore`, weil bereits getrackt),
`.env.example` und das gebaute Bundle. Bereinigt: `.env.local` ist nicht mehr
getrackt (lokal weiterhin vorhanden), `.env.example` enthält nur noch leere
Platzhalter, und das committete Bundle wird credential-frei gebaut
(`RULE34_API_USER_ID= RULE34_API_KEY= node build.js --no-bump` bzw. ohne
`.env.local`). `npm run test:secrets` schlägt jetzt zusätzlich fehl, wenn ein
Bundle injizierte Zugangsdaten enthält. Der Key muss im Rule34-Konto widerrufen
und neu erzeugt werden – die Values aus der Git-History sind nicht mehr gültig
zu halten.

---

## v4.29 – Tag-Filter komplett entfernt

**Entscheidung (Feedback):** Das Tag-Filter-Feature (Suchleiste + Autocomplete)
verursachte wiederholt Probleme (Awesomplete-Crash, Performance, inkorrekte
Erkennung) und wird deshalb komplett zurückgenommen.

**Entfernt:**
- **Suchleiste** – das Tag-Filter-Eingabefeld ist komplett aus dem Header raus
  (inkl. Awesomplete-Integration, Enter/Esc-Logik, Vorschlagslisten-Aufbau).
- **Tags im Cache** – `saveAllImagesToIndexedDB` speichert wieder nur
  `id, link, score, src` (wie vor v4.22). Vorhandene `tags`-Felder im bestehenden
  Cache sind harmlos und verschwinden beim nächsten Scan automatisch.
- **Tag-Extraktion** – `scan.js` liest keine Thumbnails-Titel mehr aus.
- State aufgeräumt (`tagFilter` raus), `refreshTagSuggestions`/`collectKnownTags`/
  `initTagCompleter` gelöscht (– 4 KB Bundle).

**Geblieben (unverändert):**
- Sortierung (Original/Score/Random), Scan + Retry, Undo, Diff-Modus („New“),
  **Export/Import** (lädt direkt, ohne Neu-Scan), **Cache-Panel** mit
  Cache-Info/Auto-Scan/neu scannen/löschen, Tab-Wechsel-Check.

---

## v4.27 – Page-Load-Hang behoben (lazy Tag-Suggest-Liste)

**Problem (Feedback):** Kurz nach dem Laden der Favoriten-Seite hing die Seite
kurz – neu seit v4.23/4.25, auffällig bei großen Caches.

**Ursache:** `refreshTagSuggestions()` baute die komplette Tag-Vorschlagsliste
synchron beim Seitenladen auf: Aggregation über den gesamten Cache (jeden Post,
jeden Tag in eine Map) plus Sortierung mit `localeCompare` (ICU-Kollation –
sehr teuer bei tausenden Tags). Bei großen Favoriten-Listen blockierte das
den Main-Thread für spürbare Zeit direkt nach dem Laden.

**Fixes:**
- **Lazy-Aufbau:** Die Tag-Liste wird erst beim **Fokus** aufs Filter-Feld
  gebaut (`tagListDirty`-Flag + focus-Listener) – der Seitenladen selbst baut
  nichts mehr. Nach Scan/Import wird nur das Dirty-Flag gesetzt; tippt der
  Nutzer gerade im Feld, wird sofort aktualisiert.
- **Günstigere Aggregation:** nur `state.results` (vorher results + loadedImages
  = doppelte Arbeit) und Sortierung ohne `localeCompare` (einfacher String-
  Vergleich), Häufigkeit vor Alphabet bleibt.
- **Awesomplete `sort: false` → No-op-Comparator `(a, b) => 0`** – robuster
  gegen interne `Array.sort(this.sort)`-Aufrufe, unsere Reihenfolge bleibt
  (stabile Sortierung) erhalten.
- Awesomplete startet mit leerer Liste; `refreshTagSuggestions` ist jetzt O(1).

---

## v4.26 – Tag-Filter filtert erst auf Enter

**Änderung (Feedback):** Das Tag-Filter-Feld startete bei jeder Schreibpause
(300ms-Debounce) automatisch eine Filterung – mitten im Tipken eines Tags
wurde also schon gesucht und die Galerie neu gerendert.

- Filter wird jetzt **nur bei Enter** ausgelöst (nicht mehr beim Tippen).
- Ist ein **Awesomplete-Vorschlag markiert** (Pfeiltasten-Navigation), übernimmt
  Enter zuerst den Vorschlag ins Feld – erst das nächste Enter filtert
  (`tagCompleter.selected`-Check).
- **Escape** leert das Feld und zeigt wieder alle Favoriten.
- Platzhalter/Hinweistext angepasst: „Tags filtern… (Enter)“.
- Kein Debounce-Timer mehr – weniger Render-Vorgänge bei großen Listen.

---

## v4.25 – Awesomplete-Crash behoben + Tags im Renderer erhalten

**Fix 1 – Awesomplete-Init crashte (`insertBefore` auf null):**
- `initTagCompleter()` lief im `createHeaderUI`, **bevor** das Filter-Input ins
  DOM eingehängt war – Awesompletes `create(around: input)` braucht aber
  `input.parentNode` und crashte mit `Cannot read properties of null`.
- Jetzt wird der Init **nach** `header.insertBefore(inputContainer, …)` ausgeführt.
- Zusätzlich: begrenzter Retry (20 × 500ms), falls rule34 die Bibliothek erst
  nach unserem Userscript lädt (gleiche Strategie wie beim addFav-Hook), und
  `sort: false`, damit die Häufigkeits-Sortierung der Vorschläge erhalten bleibt.

**Fix 2 – Tags gingen bei jedem Re-Render verloren (title="Score: 92"):**
- Unser Chunked-Renderer setzte beim Re-Render (Original/Score/Random/Search)
  `img.title = "Score: X"` statt der Tags.
- Jetzt werden `img.title` **und** `img.alt` auf die gecachten Tags des Posts
  gesetzt (`tags.join(' ')`, Fallback `image_thumb`). Damit bleiben die Tags im
  Tooltip/Filter auch nach Sortieren und Neu-Scannen erhalten.

---

## v4.23 – Import-Fix, Awesomplete-Tag-Filter, Batch-Remove & Progress-Bar entfernt

**Ziel:** Drei Rückmeldungen aus der Praxis umsetzen – Import soll ohne erneuten
Scan funktionieren, Tag-Filter soll die rule34-eigene Autocomplete-Lib nutzen,
Batch-Remove und Progress-Bar werden nicht gebraucht und fliegen raus.

**Fix 1 – Import lädt direkt (kein Search mehr nötig):**
- Nach erfolgreichem Import werden die Bilder **direkt in den State geladen und
  gerendert** (`state.allImages`/`results`/`loadedImages`), `needScan=false` und
  `prevFavCount`/`userId` werden gesetzt. Der Cache ist damit sofort benutzbar –
  kein „bitte Search drücken“, kein erneutes Laden.
- Entfernte Posts (aus der removalQueue) werden dabei nicht angezeigt.

**Fix 2 – Tag-Filter mit Awesomplete-Autocomplete:**
- Das Filter-Input nutzt jetzt **awesomplete.min.js** (die Autocomplete-Bibliothek,
  die rule34 selbst für die Tag-Suche lädt) via `unsafeWindow.Awesomplete`.
- Vorschläge kommen aus allen bekannten Tags (Cache + Ergebnisse), **nach
  Häufigkeit sortiert**, und werden nach jedem Scan/Cache-Load aktualisiert.
- Multi-Tag-fähig: nur das letzte Token wird vervollständigt, der Vorschlag wird
  angehängt statt das Feld zu ersetzen. Läuft ohne die Lib als normales Textfeld.
- Tag-Extraktion nutzt jetzt `title` **oder** `alt` (je nach Theme) – erkennt
  deutlich mehr Tags als vorher.

**Entfernt:**
- **Batch-Remove** (Select-Modus, Checkboxen, `removeSelectedPosts()`) – komplett raus.
- **Progress-Bar** (Balken + Umschalter) – der Text-Status bleibt wie in v4.21.

**Betroffen:** `ui.js` (Awesomplete, Import-Fix, -Batch-Remove, -Progress-Bar),
`scan.js` (alt-Fallback bei Tag-Extraktion, `refreshTagSuggestions()` nach Scan),
`core.js` (State aufgeräumt), `tools/check-imports.mjs`, `tools/smoke-test.js`.

---

## v4.22 – Tag-Filter, Batch-Remove, Export/Import, Diff-Modus, Progress-Bar, Auto-Scan, Cache-Panel

**Ziel:** Sechs neue Features (1a–5a) + zwei eigene (1b/2b), alle opt-in bzw.
nicht-invasiv in die bestehende Header-UI integriert.

**1a – Tag-basierte Filterung:**
- `scan.js` extrahiert beim Favoriten-Scan die Tags aus dem `title`-Attribut
  der Thumbnails (`getTagsFromImg`, Leerzeichen-separiert, `image_thumb` wird
  gefiltert) und hängt sie als `tags`-Array an Post + Cache-Eintrag.
- Neues `<input>` im Header filtert `state.results` live (300ms Debounce),
  UND-Logik über Leerzeichen/Komma, Substring-Match (`girl` matcht `1girl`).
- Filter läuft über `getFilteredResults()` (ui.js) – kombinierbar mit Diff-Modus.
- Alte Caches ohne `tags` funktionieren weiter (Fallback `[]`).

**2a – Batch-Remove:**
- „Select“-Button togglet Checkboxen an allen Posts; Bildklick togglet dann
  die Auswahl statt zur Post-Seite zu navigieren.
- „Remove (n)“ entfernt alle Ausgewählten sequentiell per fetch (Server-schonend),
  mit Fortschritt über die Progress-Anzeige und Fehlerzählung.
- Entfernte Posts verschwinden aus `results`/`baseResults`/Cache-Queues.

**3a – Export / Import:**
- „Export“ lädt den IndexedDB-Cache als JSON-Datei herunter
  (`r34-favorites-{userId}-{datum}.json`).
- „Import“ liest eine solche Datei, validiert sie (nicht-leeres `images`-Array
  mit `id`), ersetzt den Cache und erzwingt einen Neu-Scan.

**4a – Diff-Modus („Nur neue Favoriten“):**
- `finishScanAndDisplay()` berechnet vor dem Cache-Update das Set
  `newSinceLastScan` (Voll-Scan: Diff zum alten Cache; Incremental: frische Seiten).
- „New (n)“-Button (nur sichtbar wenn n > 0) togglet die Anzeige.

**5a – Progress-Bar / Text-Umschalter:**
- Scan-Fortschritt standardmäßig als Balken (180px, neben dem Status-Text);
  „Text“-Button wechselt zur alten Textanzeige. Einstellung in
  `localStorage: progressStyle` persistiert.

**1b – Auto-Scan (zeitgesteuert):**
- Cache-Panel-Dropdown: Aus / alle 5 Min / alle 15 Min
  (`localStorage: autoScan`). Nutzt `fastCheckForScanIsNeeded()` und startet
  bei neuen Favoriten `searchNewPages()` (Incremental, kein Reload).

**2b – Cache-Info-Panel:**
- „ⓘ Cache“-Button klappt ein Panel auf: Bildanzahl, `updatedAt`,
  Auto-Scan-Einstellung, „Cache neu scannen“ (Voll-Scan) und „Cache löschen“
  (`idbDelete` + localStorage-Cleanup + Reload).

**Tests (10a):**
- Neu: `test/features.test.mjs` (14 Tests: Tag-Extraktion, Filter-Pipeline,
  Diff-Modus, Cache-Tags). `npm run test:features`; `test:unit` umfasst jetzt
  alle drei Testdateien (79 Tests gesamt).
- Smoke-Test läuft im Text-Modus (`progressStyle: 'text'` gemockt), damit die
  `/scanning/`-Assertion weiter greift.

**Betroffen:** `core.js` (neuer State), `scan.js` (Tags, Progress, Diff, Auto-Scan),
`ui.js` (Filter, Batch-Remove, Export/Import, Cache-Panel, Progress-Bar),
`storage.js` (`idbDelete`, Tags im Payload), `tools/check-imports.mjs`,
`tools/smoke-test.js`, `package.json`.

---

**Ziel:** Statische Code-Analyse (eslint:recommended + `eqeqeq`) einführen und
alle 9 gemeldeten Funde beheben – keine Verhaltensänderung.

**Änderungen (Entwicklungs-Infrastruktur):**
- **Neu: `eslint.config.mjs`** (Flat Config, ESLint 10) – `eslint:recommended`
  + `eqeqeq: ['error', 'always']`. Getrennte Globals: Browser + Userscript
  (`unsafeWindow`) für `src/`, Node für `build.js`/`tools`/`test`. Das
  gebaute Bundle ist vom Lint ausgenommen.
- **Neu: `npm run lint`**; devDependencies `eslint`, `@eslint/js`, `globals`.

**Lint-Fixes:**
- **`eqeqeq` (scan.js):** die drei losen Vergleiche (`!=`/`==` bei
  `savedUserId`, `prevUserId`, `loadedFirstId`/`actualFirstId`,
  `favoritesCount`/`prevFavCount`) → strikt (`!==`/`===`).
- **`no-unused-vars`:** unbenutzte `catch (e)` → optionale Catch-Bindings
  (`catch { … }`) in `core.js` und `tools/smoke-test.js`; unbenutzter Import
  `getStoredQueue` in `test/core.test.mjs` entfernt.
- Verifiziert: `npm run lint` Exit 0, alle Tests grün (Parser 39, Core 26,
  Smoke inkl. Scan-Flow, Imports).

**Betroffen:** Entwicklungs-Infrastruktur (ESLint) + Lint-Fixes in `src/`;
Build-Artefakt `Rule34 Favorites Enhancer.js` neu gebaut (@version 4.19).

---

## v4.18 – Undo für Remove + RateLimiter + robuster Count-Parser

**Ziel:** Erkenntnisse aus der Analyse des Favorites-Search-Gallery-Scripts
(bruh3396) übernehmen – die drei sinnvollen, schlanken Verbesserungen ohne dessen
Monolith-Umfang (Server-Backend, Galerie, Themes).

**Undo-Button (echter Server-Undo):**
- Nach einem fetch-Remove erscheint im Header ein grüner „Undo“-Button.
- `addFavorite(id)` (neu in `api.js`) ruft den verifizierten Server-Endpoint
  `https://rule34.xxx/public/addfav.php?id=X` auf – Antwort ist ein Status-Code
  (0=error, 1=alreadyAdded, 2=loggedOut, 3=success); true nur bei success.
- Bei Erfolg wird der Post aus der `removalQueue` genommen
  (`removeFromRemovalQueue` neu in `storage.js`) und wieder in die Galerie
  zurückgeholt (`renderResultsToGalleryChunked`) – der Server-Favorit ist damit
  wirklich wiederhergestellt, nicht nur die Anzeige.

**RateLimiter statt fixe Delays:**
- Neu in `api.js`: zentrale `RateLimiter`-Klasse (Concurrency + Requests/Sekunde)
  nach dem Vorbild des Favorites-Search-Gallery-Scripts.
- `fetchFavoritesPage` läuft jetzt durch `pageRequestLimiter`
  ({ concurrency: 5, ratePerSecond: 1 }) – alle Seiten-Fetches werden an einer
  Stelle limitiert.
- `pagedFetch()` (scan.js) verliert die eigene In-Flight-/Delay-Schleife
  (FETCH_DELAY/POLL_DELAY/MAX_IN_FLIGHT) und nutzt nur noch Promise.all;
  `retryFailedPages()` ebenso (kein eigenes sleep mehr).

**Robuster Count-Parser:**
- `getFavoritesCount` liest die Favoriten-Anzahl jetzt aus dem Text des
  „Favorites“-Links im Profil statt aus der tr/td-Tabellenstruktur
  (übernommen aus `extractFavoritesCount` des Favorites-Search-Gallery-Scripts) –
  unabhängiger von Layout-Änderungen der Profilseite.

**Betroffen:** Header-UI (Undo-Button), Netzwerk (RateLimiter), Count-Erkennung;
Scan-Verhalten identisch (gleiche Rate wie vorher, nur zentral gesteuert).

---

## v4.17 – Retry für fehlgeschlagene Seiten + Parser-Tests

**Ziel:** Scan-Fehlertoleranz verbessern (nur fehlgeschlagene Seiten nachladen statt
komplett neu zu scannen) und die pure Logik mit Unit-Tests absichern.

**Retry-Button:**
- Neuer „Retry“-Button im Header (orange) – erscheint nur, wenn beim Scan Seiten
  fehlgeschlagen sind (`scan incomplete (X page(s) failed)`).
- `retryFailedPages()` lädt ausschließlich `state.failedScanPages` erneut nach
  (mit 1s Delay) und merged die Ergebnisse in die bestehende Galerie – kein
  kompletter Neu-Scan. Nur wenn alle Seiten erfolgreich sind, gilt der Scan als
  vollständig (Cache wird gespeichert).
- Sichtbarkeit steuert `updateRetryButtonVisibility()` (scan.js); der Button wird
  beim nächsten regulären Scan automatisch ausgeblendet.

**Parser-Tests (Entwicklungs-Infrastruktur):**
- Neu: `test/parser.test.mjs` – 39 Unit-Tests für alle pure Helfer aus `core.js`
  (PageType-Erkennung, `getIdFromUrl`, `getPostIdFromLink`, `getImageId`,
  `getThumbImgId`, `parseStoredJson`, `parseFavoriteCount`, `normalizeCacheImages`).
- Neues npm-Script `test:parser` (analog zum Combined Script).

**Weitere Fixes dieser Runde:**
- **Highlight-Bug:** `addImageBorderById` findet jetzt beide ID-Formate
  (`<span id="s{id}">` der Original-Galerie und `<a id="p{id}">` der eigenen
  Chunked-Galerie) – neu favorisierte Posts werden auch nach einem Scan markiert.
- **Scan-Dedup:** `searchAllPages`/`searchNewPages` nutzen jetzt die gemeinsame
  `pagedFetch()`-Helfer (identische In-Flight-/Delay-/Status-Logik, ~40 Zeilen
  weniger Duplikat).
- **Remove ohne Reload:** der „Remove“-Link entfernt Posts per `fetch` direkt aus
  der Galerie (kein Seiten-Reload) und pflegt Removal/Additional-Queues, damit
  der Post auch aus dem IndexedDB-Cache verschwindet.
- **Video-Code entfernt:** das ungenutzte `video`-Flag aus `extractImagesAndTags`
  gelöscht (inkl. der dafür nötigen `tags`-Variable) – Cache bleibt bei
  `src/link/id/score`.
- **`@run-at document-idle`** explizit im Header (war bereits der Manager-Default,
  jetzt dokumentiert).

**Betroffen:** Scan, Highlighting, Galerie, Header-UI; Verhalten bis auf die
Fix-Benefits unverändert.

---

## v4.16 – Toten Code entfernt + Modul-Split

**Ziel:** ~23 % toten Code entfernen (ohne Verhaltensänderung) und die Einzeldatei
in Module zerlegen (Entwicklungs-Infrastruktur, keine Laufzeit-Änderung).

**Toten-Code-Entfernung:**
- Legacy-Modal-Renderer (auskommentierter `if (false)`-Block, ~245 Zeilen) entfernt.
- `getVisibleResults()` + Such-Feature-Reste entfernt (das Suchfeld war komplett
  auskommentiert – `getVisibleResults()` lieferte dadurch immer alles; Sortier-Button
  nutzt jetzt direkt `results`).
- `getBgColor()`, `isDarkMode()`, `darkMode`/`textColor` entfernt (nur im toten Block
  benutzt).
- `onPostPage()` entfernt (nie aufgerufen, nur exportiert).
- `getCookieValue()` + `useBlacklist`-Reste entfernt (nur in auskommentiertem Code).
- `@description` korrigiert: „Mouse4 für Quick Favorisieren“ existiert nicht mehr im
  Code → neue Beschreibung nennt die tatsächlichen Features.
- Ergebnis: 1.357 → 1.047 Zeilen, 56 KB → 42 KB.

**Modul-Split (Entwicklungs-Infrastruktur – keine Versionsänderung):**
- `src/` mit 7 Modulen: `core.js` · `storage.js` · `api.js` · `scan.js` · `ui.js` ·
  `highlight.js` · `version.js`.
- `build.js` (esbuild) baut die Module zu `Rule34 Favorites Enhancer.js` und
  überschreibt die Datei direkt im Projekt – die installierbare Datei bleibt wie
  bisher Teil des Repos.
- Gemeinsamer Zustand zentral im `state`-Objekt (`core.js`) – gleiches Verhalten wie
  in der Einzeldatei.
- `@name`/`@namespace`/`@version` bleiben identisch → der Userscript-Manager
  behandelt das Script als dieselbe Installation (kein neues Script, keine
  Daten-Migration nötig).
- Tests: `tools/smoke-test.js` (Mock-Browser: Bundle + Git-Baseline),
  `tools/check-imports.mjs` (prüft Vollständigkeit aller Modul-Imports).

**Betroffen:** gesamtes Script (nur Struktur); Verhalten unverändert.

---

## v4.15 – Ausgangsbasis (Stand vor der Bereinigung)

**Ziel:** Dokumentierter Basiszustand vor v4.16 – die Funktionalität, die das Script
seit der Übernahme bietet.

**Funktionalität (Bestand, nicht neu):**
- **Highlighting:** gespeicherte Favoriten werden auf Post-Listen und Favoriten-Seiten
  mit rotem Rahmen markiert (`exploreModule` – Cached Sets, WeakSet-Guard,
  MutationObserver für pagetual-Batches).
- **Quick-Favorisieren:** `unsafeWindow.addFav`-Hook → zusätzlich favorisierte Posts
  landen sofort in der `additionalQueue` (Cross-Tab-Sync via localStorage) und werden
  live markiert.
- **Favoriten-Scan:** „Search“-Button lädt alle Favoriten-Seiten (parallel mit
  Limit, Retry/Backoff bei 429/503), inkl. Voll-Scan und Inkremental-Scan
  (nur neue Seiten).
- **Sortierung:** Score (absteigend) und Random über Header-Buttons, Rendering
  direkt in die bestehende rule34-Gallery.
- **Galerie-Renderer:** chunked/lazy (`IntersectionObserver`), inkl. „Remove“-Link
  pro Post.
- **IndexedDB-Cache:** `R34FavDB`/`favoritesStore` mit globalem Key
  `allImagesPayload` (Version 3) + einmaliger Migration vom alten user-scoped Key.
- **Tab-Wechsel-Erkennung:** bei Rückkehr wird geprüft, ob sich die Favoriten-Zahl
  geändert hat → Reload mit aktualisiertem Scan.

**Betroffen:** Basisversion, vor der Bereinigung.
