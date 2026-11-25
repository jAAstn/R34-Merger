// media.js – Resize/Autoplay/Scroll für Bild & Video auf der Post-Ansicht.
// State (Fenster-/Content-Proportionen, resizeReady) ist modul-lokal,
// Einstellungen kommen aus settings.js, Selektoren aus core.js `state`.
// Verhalten identisch zum Original (fitContent/scrollToContent über
// setTimeout-Delays, applyResize setzt width/height-Attribute und entfernt
// danach den Style – beim Fluid-Player inline Styles).
import { state, computeFit, debounce, isTyping } from './core.js';
import { settings } from './settings.js';

let currentWindowWidth = 0;
let currentWindowHeight = 0;
let currentWindowAspect = 0;
let contentTrueWidth = 0;
let contentTrueHeight = 0;
let contentTrueAspect = 0;
let resizeReady = false;

function getWindowProps() {
    currentWindowWidth = document.documentElement.clientWidth;
    currentWindowHeight = document.documentElement.clientHeight;
    const sidebar = document.querySelector('.sidebar') || document.querySelector('#tag-sidebar');

    // v2.0.10: Sichtbarkeit nicht mehr über offsetParent, sondern über
    // getClientRects(). offsetParent ist auch für position:fixed-Elemente null
    // (der offsetParent ist der nearest positioned Vorfahre – bei fixed gibt es
    // keinen) – eine fixed/modal-artig gelagerte Sidebar wurde daher als
    // unsichtbar gewertet und ihre Breite NICHT abgezogen: das Bild wurde
    // entsprechend zu groß gefittet. getClientRects() ist leer genau dann,
    // wenn das Element nicht gerendert wird (display:none, size:0, hidden).
    if (sidebar && sidebar.getClientRects().length > 0) {
        const style = window.getComputedStyle(sidebar);
        const outerWidth = sidebar.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
        currentWindowWidth = currentWindowWidth - outerWidth - 20;
    }
    // v2.0.10: NaN-Guard – parseFloat('auto')/fehlende Margen ergibt NaN und
    // poisons currentWindowWidth für den Rest der Sitzung (Aspect → NaN →
    // computeFit → null → gar kein Resize mehr).
    if (!Number.isFinite(currentWindowWidth)) currentWindowWidth = document.documentElement.clientWidth;
    if (currentWindowWidth !== 0 && currentWindowHeight !== 0) {
        currentWindowAspect = currentWindowWidth / currentWindowHeight;
    }
}

export function getContentProps() {
    const img = document.querySelector(`${state.containerDOM} ${state.imageDOM}`);
    const video = document.querySelector(`${state.containerDOM} video`);

    if (img) {
        if (img.videoWidth) {
            contentTrueWidth = img.videoWidth;
            contentTrueHeight = img.videoHeight;
        } else {
            contentTrueWidth = img.naturalWidth || img.width;
            contentTrueHeight = img.naturalHeight || img.height;
        }
    } else if (video) {
        contentTrueWidth = video.videoWidth;
        contentTrueHeight = video.videoHeight;
    }

    if (contentTrueWidth !== 0 && contentTrueHeight !== 0) {
        contentTrueAspect = contentTrueWidth / contentTrueHeight;
    }
    resizeReady = true;
}

function applyResize(el, isFluidPlayer = false) {
    if (!el) return;
    el.style.maxWidth = '';

    const fit = computeFit(currentWindowAspect, contentTrueAspect, currentWindowWidth, currentWindowHeight);
    // v2.0.8: Aspect-Guard – bei unbekannten/ungültigen Proportionen (null)
    // nichts setzen (vorher height = Infinity bei Division durch 0).
    if (!fit) return;

    if (isFluidPlayer) {
        el.style.width = fit.width + 'px';
        el.style.height = fit.height + 'px';
    } else {
        el.width = fit.width;
        el.height = fit.height;
    }

    if (!isFluidPlayer) el.removeAttribute('style');
}

