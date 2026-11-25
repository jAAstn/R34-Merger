// init – Steamy34 (aus Steamy34.js aufgeteilt)
import { SITE_PAGE, keepPostsMenuOnFavourites, markCurrentSubnav, rememberPostsRow, setupAccountHome, setupOptionsPage, syncSiteSwitches } from './account.js';
import { foldEmptyAdColumn, hideListTagsHeading, hideSidebarImagesBelowTags } from './ads.js';
import { showFlashMessage } from './backup.js';
import { batchRunning, selectMode, toggleSelected } from './batch.js';
import { addBlacklistButton } from './blacklist-window.js';
import { addBlocklistButtons, repairBlacklistCookie } from './blacklist.js';
import { setupScreenshotMode } from './censored-mode.js';
import { CURRENT_VERSION } from './changelog.js';
import { setupCollectionsSync } from './collections-sync.js';
import { CONFIG, isPhoneLayout, isPostView, onReady, params } from './config.js';
import { downloadOriginal, keyLabel } from './downloads/download.js';
import { MARKS_REV_KEY, loadDownloaded, loadViewed, marksRevSeen, rememberView, saveViewed, setMarksRevSeen, showDownloadedState, viewedSaveTimer } from './downloads/state.js';
import { addFavButtons, setupFavouritesPage } from './favourites.js';
import { closeFollowPopup, fwStep, openFollowFromAddress, openFollowPopup, setFwFromAddress } from './following-window.js';
import { FW_ALL, addFollowBox, addFollowButtonsToRows, checkFollowing, feedFromHash, followArtistByKey, fwKeyArtist, fwState, getFollowing, makeFollowButton, moveFollowedSearchesToRecent, setupFeedPage, updateTabBadge } from './following.js';
import { setupHome } from './home.js';
import { setupHoverInfo } from './hover-info.js';
import { rememberMediaHost, setupHoverPreview } from './hover.js';
import { setupInfiniteScroll } from './infinite-scroll.js';
import { addShuffleButton, explainEmptyPage, groupVariants, hideBlockedCommentPosts, hideExtraBlocklisted, onCommentsPage } from './list-actions.js';
import { checkPostBlocked, setupMedia } from './media.js';
import { setLastUserInputAt } from './pages.js';
import { addDownloadButton, setupPhoneMenu } from './phone-menu.js';
import { SPLASH_SVG, similarStripStep } from './popup-more.js';
import { browseDirection, closePopup, openPopup, popupDownload, popupState, popupStep } from './popup.js';
import { applyHideClasses, setupQuickPanel } from './quick-panel.js';
import { setupResume } from './resume.js';
import { addSavedBox, setupSavedSearchPage } from './saved-searches.js';
import { addSearchButtons, rememberSearch } from './search-box.js';
import { setupChipSearch } from './search-chips.js';
import { addPinsToLink, setupMultilineSearch, withPins } from './search.js';
import { addSettingsButton } from './settings-menu.js';
import { addHub, addPostCollectButton, arrangeSidebarTools } from './sidebar.js';
import { trimDlHistory } from './stats.js';
import { checkSiteShape, maybeAskForRating, noteProblem } from './support.js';
import { barsInView, flushTagTypes, learnTagTypes, lookupProgressAt, lookupQueue, lookupRunning, nearViewport, queueLookup, renderTagBar, runLookups, setLookupRunning, setupTagBars, showToast, tagBarContext } from './tag-bar.js';
import { injectStyles } from './theme.js';
import { setupThumbLongPress } from './thumb-buttons.js';
import { addThumbBadges, getOriginalUrl, removeTagTooltips, setThumbRatios } from './thumbs.js';
import { addTipsLink } from './tips.js';
import { setupPostVideoOptions } from './video.js';
import { maybeShowQuickTips } from './welcome.js';

injectStyles();

try {
	if (GM_getValue('steamy34_sfw', false) === true) {
		document.documentElement.classList.add('s34-sfw');
		if (CONFIG.censorComments) document.documentElement.classList.add('s34-sfw-text');
	}
} catch (e) {}

try {
	if (!isPostView && GM_getValue('steamy34_adblock_seen', false) === true) {
		document.documentElement.classList.add('s34-adcol-early');
	}
} catch (e) {}

window.addEventListener('pagehide', () => { if (viewedSaveTimer) { clearTimeout(viewedSaveTimer); saveViewed(); } });

