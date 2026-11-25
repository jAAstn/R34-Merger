// src/overlay.js – Hover-Overlay für Thumbnails (Tags mit Kategorien-Farben)
// Hover über einen Thumbnail → die Post-Seite wird einmalig geladen, daraus
// werden Tags + Kategorien geparst und in einem Overlay neben dem Thumbnail
// angezeigt (per Post-ID gecacht). Klick-Aktionen auf die Tags:
//   Linksklick   → Tag zur Suche hinzufügen (Overlay bleibt offen)
//   Rechtsklick  → Tag als -Tag ausschließen (kein Kontextmenü, Overlay bleibt offen)
//   Mittelklick  → Tag ins Suchfeld + Formular absenden (direkt suchen)
// Der Uploader („by <user>") wird im Overlay-Kopf angezeigt und ist klickbar.
// Die Kategorien kommen per Post-Seiten-Scrape (li[class*="tag-type-*"]) –
// kein Backend nötig. Der Fetch läuft über GM.xmlHttpRequest (gmRequest), da
// das Script im Userscript-Sandbox läuft und die API bereits granted ist.
import { gmRequest } from './core.js';
import { OVERLAY_CSS } from './css.js';
import { extractSidebarTags, extractUploader, CATEGORY_COLORS, CATEGORY_ORDER } from './overlay-parser.js';

const CACHE_LIMIT = 200;
const SHOW_DELAY_MS = 250;
const HIDE_DELAY_MS = 150;

