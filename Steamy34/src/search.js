// search – Steamy34 (aus Steamy34.js aufgeteilt)
import { attachSuggestions } from './autocomplete.js';
import { CONFIG, params } from './config.js';
import { normalizeQuery } from './quick-panel.js';

const POST_SEARCH_PAGE = ['', 'post', 'favorites', 'pool'].includes((params.get('page') || '').toLowerCase());

function setupMultilineSearch() {
	if (!POST_SEARCH_PAGE) return;
	const input = document.querySelector(
		'.tag-search input[name="tags"], .sidebar input[name="tags"], input[name="tags"][type="text"], input[name="tags"]:not([type])'
	);
	if (!input || input.dataset.s34Multi) return;

	const ta = document.createElement('textarea');
	ta.name = input.name;
	// Deliberately NOT copying the site's id/class: the site attaches its
	// own suggestion list (awesomplete) by those, which would then show a
	// second, see-through list over ours.
	ta.id = 's34-search';
	ta.className = 's34-search';

	// Invisible stand-in that keeps the original id, so any site script
	// looking for the search field still finds it (it has no name, so it
	// isn't sent with the search).
	const mirror = document.createElement('input');
	mirror.type = 'hidden';
	if (input.id) mirror.id = input.id;
	mirror.value = input.value;
	ta.value = input.value;
	ta.placeholder = input.placeholder || 'Search tags';
	ta.rows = 1;
	ta.spellcheck = false;
	ta.autocomplete = 'off';
	ta.dataset.s34Multi = '1';

	Object.assign(ta.style, {
		display: 'block',
		width: '100%',
		boxSizing: 'border-box',
		resize: 'none',
		overflow: 'hidden',
		font: 'inherit',
		fontSize: '13px',
		lineHeight: '1.4',
		padding: '5px 7px',
		minHeight: '30px'
	});

	const grow = () => {
		ta.style.height = 'auto';
		ta.style.height = ta.scrollHeight + 'px';
	};

	ta.addEventListener('input', () => {
		// No line breaks in a search - turn them into spaces
		if (/\n/.test(ta.value)) {
			const pos = ta.selectionStart;
			ta.value = ta.value.replace(/\n/g, ' ');
			ta.setSelectionRange(pos, pos);
		}
		mirror.value = ta.value;
		grow();
	});

	if (CONFIG.searchSuggestions) attachSuggestions(ta);

	ta.addEventListener('keydown', e => {
		// Enter picks a suggestion when the list is open (handled there)
		if (e.defaultPrevented || ta.dataset.acOpen === '1') return;
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			ta.value = ta.value.trim().replace(/\s+/g, ' ');
			const form = ta.form;
			if (form) {
				if (form.requestSubmit) form.requestSubmit();
				else form.submit();
			}
		}
	});

	input.replaceWith(ta);
	ta.after(mirror);
	grow();
	window.addEventListener('resize', grow);
}

const HISTORY_KEY = 'steamy34_history';

const SAVED_KEY = 'steamy34_saved';

const FAVTAGS_KEY = 'steamy34_favtags';

const HISTORY_MAX = 15;

function getStoredList(key) {
	try {
		const v = GM_getValue(key, []);
		return Array.isArray(v) ? v : [];
	} catch (e) { return []; }
}

function addToHistory(q) {
	q = (q || '').trim().replace(/\s+/g, ' ');
	if (!q) return;
	// "3d lara_croft" and "lara_croft 3d" are the same search
	const same = x => normalizeQuery(x) === normalizeQuery(q);
	const list = getStoredList(HISTORY_KEY).filter(x => !same(x));
	list.unshift(q);
	GM_setValue(HISTORY_KEY, list.slice(0, HISTORY_MAX));
}

const SEARCH_FILTERS = [
	{ key: 'score', label: 'Score', options: [
		['', 'Any'], ['50', '≥ 50'], ['100', '≥ 100'], ['250', '≥ 250'],
		['500', '≥ 500'], ['1000', '≥ 1000'], ['custom', 'Custom…']] },
	{ key: 'res', label: 'Size', options: [
		['', 'Any'], ['720', '720p+'], ['1080', '1080p+'], ['1440', '1440p+'],
		['2160', '4K'], ['custom', 'Custom…']] },
	{ key: 'sort', label: 'Sort', options: [
		['', 'Newest'], ['sort:score:desc', 'Top score'], ['sort:id:asc', 'Oldest'],
		['sort:random', 'Random']] },
	{ key: 'type', label: 'Type', options: [
		['', 'All'], ['video', 'Videos'], ['animated', 'Animated'], ['image', 'Images']] },
	{ key: 'rating', label: 'Rating', options: [
		['', 'Any'], ['rating:safe', 'Safe'], ['rating:questionable', 'Questionable'],
		['rating:explicit', 'Explicit'], ['-rating:explicit', 'Not explicit']] }
];

