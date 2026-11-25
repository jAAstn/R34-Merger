import { getRoute, observers } from './core.js';
import { normalizeTag, v2ToAst, astToText, walkTokens, parseRulesInput, compileRules, anyRuleMatches } from './parser.js';
import { refreshBlacklistedSidebar } from './sidebar.js';
import { TAG_CSS, WEBM_HIDE_CSS } from './css.js';

    // =========================================================================
    // MODUL: Tag Hider++ (integriert – kein Panel, kein Alt+P, kein Guard)
    // Live-Toggle ohne Reload: Tags werden beim ERSTEN Durchlauf (bevor
    // removeThumbTitle läuft) pro Post-ID in den Cache übernommen.
    // =========================================================================
    const TAG = (() => {
        // --- SPEICHER (konsolidiert: EIN Key 'r34th_config') ---
        // Vorher gab es 3 Enable-Keys (r34th_enabled / _fav / _fav2), 2 Rules-Keys
        // (r34th_rules_v3 / _fav) plus Legacy-Keys (r34th_rules_v2, forbiddenTags,
        // enabled) – niemand wusste, was was ist. Jetzt alles in einem Objekt:
        //   { enabled: { main, fav }, rules: { main, fav }, showWebm: { main, fav } }
        // showWebm = Ausnahme der Blacklist: true = webm/mp4/gif-Thumbs werden
        // trotz aktiver Blacklist NICHT versteckt.
        // 'postview' (Post-Ansicht) und die eigene Favoriten-Seite sind HART aus
        // (isRouteLockedOff) und werden gar nicht erst gespeichert.
        const K = {
            config: 'r34th_config',
            // Alte Keys – nur noch für die einmalige Migration
            rulesV3: 'r34th_rules_v3', rulesV3Fav: 'r34th_rules_v3_fav',
            rulesLegacyV2: 'r34th_rules_v2', rulesLegacy: 'forbiddenTags',
            enabled: 'r34th_enabled', enabledFav: 'r34th_enabled_fav', enabledFav2: 'r34th_enabled_fav2',
            enabledPostview: 'r34th_enabled_postview', enabledLegacy: 'enabled',
        };
        const safeGet = (key, fb) => { try { const v = GM_getValue(key, fb); return (v === undefined || v === null) ? fb : v; } catch { return fb; } };
        const safeSet = (key, val) => { try { GM_setValue(key, val); } catch { /* ignore */ } };
        const safeDelete = (key) => {
            try { GM_deleteValue(key); return; } catch { /* ignore */ }
            try { if (typeof GM !== 'undefined' && GM.deleteValue) GM.deleteValue(key); } catch { /* ignore */ }
        };
        const loadBool = (pk, lk, fb) => { const v = safeGet(pk, undefined); const r = v === undefined ? safeGet(lk, fb) : v; return r !== false && r !== 'false'; };

        // --- PROFILE & AN/AUS-MATRIX ---
        // Zwei Regel-Profile: 'main' (Suche/Listen) und 'fav' (Favoriten-Seiten).
        // Zustand pro Profil getrennt (enabled + rules), damit Favoriten und
        // Suche unabhängig bleiben.
        const isFavProfile = () => getRoute().isFavoritesPage;
        // Ausnahme-Posts (Favoriten-Ansicht): SmartSkip ist hier IMMER aus
        const FAVORITES_EXEMPT_IDS = ['5598646'];
        const isExemptFavorite = () => {
            const r = getRoute();
            return r.isFavoritesPage && r.section === 'view' && FAVORITES_EXEMPT_IDS.indexOf(String(r.id)) !== -1;
        };
        // Routen-Typ: 'postview' | 'fav' | 'main'
        const routeType = () => {
            const r = getRoute();
            if (r.page === 'post' && r.section === 'view') return 'postview';
            if (r.isFavoritesPage) return 'fav';
            return 'main';
        };
        // Fest deaktivierte Routen: Ausnahme-Post (eigene Favoriten) & alle
        // Post-Ansichten. Dort ist SmartSkip+/Tag-Hider VOLLSTÄNDIG aus – Regeln
        // greifen nicht, der Toggle ist gesperrt; alle anderen Features laufen
        // normal weiter.
        const isRouteLockedOff = () => (isExemptFavorite() || routeType() === 'postview');
        const profile = () => (isFavProfile() ? 'fav' : 'main');

        // --- KONSOLIDIERTER STORAGE (Definitionen; init unten nach den Cookie-Helfern) ---
        let config = null;
        const migrateRules = (v3Key, v2Key, v1Key, withCookie) => {
            const v3 = safeGet(v3Key, null);
            if (Array.isArray(v3)) {
                if (v3.length > 0) {
                    if (v3.every(r => r && typeof r.kind === 'string')) return v3;
                    const conv = v3.map(r => (r && typeof r.kind === 'string') ? r : (r && Array.isArray(r.orGroups)) ? v2ToAst(r) : null).filter(Boolean);
                    if (conv.length) return conv;
                }
                // Key existiert – auch wenn leer. Dann ist das eine bewusste
                // Leerung des Nutzers und wird NICHT neu importiert (Bugfix:
                // geleerte Regeln kamen nach Reload aus Legacy/Cookie zurück).
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
                    const seed = v1.map(t => { const w = normalizeTag(t); return w ? { kind: 'word', value: w } : null; }).filter(Boolean);
                    if (seed.length) return seed;
                }
            }
            // Cookie-Import nur beim allerersten Start (noch kein r34th_config da)
            if (withCookie) {
                const cookie = getTagsFromCookie();
                if (cookie.length) return cookie.map(t => ({ kind: 'word', value: t }));
            }
            return [];
        };
        const loadConfig = () => {
            const existing = safeGet(K.config, null);
            if (existing && typeof existing === 'object' && existing.rules && typeof existing.rules === 'object') {
                if (!existing.enabled || typeof existing.enabled !== 'object') existing.enabled = { main: true, fav: true };
                if (!Array.isArray(existing.rules.main)) existing.rules.main = [];
                if (!Array.isArray(existing.rules.fav)) existing.rules.fav = [];
                // showWebm kam später dazu – Bestandsconfigs bekommen hier die
                // Ausnahme "webm wird mitversteckt" (also: Haken NICHT gesetzt).
                if (!existing.showWebm || typeof existing.showWebm !== 'object') existing.showWebm = { main: false, fav: false };
                existing.showWebm.main = existing.showWebm.main === true;
                existing.showWebm.fav = existing.showWebm.fav === true;
                return existing;
            }
            // --- Einmalige Migration der alten, verwirrenden Keys ---
            const migrated = {
                enabled: {
                    main: loadBool(K.enabled, K.enabledLegacy, true),
                    fav: loadBool(K.enabledFav2, K.enabledFav, true),
                },
                rules: {
                    main: migrateRules(K.rulesV3, K.rulesLegacyV2, K.rulesLegacy, true),
                    fav: migrateRules(K.rulesV3Fav, null, null, false),
                },
                showWebm: { main: false, fav: false },
            };
            safeSet(K.config, migrated);
            [K.rulesV3, K.rulesV3Fav, K.rulesLegacyV2, K.rulesLegacy, K.enabled, K.enabledFav, K.enabledFav2, K.enabledPostview, K.enabledLegacy].forEach(safeDelete);
            return migrated;
        };
        const saveConfig = () => safeSet(K.config, config);
        const rulesFor = (prof) => { const p = prof || profile(); if (!Array.isArray(config.rules[p])) config.rules[p] = []; return config.rules[p]; };
        const enabledFor = (prof) => config.enabled[prof] !== false;
        const setEnabledFor = (prof, val) => { config.enabled[prof] = val; saveConfig(); };
        // Ausnahme: webm/mp4/gif-Thumbs trotz aktiver Blacklist anzeigen
        const showWebmFor = (prof) => {
            const p = prof || profile();
            const s = config.showWebm;
            return !!(s && typeof s === 'object' && s[p] === true);
        };
        const setShowWebmFor = (prof, val) => {
            const p = prof || profile();
            if (!config.showWebm || typeof config.showWebm !== 'object') config.showWebm = {};
            config.showWebm[p] = val === true;
            saveConfig();
        };
        // webm/mp4/gif werden nur mitversteckt, wenn die Blacklist wirklich aktiv
        // ist UND die Ausnahme-Checkbox nicht gesetzt wurde.
        const shouldHideWebm = () => enabled && !showWebmFor();


        const getTagsFromCookie = () => {
            try {
                const m = document.cookie.match(new RegExp('(^| )tag_blacklist=([^;]+)'));
                if (m) {
                    let raw = decodeURIComponent(m[2]);
                    if (raw.indexOf('%') !== -1) raw = decodeURIComponent(raw);
                    return raw.split(/[\s+]+/).map(normalizeTag).filter(t => t.length > 0);
                }
            } catch { /* ignore */ }
            return [];
        };
        // Eigene User-ID aus dem rule34-Cookie (zum Erkennen fremder Favoriten-Seiten)
        const getOwnUserId = () => {
            try {
                const m = document.cookie.match(new RegExp('(^| )user_id=([^;]+)'));
                return m ? m[2] : null;
            } catch { return null; }
        };
        // Fremde Profil-Favoriten-Seite? (page=favorites&s=view&id=<andererUser>)
        // rule34 wendet die eigene tag_blacklist dort NICHT an - das Script übernimmt das.
        const isForeignFavoritesPage = () => {
            const r = getRoute();
            if (!(r.isFavoritesPage && r.section === 'view')) return false;
            if (!r.id) return false; // ohne Profil-ID (eigene Favoriten-Shortcut) -> nativ behandelt
            const own = getOwnUserId();
            return !own || r.id !== own;
        };
        // Cookie-Blacklist als zusaetzliche Wort-Regeln kompilieren (nur auf fremden Favoriten-Seiten)
        const getCookieBlacklistCompiled = () => {
            const tags = getTagsFromCookie();
            if (!tags.length) return null;
            return compileRules(tags.map(t => ({ kind: 'word', value: t })));
        };
        // Storage-Init: erst jetzt, nachdem die Cookie-Helfer definiert sind
        config = loadConfig();
        let enabled = isRouteLockedOff() ? false : enabledFor(profile());
        let rules = rulesFor(profile());
        let compiled = compileRules(rules);
        const saveRules = (newRules, prof) => {
            const p = prof || profile();
            config.rules[p] = newRules;
            saveConfig();
            // Nur in den Arbeitsspeicher übernehmen, wenn noch das gleiche Profil aktiv ist
            if (profile() === p) {
                rules = newRules;
                compiled = compileRules(rules);
            }
        };


        // Profil-Cache + Reload für SPA-Navigation (ohne Seitenneuladung)
        let lastProfile = routeType() + (isExemptFavorite() ? ':exempt' : '');
        // Panel-Zustand (Toggle + Sperr-Hinweis) bei Route-Wechsel synchronisieren
        const updatePanelState = () => {
            const panelBtn = document.getElementById('toggleSkip');
            if (panelBtn) {
                const locked = isRouteLockedOff();
                panelBtn.disabled = locked;
                panelBtn.textContent = locked ? 'Locked 🔒' : (enabled ? 'Disable 🔴' : 'Enable 🟢');
            }
            const hint = document.getElementById('skipLockedHint');
            if (hint) hint.style.display = isRouteLockedOff() ? 'block' : 'none';
        };
        const reloadForRoute = () => {
            // Offenes Bearbeitungsfenster bei Seitenwechsel schließen – verhindert
            // versehentliches Speichern ins falsche Profil (SPA-Navigation).
            const openModal = document.querySelector('.r34-modal-overlay');
            if (openModal) openModal.remove();
            const prof = routeType() + (isExemptFavorite() ? ':exempt' : '');
            if (prof === lastProfile) return;
            lastProfile = prof;
            enabled = isRouteLockedOff() ? false : enabledFor(profile());
            rules = rulesFor(profile());
            compiled = compileRules(rules);
            reapply();
            // Observer an die neue Route binden (Liste ↔ Favoriten ↔ Post-Ansicht).
            initObservers({ force: true });
            refreshBlacklistedSidebar();
            updatePanelState();
        };

        const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
        const buildModal = (title, bodyHtml, actions) => {
            const overlay = document.createElement('div');
            overlay.className = 'r34-modal-overlay';
            const box = document.createElement('div');
            box.className = 'r34-modal-box';
            box.innerHTML = '<h3>' + escapeHtml(title) + '</h3>' + (bodyHtml || '');
            if (actions && actions.length) {
                const actWrap = document.createElement('div');
                actWrap.className = 'actions';
                actions.forEach(a => {
                    const btn = document.createElement('button');
                    btn.className = 'r34-btn';
                    btn.style.marginTop = '0';
                    btn.style.flex = '1';
                    btn.textContent = a.label;
                    btn.addEventListener('click', () => {
                        let result;
                        try { if (a.onClick) result = a.onClick(box); } catch (e) { console.error(e); }
                        if (a.closeOnClick !== false) overlay.remove();
                        if (typeof a.afterClose === 'function') a.afterClose(result, overlay);
                    });
                    actWrap.append(btn);
                });
                box.append(actWrap);
            }
            overlay.append(box);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            (document.body || document.documentElement).appendChild(overlay);
            return overlay;
        };
        const openTagsEditor = () => {
            const prof = profile(); // Profil beim Öffnen einfrieren
            // Titel klar: 'Favorites' für das Favoriten-Profil, sonst 'Tags'
            // (Post-Ansicht hat KEINE Regeln – deshalb nicht mehr 'Tags/Posts').
            const overlay = buildModal('Edit blacklist rules' + (prof === 'fav' ? ' — Favorites' : ' — Tags'), [
                '<div class="hint">One rule per line (comma also accepted).<br>Whitespace / <code>&amp;</code> = AND, <code>|</code> = OR. Wildcards: <code>furry*</code> · Comments after <code>//</code>.</div>',
                // Ausnahme der Blacklist: Häkchen = webm/mp4/gif-Thumbs werden
                // trotz "Blacklist ON" ganz normal angezeigt.
                '<label class="r34-check"><input type="checkbox" id="r34th-show-webm"> Show <b>webm</b>/mp4/gif thumbnails even while the blacklist is <b>active</b> (unticked = they are hidden together with the tag rules)</label>',
                '<textarea id="r34th-rules-text"></textarea>',
            ].join(''), [
                { label: 'Cancel' },
                { label: 'Save', afterClose: (_, ov) => {
                    const ta = ov.querySelector('#r34th-rules-text');
                    const cb = ov.querySelector('#r34th-show-webm');
                    // Ausnahme im selben (eingefrorenen) Profil speichern
                    setShowWebmFor(prof, !!(cb && cb.checked));
                    saveRules(parseRulesInput(ta ? ta.value : ''), prof);
                    reapply();
                } },
            ]);
            const ta = overlay.querySelector('#r34th-rules-text');
            ta.value = rulesFor(prof).map(astToText).filter(Boolean).join('\n');
            const cb = overlay.querySelector('#r34th-show-webm');
            if (cb) cb.checked = showWebmFor(prof);
        };
        const openCookieDialog = () => {
            const prof = profile(); // Profil beim Öffnen einfrieren
            const cookie = getTagsFromCookie();
            if (!cookie.length) { alert("Kein 'tag_blacklist' Cookie gefunden oder Liste ist leer."); return; }
            const currentSet = new Set();
            rulesFor(prof).forEach(ast => { const toks = []; walkTokens(ast, toks); toks.forEach(t => currentSet.add(t)); });
            const cookieSet = new Set(cookie);
            const inBoth = [], onlyCookie = [], onlyLocal = [];
            cookie.forEach(t => currentSet.has(t) ? inBoth.push(t) : onlyCookie.push(t));
            currentSet.forEach(t => { if (!cookieSet.has(t)) onlyLocal.push(t); });
            const pills = arr => arr.length ? arr.slice(0, 60).map(t => '<span class="r34-pill">' + escapeHtml(t) + '</span>').join('') + (arr.length > 60 ? ' <span class="r34-pill">+' + (arr.length - 60) + '</span>' : '') : '<span style="color:#888">—</span>';
            buildModal('Import from cookie', [
                '<div class="hint">Cookie tags: <b>' + cookie.length + '</b> · Local rules: <b>' + currentSet.size + '</b><br>',
                '<span style="color:#7c7">' + inBoth.length + ' in both</span> · <span style="color:#6cf">' + onlyCookie.length + ' only in cookie</span> · <span style="color:#fc6">' + onlyLocal.length + ' only local</span></div>',
                '<div class="hint">Tags only in cookie (would be added):</div><div class="r34-tag-list">' + pills(onlyCookie) + '</div>',
                '<div class="hint">Replace = cookie wins · Merge = union · Cancel = keep as is.</div>',
            ].join(''), [
                { label: 'Cancel' },
                { label: 'Replace', afterClose: () => { saveRules(parseRulesInput(cookie.join('\n')), prof); reapply(); } },
                { label: 'Merge (union)', afterClose: () => { const m = new Set(); currentSet.forEach(t => m.add(t)); cookie.forEach(t => m.add(t)); saveRules(parseRulesInput(Array.from(m).join('\n')), prof); reapply(); } },
            ]);
        };

        const HIDDEN_ATTR = 'r34thHiderHidden';
        const PROCESSED_ATTR = 'r34thHiderProcessed';
        const ORIGINAL_DISPLAY_ATTR = 'r34thHiderOriginalDisplay';
        const PARSED_SCRIPT_ATTR = 'r34thHiderParsed';
        const PARSED_SIGNATURE_ATTR = 'r34thHiderSignature';
        let viewCheck = null;

        const getThumbCache = () => window.__r34thFavCache || (window.__r34thFavCache = {});
        const getTagsFromTitle = title => String(title || '').split(/\s+/).map(normalizeTag).filter(Boolean);
        const parseFavScripts = cache => {
            document.querySelectorAll('script').forEach(script => {
                const scriptText = script.textContent || '';
                if (script.dataset[PARSED_SCRIPT_ATTR] === '1' && script.dataset[PARSED_SIGNATURE_ATTR] === scriptText) return;
                let parsedAny = false;
                try {
                    const matches = scriptText.matchAll(/posts\[(\d+)\]\s*=\s*\{[^}]*['"]?tags['"]?\s*:\s*["']([^"']+)["']/g);
                    for (const m of matches) { cache[m[1]] = getTagsFromTitle(m[2]); parsedAny = true; }
                } catch { /* skip script */ }
                if (parsedAny) script.dataset[PARSED_SCRIPT_ATTR] = '1';
                if (parsedAny) script.dataset[PARSED_SIGNATURE_ATTR] = scriptText;
            });
        };
        const getThumbId = thumb => {
            let id = null;
            if (thumb.id && thumb.id.indexOf('p') === 0) id = thumb.id.slice(1);
            if (!id) {
                const a = thumb.querySelector('a[href*="page=post"][href*="id="]');
                if (a) { try { id = new URL(a.href, location.origin).searchParams.get('id'); } catch { id = null; } }
            }
            return id;
        };
        // Cache-first + Titel-Capture: einmal gesehene Tags bleiben für Toggles erhalten
        const getThumbTags = (thumb, cache) => {
            const id = getThumbId(thumb);
            if (id && cache[id]) return cache[id];
            const media = thumb.querySelector('img, video');
            if (media) {
                // alt als Fallback, damit der Tag-Hider unabhängig von removeThumbTitles
                // funktioniert (title wird von der Option entfernt, alt bleibt erhalten).
                const t = (media.title || media.alt || '').trim();
                if (t) {
                    const parsed = getTagsFromTitle(t);
                    if (parsed.length) { if (id) cache[id] = parsed; return parsed; }
                }
            }
            return null;
        };
        // Inkrementeller Spiegel versteckter Elemente (ersetzt Voll-Dokument-Scans)
        let hiddenElements = new Set();
        const hideElement = el => {
            if (!el || el.dataset[HIDDEN_ATTR] === '1') return;
            el.dataset[ORIGINAL_DISPLAY_ATTR] = el.style.display || '';
            el.dataset[HIDDEN_ATTR] = '1';
            el.style.display = 'none';
            hiddenElements.add(el);
        };
        const restoreHiddenElements = () => {
            hiddenElements.forEach(el => {
                if (!el.isConnected) return; // wurde inzwischen extern aus dem DOM entfernt
                el.style.display = el.dataset[ORIGINAL_DISPLAY_ATTR] || '';
                delete el.dataset[HIDDEN_ATTR];
                delete el.dataset[ORIGINAL_DISPLAY_ATTR];
            });
            hiddenElements.clear();
        };
        const getHiddenCount = () => {
            // Nur noch im DOM befindliche zählen; verwaiste Einträge aufräumen
            let n = 0;
            hiddenElements.forEach(el => {
                if (el.isConnected) n++;
                else hiddenElements.delete(el);
            });
            return n;
        };
        // --- WEBM/MP4/GIF-THUMBS (an die Blacklist gekoppelt) ---
        // Verhalten wie die Tags: "Blacklist ON🟢" blendet die Anim-Thumbs mit aus,
        // "Blacklist OFF🔴" zeigt sie wieder normal. Abweichend vom ursprünglichen
        // Standalone-Script wird hier NICHT aus dem DOM entfernt, sondern wie bei
        // den Tag-Regeln über display:none ausgeblendet – nur so lässt sich der
        // Zustand per Toggle/Ausnahme-Checkbox verlustfrei zurücksetzen.
        const WEBM_IMG_SELECTOR = 'img.webm-thumb';
        let webmStyleEl = null;
        // Ziel-Element: auf Favoriten-Seiten steckt der Post in einem äußeren
        // Wrapper-<span> (gleiche Logik wie bei den Tag-Regeln) – dort muss der
        // Wrapper verschwinden, sonst bleibt eine Lücke im Grid.
        const getWebmHideTarget = thumb => {
            const parent = thumb.parentElement;
            return (parent && !parent.classList.contains('image-list') && parent.tagName === 'SPAN') ? parent : thumb;
        };
        const syncWebmCss = () => {
            if (!webmStyleEl) return;
            const css = shouldHideWebm() ? WEBM_HIDE_CSS : '';
            if (webmStyleEl.textContent !== css) webmStyleEl.textContent = css;
        };
        const ensureWebmStyle = () => {
            if (!webmStyleEl || !webmStyleEl.isConnected) {
                const root = document.head || document.documentElement;
                if (!root) return;
                webmStyleEl = document.createElement('style');
                webmStyleEl.id = 'r34th-webm-hide';
                root.appendChild(webmStyleEl);
            }
            syncWebmCss();
        };
        // true, wenn dieses Thumb wegen webm/mp4/gif versteckt wurde
        const hideWebmThumb = thumb => {
            if (!thumb || !shouldHideWebm()) return false;
            if (!thumb.querySelector(WEBM_IMG_SELECTOR)) return false;
            hideElement(getWebmHideTarget(thumb));
            return true;
        };
        const clearProcessedState = () => {
            document.querySelectorAll('[data-r34th-hider-processed="1"]').forEach(el => delete el.dataset[PROCESSED_ATTR]);
            document.querySelectorAll('script[data-r34th-hider-parsed]').forEach(script => {
                delete script.dataset[PARSED_SCRIPT_ATTR];
                delete script.dataset[PARSED_SIGNATURE_ATTR];
            });
        };
        const processListPage = candidateThumbs => {
            if (!enabled) return;
            const cache = getThumbCache();
            parseFavScripts(cache);
            const thumbs = candidateThumbs || document.querySelectorAll(".thumb:not([data-r34th-hider-processed='1'])");
            for (let i = 0; i < thumbs.length; i++) {
                const thumb = thumbs[i];
                if (!thumb || !thumb.isConnected || thumb.dataset[PROCESSED_ATTR] === '1') continue;
                // webm/mp4/gif zuerst und VOR der Tag-Prüfung: Anim-Thumbs haben
                // nicht immer verwertbare Tags in alt/title und würden sonst per
                // 'continue' komplett übersprungen.
                if (hideWebmThumb(thumb)) { thumb.dataset[PROCESSED_ATTR] = '1'; continue; }
                const postTags = getThumbTags(thumb, cache);
                if (!postTags) continue;
                thumb.dataset[PROCESSED_ATTR] = '1';
                if (anyRuleMatches(compiled, postTags)) hideElement(thumb);
            }
        };
        const processFavoritesPage = () => {
            if (!enabled) return;
            const cache = getThumbCache();
            parseFavScripts(cache);
            // Cookie-Blacklist (eigene tag_blacklist) nur auf fremden Favoriten-Seiten anwenden
            const cookieRules = isForeignFavoritesPage() ? getCookieBlacklistCompiled() : null;
            const slots = document.querySelectorAll('a[href*="page=post"][href*="id="]');
            for (let i = 0; i < slots.length; i++) {
                const a = slots[i];
                const slot = a.closest('.thumb');
                if (!slot || slot.dataset[PROCESSED_ATTR] === '1') continue;
                const id = getThumbId(slot);
                if (!id) continue;
                // webm/mp4/gif zuerst und VOR der Tag-Prüfung: Anim-Thumbs haben
                // nicht immer verwertbare Tags in alt/title (siehe processListPage).
                if (hideWebmThumb(slot)) { slot.dataset[PROCESSED_ATTR] = '1'; continue; }
                const postTags = getThumbTags(slot, cache);
                if (!postTags) continue;
                slot.dataset[PROCESSED_ATTR] = '1';
                if (anyRuleMatches(compiled, postTags) || (cookieRules && anyRuleMatches(cookieRules, postTags))) {
                    const parentSpan = slot.parentElement;
                    hideElement(parentSpan && parentSpan.tagName === 'SPAN' ? parentSpan : slot);
                }
            }
        };
        const processViewPage = () => {
            let dir = 'next';
            const nextLink = document.getElementById('next_search_link');
            const prevLink = document.getElementById('prev_search_link');
            if (nextLink) nextLink.addEventListener('mousedown', () => { dir = 'next'; });
            if (prevLink) prevLink.addEventListener('mousedown', () => { dir = 'prev'; });
            viewCheck = () => {
                if (!enabled) return;
                const tagList = document.getElementById('tag-sidebar');
                const img = document.getElementById('image');
                if (!tagList || !img) return;
                const anchors = tagList.querySelectorAll('li a');
                if (!anchors.length) return;
                const tags = [];
                anchors.forEach(a => tags.push(normalizeTag(a.textContent)));
                let postId = '';
                try { postId = new URL(location.href).searchParams.get('id') || ''; } catch { /* ignore */ }
                const media = img.currentSrc || img.src || img.getAttribute('src') || '';
                const signature = postId + '\u001f' + media + '\u001f' + tags.join('\u001e');
                if (img.dataset.r34thHiderSignature === signature) return;
                img.dataset.r34thHiderSignature = signature;
                img.style.visibility = '';
                if (anyRuleMatches(compiled, tags)) {
                    img.style.visibility = 'hidden';
                    const target = dir === 'next' ? nextLink : prevLink;
                    if (target && target.href && !target.href.endsWith('#')) { try { target.click(); } catch { /* ignore */ } }
                }
            };
            const root = document.getElementById('post-view') || document.body;
            const obs = new MutationObserver(makeCoalesced(viewCheck));
            obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'alt', 'src'] });
            observers.push(obs);
            viewCheck();
        };
        const reapply = () => {
            // VOR restoreHiddenElements: das !important-CSS muss zuerst weg, sonst
            // bleiben die Thumbs trotz wiederhergestelltem display:none unsichtbar.
            syncWebmCss();
            restoreHiddenElements();
            clearProcessedState();
            const r = getRoute();
            if (r.isPostView) {
                const img = document.getElementById('image');
                if (img) { img.style.visibility = ''; delete img.dataset.r34thHiderSignature; }
            }
            if (!enabled) { refreshBlacklistedSidebar(); return; }
            if (r.isFavoritesPage) processFavoritesPage();
            else if (r.section === 'list' || !r.page) processListPage();
            else if (r.isPostView && viewCheck) viewCheck();
            refreshBlacklistedSidebar();
        };
        const processAll = () => {
            if (!enabled) return;
            const r = getRoute();
            if (r.isFavoritesPage) processFavoritesPage();
            else if (r.section === 'list' || !r.page) processListPage();
            else if (r.isPostView) { if (!viewCheck) processViewPage(); else viewCheck(); }
        };
        const toggle = () => {
            // Fest deaktivierte Routen können nicht eingeschaltet werden
            if (isRouteLockedOff()) return false;
            enabled = !enabled;
            setEnabledFor(profile(), enabled);
            reapply();
            updatePanelState();
            return enabled;
        };

        const observerOptions = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'alt', 'src'] };
        const makeCoalesced = fn => { let q = false; return () => { if (q) return; q = true; Promise.resolve().then(() => { q = false; fn(); }); }; };
        const makeMutationCoalesced = fn => { let q = false; let pending = []; return mutations => { if (mutations && mutations.length) pending.push.apply(pending, mutations); if (q) return; q = true; Promise.resolve().then(() => { const batch = pending; pending = []; q = false; fn(batch); }); }; };
        const collectMutationThumbs = mutations => {
            const found = new Set();
            (mutations || []).forEach(mutation => {
                const candidates = mutation.type === 'attributes' ? [mutation.target]
                : mutation.type === 'characterData' ? [mutation.target && mutation.target.parentElement]
                : Array.from(mutation.addedNodes || []);
                candidates.forEach(node => {
                    if (!node || node.nodeType !== 1) return;
                    const thumb = node.matches && node.matches('.thumb') ? node : (node.closest ? node.closest('.thumb') : null);
                    if (thumb) found.add(thumb);
                    if (node.querySelectorAll) node.querySelectorAll('.thumb').forEach(n => found.add(n));
                });
                if (mutation.type === 'childList' && mutation.target && mutation.target.closest) {
                    const parentThumb = mutation.target.closest('.thumb');
                    if (parentThumb) found.add(parentThumb);
                }
            });
            return Array.from(found);
        };
        let observersInitialized = false;
        // Aktueller Routen-Observer (Liste ODER Favoriten). Bei SPA-Navigation wird
        // er abgehängt und für die neue Route neu aufgebaut – sonst bliebe z.B. nach
        // dem Start auf einer Post-Ansicht (gesperrt, kein Observer) die ganze
        // Session über kein Tag-Hider-Observer aktiv.
        let routeObserver = null;
        const detachRouteObserver = () => {
            if (!routeObserver) return;
            try { routeObserver.disconnect(); } catch { /* ignore */ }
            const idx = observers.indexOf(routeObserver);
            if (idx !== -1) observers.splice(idx, 1);
            routeObserver = null;
        };
        const initObservers = (options = {}) => {
            // Idempotent, solange nicht explizit neu aufgebaut werden soll –
            // reloadForRoute() ruft mit { force: true } auf (SPA-Navigation).
            if (observersInitialized && !options.force) return;
            if (options.force) detachRouteObserver();
            observersInitialized = true;
            const r = getRoute();
            if (r.section === 'list' || !r.page) {
                routeObserver = new MutationObserver(makeMutationCoalesced(ms => { const cands = collectMutationThumbs(ms); if (cands.length) processListPage(cands); }));
                routeObserver.observe(document.documentElement, observerOptions);
                observers.push(routeObserver);
                processListPage();
                refreshBlacklistedSidebar();
            } else if (r.isFavoritesPage) {
                routeObserver = new MutationObserver(makeMutationCoalesced(ms => {
                    const relevant = (ms || []).some(m => m.type === 'attributes'
                                                     ? !!(m.target.closest && m.target.closest('.thumb'))
                                                     : m.type === 'characterData'
                                                     ? !!(m.target.parentElement && m.target.parentElement.closest('script, .thumb'))
                                                     : Array.from(m.addedNodes || []).some(n => n.nodeType === 1 && (n.matches && (n.matches('.thumb, script, a[href*="page=post"]') || n.querySelector('.thumb, script, a[href*="page=post"]')))));
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

export { TAG };
