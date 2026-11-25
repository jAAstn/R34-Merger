// settings.js – zentrale Einstellungen (GM-Storage) + Custom-Sites.
// Ersetzt die 17 top-level `await GM.getValue(...)`-Aufrufe der Einzeldatei.
// Alle Module lesen/schreiben über das gemeinsame `settings`-Objekt (Muster:
// `state`-Objekt des Rule34 Favorites Enhancers). loadSettings() läuft in
// init.js VOR jedem anderen Setup – gleiche Reihenfolge wie im Original.

export const DEFAULT_SETTINGS = {
    resizeImageToFit: true,
    resizeVideoToFit: true,
    autoplayVideos: true,
    autoScrollToContent: true,
    updateWithWindowResize: false,
    updateScrollOnWindowResize: false,
    showFitButton: false,
    showScrollButton: false,
    removeFluid: false,
    videoVolume: 0,
    alwaysShowScrollbars: false,
    resizeButton: 'BracketLeft',
    scrollButton: 'BracketRight',
    showFavoriteTags: { draw: true, open: false },
    favoriteTags: {},
    showFavoriteTagsUSER: { draw: true, open: false },
    favoriteTagsUSER: {},
    customSites: {},
};

export const settings = { ...DEFAULT_SETTINGS };

export async function loadSettings() {
    // v2.0.10: Ein Promise.all über alle Keys statt 17 sequentieller
    // `await GM.getValue(...)`-Aufrufe. Sequentiell bedeutete: die Summe aller
    // Storage-Latenzen (17 Roundtrips zur Userscript-Engine) blockierte den
    // Start von init() – bei jedem Seitenaufruf. Parallel ist es die
    // langsamste Latenz statt der Summe. Reihenfolge der Zuweisungen bleibt
    // durch die feste Reihenfolge im Promise.all-Array erhalten.
    const KEYS = Object.keys(DEFAULT_SETTINGS);
    const values = await Promise.all(KEYS.map(key => GM.getValue(key, DEFAULT_SETTINGS[key])));
    KEYS.forEach((key, i) => { settings[key] = values[i]; });
}
