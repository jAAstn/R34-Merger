// ui.js – Header-UI, Status-Anzeige und Chunked-Gallery-Renderer.
// v4.29: Tag-Filter entfernt (Feld + Awesomplete + Tags im Cache) – geblieben
// sind Sortierung, Scan, Diff-Modus, Export/Import und Cache-Panel/Auto-Scan.
import { state, CACHE_VERSION, parseStoredJson } from './core.js';
import { idbGet, idbSet, idbDelete, getRemovalQueue, removeFromAdditionalQueue, addToRemovalQueue, removeFromRemovalQueue, collectStorageSnapshot, restoreStorageSnapshot, clearPartialScan } from './storage.js';
import { addFavorite, removeFavorite } from './api.js';
import { scan, retryFailedPages, applyAutoScanSetting, cancelScan } from './scan.js';

export function displayScanStatus(text) {
  const el = document.getElementById('progress');
  if (el) el.textContent = text;
}

// ── Filter-Pipeline (4a): Diff-Modus ────────────────────────────────────────
// Läuft über state.results; das Ergebnis wird gerendert. Sortierungen
// (Score/Random) mutieren state.results und werden danach erneut gefiltert.
export function getFilteredResults() {
  let items = state.results || [];
  if (state.showOnlyNew && state.newSinceLastScan.size > 0) {
    items = items.filter(post => state.newSinceLastScan.has(String(post.id)));
  }
  return items;
}

export function applyCurrentFiltersAndRender() {
  renderResultsToGalleryChunked(getFilteredResults());
}

// ── Button-Factory (dedupliziert die identischen Style-Blöcke) ──────────────
function createActionButton({ label, color = '#808080', hoverColor = null, marginRight = '10px', marginLeft = null, display = 'inline-block' }) {
  const btn = document.createElement('button');
  btn.textContent           = label;
  btn.style.color           = 'white';
  btn.style.backgroundColor = color;
  if (marginRight !== null) btn.style.marginRight = marginRight;
  if (marginLeft !== null)  btn.style.marginLeft  = marginLeft;
  btn.style.padding         = '5px 10px';
  btn.style.border          = '1px solid #ccc';
  btn.style.borderRadius    = '3px';
  btn.style.cursor          = 'pointer';
  btn.style.fontSize        = '30px';
  btn.style.display         = display;
  if (hoverColor) {
    btn.onmouseover = () => { btn.style.backgroundColor = hoverColor; };
    btn.onmouseout  = () => { btn.style.backgroundColor = color; };
  }
  return btn;
}

// Unbefangenes Fisher-Yates statt sort(() => 0.5 - Math.random()):
// das alte Vorgehen ist statistisch verzerrt und unnötig O(n log n).
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Ein module-level IntersectionObserver statt einem pro Render-Aufruf:
// alter Observer wird vor jedem Re-Render disconnectet (Memory-Leak-Fix),
// am Listenende disconnectet er sich selbst.
let galleryObserver = null;

