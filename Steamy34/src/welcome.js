// welcome – Steamy34 (aus Steamy34.js aufgeteilt)
import { BLOCK_SVG } from './blacklist-window.js';
import { CHANGELOG, CHANGELOG_SEEN_KEY, CURRENT_VERSION, SPARKLE_SVG, compareVersions, openChangelog } from './changelog.js';
import { CONFIG, DISCORD_URL, SETTINGS_UI, isPhoneLayout, isPostView, saveSettingsNow } from './config.js';
import { keyLabel } from './downloads/download.js';
import { BELL_SVG } from './following.js';
import { MOBILE_ANNOUNCE_KEY, MOBILE_ANNOUNCE_VERSION, PHONE_SVG, onTouchDevice, openMobileGuide } from './mobile-guide.js';
import { CF_SHIELD_SVG } from './pages.js';
import { logoData } from './phone-menu.js';
import { CLOCK_SVG, SPLASH_SVG } from './popup-more.js';
import { DISK_SVG } from './saved-searches.js';
import { showToast } from './tag-bar.js';
import { MOUSE_MIDDLE, TIPS_KEY, TIPS_VERSION, openQuickTips } from './tips.js';
import { FOLDER_SVG, THEATER_SVG, openWindow } from './window-shell.js';

const WELCOME_KEY = 'steamy34_welcome_seen';

const TOUR_RESUME_KEY = 's34_tour_resume';

function thumbStyleArt(style) {
	const pic = (h, r) => `<rect x="1" y="1" width="62" height="${h}" rx="${r}" fill="#7b8fb8"/><circle cx="20" cy="14" r="5" fill="#c7d3ee"/><path d="M1 ${h - 6} L22 ${h - 22} L36 ${h - 10} L46 ${h - 18} L63 ${h - 4} V${h - 1 + 2} H1 Z" fill="#5a6d96"/>`;
	const chips = y => `<rect x="5" y="${y}" width="17" height="6" rx="3" fill="#ff8a80"/><rect x="24" y="${y}" width="14" height="6" rx="3" fill="#7ee07e"/><circle cx="56" cy="${y + 3}" r="3.5" fill="#ff6b7a"/>`;
	let body;
	if (style === 'below') body = pic(30, 4) + `<rect x="1" y="33" width="62" height="10" rx="2" fill="#2a2a31"/>` + chips(35);
	else if (style === 'hover') body = pic(42, 4) + `<path d="M44 20 l0 13 l3.2-3 l2.4 5 l2.2-1 l-2.4-5 l4.4-.2 z" fill="#fff" stroke="#222" stroke-width="1"/>`;
	else body = pic(42, 4) + `<rect x="1" y="30" width="62" height="13" fill="rgba(0,0,0,0.35)"/>` + chips(34);
	return `<svg viewBox="0 0 64 44" width="64" height="44" aria-hidden="true">${body}</svg>`;
}

function cornerArt(round) {
	const r = round ? 7 : 0;
	return `<svg viewBox="0 0 64 44" width="64" height="44" aria-hidden="true"><rect x="2" y="2" width="28" height="40" rx="${r}" fill="#7b8fb8"/><rect x="34" y="2" width="28" height="18" rx="${r}" fill="#5a6d96"/><rect x="34" y="24" width="28" height="18" rx="${r}" fill="#9aa9c9"/></svg>`;
}

const KEYS_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';

const HAND_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a6.5 6.5 0 0 1-6.5 6.5h-.6a6 6 0 0 1-4.7-2.3L4.3 15.3a1.6 1.6 0 0 1 2.4-2.1L9 15"/></svg>';

const WEL_HELP_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.8M12 17.2h.01"/></svg>';

const GRID_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/></svg>';

function gestureArt(kind) {
	const dot = (x, y, o = 1) => `<circle cx="${x}" cy="${y}" r="9" fill="#ff5f8f" opacity="${o}"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#fff" stroke-width="2" opacity="${o}"/>`;
	const screen = '<rect x="14" y="4" width="44" height="64" rx="8" fill="#1d1c24" stroke="#4a4858" stroke-width="2"/>';
	const arrow = (d, head) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 5" opacity=".75"/><path d="${head}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
	let g = screen;
	if (kind === 'tap') g += `<circle cx="36" cy="36" r="17" fill="none" stroke="#ff5f8f" stroke-width="2" opacity=".45"/>` + dot(36, 36);
	else if (kind === 'hold') g += `<circle cx="36" cy="36" r="16" fill="none" stroke="#4a4858" stroke-width="3"/><path d="M36 20a16 16 0 1 1-15.2 21" fill="none" stroke="#ff5f8f" stroke-width="3" stroke-linecap="round"/>` + dot(36, 36);
	else if (kind === 'left') g += arrow('M50 36H26', 'M31 30l-6 6 6 6') + dot(52, 36);
	else if (kind === 'right') g += arrow('M22 36h24', 'M41 30l6 6-6 6') + dot(20, 36);
	else if (kind === 'down') g += arrow('M36 18v28', 'M30 41l6 6 6-6') + dot(36, 16);
	else if (kind === 'sideways') g += `<rect x="18" y="44" width="36" height="14" rx="3" fill="#2c2a36"/><rect x="20" y="46" width="10" height="10" rx="2" fill="#7b8fb8"/><rect x="32" y="46" width="10" height="10" rx="2" fill="#5a6d96"/><rect x="44" y="46" width="10" height="10" rx="2" fill="#9aa9c9"/>` + arrow('M48 30H26', 'M31 24l-6 6 6 6') + dot(50, 30);
	else if (kind === 'drag') g += `<rect x="20" y="12" width="14" height="14" rx="3" fill="#7b8fb8"/><rect x="38" y="12" width="14" height="14" rx="3" fill="#5a6d96" opacity=".5"/><rect x="38" y="44" width="14" height="14" rx="3" fill="#9aa9c9" stroke="#ff5f8f" stroke-width="2"/>` + arrow('M28 22c0 18 6 26 14 28', 'M36 51l6-1-2-6') + dot(27, 22);
	else if (kind === 'back') g += `<rect x="20" y="52" width="32" height="10" rx="5" fill="#2c2a36"/><path d="M31 57l5-3.5v7z" fill="#fff"/>` + dot(33, 57, .9);
	else if (kind === 'menu') g += `<path d="M40 13h12M40 17h12M40 21h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>` + dot(46, 17, .9);
	return `<svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">${g}</svg>`;
}

