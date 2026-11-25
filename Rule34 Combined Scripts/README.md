# CHANGELOG – Rule34 Combined Scripts

> Userscript für https://rule34.xxx – kombiniert mehrere Helfer: Tag Hider++ (SmartSkip+),
> R34-Kontrollpanel, Favoriten-/Performance-/Visual-Tweaks, API-Key-Support.

## 🔨 Build / Entwicklung (seit dem Modul-Split)

Das Script wird nicht mehr direkt in einer Datei entwickelt, sondern in `src/` (12 Module)
und per esbuild zu einer installierbaren Einzeldatei gebaut:

```bash
npm install          # einmalig – holt esbuild + ESLint + linkedom (Dev-Dependencies)
npm run build              # überschreibt Rule34 Combined Scripts.js und erhöht danach
                           # automatisch die Minor-Version (v5.27 → v5.28 → v5.29 → …)
npm run build -- --no-bump # baut, ohne die Version zu erhöhen (lokales Testen)
npm run test:parser        # Unit-Tests für den Regel-Parser (26 Fälle, ohne DOM/GM)
npm run test:overlay       # Unit-Tests für den Post-Seiten-Parser (12 Fälle, linkedom)
npm run test:smoke   # Mock-Browser-Test: Bundle vs. Git-Stand
npm run lint         # ESLint – eslint:recommended + eqeqeq
```

- **Quelle der Wahrheit:** `src/` – `Rule34 Combined Scripts.js` ist die gebaute,
  installierbare Datei und bleibt wie bisher Teil des Repos.
- **Versionsnummer:** zentral in `src/version.js` – `npm run build` erhöht die
  Minor-Version nach jedem erfolgreichen Build automatisch (bewusst ohne Float-Arithmetik).
- **Module:** `core.js` (Konstanten/Utils/Storage) · `parser.js` (Regel-Logik, getestet) ·
  `tag-hider.js` (SmartSkip+) · `features.js` (Thumbnails/Tweaks) · `api.js` (API-Key/Restore) ·
  `sidebar.js` · `panel.js` · `overlay.js` (Hover-Overlay) · `overlay-parser.js` (Post-Seiten-Parser) · `infinite-scroll.js` (Infinite-Scroll) · `init.js` (SPA-Maschine).
- **Zirkuläre Kopplung:** `tag-hider.js` ↔ `sidebar.js` rufen sich gegenseitig auf
  (nur zur Laufzeit) – bewusst so belassen, funktioniert mit dem Bundler.

---

## 💤 Aufgeschobene Ideen (Backlog) – nicht umgesetzt

> Bewusst **noch nicht** eingebaut – hier dokumentiert, damit wir später direkt
> darauf zugreifen und den Stand sehen. Status: *offen* (es sei denn anders vermerkt).

| Kategorie | Intro | Kurzbeschreibung | Warum zurückgestellt |
|---|---|---|---|
| **Infinite-Scroll** | **Rule34-API-Fallback** | Wenn der HTML-Fetch eine Challenge-Seite liefert (200er, kein Listen-Markup), stattdessen `api.rule34.xxx` (JSON) abfragen und die Thumbs per HTML-Builder einhängen. | Robuster, aber teuer: neues Modul, Thumb-HTML-Nachbau, zweite Pflegequelle. Der Bug („End of results“) ist schon durch v5.37/v5.38 (Retry) gelöst. Nur sinnvoll, falls der Bot-Schutz mal >7 s anhält. |
| **Infinite-Scroll** | **Retry-Telemetrie** | Challenge-/Retry-Ereignisse (URL, Versuchszahl) in die Konsole loggen, um zu sehen, wie oft der Bot-Schutz in der Praxis zuschlägt. | Nur Diagnose; ohne konkreten Ärger kein Nutzen. Nützlich, falls man den API-Fallback bauen will. |
| **Infinite-Scroll** | **30-s-Checkpoint nach 3 Fehlversuchen** | Nach dem 3. (letzten) Retry-Fehlschlag automatisch nach 30 s erneut versuchen, statt auf Scroll zu warten. | Weicherer Komfort-Fallback; aktueller „scroll to retry“ reicht in der Praxis. |
| **Overlay (Tests)** | **Klick-Handler-Unit-Tests** | Linksklick (bleibt offen), Rechtsklick (`-Tag`, kein Kontextmenü), Mittelklick (Suchen) als Unit-Tests mit gemocktem DOM testen. | Nützlich (sichert v5.34-Features), aber kein Bug; derzeit nur im Browser verifizierbar. |
| **api.js** | **Post-Restore-Randfall** | `restoreDeletedPost` reagiert auf fremden Favoriten-Seiten / nach SPA-Navigation evtl. nicht sauber (kein dedizierter Reset). | Edge case; selten genutzt. |
| **init.js (Perf)** | **Doppelte `getRouteContentNodes`-Auswertung** | Im `scheduleRouteScan`-Fingerprint-Zweig werden die Route-Content-Nodes doppelt bestimmt. | Reiner Micro-Opt-Punkt, ~1–2 Zeilen; kein spürbarer Effekt. |

---

## ⚠️ WICHTIG FÜR KI-AGENTEN (bitte zuerst lesen)

1. **Versionsquelle:** Die Versionsnummern in diesem Changelog beziehen sich auf die
   **DATEINAMEN** (`[vX.Y]Rule34 Combined Scripts.js`). Die `@version`-Metadaten im
   Header weichen teils davon ab (z.B. trägt `[v4.51]` intern `@version 5.1`).
   → **Der Dateiname ist die Quelle der Wahrheit.**
2. **Skript-Architektur (Kontext für jede Version):**
   - `TAG` = IIFE-Modul des Tag Hider++/SmartSkip+ (Regeln, Cache, Verstecken, Toggle).
   - `setupControlPanel()` = schwebendes R34-Panel (Button `.r34-panel-btn`, Panel `.r34-panel`).
   - Sidebar-Module (`refreshBlacklistedSidebar`, `createBlacklistedSidebar`,
     `integrateBlacklistedSidebar`, `setupSidebarIntegration`) = Navbar-/Sidebar-Steuerung.
   - `handleUrlChangeImmediate()` + `scheduleRouteScan()` + `runAll()` = SPA-Navigations-Maschine
     (Rule34 wechselt Seiten per `pushState`/`popstate` OHNE Reload).
   - `removeDuplicateThumbnails` / `hideEmptyThumbSpans` / `hideBlacklisted` = entfernen
     Duplikate/leere Container/Blacklist-Elemente (Achtung: können Inhalte wirklich löschen).
3. **Storage:** Zustand in `GM_setValue/GM_getValue`, UI-Schalter in `localStorage`
   (Keys siehe Tabelle am Ende).

---

## v4.51 – Ausgangsbasis (erster beigefügter Stand)

**Ziel:** Stabiler Basiszustand des kombinierten Skripts.

**Enthaltene Funktionalität (Bestand, nicht neu):**
- **Tag Hider++ (SmartSkip+):** Regeln mit Parser (`&`=UND, `|`=ODER, `!`=NICHT,
  `*`=Wildcard, `//`=Kommentar), Migration v1/v2/v3 + `tag_blacklist`-Cookie,
  Live-Verstecken ohne Reload, Cache `window.__r34thFavCache`, Attribute
  `data-r34th-hider-hidden` / `-processed` / `-parsed` / `-signature`.
