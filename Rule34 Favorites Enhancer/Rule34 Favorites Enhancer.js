// ==UserScript==
// @name         Rule34 Favorites Enhancer
// @namespace    jAstn
// @author       It's a Me, jAstn!
// @version      4.35
// @description  Favoriten hervorheben, alle laden & sortieren (Score/Random) – direkt in der rule34-Galerie
// @match        https://rule34.xxx/index.php?page=post&s=list*
// @match        https://rule34.xxx/index.php?page=post&s=view&id=*
// @match        https://rule34.xxx/index.php?page=favorites&s=view&id=*
// @match        https://rule34.xxx/index.php?page=pool&s=show&id=*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAABOAACBEBD/UVH///9FPR7/AAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC
// @tag          Eigene Scripts
// @grant        unsafeWindow
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
    'use strict';

(() => {
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // src/core.js
  var DB_NAME = "R34FavDB";
  var STORE_NAME = "favoritesStore";
  var CACHE_VERSION = 4;
  var PageType = {
    FAVORITE_VIEW: "FAVORITE_VIEW",
    POST_LIST: "POST_LIST",
    POST_VIEW: "POST_VIEW",
    UNKNOWN: "UNKNOWN"
  };
  function getPageType() {
    const url = window.location.href;
    if (url.includes("page=favorites&s=view&id=")) return PageType.FAVORITE_VIEW;
    if (url.includes("page=post&s=list")) return PageType.POST_LIST;
    if (url.includes("page=post&s=view")) return PageType.POST_VIEW;
    return PageType.UNKNOWN;
  }
  var pageType = getPageType();
  var state = {
    allImages: [],
    loadedImages: [],
    images: void 0,
    results: [],
    allImageIds: /* @__PURE__ */ new Set(),
    resultIds: /* @__PURE__ */ new Set(),
    fromBack: false,
    needScan: false,
    fullScan: false,
    actualFavCount: void 0,
    // true, wenn actualFavCount nur aus der Seitenzahl der Favoriten-Seite
    // abgeleitet ist (Profil-Count nicht abrufbar) – dann nie als Baseline speichern.
    favCountEstimated: false,
    scanProgress: null,
    // { loaded, total, startedAt } während eines pagedFetch
    partialScanInfo: null,
    // { loaded, total } eines unterbrochenen Scans (IndexedDB)
    lastScanError: null,
    // letzter Netzwerk-/Seitenfehler für das Cache-Panel
    prevFavCount: void 0,
    appendLoadedSave: false,
    prevUserId: void 0,
    lastImageId: void 0,
    userId: void 0,
    borderFavs: true,
    queueSaveTimeout: null,
    removalQueueCache: /* @__PURE__ */ new Set(),
    additionalQueueCache: /* @__PURE__ */ new Set(),
    scanInProgress: false,
    scanIncomplete: false,
    scanAbortController: null,
    failedScanPages: /* @__PURE__ */ new Set(),
    searchButton: null,
    retryButton: null,
    cancelButton: null,
    undoButton: null,
    lastRemoved: null,
    favCountOnLastUpdate: void 0,
    indexedDbImagesPromise: null,
    // ── Feature-State (v4.29) ─────────────────────────────────────────────────
    // newSinceLastScan wird von scan.js bei jedem abgeschlossenen Scan aus dem
    // Cache-Vergleich befüllt (Diff-Modus in ui.js).
    showOnlyNew: false,
    newSinceLastScan: /* @__PURE__ */ new Set(),
    // IDs, die beim letzten Scan neu hinzukamen
    baseResults: null,
    // unsortierte Basisliste für "Original"-Sortierung
    autoScanInterval: "off",
    // 'off' | '5min' | '15min' (localStorage: autoScan)
    autoScanTimer: null,
    // setInterval-Handle des Auto-Scans
    newButton: null
    // Diff-Modus-Toggle (4a)
  };
  function getIdFromUrl() {
    const url = window.location.href;
    const idx = url.indexOf("id=");
    if (idx === -1) return null;
    const start = idx + 3;
    const end = url.indexOf("&", start);
    return url.substring(start, end === -1 ? url.length : end);
  }
  function getPostIdFromLink(link) {
    if (!link) return null;
    try {
      return new URL(link, document.baseURI).searchParams.get("id");
    } catch {
      return link.match(/[?&]id=([^&]+)/)?.[1] || null;
    }
  }
  function getImageId(image) {
    if (!image) return null;
    const link = typeof image.link === "string" ? image.link : image.closest?.("a[href]")?.href;
    const linkedId = getPostIdFromLink(link);
    if (linkedId) return String(linkedId);
    if (!image.closest && image.id !== void 0 && image.id !== null) {
      const cachedId = String(image.id);
      if (/^\d+$/.test(cachedId)) return cachedId;
    }
    return getThumbImgId(image);
  }
  function getThumbImgId(img) {
    const link = img?.closest?.("a[href]");
    const postId = getPostIdFromLink(link?.href);
    if (postId) return String(postId);
    const legacyId = img?.src?.split("?")[1];
    return /^\d+$/.test(legacyId || "") ? legacyId : null;
  }
  function parseStoredJson(value, fallback) {
    if (!value || value === "undefined") return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  function parseFavoriteCount(value) {
    const digits = String(value ?? "").replace(/[^0-9]/g, "");
    if (!digits) return null;
    const count = Number(digits);
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
  }
  function favoritePageCountFromPid(maxPid, perPage = 50) {
    const pid = Number(maxPid);
    if (!Number.isFinite(pid) || pid < 0 || !Number.isFinite(perPage) || perPage < 1) return null;
    const pages = Math.floor(pid / perPage) + 1;
    return Number.isSafeInteger(pages) && pages > 0 ? pages : null;
  }
  function indexOfCachedId(images, id) {
    if (!Array.isArray(images) || id === null || id === void 0) return -1;
    const target = String(id);
    return images.findIndex((img) => String(img?.id ?? getPostIdFromLink(img?.link)) === target);
  }
  function normalizeCacheImages(payload) {
    if (Array.isArray(payload)) return payload.filter((image) => image && image.id);
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.images)) return [];
    const version = Number(payload.version);
    if (Number.isFinite(version) && version > CACHE_VERSION) return [];
    return payload.images.filter((image) => image && image.id);
  }

  // src/storage.js
  var dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    const current = new Promise((resolve, reject) => {
      const request2 = indexedDB.open(DB_NAME, 1);
      request2.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request2.onsuccess = () => {
        const db = request2.result;
        db.onversionchange = () => db.close();
        db.onclose = () => {
          if (dbPromise === current) dbPromise = null;
        };
        resolve(db);
      };
      request2.onerror = () => {
        if (dbPromise === current) dbPromise = null;
        reject(request2.error);
      };
    });
    dbPromise = current;
    return current;
  }
  async function idbSet(key, val) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }
  async function idbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request2 = store.get(key);
      request2.onsuccess = () => resolve(request2.result);
      request2.onerror = () => reject(request2.error);
    });
  }
  async function idbDelete(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }
  async function loadAllImagesFromIndexedDB(callback) {
    try {
      if (!state.indexedDbImagesPromise) {
        state.indexedDbImagesPromise = (async () => {
          let payload = await idbGet("allImagesPayload");
          if (!payload && state.userId) {
            payload = await idbGet(`allImagesPayload:${state.userId}`);
            if (payload) await idbSet("allImagesPayload", payload);
          }
          if (!payload) return [];
          const normalizedImages = normalizeCacheImages(payload);
          if (!normalizedImages.length && payload.images?.length) return [];
          if (!Array.isArray(payload) && Number(payload.version) !== CACHE_VERSION) {
            await idbSet("allImagesPayload", {
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
  function mapImageForCache(img) {
    if (!img) return null;
    const id = getImageId(img);
    if (!id) return null;
    const src = typeof img.getAttribute === "function" ? img.getAttribute("src") : img.src;
    const page = Number.isFinite(img.__r34Page) ? img.__r34Page : Number.isFinite(img.page) ? img.page : null;
    return { src, link: `index.php?page=post&s=view&id=${id}`, id, score: img.score, page };
  }
  async function saveAllImagesToIndexedDB() {
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
      await idbSet("allImagesPayload", payload);
    } catch (e) {
      console.error("Speichern in IndexedDB fehlgeschlagen:", e);
      throw e;
    }
    return data.length;
  }
  var PARTIAL_SCAN_KEY = "scanPartial";
  async function savePartialScan({ totalPages, loadedPages }) {
    const images = state.allImages.map(mapImageForCache).filter(Boolean);
    await idbSet(PARTIAL_SCAN_KEY, {
      userId: state.userId,
      totalPages,
      loadedPages: [...loadedPages],
      updatedAt: Date.now(),
      images
    });
    return images.length;
  }
  async function loadPartialScan() {
    try {
      return await idbGet(PARTIAL_SCAN_KEY);
    } catch (e) {
      console.warn("Teilfortschritt konnte nicht gelesen werden:", e?.message || e);
      return null;
    }
  }
  async function clearPartialScan() {
    try {
      await idbDelete(PARTIAL_SCAN_KEY);
      return true;
    } catch (e) {
      console.warn("Teilfortschritt konnte nicht gel\xF6scht werden:", e?.message || e);
      return false;
    }
  }
  var SNAPSHOT_LS_KEYS = ["removalQueue", "additionalQueue", "fromBack", "prevFavCount", "userId", "borderFavs"];
  var SNAPSHOT_COOKIE_NAMES = ["user_id"];
  function collectStorageSnapshot() {
    const snapshot = {};
    for (const key of SNAPSHOT_LS_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) snapshot[key] = value;
    }
    const cookies = document.cookie ? Object.fromEntries(
      document.cookie.split(";").map((c) => c.trim()).filter(Boolean).map((c) => {
        const i = c.indexOf("=");
        return [c.slice(0, i), c.slice(i + 1)];
      })
    ) : {};
    for (const name of SNAPSHOT_COOKIE_NAMES) {
      if (cookies[name] !== void 0) snapshot[name] = cookies[name];
    }
    return snapshot;
  }
  function restoreStorageSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return;
    for (const [key, value] of Object.entries(snapshot)) {
      if (key === "user_id") {
        document.cookie = `user_id=${value}; path=/; domain=.rule34.xxx; max-age=31536000; SameSite=Lax`;
      } else if (SNAPSHOT_LS_KEYS.includes(key)) {
        localStorage.setItem(key, String(value));
      }
    }
  }
  function loadSavedData() {
    const savedborderFavs = localStorage.getItem("borderFavs");
    state.borderFavs = parseStoredJson(savedborderFavs, true);
    const scopedFromBackKey = state.userId ? `fromBack:${state.userId}` : null;
    const savedFromBack = localStorage.getItem("fromBack") ?? (scopedFromBackKey ? localStorage.getItem(scopedFromBackKey) : null);
    state.fromBack = parseStoredJson(savedFromBack, false);
    localStorage.removeItem("fromBack");
    if (scopedFromBackKey) localStorage.removeItem(scopedFromBackKey);
    const savedPrevFavCount = localStorage.getItem("prevFavCount") ?? (state.userId ? localStorage.getItem(`prevFavCount:${state.userId}`) : null);
    state.prevFavCount = parseStoredJson(savedPrevFavCount, 0);
    state.prevUserId = loadSavedUserId();
  }
  function loadSavedUserId() {
    const saved = localStorage.getItem("userId") ?? (state.userId ? localStorage.getItem(`userId:${state.userId}`) : null);
    return parseStoredJson(saved, null);
  }
  function getStoredQueue(key) {
    const raw = localStorage.getItem(key) ?? (state.userId ? localStorage.getItem(`${key}:${state.userId}`) : null);
    const value = parseStoredJson(raw, []);
    return Array.isArray(value) ? value : [];
  }
  function getRemovalQueue() {
    const stored = getStoredQueue("removalQueue");
    state.removalQueueCache.forEach((id) => stored.push(id));
    return [...new Set(stored.map(String))];
  }
  function clearRemovalQueue() {
    state.removalQueueCache.clear();
    localStorage.removeItem("removalQueue");
  }
  function addToRemovalQueue(id) {
    state.removalQueueCache.add(String(id));
    saveQueuesDebounced();
  }
  function removeFromRemovalQueue(id) {
    const strId = String(id);
    state.removalQueueCache.delete(strId);
    let stored = getStoredQueue("removalQueue");
    stored = stored.filter((x) => String(x) !== strId);
    localStorage.setItem("removalQueue", JSON.stringify(stored));
  }
  function getAdditionalQueue() {
    const stored = getStoredQueue("additionalQueue");
    state.additionalQueueCache.forEach((id) => stored.push(id));
    return [...new Set(stored.map(String))];
  }
  function clearAdditionalQueue() {
    state.additionalQueueCache.clear();
    localStorage.removeItem("additionalQueue");
  }
  function addToAdditionalQueue(id) {
    state.additionalQueueCache.add(String(id));
    saveQueuesDebounced();
  }
  function removeFromAdditionalQueue(id) {
    const strId = String(id);
    state.additionalQueueCache.delete(strId);
    let stored = getStoredQueue("additionalQueue");
    stored = stored.filter((x) => String(x) !== strId);
    localStorage.setItem("additionalQueue", JSON.stringify(stored));
  }
  function saveQueuesDebounced() {
    if (state.queueSaveTimeout) clearTimeout(state.queueSaveTimeout);
    state.queueSaveTimeout = setTimeout(() => {
      if (state.removalQueueCache.size > 0) {
        const stored = new Set(getStoredQueue("removalQueue").map(String));
        state.removalQueueCache.forEach((id) => stored.add(String(id)));
        localStorage.setItem("removalQueue", JSON.stringify([...stored]));
        state.removalQueueCache.clear();
      }
      if (state.additionalQueueCache.size > 0) {
        const stored = new Set(getStoredQueue("additionalQueue").map(String));
        state.additionalQueueCache.forEach((id) => stored.add(String(id)));
        localStorage.setItem("additionalQueue", JSON.stringify([...stored]));
        state.additionalQueueCache.clear();
      }
    }, 500);
  }

  // src/config.js
  var injectedUserId = true ? "" : "";
  var injectedApiKey = true ? "" : "";
  var API_CONFIG = Object.freeze({
    origin: "https://api.rule34.xxx",
    userId: injectedUserId.trim(),
    apiKey: injectedApiKey.trim(),
    timeoutMs: 15e3,
    maxAttempts: 4,
    maxBackoffMs: 3e4,
    retryBaseMs: 1e3,
    retryJitterMs: 500,
    // v4.35: 450 ms statt 1000 ms pro Request. Gemessen gegen rule34 (6 Seiten,
    // 50 Thumbnails je Seite): 1 s Abstand = 6,3 s, 0,35 s Abstand = 3,2 s – beide
    // vollständig HTTP 200 und ohne CAPTCHA. 450 ms bleibt bewusst über dem
    // gemessenen Minimum (Reserve für längere Läufe über 1696 Seiten).
    page: Object.freeze({
      concurrency: 2,
      minIntervalMs: 450,
      timeoutMs: 2e4
    }),
    metadata: Object.freeze({
      concurrency: 1,
      minIntervalMs: 1e3,
      timeoutMs: 1e4,
      maxItemsPerScan: 5
    })
  });
  function hasApiCredentials() {
    return Boolean(API_CONFIG.userId && API_CONFIG.apiKey);
  }

  // src/api.js
  var RequestError = class extends Error {
    constructor(message, { kind = "network", status = 0, retryAfterMs = 0, cause } = {}) {
      super(message);
      this.name = "RequestError";
      this.kind = kind;
      this.status = status;
      this.retryAfterMs = retryAfterMs;
      if (cause !== void 0) this.cause = cause;
    }
  };
  var AbortError = class extends Error {
    constructor(message = "Request aborted") {
      super(message);
      this.name = "AbortError";
      this.kind = "aborted";
    }
  };
  var RETRYABLE_STATUSES = /* @__PURE__ */ new Set([408, 425, 429, 500, 502, 503, 504]);
  var NO_RETRY_STATUSES = /* @__PURE__ */ new Set([400, 401, 403, 404, 422]);
  var CAPTCHA_MARKER = /Rule34\.xxx CAPTCHA|captcha-box/i;
  var CAPTCHA_COOLDOWN_MS = 3e4;
  var _RateLimiter_instances, acquire_fn, releaseNext_fn, waitForTurn_fn;
  var RateLimiter = class {
    constructor({ concurrency, minIntervalMs }) {
      __privateAdd(this, _RateLimiter_instances);
      if (!Number.isInteger(concurrency) || concurrency < 1) {
        throw new Error("concurrency must be >= 1");
      }
      if (!Number.isFinite(minIntervalMs) || minIntervalMs < 0) {
        throw new Error("minIntervalMs must be >= 0");
      }
      this.concurrency = concurrency;
      this.minIntervalMs = minIntervalMs;
      this.active = 0;
      this.nextStartAt = 0;
      this.queue = [];
    }
    async run(fn, signal) {
      throwIfAborted(signal);
      await __privateMethod(this, _RateLimiter_instances, acquire_fn).call(this, signal);
      try {
        throwIfAborted(signal);
        await __privateMethod(this, _RateLimiter_instances, waitForTurn_fn).call(this, signal);
        return await fn();
      } finally {
        this.active -= 1;
        __privateMethod(this, _RateLimiter_instances, releaseNext_fn).call(this);
      }
    }
    // Sperrt wartende und neue Requests für `ms` – z. B. nach einer
    // Cloudflare-CAPTCHA-Seite, damit nicht alle parallelen Seiten weiterlaufen.
    pauseFor(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return;
      this.nextStartAt = Math.max(this.nextStartAt, Date.now() + ms);
    }
  };
  _RateLimiter_instances = new WeakSet();
  acquire_fn = async function(signal) {
    if (this.active < this.concurrency) {
      this.active += 1;
      return;
    }
    await new Promise((resolve, reject) => {
      const entry = { resolve, reject, signal, onAbort: null };
      if (signal) {
        entry.onAbort = () => {
          const index = this.queue.indexOf(entry);
          if (index !== -1) this.queue.splice(index, 1);
          reject(new AbortError());
        };
        signal.addEventListener("abort", entry.onAbort, { once: true });
      }
      this.queue.push(entry);
    });
  };
  releaseNext_fn = function() {
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry.onAbort) entry.signal?.removeEventListener("abort", entry.onAbort);
      if (entry.signal?.aborted) {
        entry.reject(new AbortError());
        continue;
      }
      this.active += 1;
      entry.resolve();
      return;
    }
  };
  waitForTurn_fn = async function(signal) {
    const now = Date.now();
    const startAt = Math.max(now, this.nextStartAt);
    this.nextStartAt = startAt + this.minIntervalMs;
    const waitMs = startAt - now;
    if (waitMs > 0) await sleep(waitMs, signal);
    throwIfAborted(signal);
  };
  var pageRequestLimiter = new RateLimiter(API_CONFIG.page);
  var metadataRequestLimiter = new RateLimiter(API_CONFIG.metadata);
  function isRetryableStatus(status) {
    return RETRYABLE_STATUSES.has(status);
  }
  function isRetryableError(error) {
    if (isAbortError(error)) return false;
    if (error instanceof TypeError) return true;
    return error instanceof RequestError && (error.kind === "network" || error.kind === "timeout");
  }
  function isAbortError(error) {
    return error instanceof AbortError || error?.name === "AbortError";
  }
  function parseRetryAfter(value, now = Date.now()) {
    if (value === null || value === void 0) return 0;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1e3);
    const date = Date.parse(String(value));
    if (Number.isFinite(date)) return Math.max(0, date - now);
    return 0;
  }
  function getRetryDelayMs(attempt, { retryAfterMs = 0, random = Math.random } = {}) {
    const exponential = API_CONFIG.retryBaseMs * 2 ** Math.max(0, attempt - 1);
    const jitter = Math.floor(random() * API_CONFIG.retryJitterMs);
    return Math.max(retryAfterMs, Math.min(API_CONFIG.maxBackoffMs, exponential + jitter));
  }
  function sleep(ms, signal) {
    if (ms <= 0) {
      throwIfAborted(signal);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      let timer;
      const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        reject(new AbortError());
      };
      timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }
  function throwIfAborted(signal) {
    if (signal?.aborted) throw new AbortError();
  }
  function withTimeout(signal, timeoutMs) {
    const controller = new AbortController();
    let timedOut = false;
    let rejectAbort;
    const abortPromise = new Promise((_, reject) => {
      rejectAbort = reject;
    });
    const onAbort = () => {
      controller.abort();
      rejectAbort(new Error("request aborted"));
    };
    const timer = setTimeout(() => {
      timedOut = true;
      onAbort();
    }, timeoutMs);
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    return {
      signal: controller.signal,
      abortPromise,
      get timedOut() {
        return timedOut;
      },
      cleanup() {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }
    };
  }
  function safeUrlForLog(url) {
    try {
      const parsed = new URL(url);
      for (const key of [...parsed.searchParams.keys()]) {
        if (/key|token|secret|auth/i.test(key)) parsed.searchParams.set(key, "[redacted]");
      }
      return parsed.toString();
    } catch {
      return "[invalid-url]";
    }
  }
  function responseError(response, url) {
    return new RequestError(`HTTP ${response.status} for ${safeUrlForLog(url)}`, {
      kind: response.status >= 400 && response.status < 500 ? "http" : "server",
      status: response.status,
      retryAfterMs: parseRetryAfter(response.headers?.get?.("Retry-After"))
    });
  }
  async function request(url, {
    method = "GET",
    headers = {},
    body,
    signal,
    timeoutMs = API_CONFIG.timeoutMs,
    limiter,
    maxAttempts = API_CONFIG.maxAttempts,
    responseType = "text",
    retryDelay = getRetryDelayMs
  } = {}) {
    const options = { method, headers, body, signal, timeoutMs, maxAttempts, responseType, retryDelay };
    if (limiter) return limiter.run(() => requestWithoutLimiter(url, options), signal);
    return requestWithoutLimiter(url, options);
  }
  async function requestWithoutLimiter(url, options) {
    const {
      method,
      headers,
      body,
      signal,
      timeoutMs,
      maxAttempts,
      responseType,
      retryDelay
    } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      throwIfAborted(signal);
      lastError = null;
      const timeout = withTimeout(signal, timeoutMs);
      try {
        let response;
        try {
          const fetchPromise = fetch(url, {
            method,
            headers,
            body,
            signal: timeout.signal
          });
          response = await Promise.race([fetchPromise, timeout.abortPromise]);
        } catch (error) {
          if (signal?.aborted) throw new AbortError();
          if (isAbortError(error) && !timeout.timedOut) throw new AbortError();
          lastError = timeout.timedOut ? new RequestError(`Request timeout for ${safeUrlForLog(url)}`, { kind: "timeout", cause: error }) : new RequestError(`Network error for ${safeUrlForLog(url)}`, { kind: "network", cause: error });
        }
        if (lastError) {
          if (attempt >= maxAttempts || !isRetryableError(lastError)) throw lastError;
          await sleep(retryDelay(attempt, { retryAfterMs: lastError.retryAfterMs }), signal);
          continue;
        }
        if (!response.ok) {
          const error = responseError(response, url);
          if (NO_RETRY_STATUSES.has(response.status) || !isRetryableStatus(response.status) || attempt >= maxAttempts) {
            throw error;
          }
          lastError = error;
          await sleep(retryDelay(attempt, { retryAfterMs: error.retryAfterMs }), signal);
          continue;
        }
        try {
          const bodyPromise = responseType === "json" ? response.json() : responseType === "blob" ? response.blob() : response.text();
          return await Promise.race([bodyPromise, timeout.abortPromise]);
        } catch (error) {
          if (signal?.aborted) throw new AbortError();
          if (isAbortError(error) && !timeout.timedOut) throw new AbortError();
          if (timeout.timedOut) {
            throw new RequestError(`Request timeout for ${safeUrlForLog(url)}`, {
              kind: "timeout",
              cause: error
            });
          }
          throw new RequestError(`Invalid response body for ${safeUrlForLog(url)}`, {
            kind: "parse",
            cause: error
          });
        }
      } catch (error) {
        if (error instanceof AbortError || error?.name === "AbortError") throw error;
        if (error instanceof RequestError && (error.kind === "http" || error.kind === "parse")) throw error;
        lastError = error;
        if (attempt >= maxAttempts || !isRetryableError(error)) throw error;
        await sleep(retryDelay(attempt), signal);
      } finally {
        timeout.cleanup();
      }
    }
    throw lastError ?? new RequestError(`Request failed for ${safeUrlForLog(url)}`);
  }
  var FAV_COUNT_TTL_MS = 5e3;
  var favCountCache = { uid: null, value: null, at: 0 };
  var favCountInFlight = /* @__PURE__ */ new Map();
  function getFavoritesCount(uid, options = {}) {
    const { force = false, ...requestOptions } = options;
    const key = String(uid);
    const now = Date.now();
    if (!force && favCountCache.uid === key && now - favCountCache.at < FAV_COUNT_TTL_MS) {
      return Promise.resolve(favCountCache.value);
    }
    if (!favCountInFlight.has(key)) {
      const requestPromise = request(
        `https://rule34.xxx/index.php?page=account&s=profile&id=${encodeURIComponent(key)}`,
        { ...requestOptions, limiter: requestOptions.limiter ?? pageRequestLimiter, responseType: "text" }
      ).then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const favLink = Array.from(doc.querySelectorAll("a")).find((a) => a.href.includes("page=favorites&s=view"));
        if (!favLink || favLink.textContent === null) {
          throw new RequestError("Favorites link not found", { kind: "parse" });
        }
        const count = parseFavoriteCount(favLink.textContent);
        favCountCache = { uid: key, value: count, at: Date.now() };
        return count;
      }).catch((error) => {
        if (isAbortError(error)) throw error;
        favCountCache = { uid: key, value: null, at: Date.now() };
        console.error("Error fetching favorites count:", error.message);
        return null;
      }).finally(() => favCountInFlight.delete(key));
      favCountInFlight.set(key, requestPromise);
    }
    return favCountInFlight.get(key);
  }
  async function addFavorite(id, options = {}) {
    try {
      const text = await request(
        `https://rule34.xxx/public/addfav.php?id=${encodeURIComponent(id)}`,
        { ...options, limiter: options.limiter ?? pageRequestLimiter, responseType: "text" }
      );
      return Number.parseInt(text, 10) === 3;
    } catch (error) {
      if (!isAbortError(error)) console.error("Add favorite failed:", error.message);
      return false;
    }
  }
  async function removeFavorite(id, options = {}) {
    try {
      await request(
        `https://rule34.xxx/index.php?page=favorites&s=delete&id=${encodeURIComponent(id)}&return`,
        { ...options, limiter: options.limiter ?? pageRequestLimiter, responseType: "text" }
      );
      return true;
    } catch (error) {
      if (!isAbortError(error)) console.error("Remove favorite failed:", error.message);
      throw error;
    }
  }
  async function fetchFavoritesPage(page, options = {}) {
    const url = `https://rule34.xxx/index.php?page=favorites&s=view&id=${encodeURIComponent(state.userId)}&pid=${page * 50}`;
    try {
      const html = await request(url, {
        ...options,
        limiter: options.limiter ?? pageRequestLimiter,
        responseType: "text",
        timeoutMs: options.timeoutMs ?? API_CONFIG.page.timeoutMs
      });
      if (CAPTCHA_MARKER.test(html)) {
        pageRequestLimiter.pauseFor(CAPTCHA_COOLDOWN_MS);
        throw new RequestError(`CAPTCHA on page ${page}`, { kind: "challenge", status: 200 });
      }
      const doc = new DOMParser().parseFromString(html, "text/html");
      if (!doc.querySelector(".thumb img[src]")) {
        throw new RequestError("Favorites page contains no thumbnails", { kind: "parse" });
      }
      return doc;
    } catch (error) {
      if (isAbortError(error)) throw error;
      state.lastScanError = `page ${page}: ${error.message}`;
      console.error(`Page ${page}: failed after retries.`, error.message);
      return null;
    }
  }
  function buildOfficialPostUrl(id, {
    origin = API_CONFIG.origin,
    userId = API_CONFIG.userId,
    apiKey = API_CONFIG.apiKey
  } = {}) {
    if (!userId || !apiKey) return null;
    const params = new URLSearchParams({
      page: "dapi",
      s: "post",
      q: "index",
      json: "1",
      id: String(id),
      user_id: userId,
      api_key: apiKey
    });
    return `${origin}/index.php?${params.toString()}`;
  }
  function pickPostMetadata(payload, id) {
    const post = Array.isArray(payload) ? payload[0] : Array.isArray(payload?.post) ? payload.post[0] : payload?.post ?? (Array.isArray(payload?.posts) ? payload.posts[0] : payload?.posts);
    if (!post || String(post.id) !== String(id)) return null;
    const score = Number(post.score);
    return { id: String(post.id), score: Number.isFinite(score) ? score : null };
  }
  function selectEnrichmentCandidates(posts, maxItems) {
    if (!Array.isArray(posts)) return [];
    const limit = Number.isFinite(maxItems) && maxItems > 0 ? maxItems : 0;
    return posts.filter((post) => post && (post.score === null || post.score === void 0)).filter((post, index, list) => list.findIndex((other) => String(other.id) === String(post.id)) === index).slice(0, limit);
  }
  async function fetchPostMetadata(id, options = {}) {
    const url = buildOfficialPostUrl(id);
    if (!url) return null;
    const payload = await request(url, {
      ...options,
      limiter: options.limiter ?? metadataRequestLimiter,
      responseType: "json",
      timeoutMs: options.timeoutMs ?? API_CONFIG.metadata.timeoutMs
    });
    return pickPostMetadata(payload, id);
  }
  async function enrichPostMetadata(posts, options = {}) {
    if (!hasApiCredentials() || !Array.isArray(posts) || posts.length === 0) return posts;
    const candidates = selectEnrichmentCandidates(
      posts,
      options.maxItems ?? API_CONFIG.metadata.maxItemsPerScan
    );
    for (const post of candidates) {
      try {
        const metadata = await fetchPostMetadata(post.id, options);
        if (metadata?.score !== null && metadata?.score !== void 0) {
          post.score = metadata.score;
        }
      } catch (error) {
        if (isAbortError(error)) throw error;
        console.warn(`Metadata enrichment failed for post ${post.id}: ${error.message}`);
        if (error.status !== 404) break;
      }
    }
    return posts;
  }

  // src/ui.js
  function displayScanStatus(text) {
    const el = document.getElementById("progress");
    if (el) el.textContent = text;
  }
  function getFilteredResults() {
    let items = state.results || [];
    if (state.showOnlyNew && state.newSinceLastScan.size > 0) {
      items = items.filter((post) => state.newSinceLastScan.has(String(post.id)));
    }
    return items;
  }
  function applyCurrentFiltersAndRender() {
    renderResultsToGalleryChunked(getFilteredResults());
  }
  function createActionButton({ label, color = "#808080", hoverColor = null, marginRight = "10px", marginLeft = null, display = "inline-block" }) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.color = "white";
    btn.style.backgroundColor = color;
    if (marginRight !== null) btn.style.marginRight = marginRight;
    if (marginLeft !== null) btn.style.marginLeft = marginLeft;
    btn.style.padding = "5px 10px";
    btn.style.border = "1px solid #ccc";
    btn.style.borderRadius = "3px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "30px";
    btn.style.display = display;
    if (hoverColor) {
      btn.onmouseover = () => {
        btn.style.backgroundColor = hoverColor;
      };
      btn.onmouseout = () => {
        btn.style.backgroundColor = color;
      };
    }
    return btn;
  }
  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  var galleryObserver = null;
  function renderResultsToGalleryChunked(items = state.results, batchSize = 50) {
    const imageList = document.querySelector("#content > div.image-list");
    if (!imageList) return;
    if (galleryObserver) galleryObserver.disconnect();
    imageList.innerHTML = "";
    let index = 0;
    let isRendering = false;
    const sentinel = document.createElement("div");
    sentinel.id = "lazy-sentinel";
    sentinel.style.height = "1px";
    sentinel.style.margin = "30px auto";
    imageList.appendChild(sentinel);
    function renderChunk() {
      if (isRendering) return;
      isRendering = true;
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < batchSize && index < items.length; i++, index++) {
        const post = items[index];
        const outerSpan = document.createElement("span");
        outerSpan.style.alignSelf = "flex-start";
        outerSpan.style.display = "grid";
        outerSpan.style.gridTemplateRows = "auto 10px";
        outerSpan.style.containIntrinsicSize = "auto 240px";
        const thumb = document.createElement("span");
        thumb.className = "thumb";
        const a = document.createElement("a");
        a.href = post.link;
        a.id = `p${post.id}`;
        a.onclick = function() {
          document.location = post.link;
          return false;
        };
        const img = document.createElement("img");
        img.src = post.src;
        img.alt = "image_thumb";
        img.title = `Score: ${post.score || 0}`;
        img.border = "0";
        img.loading = "lazy";
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        a.appendChild(img);
        thumb.appendChild(a);
        const remove = document.createElement("a");
        remove.href = "#";
        remove.onclick = async function() {
          try {
            await removeFavorite(post.id);
            removeFromAdditionalQueue(post.id);
            addToRemovalQueue(post.id);
            const idx = state.results.indexOf(post);
            if (idx !== -1) state.results.splice(idx, 1);
            state.resultIds.delete(post.id);
            outerSpan.remove();
            state.lastRemoved = post;
            if (state.undoButton) state.undoButton.style.display = "inline-block";
          } catch (e) {
            console.error("Remove failed:", e);
          }
          return false;
        };
        const removeText = document.createElement("b");
        removeText.textContent = "Remove";
        remove.appendChild(removeText);
        outerSpan.appendChild(thumb);
        outerSpan.appendChild(document.createElement("br"));
        outerSpan.appendChild(remove);
        fragment.appendChild(outerSpan);
      }
      imageList.insertBefore(fragment, sentinel);
      isRendering = false;
      if (index >= items.length) {
        galleryObserver.disconnect();
        sentinel.remove();
      }
    }
    galleryObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isRendering) renderChunk();
    });
    galleryObserver.observe(sentinel);
    renderChunk();
  }
  function createHeaderUI() {
    const header = document.getElementById("header");
    const navbar = document.getElementById("navbar");
    if (!header || !navbar) return;
    const inputContainer = document.createElement("div");
    inputContainer.style.marginTop = "-50px";
    inputContainer.style.marginLeft = "0px";
    inputContainer.style.marginBottom = "-5px";
    const sortContainer = document.createElement("div");
    sortContainer.style.display = "inline-block";
    sortContainer.style.marginRight = "10px";
    sortContainer.style.marginLeft = "37%";
    sortContainer.style.position = "sticky";
    [{ label: "Original", value: "original" }, { label: "Score", value: "score" }, { label: "Random", value: "random" }].forEach((sort) => {
      const btn = createActionButton({ label: sort.label, marginRight: null, marginLeft: "5px" });
      btn.addEventListener("click", async () => {
        if (!state.results || state.results.length === 0) {
          const payload = await idbGet("allImagesPayload");
          if (payload && payload.images) {
            const removed = new Set(getRemovalQueue());
            state.results = payload.images.filter((img) => img?.id && !removed.has(String(img.id)));
            state.resultIds = new Set(state.results.map((result) => String(result.id)));
            state.baseResults = [...state.results];
          }
          if (!state.results || state.results.length === 0) {
            alert("Keine Ergebnisse. Bitte zuerst \xFCber Search-Button laden.");
            return;
          }
        }
        if (sort.value === "score") {
          state.results.sort((a, b) => (parseInt(b.score, 10) || 0) - (parseInt(a.score, 10) || 0));
        } else if (sort.value === "random") {
          shuffleInPlace(state.results);
        } else if (state.baseResults) {
          state.results = [...state.baseResults];
        }
        applyCurrentFiltersAndRender();
      });
      sortContainer.appendChild(btn);
    });
    const searchBtn = createActionButton({ label: "Search", color: "#e26c5e", hoverColor: "#c45a4b", marginLeft: "-5px" });
    state.searchButton = searchBtn;
    searchBtn.style.position = "sticky";
    searchBtn.onclick = () => {
      scan();
    };
    const retryBtn = createActionButton({ label: "Retry", color: "#d08a2c", hoverColor: "#b5741f", display: "none" });
    state.retryButton = retryBtn;
    retryBtn.style.position = "sticky";
    retryBtn.onclick = () => {
      retryFailedPages();
    };
    const undoBtn = createActionButton({ label: "Undo", color: "#2e7d32", hoverColor: "#1b5e20", display: "none" });
    state.undoButton = undoBtn;
    undoBtn.onclick = () => {
      undoLastRemoved();
    };
    const cancelBtn = createActionButton({ label: "Cancel", color: "#8a3a3a", hoverColor: "#6e2e2e", display: "none" });
    state.cancelButton = cancelBtn;
    cancelBtn.title = "Laufenden Scan abbrechen (bereits geladene Seiten bleiben im Cache unangetastet)";
    cancelBtn.style.fontSize = "14px";
    cancelBtn.style.padding = "2px 6px";
    cancelBtn.style.verticalAlign = "middle";
    cancelBtn.onclick = () => {
      cancelScan();
    };
    const progress = document.createElement("span");
    progress.id = "progress";
    progress.style.marginLeft = "0px";
    progress.style.fontSize = "25px";
    const newBtn = createActionButton({ label: "New", color: "#6b5a8a", hoverColor: "#584873", marginRight: null, marginLeft: "8px", display: "none" });
    state.newButton = newBtn;
    newBtn.title = "Nur Favoriten anzeigen, die beim letzten Scan neu hinzukamen (Ein/Aus)";
    newBtn.style.fontSize = "14px";
    newBtn.style.padding = "2px 6px";
    newBtn.style.verticalAlign = "middle";
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
    const secondRow = document.createElement("div");
    secondRow.style.position = "absolute";
    secondRow.style.zIndex = "2147482946";
    secondRow.style.left = "100px";
    secondRow.style.top = "12px";
    const exportBtn = createActionButton({ label: "Export", color: "#3f8a54", hoverColor: "#336e44", marginRight: null, marginLeft: "0", display: "inline-block" });
    exportBtn.title = "Favoriten-Cache als JSON exportieren (inkl. localStorage & Cookie user_id)";
    exportBtn.style.fontSize = "14px";
    exportBtn.style.padding = "2px 6px";
    exportBtn.onclick = async () => {
      const payload = await idbGet("allImagesPayload");
      if (!payload || !payload.images || !payload.images.length) {
        alert("Cache ist leer \u2013 nichts zu exportieren.");
        return;
      }
      payload.storage = collectStorageSnapshot();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `r34-favorites-${payload.userId || "export"}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5e3);
    };
    const importBtn = createActionButton({ label: "Import", color: "#3f8a54", hoverColor: "#336e44", marginRight: null, marginLeft: "6px", display: "inline-block" });
    importBtn.title = "Favoriten-Cache aus einer Export-Datei importieren (ersetzt den Cache)";
    importBtn.style.fontSize = "14px";
    importBtn.style.padding = "2px 6px";
    importBtn.onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          const images = Array.isArray(data) ? data : data.images;
          if (!Array.isArray(images) || !images.length || !images.every((img) => img && img.id)) {
            alert("Ung\xFCltige Datei: erwartet wird ein Export mit einem nicht-leeren images-Array.");
            return;
          }
          if (!confirm(`${images.length} Favoriten importieren? Der bestehende Cache wird ersetzt.`)) return;
          const payload = {
            version: CACHE_VERSION,
            userId: data.userId || state.userId,
            updatedAt: Date.now(),
            images
          };
          await idbSet("allImagesPayload", payload);
          state.indexedDbImagesPromise = null;
          restoreStorageSnapshot(data.storage);
          const normalized = images.filter((img) => img && img.id);
          state.loadedImages = normalized;
          state.allImages = normalized;
          state.allImageIds = new Set(normalized.map((img) => String(img.id)));
          state.results = normalized.map((img) => ({ ...img, id: String(img.id) }));
          state.resultIds = new Set(state.results.map((p) => p.id));
          state.baseResults = [...state.results];
          const removalSet2 = new Set(getRemovalQueue());
          const stored = parseStoredJson(localStorage.getItem("prevFavCount"), null);
          state.actualFavCount = Number.isFinite(stored) ? stored : normalized.length;
          state.needScan = false;
          state.fullScan = false;
          localStorage.setItem("prevFavCount", JSON.stringify(state.actualFavCount));
          if (state.userId) localStorage.setItem("userId", JSON.stringify(state.userId));
          state.results = state.results.filter((p) => !removalSet2.has(p.id));
          state.baseResults = state.baseResults.filter((p) => !removalSet2.has(p.id));
          state.resultIds = new Set(state.results.map((p) => p.id));
          displayScanStatus(`imported ${normalized.length} favorites`);
          updateNewButtonState();
          refreshCacheInfo();
          applyCurrentFiltersAndRender();
        } catch (e) {
          alert("Import fehlgeschlagen: " + (e?.message || e));
        }
      };
      input.click();
    };
    const cacheInfoBtn = createActionButton({ label: "\u24D8 Cache", color: "#666", hoverColor: "#555", marginRight: null, marginLeft: "6px", display: "inline-block" });
    cacheInfoBtn.title = "Cache-Status anzeigen";
    cacheInfoBtn.style.fontSize = "14px";
    cacheInfoBtn.style.padding = "2px 6px";
    cacheInfoBtn.onclick = () => {
      toggleCachePanel();
    };
    secondRow.appendChild(exportBtn);
    secondRow.appendChild(importBtn);
    secondRow.appendChild(cacheInfoBtn);
    inputContainer.appendChild(secondRow);
    const cachePanel = document.createElement("div");
    cachePanel.id = "r34-cache-panel";
    cachePanel.style.cssText = "display:none;padding:6px 10px;border:1px solid #888;border-radius:4px;font-size:14px;background:rgb(0 0 0);max-width:640px;position:absolute;z-index:2147482946;left:308px;top:12px";
    inputContainer.appendChild(cachePanel);
    header.insertBefore(inputContainer, navbar.nextSibling);
  }
  async function undoLastRemoved() {
    const post = state.lastRemoved;
    if (!post) return;
    const ok = await addFavorite(post.id);
    if (!ok) {
      console.error("Undo failed: Server-Add fehlgeschlagen");
      return;
    }
    removeFromRemovalQueue(post.id);
    state.lastRemoved = null;
    if (state.undoButton) state.undoButton.style.display = "none";
    if (!state.resultIds.has(post.id)) {
      state.resultIds.add(post.id);
      state.results.unshift(post);
      if (state.baseResults) state.baseResults.unshift(post);
    }
    applyCurrentFiltersAndRender();
  }
  function toggleCachePanel() {
    const panel = document.getElementById("r34-cache-panel");
    if (!panel) return;
    const visible = panel.style.display !== "none";
    panel.style.display = visible ? "none" : "block";
    if (!visible) buildCachePanelContent(panel);
  }
  async function buildCachePanelContent(panel) {
    panel.textContent = "Lade Cache-Info\u2026";
    let payload = null;
    try {
      payload = await idbGet("allImagesPayload");
    } catch {
    }
    panel.textContent = "";
    const lines = document.createElement("div");
    const count = payload?.images?.length ?? 0;
    const updated = payload?.updatedAt ? new Date(payload.updatedAt).toLocaleString() : "nie";
    const line1 = document.createElement("div");
    line1.textContent = `Cache: ${count} Bilder \xB7 letzter Scan: ${updated}`;
    lines.appendChild(line1);
    const countLine = document.createElement("div");
    if (state.favCountEstimated && Number.isFinite(state.actualFavCount) && state.actualFavCount > 0) {
      countLine.textContent = `Favoriten: ${Math.round(state.actualFavCount / 50)} Seiten (Count gesch\xE4tzt aus Pagination)`;
    } else {
      countLine.textContent = `Favoriten: ${Number.isFinite(state.actualFavCount) ? state.actualFavCount : "\u2013"} (exakt)`;
    }
    lines.appendChild(countLine);
    const progressLine = document.createElement("div");
    if (state.scanProgress) {
      progressLine.textContent = `Scan l\xE4uft: ${state.scanProgress.loaded} / ${state.scanProgress.total} Seiten`;
    } else if (state.partialScanInfo) {
      progressLine.textContent = `Unterbrochen: ${state.partialScanInfo.loaded} / ${state.partialScanInfo.total} Seiten (Search setzt fort)`;
    } else {
      progressLine.textContent = "Scan: bereit";
    }
    lines.appendChild(progressLine);
    if (state.lastScanError) {
      const errorLine = document.createElement("div");
      errorLine.textContent = `Letzter Fehler: ${state.lastScanError}`;
      lines.appendChild(errorLine);
    }
    const line2 = document.createElement("div");
    line2.style.marginTop = "4px";
    const label = document.createElement("span");
    label.textContent = "Auto-Scan: ";
    line2.appendChild(label);
    const sel = document.createElement("select");
    sel.style.cssText = "font-size:14px;vertical-align:middle";
    [["off", "Aus"], ["5min", "Alle 5 Minuten"], ["15min", "Alle 15 Minuten"]].forEach(([v, text]) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = text;
      sel.appendChild(opt);
    });
    sel.value = state.autoScanInterval || "off";
    sel.onchange = () => {
      state.autoScanInterval = sel.value;
      localStorage.setItem("autoScan", sel.value);
      applyAutoScanSetting();
    };
    line2.appendChild(sel);
    lines.appendChild(line2);
    const line3 = document.createElement("div");
    line3.style.marginTop = "6px";
    const mkSmall = (labelText, title, onClick) => {
      const b = document.createElement("button");
      b.textContent = labelText;
      b.title = title;
      b.style.cssText = "font-size:13px;padding:2px 8px;margin-right:6px;cursor:pointer";
      b.onclick = onClick;
      return b;
    };
    line3.appendChild(mkSmall("Cache neu scannen", "Erzwingt einen Voll-Scan (Search)", () => {
      state.needScan = true;
      state.fullScan = true;
      scan();
    }));
    line3.appendChild(mkSmall("Cache l\xF6schen", "Leert den Favoriten-Cache und l\xE4dt die Seite neu", async () => {
      if (!confirm("Cache wirklich l\xF6schen? Alle gespeicherten Favoriten-Daten gehen verloren.")) return;
      try {
        await idbDelete("allImagesPayload");
        await clearPartialScan();
      } catch (e) {
        console.error("Cache l\xF6schen fehlgeschlagen:", e);
      }
      ["prevFavCount", "userId", "fromBack", "removalQueue", "additionalQueue"].forEach((k) => localStorage.removeItem(k));
      state.indexedDbImagesPromise = null;
      location.reload();
    }));
    lines.appendChild(line3);
    panel.appendChild(lines);
  }
  function refreshCacheInfo() {
    const panel = document.getElementById("r34-cache-panel");
    if (panel && panel.style.display !== "none") buildCachePanelContent(panel);
  }
  function updateNewButtonState() {
    const btn = state.newButton;
    if (!btn) return;
    const count = state.newSinceLastScan.size;
    if (count === 0 && !state.showOnlyNew) {
      btn.style.display = "none";
      return;
    }
    btn.style.display = "inline-block";
    btn.textContent = state.showOnlyNew ? `New (${count}) \u2715` : `New (${count})`;
    btn.style.backgroundColor = state.showOnlyNew ? "#4a3d63" : "#6b5a8a";
  }

  // src/highlight.js
  var BORDER_COLOR = "#ff0000";
  var BORDER_WIDTH = "2.5px";
  var STYLE_BOXSHADOW = `0 0 0 ${BORDER_WIDTH} ${BORDER_COLOR}`;
  var idSet = null;
  var additionalSet = null;
  var removalSet = null;
  var cachesReady = false;
  var processedImgs = /* @__PURE__ */ new WeakSet();
  function markImage(img) {
    img.style.boxShadow = STYLE_BOXSHADOW;
    img.style.opacity = "0.3";
    processedImgs.add(img);
  }
  function unmarkImage(img) {
    img.style.boxShadow = "";
    img.style.opacity = "";
    processedImgs.delete(img);
  }
  function shouldHighlight(imgId) {
    return additionalSet.has(imgId) || idSet.has(imgId) && !removalSet.has(imgId);
  }
  function processImg(img) {
    if (processedImgs.has(img)) return;
    const imgId = String(getThumbImgId(img));
    if (shouldHighlight(imgId)) markImage(img);
    else processedImgs.add(img);
  }
  function processThumbBatch(root = document) {
    if (!cachesReady) return;
    root.querySelectorAll("div.image-list span.thumb img").forEach(processImg);
  }
  function addImageBorderById(id) {
    const el = document.getElementById(`s${id}`) || document.getElementById(`p${id}`);
    const img = el?.querySelector("img");
    if (img) markImage(img);
  }
  function removeImageHighlightById(id) {
    const el = document.getElementById(`s${id}`) || document.getElementById(`p${id}`);
    const img = el?.querySelector("img");
    if (img) unmarkImage(img);
  }
  function syncAdditionalSet() {
    additionalSet = new Set(getAdditionalQueue());
  }
  function handleUserReturn() {
    if (!cachesReady) return;
    const prevRemovalSet = removalSet;
    syncAdditionalSet();
    removalSet = new Set(getRemovalQueue());
    additionalSet.forEach((id) => addImageBorderById(id));
    if (prevRemovalSet) {
      removalSet.forEach((id) => {
        if (!prevRemovalSet.has(id)) removeImageHighlightById(id);
      });
    }
  }
  function observeNewThumbs() {
    const container = document.querySelector("#content > div.image-list") || document.body;
    const mo = new MutationObserver((mutations) => {
      if (!cachesReady) return;
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.("span.thumb img")) {
            processImg(node);
          } else {
            node.querySelectorAll?.("span.thumb img").forEach(processImg);
          }
        });
      }
    });
    mo.observe(container, { childList: true, subtree: true });
    return mo;
  }
  var ADD_FAV_HOOK_MAX_RETRIES = 20;
  var ADD_FAV_HOOK_RETRY_MS = 500;
  function hookAddFav(attempt = 0) {
    if (typeof unsafeWindow.addFav !== "function") {
      if (attempt < ADD_FAV_HOOK_MAX_RETRIES) {
        setTimeout(() => hookAddFav(attempt + 1), ADD_FAV_HOOK_RETRY_MS);
      }
      return;
    }
    const orig = unsafeWindow.addFav;
    unsafeWindow.addFav = function(postId) {
      const cleanId = String(postId).replace(/[^0-9]/g, "");
      if (cleanId) {
        addToAdditionalQueue(cleanId);
        additionalSet?.add(cleanId);
      }
      orig.apply(this, arguments);
      if (state.borderFavs && cleanId) addImageBorderById(cleanId);
    };
  }
  function highlightFavs() {
    hookAddFav();
    const saved = localStorage.getItem("borderFavs");
    state.borderFavs = parseStoredJson(saved, true) === true;
    if (!state.borderFavs) return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleUserReturn();
    });
    loadAllImagesFromIndexedDB((loadedImgs) => {
      idSet = new Set(loadedImgs.map((img) => String(img.id)));
      additionalSet = new Set(getAdditionalQueue());
      removalSet = new Set(getRemovalQueue());
      cachesReady = true;
      observeNewThumbs();
      processThumbBatch();
    });
  }

  // src/scan.js
  var FAVORITES_PER_PAGE = 50;
  var PARTIAL_SAVE_EVERY = 25;
  function extractImagesAndTags(doc, loadedImgs, pageNumber = null) {
    const postScores = /* @__PURE__ */ new Map();
    if (loadedImgs) {
      state.images = loadedImgs;
    } else {
      doc.querySelectorAll("script").forEach((script) => {
        if (!script.textContent.includes("score:")) return;
        const re = /posts\[(\d+)\]\s*=\s*{[\s\S]*?score:\s*['"](-?\d+)['"]/g;
        let m;
        while ((m = re.exec(script.textContent)) !== null) postScores.set(m[1], m[2]);
      });
      state.images = doc.querySelectorAll(".thumb img[src]");
    }
    state.images.forEach((image) => {
      const imageId = getImageId(image);
      if (!imageId) return;
      if (!loadedImgs) {
        if (pageNumber !== null) image.__r34Page = pageNumber;
        image.score = postScores.get(imageId) ?? null;
        if (!state.allImageIds.has(imageId)) {
          state.allImageIds.add(imageId);
          state.allImages.push(image);
        }
      }
      const post = {
        link: loadedImgs && image.link || `index.php?page=post&s=view&id=${imageId}`,
        src: image.src,
        id: imageId,
        score: image.score,
        page: pageNumber
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
  function sortScanResultsByPage() {
    const pageOf = (value) => Number.isFinite(value?.__r34Page) ? value.__r34Page : Number.MAX_SAFE_INTEGER;
    const resultPageOf = (value) => Number.isFinite(value?.page) ? value.page : Number.MAX_SAFE_INTEGER;
    state.allImages.sort((a, b) => pageOf(a) - pageOf(b));
    state.results.sort((a, b) => resultPageOf(a) - resultPageOf(b));
    if (state.allImages.length) state.lastImageId = getImageId(state.allImages[state.allImages.length - 1]);
  }
  function syncScoresToScanImages() {
    const scoresById = new Map(state.results.map((post) => [String(post.id), post.score]));
    const apply = (image) => {
      if (image?.score !== null && image?.score !== void 0) return;
      const score = scoresById.get(String(getImageId(image)));
      if (score !== null && score !== void 0) image.score = score;
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
      console.warn("Post-Metadaten konnten nicht vollst\xE4ndig geladen werden:", error.message);
    }
  }
  function setScanInProgress(value) {
    state.scanInProgress = value;
    if (state.searchButton) {
      state.searchButton.disabled = value;
      state.searchButton.style.opacity = value ? "0.6" : "1";
      state.searchButton.style.cursor = value ? "wait" : "pointer";
    }
    if (state.cancelButton) state.cancelButton.style.display = value ? "inline-block" : "none";
  }
  function resetScanStatus() {
    state.scanIncomplete = false;
    state.failedScanPages = /* @__PURE__ */ new Set();
    updateRetryButtonVisibility();
  }
  function markScanIncomplete(page, error) {
    state.scanIncomplete = true;
    state.failedScanPages.add(page);
    console.error(`Scan page ${page} incomplete:`, error || "page could not be loaded");
  }
  function updateRetryButtonVisibility() {
    if (state.retryButton) {
      state.retryButton.style.display = state.scanIncomplete && state.failedScanPages.size > 0 ? "inline-block" : "none";
    }
  }
  async function retryFailedPages() {
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
            markScanIncomplete(page);
          } else {
            extractImagesAndTags(doc, void 0, page);
            state.failedScanPages.delete(page);
          }
        } catch (err) {
          if (isAbortError(err)) throw err;
          markScanIncomplete(page, err);
        }
        done++;
        displayScanStatus(`retrying: ${done} / ${failedPages.length}`);
      }
      state.scanIncomplete = state.failedScanPages.size > 0;
      sortScanResultsByPage();
      await finishScanAndDisplay(controller.signal);
    } catch (error) {
      if (isAbortError(error)) {
        displayScanStatus("scan cancelled");
      } else {
        state.scanIncomplete = true;
        displayScanStatus("scan failed");
        console.error("Retry scan failed:", error);
      }
    } finally {
      if (state.scanAbortController === controller) state.scanAbortController = null;
      setScanInProgress(false);
    }
  }
  function favoritePageCountFromDocument() {
    let maxPid = 0;
    document.querySelectorAll('a[onclick], a[href*="pid="]').forEach((anchor) => {
      const raw = `${anchor.getAttribute("onclick") || ""} ${anchor.getAttribute("href") || ""}`;
      for (const match of raw.matchAll(/pid=(\d+)/g)) {
        maxPid = Math.max(maxPid, Number(match[1]));
      }
    });
    const pages = maxPid > 0 ? favoritePageCountFromPid(maxPid, FAVORITES_PER_PAGE) : null;
    if (pages) return pages;
    return document.querySelectorAll(".thumb img[src]").length > 0 ? 1 : null;
  }
  function formatDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1e3));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }
  function scanEtaSuffix(loaded, total, startedAt) {
    if (!Number.isFinite(total) || total <= 0 || loaded <= 0 || !startedAt) return "";
    const elapsed = Date.now() - startedAt;
    if (elapsed < 3e3) return "";
    return ` \xB7 ETA ${formatDuration(elapsed / loaded * (total - loaded))}`;
  }
  async function scan() {
    if (state.scanInProgress) return;
    const controller = new AbortController();
    state.scanAbortController = controller;
    setScanInProgress(true);
    resetScanStatus();
    try {
      state.lastScanError = null;
      if (state.needScan) {
        const pageCount = favoritePageCountFromDocument();
        if (pageCount && (state.fullScan || !Number.isFinite(state.actualFavCount))) {
          state.actualFavCount = pageCount * FAVORITES_PER_PAGE;
          state.favCountEstimated = true;
        } else if (!Number.isFinite(state.actualFavCount)) {
          const count = await getFavoritesCount(state.userId, { force: true });
          if (!Number.isFinite(count)) {
            displayScanStatus("favorites count unavailable");
            return;
          }
          state.actualFavCount = count;
          state.favCountOnLastUpdate = count;
          state.favCountEstimated = false;
        }
      }
      state.results = [];
      state.resultIds = /* @__PURE__ */ new Set();
      if (state.needScan) {
        if (state.fullScan) {
          state.allImages = [];
          state.allImageIds = /* @__PURE__ */ new Set();
          state.appendLoadedSave = false;
        }
        if (state.fullScan) await searchAllPages(0, controller.signal);
        else await searchNewPages(controller.signal);
      } else {
        await loadAllPages(controller.signal);
      }
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        displayScanStatus("scan cancelled");
      } else {
        state.scanIncomplete = true;
        displayScanStatus("scan failed");
        console.error("Scan failed:", error);
      }
    } finally {
      if (state.scanAbortController === controller) state.scanAbortController = null;
      updateRetryButtonVisibility();
      setScanInProgress(false);
    }
  }
  function cancelScan() {
    const controller = state.scanAbortController;
    if (!controller || controller.signal.aborted) return false;
    controller.abort();
    displayScanStatus("scan cancelled");
    return true;
  }
  async function loadAllPages(signal) {
    state.results = [];
    state.resultIds = /* @__PURE__ */ new Set();
    extractImagesAndTags(false, state.loadedImages);
    await finishScanAndDisplay(signal);
  }
  async function pagedFetch({ startPage = 0, maxPages = Infinity, statusSuffix = "", signal, skipPages = null, trackProgress = false } = {}) {
    const totalPages = Math.min(maxPages, Math.ceil((Number(state.actualFavCount) || 0) / FAVORITES_PER_PAGE));
    const skipped = new Set([...skipPages || []].filter((p) => Number.isInteger(p) && p >= 0 && p < totalPages));
    const loadedPages = new Set(skipped);
    const startedAt = Date.now();
    state.scanProgress = { loaded: loadedPages.size, total: totalPages, startedAt };
    const pages = [];
    for (let page = Math.max(0, startPage); page < totalPages; page++) {
      if (!skipped.has(page)) pages.push(page);
    }
    let partialInFlight = false;
    const savePartialIfDue = () => {
      if (!trackProgress || partialInFlight || loadedPages.size === 0) return;
      if (loadedPages.size % PARTIAL_SAVE_EVERY !== 0) return;
      partialInFlight = true;
      savePartialScan({ totalPages, loadedPages }).catch((err) => console.warn("Teilfortschritt nicht gespeichert:", err?.message || err)).finally(() => {
        partialInFlight = false;
      });
    };
    await Promise.all(pages.map(async (page) => {
      try {
        const doc = await fetchFavoritesPage(page, { signal });
        if (!doc) {
          markScanIncomplete(page);
          return;
        }
        extractImagesAndTags(doc, void 0, page);
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
  async function prepareResume() {
    const partial = await loadPartialScan();
    if (!partial || String(partial.userId) !== String(state.userId)) return null;
    const totalPages = Math.ceil((Number(state.actualFavCount) || 0) / FAVORITES_PER_PAGE);
    const loadedPages = new Set(
      (Array.isArray(partial.loadedPages) ? partial.loadedPages : []).filter((page) => Number.isInteger(page) && page >= 0 && page < totalPages)
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
      state.allImageIds = /* @__PURE__ */ new Set();
      state.results = [];
      state.resultIds = /* @__PURE__ */ new Set();
      state.appendLoadedSave = false;
      resumePages = await prepareResume();
    }
    await pagedFetch({ startPage, statusSuffix: "  (full)", signal, skipPages: resumePages, trackProgress: true });
    sortScanResultsByPage();
    await finishScanAndDisplay(signal);
  }
  async function searchNewPages(signal) {
    state.allImages = [];
    state.results = [];
    state.allImageIds = /* @__PURE__ */ new Set();
    state.resultIds = /* @__PURE__ */ new Set();
    const totalPages = Math.ceil((Number(state.actualFavCount) || 0) / FAVORITES_PER_PAGE);
    const cachedIds = new Set(
      (state.loadedImages || []).map((img) => String(img?.id ?? getPostIdFromLink(img?.link))).filter(Boolean)
    );
    let boundaryId = null;
    for (let page = 0; page < totalPages; page++) {
      const doc = await fetchFavoritesPage(page, { signal });
      if (!doc) {
        markScanIncomplete(page);
        break;
      }
      const pageIds = Array.from(doc.querySelectorAll(".thumb img[src]")).map((img) => getImageId(img)).filter(Boolean);
      extractImagesAndTags(doc, void 0, page);
      displayScanStatus(`scanning: page ${page + 1} / ${totalPages} (new)`);
      const hit = pageIds.find((id) => cachedIds.has(String(id)));
      if (hit) {
        boundaryId = hit;
        break;
      }
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
      state.loadedImages = [];
      state.appendLoadedSave = false;
    } else {
      state.scanIncomplete = true;
    }
    await finishScanAndDisplay(signal);
  }
  async function finishScanAndDisplay(signal) {
    const willSave = state.needScan && !state.scanIncomplete;
    if (willSave) {
      if (state.appendLoadedSave) {
        state.newSinceLastScan = new Set(state.allImages.map((img) => String(getImageId(img))).filter(Boolean));
      } else {
        const oldIds = new Set((state.loadedImages || []).map((img) => String(img.id)));
        state.newSinceLastScan = new Set(state.results.map((p) => String(p.id)).filter((id) => !oldIds.has(id)));
      }
    }
    state.fullScan = false;
    state.baseResults = [...state.results];
    updateNewButtonState();
    applyCurrentFiltersAndRender();
    if (willSave) {
      try {
        await enrichScannedResults(signal);
        const savedCount = await saveAllImagesToIndexedDB();
        const baselineCount = state.favCountEstimated ? savedCount : state.actualFavCount;
        localStorage.setItem("prevFavCount", JSON.stringify(baselineCount));
        localStorage.setItem("userId", JSON.stringify(state.userId));
        clearRemovalQueue();
        clearAdditionalQueue();
        await clearPartialScan();
        state.partialScanInfo = null;
        displayScanStatus(state.newSinceLastScan.size ? `scanned (new ${state.newSinceLastScan.size})` : "scanned");
      } catch {
        displayScanStatus("scan saved failed");
      }
    } else if (state.scanIncomplete) {
      displayScanStatus(`scan incomplete (${state.failedScanPages.size} page(s) failed)`);
    }
    updateRetryButtonVisibility();
    refreshCacheInfo();
  }
  async function fastCheckForScanIsNeeded() {
    const savedUserId = loadSavedUserId();
    if (!savedUserId) return false;
    if (String(getIdFromUrl()) !== String(savedUserId)) {
      return document.getElementById("progress")?.textContent !== "new user";
    }
    const favCount = await getFavoritesCount(state.userId);
    if (!Number.isFinite(favCount)) return false;
    state.actualFavCount = favCount;
    state.favCountEstimated = false;
    if (!Number.isFinite(state.favCountOnLastUpdate)) {
      state.favCountOnLastUpdate = favCount;
      return false;
    }
    if (favCount === state.favCountOnLastUpdate) return false;
    state.favCountOnLastUpdate = favCount;
    return true;
  }
  var VISIBILITY_CHECK_MIN_INTERVAL_MS = 12e3;
  var lastVisibilityCheckAt = 0;
  var visibilityCheckInFlight = null;
  function switchedToFavPage() {
    const now = Date.now();
    if (visibilityCheckInFlight) return;
    if (state.scanInProgress) return;
    if (now - lastVisibilityCheckAt < VISIBILITY_CHECK_MIN_INTERVAL_MS) return;
    lastVisibilityCheckAt = now;
    visibilityCheckInFlight = fastCheckForScanIsNeeded().then((result) => {
      if (result) location.reload();
    }).catch((err) => console.error("Visibility-Check fehlgeschlagen:", err)).finally(() => {
      visibilityCheckInFlight = null;
    });
  }
  function visibilityChangeHandler() {
    if (document.visibilityState === "visible") switchedToFavPage();
  }
  var AUTO_SCAN_INTERVALS = { "5min": 5 * 60 * 1e3, "15min": 15 * 60 * 1e3 };
  async function autoScanCheck() {
    if (document.visibilityState !== "visible") return;
    if (state.scanInProgress) return;
    try {
      const hasNew = await fastCheckForScanIsNeeded();
      if (hasNew && !state.scanInProgress) {
        state.needScan = true;
        state.fullScan = false;
        await scan();
      }
    } catch (err) {
      console.error("Auto-Scan fehlgeschlagen:", err);
    }
  }
  function applyAutoScanSetting() {
    if (state.autoScanTimer) {
      clearInterval(state.autoScanTimer);
      state.autoScanTimer = null;
    }
    const ms = AUTO_SCAN_INTERVALS[state.autoScanInterval];
    if (ms) state.autoScanTimer = setInterval(autoScanCheck, ms);
  }
  function initAutoScan() {
    const saved = localStorage.getItem("autoScan");
    state.autoScanInterval = saved && AUTO_SCAN_INTERVALS[saved.replace(/"/g, "")] ? saved.replace(/"/g, "") : "off";
    applyAutoScanSetting();
  }
  async function init() {
    createHeaderUI();
    initAutoScan();
    document.addEventListener("click", function(e) {
      const target = e.target.closest("a");
      if (target?.getAttribute("onclick")?.includes("favorites&s=delete")) {
        const m = target.getAttribute("onclick").match(/id=(\d+)/);
        if (m) {
          removeFromAdditionalQueue(m[1]);
          addToRemovalQueue(m[1]);
        }
      }
    }, true);
    document.addEventListener("visibilitychange", visibilityChangeHandler);
    try {
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
          displayScanStatus("favorites count unavailable \u2013 click Search");
          return;
        }
      }
      state.actualFavCount = favoritesCount;
      if (!state.favCountEstimated) state.favCountOnLastUpdate = favoritesCount;
      const loadedImgs = await new Promise((resolve) => loadAllImagesFromIndexedDB(resolve));
      const removalSet2 = new Set(getRemovalQueue());
      state.loadedImages = loadedImgs.filter((img) => !removalSet2.has(img.id));
      const partial = await loadPartialScan();
      const partialPages = Array.isArray(partial?.loadedPages) ? partial.loadedPages.length : 0;
      if (partial && String(partial.userId) === String(state.userId) && partialPages > 0) {
        state.partialScanInfo = { loaded: partialPages, total: partial.totalPages };
        state.needScan = true;
        state.fullScan = true;
        displayScanStatus(`scan incomplete (${partialPages}/${partial.totalPages}) \u2013 click Search to resume`);
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
              const pid = new URLSearchParams(window.location.search).get("pid");
              return pid === "0" || pid === null ? document : await fetchFavoritesPage(0);
            }
            const pageDoc = await getFirstIdCheck();
            const firstThumb = pageDoc?.querySelector(".thumb img");
            const actualFirstId = getPostIdFromLink(firstThumb?.parentElement?.href);
            if (!actualFirstId) {
              displayScanStatus("need scan");
              return;
            }
            const countDiffers = !state.favCountEstimated && favoritesCount !== state.prevFavCount;
            if (loadedFirstId !== actualFirstId && !state.fromBack || countDiffers) {
              displayScanStatus("scanned (new)");
              refreshCacheInfo();
            } else {
              state.needScan = false;
              state.allImages = state.loadedImages;
              state.allImageIds = new Set(state.loadedImages.map((img) => img.id));
              displayScanStatus("scanned");
              refreshCacheInfo();
            }
          } else {
            displayScanStatus("need scan");
          }
        } else {
          displayScanStatus("new user");
        }
      } else {
        displayScanStatus("need scan");
      }
    } catch (e) {
      console.error("Fehler w\xE4hrend der Initialisierung:", e);
    }
  }
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
})();

})();
