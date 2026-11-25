// stats – Steamy34 (aus Steamy34.js aufgeteilt)
import { readBlocklist } from './blacklist.js';
import { getCollections } from './collections.js';
import { loadDownloaded, loadViewed } from './downloads/state.js';
import { getFavs } from './favourites.js';
import { getFollowing } from './following.js';
import { updateHubCounts } from './sidebar.js';
import { prettyTag } from './tag-bar.js';
import { STATS_SVG, openWindow } from './window-shell.js';

const DLHIST_KEY = 'steamy34_dlhistory';

const DLHIST_LIMIT = 3000;

function getDlHistory() {
	try {
		const v = GM_getValue(DLHIST_KEY, []);
		return Array.isArray(v) ? v : [];
	} catch (e) { return []; }
}

function addDlHistory(id, info) {
	if (!id) return;
	const list = getDlHistory().filter(h => h.id !== id);
	const tags = (info && info.tags) || {};
	list.unshift({
		id,
		time: Date.now(),
		artist: (tags.artist || []).slice(0, 5),
		character: (tags.character || []).slice(0, 5),
		copyright: (tags.copyright || []).slice(0, 5)
	});
	GM_setValue(DLHIST_KEY, list.slice(0, DLHIST_LIMIT));
	updateHubCounts();
}

function trimDlHistory() {
	const list = getDlHistory();
	if (!list.some(h => h.thumb || h.fallback || h.checked)) return;
	GM_setValue(DLHIST_KEY, list.map(h => ({
		id: h.id, time: h.time, artist: h.artist || [], character: h.character || [], copyright: h.copyright || []
	})));
}

function countTop(lists, n) {
	const c = new Map();
	lists.forEach(list => (list || []).forEach(t => c.set(t, (c.get(t) || 0) + 1)));
	return Array.from(c.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function openStatsWindow() {
	if (document.querySelector('.s34-stats-overlay')) return;
	const w = openWindow({ cls: 's34-stats-overlay', icon: STATS_SVG, title: 'Your stats', width: 700 });
	const hist = getDlHistory();
	const downloadedMap = loadDownloaded();
	const viewedMap = loadViewed();
	const favs = getFavs();
	const colls = getCollections();
	const times = [].concat(Object.values(downloadedMap), Object.values(viewedMap)).filter(Boolean);
	const since = times.length ? Math.min(...times) : 0;

	const tiles = [
		['Downloaded', Object.keys(downloadedMap).length],
		['Viewed', Object.keys(viewedMap).length],
		['Favourites', Object.keys(favs).length],
		['In collections', colls.reduce((s, c) => s + c.posts.length, 0)],
		['Blacklisted tags', readBlocklist().length],
		['Following', getFollowing().artists.length]
	];
	w.setSub(since ? 'Since ' + new Date(since).toLocaleDateString() + ' · only on this computer' : 'Only on this computer');

	// Last 14 days: views and downloads per day
	const days = [];
	const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
	const today = dayStart(Date.now());
	for (let i = 13; i >= 0; i--) days.push({ t: today - i * 86400000, v: 0, d: 0 });
	const bump = (map, key) => Object.values(map).forEach(t => {
		const day = days.find(x => x.t === dayStart(t));
		if (day) day[key]++;
	});
	bump(viewedMap, 'v');
	bump(downloadedMap, 'd');
	const maxDay = Math.max(1, ...days.map(x => Math.max(x.v, x.d)));

	const top = (title, key) => {
		const list = countTop(hist.map(h => h[key]), 8);
		const max = list.length ? list[0][1] : 1;
		return `<div class="s34-stat-top">
                <div class="s34-stat-label">${title}</div>
                ${list.length ? list.map(([t, n]) => `
                    <div class="s34-stat-bar s34-blm-${key}">
                        <span class="s34-stat-name"></span>
                        <span class="s34-stat-track"><i style="width:${Math.round(n / max * 100)}%"></i></span>
                        <b>${n}</b>
                    </div>`).join('') : '<div class="s34-win-empty">Nothing yet</div>'}
            </div>`;
	};

	w.body.innerHTML = `
            <div class="s34-stat-tiles">
                ${tiles.map(([label, n]) => `<div class="s34-stat-tile"><b>${n.toLocaleString()}</b><span>${label}</span></div>`).join('')}
            </div>
            <div class="s34-stat-label">Last 14 days</div>
            <div class="s34-stat-chart">
                ${days.map(x => `
                    <div class="s34-stat-day" title="${new Date(x.t).toLocaleDateString()}: ${x.v} viewed, ${x.d} downloaded">
                        <div class="s34-stat-cols">
                            <i class="s34-stat-v" style="height:${Math.round(x.v / maxDay * 100)}%"></i>
                            <i class="s34-stat-d" style="height:${Math.round(x.d / maxDay * 100)}%"></i>
                        </div>
                        <span>${new Date(x.t).getDate()}</span>
                    </div>`).join('')}
            </div>
            <div class="s34-stat-legend"><span class="s34-stat-v"></span> viewed <span class="s34-stat-d"></span> downloaded</div>
            <div class="s34-stat-tops">
                ${top('Top artists', 'artist')}
                ${top('Top characters', 'character')}
                ${top('Top series', 'copyright')}
            </div>
            <div class="s34-win-note">Top lists count your downloads${hist.length ? '' : ' (they fill up as you download)'}.</div>`;
	// Tag names as text (never as HTML)
	['artist', 'character', 'copyright'].forEach((key, i) => {
		const list = countTop(hist.map(h => h[key]), 8);
		w.body.querySelectorAll('.s34-stat-top')[i].querySelectorAll('.s34-stat-name')
			.forEach((el, j) => { el.textContent = prettyTag(list[j][0]); });
	});
}

export { DLHIST_KEY, DLHIST_LIMIT, addDlHistory, getDlHistory, openStatsWindow, trimDlHistory };