window.addEventListener('focus', () => {
	if (!CONFIG.trackDownloads && !CONFIG.trackViewed) return;
	let rev = 0;
	try { rev = GM_getValue(MARKS_REV_KEY, 0); } catch (e) {}
	if (rev === marksRevSeen) return;
	setMarksRevSeen(rev);
	loadDownloaded();
	loadViewed();
	showDownloadedState();
});

document.addEventListener('keydown', function (event) {
	if (event.code !== CONFIG.downloadKey || event.ctrlKey || event.altKey ||
		event.metaKey || event.shiftKey || event.repeat) return;

	const t = event.target;
	if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
	if (document.querySelector('.s34-overlay:not(.s34-pv-overlay):not(.s34-under-popup)')) return; // settings etc. open

	if (popupState) {
		event.preventDefault();
		popupDownload();
	} else if (isPostView) {
		event.preventDefault();
		downloadOriginal();
	}
}, true);

if (isPostView) {
	document.documentElement.classList.add('s34-post-pending');
	setTimeout(() => document.documentElement.classList.remove('s34-post-pending'), 5000); // (never stuck hidden)
}

if (isPostView) onReady(() => setTimeout(checkPostBlocked, 0));

if (isPostView) onReady(setupMedia);

['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t =>
														  window.addEventListener(t, () => { setLastUserInputAt(Date.now()); }, { capture: true, passive: true }));

document.addEventListener('mousedown', addPinsToLink, true);

document.addEventListener('click', addPinsToLink, true);

(function applyPinsOnArrival() {
	if (isPostView || params.get('page') !== 'post' || params.get('s') !== 'list' || params.get('pid')) return;
	if (feedFromHash(location.hash)) return; // an old Following page: opens the Following window instead
	const q = (params.get('tags') || '').trim();
	const next = withPins(q === 'all' ? '' : q);
	if (next === q) return;
	const target = location.pathname + '?page=post&s=list&tags=' + encodeURIComponent(next);
	try {
		if (sessionStorage.getItem('s34_pin_redirect') === target) return; // already tried
		sessionStorage.setItem('s34_pin_redirect', target);
	} catch (e) { return; }
	location.replace(target);
})();

try { repairBlacklistCookie(); } catch (e) { console.warn('[Steamy34] Blacklist cookie:', e); }

if (onCommentsPage) {
	document.documentElement.classList.add('s34-cm-pending');
	setTimeout(() => document.documentElement.classList.remove('s34-cm-pending'), 5000);
}

if (onCommentsPage) onReady(() => setTimeout(hideBlockedCommentPosts, 0));

onReady(() => setTimeout(() => { try { addShuffleButton(); } catch (e) {} }, 50));

onReady(() => setTimeout(() => { try { explainEmptyPage(); } catch (e) {} }, 0));

try { hideExtraBlocklisted(); } catch (e) { console.warn('[Steamy34] Blacklist:', e); }

onReady(() => setTimeout(() => groupVariants(Array.from(document.querySelectorAll('.image-list span.thumb'))).catch(() => {}), 300));

window.addEventListener('pagehide', flushTagTypes);

document.addEventListener('visibilitychange', () => { if (document.hidden) flushTagTypes(); });

setInterval(() => {
	if (!CONFIG.thumbTagBar || !CONFIG.tagBarLookup || isPostView || document.hidden) return;

	// Watchdog: queue has work but isn't running, or hasn't moved in 30s -> restart it
	if (lookupQueue.length && (!lookupRunning || Date.now() - lookupProgressAt > 30000)) {
		if (lookupRunning) console.warn('[Steamy34] Tag lookups were stuck - restarting.');
		setLookupRunning(false);
		runLookups();
	}

	// Only the thumbnails on screen (not every loaded one)
	let ctx = null;
	barsInView.forEach(thumb => {
		if (!thumb.isConnected) { barsInView.delete(thumb); return; }
		if (thumb.dataset.s34Lookup || !nearViewport(thumb, 0)) return;
		const state = renderTagBar(thumb, ctx || (ctx = tagBarContext()));
		if (!state.hasArtist && state.hasUnknown) queueLookup(thumb);
	});
}, 4000);