- **Control-Panel:** `r34-panel-btn` (dragbar, Position in `r34_button_pos`),
  Sektion "SmartSkip+" (`#toggleSkip`, `#editTags`, `#importCookie`),
  Feature-Flag-Formular (Speichert in `r34_feature_flags`, lädt neu),
  Alt+P = Panel ein/aus (`r34_button_visible`).
- **Tweaks:** `favoriteOnMouse`, `removeDuplicates`, `removeAnnoyances`,
  `collapsibleHeader`, `fixPaginatorLinks`, `removePidParameter`,
  `nativeLazyLoading`, `restoreDeletedPost`, `hideEmptyThumbSpans`,
  `faviconChanger`, `pageIndicator`, `removeThumbTitles`, `cleanupFavoritesArtifacts`.
- **SPA-Navigation:** `pushState`/`replaceState`-Wrapper + `popstate` + Head-Observer.

---

## v4.55 – `#blacklisted-sidebar` wird SmartSkip+-Steuerung

**Problem:** Die alte Seite/Skript erzeugt `<div id="blacklisted-sidebar">` mit einem
"Hidden"-Link (`onclick="showHideBlacklistedPosts()"`). Der soll SmartSkip+ bedienen.

**Änderungen:**
- Neues Modul **"Blacklisted-Sidebar → SmartSkip+"** (vor `setupControlPanel`):
  - `refreshBlacklistedSidebar()` – aktualisiert Label des Links per `TAG.getEnabled()`
    und `#blacklist-count` (Anzahl `[data-r34th-hider-hidden="1"]`).
  - `integrateBlacklistedSidebar(sidebar)` – ersetzt alten `a[href="#"]` durch
    `#blacklistedSidebarLink`; Linksklick → `TAG.toggle()`, Rechtsklick → `TAG.openRules()`;
    setzt `sidebar.style.display = ''`; `dataset.r34thSmartSkip='1'` als Guard.
  - `setupSidebarIntegration()` – sucht `#blacklisted-sidebar` (getElementById) +
    MutationObserver als Sicherheitsnetz; Aufruf in `init()` nach `setupControlPanel()`.
- **Refresh-Verdrahtung:** `reapply()`, `processListPage()`, `processFavoritesPage()`
  rufen am Ende `refreshBlacklistedSidebar()` auf.
- **`toggle()`:** synchronisiert zusätzlich den Panel-Button `#toggleSkip`.
- **Rechtsklick-Ausblenden des Panels:** In `setupControlPanel` → `hidePanelCompletely()`
  (entfernt Button+Panel, `safeStorageSet('r34_button_visible','false')`) auf
  `contextmenu` von `.r34-panel-btn` UND `.r34-panel`.
- **Labels in dieser Version:** `Blacklisted OFF (Disable 🔴)` (bei aktiv) /
  `Blacklisted ON (Enable 🔴→🟢)` (bei inaktiv) – aktionsorientiert.

**Betroffen:** TAG-Modul (`reapply`, `toggle`), neue Sidebar-Funktionen, `setupControlPanel`, `init`.

---

## v4.6 – Auto-Erzeugung der Sidebar in der Navbar + Farbwechsel

**Problem:** Auf Seiten ohne vorhandene Sidebar (z.B. Favoriten-Ansicht
`page=favorites&s=view&id=*`) gibt es keinen Schalter.

**Änderungen:**
- `createBlacklistedSidebar()` – erzeugt `#blacklisted-sidebar` in
  `ul#navbar.flat-list` an **4. Stelle** (`navbar.children[3]`), mit Inline-Styles
  (absolute Position, top -31px, left 380px, Padding, Border, 22px Höhe, flex).
  Guard: nur wenn noch keine existiert.
- `setupSidebarIntegration` → `tryIntegrate()`: erst `createBlacklistedSidebar()`,
  dann `integrateBlacklistedSidebar()`.
- **Klickfläche vergrößert:** Events (`click`=toggle, `contextmenu`=Edit Rules)
  jetzt auf Link UND gesamte Sidebar (mit `e.stopPropagation()`, damit kein Doppel-Toggle).
- **Neue Labels (endgültige Form):** `Blacklist ON🟢` (bei aktiv) /
  `Blacklist OFF🔴` (bei inaktiv) – zustandsorientiert.
- **Farbwechsel:** `refreshBlacklistedSidebar()` setzt `sidebar.style.backgroundColor`
  = grün `rgb(72 239 67 / 43%)` bei ON, rot `rgb(239 67 67 / 43%)` bei OFF.

**Betroffen:** Sidebar-Module, `createBlacklistedSidebar` neu.

---

## v5 – Getrennte Profile: Favoriten vs. Rest + Reload bei SPA-Navigation

**Problem (Bug):** Rule34 wechselt per SPA (`pushState`). `enabled` und `rules` wurden
nur EINMAL beim Laden eingelesen und in immer dieselben Keys geschrieben → nach
Wechsel Favoriten ↔ Tags galt der falsche Zustand / die falschen Regeln.

**Änderungen (im TAG-Modul):**
- Neue Helfer: `isFavProfile()` (`page=favorites`), `profileSuffix()` (`_fav`),
  `rulesKey()` = `r34th_rules_v3` + Suffix, `enabledKey()` = `r34th_enabled` + Suffix,
  `defaultEnabled()` (Favoriten starten **AUS**, Rest **AN**).
- `loadRules(key)` bekommt Key-Parameter; **Legacy-Migration (v1/v2/Cookie) nur für das
  Haupt-Profil** (`key === K.rules`), damit Favoriten keine alten Global-Regeln erben.
- `saveRules` schreibt in `rulesKey()`; `toggle` schreibt in `enabledKey()`.
- `reloadForRoute()`: vergleicht Profil-Cache (`lastProfile`), lädt bei Wechsel
  `enabled`+`rules` neu, ruft `reapply()` + `refreshBlacklistedSidebar()` und
  synchronisiert `#toggleSkip`.
- Export: `reloadForRoute`; Aufruf in `handleUrlChangeImmediate()` direkt nach
  `lastHref = newUrl.href;`.
- Edit-Rules-Titel zeigt Profil: `"Edit blacklist rules — Favorites"` / `" — Tags/Posts"`.

**Neue Storage-Keys:** `r34th_rules_v3_fav`, `r34th_enabled_fav`.

**Betroffen:** TAG-Modul (K, loadRules, saveRules, toggle, reloadForRoute, openTagsEditor), `handleUrlChangeImmediate`.

---

## v5.1 – AN/AUS-Matrix nach URL-Typ + Hard-Locks

**Ziel (Wunsch):** Feste Matrix:
`favorites&s=view&id=*` → AN · `favorites&s=view&id=5598646` → AUS ·
`post&s=view&id=*` → AUS · `post&s=list&tags=*` → AN.

**Änderungen (im TAG-Modul, ersetzt die v5-Profil-Logik für den Zustand):**
- `FAVORITES_EXEMPT_IDS = ['5598646']` (editierbare Ausnahmeliste) + `isExemptFavorite()`.
- `routeType()`: `'postview'` (`post&s=view`) | `'fav'` (alle Favoriten) | `'main'`.
- `isRouteLockedOff()` = `isExemptFavorite() || routeType()==='postview'` → **hart gesperrt**.
- `rulesSuffix()` (Regeln: 2 Profile) und `enabledSuffix()` (Zustand: 3 Typen –
  `_postview`, `_fav2`, `''`). **`_fav2` statt `_fav`:** der alte Key `r34th_enabled_fav`
  hatte Standard AUS und würde den neuen Standard AN sonst überschreiben.
