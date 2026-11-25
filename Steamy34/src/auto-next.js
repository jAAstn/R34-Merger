// auto-next – Steamy34 (aus Steamy34.js aufgeteilt)
import { pause } from './favourites.js';
import { openPopup, popupState, visibleThumbs } from './popup.js';
import { showToast } from './tag-bar.js';
import { getVideoPrefs } from './video.js';

const AUTO_KEY = 'steamy34_auto';

const autoNext = { on: false, elapsed: 0, timer: null, busy: false };

function autoSeconds() {
	let s = 6;
	try { s = (GM_getValue(AUTO_KEY, {}) || {}).sec || 6; } catch (e) {}
	return Math.min(30, Math.max(2, s));
}

function autoPaused() {
	return !popupState || document.hidden || !!document.querySelector('.s34-overlay') ||
		!!popupState.overlay.querySelector('.s34-pv-zoomed') || !popupState.mediaReady;
}

function popupVideo() {
	return popupState && popupState.overlay.querySelector('video.s34-pv-media');
}

function startAutoNext() {
	autoNext.on = true;
	autoNext.elapsed = 0;
	const v = popupVideo();
	if (v) v.loop = false; // so it can end and move on
	clearInterval(autoNext.timer);
	autoNext.timer = setInterval(autoTick, 100);
	renderAutoNext();
}

function stopAutoNext() {
	autoNext.on = false;
	clearInterval(autoNext.timer);
	autoNext.timer = null;
	const v = popupVideo();
	if (v) v.loop = getVideoPrefs().loop;
	renderAutoNext();
}

function autoTick() {
	if (!popupState) { stopAutoNext(); return; }
	const bar = popupState.overlay.querySelector('.s34-auto-bar i');
	if (popupState.isVideo) {
		// Videos: the bar follows the video; "ended" moves on
		const v = popupVideo();
		if (bar && v && v.duration) bar.style.width = Math.min(100, v.currentTime / v.duration * 100) + '%';
		return;
	}
	if (autoPaused()) return;
	autoNext.elapsed += 100;
	const total = autoSeconds() * 1000;
	if (bar) bar.style.width = Math.min(100, autoNext.elapsed / total * 100) + '%';
	if (autoNext.elapsed >= total) autoAdvance();
}

async function autoAdvance() {
	if (autoNext.busy || !popupState) return;
	autoNext.busy = true;
	autoNext.elapsed = 0;
	try {
		let list = visibleThumbs();
		let i = list.indexOf(popupState.thumb);
		if (!list[i + 1]) {
			// End of what's loaded: let infinite scroll fetch the next page
			// (from the Following window: its grid loads more)
			if (popupState.list) popupState.list.more();
			else window.scrollTo(0, document.documentElement.scrollHeight);
			await pause(2500);
			if (!popupState || !autoNext.on) return;
			list = visibleThumbs();
			i = list.indexOf(popupState.thumb);
		}
		if (list[i + 1]) openPopup(list[i + 1]);
		else {
			stopAutoNext();
			showToast('Auto next stopped – no more posts.');
		}
	} finally {
		autoNext.busy = false;
	}
}

function renderAutoNext() {
	if (!popupState) return;
	const box = popupState.overlay.querySelector('.s34-auto');
	if (!box) return;
	const btn = box.querySelector('.s34-auto-toggle');
	btn.classList.toggle('s34-on', autoNext.on);
	btn.innerHTML = autoNext.on
		? '<span class="s34-auto-icon">❚❚</span> Stop auto next'
	: '<span class="s34-auto-icon">▶</span> Auto next';
	btn.title = autoNext.on ? 'Stop the slideshow' : 'Go to the next post by itself (slideshow)';
	box.classList.toggle('s34-auto-running', autoNext.on);
	box.querySelector('.s34-auto-sec').textContent = autoSeconds() + ' s';
	box.querySelector('.s34-auto-note').textContent = popupState.isVideo
		? 'Videos play to the end, then the next post opens'
	: 'Next post after ' + autoSeconds() + ' seconds';
	if (!autoNext.on) box.querySelector('.s34-auto-bar i').style.width = '0%';
}

function setupAutoNextControls(overlay) {
	const box = overlay.querySelector('.s34-auto');
	const range = box.querySelector('input[type="range"]');
	range.value = autoSeconds();
	range.addEventListener('input', () => {
		GM_setValue(AUTO_KEY, { sec: parseInt(range.value, 10) });
		box.querySelector('.s34-auto-sec').textContent = range.value + ' s';
		renderAutoNext();
	});
	range.addEventListener('change', () => range.blur()); // ← / → browse again
	box.querySelector('.s34-auto-toggle').addEventListener('click', () => {
		if (autoNext.on) stopAutoNext(); else startAutoNext();
	});
}

export { AUTO_KEY, autoAdvance, autoNext, renderAutoNext, setupAutoNextControls, stopAutoNext };
