# CHANGELOG – Rule34 Image Board Enhancer

> Userscript für https://rule34.xxx – passt Bilder/Videos an die Fenstergröße an,
> scrollt zum Inhalt, bietet Favorite-Tags-Panels mit Header-Farb-Validierung und
> einen robusten Such-Input-Observer (Titel grün/rot je nach Übereinstimmung).

## ⚠️ WICHTIG FÜR KI-AGENTEN (bitte zuerst lesen)

1. **Versionsquelle:** Die Versionsnummer steht zentral in `src/version.js` und wird
   vom Build in `@version` übernommen. `npm run build` erhöht nach jedem erfolgreichen
   Build automatisch die LETZTE Versionskomponente (v2.0.5 → v2.0.6 → …); `--no-bump`
   baut, ohne zu erhöhen. Committete Konvention: Bundle-`@version` == version.js →
   nach `npm run build` einmal `npm run build -- --no-bump` nachbauen.
2. **Skript-Architektur (Kontext für jede Version):**
   - `init.js` = Entry-Modul: lädt Einstellungen (`loadSettings`), ruft `init()`
     in derselben Reihenfolge wie das Original + document-Listener (input/capture-click).
   - `core.js` = Site-Erkennung, gemeinsames `state`-Objekt (Selektoren, Keyboard-Flag),
     pure Helfer (`getBaseTag`, `parseTagsString`, `computeFit` – testbar) + `debounce`/`addGlobalStyle`.
   - `settings.js` = zentrale Einstellungen (GM-Storage, ersetzt die top-level `await GM.getValue`).
   - `media.js` = Resize/Autoplay/Scroll für Bild & Video (Fenster-/Content-Proportionen modul-lokal).
   - `favorite-tags.js` = BEIDE Favorite-Tags-Panels (main + USER) als EINE parametrisierte
     Komponente (`createFavoriteTagsPanel(kind)`) – das Original hatte ~90 % Duplikate.
   - `title-colors.js` = Header-Farb-Validierung + Input-Observer (MutationObserver +
     value-Setter-Interception + Shadow-Root-Fallback) + `addTagToInputWithReplace`; pure
     Helfer `parseSearchTokens`/`tokenMatchesDb` (testbar).
   - `toolbar.js` = Toolbar `#ibenhancer` + Settings-Modal (Save/Hide/Shortcut-Erfassung).
   - `sites.js` = Site-Konfiguration (rule34-Sonderfall + Custom-Sites-Setup/Delete).
   - `css.js` = zentrale CSS-Sammlung (MAIN_CSS, FAVORITE_TAGS_CSS, FAVORITE_TAGS_USER_CSS).
3. **Storage:** Alle Einstellungen in `GM.setValue/GM.getValue` (Keys = Variablennamen,
   siehe `DEFAULT_SETTINGS` in `settings.js`).

---

## v2.0.7 – Bugfix-Runde: die fünf bekannten Schwachstellen

**Ziel:** Die im v2.0.5-Abschnitt dokumentierten Schwachstellen beheben – jeweils
mit gezielter Verhaltensänderung genau dort, wo das Original fehlerhaft war.

1. **Titel-Farben unabhängig (title-colors.js):** `updateTitleColors()` brach ab,
   sobald nur EIN Titel-Element existierte (z. B. wenn das USER-Panel nicht
   gezeichnet ist) – dann wurde KEIN Titel mehr gefärbt. Jetzt wird jedes
   vorhandene Titel-Element einzeln gefärbt (main nach `favoriteTags`, user nach
   `favoriteTagsUSER`); der Early-Return greift nur noch, wenn gar kein Titel da ist.
2. **Inline-onclick ersetzt (favorite-tags.js + init.js):** Der −-Link der
   Favorite-Tag-Listen baute `onclick="… ' -${displayTag}' …"` mit unescaped
   Tag-Text (Attribut-Breakout bei Apostroph möglich). Jetzt nutzt er wie der
   +-Link ein data-Attribut (`data-minus-tag`, escaped über den neuen Helfer
   `escapeAttr` in core.js); der zentrale Click-Handler in init.js hängt den Tag
   mit `e.preventDefault()` an – gleiches Anfüge-Verhalten (" -tag"), ohne JS im HTML.
