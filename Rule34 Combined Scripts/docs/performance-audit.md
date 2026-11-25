# Performance-Audit – Rule34 Combined Scripts

> Stand: v5.32 · Ziel: konkrete Messpunkte für „wie oft läuft X pro Seitenwechsel
> und Batch“ und „wo liegen die teuersten DOM-Scans“. Referenzen auf Dateien und
> Zeilen beziehen sich auf `src/`; Konstanten siehe `core.js`.

## 1. Observer-Landschaft (jeder feuert bei jeder passenden Mutation)

| Observer | Datei | Beobachtet | Optionen | Häufigkeit / Kosten |
|---|---|---|---|---|
| Body-Observer | `init.js` | `document.body` | `childList, subtree` | **Feuert bei jeder Strukturänderung im Body.** Pro Mutation: `mutationTouchesRouteContent()` (closest/matches auf `#content, .image-list, …`) + `n.matches('.thumb')` / `n.querySelector('.thumb')`. Verarbeitung selbst ist debounced (`DEBOUNCE_MUTATION_MS` = 150 ms). |
| Head-Observer | `init.js` | `document.head` | `childList, subtree` | Feuert bei jeder Head-Änderung (SPA-Navigation via `<title>`/Meta). Komplett debounced (150 ms) auf `handleUrlChangeImmediate`. |
| Tag-Hider: Liste/Start | `tag-hider.js` (`initObservers`) | `document.documentElement` | `childList, subtree, characterData, attributes`, `attributeFilter: ['title','alt','src']` | **Teuer:** `attributes`/`characterData` feuert bei jedem `src`/`title`/`alt`-Setzen. Microtask-coalesced (`makeMutationCoalesced`), danach `collectMutationThumbs` → `processListPage(cands)`. |
| Tag-Hider: Favoriten | `tag-hider.js` | `document.documentElement` | wie oben | Microtask-coalesced, dann **`processFavoritesPage()` = Voll-Scan aller Post-Links** (siehe §3). |
| Tag-Hider: Post-View | `tag-hider.js` | `#post-view`/`body` | `childList, subtree, characterData, attributes` | Coalesced auf `viewCheck()` (eine Bild-/Tag-Signatur). |
| Sidebar-Integrator | `sidebar.js` | `document.body` | `childList, subtree` | Debounced 150 ms (`tryIntegrate`); günstig. |

**Messpunkte:** `performance.now()` im Observer-Callback **vor** der Filterlogik und
**nach** dem Debounce-Flush; Zähler für „Observer-Feuerungen gesamt“ vs.
„tatsächlich verarbeitete Batches“ (das Verhältnis zeigt, wie viel Arbeit das
Debouncing/Coalescing einspart).

## 2. Was läuft pro Seitenwechsel (SPA-Route)?

Reihenfolge in `init.js` (`handleUrlChangeImmediate` → `scheduleRouteScan`):

1. `TAG.reloadForRoute()` — 1×
2. `removeDuplicateThumbnails.reset()` — 1× (Cache leeren)
3. `updateFavicon()` + `updatePageIndicator()` — 1× je Feature
4. `getRouteContentSignature(href)` — **DOM-Fingerprint**: bei Listen
   `Array.from(imageList.querySelectorAll('span.thumb')).map(t => t.id)` =
   **ein kompletter Thumb-ID-Scan**. Dieser Aufruf wiederholt sich in
   `scheduleRouteScan()` **alle 150 ms während einer laufenden Transition, bis
   der Content wechselt oder `ROUTE_TRANSITION_MAX_WAIT_MS` (5000 ms) erreicht
   ist** → Worst Case ~33 Fingerprint-Scans pro Seitenwechsel.
5. `runAll()` — 1× nach ruhiger Phase (Voll-Scan, §3).