- `defaultEnabled()`: postview → false, sonst true.
- `toggle()`: early return `false` bei `isRouteLockedOff()` (nicht einschaltbar).
- `reloadForRoute()`: Profil-String inkl. `':exempt'`.
- `lastProfile` initial = aktueller Routen-Typ (+ `:exempt`).

**Storage:** Favoriten-Zustand jetzt `r34th_enabled_fav2`; alter `r34th_enabled_fav` obsolet.

**Betroffen:** TAG-Modul (Profil-Helfer, toggle, reloadForRoute).

---

## v5.2 – Speichern-Fix (falsches Profil) + Sidebar auf gesperrten Routen entfernen

**Problem 1 (Bug):** Edit Rules / Import Cookie blieben bei SPA-Navigation offen;
`saveRules()` schrieb in den Key der AKTUELLEN Route → Änderungen landeten im falschen
Profil und wirkten erst nach Reload.

**Fix 1:**
- `saveRules(newRules, key)` – optionaler Ziel-Key; Modul-State nur übernehmen, wenn
  `rulesKey() === target`.
- `openTagsEditor()` / `openCookieDialog()` frieren `rulesKey()` beim Öffnen ein.
- `reloadForRoute()` schließt bei JEDEM URL-Wechsel ein offenes
  `.r34-modal-overlay` (vor dem Profil-Guard).

**Problem 2:** Auf gesperrten Routen (`post&s=view`, Ausnahme-Favorit) soll die
`#blacklisted-sidebar` nicht existieren.

**Fix 2:**
- `isRouteLockedOff` in TAG-Export aufgenommen.
- `setupSidebarIntegration()` → `tryIntegrate()`: wenn `TAG.isRouteLockedOff()`
  → vorhandene `#blacklisted-sidebar` entfernen und return; sonst create+integrate.

**Betroffen:** TAG-Modul (saveRules, openTagsEditor, openCookieDialog, reloadForRoute, Return), `setupSidebarIntegration`.

---

## v5.21 (bzw. Folgeversion nach v5.2) – Pagetual-Massen-Entfernung gefixt

> ⚠️ Versionsnummer aus der Konversation nicht eindeutig – bitte bestätigen.

**Problem (Bug):** Mit aktivem Infinite-Scroll (Pagetual) und mehreren geladenen
Seiten führte der Blacklist-Toggle dazu, dass ALLE nachgeladenen Inhalte verschwanden
und die Seite nach oben sprang; ein Reload war nötig.

**Diagnose:** `TAG.toggle()` → `reapply()` verändert massiv das Layout (viele
`display:none`). Pagetual rendert daraufhin die geladenen Seiten neu. Der Observer
verarbeitet die neu eingefügten Nodes über `processAddedNodes()` → `runAll()` →
`removeDuplicateThumbnails()`. Deren globaler `seenIds`-Cache wird nur bei
URL-Wechsel geleert (nicht beim Toggle) → jeder neu eingefügte Post gilt als
"Duplikat" und wird per `removePostContainer()` gelöscht → Inhalt weg, Höhe
kollabiert, Scroll springt nach oben.

**Fix:**
1. `removeDuplicateThumbnails` – **selbstheilender Duplikat-Check**:
   Nur entfernen, wenn das Original wirklich noch im DOM existiert:
   `const liveNode = document.getElementById(el.id); if (liveNode && liveNode !== el) toRemove.push(el);`
   → überlebt Re-Rendering, echte Duplikate werden weiter entfernt.
2. `hideEmptyThumbSpans` – Guard: Spans mit `data-r34th-hider-hidden === '1'`
   (vom Tag-Hider versteckt) nie entfernen.

**Nebeneffekt:** `reapply()` verarbeitet bereits alle `.thumb`-Elemente im Dokument
(`clearProcessedState()` + `processListPage()`), d.h. nach dem Fix werden alle
nachgeladenen Seiten SOFORT mitgefiltert; weitere Pagetual-Batches werden weiterhin
vom Observer verarbeitet.

**Betroffen:** `removeDuplicateThumbnails`, `hideEmptyThumbSpans`.

---

## v5.22 – v5.25 – ⚠️ UNBEKANNT (Platzhalter)

> Diese Versionen lagen dem Changelog-Autor NICHT vor. Bitte die Dateien
> (`[v5.22]` … `[v5.25]`) anhängen oder die Änderungen kurz nennen –
> dann werden die Einträge ergänzt.

- **v5.22:** _offen_
- **v5.23:** _offen_
- **v5.24:** _offen_
- **v5.25:** _offen_ (vom Nutzer als aktuellste Version genannt)

---

## v5.26 – Performance-Optimierung: weniger DOM-Arbeit, gleiches Verhalten

**Ziel:** Redundante Voll-Dokument-Scans und doppelte Observer-Verarbeitung entfernen,
ohne das sichtbare Verhalten zu ändern.

**Änderungen:**
- **Doppelte Observer-Initialisierung entfernt:** `TAG.initObservers()` +
  `TAG.processAll()` liefen in `init()` zweimal; der zweite Aufruf registrierte einen
  zweiten MutationObserver auf `document.documentElement`, sodass jede Mutation doppelt
  verarbeitet wurde. `initObservers()` ist jetzt idempotent (Guard `observersInitialized`);
  `runAll()` direkt darunter übernimmt die Verarbeitung.
- **`processAll()` aus dem Context-Loop:** `runAll()` rief den Voll-Dokument-Scan pro
  Context auf (bei Pagetual-Batches mit vielen Nodes = mehrfache identische Arbeit);
  jetzt läuft er einmal pro Batch. Das `dedupeContexts`-Ergebnis wird für den Haupt-Loop
  und die deferred `hideEmptyThumbSpans`-Prüfung wiederverwendet.
- **Inkrementeller Versteckt-Zähler:** Das TAG-Modul pflegt ein `Set` aller aktuell
  versteckten Elemente (`hideElement`/`restoreHiddenElements`) und exportiert
  `getHiddenCount()` (räumt verwaiste Einträge z.B. nach SPA-Navigation auf).
  `refreshBlacklistedSidebar()` zählt damit O(versteckt) statt eines Voll-Dokument-Scans.
- **Sidebar-Integration debounced:** Der `tryIntegrate`-MutationObserver in
  `setupSidebarIntegration()` läuft jetzt debounced (150 ms) + Early-Exit für bereits
  integrierte Sidebars – vorher: URL-Parse + ggf. DOM-Umbau bei JEDER Mutation.
- **Icon-Dedup:** `updateFavicon()` nutzt 4 eindeutige Konstanten
  (`ICON_POST`/`ICON_USER`/`ICON_PROFILE`/`ICON_FAVORITES`); `profile-name`/`profile-id`
  teilen denselben Daten-URI (vorher 5× je ~470 Zeichen dupliziert).

**Hinweis:** Datei minimal gewachsen (Guard + Zähler + Kommentare), Laufzeit-Arbeit
spürbar reduziert.

