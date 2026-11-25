// ==UserScript==
// @name         Image Board Enhancer Dual++
// @description  Auto Resize images and video on multiple image boards and enlarges thumbnails on mouse hover and adds content type icons to them. Added Header Color Validation & Fixes.
// @namespace    jAstn
// @author       It's a Me, jAstn!
// @version      2.0.10
// @match        https://rule34.xxx/index.php*
// @match        https://*.rule34.xxx/index.php*
// @grant        GM.setValue
// @grant        GM.getValue
// @icon         https://i.imgur.com/sUsekOa.png
// @run-at       document-body
// @tag          Eigene Scripts
// @noframes
// ==/UserScript==

(function () {
    'use strict';

(() => {
  // src/core.js
  var site = document.location.hostname.toLowerCase().replace(/^www\./, "");
  var state = {
    site,
    toolbarDOM: ".sidebar form",
    containerDOM: "#content",
    imageDOM: "#image",
    playerDOM: void 0,
    thumbnailDOM: ".thumb",
    placeSettingsAfter: true,
    tagSearchLink: "/index.php?page=post&s=list&tags=",
    changeKeyboardShortcut: false
  };
  var debugMode = false;
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  function addGlobalStyle(css) {
    let style = document.getElementById("ibe-custom-styles");
    if (!style) {
      style = document.createElement("style");
      style.id = "ibe-custom-styles";
      style.setAttribute("type", "text/css");
      document.head.appendChild(style);
    }
    style.innerHTML += css;
  }
  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }
  function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function getBaseTag(tag) {
    if (/^\(\+.+\+~.+\+\)$/.test(tag)) {
      const inner = tag.slice(2, -2);
      const [left] = inner.split("+~+");
      return left.trim();
    }
    return tag;
  }
  function parseTagsString(rawInput) {
    const newTags = [];
    const regex = /\([^)~]+~[^)]+\)|[^\s]+/g;
    const matches = rawInput.match(regex);
    if (!matches) return null;
    for (let rawTag of matches) {
      rawTag = rawTag.trim();
      const isUserTag = rawTag.startsWith("user:");
      const isPairTag = /^\(.*~.*\)$/.test(rawTag);
      const isNegated = rawTag.startsWith("-");
      const isSpecial = !isUserTag && rawTag.includes(":");
      const isComparison = /[<>!=]/.test(rawTag);
      if (isPairTag) {
        const pairFormatted = rawTag.replace(/[()]/g, "").split("~").map((s) => s.trim().replace(/\s+/g, "+")).join("+~+");
        rawTag = `(+${pairFormatted}+)`;
      }
      if ((isUserTag || isPairTag || !isNegated && !isSpecial && !isComparison) && rawTag !== "") {
        newTags.push(rawTag);
      }
    }
    return newTags;
  }
  function getParsedTagsFromInput() {
    const inputEl = document.querySelector('input[name="tags"]');
    if (!inputEl) return null;
    const rawInput = inputEl.value.trim();
    if (!rawInput) return null;
    return parseTagsString(rawInput);
  }
  function computeFit(windowAspect, contentAspect, windowWidth, windowHeight) {
    if (!(windowAspect > 0) || !(contentAspect > 0) || !(windowWidth > 0) || !(windowHeight > 0)) {
      return null;
    }
    if (windowAspect > contentAspect) {
      return { width: windowHeight * contentAspect, height: windowHeight };
    }
    return { width: windowWidth, height: windowWidth / contentAspect };
  }
  function getPairSet(tag) {
    if (typeof tag !== "string" || !/^\(\+.+\+~.+\+\)$/.test(tag)) return null;
    const members = tag.slice(2, -2).split("+~+").map((s) => s.trim().toLowerCase());
    if (members.length < 2) return null;
    return members.sort();
  }
  function mergeTagsIntoList(tagList, newTags) {
    const result = tagList.slice();
    let changed = false;
    for (const tag of newTags) {
      const tagLower = tag.toLowerCase();
      const tagBaseLower = getBaseTag(tag).toLowerCase();
      const tagSet = getPairSet(tag);
      if (result.some((t) => t.toLowerCase() === tagLower)) continue;
      let replaced = false;
      if (tagSet) {
        const setKey = tagSet.join("\0");
        for (let i = 0; i < result.length; i++) {
          const existingSet = getPairSet(result[i]);
          if (existingSet && existingSet.join("\0") === setKey) {
            result[i] = tag;
            replaced = true;
            changed = true;
            break;
          }
        }
      }
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
      if (!replaced) {
        result.push(tag);
        changed = true;
      }
    }
    return { list: result, changed };
  }

  // src/settings.js
  var DEFAULT_SETTINGS = {
    resizeImageToFit: true,
    resizeVideoToFit: true,
    autoplayVideos: true,
    autoScrollToContent: true,
    updateWithWindowResize: false,
    updateScrollOnWindowResize: false,
    showFitButton: false,
    showScrollButton: false,
    removeFluid: false,
    videoVolume: 0,
    alwaysShowScrollbars: false,
    resizeButton: "BracketLeft",
    scrollButton: "BracketRight",
    showFavoriteTags: { draw: true, open: false },
    favoriteTags: {},
    showFavoriteTagsUSER: { draw: true, open: false },
    favoriteTagsUSER: {},
    customSites: {}
  };
  var settings = { ...DEFAULT_SETTINGS };
  async function loadSettings() {
    const KEYS = Object.keys(DEFAULT_SETTINGS);
    const values = await Promise.all(KEYS.map((key) => GM.getValue(key, DEFAULT_SETTINGS[key])));
    KEYS.forEach((key, i) => {
      settings[key] = values[i];
    });
  }

  // src/sites.js
  function configureSites() {
    if (debugMode) console.log("Function: configureSites");
    if (state.site === "rule34.xxx") {
      state.toolbarDOM = ".sidebar > div";
      state.playerDOM = "#gelcomVideoContainer";
    } else if (settings.customSites[state.site]) {
      const obj = settings.customSites[state.site];
      if (obj.toolbarDOM) state.toolbarDOM = obj.toolbarDOM;
      if (obj.containerDOM) state.containerDOM = obj.containerDOM;
      if (obj.imageDOM) state.imageDOM = obj.imageDOM;
      if (obj.thumbnailDOM) state.thumbnailDOM = obj.thumbnailDOM;
      if (obj.playerDOM) state.playerDOM = obj.playerDOM;
      document.body.insertAdjacentHTML("beforeend", "<button id='ibenhancerDeleteConfigButton' style='position: absolute; top: 0px; right: 0px; z-index: 9999999; color: black; background-color: whitesmoke; font-size: 12px;'>Delete site config.</button>");
      document.getElementById("ibenhancerDeleteConfigButton").addEventListener("click", deleteSiteConfig);
    } else {
      document.body.insertAdjacentHTML("beforeend", "<button id='ibenhancerSetupButton' style='position: absolute; top: 0px; right: 0px; z-index: 9999999; color: black; background-color: whitesmoke; font-size: 12px;'>Setup Image Board Enhancer</button>");
      document.getElementById("ibenhancerSetupButton").addEventListener("click", addSiteConfig);
      console.warn("This site is not supported, but may still work.");
    }
  }
  function addSiteConfig() {
    const raw = prompt("Enter config in JSON format.", '{"toolbarDOM": ".sidebar form", "containerDOM": "#content", "imageDOM": "#image", "thumbnailDOM": ".thumb" }');
    if (raw === null) return;
    let config;
    try {
      config = JSON.parse(raw);
    } catch (e) {
      if (debugMode) console.warn("ibe: invalid site config JSON", e);
      config = null;
    }
    if (!config || typeof config !== "object" || Array.isArray(config) || Object.keys(config).length === 0) {
      alert("Config not valid.");
    } else {
      settings.customSites[state.site] = config;
      GM.setValue("customSites", settings.customSites);
      alert("Config saved.");
      location.reload();
    }
  }
  function deleteSiteConfig() {
    delete settings.customSites[state.site];
    GM.setValue("customSites", settings.customSites);
    alert("Config deleted.");
    location.reload();
  }

  // src/media.js
  var currentWindowWidth = 0;
  var currentWindowHeight = 0;
  var currentWindowAspect = 0;
  var contentTrueWidth = 0;
  var contentTrueHeight = 0;
  var contentTrueAspect = 0;
  var resizeReady = false;
  function getWindowProps() {
    currentWindowWidth = document.documentElement.clientWidth;
    currentWindowHeight = document.documentElement.clientHeight;
    const sidebar = document.querySelector(".sidebar") || document.querySelector("#tag-sidebar");
    if (sidebar && sidebar.getClientRects().length > 0) {
      const style = window.getComputedStyle(sidebar);
      const outerWidth = sidebar.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
      currentWindowWidth = currentWindowWidth - outerWidth - 20;
    }
    if (!Number.isFinite(currentWindowWidth)) currentWindowWidth = document.documentElement.clientWidth;
    if (currentWindowWidth !== 0 && currentWindowHeight !== 0) {
      currentWindowAspect = currentWindowWidth / currentWindowHeight;
    }
  }
  function getContentProps() {
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
    el.style.maxWidth = "";
    const fit = computeFit(currentWindowAspect, contentTrueAspect, currentWindowWidth, currentWindowHeight);
    if (!fit) return;
    if (isFluidPlayer) {
      el.style.width = fit.width + "px";
      el.style.height = fit.height + "px";
    } else {
      el.width = fit.width;
      el.height = fit.height;
    }
    if (!isFluidPlayer) el.removeAttribute("style");
  }
  function scrollToContent(delay) {
    setTimeout(() => {
      const target = document.querySelector(`${state.containerDOM} ${state.imageDOM}`) || document.querySelector(`${state.containerDOM} ${state.playerDOM}`) || document.querySelector(`${state.containerDOM} video`);
      if (target) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
      }
    }, delay);
  }
  function fitContent(delay) {
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
      const newVideo = document.createElement("video");
      newVideo.src = sourceVideo.src;
      newVideo.controls = true;
      player.replaceWith(newVideo);
    }
  }
  function enhanceContent() {
    if (state.site === "gelbooru.com") {
      document.querySelectorAll("video:not([id])").forEach((v) => v.remove());
    }
    if (settings.removeFluid && document.querySelector(state.playerDOM)) removeFluidPlayer();
    const video = document.querySelector(`${state.containerDOM} video`);
    const img = document.querySelector(`${state.containerDOM} ${state.imageDOM}`);
    if (video || img) {
      if (settings.alwaysShowScrollbars) document.documentElement.style.overflow = "scroll";
      getContentProps();
      if (settings.resizeImageToFit) fitContent(0);
      if (settings.autoScrollToContent) {
        scrollToContent(0);
        let firstRun = true;
        window.addEventListener("focus", () => {
          if (firstRun) {
            scrollToContent(0);
            firstRun = false;
          }
        });
      }
    }
    if (video) {
      video.autoplay = settings.autoplayVideos;
      video.volume = settings.videoVolume;
      video.loop = true;
      video.preload = "metadata";
      if (!settings.autoplayVideos) video.pause();
      const onVideoMetadata = () => {
        getContentProps();
        if (settings.resizeVideoToFit) fitContent(200);
        if (settings.autoScrollToContent) scrollToContent(200);
        video.play().catch((e) => console.warn("Autoplay prevented:", e));
      };
      if (video.readyState >= 1) {
        onVideoMetadata();
      } else {
        video.addEventListener("loadedmetadata", onVideoMetadata);
      }
    } else if (img) {
      const onImgLoad = () => {
        getContentProps();
        if (settings.resizeImageToFit) fitContent(200);
        if (settings.autoScrollToContent) scrollToContent(200);
      };
      if (img.complete && img.naturalWidth > 0) {
        onImgLoad();
      } else {
        img.addEventListener("load", onImgLoad);
      }
    }
  }
  function addWindowEvents() {
    if (settings.updateWithWindowResize) {
      window.addEventListener("resize", debounce(() => {
        fitContent(0);
        if (settings.updateScrollOnWindowResize) scrollToContent(0);
      }, 150));
    }
  }
  function keyboardShortcuts() {
    document.addEventListener("keyup", (e) => {
      if (isTyping()) return;
      if (state.changeKeyboardShortcut && e.code === "Escape") {
        document.getElementById("resizeButton").innerHTML = settings.resizeButton;
        document.getElementById("scrollButton").innerHTML = settings.scrollButton;
        state.changeKeyboardShortcut = false;
      }
      if (!state.changeKeyboardShortcut) {
        if (e.code === settings.resizeButton) {
          getContentProps(0);
          fitContent(0);
        } else if (e.code === settings.scrollButton) scrollToContent(0);
      } else if (state.changeKeyboardShortcut === "resizeButton") {
        settings.resizeButton = e.code;
        document.getElementById("resizeButton").innerHTML = e.code;
        state.changeKeyboardShortcut = false;
      } else if (state.changeKeyboardShortcut === "scrollButton") {
        settings.scrollButton = e.code;
        document.getElementById("scrollButton").innerHTML = e.code;
        state.changeKeyboardShortcut = false;
      }
    });
  }

  // src/css.js
  var MAIN_CSS = `
                html.ibenhancerSettingVisible { overflow: hidden !important; }
                #ibenhancer { background: #000000 !important; border: solid 1px grey; padding: 5px; width: auto; text-align: center !important; margin-right: auto; }
                #ibenhancer, #ibenhancerSettings label { font-size: 15px !important; font-family: Arial, sans-serif !important; font-style: normal !important; font-weight: normal !important; text-align: center; }
                #ibenhancerSettings-blocker { position: fixed; background-color: rgba(0, 0, 0, .5); width: 100vw; height: 100vh; top: 0; left: 0; z-index: 1; display: none; }
                #ibenhancerSettings-blocker.show { display: block; }
                #ibenhancerSettings { position: fixed; width: 400px; height: 400px; left: calc(50vw - 155px); top: calc(50vh - 165px); background-color: black; border: 2px solid black; border-radius: 3px; padding: 10px; text-align: left; z-index: 999999; display: none; color: #181a1b; padding-bottom: 0px; }
                #ibenhancerSettings-options { overflow-y: auto; overflow-x: hidden; width: 100%; height: calc(100% - 32px); }
                #ibenhancerSettings-options label { white-space: nowrap; color: white;}
                #ibenhancerSettings input { margin: 5px; width: auto; }
                #ibenhancerSettings input[type=number], #ibenhancerSettings select { border: solid 1px darkgrey; background: #fff; }
                #ibenhancer button { width: auto; border: solid 1px darkgrey !important; background: black !important; cursor: pointer; color: white; }
                #ibenhancerSettings.show { display: block; }
                #fitContentButton, #scrollContentButton { width: 73px !important; }
                #ibenhancerSettingsButton { margin: auto !important; position: relative; }
            `;
  var FAVORITE_TAGS_CSS = `
            #ibenhancer-favorite-tags > details > summary { margin-left: -8px; list-style: none; cursor: pointer; }
            #ibenhancer-favorite-tags details summary::-webkit-details-marker { display: none; }
            #ibenhancer-favorite-tags details summary:after { content: '\u25BA'; float: right; transform: rotate(90deg); }
            #ibenhancer-favorite-tags details[open] summary:after { transform: rotate(270deg); }
            #ibenhancer-favorite-tags details { text-align: left; padding: 2px 8px; color: white; }
            #ibenhancer-favorite-tags details[open] { height:525px; }
            #ibenhancer-favorite-tags-edit-button { color: white; cursor: pointer; user-select: none; margin-right: 100px; }
            #ibenhancer-favorite-tags-edit-button:hover { text-decoration: underline; }
            #ibenhancer-favorite-tags #ibenhancer-favorite-tags-editor { display: none; }
            #ibenhancer-favorite-tags.edit #ibenhancer-favorite-tags-content { display: none; }
            #ibenhancer-favorite-tags.edit #ibenhancer-favorite-tags-editor { display: block; }
            #ibenhancer-favorite-tags-list { display: flex; flex-direction: column; max-height: 500px; overflow-y: auto; overflow-x: hidden; }
            #ibenhancer-favorite-tags-list a { color: #ff6c6c; }
        `;
  var FAVORITE_TAGS_USER_CSS = `
            #ibenhancerUSER-favorite-tags > details > summary { margin-left: -8px; list-style: none; cursor: pointer; }
            #ibenhancerUSER-favorite-tags details summary::-webkit-details-marker { display: none; }
            #ibenhancerUSER-favorite-tags details summary:after { content: '\u25BA'; float: right; transform: rotate(90deg); }
            #ibenhancerUSER-favorite-tags details[open] summary:after { transform: rotate(270deg); }
            #ibenhancerUSER-favorite-tags details { text-align: left; padding: 2px 8px; color: white; }
            #ibenhancerUSER-favorite-tags details[open] { height:532px; }
            #ibenhancerUSER-favorite-tags-edit-button { color: white; cursor: pointer; user-select: none; margin-right: 100px; }
            #ibenhancerUSER-favorite-tags-edit-button:hover { text-decoration: underline; }
            #ibenhancerUSER-favorite-tags #ibenhancerUSER-favorite-tags-editor { display: none; }
            #ibenhancerUSER-favorite-tags.edit #ibenhancerUSER-favorite-tags-content { display: none; }
            #ibenhancerUSER-favorite-tags.edit #ibenhancerUSER-favorite-tags-editor { display: block; }
            #ibenhancerUSER-favorite-tags-list { display: flex; flex-direction: column; max-height: 500px; overflow-y: auto; overflow-x: hidden; }
            #ibenhancerUSER-favorite-tags-list a { color: #8b1eb0; }
        `;

  // src/title-colors.js
  var lastSeenInputs = /* @__PURE__ */ new WeakMap();
  function parseSearchTokens(rawInput) {
    const cleanInput = rawInput.replace(/[()~]/g, " ");
    const tokens = cleanInput.split(/\s+/).filter((t) => t);
    const ignoredExact = ["sort:score", "-animated", "-video", "height:>1000", "-animation"];
    const validTokensToCheck = [];
    for (let token of tokens) {
      const tokenLower = token.toLowerCase();
      if (ignoredExact.includes(tokenLower)) continue;
      const baseTag = tokenLower.startsWith("user:") ? tokenLower.substring(5) : tokenLower;
      if (baseTag) validTokensToCheck.push(baseTag);
    }
    return validTokensToCheck;
  }
  function tokenMatchesDb(searchTokens, dbString) {
    const cleanDbString = (dbString || "").toLowerCase().replace(/[()~+]/g, " ");
    const dbTokens = cleanDbString.split(/\s+/).filter((t) => t);
    const finalDbBases = dbTokens.map((t) => t.startsWith("user:") ? t.substring(5) : t);
    return searchTokens.some((searchBase) => finalDbBases.includes(searchBase));
  }
  function replaceTagInParsedList(parsed, displayTag) {
    const trimmed = String(displayTag).trim();
    const isPairDisplay = trimmed.startsWith("(") && trimmed.endsWith(")");
    let baseForMatch = trimmed;
    let canonical = trimmed;
    if (isPairDisplay) {
      const inner = trimmed.slice(1, -1).trim();
      baseForMatch = inner.split("~")[0].trim();
      canonical = "(+" + inner.split("~").map((s) => s.trim()).join("+~+") + "+)";
    }
    const baseLower = baseForMatch.toLowerCase();
    const canonicalLower = canonical.toLowerCase();
    const canonicalSet = isPairDisplay ? getPairSet(canonical) : null;
    const canonicalSetKey = canonicalSet ? canonicalSet.join("\0") : null;
    const result = parsed.map((t) => {
      if (!t.startsWith("(+") && t.toLowerCase() === baseLower) {
        return displayTag;
      }
      if (canonicalSetKey && t.toLowerCase() !== canonicalLower) {
        const tSet = getPairSet(t);
        if (tSet && tSet.join("\0") === canonicalSetKey) {
          return displayTag;
        }
      }
      return t;
    });
    let changed = result.some((t, i) => t !== parsed[i]);
    if (!changed) {
      const present = result.some((t) => t.toLowerCase() === canonicalLower);
      if (!present) {
        result.push(displayTag);
        changed = true;
      }
    }
    return { list: result, changed };
  }
  function addTagToInputWithReplace(displayTag) {
    const inputEl = document.querySelector('input[name="tags"]');
    if (!inputEl) return;
    const parsed = getParsedTagsFromInput();
    let result;
    let changed;
    if (parsed) {
      const merged = replaceTagInParsedList(parsed, displayTag);
      result = merged.list;
      changed = merged.changed;
    } else {
      result = [displayTag];
      changed = true;
    }
    inputEl.value = result.join(" ");
    if (changed) updateTitleColors();
  }
  function readTagsInput(preferInput) {
    const inputs = Array.from(document.querySelectorAll('input[name="tags"]'));
    if (inputs.length === 0) return { inputEl: null, value: "" };
    if (preferInput && inputs.indexOf(preferInput) !== -1) {
      const v = (preferInput.value || "").trim();
      if (v) return { inputEl: preferInput, value: v };
    }
    let active = null;
    if (inputs.length > 1) {
      const cand = document.activeElement;
      if (cand && inputs.indexOf(cand) !== -1) active = cand;
    }
    if (active) {
      const v = (active.value || "").trim();
      if (v) return { inputEl: active, value: v };
    }
    for (const inp of inputs) {
      const v = (inp.value || "").trim();
      if (v) return { inputEl: inp, value: v };
    }
    const chosen = active || inputs[0];
    let value = (chosen.value || "").trim();
    if (!value && chosen.shadowRoot && chosen.shadowRoot.firstElementChild) {
      const firstChild = chosen.shadowRoot.firstElementChild;
      if (!firstChild.querySelector("input, textarea")) {
        const t = (firstChild.textContent || "").trim();
        if (t) value = t;
      }
    }
    return { inputEl: chosen, value };
  }
  function updateTitleColors() {
    const inputsNow = document.querySelectorAll('input[name="tags"]');
    let changed = null;
    for (const inp of inputsNow) {
      const current = (inp.value || "").trim();
      const prev = lastSeenInputs.get(inp);
      if (prev !== void 0 && prev !== current) {
        changed = inp;
        break;
      }
    }
    const { inputEl, value: rawInput } = readTagsInput(changed);
    if (!inputEl) {
      return;
    }
    for (const inp of inputsNow) {
      lastSeenInputs.set(inp, (inp.value || "").trim());
    }
    const validTokensToCheck = parseSearchTokens(rawInput);
    const titleMain = document.getElementById("ibe-title-main");
    const titleUser = document.getElementById("ibe-title-user");
    if (!titleMain && !titleUser) return;
    if (validTokensToCheck.length === 0) {
      if (titleMain) titleMain.style.color = "#fff";
      if (titleUser) titleUser.style.color = "#fff";
      return;
    }
    if (titleMain) {
      const matchMain = tokenMatchesDb(validTokensToCheck, settings.favoriteTags[state.site]);
      titleMain.style.color = matchMain ? "#00FF00" : "#FF0000";
    }
    if (titleUser) {
      const matchUser = tokenMatchesDb(validTokensToCheck, settings.favoriteTagsUSER[state.site]);
      titleUser.style.color = matchUser ? "#00FF00" : "#FF0000";
    }
  }
  function setupInputObserver() {
    const observed = /* @__PURE__ */ new WeakSet();
    const observer = new MutationObserver(debounce(updateTitleColors, 50));
    const valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    const observe = (inp) => {
      if (!inp || observed.has(inp)) return;
      observed.add(inp);
      observer.observe(inp, { attributes: true, attributeFilter: ["value"] });
      if (inp.shadowRoot) {
        observer.observe(inp.shadowRoot, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true
        });
      }
      try {
        Object.defineProperty(inp, "value", {
          configurable: true,
          get: valueDesc.get,
          set: function(v) {
            valueDesc.set.call(this, v);
            updateTitleColors();
          }
        });
      } catch (e) {
        if (debugMode) console.warn("ibe: defineProperty failed", e);
      }
    };
    document.querySelectorAll('input[name="tags"]').forEach(observe);
    const bodyObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches && node.matches('input[name="tags"]')) observe(node);
          if (node.querySelectorAll) {
            node.querySelectorAll('input[name="tags"]').forEach(observe);
          }
        }
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  // src/favorite-tags.js
  var PANELS = {
    main: {
      key: "favoriteTags",
      // settings-Key für die Tag-Liste
      showKey: "showFavoriteTags",
      // settings-Key für das Show-Flag
      prefix: "ibenhancer-favorite-tags",
      titleId: "ibe-title-main",
      titleLabel: "Image Board Enhancer",
      hasSettingsButton: true,
      sortByType: true,
      css: FAVORITE_TAGS_CSS
    },
    user: {
      key: "favoriteTagsUSER",
      showKey: "showFavoriteTagsUSER",
      prefix: "ibenhancerUSER-favorite-tags",
      titleId: "ibe-title-user",
      titleLabel: "Image Board Enhancer User",
      hasSettingsButton: false,
      sortByType: false,
      css: FAVORITE_TAGS_USER_CSS
    }
  };
  function createFavoriteTagsPanel(kind) {
    const cfg = PANELS[kind];
    const tagSettings = settings[cfg.key];
    const showFlag = settings[cfg.showKey];
    const { prefix } = cfg;
    if (typeof tagSettings[state.site] !== "string") tagSettings[state.site] = "";
    const ibenhancer = document.getElementById("ibenhancer");
    const titleSpan = `<span id='${cfg.titleId}' style='font-weight:bold; transition: color 0.2s; color: #fff;'>${cfg.titleLabel}</span>`;
    const settingsButton = cfg.hasSettingsButton ? '<button id="ibenhancerSettingsButton">Settings</button>' : "";
    ibenhancer.insertAdjacentHTML("beforeend", `
            ${kind === "user" ? `<br>${titleSpan}` : ""}
            <div id="${prefix}">
                <details ${showFlag["open"] ? "open" : ""}>
                    <summary style="color: white;">Favorite Tags <button id="${prefix}-add-current" title="Aktuellen Such-Tag zu Favoriten hinzuf\xFCgen" style="margin-top: 4px; font-size: 11px; padding: 2px 6px;">+</button></summary>
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
    document.getElementById(`${prefix}-add-current`).addEventListener("click", (e) => {
      e.preventDefault();
      const newTags = getParsedTagsFromInput();
      if (!newTags) return;
      const merged = mergeTagsIntoList(
        tagSettings[state.site].trim().split(/\s+/).filter((t) => t),
        newTags
      );
      if (merged.changed) {
        tagSettings[state.site] = merged.list.join(" ");
        GM.setValue(cfg.key, tagSettings);
        renderList();
        updateTitleColors();
      }
    });
    document.querySelector(`#${prefix} > details > summary`).addEventListener("click", () => {
      setTimeout(() => {
        showFlag["open"] = document.querySelector(`#${prefix} > details`).open;
        GM.setValue(cfg.showKey, showFlag);
      });
    });
    document.getElementById(`${prefix}-edit-button`).addEventListener("click", () => {
      const textarea = document.getElementById(`${prefix}-textarea`);
      textarea.value = tagSettings[state.site];
      document.getElementById(prefix).classList.add("edit");
      setTimeout(() => {
        textarea.scrollTop = textarea.scrollHeight;
      }, 0);
    });
    document.getElementById(`${prefix}-editor-cancel-button`).addEventListener("click", () => {
      document.getElementById(prefix).classList.remove("edit");
    });
    document.getElementById(`${prefix}-editor-save-button`).addEventListener("click", () => {
      tagSettings[state.site] = document.getElementById(`${prefix}-textarea`).value;
      GM.setValue(cfg.key, tagSettings);
      renderList();
      updateTitleColors();
      setTimeout(() => document.getElementById(prefix).classList.remove("edit"), 0);
    });
    function renderList() {
      const tags = tagSettings[state.site].trim().split(/\s+/).filter((t) => t).reverse();
      document.getElementById(`${prefix}-list`).innerHTML = getTagsHtml(kind, tags);
    }
    renderList();
    addGlobalStyle(cfg.css);
  }
  function getTagsHtml(kind, tags) {
    const cfg = PANELS[kind];
    let tagHTML = "";
    const linksHTML = [];
    for (let i = 0; i < tags.length; i++) {
      if (tags[i] === "//") break;
      if (tags[i] !== "") {
        let displayTag = tags[i];
        if (/^\(\+.+\+~\+.+\+\)$/.test(displayTag)) {
          const inner = displayTag.slice(2, -2).split("+").join(" ").trim();
          displayTag = `( ${inner} )`;
        }
        const color = "";
        let tagtype = 5;
        if (displayTag.startsWith("rating:") || displayTag.startsWith("score:") || displayTag.startsWith("user:") || displayTag.startsWith("id:") || displayTag.startsWith("date:") || displayTag.startsWith("status:") || displayTag.startsWith("size:")) tagtype = 10;
        const plusLink = `<a href="https://rule34.xxx/" data-add-tag="${escapeAttr(displayTag)}" ${color}>+</a>`;
        const minusLink = `<a href="https://rule34.xxx/" data-minus-tag="${escapeAttr(displayTag)}" ${color}>-</a>`;
        const tagLink = `<a href="${escapeAttr(state.tagSearchLink + displayTag)}" ${color}>${escapeHtml(displayTag)}</a>`;
        linksHTML.push({ html: `<span>${plusLink}&nbsp;${minusLink}&nbsp;${tagLink}</span>`, type: tagtype });
      }
    }
    if (cfg.sortByType) linksHTML.sort((a, b) => a.type - b.type);
    for (let i = 0; i < linksHTML.length; i++) {
      tagHTML += linksHTML[i].html;
    }
    return tagHTML;
  }

  // src/toolbar.js
  function createToolbar() {
    const imageExists = document.querySelector(`${state.containerDOM} ${state.imageDOM}`);
    const videoExists = document.querySelector(`${state.containerDOM} video`);
    const thumbExists = document.querySelector(state.thumbnailDOM);
    if (!document.getElementById("ibenhancer") && (imageExists || videoExists || thumbExists)) {
      const titleMain = `<span id='ibe-title-main' style='font-weight:bold; transition: color 0.2s; color: #fff;'>Image Board Enhancer</span>`;
      const toolbarTarget = document.querySelector(state.toolbarDOM);
      if (toolbarTarget) {
        const html = `<div id='ibenhancer'>${titleMain}</div>`;
        toolbarTarget.insertAdjacentHTML(state.placeSettingsAfter ? "afterend" : "beforebegin", html);
      }
      const ibenhancer = document.getElementById("ibenhancer");
      if (!ibenhancer) return;
      if (settings.showFitButton && (imageExists || videoExists)) {
        ibenhancer.insertAdjacentHTML("beforeend", "<button id='fitContentButton' style='margin-top: 3px;'>Fit</button>");
        document.getElementById("fitContentButton").addEventListener("click", () => {
          getContentProps();
          fitContent(0);
        });
      }
      if (settings.showScrollButton && (imageExists || videoExists)) {
        ibenhancer.insertAdjacentHTML("beforeend", "<button id='scrollContentButton' style='margin-top: 3px;'>Scroll</button>");
        document.getElementById("scrollContentButton").addEventListener("click", () => scrollToContent(0));
      }
      ibenhancer.insertAdjacentHTML("beforeend", `
                <div id="ibenhancerSettings-blocker"></div>
                <div id="ibenhancerSettings">
                  <div id="ibenhancerSettings-options">
                    <label><input id="resizeImageToFitCheckbox" type="checkbox" ${settings.resizeImageToFit ? "checked" : ""}>Resize images to fit screen.</label><br>
                    <label><input id="resizeVideoToFitCheckbox" type="checkbox" ${settings.resizeVideoToFit ? "checked" : ""}>Resize videos to fit screen.</label><br>
                    <label><input id="autoplayVideosCheckbox" type="checkbox" ${settings.autoplayVideos ? "checked" : ""}>Autoplay videos.</label><br>
                    <label><input id="autoScrollToContentCheckbox" type="checkbox" ${settings.autoScrollToContent ? "checked" : ""}>Scroll to content.</label><br>
                    <label><input id="removeFluidCheckbox" type="checkbox" ${settings.removeFluid ? "checked" : ""}>Remove fluid video player.</label><br>
                    <label><input id="alwaysShowScrollbarsCheckbox" type="checkbox" ${settings.alwaysShowScrollbars ? "checked" : ""}>Always show scrollbars.</label><br>
                    <label><input id="showFavoriteTagsCheckbox" type="checkbox" ${settings.showFavoriteTags["draw"] ? "checked" : ""}>Show favorite tags.</label><br>
                    <label><input id="showFavoriteTagsUSERCheckbox" type="checkbox" ${settings.showFavoriteTagsUSER["draw"] ? "checked" : ""}>Show favorite tags USER.</label><br>
                    <label><input id="updateWithWindowResizeCheckbox" type="checkbox" ${settings.updateWithWindowResize ? "checked" : ""}>Update with window resize.</label><br>
                    <label><input id="updateScrollOnWindowResizeCheckbox" type="checkbox" ${settings.updateScrollOnWindowResize ? "checked" : ""}>Update scroll on window resize.</label><br>
                    <label><input id="showFitButtonCheckbox" type="checkbox" ${settings.showFitButton ? "checked" : ""}>Show fit button.</label><br>
                    <label><input id="showScrollButtonCheckbox" type="checkbox" ${settings.showScrollButton ? "checked" : ""}>Show scroll button.</label><br>
                    <label>Video volume: <input id="videoVolumeInput" type="number" min="0" max="1" step="0.01" value="${settings.videoVolume}" style="width:60px;">0 - 1</label><br>
                    <label>Resize keyboard shortcut: <button id="resizeButton">${settings.resizeButton}</button></label><br>
                    <label>Scroll keyboard shortcut: <button id="scrollButton">${settings.scrollButton}</button></label><br>
                  </div>
                  <button id="ibenhancerSettingsSave">Save</button><button id="ibenhancerSettingsCancel">Cancel</button>
                </div>
            `);
      document.getElementById("ibenhancerSettingsSave").addEventListener("click", saveSettings);
      document.getElementById("ibenhancerSettingsCancel").addEventListener("click", hideSettings);
      document.getElementById("resizeButton").addEventListener("click", () => changeButtonClicked("resize"));
      document.getElementById("scrollButton").addEventListener("click", () => changeButtonClicked("scroll"));
      addGlobalStyle(MAIN_CSS);
      if (settings.showFavoriteTags["draw"]) createFavoriteTagsPanel("main");
      if (settings.showFavoriteTagsUSER["draw"]) createFavoriteTagsPanel("user");
    }
  }
  function showSettings() {
    document.getElementById("ibenhancerSettings").classList.add("show");
    document.getElementById("ibenhancerSettings-blocker").classList.add("show");
    document.documentElement.classList.add("ibenhancerSettingVisible");
  }
  function hideSettings() {
    document.getElementById("ibenhancerSettings").classList.remove("show");
    document.getElementById("ibenhancerSettings-blocker").classList.remove("show");
    document.documentElement.classList.remove("ibenhancerSettingVisible");
    const setCheckbox = (id, checked) => {
      const el = document.getElementById(id);
      if (el) el.checked = checked;
    };
    setCheckbox("resizeImageToFitCheckbox", settings.resizeImageToFit);
    setCheckbox("resizeVideoToFitCheckbox", settings.resizeVideoToFit);
    setCheckbox("autoplayVideosCheckbox", settings.autoplayVideos);
    setCheckbox("autoScrollToContentCheckbox", settings.autoScrollToContent);
    setCheckbox("updateWithWindowResizeCheckbox", settings.updateWithWindowResize);
    setCheckbox("updateScrollOnWindowResizeCheckbox", settings.updateScrollOnWindowResize);
    setCheckbox("removeFluidCheckbox", settings.removeFluid);
    setCheckbox("alwaysShowScrollbarsCheckbox", settings.alwaysShowScrollbars);
    setCheckbox("showFavoriteTagsCheckbox", settings.showFavoriteTags["draw"]);
    setCheckbox("showFavoriteTagsUSERCheckbox", settings.showFavoriteTagsUSER["draw"]);
    setCheckbox("showFitButtonCheckbox", settings.showFitButton);
    setCheckbox("showScrollButtonCheckbox", settings.showScrollButton);
    const volInput = document.getElementById("videoVolumeInput");
    if (volInput) volInput.value = settings.videoVolume;
  }
  function changeButtonClicked(buttonType) {
    if (buttonType === "resize") {
      document.getElementById("resizeButton").innerHTML = "?";
      state.changeKeyboardShortcut = "resizeButton";
    } else if (buttonType === "scroll") {
      document.getElementById("scrollButton").innerHTML = "?";
      state.changeKeyboardShortcut = "scrollButton";
    }
  }
  function saveSettings() {
    GM.setValue("resizeImageToFit", document.getElementById("resizeImageToFitCheckbox").checked);
    GM.setValue("resizeVideoToFit", document.getElementById("resizeVideoToFitCheckbox").checked);
    GM.setValue("autoplayVideos", document.getElementById("autoplayVideosCheckbox").checked);
    GM.setValue("autoScrollToContent", document.getElementById("autoScrollToContentCheckbox").checked);
    GM.setValue("removeFluid", document.getElementById("removeFluidCheckbox").checked);
    GM.setValue("alwaysShowScrollbars", document.getElementById("alwaysShowScrollbarsCheckbox").checked);
    const volRaw = document.getElementById("videoVolumeInput").value;
    const vol = parseFloat(volRaw);
    const volSafe = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : settings.videoVolume;
    GM.setValue("videoVolume", volSafe);
    settings.showFavoriteTags["draw"] = document.getElementById("showFavoriteTagsCheckbox").checked;
    GM.setValue("showFavoriteTags", settings.showFavoriteTags);
    settings.showFavoriteTagsUSER["draw"] = document.getElementById("showFavoriteTagsUSERCheckbox").checked;
    GM.setValue("showFavoriteTagsUSER", settings.showFavoriteTagsUSER);
    GM.setValue("updateWithWindowResize", document.getElementById("updateWithWindowResizeCheckbox").checked);
    GM.setValue("updateScrollOnWindowResize", document.getElementById("updateScrollOnWindowResizeCheckbox").checked);
    GM.setValue("showFitButton", document.getElementById("showFitButtonCheckbox").checked);
    GM.setValue("showScrollButton", document.getElementById("showScrollButtonCheckbox").checked);
    GM.setValue("resizeButton", settings.resizeButton);
    GM.setValue("scrollButton", settings.scrollButton);
    location.reload();
  }

  // src/init.js
  function init() {
    configureSites();
    addWindowEvents();
    createToolbar();
    keyboardShortcuts();
    enhanceContent();
    updateTitleColors();
    setupInputObserver();
    const debouncedTitleUpdate = debounce(updateTitleColors, 300);
    document.addEventListener("input", (e) => {
      if (e.target && e.target.name === "tags") {
        debouncedTitleUpdate();
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target) return;
      if (e.target.id === "ibenhancerSettingsButton") {
        showSettings();
        return;
      }
      const addTagEl = e.target.closest("[data-add-tag]");
      if (addTagEl) {
        e.preventDefault();
        addTagToInputWithReplace(addTagEl.dataset.addTag);
        return;
      }
      const minusTagEl = e.target.closest("[data-minus-tag]");
      if (minusTagEl) {
        e.preventDefault();
        const inputEl = document.querySelector('input[name="tags"]');
        if (inputEl) inputEl.value += " -" + minusTagEl.dataset.minusTag;
        return;
      }
      const sidebarToggle = e.target.closest('li[class*="tag-type-"] a[href="#"]');
      if (sidebarToggle) {
        const inputEl = document.querySelector('input[name="tags"]');
        const wasEmpty = !!(inputEl && inputEl.value === "");
        setTimeout(() => {
          if (wasEmpty && inputEl && /^\s+/.test(inputEl.value)) {
            inputEl.value = inputEl.value.replace(/^\s+/, "");
          }
          updateTitleColors();
        }, 0);
        return;
      }
      if (e.target.closest("#ibenhancer-favorite-tags-list a, #ibenhancerUSER-favorite-tags-list a")) {
        setTimeout(updateTitleColors, 0);
      }
    }, true);
  }
  (async () => {
    await loadSettings();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
})();

})();
