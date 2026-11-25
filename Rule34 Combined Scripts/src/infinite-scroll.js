// src/infinite-scroll.js – Eigener Infinite-Scroll für Such- und Favoriten-Seiten (v5.31+)
// Lädt die nächste &pid=-Seite per same-origin fetch + DOMParser und hängt die
// kompletten Post-Container (auf Favoriten-Seiten inkl. "Remove"-Link) samt
// posts[id]-Scripts in div.image-list ein. Die bestehende runAll()-Batch-
// Verarbeitung (init.js) übernimmt danach automatisch Tag-Hider, Blacklist,
// Duplikat-Check, Favoriten-Marker, Lazy-Loading usw. – kein zweiter Scan nötig.
// Seit der Erweiterung:
//   - Preloading: die übernächste Seite wird im Hintergrund vorgeladen, sobald
//     der Nutzer sich dem Seitenende nähert (flüssigeres Scrollen).
//   - Favoriten-Seiten (page=favorites&s=view) werden mitgeladen; die
//     posts[id]-Scripts aus der Antwort werden für den Tag-Hider geparst
//     (window.__r34thFavCache), damit SmartSkip+ die neuen Thumbs filtern kann.
// Wird die Pagetual-Erweiterung erkannt, erscheint einmal ein Hinweis, sie zu
// deaktivieren (sonst laden beide parallel und es gibt doppelte Posts).
import { getRoute, getPerPage, CONSTANTS } from './core.js';
import { normalizeTag } from './parser.js';
import { INFINITE_SCROLL_CSS } from './css.js';

const THROTTLE_MS = 200;        // Scroll-Throttle
const FETCH_DELAY_MS = 250;     // Debounce vor dem Fetch (nahe Seitenende)
const BOTTOM_THRESHOLD = 600;   // px vor dem Seitenende auslösen
const PRELOAD_THRESHOLD = 2200; // px vor dem Seitenende: nächste Seite vorladen
const RATE_INTERVAL_MS = 500;   // Mindestabstand zwischen Requests
const MAX_RETRIES = 3;          // Retry-Versuche bei Challenge-/Fehlerseiten
const RETRY_BASE_MS = 1000;     // Backoff-Basis: 1000, 2000, 4000 ms
const ROUTE_RECHECK_DEBOUNCE_MS = 150; // Ruhephase nach dem Content-Tausch (SPA)

// Exponentieller Backoff für Retry-Versuche (pure, unit-testbar).
export const backoffDelay = (attempt) => RETRY_BASE_MS * Math.pow(2, attempt);

// Container eines Posts: auf den Favoriten-Seiten steckt span.thumb in einem
// äußeren Wrapper-<span> (thumb + <br> + "Remove"-Link), auf der normalen Liste
// ist der thumb selbst der Container. Gleiche Logik wie removePostContainer()
// in features.js, damit Wrapper-Löschung und Nachladen zusammenpassen.
const getPostContainer = (thumb) => {
    const parent = thumb.parentElement;
    return (parent && parent.tagName === 'SPAN' && !parent.classList.contains('image-list'))
        ? parent
        : thumb;
};

const isPostScript = (node) => !!node && node.tagName === 'SCRIPT' &&
    (node.textContent || '').indexOf('posts[') !== -1;