function controlGroups(dev) {
	const k = t => `<kbd>${t}</kbd>`;
	const wasd = CONFIG.browseKeys !== 'arrows', arrows = CONFIG.browseKeys !== 'wasd';
	const L = code => keyLabel(code);
	const ownKeys = [CONFIG.downloadKey, CONFIG.favKey, CONFIG.collectKey, CONFIG.theaterKey, CONFIG.followKey, CONFIG.followingKey];
	if (dev === 'phone') {
		return [
			['Posts', '#ff5f8f', [
				['tap', 'Tap a thumbnail', 'Opens the post in the popup – picture on top, everything else below.'],
				['hold', 'Hold a thumbnail', 'Its buttons slide up: ♥ favourite, ⬇ download, 👁 viewed, 📁 collection, 🕒 Watch later.'],
				['menu', '☰ Menu, top right', 'Steamy34\'s switches, Settings, Blacklist, Following, tips – and all of rule34\'s pages.']
			]],
			['In the popup', '#a77bff', [
				['left', 'Swipe left', 'The next post (at the end of the list, more load by themselves).'],
				['right', 'Swipe right', 'The previous post.'],
				['down', 'Swipe down', 'Closes the post – when you\'re at the top of it.'],
				['tap', 'Tap the picture', 'Full size – move around with your finger, tap again to fit.'],
				['sideways', 'Similar strip', 'More → Similar: swipe the strip under the picture sideways, tap a post to see it.'],
				['back', 'Back button', 'Your phone\'s Back closes the post, sheets and windows.']
			]],
			['Everywhere else', '#4fa3ff', [
				['drag', 'Hold, then drag', 'Collections → "My order": hold a post for a moment, then drag it to its new place.'],
				['tap', 'Tap a tag bubble', 'In the search: excludes the tag, tap again to bring it back.'],
				['hold', 'Hold a picture in a list', 'Never your browser\'s menu on thumbnails – Steamy34\'s buttons instead.']
			]]
		];
	}
	const prevNext = arrows && wasd ? `${k('←')} ${k('→')} or ${k('A')} ${k('D')}` : wasd ? `${k('A')} ${k('D')}` : `${k('←')} ${k('→')}`;
	const prevCodes = (arrows ? ['ArrowLeft', 'ArrowRight'] : []).concat(wasd ? ['KeyA', 'KeyD'] : []);
	return [
		['In the popup', '#ff5f8f', [
			[prevNext, 'Previous / next post', prevCodes, '◀ ▶'],
			[`${k('Esc')} · ${k(MOUSE_MIDDLE + ' Middle click')}`, 'Close the post', ['Escape'], 'Close'],
			[k(L(CONFIG.downloadKey)), 'Download the original, full resolution', [CONFIG.downloadKey], 'Save'],
			[k(L(CONFIG.favKey)), 'Favourite – again to remove it', [CONFIG.favKey], 'Fav'],
			[k(L(CONFIG.collectKey)), 'Put it into a collection (again: close the list)', [CONFIG.collectKey], 'Coll.'],
			[k(L(CONFIG.theaterKey)), 'Theater mode – only the picture', [CONFIG.theaterKey], 'Theater'],
			[k(L(CONFIG.followKey)), 'Follow / unfollow the artist', [CONFIG.followKey], 'Follow'],
			...(wasd ? [[`${k('W')} ${k('S')}`, 'Scroll to the comments and back', ['KeyW', 'KeyS'], 'Scroll']] : []),
			[`${k('Shift')} + ${arrows ? `${k('←')} ${k('→')}` : `${k('A')} ${k('D')}`}`, 'Go through the Similar strip (More → Similar)', ['ShiftLeft'], 'Similar'],
			[`${k(',')} ${k('.')}`, 'Video paused: one frame back / forward', ['Comma', 'Period'], 'Frame']
		]],
		['Anywhere', '#a77bff', [
			[k(L(CONFIG.followingKey)), 'The Following window – your artists\' newest posts', [CONFIG.followingKey], 'Follow­ing'],
			...(ownKeys.includes('KeyX') ? [] : [[k('X'), 'Censored mode – blurs every picture and video (safe screenshots)', ['KeyX'], 'Censor']]),
			[k('Esc'), 'Close any Steamy34 window', ['Escape'], 'Close'],
			[`${k('Ctrl')} + click`, 'A thumbnail: the post page in a new tab instead of the popup', ['ControlLeft'], 'New tab']
		]],
		['Search box', '#4fa3ff', [
			[`${k('Space')} or ${k('Enter')}`, 'Turn the word you typed into a tag bubble', ['Space', 'Enter'], 'Bubble'],
			[`${k('Enter')} on an empty box`, 'Search', ['Enter'], ''],
			[`click a bubble`, 'Exclude the tag – click again to bring it back', [], '']
		]],
		['Mouse', '#f5b301', [
			['Hover a thumbnail', 'Videos play, pictures load sharp, score and size show up', [], ''],
			['Click the picture', 'Full size – drag to look around, click again to fit', [], ''],
			['Wheel over the Similar strip', 'Scrolls it sideways', [], '']
		]]
	];
}

