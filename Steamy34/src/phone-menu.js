// phone-menu – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG, isPhoneLayout, isPostView, params } from './config.js';
import { downloadOriginal, keyLabel } from './downloads/download.js';
import { downloadButtonHtml, isDownloaded, styleDownloadButton } from './downloads/state.js';
import { getPostSidebarSlot, makeKeyClickable } from './settings-menu.js';
import { getOriginalUrl } from './thumbs.js';

const MENU_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

function setupPhoneMenu() {
	if (!isPhoneLayout() || document.querySelector('.s34-menu-btn')) return;
	const read = sel => {
		const seen = new Set();
		return Array.from(document.querySelectorAll(sel)).map(a => ({
			text: a.textContent.replace(/\s+/g, ' ').trim(),
			href: a.getAttribute('href') || '',
			current: !!a.closest('li.current-page, li[class*="current"]')
		})).filter(l => l.text && l.href && !/^\s*(#|javascript:)/i.test(l.href) && !seen.has(l.href) && seen.add(l.href));
	};
	const siteMenu = !!document.querySelector('label.tlabel');
	const main = siteMenu ? read('#navbar a') : [];
	const sub = siteMenu ? read('#subnavbar a') : [];
	if (siteMenu) console.log('[Steamy34] Phone menu:', main.length, 'site links,', sub.length, 'section links.');

	// Steamy34's own tools on the posts page (the gear is the anchor the
	// other tools are placed around, so they all end up in here)
	const gear = !isPostView && document.querySelector('.s34-gear.s34-inline');
	if (!main.length && !sub.length && !gear) return;

	let tools = null;
	if (gear) {
		tools = document.createElement('div');
		tools.className = 's34-menu-tools';
		document.body.appendChild(tools); // hidden until the menu opens
		tools.appendChild(gear);
	}

	const header = document.getElementById('header');
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 's34-menu-btn' + (header ? '' : ' s34-menu-btn-fixed');
	btn.title = 'Menu';
	btn.setAttribute('aria-label', 'Menu');
	btn.innerHTML = MENU_SVG;
	(header || document.body).appendChild(btn);
	if (main.length || sub.length) document.documentElement.classList.add('s34-phone-menu');

	btn.addEventListener('click', () => {
		if (document.querySelector('.s34-menu-overlay')) return;
		const overlay = document.createElement('div');
		overlay.className = 's34-menu-overlay';
		overlay.innerHTML = `
                <nav class="s34-menu" aria-label="Menu">
                    <div class="s34-menu-head"><b>Menu</b><button type="button" class="s34-menu-x" aria-label="Close">✕</button></div>
                </nav>`;
		const panel = overlay.querySelector('.s34-menu');
		const label = text => {
			const h = document.createElement('div');
			h.className = 's34-menu-label';
			h.textContent = text;
			panel.appendChild(h);
		};
		const section = (title, links) => {
			if (!links.length) return;
			label(title);
			const list = document.createElement('div');
			list.className = 's34-menu-list';
			links.forEach(l => {
				const a = document.createElement('a');
				a.href = l.href;
				a.textContent = l.text;
				if (l.current) a.classList.add('s34-on');
				list.appendChild(a);
			});
			panel.appendChild(list);
		};
		if (tools) {
			label('Steamy34');
			panel.appendChild(tools); // moved in while the menu is open
		}
		const here = main.find(l => l.current);
		section('rule34', main);
		section(here ? here.text : 'This section', sub);

		function close() {
			document.removeEventListener('keydown', onKey, true);
			overlay.classList.remove('s34-show');
			setTimeout(() => {
				if (tools) document.body.appendChild(tools); // back into hiding
				overlay.remove();
			}, 200);
		}
		function onKey(e) {
			if (e.key !== 'Escape' || document.querySelector('.s34-overlay')) return;
			e.preventDefault();
			e.stopPropagation();
			close();
		}
		overlay.addEventListener('click', e => {
			if (e.target === overlay || e.target.closest('.s34-menu-x')) { close(); return; }
			// A tool that opens a window (or select mode): the menu steps
			// aside so the window is on top. Switches & sliders keep it open.
			if (e.target.closest('.s34-menu-tools .s34-gear, .s34-menu-tools .s34-blbtn, .s34-menu-tools .s34-follow-box a[data-fb]:not([data-fb="more"]), .s34-menu-tools .s34-follow-box a[data-fs], .s34-menu-tools .s34-saved-box a[data-ss], .s34-menu-tools .s34-hub button, .s34-menu-tools .s34-tipslink button, .s34-menu-tools .s34-q-select')) close();
		}, true); // (checked before the tool reacts: opening the Following window
		// redraws the Following list, and the tapped row would be gone)
		document.addEventListener('keydown', onKey, true);
		document.body.appendChild(overlay);
		requestAnimationFrame(() => overlay.classList.add('s34-show'));
	});
}

function addDownloadButton() {
	if (!getOriginalUrl()) return;
	const btn = document.createElement('div');
	btn.className = 's34-dl-btn';
	btn.title = 'Download the original file with tags in the filename';
	btn.innerHTML = downloadButtonHtml();
	btn.querySelector('kbd').textContent = keyLabel(CONFIG.downloadKey);
	btn.addEventListener('click', downloadOriginal);
	makeKeyClickable(btn, 'Download the original file');

	const slot = getPostSidebarSlot();
	if (slot) {
		btn.classList.add('s34-inline');
		slot.prepend(btn);
	} else {
		document.body.appendChild(btn);
	}
	if (CONFIG.trackDownloads) styleDownloadButton(btn, isDownloaded(params.get('id')));
}

function logoData() {
	const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5f8f"/><stop offset="1" stop-color="#8b3dff"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".95"><path d="M22 26c-3.2-3 3.2-5.6 0-8.6s3.2-5.6 0-8.4"/><path d="M31 26c-3.2-3 3.2-5.6 0-8.6s3.2-5.6 0-8.4"/><path d="M40 26c-3.2-3 3.2-5.6 0-8.6s3.2-5.6 0-8.4"/></g><path d="M14 31h34v7a13 13 0 0 1-13 13h-8a13 13 0 0 1-13-13z" fill="#fff"/><path d="M47.5 34.5h2.5a5.5 5.5 0 0 1 0 11h-4" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><rect x="11" y="53" width="40" height="3.4" rx="1.7" fill="#fff" opacity=".9"/></svg>';
	return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export { MENU_SVG, addDownloadButton, logoData, setupPhoneMenu };