window.addEventListener('error', e => {
	const where = (e.filename || '') + ' ' + ((e.error && e.error.stack) || '');
	if (/steamy34|userscript|tampermonkey|violentmonkey|user\.js/i.test(where + ' ' + e.message)) noteProblem('Error: ' + e.message);
});

window.addEventListener('unhandledrejection', e => {
	const r = e.reason || {};
	const text = (r.stack || r.message || String(r));
	if (/steamy34|userscript|user\.js/i.test(text)) noteProblem('Unhandled: ' + (r.message || String(r)));
});

applyHideClasses();

document.addEventListener('click', e => {
	if (!selectMode) return;
	const thumb = e.target.closest('.image-list span.thumb');
	if (!thumb) return;
	e.preventDefault();
	e.stopImmediatePropagation();
	if (!batchRunning) toggleSelected(thumb);
}, true);

(function () {
	if (isPostView) return;
	const f = feedFromHash(location.hash);
	if (!f) return;
	setFwFromAddress(f.kind === 'all' ? FW_ALL : f.kind === 'artist' ? fwKeyArtist(f.tag) : null);
	try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
})();

window.addEventListener('popstate', () => {
	if (!fwState || !fwState.pushedHistory) return;
	if (history.state && history.state.s34fw) return; // back from the post viewer: still in the window
	closeFollowPopup(true);
});

document.addEventListener('keydown', e => {
	const t = e.target;
	if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
	if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
	if (popupState) return; // the post viewer has the keys (Esc closes it first)
	if (document.querySelector('.s34-overlay, .s34-cmenu, .s34-menu-overlay')) return; // a window or menu on top
	const toggleKey = e.code === CONFIG.followingKey && !e.shiftKey && !e.repeat;
	if (!fwState) {
		if (toggleKey) { e.preventDefault(); openFollowPopup(); }
		return;
	}
	if (e.key === 'Escape' || toggleKey) { e.preventDefault(); closeFollowPopup(); return; }
	const dir = browseDirection(e);
	if (dir) { e.preventDefault(); fwStep(dir); }
}, true);

