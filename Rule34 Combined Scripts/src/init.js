import { CONFIG, CONSTANTS, getRoute, observers, debounce } from './core.js';
import { TAG } from './tag-hider.js';
import { hideBlacklisted, removeDuplicateThumbnails, removeAnnoyances, fixPaginatorLinks, removePidParameter, setNativeLazyLoading, removeThumbTitle, hideEmptyThumbSpans, cleanupFavoritesArtifacts, updateFavicon, updatePageIndicator, setupFavoriteOnHover, setupCollapsibleHeader, dedupeContexts, markFavoritedThumbs } from './features.js';
import { handleOptionsPage, checkApiKey, restoreDeletedPost } from './api.js';
import { setupControlPanel } from './panel.js';
import { setupSidebarIntegration } from './sidebar.js';
import { setupThumbOverlay } from './overlay.js';
import { setupInfiniteScroll } from './infinite-scroll.js';

    // --- CLEANUP FUNKTION ---
    const cleanup = () => {
        observers.forEach(obs => {
            try { obs.disconnect(); } catch (e) { console.debug('Observer disconnect failed:', e); }
        });
        // In-place leeren statt neu zuweisen: observers ist ein importiertes (read-only) Binding
        observers.length = 0;
    };

    // --- MAIN INITIALIZATION & OBSERVER ---
    const init = async () => {

        // FOUC-Schutz: Tag-Hider SOFORT und synchron starten, bevor irgendein
        // await (Options-Seite, API-Key-Check) läuft – sonst blitzen
        // geblacklistete Karten kurz auf, bevor sie ausgeblendet werden.
        TAG.initObservers();
        TAG.processAll();

        await handleOptionsPage();
        let canRestore = false;
        if (CONFIG.restoreDeletedPost) canRestore = await checkApiKey();
        if (CONFIG.favoriteOnMouse) setupFavoriteOnHover();
        if (CONFIG.collapsibleHeader) setupCollapsibleHeader();
        setupControlPanel();
        setupSidebarIntegration();
        if (CONFIG.thumbOverlay) setupThumbOverlay();
        if (CONFIG.infiniteScroll) setupInfiniteScroll();
        // Kein zweites initObservers/processAll: Guard macht es idempotent,
        // runAll() darunter verarbeitet den kompletten DOM.
        if (CONFIG.restoreDeletedPost && canRestore && getRoute().isPostView) setTimeout(restoreDeletedPost, 500);

        const runAll = (contexts = [document]) => {
            const unique = dedupeContexts(contexts);
            // Tag-Hider EINMAL pro Batch – processAll() scannt ohnehin das ganze Dokument
            TAG.processAll();
            unique.forEach(ctx => {
                if (CONFIG.hideBlacklisted) hideBlacklisted(ctx);
                if (CONFIG.removeDuplicates) removeDuplicateThumbnails(ctx);
                if (CONFIG.removeAnnoyances) removeAnnoyances(ctx);
                if (CONFIG.fixPaginatorLinks) fixPaginatorLinks(ctx);
                if (CONFIG.removePidParameter) removePidParameter(ctx);
                if (CONFIG.nativeLazyLoading) setNativeLazyLoading(ctx);
                if (CONFIG.removeThumbTitles) removeThumbTitle(ctx);
                if (CONFIG.favoriteMarker) markFavoritedThumbs(ctx);
            });
            // Leere Thumb-Spans erst nach dem Paint prüfen – blockiert den Load nicht mehr
            if (CONFIG.hideEmptyThumbSpans) {
                const defer = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
                defer(() => unique.forEach(ctx => hideEmptyThumbSpans(ctx)));
            }
            if (CONFIG.cleanupFavoritesArtifacts) cleanupFavoritesArtifacts();
        };

        runAll();
        if (CONFIG.pageIndicator) updatePageIndicator();
        if (CONFIG.faviconChanger) updateFavicon();

        const addedNodesBuffer = new Set();
        let routeTransitionPending = false;
        let routeTransitionHref = null;
        let routeTransitionStartedAt = 0;
        let lastRelevantMutationAt = 0;
        let routeTransitionBaseline = '';
        let routeTransitionBaselineNodes = null;
        let routeChangeTimer = null;

        const processAddedNodes = debounce(() => {
            // Bei einer SPA-Navigation wartet der vollständige Route-Scan auf
            // eine ruhige DOM-Phase. So werden alte und neue Thumbnails nicht
            // versehentlich gemeinsam in den Duplicate-Cache aufgenommen.
            if (routeTransitionPending || addedNodesBuffer.size === 0) return;
            runAll(Array.from(addedNodesBuffer));
            addedNodesBuffer.clear();
        }, CONSTANTS.DEBOUNCE_MUTATION_MS);

        const getRouteContentNodes = (href) => {
            const route = getRoute(href);
            if (route.isPostView) {
                return {
                    primary: document.querySelector('.status-notice'),
                    secondary: document.querySelector('#fit-to-screen'),
                    media: document.querySelector('#fit-to-screen')?.firstElementChild,
                };
            }
            if (route.isFavoritesView || (route.page === 'post' && route.section === 'list')) {
                const content = document.querySelector('#content');
                return {
                    primary: content,
                    secondary: content?.querySelector('div.image-list') || document.querySelector('div.image-list'),
                    media: null,
                };
            }
            return { primary: null, secondary: null, media: null };
        };

        const getRouteContentSignature = (href) => {
            const route = getRoute(href);
            if (route.isPostView) {
                const notice = document.querySelector('.status-notice');
                const fitToScreen = document.querySelector('#fit-to-screen');
                const media = fitToScreen?.firstElementChild;
                return [
                    'post',
                    notice?.textContent?.slice(0, 200) || '',
                    fitToScreen?.childElementCount || 0,
                    media?.tagName || '',
                    media?.getAttribute?.('src') || '',
                ].join('|');
            }

            if (route.isFavoritesView || (route.page === 'post' && route.section === 'list')) {
                const content = document.querySelector('#content');
                const imageList = content?.querySelector('div.image-list') || document.querySelector('div.image-list');
                const thumbs = imageList ? Array.from(imageList.querySelectorAll('span.thumb')) : [];
                const thumbIds = thumbs.map(thumb => thumb.id).join(',');
                return [
                    'list',
                    content?.childElementCount || 0,
                    imageList?.childElementCount || 0,
                    thumbIds,
                ].join('|');
            }

            return `${route.page || ''}|${route.section || ''}|${route.url.search}`;
        };

        const isRouteContentReady = (href) => {
            const route = getRoute(href);
            if (!(route.isPostView || route.isFavoritesView || (route.page === 'post' && route.section === 'list'))) {
                return true;
            }

            if (getRouteContentSignature(href) !== routeTransitionBaseline) return true;

            const currentNodes = getRouteContentNodes(href);
            const baselineNodes = routeTransitionBaselineNodes;
            return Boolean(
                baselineNodes &&
                (currentNodes.primary !== baselineNodes.primary ||
                 currentNodes.secondary !== baselineNodes.secondary ||
                 currentNodes.media !== baselineNodes.media)
            );
        };

        const mutationTouchesRouteContent = (mutation) => {
            const contentSelector = '#content, div.image-list, .status-notice, #fit-to-screen';
            const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
            if (target?.closest?.(contentSelector)) return true;

            const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
            return changedNodes.some(node =>
                                     node.nodeType === 1 &&
                                     (node.matches?.(contentSelector) || node.querySelector?.(contentSelector))
                                    );
        };

        const scheduleRouteScan = () => {
            clearTimeout(routeChangeTimer);
            routeChangeTimer = setTimeout(() => {
                if (!routeTransitionPending) return;

                const now = performance.now();
                const elapsed = now - routeTransitionStartedAt;
                const quietFor = now - lastRelevantMutationAt;
                const maxWait = CONSTANTS.ROUTE_TRANSITION_MAX_WAIT_MS;
                const contentReady = isRouteContentReady(routeTransitionHref);

                if ((elapsed < maxWait && quietFor < CONSTANTS.DEBOUNCE_URL_MS) ||
                    (elapsed < maxWait && !contentReady)) {
                    scheduleRouteScan();
                    return;
                }

                if (location.href !== routeTransitionHref) {
                    routeTransitionPending = false;
                    routeTransitionBaselineNodes = null;
                    addedNodesBuffer.clear();
                    return;
                }

                // Nach dem maximalen Wartefenster wird immer einmal der
                // aktuelle DOM verarbeitet. Die Fingerprint-Prüfung verzögert
                // den Scan nur während eines laufenden Content-Austauschs;
                // sie darf eine Route nicht dauerhaft unverarbeitet lassen.
                routeTransitionPending = false;
                addedNodesBuffer.clear();
                if (CONFIG.removeDuplicates && typeof removeDuplicateThumbnails.reset === 'function') {
                    removeDuplicateThumbnails.reset();
                }
                runAll();
                routeTransitionBaselineNodes = null;
                if (CONFIG.pageIndicator) updatePageIndicator();
                if (CONFIG.restoreDeletedPost && canRestore && getRoute(routeTransitionHref).isPostView) {
                    restoreDeletedPost();
                }
            }, CONSTANTS.DEBOUNCE_URL_MS);
        };

        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            for (const m of mutations) {
                if (routeTransitionPending && mutationTouchesRouteContent(m)) {
                    lastRelevantMutationAt = performance.now();
                    scheduleRouteScan();
                }

                for (const n of m.addedNodes) {
                    if (n.nodeType === 1) {
                        if (n.id === 'content') {
                            addedNodesBuffer.clear();
                            addedNodesBuffer.add(n);
                            needsUpdate = true;
                            break;
                        }
                        const hasThumb = n.matches?.('.thumb') ||
                              n.classList?.contains('image-list') ||
                              (n.querySelector && n.querySelector('.thumb'));
                        // Auf Favoriten-Seiten kann der letzte pagetual-Batch NUR aus
                        // <br>-Elementen und/oder dem Show/Hide-Div bestehen, ohne
                        // jegliches .thumb-Element. Ohne diesen Zusatz-Check würde
                        // hasThumb hier false bleiben und runAll() (also auch
                        // cleanupFavoritesArtifacts) nie für diesen Batch laufen -
                        // die <br> blieben dauerhaft als Lücke im DOM zurück.
                        const isFavoritesArtifact = CONFIG.cleanupFavoritesArtifacts &&
                              getRoute().isFavoritesView &&
                              (n.tagName === 'BR' || n.querySelector?.('a#pi') || n.matches?.('a#pi'));
                        if (hasThumb || isFavoritesArtifact) {
                            addedNodesBuffer.add(n);
                            needsUpdate = true;
                        }
                    }
                }
            }
            if (needsUpdate && !routeTransitionPending) processAddedNodes();
        });
        observers.push(observer);
        // Die globale Überwachung bleibt bewusst auf Strukturänderungen
        // beschränkt. Während einer Route-Transition prüft scheduleRouteScan()
        // den DOM-Fingerprint ohnehin wiederholt; dadurch werden auch In-place-
        // Änderungen erkannt, ohne dauerhaft jedes style/class/src-Attribut und
        // jede Textänderung im gesamten Body zu beobachten.
        observer.observe(document.body, { childList: true, subtree: true });

        let lastHref = location.href;
        const handleUrlChangeImmediate = () => {
            const newUrl = new URL(location.href);
            const oldUrl = new URL(lastHref);
            if (newUrl.href === oldUrl.href) return;

            // Query-Änderungen sind bei Rule34 häufig echte Seitenwechsel,
            // obwohl pathname (/index.php) gleich bleibt.
            const isPageChange =
                  newUrl.pathname !== oldUrl.pathname ||
                  newUrl.search !== oldUrl.search;

            lastHref = newUrl.href;
            TAG.reloadForRoute();

            if (CONFIG.removeDuplicates && typeof removeDuplicateThumbnails.reset === 'function') {
                removeDuplicateThumbnails.reset();
            }
            if (isPageChange) {
                if (CONFIG.faviconChanger) updateFavicon();
                if (CONFIG.pageIndicator) updatePageIndicator();

                // Rule34 aktualisiert den DOM bei SPA-Navigation oft erst nach
                // pushState/popstate. Der vollständige Scan wartet deshalb auf
                // eine kurze ruhige DOM-Phase, maximal jedoch wenige Debounce-
                // Intervalle. Relevante Mutationen verlängern diese Ruhephase.
                routeTransitionPending = true;
                routeTransitionHref = newUrl.href;
                routeTransitionStartedAt = performance.now();
                lastRelevantMutationAt = routeTransitionStartedAt;
                routeTransitionBaseline = getRouteContentSignature(routeTransitionHref);
                routeTransitionBaselineNodes = getRouteContentNodes(routeTransitionHref);
                addedNodesBuffer.clear();
                scheduleRouteScan();
            }
        };

        const debouncedHeadObserver = debounce(handleUrlChangeImmediate, CONSTANTS.DEBOUNCE_URL_MS);
        const headObserver = new MutationObserver(debouncedHeadObserver);
        observers.push(headObserver);
        headObserver.observe(document.head || document.documentElement, { childList: true, subtree: true });

        window.addEventListener('popstate', handleUrlChangeImmediate);
        window.addEventListener('pushstate', handleUrlChangeImmediate);
        window.addEventListener('replacestate', handleUrlChangeImmediate);
        window.addEventListener('beforeunload', cleanup);

        const wrapHistoryMethod = (type) => {
            const orig = history[type];
            return function() {
                const rv = orig.apply(this, arguments);
                window.dispatchEvent(new Event(type.toLowerCase()));
                return rv;
            };
        };
        history.pushState = wrapHistoryMethod('pushState');
        history.replaceState = wrapHistoryMethod('replaceState');
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