// Rendert Favoriten in die existierende rule34-Gallery (#content > div.image-list)
export function renderResultsToGalleryChunked(items = state.results, batchSize = 50) {
  const imageList = document.querySelector('#content > div.image-list');
  if (!imageList) return;

  if (galleryObserver) galleryObserver.disconnect();
  imageList.innerHTML = '';
  let index       = 0;
  let isRendering = false;

  const sentinel = document.createElement('div');
  sentinel.id           = 'lazy-sentinel';
  sentinel.style.height = '1px';
  sentinel.style.margin = '30px auto';
  imageList.appendChild(sentinel);

  function renderChunk() {
    if (isRendering) return;
    isRendering = true;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < batchSize && index < items.length; i++, index++) {
      const post = items[index];

      const outerSpan = document.createElement('span');
      outerSpan.style.alignSelf        = 'flex-start';
      outerSpan.style.display          = 'grid';
      outerSpan.style.gridTemplateRows = 'auto 10px';
      // SKILL.md „Virtualize long lists": der Browser überspringt Layout/Paint
      // von Off-Screen-Items komplett (progressive Enhancement, ältere
      // Browser ignorieren es einfach).
      //outerSpan.style.contentVisibility    = 'auto';
      outerSpan.style.containIntrinsicSize = 'auto 240px';

      const thumb = document.createElement('span');
      thumb.className = 'thumb';

      const a = document.createElement('a');
      a.href    = post.link;
      a.id      = `p${post.id}`;
      a.onclick = function () { document.location = post.link; return false; };

      const img = document.createElement('img');
      img.src            = post.src;
      img.alt            = 'image_thumb';
      img.title          = `Score: ${post.score || 0}`;
      img.border         = '0';
      img.loading        = 'lazy';
      img.decoding       = 'async';
      img.referrerPolicy = 'no-referrer';

      a.appendChild(img);
      thumb.appendChild(a);

      const remove = document.createElement('a');
      remove.href    = '#';
      remove.onclick = async function () {
        // Remove per fetch ohne Seiten-Reload: Post direkt aus der Galerie
        // entfernen und Removal-Queue pflegen, damit er auch aus dem Cache
        // (IndexedDB) verschwindet.
        try {
          await removeFavorite(post.id);
          removeFromAdditionalQueue(post.id);
          addToRemovalQueue(post.id);
          // BUGFIX: Post auch aus state.results/resultIds entfernen – vorher
          // blieb er in der Liste und kam bei Score/Random-Sort oder Re-Render
          // wieder zurück. splice (statt filter) hält `items` konsistent,
          // wenn items === state.results während eines laufenden Renders.
          const idx = state.results.indexOf(post);
          if (idx !== -1) state.results.splice(idx, 1);
          state.resultIds.delete(post.id);
          outerSpan.remove();
          // Post für Undo merken (Server-Add möglich – verifizierter Endpoint).
          // Hinweis: nur die LETZTE Entfernung ist undo-bar (by design).
          state.lastRemoved = post;
          if (state.undoButton) state.undoButton.style.display = 'inline-block';
        } catch (e) {
          console.error('Remove failed:', e);
        }
        return false;
      };
      const removeText = document.createElement('b');
      removeText.textContent = 'Remove';
      remove.appendChild(removeText);

      outerSpan.appendChild(thumb);
      outerSpan.appendChild(document.createElement('br'));
      outerSpan.appendChild(remove);
      fragment.appendChild(outerSpan);
    }

    imageList.insertBefore(fragment, sentinel);
    isRendering = false;

    if (index >= items.length) { galleryObserver.disconnect(); sentinel.remove(); }
  }

  galleryObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !isRendering) renderChunk();
  });
  galleryObserver.observe(sentinel);
  renderChunk();
}

