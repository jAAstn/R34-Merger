// init.js – Entry-Modul des Builds: lädt zuerst alle Einstellungen
// (loadSettings, ersetzt die top-level `await GM.getValue` des Originals),
// dann init() in exakt derselben Reihenfolge wie im Original.
import { debounce } from './core.js';
import { loadSettings } from './settings.js';
import { configureSites } from './sites.js';
import { addWindowEvents, enhanceContent, keyboardShortcuts } from './media.js';
import { createToolbar, showSettings } from './toolbar.js';
import { updateTitleColors, setupInputObserver, addTagToInputWithReplace } from './title-colors.js';

function init() {
    configureSites();
    addWindowEvents();
    createToolbar();
    keyboardShortcuts();
    enhanceContent();

    updateTitleColors();

    setupInputObserver();

    // Event Listener für Input Änderungen. v2.0.7: EINE geteilte
    // Debounce-Instanz – vorher erzeugte debounce(updateTitleColors, 300)()
    // pro Event eine neue Closure mit eigenem Timer (kein echtes Coalescing).
    const debouncedTitleUpdate = debounce(updateTitleColors, 300);
    document.addEventListener('input', (e) => {
        if (e.target && e.target.name === 'tags') {
            debouncedTitleUpdate();
        }
    });

    // Capturing click listener für den Settings-Button, Tag-Sidebar +/- und Favorite-Tag-Listen.
    // Capture-phase wird verwendet, damit wir bei Sidebar-Tag-Klicks den Input-Wert
    // noch im Original-Zustand lesen können, BEVOR das eingebaute onclick den Wert
    // manipuliert (und damit das eventuell führende Leerzeichen erkennen können).
    document.addEventListener('click', (e) => {
        if (!e.target) return;

        if (e.target.id === 'ibenhancerSettingsButton') {
            showSettings();
            return;
        }

        // "+" Links in den Favorite-Tag-Listen (data-add-tag): smartes
        // Ersetzen oder Anhängen im Such-Input via addTagToInputWithReplace.
        const addTagEl = e.target.closest('[data-add-tag]');
        if (addTagEl) {
            e.preventDefault();
            addTagToInputWithReplace(addTagEl.dataset.addTag);
            return;
        }

        // "−" Links in den Favorite-Tag-Listen (data-minus-tag): Tag als
        // Ausschluss ans Ende des Such-Inputs anhängen. v2.0.7: ersetzt den
        // früheren Inline-onclick mit unescaped Tag-Text – gleiches Anfüge-
        // Verhalten (" -tag"), aber ohne JS im HTML.
        const minusTagEl = e.target.closest('[data-minus-tag]');
        if (minusTagEl) {
            e.preventDefault();
            const inputEl = document.querySelector('input[name="tags"]');
            if (inputEl) inputEl.value += ' -' + minusTagEl.dataset.minusTag;
            return;
        }

        // Tag-Sidebar +/- (rule34-Struktur: li[class*="tag-type-"] > a[href="#"]).
        // Diese Links modifizieren programmatisch das Such-Input, lösen aber kein
        // 'input'-Event aus. Da unser Listener in capture-phase läuft, sehen wir
        // den Input-Wert noch VOR der Mutation (leer vs. bereits Inhalt).
        const sidebarToggle = e.target.closest('li[class*="tag-type-"] a[href="#"]');
        if (sidebarToggle) {
            const inputEl = document.querySelector('input[name="tags"]');
            const wasEmpty = !!(inputEl && inputEl.value === '');
            setTimeout(() => {
                // Falls das Eingabefeld vorher leer war, fügt das eingebaute onclick
                // einen Tag mit führendem Leerzeichen ein (" azex" statt "azex"). Das
                // entfernen wir, damit das Feld sauber startet. War das Feld nicht
                // leer, lassen wir es unverändert (damit das normale Verhalten mit
                // angehängtem Leerzeichen erhalten bleibt).
                if (wasEmpty && inputEl && /^\s+/.test(inputEl.value)) {
                    inputEl.value = inputEl.value.replace(/^\s+/, '');
                }
                updateTitleColors();
            }, 0);
            return;
        }

        // Andere Links in den Favorite-Tag-Listen (z.B. der Tag-Name): das
        // Such-Input wird ggf. programmatisch verändert (kein 'input'-Event).
        if (e.target.closest('#ibenhancer-favorite-tags-list a, #ibenhancerUSER-favorite-tags-list a')) {
            setTimeout(updateTitleColors, 0);
        }
    }, true);
}

(async () => {
    await loadSettings();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