3. **Debounce-Fehlgebrauch (init.js):** Der input-Listener erzeugte pro Event eine
   NEUE Debounce-Closure (`debounce(updateTitleColors, 300)()` – kein Coalescing).
   Jetzt EINE geteilte Instanz (`debouncedTitleUpdate`), die wiederverwendet wird.
4. **isTyping-Guard (media.js):** `keyboardShortcuts()` prüft jetzt via neuem
   `isTyping()`-Helfer (core.js, wie im Combined Scripts), ob der Fokus in einem
   Eingabefeld liegt – `[`/`]` feuern beim Tippen im Suchfeld nicht mehr.
5. **Fehlende Settings-Schalter (toolbar.js):** Neue Checkboxen für
   `updateWithWindowResize`, `updateScrollOnWindowResize`, `showFavoriteTagsUSER`
   (draw), `showFitButton`, `showScrollButton` – jetzt über das Modal änderbar,
   persistiert in `saveSettings()`, zurückgesetzt in `hideSettings()`.

**Tests:** Parser-Tests für `escapeAttr`, `getTagsHtml` (kein `onclick` mehr,
Apostroph-Fall, Metadaten-Sortierung) und `debounce`-Coalescing; Smoke-Tests für
Single-Panel-Titel-Farben (Fix 1), isTyping-Guard (Fix 4, inkl. Fit-Berechnung
800x800), data-minus-tag-Klick (Fix 2) und die neuen Settings-Checkboxen inkl.
saveSettings-Persistenz (Fix 5).

**Betroffen:** core.js, title-colors.js, favorite-tags.js, init.js, media.js,
toolbar.js; @version 2.0.7.

## v2.0.10 – Sicherheits-Härtung der Ausgangsbasis (7 Befunde)

**Ziel:** Statische Review des Modul-Splits. Der v2.0.5-Abschnitt listete die
„bekannten Schwachstellen“ des Originals — die v2.0.7–2.0.9-Runden haben die
dort genannten abgearbeitet. Diese Runde behandelt das, was dabei übrig blieb
bzw. neu hinzukam: ein ungesicherter Rendering-Pfad, eine halb implementierte
Konfiguration und drei Robustheits-Bugs.

**Sicherheit:**
1. **Tag-SUCH-Link war unescapt (favorite-tags.js):** `getTagsHtml()` escapte seit
   v2.0.7 die `+`/`−`-Links über `escapeAttr` — der **dritte Link (Tag-Suche) blieb
   aber ungefiltert**, sowohl im `href` als auch im Textinhalt. Ein Tag wie
   `a" onmouseover="alert(1)` brach aus dem `href`-Attribut aus, `<img src=x
   onerror=…>` wurde als HTML injiziert. Betroffen war jede gespeicherte
   Favorite-Tag-Liste (eigener Storage, aber auch importierbar/geteilt). Fix:
   `escapeAttr()` für den href, neuer Helfer `escapeHtml()` für den Textknoten.
2. **JSON.parse ohne try/catch (sites.js):** Ungültiges JSON im Setup-Prompt warf
   einen ungehandelten `SyntaxError` und brach `init()` ab, statt
   „Config not valid.“ zu zeigen. Arrays/Primitive werden jetzt abgewiesen,
   `prompt`-Cancel (`null`) führt zu keinem Alert.
3. **NaN-Lautstärke brach das Init (toolbar.js):** `parseFloat('')` ergab `NaN`,
   das persistiert wurde — beim nächsten Laden warf `video.volume = NaN` in
   `enhanceContent()` einen `TypeError` und riss das halbe Script mit. `saveSettings()`
   klemmt jetzt auf `[0,1]` und fällt bei ungültiger Eingabe auf den gespeicherten Wert zurück.

**Korrektheit:**
4. **Custom-Site-Config wurde ignoriert (sites.js):** `configureSites()` las von der
   gespeicherten Config nur `toolbarDOM`. Der Setup-Prompt fragt aber
   `containerDOM`/`imageDOM`/`thumbnailDOM` mit ab — sie wurden nie in `state`
   übernommen. Auf jedem Board außer rule34.xxx blieb damit garantiert der
   Default-Selektor stehen und das Bild wurde nie gefunden, während die
   gespeicherte Config den Eindruck eines wirkungslosen Setups machte. Jetzt
   werden alle fünf Felder (inkl. `playerDOM`) übernommen.
