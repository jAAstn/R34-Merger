// tag-bar – Steamy34 (aus Steamy34.js aufgeteilt)
import { acQuery } from './autocomplete.js';
import { blockModeOf, blockedTagSet, blockedTagsOf, isBlocked, readBlocklist, toggleBlock } from './blacklist.js';
import { CONFIG, isPostView } from './config.js';
import { markSoft } from './list-actions.js';
import { cloudflarePaused, fetchPostDoc } from './pages.js';
import { popupState, renderPopupTags } from './popup.js';
import { makeAddButton, searchState, searchWords } from './search-box.js';
import { getTagFromRow, pageThumbs, thumbTags } from './thumbs.js';

const TAGTYPE_KEY = 'steamy34_tagtypes';

const TAGTYPE_LIMIT = 40000;

const tagTypes = new Map(Object.entries((() => {
	try { return GM_getValue(TAGTYPE_KEY, {}) || {}; } catch (e) { return {}; }
})()));

let tagTypeSaveTimer = null;

function learnTagTypes(doc) {
	let learned = 0;
	doc.querySelectorAll('#tag-sidebar li[class*="tag-type-"]').forEach(row => {
		const m = row.className.match(/tag-type-([a-z]+)/);
		const tag = getTagFromRow(row).toLowerCase();
		if (!m || !tag) return;
		if (tagTypes.get(tag) !== m[1]) {
			tagTypes.set(tag, m[1]);
			learned++;
		}
	});
	if (learned) {
		scheduleTagTypeSave();
		if (CONFIG.thumbTagBar && !isPostView) refreshTagBars();
	}
}

const TAGTYPE_SAVE_MS = 15000;

function scheduleTagTypeSave() {
	if (tagTypeSaveTimer) return; // a save is already on its way
	tagTypeSaveTimer = setTimeout(saveTagTypes, TAGTYPE_SAVE_MS);
}

function flushTagTypes() {
	if (tagTypeSaveTimer) saveTagTypes();
}

const acMissed = new Set();

function normalizeType(t) {
	t = String(t || '').toLowerCase();
	if (t === 'meta') return 'metadata';
	if (t === 'char') return 'character';
	return t;
}

async function lookupTypesViaSuggestions(tags) {
	let learned = 0;
	for (const tag of tags) {
		if (tagTypes.has(tag) || acMissed.has(tag)) continue;
		const list = await acQuery(tag);
		const hit = list.find(s => s.value.toLowerCase() === tag && s.type);
		if (hit) {
			tagTypes.set(tag, normalizeType(hit.type));
			learned++;
		} else {
			acMissed.add(tag);
		}
		await new Promise(r => setTimeout(r, 120)); // small gap between requests
	}
	if (learned) scheduleTagTypeSave();
	return learned;
}

function saveTagTypes() {
	clearTimeout(tagTypeSaveTimer);
	tagTypeSaveTimer = null;
	// Keep the newest entries if the memory gets too big
	if (tagTypes.size > TAGTYPE_LIMIT) {
		const keep = Array.from(tagTypes.entries()).slice(-Math.floor(TAGTYPE_LIMIT * 0.75));
		tagTypes.clear();
		keep.forEach(([k, v]) => tagTypes.set(k, v));
	}
	try { GM_setValue(TAGTYPE_KEY, Object.fromEntries(tagTypes)); } catch (e) {}
}

function thumbTagList(thumb) {
	const img = thumb.querySelector('img');
	return img ? thumbTags(img).trim().split(' ').filter(Boolean) : [];
}

function prettyTag(tag) {
	return tag.replace(/_/g, ' ');
}

function makeChip(tag, type, blockedSet, words) {
	const isBl = blockedSet.has(tag);
	const chip = document.createElement('span');
	chip.className = 's34-chip s34-chip-' + type + (isBl ? ' s34-chip-blocked' : '');

	const name = document.createElement('a');
	name.className = 's34-chip-name';
	name.href = 'index.php?page=post&s=list&tags=' + encodeURIComponent(tag);
	name.textContent = prettyTag(tag);
	name.title = (isBl ? 'Blacklisted – ' : '') + 'Search ' + prettyTag(tag);

	const block = document.createElement('button');
	block.type = 'button';
	block.className = 's34-chip-block';
	block.textContent = isBl ? '↺' : '⊘'; // ↺ unblock / ⊘ block
	block.title = (isBl ? 'Remove from blacklist: ' : 'Blacklist ') + prettyTag(tag);
	block.addEventListener('click', e => {
		e.preventDefault();
		e.stopPropagation();
		toggleFromBar(tag);
	});

	chip.append(name);
	// "+" / "−" / "↺": add the tag to the search or take it out again
	if (CONFIG.addToSearchButtons) chip.append(makeAddButton(tag, 's34-chip-add', words));
	chip.append(block);
	return chip;
}

