// post-info – Steamy34 (aus Steamy34.js aufgeteilt)
import { timeAgo } from './blacklist-window.js';
import { postIdFrom } from './downloads/state.js';
import { setBusy } from './favourites.js';
import { loadPage, openCloudflarePanel } from './pages.js';
import { showToast } from './tag-bar.js';

function absUrl(u) {
	try { return new URL(u, location.href).href; } catch (e) { return ''; }
}

function readPostInfo(doc) {
	const info = {};
	const lis = Array.from(doc.querySelectorAll('#stats li'));
	const text = li => li.textContent.replace(/\s+/g, ' ').trim();
	const find = label => lis.find(li => new RegExp('^\\s*' + label + '\\s*:', 'i').test(li.textContent));
	let li;
	if ((li = find('Size'))) {
		const m = text(li).match(/(\d+)\s*[x×]\s*(\d+)/);
		if (m) info.size = m[1] + '×' + m[2];
	}
	if ((li = find('Rating'))) info.rating = text(li).replace(/^Rating:\s*/i, '');
	if ((li = find('Score'))) {
		const m = text(li).match(/Score:\s*(-?\d+)/i);
		if (m) info.score = m[1];
		const v = li.querySelector('a[onclick*="vote"]');
		const mm = v && (v.getAttribute('onclick') || '').match(/vote\(\s*'?(\d+)'?\s*,\s*'(\w+)'/);
		if (mm) info.voteType = mm[2];
	}
	if ((li = find('Posted'))) {
		const m = text(li).match(/Posted:\s*(.+?)\s*(?:by\s.*)?$/i);
		if (m) info.posted = m[1];
		const a = li.querySelector('a[href]');
		if (a) { info.by = a.textContent.trim(); info.byUrl = absUrl(a.getAttribute('href')); }
	}
	if ((li = find('Source'))) {
		const a = li.querySelector('a[href]');
		if (a && /^https?:/i.test(absUrl(a.getAttribute('href')))) info.source = absUrl(a.getAttribute('href'));
		else {
			const s = text(li).replace(/^Source:\s*/i, '');
			if (s) info.sourceText = s;
		}
	}

	// Parent / child / pool notices: keep only their text and links
	const seen = new Set();
	info.notices = Array.from(doc.querySelectorAll(
		'.status-notice, #pool-nav, #pool_nav, div[id^="pool"]'))
		.filter(el => {
		if (Array.from(seen).some(s => s.contains(el))) return false;
		seen.add(el);
		// "This image has been resized. Click here…" only works with
		// the site's own scripts - useless (and unclickable) here
		if (el.id === 'resized_notice' || el.closest('#resized_notice') ||
			/has been resized/i.test(el.textContent)) return false;
		// "< previous · Tag search: … · next >" is the site's own
		// browsing bar (same class), not a notice about the post
		if (el.id === 'navlinksContainer' || el.closest('#navlinksContainer') ||
			el.querySelector('#prev_search_link, #next_search_link')) return false;
		return el.textContent.trim().length > 0;
	})
		.map(cleanNotice)
		.filter(Boolean);
	return info;
}

function cleanNotice(el) {
	const out = document.createElement('div');
	out.className = 's34-pv-notice';
	(function walk(node, into) {
		node.childNodes.forEach(n => {
			if (n.nodeType === 3) {
				into.appendChild(document.createTextNode(n.textContent));
			} else if (n.nodeType === 1 && !/^(SCRIPT|STYLE|BUTTON|INPUT|FORM)$/.test(n.tagName)) {
				if (n.tagName === 'A' && n.getAttribute('href') && !/^\s*(#|javascript:)/i.test(n.getAttribute('href'))) {
					const a = document.createElement('a');
					a.href = absUrl(n.getAttribute('href'));
					a.target = '_blank';
					a.rel = 'noopener';
					a.textContent = n.textContent.trim() || a.href;
					into.appendChild(a);
				} else {
					if (n.tagName === 'BR' || n.tagName === 'P' || n.tagName === 'DIV') into.appendChild(document.createTextNode(' '));
					walk(n, into);
				}
			}
		});
	})(el, out);
	out.normalize();
	return out.textContent.trim() ? out : null;
}

const VOTES_KEY = 'steamy34_votes';

function hasVoted(id) {
	try { return !!(GM_getValue(VOTES_KEY, {}) || {})[id]; } catch (e) { return false; }
}

async function voteUp(id, type) {
	try {
		let r;
		try { r = await loadPage(`index.php?page=post&s=vote&id=${encodeURIComponent(id)}&type=${type || 'up'}`, 'action'); }
		catch (e) { if (e.cloudflare) { showToast('Vote not counted – solve the quick check first.', 'Solve check', openCloudflarePanel, 10000); return null; } throw e; }
		const body = r.html.trim();
		if (!r.ok) throw new Error('HTTP ' + r.status);
		const votes = GM_getValue(VOTES_KEY, {}) || {};
		votes[id] = Date.now();
		GM_setValue(VOTES_KEY, votes);
		// The site answers with the new score
		return /^-?\d+$/.test(body) ? body : '';
	} catch (e) {
		showToast('Vote failed (' + (e.message || e) + ').');
		return null;
	}
}

function sourceName(url) {
	let host = '';
	try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return 'Source'; }
	const known = { 'twitter.com': 'Twitter', 'x.com': 'X', 'deviantart.com': 'DeviantArt', 'pixiv.net': 'Pixiv', 'patreon.com': 'Patreon',
				   'artstation.com': 'ArtStation', 'tumblr.com': 'Tumblr', 'reddit.com': 'Reddit', 'instagram.com': 'Instagram', 'newgrounds.com': 'Newgrounds',
				   'fanbox.cc': 'Fanbox', 'furaffinity.net': 'FurAffinity', 'itaku.ee': 'Itaku', 'bsky.app': 'Bluesky', 'subscribestar.adult': 'SubscribeStar',
				   'gumroad.com': 'Gumroad', 'youtube.com': 'YouTube', 'iwara.tv': 'Iwara', 'kemono.su': 'Kemono' };
	const key = Object.keys(known).find(k => host === k || host.endsWith('.' + k));
	return key ? known[key] : host;
}

function renderPopupInfo(state, info) {
	const box = state.overlay.querySelector('.s34-pv-info');
	if (!box) return;
	box.replaceChildren();
	const id = postIdFrom(state.postUrl);

	// Row 1: score + vote, size, rating
	const row = document.createElement('div');
	row.className = 's34-pv-stats';
	const score = document.createElement('span');
	score.className = 's34-pv-score';
	score.textContent = '★ ' + (info.score != null ? info.score : '…');
	row.appendChild(score);
	const vote = document.createElement('button');
	vote.type = 'button';
	vote.className = 's34-pv-vote';
	vote.textContent = '▲';
	const voted = hasVoted(id);
	vote.classList.toggle('s34-on', voted);
	vote.title = voted ? 'You voted for this post' : 'Vote up';
	vote.addEventListener('click', async () => {
		if (vote.classList.contains('s34-on')) { showToast('You already voted for this post.'); return; }
		if (vote.classList.contains('s34-busy')) return;
		setBusy(vote, true);
		const res = await voteUp(id, info.voteType);
		setBusy(vote, false);
		if (res === null) return;
		vote.classList.add('s34-on');
		vote.title = 'You voted for this post';
		const n = res !== '' ? res : (info.score != null ? String(parseInt(info.score, 10) + 1) : '');
		if (n) {
			info.score = n;
			score.textContent = '★ ' + n;
			if (state.thumb) state.thumb.dataset.s34Score = n;
		}
		showToast('Voted ▲');
	});
	row.appendChild(vote);
	[info.size, info.rating].filter(Boolean).forEach(t => {
		const s = document.createElement('span');
		s.className = 's34-pv-pill';
		s.textContent = t;
		row.appendChild(s);
	});
	box.appendChild(row);

	// (Beta 3.9.2) Row 2 as chips: when (relative, exact on hover), who, where from
	if (info.posted || info.by || info.source || info.sourceText) {
		const chips = document.createElement('div');
		chips.className = 's34-pv-chips2';
		if (info.posted) {
			const c = document.createElement('span');
			c.className = 's34-pv-chip2';
			const t = Date.parse(String(info.posted).replace(' ', 'T'));
			c.textContent = '🕒 ' + (isNaN(t) ? info.posted : timeAgo(t));
			c.title = 'Posted ' + info.posted;
			chips.appendChild(c);
		}
		if (info.by) {
			const a = document.createElement(info.byUrl ? 'a' : 'span');
			a.className = 's34-pv-chip2';
			a.textContent = '👤 ' + info.by;
			a.title = 'Uploaded by ' + info.by;
			if (info.byUrl) { a.href = info.byUrl; a.target = '_blank'; a.rel = 'noopener'; }
			chips.appendChild(a);
		}
		if (info.source) {
			const a = document.createElement('a');
			a.className = 's34-pv-chip2 s34-pv-source';
			a.href = info.source;
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
			a.textContent = sourceName(info.source) + ' ↗';
			a.title = 'Source: ' + info.source;
			chips.appendChild(a);
		} else if (info.sourceText) {
			const c = document.createElement('span');
			c.className = 's34-pv-chip2';
			c.textContent = 'Source: ' + info.sourceText;
			chips.appendChild(c);
		}
		box.appendChild(chips);
	}

	// Parent / child / pool
	(info.notices || []).forEach(n => box.appendChild(n));
}

export { VOTES_KEY, absUrl, readPostInfo, renderPopupInfo };
