// tips – Steamy34 (aus Steamy34.js aufgeteilt)
import { CURRENT_VERSION, SPARKLE_SVG, openChangelog } from './changelog.js';
import { CONFIG, SETTINGS_UI, isPhoneLayout } from './config.js';
import { keyLabel } from './downloads/download.js';
import { BELL_SVG } from './following.js';
import { PHONE_SVG, onTouchDevice } from './mobile-guide.js';
import { MENU_SVG, logoData } from './phone-menu.js';
import { DISK_SVG } from './saved-searches.js';
import { FOLDER_SVG, THEATER_SVG } from './window-shell.js';

const TIPS_KEY = 'steamy34_tips_seen';

const TIPS_VERSION = 11;

const MOUSE_MIDDLE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v6" /><rect x="10.6" y="5.5" width="2.8" height="4.5" rx="1.4" fill="currentColor" stroke="none"/></svg>';

function openQuickTips() {
	if (document.querySelector('.s34-tips-overlay')) return;
	const key = keyLabel(CONFIG.downloadKey);
	const k = t => `<kbd>${t}</kbd>`;
	// A small example of a tag in the search box (crossed out = excluded)
	const pill = (t, ex) => `<span class="s34-tips-pill${ex ? ' s34-tips-pill-ex' : ''}">${t}<i>×</i></span>`;
	// Small "NEW" label for the latest additions
	const nu = '<span class="s34-tips-new">NEW</span>';
	const EYE = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
	const MOUSE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v6"/></svg>';
	const PHONE = PHONE_SVG.replace('width="22" height="22"', 'width="15" height="15"');
	const icon = id => ((SETTINGS_UI.find(s => s.id === id) || {}).icon || '');
	const SLIDERS = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>';

	// Same on computer and phone
	const searchGroup = ['Search box', icon('search'), [
		[`${k('Space')} or ${k('Enter')}`, `Turn what you typed into a tag bubble: ${pill('lara croft')}`],
		[`${k('Enter')} on an empty box`, 'Search'],
		[`Tap / click a tag bubble`, `Exclude it ${pill('lara croft', true)} – again to include it`],
		[`${k('×')} on a tag bubble`, 'Remove it from the search'],
		[`${k('Pin')} next to a filter`, 'Keep that filter (Score, Size, Sort, Type, Rating) for every new search'],
		[`${k('★ Tags')}`, 'Your favourite tags – one tap puts one in the search'],
		[`${k('Recent')}`, 'Run your earlier searches again'],
		[`${k(DISK_SVG.replace('width="16" height="16"', 'width="13" height="13"'))} next to Search`, 'Save the search with its filters – it shows up under Saved searches, with its new posts']
	]];
	const sidebarGroup = ['Sidebar', SLIDERS, [
		[`${k('White')} ${k('Dark')} ${k('OLED')}`, 'Colour mode – in Settings → Look (OLED is true black)'],
		[`${k('Hide viewed')} / ${k('Hide downloaded')}`, 'Only show posts you haven\'t seen / saved yet'],
		[`${k('Size')} slider`, 'Make the thumbnails bigger or smaller'],
		[`${k('⬇ Batch download')}`, 'Tick posts (or "Select all new"), then download them – a panel shows progress with Pause / Cancel – or add them to a collection'],
		[`${k('Collections')} · ${k('Stats')}`, 'Your own folders · your top artists, characters & series'],
		[`${k(BELL_SVG.replace('width="16" height="16"', 'width="13" height="13"') + ' Following')}`, `${nu}Everything you follow, each with a count of its new posts – click one for their newest posts in the Following window. The bell next to an artist in a post follows them`],
		[`${k('Blacklist')}`, 'See, sort and edit everything you blacklisted – click a tag to blur its posts instead of hiding them'],
		[`${k('Solve')}`, `${nu}A Cloudflare check came up (the pulsing notice at the bottom): Solve, tick the box – nothing new loads until it's done`],
		[`${k('⚙ Settings')}`, 'Every option, plus backup and what is stored on your device'],
		[`${k('Choose folder…')}`, `${nu}Settings → Downloads: save straight into any folder, e.g. Eagle's watch folder (computer)`]
	]];

	const MODES = {
		computer: [
			['Popup viewer', icon('viewing'), [
				[`${k(MOUSE_MIDDLE + ' Middle click')}`, 'Close the post – anywhere in the popup'],
				[`${k('Esc')}`, 'Close the post (or any Steamy34 window)'],
				[CONFIG.browseKeys === 'wasd' ? `${k('A')} ${k('D')}` : CONFIG.browseKeys === 'both' ? `${k('←')} ${k('→')} / ${k('A')} ${k('D')}` : `${k('←')} ${k('→')}`,
				 `${nu}Previous / next post – arrow keys or WASD in Settings → Viewing posts`],
				[`${k(key)}`, 'Download the original in maximum resolution'],
				[`${k(keyLabel(CONFIG.favKey))} ${k(keyLabel(CONFIG.collectKey))} ${k(keyLabel(CONFIG.theaterKey))}`, 'Favourite (again: remove) · add to a collection · theater mode (keys changeable in Settings → Viewing posts)'],
				[`${k(keyLabel(CONFIG.followKey))}`, `${nu}Follow (or unfollow) the post's artist`],
				...(CONFIG.browseKeys !== 'arrows' ? [[`${k('W')} ${k('S')}`, `${nu}Scroll to the comments and back`]] : []),
				[`${k('Click')} the picture`, 'Full size – drag to move around, click again to fit'],
				[`${k('▶ Auto next')}`, 'Slideshow – the slider sets the seconds per post; videos play to the end first'],
				[`${k('Scroll')} down`, 'Read the comments below the picture'],
				[`${k(THEATER_SVG + ' Theater')}`, 'Hide the sidebar – the picture uses the whole screen'],
				[`${k(FOLDER_SVG + ' Collection')}`, 'Save the post in one of your own folders'],
				[`${k('♥')} / ${k('▲')}`, 'Add to your favourites / vote up (needs a rule34 login)'],
				[`${k('Ctrl')} + ${k('Click')} a thumbnail`, 'Open the full post page instead (new tab)']
			]],
			['Browsing', icon('posts'), [
				[`${k(keyLabel(CONFIG.followingKey))}`, `${nu}The Following window: your artists' newest posts in a grid – ← / → switch artists, Esc closes`],
				[`${k('Hover')} a thumbnail`, 'Videos play, images load in full quality, score & size show up'],
				[`${k('+')} / ${k('⊘')} on a tag`, 'Add the tag to your search / blacklist it'],
				[`${k('Shift')} + ${k('+')}`, 'Exclude the tag from your search (-tag)'],
				[`${k('⬇')} / ${k(EYE)} in a corner`, 'You already downloaded / viewed this post'],
				[`${k('X')}`, `${nu}Censored mode: blurs every picture and video (and comments) – safe for screenshots; X again to turn it off`],
				[`"Quick check needed" at the bottom`, `${nu}Cloudflare wants a robot check – click "Solve"; nothing new loads until then`]
			]],
			searchGroup, sidebarGroup
		],
		phone: [
			['Popup viewer', icon('viewing'), [
				[`${k('Tap')} a thumbnail`, 'Open the post – picture on top, everything else below'],
				[`${k('Swipe ←')} ${k('Swipe →')}`, `${nu}Next / previous post – swipe on the picture`],
				[`${k('Swipe ↓')} on the picture`, `${nu}Close the post (when you're at the top)`],
				[`${k('Back')} or ${k('✕')}`, `${nu}Close the post – your phone's Back button works too`],
				[`${k('Scroll')} down`, 'Download, ♥, info, tags – and the comments at the very bottom'],
				[`${k('Tap')} the picture`, 'Full size – move around with your finger, tap again to fit'],
				[`${k('▶ Auto next')}`, 'Slideshow – the slider sets the seconds per post; videos play to the end first'],
				[`${k('Long-press')} a thumbnail`, 'Your browser\'s menu – e.g. open the full post in a new tab']
			]],
			['Browsing', icon('posts'), [
				[`${k(MENU_SVG.replace('width="20" height="20"', 'width="13" height="13"') + ' Menu')} top right`, `${nu}Steamy34's tools (switches, Settings, Blacklist, tips) and all of rule34's pages`],
				[`${k('+')} / ${k('⊘')} on a tag`, `${nu}Add the tag to your search / blacklist it – always shown on phones`],
				[`Following in the ${k('Menu')}`, `${nu}Your artists' newest posts in a full-screen grid – tap a circle to switch, Back closes`],
				[`${k('♥')} on a thumbnail`, 'Add the post to your favourites (needs a rule34 login)'],
				[`${k('⬇')} / ${k(EYE)} in a corner`, 'You already downloaded / viewed this post'],
				[`"Quick check needed" at the bottom`, `${nu}Cloudflare wants a robot check – tap "Solve"`],
				[`Hover previews`, 'Need a mouse – on a phone, just open the post']
			]],
			searchGroup, sidebarGroup
		]
	};
	let mode = isPhoneLayout() || onTouchDevice() ? 'phone' : 'computer';

	const overlay = document.createElement('div');
	overlay.className = 's34-overlay s34-tips-overlay';
	overlay.innerHTML = `
            <div class="s34-tips" role="dialog" aria-modal="true">
                <div class="s34-tips-head">
                    <img src="${logoData()}" alt="">
                    <div>
                        <div class="s34-tips-title">Quick tips</div>
                        <div class="s34-tips-sub">The handiest keys, clicks &amp; gestures in Steamy34</div>
                    </div>
                    <button type="button" class="s34-tips-close" title="Close (Esc)">✕</button>
                </div>
                <div class="s34-tips-modes" role="tablist">
                    <button type="button" data-mode="computer" role="tab">${MOUSE} Computer</button>
                    <button type="button" data-mode="phone" role="tab">${PHONE} Phone</button>
                </div>
                <div class="s34-tips-body"></div>
                <div class="s34-tips-foot">
                    <span>Open this again with <span class="s34-qmark">?</span> in the popup or under the ⚙ Settings button – on phones in the ☰ Menu.
                        <small class="s34-tips-hobby">Steamy34 is a free fan-made hobby project by steamycorner – never monetized.</small></span>
                    <button type="button" class="s34-tips-ok">Got it</button>
                </div>
            </div>`;

	const body = overlay.querySelector('.s34-tips-body');
	function render() {
		overlay.querySelectorAll('.s34-tips-modes button').forEach(b => {
			const on = b.dataset.mode === mode;
			b.classList.toggle('s34-on', on);
			b.setAttribute('aria-selected', on ? 'true' : 'false');
		});
		body.innerHTML = MODES[mode].map(([title, ic, rows]) => `
                <section class="s34-tips-group">
                    <div class="s34-tips-label">${ic}<span>${title}</span></div>
                    <div class="s34-tips-card">
                        ${rows.map(([keys, what]) => `
                            <div class="s34-tips-row">
                                <div class="s34-tips-keys">${keys}</div>
                                <div class="s34-tips-what">${what}</div>
                            </div>`).join('')}
                    </div>
                </section>`).join('');
		body.scrollTop = 0;
	}
	overlay.querySelectorAll('.s34-tips-modes button').forEach(b =>
															   b.addEventListener('click', () => { mode = b.dataset.mode; render(); }));
	render();

	function close() {
		GM_setValue(TIPS_KEY, TIPS_VERSION);
		document.removeEventListener('keydown', onKey, true);
		overlay.remove();
	}
	function onKey(e) {
		if (e.key === 'Escape' || e.key === 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			close();
		}
	}
	overlay.querySelector('.s34-tips-close').addEventListener('click', close);
	overlay.querySelector('.s34-tips-ok').addEventListener('click', close);
	overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
	document.addEventListener('keydown', onKey, true);
	document.body.appendChild(overlay);
	overlay.querySelector('.s34-tips-ok').focus({ preventScroll: true });
}