// Parst eine geladene Listen-/Favoriten-Seite (pure, unit-testbar): liefert die
// span.thumb-Elemente plus isList – true nur, wenn die Antwort echtes
// Listen-Markup enthält (div.image-list/#paginator/span.thumb; gilt für Such-
// UND Favoriten-Seiten). rule34 liefert bei Bot-Schutz/Challenge/Rate-Limit
// gelegentlich 200er-Seiten OHNE Listen-Markup; eine solche Antwort darf
// NICHT als "Ende der Ergebnisse" gewertet werden.
// `nodes` sind die einzuhängenden Knoten in Original-Reihenfolge: der komplette
// Post-Container (Favoriten-Wrapper inkl. "Remove"-Link) und das direkt darauf
// folgende <script>posts[id] = {...}</script>. Vorher wurden nur die nackten
// span.thumb übernommen – dadurch fehlten bei nachgeladenen Favoriten der
// Remove-Button und die Tag-/Score-Scripts.
export const parseThumbs = (html) => {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const imageList = dom.querySelector('div.image-list');
    const thumbs = Array.from((imageList || dom).querySelectorAll('span.thumb'));
    const nodes = [];
    const seenContainers = new Set();
    thumbs.forEach(thumb => {
        const container = getPostContainer(thumb);
        if (seenContainers.has(container)) return;
        seenContainers.add(container);
        nodes.push(container);
        const next = container.nextElementSibling;
        if (isPostScript(next)) nodes.push(next);
    });
    return {
        thumbs,
        nodes,
        isList: !!dom.querySelector('div.image-list, #paginator, span.thumb'),
    };
};

// Pure Entscheidungslogik der Ende-/Retry-Erkennung (unit-testbar):
//   'retry'  → keine echte Listen-Seite (Challenge/Bot-Schutz/Login/Fehler)
//   'end'    → leere Seite ODER nur bereits geladene Posts (letzte Seite)
//   'append' → neue Posts vorhanden → einhängen
export const classifyLoadResult = ({ thumbs, isList, existingIds, newIds }) => {
    if (!isList) return 'retry';
    if (thumbs.length === 0) return 'end';
    if (newIds.length > 0 && newIds.every(id => existingIds.has(id))) return 'end';
    return 'append';
};

// Minimaler RateLimiter (1 Request gleichzeitig, Mindestabstand) – angelehnt an
// die Favorites-Search-Gallery, damit rule34 nicht mit Requests überschüttet wird.
class RateLimiter {
    constructor({ minIntervalMs = RATE_INTERVAL_MS } = {}) {
        this.minIntervalMs = minIntervalMs;
        this._queue = [];
        this._active = 0;
        this._lastRun = 0;
    }
    run(task) {
        return new Promise((resolve, reject) => {
            this._queue.push({ task, resolve, reject });
            this._pump();
        });
    }
    async _pump() {
        while (this._active === 0 && this._queue.length) {
            const { task, resolve, reject } = this._queue.shift();
            const wait = Math.max(0, this._lastRun + this.minIntervalMs - Date.now());
            if (wait > 0) await new Promise(r => setTimeout(r, wait));
            this._lastRun = Date.now();
            this._active = 1;
            task().then(resolve, reject).finally(() => { this._active = 0; this._pump(); });
        }
    }
}