if (CONFIG.sitePages && ['artist', 'wiki', 'alias', 'icame'].includes(SITE_PAGE) && !isPhoneLayout()) {
	document.documentElement.classList.add('s34-pg', 's34-pg-' + SITE_PAGE);
	const st = document.createElement('style');
	st.id = 's34-site-pages';
	st.textContent = `
            html.s34-pg table.highlightable { border-collapse: separate !important; border-spacing: 0 6px !important; width: 100% !important; max-width: 1100px; }
            html.s34-pg table.highlightable tr.tableheader th, html.s34-pg table.highlightable thead th { text-align: left; padding: 4px 14px !important; font: 600 11px/1.2 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 1px; color: var(--s34-muted, #999) !important; background: none !important; border: 0 !important; }
            html.s34-pg table.highlightable tr:not(.tableheader) td { padding: 10px 14px !important; background: var(--s34-panel, #1c1c20) !important; border-top: 1px solid var(--s34-border, #33333b) !important; border-bottom: 1px solid var(--s34-border, #33333b) !important; vertical-align: middle; }
            html.s34-pg table.highlightable tr:not(.tableheader) td:first-child { border-left: 1px solid var(--s34-border, #33333b) !important; border-radius: 10px 0 0 10px; }
            html.s34-pg table.highlightable tr:not(.tableheader) td:last-child { border-right: 1px solid var(--s34-border, #33333b) !important; border-radius: 0 10px 10px 0; }
            html.s34-pg table.highlightable tr:not(.tableheader):hover td { background: var(--s34-panel-2, #24242a) !important; }
            html.s34-pg table.highlightable a { text-decoration: none !important; }
            html.s34-pg-artist table.highlightable td:nth-child(2) a { font-size: 15px; font-weight: 700; }
            html.s34-pg-artist table.highlightable td:first-child { width: 96px; white-space: nowrap; }
            html.s34-pg-artist table.highlightable td:first-child a, html.s34-pg-artist .s34-pg-off { display: inline-block; min-width: 18px; margin-right: 3px; padding: 1px 6px; border-radius: 6px; border: 1px solid var(--s34-border, #33333b); font-size: 11px; text-align: center; }
            html.s34-pg-artist .s34-pg-off { opacity: .35; cursor: default; }
            html.s34-pg-artist .s34-pg-bell { margin-left: 8px; vertical-align: middle; }
            html.s34-pg-alias table.highlightable td:first-child::after { content: '→'; float: right; opacity: .5; font-weight: 700; }
            html.s34-pg-alias table.highlightable td:nth-child(3) { color: var(--s34-muted, #999) !important; font-style: italic; }
            html.s34-pg-alias details.s34-pg-add { margin: 14px 0; max-width: 1100px; }
            html.s34-pg-alias details.s34-pg-add summary { cursor: pointer; font-weight: 600; padding: 8px 0; }
            html.s34-pg-wiki table.highlightable td h3 { margin: 0; display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; border: 1px solid var(--s34-border, #33333b); color: var(--s34-muted, #999); }
            html.s34-pg-wiki table.highlightable td:nth-child(2) > a { font-size: 15px; font-weight: 700; }
            html.s34-pg-icame table.highlightable tr td { font-size: 14px; }
            html.s34-pg-icame table.highlightable tr td:first-child { width: 64px; text-align: center; font-weight: 800; }
            html.s34-pg-icame table.highlightable tr.s34-medal-1 td:first-child::before { content: '🥇 '; }
            html.s34-pg-icame table.highlightable tr.s34-medal-2 td:first-child::before { content: '🥈 '; }
            html.s34-pg-icame table.highlightable tr.s34-medal-3 td:first-child::before { content: '🥉 '; }
            html.s34-pg-icame table.highlightable td.s34-ic-count { position: relative; min-width: 200px; font-weight: 700; }
            html.s34-pg-icame td.s34-ic-count .s34-ic-bar { display: block; height: 6px; margin-top: 5px; border-radius: 99px; background: linear-gradient(90deg, #ff5f8f, #8b3dff); width: var(--p, 0%); }
            html.s34-pg-icame h1 .s34-ic-icon svg { width: 26px; height: 26px; vertical-align: -3px; margin-right: 8px; }
        `;
	(document.head || document.documentElement).appendChild(st);
	onReady(() => setTimeout(() => {
		try {
			if (SITE_PAGE === 'artist') {
				// rule34 writes "P" as plain text when an artist has no posts - same shape, greyed
				document.querySelectorAll('table.highlightable tr[id^="artist-"] td:first-child').forEach(td => {
					Array.from(td.childNodes).forEach(n => {
						if (n.nodeType !== 3 || !n.textContent.trim()) return;
						const sp = document.createElement('span');
						sp.className = 's34-pg-off';
						sp.textContent = n.textContent.trim();
						sp.title = 'No posts yet';
						n.replaceWith(sp);
					});
				});
				// a follow bell next to every artist
				const following = CONFIG.followButtons ? getFollowing() : null;
				if (following) document.querySelectorAll('table.highlightable tr[id^="artist-"] td:nth-child(2) a').forEach(a => {
					const tag = a.textContent.trim().toLowerCase().replace(/\s+/g, '_');
					if (!tag || a.parentElement.querySelector('.s34-pg-bell')) return;
					const b = makeFollowButton(tag, 's34-chip-follow s34-pg-bell', following);
					a.after(b);
				});
			}
			if (SITE_PAGE === 'alias') {
				// the "Add Alias" form folded away
				const head = Array.from(document.querySelectorAll('#content h2, #content h3, #content h4, #content h5')).find(h => /add alias/i.test(h.textContent));
				const form = head && (head.nextElementSibling && head.nextElementSibling.tagName === 'FORM' ? head.nextElementSibling : head.parentElement.querySelector('form:not([action*="search"])'));
				if (head && form) {
					const det = document.createElement('details');
					det.className = 's34-pg-add';
					det.innerHTML = '<summary>+ Suggest an alias</summary>';
					head.before(det);
					det.append(head, form);
				}
			}
			if (SITE_PAGE === 'icame') {
				const h1 = document.querySelector('h1');
				if (h1 && !h1.querySelector('.s34-ic-icon')) h1.insertAdjacentHTML('afterbegin', '<span class="s34-ic-icon">' + SPLASH_SVG + '</span>');
				const rows = Array.from(document.querySelectorAll('table.highlightable tbody tr')).filter(r => r.cells.length >= 3);
				const num = r => parseInt(String(r.cells[r.cells.length - 1].textContent).replace(/[^0-9]/g, ''), 10) || 0;
				const max = Math.max(1, ...rows.map(num));
				rows.forEach((r, i) => {
					if (i < 3) r.classList.add('s34-medal-' + (i + 1));
					const cell = r.cells[r.cells.length - 1];
					cell.classList.add('s34-ic-count');
					if (!cell.querySelector('.s34-ic-bar')) {
						const bar = document.createElement('span');
						bar.className = 's34-ic-bar';
						bar.style.setProperty('--p', Math.round(num(r) / max * 100) + '%');
						cell.appendChild(bar);
					}
					// the character: a click searches its posts
					const name = r.cells[1];
					if (name && !name.querySelector('a')) {
						const t = name.textContent.trim();
						if (t) { const a = document.createElement('a'); a.href = 'index.php?page=post&s=list&tags=' + encodeURIComponent(t.replace(/\s+/g, '_')); a.textContent = t; name.replaceChildren(a); }
					}
				});
			}
		} catch (e) { console.warn('[Steamy34] Page look:', e); }
	}, 0));
}

