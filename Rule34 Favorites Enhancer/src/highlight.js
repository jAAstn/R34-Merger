// highlight.js – exploreModule: Favoriten-Highlighting, addFav-Hook und
// MutationObserver für pagetual / Infinite-Scroll.
// Performance-Optimiert:
// - Cached Sets statt wiederholtem localStorage/IndexedDB-Parsing
// - MutationObserver markiert NUR neu von pagetual eingefügte Bilder
// - WeakSet verhindert doppelte Verarbeitung
import { state, getThumbImgId, parseStoredJson } from './core.js';
import { getAdditionalQueue, getRemovalQueue, addToAdditionalQueue, loadAllImagesFromIndexedDB } from './storage.js';

const BORDER_COLOR = '#ff0000';
const BORDER_WIDTH = '2.5px';
const STYLE_BOXSHADOW = `0 0 0 ${BORDER_WIDTH} ${BORDER_COLOR}`;

// In-Memory-Caches – werden einmal befüllt und danach inkrementell gepflegt,
// statt bei jedem Aufruf neu aus localStorage/IndexedDB zu lesen.
let idSet         = null; // IDs aus IndexedDB (gespeicherte Favoriten)
let additionalSet = null; // frisch hinzugefügte Favoriten (Queue)
let removalSet    = null; // entfernte Favoriten (Queue)
let cachesReady   = false;

// Bereits verarbeitete <img>-Elemente, damit der MutationObserver und
// handleUserReturn() niemals dasselbe Element zweimal anfassen.
const processedImgs = new WeakSet();

// markImage setzt IMMER den roten Rahmen, unabhängig vom processedImgs-Status.
// Die Sperre in processImg() dient nur dazu, denselben <img>-Knoten nicht
// wiederholt per MutationObserver/Vollscan neu zu BEWERTEN (teuer bei vielen
// Bildern) - sie darf die gezielte Live-Markierung per addImageBorderById()
// niemals blockieren, sonst bleibt ein nachträglich favorisierter Post in
// einem anderen Tab dauerhaft unmarkiert.
function markImage(img) {
  img.style.boxShadow = STYLE_BOXSHADOW;
  img.style.opacity   = '0.3';
  processedImgs.add(img);
}
// Nimmt die Markierung zurück (nur die Styles, die dieses Script gesetzt hat)
// und vergisst das Element, damit ein späteres Re-Add es erneut markieren darf.
function unmarkImage(img) {
  img.style.boxShadow = '';
  img.style.opacity   = '';
  processedImgs.delete(img);
}
function shouldHighlight(imgId) {
  return additionalSet.has(imgId) || (idSet.has(imgId) && !removalSet.has(imgId));
}
function processImg(img) {
  if (processedImgs.has(img)) return;
  const imgId = String(getThumbImgId(img));
  if (shouldHighlight(imgId)) markImage(img);
  else processedImgs.add(img); // auch "kein Treffer" merken, um Re-Checks zu vermeiden
}

// Verarbeitet einen ganzen Batch von Thumbnails (initial oder von pagetual nachgeladen)
function processThumbBatch(root = document) {
  if (!cachesReady) return;
  root.querySelectorAll('div.image-list span.thumb img').forEach(processImg);
}
function addImageBorderById(id) {
  // Original-rule34-Galerie nutzt <span id="s{id}">, die eigene Chunked-
  // Galerie (ui.js) rendert <a id="p{id}"> – beide Formate finden.
  const el = document.getElementById(`s${id}`) || document.getElementById(`p${id}`);
  const img = el?.querySelector('img');
  if (img) markImage(img);
}
function removeImageHighlightById(id) {
  const el = document.getElementById(`s${id}`) || document.getElementById(`p${id}`);
  const img = el?.querySelector('img');
  if (img) unmarkImage(img);
}

