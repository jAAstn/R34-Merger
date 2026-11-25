// toolbar.js – Toolbar (#ibenhancer), Settings-Modal und deren Logik.
// Erzeugt die Toolbar nur, wenn im DOM ein Bild, Video oder Thumbnail
// existiert (identisch zum Original); die Settings-UI wird immer mit
// eingebaut, die Favorite-Tags-Panels nur wenn aktiviert.
import { state, addGlobalStyle } from './core.js';
import { settings } from './settings.js';
import { MAIN_CSS } from './css.js';
import { createFavoriteTagsPanel } from './favorite-tags.js';
import { getContentProps, fitContent, scrollToContent } from './media.js';

export function createToolbar() {
    const imageExists = document.querySelector(`${state.containerDOM} ${state.imageDOM}`);
    const videoExists = document.querySelector(`${state.containerDOM} video`);
    const thumbExists = document.querySelector(state.thumbnailDOM);

    if (!document.getElementById('ibenhancer') && (imageExists || videoExists || thumbExists)) {

        const titleMain = `<span id='ibe-title-main' style='font-weight:bold; transition: color 0.2s; color: #fff;'>Image Board Enhancer</span>`;
        const toolbarTarget = document.querySelector(state.toolbarDOM);

        if (toolbarTarget) {
            const html = `<div id='ibenhancer'>${titleMain}</div>`;
            toolbarTarget.insertAdjacentHTML(state.placeSettingsAfter ? 'afterend' : 'beforebegin', html);
        }

        const ibenhancer = document.getElementById('ibenhancer');
        if (!ibenhancer) return;

        if (settings.showFitButton && (imageExists || videoExists)) {
            ibenhancer.insertAdjacentHTML('beforeend', "<button id='fitContentButton' style='margin-top: 3px;'>Fit</button>");
            document.getElementById('fitContentButton').addEventListener('click', () => { getContentProps(); fitContent(0); });
        }

        if (settings.showScrollButton && (imageExists || videoExists)) {
            ibenhancer.insertAdjacentHTML('beforeend', "<button id='scrollContentButton' style='margin-top: 3px;'>Scroll</button>");
            document.getElementById('scrollContentButton').addEventListener('click', () => scrollToContent(0));
        }

        ibenhancer.insertAdjacentHTML('beforeend', `
                <div id="ibenhancerSettings-blocker"></div>
                <div id="ibenhancerSettings">
                  <div id="ibenhancerSettings-options">
                    <label><input id="resizeImageToFitCheckbox" type="checkbox" ${settings.resizeImageToFit ? 'checked' : ''}>Resize images to fit screen.</label><br>
                    <label><input id="resizeVideoToFitCheckbox" type="checkbox" ${settings.resizeVideoToFit ? 'checked' : ''}>Resize videos to fit screen.</label><br>
                    <label><input id="autoplayVideosCheckbox" type="checkbox" ${settings.autoplayVideos ? 'checked' : ''}>Autoplay videos.</label><br>
                    <label><input id="autoScrollToContentCheckbox" type="checkbox" ${settings.autoScrollToContent ? 'checked' : ''}>Scroll to content.</label><br>
                    <label><input id="removeFluidCheckbox" type="checkbox" ${settings.removeFluid ? 'checked' : ''}>Remove fluid video player.</label><br>
                    <label><input id="alwaysShowScrollbarsCheckbox" type="checkbox" ${settings.alwaysShowScrollbars ? 'checked' : ''}>Always show scrollbars.</label><br>
                    <label><input id="showFavoriteTagsCheckbox" type="checkbox" ${settings.showFavoriteTags['draw'] ? 'checked' : ''}>Show favorite tags.</label><br>
                    <label><input id="showFavoriteTagsUSERCheckbox" type="checkbox" ${settings.showFavoriteTagsUSER['draw'] ? 'checked' : ''}>Show favorite tags USER.</label><br>
                    <label><input id="updateWithWindowResizeCheckbox" type="checkbox" ${settings.updateWithWindowResize ? 'checked' : ''}>Update with window resize.</label><br>
                    <label><input id="updateScrollOnWindowResizeCheckbox" type="checkbox" ${settings.updateScrollOnWindowResize ? 'checked' : ''}>Update scroll on window resize.</label><br>
                    <label><input id="showFitButtonCheckbox" type="checkbox" ${settings.showFitButton ? 'checked' : ''}>Show fit button.</label><br>
                    <label><input id="showScrollButtonCheckbox" type="checkbox" ${settings.showScrollButton ? 'checked' : ''}>Show scroll button.</label><br>
                    <label>Video volume: <input id="videoVolumeInput" type="number" min="0" max="1" step="0.01" value="${settings.videoVolume}" style="width:60px;">0 - 1</label><br>
                    <label>Resize keyboard shortcut: <button id="resizeButton">${settings.resizeButton}</button></label><br>
                    <label>Scroll keyboard shortcut: <button id="scrollButton">${settings.scrollButton}</button></label><br>
                  </div>
                  <button id="ibenhancerSettingsSave">Save</button><button id="ibenhancerSettingsCancel">Cancel</button>
                </div>
            `);

        document.getElementById('ibenhancerSettingsSave').addEventListener('click', saveSettings);
        document.getElementById('ibenhancerSettingsCancel').addEventListener('click', hideSettings);
        document.getElementById('resizeButton').addEventListener('click', () => changeButtonClicked('resize'));
        document.getElementById('scrollButton').addEventListener('click', () => changeButtonClicked('scroll'));

        addGlobalStyle(MAIN_CSS);

        if (settings.showFavoriteTags['draw']) createFavoriteTagsPanel('main');
        if (settings.showFavoriteTagsUSER['draw']) createFavoriteTagsPanel('user');
    }
}