const setupInfiniteScroll = () => {
    GM_addStyle(INFINITE_SCROLL_CSS);
    const limiter = new RateLimiter();

    const state = {
        baseUrl: null,
        currentPage: 0,
        hasMore: true,
        isLoading: false,
        preloading: false,
        prefetched: null,       // { page, thumbs, nodes } – vorgeladene nächste Seite
        fetchTimer: null,
        scrollCheckAt: 0,
        pagetualHinted: false,
        paused: false,          // via Klick auf den Seiten-Indikator pausiert
        retryCount: 0,          // verbrauchte Retry-Versuche (Backoff-Zähler)
        retryTimer: null,       // laufender Retry-Timer (Challenge-/Fehlerseiten)
    };

    // Scrollbar auf Such-Listen (post/s=list) UND Favoriten-Seiten (favorites/s=view)
    const isScrollable = () => {
        const r = getRoute();
        return (r.page === 'post' && r.section === 'list') || r.isFavoritesView;
    };

    const getThumbId = (thumb) => {
        if (thumb.id && thumb.id[0] === 'p' && /^\d+$/.test(thumb.id.slice(1))) return thumb.id.slice(1);
        const a = thumb.querySelector('a[href*="page=post"][href*="id="]');
        if (a) {
            try { return new URL(a.href, location.href).searchParams.get('id'); } catch { return null; }
        }
        return null;
    };

    const getRouteInfo = () => {
        const route = getRoute();
        const pid = route.url.searchParams.get('pid');
        const page = (pid === null || pid === '') ? 0 : Math.max(0, Math.floor(parseInt(pid, 10) / getPerPage()));
        return {
            scrollable: isScrollable(),
            baseUrl: location.href.replace(/[?&]pid=\d+/, ''),
            page,
        };
    };

    const getStatusEl = () => {
        let el = document.getElementById('r34-inf-scroll-status');
        if (!el) {
            el = document.createElement('div');
            el.id = 'r34-inf-scroll-status';
            document.body.appendChild(el);
        }
        return el;
    };
    const setStatus = (text, cls) => {
        const el = getStatusEl();
        el.textContent = text || '';
        el.className = cls || '';
    };
    const clearStatus = () => {
        const el = document.getElementById('r34-inf-scroll-status');
        if (el) el.remove();
    };

    // Zustand an den Seiten-Indikator melden (updatePageIndicator in features.js):
    // aktuelle 1-basierte Seite + Pause-Status, damit der Pill korrekt zählt
    // und "/" bzw. "=" anzeigt.
    const broadcast = () => {
        window.dispatchEvent(new CustomEvent('r34th:inf-state', {
            detail: { page: state.currentPage + 1, paused: state.paused },
        }));
    };

    const resetForRoute = (info) => {
        state.baseUrl = info.baseUrl;
        state.currentPage = info.page;
        state.hasMore = true;
        state.isLoading = false;
        state.preloading = false;
        state.prefetched = null;
        state.paused = false; // neue Route → automatisch weiterlaufen
        state.retryCount = 0;
        if (state.fetchTimer) { clearTimeout(state.fetchTimer); state.fetchTimer = null; }
        if (state.retryTimer) { clearTimeout(state.retryTimer); state.retryTimer = null; }
        clearStatus();
        broadcast();
    };

    const fetchPage = async (url) => {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
    };

    // posts[id]-Scripts müssen im Live-Dokument NEU angelegt werden: die aus dem
    // DOMParser-Dokument übernommenen sind dort inert und laufen beim Einhängen
    // nicht. Erst dadurch kennt die Seite (window.posts) Tags/Score der
    // nachgeladenen Posts – wie beim normalen Seitenaufbau. Existiert `posts`
    // nicht, wird das Script nur als DOM-Parität eingehängt (kein ReferenceError).
    const canRunPostScripts = () => {
        try {
            const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            return !!pageWindow && typeof pageWindow.posts !== 'undefined';
        } catch { return false; }
    };
    const appendPostNodes = (imageList, nodes) => {
        const runScripts = canRunPostScripts();
        nodes.forEach(node => {
            // Eigene Nachlade-Knoten markieren: der Route-Recheck nach dem
            // Content-Tausch darf sie nicht als Seitenwechsel-Mutation werten.
            if (node.dataset) node.dataset.r34thInfAppended = '1';
            if (node.tagName !== 'SCRIPT' || !runScripts) {
                imageList.appendChild(node);
                return;
            }
            const script = document.createElement('script');
            if (node.type) script.type = node.type;
            script.textContent = node.textContent;
            script.dataset.r34thInfAppended = '1';
            imageList.appendChild(script);
        });
    };

    // posts[id]-Scripts aus der Antwort für den Tag-Hider parsen (Favoriten-Seiten).
    // Schreibt in denselben Cache, den tag-hider.js über getThumbCache() liest
    // (window.__r34thFavCache), damit SmartSkip+ die nachgeladenen Thumbs kennt.
    const parseFavoritesScripts = (html) => {
        if (!getRoute().isFavoritesView) return;
        const cache = window.__r34thFavCache || (window.__r34thFavCache = {});
        const re = /posts\[(\d+)\]\s*=\s*\{[^}]*['"]?tags['"]?\s*:\s*["']([^"']+)["']/g;
        const dom = new DOMParser().parseFromString(html, 'text/html');
        Array.from(dom.querySelectorAll('script')).forEach(script => {
            const text = script.textContent || '';
            if (text.indexOf('posts[') === -1) return;
            let m;
            while ((m = re.exec(text)) !== null) {
                cache[m[1]] = String(m[2]).split(/\s+/).map(normalizeTag).filter(Boolean);
            }
        });
    };

    const pageUrl = (page) => {
        const pid = page * getPerPage();
        return state.baseUrl + (state.baseUrl.includes('?') ? '&' : '?') + 'pid=' + pid;
    };

    // Nächste Seite im Hintergrund vorladen (Cache in state.prefetched).
    const preloadNext = async () => {
        if (state.isLoading || state.preloading || !state.hasMore || state.paused || state.retryTimer) return;
        const info = getRouteInfo();
        if (!info.scrollable) return;
        if (info.baseUrl !== state.baseUrl) resetForRoute(info);
        const page = state.currentPage + 1;
        if (state.prefetched && state.prefetched.page === page) return;
        state.preloading = true;
        try {
            const html = await limiter.run(() => fetchPage(pageUrl(page)));
            parseFavoritesScripts(html);
            const parsed = parseThumbs(html);
            state.prefetched = { page, thumbs: parsed.thumbs, nodes: parsed.nodes, isList: parsed.isList };
        } catch (e) {
            console.debug('[InfiniteScroll] Preload fehlgeschlagen:', e);
        } finally {
            state.preloading = false;
        }
    };

    const loadMore = async () => {
        if (state.isLoading || !state.hasMore || state.paused) return;
        const info = getRouteInfo();
        if (!info.scrollable) return;
        if (info.baseUrl !== state.baseUrl) resetForRoute(info);

        state.isLoading = true;
        setStatus('Loading…', 'r34-inf-loading');
        try {
            const page = state.currentPage + 1;
            let thumbs;
            let nodes;
            let isList;
            if (state.prefetched && state.prefetched.page === page) {
                thumbs = state.prefetched.thumbs;
                nodes = state.prefetched.nodes;
                isList = state.prefetched.isList;
                state.prefetched = null;
            } else {
                const html = await limiter.run(() => fetchPage(pageUrl(page)));
                parseFavoritesScripts(html);
                const parsed = parseThumbs(html);
                thumbs = parsed.thumbs;
                nodes = parsed.nodes;
                isList = parsed.isList;
            }

            // Ende/Retry-Entscheidung: classifyLoadResult (pure, unit-testbar).
            // 'retry' → keine echte Listen-Seite (Challenge/Bot-Schutz/Fehler):
            //           NICHT als Ende werten, sondern wie einen Netzwerkfehler
            //           behandeln – der automatische Retry versucht es erneut.
            // 'end'   → leere Seite ODER nur bereits geladene Posts (rule34
            //           wiederholt auf pid > letzter Seite die letzte Seite).
            // 'append'→ neue Posts vorhanden → einhängen.
            const existingIds = new Set();
            document.querySelectorAll('span.thumb').forEach(t => { const id = getThumbId(t); if (id) existingIds.add(id); });
            const newIds = thumbs.map(getThumbId).filter(Boolean);
            const result = classifyLoadResult({ thumbs, isList, existingIds, newIds });

            if (result === 'retry') throw new Error('Keine Listen-Seite (Challenge/Fehler) – Retry');
            if (result === 'end') {
                state.hasMore = false;
                state.prefetched = null;
                state.retryCount = 0;
                setStatus('— End of results —');
                return;
            }

            const imageList = document.querySelector('#content > div.image-list') || document.querySelector('div.image-list');
            if (!imageList) { state.hasMore = false; return; }
            // Einfügen in den Live-DOM (komplette Post-Container + posts[id]-Scripts)
            // → die bestehende runAll()-Batch-Verarbeitung (MutationObserver in
            // init.js) übernimmt Tag-Hider, Marker, Dedup usw.
            appendPostNodes(imageList, nodes);

            state.currentPage = page;
            state.retryCount = 0; // Erfolg → Backoff-Zähler zurücksetzen
            broadcast(); // Seiten-Indikator (features.js) über die neue Seite informieren
            clearStatus();
            preloadNext(); // übernächste Seite bereits im Hintergrund nachladen
        } catch (e) {
            console.debug('[InfiniteScroll] Fehler beim Laden:', e);
            // Automatischer Retry mit Backoff bei Challenge-/Fehlerseiten:
            // bis zu MAX_RETRIES Versuche mit wachsendem Abstand (1000/2000/
            // 4000 ms), danach weicher Fallback auf "scroll to retry" – kein
            // Endlos-Loop, der den Bot-Schutz weiter füttert.
            if (state.retryCount < MAX_RETRIES) {
                const delay = backoffDelay(state.retryCount);
                state.retryCount++;
                setStatus(`⚠️ Challenge – Retry in ${delay / 1000}s…`, 'r34-inf-error');
                state.retryTimer = setTimeout(() => { state.retryTimer = null; loadMore(); }, delay);
            } else {
                state.retryCount = 0;
                setStatus('⚠️ Load failed – scroll to retry', 'r34-inf-error');
            }
        } finally {
            state.isLoading = false;
        }
    };

    const onScroll = () => {
        const now = Date.now();
        if (now - state.scrollCheckAt < THROTTLE_MS) return;
        state.scrollCheckAt = now;

        const info = getRouteInfo();
        if (!info.scrollable) return;
        if (info.baseUrl !== state.baseUrl) resetForRoute(info);
        if (!state.hasMore || state.isLoading || state.paused || state.retryTimer) return;

        const docEl = document.documentElement;
        const remaining = docEl.scrollHeight - (window.innerHeight + window.scrollY);
        if (remaining <= BOTTOM_THRESHOLD) {
            if (state.fetchTimer) clearTimeout(state.fetchTimer);
            state.fetchTimer = setTimeout(loadMore, FETCH_DELAY_MS);
        } else if (remaining <= PRELOAD_THRESHOLD) {
            preloadNext();
        }
    };

    // --- Route-Recheck nach dem Content-Tausch -----------------------------
    // rule34 ersetzt #content oft erst NACH pushState. Der sofortige Check in
    // onRouteChange() würde dann noch die alte Seite messen. Deshalb wird während
    // der Route-Transition auf den eigentlichen Content-Tausch gehorcht und die
    // Positionsprüfung danach genau einmal wiederholt.
    const CONTENT_SELECTOR = '#content, div.image-list, span.thumb';
    let routeCheckObserver = null;
    let routeRecheckTimer = null;
    let routeRecheckMaxTimer = null;
    const stopRouteCheck = () => {
        if (routeCheckObserver) { try { routeCheckObserver.disconnect(); } catch { /* ignore */ } routeCheckObserver = null; }
        if (routeRecheckTimer) { clearTimeout(routeRecheckTimer); routeRecheckTimer = null; }
        if (routeRecheckMaxTimer) { clearTimeout(routeRecheckMaxTimer); routeRecheckMaxTimer = null; }
    };
    const measureNow = () => { state.scrollCheckAt = 0; onScroll(); };
    const isOwnAppend = node => !!(node && node.dataset && node.dataset.r34thInfAppended === '1');
    const contentChangedBy = mutations => (mutations || []).some(m => {
        if (m.type !== 'childList') return false;
        const added = Array.from(m.addedNodes || []).filter(n => n.nodeType === 1 && !isOwnAppend(n));
        // Reine Entfernung (alter Content wird abgebaut) → auf den Aufbau warten.
        if (!added.length) return false;
        const target = m.target?.nodeType === 1 ? m.target : m.target?.parentElement;
        if (target?.closest?.(CONTENT_SELECTOR)) return true;
        return added.some(n => n.matches?.(CONTENT_SELECTOR) || n.querySelector?.(CONTENT_SELECTOR));
    });
    const watchContentSwap = () => {
        stopRouteCheck();
        const expectedHref = location.href;
        routeCheckObserver = new MutationObserver(mutations => {
            if (location.href !== expectedHref) { stopRouteCheck(); return; } // neue Navigation übernimmt
            if (!contentChangedBy(mutations)) return;
            // Der Tausch kann aus mehreren Schritten bestehen → erst nach einer
            // kurzen Ruhephase messen (wie die Route-Transition in init.js).
            if (routeRecheckTimer) clearTimeout(routeRecheckTimer);
            routeRecheckTimer = setTimeout(() => { stopRouteCheck(); measureNow(); }, ROUTE_RECHECK_DEBOUNCE_MS);
        });
        routeCheckObserver.observe(document.body, { childList: true, subtree: true });
        // Fallback, falls kein Content-Signal kommt (z.B. In-place-Update):
        // nach dem maximalen Wartezeitfenster trotzdem einmal nachmessen.
        routeRecheckMaxTimer = setTimeout(() => { stopRouteCheck(); measureNow(); }, CONSTANTS.ROUTE_TRANSITION_MAX_WAIT_MS);
    };

    // Pagetual-Erkennung → einmaliger Hinweis, die Erweiterung zu deaktivieren
    const detectPagetual = () => {
        try {
            if (window.pagetual ||
                (typeof unsafeWindow !== 'undefined' &&
                 (unsafeWindow.pagetual || unsafeWindow.pagetualRule || unsafeWindow.pagetualRules))) {
                return true;
            }
            const el = document.querySelector('#pagetual-sideController, #pagetual_pageBar, #pagetual-preload, #pagetual-nextSwitch, #pagetual-picker, .pagetual_pageNum');
            return !!el && (!!el.id || (el.className && String(el.className).includes('pagetual')));
        } catch { return false; }
    };
    const showPagetualHint = () => {
        if (state.pagetualHinted) return;
        state.pagetualHinted = true;
        const toast = document.createElement('div');
        toast.id = 'r34-inf-pagetual-hint';
        toast.textContent = '⚠️ Built-in Infinite Scroll is active – please disable the Pagetual extension to avoid double-loading.';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 8000);
    };

    const onRouteChange = () => {
        const info = getRouteInfo();
        if (info.scrollable) {
            resetForRoute(info);
            // Sofort messen (falls der Content bereits getauscht ist): Steht die
            // neue Liste am (oder nahe am) Ende, lädt der Infinite-Scroll direkt
            // nach, statt auf den nächsten Scroll zu warten. scrollCheckAt wird
            // zurückgesetzt, damit der Scroll-Throttle den Check nicht verschluckt.
            state.scrollCheckAt = 0;
            onScroll();
            // Und nach dem eigentlichen Content-Tausch noch einmal: rule34
            // ersetzt #content oft erst NACH pushState.
            watchContentSwap();
        } else {
            stopRouteCheck();
            clearStatus();
        }
    };

    // Initial: Route einrichten + einmaliger synchroner Check, damit auch kurze
    // Seiten (weniger als ein Viewport) direkt nachgeladen werden. Kein Timer:
    // der Scroll-Listener übernimmt danach.
    const info = getRouteInfo();
    if (info.scrollable) {
        resetForRoute(info);
        if (detectPagetual()) showPagetualHint();
        onScroll();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('pushstate', onRouteChange);
    window.addEventListener('replacestate', onRouteChange);

    // Pause-Toggle vom Seiten-Indikator (Linksklick auf #page-indicator).
    // Pausiert stoppt das Nachladen; Entpausieren prüft sofort die Scroll-Position.
    window.addEventListener('r34th:inf-toggle', () => {
        state.paused = !state.paused;
        if (state.paused && state.fetchTimer) { clearTimeout(state.fetchTimer); state.fetchTimer = null; }
        if (state.paused && state.retryTimer) { clearTimeout(state.retryTimer); state.retryTimer = null; }
        if (state.paused) state.retryCount = 0;
        broadcast();
        if (!state.paused) onScroll();
    });
};

export { setupInfiniteScroll };