function tagBarContext() {
	return {
		blockedSet: new Set(readBlocklist().map(t => t.toLowerCase())),
		words: CONFIG.addToSearchButtons ? searchWords() : []
	};
}

function renderTagBar(thumb, ctx) {
	const tags = thumb._s34Tags || (thumb._s34Tags = thumbTagList(thumb));
	const groups = [
		['artist', tags.filter(t => tagTypes.get(t) === 'artist')],
		['character', tags.filter(t => tagTypes.get(t) === 'character')]
	];
	const state = {
		hasArtist: groups[0][1].length > 0,
		hasUnknown: tags.some(t => !tagTypes.has(t))
	};
	ctx = ctx || tagBarContext();

	// Nothing changed since the last time? Then leave the DOM alone
	// (rebuilding hundreds of bars was what made long pages slow).
	const shown = groups.map(([type, list]) => [type, list.slice(0, CONFIG.tagBarMax), list.length]);
	const sig = JSON.stringify([
		shown,
		shown.map(([, list]) => list.map(t => (ctx.blockedSet.has(t) ? 'b' : '') + searchState(t, ctx.words))),
		thumb.dataset.s34Lookup || ''
	]);
	let bar = thumb.querySelector('.s34-tagbar');
	if (bar && thumb._s34BarSig === sig) return state;
	thumb._s34BarSig = sig;

	if (!bar) {
		bar = document.createElement('div');
		bar.className = 's34-tagbar';
		thumb.appendChild(bar);
	}
	bar.replaceChildren();
	const blockedSet = ctx.blockedSet;

	groups.forEach(([type, list]) => {
		if (!list.length) return;
		const row = document.createElement('div');
		row.className = 's34-chiprow';
		list.slice(0, CONFIG.tagBarMax).forEach(t => row.appendChild(makeChip(t, type, blockedSet, ctx.words)));
		if (list.length > CONFIG.tagBarMax) {
			const more = document.createElement('span');
			more.className = 's34-chip-more';
			more.textContent = '+' + (list.length - CONFIG.tagBarMax);
			more.title = list.slice(CONFIG.tagBarMax).map(prettyTag).join(', ');
			row.appendChild(more);
		}
		bar.appendChild(row);
	});
	// Nothing known yet but a lookup is on its way -> small placeholder
	if (!bar.childElementCount && thumb.dataset.s34Lookup === 'queued') {
		const wait = document.createElement('span');
		wait.className = 's34-chip-more s34-chip-wait';
		wait.textContent = 'loading tags…';
		bar.appendChild(wait);
	}
	bar.style.display = bar.childElementCount ? '' : 'none';

	return state;
}

const barsInView = new Set();

let refreshBarsTimer = null;

function refreshTagBars() {
	if (refreshBarsTimer) return;
	refreshBarsTimer = setTimeout(() => {
		refreshBarsTimer = null;
		const ctx = tagBarContext();
		barsInView.forEach(thumb => {
			if (thumb.isConnected) renderTagBar(thumb, ctx);
			else barsInView.delete(thumb);
		});
	}, 250);
}

const lookupQueue = [];

let lookupRunning = false;

function queueLookup(thumb) {
	if (thumb.dataset.s34Lookup) return;
	thumb.dataset.s34Lookup = 'queued';
	lookupQueue.push(thumb);
	renderTagBar(thumb); // shows the "…" placeholder
	runLookups();
}

function nearViewport(el, margin = 600) {
	const r = el.getBoundingClientRect();
	return r.bottom > -margin && r.top < window.innerHeight + margin;
}

function unqueue(thumb) {
	delete thumb.dataset.s34Lookup;
	if (thumb.isConnected) renderTagBar(thumb);
}

let lookupRunId = 0;

let lookupProgressAt = 0;