// Live-Update bei Tab-Wechsel: Queues sind normalerweise winzig (wenige IDs),
// daher ist ein Re-Read aus localStorage hier vernachlässigbar billig -
// im Gegensatz zum vollen Bilder-Rescan, den wir damit vermeiden.
function syncAdditionalSet() {
  additionalSet = new Set(getAdditionalQueue());
}

// Erst BEIDE Sets re-syncen, dann gezielt die betroffenen Posts im DOM anfassen.
// O(Anzahl geänderter IDs) statt O(Anzahl aller geladenen Bilder):
// - additionalQueue → in anderen Tabs neu favorisiert → markieren
// - removalQueue-Diff → in anderen Tabs entfernt → Markierung zurücknehmen
function handleUserReturn() {
  if (!cachesReady) return;
  const prevRemovalSet = removalSet;
  syncAdditionalSet();
  removalSet = new Set(getRemovalQueue());

  additionalSet.forEach(id => addImageBorderById(id));
  if (prevRemovalSet) {
    removalSet.forEach(id => {
      if (!prevRemovalSet.has(id)) removeImageHighlightById(id);
    });
  }
}

// Beobachtet den Image-List-Container und markiert neu eingefügte Bilder
// (von pagetual / Infinite-Scroll) sofort, statt auf den nächsten Vollscan zu warten.
function observeNewThumbs() {
  const container = document.querySelector('#content > div.image-list') || document.body;
  const mo = new MutationObserver(mutations => {
    if (!cachesReady) return;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return; // nur Elemente
        if (node.matches?.('span.thumb img')) {
          processImg(node);
        } else {
          node.querySelectorAll?.('span.thumb img').forEach(processImg);
        }
      });
    }
  });
  mo.observe(container, { childList: true, subtree: true });
  return mo;
}

// addFav-Hook: Die Seite definiert addFav u.U. erst NACH unserem Userscript
// (Script-Order/async) – daher begrenzt nachladen statt einmal abzubrechen.
const ADD_FAV_HOOK_MAX_RETRIES = 20; // 20 × 500ms = 10s
const ADD_FAV_HOOK_RETRY_MS    = 500;

function hookAddFav(attempt = 0) {
  if (typeof unsafeWindow.addFav !== 'function') {
    if (attempt < ADD_FAV_HOOK_MAX_RETRIES) {
      setTimeout(() => hookAddFav(attempt + 1), ADD_FAV_HOOK_RETRY_MS);
    }
    return;
  }
  const orig = unsafeWindow.addFav;
  unsafeWindow.addFav = function (postId) {
    const cleanId = String(postId).replace(/[^0-9]/g, '');
    if (cleanId) {
      addToAdditionalQueue(cleanId);
      additionalSet?.add(cleanId); // Cache sofort mitpflegen, kein Re-Read nötig
    }
    orig.apply(this, arguments);
    if (state.borderFavs && cleanId) addImageBorderById(cleanId);
  };
}

export function highlightFavs() {
  hookAddFav();

  const saved = localStorage.getItem('borderFavs');
  state.borderFavs = parseStoredJson(saved, true) === true;

  if (!state.borderFavs) return;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') handleUserReturn();
  });

  // Caches einmalig befüllen, danach läuft alles inkrementell über den Observer.
  // Bewusst UNABHÄNGIG vom addFav-Hook: Highlighting funktioniert auch, wenn
  // der Hook (noch) nicht installiert werden konnte.
  loadAllImagesFromIndexedDB(loadedImgs => {
    idSet         = new Set(loadedImgs.map(img => String(img.id)));
    additionalSet = new Set(getAdditionalQueue());
    removalSet    = new Set(getRemovalQueue());
    cachesReady   = true;

    // Beobachter zuerst starten, damit ab jetzt eingefügte pagetual-Batches
    // sofort erfasst werden, dann den bereits vorhandenen Bestand abarbeiten.
    observeNewThumbs();
    processThumbBatch();
  });
}