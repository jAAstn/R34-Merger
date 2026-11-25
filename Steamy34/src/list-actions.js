// list-actions – Steamy34 (aus Steamy34.js aufgeteilt)
import { apiPosts, hasApiKey } from './api.js';
import { blCookieRepaired, blockModeOf, blockedTagSet, blockedTagsOf, getMutes } from './blacklist.js';
import { showCollectionChips } from './collections-sync.js';
import { CONFIG, isPostView, params } from './config.js';
import { showDownloadedState, thumbPostId } from './downloads/state.js';
import { addFavButtons } from './favourites.js';
import { markFeedNew } from './following.js';
import { setupHoverInfo } from './hover-info.js';
import { setupHoverPreview } from './hover.js';
import { lastCheckInfo } from './pages.js';
import { prettyTag, setupTagBars } from './tag-bar.js';
import { addThumbBadges, removeTagTooltips, setThumbRatios, thumbTags } from './thumbs.js';

function hideBlocklisted(thumbs) {
	const set = blockedTagSet(), mutes = getMutes();
	thumbs.forEach(thumb => {
		const img = thumb.querySelector('img');
		if (!img) return;
		const hit = blockedTagsOf(thumbTags(img).trim(), set);
		const mode = blockModeOf(hit, mutes);
		thumb.classList.toggle('s34-bl-hidden', mode === 'hide');
		if (mode === 'soft') markSoft(thumb, hit);
	});
}

function markSoft(thumb, hit) {
	thumb.classList.add('s34-bl-marked', 's34-bl-soft');
	let label = thumb.querySelector('.s34-bl-label');
	if (!label) {
		label = document.createElement('div');
		label.className = 's34-bl-label';
		thumb.appendChild(label);
	}
	if (label.dataset.soft === hit.join(' ')) return;
	label.dataset.soft = hit.join(' ');
	label.replaceChildren();
	const t = document.createElement('span');
	t.textContent = 'Blurred: ' + hit.map(prettyTag).join(', ');
	const b = document.createElement('button');
	b.type = 'button';
	b.className = 's34-bl-show';
	b.textContent = 'Show';
	b.title = 'Show this post (it stays blurred elsewhere)';
	b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); thumb.classList.add('s34-bl-unblur'); });
	label.append(t, b);
}

function hideExtraBlocklisted() {
	if (isPostView) return;
	const extra = blockedTagSet();
	if (!extra.size) return;
	watchSiteHiddenLink();
	const check = img => {
		const thumb = img.closest('span.thumb');
		if (!thumb || thumb.classList.contains('s34-bl-hidden')) return;
		const hit = blockedTagsOf(thumbTags(img).trim(), extra);
		const mode = blockModeOf(hit);
		if (mode === 'hide') thumb.classList.add('s34-bl-hidden');
		else if (mode === 'soft') markSoft(thumb, hit);
	};
	const all = () => document.querySelectorAll('span.thumb img').forEach(check);
	all();
	if (document.readyState !== 'loading') return;
	const mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
		if (n.nodeType !== 1) return;
		if (n.tagName === 'IMG') check(n);
		else if (n.querySelectorAll) n.querySelectorAll('span.thumb img').forEach(check);
	})));
	mo.observe(document.documentElement, { childList: true, subtree: true });
	document.addEventListener('DOMContentLoaded', () => { mo.disconnect(); all(); }, { once: true });
}

let siteHiddenWatched = false;

function watchSiteHiddenLink() {
	if (siteHiddenWatched) return;
	siteHiddenWatched = true;
	document.addEventListener('click', e => {
		if (!e.target.closest || !e.target.closest('#blacklisted-sidebar a, a[onclick*="showHideBlacklistedPosts"]')) return;
		const reveal = document.documentElement.classList.toggle('s34-bl-reveal');
		document.querySelectorAll(reveal ? '.image-list span.thumb.s34-bl-hidden' : '.image-list span.thumb.s34-bl-revealed').forEach(t => {
			t.classList.toggle('s34-bl-hidden', !reveal);
			t.classList.toggle('s34-bl-revealed', reveal);
		});
	}, true);
}

const onCommentsPage = params.get('page') === 'comment';

function hideBlockedCommentPosts() {
	const root = document.documentElement;
	try {
		const set = blockedTagSet();
		const hidden = [];
		document.querySelectorAll('#comment-list div.post[id^="p"], div.post[id^="p"]').forEach(post => {
			const sc = Array.from(post.querySelectorAll('script')).map(s => s.textContent).join(' ');
			const m = sc.match(/posts\.tags\[\d+\]\s*=\s*'((?:\\.|[^'\\])*)'/);
			if (!m) return;
			const tags = m[1].replace(/\\(.)/g, '$1').split(/\s+/);
			if (blockedTagsOf(tags, set).length) { post.classList.add('s34-bl-post'); hidden.push(post); }
		});
		if (!hidden.length) return;
		const note = document.createElement('div');
		note.className = 's34-bl-postnote';
		note.innerHTML = '<span></span><button type="button">Show them</button>';
		note.querySelector('span').textContent = hidden.length + (hidden.length === 1 ? ' post with a blacklisted tag is hidden here.' : ' posts with blacklisted tags are hidden here.');
		note.querySelector('button').addEventListener('click', () => {
			const show = root.classList.toggle('s34-bl-posts-shown');
			note.querySelector('button').textContent = show ? 'Hide them again' : 'Show them';
		});
		const list = document.querySelector('#comment-list') || hidden[0].parentElement;
		list.prepend(note);
	} finally {
		root.classList.remove('s34-cm-pending');
	}
}

