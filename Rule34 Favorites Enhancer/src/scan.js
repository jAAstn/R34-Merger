// scan.js – Extraktion, Scan-Orchestrierung, init() und Entry-Points.
// Entry-Modul des Builds: importiert alles und startet das Script.
import {
  state, PageType, pageType, getIdFromUrl, getPostIdFromLink, getImageId,
  favoritePageCountFromPid, indexOfCachedId,
} from './core.js';
import {
  loadSavedData, loadSavedUserId, loadAllImagesFromIndexedDB, saveAllImagesToIndexedDB,
  getRemovalQueue, clearRemovalQueue, clearAdditionalQueue, addToRemovalQueue, removeFromAdditionalQueue,
  savePartialScan, loadPartialScan, clearPartialScan,
} from './storage.js';
import { getFavoritesCount, fetchFavoritesPage, enrichPostMetadata, isAbortError } from './api.js';
import { createHeaderUI, displayScanStatus, applyCurrentFiltersAndRender, updateNewButtonState, refreshCacheInfo } from './ui.js';
import { highlightFavs } from './highlight.js';

const FAVORITES_PER_PAGE = 50;
// Alle N geladenen Seiten wird der Teilfortschritt gesichert (siehe storage.js).
const PARTIAL_SAVE_EVERY = 25;