onReady(() => { try { rememberPostsRow(); keepPostsMenuOnFavourites(); markCurrentSubnav(); } catch (e) {} });

window.addEventListener('load', () => setTimeout(() => document.documentElement.classList.add('s34-nav-ready'), 50));

try { syncSiteSwitches(); } catch (e) { console.warn('[Steamy34] Site settings:', e); }

window.addEventListener('popstate', () => { if (popupState) closePopup(true); });

document.addEventListener('click', e => {
	if (isPostView) return;
	if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // ctrl/middle-click = normal
	if (e.target.closest('.s34-tagbar')) return; // tag chips keep their own clicks
	const a = e.target.closest('.image-list span.thumb a[href]');
	if (!a) return;
	e.preventDefault();
	e.stopPropagation();
	openPopup(a.closest('span.thumb'));
}, true);

document.addEventListener('keydown', e => {
	if (!popupState) return;
	const t = e.target;
	if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
	if (document.querySelector('.s34-overlay:not(.s34-under-popup)')) return; // settings / Cloudflare window on top
	if (document.querySelector('.s34-follow-menu')) return; // "Follow which artist?" handles its own keys
	if (e.key === 'Escape') { e.preventDefault(); closePopup(); return; }
	if (e.ctrlKey || e.metaKey || e.altKey) return;          // Ctrl+D etc. stay the browser's
	if (similarStripStep(e)) { e.preventDefault(); return; } // Shift + ← / →: through the Similar strip
	const dir = browseDirection(e);
	if (dir) { e.preventDefault(); popupStep(dir); return; }
	if (e.code === CONFIG.downloadKey || e.repeat) return;    // the download key wins
	const ov = document.querySelector('.s34-pv-overlay');
	if (!ov) return;
	// W / S scroll the picture & comments (when WASD is on)
	if (CONFIG.browseKeys !== 'arrows' && (e.code === 'KeyW' || e.code === 'KeyS')) {
		const main = ov.querySelector('.s34-pv-main');
		const scroller = main && main.scrollHeight > main.clientHeight + 4 ? main : ov;
		e.preventDefault();
		scroller.scrollBy({ top: (e.code === 'KeyS' ? 1 : -1) * Math.round(scroller.clientHeight * 0.7), behavior: 'smooth' });
		return;
	}
	// L (changeable): follow / unfollow the post's artist
	if (e.code === CONFIG.followKey) {
		e.preventDefault();
		const artists = ((popupState.tags && popupState.tags.artist) || []).map(a => (a && a.tag) || a).filter(a => typeof a === 'string' && a);
		if (!artists.length) { showToast('This post has no artist tag to follow.'); return; }
		// one artist: follow right away (with Undo); several: a small menu to choose
		followArtistByKey(artists, popupState.overlay.querySelector('.s34-chip-artist'));
		return;
	}
	// F / C / T (changeable): favourite, collection, theater mode
	const act = e.code === CONFIG.favKey ? 'fav' : e.code === CONFIG.collectKey ? 'collect' : e.code === CONFIG.theaterKey ? 'theater' : '';
	if (act) {
		const btn = ov.querySelector('.s34-pv-side [data-act="' + act + '"]') || ov.querySelector('[data-act="' + act + '"]');
		if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
	}
}, true);

