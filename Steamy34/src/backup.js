// backup – Steamy34 (aus Steamy34.js aufgeteilt)
import { AUTO_KEY } from './auto-next.js';
import { BL_TIMES_KEY, getBlTimes, getSoftTags, readBlocklist, setSoftTag, writeBlocklist } from './blacklist.js';
import { COLL_KEY, getCollections } from './collections.js';
import { SETTINGS_KEY } from './config.js';
import { DLTHUMBS_KEY, getDlThumbs } from './downloads-window.js';
import { saveBlob } from './downloads/names.js';
import { DOWNLOADED_KEY, UNSEEN_KEY, VIEWED_KEY, getUnseen, loadDownloaded, loadViewed } from './downloads/state.js';
import { FAVS_KEY, getFavs } from './favourites.js';
import { getFollowing, isFollowed, saveFollowing } from './following.js';
import { VOTES_KEY } from './post-info.js';
import { getSavedSearches, isSavedSearch, normQuery, saveSavedSearches } from './saved-searches.js';
import { FAVTAGS_KEY, HISTORY_KEY, HISTORY_MAX, addToHistory, getPins, getStoredList, setPins } from './search.js';
import { DLHIST_KEY, DLHIST_LIMIT, getDlHistory } from './stats.js';
import { TAGTYPE_KEY, showToast, tagTypes } from './tag-bar.js';
import { VIDEO_KEY, getVideoPrefs } from './video.js';
import { THEATER_KEY } from './window-shell.js';

function exportBackup() {
	const data = {
		app: 'Steamy34',
		exported: new Date().toISOString(),
		settings: GM_getValue(SETTINGS_KEY, {}),
		history: getStoredList(HISTORY_KEY),
		favTags: getStoredList(FAVTAGS_KEY),
		pinnedFilters: getPins(),
		collections: getCollections(),
		downloadHistory: getDlHistory(),
		downloaded: loadDownloaded(),
		viewed: loadViewed(),
		favs: getFavs(),
		votes: GM_getValue(VOTES_KEY, {}) || {},
		video: getVideoPrefs(),
		autoNext: GM_getValue(AUTO_KEY, {}) || {},
		theater: GM_getValue(THEATER_KEY, false) === true,
		blacklist: readBlocklist(),
		blacklistDates: getBlTimes(),
		blurTags: Array.from(getSoftTags()), // (Beta 3.11.1: "blur instead of hide")
		tagTypes: Object.fromEntries(tagTypes),
		following: getFollowing(),
		savedSearches: getSavedSearches(),
		downloadPictures: getDlThumbs(), // (Beta 3.9: the Downloads window's pictures)
		notViewed: getUnseen()           // (downloaded posts you switched to "not viewed")
	};
	const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
	saveBlob(blob, 'Steamy34_backup_' + new Date().toISOString().slice(0, 10) + '.json');
	showToast('Backup saved to your downloads.');
}

const FLASH_KEY = 's34_flash';

function reloadWithMessage(text) {
	try { sessionStorage.setItem(FLASH_KEY, text); } catch (e) {}
	location.reload();
}

function showFlashMessage() {
	let text = null;
	try { text = sessionStorage.getItem(FLASH_KEY); sessionStorage.removeItem(FLASH_KEY); } catch (e) {}
	if (text) showToast(text, null, null, 8000);
}

