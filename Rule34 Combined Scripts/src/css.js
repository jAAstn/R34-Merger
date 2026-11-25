// src/css.js – ZENTRALE CSS-SAMMLUNG (eine Quelle für alle Styles)
//
// Alle Styles des Scripts an einem Ort, damit man auf einen Blick sieht,
// was gestylt wird. Jedes Feature importiert NUR seine Konstanten und
// injiziert sie per GM_addStyle dort, wo es aktiv wird:
//   TAG_CSS            → tag-hider.js (SmartSkip+-Buttons + Regeln-Modal)
//   HEADER_CSS         → features.js (setupCollapsibleHeader)
//   PAGE_INDICATOR_CSS → features.js (updatePageIndicator)
//   BLACKLIST_CSS      → features.js (hideBlacklisted)
//   PANEL_CSS          → panel.js (setupControlPanel, inkl. Tooltip-Info)
//   API_MODAL_CSS      → api.js (showApiKeyPrompt)
//   OVERLAY_CSS        → overlay.js (Thumbnail-Hover-Overlay)
//   INFINITE_SCROLL_CSS → infinite-scroll.js (Status + Pagetual-Hinweis)
//   WEBM_HIDE_CSS      → tag-hider.js (webm/mp4/gif-Thumbs, an die Blacklist gekoppelt)

// --- Tag Hider++ / SmartSkip+ (tag-hider.js): Buttons + Regeln-Modal (klassenbasiert) ---
export const TAG_CSS = [
    '.r34-btn:focus-visible{outline:2px solid #6cf;outline-offset:1px}',
    '.r34-btn{margin-top:4px;width:100%;cursor:pointer;font-size:12px;background:#333;color:#fff;border:1px solid #555;padding:5px 8px;border-radius:3px;transition:background .15s;box-sizing:border-box;text-align:center}',
    '.r34-btn:hover{background:#444}',
    '.r34-btn:active{filter:brightness(1.2)}',
    '.r34-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;font-family:ui-sans-serif,system-ui,sans-serif}',
    '.r34-modal-box{background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:14px 16px;min-width:340px;max-width:90vw;max-height:none;overflow-y:auto;box-shadow:0 6px 18px rgba(0,0,0,.5);width:800px}',
    '.r34-modal-box h3{margin:0 0 8px;font-size:14px}',
    '.r34-modal-box textarea{width:100%;height:800px;min-height:9em;background:#1a1a1a;color:#fff;border:1px solid #444;border-radius:3px;padding:6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;resize:vertical;box-sizing:border-box;}',
    '.r34-modal-box .r34-pill{display:inline-block;background:#1a1a1a;padding:2px 6px;border-radius:10px;font-size:11px;margin:2px;color:#ddd}',
    '.r34-modal-box .actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}',
    '.r34-modal-box .hint{font-size:11px;color:#aaa;margin-top:8px;line-height:1.45}',
    '.r34-modal-box .r34-check{display:flex;align-items:flex-start;gap:6px;font-size:12px;margin:8px 0 0;cursor:pointer;line-height:1.4}',
    '.r34-modal-box .r34-check input{margin:1px 0 0;flex:none}',
    '.r34-modal-box code{background:#1a1a1a;padding:1px 4px;border-radius:2px;color:#cfc}',
    '.r34-tag-list{background:#1a1a1a;padding:6px 8px;border-radius:3px;max-height:14em;overflow-y:auto;font-size:11px;margin:6px 0;line-height:1.4}',
].join('\n');

// --- CollapsibleHeader (features.js): Übergang + Fix-Button ---
export const HEADER_CSS = [
    '#header{transition:height .3s ease;overflow:hidden}',
    '.header-fix-btn{position:absolute;top:5px;right:10px;z-index:1000;padding:2px 6px;font-size:12px;cursor:pointer;background:#222;color:#fff;border:1px solid #444;border-radius:4px}',
].join('\n');

// --- PageIndicator (features.js) ---
export const PAGE_INDICATOR_CSS = '#page-indicator{position:fixed;bottom:10px;right:10px;background:rgba(30,30,30,.9);color:#fff;padding:6px 12px;border-radius:20px;font-size:13px;font-family:monospace;z-index:9999;pointer-events:auto;cursor:pointer;backdrop-filter:blur(5px);border:1px solid #444;box-shadow:0 2px 8px rgba(0,0,0,.3);display:none}';

// --- hideBlacklisted (features.js): CSS-Sicherheitsnetz für Blacklist-Bilder ---
export const BLACKLIST_CSS = 'span.thumb:has(img.blacklist-img),.blacklisted-image.thumb,span.blacklisted-image{display:none!important}';

