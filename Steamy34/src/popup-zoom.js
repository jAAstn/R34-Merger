// popup-zoom – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG } from './config.js';
import { mediaCandidates } from './hover.js';
import { fetchPostDoc } from './pages.js';
import { popupState, visibleThumbs } from './popup.js';
import { isLongStrip, isVideoThumb } from './thumbs.js';

const preloadedPosts = new Set();

const PRELOAD_DWELL_MS = 1500;

function preloadPicture(img) {
	const urls = mediaCandidates(img, false);
	let i = 0;
	const pre = new Image();
	pre.decoding = 'async';
	pre.onerror = () => { if (++i < urls.length) pre.src = urls[i]; };
	if (urls.length) pre.src = urls[0];
}

function preloadThumb(thumb, stillThere) {
	const a = thumb && thumb.querySelector('a[href]');
	const img = thumb && thumb.querySelector('img');
	if (!a || !img || preloadedPosts.has(a.href)) return;
	preloadedPosts.add(a.href);
	if (!isVideoThumb(img)) preloadPicture(img);
	fetchPostDoc(a.href, 'preload', { wanted: stillThere }); // waits in line behind what you asked for
}

function preloadNeighbours(thumb) {
	if (!CONFIG.popupPreload) return;
	const list = visibleThumbs();
	const i = list.indexOf(thumb);
	if (i < 0 || !list[i + 1]) return;
	const stillThere = () => !!popupState && popupState.thumb === thumb;
	setTimeout(() => { if (stillThere()) preloadThumb(list[i + 1], () => !!popupState); }, PRELOAD_DWELL_MS);
}

function resetZoom(stage) {
	stage.classList.remove('s34-pv-zoomed', 's34-pv-dragging', 's34-pv-strip');
	stage.querySelectorAll('img.s34-pv-media').forEach(i => { i.style.width = ''; i.style.height = ''; });
}

function toggleZoom(img, e) {
	const stage = img.closest('.s34-pv-stage');
	if (!stage) return;
	if (stage.classList.contains('s34-pv-zoomed')) { resetZoom(stage); return; }
	const nw = img.naturalWidth, nh = img.naturalHeight;
	if (!nw || !nh) return;
	// Where in the picture was clicked (the picture sits inside the box)
	const r = img.getBoundingClientRect();
	const scale = Math.min(r.width / nw, r.height / nh);
	const dw = nw * scale, dh = nh * scale;
	const ox = r.left + (r.width - dw) / 2, oy = r.top + (r.height - dh) / 2;
	const fx = Math.min(Math.max((e.clientX - ox) / dw, 0), 1);
	const fy = Math.min(Math.max((e.clientY - oy) / dh, 0), 1);
	// Full size, or twice the fitted size for small pictures
	const W = nw > dw * 1.2 ? nw : dw * 2;
	const H = W * nh / nw;
	stage.classList.add('s34-pv-zoomed');
	img.style.width = W + 'px';
	img.style.height = H + 'px';
	stage.scrollLeft = fx * W - stage.clientWidth / 2;
	stage.scrollTop = fy * H - stage.clientHeight / 2;
}

function fitLongStrip(img) {
	const stage = img.closest('.s34-pv-stage');
	const nw = img.naturalWidth, nh = img.naturalHeight;
	if (!stage || !isLongStrip(nw, nh)) return false;
	const fittedW = Math.min(stage.clientWidth / nw, stage.clientHeight / nh) * nw;
	stage.classList.add('s34-pv-zoomed', 's34-pv-strip');
	const size = () => {
		let W = stage.clientWidth; // (without the scrollbar, once there is one)
		if (!CONFIG.allowUpscale) W = Math.min(W, nw);
		img.style.width = W + 'px';
		img.style.height = (W * nh / nw) + 'px';
		return W;
	};
	size();
	if (size() < fittedW * 1.3) { resetZoom(stage); return false; } // fitted is wide enough already
	stage.scrollTop = 0;
	stage.scrollLeft = 0;
	return true;
}

function setupPopupZoom(overlay) {
	const stage = overlay.querySelector('.s34-pv-stage');
	let drag = null;
	stage.addEventListener('mousedown', e => {
		if (e.button !== 0) return;
		const img = e.target.closest('img.s34-pv-media:not(.s34-pv-placeholder)');
		if (!img) return;
		e.preventDefault(); // no "drag the picture away" ghost
		drag = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, moved: false, img };
	});
	overlay.addEventListener('mousemove', e => {
		if (!drag) return;
		const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
		if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
		if (drag.moved && stage.classList.contains('s34-pv-zoomed')) {
			stage.classList.add('s34-pv-dragging');
			stage.scrollLeft = drag.sl - dx;
			stage.scrollTop = drag.st - dy;
		}
	});
	const end = e => {
		if (!drag) return;
		const d = drag;
		drag = null;
		stage.classList.remove('s34-pv-dragging');
		if (!d.moved && e.type === 'mouseup') toggleZoom(d.img, e);
	};
	overlay.addEventListener('mouseup', end);
	overlay.addEventListener('mouseleave', end);
}

export { fitLongStrip, preloadNeighbours, resetZoom, setupPopupZoom };