5. **Site-Erkennung ersetzte `www.` anywhere (core.js):** `.replace('www.', '')`
   ohne Anker traf das erste Vorkommen im gesamten Hostnamen: `notwww.example.com`
   → `notexample.com`. Da der Hostname der Storage-Key für Favoriten-Tags und
   Custom-Sites ist, landeten die Daten unter einem fremden Key und waren
   danach nicht mehr auffindbar. Jetzt `/^www\./`.
6. **Sichtbarkeits-Check `offsetParent` (media.js):** `offsetParent` ist auch für
   `position:fixed`-Elemente `null`. Eine fixed/modal-artig gelagerte Sidebar
   wurde dadurch als unsichtbar gewertet, ihre Breite **nicht** abgezogen und das
   Bild entsprechend zu groß gefittet. Jetzt `getClientRects().length > 0`
   (leer genau bei `display:none`/Größe 0). Zusätzlich NaN-Guard: `parseFloat('auto')`
   bei Margen vergiftete `currentWindowWidth` für den Rest der Sitzung.
7. **Mehrzeilige Favorite-Liste (favorite-tags.js):** `renderList()` splittete mit
   `split(' ')` — die Liste stammt aber aus einem mehrzeiligen Textarea, Zeilenumbrüche
   und Tabs wurden zu *einem* Tag mit eingebettetem Whitespace verschmolzen
   (`mergeTagsIntoList` nutzte schon korrekt `/\s+/`). Vereinheitlicht.

**Aufräumarbeiten:**
- **Toter Code (title-colors.js):** `lastSeenInputs.clear && lastSeenInputs.clear()` —
  `WeakMap` hat keine `clear()`-Methode; der Aufruf konnte nie laufen und ist
  ersatzlos (Einträge verschwinden ohnehin mit den Elementen).
- **17 sequentielle `await GM.getValue(...)` (settings.js):** Summe aller
  Storage-Latenzen blockierte den Start von `init()` bei jedem Seitenaufruf.
  Jetzt ein `Promise.all` über `Object.keys(DEFAULT_SETTINGS)` — langsamste Latenz
  statt Summe, und die Zuweisungen leiten sich automatisch von `DEFAULT_SETTINGS` ab
  (kein Auseinanderlaufen mehr).

**Tests:** 83 Unit-Tests (+12): `escapeHtml` (4) und die XSS-Regression am
Tag-Link (7, inkl. Präzisionsprüfung des Text-Knotens und `&`-Escaping-Reihenfolge).
12 Smoke-Flows (+3): Custom-Site-Selektoren (mit Board, auf dem die Defaults
nicht matchen), Video-Volume (NaN/Klemmung) und `position:fixed`-Sidebar-Fit.
Alle drei neuen Smoke-Flows sind mutationsgeprüft: mit zurückgedrehtem Fix
schlagen sie fehl.

**Betroffen:** core.js, favorite-tags.js, sites.js, toolbar.js, media.js,
title-colors.js, settings.js; @version 2.0.10.

## v2.0.9 – Pair-Dedup auch für die „+“-Links in den Such-Input

**Ziel:** Das reihenfolge-egal-Pair-Matching aus v2.0.8 (Favoriten-Speichern) auch auf die
„+“-Links anwenden, die Tags aus den Favorite-Tag-Listen in den Such-Input übernehmen.

**Änderung (title-colors.js):** `addTagToInputWithReplace` nutzt jetzt die neue pure
Funktion `replaceTagInParsedList` (unit-getestet): Enthält der Such-Input bereits ein Paar
mit denselben Mitgliedern – unabhängig von der Reihenfolge, `( TAG1 ~ TAG2 )` ==
`( TAG2 ~ TAG1 )`, `( a ~ b ~ c )` == `( c ~ a ~ b )` – wird es an gleicher Position durch
das geklickte Paar ersetzt statt doppelt angehängt. Ein bereits identisch (kanonisch)
enthaltenes Paar bleibt wie bisher unangetastet; einfache Tags mit gleicher Basis werden
weiterhin ersetzt, ohne Match wird angehängt.