function keyboardArt(groups) {
	const lit = {};
	groups.forEach(([, color, rows]) => rows.forEach(([, what, codes, short]) => (codes || []).forEach(c => {
		if (!lit[c]) lit[c] = { color, short: short || '', what: [] };
		lit[c].what.push(what);
	})));
	const key = (code, label, cls = '') => {
		const l = lit[code];
		const t = l ? ` title="${l.what.join(' · ').replace(/"/g, '&quot;')}"` : '';
		return `<span class="s34-kb-key ${cls}${l ? ' s34-kb-lit' : ''}" data-code="${code}"${l ? ` style="--kc:${l.color}"` : ''}${t}><b>${label}</b>${l && l.short ? `<i>${l.short}</i>` : ''}</span>`;
	};
	const row = (codes, extra = '') => `<div class="s34-kb-row">${extra}${codes.map(c => key('Key' + c, c)).join('')}</div>`;
	return `<div class="s34-kb" aria-hidden="true">
            <div class="s34-kb-main">
                <div class="s34-kb-row">${key('Escape', 'Esc', 's34-kb-wide')}</div>
                ${row('QWERTYUIOP'.split(''))}
                ${row('ASDFGHJKL'.split(''), '<span class="s34-kb-pad"></span>').replace('</div>', key('Enter', 'Enter', 's34-kb-wide') + '</div>')}
                <div class="s34-kb-row">${key('ShiftLeft', 'Shift', 's34-kb-wider')}${'ZXCVBNM'.split('').map(c => key('Key' + c, c)).join('')}${key('Comma', ',')}${key('Period', '.')}</div>
                <div class="s34-kb-row">${key('ControlLeft', 'Ctrl', 's34-kb-wide')}${key('Space', 'Space', 's34-kb-space')}</div>
            </div>
            <div class="s34-kb-arrows">
                <div class="s34-kb-row">${key('ArrowUp', '↑')}</div>
                <div class="s34-kb-row">${key('ArrowLeft', '←')}${key('ArrowDown', '↓')}${key('ArrowRight', '→')}</div>
            </div>
        </div>`;
}

