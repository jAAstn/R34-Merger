// sites.js – Site-Konfiguration: rule34-Sonderfall + Custom-Sites-Setup.
// configureSites() setzt toolbarDOM/playerDOM im shared state (core.js) und
// hängt auf unbekannten Sites die Setup-/Delete-Buttons ein (wie das Original).
import { state, debugMode } from './core.js';
import { settings } from './settings.js';

export function configureSites() {
    if (debugMode) console.log('Function: configureSites');
    if (state.site === 'rule34.xxx') {
        state.toolbarDOM = '.sidebar > div';
        state.playerDOM = '#gelcomVideoContainer';
    } else if (settings.customSites[state.site]) {
        const obj = settings.customSites[state.site];
        // v2.0.10: Alle Selektor-Felder anwenden, nicht nur toolbarDOM. Der
        // Setup-Prompt fragt containerDOM/imageDOM/thumbnailDOM mit ab, sie
        // wurden aber nie in `state` übernommen – die Toolbar-Defaults blieben
        // damit auf fremden Boards garantiert falsch (leer/Default), während
        // der Nutzer dachte, die Konfiguration hätte gegriffen.
        // Reihenfolge: spätere Zuweisung gewinnt, wie im rule34-Sonderfall.
        if (obj.toolbarDOM) state.toolbarDOM = obj.toolbarDOM;
        if (obj.containerDOM) state.containerDOM = obj.containerDOM;
        if (obj.imageDOM) state.imageDOM = obj.imageDOM;
        if (obj.thumbnailDOM) state.thumbnailDOM = obj.thumbnailDOM;
        if (obj.playerDOM) state.playerDOM = obj.playerDOM;
        document.body.insertAdjacentHTML('beforeend', "<button id='ibenhancerDeleteConfigButton' style='position: absolute; top: 0px; right: 0px; z-index: 9999999; color: black; background-color: whitesmoke; font-size: 12px;'>Delete site config.</button>");
        document.getElementById('ibenhancerDeleteConfigButton').addEventListener('click', deleteSiteConfig);
    } else {
        document.body.insertAdjacentHTML('beforeend', "<button id='ibenhancerSetupButton' style='position: absolute; top: 0px; right: 0px; z-index: 9999999; color: black; background-color: whitesmoke; font-size: 12px;'>Setup Image Board Enhancer</button>");
        document.getElementById('ibenhancerSetupButton').addEventListener('click', addSiteConfig);
        console.warn('This site is not supported, but may still work.');
    }
}

function addSiteConfig() {
    // v2.0.10: try/catch um JSON.parse – bei ungültigem JSON (Tippfehler,
    // abgebrochener Prompt) warf der Parser previously ungehandelt einen
    // SyntaxError und brach das Init-Skript ab, statt "Config not valid."
    // zu zeigen. `prompt` liefert null bei Cancel.
    const raw = prompt("Enter config in JSON format.", '{"toolbarDOM": ".sidebar form", "containerDOM": "#content", "imageDOM": "#image", "thumbnailDOM": ".thumb" }');
    if (raw === null) return;
    let config;
    try {
        config = JSON.parse(raw);
    } catch (e) {
        if (debugMode) console.warn('ibe: invalid site config JSON', e);
        config = null;
    }
    if (!config || typeof config !== 'object' || Array.isArray(config) || Object.keys(config).length === 0) {
        alert('Config not valid.');
    } else {
        settings.customSites[state.site] = config;
        GM.setValue('customSites', settings.customSites);
        alert('Config saved.');
        location.reload();
    }
}

function deleteSiteConfig() {
    delete settings.customSites[state.site];
    GM.setValue('customSites', settings.customSites);
    alert('Config deleted.');
    location.reload();
}
