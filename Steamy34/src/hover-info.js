// hover-info – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG, NO_HOVER } from './config.js';
import { allThumbs } from './favourites.js';
import { fetchPostDoc } from './pages.js';
import { thumbTags } from './thumbs.js';

function renderHoverInfo(pill, score, size) {
	pill.textContent = [score !== '' && score != null ? '★ ' + score : '', size].filter(Boolean).join('  ·  ') || '…';
}

function showHoverInfo(thumb) {
	let pill = thumb.querySelector('.s34-info');
	if (!pill) {
		pill = document.createElement('span');
		pill.className = 's34-info';
		thumb.appendChild(pill);
	}
	const img = thumb.querySelector('img');
	const m = img && thumbTags(img).match(/ score:(-?\d+) /);
	const score = thumb.dataset.s34Score || (m ? m[1] : '');
	renderHoverInfo(pill, score, thumb.dataset.s34Size || '');
	if (thumb.dataset.s34Size) return;

	// Resolution is only on the post page: load it if you keep hovering
	// (a full second since Beta 3.5, and in line behind what you asked
	// for - sweeping the mouse over the list loads nothing)
	setTimeout(() => {
		if (!thumb.matches(':hover') || thumb.dataset.s34Size) return;
		const a = thumb.querySelector('a[href]');
		if (!a) return;
		pill.classList.add('s34-info-loading');
		fetchPostDoc(a.href, 'hover', { wanted: () => thumb.matches(':hover') }).then(doc => {
			pill.classList.remove('s34-info-loading');
			if (!doc) return;
			const text = (doc.querySelector('#stats') || doc.body || doc.documentElement).textContent;
			const s = text.match(/Size:\s*(\d+)\s*[x×]\s*(\d+)/i);
			const sc = text.match(/Score:\s*(-?\d+)/i);
			if (s) thumb.dataset.s34Size = s[1] + '×' + s[2];
			if (sc) thumb.dataset.s34Score = sc[1];
			renderHoverInfo(pill, thumb.dataset.s34Score || score, thumb.dataset.s34Size || '');
		});
	}, 1000);
}

function setupHoverInfo(thumbs) {
	if (!CONFIG.hoverInfo || NO_HOVER) return;
	(thumbs || allThumbs()).forEach(thumb => {
		if (thumb.dataset.s34Info) return;
		thumb.dataset.s34Info = '1';
		let timer = null;
		thumb.addEventListener('mouseenter', () => {
			clearTimeout(timer);
			timer = setTimeout(() => showHoverInfo(thumb), 300);
		});
		thumb.addEventListener('mouseleave', () => clearTimeout(timer));
	});
}

export { setupHoverInfo };