**Betroffen:** TAG-Modul (initObservers, hideElement, restoreHiddenElements, Export),
`runAll`, `refreshBlacklistedSidebar`, `setupSidebarIntegration`, `updateFavicon`.

---

## v5.27 – Aufräumen: toter Code entfernt + Werbe-Selektoren vereinheitlicht

**Ziel:** Toten Code aus der Standalone-Tag-Hider-Ära entfernen und die doppelt
gepflegten Werbe-Selektorlisten auf eine Quelle reduzieren.

**Änderungen:**
- **Tote CSS-Regeln entfernt:** `#r34_tag_hider_ui`, `#r34_tag_hider_ui_header` und
  `.r34-tag-action` (Styling der alten Standalone-Tag-Hider-UI, existiert nicht mehr)
  aus `GM_addStyle` gelöscht.
- **Ungenutzte Storage-Konstanten entfernt:** `K.uiVisible`, `K.uiPos`,
  `K.uiVisibleLegacy`, `K.uiPosLegacy` – nirgends mehr referenziert (Panel-Zustand
  läuft über `r34_button_visible`/`r34_button_pos` im Control-Panel).
- **Werbe-Selektoren vereinheitlicht:** `AD_SELECTORS` (direkt entfernte Stör-Container)
  und `AD_MARKERS` (Marker für die inline-flex-Prüfung) stehen jetzt zentral VOR den
  Styles; die CSS-Regel (`display:none`) und `removeAnnoyances()` erzeugen beide ihre
  Selektoren aus `AD_SELECTORS.join(', ')` statt sie doppelt zu pflegen. Ausgabe ist
  byte-identisch zur vorherigen hartkodierten CSS-Regel.

**Betroffen:** TAG-Modul (K, GM_addStyle), Styles-Block, neue Konstanten
`AD_SELECTORS`/`AD_MARKERS`, `removeAnnoyances`.

---

## Modul-Split (Entwicklungs-Infrastruktur – keine Versionsänderung)

**Ziel:** Die Einzeldatei in getrennte Module zerlegen, ohne das Laufzeit-Verhalten zu
ändern. Die gebaute Datei bleibt wie bisher Teil des Repos und wird direkt installiert.

**Änderungen:**
- `src/` mit 9 Modulen: `core.js` (Konstanten/Utils/Storage), `parser.js` (Regel-Logik),
  `tag-hider.js` (SmartSkip+), `features.js` (Thumbnails/Tweaks), `api.js` (API-Key/Restore),
  `sidebar.js`, `panel.js`, `init.js` (SPA-Maschine), `version.js` (Versionsnummer).
- `build.js` (esbuild) baut die Module zu `Rule34 Combined Scripts.js` und ÜBERSCHREIBT
  die Datei damit direkt im Projekt – die installierbare Datei wird weiterhin versioniert.
- **Automatische Versionserhöhung:** `npm run build` erhöht nach jedem erfolgreichen
  Build die Minor-Version in `src/version.js` (v5.27 → v5.28 → v5.29 …). Die
  Dateinamen-Konvention `[vX.Y]Rule34 Combined Scripts.js` entfällt damit als
  Versionsquelle – maßgeblich sind `src/version.js` + `@version` im Build.
- Tests: `test/parser.test.mjs` (26 Unit-Tests für den Regel-Parser),
  `tools/smoke-test.js` (Mock-Browser: gebautes Bundle vs. Git-Stand, inkl. `init()`),
  `tools/check-imports.mjs` (prüft Vollständigkeit aller Module-Imports).
- Der Regel-Parser ist jetzt isoliert testbar (pure Logik, kein DOM/GM nötig).
- Bekannte zirkuläre Kopplung `tag-hider.js` ↔ `sidebar.js` bleibt bewusst bestehen
  (nur Laufzeit-Zugriff, funktioniert mit dem Bundler).

**Betroffen:** Entwicklungs-Infrastruktur; `@version` wird automatisch erhöht.

---

## v5.28 – Erster Build mit neuem Workflow (keine Verhaltensänderung)

**Inhalt:** Inhaltlich identisch zu v5.27 – lediglich neu aus den `src/`-Modulen gebaut
(erster Build nach dem Modul-Split). Keine Funktions- oder Verhaltensänderungen.

**Hintergrund:**
- `npm run build` baut die Datei jetzt direkt aus `src/` und erhöht die Minor-Version
  automatisch (v5.28 → v5.29 → …).
- `npm run build -- --no-bump` (bzw. direkt `node build.js --no-bump`) baut, ohne
  die Version zu erhöhen – für lokales Testen.
- Verifiziert per Smoke-Test: gebautes Bundle verhält sich identisch zum vorherigen
  Stand (`init()` läuft, Observer/Toggle funktionieren gleich).

**Betroffen:** nur das Build-Artefakt `Rule34 Combined Scripts.js`; `@version` 5.28.

---

## v5.29 – CSS-Zentralisierung (src/css.js) + esbuild-Bundle-Stand

**Ziel:** Alle Styles an einer Stelle pflegen („auf einen Blick“) und das committete
Bundle dauerhaft auf den echten Build-Stand bringen, damit künftige Builds kleine,
lesbare Diffs erzeugen.

**Änderungen:**
- **Neu: `src/css.js` – zentrale CSS-Sammlung.** Alle Styles des Scripts als benannte
  Konstanten (`TAG_CSS`, `HEADER_CSS`, `PAGE_INDICATOR_CSS`, `BLACKLIST_CSS`,
  `PANEL_CSS`, `API_MODAL_CSS`). Jedes Feature importiert NUR seine Konstanten und
  injiziert sie per `GM_addStyle` genau dort, wo es aktiv wird (feature-gated:
  Header-Styles nur wenn der Header existiert, Panel-Styles nur im Control-Panel usw.).
- **`tag-hider.js`:** bisheriger `GM_addStyle`-Block durch `TAG_CSS`-Import ersetzt
  (Ausgabe byte-identisch verifiziert).
- **esbuild-Bundle-Stand:** Die installierbare Datei ist jetzt das echte Build-Artefakt
  (esbuild-Format). Der frühere, von Hand reformatierte Stand wurde einmalig durch den
  Build ersetzt und dieser Format-Diff committet – ab jetzt erzeugt jeder Build kleine
  Diffs, und die gebaute Datei wird nicht mehr von Hand editiert.
- **PANEL_CSS – `left`/`top`-`!important`:** Die Werte wurden in der ersten Version der
  Zentralisierung entfernt, weil sie das Drag-Handling des Panel-Buttons überschreiben
  (`r34_button_pos` und die Panel-Positionierung unter dem Button laufen über
  Inline-Styles, die gegen `!important` verlieren). Auf Wunsch des Users
  **wiederhergestellt** (feste Ausgangsposition 100px/1px) – das Drag-Handling setzt
  seine Inline-Styles jetzt aber ebenfalls mit `!important` (`setProperty`), damit der
  Button weiterhin verschiebbar bleibt und die gespeicherte Position wieder greift.

**Betroffen:** neu `src/css.js`; `tag-hider.js`, `features.js`, `panel.js`, `api.js`
(CSS-Importe); Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.29).

## v5.30 – Drei neue Features (aus der Favorites-Search-Gallery-Analyse übernommen)

**Ziel:** Drei Features aus der Analyse des "Rule34 Favorites Search Gallery"-Scripts nachbauen,
die OHNE dessen Backend-Server auskommen (reines rule34-HTML + Cookie + IndexedDB).