// Identisch zum Original: Score+Random Buttons, Search-Button und #progress
// werden per header.insertBefore(inputContainer, navbar.nextSibling) eingebaut.
export function createHeaderUI() {
  const header = document.getElementById('header');
  const navbar = document.getElementById('navbar');
  if (!header || !navbar) return;

  const inputContainer = document.createElement('div');
  inputContainer.style.marginTop    = '-50px';
  inputContainer.style.marginLeft   = '0px';
  inputContainer.style.marginBottom = '-5px';

  // Score + Random (createSortButtonsInline)
  const sortContainer = document.createElement('div');
  sortContainer.style.display     = 'inline-block';
  sortContainer.style.marginRight = '10px';
  sortContainer.style.marginLeft  = '37%';
  sortContainer.style.position    = 'sticky';

  [{ label: 'Original', value: 'original' }, { label: 'Score', value: 'score' }, { label: 'Random', value: 'random' }].forEach(sort => {
    const btn = createActionButton({ label: sort.label, marginRight: null, marginLeft: '5px' });
    btn.addEventListener('click', async () => {
      if (!state.results || state.results.length === 0) {
        // Direkter Zugriff auf IndexedDB statt LZString/LocalStorage
        const payload = await idbGet('allImagesPayload');

        if (payload && payload.images) {
          // Removal-Queue anwenden – sonst tauchen Posts aus dem Cache wieder
          // auf, die (auch in einem anderen Tab) entfernt wurden.
          const removed = new Set(getRemovalQueue());
          state.results   = payload.images.filter(img => img?.id && !removed.has(String(img.id)));
          state.resultIds = new Set(state.results.map(result => String(result.id)));
          state.baseResults = [...state.results]; // Cache-Reihenfolge = Original
        }

        if (!state.results || state.results.length === 0) {
          alert('Keine Ergebnisse. Bitte zuerst über Search-Button laden.');
          return;
        }
      }
      if (sort.value === 'score') {
        state.results.sort((a, b) => (parseInt(b.score, 10) || 0) - (parseInt(a.score, 10) || 0));
      } else if (sort.value === 'random') {
        shuffleInPlace(state.results);
      } else if (state.baseResults) {
        // Original = Reihenfolge des letzten Scans/Cache-Loads wiederherstellen.
        state.results = [...state.baseResults];
      }
      applyCurrentFiltersAndRender();
    });
    sortContainer.appendChild(btn);
  });

  // Search Button (createSearchButton)
  const searchBtn = createActionButton({ label: 'Search', color: '#e26c5e', hoverColor: '#c45a4b', marginLeft: '-5px' });
  state.searchButton = searchBtn;
  searchBtn.style.position = "sticky";
  searchBtn.onclick  = () => { scan(); };

  // Retry Button – nur sichtbar, wenn Seiten fehlgeschlagen sind
  // (Sichtbarkeit steuert scan.js via updateRetryButtonVisibility).
  const retryBtn = createActionButton({ label: 'Retry', color: '#d08a2c', hoverColor: '#b5741f', display: 'none' });
  state.retryButton = retryBtn;
  retryBtn.style.position = "sticky";
  retryBtn.onclick  = () => { retryFailedPages(); };

  // Undo Button – erscheint nur nach einem fetch-Remove, stellt den
  // entfernten Post per Server-Add (addfav.php) wieder her.
  const undoBtn = createActionButton({ label: 'Undo', color: '#2e7d32', hoverColor: '#1b5e20', display: 'none' });
  state.undoButton = undoBtn;
  undoBtn.onclick  = () => { undoLastRemoved(); };

  // Cancel Button (v4.31) – bricht einen laufenden Scan über dessen
  // AbortController ab. Sichtbarkeit steuert setScanInProgress().
  const cancelBtn = createActionButton({ label: 'Cancel', color: '#8a3a3a', hoverColor: '#6e2e2e', display: 'none' });
  state.cancelButton = cancelBtn;
  cancelBtn.title    = 'Laufenden Scan abbrechen (bereits geladene Seiten bleiben im Cache unangetastet)';
  cancelBtn.style.fontSize     = '14px';
  cancelBtn.style.padding      = '2px 6px';
  cancelBtn.style.verticalAlign = 'middle';
  cancelBtn.onclick = () => { cancelScan(); };

  // ── Progress: Text-Status (wie in v4.21) ─────────────────────────────────
  const progress = document.createElement('span');
  progress.id               = 'progress';
  progress.style.marginLeft = '0px';
  progress.style.fontSize   = '25px';

  // ── Diff-Modus (4a): "New"-Toggle ───────────────────────────────────────────
  const newBtn = createActionButton({ label: 'New', color: '#6b5a8a', hoverColor: '#584873', marginRight: null, marginLeft: '8px', display: 'none' });
  state.newButton = newBtn;
  newBtn.title = 'Nur Favoriten anzeigen, die beim letzten Scan neu hinzukamen (Ein/Aus)';
  newBtn.style.fontSize = '14px';
  newBtn.style.padding  = '2px 6px';
  newBtn.style.verticalAlign = 'middle';
  newBtn.onclick = () => {
    state.showOnlyNew = !state.showOnlyNew;
    updateNewButtonState();
    applyCurrentFiltersAndRender();
  };

  inputContainer.appendChild(sortContainer);
  inputContainer.appendChild(searchBtn);
  inputContainer.appendChild(retryBtn);
  inputContainer.appendChild(cancelBtn);
  inputContainer.appendChild(undoBtn);
  inputContainer.appendChild(progress);
  inputContainer.appendChild(newBtn);

  // ── Zweite Zeile: Export/Import (3a), Cache-Panel (2b/1b) ─────────────────
  const secondRow = document.createElement('div');
		secondRow.style.position = "absolute";
		secondRow.style.zIndex = "2147482946";
		secondRow.style.left = "100px";
		secondRow.style.top = "12px"; 

  // Export (3a): Favoriten-Cache als JSON-Datei herunterladen.
  const exportBtn = createActionButton({ label: 'Export', color: '#3f8a54', hoverColor: '#336e44', marginRight: null, marginLeft: '0', display: 'inline-block' });
  exportBtn.title = 'Favoriten-Cache als JSON exportieren (inkl. localStorage & Cookie user_id)';
  exportBtn.style.fontSize = '14px';
  exportBtn.style.padding  = '2px 6px';
  exportBtn.onclick = async () => {
    const payload = await idbGet('allImagesPayload');
    if (!payload || !payload.images || !payload.images.length) {
      alert('Cache ist leer – nichts zu exportieren.');
      return;
    }
    payload.storage = collectStorageSnapshot();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `r34-favorites-${payload.userId || 'export'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Import (3a): JSON-Datei einlesen → Cache ersetzen → Neu-Scan erzwingen.
  const importBtn = createActionButton({ label: 'Import', color: '#3f8a54', hoverColor: '#336e44', marginRight: null, marginLeft: '6px', display: 'inline-block' });
  importBtn.title = 'Favoriten-Cache aus einer Export-Datei importieren (ersetzt den Cache)';
  importBtn.style.fontSize = '14px';
  importBtn.style.padding  = '2px 6px';
  importBtn.onclick = () => {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const images = Array.isArray(data) ? data : data.images;
        if (!Array.isArray(images) || !images.length || !images.every(img => img && img.id)) {
          alert('Ungültige Datei: erwartet wird ein Export mit einem nicht-leeren images-Array.');
          return;
        }
        if (!confirm(`${images.length} Favoriten importieren? Der bestehende Cache wird ersetzt.`)) return;
        const payload = {
          version:   CACHE_VERSION,
          userId:    data.userId || state.userId,
          updatedAt: Date.now(),
          images
        };
        await idbSet('allImagesPayload', payload);
        state.indexedDbImagesPromise = null; // Cache-Promise invalidieren

        restoreStorageSnapshot(data.storage);

        // Cache direkt in den State laden + rendern – KEIN erneuter Scan nötig.
        const normalized = images.filter(img => img && img.id);
        state.loadedImages = normalized;
        state.allImages    = normalized;
        state.allImageIds  = new Set(normalized.map(img => String(img.id)));
        state.results      = normalized.map(img => ({ ...img, id: String(img.id) }));
        state.resultIds    = new Set(state.results.map(p => p.id));
        state.baseResults  = [...state.results];

        // Scan-Status zurücksetzen: Die Daten sind vollständig, nichts zu scannen.
        const removalSet = new Set(getRemovalQueue());
        const stored = parseStoredJson(localStorage.getItem('prevFavCount'), null);
        state.actualFavCount = Number.isFinite(stored) ? stored : normalized.length;
        state.needScan  = false;
        state.fullScan  = false;
        localStorage.setItem('prevFavCount', JSON.stringify(state.actualFavCount));
        if (state.userId) localStorage.setItem('userId', JSON.stringify(state.userId));

        // Entfernte Posts (aus der Queue) nicht anzeigen.
        state.results     = state.results.filter(p => !removalSet.has(p.id));
        state.baseResults = state.baseResults.filter(p => !removalSet.has(p.id));
        state.resultIds   = new Set(state.results.map(p => p.id));

        displayScanStatus(`imported ${normalized.length} favorites`);
        updateNewButtonState();
        refreshCacheInfo();
        applyCurrentFiltersAndRender();
      } catch (e) {
        alert('Import fehlgeschlagen: ' + (e?.message || e));
      }
    };
    input.click();
  };

  // Cache-Info (2b): Anzeige von updatedAt + Bildanzahl, dazu Auto-Scan (1b).
  const cacheInfoBtn = createActionButton({ label: 'ⓘ Cache', color: '#666', hoverColor: '#555', marginRight: null, marginLeft: '6px', display: 'inline-block' });
  cacheInfoBtn.title = 'Cache-Status anzeigen';
  cacheInfoBtn.style.fontSize = '14px';
  cacheInfoBtn.style.padding  = '2px 6px';
  cacheInfoBtn.onclick = () => { toggleCachePanel(); };

  secondRow.appendChild(exportBtn);
  secondRow.appendChild(importBtn);
  secondRow.appendChild(cacheInfoBtn);

  inputContainer.appendChild(secondRow);

  // Cache-Panel (eigene Zeile, ein-/ausklappbar)
  const cachePanel = document.createElement('div');
  cachePanel.id = 'r34-cache-panel';
  cachePanel.style.cssText = "display:none;padding:6px 10px;border:1px solid #888;border-radius:4px;font-size:14px;background:rgb(0 0 0);max-width:640px;position:absolute;z-index:2147482946;left:308px;top:12px";
  inputContainer.appendChild(cachePanel);

  // In Header einfügen – identisch zum Original
  header.insertBefore(inputContainer, navbar.nextSibling);
}

// Stellt den zuletzt entfernten Post wieder her: Server-Add via addfav.php,
// Removal-Queue bereinigen und den Post in die Galerie zurückholen.
async function undoLastRemoved() {
  const post = state.lastRemoved;
  if (!post) return;
  const ok = await addFavorite(post.id);
  if (!ok) {
    console.error('Undo failed: Server-Add fehlgeschlagen');
    return;
  }
  removeFromRemovalQueue(post.id);
  state.lastRemoved = null;
  if (state.undoButton) state.undoButton.style.display = 'none';
  // Post wieder in die Ergebnisliste aufnehmen und Galerie aktualisieren
  if (!state.resultIds.has(post.id)) {
    state.resultIds.add(post.id);
    state.results.unshift(post);
    if (state.baseResults) state.baseResults.unshift(post);
  }
  applyCurrentFiltersAndRender();
}

// ── Cache-Info-Panel (2b) + Auto-Scan-Einstellung (1b) ──────────────────────
function toggleCachePanel() {
  const panel = document.getElementById('r34-cache-panel');
  if (!panel) return;
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) buildCachePanelContent(panel);
}

async function buildCachePanelContent(panel) {
  panel.textContent = 'Lade Cache-Info…';
  let payload = null;
  try { payload = await idbGet('allImagesPayload'); } catch { /* unten behandelt */ }

  panel.textContent = '';
  const lines = document.createElement('div');

  const count = payload?.images?.length ?? 0;
  const updated = payload?.updatedAt ? new Date(payload.updatedAt).toLocaleString() : 'nie';
  const line1 = document.createElement('div');
  line1.textContent = `Cache: ${count} Bilder · letzter Scan: ${updated}`;
  lines.appendChild(line1);

  // Diagnose (v4.35): Woher kommt der Count, wie weit ist der Scan, was war
  // der letzte Fehler? Bisher stand das nur in der Konsole.
  // Bei geschätztem Count wäre die gerundete Seitengrenze (84800) irreführend –
  // dann lieber die Seitenzahl zeigen, die tatsächlich gescannt wird.
  const countLine = document.createElement('div');
  if (state.favCountEstimated && Number.isFinite(state.actualFavCount) && state.actualFavCount > 0) {
    countLine.textContent = `Favoriten: ${Math.round(state.actualFavCount / 50)} Seiten (Count geschätzt aus Pagination)`;
  } else {
    countLine.textContent = `Favoriten: ${Number.isFinite(state.actualFavCount) ? state.actualFavCount : '–'} (exakt)`;
  }
  lines.appendChild(countLine);

  const progressLine = document.createElement('div');
  if (state.scanProgress) {
    progressLine.textContent = `Scan läuft: ${state.scanProgress.loaded} / ${state.scanProgress.total} Seiten`;
  } else if (state.partialScanInfo) {
    progressLine.textContent = `Unterbrochen: ${state.partialScanInfo.loaded} / ${state.partialScanInfo.total} Seiten (Search setzt fort)`;
  } else {
    progressLine.textContent = 'Scan: bereit';
  }
  lines.appendChild(progressLine);

  if (state.lastScanError) {
    const errorLine = document.createElement('div');
    errorLine.textContent = `Letzter Fehler: ${state.lastScanError}`;
    lines.appendChild(errorLine);
  }


  // Auto-Scan (1b)
  const line2 = document.createElement('div');
  line2.style.marginTop = '4px';
  const label = document.createElement('span');
  label.textContent = 'Auto-Scan: ';
  line2.appendChild(label);
  const sel = document.createElement('select');
  sel.style.cssText = 'font-size:14px;vertical-align:middle';
  [['off', 'Aus'], ['5min', 'Alle 5 Minuten'], ['15min', 'Alle 15 Minuten']].forEach(([v, text]) => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = text;
    sel.appendChild(opt);
  });
  sel.value = state.autoScanInterval || 'off';
  sel.onchange = () => {
    state.autoScanInterval = sel.value;
    localStorage.setItem('autoScan', sel.value);
    applyAutoScanSetting();
  };
  line2.appendChild(sel);
  lines.appendChild(line2);


  // Cache-Aktionen (2b)
  const line3 = document.createElement('div');
  line3.style.marginTop = '6px';
  const mkSmall = (labelText, title, onClick) => {
    const b = document.createElement('button');
    b.textContent = labelText; b.title = title;
    b.style.cssText = 'font-size:13px;padding:2px 8px;margin-right:6px;cursor:pointer';
    b.onclick = onClick;
    return b;
  };
  line3.appendChild(mkSmall('Cache neu scannen', 'Erzwingt einen Voll-Scan (Search)', () => {
    state.needScan = true;
    state.fullScan = true;
    scan();
  }));
  line3.appendChild(mkSmall('Cache löschen', 'Leert den Favoriten-Cache und lädt die Seite neu', async () => {
    if (!confirm('Cache wirklich löschen? Alle gespeicherten Favoriten-Daten gehen verloren.')) return;
    try {
      await idbDelete('allImagesPayload');
      await clearPartialScan();
    } catch (e) { console.error('Cache löschen fehlgeschlagen:', e); }
    ['prevFavCount', 'userId', 'fromBack', 'removalQueue', 'additionalQueue'].forEach(k => localStorage.removeItem(k));
    state.indexedDbImagesPromise = null;
    location.reload();
  }));
  lines.appendChild(line3);

  panel.appendChild(lines);
}

// Wird nach Scan-Ende / init aufgerufen, damit die Cache-Anzeige aktuell bleibt.
export function refreshCacheInfo() {
  const panel = document.getElementById('r34-cache-panel');
  if (panel && panel.style.display !== 'none') buildCachePanelContent(panel);
}

// Diff-Modus-Button (4a): sichtbar nur, wenn es neue Favoriten gibt.
export function updateNewButtonState() {
  const btn = state.newButton;
  if (!btn) return;
  const count = state.newSinceLastScan.size;
  if (count === 0 && !state.showOnlyNew) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'inline-block';
  btn.textContent = state.showOnlyNew ? `New (${count}) ✕` : `New (${count})`;
  btn.style.backgroundColor = state.showOnlyNew ? '#4a3d63' : '#6b5a8a';
}
