// comments – Steamy34 (aus Steamy34.js aufgeteilt)
import { timeAgo } from './blacklist-window.js';
import { loadPage } from './pages.js';
import { popupState } from './popup.js';
import { absUrl } from './post-info.js';

function richText(el) {
	let out = '';
	(function walk(node) {
		node.childNodes.forEach(c => {
			if (c.nodeType === 3) { out += c.textContent; return; }
			if (c.nodeType !== 1 || /^(SCRIPT|STYLE|BUTTON|FORM|INPUT)$/.test(c.tagName)) return;
			if (c.tagName === 'BR') { out += '\n'; return; }
			const block = /^(P|DIV|LI|BLOCKQUOTE|H\d)$/.test(c.tagName);
			if (block && out && !out.endsWith('\n')) out += '\n';
			walk(c);
			if (block) out += '\n';
		});
	})(el);
	return out.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function readComments(doc) {
	const root = doc.querySelector('#comment-list, #comments, .comment-list, #post-comments');
	let blocks = Array.from((root || doc).querySelectorAll('[id]')).filter(el => /^c\d+$/.test(el.id));
	blocks = blocks.filter(b => !blocks.some(o => o !== b && o.contains(b))); // outermost only
	if (!blocks.length && root) {
		blocks = Array.from(root.children).filter(el => el.querySelector('a[href*="page=account"], a[href*="s=profile"]'));
	}
	const comments = blocks.map(b => {
		const userA = b.querySelector('a[href*="page=account"], a[href*="s=profile"]') ||
			  (b.parentElement && b.parentElement.querySelector('a[href*="page=account"], a[href*="s=profile"]'));
		const flat = b.textContent.replace(/\s+/g, ' ');
		const date = (flat.match(/(\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/) || [])[1] || '';
		const score = (flat.match(/Score:\s*(-?\d+)/i) || [])[1];

		let body = '';
		const bodyEl = b.querySelector('.col2, [id^="cbody"], .comment-body, .body, .comment-text');
		if (bodyEl) {
			body = richText(bodyEl);
		} else {
			// No separate text box: take everything except the header bits
			const clone = b.cloneNode(true);
			clone.querySelectorAll('.col1, .info, .author, small, script').forEach(n => n.remove());
			if (userA) clone.querySelectorAll('a[href*="page=account"], a[href*="s=profile"]').forEach(n => n.remove());
			body = richText(clone).split('\n')
				.filter(line => !/^\s*(Posted on|Score:|\(vote|vote |Report|Reply|Quote)/i.test(line))
				.join('\n').replace(date, '').trim();
		}
		return {
			id: b.id || '',
			user: userA ? userA.textContent.trim() : 'Anonymous',
			userUrl: userA ? absUrl(userA.getAttribute('href')) : '',
			date, score, body
		};
	}).filter(c => c.body);
	// rule34 shows 10 comments a page: "17 comments" at the top, "Next »"
	// (with a cursor) at the bottom - for the popup's "More comments"
	const total = root ? parseInt((root.textContent.slice(0, 300).match(/^\s*(\d+)\s+comments?\b/i) || [])[1], 10) || 0 : 0;
	const nextA = Array.from(doc.querySelectorAll('#post-comments #paginator a, #comment-list #paginator a, #paginator a[href*="cursor="]'))
	.find(a => /cursor=/.test(a.getAttribute('href') || '') || /next/i.test(a.textContent));
	const next = nextA ? absUrl(nextA.getAttribute('href')) : '';
	console.log('[Steamy34] Comments:', comments.length + (total ? ' of ' + total : ''),
				root ? '(from #' + (root.id || root.className) + ')' : '(no comment list on the page)');
	return { comments, found: !!root || comments.length > 0, total, next };
}

function linkifyInto(el, text) {
	const re = /\bhttps?:\/\/[^\s<>"']+/gi;
	let last = 0, m;
	while ((m = re.exec(text))) {
		if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
		const a = document.createElement('a');
		a.href = m[0];
		a.textContent = m[0].length > 60 ? m[0].slice(0, 57) + '…' : m[0];
		a.target = '_blank';
		a.rel = 'noopener noreferrer nofollow';
		el.appendChild(a);
		last = m.index + m[0].length;
	}
	if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
}

function avatarColor(name) {
	let h = 0;
	for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
	return `hsl(${h}, 55%, 42%)`;
}

function renderComments(state, result) {
	const overlay = state.overlay;
	const sec = overlay.querySelector('.s34-cm-section');
	if (!sec) return;
	state.commentsDone = !!result;
	sec.replaceChildren();

	const head = document.createElement('div');
	head.className = 's34-cm-head';
	const h = document.createElement('h3');
	h.textContent = 'Comments';
	const count = document.createElement('span');
	count.className = 's34-cm-count';
	const write = document.createElement('a');
	write.className = 's34-cm-write';
	write.href = state.postUrl + '#comments';
	write.target = '_blank';
	write.rel = 'noopener';
	// Two lines, so it's clear this leaves the popup
	write.innerHTML =
		'<span class="s34-cm-write-main">✎ Write a comment ' +
		'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></span>' +
		'<span class="s34-cm-write-sub">opens the original rule34 page in a new tab</span>';
	write.title = 'Commenting works on the site\'s own post page (old design) – it opens in a new tab, this popup stays open';
	head.append(h, count, write);
	sec.appendChild(head);

	const list = result ? result.comments : [];
	count.textContent = result ? String(Math.max(list.length, result.total || 0)) : '…';
	count.hidden = !result;

	if (!result) {
		const wait = document.createElement('div');
		wait.className = 's34-cm-empty';
		wait.innerHTML = '<span class="s34-spin"></span> Loading comments…';
		sec.appendChild(wait);
		return;
	}
	if (!list.length) {
		const empty = document.createElement('div');
		empty.className = 's34-cm-empty';
		empty.textContent = result.failed ? 'Couldn\'t load the comments – open the full post to see them.'
		: result.found ? 'No comments yet. Be the first – "Write a comment" opens the original post page in a new tab.'
		: 'No comments found for this post.';
		sec.appendChild(empty);
		return;
	}

	const wrap = document.createElement('div');
	wrap.className = 's34-cm-list';
	list.forEach(c => wrap.appendChild(commentElement(c)));
	sec.appendChild(wrap);
	addMoreCommentsButton(state, sec, wrap, result);
}

function addMoreCommentsButton(state, sec, wrap, result) {
	if (!result.next) return;
	const more = document.createElement('button');
	more.type = 'button';
	more.className = 's34-cm-more';
	const left = (result.total || 0) - wrap.children.length;
	const label = left > 0 ? `More comments (${left} more)` : 'More comments';
	more.textContent = label;
	more.addEventListener('click', async () => {
		more.disabled = true;
		more.textContent = 'Loading…';
		try {
			const page = await loadPage(result.next, 'popup');
			if (!popupState || popupState.id !== state.id) return;
			const r = readComments(new DOMParser().parseFromString(page.html, 'text/html'));
			const have = new Set(Array.from(wrap.children).map(el => el.dataset.cid).filter(Boolean));
			r.comments.filter(c => !c.id || !have.has(c.id)).forEach(c => wrap.appendChild(commentElement(c)));
			more.remove();
			addMoreCommentsButton(state, sec, wrap, { next: r.next, total: result.total });
		} catch (e) {
			more.disabled = false;
			more.textContent = e && e.cloudflare ? 'Solve the quick check, then try again' : 'Couldn\'t load – try again';
		}
	});
	sec.appendChild(more);
}

function commentElement(c) {
	const art = document.createElement('article');
	art.className = 's34-cm';
	if (c.id) art.dataset.cid = c.id;
	const av = document.createElement('div');
	av.className = 's34-cm-avatar';
	av.textContent = (c.user || '?').charAt(0).toUpperCase();
	av.style.setProperty('background-color', avatarColor(c.user || '?'), 'important');
	const main = document.createElement('div');
	main.className = 's34-cm-main';
	const meta = document.createElement('div');
	meta.className = 's34-cm-meta';
	const user = document.createElement(c.userUrl ? 'a' : 'span');
	user.className = 's34-cm-user';
	user.textContent = c.user;
	if (c.userUrl) { user.href = c.userUrl; user.target = '_blank'; user.rel = 'noopener'; }
	meta.appendChild(user);
	if (c.date) {
		const d = document.createElement('span');
		d.className = 's34-cm-date';
		const ms = Date.parse(c.date.replace(' ', 'T'));
		d.textContent = isNaN(ms) ? c.date : timeAgo(ms);
		d.title = c.date;
		meta.appendChild(d);
	}
	if (c.score != null && c.score !== '0') {
		const s = document.createElement('span');
		s.className = 's34-cm-score';
		s.textContent = '▲ ' + c.score;
		meta.appendChild(s);
	}
	const text = document.createElement('div');
	text.className = 's34-cm-text';
	linkifyInto(text, c.body);
	main.append(meta, text);
	art.append(av, main);
	return art;
}

export { readComments, renderComments };