onReady(() => {
	if (isPostView && CONFIG.showDownloadButton) addDownloadButton();
	if (CONFIG.hideListTags && !isPostView) {
		hideListTagsHeading();
		hideSidebarImagesBelowTags();
		// Banners are sometimes inserted late - check again
		window.addEventListener('load', hideSidebarImagesBelowTags);
		setTimeout(hideSidebarImagesBelowTags, 2000);
	}
	addSettingsButton();
	setupPhoneMenu();      // phones: one Menu button instead of the site's two ☰
	showFlashMessage();    // e.g. "Backup imported" after the reload
	if (!isPostView && CONFIG.infiniteScroll) setupInfiniteScroll();
	removeTagTooltips();
	moveFollowedSearchesToRecent(); // followed / saved searches -> Recent (once, Beta 3.6: Following is for artists)
	if (CONFIG.searchChips) setupChipSearch();
	else if (CONFIG.searchMultiline) setupMultilineSearch();
	setupQuickPanel();     // hide viewed / downloaded, size slider, select mode
	addBlacklistButton();  // opens the blacklist window
	addHub();              // Collections · Stats
	addFollowBox();        // "Following": artists with "N new" each (above Collections · Stats)
	addSavedBox();         // "Saved searches" under it (only once something is saved)
	// an old Following page address opens the Following window; a normal
	// search for a followed artist / search counts as a visit (NEW marks)
	if (!openFollowFromAddress()) { setupFeedPage(); setupSavedSearchPage(); }
	if (isPostView) addFollowButtonsToRows(); // bell next to artists
	setupHome();           // rule34's start page as a small home (search, continue, recent, following)
	setupAccountHome();    // My Account as tiles (rule34 · Steamy34 · Security)
	setupOptionsPage();    // Options in groups, the blacklist as tag bubbles
	setTimeout(() => checkFollowing(), 6000); // quiet "N new" count
	trimDlHistory();
	addPostCollectButton(); // single posts: "Save to collection"
	addTipsLink();         // "? Shortcuts & tips" under the settings button
	arrangeSidebarTools(); // Following above View; Collections · Stats · Blacklist · Settings as one 2×2 block
	maybeShowQuickTips();  // once: the most important keys & clicks
	setupScreenshotMode(); // Censored mode: X blurs every picture (safe screenshots)
	checkSiteShape();      // rule34 changed its layout? a calm note instead of half-working features
	maybeAskForRating();   // once ever, after a week of use
	setupResume();         // "Continue at page N" + remembers where you are
	updateTabBadge();      // "(12) rule34" while there are new posts
	if (isPostView) setupPostVideoOptions();
	if ((CONFIG.hoverPreview || CONFIG.hoverHighRes) && !isPostView) setupHoverPreview();
	if (CONFIG.blocklistButtons) addBlocklistButtons();
	rememberSearch();
	if (isPostView && CONFIG.addToSearchButtons) addSearchButtons();
	if (CONFIG.thumbGrid && CONFIG.thumbLayout === 'justified') setThumbRatios();
	if (CONFIG.thumbGrid && CONFIG.thumbBadges) addThumbBadges();
	if (isPostView) rememberView(params.get('id')); // opening a post = viewed
	showDownloadedState(); // ✓ / 👁 on posts you already downloaded / viewed
	addFavButtons();
	setupFavouritesPage(); // your favourites page: every ♥ filled, ♥ removes (the site's Remove links step aside)
	setupCollectionsSync(); // collections on all devices (opt-in): "Favourites & Collections", background checks
	setupThumbLongPress();  // phones: hold a thumbnail for its buttons (Beta 3.9.4)
	setupHoverInfo();
	learnTagTypes(document); // remember tag types from this page's tag list
	if (isPostView) {
		// Remember which server holds the media, for hover previews later
		const orig = getOriginalUrl();
		if (orig) rememberMediaHost(/\.(mp4|webm)(\?|$)/i.test(orig) ? 'video' : 'image', orig);
	}
	if (!isPostView && CONFIG.thumbTagBar) setupTagBars();
	if (!isPostView) foldEmptyAdColumn(); // empty ad column (ad blocker on) - checked right away
});

console.log('[Steamy34] ' + CURRENT_VERSION + ' loaded (steamycorner - https://linktr.ee/steamycorner).' +
			(isPostView ? ` Press ${keyLabel(CONFIG.downloadKey)} to download.` : ''));
