// core.js – PageType, gemeinsamer State und pure Helfer.
// Der komplette modul-übergreifende Zustand lebt zentral im `state`-Objekt,
// damit alle Module denselben Datenstand teilen (Ein-Datei-Verhalten).

// ── Konstanten ──────────────────────────────────────────────────────────────
export const DB_NAME = 'R34FavDB';
export const STORE_NAME = 'favoritesStore';
export const CACHE_VERSION = 4;

// ── PageType ────────────────────────────────────────────────────────────────
export const PageType = {
  FAVORITE_VIEW: 'FAVORITE_VIEW',
  POST_LIST:     'POST_LIST',
  POST_VIEW:     'POST_VIEW',
  UNKNOWN:       'UNKNOWN',
};
export function getPageType() {
  const url = window.location.href;
  if (url.includes('page=favorites&s=view&id=')) return PageType.FAVORITE_VIEW;
  if (url.includes('page=post&s=list'))          return PageType.POST_LIST;
  if (url.includes('page=post&s=view'))          return PageType.POST_VIEW;
  return PageType.UNKNOWN;
}
export const pageType = getPageType();

// ── Shared State ────────────────────────────────────────────────────────────
export const state = {
  allImages: [],
  loadedImages: [],
  images: undefined,
  results: [],
  allImageIds: new Set(),
  resultIds: new Set(),
  fromBack: false,
  needScan: false,
  fullScan: false,
  actualFavCount: undefined,
  // true, wenn actualFavCount nur aus der Seitenzahl der Favoriten-Seite
  // abgeleitet ist (Profil-Count nicht abrufbar) – dann nie als Baseline speichern.
  favCountEstimated: false,
  scanProgress: null,     // { loaded, total, startedAt } während eines pagedFetch
  partialScanInfo: null,  // { loaded, total } eines unterbrochenen Scans (IndexedDB)
  lastScanError: null,    // letzter Netzwerk-/Seitenfehler für das Cache-Panel
  prevFavCount: undefined,
  appendLoadedSave: false,
  prevUserId: undefined,
  lastImageId: undefined,
  userId: undefined,
  borderFavs: true,
  queueSaveTimeout: null,
  removalQueueCache: new Set(),
  additionalQueueCache: new Set(),
  scanInProgress: false,
  scanIncomplete: false,
  scanAbortController: null,
  failedScanPages: new Set(),
  searchButton: null,
  retryButton: null,
  cancelButton: null,
  undoButton: null,
  lastRemoved: null,
  favCountOnLastUpdate: undefined,
  indexedDbImagesPromise: null,
  // ── Feature-State (v4.29) ─────────────────────────────────────────────────
  // newSinceLastScan wird von scan.js bei jedem abgeschlossenen Scan aus dem
  // Cache-Vergleich befüllt (Diff-Modus in ui.js).
  showOnlyNew: false,
  newSinceLastScan: new Set(), // IDs, die beim letzten Scan neu hinzukamen
  baseResults: null,           // unsortierte Basisliste für "Original"-Sortierung
  autoScanInterval: 'off',     // 'off' | '5min' | '15min' (localStorage: autoScan)
  autoScanTimer: null,         // setInterval-Handle des Auto-Scans
  newButton: null,             // Diff-Modus-Toggle (4a)
};

// ── Pure Helfer ─────────────────────────────────────────────────────────────
export function getIdFromUrl() {
  const url   = window.location.href;
  const idx   = url.indexOf('id=');
  if (idx === -1) return null;
  const start = idx + 3;
  const end   = url.indexOf('&', start);
  return url.substring(start, end === -1 ? url.length : end);
}
export function getPostIdFromLink(link) {
  if (!link) return null;
  try {
    return new URL(link, document.baseURI).searchParams.get('id');
  } catch {
    return link.match(/[?&]id=([^&]+)/)?.[1] || null;
  }
}
export function getImageId(image) {
  if (!image) return null;

  const link = typeof image.link === 'string'
  ? image.link
  : image.closest?.('a[href]')?.href;
  const linkedId = getPostIdFromLink(link);
  if (linkedId) return String(linkedId);

  // Cached entries already have their post ID as a plain data property.
  if (!image.closest && image.id !== undefined && image.id !== null) {
    const cachedId = String(image.id);
    if (/^\d+$/.test(cachedId)) return cachedId;
  }

  return getThumbImgId(image);
}
export function getThumbImgId(img) {
  const link = img?.closest?.('a[href]');
  const postId = getPostIdFromLink(link?.href);
  if (postId) return String(postId);

  // Fallback für alte/ungewöhnliche Markup-Strukturen ohne Post-Link.
  // Nur eine rein numerische ID akzeptieren; Query-Strings wie `v=...`
  // dürfen nicht als Post-ID in den Cache gelangen.
  const legacyId = img?.src?.split('?')[1];
  return /^\d+$/.test(legacyId || '') ? legacyId : null;
}
export function parseStoredJson(value, fallback) {
  if (!value || value === 'undefined') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
export function parseFavoriteCount(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const count = Number(digits);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}
// Seitenzahl aus dem höchsten pid der Favoriten-Pagination: pid zählt in
// 50er-Schritten, floor(pid / perPage) ist die nullbasierte letzte Seite.
// Pure Funktion, damit die Pagination-Quelle ohne DOM testbar ist.
export function favoritePageCountFromPid(maxPid, perPage = 50) {
  const pid = Number(maxPid);
  if (!Number.isFinite(pid) || pid < 0 || !Number.isFinite(perPage) || perPage < 1) return null;
  const pages = Math.floor(pid / perPage) + 1;
  return Number.isSafeInteger(pages) && pages > 0 ? pages : null;
}
// Index der ID im (absteigend sortierten) Cache – Basis für die Grenze des
// inkrementellen Scans. Funktioniert für Cache-Objekte (id) und DOM-Bilder
// (link), ohne dass der Aufrufer beide Formen kennen muss.
export function indexOfCachedId(images, id) {
  if (!Array.isArray(images) || id === null || id === undefined) return -1;
  const target = String(id);
  return images.findIndex(img => String(img?.id ?? getPostIdFromLink(img?.link)) === target);
}

export function normalizeCacheImages(payload) {
  if (Array.isArray(payload)) return payload.filter(image => image && image.id);
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.images)) return [];
  const version = Number(payload.version);
  if (Number.isFinite(version) && version > CACHE_VERSION) return [];
  return payload.images.filter(image => image && image.id);
}
