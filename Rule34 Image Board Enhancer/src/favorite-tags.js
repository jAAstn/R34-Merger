// favorite-tags.js – Favorite-Tags-Panels (main + USER) als EINE parametrisierte
// Komponente. Das Original hatte addFavoriteTags()/addFavoriteTagsUSER() sowie
// getTagsHtml()/getTagsHtmlUSER() als ~90 %-Duplikate (nur Storage-Key,
// DOM-Präfix, Titel, Settings-Button, Listenfarbe und Tagtypen-Sortierung
// unterschieden sich). Hier steuert `kind` genau diese Unterschiede.
import { state, getParsedTagsFromInput, addGlobalStyle, escapeAttr, escapeHtml, mergeTagsIntoList } from './core.js';
import { settings } from './settings.js';
import { FAVORITE_TAGS_CSS, FAVORITE_TAGS_USER_CSS } from './css.js';
import { updateTitleColors } from './title-colors.js';

const PANELS = {
    main: {
        key: 'favoriteTags',            // settings-Key für die Tag-Liste
        showKey: 'showFavoriteTags',    // settings-Key für das Show-Flag
        prefix: 'ibenhancer-favorite-tags',
        titleId: 'ibe-title-main',
        titleLabel: 'Image Board Enhancer',
        hasSettingsButton: true,
        sortByType: true,
        css: FAVORITE_TAGS_CSS,
    },
    user: {
        key: 'favoriteTagsUSER',
        showKey: 'showFavoriteTagsUSER',
        prefix: 'ibenhancerUSER-favorite-tags',
        titleId: 'ibe-title-user',
        titleLabel: 'Image Board Enhancer User',
        hasSettingsButton: false,
        sortByType: false,
        css: FAVORITE_TAGS_USER_CSS,
    },
};

export function createFavoriteTagsPanel(kind) {
    const cfg = PANELS[kind];
    const tagSettings = settings[cfg.key];          // { [site]: 'tag1 tag2 …' }
    const showFlag = settings[cfg.showKey];         // { draw: bool, open: bool }
    const { prefix } = cfg;

    if (typeof tagSettings[state.site] !== 'string') tagSettings[state.site] = '';

    const ibenhancer = document.getElementById('ibenhancer');

    const titleSpan = `<span id='${cfg.titleId}' style='font-weight:bold; transition: color 0.2s; color: #fff;'>${cfg.titleLabel}</span>`;
    const settingsButton = cfg.hasSettingsButton
        ? '<button id="ibenhancerSettingsButton">Settings</button>'
        : '';

    ibenhancer.insertAdjacentHTML('beforeend', `
            ${kind === 'user' ? `<br>${titleSpan}` : ''}
            <div id="${prefix}">
                <details ${showFlag['open'] ? 'open' : ''}>
                    <summary style="color: white;">Favorite Tags <button id="${prefix}-add-current" title="Aktuellen Such-Tag zu Favoriten hinzufügen" style="margin-top: 4px; font-size: 11px; padding: 2px 6px;">+</button></summary>
                    <div id="${prefix}-content">
                        <span id="${prefix}-edit-button">Edit</span>
                        ${settingsButton}
                        <div id="${prefix}-list"></div>
                    </div>
                    <div id="${prefix}-editor">
                        <textarea id="${prefix}-textarea" style="width: 212px; height: 500px; margin: auto;color: white;"></textarea>
                        <button id="${prefix}-editor-save-button">Save</button><button id="${prefix}-editor-cancel-button">Cancel</button>
                    </div>
                </details>
            </div>
        `);

    document.getElementById(`${prefix}-add-current`).addEventListener('click', (e) => {
        e.preventDefault();
        const newTags = getParsedTagsFromInput();
        if (!newTags) return;

        // v2.0.8: mergeTagsIntoList (core.js) – inkl. Pair-Dedup: Pair-Tags
        // werden reihenfolge-egal verglichen, ein Paar mit denselben Mitgliedern
        // wird ersetzt statt doppelt gespeichert. Getestet in parser.test.mjs.
        const merged = mergeTagsIntoList(
            tagSettings[state.site].trim().split(/\s+/).filter(t=>t),
            newTags
        );

        if (merged.changed) {
            tagSettings[state.site] = merged.list.join(' ');
            GM.setValue(cfg.key, tagSettings);
            renderList();
            updateTitleColors();
        }
    });

    document.querySelector(`#${prefix} > details > summary`).addEventListener('click', () => {
        setTimeout(() => {
            showFlag['open'] = document.querySelector(`#${prefix} > details`).open;
            GM.setValue(cfg.showKey, showFlag);
        });
    });

    document.getElementById(`${prefix}-edit-button`).addEventListener('click', () => {
        const textarea = document.getElementById(`${prefix}-textarea`);
        textarea.value = tagSettings[state.site];
        document.getElementById(prefix).classList.add('edit');
        setTimeout(() => { textarea.scrollTop = textarea.scrollHeight; }, 0);
    });

    document.getElementById(`${prefix}-editor-cancel-button`).addEventListener('click', () => {
        document.getElementById(prefix).classList.remove('edit');
    });

    document.getElementById(`${prefix}-editor-save-button`).addEventListener('click', () => {
        tagSettings[state.site] = document.getElementById(`${prefix}-textarea`).value;
        GM.setValue(cfg.key, tagSettings);
        renderList();
        updateTitleColors();
        setTimeout(() => document.getElementById(prefix).classList.remove('edit'), 0);
    });

    function renderList() {
        // v2.0.10: /\s+/ statt split(' ') – die gespeicherte Liste kommt aus
        // einem mehrzeiligen Textarea; Zeilenumbrüche/Tabs erzeugten sonst EINEN
        // Tag mit eingebettetem Whitespace. Deckt sich jetzt mit dem Split in
        // add-current (mergeTagsIntoList) und dem Pair-Dedup-Vergleich.
        const tags = tagSettings[state.site].trim().split(/\s+/).filter(t => t).reverse();
        document.getElementById(`${prefix}-list`).innerHTML = getTagsHtml(kind, tags);
    }

    renderList();

    addGlobalStyle(cfg.css);
}