function askImportMode(d) {
	return new Promise(resolve => {
		const when = d.exported ? new Date(d.exported).toLocaleDateString() : 'an unknown date';
		const overlay = document.createElement('div');
		overlay.className = 's34-overlay s34-confirm-overlay';
		overlay.innerHTML = `
                <div class="s34-confirm" role="dialog" aria-modal="true">
                    <div class="s34-confirm-icon">⇄</div>
                    <div class="s34-confirm-title">Combine this backup?</div>
                    <div class="s34-confirm-text">From ${when}. Everything in it – searches, follows, saved searches, collections, viewed / downloaded marks, favourites and the blacklist – is <b>added</b> to what's here. Nothing here is removed, so you can go back and forth between two devices.</div>
                    <label class="s34-confirm-check"><input type="checkbox"> Also use the backup's settings (look, keys, switches) – otherwise this device keeps its own</label>
                    <div class="s34-confirm-foot">
                        <button type="button" class="s34-btn" data-act="no">Cancel</button>
                        <button type="button" class="s34-btn s34-primary" data-act="yes">Combine</button>
                    </div>
                </div>`;
		const check = overlay.querySelector('input[type="checkbox"]');
		const done = v => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
		const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); } };
		overlay.addEventListener('click', e => {
			const act = e.target.closest('[data-act]');
			if (act) done(act.dataset.act === 'yes' ? (check.checked ? 'settings' : 'combine') : null);
			else if (e.target === overlay) done(null);
		});
		document.addEventListener('keydown', onKey, true);
		document.body.appendChild(overlay);
		overlay.querySelector('[data-act="yes"]').focus();
	});
}