const setupThumbOverlay = () => {
    GM_addStyle(OVERLAY_CSS);

    const postCache = new Map(); // postId -> { tags: [{name, category}], uploader: {name, url}|null }
    const inFlight = new Map();  // postId -> Promise (Fetch-Dedup)
    let overlay = null;
    let showTimer = null;
    let hideTimer = null;
    let activePostId = null;     // Post, dessen Overlay gerade sichtbar/am Laden ist
    let currentThumb = null;     // zuletzt gehovertes Thumbnail (für Positionierung)

    const getOverlay = () => {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'r34-thumb-overlay';
            document.body.appendChild(overlay);
        }
        return overlay;
    };
    const hideOverlay = () => {
        activePostId = null; // laufende Fetches verwerfen, sobald die Maus weg ist
        if (overlay) overlay.style.display = 'none';
    };

    const getThumbId = (thumb) => {
        if (thumb.id && thumb.id[0] === 'p' && /^\d+$/.test(thumb.id.slice(1))) return thumb.id.slice(1);
        const a = thumb.querySelector('a[href*="page=post"][href*="id="]');
        if (a) {
            try { return new URL(a.href, location.href).searchParams.get('id'); } catch { return null; }
        }
        return null;
    };

    const resolveProfileUrl = (href) => {
        try { return new URL(href, location.origin).href; } catch { return href; }
    };

    const makeHeader = (postId, uploader) => {
        const header = document.createElement('div');
        header.className = 'r34-ov-header';
        const idSpan = document.createElement('span');
        idSpan.className = 'r34-ov-id';
        idSpan.textContent = '#' + postId;
        header.appendChild(idSpan);
        if (uploader && uploader.name) {
            const by = document.createElement('a');
            by.className = 'r34-ov-user';
            by.textContent = 'by ' + uploader.name;
            by.href = resolveProfileUrl(uploader.url);
            by.target = '_blank';
            by.rel = 'noopener';
            header.appendChild(by);
        }
        return header;
    };

    // Post-Seite scrapen: Tags + Kategorien aus der Tag-Sidebar, Uploader aus #stats.
    const fetchPostTags = async (postId) => {
        const url = 'https://rule34.xxx/index.php?page=post&s=view&id=' + postId;
        const res = await gmRequest(url, { responseType: 'text' });
        if (res.status !== 200) throw new Error('HTTP ' + res.status);
        const html = res.response;
        if (typeof html !== 'string' || !html.length) throw new Error('Leere Antwort');
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return {
            tags: extractSidebarTags(doc),
            uploader: extractUploader(doc),
        };
    };

    // Fallback, falls die Post-Seite nicht geladen werden kann: Tags direkt aus
    // dem DOM lesen. rule34 schreibt die Tags in `alt` (bleibt auch bei aktiver
    // removeThumbTitles-Option erhalten), ältere Layouts nutzen `title`.
    const getTagsFromThumb = (thumb) => {
        const img = thumb && thumb.querySelector ? thumb.querySelector('img, video') : null;
        const raw = (img && (img.alt || img.title)) || '';
        if (!raw) return [];
        return String(raw).split(/\s+/).map(t => t.trim()).filter(Boolean).map(name => ({ name, category: 'general' }));
    };

    const renderLoading = (el, postId) => {
        el.innerHTML = '';
        el.appendChild(makeHeader(postId, null));
        const hint = document.createElement('div');
        hint.className = 'r34-ov-hint';
        hint.textContent = 'Loading tags…';
        el.appendChild(hint);
    };
    const renderError = (el, postId) => {
        el.innerHTML = '';
        el.appendChild(makeHeader(postId, null));
        const hint = document.createElement('div');
        hint.className = 'r34-ov-hint';
        hint.textContent = '⚠️ Tags could not be loaded';
        el.appendChild(hint);
    };

    const renderTags = (el, postId, tags, uploader) => {
        el.innerHTML = '';
        el.appendChild(makeHeader(postId, uploader));

        const groups = new Map();
        tags.forEach(t => {
            if (!groups.has(t.category)) groups.set(t.category, []);
            groups.get(t.category).push(t.name);
        });
        CATEGORY_ORDER.forEach(cat => {
            const names = groups.get(cat);
            if (!names || !names.length) return;
            const row = document.createElement('div');
            row.className = 'r34-ov-group';
            const label = document.createElement('span');
            label.className = 'r34-ov-label';
            label.style.color = CATEGORY_COLORS[cat];
            label.textContent = cat;
            row.appendChild(label);
            // General-Listen kappen, um das Overlay kompakt zu halten
            const shown = cat === 'general' ? names.slice(0, 12) : names;
            shown.forEach(name => {
                const tag = document.createElement('span');
                tag.className = 'r34-ov-tag';
                tag.dataset.tag = name;
                tag.dataset.category = cat;
                tag.style.borderColor = CATEGORY_COLORS[cat];
                tag.style.color = CATEGORY_COLORS[cat];
                tag.textContent = name.replace(/_/g, ' ');
                row.appendChild(tag);
            });
            if (cat === 'general' && names.length > 12) {
                const more = document.createElement('span');
                more.className = 'r34-ov-more';
                more.textContent = '+' + (names.length - 12) + ' general';
                row.appendChild(more);
            }
            el.appendChild(row);
        });

        const hint = document.createElement('div');
        hint.className = 'r34-ov-hint';
        hint.textContent = 'L-click: add · R-click: exclude · M-click: search';
        el.appendChild(hint);
    };

    const positionOverlay = (el, thumb) => {
        if (!thumb || typeof thumb.getBoundingClientRect !== 'function') return;
        const rect = thumb.getBoundingClientRect();
        const width = 380;
        let left = rect.right + 12;
        if (left + width > window.innerWidth) left = Math.max(8, rect.left - width - 12);
        let top = rect.top;
        if (top + el.offsetHeight > window.innerHeight) top = Math.max(8, window.innerHeight - el.offsetHeight - 8);
        el.style.left = left + 'px';
        el.style.top = top + 'px';
    };

    // Cache-first; sonst Overlay SOFORT mit Ladehinweis zeigen und einmalig fetchen.
    const showOverlay = (thumb) => {
        const postId = getThumbId(thumb);
        if (!postId) return;
        currentThumb = thumb;
        activePostId = postId;
        const el = getOverlay();
        el.style.display = 'block';

        const cached = postCache.get(postId);
        if (cached && cached.tags && cached.tags.length) {
            renderTags(el, postId, cached.tags, cached.uploader);
            positionOverlay(el, thumb);
            return;
        }

        // Sofort die Tags aus dem alt-Attribut zeigen (kein Netzwerk nötig) –
        // der Fetch verfeinert sie danach nur noch um Kategorien + Uploader. Nur
        // der ERSTE Aufruf pro Post rendert den Sofort-Inhalt; solange der Fetch
        // läuft (inFlight), bleibt der bestehende Inhalt unangetastet, damit
        // Maus-Mikrobewegungen den kategorisierten Zustand nicht überschreiben.
        const running = inFlight.get(postId);
        if (!running) {
            const instant = getTagsFromThumb(thumb);
            if (instant.length) {
                renderTags(el, postId, instant, null);
            } else {
                renderLoading(el, postId);
            }
        }
        positionOverlay(el, thumb);

        let promise = running;
        if (!promise) {
            promise = fetchPostTags(postId).then(result => {
                inFlight.delete(postId);
                // Nur nicht-leere Ergebnisse cachen – sonst würde ein leerer
                // Cache-Hit den Sofort-Inhalt später mit einem leeren Overlay
                // überschreiben.
                if (result && result.tags && result.tags.length) {
                    if (postCache.size >= CACHE_LIMIT) postCache.delete(postCache.keys().next().value);
                    postCache.set(postId, result);
                }
                return result;
            }).catch(err => {
                inFlight.delete(postId);
                console.debug('[Overlay] Tags-Fetch fehlgeschlagen:', err);
                return null;
            });
            inFlight.set(postId, promise);
        }
        promise.then(result => {
            if (activePostId !== postId) return; // Maus ist inzwischen woanders
            if (result && result.tags && result.tags.length) {
                // Fetch erfolgreich: mit Kategorien-Farben + Uploader neu rendern
                renderTags(el, postId, result.tags, result.uploader);
            } else if (!getTagsFromThumb(currentThumb).length) {
                // Weder Fetch noch alt/title-Attribut liefern Tags
                renderError(el, postId);
            }
            positionOverlay(el, currentThumb);
        });
    };

    // Show/Hide via Event-Delegation auf dem Dokument
    document.addEventListener('mouseover', (e) => {
        const target = e.target;
        if (!target || typeof target.closest !== 'function') return;
        if (overlay && overlay.contains(target)) { clearTimeout(showTimer); clearTimeout(hideTimer); return; }
        const thumb = target.closest('span.thumb');
        clearTimeout(hideTimer);
        if (!thumb) {
            clearTimeout(showTimer);
            hideTimer = setTimeout(hideOverlay, HIDE_DELAY_MS);
            return;
        }
        // Maus auf anderem Thumb: laufende Fetches des vorherigen Posts sofort
        // invalidieren, damit ihr Ergebnis nicht auf dem falschen Overlay landet.
        if (currentThumb && currentThumb !== thumb) activePostId = null;
        clearTimeout(showTimer);
        showTimer = setTimeout(() => showOverlay(thumb), SHOW_DELAY_MS);
    });

    // Suchfeld + Tag hineinlegen (Prefix '' = add, '-' = exclude). Overlay bleibt offen.
    const appendTagToInput = (tagName, prefix = '') => {
        const input = document.querySelector('input[name="tags"]');
        if (!input) return null;
        const term = prefix + tagName;
        const current = String(input.value || '').trim();
        input.value = current ? current + ' ' + term : term;
        input.focus();
        return input;
    };

    // Linksklick: Tag hinzufügen, Overlay bleibt offen
    document.addEventListener('click', (e) => {
        if (!overlay || overlay.style.display === 'none') return;
        const tagEl = e.target && typeof e.target.closest === 'function' ? e.target.closest('.r34-ov-tag') : null;
        if (!tagEl || !tagEl.dataset.tag) return;
        e.preventDefault();
        e.stopPropagation();
        appendTagToInput(tagEl.dataset.tag);
    }, true);

    // Mittelklick: Tag ins Suchfeld + Formular absenden (direkt suchen).
    // auxclick feuert für Mittel-/Rechtsklick; hier nur Button 1 behandeln.
    document.addEventListener('auxclick', (e) => {
        if (e.button !== 1) return;
        if (!overlay || overlay.style.display === 'none') return;
        const tagEl = e.target && typeof e.target.closest === 'function' ? e.target.closest('.r34-ov-tag') : null;
        if (!tagEl || !tagEl.dataset.tag) return;
        e.preventDefault();
        e.stopPropagation();
        const input = appendTagToInput(tagEl.dataset.tag);
        if (input) {
            const form = input.closest('form');
            if (form) form.submit();
        }
    }, true);

    // Rechtsklick: -Tag hinzufügen, Overlay bleibt offen, kein Kontextmenü.
    document.addEventListener('contextmenu', (e) => {
        if (!overlay || overlay.style.display === 'none') return;
        const tagEl = e.target && typeof e.target.closest === 'function' ? e.target.closest('.r34-ov-tag') : null;
        if (!tagEl || !tagEl.dataset.tag) return;
        e.preventDefault();
        e.stopPropagation();
        appendTagToInput(tagEl.dataset.tag, '-');
    }, true);

    // Autoscroll bei Mittelklick auf einen Tag unterdrücken (Action läuft über auxclick).
    document.addEventListener('mousedown', (e) => {
        if (e.button !== 1) return;
        if (!overlay || overlay.style.display === 'none') return;
        const tagEl = e.target && typeof e.target.closest === 'function' ? e.target.closest('.r34-ov-tag') : null;
        if (tagEl) e.preventDefault();
    }, true);

    window.addEventListener('scroll', hideOverlay, { passive: true });
    window.addEventListener('popstate', hideOverlay);
    window.addEventListener('pushstate', hideOverlay);
    window.addEventListener('replacestate', hideOverlay);
};

export { setupThumbOverlay };
