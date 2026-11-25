// downloads/state – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG, isPostView, params } from '../config.js';
import { rememberDlThumb } from '../downloads-window.js';
import { popupState } from '../popup.js';
import { addDlHistory } from '../stats.js';
import { showToast } from '../tag-bar.js';
import { styleDlThumbButton, styleSeenButton, thumbButtonsHidden } from '../thumb-buttons.js';

const DOWNLOADED_KEY = 'steamy34_downloaded';

const DOWNLOADED_LIMIT = 50000;

let downloaded = null;

let downloadedUnreadable = false;

function loadDownloaded() {
	try {
		const v = GM_getValue(DOWNLOADED_KEY, {});
		downloadedUnreadable = false;
		downloaded = v && typeof v === 'object' ? v : {};
	} catch (e) { downloaded = {}; downloadedUnreadable = true; }
	return downloaded;
}

function isDownloaded(id) {
	if (!id) return false;
	return !!(downloaded || loadDownloaded())[id];
}

function postIdFrom(url) {
	try { return new URL(url, location.href).searchParams.get('id') || ''; } catch (e) { return ''; }
}

function thumbPostId(thumb) {
	const a = thumb.querySelector('a[href*="id="]');
	return (a && postIdFrom(a.getAttribute('href'))) || (thumb.id || '').replace(/^s/, '');
}

function rememberDownload(id, info) {
	if (id) touchedNow.add(id);
	if (!id || !CONFIG.trackDownloads) return;
	addDlHistory(id, info);
	if (info && info.thumb) rememberDlThumb(id, info.thumb); // (the Downloads window shows it)
	loadDownloaded(); // fresh copy (another tab may have added some)
	downloaded[id] = Date.now();
	const ids = Object.keys(downloaded);
	if (ids.length > DOWNLOADED_LIMIT) {
		ids.sort((a, b) => downloaded[a] - downloaded[b])
			.slice(0, ids.length - DOWNLOADED_LIMIT)
			.forEach(k => delete downloaded[k]);
	}
	if (!downloadedUnreadable) GM_setValue(DOWNLOADED_KEY, downloaded);
	bumpMarksRev();
	showDownloadedState();
}

const MARKS_REV_KEY = 'steamy34_marks_rev';

let marksRevSeen = (() => { try { return GM_getValue(MARKS_REV_KEY, 0); } catch (e) { return 0; } })();

function bumpMarksRev() {
	marksRevSeen = Date.now();
	GM_setValue(MARKS_REV_KEY, marksRevSeen);
}

function downloadButtonHtml() {
	return '<span class="s34-dl-main">⬇ Download</span><kbd></kbd>' +
		'<span class="s34-dl-sub">Original file · maximum resolution</span>';
}

function styleDownloadButton(btn, done) {
	if (!btn) return;
	btn.classList.toggle('s34-dl-done', done);
	const main = btn.querySelector('.s34-dl-main');
	const sub = btn.querySelector('.s34-dl-sub');
	if (main) main.textContent = done ? '✓ Downloaded' : '⬇ Download';
	if (sub) sub.textContent = done ? 'Click to download the original again' : 'Original file · maximum resolution';
	btn.title = done ? 'Already downloaded – click to download it again'
	: 'Download the original file in maximum resolution, with tags in the filename';
}

const VIEWED_KEY = 'steamy34_viewed';

const VIEWED_LIMIT = 30000;

let viewed = null;

let viewedUnreadable = false;

function loadViewed() {
	try {
		const v = GM_getValue(VIEWED_KEY, {});
		viewedUnreadable = false;
		viewed = v && typeof v === 'object' ? v : {};
	} catch (e) { viewed = {}; viewedUnreadable = true; }
	return viewed;
}

function isViewed(id) {
	if (!id) return false;
	return !!(viewed || loadViewed())[id];
}

const touchedNow = new Set();

const viewedPending = {};

let viewedSaveTimer = null;

function markDownloadedOnly(ids) {
	if (!CONFIG.trackDownloads) return [];
	loadDownloaded();
	const fresh = ids.filter(id => id && !downloaded[id]);
	fresh.forEach(id => { downloaded[id] = Date.now(); touchedNow.add(id); });
	if (fresh.length && !downloadedUnreadable) { GM_setValue(DOWNLOADED_KEY, downloaded); bumpMarksRev(); }
	return fresh;
}

function unmarkDownloaded(ids) {
	loadDownloaded();
	ids.forEach(id => delete downloaded[id]);
	if (!downloadedUnreadable) { GM_setValue(DOWNLOADED_KEY, downloaded); bumpMarksRev(); }
}

const UNSEEN_KEY = 'steamy34_unseen';