**Messpunkte:** Dauer von `getRouteContentSignature` (getrennt nach Listen- vs.
Post-View-Zweig), Anzahl der `scheduleRouteScan`-Retries bis zur Ruhephase,
Gesamtdauer Transition-Start → `runAll()`-Ende. Die Retry-Zahl ist der direkteste
Hebel: ließe sich die Fingerprint-Sammlung cachen oder auf `childElementCount`
reduzieren, spart das pro Route ~N Retries × Thumb-Scan.

## 3. Die teuersten DOM-Scans (Hotspots)

| Scan | Datei | Selektor / Arbeit | Läuft | Einordnung |
|---|---|---|---|---|
| `processListPage()` | `tag-hider.js` | `document.querySelectorAll(".thumb:not([data-r34th-hider-processed='1'])")` + pro Thumb `getThumbTags` (Regel-Match) | 1× pro `runAll`-Batch (Voll-Scan) **und** pro relevanter Mutation-Batch (gefilterte Kandidaten) | Voll-Scan O(n) mit `:not(...)`-Attributfilter; pro Element `anyRuleMatches` (kompilierte Regeln). |
| `processFavoritesPage()` | `tag-hider.js` | `document.querySelectorAll('a[href*="page=post"][href*="id="]')` | **bei jedem relevanten Mutation-Batch auf Favoriten-Seiten** | **Hotspot auf Favoriten:** jeder neue `pagetual`-Batch löst einen erneuten Voll-Scan aller Post-Links aus, nicht nur der neuen. |
| `parseFavScripts()` | `tag-hider.js` | `document.querySelectorAll('script')` + `matchAll(/posts\[(\d+)\]…tags…/g)` über jedes Script | vor jedem `processListPage`/`processFavoritesPage` | **Vollständiger Script-Scan mit Regex über `textContent`** — bei jedem Batch erneut; nur verarbeitete Scripts werden über `data-r34th-hider-parsed` übersprungen. |
| `removeDuplicateThumbnails` | `features.js` | `ctx.querySelectorAll('span.thumb')` + bei Verdacht `document.getElementById(el.id)` (Selbstheilung) | pro Batch (Initial: ctx = document → Voll-Scan) | Set-Cache (`seenIds`) hält die Kosten linear; der `getElementById`-Rückgriff nur bei Duplikaten. |
| `markFavoritedThumbs` | `features.js` | `ctx.querySelectorAll('span.thumb')` (async nach IndexedDB-Load) | pro Batch auf Listen | IndexedDB-Read einmalig gecacht; danach nur Thumb-Iteration. |
| `removeAnnoyances` | `features.js` | `ctx.querySelectorAll(AD_SELECTORS)` (4 Selektoren) + für jedes `div[style*="display: inline-flex"]` `AD_MARKERS.some(sel => el.querySelector(sel))` (7 Marker) | pro Batch | **Pro inline-flex-Element bis zu 7 innere `querySelector`** — auf werbelastigen Seiten der teuerste „kleine“ Scan. |
| `setNativeLazyLoading` | `features.js` | `ctx.querySelectorAll('img:not([loading])')` | pro Batch | O(n) über Bilder; günstig, aber pro Batch erneut. |
| `cleanupFavoritesArtifacts` | `features.js` | `document.querySelectorAll('a#pi')` + Iteration über `imageList.children` | 1× pro `runAll`-Batch (Favoriten) | Dokument-weit, aber nur Favoriten-Seiten. |
| `hideEmptyThumbSpans` | `features.js` | `ctx.querySelectorAll('span.thumb')` | pro Batch, **deferred** (`requestIdleCallback`/200 ms) | Entlastet den synchronen Pfad bewusst. |
| Infinite-Scroll Dedup | `infinite-scroll.js` | `document.querySelectorAll('span.thumb')` zur Existenz-Prüfung | 1× pro nachgeladener Seite | Voll-Scan beim Ende-Erkennen (Duplikat-Check). |

## 4. Was läuft pro Batch (pagetual / Infinite-Scroll)?

