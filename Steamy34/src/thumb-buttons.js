// thumb-buttons – Steamy34 (aus Steamy34.js aufgeteilt)
import { downloadThumb } from './batch.js';
import { collectionNamesOf } from './collections-sync.js';
import { openCollectMenu } from './collections.js';
import { CONFIG } from './config.js';
import { updateDownloadsCount } from './downloads-window.js';
import { confirmRedownload } from './downloads/download.js';
import { folderAllowed, getFolderHandle } from './downloads/folder.js';
import { isDownloaded, isSeen, markDownloadedOnly, setThumbViewed, showDownloadedState, thumbPostId, unmarkDownloaded } from './downloads/state.js';
import { isFav, setBusy, toggleFavourite } from './favourites.js';
import { inWatchLater, toggleLaterFor } from './popup-more.js';
import { showToast } from './tag-bar.js';
import { thumbTags } from './thumbs.js';
import { FOLDER_SVG } from './window-shell.js';

const TB_DL_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>';

const TB_EYE_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

function styleSeenButton(btn, seen) {
	if (!btn || btn.dataset.seen === String(seen)) return;
	btn.dataset.seen = String(seen);
	btn.classList.toggle('s34-on', seen);
	if (!btn.firstChild) btn.innerHTML = TB_EYE_SVG;
	// (no tooltip: the strip next to it says it - a tooltip covered it)
	btn.setAttribute('aria-label', seen ? 'Viewed – click to mark as not viewed' : 'Mark as viewed');
}

function styleCollThumbButton(btn, id) {
	if (!btn) return;
	const names = typeof collectionNamesOf === 'function' ? collectionNamesOf(id) : [];
	btn.classList.toggle('s34-on', names.length > 0);
	btn.title = names.length ? 'In ' + names.join(', ') + ' – click to change' : 'Save to a collection';
	btn.setAttribute('aria-label', btn.title);
}

function refreshCollThumbButtons() {
	document.querySelectorAll('.s34-tcoll').forEach(b => { const t = b.closest('span.thumb'); if (t) styleCollThumbButton(b, thumbPostId(t)); });
}

function styleDlThumbButton(btn, done) {
	if (!btn || btn.dataset.done === String(done)) return;
	btn.dataset.done = String(done);
	btn.classList.toggle('s34-on', done);
	btn.title = done ? 'Downloaded – click to download it again' : 'Download';
	btn.setAttribute('aria-label', btn.title);
}

const THUMB_NO_HOVER = '(hover: none), (max-width: 760px), (pointer: coarse) and (max-width: 1000px)';

function thumbButtonsHidden() { try { return window.matchMedia(THUMB_NO_HOVER).matches; } catch (e) { return false; } }

async function thumbDownload(thumb, btn) {
	if (btn.classList.contains('s34-busy')) return;
	const id = thumbPostId(thumb);
	if (CONFIG.confirmRedownload && CONFIG.trackDownloads && isDownloaded(id) && !(await confirmRedownload())) return;
	// Ask for the download folder now, while the click still counts
	const folder = await getFolderHandle().catch(() => null);
	if (folder) await folderAllowed(folder, true);
	setBusy(btn, true);
	let ok = false;
	try { ok = await downloadThumb(thumb, 'popup'); } catch (e) { console.warn('[Steamy34] Thumbnail download failed:', e); }
	setBusy(btn, false);
	showDownloadedState([thumb]);
	showToast(ok ? 'Downloaded' : 'The download didn\'t work – try it in the popup.');
}

let longPressDone = 0;

function setupThumbLongPress() {
	if (!thumbButtonsHidden()) return; // (computers: the hover buttons)
	let timer = null, start = null;
	document.addEventListener('touchstart', e => {
		const t = e.target.closest && e.target.closest('.image-list span.thumb');
		if (!t || e.touches.length !== 1) return;
		start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		clearTimeout(timer);
		timer = setTimeout(() => { longPressDone = Date.now(); try { navigator.vibrate && navigator.vibrate(12); } catch (err) {} openThumbSheet(t); }, 480);
	}, { passive: true });
	document.addEventListener('touchmove', e => {
		if (!start || !e.touches[0]) return;
		if (Math.abs(e.touches[0].clientX - start.x) + Math.abs(e.touches[0].clientY - start.y) > 12) clearTimeout(timer);
	}, { passive: true });
	document.addEventListener('touchend', () => clearTimeout(timer), { passive: true });
	// the tap that ends a long press doesn't open the post; no browser menu either
	window.addEventListener('click', e => {
		if (Date.now() - longPressDone < 700 && e.target.closest && e.target.closest('.image-list span.thumb')) { e.preventDefault(); e.stopImmediatePropagation(); }
	}, true);
	document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.image-list span.thumb')) e.preventDefault(); });
}