function welcomeChapters(dev) {
	const phone = dev === 'phone';
	const k = t => `<kbd>${t}</kbd>`;
	const dl = keyLabel(CONFIG.downloadKey);
	const prevNext = CONFIG.browseKeys === 'wasd' ? `${k('A')} ${k('D')}` : CONFIG.browseKeys === 'both' ? `${k('←')} ${k('→')} or ${k('A')} ${k('D')}` : `${k('←')} ${k('→')}`;
	const ic = id => (SETTINGS_UI.find(s => s.id === id) || {}).icon || '';
	const tap = phone ? 'Tap' : 'Click', tapl = phone ? 'tap' : 'click';
	const chapters = [
		{
			id: 'welcome', nav: 'Welcome', art: `<img src="${logoData()}" alt="">`, step: 'Welcome',
			title: 'Hi! This is Steamy34',
			text: 'rule34.xxx, upgraded. A cleaner look, a popup viewer, a much easier search, artists you follow, tidy downloads, collections and a blacklist that really keeps things away – ' + (phone ? 'made for your phone too.' : 'on your computer and your phone.') + ' This guide shows everything, chapter by chapter – jump around as you like.',
			promise: ['🎁 Free, always', '🚫 No ads, no tracking', '🔒 Everything stays on your device', '💜 A fan-made hobby project'],
			overview: true,
			note: 'Steamy34 isn\'t made by or connected to rule34.xxx.'
		},
		{
			id: 'controls', nav: phone ? 'Touch controls' : 'Keys & mouse', art: phone ? HAND_SVG : KEYS_SVG, step: phone ? 'Controls · Phone' : 'Controls · Computer',
			title: phone ? 'Everything is a tap, a hold or a swipe' : 'Your keyboard, explained',
			text: phone ? 'No keys needed – these are all the gestures Steamy34 knows.'
			: 'The lit keys do something in Steamy34 (yours, as set in Settings → Viewing posts). Hover one, or press it now to see what it does.',
			controls: true
		},
		{
			id: 'popup', nav: 'Popup viewer', art: ic('viewing'), step: 'Viewing posts',
			title: 'Posts open right here',
			text: tap + ' a post and it opens in a big viewer on top of the list – no new tabs, and you never lose your place.',
			cards: [
				['↔', 'Browse', (phone ? 'Swipe left / right on the picture.' : `${prevNext} for the previous / next post.`) + ' At the end of the list the next page loads by itself.'],
				['✕', 'Close', phone ? 'Swipe down or press Back.' : `${k('Esc')} or a middle click anywhere.`],
				['🔍', 'Full size', phone ? 'Tap the picture, move around with your finger.' : 'Click the picture, drag to look around.'],
				['◫', 'Similar', 'More → Similar: a strip of posts with the same artist and character' + (phone ? ' under the picture – swipe it.' : ` – ${k('Shift')} + ${k('←')} ${k('→')} go through it.`)],
				['▶', 'Auto next', 'A slideshow with your own timer – videos play to the end first.'],
				...(phone ? [] : [[THEATER_SVG, 'Theater mode', `Only the picture, using the whole screen – ${k(keyLabel(CONFIG.theaterKey))}.`]]),
				['💬', 'Everything inside', 'Tags, info chips, votes, favourites, pools and comments.'],
				[CLOCK_SVG, 'Watch later', 'Keep a post for later – it waits in Collections.'],
				[SPLASH_SVG, 'iCame', 'rule34\'s own iCame counter, one ' + tapl + '.'],
				['⋯', 'More', 'Find source, Upscale and Report – they open in a new tab.'],
				['🎬', 'Video tools', 'Speed, loop a part (A–B)' + (phone ? '.' : ` and frame by frame with ${k(',')} ${k('.')}.`)]
			]
		},
		{
			id: 'search', nav: 'Search', art: ic('search'), step: 'Search',
			title: 'Search without typing tags_like_this',
			text: 'Tags become bubbles you can add, remove or exclude with one ' + tapl + '.',
			cards: [
				['🏷️', 'Tag bubbles', phone ? 'Type a tag and pick a suggestion.' : `${k('Space')} or ${k('Enter')} turns a word into a bubble – with suggestions while you type.`],
				['⊘', 'Exclude', tap + ' a bubble to exclude it, again to bring it back.'],
				['🎚️', 'Filters', 'Score, size, sort, type and rating – pin one to keep it for every search.'],
				['★', 'Favourite tags', 'Your go-to tags, one ' + tapl + ' away.'],
				['🕘', 'Recent searches', tap + ' Recent – one ' + tapl + ' runs an earlier search again.'],
				[DISK_SVG, 'Saved searches', 'Save a search with its filters – it shows its new posts.'],
				['🔀', 'Random', 'Sort: Random – "Shuffle again" for a new mix, no repeats while scrolling.']
			]
		},
		{
			id: 'browse', nav: 'Thumbnails', art: ic('posts'), step: 'Browsing',
			title: 'More from every thumbnail',
			text: 'The posts page keeps loading as you scroll, and every thumbnail tells you what you need to know.',
			cards: [
				phone ? ['✋', 'Hold a thumbnail', 'Its buttons slide up: ♥, ⬇, 👁 viewed, 📁 collection, 🕒 Watch later.']
				: ['🖱️', 'Hover', 'Videos play, pictures load sharp, score and size show – ♥ ⬇ 👁 📁 buttons in the corner.'],
				['👁', 'Viewed & downloaded', 'Small marks on the thumbnails – or hide those posts completely.'],
				['+', 'Tags on the picture', '+ adds a tag to the search, ⊘ blacklists it' + (phone ? ' – always shown on phones.' : ' – Shift + + excludes it.')],
				['⧉', 'Versions grouped', 'Versions of one picture show as one thumbnail with "+N versions" (needs your API key).'],
				...(phone ? [] : [['🙈', 'Censored mode', `${k('X')} blurs every picture and video – safe for screenshots.`]]),
				['↕', 'Size', 'The Size slider makes the thumbnails bigger or smaller.']
			]
		},
		{
			id: 'following', nav: 'Following', art: ic('following'), step: 'Following',
			title: 'Your artists, newest first',
			text: tap + ' the bell next to an artist in a post to follow them. Their newest posts wait for you in the Following window.',
			cards: [
				['◎', 'A circle each', 'Everyone you follow sits in a row at the top – a coloured ring means new posts.'],
				['NEW', 'Since your last visit', 'Their newest posts in a grid – NEW on the ones you haven\'t seen.'],
				['↔', 'Browse right there', tap + ' a post and it opens in the popup – ' + (phone ? 'swipe' : prevNext) + ' through that artist.'],
				[BELL_SVG, 'Open it', phone ? 'Following in the ☰ Menu – Back closes it.' : `${k(keyLabel(CONFIG.followingKey))} or a name in the sidebar's Following box.`]
			]
		},
		{
			id: 'downloads', nav: 'Downloads', art: ic('downloads'), step: 'Downloads',
			title: 'One ' + (phone ? 'tap' : 'key') + ', a perfectly named file',
			text: phone ? 'Tap Download for the original file in full resolution.' : `Press ${k(dl)} on any post for the original file in full resolution.`,
			cards: [
				['📄', 'Named for you', '[character] [series] [artist] – no more 8f3a9c…c2.jpg.'],
				['⬇', 'Batch download', 'Tick posts or take a whole collection – with progress, Pause and Cancel.'],
				...(phone ? [] : [['📁', 'Your own folder', 'Settings → Downloads → Choose folder… – even a subfolder per artist.']]),
				['🗂️', 'Downloads window', 'Everything you saved – filter by artist, character or post number.'],
				['✓', 'Never twice', 'Downloaded posts get a mark, and Steamy34 asks before saving one again.']
			]
		},
		{
			id: 'collections', nav: 'Collections', art: FOLDER_SVG, step: 'Organise',
			title: 'Your own folders of posts',
			text: 'Collect posts in folders of your own' + (phone ? ' – 📁 in the popup or by holding a thumbnail.' : ` – ${k(keyLabel(CONFIG.collectKey))} in the popup or 📁 on a thumbnail.`),
			cards: [
				['★', 'Cover', 'Pick the post that shows on the collection\'s card.'],
				['⇅', 'Your order', phone ? 'Sort by date or post number – or hold a post and drag it.' : 'Sort by date or post number – or drag posts into your own order.'],
				['✎', 'A note', 'Write down what a collection is for.'],
				[CLOCK_SVG, 'Watch later', 'A ready-made list for posts you want to see again.'],
				['🔄', 'On all devices', 'Optional: collections live in your rule34 favourites, so your phone has them too.'],
				['📊', 'Stats', 'Your top artists, characters and series.']
			]
		},
		{
			id: 'blacklist', nav: 'Blacklist', art: BLOCK_SVG, step: 'Blacklist',
			title: 'Blocked stays blocked',
			text: 'Steamy34 checks every post against your whole blacklist itself – on every list, while scrolling, in the popup, in Collections and Downloads.',
			cards: [
				['∞', 'As long as you like', 'rule34 only keeps about 4,000 characters – Steamy34 keeps the whole list.'],
				['⊘', 'One ' + tapl, '⊘ next to any tag blacklists it – posts already on screen go grey, with Undo.'],
				['◐', 'Blur instead of hide', 'Per tag: its posts show blurred with a Show button. Any other blacklisted tag still hides them.'],
				['⏱', 'Mute for a while', 'Hide a tag for 24 hours or 7 days – it comes back by itself.'],
				['🛡', 'Opened anyway?', 'A blacklisted post you open by a link is covered – "Show anyway" if you really want to.'],
				['☁', 'On your account', 'Save to account keeps a copy on rule34 for your other devices.']
			]
		},
		{
			id: 'goodtoknow', nav: 'Good to know', art: CF_SHIELD_SVG, step: 'Good to know',
			title: 'Now and then: a quick check',
			text: 'rule34 is protected by Cloudflare, which now and then asks you to confirm you\'re a person. A pulsing notice appears at the bottom – ' + tapl + ' Solve, tick the box, and everything carries on.',
			cards: [
				['⏸', 'Until then, nothing new loads', 'No new pages, previews or post info. Steamy34 pauses meanwhile, so it doesn\'t make things worse.'],
				['✓', 'Solve it right there', 'The check opens where you are – Steamy34 continues where it stopped.'],
				['🔑', 'Fewer checks', 'Optional: your rule34 API key makes them come up less often (Settings → API key).'],
				['💻', 'One device works best', 'Everything is kept in this browser. Using two? A backup combines them (Settings → Privacy & data).']
			]
		},
		{
			id: 'look', nav: 'Your look', art: ic('look'), step: 'Make it yours',
			title: 'Pick your look',
			text: 'Choose a colour mode and how thumbnails show their extras – you can change all of it any time in Settings → Look.',
			picks: [
				{ key: 'theme', label: 'Colour mode', options: [
					['white', '<i style="background:linear-gradient(135deg,#ffffff 50%,#e9e9ee 50%) !important;border-color:#cfcfd6 !important"></i>', 'White'],
					['dark', '<i style="background:linear-gradient(135deg,#26262c 50%,#1b1b1f 50%) !important;border-color:#3a3a44 !important"></i>', 'Dark'],
					['oled', '<i style="background:#000 !important;border-color:#2a2a30 !important"></i>', 'OLED']
				] },
				{ key: 'thumbExtras', label: 'Tags, labels and buttons on thumbnails', options: [
					['on', thumbStyleArt('on'), 'On the picture'],
					['hover', thumbStyleArt('hover'), phone ? 'Clean' : 'Only on hover'],
					['below', thumbStyleArt('below'), 'Below']
				] },
				{ key: 'roundCorners', label: 'Corners', options: [
					[true, cornerArt(true), 'Rounded'],
					[false, cornerArt(false), 'Square']
				] }
			]
		},
		{
			id: 'help', nav: 'Help & more', art: WEL_HELP_SVG, step: 'Help & more',
			title: 'Whenever you need it',
			text: 'Every option, this guide and what changed in each version are always one ' + tapl + ' away.',
			cards: [
				['⚙', 'Settings', 'Every option in one place, with a search field' + (phone ? ' – in the ☰ Menu.' : ' – the ⚙ button in the sidebar.')],
				['?', 'Shortcuts & tips', 'A compact list of every key and gesture – ? in the popup or under Settings.'],
				['✨', 'What\'s new', 'Each update, in plain words – and this guide again: Settings → Help → Welcome guide.'],
				phone ? ['☰', 'The Menu', 'Steamy34\'s switches, Settings and tips are in the ☰ Menu at the top right.']
				: [PHONE_SVG, 'On your phone too', 'Works on Android with Firefox – Settings → Help → On your phone.'],
				['💌', 'Say hi', `Ideas or bugs? Come to the <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">Steamy34 Discord channels</a> – every report helps.`],
				['💜', 'A hobby project', 'Made for fun by steamycorner – free, and never monetized.']
			]
		}
	];
	return chapters;
}

