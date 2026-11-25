import { getRoute, getPerPage, safeStorageGet, safeStorageSet, CONSTANTS, AD_SELECTORS, AD_MARKERS, isTyping } from './core.js';
import { HEADER_CSS, PAGE_INDICATOR_CSS, BLACKLIST_CSS } from './css.js';

    // --- CORE FEATURES ---

    // Auf den Favorites-Seiten (page=favorites&s=view) ist span.thumb NICHT direktes
    // Kind von div.image-list, sondern steckt in einem äußeren Wrapper-<span>
    // (z.B. <span style="display:grid;..."><span class="thumb">...</span></span>).
    // Direkt danach folgt als Geschwister-Element ein <script> mit posts[id] = {...}.
    // Wird nur der innere span.thumb entfernt, bleiben der leere Wrapper UND das
    // verwaiste <script> als Lücke im Grid zurück. Diese Funktion entfernt daher
    // immer den korrekten äußeren Container plus das zugehörige Script in einem Zug.
    // Auf der normalen page=post&s=list Seite ist der Wrapper === thumb selbst,
    // daher funktioniert dieselbe Funktion unverändert für beide Seitentypen.
    const removePostContainer = (thumbSpan) => {
        // Wrapper ist der Elternknoten, FALLS dieser kein .image-list ist (Favorites-Fall).
        // Sonst (normale Liste) ist der thumbSpan selbst direktes Kind von .image-list.
        const parent = thumbSpan.parentElement;
        const container = (parent && !parent.classList.contains('image-list') && parent.tagName === 'SPAN')
        ? parent
        : thumbSpan;

        const nextScript = container.nextElementSibling;
        const hasAssociatedScript = nextScript?.tagName === 'SCRIPT' &&
              nextScript.textContent.includes('posts[');

        container.remove();
        if (hasAssociatedScript) nextScript.remove();
    };
    let blacklistCssInjected = false;
    const hideBlacklisted = (ctx) => {
        // CSS-Sicherheitsnetz einmalig injizieren (läuft nur, wenn das Feature aktiv ist)
        if (!blacklistCssInjected) { GM_addStyle(BLACKLIST_CSS); blacklistCssInjected = true; }
        // 1. Fallback für alte Strukturen
        ctx.querySelectorAll?.('.blacklisted').forEach(el => el.remove());

        // 2. Neue Logik: Sucht das Blacklist-Bild und entfernt den Hauptcontainer
        //    (inkl. Favorites-Wrapper + zugehöriges Script, siehe removePostContainer)
        ctx.querySelectorAll?.('img.blacklist-img, img[src*="blacklisted.png"]').forEach(img => {
            const thumbContainer = img.closest('span.thumb');
            if (thumbContainer) {
                removePostContainer(thumbContainer);
            }
        });
    };

    const removeAnnoyances = (ctx) => {
        // Bekannte Ad-/Stör-Container direkt entfernen (Selektoren aus AD_SELECTORS)
        ctx.querySelectorAll?.(AD_SELECTORS.join(', ')).forEach(el => el.remove());

        // div[style*="display: inline-flex"] nur entfernen, wenn sie nachweislich
        // Werbung/iframes enthalten – der alte pauschale Selektor hätte auch
        // legitime Layouts (z.B. Formularzeilen) zerstört.
        ctx.querySelectorAll?.('div[style*="display: inline-flex"]').forEach(el => {
            const hasAdContent = AD_MARKERS.some(sel => el.querySelector(sel));
            if (hasAdContent) el.remove();
        });
    };

    // Räumt Artefakte auf, die spezifisch auf den Favorites-Seiten
    // (page=favorites&s=view) am Seitenende bzw. nach entfernten Posts zurückbleiben:
    // 1. Das "Show/Hide"-Steuerelement (id="pi") - erzeugt mit margin-top:200px eine
    //    sichtbare Lücke am Ende der Liste, wird hier komplett entfernt.
    // 2. Verwaiste <br>-Elemente direkt in .image-list - kein gültiger Post ist je ein
    //    <br>, daher sind diese immer Überbleibsel und können bedenkenlos weg.
    // 3. Verwaiste <script>posts[id]={...}</script>-Tags, deren zugehöriger Wrapper-Span
    //    bereits entfernt wurde (z.B. durch rule34.xxx's eigenes serverseitiges Markup
    //    oder durch eine Entfernung, die nicht über removePostContainer lief).
    //
    // WICHTIG: ctx wird hier bewusst NICHT als Suchbereich für .image-list verwendet.
    // Der letzte pagetual-Batch am Seitenende besteht oft NUR aus <br> + dem
    // Show/Hide-Div, ohne jegliches .thumb-Element. Würde man wie sonst üblich
    // ctx.querySelector('div.image-list') aufrufen, schlägt das fehl, sobald ctx
    // selbst INNERHALB von .image-list liegt (z.B. ctx = eines der <br> selbst) -
    // querySelector findet ja nur Nachkommen, nicht Vorfahren. Daher wird .image-list
    // hier immer direkt über das Dokument gesucht; das ist ohnehin günstig (einmaliger
    // Klassen-Lookup) und unabhängig vom jeweils übergebenen ctx zuverlässig.
    const cleanupFavoritesArtifacts = () => {
        if (!getRoute().isFavoritesView) return;

        document.querySelectorAll('a#pi').forEach(link => link.closest('div')?.remove());

        const imageList = document.querySelector('div.image-list');
        if (!imageList) return;

        Array.from(imageList.children).forEach(child => {
            if (child.tagName === 'BR') {
                child.remove();
            } else if (child.tagName === 'SCRIPT' && child.textContent.includes('posts[')) {
                const prev = child.previousElementSibling;
                const hasValidWrapper = prev?.tagName === 'SPAN' && prev.querySelector('span.thumb');
                if (!hasValidWrapper) child.remove();
            }
        });
    };
    const fixPaginatorLinks = (ctx) => ctx.querySelectorAll?.('#paginator a[onclick]').forEach(link => {
        const match = (link.getAttribute('onclick') || '').match(/document\.location='([^']+)'/);
        if (match && link.getAttribute('href') === '#') link.setAttribute('href', match[1]);
    });
    const removePidParameter = (ctx) => ctx.querySelectorAll?.('a[onclick*="return_pid="]').forEach(link => {
        link.setAttribute('onclick', (link.getAttribute('onclick') || '').replace(/[?&]return_pid=\d+/, ''));
    });
    const setNativeLazyLoading = (ctx) => {
        let images;
        if (ctx.nodeType === 1 && ctx.matches?.('img:not([loading])')) {
            images = [ctx];
        } else {
            images = ctx.querySelectorAll?.('img:not([loading])');
        }
        if (images?.length) {
            // Diese Attribute müssen synchron gesetzt werden: Bei einem verzögerten
            // Idle-Callback könnte der Browser das Bild bereits angefordert haben,
            // bevor loading/referrerPolicy wirksam werden.
            let i = 0;
            images.forEach(img => {
                if (i < 15) {
                    img.loading = 'eager';
                    img.fetchPriority = 'high';
                } else {
                    img.loading = 'lazy';
                }
                img.decoding = 'async';
                if (!img.hasAttribute('referrerpolicy')) img.referrerPolicy = 'no-referrer';
                i++;
            });
        }
    };

    // Prüft NUR den übergebenen ctx (bei pagetual-Batches: der/die neu eingefügten
    // Nodes, nicht die komplette, potenziell riesige Liste). Beim initialen Page-Load
    // ist ctx = document, was weiterhin alles erfasst - das Verhalten bleibt identisch,
    // nur der Scope bei inkrementellen Batches ist jetzt eng statt künstlich auf
    // die gesamte #content > div.image-list erweitert.
    // Relativer Selektor (kein "#content >"-Anker) macht das unabhängig davon, ob
    // pagetual Spans direkt einfügt oder in einem Wrapper-Container verpackt.
    // Echtes Markup (Favoriten-Seite, geprüft am 2026-11-21):
    // <span style="display:grid"> <span class="thumb"> <a id="p<id>" style="display:none">
    //   <img src="…/thumbnail_….jpg?..."> </a> </span> </span> <script>posts[id]={…}</script>
    // rule34 blockt einen Post der Seiten-Blacklist ("overall"), indem es genau
    // diesen Anker per jQuery-.hide() auf display:none setzt. Das <img> bleibt im
    // DOM (Computed-Display bleibt "inline") – deshalb muss der Löschschutz aus
    // v5.41 unsichtbare Medien erkennen, sonst bleibt der leere 200×200-Kasten.
    const SITE_BLACKLIST_IMG = 'img.blacklist-img, img[src*="blacklisted.png"]';
    const isHiddenMedia = (el, stopAt) => {
        // Nur Inline-Style und hidden-Attribut: das ist der gemessene Mechanismus
        // (jQuery-.hide() schreibt inline) und spart getComputedStyle-Layouts.
        for (let node = el; node && node !== stopAt; node = node.parentElement) {
            if (node.hasAttribute?.('hidden')) return true;
            if (/display\s*:\s*none/i.test(node.getAttribute?.('style') || '')) return true;
        }
        return false;
    };
    const isSpanEmpty = (span) => {
        // Ein sichtbares Bild/Video ist nie "leer" – auch ohne Anker (z.B. ein
        // Lazy-Platzhalter oder ein fehlgeschlagenes Laden). Sonst würde
        // hideEmptyThumbSpans echten Inhalt löschen (Container + posts[id]-Script).
        // Unsichtbare Bilder (vom Site-Blacklist versteckt) zählen dagegen nicht.
        const media = span.querySelectorAll('img, video');
        for (let i = 0; i < media.length; i++) {
            const node = media[i];
            if (node.tagName === 'IMG' && node.matches(SITE_BLACKLIST_IMG)) continue;
            if (isHiddenMedia(node, span)) continue;
            return false;
        }
        if (span.children.length === 0) return true;
        const links = span.querySelectorAll('a');
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            // Inline-Style zuerst (günstig), dann getComputedStyle für CSS-Klassen
            if (/display\s*:\s*none/i.test(link.getAttribute('style') || '')) continue;
            return false; // alles andere gilt als sichtbar
        }
        return true;
    };
    const hideEmptyThumbSpans = (ctx) => {
        const isDirectSpan = ctx.nodeType === 1 && ctx.matches?.('span.thumb');
        const spans = isDirectSpan ? [ctx] : (ctx.querySelectorAll?.('span.thumb') || []);
        spans.forEach(span => {
            if (span.dataset.r34thHiderHidden === '1') return; // vom Tag-Hider versteckt: nicht anfassen
            if (isSpanEmpty(span)) removePostContainer(span);
        });
    };
    const removeThumbTitle = (ctx) => ctx.querySelectorAll?.('.thumb img[title]').forEach(img => img.removeAttribute('title'));

    // Globaler Cache aller bereits gesehenen Post-IDs über alle pagetual-Batches hinweg.
    // Vermeidet, dass jedes Element per getElementById gegen das GESAMTE Dokument
    // geprüft werden muss - ein Set-Lookup ist günstiger und wächst linear mit,
    // statt bei jedem Batch erneut DOM-weit zu suchen.
    const removeDuplicateThumbnails = (() => {
        let seenIds = new Set();

        const fn = (ctx) => {
            const thumbs = ctx.matches?.('span.thumb')
            ? [ctx]
            : Array.from(ctx.querySelectorAll?.('span.thumb') || []);

            if (thumbs.length === 0) return ctx;

            const toRemove = [];

            thumbs.forEach(el => {
                const id = el.id?.slice(1);
                if (!id) return;

                if (seenIds.has(id)) {
                    // Selbstheilender Duplikat-Check: Nur entfernen, wenn das Original
                    // wirklich noch im DOM existiert. Nachgeladener Inhalt (Pagetual),
                    // der nach einem Blacklist-Toggle neu gerendert wird, überlebt so,
                    // statt massenhaft als "Duplikat" entfernt zu werden.
                    const liveNode = document.getElementById(el.id);
                    if (liveNode && liveNode !== el) toRemove.push(el);
                } else {
                    seenIds.add(id);
                }
            });

            toRemove.forEach(el => removePostContainer(el));
            return ctx;
        };

        // Beim Seitenwechsel (neue Post-Liste) muss der Cache geleert werden,
        // sonst hält removeDuplicateThumbnails fälschlich Posts der vorherigen
        // Seite für Duplikate.
        fn.reset = () => { seenIds = new Set(); };
        return fn;
    })();

    // --- FAVORITEN-MARKER (Suchergebnis-Seiten) ---
    // Markiert Posts, die im Favoriten-Cache des Rule34 Favorites Enhancers
    // (IndexedDB: R34FavDB/favoritesStore/allImagesPayload) liegen, mit einem
    // roten Rahmen. Die IDs werden einmalig geladen und fuer alle Batches gecacht.
    const loadFavoriteIds = () => new Promise((resolve) => {
        try {
            if (!('indexedDB' in window)) { resolve(new Set()); return; }
            const req = indexedDB.open('R34FavDB', 1);
            req.onsuccess = () => {
                const db = req.result;
                try {
                    const tx = db.transaction('favoritesStore', 'readonly');
                    const store = tx.objectStore('favoritesStore');
                    const getReq = store.get('allImagesPayload');
                    getReq.onsuccess = () => {
                        const payload = getReq.result;
                        const imgs = payload && Array.isArray(payload.images)
                        ? payload.images
                        : (Array.isArray(payload) ? payload : []);
                        resolve(new Set(imgs.map(i => String(i && i.id)).filter(Boolean)));
                    };
                    getReq.onerror = () => resolve(new Set());
                } catch { resolve(new Set()); }
            };
            req.onerror = () => resolve(new Set());
            req.onblocked = () => resolve(new Set());
        } catch { resolve(new Set()); }
    });
    const getThumbPostId = (thumb) => {
        if (thumb.id && thumb.id[0] === 'p' && /^\d+$/.test(thumb.id.slice(1))) return thumb.id.slice(1);
        const a = thumb.querySelector('a[href*="page=post"][href*="id="]');
        if (a) {
            try { return new URL(a.href, location.href).searchParams.get('id'); } catch { return null; }
        }
        return null;
    };
    const markFavoritedThumbs = (() => {
        let favIdsPromise = null;
        const getFavIds = () => {
            if (!favIdsPromise) favIdsPromise = loadFavoriteIds();
            return favIdsPromise;
        };
        const fn = (ctx) => {
            const r = getRoute();
            if (!(r.page === 'post' && r.section === 'list')) return;
            getFavIds().then(favIds => {
                if (!favIds || favIds.size === 0) return;
                const thumbs = ctx && ctx.matches && ctx.matches('span.thumb')
                ? [ctx]
                : Array.from((ctx && ctx.querySelectorAll ? ctx.querySelectorAll('span.thumb') : []) || []);
                thumbs.forEach(thumb => {
                    if (thumb.dataset && thumb.dataset.r34FavMarked === '1') return;
                    const id = getThumbPostId(thumb);
                    if (id && favIds.has(id)) {
                        if (thumb.dataset) thumb.dataset.r34FavMarked = '1';
                        thumb.style.boxShadow = "0 0 0 2.5px #ff0000";
                        thumb.style.opacity = "0.3";
                    }
                });
            });
        };
        return fn;
    })();
    const updateFavicon = () => {
        try {
            // 4 eindeutige Icons; 'profile-name'/'profile-id' teilen denselben URI
            const ICON_POST = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAAAAGVQALYondf////+67aQPAAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC';
            const ICON_USER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAABVAHmNAMrNnf////9vNKohAAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC';
            const ICON_PROFILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAAATExMgICBISEj///+FO3OXAAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC';
            const ICON_FAVORITES = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAABOAACBEBD/UVH///9FPR7/AAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC';
            const ICON_MAP = [
                { match: 'post', icon: ICON_POST },
                { match: 'user', icon: ICON_USER },
                { match: 'profile-name', icon: ICON_PROFILE },
                { match: 'profile-id', icon: ICON_PROFILE },
                { match: 'favorites', icon: ICON_FAVORITES },
            ];
            const route = getRoute();
            const iconEntry = route.isPostView
            ? ICON_MAP.find(entry => entry.match === 'post')
            : route.isUserSearch
            ? ICON_MAP.find(entry => entry.match === 'user')
            : route.isOptionsPage
            ? undefined
            : route.page === 'account' && route.section === 'profile'
            ? ICON_MAP.find(entry => entry.match === (route.url.searchParams.has('uname') ? 'profile-name' : 'profile-id'))
            : route.isFavoritesView
            ? ICON_MAP.find(entry => entry.match === 'favorites')
            : undefined;
            const newIcon = iconEntry?.icon;
            if (newIcon) {
                let link = document.querySelector('link[rel="shortcut icon"]') || document.querySelector('link[rel="icon"]');
                if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'shortcut icon'); document.head.appendChild(link); }
                link.setAttribute('href', newIcon);
            }
        } catch { /* ignore */ }
    };
    const updatePageIndicator = (() => {
        let indicator = null;
        let totalPages = null;
        let cssInjected = false;
        // Vom eingebauten Infinite-Scroll gemeldeter Zustand (r34th:inf-state):
        // nachgeladene Seite (1-basiert) + Pause-Status. Die PID-URL ändert sich
        // beim Nachladen nicht, deshalb kommt die Seitenzahl per Custom-Event.
        let currentPageOverride = null;
        let isPaused = false;
        const getCurrentPage = () => {
            if (currentPageOverride !== null) return currentPageOverride;
            const { url } = getRoute();
            const pid = parseInt(url.searchParams.get('pid'), 10);
            if (!isNaN(pid)) return Math.floor(pid / getPerPage()) + 1;
            const paginator = document.querySelector('#paginator');
            if (paginator) {
                const currentPageElem = paginator.querySelector('b');
                if (currentPageElem) return parseInt(currentPageElem.textContent, 10) || 1;
            }
            return 1;
        };

        const getTotalPagesFromPaginator = () => {
            const paginator = document.querySelector('#paginator');
            if (!paginator) return null;
            const perPage = getPerPage();
            const lastLink = paginator.querySelector('a[href*="pid"]:last-of-type');
            if (lastLink) {
                const url = new URL(lastLink.href, location.href);
                const maxPid = parseInt(url.searchParams.get('pid'), 10) || 0;
                return Math.floor(maxPid / perPage) + 1;
            }
            const pageLinks = paginator.querySelectorAll('a[href*="pid"]');
            if (pageLinks.length > 0) {
                const pages = new Set();
                pageLinks.forEach(link => {
                    const url = new URL(link.href, location.href);
                    const pid = parseInt(url.searchParams.get('pid'), 10);
                    if (!isNaN(pid)) pages.add(Math.floor(pid / perPage) + 1);
                });
                return Math.max(...pages, 1);
            }
            return null;
        };

        const updateDisplay = () => {
            if (!indicator) return;
            try {
                const currentPage = getCurrentPage();
                if (totalPages === null) totalPages = getTotalPagesFromPaginator();
                // "/" = Infinite-Scroll aktiv, "=" = pausiert (Linksklick auf den Pill)
                let text = `Page ${currentPage}`;
                if (totalPages !== null && totalPages > 0) text += (isPaused ? ' = ' : ' / ') + totalPages;
                indicator.textContent = text;
                indicator.style.display = 'block';
            } catch (e) {
                console.debug('[PageIndicator] Fehler:', e);
            }
        };

        const fn = () => {
            try {
                const route = getRoute();
                if (route.isPostView) {
                    if (indicator) indicator.style.display = 'none';
                    return;
                }
                if (!cssInjected) { GM_addStyle(PAGE_INDICATOR_CSS); cssInjected = true; }
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.id = 'page-indicator';
                    indicator.title = 'Infinite Scroll: Linksklick = Pause/Weiter';
                    indicator.addEventListener('click', () => {
                        window.dispatchEvent(new CustomEvent('r34th:inf-toggle'));
                    });
                    document.body.appendChild(indicator);
                }
                // Echte Navigation (neue PID im URL) hat Vorrang vor dem
                // Infinite-Scroll-Zähler.
                currentPageOverride = null;
                totalPages = null;
                updateDisplay();
            } catch (e) {
                console.debug('[PageIndicator] Fehler:', e);
            }
        };

        // Kopplung mit dem eingebauten Infinite-Scroll (infinite-scroll.js):
        // Seite + Pause-Status übernehmen und Anzeige aktualisieren.
        window.addEventListener('r34th:inf-state', (e) => {
            if (!indicator) return;
            const d = e.detail || {};
            const page = parseInt(d.page, 10);
            if (!isNaN(page) && page > 0) currentPageOverride = page;
            isPaused = !!d.paused;
            updateDisplay();
        });

        return fn;
    })();

    // --- USER INTERFACE (MOUSE & UI PANELS) ---
    const setupFavoriteOnHover = () => {
        let hoveredElement = null;
        document.addEventListener('mouseenter', e => { hoveredElement = e.target; }, { passive: true, capture: true });
        document.addEventListener('mouseleave', e => { if (e.target === hoveredElement) hoveredElement = null; }, { capture: true });
        // Seitentasten dürfen nicht die Browser-Navigation (Zurück/Vorwärts)
        // auslösen. X1 (button 3) bleibt zusätzlich der Favorisieren-Auslöser.
        window.addEventListener('pointerdown', e => {
            if (e.button !== 3) return;

            const active = document.activeElement;
            if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
            const link = hoveredElement?.closest('a[href*="id="], a[id^="p"]');
            const postId = link ? (new URL(link.href, location.href).searchParams.get('id') || link.id.slice(1)) : getRoute().id;
            if (postId && typeof unsafeWindow.addFav === 'function') {
                unsafeWindow.addFav(postId);
            }
        }, true);
    };
    const setupCollapsibleHeader = () => {
        const header = document.querySelector('#header');
        if (!header || getRoute().isFavoritesView) return;
        // Style gehört zu diesem Feature und wird nur injiziert, wenn es aktiv ist
        // (zentral definiert in src/css.js).
        GM_addStyle(HEADER_CSS);
        let expandTimeout, collapseTimeout;
        let isFixed = safeStorageGet('r34_header_fixed') === 'true';
        let fixButton = header.querySelector('.header-fix-btn');
        if (!fixButton) {
            fixButton = document.createElement('button');
            fixButton.className = 'header-fix-btn';
            header.appendChild(fixButton);
        }
        const updateState = () => {
            header.style.height = isFixed ? 'auto' : CONSTANTS.HEADER_COLLAPSED_HEIGHT;
            fixButton.textContent = isFixed ? '❌ Unpin' : '📌 Pin';
        };
        const toggleFixed = () => { isFixed = !isFixed; safeStorageSet('r34_header_fixed', String(isFixed)); updateState(); };
        fixButton.addEventListener('click', toggleFixed);
        header.addEventListener('mouseenter', () => { if (!isFixed) { clearTimeout(collapseTimeout); expandTimeout = setTimeout(() => header.style.height = 'auto', CONSTANTS.HEADER_EXPAND_DELAY_MS); } });
        header.addEventListener('mouseleave', () => { if (!isFixed) { clearTimeout(expandTimeout); collapseTimeout = setTimeout(() => header.style.height = CONSTANTS.HEADER_COLLAPSED_HEIGHT, CONSTANTS.HEADER_COLLAPSE_DELAY_MS); } });
        document.addEventListener('keydown', e => { if (e.altKey && e.key.toLowerCase() === 'h' && !isTyping()) toggleFixed(); });
        updateState();
    };
    const dedupeContexts = (contexts) => {
        const unique = [];
        for (const ctx of contexts) {
            if (!ctx || typeof ctx.querySelectorAll !== 'function') continue;
            if (unique.some(existing => existing === ctx || existing.contains?.(ctx))) continue;
            for (let i = unique.length - 1; i >= 0; i--) {
                if (ctx.contains?.(unique[i])) unique.splice(i, 1);
            }
            unique.push(ctx);
        }
        return unique;
    };

export { setupFavoriteOnHover, setupCollapsibleHeader, dedupeContexts, hideBlacklisted, removeAnnoyances, cleanupFavoritesArtifacts, fixPaginatorLinks, removePidParameter, setNativeLazyLoading, hideEmptyThumbSpans, removeThumbTitle, removeDuplicateThumbnails, updateFavicon, updatePageIndicator, markFavoritedThumbs };