export function showSettings() {
    document.getElementById('ibenhancerSettings').classList.add('show');
    document.getElementById('ibenhancerSettings-blocker').classList.add('show');
    document.documentElement.classList.add('ibenhancerSettingVisible');
}

function hideSettings() {
    document.getElementById('ibenhancerSettings').classList.remove('show');
    document.getElementById('ibenhancerSettings-blocker').classList.remove('show');
    document.documentElement.classList.remove('ibenhancerSettingVisible');

    // Kleine Hilfsfunktion, um Fehler bei fehlenden HTML-Elementen zu vermeiden
    const setCheckbox = (id, checked) => {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    };

    // Reset visually to saved state if canceled
    setCheckbox('resizeImageToFitCheckbox', settings.resizeImageToFit);
    setCheckbox('resizeVideoToFitCheckbox', settings.resizeVideoToFit);
    setCheckbox('autoplayVideosCheckbox', settings.autoplayVideos);
    setCheckbox('autoScrollToContentCheckbox', settings.autoScrollToContent);
    setCheckbox('updateWithWindowResizeCheckbox', settings.updateWithWindowResize);
    setCheckbox('updateScrollOnWindowResizeCheckbox', settings.updateScrollOnWindowResize);
    setCheckbox('removeFluidCheckbox', settings.removeFluid);
    setCheckbox('alwaysShowScrollbarsCheckbox', settings.alwaysShowScrollbars);
    setCheckbox('showFavoriteTagsCheckbox', settings.showFavoriteTags['draw']);
    setCheckbox('showFavoriteTagsUSERCheckbox', settings.showFavoriteTagsUSER['draw']);
    setCheckbox('showFitButtonCheckbox', settings.showFitButton);
    setCheckbox('showScrollButtonCheckbox', settings.showScrollButton);

    const volInput = document.getElementById('videoVolumeInput');
    if (volInput) volInput.value = settings.videoVolume;
}

function changeButtonClicked(buttonType) {
    if (buttonType === 'resize') {
        document.getElementById('resizeButton').innerHTML = '?';
        state.changeKeyboardShortcut = 'resizeButton';
    } else if (buttonType === 'scroll') {
        document.getElementById('scrollButton').innerHTML = '?';
        state.changeKeyboardShortcut = 'scrollButton';
    }
}

// v2.0.7: Speichert jetzt auch die fünf vorher schalter-losen Optionen
// (showFavoriteTagsUSER, updateWithWindowResize, updateScrollOnWindowResize,
// showFitButton, showScrollButton) – vorher nur per GM-Storage änderbar.
function saveSettings() {
    GM.setValue('resizeImageToFit', document.getElementById('resizeImageToFitCheckbox').checked);
    GM.setValue('resizeVideoToFit', document.getElementById('resizeVideoToFitCheckbox').checked);
    GM.setValue('autoplayVideos', document.getElementById('autoplayVideosCheckbox').checked);
    GM.setValue('autoScrollToContent', document.getElementById('autoScrollToContentCheckbox').checked);
    GM.setValue('removeFluid', document.getElementById('removeFluidCheckbox').checked);
    GM.setValue('alwaysShowScrollbars', document.getElementById('alwaysShowScrollbarsCheckbox').checked);
    // v2.0.10: parseFloat auf ein leeres/ungültiges Feld ergibt NaN, und
    // `video.volume = NaN` wirft in enhanceContent() (media.js) einen
    // TypeError – das Script bricht beim nächsten Laden mitten im Init ab.
    // Auf [0,1] klemmen und NaN auf das gespeicherte Default zurückfallen
    // lassen, statt einen unbrauchbaren Wert zu persistieren.
    const volRaw = document.getElementById('videoVolumeInput').value;
    const vol = parseFloat(volRaw);
    const volSafe = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : settings.videoVolume;
    GM.setValue('videoVolume', volSafe);
    settings.showFavoriteTags['draw'] = document.getElementById('showFavoriteTagsCheckbox').checked;
    GM.setValue('showFavoriteTags', settings.showFavoriteTags);
    settings.showFavoriteTagsUSER['draw'] = document.getElementById('showFavoriteTagsUSERCheckbox').checked;
    GM.setValue('showFavoriteTagsUSER', settings.showFavoriteTagsUSER);
    GM.setValue('updateWithWindowResize', document.getElementById('updateWithWindowResizeCheckbox').checked);
    GM.setValue('updateScrollOnWindowResize', document.getElementById('updateScrollOnWindowResizeCheckbox').checked);
    GM.setValue('showFitButton', document.getElementById('showFitButtonCheckbox').checked);
    GM.setValue('showScrollButton', document.getElementById('showScrollButtonCheckbox').checked);
    GM.setValue('resizeButton', settings.resizeButton);
    GM.setValue('scrollButton', settings.scrollButton);
    location.reload();
}