function getUnseen() { try { const v = GM_getValue(UNSEEN_KEY, {}); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }

function setUnseen(id, on) {
	const u = getUnseen();
	if (!!u[id] === on) return;
	if (on) u[id] = Date.now(); else delete u[id];
	GM_setValue(UNSEEN_KEY, u);
}

function isSeen(id, done) { return isViewed(id) || (done && !getUnseen()[id]); }

function setThumbViewed(id, on) {
	if (!id) return;
	if (on) { setUnseen(id, false); rememberView(id); saveViewed(); }
	else { forgetView(id); if (isDownloaded(id)) setUnseen(id, true); }
}

function rememberView(id) {
	if (id) touchedNow.add(id);
	if (!id || !CONFIG.trackViewed) return;
	if (getUnseen()[id]) setUnseen(id, false);
	if (!viewed) loadViewed();
	viewed[id] = viewedPending[id] = Date.now();
	clearTimeout(viewedSaveTimer);
	viewedSaveTimer = setTimeout(saveViewed, 1500);
}

function saveViewed() {
	viewedSaveTimer = null;
	if (!Object.keys(viewedPending).length) return;
	loadViewed(); // fresh copy: another tab may have added some
	Object.assign(viewed, viewedPending);
	Object.keys(viewedPending).forEach(k => delete viewedPending[k]);
	const ids = Object.keys(viewed);
	if (ids.length > VIEWED_LIMIT) {
		ids.sort((a, b) => viewed[a] - viewed[b])
			.slice(0, ids.length - VIEWED_LIMIT)
			.forEach(k => delete viewed[k]);
	}
	if (!viewedUnreadable) GM_setValue(VIEWED_KEY, viewed);
	bumpMarksRev();
}

function forgetView(id) {
	if (!id) return;
	delete viewedPending[id];
	loadViewed();
	Object.assign(viewed, viewedPending);
	delete viewed[id];
	if (!viewedUnreadable) GM_setValue(VIEWED_KEY, viewed);
	bumpMarksRev();
}

function showDownloadedState(thumbs) {
	if (!CONFIG.trackDownloads && !CONFIG.trackViewed) return;
	(thumbs || document.querySelectorAll('.image-list span.thumb')).forEach(thumb => {
		if (!thumb) return;
		const id = thumb._s34Id || (thumb._s34Id = thumbPostId(thumb));
		const done = CONFIG.trackDownloads && isDownloaded(id);
		const seen = CONFIG.trackViewed && isSeen(id, done);
		thumb.classList.toggle('s34-was-downloaded', done);
		thumb.classList.toggle('s34-was-viewed', seen);
		thumb.classList.toggle('s34-touched-now', touchedNow.has(id));
		// (Beta 3.8) The ⬇ and 👁 buttons show the state themselves (green /
		// blue, and they stay while not hovering) - the corner mark is only
		// drawn for what has no button (switched off, or phones: no hover)
		const dlBtn = thumb.querySelector('.s34-tdl'), eyeBtn = thumb.querySelector('.s34-tseen');
		styleSeenButton(eyeBtn, seen);
		styleDlThumbButton(dlBtn, done);
		const fly = thumb.querySelector('.s34-tseen-fly');
		if (fly) {
			fly.querySelector('[data-m="viewed"]').classList.toggle('s34-on', seen);
			const fd = fly.querySelector('[data-m="dl"]');
			if (fd) fd.classList.toggle('s34-on', done);
		}
		const usable = b => !!b && !thumbButtonsHidden();
		let want = done ? 'dl' : seen ? 'seen' : '';
		if (want === 'dl' && usable(dlBtn)) want = '';
		if (want === 'seen' && usable(eyeBtn)) want = '';
		let mark = thumb.querySelector('.s34-dl-mark');
		if (!want || !CONFIG.thumbMarks) { if (mark) mark.remove(); return; }
		if (!mark) {
			mark = document.createElement('span');
			// Clicking the icon opens the post like the thumbnail does -
			// the "viewed" eye undoes "viewed" instead (Beta 3.7.4: people
			// clicked it to un-see a post, which opened it = viewed again)
			mark.addEventListener('click', e => {
				e.preventDefault();
				e.stopPropagation();
				if (mark.dataset.kind === 'seen') {
					const pid = thumbPostId(thumb);
					setThumbViewed(pid, false);
					showDownloadedState([thumb]);
					showToast('Marked as not viewed', 'Undo', () => { setThumbViewed(pid, true); showDownloadedState([thumb]); });
					return;
				}
				const a = thumb.querySelector('a[href]');
				if (a) a.click();
			});
			thumb.appendChild(mark);
		}
		if (mark.dataset.kind !== want) {
			mark.dataset.kind = want;
			mark.className = 's34-dl-mark' + (want === 'seen' ? ' s34-seen-mark' : '');
			// Download icon (arrow into a tray) / eye icon
			mark.innerHTML = want === 'dl'
				? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></svg>'
			: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
			mark.dataset.label = want === 'dl' ? 'Downloaded' : 'Viewed – click to undo';
			mark.title = want === 'dl' ? 'Downloaded – click to open' : 'Viewed – click to mark as not viewed';
		}
	});
	if (!CONFIG.trackDownloads) return;
	if (isPostView) {
		styleDownloadButton(document.querySelector('.s34-dl-btn:not([data-act])'), isDownloaded(params.get('id')));
	}
	if (popupState) {
		styleDownloadButton(popupState.overlay.querySelector('.s34-dl-btn'), isDownloaded(postIdFrom(popupState.postUrl)));
	}
}

export { DOWNLOADED_KEY, MARKS_REV_KEY, UNSEEN_KEY, VIEWED_KEY, downloadButtonHtml, downloaded, getUnseen, isDownloaded, isSeen, isViewed, loadDownloaded, loadViewed, markDownloadedOnly, marksRevSeen, postIdFrom, rememberDownload, rememberView, saveViewed, setThumbViewed, showDownloadedState, styleDownloadButton, thumbPostId, unmarkDownloaded, viewedSaveTimer };
export function setDownloaded(value) { downloaded = value; return value; }
export function setViewed(value) { viewed = value; return value; }
export function setMarksRevSeen(value) { marksRevSeen = value; return value; }