**Änderungen:**

1. **Blacklist auf fremden Profil-Favoriten-Seiten (TAG-Modul):**
   - Neu: `getOwnUserId()` (liest die `user_id`-Cookie), `isForeignFavoritesPage()`
     (erkennt `page=favorites&s=view&id=<andererUser>`), `getCookieBlacklistCompiled()`.
   - `processFavoritesPage()` wendet die eigene `tag_blacklist`-Cookie als zusaetzliche
     Wort-Regeln an – aber NUR auf fremden Favoriten-Seiten (rule34 markiert dort nichts als
     geblacklistet; auf der eigenen Seite uebernimmt rule34 das nativ).
   - Passende Posts werden wie Tag-Hider-Regeln versteckt (`hideElement` + Zaehler).
     Kein neuer Storage, keine neue Konfiguration.

2. **Favoriten-Marker auf Suchergebnis-Seiten (features.js):**
   - Neu: `loadFavoriteIds()` (liest den Favoriten-Cache des Rule34 Favorites Enhancers
     aus IndexedDB `R34FavDB`/`favoritesStore`/`allImagesPayload`), `getThumbPostId()`,
     `markFavoritedThumbs(ctx)`.
   - Bereits favorisierte Posts bekommen auf `page=post&s=list` einen roten Rahmen
     (box-shadow) – die IDs werden einmalig geladen und fuer alle Batches (inkl. Pagetual)
     gecacht (`data-r34-fav-marked`-Guard).
   - Neues Config-Flag `favoriteMarker` (Standard AN, Panel "Visual").

3. **Hover-Overlay mit Tag-Kategorien (neues Modul src/overlay.js):**
   - `setupThumbOverlay()`: Hover ueber einen Thumbnail laedt die Post-Seite einmalig
     (same-origin `fetch`, per Post-ID gecacht) und zeigt die Tags gruppiert nach
     Kategorie mit Farben (artist/copyright/character/metadata/deprecated/lore/general;
     general gekappt auf 12 + "+N").
   - Klick-Aktionen: Linksklick = Tag zur Suche hinzufuegen, Rechtsklick = als `-Tag`
     ausschliessen, Mittelklick = direkt suchen (Formular absenden).
   - Kategorien kommen per Post-Seiten-Scrape (`li.tag.tag-type-*`) – kein Backend noetig.
   - Neues Config-Flag `thumbOverlay` (Standard AN, Panel "Visual"); Styles zentral in
     `OVERLAY_CSS` (src/css.js).

**Betroffen:** TAG-Modul (processFavoritesPage + Helfer), features.js (markFavoritedThumbs),
neu src/overlay.js, css.js (OVERLAY_CSS), core.js (Config), panel.js (Visual), init.js;
Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.30).

## v5.31 – Eigener Infinite-Scroll (ersetzt Pagetual)

**Ziel:** Die Pagetual-Erweiterung durch einen eingebauten Infinite-Scroll ersetzen –
nachgeladene `&pid=`-Seiten per same-origin `fetch` + DOMParser, eingebettet in die
bestehende `runAll()`-Batch-Verarbeitung, mit RateLimiter und Pagetual-Hinweis.

**Änderungen:**
- **Neu: `src/infinite-scroll.js`** – `setupInfiniteScroll()`:
  - Scroll-Trigger (200 ms Throttle, 600 px vor Seitenende) laedt die naechste
    `&pid=`-Seite ((`currentPage + 1`) * 42) per same-origin `fetch` + DOMParser.
  - Die geparsten `span.thumb`-Elemente werden in `div.image-list` eingehängt –
    der bestehende MutationObserver/`runAll()` in init.js verarbeitet sie danach
    automatisch (Tag-Hider, Blacklist, Duplikat-Check, Favoriten-Marker,
    Lazy-Loading) – kein zweiter Scan noetig.
  - **RateLimiter** (1 Request gleichzeitig, 500 ms Mindestabstand) – angelehnt an
    die Favorites-Search-Gallery, damit rule34 nicht mit Requests ueberhaeuft wird.
  - **Ende-Erkennung:** leere Seite ODER nur bereits geladene Posts (rule34
    wiederholt auf `pid` > letzte Seite die letzte Seite) → "End of results".
  - **SPA-sicher:** Basis-URL wird bei jedem Scroll-Check aus `location.href`
    abgeleitet; bei Seitenwechsel (pushstate/popstate) wird der Zustand zurueckgesetzt.
  - **Pagetual-Deaktivierungs-Hinweis:** Wird Pagetual erkannt (`unsafeWindow.pagetual*`
    oder DOM-Marker `#pagetual-sideController`/`#pagetual_pageBar`/`#pagetual-preload`/
    `#pagetual-nextSwitch`/`#pagetual-picker`/`.pagetual_pageNum`), erscheint einmal
    ein Toast mit dem Hinweis, die Erweiterung zu deaktivieren (sonst laden beide parallel).
- **Config:** neues Flag `infiniteScroll` (Standard AN, Panel "Core").
- **CSS:** `INFINITE_SCROLL_CSS` in src/css.js (Statuszeile + Pagetual-Hinweis).

- **Bugfix (Hover-Overlay aus v5.30):** Der Post-Seiten-Scrape wurde robust gemacht:
  `GM.xmlHttpRequest` (gmRequest) statt `fetch` (zuverlaessiger im Userscript-Sandbox),
  Parser akzeptiert jetzt jede `#tag-sidebar`-Struktur (alle `li`, Name aus Anker,
  Kategorie aus `li`- oder Anker-Klasse, Fallback-Selektoren), Overlay zeigt sofort
  einen Lade-/Fehlerzustand statt stumm zu verschwinden, und ein Fetch-Dedup
  (inFlight-Map + `activePostId`) verhindert, dass Maus-Mikrobewegungen den Request
  abbrechen oder neu starten.
- **Bugfix (Overlay-Tags bei aktiver removeThumbTitles-Option):** Das Overlay
  liest die Tags jetzt direkt aus dem `alt`-Attribut der Thumbnails – rule34
  schreibt die Tags dorthin, waehrend das `title`-Attribut von der
  removeThumbTitles-Option entfernt wird (dort waren die Tags daher leer). Die
  Tags erscheinen sofort beim Hover (ohne Netzwerk), der Post-Seiten-Fetch
  ergaenzt sie danach nur noch um die Kategorien-Farben. Zusaetzlich wurde der
  Post-Seiten-Parser auf das echte rule34-Markup korrigiert: Die Sidebar
  enthaelt Kategorie-Header als `<li><h6>Kategorie</h6></li>` (werden jetzt
  ignoriert) und jedes Tag-LI hat zwei Anker – der erste ist der
  `?`-Wiki-Link, der zweite der Tag-Name (href mit `page=post`). Vorher
  landeten die Kategorie-Namen als Pseudo-Tags im Overlay und die echten
  Tags wurden durch den `?`-Filter verworfen.



**Betroffen:** neu `src/infinite-scroll.js`, css.js (INFINITE_SCROLL_CSS), core.js
(Config), panel.js (Core), init.js; Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.31).

---

## v5.32 – Blacklist-Storage aufgeräumt + geleerte Regeln bleiben leer (Bugfix)

