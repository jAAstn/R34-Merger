// privacy – Steamy34 (aus Steamy34.js aufgeteilt)
import { exportBackup, reloadWithMessage } from './backup.js';
import { setDownloaded, setViewed, showDownloadedState } from './downloads/state.js';
import { LOCK_SVG } from './settings-menu.js';
import { showToast, tagTypes } from './tag-bar.js';

const STORED_DATA = [
	['steamy34_settings', 'Settings', 'Your choices in this menu and the sidebar switches', {}],
	['steamy34_following', 'Following', 'Artists you follow, and the newest post you\'ve seen from each', {}],
	['steamy34_history', 'Recent searches', 'Your last searches', []],
	['steamy34_api', 'Your rule34 API key', 'Only if you added one (Settings → API key) – sent to rule34\'s own API only, never in a backup', {}],
	['steamy34_saved_searches', 'Saved searches', 'Searches you saved with the disk button, and the newest post seen in each', []],
	['steamy34_resume', 'Where you left off', 'The page you were on per search, for "Continue at page N" (kept 24 hours)', {}],
	['steamy34_favtags', 'Favourite tags', 'Tags in the ★ Favourite tags area', []],
	['steamy34_pinned', 'Pinned filters', 'Search filters kept for every new search', {}],
	['steamy34_downloaded', 'Downloaded posts', 'Post numbers you downloaded (for the ⬇ mark)', {}],
	['steamy34_dlhistory', 'Download tags', 'Artist / character / series of each download (for Stats)', []],
	['steamy34_collections', 'Collections', 'Your own folders of saved posts', []],
	['steamy34_viewed', 'Viewed posts', 'Post numbers you opened (for the eye mark)', {}],
	['steamy34_favs', 'Favourite marks', 'Posts you added to favourites (the ♥ stays filled)', {}],
	['steamy34_votes', 'Votes', 'Posts you voted for (the ▲ stays green)', {}],
	['steamy34_bl_full', 'Full blacklist', 'Your whole blacklist – also the tags that don\'t fit into rule34\'s own list (its cookie holds about 4,000 characters)', []],
	['steamy34_bl_account', 'Your account\'s blacklist', 'What your account\'s blacklist held the last time Options was open – for the "not on your account yet" marks', {}],
	['steamy34_bltimes', 'Blacklist dates', 'When you blacklisted each tag', {}],
	['steamy34_collfav_failed', 'Collections → favourites pause', 'When adding collection posts to your favourites last failed (it waits a few hours before trying again)', 0],
	['steamy34_bl_soft', 'Blurred blacklist tags', 'Blacklisted tags whose posts are blurred with a Show button instead of hidden', []],
	['steamy34_video', 'Video options', 'Volume, mute, loop and speed', {}],
	['steamy34_auto', 'Auto next timer', 'Seconds per post for "Auto next"', {}],
	['steamy34_theater', 'Theater mode', 'Whether the popup opens without its sidebar', false],
	['steamy34_tagtypes', 'Tag types', 'Which tags are artists / characters / … (makes tag bars faster)', {}],
	['steamy34_mediahosts', 'Media servers', 'Which file servers worked (faster previews)', {}],
	['steamy34_cf_last', 'Last Cloudflare check', 'When the last check came and what Steamy34 was loading just before (for bug reports)', {}],
	['steamy34_lastsearch', 'Last search', 'The search you came from (for the + buttons)', ''],
	['steamy34_dlfolder', 'Download folder', 'The name of the folder you picked for downloads (the browser keeps the access to it)', ''],
	['steamy34_sbmenu_open', 'Small preferences', 'Whether lists are folded, sort order, which tips / news / guides you\'ve seen, whether an ad blocker was found', null],
	['steamy34_blsort', null, null, null]
];

const SMALL_PREF_KEYS = ['steamy34_sbmenu_open', 'steamy34_sb_panel', 'steamy34_fw_big', 'steamy34_sfw', 'steamy34_first_seen', 'steamy34_rate_asked', 'steamy34_sitecheck_warned', 'steamy34_blsort', 'steamy34_adblock_seen',
						 'steamy34_tips_seen', 'steamy34_changelog_seen', 'steamy34_mobile_seen', 'steamy34_marks_rev', 'steamy34_welcome_seen', 'steamy34_hints_seen', 'steamy34_vserver_applied'];

function storedCount(v) {
	if (Array.isArray(v)) return v.length;
	if (v && typeof v === 'object') return Object.keys(v).length;
	return v === '' || v == null ? 0 : 1;
}

function storedSize(v) {
	try { return JSON.stringify(v === undefined ? null : v).length; } catch (e) { return 0; }
}

function formatSize(bytes) {
	if (bytes < 1024) return bytes + ' B';
	return (bytes / 1024).toFixed(bytes < 10240 ? 1 : 0) + ' KB';
}

function deleteStored(key, empty) {
	if (typeof GM_deleteValue === 'function') GM_deleteValue(key);
	else GM_setValue(key, empty);
}