async function runLookups() {
	if (lookupRunning) return;
	lookupRunning = true;
	const myRun = ++lookupRunId;
	lookupProgressAt = Date.now();
	try {
		while (lookupQueue.length && myRun === lookupRunId) {
			lookupProgressAt = Date.now();

			// (No waiting for Cloudflare here: the suggestion server still
			// works during a check; only the post-page fallback is skipped.)

			// Newest first: what you're looking at right now beats what you
			// scrolled past. Anything far off screen is dropped for now.
			const thumb = lookupQueue.pop();
			try {
				const link = thumb.querySelector('a[href]');
				if (!thumb.isConnected || !link || !nearViewport(thumb)) { unqueue(thumb); continue; }

				const state = renderTagBar(thumb);
				if (state.hasArtist || !state.hasUnknown) { thumb.dataset.s34Lookup = 'done'; renderTagBar(thumb); continue; }

				const postId = new URL(link.href, location.href).searchParams.get('id');
				let usedPostPage = false;

				// 1) Ask the suggestion server about the unknown tags
				//    (not affected by the site's Cloudflare checks)
				let acOk = true;
				try {
					const unknown = thumbTagList(thumb).filter(t => !tagTypes.has(t) && !acMissed.has(t));
					await lookupTypesViaSuggestions(unknown.slice(0, 40));
				} catch (e) {
					acOk = false; // server unreachable -> fall back to the post page
				}
				lookupProgressAt = Date.now();
				if (myRun !== lookupRunId) { lookupQueue.push(thumb); break; }

				let result = renderTagBar(thumb);
				if (CONFIG.thumbTagBar) refreshTagBars(); // other thumbnails share tags

				// 2) Still no artist? Read the post page - unless Cloudflare is checking
				if (!result.hasArtist && !cloudflarePaused() && (!acOk || result.hasUnknown)) {
					usedPostPage = true;
					const doc = await fetchPostDoc(link.href, 'lookup', { wanted: () => thumb.isConnected && nearViewport(thumb) });
					lookupProgressAt = Date.now();
					if (myRun !== lookupRunId) { lookupQueue.push(thumb); break; }
					if (!doc && !cloudflarePaused() && !acOk) {
						console.log('[Steamy34] Tags: post', postId, '→ could not load tags');
						unqueue(thumb); // retried when it comes into view again
						continue;
					}
				}

				thumb.dataset.s34Lookup = 'done';
				result = renderTagBar(thumb);
				console.log('[Steamy34] Tags: post', postId, '→',
							result.hasArtist ? 'artist found' : 'no artist tag found',
							usedPostPage ? '(via post page)' : '(via suggestions)');

				// Be gentle with the site; post pages need a longer gap
				await new Promise(r => setTimeout(r, usedPostPage ? 1200 : 150));
				continue;
			} catch (err) {
				// One bad thumbnail must never stop the whole queue
				console.warn('[Steamy34] Tag lookup error:', err);
				unqueue(thumb);
			}
			await new Promise(r => setTimeout(r, 1200));
		}
	} finally {
		if (myRun === lookupRunId) lookupRunning = false;
	}
}

const tagBarObserver = new IntersectionObserver(entries => {
	let ctx = null;
	entries.forEach(e => {
		const thumb = e.target;
		if (!e.isIntersecting) { barsInView.delete(thumb); return; }
		barsInView.add(thumb);
		const state = renderTagBar(thumb, ctx || (ctx = tagBarContext()));
		if (CONFIG.tagBarLookup && !state.hasArtist && state.hasUnknown) queueLookup(thumb);
	});
}, { rootMargin: '300px 0px' });

function setupTagBars(thumbs) {
	(thumbs || pageThumbs()).forEach(thumb => {
		if (thumb.dataset.s34Tagbar) return;
		thumb.dataset.s34Tagbar = '1';
		renderTagBar(thumb);
		tagBarObserver.observe(thumb);
	});
}

function toggleFromBar(tag) {
	const nowBlocked = toggleBlock(tag);
	markBlocklisted();
	if (nowBlocked) {
		showToast(`Blacklisted "${prettyTag(tag)}"`, 'Undo', () => {
			if (isBlocked(tag)) toggleBlock(tag);
			markBlocklisted();
		});
	} else {
		showToast(`Removed "${prettyTag(tag)}" from the blacklist`);
	}
}