function openWelcome(startAt) {
	if (document.querySelector('.s34-wel-overlay')) return;
	let dev = isPhoneLayout() || onTouchDevice() ? 'phone' : 'computer';
	let chapters = welcomeChapters(dev);
	const w = openWindow({ cls: 's34-wel-overlay s34-wel-big', icon: SPARKLE_SVG, title: 'Welcome to Steamy34', width: 1120 });
	w.setSub(CURRENT_VERSION + ' · everything it can do');
	let idx = Math.min(Math.max(parseInt(startAt, 10) || 0, 0), chapters.length - 1);

	const MOUSE_I = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v6"/></svg>';
	const PHONE_I = PHONE_SVG.replace('width="22" height="22"', 'width="15" height="15"');
	const shell = document.createElement('div');
	shell.className = 's34-wel-shell';
	shell.innerHTML = `
            <nav class="s34-wel-nav"></nav>
            <div class="s34-wel-main">
                <div class="s34-wel-topbar">
                    <div class="s34-wel-devices" role="tablist">
                        <button type="button" data-dev="computer" role="tab">${MOUSE_I} Computer</button>
                        <button type="button" data-dev="phone" role="tab">${PHONE_I} Phone</button>
                    </div>
                    <span class="s34-wel-count"></span>
                </div>
                <div class="s34-wel-scroll"></div>
            </div>`;
	const nav = shell.querySelector('.s34-wel-nav');
	const scroller = shell.querySelector('.s34-wel-scroll');
	const foot = document.createElement('div');
	foot.className = 's34-wel-foot';
	foot.innerHTML = `
            <button type="button" class="s34-wel-skip">Skip</button>
            <span class="s34-wel-progress"><i></i></span>
            <button type="button" class="s34-wel-btn s34-wel-prev">Back</button>
            <button type="button" class="s34-wel-next">Next</button>`;
	w.body.append(shell, foot);

	const ico = i => (/^\s*</.test(i) ? i : `<span>${i}</span>`);
	function renderNav() {
		nav.innerHTML = chapters.map((c, i) => `<button type="button" data-i="${i}"${i === idx ? ' class="s34-on" aria-current="step"' : ''}><span class="s34-wel-navico">${ico(c.art.startsWith('<img') ? GRID_SVG : c.art)}</span><span>${c.nav}</span></button>`).join('');
		shell.querySelectorAll('.s34-wel-devices button').forEach(b => {
			const on = b.dataset.dev === dev;
			b.classList.toggle('s34-on', on);
			b.setAttribute('aria-selected', on ? 'true' : 'false');
		});
		const on = nav.querySelector('.s34-on');
		if (on) try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
	}
	function controlsHtml() {
		const groups = controlGroups(dev);
		if (dev === 'phone') {
			return `<div class="s34-wel-gestures">${groups.map(([title, color, rows]) => `
                    <section class="s34-wel-cgroup" style="--gc:${color}">
                        <div class="s34-wel-cgtitle">${title}</div>
                        <div class="s34-wel-gcards">${rows.map(([kind, name, what]) => `
                            <div class="s34-wel-gcard">${gestureArt(kind)}<div><b>${name}</b><span>${what}</span></div></div>`).join('')}</div>
                    </section>`).join('')}</div>`;
		}
		return `${keyboardArt(groups)}
                <div class="s34-kb-try"><span>Press a key…</span></div>
                <div class="s34-wel-legend">${groups.map(([title, color, rows]) => `
                    <section class="s34-wel-cgroup" style="--gc:${color}">
                        <div class="s34-wel-cgtitle">${title}</div>
                        ${rows.map(([keys, what, codes]) => `<div class="s34-wel-crow" data-codes="${(codes || []).join(' ')}"><div class="s34-wel-ckeys">${keys}</div><div class="s34-wel-cwhat">${what}</div></div>`).join('')}
                    </section>`).join('')}</div>`;
	}
	function render(dir) {
		const s = chapters[idx];
		const last = idx === chapters.length - 1;
		const stage = document.createElement('div');
		stage.className = 's34-wel-stage' + (dir < 0 ? ' s34-wel-back' : '');
		stage.dataset.chapter = s.id;
		stage.innerHTML = `
                <div class="s34-wel-hero">
                    <div class="s34-wel-art">${s.art}</div>
                    <div class="s34-wel-hero-text">
                        <span class="s34-wel-step">${s.step}</span>
                        <h3></h3>
                        <p>${s.text}</p>
                    </div>
                </div>
                ${s.promise ? `<div class="s34-wel-promise">${s.promise.map(p => `<span>${p}</span>`).join('')}</div>` : ''}
                ${s.overview ? `<div class="s34-wel-overview">${chapters.slice(1).map((c, i) => `
                    <button type="button" class="s34-wel-otile" data-go="${i + 1}"><span class="s34-wel-ico">${ico(c.art)}</span><b>${c.nav}</b><span>${c.title}</span></button>`).join('')}</div>` : ''}
                ${s.controls ? controlsHtml() : ''}
                ${(s.picks || []).map((p, pi) => `${p.label ? `<div class="s34-wel-picklabel">${p.label}</div>` : ''}<div class="s34-wel-themes" data-pick="${pi}">${p.options.map(([, art, label], oi) => `<button type="button" data-o="${oi}">${art}${label}</button>`).join('')}</div>`).join('')}
                ${s.cards ? `<div class="s34-wel-cards">${s.cards.map(([i, b, t]) => `
                    <div class="s34-wel-card"><div class="s34-wel-ico">${ico(i)}</div><div><b>${b}</b><span>${t}</span></div></div>`).join('')}</div>` : ''}
                ${s.note ? `<p class="s34-wel-note">${s.note}</p>` : ''}`;
		stage.querySelector('h3').textContent = s.title;
		stage.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
		// Pickers: saved at once, then the page reloads (the look is set up
		// while it loads) and the guide comes back on this chapter
		stage.querySelectorAll('.s34-wel-themes[data-pick]').forEach(row => {
			const p = s.picks[+row.dataset.pick];
			row.querySelectorAll('button').forEach(b => {
				const v = p.options[+b.dataset.o][0];
				b.classList.toggle('s34-on', CONFIG[p.key] === v);
				b.addEventListener('click', () => {
					if (CONFIG[p.key] === v) return;
					saveSettingsNow({ [p.key]: v });
					try { sessionStorage.setItem(TOUR_RESUME_KEY, String(idx)); } catch (e) {}
					location.reload();
				});
			});
		});
		// Keyboard: a row of the list lights its keys up, and the other way round
		stage.querySelectorAll('.s34-wel-crow[data-codes]').forEach(r => {
			const codes = r.dataset.codes.split(' ').filter(Boolean);
			r.addEventListener('mouseenter', () => codes.forEach(c => stage.querySelectorAll(`.s34-kb-key[data-code="${c}"]`).forEach(x => x.classList.add('s34-kb-hot'))));
			r.addEventListener('mouseleave', () => stage.querySelectorAll('.s34-kb-hot').forEach(x => x.classList.remove('s34-kb-hot')));
		});
		scroller.replaceChildren(stage);
		scroller.scrollTop = 0;
		renderNav();
		shell.querySelector('.s34-wel-count').textContent = `${idx + 1} / ${chapters.length}`;
		foot.querySelector('.s34-wel-progress i').style.width = Math.round((idx + 1) / chapters.length * 100) + '%';
		foot.querySelector('.s34-wel-prev').hidden = idx === 0;
		foot.querySelector('.s34-wel-skip').hidden = last;
		foot.querySelector('.s34-wel-next').textContent = idx === 0 ? 'Show me' : last ? 'Let\'s go!' : 'Next: ' + chapters[idx + 1].nav;
	}
	function go(to) {
		if (to < 0) return;
		if (to >= chapters.length) { w.close(); return; }
		const dir = to < idx ? -1 : 1;
		idx = to;
		render(dir);
	}
	nav.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) go(+b.dataset.i); });
	shell.querySelector('.s34-wel-devices').addEventListener('click', e => {
		const b = e.target.closest('[data-dev]');
		if (!b || b.dataset.dev === dev) return;
		dev = b.dataset.dev;
		chapters = welcomeChapters(dev);
		render(0);
	});
	foot.addEventListener('click', e => {
		const b = e.target.closest('button');
		if (!b) return;
		if (b.classList.contains('s34-wel-next')) go(idx + 1);
		else if (b.classList.contains('s34-wel-prev')) go(idx - 1);
		else if (b.classList.contains('s34-wel-skip')) w.close();
	});
	// ← / → step through the chapters. On the keyboard chapter, any other
	// key lights up and says what it does.
	let tryTimer = null;
	function onKey(e) {
		if (e.ctrlKey || e.metaKey || e.altKey || !w.overlay.isConnected) return;
		if (document.querySelector('.s34-tips-overlay')) return;
		const t = e.target;
		if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
		if (e.key === 'Escape') return; // (the window closes itself)
		const stage = scroller.querySelector('.s34-wel-stage[data-chapter="controls"]');
		if (stage && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
			const keyEl = stage.querySelector(`.s34-kb-key[data-code="${e.code}"]`);
			const out = stage.querySelector('.s34-kb-try');
			if (!keyEl || !out) return;
			e.preventDefault(); e.stopImmediatePropagation();
			stage.querySelectorAll('.s34-kb-press').forEach(x => x.classList.remove('s34-kb-press'));
			keyEl.classList.add('s34-kb-press');
			const label = keyEl.querySelector('b').textContent;
			out.innerHTML = keyEl.classList.contains('s34-kb-lit')
				? `<kbd></kbd><span></span>` : `<kbd></kbd><span class="s34-kb-none">does nothing in Steamy34 – rule34 and your browser keep it</span>`;
			out.querySelector('kbd').textContent = label;
			if (keyEl.classList.contains('s34-kb-lit')) out.querySelector('span').textContent = keyEl.title;
			clearTimeout(tryTimer);
			tryTimer = setTimeout(() => keyEl.classList.remove('s34-kb-press'), 900);
			return;
		}
		if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); go(idx + 1); }
		else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(idx - 1); }
	}
	window.addEventListener('keydown', onKey, true);
	// Phones: swipe through the chapters
	let touchX = null, touchY = null;
	scroller.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
	scroller.addEventListener('touchend', e => {
		if (touchX == null) return;
		const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
		touchX = null;
		if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest('.s34-wel-themes')) go(idx + (dx < 0 ? 1 : -1));
	});
	w.onClose = () => {
		window.removeEventListener('keydown', onKey, true);
		try {
			GM_setValue(WELCOME_KEY, 1);
			// The guide covers these – no extra windows right after it
			if (GM_getValue(TIPS_KEY, 0) < TIPS_VERSION) GM_setValue(TIPS_KEY, TIPS_VERSION);
			GM_setValue(CHANGELOG_SEEN_KEY, CURRENT_VERSION);
			GM_setValue(MOBILE_ANNOUNCE_KEY, MOBILE_ANNOUNCE_VERSION);
		} catch (e) {}
	};
	render(0);
	foot.querySelector('.s34-wel-next').focus({ preventScroll: true });
}