**Ziel:** Den verwirrenden Storage (3 Enable- + 2 Rules- + 3 Legacy-Keys mit
kryptischen Namen) auf EINEN verständlichen Key konsolidieren und den Bug fixen,
dass geleerte Blacklist-Regeln nach einem Reload wieder auftauchten.

**Änderungen:**

1. **Bugfix – geleerte Regeln kamen zurück (TAG-Modul):**
   - Ursache: `loadRules()` fiel bei einem LEEREN Regel-Array in die
     Legacy-Migration + Cookie-Import zurück – `r34th_rules_v2`/`forbiddenTags`
     und der `tag_blacklist`-Cookie wurden bei jedem Start erneut importiert.
     Wer die Regeln leerte, hatte sie nach dem nächsten Laden wieder da.
   - Fix: Migration + Cookie-Import laufen nur noch, wenn der Rules-Key
     GAR NICHT existiert. Existiert er (auch leer), ist das eine bewusste
     Leerung des Nutzers und bleibt erhalten.

2. **Storage konsolidiert – EIN Key `r34th_config`:**
   - Vorher: `r34th_enabled`, `r34th_enabled_fav`, `r34th_enabled_fav2`
     (3 Enable-Keys), `r34th_rules_v3`, `r34th_rules_v3_fav` (2 Rules-Keys)
     plus Legacy `r34th_rules_v2`/`forbiddenTags`/`enabled`.
   - Jetzt: `r34th_config = { enabled: { main, fav }, rules: { main, fav } }` –
     ein Objekt, klar benannt (main = Suche/Listen, fav = Favoriten).
   - Einmalige Migration beim ersten Start übernimmt alle alten Werte
     (inkl. v1/v2-Legacy und Cookie-Seed) und löscht danach die alten Keys.

3. **Post-Ansicht & eigene Favoriten hart aus – jetzt auch sichtbar:**
   - `page=post&s=view&id=*` und `page=favorites&s=view&id=5598646` bleiben
     vollständig von SmartSkip+/Tag-Hider ausgenommen (Regeln greifen nicht,
     Toggle gesperrt) – alle anderen Features laufen dort normal weiter.
   - Panel zeigt auf diesen Routen den Toggle als „Locked 🔒“ (deaktiviert)
     plus Hinweistext; der Editor heißt jetzt „Tags“ statt „Tags/Posts“
     (Post-Ansicht hat keine Regeln), Favoriten-Editor bleibt „Favorites“.
   - Auf gesperrten Routen wird kein View-Observer mehr aufgebaut.

**Betroffen:** TAG-Modul (Storage, loadRules/saveRules, toggle, reloadForRoute,
openTagsEditor, openCookieDialog, initObservers), panel.js (Sperr-Hinweis),
build.js (@grant GM_deleteValue); Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.32).

---

## v5.33 – ESLint eingeführt + Lint-Fixes

**Ziel:** Statische Code-Analyse (eslint:recommended + `eqeqeq`) einführen und
alle 23 gemeldeten Funde beheben – keine Verhaltensänderung, nur striktere
Vergleiche und sauberere Catch-Blöcke.

**Änderungen (Entwicklungs-Infrastruktur):**
- **Neu: `eslint.config.mjs`** (Flat Config, ESLint 10) – `eslint:recommended`
  + `eqeqeq: ['error', 'always']`. Getrennte Globals: Browser + Userscript
  (`GM*`, `unsafeWindow`) für `src/`, Node für `build.js`/`tools`/`test`. Das
  gebaute Bundle ist vom Lint ausgenommen.
- **Neu: `npm run lint`**; devDependencies `eslint`, `@eslint/js`, `globals`.

**Lint-Fixes:**
- **`eqeqeq` (parser.js):** die beiden `== null`-Prüfungen bewusst NICHT zu
  `=== null` umgeschrieben (das hätte `undefined` nicht mehr abgefangen),
  sondern semantisch äquivalent auf `?? ''`.
- **`no-unused-vars` / `no-empty`:** alle unbenutzten `catch (e)` → optionale
  Catch-Bindings (`catch { … }`); der leere `catch (e) {}` in `features.js`
  (`updateFavicon`) → `catch { /* ignore */ }`. Betroffen: `tag-hider.js`,
  `features.js`, `api.js`, `overlay.js`, `infinite-scroll.js`,
  `tools/smoke-test.js`.
- Verifiziert: `npm run lint` Exit 0, alle Tests grün (Parser 26, Smoke,
  Imports).

**Betroffen:** Entwicklungs-Infrastruktur (ESLint) + Lint-Fixes in `src/`;
Build-Artefakt `Rule34 Combined Scripts.js` neu gebaut (@version 5.33).

---

## v5.34 – Overlay-Umbau, Tag-Hider-Fallback, Parser-Extraktion, Infinite-Scroll-Preloading + Favoriten

**Ziel:** Das Hover-Overlay bedienbarer machen (Overlay bleibt offen, Uploader sichtbar), den Tag-Hider unabhängig von `removeThumbTitles` machen, den Post-Seiten-Parser isoliert testbar machen und den Infinite-Scroll um Preloading + Favoriten-Seiten erweitern.

**Änderungen:**

1. **Overlay-Umbau (overlay.js + css.js):**
   - Linksklick fügt den Tag hinzu, schließt das Overlay aber NICHT mehr.
   - Rechtsklick (`contextmenu`) hängt den Tag als `-Tag` an (Ausschluss) und unterdrückt das Browser-Kontextmenü (`preventDefault`) – Overlay bleibt offen.
   - Mittelklick (`auxclick`) setzt den Tag ins Suchfeld und sendet das Formular direkt ab; ein `mousedown`-Guard unterdrückt das Mittelklick-Autoscroll.
   - Der Overlay-Kopf zeigt neben der Post-ID jetzt den Uploader als roten Klick-Link (`by <user>` → Profil in neuem Tab), geparst aus `#stats` („Posted … by“-Link mit `page=account&s=profile&uname=…`).

2. **Tag-Hider-Fallback (tag-hider.js):** `getThumbTags` liest die Tags jetzt aus `media.title || media.alt` – funktioniert damit auch bei aktivem `removeThumbTitles` (das `title` entfernt).

3. **Post-Seiten-Parser extrahiert (neu src/overlay-parser.js):** `extractSidebarTags(doc)` + `extractUploader(doc)` als pure Funktionen (+ `CATEGORY_COLORS`/`CATEGORY_ORDER`), ohne DOM-Globals am Modul-Load; `overlay.js` nutzt sie. Neuer Unit-Test `test/overlay-parser.test.mjs` (12 Fälle, echte rule34-Sidebar-Fixture via linkedom) – npm-Script `test:overlay`, neue Dev-Dependency `linkedom`.

4. **Infinite-Scroll (infinite-scroll.js):**
   - **Preloading:** die nächste Seite wird ab 2200px vor Seitenende im Hintergrund vorgeladen (`state.prefetched`); `loadMore` nutzt den Cache und lädt danach die übernächste Seite vor – flüssigeres Scrollen.
   - **Favoriten-Seiten:** `page=favorites&s=view` ist jetzt scrollbar (50/Seite); `parseFavoritesScripts()` parst die `posts[id]`-Scripts aus der Antwort in `window.__r34thFavCache`, damit der Tag-Hider die nachgeladenen Thumbs filtern kann.