function markBlocklisted() {
	// (Beta 3.11.1) the same set as everywhere else - with muted tags, rating:e
	// as rating:explicit and names like freddy's. Before, posts hidden for
	// one of those came back on screen after ⊘ on any other tag.
	const blocked = blockedTagSet();
	const ctx = tagBarContext();
	document.querySelectorAll('.image-list span.thumb').forEach(thumb => {
		const hits = blockedTagsOf(thumb._s34Tags || thumbTagList(thumb), blocked);
		let label = thumb.querySelector('.s34-bl-label');

		// (Beta 3.10) only soft-blocked tags: blurred with Show, also when it was hidden before
		if (hits.length && blockModeOf(hits) === 'soft') {
			thumb.classList.remove('s34-bl-hidden');
			markSoft(thumb, hits);
			if (thumb.dataset.s34Tagbar) renderTagBar(thumb, ctx);
			return;
		}
		if (thumb.classList.contains('s34-bl-soft')) {
			thumb.classList.remove('s34-bl-soft', 's34-bl-unblur');
			if (label) { label.remove(); label = null; }
		}

		if (hits.length) {
			// Already hidden (came in on a later page)? Leave it hidden.
			if (thumb.classList.contains('s34-bl-hidden')) return;
			thumb.classList.add('s34-bl-marked');
			if (!label) {
				label = document.createElement('div');
				label.className = 's34-bl-label';
				thumb.appendChild(label);
			}
			label.textContent = 'Blacklisted: ' + hits.map(prettyTag).join(', ');
		} else {
			thumb.classList.remove('s34-bl-marked', 's34-bl-hidden');
			if (label) label.remove();
		}
		if (thumb.dataset.s34Tagbar) renderTagBar(thumb, ctx); // update chip states (only if changed)
	});
	if (popupState) renderPopupTags(); // popup viewer shows the same states
}

const TOAST_MAX = 3;

function hideToast(toast) {
	if (!toast || !toast.isConnected) return;
	clearTimeout(toast._s34Timer);
	toast.classList.remove('s34-show');
	setTimeout(() => toast.remove(), 220);
}

function showToast(text, actionLabel, action, durationMs = 6000) {
	if (!document.body) return;
	// (Beta 3.9.2) never a wall of text - a message is a sentence or two
	text = String(text == null ? '' : text);
	if (text.length > 280) text = text.slice(0, 277).trimEnd() + '…';
	let stack = document.querySelector('.s34-toasts');
	if (!stack) {
		stack = document.createElement('div');
		stack.className = 's34-toasts';
		document.body.appendChild(stack);
	}
	const live = Array.from(stack.querySelectorAll('.s34-toast.s34-show'));
	let toast = live.find(t => t._s34Text === text + '|' + (actionLabel || ''));
	if (!toast) {
		toast = document.createElement('div');
		toast.className = 's34-toast';
		toast._s34Text = text + '|' + (actionLabel || '');
		const msg = document.createElement('span');
		msg.textContent = text;
		toast.appendChild(msg);
		if (actionLabel) {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.textContent = actionLabel;
			btn.addEventListener('click', () => {
				action();
				hideToast(toast);
			});
			toast.appendChild(btn);
		}
		const close = document.createElement('button');
		close.type = 'button';
		close.setAttribute('aria-label', 'Close');
		close.className = 's34-toast-close';
		close.textContent = '✕';
		close.title = 'Close';
		close.addEventListener('click', () => hideToast(toast));
		toast.appendChild(close);
		stack.appendChild(toast);
		// Too many? The oldest goes first
		live.slice(0, Math.max(0, live.length + 1 - TOAST_MAX)).forEach(hideToast);
		requestAnimationFrame(() => toast.classList.add('s34-show'));
	}
	clearTimeout(toast._s34Timer);
	if (durationMs > 0) toast._s34Timer = setTimeout(() => hideToast(toast), durationMs);
}

export { TAGTYPE_KEY, barsInView, flushTagTypes, hideToast, learnTagTypes, lookupProgressAt, lookupQueue, lookupRunning, lookupTypesViaSuggestions, makeChip, markBlocklisted, nearViewport, prettyTag, queueLookup, renderTagBar, runLookups, scheduleTagTypeSave, setupTagBars, showToast, tagBarContext, tagTypes, thumbTagList };
export function setLookupRunning(value) { lookupRunning = value; return value; }
