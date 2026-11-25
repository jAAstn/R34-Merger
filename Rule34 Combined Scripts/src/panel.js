import { TAG } from './tag-hider.js';
import { readJson, safeStorageGet, safeStorageSet, DEFAULT_CONFIG, CONFIG, isTyping } from './core.js';
import { PANEL_CSS } from './css.js';

    const setupControlPanel = () => {
        // Panel-Styles zentral aus src/css.js (inkl. Tooltip-Info)
        GM_addStyle(PANEL_CSS);
        const storedPos = readJson('r34_button_pos', {});
        const savedPos = {
            top: Number.isFinite(Number(storedPos?.top)) ? Number(storedPos.top) : 10,
            left: Number.isFinite(Number(storedPos?.left)) ? Number(storedPos.left) : 162,
        };
        let isVisible = safeStorageGet('r34_button_visible') !== 'false';
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'R34 Panel⚙️';
        toggleBtn.className = 'r34-panel-btn';
        // Inline-Styles bewusst mit !important setzen (setProperty): PANEL_CSS definiert
        // left/top mit !important (feste Ausgangsposition 100px/1px) – ohne !important
        // würden Drag-Position und gespeicherte Position (r34_button_pos) dagegen verlieren.
        const setPos = (el, left, top) => {
            el.style.setProperty('left', `${left}px`, 'important');
            el.style.setProperty('top', `${top}px`, 'important');
        };
        setPos(toggleBtn, savedPos.left, savedPos.top);
        const panel = document.createElement('div');
        panel.className = 'r34-panel';

        // --- SmartSkip+ Sektion (Tag Hider) ---
        const smartSkip = document.createElement('div');
        smartSkip.className = 'r34-panel-section';
        smartSkip.style.borderBottom = '1px solid #444';
        smartSkip.style.marginBottom = '8px';
        smartSkip.style.paddingBottom = '8px';
        smartSkip.innerHTML = [
            '<strong>SmartSkip+</strong>',
            '<button id="toggleSkip" class="r34-btn" type="button">' + (TAG.getEnabled() ? 'Disable 🔴' : 'Enable 🟢') + '</button>',
            '<button id="editTags" class="r34-btn" type="button">Edit Rules</button>',
            '<button id="importCookie" class="r34-btn" type="button">Import Cookie</button>',
            '<div id="skipLockedHint" style="display:none;color:#fc6;font-size:11px;margin-top:4px;line-height:1.4">🔒 Tag-Hider is disabled on this page (post view / your own favorites). Rules stay active on other pages.</div>',
        ].join('');
        panel.appendChild(smartSkip);

        const form = document.createElement('form');
        const groupedFeatures = {
            'Core': ['favoriteOnMouse', 'removeDuplicates', 'removeAnnoyances', 'fixPaginatorLinks', 'removePidParameter', 'restoreDeletedPost', 'infiniteScroll'],
            'Performance': ['nativeLazyLoading'],
            'Visual': ['collapsibleHeader', 'hideBlacklisted', 'hideEmptyThumbSpans', 'faviconChanger', 'pageIndicator', 'removeThumbTitles', 'cleanupFavoritesArtifacts', 'favoriteMarker', 'thumbOverlay']
        };
        const descriptions = {
            favoriteOnMouse: 'Favorisieren mit Seitentaste (X1)',
            removeDuplicates: 'Entfernt doppelte Thumbnails auf der Seite',
            removeAnnoyances: 'Entfernt Werbung und störende Elemente',
            fixPaginatorLinks: 'Repariert defekte Paginierungs-Links',
            removePidParameter: 'Entfernt unnötige PID-Parameter aus URLs',
            restoreDeletedPost: 'Stellt gelöschte Posts über die API wieder her',
            nativeLazyLoading: 'Aktiviert natives Lazy Loading für Bilder',
            collapsibleHeader: 'Header klappt automatisch ein/aus',
            hideBlacklisted: 'Versteckt geblacklistete Inhalte',
            hideEmptyThumbSpans: 'Entfernt leere Thumbnail-Container',
            faviconChanger: 'Ändert das Favicon je nach Seite',
            pageIndicator: 'Zeigt aktuelle Seitennummer an',
            removeThumbTitles: 'Entfernt Tooltips von Thumbnails',
            cleanupFavoritesArtifacts: 'Räumt Lücken/Reste auf Favoriten-Seiten auf',
            favoriteMarker: 'Markiert favorisierte Posts auf Suchergebnis-Seiten',
            thumbOverlay: 'Zeigt Tags beim Hovern über Thumbnails',
            infiniteScroll: 'Lädt Suchergebnis-Seiten automatisch nach (ersetzt Pagetual)'
        };

        Object.entries(groupedFeatures).forEach(([group, keys]) => {
            let sectionHtml = `<strong>${group}</strong>`;
            keys.forEach(key => {
                sectionHtml += `<label><input type="checkbox" name="${key}" ${CONFIG[key] ? 'checked' : ''}> ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`;
                if (descriptions[key]) sectionHtml += `<span class="tooltip-info" title="${descriptions[key]}"> ℹ️</span>`;
                sectionHtml += `</label>`;
            });
            form.insertAdjacentHTML('beforeend', sectionHtml);
        });

        form.insertAdjacentHTML('beforeend', `<div><button type="submit" class="save-btn">💾 Save & Reload</button><button type="button" class="cancel-btn">❌ Cancel</button></div>`);
        panel.appendChild(form);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const newConfig = {};
            Object.keys(DEFAULT_CONFIG).forEach(key => newConfig[key] = formData.has(key));
            safeStorageSet('r34_feature_flags', JSON.stringify(newConfig));
            location.reload();
        });
        form.querySelector('.cancel-btn').addEventListener('click', () => panel.style.display = 'none');

        // --- SmartSkip+ Verdrahtung (Tag Hider) ---
        // WICHTIG: Das Panel wird erst am Ende von setupControlPanel in den
        // Body gehängt. Deshalb hier NIE document.getElementById verwenden,
        // sondern im bereits erzeugten Panel-Knoten suchen.
        const skipToggleBtn = smartSkip.querySelector('#toggleSkip');
        const skipEditBtn = smartSkip.querySelector('#editTags');
        const skipImportBtn = smartSkip.querySelector('#importCookie');
        skipToggleBtn.addEventListener('click', () => {
            const nowEnabled = TAG.toggle();
            skipToggleBtn.textContent = nowEnabled ? 'Disable 🔴' : 'Enable 🟢';
        });
        skipEditBtn.addEventListener('click', TAG.openRules);
        skipImportBtn.addEventListener('click', TAG.openCookie);

        // Rechtsklick auf Button oder Panel → Panel komplett ausblenden (dauerhaft)
        const hidePanelCompletely = () => {
            toggleBtn.remove();
            panel.remove();
            safeStorageSet('r34_button_visible', 'false');
            isVisible = false;
        };
        toggleBtn.addEventListener('contextmenu', e => { e.preventDefault(); hidePanelCompletely(); });
        panel.addEventListener('contextmenu', e => { e.preventDefault(); hidePanelCompletely(); });

        let suppressNextPanelClick = false;
        toggleBtn.addEventListener('click', () => {
            if (suppressNextPanelClick) {
                suppressNextPanelClick = false;
                return;
            }
            const rect = toggleBtn.getBoundingClientRect();
            setPos(panel, rect.left, rect.bottom + window.scrollY + 5);
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        toggleBtn.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            const rect = toggleBtn.getBoundingClientRect();
            const shiftX = e.clientX - rect.left;
            const shiftY = e.clientY - rect.top;
            const startX = e.pageX;
            const startY = e.pageY;
            let hasMoved = false;
            const dragThreshold = 5;
            const moveAt = (pageX, pageY) => {
                setPos(toggleBtn, pageX - shiftX, pageY - shiftY);
            };
            const onMouseMove = moveEvent => {
                if (!hasMoved && Math.hypot(moveEvent.pageX - startX, moveEvent.pageY - startY) < dragThreshold) return;
                hasMoved = true;
                suppressNextPanelClick = true;
                moveAt(moveEvent.pageX, moveEvent.pageY);
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (!hasMoved) {
                    suppressNextPanelClick = false;
                    return;
                }
                safeStorageSet('r34_button_pos', JSON.stringify({
                    top: parseInt(toggleBtn.style.top, 10) || 0,
                    left: parseInt(toggleBtn.style.left, 10) || 0,
                }));
                // Falls der Browser nach einem Drag keinen click feuert,
                // darf der Zustand keinen späteren echten Klick verschlucken.
                setTimeout(() => { suppressNextPanelClick = false; }, 250);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        toggleBtn.ondragstart = () => false;

        document.addEventListener('keydown', e => {
            if (e.altKey && e.key.toLowerCase() === 'p' && !isTyping()) {
                e.preventDefault();
                const isNowVisible = document.body.contains(toggleBtn);
                if (isNowVisible) {
                    toggleBtn.remove();
                    panel.remove();
                    safeStorageSet('r34_button_visible', 'false');
                } else {
                    document.body.appendChild(toggleBtn);
                    document.body.appendChild(panel);
                    safeStorageSet('r34_button_visible', 'true');
                }
            }
        });

        if (isVisible) {
            document.body.appendChild(toggleBtn);
            document.body.appendChild(panel);
        }
        // Panel-Zustand initial setzen (Sperr-Hinweis auf gesperrten Routen)
        TAG.updatePanelState();
    };

export { setupControlPanel };