function openThumbSheet(thumb) {
	if (document.querySelector('.s34-tsheet-overlay')) return;
	const id = thumbPostId(thumb);
	const img = thumb.querySelector('img');
	const overlay = document.createElement('div');
	overlay.className = 's34-overlay s34-tsheet-overlay';
	const sheet = document.createElement('div');
	sheet.className = 's34-tsheet';
	const fav = isFav(id), seen = CONFIG.trackViewed && isSeen(id, CONFIG.trackDownloads && isDownloaded(id));
	const inLater = typeof inWatchLater === 'function' && inWatchLater(id);
	sheet.innerHTML = `<div class="s34-tsheet-head"><b>Post #${id}</b><button type="button" data-a="close">✕</button></div>
            <button type="button" data-a="fav">${fav ? '♥ Remove from favourites' : '♡ Add to favourites'}</button>
            <button type="button" data-a="dl">⬇ Download</button>
            ${CONFIG.trackViewed ? `<button type="button" data-a="seen">${seen ? '👁 Mark as not viewed' : '👁 Mark as viewed'}</button>` : ''}
            <button type="button" data-a="coll">📁 Save to collection</button>
            <button type="button" data-a="later">${inLater ? '🕒 Take off Watch later' : '🕒 Watch later'}</button>`;
	overlay.appendChild(sheet);
	const close = () => overlay.remove();
	overlay.addEventListener('click', e => {
		if (e.target === overlay) { close(); return; }
		const b = e.target.closest('[data-a]');
		if (!b) return;
		const a = b.dataset.a;
		if (a === 'close') close();
		else if (a === 'fav') { close(); toggleFavourite(id, thumb.querySelector('.s34-fav-btn')); }
		else if (a === 'dl') { close(); thumbDownload(thumb, thumb.querySelector('.s34-tdl') || document.createElement('button')); }
		else if (a === 'seen') { close(); setThumbViewed(id, !seen); showDownloadedState([thumb]); }
		else if (a === 'coll') { openCollectMenu(b, [{ id, thumb: img ? img.getAttribute('src') : '', tags: img ? thumbTags(img).trim() : '' }]); close(); }
		else if (a === 'later') { close(); toggleLaterFor(id, img ? img.getAttribute('src') : '', img ? thumbTags(img).trim() : ''); }
	});
	document.body.appendChild(overlay);
}

function addThumbButtons(thumbs) {
	const wantDl = CONFIG.thumbDlButton, wantSeen = CONFIG.thumbSeenButton && CONFIG.trackViewed, wantColl = CONFIG.thumbCollButton;
	if (!wantDl && !wantSeen && !wantColl) return;
	const made = [];
	thumbs.forEach(thumb => {
		if (thumb.querySelector('.s34-tbtns')) return;
		const id = thumbPostId(thumb);
		if (!id) return;
		const box = document.createElement('span');
		box.className = 's34-tbtns';
		const dl = document.createElement('button');
		dl.type = 'button';
		dl.className = 's34-tbtn s34-tdl';
		dl.innerHTML = TB_DL_SVG;
		styleDlThumbButton(dl, !!(CONFIG.trackDownloads && isDownloaded(id)));
		dl.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); thumbDownload(thumb, dl); });
		if (wantDl) box.appendChild(dl);
		if (wantColl) {
			// (Beta 3.9.2) Save to a collection right from the thumbnail
			const cb = document.createElement('button');
			cb.type = 'button';
			cb.className = 's34-tbtn s34-tcoll';
			cb.innerHTML = FOLDER_SVG.replace('width="15" height="15"', 'width="13" height="13"');
			styleCollThumbButton(cb, id);
			cb.addEventListener('click', e => {
				e.preventDefault(); e.stopPropagation();
				const img = thumb.querySelector('img');
				openCollectMenu(cb, [{ id, thumb: img ? img.getAttribute('src') : '', tags: img ? thumbTags(img).trim() : '' }]);
			});
			box.appendChild(cb);
		}
		if (wantSeen) {
			// (Beta 3.8) The eye opens a small strip to its left while
			// hovering: "Viewed" and "Downloaded" - the second only marks
			// the post (nothing is downloaded). A click on the eye itself
			// switches "viewed" as before.
			const wrap = document.createElement('span');
			wrap.className = 's34-tseen-wrap';
			const fly = document.createElement('span');
			fly.className = 's34-tseen-fly';
			fly.innerHTML = `<button type="button" data-m="viewed">${TB_EYE_SVG}<span>Viewed</span></button>`
				+ (CONFIG.trackDownloads ? `<button type="button" data-m="dl" title="Only the mark – nothing is downloaded">${TB_DL_SVG}<span>Downloaded</span></button>` : '');
			fly.addEventListener('click', e => {
				const b = e.target.closest('[data-m]');
				e.preventDefault();
				e.stopPropagation();
				if (!b) return;
				if (b.dataset.m === 'viewed') {
					setThumbViewed(id, !b.classList.contains('s34-on'));
				} else if (b.classList.contains('s34-on')) {
					unmarkDownloaded([id]);
					showToast('No longer marked as downloaded.');
				} else {
					markDownloadedOnly([id]);
					showToast('Marked as downloaded – nothing was downloaded.');
				}
				showDownloadedState([thumb]);
				if (typeof updateDownloadsCount === 'function') updateDownloadsCount();
			});
			const seen = document.createElement('button');
			seen.type = 'button';
			seen.className = 's34-tbtn s34-tseen';
			styleSeenButton(seen, !!(CONFIG.trackViewed && isSeen(id, CONFIG.trackDownloads && isDownloaded(id))));
			seen.addEventListener('click', e => {
				e.preventDefault();
				e.stopPropagation();
				setThumbViewed(id, seen.dataset.seen !== 'true');
				showDownloadedState([thumb]);
			});
			wrap.append(fly, seen);
			box.prepend(wrap);
		}
		thumb.appendChild(box);
		made.push(thumb);
	});
	// the marks were drawn before the buttons existed - the buttons show it now
	if (made.length) showDownloadedState(made);
}

export { TB_DL_SVG, TB_EYE_SVG, addThumbButtons, refreshCollThumbButtons, setupThumbLongPress, styleDlThumbButton, styleSeenButton, thumbButtonsHidden };
