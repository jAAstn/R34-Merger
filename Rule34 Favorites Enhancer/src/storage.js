// storage.js – Daten-Schicht: IndexedDB (Favoriten-Cache) + localStorage-Queues.
import {
  state, DB_NAME, STORE_NAME, CACHE_VERSION,
  getImageId, normalizeCacheImages, parseStoredJson,
} from './core.js';

// ── IndexedDB Wrapper ───────────────────────────────────────────────────────
// Eine offene Connection wird gecacht statt bei jedem idbGet/idbSet neu
// geöffnet (vorher: new Connection pro Transaction). Bei Fehler/Close wird
// der Cache verworfen – der Identity-Check verhindert, dass eine alte,
// sterbende Connection eine frisch gecachte wegwirft.
let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  const current = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close(); // löst onclose → Cache-Reset aus
      db.onclose = () => { if (dbPromise === current) dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => {
      if (dbPromise === current) dbPromise = null;
      reject(request.error);
    };
  });
  dbPromise = current;
  return current;
}

export async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}
export async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function idbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}
export async function loadAllImagesFromIndexedDB(callback) {
  try {
    // Ein globaler Cache-Key wie in v3.0/v3.6. Der Cache wird nicht
    // nach userId aufgeteilt und bleibt dadurch mit den alten Versionen
    // kompatibel. Das aktuelle Payload-Format ist Version 4.
    if (!state.indexedDbImagesPromise) {
      state.indexedDbImagesPromise = (async () => {
        let payload = await idbGet('allImagesPayload');
        if (!payload && state.userId) {
          // Einmalige Rückmigration des v3.6-Keys in den globalen
          // Cache, damit der bestehende Scan weiterverwendet wird.
          payload = await idbGet(`allImagesPayload:${state.userId}`);
          if (payload) await idbSet('allImagesPayload', payload);
        }
        if (!payload) return [];

        const normalizedImages = normalizeCacheImages(payload);
        if (!normalizedImages.length && payload.images?.length) return [];

        if (!Array.isArray(payload) && Number(payload.version) !== CACHE_VERSION) {
          await idbSet('allImagesPayload', {
            ...payload,
            version: CACHE_VERSION,
            images: normalizedImages
          });
        }
        return normalizedImages;
      })();
    }

    callback(await state.indexedDbImagesPromise);
  } catch (e) {
    console.error("Fehler beim Laden (IDB):", e);
    callback([]);
  }
}
// Cache-Eintrag aus einem DOM-<img> oder einem bereits gecachten Objekt.
// `page` ist optional (alte Caches haben es nicht) und wird für den
// fortgesetzten Scan gebraucht, um die Seitenreihenfolge wiederherzustellen.
function mapImageForCache(img) {
  if (!img) return null;
  const id = getImageId(img);
  if (!id) return null;
  const src = typeof img.getAttribute === 'function' ? img.getAttribute('src') : img.src;
  const page = Number.isFinite(img.__r34Page)
    ? img.__r34Page
    : (Number.isFinite(img.page) ? img.page : null);
  return { src, link: `index.php?page=post&s=view&id=${id}`, id, score: img.score, page };
}

// Gibt die Anzahl der tatsächlich geschriebenen Einträge zurück. Nur diese Zahl
// taugt als Baseline für prevFavCount: Bei inkrementellen Scans enthält
// state.allImages ausschließlich die neu geladenen Seiten.
export async function saveAllImagesToIndexedDB() {
  // v4.31: nur Felder, die das Script auch verwendet. Die API liefert zwar
  // deutlich mehr zurück, aber rating/fileURL/previewURL/width/height wurden
  // nie angezeigt – sie wucherten nur im Cache.
  const data = state.allImages.map(mapImageForCache).filter(Boolean);
  if (state.appendLoadedSave) {
    data.push(...state.loadedImages.map(mapImageForCache).filter(Boolean));
  }
  const payload = {
    version: CACHE_VERSION,
    userId: state.userId,
    updatedAt: Date.now(),
    images: data
  };
  try {
    await idbSet('allImagesPayload', payload);
  } catch (e) {
    console.error('Speichern in IndexedDB fehlgeschlagen:', e);
    throw e;
  }
  return data.length;
}

// ── Teilfortschritt eines unterbrochenen Scans ──────────────────────────────
// Eigener Key, damit der reguläre Cache unangetastet bleibt: bricht ein
// 1696-Seiten-Scan ab (Cancel, Reload, Absturz), gehen die bereits geladenen
// Seiten nicht verloren und werden beim nächsten Voll-Scan übersprungen.
const PARTIAL_SCAN_KEY = 'scanPartial';

export async function savePartialScan({ totalPages, loadedPages }) {
  const images = state.allImages.map(mapImageForCache).filter(Boolean);
  await idbSet(PARTIAL_SCAN_KEY, {
    userId: state.userId,
    totalPages,
    loadedPages: [...loadedPages],
    updatedAt: Date.now(),
    images,
  });
  return images.length;
}

export async function loadPartialScan() {
  try {
    return await idbGet(PARTIAL_SCAN_KEY);
  } catch (e) {
    console.warn('Teilfortschritt konnte nicht gelesen werden:', e?.message || e);
    return null;
  }
}

export async function clearPartialScan() {
  try {
    await idbDelete(PARTIAL_SCAN_KEY);
    return true;
  } catch (e) {
    console.warn('Teilfortschritt konnte nicht gelöscht werden:', e?.message || e);
    return false;
  }
}