function addTipsLink() {
	if (document.querySelector('.s34-tipslink')) return;
	const gear = document.querySelector('.s34-gear.s34-inline');
	if (!gear) return;
	// "? Shortcuts & tips · ✨ What's new"
	const row = document.createElement('div');
	row.className = 's34-tipslink';
	const link = document.createElement('button');
	link.type = 'button';
	link.innerHTML = '<span class="s34-qmark">?</span> Shortcuts &amp; tips';
	link.title = 'The most important keys & clicks';
	link.addEventListener('click', openQuickTips);
	const news = document.createElement('button');
	news.type = 'button';
	news.innerHTML = SPARKLE_SVG + ' What\'s new';
	news.title = 'Changelog – what changed in each version';
	news.addEventListener('click', () => openChangelog(null));
	row.append(link, news);
	gear.after(row);
	// Logo + installed version, small and quiet under the links
	const brand = document.createElement('div');
	brand.className = 's34-brand';
	brand.title = 'Steamy34 ' + CURRENT_VERSION;
	brand.innerHTML = `<img src="${logoData()}" alt=""><span>Steamy34</span><small class="s34-brand-ver"></small>`;
	brand.querySelector('small').textContent = CURRENT_VERSION;
	row.after(brand);
}

export { MOUSE_MIDDLE, TIPS_KEY, TIPS_VERSION, addTipsLink, openQuickTips };