function maybeShowQuickTips() {
	if (isPostView || !document.querySelector('.image-list')) return;
	let tipsSeen = 0, clSeen = null;
	try {
		tipsSeen = GM_getValue(TIPS_KEY, 0);
		clSeen = GM_getValue(CHANGELOG_SEEN_KEY, null);
	} catch (e) {}

	// Coming back from picking a colour mode in the welcome tour
	let resume = null;
	try { resume = sessionStorage.getItem(TOUR_RESUME_KEY); sessionStorage.removeItem(TOUR_RESUME_KEY); } catch (e) {}
	if (resume !== null) {
		setTimeout(() => { if (!document.querySelector('.s34-overlay')) openWelcome(resume); }, 300);
		return;
	}

	let show = null;
	if (!tipsSeen) {
		show = () => openWelcome(0);               // brand new: the welcome tour
		GM_setValue(CHANGELOG_SEEN_KEY, CURRENT_VERSION);
	} else {
		const since = clSeen || '12.2';            // used Steamy34 before the changelog existed
		const unseen = CHANGELOG.filter(e => compareVersions(e.v, since) > 0);
		if (unseen.some(e => e.notify)) {
			show = () => openChangelog(since);
			GM_setValue(TIPS_KEY, TIPS_VERSION);   // the changelog covers it - no tips on top
		} else {
			if (compareVersions(CURRENT_VERSION, since) > 0) {
				GM_setValue(CHANGELOG_SEEN_KEY, CURRENT_VERSION);
				// (Beta 3.8.2) A small update: no window, but a short note
				// once, so you know something changed
				setTimeout(() => showToast(`Steamy34 updated to ${CURRENT_VERSION}`, 'What\'s new', () => openChangelog(since), 9000), 1200);
			}
			if (tipsSeen < TIPS_VERSION) show = () => openQuickTips();
		}
	}
	// Nothing else to show: the "on your phone" announcement, once
	// (not on a phone itself - you're already there)
	if (!show && tipsSeen) {
		let seen = 0;
		try { seen = GM_getValue(MOBILE_ANNOUNCE_KEY, 0); } catch (e) {}
		if (seen < MOBILE_ANNOUNCE_VERSION) {
			if (onTouchDevice()) GM_setValue(MOBILE_ANNOUNCE_KEY, MOBILE_ANNOUNCE_VERSION);
			else show = () => openMobileGuide();
		}
	}
	if (!show) return;
	setTimeout(() => {
		if (!document.querySelector('.s34-overlay')) show();
	}, 1200);
}

export { maybeShowQuickTips, openWelcome };
