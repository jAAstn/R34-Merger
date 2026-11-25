// core.js – Site-Erkennung, gemeinsamer State und pure/kleine Helfer.
// Der modul-übergreifende Laufzeit-Zustand (Selektoren, Keyboard-Flag) lebt
// zentral im `state`-Objekt, damit alle Module denselben Datenstand teilen
// (Ein-Datei-Verhalten). Die Einstellungen liegen separat in settings.js.

// ── Site-Erkennung ───────────────────────────────────────────────────────────
// v2.0.10: Anker im replace – vorher ersetzte .replace('www.', '') das erste
// VORKOMMEN anywhere im Hostnamen, nicht nur ein Präfix: 'notwww.example.com'
// wurde zu 'notexample.com' und 'www.www.example.com' zu 'www.example.com'.
// Der Storage-Key (settings.favoriteTags[site]) ist der Hostname, ein
// falscher Key bedeutet: Einstellungen und Favoriten-Tags landen unter einer
// fremden Site und tauchen nie wieder auf.
const site = document.location.hostname.toLowerCase().replace(/^www\./, '');

// ── Shared State ─────────────────────────────────────────────────────────────
// toolbarDOM/playerDOM werden von configureSites (sites.js) gesetzt;
// changeKeyboardShortcut steuert media.js (keyboardShortcuts) ↔ toolbar.js.
export const state = {
    site,
    toolbarDOM: '.sidebar form',
    containerDOM: '#content',
    imageDOM: '#image',
    playerDOM: undefined,
    thumbnailDOM: '.thumb',
    placeSettingsAfter: true,
    tagSearchLink: '/index.php?page=post&s=list&tags=',
    changeKeyboardShortcut: false,
};

export const debugMode = false;

// ── Utils ────────────────────────────────────────────────────────────────────
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Injektion von CSS in EINE Style-Instanz (#ibe-custom-styles), identisch
// zum Original (addGlobalStyle hängt an bestehende Styles an).
export function addGlobalStyle(css) {
    let style = document.getElementById('ibe-custom-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'ibe-custom-styles';
        style.setAttribute('type', 'text/css');
        document.head.appendChild(style);
    }
    style.innerHTML += css;
}

// True, wenn der Nutzer gerade in ein Eingabefeld tippt – Keyboard-Shortcuts
// sollen dann nicht feuern (v2.0.7). Gleiche Logik wie im Combined Scripts.
export function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// Escaped einen Wert für ein doppelt-quotiertes HTML-Attribut (data-*, href).
// Reihenfolge ist relevant: & muss ZUERST escaped werden, sonst würden die
// "&"-" in "&quot;"/"&amp;" doppelt escapt (v2.0.7).
export function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Escaped einen Wert für HTML-Textinhalt (zwischen > und <). Deckt zusätzlich
// < und > ab, die in escapeAttr() bewusst fehlen (dort sind sie im Attribut-
// Kontext unkritisch, im Textkontext nicht).
export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ── Pure Helfer (testbar) ────────────────────────────────────────────────────
// Extrahiert die "Basis" eines Tags für den Vergleich.
// Für Pair-Tags "(+left+~+right+)" wird der linke Teil zurückgegeben.
// Für einfache Tags wird der Tag unverändert zurückgegeben.
export function getBaseTag(tag) {
    if (/^\(\+.+\+~.+\+\)$/.test(tag)) {
        const inner = tag.slice(2, -2);
        const [left] = inner.split('+~+');
        return left.trim();
    }
    return tag;
}

// Reiner Parser: Roh-Input → Liste valider Such-Tags (ohne DOM).
// Aus getParsedTagsFromInput() des Originals extrahiert und isoliert testbar.
export function parseTagsString(rawInput) {
    const newTags = [];
    const regex = /\([^)~]+~[^)]+\)|[^\s]+/g;
    const matches = rawInput.match(regex);
    if (!matches) return null;

    for (let rawTag of matches) {
        rawTag = rawTag.trim();
        const isUserTag = rawTag.startsWith('user:');
        const isPairTag = /^\(.*~.*\)$/.test(rawTag);
        const isNegated = rawTag.startsWith('-');
        const isSpecial = !isUserTag && rawTag.includes(':');
        const isComparison = /[<>!=]/.test(rawTag);

        if (isPairTag) {
            const pairFormatted = rawTag.replace(/[()]/g, '').split('~').map(s => s.trim().replace(/\s+/g, '+')).join('+~+');
            rawTag = `(+${pairFormatted}+)`;
        }

        if ((isUserTag || isPairTag || (!isNegated && !isSpecial && !isComparison)) && rawTag !== '') {
            newTags.push(rawTag);
        }
    }
    return newTags;
}