Ein Batch = neue Nodes im `addedNodesBuffer` → debounced (150 ms) → `runAll(nodes)`:

1. `TAG.processAll()` — **1× pro Batch, aber Voll-Dokument-Scan** (nicht auf die
   neuen Nodes begrenzt; Kommentar in `init.js` bestätigt die Absicht).
2. Je übergebenem Kontext (`dedupeContexts` vorab): `hideBlacklisted`,
   `removeDuplicateThumbnails`, `removeAnnoyances`, `fixPaginatorLinks`,
   `removePidParameter`, `setNativeLazyLoading`, `removeThumbTitle`,
   `markFavoritedThumbs`.
3. Deferred: `hideEmptyThumbSpans` (`requestIdleCallback`).
4. `cleanupFavoritesArtifacts` — 1× (Dokument-weit, Favoriten).

**Wichtigster Befund:** Punkt 1 macht den Batch-Pfad bei großen Listen teuer —
die inkrementell eingefügten Nodes sind schmal gescoped (gut), aber
`TAG.processAll()` scannt trotzdem **jedes Mal das gesamte Dokument** erneut.
Ein Messpunkt, der „Laufzeit von `TAG.processAll()`“ getrennt von „Summe der
ctx-Scans“ ausweist, quantifiziert genau diesen Overhead.

## 5. Empfohlene Instrumentierung (konkret)

1. **Batch-Zähler:** global `__r34_perf = { observerFires: 0, batches: 0, fullScans: 0, routeRetries: 0 }`
   hochzählen an den markierten Stellen und nach 30 s in `console.table` ausgeben.
2. **Timer um die fünf Hotspots:** `parseFavScripts`, `processFavoritesPage`,
   `processListPage`, `removeAnnoyances`, `getRouteContentSignature` jeweils mit
   `performance.now()` klammern; Ergebnis einmal pro Batch kumuliert loggen.
3. **Verhältnis-Metrik:** `observerFires / batches` und
   `fullScans / batches` zeigen, ob Debouncing (150 ms) und das Microtask-Coalescing
   des Tag-Hiders den erwarteten Effekt haben.
4. **Route-Transition:** `routeRetries` zählen und gegen
   `ROUTE_TRANSITION_MAX_WAIT_MS` (5000 ms) stellen — liegt die Ruhephase oft am
   Maximum, ist der Fingerprint zu strikt/zu teuer.

## 6. Priorisierte Optimierungs-Kandidaten

1. **`processFavoritesPage` inkrementell statt Voll-Scan:** nur die neu
   eingefügten `.thumb`-Knoten verarbeiten (wie `processListPage` es mit
   `collectMutationThumbs` tut), statt bei jedem Batch alle Post-Links neu zu
   scannen.
2. **`parseFavScripts` cachen:** Signatur pro Script wird bereits gespeichert
   (`data-r34th-hider-parsed`); der initiale `querySelectorAll('script')` läuft
   aber trotzdem bei jedem Batch. Ein Cache der „zuletzt gescannten Script-Liste“
   würde Wiederholungs-Scans auf unverändertem DOM vermeiden.
3. **`TAG.processAll()` pro Batch auf die neuen Kontexte begrenzen** oder den
   Voll-Scan nur bei Initial-Load/Route-Change laufen lassen — der größte Hebel
   bei pagetual/Infinite-Scroll mit vielen kleinen Batches.
4. **`removeAnnoyances`:** die 7 `AD_MARKERS`-Proben je `inline-flex`-Container
   über ein einziges `querySelector` mit kombiniertem Selektor (`marker1, marker2, …`)
   ersetzen statt 7 einzelner Aufrufe.
5. **Route-Fingerprint:** bei Listen statt aller Thumb-IDs nur
   `imageList.childElementCount` + ersten/letzten Thumb-ID vergleichen, um die
   wiederholten Voll-Scans während der Transition zu reduzieren.
