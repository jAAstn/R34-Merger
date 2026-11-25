// sidebar – Steamy34 (aus Steamy34.js aufgeteilt)
import { getCollections, openCollectMenu, openCollectionsWindow } from './collections.js';
import { isPostView, params } from './config.js';
import { DL_ICON_SVG, openDownloadsWindow, updateDownloadsCount } from './downloads-window.js';
import { getPostSidebarSlot } from './settings-menu.js';
import { openStatsWindow } from './stats.js';
import { getTagFromRow } from './thumbs.js';
import { FOLDER_SVG, STATS_SVG } from './window-shell.js';

function updateHubCounts() {
	const hub = document.querySelector('.s34-hub');
	if (!hub) return;
	const n = getCollections().length;
	hub.querySelector('[data-hub="coll"] small').textContent = n ? n + (n === 1 ? ' folder' : ' folders') : 'none yet';
	updateDownloadsCount();
}

function addHub() {
	if (document.querySelector('.s34-hub')) return;
	const anchor = document.querySelector('.s34-blbtn') || document.querySelector('.s34-gear.s34-inline');
	if (!anchor) return;
	const hub = document.createElement('div');
	hub.className = 's34-hub';
	hub.innerHTML = `
            <button type="button" data-hub="coll" title="Your own collections of posts">${FOLDER_SVG}<b>Collections</b><small></small></button>
            <button type="button" data-hub="stats" title="Your stats">${STATS_SVG}<b>Stats</b><small>overview</small></button>
            <button type="button" data-hub="dl" title="Every post you downloaded">${DL_ICON_SVG}<b>Downloads</b><small></small></button>`;
	hub.addEventListener('click', e => {
		const b = e.target.closest('[data-hub]');
		if (!b) return;
		if (b.dataset.hub === 'coll') openCollectionsWindow();
		else if (b.dataset.hub === 'dl') openDownloadsWindow();
		else openStatsWindow();
	});
	anchor.before(hub);
	updateHubCounts();
}

function arrangeSidebarTools() {
	const gear = document.querySelector('.s34-gear.s34-inline');
	if (!gear || document.querySelector('.s34-dock')) return;
	const dock = document.createElement('div');
	dock.className = 's34-dock';
	gear.before(dock);
	const hub = document.querySelector('.s34-hub');
	const bl = document.querySelector('.s34-blbtn');
	if (hub) dock.appendChild(hub);   // its two buttons become two tiles
	if (bl) dock.appendChild(bl);
	// (Beta 3.8) Settings is in the top menu - its tile here only on phones
	if (!gear.classList.contains('s34-gear-in-nav')) dock.appendChild(gear);
	const follow = document.querySelector('.s34-follow-box');
	const view = document.querySelector('.s34-quick');
	if (follow && view && follow.parentElement === view.parentElement) view.before(follow);
	const saved = document.querySelector('.s34-saved-box'); // saved searches right under Following
	if (saved && follow) follow.after(saved);
}

function addPostCollectButton() {
	if (!isPostView || document.querySelector('.s34-post-collect')) return;
	const slot = getPostSidebarSlot();
	const id = params.get('id');
	if (!slot || !id) return;
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 's34-post-collect';
	btn.innerHTML = FOLDER_SVG + '<span>Save to collection</span>';
	btn.addEventListener('click', () => {
		const img = document.querySelector('#image');
		const tags = Array.from(document.querySelectorAll('#tag-sidebar li[class*="tag-type-"]')).map(getTagFromRow).filter(Boolean).join(' ');
		openCollectMenu(btn, [{ id, thumb: img ? img.src : '', tags }]);
	});
	const dl = slot.querySelector('.s34-dl-btn');
	if (dl) dl.after(btn); else slot.prepend(btn);
}

export { addHub, addPostCollectButton, arrangeSidebarTools, updateHubCounts };