const TYPE_FILTER_TERMS = {
	video: ['video'],
	animated: ['animated', '-video'],
	image: ['-video', '-animated']
};

function parseQuery(q) {
	const f = { score: '', scoreOp: '>=', res: '', sort: '', type: '', rating: '' };
	let rest = [];
	let h = null, w = null;
	for (const word of (q || '').split(/\s+/).filter(Boolean)) {
		const lw = word.toLowerCase();
		let m;
		if (!f.score && (m = lw.match(/^score:(>=?)(\d+)$/))) { f.scoreOp = m[1]; f.score = m[2]; continue; }
		if (!f.sort && lw.startsWith('sort:')) { f.sort = lw; continue; }
		if (!f.rating && /^-?rating:[a-z]+$/.test(lw)) { f.rating = lw; continue; }
		if (h === null && (m = lw.match(/^height:>=(\d+)$/))) { h = m[1]; continue; }
		if (w === null && (m = lw.match(/^width:>=(\d+)$/))) { w = m[1]; continue; }
		rest.push(word);
	}
	// Size = "both sides at least N" (works for portrait and landscape)
	if (h !== null && h === w) f.res = h;
	else {
		if (h !== null) rest.push('height:>=' + h);
		if (w !== null) rest.push('width:>=' + w);
	}
	for (const [type, terms] of [['image', TYPE_FILTER_TERMS.image],
								 ['animated', TYPE_FILTER_TERMS.animated],
								 ['video', TYPE_FILTER_TERMS.video]]) {
		const lower = rest.map(x => x.toLowerCase());
		if (terms.every(t => lower.includes(t))) {
			f.type = type;
			rest = rest.filter(x => !terms.includes(x.toLowerCase()));
			break;
		}
	}
	return { terms: rest, f };
}

function filterTerms(f) {
	const out = [];
	if (f.score) out.push('score:' + f.scoreOp + f.score);
	if (f.res) out.push('height:>=' + f.res, 'width:>=' + f.res);
	if (f.sort) out.push(f.sort);
	if (f.type) out.push(...TYPE_FILTER_TERMS[f.type]);
	if (f.rating) out.push(f.rating);
	return out;
}

const PINS_KEY = 'steamy34_pinned';

function getPins() {
	try {
		const v = GM_getValue(PINS_KEY, {});
		return v && typeof v === 'object' ? v : {};
	} catch (e) { return {}; }
}

function setPins(p) { GM_setValue(PINS_KEY, p); }

function withPins(q) {
	const pins = getPins();
	const keys = SEARCH_FILTERS.map(d => d.key).filter(k => pins[k]);
	if (!keys.length) return q;
	const parsed = parseQuery(q || '');
	let changed = false;
	keys.forEach(k => {
		if (parsed.f[k]) return;
		parsed.f[k] = pins[k];
		if (k === 'score') parsed.f.scoreOp = pins.scoreOp || '>=';
		changed = true;
	});
	return changed ? parsed.terms.concat(filterTerms(parsed.f)).join(' ') : q;
}

function addPinsToLink(e) {
	const a = e.target && e.target.closest && e.target.closest('a[href]');
	if (!a) return;
	let u;
	try { u = new URL(a.href, location.href); } catch (err) { return; }
	if (u.origin !== location.origin || u.searchParams.get('page') !== 'post' ||
		u.searchParams.get('s') !== 'list' || u.searchParams.get('pid')) return; // page 2, 3… stay as they are
	const q = (u.searchParams.get('tags') || '').trim();
	const next = withPins(q === 'all' ? '' : q);
	if (next === q) return;
	u.searchParams.set('tags', next);
	a.href = u.href;
}

export { FAVTAGS_KEY, HISTORY_KEY, HISTORY_MAX, POST_SEARCH_PAGE, SAVED_KEY, SEARCH_FILTERS, addPinsToLink, addToHistory, filterTerms, getPins, getStoredList, parseQuery, setPins, setupMultilineSearch, withPins };