function buildPrivacySection() {
	const wrap = document.createElement('div');
	wrap.className = 's34-privacy';
	wrap.innerHTML = `
            <div class="s34-privacy-hero">
                <div class="s34-privacy-icon">${LOCK_SVG}</div>
                <div>
                    <b>No data is collected.</b>
                    Steamy34 has no tracking, no analytics and no server of its own. Everything it
                    remembers is stored <b>only on this computer</b>, inside your browser's Tampermonkey
                    storage – nothing is uploaded or shared.
                </div>
            </div>
            <div class="s34-privacy-note">
                The script only talks to rule34.xxx itself (loading pages, pictures and tag
                suggestions – just like browsing), and only sends something to your account when you
                use ♥ Favourite or ▲ Vote. Your blacklist is kept here in full and, as far as it fits,
                in rule34's own cookie; your account gets a copy when you save it in Options. Steamy34 also
                sets a few of rule34's own preferences the way its Options page does (theme, video server,
                its suggestion list) – see Settings.
            </div>
            <div class="s34-privacy-head">
                <span>Stored on this computer</span>
                <span class="s34-privacy-total"></span>
            </div>
            <div class="s34-privacy-list"></div>
            <div class="s34-privacy-actions">
                <button type="button" class="s34-btn" data-pv="export">⬇ Export a backup first</button>
                <button type="button" class="s34-btn s34-danger" data-pv="all">Delete all Steamy34 data</button>
            </div>
            <div class="s34-privacy-note">
                Other ways to remove everything: uninstalling Steamy34 in Tampermonkey deletes all of it,
                or open the Tampermonkey dashboard → Steamy34 → <i>Storage</i> tab.
                Downloaded files are normal files in your downloads folder – Steamy34 never touches them.
            </div>`;

	const list = wrap.querySelector('.s34-privacy-list');

	function render() {
		list.replaceChildren();
		let total = 0;
		STORED_DATA.forEach(([key, label, what, empty]) => {
			if (!label) return;
			let v;
			try { v = GM_getValue(key, undefined); } catch (e) { v = undefined; }
			// The small preferences row covers several keys
			const keys = key === 'steamy34_sbmenu_open' ? SMALL_PREF_KEYS : [key];
			const size = keys.reduce((s, k) => {
				let x; try { x = GM_getValue(k, undefined); } catch (e) {}
				return s + (x === undefined ? 0 : storedSize(x));
			}, 0);
			total += size;
			const count = ['steamy34_sbmenu_open', 'steamy34_video', 'steamy34_settings', 'steamy34_lastsearch'].includes(key)
			? null : key === 'steamy34_api' ? null : key === 'steamy34_bl_account' ? (v && Array.isArray(v.tags) ? v.tags.length : 0) : storedCount(v);

			const row = document.createElement('div');
			row.className = 's34-privacy-row' + (size ? '' : ' s34-privacy-empty');
			const info = document.createElement('div');
			info.className = 's34-privacy-info';
			const name = document.createElement('div');
			name.className = 's34-privacy-name';
			name.textContent = label;
			const sub = document.createElement('div');
			sub.className = 's34-privacy-what';
			sub.textContent = what;
			info.append(name, sub);
			const amount = document.createElement('div');
			amount.className = 's34-privacy-amount';
			amount.textContent = !size ? 'empty' : (count != null ? count + ' · ' : '') + formatSize(size);
			const clear = document.createElement('button');
			clear.type = 'button';
			clear.className = 's34-privacy-clear';
			clear.textContent = 'Clear';
			clear.disabled = !size;
			clear.title = 'Delete this from your computer';
			clear.addEventListener('click', () => {
				const extra = key === 'steamy34_settings' ? '\n\nAll settings go back to their defaults (after a reload).' : '';
				if (!confirm(`Delete "${label}" from this computer? This can't be undone.${extra}`)) return;
				keys.forEach(k => deleteStored(k, k === key ? empty : null));
				// Forget the copies this page still holds in memory
				if (key === 'steamy34_downloaded') setDownloaded(null);
				if (key === 'steamy34_viewed') setViewed(null);
				if (key === 'steamy34_tagtypes') tagTypes.clear();
				if (key === 'steamy34_downloaded' || key === 'steamy34_viewed') showDownloadedState();
				render();
				showToast(`Deleted: ${label}.`);
			});
			row.append(info, amount, clear);
			list.appendChild(row);
		});
		wrap.querySelector('.s34-privacy-total').textContent = 'Total ' + formatSize(total);
	}

	wrap.addEventListener('click', e => {
		const act = e.target.closest('[data-pv]');
		if (!act) return;
		if (act.dataset.pv === 'export') exportBackup();
		else if (act.dataset.pv === 'all') {
			if (!confirm('Delete ALL Steamy34 data from this computer?\n\nSettings, saved & recent searches, favourite tags, ' +
						 'downloaded / viewed marks and everything else listed here will be gone. This can\'t be undone.\n\n' +
						 'Your blacklist (kept by rule34.xxx) and your downloaded files are not touched.')) return;
			const keys = typeof GM_listValues === 'function'
			? GM_listValues()
			: STORED_DATA.map(d => d[0]);
			keys.forEach(k => {
				const def = STORED_DATA.find(d => d[0] === k);
				deleteStored(k, def ? def[3] : null);
			});
			reloadWithMessage('All Steamy34 data was deleted from this device.');
		}
	});

	render();
	return wrap;
}

export { buildPrivacySection };