// DOM-Wrapper: liest den Such-Input und delegiert an parseTagsString.
export function getParsedTagsFromInput() {
    const inputEl = document.querySelector('input[name="tags"]');
    if (!inputEl) return null;
    const rawInput = inputEl.value.trim();
    if (!rawInput) return null;
    return parseTagsString(rawInput);
}

// Reine Fit-Mathematik aus applyResize() (media.js): Zielbreite/-höhe bei
// gegebener Fenster- und Content-Aspect-Ratio. Verhält sich wie das Original
// inkl. des Else-Zweigs bei exakt gleichem Seitenverhältnis.
// v2.0.8: Aspect-Guard – bei unbekannten/ungültigen Proportionen (0/NaN,
// z. B. Medium noch nicht geladen) wird null zurückgegeben statt durch 0 zu
// dividieren (vorher: height = Infinity). applyResize bricht dann ab.
export function computeFit(windowAspect, contentAspect, windowWidth, windowHeight) {
    if (!(windowAspect > 0) || !(contentAspect > 0) || !(windowWidth > 0) || !(windowHeight > 0)) {
        return null;
    }
    if (windowAspect > contentAspect) {
        return { width: windowHeight * contentAspect, height: windowHeight };
    }
    return { width: windowWidth, height: windowWidth / contentAspect };
}

// Sortierte, kleingeschriebene Mitgliederliste eines Pair-Tags in Kanon-Form
// "(+a+~+b+~+c+)", oder null für einfache Tags. Basis für das Pair-Dedup
// (v2.0.8): ( TAG1 ~ TAG2 ) und ( TAG2 ~ TAG1 ) sind dasselbe Paar, ebenso
// ( a ~ b ~ c ) == ( c ~ a ~ b ) – die Reihenfolge der Mitglieder ist egal.
export function getPairSet(tag) {
    if (typeof tag !== 'string' || !/^\(\+.+\+~.+\+\)$/.test(tag)) return null;
    const members = tag.slice(2, -2).split('+~+').map(s => s.trim().toLowerCase());
    if (members.length < 2) return null;
    return members.sort();
}

// Fügt neue Tags in eine bestehende Favorite-Liste ein (v2.0.8, aus dem
// add-current-Handler von favorite-tags.js extrahiert und rein testbar).
// Reihenfolge-egal-Vergleich für Pair-Tags: Ist bereits ein Paar mit denselben
// Mitgliedern gespeichert, wird es an gleicher Position durch das neue Paar
// ERSETZT statt ein Duplikat anzuhängen. Rückgabe: { list, changed }.
export function mergeTagsIntoList(tagList, newTags) {
    const result = tagList.slice();
    let changed = false;

    for (const tag of newTags) {
        const tagLower = tag.toLowerCase();
        const tagBaseLower = getBaseTag(tag).toLowerCase();
        const tagSet = getPairSet(tag);

        // 1) Exakte Übereinstimmung → nichts tun (z.B. einfacher Tag vs.
        //    einfacher Tag mit gleichem Namen oder gleicher Pair-Kanon-Form).
        if (result.some(t => t.toLowerCase() === tagLower)) continue;

        let replaced = false;

        // 2) Gleiche Pair-Mitglieder (Reihenfolge egal) → vorhandenes Paar
        //    an gleicher Position durch das neue Paar ersetzen.
        if (tagSet) {
            const setKey = tagSet.join('\u0000');
            for (let i = 0; i < result.length; i++) {
                const existingSet = getPairSet(result[i]);
                if (existingSet && existingSet.join('\u0000') === setKey) {
                    result[i] = tag;
                    replaced = true;
                    changed = true;
                    break;
                }
            }
        }

        // 3) Gleiche Basis (z.B. einfacher Tag vs. Pair mit gleichem linken
        //    Teil) → an gleicher Position ersetzen (Original-Verhalten).
        if (!replaced) {
            for (let i = 0; i < result.length; i++) {
                if (getBaseTag(result[i]).toLowerCase() === tagBaseLower) {
                    result[i] = tag;
                    replaced = true;
                    changed = true;
                    break;
                }
            }
        }

        // 4) Kein Match → neu ans Ende anhängen.
        if (!replaced) {
            result.push(tag);
            changed = true;
        }
    }

    return { list: result, changed };
}