export function scrollToContent(delay) {
    setTimeout(() => {
        const target = document.querySelector(`${state.containerDOM} ${state.imageDOM}`) ||
            document.querySelector(`${state.containerDOM} ${state.playerDOM}`) ||
            document.querySelector(`${state.containerDOM} video`);
        if (target) {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, delay);
}

export function fitContent(delay) {
    setTimeout(() => {
        if (resizeReady) {
            getWindowProps();
            const img = document.querySelector(`${state.containerDOM} ${state.imageDOM}`);
            const player = document.querySelector(`${state.containerDOM} ${state.playerDOM}`);
            const video = document.querySelector(`${state.containerDOM} video`);

            if (img) applyResize(img, false);
            else if (player) applyResize(player, true);
            else if (video) applyResize(video, false);
        }
    }, delay);
}

function removeFluidPlayer() {
    const player = document.querySelector(state.playerDOM);
    const sourceVideo = document.querySelector(`${state.containerDOM} video`) || document.querySelector(`${state.containerDOM} video source`);
    if (player && sourceVideo && sourceVideo.src) {
        const newVideo = document.createElement('video');
        newVideo.src = sourceVideo.src;
        newVideo.controls = true;
        player.replaceWith(newVideo);
    }
}

export function enhanceContent() {
    if (state.site === 'gelbooru.com') {
        document.querySelectorAll('video:not([id])').forEach(v => v.remove());
    }
    if (settings.removeFluid && document.querySelector(state.playerDOM)) removeFluidPlayer();

    const video = document.querySelector(`${state.containerDOM} video`);
    const img = document.querySelector(`${state.containerDOM} ${state.imageDOM}`);

    if (video || img) {
        if (settings.alwaysShowScrollbars) document.documentElement.style.overflow = 'scroll';
        getContentProps();
        if (settings.resizeImageToFit) fitContent(0);
        if (settings.autoScrollToContent) {
            scrollToContent(0);
            let firstRun = true;
            window.addEventListener('focus', () => {
                if (firstRun) { scrollToContent(0); firstRun = false; }
            });
        }
    }

    if (video) {
        video.autoplay = settings.autoplayVideos;
        video.volume = settings.videoVolume;
        video.loop = true;
        // v2.0.8: preload=metadata – Metadaten (Maße) werden gezielt geladen,
        // damit getContentProps/fitContent zuverlässig rechnen können.
        video.preload = 'metadata';

        if (!settings.autoplayVideos) video.pause();

        // v2.0.8: Play + Resize/Scroll erst NACH den Metadaten (robustes
        // loadedmetadata statt sofortigem play vor der Metadaten-Ladung).
        // Fallback: war das Event schon gefeuert (readyState >= 1, z. B.
        // gecachtes/sofort geladenes Video), direkt ausführen statt auf ein
        // verpasstes Event zu warten.
        const onVideoMetadata = () => {
            getContentProps();
            if (settings.resizeVideoToFit) fitContent(200);
            if (settings.autoScrollToContent) scrollToContent(200);
            video.play().catch(e => console.warn("Autoplay prevented:", e));
        };
        if (video.readyState >= 1) {
            onVideoMetadata();
        } else {
            video.addEventListener('loadedmetadata', onVideoMetadata);
        }
    } else if (img) {
        // v2.0.8: Bei bereits geladenem Bild (complete && naturalWidth > 0,
        // z. B. aus dem Cache) ist das `load`-Event evtl. schon gefeuert →
        // sofort rechnen statt auf das verpasste Event zu warten.
        const onImgLoad = () => {
            getContentProps();
            if (settings.resizeImageToFit) fitContent(200);
            if (settings.autoScrollToContent) scrollToContent(200);
        };
        if (img.complete && img.naturalWidth > 0) {
            onImgLoad();
        } else {
            img.addEventListener('load', onImgLoad);
        }
    }
}

export function addWindowEvents() {
    if (settings.updateWithWindowResize) {
        window.addEventListener('resize', debounce(() => {
            fitContent(0);
            if (settings.updateScrollOnWindowResize) scrollToContent(0);
        }, 150));
    }
}

export function keyboardShortcuts() {
    document.addEventListener('keyup', (e) => {
        // v2.0.7: Shortcuts nicht feuern, wenn der Nutzer gerade in ein
        // Eingabefeld tippt (Suchfeld etc.) – isTyping-Guard wie im Combined Scripts.
        if (isTyping()) return;

        if (state.changeKeyboardShortcut && e.code === 'Escape') {
            document.getElementById('resizeButton').innerHTML = settings.resizeButton;
            document.getElementById('scrollButton').innerHTML = settings.scrollButton;
            state.changeKeyboardShortcut = false;
        }
        if (!state.changeKeyboardShortcut) {
            if (e.code === settings.resizeButton) { getContentProps(0); fitContent(0); }
            else if (e.code === settings.scrollButton) scrollToContent(0);
        } else if (state.changeKeyboardShortcut === 'resizeButton') {
            settings.resizeButton = e.code;
            document.getElementById('resizeButton').innerHTML = e.code;
            state.changeKeyboardShortcut = false;
        } else if (state.changeKeyboardShortcut === 'scrollButton') {
            settings.scrollButton = e.code;
            document.getElementById('scrollButton').innerHTML = e.code;
            state.changeKeyboardShortcut = false;
        }
    });
}