function importBackup() {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.json,application/json';
	input.addEventListener('change', async () => {
		const file = input.files && input.files[0];
		if (!file) return;
		let d;
		try { d = JSON.parse(await file.text()); } catch (e) { d = null; }
		if (!d || d.app !== 'Steamy34') {
			showToast('That file isn\'t a Steamy34 backup – pick the "Steamy34_backup_….json" file.', null, null, 9000);
			return;
		}
		// (Beta 3.9) Importing combines: the file is added to what's here, so two
		// devices can be kept in step by going back and forth. Settings stay
		// this device's own - unless you choose to take them over too.
		const choice = await askImportMode(d);
		if (!choice) return;

		const obj = x => (x && typeof x === 'object' && !Array.isArray(x)) ? x : {};
		const arr = x => Array.isArray(x) ? x : [];

		const takeSettings = choice === 'settings';
		if (d.settings && takeSettings) GM_setValue(SETTINGS_KEY, obj(d.settings));
		try {
			const pics = getDlThumbs();
			Object.entries(obj(d.downloadPictures)).forEach(([id, src]) => { if (!pics[id] && typeof src === 'string') pics[id] = src; });
			GM_setValue(DLTHUMBS_KEY, pics);
			GM_setValue(UNSEEN_KEY, Object.assign({}, obj(d.notViewed), getUnseen()));
		} catch (e) {}

		const hist = getStoredList(HISTORY_KEY);
		arr(d.history).forEach(q => { if (typeof q === 'string' && !hist.includes(q)) hist.push(q); });
		GM_setValue(HISTORY_KEY, hist.slice(0, HISTORY_MAX));

		const favTags = getStoredList(FAVTAGS_KEY);
		const favLower = new Set(favTags.map(t => String(t).toLowerCase()));
		arr(d.favTags).forEach(t => {
			if (typeof t === 'string' && t && !favLower.has(t.toLowerCase())) { favTags.push(t); favLower.add(t.toLowerCase()); }
		});
		GM_setValue(FAVTAGS_KEY, favTags);
		if (d.pinnedFilters) setPins(obj(d.pinnedFilters));

		// Collections: add the ones you don't have; same name -> posts merged
		// (their note, cover and order come along - this device's win if it has one)
		const colls = getCollections();
		const extras = c => { const x = {}; if (typeof c.note === 'string' && c.note) x.note = c.note.slice(0, 500); if (c.cover) x.cover = c.cover; if (typeof c.sort === 'string') x.sort = c.sort; return x; };
		arr(d.collections).forEach(c => {
			if (!c || !c.name || !Array.isArray(c.posts)) return;
			const same = colls.find(x => x.name === c.name);
			if (same) {
				c.posts.forEach(p => { if (p && p.id && !same.posts.some(q => q.id === p.id)) same.posts.push(p); });
				Object.entries(extras(c)).forEach(([k, v]) => { if (same[k] == null || same[k] === '') same[k] = v; });
			} else colls.push(Object.assign({ id: c.id || 'c' + Date.now().toString(36) + colls.length, name: c.name, created: c.created || Date.now(), posts: c.posts.filter(p => p && p.id) }, extras(c)));
		});
		GM_setValue(COLL_KEY, colls);

		const dlHist = getDlHistory();
		const have = new Set(dlHist.map(h => h.id));
		arr(d.downloadHistory).forEach(h => { if (h && h.id && !have.has(h.id)) dlHist.push(h); });
		dlHist.sort((a, b) => (b.time || 0) - (a.time || 0));
		GM_setValue(DLHIST_KEY, dlHist.slice(0, DLHIST_LIMIT));

		GM_setValue(DOWNLOADED_KEY, Object.assign({}, obj(d.downloaded), loadDownloaded()));
		GM_setValue(VIEWED_KEY, Object.assign({}, obj(d.viewed), loadViewed()));
		GM_setValue(FAVS_KEY, Object.assign({}, obj(d.favs), getFavs()));
		GM_setValue(VOTES_KEY, Object.assign({}, obj(d.votes), GM_getValue(VOTES_KEY, {}) || {}));
		// (Beta 3.11.1) video options, the Auto next timer and theater mode are
		// settings too: only taken over when you ticked that box
		if (takeSettings) {
			if (d.video) GM_setValue(VIDEO_KEY, obj(d.video));
			if (d.autoNext) GM_setValue(AUTO_KEY, obj(d.autoNext));
			if (typeof d.theater === 'boolean') GM_setValue(THEATER_KEY, d.theater);
		}
		try {
			GM_setValue(TAGTYPE_KEY, Object.assign({}, obj(d.tagTypes), GM_getValue(TAGTYPE_KEY, {}) || {}));
		} catch (e) {}

		const bl = readBlocklist();
		const lower = new Set(bl.map(t => t.toLowerCase()));
		arr(d.blacklist).forEach(t => {
			if (typeof t === 'string' && t && !lower.has(t.toLowerCase())) { bl.push(t); lower.add(t.toLowerCase()); }
		});
		writeBlocklist(bl);
		// Restore the real "blacklisted on" dates (writeBlocklist just stamped them "now")
		GM_setValue(BL_TIMES_KEY, Object.assign(getBlTimes(), obj(d.blacklistDates)));
		arr(d.blurTags).forEach(t => { if (typeof t === 'string' && t) setSoftTag(t, true); });

		// Following: add the artists you don't follow yet. Searches from older
		// backups (followed searches, "saved" searches) go into Recent - since
		// Beta 3.6 only artists are followed
		const inArtists = d.following && (Array.isArray(d.following.artists) ? d.following.artists
										  : Array.isArray(d.following.tags) ? d.following.tags.filter(t => t && (!t.type || t.type === 'artist')) : null);
		if (inArtists) {
			const fol = getFollowing();
			inArtists.forEach(t => {
				if (t && typeof t.tag === 'string' && t.tag && !isFollowed(t.tag, fol)) {
					fol.artists.push({ tag: t.tag.toLowerCase(), added: t.added || Date.now(), seen: 0, latest: 0, count: 0, more: false });
				}
			});
			saveFollowing(fol);
		}
		// Saved searches (Beta 3.7): add the ones you don't have yet
		const savedNow = getSavedSearches();
		arr(d.savedSearches).forEach(s => {
			if (s && typeof s.query === 'string' && normQuery(s.query) && !isSavedSearch(s.query, savedNow)) savedNow.push(Object.assign({}, s, { query: normQuery(s.query), count: 0, more: false }));
		});
		saveSavedSearches(savedNow);
		arr(d.following && d.following.searches).concat(arr(d.saved))
			.map(s => s && typeof s.query === 'string' ? s.query : '').filter(Boolean).reverse().forEach(addToHistory);
		reloadWithMessage(choice === 'settings'
						  ? 'Backup combined – its settings are used here now, and everything else was added to what you had.'
						  : 'Backup combined – searches, follows, collections, marks and the blacklist from the file were added. Your settings here stayed as they were.');
	});
	input.click();
}

export { exportBackup, importBackup, reloadWithMessage, showFlashMessage };