**Beispiel:** Input enthält `( user:kaistar_ ~ kaistar )` und der „+“-Link von
`( kaistar ~ user:kaistar_ )` wird geklickt → Input ist danach genau `( kaistar ~ user:kaistar_ )`,
nicht beide Paare.

**Tests:** 7 Parser-Tests für `replaceTagInParsedList` (andere/identische Reihenfolge,
3er-Pair, Basis-Ersetzung, Anhängen); Smoke-Flow „Pair-Input“ (Ersetzen, leerer Input,
Basis-Ersetzung über den echten Click-Handler).

**Betroffen:** title-colors.js; @version 2.0.9.

## v2.0.8 – Media-Fit-Robustheit, Video-Metadaten & Pair-Tag-Dedup

**Ziel:** Die auf der v2.0.7-Agenda festgehaltenen Härtungen umsetzen (dieser Abschnitt
ersetzt den Agenda-Block) plus Pair-Tag-Dedup beim Speichern von Favorite Tags.

**Änderungen:**
- **Aspect-Guard (core.js/media.js):** `computeFit` gibt bei unbekannten/ungültigen
  Proportionen (Aspect 0/NaN – z. B. Medium noch nicht geladen) `null` zurück und
  `applyResize` bricht ab – vorher Division durch 0 → `height = Infinity`.
- **Media-Fit ohne Event (media.js):** `enhanceContent` prüft jetzt, ob ein Medium
  bereits geladen ist – `img.complete && naturalWidth > 0` bzw. `video.readyState >= 1`
  – und rechnet dann sofort, statt auf ein evtl. schon gefeuertes `load`/
  `loadedmetadata`-Event zu warten (z. B. bei gecachtem Medium: vorher nie ein Resize).
- **Video-Metadaten (media.js):** `preload="metadata"` gesetzt; der Metadaten-Handler
  ist eine benannte Funktion mit readyState-Fallback; Play wird erst nach den
  Metadaten gestartet statt sofort (vermeidet abgebrochene Play-Requests).
- **Pair-Tag-Dedup (core.js/favorite-tags.js):** Beim „aktuelle Suche zu Favoriten
  hinzufügen“ („+“) werden Pair-Tags reihenfolge-egal verglichen:
  `( TAG1 ~ TAG2 )` == `( TAG2 ~ TAG1 )`, `( a ~ b ~ c )` == `( c ~ a ~ b )`. Ist ein
  Paar mit denselben Mitgliedern bereits gespeichert, wird es an gleicher Position
  durch das neue Paar ersetzt statt doppelt angehängt. Neue pure Helfer `getPairSet`
  und `mergeTagsIntoList` (unit-getestet).

**Tests:** Parser-Tests für `getPairSet`, `mergeTagsIntoList` (Ersetzen/Umsortieren/
Anhängen) und den Aspect-Guard (`computeFit` → null); Smoke-Tests für Video
(readyState≥1 → Sofort-Fit; readyState=0 → Guard + loadedmetadata-Flow), Bild
(complete → Sofort-Fit) und Pair-Dedup über die UI (umgekehrtes Paar ersetzt,
identisches bleibt, anderes wird angehängt).

**Nicht enthalten (geprüft & verworfen, aus der Agenda):** isTyping-Guard für den
Sidebar-Toggle-Listener (toter Code – Klick- statt Fokus-Pfad), renderFavoriteTags-
Kollision (existiert nicht – eine lokale `renderList()`), applyResize bei gleichen
Seitenverhältnissen (kein Bug – Else-Zweig rechnet korrekt).

**Betroffen:** core.js, media.js, favorite-tags.js; @version 2.0.8.

## v2.0.6 – Modul-Split (Entwicklungs-Infrastruktur, keine Verhaltensänderung)

**Ziel:** Die Einzeldatei in getrennte Module zerlegen, ohne das Laufzeit-Verhalten zu
ändern (gleiches Muster wie v4.16 des Favorites Enhancers / v5.27 des Combined Scripts).
Die gebaute Datei bleibt wie bisher Teil des Repos und wird direkt installiert.

**Änderungen:**
- `src/` mit 9 Modulen + `version.js` (Aufteilung siehe oben). Der gesamte modul-
  übergreifende Zustand liegt im `state`-Objekt (core.js) bzw. `settings`-Objekt
  (settings.js) – gleiche Datenstände wie die Closure-Variablen der Einzeldatei.