**Betroffen:** overlay.js, css.js (OVERLAY_CSS), tag-hider.js, neu src/overlay-parser.js + test/overlay-parser.test.mjs, infinite-scroll.js, package.json (test:overlay, linkedom); Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.34).

---

## v5.36 – Seiten-Indikator zählt mit dem Infinite-Scroll mit + Pause-Toggle

**Ziel:** Beim Scrollen immer wissen, auf welcher Seite man ist (wie bei Pagetual): Der Seiten-Indikator (unten rechts) zeigt „Page X / Y“, zählt bei jedem nachgeladenen Block hoch und kann den Infinite-Scroll per Klick pausieren.

**Änderungen:**

1. **Indikator × Infinite-Scroll gekoppelt (features.js + infinite-scroll.js):** Der Indikator las seine Seitenzahl bisher aus dem `pid`-URL-Parameter bzw. `#paginator` – beides ändert sich beim Nachladen nicht. `infinite-scroll.js` meldet nach jedem erfolgreichen `loadMore` per Custom-Event `r34th:inf-state` die neue 1-basierte Seitenzahl; `updatePageIndicator` übernimmt sie und zeigt z. B. „Page 2 / 1552“, „Page 3 / 1552“, … Bei echter Navigation (neue `pid` im URL) hat die URL wieder Vorrang.

2. **Indikator wieder auf der Haupt-Galerie sichtbar (features.js):** Bisher wurde `#page-indicator` auf `page=post&s=list&tags=all` (die Haupt-Galerie) ausgeblendet – genau dort, wo der Infinite-Scroll am meisten genutzt wird. Die Ausblendung gilt jetzt nur noch auf Post-Ansichtsseiten.

3. **Pause-Toggle (features.js + infinite-scroll.js + css.js):** Linksklick auf den Pill pausiert den Infinite-Scroll – es werden keine neuen Seiten mehr geladen, und die Anzeige wechselt von „Page 1 / 1552“ auf „Page 1 = 1552“. Erneuter Klick entpausiert („/“ zurück) und prüft sofort die Scroll-Position, damit direkt weiter geladen wird. Bei Seitenwechsel wird die Pause automatisch aufgehoben; ein bereits laufender Request wird noch fertig geladen.

**Betroffen:** features.js (updatePageIndicator), infinite-scroll.js, css.js (PAGE_INDICATOR_CSS), tools/smoke-test.js (Mock: `window.dispatchEvent`); Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.36).

---

## v5.37 – Bugfix: Falsches „— End of results —“ bei Bot-Schutz-/Challenge-Seiten

**Problem (Bug):** Der Infinite-Scroll meldete nach einiger Zeit „— End of results —“, obwohl noch weitere Seiten existierten (z. B. „Page 53 / 2396“ mit ungeladenen Seiten).

**Diagnose:** rule34 blockt Request-Bursts gelegentlich mit Bot-Schutz/Challenge-Seiten, die mit **HTTP 200** ausgeliefert werden (Cloudflare-Challenge). Solche Antworten enthalten kein Listen-Markup (kein `div.image-list`/`#paginator`/`span.thumb`), sahen für die bisherige Ende-Erkennung aber genauso aus wie eine leere letzte Seite → falsches „Ende“, das bis zum Seitenwechsel hängen blieb.

**Fix (infinite-scroll.js):**
- `parseThumbs()` liefert jetzt zusätzlich `isList` – true nur, wenn die Antwort echtes Listen-Markup enthält (`div.image-list, #paginator, span.thumb`; gilt für Such- UND Favoriten-Seiten).
- `loadMore()` behandelt eine Antwort ohne Listen-Markup NICHT mehr als Ende, sondern wirft einen Fehler → normale Retry-Pfad-Statuszeile („⚠️ Load failed – scroll to retry“), der nächste Scroll versucht es erneut.
- Echte End-Erkennung (leere Seite oder nur bereits geladene Posts) bleibt unverändert.

**Betroffen:** src/infinite-scroll.js; Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.37).

---

## v5.38 – Automatischer Retry mit Backoff + Unit-Tests für die Ende-/Retry-Erkennung

**Ziel:** Nach einer Challenge-/Fehlerseite soll der Infinite-Scroll von selbst weitermachen (statt auf den nächsten Scroll zu warten) und die Ende-/Retry-Erkennung dauerhaft per Unit-Test abgesichert sein.

**Änderungen:**

1. **Automatischer Retry mit Backoff (infinite-scroll.js):** Schlägt eine geladene Seite fehl (Challenge, Bot-Schutz, Netzwerkfehler), versucht `loadMore()` jetzt bis zu **3 Mal** mit wachsendem Abstand (1000 / 2000 / 4000 ms, exponentiell: `backoffDelay(attempt)`), statt auf den nächsten Scroll-Event zu warten. Die Statuszeile zeigt „⚠️ Challenge – Retry in Xs…“. Nach dem letzten Versuch greift der weiche Fallback „⚠️ Load failed – scroll to retry“ – kein Endlos-Loop, der den Bot-Schutz weiter füttert.
   - Der Retry-Zähler wird bei jedem Erfolg und bei echtem Ende zurückgesetzt; Pause-Toggle und Seitenwechsel räumen einen laufenden Retry-Timer auf.
   - Scroll-Check und Preloading sind während eines laufenden Retrys gesperrt (kein Doppel-Fetch derselben Seite).

2. **Testbare Kernlogik extrahiert (infinite-scroll.js):** `parseThumbs()` und die neue pure Funktion `classifyLoadResult({ thumbs, isList, existingIds, newIds })` (→ `'retry'` / `'end'` / `'append'`) sind jetzt exportiert und unit-testbar; `loadMore()` nutzt sie.

3. **Neu: `test/infinite-scroll.test.mjs` (18 Tests, linkedom)** – Fixtures für echte Liste, leere letzte Seite, Duplikat-Seite (rule34 wiederholt die letzte Seite) und Challenge-Seite ohne Listen-Markup; sichert genau den v5.37-Bug ab („Challenge mit 0 Thumbs → retry, NICHT end“). Neues npm-Script `test:infinite`.

**Betroffen:** src/infinite-scroll.js, neu test/infinite-scroll.test.mjs, package.json (test:infinite); Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.38).

---

## v5.39 – webm/mp4/gif-Thumb-Hider in die Blacklist integriert

**Ziel:** Das Standalone-Script „[v0.2] rule34 - webm-Thumbs hider“ (Anim-Thumbs
wegblenden) läuft nicht mehr separat, sondern arbeitet jetzt wie die Tag-Regeln:
`Blacklist ON🟢` blendet webm/mp4/gif-Thumbs mit aus, `Blacklist OFF🔴` zeigt sie
wieder normal an. Für Ausnahmen gibt es eine Checkbox im „Edit blacklist rules“-Overlay.

**Änderungen:**

1. **Webm-Thumbs als Teil der Blacklist (tag-hider.js):**
   - `hideWebmThumb()` versteckt jedes `span.thumb` mit `img.webm-thumb` – über
     `hideElement()` (display:none + `data-r34th-hider-hidden="1"`), **nicht** per
     `.remove()`: nur so sind Toggle und Ausnahme-Checkbox verlustfrei umkehrbar
     (das alte Script hat die Elemente endgültig aus dem DOM entfernt).
   - Eingehängt in `processListPage()` und `processFavoritesPage()` – bewusst **vor**
     der Tag-Prüfung, weil Anim-Thumbs nicht immer verwertbare Tags in `alt`/`title`
     haben und sonst per `continue` übersprungen würden. Damit greift die Regel auch
     für nachgeladene Seiten (Infinite-Scroll / Pagetual).
   - Auf Favoriten-Seiten wird – wie bei den Tag-Regeln – der äußere
     Wrapper-`<span>` ausgeblendet, damit keine Lücke im Grid bleibt.
   - Die Thumbs zählen damit auch in `#blacklist-count` der Sidebar mit.