// Baut die +/−/Tag-Links einer Favorite-Tag-Liste.
// `main` sortiert Metadaten-Tags (rating:/score:/user:/id:/date:/status:/size:)
// ans Ende (tagtype 10), `user` behält die Eingabe-Reihenfolge – identisch
// zu getTagsHtml()/getTagsHtmlUSER() des Originals.
// v2.0.7: Beide Links nutzen data-Attribute (+/−) mit escapeAttr statt
// Inline-onclick mit unescaped Tag-Text (Attribut-Breakout möglich).
export function getTagsHtml(kind, tags) {
    const cfg = PANELS[kind];
    let tagHTML = '';
    const linksHTML = [];
    for (let i = 0; i < tags.length; i++) {
        if (tags[i] === '//') break;
        if (tags[i] !== '') {
            let displayTag = tags[i];
            if (/^\(\+.+\+~\+.+\+\)$/.test(displayTag)) {
                const inner = displayTag.slice(2, -2).split('+').join(' ').trim();
                displayTag = `( ${inner} )`;
            }
            const color = '';
            let tagtype = 5;
            if (displayTag.startsWith("rating:") || displayTag.startsWith("score:") || displayTag.startsWith("user:") || displayTag.startsWith("id:") || displayTag.startsWith("date:") || displayTag.startsWith("status:") || displayTag.startsWith("size:")) tagtype = 10;
            const plusLink = `<a href="https://rule34.xxx/" data-add-tag="${escapeAttr(displayTag)}" ${color}>+</a>`;
            const minusLink = `<a href="https://rule34.xxx/" data-minus-tag="${escapeAttr(displayTag)}" ${color}>-</a>`;
            // v2.0.10: Der Tag-SUCH-Link (dritter Link) war bis hierher der
            // einzige unescapte Pfad – sowohl im href (Attribut-Breakout bei ")
            // als auch im Textinhalt (HTML-Injection bei <). Die +/- -Links waren
            // seit v2.0.7 sicher, dieser Pfad blieb offen: ein Tag wie
            // `a" onmouseover="…` oder `<img onerror=…>` aus der eigenen
            // Favorite-Liste wurde ungefiltert in das DOM geschrieben.
            // href: escapeAttr (doppelt-quotiertes Attribut), Text: escapeHtml.
            const tagLink  = `<a href="${escapeAttr(state.tagSearchLink + displayTag)}" ${color}>${escapeHtml(displayTag)}</a>`;
            linksHTML.push({ html: `<span>${plusLink}&nbsp;${minusLink}&nbsp;${tagLink}</span>`, type: tagtype });
        }
    }
    if (cfg.sortByType) linksHTML.sort((a, b) => a.type - b.type);
    for (let i = 0; i < linksHTML.length; i++) { tagHTML += linksHTML[i].html; }
    return tagHTML;
}
