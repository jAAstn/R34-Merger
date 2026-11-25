// window-shell – Steamy34 (aus Steamy34.js aufgeteilt)
import { saveUrlAs } from './downloads/download.js';
import { buildFilename, readPostSize } from './downloads/names.js';
import { rememberDownload } from './downloads/state.js';
import { getPostMedia } from './hover.js';
import { fetchPostDoc } from './pages.js';
import { popupState, readPostTags } from './popup.js';

const THEATER_KEY = 'steamy34_theater';

const THEATER_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>';

const THEATER_EXIT_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/></svg>';

const FOLDER_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>';

const STATS_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 20V12"/><path d="M12 20V5"/><path d="M19 20v-9"/></svg>';

function setTheater(on, overlay) {
	overlay = overlay || (popupState && popupState.overlay);
	if (!overlay) return;
	overlay.classList.toggle('s34-pv-theater', on);
	GM_setValue(THEATER_KEY, on);
}

function popupThumbSrc(state) {
	const img = state && state.thumb && state.thumb.querySelector('img');
	return img ? (img.getAttribute('src') || img.dataset.s34Src || '') : '';
}

function openWindow({ cls, icon, title, width }) {
	const overlay = document.createElement('div');
	overlay.className = 's34-overlay s34-win-overlay ' + (cls || '');
	overlay.innerHTML = `
            <div class="s34-win" role="dialog" aria-modal="true">
                <div class="s34-win-head">
                    <div class="s34-win-icon">${icon}</div>
                    <div class="s34-win-heading">
                        <div class="s34-win-title"></div>
                        <div class="s34-win-sub"></div>
                    </div>
                    <button type="button" class="s34-win-close" title="Close (Esc)">✕</button>
                </div>
                <div class="s34-win-body"></div>
            </div>`;
	const win = overlay.querySelector('.s34-win');
	if (width) win.style.width = `min(${width}px, calc(100vw - 32px))`;
	overlay.querySelector('.s34-win-title').textContent = title;
	const api = {
		overlay,
		body: overlay.querySelector('.s34-win-body'),
		setTitle: t => { overlay.querySelector('.s34-win-title').textContent = t; },
		setSub: t => { overlay.querySelector('.s34-win-sub').textContent = t; },
		onClose: null,
		close() {
			document.removeEventListener('keydown', onKey, true);
			overlay.remove();
			if (api.onClose) api.onClose();
		}
	};
	function onKey(e) {
		if (e.key !== 'Escape' || document.querySelector('.s34-tips-overlay, .s34-cmenu')) return;
		if (overlay.classList.contains('s34-under-popup') || e.defaultPrevented) return; // the popup on top closes first
		e.preventDefault();
		e.stopPropagation();
		api.close();
	}
	overlay.querySelector('.s34-win-close').addEventListener('click', () => api.close());
	overlay.addEventListener('mousedown', e => { if (e.target === overlay) api.close(); });
	document.addEventListener('keydown', onKey, true);
	document.body.appendChild(overlay);
	return api;
}

function postPageUrl(id) {
	return location.origin + '/index.php?page=post&s=view&id=' + encodeURIComponent(id);
}

function thumbOrPlaceholder(src, id, fallback, onFail) {
	const box = document.createElement('div');
	box.className = 's34-tile-img';
	const tries = [].concat(src || [], fallback || []).filter(Boolean);
	if (tries.length) {
		const img = new Image();
		img.loading = 'lazy';
		img.alt = '';
		let n = 0;
		img.src = tries[n];
		img.addEventListener('error', () => {
			if (++n < tries.length) { img.src = tries[n]; return; }
			img.remove();
			box.textContent = '#' + id;
			if (onFail) onFail();
		});
		box.appendChild(img);
	} else {
		box.textContent = '#' + id;
	}
	return box;
}

async function downloadPostById(id, thumb) {
	const url = postPageUrl(id);
	const doc = await fetchPostDoc(url, 'batch');
	if (!doc) return false;
	const media = await getPostMedia(url, 'batch');
	const file = media && (media.video || media.image);
	if (!file) return false;
	const g = readPostTags(doc);
	const names = k => (g[k] || []).map(x => x.tag);
	const tags = { copyright: names('copyright'), character: names('character'), artist: names('artist') };
	const ok = await saveUrlAs(file, buildFilename(file, tags, readPostSize(doc), id), url, { artist: (tags.artist || [])[0] });
	if (ok) rememberDownload(id, { thumb, tags });
	return ok;
}

export { FOLDER_SVG, STATS_SVG, THEATER_EXIT_SVG, THEATER_KEY, THEATER_SVG, downloadPostById, openWindow, popupThumbSrc, postPageUrl, setTheater, thumbOrPlaceholder };
