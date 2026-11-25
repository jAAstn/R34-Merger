// video – Steamy34 (aus Steamy34.js aufgeteilt)
import { getPostSidebarSlot } from './settings-menu.js';

const VIDEO_KEY = 'steamy34_video';

function getVideoPrefs() {
	let v = {};
	try { v = GM_getValue(VIDEO_KEY, {}) || {}; } catch (e) {}
	return Object.assign({ volume: 1, muted: false, loop: true, rate: 1 }, v);
}

function setVideoPrefs(changes) {
	GM_setValue(VIDEO_KEY, Object.assign(getVideoPrefs(), changes));
}

function autoMute(video) {
	video.dataset.s34AutoMuted = '1';
	video.muted = true;
	setTimeout(() => { delete video.dataset.s34AutoMuted; }, 300);
}

function applyVideoPrefs(video) {
	const p = getVideoPrefs();
	video.volume = Math.min(Math.max(p.volume, 0), 1);
	video.muted = !!p.muted;
	video.loop = !!p.loop;
	video.defaultPlaybackRate = p.rate;
	video.playbackRate = p.rate;
	if (video.dataset.s34Prefs) return;
	video.dataset.s34Prefs = '1';
	video.addEventListener('volumechange', () => {
		if (video.dataset.s34AutoMuted) return;
		setVideoPrefs({ volume: video.volume, muted: video.muted });
	});
	// Some players reset the speed when a new source loads
	video.addEventListener('loadedmetadata', () => {
		video.playbackRate = getVideoPrefs().rate;
	});
}

function makeVideoOptions(getVideo) {
	const box = document.createElement('div');
	box.className = 's34-vopts';
	box.innerHTML = `
            <button type="button" class="s34-vopt-loop"></button>
            <label class="s34-vopt-speed">Speed
                <select>${[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(r => `<option value="${r}">${r}×</option>`).join('')}</select>
            </label>`;
	const loopBtn = box.querySelector('.s34-vopt-loop');
	const sel = box.querySelector('select');
	const showLoop = () => {
		const on = getVideoPrefs().loop;
		loopBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>' +
			(on ? ' Loop: on' : ' Loop: off');
		loopBtn.classList.toggle('s34-on', on);
	};
	loopBtn.addEventListener('click', () => {
		const on = !getVideoPrefs().loop;
		setVideoPrefs({ loop: on });
		const v = getVideo();
		if (v) v.loop = on;
		showLoop();
	});
	sel.value = String(getVideoPrefs().rate);
	sel.addEventListener('change', () => {
		const r = parseFloat(sel.value);
		setVideoPrefs({ rate: r });
		const v = getVideo();
		if (v) { v.defaultPlaybackRate = r; v.playbackRate = r; }
		sel.blur();
	});
	// (Beta 3.9.3) Frame by frame (also , and . keys) and a loop between two points (A–B)
	const tools = document.createElement('div');
	tools.className = 's34-vopt-tools';
	tools.innerHTML = '<button type="button" data-v="back" title="One frame back (,)">⏮</button><button type="button" data-v="fwd" title="One frame on (.)">⏭</button><button type="button" data-v="ab" title="Loop a part: click at the start, click at the end, click again to stop">A–B</button>';
	const ab = { a: null, b: null };
	const abBtn = tools.querySelector('[data-v="ab"]');
	const showAb = () => {
		abBtn.textContent = ab.a == null ? 'A–B' : ab.b == null ? 'A ' + ab.a.toFixed(1) + 's – B?' : 'A–B ' + ab.a.toFixed(1) + '–' + ab.b.toFixed(1) + 's';
		abBtn.classList.toggle('s34-on', ab.a != null);
	};
	const step = dir => { const v = getVideo(); if (!v) return; v.pause(); v.currentTime = Math.max(0, Math.min((v.duration || 1e9), v.currentTime + dir / 30)); };
	tools.addEventListener('click', e => {
		const b = e.target.closest('[data-v]');
		if (!b) return;
		const v = getVideo();
		if (b.dataset.v === 'back') step(-1);
		else if (b.dataset.v === 'fwd') step(1);
		else if (v) {
			if (ab.a == null) ab.a = v.currentTime;
			else if (ab.b == null) { ab.b = Math.max(ab.a + 0.2, v.currentTime); v.currentTime = ab.a; v.play().catch(() => {}); }
			else { ab.a = ab.b = null; }
			showAb();
		}
	});
	const keepLoop = () => { const v = getVideo(); if (v && ab.a != null && ab.b != null && v.currentTime >= ab.b) v.currentTime = ab.a; };
	const onFrameKey = e => {
		if (!box.isConnected || !getVideo() || e.ctrlKey || e.metaKey || e.altKey) return;
		if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
		if (e.key === ',') { e.preventDefault(); step(-1); }
		else if (e.key === '.') { e.preventDefault(); step(1); }
	};
	document.addEventListener('keydown', onFrameKey, true);
	// (Beta 3.11.1) the popup builds new video tools each time it opens - once
	// these are gone, their timer and key listener go too (before, they ran on)
	let wasShown = false;
	const loopTimer = setInterval(() => {
		if (box.isConnected) { wasShown = true; keepLoop(); return; }
		if (!wasShown) return; // (not on the page yet)
		clearInterval(loopTimer);
		document.removeEventListener('keydown', onFrameKey, true);
	}, 100);
	showAb();
	box.appendChild(tools);
	showLoop();
	return box;
}

function setupPostVideoOptions() {
	const video = document.querySelector('#gelcomVideoPlayer, #content video');
	if (!video || video.tagName !== 'VIDEO') return;
	applyVideoPrefs(video);
	const slot = getPostSidebarSlot();
	if (slot) slot.appendChild(makeVideoOptions(() => video));
}

export { VIDEO_KEY, applyVideoPrefs, autoMute, getVideoPrefs, makeVideoOptions, setupPostVideoOptions };