function addShuffleButton() {
	if (isPostView || params.get('page') !== 'post' || params.get('s') !== 'list') return;
	if (!/(^|\s)sort:random(\s|$)/i.test((params.get('tags') || '').replace(/\+/g, ' '))) return;
	const list = document.querySelector('.image-list');
	if (!list || document.querySelector('.s34-shuffle')) return;
	const goRow = document.querySelector('.s34-sb-gorow'); // (under the Search button)
	const b = document.createElement('button');
	b.type = 'button';
	b.className = 's34-shuffle';
	b.textContent = '🔀 Shuffle again';
	b.title = 'New random posts for this search';
	b.addEventListener('click', () => {
		const u = new URL(location.href);
		u.searchParams.delete('pid');
		location.href = u.href;
	});
	if (goRow) { b.classList.add('s34-shuffle-sb'); goRow.after(b); } else list.before(b);
}

function explainEmptyPage() {
	if (isPostView || params.get('page') !== 'post' || params.get('s') !== 'list') return;
	if (document.querySelector('.image-list span.thumb, .s34-empty-note')) return;
	const content = document.querySelector('#content') || document.body;
	if (!/nobody here but us chickens/i.test(content.textContent || '')) return;
	const tags = (params.get('tags') || '').trim();
	const cf = lastCheckInfo();
	const recentCheck = cf && cf.at && Date.now() - cf.at < 20 * 60000;
	const note = document.createElement('div');
	note.className = 's34-empty-note';
	const why = blCookieRepaired
	? 'Your blacklist cookie was damaged – Steamy34 just repaired it. Reload and the posts should be back.'
	: !tags || tags === 'all'
	? 'This list is never really empty – rule34 sent an empty page. ' + (recentCheck ? 'That happens for a little while after a Cloudflare check.' : 'That usually passes in a minute or two.')
	: recentCheck
	? 'If you\'re sure there are posts for this: rule34 sends empty pages for a little while after a Cloudflare check.'
	: 'Maybe there are no posts for this search (or they\'re all blacklisted). If you\'re sure there are, wait a minute and reload – rule34 sometimes sends empty pages.';
	note.innerHTML = '<b>No posts here</b><span></span><button type="button">Reload</button>';
	note.querySelector('span').textContent = why;
	note.querySelector('button').addEventListener('click', () => location.reload());
	content.prepend(note);
}

async function groupVariants(thumbs) {
	if (!CONFIG.groupVariants || isPostView || !hasApiKey() || !thumbs.length) return;
	const ids = thumbs.map(t => parseInt(thumbPostId(t), 10)).filter(Boolean);
	if (ids.length < 2) return;
	const tags = (params.get('tags') || '').replace(/\+/g, ' ').trim();
	const q = (tags === 'all' ? '' : tags) + ' id:>=' + Math.min(...ids) + ' id:<=' + Math.max(...ids);
	let posts = [];
	try { posts = await apiPosts(q.trim(), 100); } catch (e) { return; }
	const parentOf = {};
	posts.forEach(p => { parentOf[p.id] = p.parent || 0; });
	// a group: the parent and its children - by the parent's number
	const groups = {};
	document.querySelectorAll('.image-list span.thumb').forEach(t => {
		const id = parseInt(thumbPostId(t), 10);
		if (!id || !(id in parentOf || Object.values(parentOf).includes(id))) return;
		const key = parentOf[id] || id;
		(groups[key] = groups[key] || []).push(t);
	});
	Object.entries(groups).forEach(([key, members]) => {
		members = members.filter(t => !t.classList.contains('s34-bl-hidden'));
		if (members.length < 2) return;
		const [first, ...rest] = members;
		if (first.querySelector('.s34-var-badge')) return;
		rest.forEach(t => t.classList.add('s34-var-hidden'));
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 's34-var-badge';
		b.textContent = '+' + rest.length + (rest.length === 1 ? ' version' : ' versions');
		b.title = 'Other versions of this picture – click to show them';
		b.addEventListener('click', e => {
			e.preventDefault(); e.stopPropagation();
			const open = first.classList.toggle('s34-var-open');
			rest.forEach(t => t.classList.toggle('s34-var-open', open));
			b.textContent = open ? 'Hide versions' : '+' + rest.length + (rest.length === 1 ? ' version' : ' versions');
		});
		first.appendChild(b);
	});
}

function enhanceThumbs(thumbs) {
	removeTagTooltips(thumbs);
	if (CONFIG.thumbGrid && CONFIG.thumbLayout === 'justified') setThumbRatios(thumbs);
	if (CONFIG.thumbGrid && CONFIG.thumbBadges) addThumbBadges(thumbs);
	if (CONFIG.hoverPreview || CONFIG.hoverHighRes) setupHoverPreview(thumbs);
	if (CONFIG.thumbTagBar) setupTagBars(thumbs);
	showDownloadedState(thumbs);
	addFavButtons(thumbs);
	showCollectionChips(thumbs);
	setupHoverInfo(thumbs);
	markFeedNew(thumbs); // Following feed: NEW on later pages too
	groupVariants(thumbs).catch(() => {});
}

export { addShuffleButton, enhanceThumbs, explainEmptyPage, groupVariants, hideBlockedCommentPosts, hideBlocklisted, hideExtraBlocklisted, markSoft, onCommentsPage };