// --- Control-Panel (panel.js) ---
// Hinweis: left/top stehen hier MIT !important (feste Ausgangsposition 100px/1px).
// Das Drag-Handling (r34_button_pos) und die Panel-Positionierung unter dem Button
// setzen ihre Inline-Styles daher ebenfalls per setProperty(..., 'important') –
// so bleibt der Button trotz der CSS-Regeln verschiebbar.
export const PANEL_CSS = [
  '.r34-panel-btn{position:absolute;z-index:10000;padding:4px 8px;font-size:16px;background:#222;color:#eee;border:1px solid #444;border-radius:0px;cursor:move;user-select:none;width:278px!important;left:100px!important;top:1px!important;border-bottom-width:0px;height:31px;}',
  '.r34-panel{position:absolute;background:#222;color:#eee;padding:10px;border-radius:0;font-size:12px;z-index:9999;display:none;font-family:sans-serif;border:1px solid #555;top:27px!important;width:255.859px!important;left:100px!important;padding-top:5px;}',
  '.r34-panel form label{display:block;margin-bottom:2px;cursor:pointer}',
  '.r34-panel form input{margin-right:8px}',
  '.r34-panel form strong{color:#0af;display:block;border-bottom:1px solid #444;padding-bottom:0;margin-bottom:0}',
  '.r34-panel button{margin-top:4px;padding:2px 5px;color:#fff;border:none;border-radius:0;cursor:pointer;margin-right:4px;}',
  '.r34-panel .save-btn{background:#0af}',
  '.r34-panel .cancel-btn{background:#444}',
  '.tooltip-info{cursor:help;margin-left:4px;opacity:.7}',
  '.tooltip-info:hover{opacity:1}',
].join('\n');

// --- webm/mp4/gif-Thumbs (tag-hider.js) ---
// Frühes CSS gegen den Lazy-Load-Flash: die Thumbs sind schon unsichtbar, bevor
// das Bild geladen wird. Wird nur dann in ein <style>-Element GESCHRIEBEN, wenn
// die Blacklist aktiv ist und die Ausnahme-Checkbox NICHT gesetzt ist – beim
// Abschalten wird der Inhalt geleert (ein dauerhaft injiziertes !important
// ließe sich sonst nicht wieder rückgängig machen).
export const WEBM_HIDE_CSS = [
    'span.thumb:has(img.webm-thumb){display:none!important}',
    'img.webm-thumb{display:none!important}',
].join('\n');

// --- Infinite-Scroll (infinite-scroll.js): Status + Pagetual-Hinweis ---
export const INFINITE_SCROLL_CSS = [
    '#r34-inf-scroll-status{text-align:center;padding:10px 0;color:#888;font-size:12px;font-family:ui-sans-serif,system-ui,sans-serif;user-select:none}',
    '#r34-inf-scroll-status.r34-inf-loading{color:#6cf}',
    '#r34-inf-scroll-status.r34-inf-error{color:#f66}',
    '#r34-inf-pagetual-hint{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:100000;background:#3a2a00;color:#ffd27a;border:1px solid #7a5a00;border-radius:6px;padding:8px 14px;font-size:13px;font-family:ui-sans-serif,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.5)}',
].join('\n');

// --- Thumbnail-Hover-Overlay (overlay.js): Tags mit Kategorien-Farben ---
export const OVERLAY_CSS = [
    '#r34-thumb-overlay{position:fixed;z-index:99999;background:rgba(24,24,24,.97);color:#eee;border:1px solid #555;border-radius:6px;padding:8px 10px;font-size:12px;max-width:380px;box-shadow:0 6px 20px rgba(0,0,0,.55);font-family:ui-sans-serif,system-ui,sans-serif;display:none}',
    '#r34-thumb-overlay .r34-ov-header{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:700;color:#888;border-bottom:1px solid #444;padding-bottom:4px;margin-bottom:6px}',
    '#r34-thumb-overlay .r34-ov-user{color:#ff6b6b;text-decoration:none;font-weight:600;white-space:nowrap}',
    '#r34-thumb-overlay .r34-ov-user:hover{text-decoration:underline}',
    '#r34-thumb-overlay .r34-ov-group{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:5px}',
    '#r34-thumb-overlay .r34-ov-label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.85;margin-right:2px;min-width:52px}',
    '#r34-thumb-overlay .r34-ov-tag{cursor:pointer;padding:2px 6px;border:1px solid;border-radius:10px;font-size:11px;background:rgba(255,255,255,.04);user-select:none}',
    '#r34-thumb-overlay .r34-ov-tag:hover{background:rgba(255,255,255,.12)}',
    '#r34-thumb-overlay .r34-ov-more{font-size:10px;color:#777;align-self:center}',
    '#r34-thumb-overlay .r34-ov-hint{font-size:10px;color:#777;margin-top:6px}',
].join('\n');

// --- API-Key-Prompt (api.js): ID-basiertes Modal ---
export const API_MODAL_CSS = [
    '#r34-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.7);display:flex;justify-content:center;align-items:center;z-index:99999;font-family:sans-serif}',
    '#r34-modal-content{background-color:#1e1e1e;color:#eee;padding:20px 30px;border-radius:8px;text-align:center;max-width:400px;border:1px solid #555}',
    '#r34-modal-content p{margin:0 0 20px;line-height:1.5}',
    '#r34-modal-buttons button,#r34-manual-input button{background-color:#333;color:#fff;border:1px solid #555;padding:10px 15px;border-radius:5px;cursor:pointer;margin:0 10px}',
    '#r34-manual-input{margin-top:20px}',
    '#r34-manual-input input{display:block;width:calc(100% - 20px);margin:10px auto;padding:8px;background-color:#333;border:1px solid #555;color:#fff;border-radius:4px}',
].join('\n');
