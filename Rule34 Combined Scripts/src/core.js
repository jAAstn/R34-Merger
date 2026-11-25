    // Cleanup-Liste für Observer beim Page Unload
    let observers = [];

    // --- KONSTANTEN & CONFIG ---
    const API_KEY_NAME = 'r34_api_key';
    const USER_ID_NAME = 'r34_user_id';
    const REMINDER_KEY = 'r34_api_reminder';
    const CONSTANTS = {
        PER_PAGE_FAVORITES: 50,
        PER_PAGE_DEFAULT: 42,
        HEADER_COLLAPSED_HEIGHT: '40px',
        DEBOUNCE_MUTATION_MS: 150,
        DEBOUNCE_URL_MS: 150,
        API_RETRY_ATTEMPTS: 3,
        BANNER_DISPLAY_MS: 3000,
        HEADER_EXPAND_DELAY_MS: 250,
        HEADER_COLLAPSE_DELAY_MS: 100,
        API_TIMEOUT_MS: 10000,
        ROUTE_TRANSITION_MAX_WAIT_MS: 5000,
    };
    const DEFAULT_CONFIG = {
        favoriteOnMouse: true,
        hideBlacklisted: true,
        removeDuplicates: true,
        removeAnnoyances: true,
        collapsibleHeader: true,
        fixPaginatorLinks: true,
        removePidParameter: true,
        nativeLazyLoading: true,
        restoreDeletedPost: true,
        hideEmptyThumbSpans: true,
        faviconChanger: true,
        pageIndicator: true,
        removeThumbTitles: true,
        cleanupFavoritesArtifacts: true,
        favoriteMarker: true,
        thumbOverlay: true,
        infiniteScroll: true,
    };

    const getRoute = (href = location.href) => {
        const url = new URL(href, location.href);
        const page = url.searchParams.get('page');
        const section = url.searchParams.get('s');
        const tags = url.searchParams.get('tags');
        return {
            url,
            page,
            section,
            id: url.searchParams.get('id'),
            isFavoritesPage: page === 'favorites',
            isFavoritesView: page === 'favorites' && section === 'view',
            isPostView: page === 'post' && section === 'view',
            isAllPostsList: page === 'post' && section === 'list' && tags === 'all',
            isUserSearch: Array.from(url.searchParams.values()).some(value => value.includes('user:')),
            isOptionsPage: page === 'account' && section === 'options',
        };
    };
    const getPerPage = (href = location.href) =>
    getRoute(href).isFavoritesPage ? CONSTANTS.PER_PAGE_FAVORITES : CONSTANTS.PER_PAGE_DEFAULT;

    const safeStorageGet = (key) => {
        try { return localStorage.getItem(key); }
        catch (error) { console.debug(`[Storage] Could not read ${key}:`, error); return null; }
    };
    const safeStorageSet = (key, value) => {
        try { localStorage.setItem(key, value); return true; }
        catch (error) { console.debug(`[Storage] Could not write ${key}:`, error); return false; }
    };
    const readJson = (key, fallback) => {
        const raw = safeStorageGet(key);
        if (!raw) return fallback;
        try {
            const value = JSON.parse(raw);
            return value ?? fallback;
        } catch (error) {
            console.debug(`[Storage] Invalid JSON in ${key}:`, error);
            return fallback;
        }
    };

    // Konfig laden + validieren: nur echte Booleans aus localStorage übernehmen,
    // alles andere (z.B. importierter Müll) fällt auf den Default zurück.
    const loadConfig = () => {
        const storedValue = readJson('r34_feature_flags', {});
        const stored = storedValue && typeof storedValue === 'object' && !Array.isArray(storedValue)
        ? storedValue
        : {};
        const config = { ...DEFAULT_CONFIG };
        Object.keys(DEFAULT_CONFIG).forEach(key => {
            if (typeof stored[key] === 'boolean') config[key] = stored[key];
        });
        return config;
    };
    const CONFIG = loadConfig();

    // --- UTILS ---
    const debounce = (fn, ms) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // True, wenn der Nutzer gerade in ein Eingabefeld tippt
    const isTyping = () => {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    // Einheitlicher GM.xmlHttpRequest-Wrapper.
    // Nutzt onload/onerror/ontimeout statt der Promise-Rückgabe, damit er in
    // Tampermonkey, Violentmonkey UND Greasemonkey 4+ identisch funktioniert.
    const gmRequest = (url, options = {}) => new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: options.method || 'GET',
            url: url,
            headers: options.headers || {},
            responseType: options.responseType || 'json',
            timeout: options.timeout || CONSTANTS.API_TIMEOUT_MS,
            onload: (res) => resolve(res),
            onerror: (err) => reject(err),
            ontimeout: () => reject(new Error(`Request timeout: ${url}`)),
        });
    });
    const buildApiUrl = (params = {}) => {
        const url = new URL('https://api.rule34.xxx/index.php');
        url.search = new URLSearchParams(
            Object.entries(params).map(([key, value]) => [key, String(value)])
        ).toString();
        return url.href;
    };

    // --- WERBUNG/STÖR-SELEKTOREN ---
    // Eine Quelle für CSS (sofort verstecken) UND JS-Entfernung (pagetual-Batches).
    const AD_SELECTORS = [
        'div.a_list#lmid',
        'div.horizontalFlexWithMargins[style*="justify-content: center"]',
        '.exo-native-widget-outer-container',
        'span[data-nosnippet]',
    ];
    // Marker, anhand derer Werbung/iframes in inline-flex-Containern erkannt werden
    const AD_MARKERS = [
        '.exo-native-widget-outer-container',
        '.adsbygoogle',
        'ins.adsbygoogle',
        'iframe[src*="exoclick"]',
        'iframe[src*="exosrv"]',
        '[data-ad-slot]',
        '[data-ad-client]'
    ];

export { CONSTANTS, DEFAULT_CONFIG, getRoute, getPerPage, safeStorageGet, safeStorageSet, readJson, CONFIG, AD_SELECTORS, AD_MARKERS, observers, debounce, sleep, isTyping, gmRequest, buildApiUrl, API_KEY_NAME, USER_ID_NAME, REMINDER_KEY };