// ── localStorage + Cookie Snapshot (Export/Import) ─────────────────────────
// Alle Keys, die das Script selbst anlegt (Queues, Einstellungen, userId),
// plus der rule34-Session-Cookie `user_id`. Fremde Keys bleiben unberührt.
const SNAPSHOT_LS_KEYS = ['removalQueue', 'additionalQueue', 'fromBack', 'prevFavCount', 'userId', 'borderFavs'];
const SNAPSHOT_COOKIE_NAMES = ['user_id'];

export function collectStorageSnapshot() {
  const snapshot = {};
  for (const key of SNAPSHOT_LS_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  const cookies = document.cookie ? Object.fromEntries(
    document.cookie.split(';').map(c => c.trim()).filter(Boolean).map(c => {
      const i = c.indexOf('=');
      return [c.slice(0, i), c.slice(i + 1)];
    }),
  ) : {};
  for (const name of SNAPSHOT_COOKIE_NAMES) {
    if (cookies[name] !== undefined) snapshot[name] = cookies[name];
  }
  return snapshot;
}

export function restoreStorageSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  for (const [key, value] of Object.entries(snapshot)) {
    if (key === 'user_id') {
      document.cookie = `user_id=${value}; path=/; domain=.rule34.xxx; max-age=31536000; SameSite=Lax`;
    } else if (SNAPSHOT_LS_KEYS.includes(key)) {
      localStorage.setItem(key, String(value));
    }
  }
}

// ── Gespeicherte Einstellungen ──────────────────────────────────────────────
export function loadSavedData() {
  const savedborderFavs = localStorage.getItem('borderFavs');
  state.borderFavs = parseStoredJson(savedborderFavs, true);

  const scopedFromBackKey = state.userId ? `fromBack:${state.userId}` : null;
  const savedFromBack = localStorage.getItem('fromBack')
  ?? (scopedFromBackKey ? localStorage.getItem(scopedFromBackKey) : null);
  state.fromBack = parseStoredJson(savedFromBack, false);
  localStorage.removeItem('fromBack');
  if (scopedFromBackKey) localStorage.removeItem(scopedFromBackKey);

  const savedPrevFavCount = localStorage.getItem('prevFavCount')
  ?? (state.userId ? localStorage.getItem(`prevFavCount:${state.userId}`) : null);
  state.prevFavCount = parseStoredJson(savedPrevFavCount, 0);

  state.prevUserId = loadSavedUserId();
}
export function loadSavedUserId() {
  const saved = localStorage.getItem('userId')
  ?? (state.userId ? localStorage.getItem(`userId:${state.userId}`) : null);
  return parseStoredJson(saved, null);
}

// ── Queues (Optimized Cross-Tab Sync & Type-Safe) ───────────────────────────
export function getStoredQueue(key) {
  const raw = localStorage.getItem(key)
  ?? (state.userId ? localStorage.getItem(`${key}:${state.userId}`) : null);
  const value = parseStoredJson(raw, []);
  return Array.isArray(value) ? value : [];
}
export function getRemovalQueue() {
  const stored = getStoredQueue('removalQueue');
  state.removalQueueCache.forEach(id => stored.push(id));
  return [...new Set(stored.map(String))]; // WICHTIG: Alles in Strings umwandeln
}
export function clearRemovalQueue() {
  state.removalQueueCache.clear();
  localStorage.removeItem('removalQueue');
}
export function addToRemovalQueue(id) {
  state.removalQueueCache.add(String(id)); // WICHTIG: Als String speichern
  saveQueuesDebounced();
}
export function removeFromRemovalQueue(id) {
  const strId = String(id);
  state.removalQueueCache.delete(strId);
  let stored = getStoredQueue('removalQueue');
  stored = stored.filter(x => String(x) !== strId);
  localStorage.setItem('removalQueue', JSON.stringify(stored));
}
export function getAdditionalQueue() {
  const stored = getStoredQueue('additionalQueue');
  state.additionalQueueCache.forEach(id => stored.push(id));
  return [...new Set(stored.map(String))]; // WICHTIG: Alles in Strings umwandeln
}
export function clearAdditionalQueue() {
  state.additionalQueueCache.clear();
  localStorage.removeItem('additionalQueue');
}
export function addToAdditionalQueue(id) {
  state.additionalQueueCache.add(String(id)); // WICHTIG: Als String speichern
  saveQueuesDebounced();
}
export function removeFromAdditionalQueue(id) {
  const strId = String(id);
  state.additionalQueueCache.delete(strId);
  let stored = getStoredQueue('additionalQueue');
  stored = stored.filter(x => String(x) !== strId);
  localStorage.setItem('additionalQueue', JSON.stringify(stored));
}
export function saveQueuesDebounced() {
  if (state.queueSaveTimeout) clearTimeout(state.queueSaveTimeout);
  state.queueSaveTimeout = setTimeout(() => {
    if (state.removalQueueCache.size > 0) {
      const stored = new Set(getStoredQueue('removalQueue').map(String));
      state.removalQueueCache.forEach(id => stored.add(String(id)));
      localStorage.setItem('removalQueue', JSON.stringify([...stored]));
      state.removalQueueCache.clear();
    }
    if (state.additionalQueueCache.size > 0) {
      const stored = new Set(getStoredQueue('additionalQueue').map(String));
      state.additionalQueueCache.forEach(id => stored.add(String(id)));
      localStorage.setItem('additionalQueue', JSON.stringify([...stored]));
      state.additionalQueueCache.clear();
    }
  }, 500);
}