- **Duplikat-Code eliminiert:** `addFavoriteTags()`/`addFavoriteTagsUSER()` und
  `getTagsHtml()`/`getTagsHtmlUSER()` (~90 % identisch) → eine parametrisierte
  Komponente `createFavoriteTagsPanel(kind)` + `getTagsHtml(kind, tags)`. Die 17
  top-level `await GM.getValue(...)`-Aufrufe → `loadSettings()`.
- `build.js` (esbuild) baut die Module zu `Rule34 Image Board Enhancer.js` und
  überschreibt die Datei direkt im Projekt. Banner-Metadaten (`@name`, `@namespace`,
  `@match`, `@grant`, `@run-at document-body`, `@noframes`) sind byte-identisch zum
  Original; `@version` kommt aus `src/version.js`.
- **Versions-Bump an 3-teilige Versionen angepasst:** `bumpVersion()` erhöht jetzt die
  LETZTE Komponente (2.0.5 → 2.0.6) statt `major + '.' + (minor+1)` (das hätte 2.1 ergeben).
- Tests: `test/parser.test.mjs` (36 Unit-Tests für `getBaseTag`, `parseTagsString`,
  `parseSearchTokens`, `tokenMatchesDb`, `computeFit`), `tools/smoke-test.js`
  (Mock-Browser: Bundle vs. Git-Baseline = Original v2.0.5, inkl. UI-Flow mit
  Toolbar/Panels/Titel-Farben), `tools/check-imports.mjs` (Modul-Imports vollständig).
- ESLint (Flat Config, eslint:recommended + `eqeqeq`) eingeführt – Exit 0.

**Betroffen:** Entwicklungs-Infrastruktur; `@version` 2.0.6. Verhalten unverändert
(verifiziert per Smoke-Test: Bundle und Git-Baseline evaluieren identisch).

---

## v2.0.5 – Ausgangsbasis (Original, vor dem Modul-Split)

**Ziel:** Dokumentierter Basiszustand des Scripts vor der Zerlegung (eingerichtet als
Git-Baseline für den Smoke-Test).

**Enthaltene Funktionalität (Bestand, nicht neu):**
- **Media-Fit:** Bilder/Videos (`#content #image` / `#content video`) werden an die
  Fenstergröße minus Sidebar angepasst (`resizeImageToFit`/`resizeVideoToFit`), mit
  Window-Resize-Handling (optional) und Fit-/Scroll-Buttons (optional).
- **Video:** Autoplay (optional), Lautstärke (Default 0), Loop; `removeFluid` ersetzt
  den Fluid-Player durch ein natives `<video>`.
- **Auto-Scroll** zum Inhalt beim Laden und beim ersten Tab-Fokus (optional).
- **Tastatur-Shortcuts:** `[` = Fit, `]` = Scroll (in den Settings umbelegbar, Escape bricht ab).
- **Favorite-Tags-Panels (main + USER):** persönliche Tag-Listen pro Site mit +/−/Tag-
  Links, Textarea-Editor, „aktuelle Suche übernehmen“ (mit Pair-Tag-Basis-Ersetzung),
  Auf-/Zugeklappt-Zustand persistiert.
- **Header-Farb-Validierung:** Titel „Image Board Enhancer (User)“ wird grün, wenn die
  aktuelle Suche Favorite-Tags trifft, sonst rot; läuft über einen robusten Input-Observer
  (MutationObserver + value-Setter-Interception + Shadow-Root-Fallback).
- **Custom-Sites:** Konfiguration über Setup-/Delete-Button (JSON-Prompt), sonst Default-Selektoren.
- **Settings-Modal:** Checkboxen, Lautstärke, Shortcut-Umbelegung; Speichern lädt die Seite neu.

**Hinweis:** Bekannte Schwachstellen des Originals (Titel-Farben-Early-Return wenn nur
ein Panel gezeichnet, unescaped Inline-`onclick` beim −-Link, Debounce-Fehlgebrauch im
input-Listener, fehlende `isTyping`-Guards, Einstellungen ohne UI-Schalter) sind im
Split bewusst UNVERÄNDERT übernommen worden – sie werden separat (v2.0.7+) adressiert.
