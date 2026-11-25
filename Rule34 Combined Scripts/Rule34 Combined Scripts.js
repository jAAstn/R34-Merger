// ==UserScript==
// @name         Rule34 Combined Scripts
// @namespace    jAstn
// @author       It's a Me, jAstn!
// @version      5.44
// @description  Combines multiple scripts for rule34 with performance improvements, UI Panel, API key support + integrated Tag Hider++ (live toggle, no reload).
// @match        https://rule34.xxx/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAAAAGVQALYondf////+67aQPAAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      *
// @run-at       document-end
// @tag          Eigene Scripts
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // Duplicate-Guard (verhindert Doppel-Ausführung, falls alte Skripte noch aktiv sind)
    if (window.__r34CombinedV50Active) return;
    window.__r34CombinedV50Active = true;

(() => {
  // src/core.js
  var observers = [];
  var API_KEY_NAME = "r34_api_key";
  var USER_ID_NAME = "r34_user_id";
  var REMINDER_KEY = "r34_api_reminder";
  var CONSTANTS = {
    PER_PAGE_FAVORITES: 50,
    PER_PAGE_DEFAULT: 42,
    HEADER_COLLAPSED_HEIGHT: "40px",
    DEBOUNCE_MUTATION_MS: 150,
    DEBOUNCE_URL_MS: 150,
    API_RETRY_ATTEMPTS: 3,
    BANNER_DISPLAY_MS: 3e3,
    HEADER_EXPAND_DELAY_MS: 250,
    HEADER_COLLAPSE_DELAY_MS: 100,
    API_TIMEOUT_MS: 1e4,
    ROUTE_TRANSITION_MAX_WAIT_MS: 5e3
  };
  var DEFAULT_CONFIG = {
    favoriteOnMouse: true,
    hideBlacklisted: true,
    removeDuplicates: true,
    removeAnnoyances: true,
    collapsibleHeader: true,
    fixPaginatorLinks: true,
    removePidParameter: true,
    nativeLazyLoading: true,
    restoreDeletedPost: true,
    hideEmptyThumbSpans: true,
    faviconChanger: true,
    pageIndicator: true,
    removeThumbTitles: true,
    cleanupFavoritesArtifacts: true,
    favoriteMarker: true,
    thumbOverlay: true,
    infiniteScroll: true
  };
  var getRoute = (href = location.href) => {
    const url = new URL(href, location.href);
    const page = url.searchParams.get("page");
    const section = url.searchParams.get("s");
    const tags = url.searchParams.get("tags");
    return {
      url,
      page,
      section,
      id: url.searchParams.get("id"),
      isFavoritesPage: page === "favorites",
      isFavoritesView: page === "favorites" && section === "view",
      isPostView: page === "post" && section === "view",
      isAllPostsList: page === "post" && section === "list" && tags === "all",
      isUserSearch: Array.from(url.searchParams.values()).some((value) => value.includes("user:")),
      isOptionsPage: page === "account" && section === "options"
    };
  };
  var getPerPage = (href = location.href) => getRoute(href).isFavoritesPage ? CONSTANTS.PER_PAGE_FAVORITES : CONSTANTS.PER_PAGE_DEFAULT;
  var safeStorageGet = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.debug(`[Storage] Could not read ${key}:`, error);
      return null;
    }
  };
  var safeStorageSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.debug(`[Storage] Could not write ${key}:`, error);
      return false;
    }
  };
  var readJson = (key, fallback) => {
    const raw = safeStorageGet(key);
    if (!raw) return fallback;
    try {
      const value = JSON.parse(raw);
      return value ?? fallback;
    } catch (error) {
      console.debug(`[Storage] Invalid JSON in ${key}:`, error);
      return fallback;
    }
  };
  var loadConfig = () => {
    const storedValue = readJson("r34_feature_flags", {});
    const stored = storedValue && typeof storedValue === "object" && !Array.isArray(storedValue) ? storedValue : {};
    const config = { ...DEFAULT_CONFIG };
    Object.keys(DEFAULT_CONFIG).forEach((key) => {
      if (typeof stored[key] === "boolean") config[key] = stored[key];
    });
    return config;
  };
  var CONFIG = loadConfig();
  var debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  var isTyping = () => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  };
  var gmRequest = (url, options = {}) => new Promise((resolve, reject) => {
    GM.xmlHttpRequest({
      method: options.method || "GET",
      url,
      headers: options.headers || {},
      responseType: options.responseType || "json",
      timeout: options.timeout || CONSTANTS.API_TIMEOUT_MS,
      onload: (res) => resolve(res),
      onerror: (err) => reject(err),
      ontimeout: () => reject(new Error(`Request timeout: ${url}`))
    });
  });
  var buildApiUrl = (params = {}) => {
    const url = new URL("https://api.rule34.xxx/index.php");
    url.search = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ).toString();
    return url.href;
  };
  var AD_SELECTORS = [
    "div.a_list#lmid",
    'div.horizontalFlexWithMargins[style*="justify-content: center"]',
    ".exo-native-widget-outer-container",
    "span[data-nosnippet]"
  ];
  var AD_MARKERS = [
    ".exo-native-widget-outer-container",
    ".adsbygoogle",
    "ins.adsbygoogle",
    'iframe[src*="exoclick"]',
    'iframe[src*="exosrv"]',
    "[data-ad-slot]",
    "[data-ad-client]"
  ];

  // src/parser.js
  var normalizeTag = (t) => String(t ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  var wildcardToRegex = (pattern) => {
    const ph = [];
    let tmp = String(pattern).replace(/\*/g, () => {
      const p = "__W" + ph.length + "__";
      ph.push(p);
      return p;
    });
    tmp = tmp.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    ph.forEach((p) => {
      tmp = tmp.split(p).join(".*");
    });
    return new RegExp("^" + tmp + "$", "i");
  };
  var tokenizeRule = (line) => {
    const raw = String(line).split("//")[0];
    const out = [];
    for (let i = 0; i < raw.length; ) {
      const c = raw[i];
      if (c === " " || c === "	" || c === "\r" || c === "\n") {
        i++;
        continue;
      }
      if (c === "(" || c === ")" || c === "|" || c === "&" || c === "!") {
        out.push({ type: c });
        i++;
        continue;
      }
      let j = i;
      while (j < raw.length && " 	\r\n&|()!".indexOf(raw[j]) === -1) j++;
      const w = normalizeTag(raw.slice(i, j));
      if (w) out.push({ type: "word", value: w });
      i = j;
    }
    return out;
  };
  var parseRuleLine = (line) => {
    const tokens = tokenizeRule(line);
    if (!tokens.length) return null;
    let pos = 0;
    const peek = () => tokens[pos];
    const parseOr = () => {
      let left = parseAnd();
      while (peek() && peek().type === "|") {
        pos++;
        left = { kind: "or", a: left, b: parseAnd() };
      }
      return left;
    };
    const parseAnd = () => {
      let left = parseNot();
      while (peek() && (peek().type === "&" || peek().type === "word" || peek().type === "!" || peek().type === "(")) {
        if (peek().type === "&") pos++;
        left = { kind: "and", a: left, b: parseNot() };
      }
      return left;
    };
    const parseNot = () => peek() && peek().type === "!" ? (pos++, { kind: "not", child: parsePrimary() }) : parsePrimary();
    const parsePrimary = () => {
      const t = peek();
      if (!t) return null;
      if (t.type === "(") {
        pos++;
        const inner = parseOr();
        if (peek() && peek().type === ")") pos++;
        return inner;
      }
      if (t.type === "word") {
        pos++;
        return { kind: "word", value: t.value };
      }
      pos++;
      return null;
    };
    return parseOr() || null;
  };
  var AST_PREC = { or: 1, and: 2, not: 3, word: 4 };
  var renderPrec = (node, parentPrec) => {
    if (!node) return "";
    if (node.kind === "word") return node.value;
    const myPrec = AST_PREC[node.kind];
    let str;
    if (node.kind === "or") str = renderPrec(node.a, myPrec) + " | " + renderPrec(node.b, myPrec);
    else if (node.kind === "and") str = renderPrec(node.a, myPrec) + " " + renderPrec(node.b, myPrec);
    else if (node.kind === "not") str = "!" + renderPrec(node.child, myPrec);
    return myPrec < parentPrec ? "(" + str + ")" : str;
  };
  var astToText = (ast) => renderPrec(ast, 0);
  var walkTokens = (ast, out) => {
    if (!ast) return;
    if (ast.kind === "word") {
      out.push(ast.value);
      return;
    }
    if (ast.kind === "and" || ast.kind === "or") {
      walkTokens(ast.a, out);
      walkTokens(ast.b, out);
      return;
    }
    if (ast.kind === "not") walkTokens(ast.child, out);
  };
  var compileAst = (ast) => {
    if (!ast) return () => true;
    if (ast.kind === "word") {
      const word = ast.value;
      if (word.indexOf("*") === -1) return (set) => set.has(word);
      const re = wildcardToRegex(word);
      return (set, tags) => {
        for (let i = 0; i < tags.length; i++) if (re.test(tags[i])) return true;
        return false;
      };
    }
    if (ast.kind === "and") {
      const a = compileAst(ast.a), b = compileAst(ast.b);
      return (set, tags) => a(set, tags) && b(set, tags);
    }
    if (ast.kind === "or") {
      const a = compileAst(ast.a), b = compileAst(ast.b);
      return (set, tags) => a(set, tags) || b(set, tags);
    }
    if (ast.kind === "not") {
      const c = compileAst(ast.child);
      return (set, tags) => !c(set, tags);
    }
    return () => true;
  };
  var v2ToAst = (rule) => {
    if (!rule || !Array.isArray(rule.orGroups) || !rule.orGroups.length) return null;
    const branches = [];
    rule.orGroups.forEach((g) => {
      if (!Array.isArray(g) || !g.length) return;
      let acc = null;
      g.forEach((raw) => {
        const s = String(raw || "");
        const neg = s.charAt(0) === "-";
        const w = normalizeTag(neg ? s.slice(1) : s);
        if (!w) return;
        const node = neg ? { kind: "not", child: { kind: "word", value: w } } : { kind: "word", value: w };
        acc = acc ? { kind: "and", a: acc, b: node } : node;
      });
      if (acc) branches.push(acc);
    });
    if (!branches.length) return null;
    let res = branches[0];
    for (let k = 1; k < branches.length; k++) res = { kind: "or", a: res, b: branches[k] };
    return res;
  };
  var parseRulesInput = (input) => {
    if (Array.isArray(input)) return input.map((l) => parseRuleLine(String(l))).filter(Boolean);
    return String(input ?? "").split(/[\n,;]/).map((l) => parseRuleLine(l)).filter(Boolean);
  };
  var compileRules = (asts) => asts.map(compileAst);
  var anyRuleMatches = (compiled, postTags) => {
    if (!postTags || !postTags.length) return false;
    const set = new Set(postTags);
    for (let i = 0; i < compiled.length; i++) if (compiled[i](set, postTags)) return true;
    return false;
  };

  // src/sidebar.js
  var BLACKLISTED_LINK_ON = "Blacklist ON\u{1F7E2}";
  var BLACKLISTED_LINK_OFF = "Blacklist OFF\u{1F534}";
  var COLOR_ON = "rgb(72 239 67 / 43%)";
  var COLOR_OFF = "rgb(239 67 67 / 43%)";
  var refreshBlacklistedSidebar = () => {
    const sidebar = document.getElementById("blacklisted-sidebar");
    if (!sidebar) return;
    const enabled = TAG.getEnabled();
    const link = sidebar.querySelector("#blacklistedSidebarLink");
    if (link) link.textContent = enabled ? BLACKLISTED_LINK_ON : BLACKLISTED_LINK_OFF;
    sidebar.style.backgroundColor = enabled ? COLOR_ON : COLOR_OFF;
    const count = sidebar.querySelector("#blacklist-count");
    if (count) {
      const n = TAG.getHiddenCount();
      count.textContent = n > 0 ? String(n) : "";
    }
  };
  var createBlacklistedSidebar = () => {
    if (document.getElementById("blacklisted-sidebar")) return;
    const navbar = document.querySelector("ul#navbar.flat-list") || document.getElementById("navbar");
    if (!navbar) return;
    const sidebar = document.createElement("div");
    sidebar.id = "blacklisted-sidebar";
    sidebar.style.cssText = "top: -31px; position: absolute; left: 380px; padding: 5px 10px; color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); border-radius: 3px; cursor: pointer; font-size: 14px; height: 22px; display: flex; align-items: center; margin: 0;";
    const h5 = document.createElement("h5");
    h5.style.margin = "0";
    sidebar.appendChild(h5);
    const ref = navbar.children[3] || null;
    navbar.insertBefore(sidebar, ref);
  };
  var integrateBlacklistedSidebar = (sidebar) => {
    if (!sidebar || sidebar.dataset.r34thSmartSkip === "1") return;
    sidebar.dataset.r34thSmartSkip = "1";
    sidebar.style.display = "";
    let h5 = sidebar.querySelector("h5");
    if (!h5) {
      h5 = document.createElement("h5");
      sidebar.appendChild(h5);
    }
    const oldLink = sidebar.querySelector('a[href="#"]');
    const link = document.createElement("a");
    link.href = "#";
    link.id = "blacklistedSidebarLink";
    link.style.color = "white";
    const toggleAction = (e) => {
      e.preventDefault();
      e.stopPropagation();
      TAG.toggle();
    };
    const editAction = (e) => {
      e.preventDefault();
      e.stopPropagation();
      TAG.openRules();
    };
    link.addEventListener("click", toggleAction);
    link.addEventListener("contextmenu", editAction);
    sidebar.addEventListener("click", toggleAction);
    sidebar.addEventListener("contextmenu", editAction);
    if (oldLink && oldLink.parentNode) oldLink.parentNode.replaceChild(link, oldLink);
    else h5.insertBefore(link, h5.firstChild);
    let count = sidebar.querySelector("#blacklist-count");
    if (!count) {
      count = document.createElement("span");
      count.id = "blacklist-count";
      count.className = "post-count";
      count.style.marginLeft = "5px";
      h5.appendChild(count);
    }
    refreshBlacklistedSidebar();
  };
  var setupSidebarIntegration = () => {
    const tryIntegrate = () => {
      const sidebar = document.getElementById("blacklisted-sidebar");
      if (sidebar && sidebar.dataset.r34thSmartSkip === "1") {
        if (TAG.isRouteLockedOff()) sidebar.remove();
        return;
      }
      if (TAG.isRouteLockedOff()) {
        if (sidebar) sidebar.remove();
        return;
      }
      createBlacklistedSidebar();
      const sb = document.getElementById("blacklisted-sidebar");
      if (sb) integrateBlacklistedSidebar(sb);
    };
    tryIntegrate();
    const obs = new MutationObserver(debounce(tryIntegrate, CONSTANTS.DEBOUNCE_MUTATION_MS));
    obs.observe(document.documentElement, { childList: true, subtree: true });
    observers.push(obs);
  };

  // src/css.js
  var TAG_CSS = [
    ".r34-btn:focus-visible{outline:2px solid #6cf;outline-offset:1px}",
    ".r34-btn{margin-top:4px;width:100%;cursor:pointer;font-size:12px;background:#333;color:#fff;border:1px solid #555;padding:5px 8px;border-radius:3px;transition:background .15s;box-sizing:border-box;text-align:center}",
    ".r34-btn:hover{background:#444}",
    ".r34-btn:active{filter:brightness(1.2)}",
    ".r34-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;font-family:ui-sans-serif,system-ui,sans-serif}",
    ".r34-modal-box{background:#222;color:#fff;border:1px solid #444;border-radius:6px;padding:14px 16px;min-width:340px;max-width:90vw;max-height:none;overflow-y:auto;box-shadow:0 6px 18px rgba(0,0,0,.5);width:800px}",
    ".r34-modal-box h3{margin:0 0 8px;font-size:14px}",
    ".r34-modal-box textarea{width:100%;height:800px;min-height:9em;background:#1a1a1a;color:#fff;border:1px solid #444;border-radius:3px;padding:6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;resize:vertical;box-sizing:border-box;}",
    ".r34-modal-box .r34-pill{display:inline-block;background:#1a1a1a;padding:2px 6px;border-radius:10px;font-size:11px;margin:2px;color:#ddd}",
    ".r34-modal-box .actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}",
    ".r34-modal-box .hint{font-size:11px;color:#aaa;margin-top:8px;line-height:1.45}",
    ".r34-modal-box .r34-check{display:flex;align-items:flex-start;gap:6px;font-size:12px;margin:8px 0 0;cursor:pointer;line-height:1.4}",
    ".r34-modal-box .r34-check input{margin:1px 0 0;flex:none}",
    ".r34-modal-box code{background:#1a1a1a;padding:1px 4px;border-radius:2px;color:#cfc}",
    ".r34-tag-list{background:#1a1a1a;padding:6px 8px;border-radius:3px;max-height:14em;overflow-y:auto;font-size:11px;margin:6px 0;line-height:1.4}"
  ].join("\n");
  var HEADER_CSS = [
    "#header{transition:height .3s ease;overflow:hidden}",
    ".header-fix-btn{position:absolute;top:5px;right:10px;z-index:1000;padding:2px 6px;font-size:12px;cursor:pointer;background:#222;color:#fff;border:1px solid #444;border-radius:4px}"
  ].join("\n");
  var PAGE_INDICATOR_CSS = "#page-indicator{position:fixed;bottom:10px;right:10px;background:rgba(30,30,30,.9);color:#fff;padding:6px 12px;border-radius:20px;font-size:13px;font-family:monospace;z-index:9999;pointer-events:auto;cursor:pointer;backdrop-filter:blur(5px);border:1px solid #444;box-shadow:0 2px 8px rgba(0,0,0,.3);display:none}";
  var BLACKLIST_CSS = "span.thumb:has(img.blacklist-img),.blacklisted-image.thumb,span.blacklisted-image{display:none!important}";
  var PANEL_CSS = [
    ".r34-panel-btn{position:absolute;z-index:10000;padding:4px 8px;font-size:16px;background:#222;color:#eee;border:1px solid #444;border-radius:0px;cursor:move;user-select:none;width:278px!important;left:100px!important;top:1px!important;border-bottom-width:0px;height:31px;}",
    ".r34-panel{position:absolute;background:#222;color:#eee;padding:10px;border-radius:0;font-size:12px;z-index:9999;display:none;font-family:sans-serif;border:1px solid #555;top:27px!important;width:255.859px!important;left:100px!important;padding-top:5px;}",
    ".r34-panel form label{display:block;margin-bottom:2px;cursor:pointer}",
    ".r34-panel form input{margin-right:8px}",
    ".r34-panel form strong{color:#0af;display:block;border-bottom:1px solid #444;padding-bottom:0;margin-bottom:0}",
    ".r34-panel button{margin-top:4px;padding:2px 5px;color:#fff;border:none;border-radius:0;cursor:pointer;margin-right:4px;}",
    ".r34-panel .save-btn{background:#0af}",
    ".r34-panel .cancel-btn{background:#444}",
    ".tooltip-info{cursor:help;margin-left:4px;opacity:.7}",
    ".tooltip-info:hover{opacity:1}"
  ].join("\n");
  var WEBM_HIDE_CSS = [
    "span.thumb:has(img.webm-thumb){display:none!important}",
    "img.webm-thumb{display:none!important}"
  ].join("\n");
  var INFINITE_SCROLL_CSS = [
    "#r34-inf-scroll-status{text-align:center;padding:10px 0;color:#888;font-size:12px;font-family:ui-sans-serif,system-ui,sans-serif;user-select:none}",
    "#r34-inf-scroll-status.r34-inf-loading{color:#6cf}",
    "#r34-inf-scroll-status.r34-inf-error{color:#f66}",
    "#r34-inf-pagetual-hint{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:100000;background:#3a2a00;color:#ffd27a;border:1px solid #7a5a00;border-radius:6px;padding:8px 14px;font-size:13px;font-family:ui-sans-serif,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.5)}"
  ].join("\n");
  var OVERLAY_CSS = [
    "#r34-thumb-overlay{position:fixed;z-index:99999;background:rgba(24,24,24,.97);color:#eee;border:1px solid #555;border-radius:6px;padding:8px 10px;font-size:12px;max-width:380px;box-shadow:0 6px 20px rgba(0,0,0,.55);font-family:ui-sans-serif,system-ui,sans-serif;display:none}",
    "#r34-thumb-overlay .r34-ov-header{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:700;color:#888;border-bottom:1px solid #444;padding-bottom:4px;margin-bottom:6px}",
    "#r34-thumb-overlay .r34-ov-user{color:#ff6b6b;text-decoration:none;font-weight:600;white-space:nowrap}",
    "#r34-thumb-overlay .r34-ov-user:hover{text-decoration:underline}",
    "#r34-thumb-overlay .r34-ov-group{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:5px}",
    "#r34-thumb-overlay .r34-ov-label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.85;margin-right:2px;min-width:52px}",
    "#r34-thumb-overlay .r34-ov-tag{cursor:pointer;padding:2px 6px;border:1px solid;border-radius:10px;font-size:11px;background:rgba(255,255,255,.04);user-select:none}",
    "#r34-thumb-overlay .r34-ov-tag:hover{background:rgba(255,255,255,.12)}",
    "#r34-thumb-overlay .r34-ov-more{font-size:10px;color:#777;align-self:center}",
    "#r34-thumb-overlay .r34-ov-hint{font-size:10px;color:#777;margin-top:6px}"
  ].join("\n");
  var API_MODAL_CSS = [
    "#r34-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.7);display:flex;justify-content:center;align-items:center;z-index:99999;font-family:sans-serif}",
    "#r34-modal-content{background-color:#1e1e1e;color:#eee;padding:20px 30px;border-radius:8px;text-align:center;max-width:400px;border:1px solid #555}",
    "#r34-modal-content p{margin:0 0 20px;line-height:1.5}",
    "#r34-modal-buttons button,#r34-manual-input button{background-color:#333;color:#fff;border:1px solid #555;padding:10px 15px;border-radius:5px;cursor:pointer;margin:0 10px}",
    "#r34-manual-input{margin-top:20px}",
    "#r34-manual-input input{display:block;width:calc(100% - 20px);margin:10px auto;padding:8px;background-color:#333;border:1px solid #555;color:#fff;border-radius:4px}"
  ].join("\n");

  // src/tag-hider.js
  var TAG = (() => {
    const K = {
      config: "r34th_config",
      // Alte Keys – nur noch für die einmalige Migration
      rulesV3: "r34th_rules_v3",
      rulesV3Fav: "r34th_rules_v3_fav",
      rulesLegacyV2: "r34th_rules_v2",
      rulesLegacy: "forbiddenTags",
      enabled: "r34th_enabled",
      enabledFav: "r34th_enabled_fav",
      enabledFav2: "r34th_enabled_fav2",
      enabledPostview: "r34th_enabled_postview",
      enabledLegacy: "enabled"
    };
    const safeGet = (key, fb) => {
      try {
        const v = GM_getValue(key, fb);
        return v === void 0 || v === null ? fb : v;
      } catch {
        return fb;
      }
    };
    const safeSet = (key, val) => {
      try {
        GM_setValue(key, val);
      } catch {
      }
    };
    const safeDelete = (key) => {
      try {
        GM_deleteValue(key);
        return;
      } catch {
      }
      try {
        if (typeof GM !== "undefined" && GM.deleteValue) GM.deleteValue(key);
      } catch {
      }
    };
    const loadBool = (pk, lk, fb) => {
      const v = safeGet(pk, void 0);
      const r = v === void 0 ? safeGet(lk, fb) : v;
      return r !== false && r !== "false";
    };
    const isFavProfile = () => getRoute().isFavoritesPage;
    const FAVORITES_EXEMPT_IDS = ["5598646"];
    const isExemptFavorite = () => {
      const r = getRoute();
      return r.isFavoritesPage && r.section === "view" && FAVORITES_EXEMPT_IDS.indexOf(String(r.id)) !== -1;
    };
    const routeType = () => {
      const r = getRoute();
      if (r.page === "post" && r.section === "view") return "postview";
      if (r.isFavoritesPage) return "fav";
      return "main";
    };
    const isRouteLockedOff = () => isExemptFavorite() || routeType() === "postview";
    const profile = () => isFavProfile() ? "fav" : "main";
    let config = null;
    const migrateRules = (v3Key, v2Key, v1Key, withCookie) => {
      const v3 = safeGet(v3Key, null);
      if (Array.isArray(v3)) {
        if (v3.length > 0) {
          if (v3.every((r) => r && typeof r.kind === "string")) return v3;
          const conv = v3.map((r) => r && typeof r.kind === "string" ? r : r && Array.isArray(r.orGroups) ? v2ToAst(r) : null).filter(Boolean);
          if (conv.length) return conv;
        }
        return [];
      }
      if (v2Key) {
        const v2 = safeGet(v2Key, null);
        if (Array.isArray(v2) && v2.length > 0) {
          const mig = v2.map(v2ToAst).filter(Boolean);
          if (mig.length) return mig;
        }
      }
      if (v1Key) {
        const v1 = safeGet(v1Key, []);
        if (Array.isArray(v1) && v1.length) {
          const seed = v1.map((t) => {
            const w = normalizeTag(t);
            return w ? { kind: "word", value: w } : null;
          }).filter(Boolean);
          if (seed.length) return seed;
        }
      }
      if (withCookie) {
        const cookie = getTagsFromCookie();
        if (cookie.length) return cookie.map((t) => ({ kind: "word", value: t }));
      }
      return [];
    };
    const loadConfig2 = () => {
      const existing = safeGet(K.config, null);
      if (existing && typeof existing === "object" && existing.rules && typeof existing.rules === "object") {
        if (!existing.enabled || typeof existing.enabled !== "object") existing.enabled = { main: true, fav: true };
        if (!Array.isArray(existing.rules.main)) existing.rules.main = [];
        if (!Array.isArray(existing.rules.fav)) existing.rules.fav = [];
        if (!existing.showWebm || typeof existing.showWebm !== "object") existing.showWebm = { main: false, fav: false };
        existing.showWebm.main = existing.showWebm.main === true;
        existing.showWebm.fav = existing.showWebm.fav === true;
        return existing;
      }
      const migrated = {
        enabled: {
          main: loadBool(K.enabled, K.enabledLegacy, true),
          fav: loadBool(K.enabledFav2, K.enabledFav, true)
        },
        rules: {
          main: migrateRules(K.rulesV3, K.rulesLegacyV2, K.rulesLegacy, true),
          fav: migrateRules(K.rulesV3Fav, null, null, false)
        },
        showWebm: { main: false, fav: false }
      };
      safeSet(K.config, migrated);
      [K.rulesV3, K.rulesV3Fav, K.rulesLegacyV2, K.rulesLegacy, K.enabled, K.enabledFav, K.enabledFav2, K.enabledPostview, K.enabledLegacy].forEach(safeDelete);
      return migrated;
    };
    const saveConfig = () => safeSet(K.config, config);
    const rulesFor = (prof) => {
      const p = prof || profile();
      if (!Array.isArray(config.rules[p])) config.rules[p] = [];
      return config.rules[p];
    };
    const enabledFor = (prof) => config.enabled[prof] !== false;
    const setEnabledFor = (prof, val) => {
      config.enabled[prof] = val;
      saveConfig();
    };
    const showWebmFor = (prof) => {
      const p = prof || profile();
      const s = config.showWebm;
      return !!(s && typeof s === "object" && s[p] === true);
    };
    const setShowWebmFor = (prof, val) => {
      const p = prof || profile();
      if (!config.showWebm || typeof config.showWebm !== "object") config.showWebm = {};
      config.showWebm[p] = val === true;
      saveConfig();
    };
    const shouldHideWebm = () => enabled && !showWebmFor();
    const getTagsFromCookie = () => {
      try {
        const m = document.cookie.match(new RegExp("(^| )tag_blacklist=([^;]+)"));
        if (m) {
          let raw = decodeURIComponent(m[2]);
          if (raw.indexOf("%") !== -1) raw = decodeURIComponent(raw);
          return raw.split(/[\s+]+/).map(normalizeTag).filter((t) => t.length > 0);
        }
      } catch {
      }
      return [];
    };
    const getOwnUserId = () => {
      try {
        const m = document.cookie.match(new RegExp("(^| )user_id=([^;]+)"));
        return m ? m[2] : null;
      } catch {
        return null;
      }
    };
    const isForeignFavoritesPage = () => {
      const r = getRoute();
      if (!(r.isFavoritesPage && r.section === "view")) return false;
      if (!r.id) return false;
      const own = getOwnUserId();
      return !own || r.id !== own;
    };
    const getCookieBlacklistCompiled = () => {
      const tags = getTagsFromCookie();
      if (!tags.length) return null;
      return compileRules(tags.map((t) => ({ kind: "word", value: t })));
    };
    config = loadConfig2();
    let enabled = isRouteLockedOff() ? false : enabledFor(profile());
    let rules = rulesFor(profile());
    let compiled = compileRules(rules);
    const saveRules = (newRules, prof) => {
      const p = prof || profile();
      config.rules[p] = newRules;
      saveConfig();
      if (profile() === p) {
        rules = newRules;
        compiled = compileRules(rules);
      }
    };
    let lastProfile = routeType() + (isExemptFavorite() ? ":exempt" : "");
    const updatePanelState = () => {
      const panelBtn = document.getElementById("toggleSkip");
      if (panelBtn) {
        const locked = isRouteLockedOff();
        panelBtn.disabled = locked;
        panelBtn.textContent = locked ? "Locked \u{1F512}" : enabled ? "Disable \u{1F534}" : "Enable \u{1F7E2}";
      }
      const hint = document.getElementById("skipLockedHint");
      if (hint) hint.style.display = isRouteLockedOff() ? "block" : "none";
    };
    const reloadForRoute = () => {
      const openModal = document.querySelector(".r34-modal-overlay");
      if (openModal) openModal.remove();
      const prof = routeType() + (isExemptFavorite() ? ":exempt" : "");
      if (prof === lastProfile) return;
      lastProfile = prof;
      enabled = isRouteLockedOff() ? false : enabledFor(profile());
      rules = rulesFor(profile());
      compiled = compileRules(rules);
      reapply();
      initObservers({ force: true });
      refreshBlacklistedSidebar();
      updatePanelState();
    };
    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const buildModal = (title, bodyHtml, actions) => {
      const overlay = document.createElement("div");
      overlay.className = "r34-modal-overlay";
      const box = document.createElement("div");
      box.className = "r34-modal-box";
      box.innerHTML = "<h3>" + escapeHtml(title) + "</h3>" + (bodyHtml || "");
      if (actions && actions.length) {
        const actWrap = document.createElement("div");
        actWrap.className = "actions";
        actions.forEach((a) => {
          const btn = document.createElement("button");
          btn.className = "r34-btn";
          btn.style.marginTop = "0";
          btn.style.flex = "1";
          btn.textContent = a.label;
          btn.addEventListener("click", () => {
            let result;
            try {
              if (a.onClick) result = a.onClick(box);
            } catch (e) {
              console.error(e);
            }
            if (a.closeOnClick !== false) overlay.remove();
            if (typeof a.afterClose === "function") a.afterClose(result, overlay);
          });
          actWrap.append(btn);
        });
        box.append(actWrap);
      }
      overlay.append(box);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
      });
      (document.body || document.documentElement).appendChild(overlay);
      return overlay;
    };
    const openTagsEditor = () => {
      const prof = profile();
      const overlay = buildModal("Edit blacklist rules" + (prof === "fav" ? " \u2014 Favorites" : " \u2014 Tags"), [
        '<div class="hint">One rule per line (comma also accepted).<br>Whitespace / <code>&amp;</code> = AND, <code>|</code> = OR. Wildcards: <code>furry*</code> \xB7 Comments after <code>//</code>.</div>',
        // Ausnahme der Blacklist: Häkchen = webm/mp4/gif-Thumbs werden
        // trotz "Blacklist ON" ganz normal angezeigt.
        '<label class="r34-check"><input type="checkbox" id="r34th-show-webm"> Show <b>webm</b>/mp4/gif thumbnails even while the blacklist is <b>active</b> (unticked = they are hidden together with the tag rules)</label>',
        '<textarea id="r34th-rules-text"></textarea>'
      ].join(""), [
        { label: "Cancel" },
        { label: "Save", afterClose: (_, ov) => {
          const ta2 = ov.querySelector("#r34th-rules-text");
          const cb2 = ov.querySelector("#r34th-show-webm");
          setShowWebmFor(prof, !!(cb2 && cb2.checked));
          saveRules(parseRulesInput(ta2 ? ta2.value : ""), prof);
          reapply();
        } }
      ]);
      const ta = overlay.querySelector("#r34th-rules-text");
      ta.value = rulesFor(prof).map(astToText).filter(Boolean).join("\n");
      const cb = overlay.querySelector("#r34th-show-webm");
      if (cb) cb.checked = showWebmFor(prof);
    };
    const openCookieDialog = () => {
      const prof = profile();
      const cookie = getTagsFromCookie();
      if (!cookie.length) {
        alert("Kein 'tag_blacklist' Cookie gefunden oder Liste ist leer.");
        return;
      }
      const currentSet = /* @__PURE__ */ new Set();
      rulesFor(prof).forEach((ast) => {
        const toks = [];
        walkTokens(ast, toks);
        toks.forEach((t) => currentSet.add(t));
      });
      const cookieSet = new Set(cookie);
      const inBoth = [], onlyCookie = [], onlyLocal = [];
      cookie.forEach((t) => currentSet.has(t) ? inBoth.push(t) : onlyCookie.push(t));
      currentSet.forEach((t) => {
        if (!cookieSet.has(t)) onlyLocal.push(t);
      });
      const pills = (arr) => arr.length ? arr.slice(0, 60).map((t) => '<span class="r34-pill">' + escapeHtml(t) + "</span>").join("") + (arr.length > 60 ? ' <span class="r34-pill">+' + (arr.length - 60) + "</span>" : "") : '<span style="color:#888">\u2014</span>';
      buildModal("Import from cookie", [
        '<div class="hint">Cookie tags: <b>' + cookie.length + "</b> \xB7 Local rules: <b>" + currentSet.size + "</b><br>",
        '<span style="color:#7c7">' + inBoth.length + ' in both</span> \xB7 <span style="color:#6cf">' + onlyCookie.length + ' only in cookie</span> \xB7 <span style="color:#fc6">' + onlyLocal.length + " only local</span></div>",
        '<div class="hint">Tags only in cookie (would be added):</div><div class="r34-tag-list">' + pills(onlyCookie) + "</div>",
        '<div class="hint">Replace = cookie wins \xB7 Merge = union \xB7 Cancel = keep as is.</div>'
      ].join(""), [
        { label: "Cancel" },
        { label: "Replace", afterClose: () => {
          saveRules(parseRulesInput(cookie.join("\n")), prof);
          reapply();
        } },
        { label: "Merge (union)", afterClose: () => {
          const m = /* @__PURE__ */ new Set();
          currentSet.forEach((t) => m.add(t));
          cookie.forEach((t) => m.add(t));
          saveRules(parseRulesInput(Array.from(m).join("\n")), prof);
          reapply();
        } }
      ]);
    };
    const HIDDEN_ATTR = "r34thHiderHidden";
    const PROCESSED_ATTR = "r34thHiderProcessed";
    const ORIGINAL_DISPLAY_ATTR = "r34thHiderOriginalDisplay";
    const PARSED_SCRIPT_ATTR = "r34thHiderParsed";
    const PARSED_SIGNATURE_ATTR = "r34thHiderSignature";
    let viewCheck = null;
    const getThumbCache = () => window.__r34thFavCache || (window.__r34thFavCache = {});
    const getTagsFromTitle = (title) => String(title || "").split(/\s+/).map(normalizeTag).filter(Boolean);
    const parseFavScripts = (cache) => {
      document.querySelectorAll("script").forEach((script) => {
        const scriptText = script.textContent || "";
        if (script.dataset[PARSED_SCRIPT_ATTR] === "1" && script.dataset[PARSED_SIGNATURE_ATTR] === scriptText) return;
        let parsedAny = false;
        try {
          const matches = scriptText.matchAll(/posts\[(\d+)\]\s*=\s*\{[^}]*['"]?tags['"]?\s*:\s*["']([^"']+)["']/g);
          for (const m of matches) {
            cache[m[1]] = getTagsFromTitle(m[2]);
            parsedAny = true;
          }
        } catch {
        }
        if (parsedAny) script.dataset[PARSED_SCRIPT_ATTR] = "1";
        if (parsedAny) script.dataset[PARSED_SIGNATURE_ATTR] = scriptText;
      });
    };
    const getThumbId = (thumb) => {
      let id = null;
      if (thumb.id && thumb.id.indexOf("p") === 0) id = thumb.id.slice(1);
      if (!id) {
        const a = thumb.querySelector('a[href*="page=post"][href*="id="]');
        if (a) {
          try {
            id = new URL(a.href, location.origin).searchParams.get("id");
          } catch {
            id = null;
          }
        }
      }
      return id;
    };
    const getThumbTags = (thumb, cache) => {
      const id = getThumbId(thumb);
      if (id && cache[id]) return cache[id];
      const media = thumb.querySelector("img, video");
      if (media) {
        const t = (media.title || media.alt || "").trim();
        if (t) {
          const parsed = getTagsFromTitle(t);
          if (parsed.length) {
            if (id) cache[id] = parsed;
            return parsed;
          }
        }
      }
      return null;
    };
    let hiddenElements = /* @__PURE__ */ new Set();
    const hideElement = (el) => {
      if (!el || el.dataset[HIDDEN_ATTR] === "1") return;
      el.dataset[ORIGINAL_DISPLAY_ATTR] = el.style.display || "";
      el.dataset[HIDDEN_ATTR] = "1";
      el.style.display = "none";
      hiddenElements.add(el);
    };
    const restoreHiddenElements = () => {
      hiddenElements.forEach((el) => {
        if (!el.isConnected) return;
        el.style.display = el.dataset[ORIGINAL_DISPLAY_ATTR] || "";
        delete el.dataset[HIDDEN_ATTR];
        delete el.dataset[ORIGINAL_DISPLAY_ATTR];
      });
      hiddenElements.clear();
    };
    const getHiddenCount = () => {
      let n = 0;
      hiddenElements.forEach((el) => {
        if (el.isConnected) n++;
        else hiddenElements.delete(el);
      });
      return n;
    };
    const WEBM_IMG_SELECTOR = "img.webm-thumb";
    let webmStyleEl = null;
    const getWebmHideTarget = (thumb) => {
      const parent = thumb.parentElement;
      return parent && !parent.classList.contains("image-list") && parent.tagName === "SPAN" ? parent : thumb;
    };
    const syncWebmCss = () => {
      if (!webmStyleEl) return;
      const css = shouldHideWebm() ? WEBM_HIDE_CSS : "";
      if (webmStyleEl.textContent !== css) webmStyleEl.textContent = css;
    };
    const ensureWebmStyle = () => {
      if (!webmStyleEl || !webmStyleEl.isConnected) {
        const root = document.head || document.documentElement;
        if (!root) return;
        webmStyleEl = document.createElement("style");
        webmStyleEl.id = "r34th-webm-hide";
        root.appendChild(webmStyleEl);
      }
      syncWebmCss();
    };
    const hideWebmThumb = (thumb) => {
      if (!thumb || !shouldHideWebm()) return false;
      if (!thumb.querySelector(WEBM_IMG_SELECTOR)) return false;
      hideElement(getWebmHideTarget(thumb));
      return true;
    };
    const clearProcessedState = () => {
      document.querySelectorAll('[data-r34th-hider-processed="1"]').forEach((el) => delete el.dataset[PROCESSED_ATTR]);
      document.querySelectorAll("script[data-r34th-hider-parsed]").forEach((script) => {
        delete script.dataset[PARSED_SCRIPT_ATTR];
        delete script.dataset[PARSED_SIGNATURE_ATTR];
      });
    };
    const processListPage = (candidateThumbs) => {
      if (!enabled) return;
      const cache = getThumbCache();
      parseFavScripts(cache);
      const thumbs = candidateThumbs || document.querySelectorAll(".thumb:not([data-r34th-hider-processed='1'])");
      for (let i = 0; i < thumbs.length; i++) {
        const thumb = thumbs[i];
        if (!thumb || !thumb.isConnected || thumb.dataset[PROCESSED_ATTR] === "1") continue;
        if (hideWebmThumb(thumb)) {
          thumb.dataset[PROCESSED_ATTR] = "1";
          continue;
        }
        const postTags = getThumbTags(thumb, cache);
        if (!postTags) continue;
        thumb.dataset[PROCESSED_ATTR] = "1";
        if (anyRuleMatches(compiled, postTags)) hideElement(thumb);
      }
    };
    const processFavoritesPage = () => {
      if (!enabled) return;
      const cache = getThumbCache();
      parseFavScripts(cache);
      const cookieRules = isForeignFavoritesPage() ? getCookieBlacklistCompiled() : null;
      const slots = document.querySelectorAll('a[href*="page=post"][href*="id="]');
      for (let i = 0; i < slots.length; i++) {
        const a = slots[i];
        const slot = a.closest(".thumb");
        if (!slot || slot.dataset[PROCESSED_ATTR] === "1") continue;
        const id = getThumbId(slot);
        if (!id) continue;
        if (hideWebmThumb(slot)) {
          slot.dataset[PROCESSED_ATTR] = "1";
          continue;
        }
        const postTags = getThumbTags(slot, cache);
        if (!postTags) continue;
        slot.dataset[PROCESSED_ATTR] = "1";
        if (anyRuleMatches(compiled, postTags) || cookieRules && anyRuleMatches(cookieRules, postTags)) {
          const parentSpan = slot.parentElement;
          hideElement(parentSpan && parentSpan.tagName === "SPAN" ? parentSpan : slot);
        }
      }
    };
    const processViewPage = () => {
      let dir = "next";
      const nextLink = document.getElementById("next_search_link");
      const prevLink = document.getElementById("prev_search_link");
      if (nextLink) nextLink.addEventListener("mousedown", () => {
        dir = "next";
      });
      if (prevLink) prevLink.addEventListener("mousedown", () => {
        dir = "prev";
      });
      viewCheck = () => {
        if (!enabled) return;
        const tagList = document.getElementById("tag-sidebar");
        const img = document.getElementById("image");
        if (!tagList || !img) return;
        const anchors = tagList.querySelectorAll("li a");
        if (!anchors.length) return;
        const tags = [];
        anchors.forEach((a) => tags.push(normalizeTag(a.textContent)));
        let postId = "";
        try {
          postId = new URL(location.href).searchParams.get("id") || "";
        } catch {
        }
        const media = img.currentSrc || img.src || img.getAttribute("src") || "";
        const signature = postId + "" + media + "" + tags.join("");
        if (img.dataset.r34thHiderSignature === signature) return;
        img.dataset.r34thHiderSignature = signature;
        img.style.visibility = "";
        if (anyRuleMatches(compiled, tags)) {
          img.style.visibility = "hidden";
          const target = dir === "next" ? nextLink : prevLink;
          if (target && target.href && !target.href.endsWith("#")) {
            try {
              target.click();
            } catch {
            }
          }
        }
      };
      const root = document.getElementById("post-view") || document.body;
      const obs = new MutationObserver(makeCoalesced(viewCheck));
      obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "alt", "src"] });
      observers.push(obs);
      viewCheck();
    };
    const reapply = () => {
      syncWebmCss();
      restoreHiddenElements();
      clearProcessedState();
      const r = getRoute();
      if (r.isPostView) {
        const img = document.getElementById("image");
        if (img) {
          img.style.visibility = "";
          delete img.dataset.r34thHiderSignature;
        }
      }
      if (!enabled) {
        refreshBlacklistedSidebar();
        return;
      }
      if (r.isFavoritesPage) processFavoritesPage();
      else if (r.section === "list" || !r.page) processListPage();
      else if (r.isPostView && viewCheck) viewCheck();
      refreshBlacklistedSidebar();
    };
    const processAll = () => {
      if (!enabled) return;
      const r = getRoute();
      if (r.isFavoritesPage) processFavoritesPage();
      else if (r.section === "list" || !r.page) processListPage();
      else if (r.isPostView) {
        if (!viewCheck) processViewPage();
        else viewCheck();
      }
    };
    const toggle = () => {
      if (isRouteLockedOff()) return false;
      enabled = !enabled;
      setEnabledFor(profile(), enabled);
      reapply();
      updatePanelState();
      return enabled;
    };
    const observerOptions = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title", "alt", "src"] };
    const makeCoalesced = (fn) => {
      let q = false;
      return () => {
        if (q) return;
        q = true;
        Promise.resolve().then(() => {
          q = false;
          fn();
        });
      };
    };
    const makeMutationCoalesced = (fn) => {
      let q = false;
      let pending = [];
      return (mutations) => {
        if (mutations && mutations.length) pending.push.apply(pending, mutations);
        if (q) return;
        q = true;
        Promise.resolve().then(() => {
          const batch = pending;
          pending = [];
          q = false;
          fn(batch);
        });
      };
    };
    const collectMutationThumbs = (mutations) => {
      const found = /* @__PURE__ */ new Set();
      (mutations || []).forEach((mutation) => {
        const candidates = mutation.type === "attributes" ? [mutation.target] : mutation.type === "characterData" ? [mutation.target && mutation.target.parentElement] : Array.from(mutation.addedNodes || []);
        candidates.forEach((node) => {
          if (!node || node.nodeType !== 1) return;
          const thumb = node.matches && node.matches(".thumb") ? node : node.closest ? node.closest(".thumb") : null;
          if (thumb) found.add(thumb);
          if (node.querySelectorAll) node.querySelectorAll(".thumb").forEach((n) => found.add(n));
        });
        if (mutation.type === "childList" && mutation.target && mutation.target.closest) {
          const parentThumb = mutation.target.closest(".thumb");
          if (parentThumb) found.add(parentThumb);
        }
      });
      return Array.from(found);
    };
    let observersInitialized = false;
    let routeObserver = null;
    const detachRouteObserver = () => {
      if (!routeObserver) return;
      try {
        routeObserver.disconnect();
      } catch {
      }
      const idx = observers.indexOf(routeObserver);
      if (idx !== -1) observers.splice(idx, 1);
      routeObserver = null;
    };
    const initObservers = (options = {}) => {
      if (observersInitialized && !options.force) return;
      if (options.force) detachRouteObserver();
      observersInitialized = true;
      const r = getRoute();
      if (r.section === "list" || !r.page) {
        routeObserver = new MutationObserver(makeMutationCoalesced((ms) => {
          const cands = collectMutationThumbs(ms);
          if (cands.length) processListPage(cands);
        }));
        routeObserver.observe(document.documentElement, observerOptions);
        observers.push(routeObserver);
        processListPage();
        refreshBlacklistedSidebar();
      } else if (r.isFavoritesPage) {
        routeObserver = new MutationObserver(makeMutationCoalesced((ms) => {
          const relevant = (ms || []).some((m) => m.type === "attributes" ? !!(m.target.closest && m.target.closest(".thumb")) : m.type === "characterData" ? !!(m.target.parentElement && m.target.parentElement.closest("script, .thumb")) : Array.from(m.addedNodes || []).some((n) => n.nodeType === 1 && (n.matches && (n.matches('.thumb, script, a[href*="page=post"]') || n.querySelector('.thumb, script, a[href*="page=post"]')))));
          if (relevant) processFavoritesPage();
        }));
        routeObserver.observe(document.documentElement, observerOptions);
        observers.push(routeObserver);
        processFavoritesPage();
        refreshBlacklistedSidebar();
      } else if (r.isPostView && !isRouteLockedOff()) {
        processViewPage();
      }
    };
    GM_addStyle(TAG_CSS);
    ensureWebmStyle();
    return { getEnabled: () => enabled, toggle, reapply, processAll, openRules: openTagsEditor, openCookie: openCookieDialog, initObservers, reloadForRoute, isRouteLockedOff, getHiddenCount, updatePanelState };
  })();

  // src/features.js
  var removePostContainer = (thumbSpan) => {
    const parent = thumbSpan.parentElement;
    const container = parent && !parent.classList.contains("image-list") && parent.tagName === "SPAN" ? parent : thumbSpan;
    const nextScript = container.nextElementSibling;
    const hasAssociatedScript = nextScript?.tagName === "SCRIPT" && nextScript.textContent.includes("posts[");
    container.remove();
    if (hasAssociatedScript) nextScript.remove();
  };
  var blacklistCssInjected = false;
  var hideBlacklisted = (ctx) => {
    if (!blacklistCssInjected) {
      GM_addStyle(BLACKLIST_CSS);
      blacklistCssInjected = true;
    }
    ctx.querySelectorAll?.(".blacklisted").forEach((el) => el.remove());
    ctx.querySelectorAll?.('img.blacklist-img, img[src*="blacklisted.png"]').forEach((img) => {
      const thumbContainer = img.closest("span.thumb");
      if (thumbContainer) {
        removePostContainer(thumbContainer);
      }
    });
  };
  var removeAnnoyances = (ctx) => {
    ctx.querySelectorAll?.(AD_SELECTORS.join(", ")).forEach((el) => el.remove());
    ctx.querySelectorAll?.('div[style*="display: inline-flex"]').forEach((el) => {
      const hasAdContent = AD_MARKERS.some((sel) => el.querySelector(sel));
      if (hasAdContent) el.remove();
    });
  };
  var cleanupFavoritesArtifacts = () => {
    if (!getRoute().isFavoritesView) return;
    document.querySelectorAll("a#pi").forEach((link) => link.closest("div")?.remove());
    const imageList = document.querySelector("div.image-list");
    if (!imageList) return;
    Array.from(imageList.children).forEach((child) => {
      if (child.tagName === "BR") {
        child.remove();
      } else if (child.tagName === "SCRIPT" && child.textContent.includes("posts[")) {
        const prev = child.previousElementSibling;
        const hasValidWrapper = prev?.tagName === "SPAN" && prev.querySelector("span.thumb");
        if (!hasValidWrapper) child.remove();
      }
    });
  };
  var fixPaginatorLinks = (ctx) => ctx.querySelectorAll?.("#paginator a[onclick]").forEach((link) => {
    const match = (link.getAttribute("onclick") || "").match(/document\.location='([^']+)'/);
    if (match && link.getAttribute("href") === "#") link.setAttribute("href", match[1]);
  });
  var removePidParameter = (ctx) => ctx.querySelectorAll?.('a[onclick*="return_pid="]').forEach((link) => {
    link.setAttribute("onclick", (link.getAttribute("onclick") || "").replace(/[?&]return_pid=\d+/, ""));
  });
  var setNativeLazyLoading = (ctx) => {
    let images;
    if (ctx.nodeType === 1 && ctx.matches?.("img:not([loading])")) {
      images = [ctx];
    } else {
      images = ctx.querySelectorAll?.("img:not([loading])");
    }
    if (images?.length) {
      let i = 0;
      images.forEach((img) => {
        if (i < 15) {
          img.loading = "eager";
          img.fetchPriority = "high";
        } else {
          img.loading = "lazy";
        }
        img.decoding = "async";
        if (!img.hasAttribute("referrerpolicy")) img.referrerPolicy = "no-referrer";
        i++;
      });
    }
  };
  var SITE_BLACKLIST_IMG = 'img.blacklist-img, img[src*="blacklisted.png"]';
  var isHiddenMedia = (el, stopAt) => {
    for (let node = el; node && node !== stopAt; node = node.parentElement) {
      if (node.hasAttribute?.("hidden")) return true;
      if (/display\s*:\s*none/i.test(node.getAttribute?.("style") || "")) return true;
    }
    return false;
  };
  var isSpanEmpty = (span) => {
    const media = span.querySelectorAll("img, video");
    for (let i = 0; i < media.length; i++) {
      const node = media[i];
      if (node.tagName === "IMG" && node.matches(SITE_BLACKLIST_IMG)) continue;
      if (isHiddenMedia(node, span)) continue;
      return false;
    }
    if (span.children.length === 0) return true;
    const links = span.querySelectorAll("a");
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      if (/display\s*:\s*none/i.test(link.getAttribute("style") || "")) continue;
      return false;
    }
    return true;
  };
  var hideEmptyThumbSpans = (ctx) => {
    const isDirectSpan = ctx.nodeType === 1 && ctx.matches?.("span.thumb");
    const spans = isDirectSpan ? [ctx] : ctx.querySelectorAll?.("span.thumb") || [];
    spans.forEach((span) => {
      if (span.dataset.r34thHiderHidden === "1") return;
      if (isSpanEmpty(span)) removePostContainer(span);
    });
  };
  var removeThumbTitle = (ctx) => ctx.querySelectorAll?.(".thumb img[title]").forEach((img) => img.removeAttribute("title"));
  var removeDuplicateThumbnails = (() => {
    let seenIds = /* @__PURE__ */ new Set();
    const fn = (ctx) => {
      const thumbs = ctx.matches?.("span.thumb") ? [ctx] : Array.from(ctx.querySelectorAll?.("span.thumb") || []);
      if (thumbs.length === 0) return ctx;
      const toRemove = [];
      thumbs.forEach((el) => {
        const id = el.id?.slice(1);
        if (!id) return;
        if (seenIds.has(id)) {
          const liveNode = document.getElementById(el.id);
          if (liveNode && liveNode !== el) toRemove.push(el);
        } else {
          seenIds.add(id);
        }
      });
      toRemove.forEach((el) => removePostContainer(el));
      return ctx;
    };
    fn.reset = () => {
      seenIds = /* @__PURE__ */ new Set();
    };
    return fn;
  })();
  var loadFavoriteIds = () => new Promise((resolve) => {
    try {
      if (!("indexedDB" in window)) {
        resolve(/* @__PURE__ */ new Set());
        return;
      }
      const req = indexedDB.open("R34FavDB", 1);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction("favoritesStore", "readonly");
          const store = tx.objectStore("favoritesStore");
          const getReq = store.get("allImagesPayload");
          getReq.onsuccess = () => {
            const payload = getReq.result;
            const imgs = payload && Array.isArray(payload.images) ? payload.images : Array.isArray(payload) ? payload : [];
            resolve(new Set(imgs.map((i) => String(i && i.id)).filter(Boolean)));
          };
          getReq.onerror = () => resolve(/* @__PURE__ */ new Set());
        } catch {
          resolve(/* @__PURE__ */ new Set());
        }
      };
      req.onerror = () => resolve(/* @__PURE__ */ new Set());
      req.onblocked = () => resolve(/* @__PURE__ */ new Set());
    } catch {
      resolve(/* @__PURE__ */ new Set());
    }
  });
  var getThumbPostId = (thumb) => {
    if (thumb.id && thumb.id[0] === "p" && /^\d+$/.test(thumb.id.slice(1))) return thumb.id.slice(1);
    const a = thumb.querySelector('a[href*="page=post"][href*="id="]');
    if (a) {
      try {
        return new URL(a.href, location.href).searchParams.get("id");
      } catch {
        return null;
      }
    }
    return null;
  };
  var markFavoritedThumbs = /* @__PURE__ */ (() => {
    let favIdsPromise = null;
    const getFavIds = () => {
      if (!favIdsPromise) favIdsPromise = loadFavoriteIds();
      return favIdsPromise;
    };
    const fn = (ctx) => {
      const r = getRoute();
      if (!(r.page === "post" && r.section === "list")) return;
      getFavIds().then((favIds) => {
        if (!favIds || favIds.size === 0) return;
        const thumbs = ctx && ctx.matches && ctx.matches("span.thumb") ? [ctx] : Array.from((ctx && ctx.querySelectorAll ? ctx.querySelectorAll("span.thumb") : []) || []);
        thumbs.forEach((thumb) => {
          if (thumb.dataset && thumb.dataset.r34FavMarked === "1") return;
          const id = getThumbPostId(thumb);
          if (id && favIds.has(id)) {
            if (thumb.dataset) thumb.dataset.r34FavMarked = "1";
            thumb.style.boxShadow = "0 0 0 2.5px #ff0000";
            thumb.style.opacity = "0.3";
          }
        });
      });
    };
    return fn;
  })();
  var updateFavicon = () => {
    try {
      const ICON_POST = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAAAAGVQALYondf////+67aQPAAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC";
      const ICON_USER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAABVAHmNAMrNnf////9vNKohAAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC";
      const ICON_PROFILE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAAATExMgICBISEj///+FO3OXAAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC";
      const ICON_FAVORITES = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEABAMAAACuXLVVAAAAElBMVEX///8AAABOAACBEBD/UVH///9FPR7/AAAAAXRSTlMBN+Ho8AAAAShJREFUeNrt3c0RgyAQBlBbsIW0kBbSgv23kotcNsPwM0xck/fdkAUfNwdG3bYzzy9niwEAAAAAAAC4DBA7jkr2kN4btcYDAAAAAAAA5AHUCktGIb0LAAAAAAAAAMgD2BvpBcQ6AAAAAAAAgPsCRjcaav0AAAAAAAAA9wHMHljM9pcAAAAAAAAA5AOMblAckwEAAAAAAAD4HcDsQQcAAAAAAABAPkAsHD2wqC0EAAAAAAAA4D6A1oZDbYJlLzwCAAAAAAAApAH0pvcDCK1xAAAAAAAAAHkAvZBS92gkzlcbBwAAAAAAAJAHUC68zpSBsb26DgAAAAAAACAfoDXh6joAAAAAAACAfABPRAAAAAAAAP8HKIkPELX2qrqPPzwCAAAAAAAAXAV4A8N+Sq06PvkiAAAAAElFTkSuQmCC";
      const ICON_MAP = [
        { match: "post", icon: ICON_POST },
        { match: "user", icon: ICON_USER },
        { match: "profile-name", icon: ICON_PROFILE },
        { match: "profile-id", icon: ICON_PROFILE },
        { match: "favorites", icon: ICON_FAVORITES }
      ];
      const route = getRoute();
      const iconEntry = route.isPostView ? ICON_MAP.find((entry) => entry.match === "post") : route.isUserSearch ? ICON_MAP.find((entry) => entry.match === "user") : route.isOptionsPage ? void 0 : route.page === "account" && route.section === "profile" ? ICON_MAP.find((entry) => entry.match === (route.url.searchParams.has("uname") ? "profile-name" : "profile-id")) : route.isFavoritesView ? ICON_MAP.find((entry) => entry.match === "favorites") : void 0;
      const newIcon = iconEntry?.icon;
      if (newIcon) {
        let link = document.querySelector('link[rel="shortcut icon"]') || document.querySelector('link[rel="icon"]');
        if (!link) {
          link = document.createElement("link");
          link.setAttribute("rel", "shortcut icon");
          document.head.appendChild(link);
        }
        link.setAttribute("href", newIcon);
      }
    } catch {
    }
  };
  var updatePageIndicator = (() => {
    let indicator = null;
    let totalPages = null;
    let cssInjected = false;
    let currentPageOverride = null;
    let isPaused = false;
    const getCurrentPage = () => {
      if (currentPageOverride !== null) return currentPageOverride;
      const { url } = getRoute();
      const pid = parseInt(url.searchParams.get("pid"), 10);
      if (!isNaN(pid)) return Math.floor(pid / getPerPage()) + 1;
      const paginator = document.querySelector("#paginator");
      if (paginator) {
        const currentPageElem = paginator.querySelector("b");
        if (currentPageElem) return parseInt(currentPageElem.textContent, 10) || 1;
      }
      return 1;
    };
    const getTotalPagesFromPaginator = () => {
      const paginator = document.querySelector("#paginator");
      if (!paginator) return null;
      const perPage = getPerPage();
      const lastLink = paginator.querySelector('a[href*="pid"]:last-of-type');
      if (lastLink) {
        const url = new URL(lastLink.href, location.href);
        const maxPid = parseInt(url.searchParams.get("pid"), 10) || 0;
        return Math.floor(maxPid / perPage) + 1;
      }
      const pageLinks = paginator.querySelectorAll('a[href*="pid"]');
      if (pageLinks.length > 0) {
        const pages = /* @__PURE__ */ new Set();
        pageLinks.forEach((link) => {
          const url = new URL(link.href, location.href);
          const pid = parseInt(url.searchParams.get("pid"), 10);
          if (!isNaN(pid)) pages.add(Math.floor(pid / perPage) + 1);
        });
        return Math.max(...pages, 1);
      }
      return null;
    };
    const updateDisplay = () => {
      if (!indicator) return;
      try {
        const currentPage = getCurrentPage();
        if (totalPages === null) totalPages = getTotalPagesFromPaginator();
        let text = `Page ${currentPage}`;
        if (totalPages !== null && totalPages > 0) text += (isPaused ? " = " : " / ") + totalPages;
        indicator.textContent = text;
        indicator.style.display = "block";
      } catch (e) {
        console.debug("[PageIndicator] Fehler:", e);
      }
    };
    const fn = () => {
      try {
        const route = getRoute();
        if (route.isPostView) {
          if (indicator) indicator.style.display = "none";
          return;
        }
        if (!cssInjected) {
          GM_addStyle(PAGE_INDICATOR_CSS);
          cssInjected = true;
        }
        if (!indicator) {
          indicator = document.createElement("div");
          indicator.id = "page-indicator";
          indicator.title = "Infinite Scroll: Linksklick = Pause/Weiter";
          indicator.addEventListener("click", () => {
            window.dispatchEvent(new CustomEvent("r34th:inf-toggle"));
          });
          document.body.appendChild(indicator);
        }
        currentPageOverride = null;
        totalPages = null;
        updateDisplay();
      } catch (e) {
        console.debug("[PageIndicator] Fehler:", e);
      }
    };
    window.addEventListener("r34th:inf-state", (e) => {
      if (!indicator) return;
      const d = e.detail || {};
      const page = parseInt(d.page, 10);
      if (!isNaN(page) && page > 0) currentPageOverride = page;
      isPaused = !!d.paused;
      updateDisplay();
    });
    return fn;
  })();
  var setupFavoriteOnHover = () => {
    let hoveredElement = null;
    document.addEventListener("mouseenter", (e) => {
      hoveredElement = e.target;
    }, { passive: true, capture: true });
    document.addEventListener("mouseleave", (e) => {
      if (e.target === hoveredElement) hoveredElement = null;
    }, { capture: true });
    window.addEventListener("pointerdown", (e) => {
      if (e.button !== 3) return;
      const active = document.activeElement;
      if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA") return;
      const link = hoveredElement?.closest('a[href*="id="], a[id^="p"]');
      const postId = link ? new URL(link.href, location.href).searchParams.get("id") || link.id.slice(1) : getRoute().id;
      if (postId && typeof unsafeWindow.addFav === "function") {
        unsafeWindow.addFav(postId);
      }
    }, true);
  };
  var setupCollapsibleHeader = () => {
    const header = document.querySelector("#header");
    if (!header || getRoute().isFavoritesView) return;
    GM_addStyle(HEADER_CSS);
    let expandTimeout, collapseTimeout;
    let isFixed = safeStorageGet("r34_header_fixed") === "true";
    let fixButton = header.querySelector(".header-fix-btn");
    if (!fixButton) {
      fixButton = document.createElement("button");
      fixButton.className = "header-fix-btn";
      header.appendChild(fixButton);
    }
    const updateState = () => {
      header.style.height = isFixed ? "auto" : CONSTANTS.HEADER_COLLAPSED_HEIGHT;
      fixButton.textContent = isFixed ? "\u274C Unpin" : "\u{1F4CC} Pin";
    };
    const toggleFixed = () => {
      isFixed = !isFixed;
      safeStorageSet("r34_header_fixed", String(isFixed));
      updateState();
    };
    fixButton.addEventListener("click", toggleFixed);
    header.addEventListener("mouseenter", () => {
      if (!isFixed) {
        clearTimeout(collapseTimeout);
        expandTimeout = setTimeout(() => header.style.height = "auto", CONSTANTS.HEADER_EXPAND_DELAY_MS);
      }
    });
    header.addEventListener("mouseleave", () => {
      if (!isFixed) {
        clearTimeout(expandTimeout);
        collapseTimeout = setTimeout(() => header.style.height = CONSTANTS.HEADER_COLLAPSED_HEIGHT, CONSTANTS.HEADER_COLLAPSE_DELAY_MS);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key.toLowerCase() === "h" && !isTyping()) toggleFixed();
    });
    updateState();
  };
  var dedupeContexts = (contexts) => {
    const unique = [];
    for (const ctx of contexts) {
      if (!ctx || typeof ctx.querySelectorAll !== "function") continue;
      if (unique.some((existing) => existing === ctx || existing.contains?.(ctx))) continue;
      for (let i = unique.length - 1; i >= 0; i--) {
        if (ctx.contains?.(unique[i])) unique.splice(i, 1);
      }
      unique.push(ctx);
    }
    return unique;
  };

  // src/api.js
  var validateCredentials = async (apiKey, userId) => {
    try {
      const testUrl = buildApiUrl({
        page: "dapi",
        s: "post",
        q: "index",
        limit: 1,
        json: 1,
        api_key: apiKey,
        user_id: userId
      });
      const response = await gmRequest(testUrl);
      if (response.status !== 200) return false;
      const body = response.response;
      if (!body) return false;
      if (typeof body === "string") {
        try {
          JSON.parse(body);
        } catch {
          return false;
        }
      } else if (typeof body === "object") {
        if (body.error || body.message || body.success === false) return false;
      }
      return true;
    } catch {
      return false;
    }
  };
  async function handleOptionsPage() {
    if (!getRoute().isOptionsPage) return;
    const credTextarea = Array.from(document.querySelectorAll("textarea")).find((ta) => ta.value.includes("&api_key=") && ta.value.includes("&user_id="));
    if (credTextarea) {
      try {
        const params = new URLSearchParams(credTextarea.value.replace(/&amp;/g, "&"));
        const apiKey = params.get("api_key");
        const userId = params.get("user_id");
        if (apiKey && userId) {
          const isValid = await validateCredentials(apiKey, userId);
          if (isValid) {
            await GM.setValue(API_KEY_NAME, apiKey);
            await GM.setValue(USER_ID_NAME, userId);
            const banner = document.createElement("div");
            banner.textContent = "Rule34 Combined Scripts: API Key and User ID validated and saved!";
            Object.assign(banner.style, { backgroundColor: "#4CAF50", color: "white", padding: "15px", textAlign: "center", position: "fixed", top: "0", left: "0", width: "100%", zIndex: "10000", fontSize: "16px" });
            document.body.prepend(banner);
            setTimeout(() => banner.remove(), CONSTANTS.BANNER_DISPLAY_MS);
          } else {
            alert("Invalid API credentials. Please check and try again.");
          }
        }
      } catch (e) {
        console.error("[Userscript] Could not parse API credentials.", e);
      }
    }
  }
  function showApiKeyPrompt() {
    const lastReminder = safeStorageGet(REMINDER_KEY);
    if (lastReminder && Date.now() - parseInt(lastReminder, 10) < 24 * 60 * 60 * 1e3) return;
    GM_addStyle(API_MODAL_CSS);
    const overlay = document.createElement("div");
    overlay.id = "r34-modal-overlay";
    overlay.innerHTML = `
            <div id="r34-modal-content">
                <p>For the "Restore Deleted Post" feature, this script now needs an API key. Please generate one or enter it manually.</p>
                <div id="r34-modal-buttons">
                    <button id="r34-manual-btn">Enter Manually</button>
                    <button id="r34-generate-btn">Go to Options Page</button>
                    <button id="r34-later-btn">Remind Later</button>
                </div>
                <div id="r34-manual-input" style="display: none;">
                    <p style="font-size: 0.9em;">Copy the full text from the 'API Access Credentials' box and paste it here.</p>
                    <input type="text" id="r34-credential-input" placeholder="&api_key=...&user_id=...">
                    <button id="r34-save-manual-btn">Save & Reload</button>
                </div>
            </div>`;
    document.body.appendChild(overlay);
    document.getElementById("r34-generate-btn").addEventListener("click", () => window.location.href = "https://rule34.xxx/index.php?page=account&s=options");
    document.getElementById("r34-manual-btn").addEventListener("click", () => {
      document.getElementById("r34-modal-buttons").style.display = "none";
      document.getElementById("r34-manual-input").style.display = "block";
    });
    document.getElementById("r34-later-btn").addEventListener("click", () => {
      safeStorageSet(REMINDER_KEY, Date.now().toString());
      overlay.remove();
    });
    document.getElementById("r34-save-manual-btn").addEventListener("click", async () => {
      const credString = document.getElementById("r34-credential-input").value.trim();
      if (!credString) return;
      try {
        const params = new URLSearchParams(credString.startsWith("?") ? credString : "?" + credString);
        const apiKey = params.get("api_key");
        const userId = params.get("user_id");
        if (apiKey && userId) {
          const isValid = await validateCredentials(apiKey, userId);
          if (isValid) {
            await GM.setValue(API_KEY_NAME, apiKey);
            await GM.setValue(USER_ID_NAME, userId);
            alert("API Key and User ID validated and saved! The page will now reload.");
            location.reload();
          } else {
            alert("Invalid credentials. Please check and try again.");
          }
        } else alert("Invalid format. Please paste the full string.");
      } catch {
        alert("Could not parse the provided string.");
      }
    });
  }
  async function checkApiKey() {
    if (getRoute().isOptionsPage) return true;
    const apiKey = await GM.getValue(API_KEY_NAME);
    const userId = await GM.getValue(USER_ID_NAME);
    if (!apiKey || !userId) {
      console.log("Rule34 Combined Scripts: API key or User ID not found. Displaying prompt.");
      showApiKeyPrompt();
      return false;
    }
    return true;
  }
  async function restoreDeletedPost() {
    try {
      const notice = document.querySelector(".status-notice");
      if (!notice || !notice.innerText.includes("This post was deleted.")) return;
      const postId = getRoute().id;
      const existingContainer = document.getElementById("fit-to-screen");
      if (existingContainer && existingContainer.dataset.r34thRestored === postId) return;
      if (!postId) return;
      const apiKey = await GM.getValue(API_KEY_NAME, "");
      const userId = await GM.getValue(USER_ID_NAME, "");
      const apiUrl = buildApiUrl({
        page: "dapi",
        s: "post",
        q: "index",
        id: postId,
        json: 1,
        api_key: apiKey,
        user_id: userId
      });
      let attempts = 0;
      const maxAttempts = CONSTANTS.API_RETRY_ATTEMPTS;
      let response = null;
      while (attempts < maxAttempts) {
        let res;
        try {
          res = await gmRequest(apiUrl);
        } catch (error) {
          console.debug(`API attempt ${attempts + 1} failed (network/timeout):`, error);
          attempts++;
          if (attempts < maxAttempts) await sleep(1e3 * attempts);
          continue;
        }
        if (res.status === 200) {
          response = res;
          break;
        }
        if (res.status === 429) {
          const waitTime = Math.pow(2, attempts) * 1e3;
          await sleep(waitTime);
          attempts++;
          continue;
        }
        if (res.status >= 400 && res.status < 500) {
          throw new Error(`API responded with ${res.status} (post not found or forbidden)`);
        }
        attempts++;
        if (attempts < maxAttempts) await sleep(1e3 * attempts);
      }
      if (!response || response.status !== 200) throw new Error(`Failed after ${maxAttempts} attempts`);
      let data = response.response;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          throw new Error("Invalid JSON in API response");
        }
      }
      if (!data) throw new Error("Empty API response");
      const post = Array.isArray(data) ? data[0] : data;
      if (!post?.file_url) throw new Error(`Post not found: ${postId || "unknown"}`);
      const isVideo = ["webm", "mp4"].includes(post.file_url.split(".").pop().toLowerCase());
      const mediaElement = document.createElement(isVideo ? "video" : "img");
      mediaElement.src = post.file_url;
      Object.assign(mediaElement.style, { maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", display: "block" });
      if (isVideo) Object.assign(mediaElement, { controls: true, autoplay: true, loop: true, muted: true });
      const container = document.getElementById("fit-to-screen");
      if (container) {
        container.innerHTML = "";
        container.appendChild(mediaElement);
        container.dataset.r34thRestored = postId;
        notice.innerText += `
[Userscript] Restored deleted media.`;
      }
    } catch (err) {
      const notice = document.querySelector(".status-notice");
      if (notice) {
        const errorMsg = document.createElement("div");
        errorMsg.style.cssText = "color:#ff6b6b;margin-top:10px;";
        errorMsg.textContent = "\u26A0\uFE0F Media could not be restored.";
        notice.appendChild(errorMsg);
      }
      console.warn("[Userscript] Could not restore deleted post:", err);
    }
  }

  // src/panel.js
  var setupControlPanel = () => {
    GM_addStyle(PANEL_CSS);
    const storedPos = readJson("r34_button_pos", {});
    const savedPos = {
      top: Number.isFinite(Number(storedPos?.top)) ? Number(storedPos.top) : 10,
      left: Number.isFinite(Number(storedPos?.left)) ? Number(storedPos.left) : 162
    };
    let isVisible = safeStorageGet("r34_button_visible") !== "false";
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "R34 Panel\u2699\uFE0F";
    toggleBtn.className = "r34-panel-btn";
    const setPos = (el, left, top) => {
      el.style.setProperty("left", `${left}px`, "important");
      el.style.setProperty("top", `${top}px`, "important");
    };
    setPos(toggleBtn, savedPos.left, savedPos.top);
    const panel = document.createElement("div");
    panel.className = "r34-panel";
    const smartSkip = document.createElement("div");
    smartSkip.className = "r34-panel-section";
    smartSkip.style.borderBottom = "1px solid #444";
    smartSkip.style.marginBottom = "8px";
    smartSkip.style.paddingBottom = "8px";
    smartSkip.innerHTML = [
      "<strong>SmartSkip+</strong>",
      '<button id="toggleSkip" class="r34-btn" type="button">' + (TAG.getEnabled() ? "Disable \u{1F534}" : "Enable \u{1F7E2}") + "</button>",
      '<button id="editTags" class="r34-btn" type="button">Edit Rules</button>',
      '<button id="importCookie" class="r34-btn" type="button">Import Cookie</button>',
      '<div id="skipLockedHint" style="display:none;color:#fc6;font-size:11px;margin-top:4px;line-height:1.4">\u{1F512} Tag-Hider is disabled on this page (post view / your own favorites). Rules stay active on other pages.</div>'
    ].join("");
    panel.appendChild(smartSkip);
    const form = document.createElement("form");
    const groupedFeatures = {
      "Core": ["favoriteOnMouse", "removeDuplicates", "removeAnnoyances", "fixPaginatorLinks", "removePidParameter", "restoreDeletedPost", "infiniteScroll"],
      "Performance": ["nativeLazyLoading"],
      "Visual": ["collapsibleHeader", "hideBlacklisted", "hideEmptyThumbSpans", "faviconChanger", "pageIndicator", "removeThumbTitles", "cleanupFavoritesArtifacts", "favoriteMarker", "thumbOverlay"]
    };
    const descriptions = {
      favoriteOnMouse: "Favorisieren mit Seitentaste (X1)",
      removeDuplicates: "Entfernt doppelte Thumbnails auf der Seite",
      removeAnnoyances: "Entfernt Werbung und st\xF6rende Elemente",
      fixPaginatorLinks: "Repariert defekte Paginierungs-Links",
      removePidParameter: "Entfernt unn\xF6tige PID-Parameter aus URLs",
      restoreDeletedPost: "Stellt gel\xF6schte Posts \xFCber die API wieder her",
      nativeLazyLoading: "Aktiviert natives Lazy Loading f\xFCr Bilder",
      collapsibleHeader: "Header klappt automatisch ein/aus",
      hideBlacklisted: "Versteckt geblacklistete Inhalte",
      hideEmptyThumbSpans: "Entfernt leere Thumbnail-Container",
      faviconChanger: "\xC4ndert das Favicon je nach Seite",
      pageIndicator: "Zeigt aktuelle Seitennummer an",
      removeThumbTitles: "Entfernt Tooltips von Thumbnails",
      cleanupFavoritesArtifacts: "R\xE4umt L\xFCcken/Reste auf Favoriten-Seiten auf",
      favoriteMarker: "Markiert favorisierte Posts auf Suchergebnis-Seiten",
      thumbOverlay: "Zeigt Tags beim Hovern \xFCber Thumbnails",
      infiniteScroll: "L\xE4dt Suchergebnis-Seiten automatisch nach (ersetzt Pagetual)"
    };
    Object.entries(groupedFeatures).forEach(([group, keys]) => {
      let sectionHtml = `<strong>${group}</strong>`;
      keys.forEach((key) => {
        sectionHtml += `<label><input type="checkbox" name="${key}" ${CONFIG[key] ? "checked" : ""}> ${key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}`;
        if (descriptions[key]) sectionHtml += `<span class="tooltip-info" title="${descriptions[key]}"> \u2139\uFE0F</span>`;
        sectionHtml += `</label>`;
      });
      form.insertAdjacentHTML("beforeend", sectionHtml);
    });
    form.insertAdjacentHTML("beforeend", `<div><button type="submit" class="save-btn">\u{1F4BE} Save & Reload</button><button type="button" class="cancel-btn">\u274C Cancel</button></div>`);
    panel.appendChild(form);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const newConfig = {};
      Object.keys(DEFAULT_CONFIG).forEach((key) => newConfig[key] = formData.has(key));
      safeStorageSet("r34_feature_flags", JSON.stringify(newConfig));
      location.reload();
    });
    form.querySelector(".cancel-btn").addEventListener("click", () => panel.style.display = "none");
    const skipToggleBtn = smartSkip.querySelector("#toggleSkip");
    const skipEditBtn = smartSkip.querySelector("#editTags");
    const skipImportBtn = smartSkip.querySelector("#importCookie");
    skipToggleBtn.addEventListener("click", () => {
      const nowEnabled = TAG.toggle();
      skipToggleBtn.textContent = nowEnabled ? "Disable \u{1F534}" : "Enable \u{1F7E2}";
    });
    skipEditBtn.addEventListener("click", TAG.openRules);
    skipImportBtn.addEventListener("click", TAG.openCookie);
    const hidePanelCompletely = () => {
      toggleBtn.remove();
      panel.remove();
      safeStorageSet("r34_button_visible", "false");
      isVisible = false;
    };
    toggleBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      hidePanelCompletely();
    });
    panel.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      hidePanelCompletely();
    });
    let suppressNextPanelClick = false;
    toggleBtn.addEventListener("click", () => {
      if (suppressNextPanelClick) {
        suppressNextPanelClick = false;
        return;
      }
      const rect = toggleBtn.getBoundingClientRect();
      setPos(panel, rect.left, rect.bottom + window.scrollY + 5);
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
    toggleBtn.addEventListener("mousedown", (e) => {
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
      const onMouseMove = (moveEvent) => {
        if (!hasMoved && Math.hypot(moveEvent.pageX - startX, moveEvent.pageY - startY) < dragThreshold) return;
        hasMoved = true;
        suppressNextPanelClick = true;
        moveAt(moveEvent.pageX, moveEvent.pageY);
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        if (!hasMoved) {
          suppressNextPanelClick = false;
          return;
        }
        safeStorageSet("r34_button_pos", JSON.stringify({
          top: parseInt(toggleBtn.style.top, 10) || 0,
          left: parseInt(toggleBtn.style.left, 10) || 0
        }));
        setTimeout(() => {
          suppressNextPanelClick = false;
        }, 250);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
    toggleBtn.ondragstart = () => false;
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key.toLowerCase() === "p" && !isTyping()) {
        e.preventDefault();
        const isNowVisible = document.body.contains(toggleBtn);
        if (isNowVisible) {
          toggleBtn.remove();
          panel.remove();
          safeStorageSet("r34_button_visible", "false");
        } else {
          document.body.appendChild(toggleBtn);
          document.body.appendChild(panel);
          safeStorageSet("r34_button_visible", "true");
        }
      }
    });
    if (isVisible) {
      document.body.appendChild(toggleBtn);
      document.body.appendChild(panel);
    }
    TAG.updatePanelState();
  };

  // src/overlay-parser.js
  var CATEGORY_COLORS = {
    artist: "#ffa500",
    copyright: "#b06fdb",
    character: "#6fdb6f",
    metadata: "#ffd700",
    deprecated: "#ff6b6b",
    lore: "#6cf",
    general: "#ddd"
  };
  var CATEGORY_ORDER = ["artist", "copyright", "character", "metadata", "deprecated", "lore", "general"];
  var categoryFromEl = (el) => {
    if (!el) return null;
    let cls = "";
    try {
      cls = (typeof el.className === "string" ? el.className : el.getAttribute ? el.getAttribute("class") : "") || "";
    } catch {
    }
    const m = cls.match(/tag-type-([a-z]+)/);
    return m && CATEGORY_COLORS[m[1]] ? m[1] : null;
  };
  function extractSidebarTags(doc) {
    if (!doc || typeof doc.querySelectorAll !== "function") return [];
    const lis = doc.querySelectorAll('#tag-sidebar li.tag, #tag-sidebar li[class*="tag-type"]');
    const tags = [];
    Array.from(lis).forEach((li) => {
      const anchors = li.querySelectorAll("a");
      let a = null;
      for (const cand of Array.from(anchors)) {
        const href = (cand.getAttribute("href") || "").toLowerCase();
        if (href.includes("page=post")) {
          a = cand;
          break;
        }
      }
      if (!a) a = anchors[0] || null;
      const raw = (a ? a.textContent : li.textContent) || "";
      const name = raw.replace(/\s+/g, " ").trim().replace(/ /g, "_");
      if (!name || name === "?") return;
      const category = categoryFromEl(li) || categoryFromEl(a) || "general";
      tags.push({ name, category });
    });
    return tags;
  }
  function pickProfileLink(a) {
    if (!a) return null;
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (!href.includes("page=account") || !href.includes("s=profile")) return null;
    const name = String(a.textContent || "").replace(/\s+/g, " ").trim();
    if (!name) return null;
    return { name, url: a.getAttribute("href") };
  }
  function extractUploader(doc) {
    if (!doc || typeof doc.querySelectorAll !== "function") return null;
    const stats = doc.querySelector("#stats");
    if (stats) {
      for (const a of Array.from(stats.querySelectorAll('a[href*="page=account"]'))) {
        const hit = pickProfileLink(a);
        if (hit) return hit;
      }
    }
    for (const a of Array.from(doc.querySelectorAll('a[href*="page=account"]'))) {
      if (a.closest && a.closest("#tag-sidebar")) continue;
      const hit = pickProfileLink(a);
      if (hit) return hit;
    }
    return null;
  }

  // src/overlay.js
  var CACHE_LIMIT = 200;
  var SHOW_DELAY_MS = 250;
  var HIDE_DELAY_MS = 150;
  var setupThumbOverlay = () => {
    GM_addStyle(OVERLAY_CSS);
    const postCache = /* @__PURE__ */ new Map();
    const inFlight = /* @__PURE__ */ new Map();
    let overlay = null;
    let showTimer = null;
    let hideTimer = null;
    let activePostId = null;
    let currentThumb = null;
    const getOverlay = () => {
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "r34-thumb-overlay";
        document.body.appendChild(overlay);
      }
      return overlay;
    };
    const hideOverlay = () => {
      activePostId = null;
      if (overlay) overlay.style.display = "none";
    };
    const getThumbId = (thumb) => {
      if (thumb.id && thumb.id[0] === "p" && /^\d+$/.test(thumb.id.slice(1))) return thumb.id.slice(1);
      const a = thumb.querySelector('a[href*="page=post"][href*="id="]');
      if (a) {
        try {
          return new URL(a.href, location.href).searchParams.get("id");
        } catch {
          return null;
        }
      }
      return null;
    };
    const resolveProfileUrl = (href) => {
      try {
        return new URL(href, location.origin).href;
      } catch {
        return href;
      }
    };
    const makeHeader = (postId, uploader) => {
      const header = document.createElement("div");
      header.className = "r34-ov-header";
      const idSpan = document.createElement("span");
      idSpan.className = "r34-ov-id";
      idSpan.textContent = "#" + postId;
      header.appendChild(idSpan);
      if (uploader && uploader.name) {
        const by = document.createElement("a");
        by.className = "r34-ov-user";
        by.textContent = "by " + uploader.name;
        by.href = resolveProfileUrl(uploader.url);
        by.target = "_blank";
        by.rel = "noopener";
        header.appendChild(by);
      }
      return header;
    };
    const fetchPostTags = async (postId) => {
      const url = "https://rule34.xxx/index.php?page=post&s=view&id=" + postId;
      const res = await gmRequest(url, { responseType: "text" });
      if (res.status !== 200) throw new Error("HTTP " + res.status);
      const html = res.response;
      if (typeof html !== "string" || !html.length) throw new Error("Leere Antwort");
      const doc = new DOMParser().parseFromString(html, "text/html");
      return {
        tags: extractSidebarTags(doc),
        uploader: extractUploader(doc)
      };
    };
    const getTagsFromThumb = (thumb) => {
      const img = thumb && thumb.querySelector ? thumb.querySelector("img, video") : null;
      const raw = img && (img.alt || img.title) || "";
      if (!raw) return [];
      return String(raw).split(/\s+/).map((t) => t.trim()).filter(Boolean).map((name) => ({ name, category: "general" }));
    };
    const renderLoading = (el, postId) => {
      el.innerHTML = "";
      el.appendChild(makeHeader(postId, null));
      const hint = document.createElement("div");
      hint.className = "r34-ov-hint";
      hint.textContent = "Loading tags\u2026";
      el.appendChild(hint);
    };
    const renderError = (el, postId) => {
      el.innerHTML = "";
      el.appendChild(makeHeader(postId, null));
      const hint = document.createElement("div");
      hint.className = "r34-ov-hint";
      hint.textContent = "\u26A0\uFE0F Tags could not be loaded";
      el.appendChild(hint);
    };
    const renderTags = (el, postId, tags, uploader) => {
      el.innerHTML = "";
      el.appendChild(makeHeader(postId, uploader));
      const groups = /* @__PURE__ */ new Map();
      tags.forEach((t) => {
        if (!groups.has(t.category)) groups.set(t.category, []);
        groups.get(t.category).push(t.name);
      });
      CATEGORY_ORDER.forEach((cat) => {
        const names = groups.get(cat);
        if (!names || !names.length) return;
        const row = document.createElement("div");
        row.className = "r34-ov-group";
        const label = document.createElement("span");
        label.className = "r34-ov-label";
        label.style.color = CATEGORY_COLORS[cat];
        label.textContent = cat;
        row.appendChild(label);
        const shown = cat === "general" ? names.slice(0, 12) : names;
        shown.forEach((name) => {
          const tag = document.createElement("span");
          tag.className = "r34-ov-tag";
          tag.dataset.tag = name;
          tag.dataset.category = cat;
          tag.style.borderColor = CATEGORY_COLORS[cat];
          tag.style.color = CATEGORY_COLORS[cat];
          tag.textContent = name.replace(/_/g, " ");
          row.appendChild(tag);
        });
        if (cat === "general" && names.length > 12) {
          const more = document.createElement("span");
          more.className = "r34-ov-more";
          more.textContent = "+" + (names.length - 12) + " general";
          row.appendChild(more);
        }
        el.appendChild(row);
      });
      const hint = document.createElement("div");
      hint.className = "r34-ov-hint";
      hint.textContent = "L-click: add \xB7 R-click: exclude \xB7 M-click: search";
      el.appendChild(hint);
    };
    const positionOverlay = (el, thumb) => {
      if (!thumb || typeof thumb.getBoundingClientRect !== "function") return;
      const rect = thumb.getBoundingClientRect();
      const width = 380;
      let left = rect.right + 12;
      if (left + width > window.innerWidth) left = Math.max(8, rect.left - width - 12);
      let top = rect.top;
      if (top + el.offsetHeight > window.innerHeight) top = Math.max(8, window.innerHeight - el.offsetHeight - 8);
      el.style.left = left + "px";
      el.style.top = top + "px";
    };
    const showOverlay = (thumb) => {
      const postId = getThumbId(thumb);
      if (!postId) return;
      currentThumb = thumb;
      activePostId = postId;
      const el = getOverlay();
      el.style.display = "block";
      const cached = postCache.get(postId);
      if (cached && cached.tags && cached.tags.length) {
        renderTags(el, postId, cached.tags, cached.uploader);
        positionOverlay(el, thumb);
        return;
      }
      const running = inFlight.get(postId);
      if (!running) {
        const instant = getTagsFromThumb(thumb);
        if (instant.length) {
          renderTags(el, postId, instant, null);
        } else {
          renderLoading(el, postId);
        }
      }
      positionOverlay(el, thumb);
      let promise = running;
      if (!promise) {
        promise = fetchPostTags(postId).then((result) => {
          inFlight.delete(postId);
          if (result && result.tags && result.tags.length) {
            if (postCache.size >= CACHE_LIMIT) postCache.delete(postCache.keys().next().value);
            postCache.set(postId, result);
          }
          return result;
        }).catch((err) => {
          inFlight.delete(postId);
          console.debug("[Overlay] Tags-Fetch fehlgeschlagen:", err);
          return null;
        });
        inFlight.set(postId, promise);
      }
      promise.then((result) => {
        if (activePostId !== postId) return;
        if (result && result.tags && result.tags.length) {
          renderTags(el, postId, result.tags, result.uploader);
        } else if (!getTagsFromThumb(currentThumb).length) {
          renderError(el, postId);
        }
        positionOverlay(el, currentThumb);
      });
    };
    document.addEventListener("mouseover", (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== "function") return;
      if (overlay && overlay.contains(target)) {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        return;
      }
      const thumb = target.closest("span.thumb");
      clearTimeout(hideTimer);
      if (!thumb) {
        clearTimeout(showTimer);
        hideTimer = setTimeout(hideOverlay, HIDE_DELAY_MS);
        return;
      }
      if (currentThumb && currentThumb !== thumb) activePostId = null;
      clearTimeout(showTimer);
      showTimer = setTimeout(() => showOverlay(thumb), SHOW_DELAY_MS);
    });
    const appendTagToInput = (tagName, prefix = "") => {
      const input = document.querySelector('input[name="tags"]');
      if (!input) return null;
      const term = prefix + tagName;
      const current = String(input.value || "").trim();
      input.value = current ? current + " " + term : term;
      input.focus();
      return input;
    };
    document.addEventListener("click", (e) => {
      if (!overlay || overlay.style.display === "none") return;
      const tagEl = e.target && typeof e.target.closest === "function" ? e.target.closest(".r34-ov-tag") : null;
      if (!tagEl || !tagEl.dataset.tag) return;
      e.preventDefault();
      e.stopPropagation();
      appendTagToInput(tagEl.dataset.tag);
    }, true);
    document.addEventListener("auxclick", (e) => {
      if (e.button !== 1) return;
      if (!overlay || overlay.style.display === "none") return;
      const tagEl = e.target && typeof e.target.closest === "function" ? e.target.closest(".r34-ov-tag") : null;
      if (!tagEl || !tagEl.dataset.tag) return;
      e.preventDefault();
      e.stopPropagation();
      const input = appendTagToInput(tagEl.dataset.tag);
      if (input) {
        const form = input.closest("form");
        if (form) form.submit();
      }
    }, true);
    document.addEventListener("contextmenu", (e) => {
      if (!overlay || overlay.style.display === "none") return;
      const tagEl = e.target && typeof e.target.closest === "function" ? e.target.closest(".r34-ov-tag") : null;
      if (!tagEl || !tagEl.dataset.tag) return;
      e.preventDefault();
      e.stopPropagation();
      appendTagToInput(tagEl.dataset.tag, "-");
    }, true);
    document.addEventListener("mousedown", (e) => {
      if (e.button !== 1) return;
      if (!overlay || overlay.style.display === "none") return;
      const tagEl = e.target && typeof e.target.closest === "function" ? e.target.closest(".r34-ov-tag") : null;
      if (tagEl) e.preventDefault();
    }, true);
    window.addEventListener("scroll", hideOverlay, { passive: true });
    window.addEventListener("popstate", hideOverlay);
    window.addEventListener("pushstate", hideOverlay);
    window.addEventListener("replacestate", hideOverlay);
  };

  // src/infinite-scroll.js
  var THROTTLE_MS = 200;
  var FETCH_DELAY_MS = 250;
  var BOTTOM_THRESHOLD = 600;
  var PRELOAD_THRESHOLD = 2200;
  var RATE_INTERVAL_MS = 500;
  var MAX_RETRIES = 3;
  var RETRY_BASE_MS = 1e3;
  var ROUTE_RECHECK_DEBOUNCE_MS = 150;
  var backoffDelay = (attempt) => RETRY_BASE_MS * Math.pow(2, attempt);
  var getPostContainer = (thumb) => {
    const parent = thumb.parentElement;
    return parent && parent.tagName === "SPAN" && !parent.classList.contains("image-list") ? parent : thumb;
  };
  var isPostScript = (node) => !!node && node.tagName === "SCRIPT" && (node.textContent || "").indexOf("posts[") !== -1;
  var parseThumbs = (html) => {
    const dom = new DOMParser().parseFromString(html, "text/html");
    const imageList = dom.querySelector("div.image-list");
    const thumbs = Array.from((imageList || dom).querySelectorAll("span.thumb"));
    const nodes = [];
    const seenContainers = /* @__PURE__ */ new Set();
    thumbs.forEach((thumb) => {
      const container = getPostContainer(thumb);
      if (seenContainers.has(container)) return;
      seenContainers.add(container);
      nodes.push(container);
      const next = container.nextElementSibling;
      if (isPostScript(next)) nodes.push(next);
    });
    return {
      thumbs,
      nodes,
      isList: !!dom.querySelector("div.image-list, #paginator, span.thumb")
    };
  };
  var classifyLoadResult = ({ thumbs, isList, existingIds, newIds }) => {
    if (!isList) return "retry";
    if (thumbs.length === 0) return "end";
    if (newIds.length > 0 && newIds.every((id) => existingIds.has(id))) return "end";
    return "append";
  };
  var RateLimiter = class {
    constructor({ minIntervalMs = RATE_INTERVAL_MS } = {}) {
      this.minIntervalMs = minIntervalMs;
      this._queue = [];
      this._active = 0;
      this._lastRun = 0;
    }
    run(task) {
      return new Promise((resolve, reject) => {
        this._queue.push({ task, resolve, reject });
        this._pump();
      });
    }
    async _pump() {
      while (this._active === 0 && this._queue.length) {
        const { task, resolve, reject } = this._queue.shift();
        const wait = Math.max(0, this._lastRun + this.minIntervalMs - Date.now());
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        this._lastRun = Date.now();
        this._active = 1;
        task().then(resolve, reject).finally(() => {
          this._active = 0;
          this._pump();
        });
      }
    }
  };
  var setupInfiniteScroll = () => {
    GM_addStyle(INFINITE_SCROLL_CSS);
    const limiter = new RateLimiter();
    const state = {
      baseUrl: null,
      currentPage: 0,
      hasMore: true,
      isLoading: false,
      preloading: false,
      prefetched: null,
      // { page, thumbs, nodes } – vorgeladene nächste Seite
      fetchTimer: null,
      scrollCheckAt: 0,
      pagetualHinted: false,
      paused: false,
      // via Klick auf den Seiten-Indikator pausiert
      retryCount: 0,
      // verbrauchte Retry-Versuche (Backoff-Zähler)
      retryTimer: null
      // laufender Retry-Timer (Challenge-/Fehlerseiten)
    };
    const isScrollable = () => {
      const r = getRoute();
      return r.page === "post" && r.section === "list" || r.isFavoritesView;
    };
    const getThumbId = (thumb) => {
      if (thumb.id && thumb.id[0] === "p" && /^\d+$/.test(thumb.id.slice(1))) return thumb.id.slice(1);
      const a = thumb.querySelector('a[href*="page=post"][href*="id="]');
      if (a) {
        try {
          return new URL(a.href, location.href).searchParams.get("id");
        } catch {
          return null;
        }
      }
      return null;
    };
    const getRouteInfo = () => {
      const route = getRoute();
      const pid = route.url.searchParams.get("pid");
      const page = pid === null || pid === "" ? 0 : Math.max(0, Math.floor(parseInt(pid, 10) / getPerPage()));
      return {
        scrollable: isScrollable(),
        baseUrl: location.href.replace(/[?&]pid=\d+/, ""),
        page
      };
    };
    const getStatusEl = () => {
      let el = document.getElementById("r34-inf-scroll-status");
      if (!el) {
        el = document.createElement("div");
        el.id = "r34-inf-scroll-status";
        document.body.appendChild(el);
      }
      return el;
    };
    const setStatus = (text, cls) => {
      const el = getStatusEl();
      el.textContent = text || "";
      el.className = cls || "";
    };
    const clearStatus = () => {
      const el = document.getElementById("r34-inf-scroll-status");
      if (el) el.remove();
    };
    const broadcast = () => {
      window.dispatchEvent(new CustomEvent("r34th:inf-state", {
        detail: { page: state.currentPage + 1, paused: state.paused }
      }));
    };
    const resetForRoute = (info2) => {
      state.baseUrl = info2.baseUrl;
      state.currentPage = info2.page;
      state.hasMore = true;
      state.isLoading = false;
      state.preloading = false;
      state.prefetched = null;
      state.paused = false;
      state.retryCount = 0;
      if (state.fetchTimer) {
        clearTimeout(state.fetchTimer);
        state.fetchTimer = null;
      }
      if (state.retryTimer) {
        clearTimeout(state.retryTimer);
        state.retryTimer = null;
      }
      clearStatus();
      broadcast();
    };
    const fetchPage = async (url) => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    };
    const canRunPostScripts = () => {
      try {
        const pageWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        return !!pageWindow && typeof pageWindow.posts !== "undefined";
      } catch {
        return false;
      }
    };
    const appendPostNodes = (imageList, nodes) => {
      const runScripts = canRunPostScripts();
      nodes.forEach((node) => {
        if (node.dataset) node.dataset.r34thInfAppended = "1";
        if (node.tagName !== "SCRIPT" || !runScripts) {
          imageList.appendChild(node);
          return;
        }
        const script = document.createElement("script");
        if (node.type) script.type = node.type;
        script.textContent = node.textContent;
        script.dataset.r34thInfAppended = "1";
        imageList.appendChild(script);
      });
    };
    const parseFavoritesScripts = (html) => {
      if (!getRoute().isFavoritesView) return;
      const cache = window.__r34thFavCache || (window.__r34thFavCache = {});
      const re = /posts\[(\d+)\]\s*=\s*\{[^}]*['"]?tags['"]?\s*:\s*["']([^"']+)["']/g;
      const dom = new DOMParser().parseFromString(html, "text/html");
      Array.from(dom.querySelectorAll("script")).forEach((script) => {
        const text = script.textContent || "";
        if (text.indexOf("posts[") === -1) return;
        let m;
        while ((m = re.exec(text)) !== null) {
          cache[m[1]] = String(m[2]).split(/\s+/).map(normalizeTag).filter(Boolean);
        }
      });
    };
    const pageUrl = (page) => {
      const pid = page * getPerPage();
      return state.baseUrl + (state.baseUrl.includes("?") ? "&" : "?") + "pid=" + pid;
    };
    const preloadNext = async () => {
      if (state.isLoading || state.preloading || !state.hasMore || state.paused || state.retryTimer) return;
      const info2 = getRouteInfo();
      if (!info2.scrollable) return;
      if (info2.baseUrl !== state.baseUrl) resetForRoute(info2);
      const page = state.currentPage + 1;
      if (state.prefetched && state.prefetched.page === page) return;
      state.preloading = true;
      try {
        const html = await limiter.run(() => fetchPage(pageUrl(page)));
        parseFavoritesScripts(html);
        const parsed = parseThumbs(html);
        state.prefetched = { page, thumbs: parsed.thumbs, nodes: parsed.nodes, isList: parsed.isList };
      } catch (e) {
        console.debug("[InfiniteScroll] Preload fehlgeschlagen:", e);
      } finally {
        state.preloading = false;
      }
    };
    const loadMore = async () => {
      if (state.isLoading || !state.hasMore || state.paused) return;
      const info2 = getRouteInfo();
      if (!info2.scrollable) return;
      if (info2.baseUrl !== state.baseUrl) resetForRoute(info2);
      state.isLoading = true;
      setStatus("Loading\u2026", "r34-inf-loading");
      try {
        const page = state.currentPage + 1;
        let thumbs;
        let nodes;
        let isList;
        if (state.prefetched && state.prefetched.page === page) {
          thumbs = state.prefetched.thumbs;
          nodes = state.prefetched.nodes;
          isList = state.prefetched.isList;
          state.prefetched = null;
        } else {
          const html = await limiter.run(() => fetchPage(pageUrl(page)));
          parseFavoritesScripts(html);
          const parsed = parseThumbs(html);
          thumbs = parsed.thumbs;
          nodes = parsed.nodes;
          isList = parsed.isList;
        }
        const existingIds = /* @__PURE__ */ new Set();
        document.querySelectorAll("span.thumb").forEach((t) => {
          const id = getThumbId(t);
          if (id) existingIds.add(id);
        });
        const newIds = thumbs.map(getThumbId).filter(Boolean);
        const result = classifyLoadResult({ thumbs, isList, existingIds, newIds });
        if (result === "retry") throw new Error("Keine Listen-Seite (Challenge/Fehler) \u2013 Retry");
        if (result === "end") {
          state.hasMore = false;
          state.prefetched = null;
          state.retryCount = 0;
          setStatus("\u2014 End of results \u2014");
          return;
        }
        const imageList = document.querySelector("#content > div.image-list") || document.querySelector("div.image-list");
        if (!imageList) {
          state.hasMore = false;
          return;
        }
        appendPostNodes(imageList, nodes);
        state.currentPage = page;
        state.retryCount = 0;
        broadcast();
        clearStatus();
        preloadNext();
      } catch (e) {
        console.debug("[InfiniteScroll] Fehler beim Laden:", e);
        if (state.retryCount < MAX_RETRIES) {
          const delay = backoffDelay(state.retryCount);
          state.retryCount++;
          setStatus(`\u26A0\uFE0F Challenge \u2013 Retry in ${delay / 1e3}s\u2026`, "r34-inf-error");
          state.retryTimer = setTimeout(() => {
            state.retryTimer = null;
            loadMore();
          }, delay);
        } else {
          state.retryCount = 0;
          setStatus("\u26A0\uFE0F Load failed \u2013 scroll to retry", "r34-inf-error");
        }
      } finally {
        state.isLoading = false;
      }
    };
    const onScroll = () => {
      const now = Date.now();
      if (now - state.scrollCheckAt < THROTTLE_MS) return;
      state.scrollCheckAt = now;
      const info2 = getRouteInfo();
      if (!info2.scrollable) return;
      if (info2.baseUrl !== state.baseUrl) resetForRoute(info2);
      if (!state.hasMore || state.isLoading || state.paused || state.retryTimer) return;
      const docEl = document.documentElement;
      const remaining = docEl.scrollHeight - (window.innerHeight + window.scrollY);
      if (remaining <= BOTTOM_THRESHOLD) {
        if (state.fetchTimer) clearTimeout(state.fetchTimer);
        state.fetchTimer = setTimeout(loadMore, FETCH_DELAY_MS);
      } else if (remaining <= PRELOAD_THRESHOLD) {
        preloadNext();
      }
    };
    const CONTENT_SELECTOR = "#content, div.image-list, span.thumb";
    let routeCheckObserver = null;
    let routeRecheckTimer = null;
    let routeRecheckMaxTimer = null;
    const stopRouteCheck = () => {
      if (routeCheckObserver) {
        try {
          routeCheckObserver.disconnect();
        } catch {
        }
        routeCheckObserver = null;
      }
      if (routeRecheckTimer) {
        clearTimeout(routeRecheckTimer);
        routeRecheckTimer = null;
      }
      if (routeRecheckMaxTimer) {
        clearTimeout(routeRecheckMaxTimer);
        routeRecheckMaxTimer = null;
      }
    };
    const measureNow = () => {
      state.scrollCheckAt = 0;
      onScroll();
    };
    const isOwnAppend = (node) => !!(node && node.dataset && node.dataset.r34thInfAppended === "1");
    const contentChangedBy = (mutations) => (mutations || []).some((m) => {
      if (m.type !== "childList") return false;
      const added = Array.from(m.addedNodes || []).filter((n) => n.nodeType === 1 && !isOwnAppend(n));
      if (!added.length) return false;
      const target = m.target?.nodeType === 1 ? m.target : m.target?.parentElement;
      if (target?.closest?.(CONTENT_SELECTOR)) return true;
      return added.some((n) => n.matches?.(CONTENT_SELECTOR) || n.querySelector?.(CONTENT_SELECTOR));
    });
    const watchContentSwap = () => {
      stopRouteCheck();
      const expectedHref = location.href;
      routeCheckObserver = new MutationObserver((mutations) => {
        if (location.href !== expectedHref) {
          stopRouteCheck();
          return;
        }
        if (!contentChangedBy(mutations)) return;
        if (routeRecheckTimer) clearTimeout(routeRecheckTimer);
        routeRecheckTimer = setTimeout(() => {
          stopRouteCheck();
          measureNow();
        }, ROUTE_RECHECK_DEBOUNCE_MS);
      });
      routeCheckObserver.observe(document.body, { childList: true, subtree: true });
      routeRecheckMaxTimer = setTimeout(() => {
        stopRouteCheck();
        measureNow();
      }, CONSTANTS.ROUTE_TRANSITION_MAX_WAIT_MS);
    };
    const detectPagetual = () => {
      try {
        if (window.pagetual || typeof unsafeWindow !== "undefined" && (unsafeWindow.pagetual || unsafeWindow.pagetualRule || unsafeWindow.pagetualRules)) {
          return true;
        }
        const el = document.querySelector("#pagetual-sideController, #pagetual_pageBar, #pagetual-preload, #pagetual-nextSwitch, #pagetual-picker, .pagetual_pageNum");
        return !!el && (!!el.id || el.className && String(el.className).includes("pagetual"));
      } catch {
        return false;
      }
    };
    const showPagetualHint = () => {
      if (state.pagetualHinted) return;
      state.pagetualHinted = true;
      const toast = document.createElement("div");
      toast.id = "r34-inf-pagetual-hint";
      toast.textContent = "\u26A0\uFE0F Built-in Infinite Scroll is active \u2013 please disable the Pagetual extension to avoid double-loading.";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 8e3);
    };
    const onRouteChange = () => {
      const info2 = getRouteInfo();
      if (info2.scrollable) {
        resetForRoute(info2);
        state.scrollCheckAt = 0;
        onScroll();
        watchContentSwap();
      } else {
        stopRouteCheck();
        clearStatus();
      }
    };
    const info = getRouteInfo();
    if (info.scrollable) {
      resetForRoute(info);
      if (detectPagetual()) showPagetualHint();
      onScroll();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("popstate", onRouteChange);
    window.addEventListener("pushstate", onRouteChange);
    window.addEventListener("replacestate", onRouteChange);
    window.addEventListener("r34th:inf-toggle", () => {
      state.paused = !state.paused;
      if (state.paused && state.fetchTimer) {
        clearTimeout(state.fetchTimer);
        state.fetchTimer = null;
      }
      if (state.paused && state.retryTimer) {
        clearTimeout(state.retryTimer);
        state.retryTimer = null;
      }
      if (state.paused) state.retryCount = 0;
      broadcast();
      if (!state.paused) onScroll();
    });
  };

  // src/init.js
  var cleanup = () => {
    observers.forEach((obs) => {
      try {
        obs.disconnect();
      } catch (e) {
        console.debug("Observer disconnect failed:", e);
      }
    });
    observers.length = 0;
  };
  var init = async () => {
    TAG.initObservers();
    TAG.processAll();
    await handleOptionsPage();
    let canRestore = false;
    if (CONFIG.restoreDeletedPost) canRestore = await checkApiKey();
    if (CONFIG.favoriteOnMouse) setupFavoriteOnHover();
    if (CONFIG.collapsibleHeader) setupCollapsibleHeader();
    setupControlPanel();
    setupSidebarIntegration();
    if (CONFIG.thumbOverlay) setupThumbOverlay();
    if (CONFIG.infiniteScroll) setupInfiniteScroll();
    if (CONFIG.restoreDeletedPost && canRestore && getRoute().isPostView) setTimeout(restoreDeletedPost, 500);
    const runAll = (contexts = [document]) => {
      const unique = dedupeContexts(contexts);
      TAG.processAll();
      unique.forEach((ctx) => {
        if (CONFIG.hideBlacklisted) hideBlacklisted(ctx);
        if (CONFIG.removeDuplicates) removeDuplicateThumbnails(ctx);
        if (CONFIG.removeAnnoyances) removeAnnoyances(ctx);
        if (CONFIG.fixPaginatorLinks) fixPaginatorLinks(ctx);
        if (CONFIG.removePidParameter) removePidParameter(ctx);
        if (CONFIG.nativeLazyLoading) setNativeLazyLoading(ctx);
        if (CONFIG.removeThumbTitles) removeThumbTitle(ctx);
        if (CONFIG.favoriteMarker) markFavoritedThumbs(ctx);
      });
      if (CONFIG.hideEmptyThumbSpans) {
        const defer = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
        defer(() => unique.forEach((ctx) => hideEmptyThumbSpans(ctx)));
      }
      if (CONFIG.cleanupFavoritesArtifacts) cleanupFavoritesArtifacts();
    };
    runAll();
    if (CONFIG.pageIndicator) updatePageIndicator();
    if (CONFIG.faviconChanger) updateFavicon();
    const addedNodesBuffer = /* @__PURE__ */ new Set();
    let routeTransitionPending = false;
    let routeTransitionHref = null;
    let routeTransitionStartedAt = 0;
    let lastRelevantMutationAt = 0;
    let routeTransitionBaseline = "";
    let routeTransitionBaselineNodes = null;
    let routeChangeTimer = null;
    const processAddedNodes = debounce(() => {
      if (routeTransitionPending || addedNodesBuffer.size === 0) return;
      runAll(Array.from(addedNodesBuffer));
      addedNodesBuffer.clear();
    }, CONSTANTS.DEBOUNCE_MUTATION_MS);
    const getRouteContentNodes = (href) => {
      const route = getRoute(href);
      if (route.isPostView) {
        return {
          primary: document.querySelector(".status-notice"),
          secondary: document.querySelector("#fit-to-screen"),
          media: document.querySelector("#fit-to-screen")?.firstElementChild
        };
      }
      if (route.isFavoritesView || route.page === "post" && route.section === "list") {
        const content = document.querySelector("#content");
        return {
          primary: content,
          secondary: content?.querySelector("div.image-list") || document.querySelector("div.image-list"),
          media: null
        };
      }
      return { primary: null, secondary: null, media: null };
    };
    const getRouteContentSignature = (href) => {
      const route = getRoute(href);
      if (route.isPostView) {
        const notice = document.querySelector(".status-notice");
        const fitToScreen = document.querySelector("#fit-to-screen");
        const media = fitToScreen?.firstElementChild;
        return [
          "post",
          notice?.textContent?.slice(0, 200) || "",
          fitToScreen?.childElementCount || 0,
          media?.tagName || "",
          media?.getAttribute?.("src") || ""
        ].join("|");
      }
      if (route.isFavoritesView || route.page === "post" && route.section === "list") {
        const content = document.querySelector("#content");
        const imageList = content?.querySelector("div.image-list") || document.querySelector("div.image-list");
        const thumbs = imageList ? Array.from(imageList.querySelectorAll("span.thumb")) : [];
        const thumbIds = thumbs.map((thumb) => thumb.id).join(",");
        return [
          "list",
          content?.childElementCount || 0,
          imageList?.childElementCount || 0,
          thumbIds
        ].join("|");
      }
      return `${route.page || ""}|${route.section || ""}|${route.url.search}`;
    };
    const isRouteContentReady = (href) => {
      const route = getRoute(href);
      if (!(route.isPostView || route.isFavoritesView || route.page === "post" && route.section === "list")) {
        return true;
      }
      if (getRouteContentSignature(href) !== routeTransitionBaseline) return true;
      const currentNodes = getRouteContentNodes(href);
      const baselineNodes = routeTransitionBaselineNodes;
      return Boolean(
        baselineNodes && (currentNodes.primary !== baselineNodes.primary || currentNodes.secondary !== baselineNodes.secondary || currentNodes.media !== baselineNodes.media)
      );
    };
    const mutationTouchesRouteContent = (mutation) => {
      const contentSelector = "#content, div.image-list, .status-notice, #fit-to-screen";
      const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
      if (target?.closest?.(contentSelector)) return true;
      const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return changedNodes.some(
        (node) => node.nodeType === 1 && (node.matches?.(contentSelector) || node.querySelector?.(contentSelector))
      );
    };
    const scheduleRouteScan = () => {
      clearTimeout(routeChangeTimer);
      routeChangeTimer = setTimeout(() => {
        if (!routeTransitionPending) return;
        const now = performance.now();
        const elapsed = now - routeTransitionStartedAt;
        const quietFor = now - lastRelevantMutationAt;
        const maxWait = CONSTANTS.ROUTE_TRANSITION_MAX_WAIT_MS;
        const contentReady = isRouteContentReady(routeTransitionHref);
        if (elapsed < maxWait && quietFor < CONSTANTS.DEBOUNCE_URL_MS || elapsed < maxWait && !contentReady) {
          scheduleRouteScan();
          return;
        }
        if (location.href !== routeTransitionHref) {
          routeTransitionPending = false;
          routeTransitionBaselineNodes = null;
          addedNodesBuffer.clear();
          return;
        }
        routeTransitionPending = false;
        addedNodesBuffer.clear();
        if (CONFIG.removeDuplicates && typeof removeDuplicateThumbnails.reset === "function") {
          removeDuplicateThumbnails.reset();
        }
        runAll();
        routeTransitionBaselineNodes = null;
        if (CONFIG.pageIndicator) updatePageIndicator();
        if (CONFIG.restoreDeletedPost && canRestore && getRoute(routeTransitionHref).isPostView) {
          restoreDeletedPost();
        }
      }, CONSTANTS.DEBOUNCE_URL_MS);
    };
    const observer = new MutationObserver((mutations) => {
      let needsUpdate = false;
      for (const m of mutations) {
        if (routeTransitionPending && mutationTouchesRouteContent(m)) {
          lastRelevantMutationAt = performance.now();
          scheduleRouteScan();
        }
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) {
            if (n.id === "content") {
              addedNodesBuffer.clear();
              addedNodesBuffer.add(n);
              needsUpdate = true;
              break;
            }
            const hasThumb = n.matches?.(".thumb") || n.classList?.contains("image-list") || n.querySelector && n.querySelector(".thumb");
            const isFavoritesArtifact = CONFIG.cleanupFavoritesArtifacts && getRoute().isFavoritesView && (n.tagName === "BR" || n.querySelector?.("a#pi") || n.matches?.("a#pi"));
            if (hasThumb || isFavoritesArtifact) {
              addedNodesBuffer.add(n);
              needsUpdate = true;
            }
          }
        }
      }
      if (needsUpdate && !routeTransitionPending) processAddedNodes();
    });
    observers.push(observer);
    observer.observe(document.body, { childList: true, subtree: true });
    let lastHref = location.href;
    const handleUrlChangeImmediate = () => {
      const newUrl = new URL(location.href);
      const oldUrl = new URL(lastHref);
      if (newUrl.href === oldUrl.href) return;
      const isPageChange = newUrl.pathname !== oldUrl.pathname || newUrl.search !== oldUrl.search;
      lastHref = newUrl.href;
      TAG.reloadForRoute();
      if (CONFIG.removeDuplicates && typeof removeDuplicateThumbnails.reset === "function") {
        removeDuplicateThumbnails.reset();
      }
      if (isPageChange) {
        if (CONFIG.faviconChanger) updateFavicon();
        if (CONFIG.pageIndicator) updatePageIndicator();
        routeTransitionPending = true;
        routeTransitionHref = newUrl.href;
        routeTransitionStartedAt = performance.now();
        lastRelevantMutationAt = routeTransitionStartedAt;
        routeTransitionBaseline = getRouteContentSignature(routeTransitionHref);
        routeTransitionBaselineNodes = getRouteContentNodes(routeTransitionHref);
        addedNodesBuffer.clear();
        scheduleRouteScan();
      }
    };
    const debouncedHeadObserver = debounce(handleUrlChangeImmediate, CONSTANTS.DEBOUNCE_URL_MS);
    const headObserver = new MutationObserver(debouncedHeadObserver);
    observers.push(headObserver);
    headObserver.observe(document.head || document.documentElement, { childList: true, subtree: true });
    window.addEventListener("popstate", handleUrlChangeImmediate);
    window.addEventListener("pushstate", handleUrlChangeImmediate);
    window.addEventListener("replacestate", handleUrlChangeImmediate);
    window.addEventListener("beforeunload", cleanup);
    const wrapHistoryMethod = (type) => {
      const orig = history[type];
      return function() {
        const rv = orig.apply(this, arguments);
        window.dispatchEvent(new Event(type.toLowerCase()));
        return rv;
      };
    };
    history.pushState = wrapHistoryMethod("pushState");
    history.replaceState = wrapHistoryMethod("replaceState");
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

})();
