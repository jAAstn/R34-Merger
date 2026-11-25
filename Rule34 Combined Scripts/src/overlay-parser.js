// src/overlay-parser.js – purer Post-Seiten-Parser (Sidebar-HTML → Tags+Kategorien + Uploader).
// Keine DOM-Globals am Modul-Load: extractSidebarTags/extractUploader bekommen ein bereits
// geparstes Document (DOMParser im Browser, linkedom im Unit-Test). Bewusst ohne core.js/
// css.js-Import, damit das Modul isoliert testbar bleibt.

export const CATEGORY_COLORS = {
    artist: '#ffa500',
    copyright: '#b06fdb',
    character: '#6fdb6f',
    metadata: '#ffd700',
    deprecated: '#ff6b6b',
    lore: '#6cf',
    general: '#ddd',
};
export const CATEGORY_ORDER = ['artist', 'copyright', 'character', 'metadata', 'deprecated', 'lore', 'general'];

// Kategorie robust aus der Klassliste lesen (unabhängig von der Klassen-Reihenfolge)
const categoryFromEl = (el) => {
    if (!el) return null;
    let cls = '';
    try {
        cls = (typeof el.className === 'string' ? el.className : (el.getAttribute ? el.getAttribute('class') : '')) || '';
    } catch { /* ignore */ }
    const m = cls.match(/tag-type-([a-z]+)/);
    return m && CATEGORY_COLORS[m[1]] ? m[1] : null;
};

// rule34-Markup: Die Sidebar enthält Kategorie-Header als <li><h6>Kategorie</h6></li>
// (keine echten Tags) und jedes Tag-LI hat ZWEI Anker: der erste ist der "?"-Wiki-Link,
// der zweite der Tag-Name (href mit page=post). Header werden ignoriert, der Name kommt
// aus dem page=post-Anker, die Kategorie aus der li-Klasse.
export function extractSidebarTags(doc) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return [];
    const lis = doc.querySelectorAll('#tag-sidebar li.tag, #tag-sidebar li[class*="tag-type"]');
    const tags = [];
    Array.from(lis).forEach(li => {
        const anchors = li.querySelectorAll('a');
        let a = null;
        for (const cand of Array.from(anchors)) {
            const href = (cand.getAttribute('href') || '').toLowerCase();
            if (href.includes('page=post')) { a = cand; break; }
        }
        if (!a) a = anchors[0] || null;
        const raw = (a ? a.textContent : li.textContent) || '';
        const name = raw.replace(/\s+/g, ' ').trim().replace(/ /g, '_');
        if (!name || name === '?') return;
        const category = categoryFromEl(li) || categoryFromEl(a) || 'general';
        tags.push({ name, category });
    });
    return tags;
}

// Uploader aus #stats ("Posted … by <a href="…page=account&s=profile…">Name</a>").
// Fallback: erstes account/profile-Link außerhalb von #tag-sidebar.
function pickProfileLink(a) {
    if (!a) return null;
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (!href.includes('page=account') || !href.includes('s=profile')) return null;
    const name = String(a.textContent || '').replace(/\s+/g, ' ').trim();
    if (!name) return null;
    return { name, url: a.getAttribute('href') };
}

export function extractUploader(doc) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return null;
    const stats = doc.querySelector('#stats');
    if (stats) {
        for (const a of Array.from(stats.querySelectorAll('a[href*="page=account"]'))) {
            const hit = pickProfileLink(a);
            if (hit) return hit;
        }
    }
    // Fallback: Dokument-weit suchen, aber Tag-Sidebar ausklammern (dort stehen nur Tags).
    for (const a of Array.from(doc.querySelectorAll('a[href*="page=account"]'))) {
        if (a.closest && a.closest('#tag-sidebar')) continue;
        const hit = pickProfileLink(a);
        if (hit) return hit;
    }
    return null;
}