2. **Frühes CSS gegen den Lazy-Load-Flash (css.js + tag-hider.js):**
   - Neuer Export `WEBM_HIDE_CSS` (`span.thumb:has(img.webm-thumb)` +
     `img.webm-thumb` mit `display:none!important`) in einem eigenen
     `<style id="r34th-webm-hide">`. Ganz wie im alten Script verhindert das den
     Flash, bevor das Lazy-Image geladen ist.
   - Der Style wird nur befüllt, solange `shouldHideWebm()` true ist – beim
     Abschalten wird `textContent` geleert (ein dauerhaft injiziertes
     `!important` wäre sonst nicht rückgängig zu machen).
   - `reapply()` synchronisiert das CSS **vor** `restoreHiddenElements()`, damit
     wiederhergestellte Thumbs nicht im `!important` hängen bleiben.

3. **Ausnahme-Checkbox im Regeln-Overlay:**
   - `openTagsEditor()` bekommt `#r34th-show-webm` („Show webm/mp4/gif thumbnails
     even while the blacklist is active“). Haken = Thumbs bleiben sichtbar.
   - Gespeichert wird beim Save-Button im **eingefrorenen** Profil
     (`setShowWebmFor(prof, …)`), damit die Ausnahme bei SPA-Navigation nicht im
     falschen Profil landet.

4. **Storage:** `r34th_config` um `showWebm: { main, fav }` erweitert (pro Profil,
   wie `enabled`/`rules`). Bestandsconfigs ohne den Zweig bekommen beim Laden
   automatisch `{ main: false, fav: false }` – d.h. nach dem Update werden
   webm-Thumbs mitversteckt (Haken aus), was dem bisherigen Stand des
   Standalone-Scripts entspricht.

5. **Tests:** neu `test/tag-hider-webm.test.mjs` (40 Tests, linkedom) – prüft
   Standard-Verstecken, Toggle AUS/EIN, Ausnahme aus dem Storage, Checkbox im
   Overlay (Speichern + Wieder-Entfernen), Favoriten-Wrapper, Profil-Trennung und
   die Migration von Bestandsconfigs. Neues npm-Script `test:webm`.

**Betroffen:** src/tag-hider.js (Storage, hideWebmThumb, reapply, openTagsEditor),
src/css.js (WEBM_HIDE_CSS, Checkbox-Styles), neu test/tag-hider-webm.test.mjs,
package.json (test:webm); Build-Artefakt `Rule34 Combined Scripts.js` (@version 5.39).

---

## Häufige Befehle (Entwicklung)

Kurzreferenz für den täglichen Workflow – alle Befehle im Projektordner `Rule34 Combined Scripts/`:

| Befehl | Wirkung |
|---|---|
| `npm install` | einmalig – holt esbuild + ESLint + linkedom (Dev-Dependencies) |
| `npm run build` | baut `Rule34 Combined Scripts.js` aus `src/` und erhöht die Minor-Version (v5.28 → v5.29) |
| `npm run build -- --no-bump` | baut, ohne die Version zu erhöhen (lokales Testen) |
| `node build.js --watch` | baut einmal, dann bei jeder Änderung unter `src/` automatisch neu (Bump nur beim ersten Build) |
| `node build.js --help` | zeigt Hilfe zu allen Optionen |
| `npm run test:parser` | 26 Unit-Tests für den Regel-Parser (ohne DOM/GM) |
| `npm run test:overlay` | 12 Unit-Tests für den Post-Seiten-Parser (linkedom) |
| `npm run test:infinite` | 26 Unit-Tests für die Ende-/Retry-Erkennung und die eingehängten Knoten des Infinite-Scrolls (linkedom) |
| `npm run test:webm` | 40 Unit-Tests für die webm-Thumb-Integration in die Blacklist (linkedom) |
| `npm run test:smoke` | Mock-Browser-Test: gebautes Bundle vs. Git-Stand |
| `npm run test:imports` | prüft, ob alle Module-Imports vollständig sind |
| `npm run lint` | ESLint – eslint:recommended + eqeqeq |

**Beispiele:**

```bash
npm run build                            # Release: bauen + Version 5.28 → 5.29
npm run build -- --no-bump               # nur bauen, Version bleibt unverändert
node build.js --watch                    # während der Entwicklung offen lassen
npm run test:parser && npm run test:overlay && npm run test:infinite && npm run test:webm && npm run test:smoke && npm run test:imports   # alles testen
```

**Hinweis:** Bei `npm run` müssen Argumente hinter `--` stehen (`npm run build -- --no-bump`),
sonst interpretiert npm sie als eigene Optionen. Direkt mit `node build.js --no-bump` entfällt das.

---

## Anhang A – Storage-Keys Übersicht

| Key | Typ | Bedeutung | Seit |
|---|---|---|---|
| `r34th_config` | GM | **EIN Key für alles:** `{ enabled: { main, fav }, rules: { main, fav }, showWebm: { main, fav } }` | v5.32 / v5.39 |
| `r34th_rules_v3`, `r34th_rules_v3_fav`, `r34th_enabled`, `r34th_enabled_fav`, `r34th_enabled_fav2`, `r34th_enabled_postview` | GM | **alte Keys** – bei der v5.32-Migration nach `r34th_config` überführt und gelöscht | Basis–v5.1 |
| `forbiddenTags`, `r34th_rules_v2`, `enabled` | GM | Legacy – nur Migration (Haupt-Profil), wird gelöscht | Basis |
| `r34_button_visible` | LS | Panel sichtbar? | Basis |
| `r34_button_pos` | LS | Panel-Position | Basis |
| `r34_header_fixed` | LS | Header angepinnt? | Basis |
| `r34_feature_flags` | LS | Feature-Flags (CONFIG) | Basis |
| `r34_api_key`, `r34_user_id` | LS | API-Zugang | Basis |

(GM = GM_setValue/GM_getValue · LS = localStorage)

## Anhang B – Wichtige Konstanten & Attribute

- `FAVORITES_EXEMPT_IDS = ['5598646']` – Favoriten-IDs, auf denen SmartSkip hart aus ist (v5.1).
- `HIDDEN_ATTR = 'r34thHiderHidden'` → `data-r34th-hider-hidden="1"` (vom Tag-Hider versteckt).
- `PROCESSED_ATTR`, `PARSED_SCRIPT_ATTR`, `PARSED_SIGNATURE_ATTR` – Verarbeitungs-Guards.
- `WEBM_IMG_SELECTOR = 'img.webm-thumb'` + `<style id="r34th-webm-hide">` – webm/mp4/gif-Thumbs, an die Blacklist gekoppelt (v5.39).
- `r34thSmartSkip` – Guard auf `#blacklisted-sidebar` (1x integrieren).
- Sidebar-Farben: ON `rgb(72 239 67 / 43%)`, OFF `rgb(239 67 67 / 43%)`.