// ── Extraction ──────────────────────────────────────────────────────────────
export function extractImagesAndTags(doc, loadedImgs, pageNumber = null) {
  const postScores = new Map();

  if (loadedImgs) {
    state.images = loadedImgs;
  } else {
    doc.querySelectorAll('script').forEach(script => {
      if (!script.textContent.includes('score:')) return;
      // Scores können negativ sein (Downvotes) – daher -?\d+ statt \d+.
      const re = /posts\[(\d+)\]\s*=\s*{[\s\S]*?score:\s*['"](-?\d+)['"]/g;
      let m;
      while ((m = re.exec(script.textContent)) !== null) postScores.set(m[1], m[2]);
    });
    state.images = doc.querySelectorAll('.thumb img[src]');
  }

  state.images.forEach(image => {
    const imageId = getImageId(image); // nur EINMAL pro Bild berechnen (vorher 2×)
    if (!imageId) return;

    if (!loadedImgs) {
      if (pageNumber !== null) image.__r34Page = pageNumber;
      // Nullish statt truthy: Ein Score von 0 ist ein gültiger Wert.
      image.score = postScores.get(imageId) ?? null;
      if (!state.allImageIds.has(imageId)) {
        state.allImageIds.add(imageId);
        state.allImages.push(image);
      }
    }

    // Einheitlicher Post-Aufbau: DOM-<img> haben kein .link-Property → der
    // Fallback greift; gecachte Objekte (loadedImgs) tragen ihren Link bereits.
    // v4.31: keine ungenutzten Metadatenfelder mehr aus dem Cache übernehmen –
    // der Post-Aufbau bleibt id/link/src/score/page.
    const post = {
      link:  (loadedImgs && image.link) || `index.php?page=post&s=view&id=${imageId}`,
      src:   image.src,
      id:    imageId,
      score: image.score,
      page:  pageNumber
    };
    if (!state.resultIds.has(post.id)) {
      state.resultIds.add(post.id);
      state.results.push(post);
    }
  });

  if (!loadedImgs && state.images.length) {
    state.lastImageId = getImageId(state.images[state.images.length - 1]);
  }
}
export function sortScanResultsByPage() {
  const pageOf = value => Number.isFinite(value?.__r34Page) ? value.__r34Page : Number.MAX_SAFE_INTEGER;
  const resultPageOf = value => Number.isFinite(value?.page) ? value.page : Number.MAX_SAFE_INTEGER;
  state.allImages.sort((a, b) => pageOf(a) - pageOf(b));
  state.results.sort((a, b) => resultPageOf(a) - resultPageOf(b));
  if (state.allImages.length) state.lastImageId = getImageId(state.allImages[state.allImages.length - 1]);
}

// Der Score aus der API landet in state.results, gespeichert wird aber aus
// state.allImages/loadedImages. Ohne dieses Spiegeln wäre der nachgetragene
// Score beim nächsten Reload wieder weg (der Cache kennt nur den Feldwert).
// Bereits im HTML gefundene Scores werden nie überschrieben.
function syncScoresToScanImages() {
  const scoresById = new Map(state.results.map(post => [String(post.id), post.score]));
  const apply = image => {
    if (image?.score !== null && image?.score !== undefined) return;
    const score = scoresById.get(String(getImageId(image)));
    if (score !== null && score !== undefined) image.score = score;
  };
  state.allImages.forEach(apply);
  state.loadedImages.forEach(apply);
}

async function enrichScannedResults(signal) {
  if (state.results.length === 0) return;
  try {
    await enrichPostMetadata(state.results, { signal });
    syncScoresToScanImages();
  } catch (error) {
    if (isAbortError(error)) throw error;
    // Metadaten sind eine Verbesserung, aber kein Grund, einen kompletten
    // Favoriten-Scan als fehlgeschlagen zu markieren.
    console.warn('Post-Metadaten konnten nicht vollständig geladen werden:', error.message);
  }
}

// ── Scan Entry Points ───────────────────────────────────────────────────────
export function setScanInProgress(value) {
  state.scanInProgress = value;
  if (state.searchButton) {
    state.searchButton.disabled = value;
    state.searchButton.style.opacity = value ? '0.6' : '1';
    state.searchButton.style.cursor = value ? 'wait' : 'pointer';
  }
  // Der Abbrechen-Knopf existiert nur während eines laufenden Scans.
  if (state.cancelButton) state.cancelButton.style.display = value ? 'inline-block' : 'none';
}
export function resetScanStatus() {
  state.scanIncomplete = false;
  state.failedScanPages = new Set();
  updateRetryButtonVisibility();
}
export function markScanIncomplete(page, error) {
  state.scanIncomplete = true;
  state.failedScanPages.add(page);
  console.error(`Scan page ${page} incomplete:`, error || 'page could not be loaded');
}
function updateRetryButtonVisibility() {
  if (state.retryButton) {
    state.retryButton.style.display =
      (state.scanIncomplete && state.failedScanPages.size > 0) ? 'inline-block' : 'none';
  }
}

// Lädt nur die fehlgeschlagenen Scan-Seiten erneut nach (statt den ganzen
// Scan neu zu starten) und merged die Ergebnisse in die bestehende Galerie.
export async function retryFailedPages() {
  if (state.scanInProgress) return;
  const failedPages = [...state.failedScanPages];
  if (failedPages.length === 0) return;

  const controller = new AbortController();
  state.scanAbortController = controller;
  setScanInProgress(true);
  try {
    let done = 0;
    for (const page of failedPages) {
      try {
        const doc = await fetchFavoritesPage(page, { signal: controller.signal });
        if (!doc) {
          markScanIncomplete(page); // bleibt fehlgeschlagen
        } else {
          extractImagesAndTags(doc, undefined, page);
          state.failedScanPages.delete(page);
        }
      } catch (err) {
        if (isAbortError(err)) throw err;
        markScanIncomplete(page, err);
      }
      done++;
      displayScanStatus(`retrying: ${done} / ${failedPages.length}`);
    }

    // Nur wenn alle Seiten erfolgreich waren, gilt der Scan als vollständig.
    state.scanIncomplete = state.failedScanPages.size > 0;
    sortScanResultsByPage();
    await finishScanAndDisplay(controller.signal);
  } catch (error) {
    if (isAbortError(error)) {
      displayScanStatus('scan cancelled');
    } else {
      state.scanIncomplete = true;
      displayScanStatus('scan failed');
      console.error('Retry scan failed:', error);
    }
  } finally {
    if (state.scanAbortController === controller) state.scanAbortController = null;
    // try/finally: der Search-Button darf bei einem Render-/Save-Fehler
    // nicht für immer disabled bleiben.
    setScanInProgress(false);
  }
}
// Notfall-Quelle für die Seitenzahl, wenn der Profil-Count nicht abrufbar ist
// (Timeout, Cloudflare-Challenge): Die Favoriten-Seite nennt in ihrer eigenen
// Pagination den pid der letzten Seite (`a[name="lastpage"]`). Der höchste pid
// im Paginator bestimmt damit die Gesamtzahl der Seiten – auch ohne exakte
// Favoriten-Anzahl. Ohne Paginator (einzelne Seite) bleibt genau eine Seite.
function favoritePageCountFromDocument() {
  let maxPid = 0;
  document.querySelectorAll('a[onclick], a[href*="pid="]').forEach(anchor => {
    const raw = `${anchor.getAttribute('onclick') || ''} ${anchor.getAttribute('href') || ''}`;
    for (const match of raw.matchAll(/pid=(\d+)/g)) {
      maxPid = Math.max(maxPid, Number(match[1]));
    }
  });
  // maxPid 0 heißt "kein Paginator gefunden", nicht "eine Seite": ohne
  // Pagination entscheidet die Anzahl der Thumbnails.
  const pages = maxPid > 0 ? favoritePageCountFromPid(maxPid, FAVORITES_PER_PAGE) : null;
  if (pages) return pages;
  return document.querySelectorAll('.thumb img[src]').length > 0 ? 1 : null;
}

// Restzeit für den Status: nur eine grobe Schätzung ab 3 s Laufzeit.
function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function scanEtaSuffix(loaded, total, startedAt) {
  if (!Number.isFinite(total) || total <= 0 || loaded <= 0 || !startedAt) return '';
  const elapsed = Date.now() - startedAt;
  if (elapsed < 3_000) return '';
  return ` · ETA ${formatDuration((elapsed / loaded) * (total - loaded))}`;
}

export async function scan() {
  if (state.scanInProgress) return;

  const controller = new AbortController();
  state.scanAbortController = controller;
  setScanInProgress(true);
  resetScanStatus();

  try {
    state.lastScanError = null;
    // Primärquelle ist die Pagination der aktuellen Seite (kein Request, kann
    // nicht an Cloudflare scheitern). Der Profil-Count wird nur noch ohne
    // Pagination gefragt. Ein Voll-Scan übernimmt immer die aktuelle
    // Seitenzahl – bei neuen Favoriten während der Sitzung wäre der alte Wert
    // zu klein und die letzte Seite würde fehlen.
    if (state.needScan) {
      const pageCount = favoritePageCountFromDocument();
      if (pageCount && (state.fullScan || !Number.isFinite(state.actualFavCount))) {
        state.actualFavCount = pageCount * FAVORITES_PER_PAGE;
        state.favCountEstimated = true;
      } else if (!Number.isFinite(state.actualFavCount)) {
        const count = await getFavoritesCount(state.userId, { force: true });
        if (!Number.isFinite(count)) {
          displayScanStatus('favorites count unavailable');
          return;
        }
        state.actualFavCount = count;
        state.favCountOnLastUpdate = count;
        state.favCountEstimated = false;
      }
    }

    state.results = [];
    state.resultIds = new Set();

    if (state.needScan) {
      if (state.fullScan) {
        state.allImages = [];
        state.allImageIds = new Set();
        state.appendLoadedSave = false;
      }
      if (state.fullScan) await searchAllPages(0, controller.signal);
      else await searchNewPages(controller.signal);
    } else {
      await loadAllPages(controller.signal);
    }
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) {
      displayScanStatus('scan cancelled');
    } else {
      state.scanIncomplete = true;
      displayScanStatus('scan failed');
      console.error('Scan failed:', error);
    }
  } finally {
    if (state.scanAbortController === controller) state.scanAbortController = null;
    updateRetryButtonVisibility();
    setScanInProgress(false);
  }
}

export function cancelScan() {
  const controller = state.scanAbortController;
  if (!controller || controller.signal.aborted) return false;
  controller.abort();
  displayScanStatus('scan cancelled');
  return true;
}
async function loadAllPages(signal) {
  state.results = [];
  state.resultIds = new Set();
  extractImagesAndTags(false, state.loadedImages);
  await finishScanAndDisplay(signal);
}
// Gemeinsame Fetch-Schleife für Voll- und Teil-Scan. Die Rate-/Concurrency-
// Steuerung übernimmt der zentrale pageRequestLimiter (api.js) – hier bleibt
// nur noch die Extraktion + Status-Logik. Liefert totalPages zurück.

async function pagedFetch({ startPage = 0, maxPages = Infinity, statusSuffix = '', signal, skipPages = null, trackProgress = false } = {}) {
  const totalPages = Math.min(maxPages, Math.ceil((Number(state.actualFavCount) || 0) / FAVORITES_PER_PAGE));
  const skipped = new Set([...(skipPages || [])].filter(p => Number.isInteger(p) && p >= 0 && p < totalPages));
  const loadedPages = new Set(skipped);
  const startedAt = Date.now();
  state.scanProgress = { loaded: loadedPages.size, total: totalPages, startedAt };

  const pages = [];
  for (let page = Math.max(0, startPage); page < totalPages; page++) {
    if (!skipped.has(page)) pages.push(page);
  }

  // Teilfortschritt sichern, aber nie zwei Schreibvorgänge überlagern.
  let partialInFlight = false;
  const savePartialIfDue = () => {
    if (!trackProgress || partialInFlight || loadedPages.size === 0) return;
    if (loadedPages.size % PARTIAL_SAVE_EVERY !== 0) return;
    partialInFlight = true;
    savePartialScan({ totalPages, loadedPages })
      .catch(err => console.warn('Teilfortschritt nicht gespeichert:', err?.message || err))
      .finally(() => { partialInFlight = false; });
  };

  await Promise.all(pages.map(async (page) => {
    try {
      const doc = await fetchFavoritesPage(page, { signal });
      if (!doc) {
        markScanIncomplete(page);
        return;
      }
      extractImagesAndTags(doc, undefined, page);
      loadedPages.add(page);
      state.scanProgress = { loaded: loadedPages.size, total: totalPages, startedAt };
      displayScanStatus(`scanning: ${loadedPages.size} / ${totalPages}${statusSuffix}${scanEtaSuffix(loadedPages.size, totalPages, startedAt)}`);
      savePartialIfDue();
    } catch (err) {
      if (isAbortError(err)) throw err;
      markScanIncomplete(page, err);
    }
  }));
  state.scanProgress = null;
  return totalPages;
}
// Setzt einen unterbrochenen Voll-Scan fort: Die bereits geladenen Seiten aus
// dem Teilfortschritt werden als Basis übernommen und nicht erneut geladen.
// Best-effort – verschieben sich Seiten durch neue Favoriten, kann es an den
// Seitengrenzen zu Doppeln kommen; die Dedupe über die Post-ID fängt das ab.
async function prepareResume() {
  const partial = await loadPartialScan();
  if (!partial || String(partial.userId) !== String(state.userId)) return null;

  const totalPages = Math.ceil((Number(state.actualFavCount) || 0) / FAVORITES_PER_PAGE);
  const loadedPages = new Set(
    (Array.isArray(partial.loadedPages) ? partial.loadedPages : [])
      .filter(page => Number.isInteger(page) && page >= 0 && page < totalPages),
  );
  if (loadedPages.size === 0) return null;

  const images = Array.isArray(partial.images) ? partial.images : [];
  for (const img of images) {
    if (!Number.isFinite(img?.page) || img.page >= totalPages) continue;
    const id = getImageId(img);
    if (!id || state.allImageIds.has(id)) continue;
    state.allImageIds.add(id);
    state.allImages.push({ ...img, __r34Page: img.page });
    if (!state.resultIds.has(String(id))) {
      state.resultIds.add(String(id));
      state.results.push({ link: img.link, src: img.src, id: String(id), score: img.score, page: img.page });
    }
  }

  state.partialScanInfo = { loaded: loadedPages.size, total: partial.totalPages };
  displayScanStatus(`resuming: ${loadedPages.size} / ${totalPages} pages cached`);
  return loadedPages;
}

async function searchAllPages(startPage = 0, signal) {
  let resumePages = null;
  if (startPage === 0) {
    state.allImages = [];
    state.allImageIds = new Set();
    state.results = [];
    state.resultIds = new Set();
    state.appendLoadedSave = false;
    resumePages = await prepareResume();
  }
  await pagedFetch({ startPage, statusSuffix: '  (full)', signal, skipPages: resumePages, trackProgress: true });
  sortScanResultsByPage();
  await finishScanAndDisplay(signal);
}

// Inkrementeller Scan: lädt die neuesten Seiten, bis eine Seite eine bereits
// gecachte ID enthält. Die Grenze ist damit inhaltlich bestimmt (IDs sind nicht
// monoton – Favoriten werden nach Favorisier-Zeitpunkt sortiert), und es gibt
// keinen "nicht gefunden → alles neu"-Fallback mehr.
async function searchNewPages(signal) {
  state.allImages = [];
  state.results = [];
  state.allImageIds = new Set();
  state.resultIds = new Set();

  const totalPages = Math.ceil((Number(state.actualFavCount) || 0) / FAVORITES_PER_PAGE);
  const cachedIds = new Set(
    (state.loadedImages || [])
      .map(img => String(img?.id ?? getPostIdFromLink(img?.link)))
      .filter(Boolean),
  );

  let boundaryId = null;
  for (let page = 0; page < totalPages; page++) {
    const doc = await fetchFavoritesPage(page, { signal });
    if (!doc) {
      markScanIncomplete(page);
      break;
    }
    const pageIds = Array.from(doc.querySelectorAll('.thumb img[src]'))
      .map(img => getImageId(img))
      .filter(Boolean);
    extractImagesAndTags(doc, undefined, page);
    displayScanStatus(`scanning: page ${page + 1} / ${totalPages} (new)`);
    const hit = pageIds.find(id => cachedIds.has(String(id)));
    if (hit) { boundaryId = hit; break; }
    if (pageIds.length === 0) break;
  }

  sortScanResultsByPage();

  if (boundaryId) {
    const boundaryIndex = indexOfCachedId(state.loadedImages, boundaryId);
    if (boundaryIndex !== -1) {
      state.loadedImages.splice(0, boundaryIndex + 1);
      extractImagesAndTags(false, state.loadedImages);
      state.appendLoadedSave = true;
      await finishScanAndDisplay(signal);
      return;
    }
  }

  if (state.failedScanPages.size === 0) {
    // Keine gecachte ID gefunden, aber alle Seiten wurden bereits geladen:
    // der Cache ist veraltet und wird durch die frischen Seiten ersetzt –
    // ohne zweiten Durchlauf über 1696 Seiten.
    state.loadedImages = [];
    state.appendLoadedSave = false;
  } else {
    state.scanIncomplete = true;
  }
  await finishScanAndDisplay(signal);
}

// ── finishScanAndDisplay ────────────────────────────────────────────────────
async function finishScanAndDisplay(signal) {
  const willSave = state.needScan && !state.scanIncomplete;

  // Diff-Modus (4a): VOR dem Überschreiben des Caches bestimmen, welche IDs neu
  // sind. Bei Incremental-Scans sind das die frisch gefetchten Seiten, bei
  // Voll-Scans der Unterschied zum alten Cache-Stand.
  if (willSave) {
    if (state.appendLoadedSave) {
      state.newSinceLastScan = new Set(state.allImages.map(img => String(getImageId(img))).filter(Boolean));
    } else {
      const oldIds = new Set((state.loadedImages || []).map(img => String(img.id)));
      state.newSinceLastScan = new Set(state.results.map(p => String(p.id)).filter(id => !oldIds.has(id)));
    }
  }

  // Erst rendern: der Nutzer sieht die Galerie sofort. Der Score-Nachtrag (bis
  // zu fünf API-Requests) und das Speichern laufen erst danach.
  state.fullScan = false;
  state.baseResults = [...state.results];
  updateNewButtonState();
  applyCurrentFiltersAndRender();

  if (willSave) {
    try {
      await enrichScannedResults(signal);
      // Anzahl der tatsächlich geschriebenen Einträge: Bei inkrementellen Scans
      // enthält state.allImages nur die neuen Seiten, der übernommene Cache-Teil
      // steckt in state.loadedImages – allImages.length wäre dort viel zu klein.
      const savedCount = await saveAllImagesToIndexedDB();
      // Bei geschätztem Count nicht die gerundete Seitengrenze (84800) als
      // Baseline speichern, sondern die tatsächlich gecachte Menge (84769) –
      // sonst meldet der nächste Seitenaufbau fälschlich "scanned (new)".
      const baselineCount = state.favCountEstimated ? savedCount : state.actualFavCount;
      localStorage.setItem('prevFavCount', JSON.stringify(baselineCount));
      localStorage.setItem('userId', JSON.stringify(state.userId));
      clearRemovalQueue();
      clearAdditionalQueue();
      await clearPartialScan();
      state.partialScanInfo = null;
      displayScanStatus(state.newSinceLastScan.size ? `scanned (new ${state.newSinceLastScan.size})` : 'scanned');
    } catch {
      displayScanStatus('scan saved failed');
    }
  } else if (state.scanIncomplete) {
    displayScanStatus(`scan incomplete (${state.failedScanPages.size} page(s) failed)`);
  }

  updateRetryButtonVisibility();
  refreshCacheInfo();
}

// ── Visibility / Tab-Wechsel ────────────────────────────────────────────────
async function fastCheckForScanIsNeeded() {
  const savedUserId = loadSavedUserId();
  if (!savedUserId) return false;
  // String-Normalisierung: gespeicherte IDs können Number vs. String sein.
  if (String(getIdFromUrl()) !== String(savedUserId)) {
    return document.getElementById('progress')?.textContent !== 'new user';
  }
  const favCount = await getFavoritesCount(state.userId);
  if (!Number.isFinite(favCount)) return false;
  // v4.31: actualFavCount mitziehen. Sonst bleibt der Wert aus dem
  // Seitenaufruf stehen, und finishScanAndDisplay schreibt genau diesen
  // veralteten Wert als prevFavCount zurück – der nächste Aufruf meldet
  // daraufhin fälschlich "scanned (new)".
  state.actualFavCount = favCount;
  // Ein erfolgreicher Count ersetzt eine Schätzung aus init().
  state.favCountEstimated = false;
  if (!Number.isFinite(state.favCountOnLastUpdate)) {
    // Keine belastbare Baseline (z. B. Count beim Laden nicht verfügbar):
    // übernehmen, aber keinen Reload auslösen.
    state.favCountOnLastUpdate = favCount;
    return false;
  }
  if (favCount === state.favCountOnLastUpdate) return false;
  state.favCountOnLastUpdate = favCount;
  return true;
}

// Throttle + In-Flight-Guard: vorher hat jeder Tab-Wechsel einen Profil-Fetch
// ausgelöst, auch schnelles Hin-und-Her-Schalten. Jetzt max. 1 Check / 12s
// und nie zwei gleichzeitig (api.js cachet den Count zusätzlich 5s).
const VISIBILITY_CHECK_MIN_INTERVAL_MS = 12000;
let lastVisibilityCheckAt = 0;
let visibilityCheckInFlight = null;

function switchedToFavPage() {
  const now = Date.now();
  if (visibilityCheckInFlight) return;
  // v4.31: während eines laufenden Scans weder prüfen noch reloaden. Der
  // Count-Request teilt sich den pageRequestLimiter mit den Scan-Seiten und
  // würde ohne diesen Guard ohnehin bis Scan-Ende warten – und dann genau
  // die gerade fertig gerenderte Galerie wegschmeißen.
  if (state.scanInProgress) return;
  if (now - lastVisibilityCheckAt < VISIBILITY_CHECK_MIN_INTERVAL_MS) return;
  lastVisibilityCheckAt = now;

  visibilityCheckInFlight = fastCheckForScanIsNeeded()
    .then(result => { if (result) location.reload(); })
    .catch(err => console.error('Visibility-Check fehlgeschlagen:', err))
    .finally(() => { visibilityCheckInFlight = null; });
}
function visibilityChangeHandler() {
  if (document.visibilityState === 'visible') switchedToFavPage();
}

// ── Auto-Scan (1b): zeitgesteuertes Hintergrund-Polling ─────────────────────
// Nutzt dieselbe fastCheckForScanIsNeeded()-Routine wie der Tab-Wechsel-Check,
// macht bei neuen Favoriten aber einen Incremental-Scan (searchNewPages) statt
// eines Reloads. scanInProgress-Guard verhindert Überlagerung mit einem
// laufenden manuellen Scan. Intervall in localStorage 'autoScan':
// 'off' | '5min' | '15min' (wird über das Cache-Panel in ui.js gesetzt).
const AUTO_SCAN_INTERVALS = { '5min': 5 * 60 * 1000, '15min': 15 * 60 * 1000 };

async function autoScanCheck() {
  if (document.visibilityState !== 'visible') return;
  if (state.scanInProgress) return;
  try {
    const hasNew = await fastCheckForScanIsNeeded();
    // fastCheckForScanIsNeeded hat state.actualFavCount bereits auf den
    // aktuellen Wert gesetzt – der Scan plant damit die richtige Seitenzahl.
    if (hasNew && !state.scanInProgress) {
      state.needScan = true;
      state.fullScan = false;
      // scan() setzt den FortschrittsGuard und erzeugt den AbortController.
      await scan();
    }
  } catch (err) {
    console.error('Auto-Scan fehlgeschlagen:', err);
  }
}

export function applyAutoScanSetting() {
  if (state.autoScanTimer) { clearInterval(state.autoScanTimer); state.autoScanTimer = null; }
  const ms = AUTO_SCAN_INTERVALS[state.autoScanInterval];
  if (ms) state.autoScanTimer = setInterval(autoScanCheck, ms);
}

export function initAutoScan() {
  const saved = localStorage.getItem('autoScan');
  state.autoScanInterval = (saved && AUTO_SCAN_INTERVALS[saved.replace(/"/g, '')]) ? saved.replace(/"/g, '') : 'off';
  applyAutoScanSetting();
}

// ── init ────────────────────────────────────────────────────────────────────
async function init() {
  createHeaderUI();
  initAutoScan();
  document.addEventListener('click', function (e) {
    const target = e.target.closest('a');
    if (target?.getAttribute('onclick')?.includes('favorites&s=delete')) {
      const m = target.getAttribute('onclick').match(/id=(\d+)/);
      if (m) { removeFromAdditionalQueue(m[1]); addToRemovalQueue(m[1]); }
    }
  }, true);
  document.addEventListener('visibilitychange', visibilityChangeHandler);
  try {
    // Primärquelle ist die Pagination der aktuellen Seite: Sie liefert die
    // Seitenzahl ohne zusätzlichen Request und kann nicht an Cloudflare
    // scheitern. Nur ohne Pagination wird der Profil-Count gefragt.
    const pageCount = favoritePageCountFromDocument();
    let favoritesCount = null;
    state.favCountEstimated = false;
    if (pageCount) {
      favoritesCount = pageCount * FAVORITES_PER_PAGE;
      state.favCountEstimated = true;
    } else {
      favoritesCount = await getFavoritesCount(state.userId);
      if (!Number.isFinite(favoritesCount) || favoritesCount < 0) {
        state.actualFavCount = null;
        state.needScan = true;
        state.fullScan = true;
        displayScanStatus('favorites count unavailable – click Search');
        return;
      }
    }
    state.actualFavCount = favoritesCount;
    // Bei geschätztem Count bleibt favCountOnLastUpdate leer: sonst würde der
    // Tab-Wechsel-Check die Rundungsdifferenz (84800 ≠ 84769) als "neue
    // Favoriten" werten und die Seite wiederholt neu laden.
    if (!state.favCountEstimated) state.favCountOnLastUpdate = favoritesCount;

    // Wir warten sauber mit einem Promise, bis loadAllImages fertig geladen und migriert hat
    const loadedImgs = await new Promise(resolve => loadAllImagesFromIndexedDB(resolve));

    const removalSet = new Set(getRemovalQueue());
    state.loadedImages = loadedImgs.filter(img => !removalSet.has(img.id));

    // Ein unterbrochener Voll-Scan liegt als Teilfortschritt in IndexedDB und
    // wird beim nächsten Search fortgesetzt statt bei Seite 0 zu beginnen.
    const partial = await loadPartialScan();
    const partialPages = Array.isArray(partial?.loadedPages) ? partial.loadedPages.length : 0;
    if (partial && String(partial.userId) === String(state.userId) && partialPages > 0) {
      state.partialScanInfo = { loaded: partialPages, total: partial.totalPages };
      state.needScan = true;
      state.fullScan = true;
      displayScanStatus(`scan incomplete (${partialPages}/${partial.totalPages}) – click Search to resume`);
      refreshCacheInfo();
      return;
    }

    state.needScan = true;
    state.fullScan = true;

    if (state.prevUserId) {
      if (state.userId === state.prevUserId) {
        if (state.prevFavCount > 0 && state.loadedImages.length > 0) {
          state.fullScan = false;
          const loadedFirstId = state.loadedImages[0].id;

          async function getFirstIdCheck() {
            const pid = new URLSearchParams(window.location.search).get('pid');
            return (pid === '0' || pid === null)
              ? document
              : await fetchFavoritesPage(0);
          }

          const pageDoc = await getFirstIdCheck();
          const firstThumb = pageDoc?.querySelector('.thumb img');
          const actualFirstId = getPostIdFromLink(firstThumb?.parentElement?.href);
          if (!actualFirstId) {
            displayScanStatus('need scan');
            return;
          }
          // Bei geschätztem Count ist der Zahlenvergleich wertlos (Seitengrenze
          // statt exakter Anzahl) – dann entscheidet nur die erste ID.
          const countDiffers = !state.favCountEstimated && favoritesCount !== state.prevFavCount;
          if ((loadedFirstId !== actualFirstId && !state.fromBack) || countDiffers) {
            displayScanStatus('scanned (new)');
            refreshCacheInfo();
          } else {
            state.needScan = false;
            state.allImages = state.loadedImages;
            state.allImageIds = new Set(state.loadedImages.map(img => img.id));
            displayScanStatus('scanned');
            refreshCacheInfo();
          }
        } else {
          displayScanStatus('need scan');
        }
      } else {
        displayScanStatus('new user');
      }
    } else {
      displayScanStatus('need scan');
    }
  } catch (e) {
    console.error("Fehler während der Initialisierung:", e);
  }
}

// ── Entry Points ────────────────────────────────────────────────────────────
if (pageType === PageType.FAVORITE_VIEW) {
  state.userId = getIdFromUrl();
  loadSavedData();
  highlightFavs();
  init();
} else if (pageType === PageType.POST_LIST) {
  highlightFavs();
} else if (pageType === PageType.POST_VIEW) {
  highlightFavs();
}