// search-box – Steamy34 (aus Steamy34.js aufgeteilt)
import { isPostView } from './config.js';
import { addToHistory, withPins } from './search.js';
import { prettyTag, showToast } from './tag-bar.js';
import { getTagFromRow } from './thumbs.js';

const LAST_SEARCH_KEY = 'steamy34_lastsearch';

function searchBox() {
	return document.querySelector('textarea.s34-search, .sidebar input[name="tags"], input[name="tags"]');
}

function tagsFromUrl(url) {
	try {
		const u = new URL(url, location.href);
		if (u.hostname.replace(/^www\./, '') !== location.hostname.replace(/^www\./, '')) return '';
		if (u.searchParams.get('page') !== 'post') return '';
		const t = (u.searchParams.get('tags') || '').trim();
		return t === 'all' ? '' : t;
	} catch (e) { return ''; }
}

function currentSearch() {
	const box = searchBox();
	const fromBox = box && box.value.trim();
	if (fromBox) return fromBox;
	return tagsFromUrl(location.href) || tagsFromUrl(document.referrer) ||
		(GM_getValue(LAST_SEARCH_KEY, '') || '');
}

function rememberSearch() {
	if (isPostView) return;
	const t = tagsFromUrl(location.href);
	if (t) {
		GM_setValue(LAST_SEARCH_KEY, t);
		addToHistory(t); // for "Recent" in the search box
	}
}

function setSearchBox(query) {
	const box = searchBox();
	if (!box) return;
	box.value = query;
	box.dispatchEvent(new Event('input', { bubbles: true })); // grow + sync
}

function runSearch(query) {
	GM_setValue(LAST_SEARCH_KEY, query);
	location.href = 'index.php?page=post&s=list&tags=' + encodeURIComponent(withPins(query));
}

function searchWords() {
	return currentSearch().split(/\s+/).filter(Boolean);
}

function searchState(tag, words = searchWords()) {
	const lower = words.map(w => w.toLowerCase());
	tag = tag.toLowerCase();
	if (lower.includes(tag)) return 'in';
	if (lower.includes('-' + tag)) return 'out';
	return '';
}

function applySearch(next) {
	setSearchBox(next);
	GM_setValue(LAST_SEARCH_KEY, next);
	refreshSearchButtons();
	showToast(next ? `Search: ${next.replace(/_/g, ' ')}` : 'Search is now empty.',
			  'Search now', () => runSearch(next), 8000);
}

function toggleTagInSearch(tag, exclude) {
	const words = searchWords();
	const lowerTag = tag.toLowerCase();
	const state = searchState(tag, words);
	let next;
	if (state) {
		const drop = (state === 'in' ? '' : '-') + lowerTag;
		next = words.filter(w => w.toLowerCase() !== drop);
	} else {
		next = words.concat((exclude ? '-' : '') + tag);
	}
	applySearch(next.join(' '));
}

function styleAddButton(btn, state) {
	const t = prettyTag(btn.dataset.tag);
	btn.dataset.state = state;
	btn.textContent = state === 'in' ? '−' : state === 'out' ? '↺' : '+';
	btn.title = state === 'in' ? `"${t}" is in the search - click to take it out`
	: state === 'out' ? `"${t}" is excluded from the search - click to stop excluding it`
	: `Add "${t}" to the current search (Shift+click: exclude it)`;
}

function refreshSearchButtons() {
	const words = searchWords();
	document.querySelectorAll('.r34-add-btn, .s34-chip-add').forEach(btn =>
																	 styleAddButton(btn, searchState(btn.dataset.tag, words)));
}

let searchBoxWatched = null;

function watchSearchBox() {
	if (searchBoxWatched && searchBoxWatched.isConnected) return; // already watching (cheap check)
	const box = searchBox();
	if (!box || box === searchBoxWatched) return;
	searchBoxWatched = box;
	let t = null;
	box.addEventListener('input', () => {
		clearTimeout(t);
		t = setTimeout(refreshSearchButtons, 150);
	});
}

function makeAddButton(tag, className, words) {
	const btn = document.createElement(className === 'r34-add-btn' ? 'a' : 'button');
	if (btn.tagName === 'A') btn.href = '#';
	else btn.type = 'button';
	btn.className = className;
	btn.dataset.tag = tag;
	styleAddButton(btn, searchState(tag, words || searchWords()));
	btn.addEventListener('click', e => {
		e.preventDefault();
		e.stopPropagation();
		toggleTagInSearch(tag, e.shiftKey);
	});
	watchSearchBox();
	return btn;
}

function addSearchButtons() {
	document.querySelectorAll('#tag-sidebar li[class*="tag-type-"]').forEach(row => {
		if (row.querySelector('.r34-add-btn')) return;
		const tag = getTagFromRow(row);
		if (!tag) return;
		const btn = makeAddButton(tag, 'r34-add-btn');
		const block = row.querySelector('.r34-block-btn');
		if (block) block.before(btn); else row.appendChild(btn);
	});
	// Show the search the post came from, so you see what you add to
	const box = searchBox();
	if (box && !box.value.trim()) {
		const q = currentSearch();
		if (q) setSearchBox(q);
	}
	refreshSearchButtons();
}

export { addSearchButtons, makeAddButton, refreshSearchButtons, rememberSearch, runSearch, searchBox, searchState, searchWords, setSearchBox, tagsFromUrl };
