// infinite-scroll – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG } from './config.js';
import { thumbPostId } from './downloads/state.js';
import { enhanceThumbs, hideBlocklisted } from './list-actions.js';
import { cloudflareInline, loadPage } from './pages.js';
import { learnTagTypes } from './tag-bar.js';

function getNextPageUrl(doc) {
	const pag = doc.querySelector('#paginator, .pagination');
	if (!pag) return null;
	let next = pag.querySelector('a[alt="next"], a[rel="next"]');
	if (!next) {
		next = Array.from(pag.querySelectorAll('a')).find(a => a.textContent.trim() === '>');
	}
	if (!next) {
		// The link right after the current page number (<b>)
		const cur = pag.querySelector('b');
		let el = cur && cur.nextElementSibling;
		while (el && el.tagName !== 'A') el = el.nextElementSibling;
		next = el;
	}
	const href = next && next.getAttribute('href');
	return href ? new URL(href, location.href).href : null;
}

let pageStep = 42;

function pidOf(url) {
	return parseInt(new URL(url, location.href).searchParams.get('pid') || '0', 10) || 0;
}

function pageNumberOf(url) {
	return Math.floor(pidOf(url) / pageStep) + 1;
}

function readPagination(doc, currentPid) {
	const pag = doc.querySelector('#paginator, .pagination');
	let step = null;
	let maxPid = null;
	if (pag) {
		pag.querySelectorAll('a[href*="pid="]').forEach(a => {
			const p = pidOf(a.getAttribute('href'));
			if (p > currentPid && (step === null || p - currentPid < step)) step = p - currentPid;
			if (maxPid === null || p > maxPid) maxPid = p;
		});
	}
	return { step, maxPid };
}

function makeDivider(pageNumber) {
	const div = document.createElement('div');
	div.className = 's34-page-divider';
	const label = document.createElement('span');
	label.textContent = 'Page ' + pageNumber;
	div.appendChild(label);
	return div;
}

let infiniteState = null;

function setupInfiniteScroll() {
	const list = document.querySelector('.image-list');
	const paginator = document.querySelector('#paginator');
	if (!list || !paginator) return;

	// Next pages are built by counting up "pid" ourselves rather than
	// trusting each fetched page's links - that was ending too early.
	const startPid = pidOf(location.href);
	const info = readPagination(document, startPid);
	if (info.step) pageStep = info.step;
	let maxPid = info.maxPid;               // last page, if the links show it
	if (maxPid === null && !getNextPageUrl(document)) return; // single page of results
	let nextPid = startPid + pageStep;
	let done = false;
	let failures = 0;

	function urlForPid(pid) {
		const u = new URL(location.href);
		u.searchParams.set('pid', String(pid));
		return u.href;
	}

	let loading = false;

	list.dataset.s34Pid = String(startPid); // which page each block is (for "continue where you left off")

	const status = document.createElement('div');
	status.className = 's34-scroll-status';
	list.after(status); // new pages are inserted right before this
	paginator.style.display = 'none';

	// Marker for the page you started on, so every page is labelled
	if (CONFIG.pageDividers) {
		const first = makeDivider(pageNumberOf(location.href));
		first.classList.add('s34-first');
		list.before(first);
	}

	// ---- Cleanup of far-away pages ----
	// A page block that is far outside the window is emptied: its height
	// is kept (so the scroll position doesn't jump), the thumbnails are
	// parked in memory without their images, and everything is put back
	// when you scroll near it again.
	const parked = new Map(); // block -> DocumentFragment

	function park(block) {
		if (parked.has(block)) return;
		const h = block.getBoundingClientRect().height;
		if (!h) return;
		block.style.height = h + 'px';
		block.querySelectorAll('img').forEach(img => {
			const src = img.getAttribute('src');
			if (src) {
				img.dataset.s34Src = src;
				img.removeAttribute('src'); // lets the browser free the decoded image
			}
		});
		const frag = document.createDocumentFragment();
		while (block.firstChild) frag.appendChild(block.firstChild);
		parked.set(block, frag);
	}

	function unpark(block) {
		const frag = parked.get(block);
		if (!frag) return;
		parked.delete(block);
		frag.querySelectorAll('img[data-s34-src]').forEach(img => {
			img.src = img.dataset.s34Src; // comes straight from the browser cache
			delete img.dataset.s34Src;
		});
		block.appendChild(frag);
		block.style.height = '';
	}

	const cleanupObserver = CONFIG.cleanupFarPages
	? new IntersectionObserver(entries => {
		// Only pages you've been near are unloaded (the ones far behind
		// you). A freshly loaded page further down is never put away
		// before you reach it - the popup steps into it (Beta 3.8 fix).
		entries.forEach(e => {
			if (e.isIntersecting) { e.target.dataset.s34Near = '1'; unpark(e.target); }
			else if (e.target.dataset.s34Near) park(e.target);
		});
	}, { rootMargin: `${CONFIG.cleanupDistance}px 0px ${CONFIG.cleanupDistance}px 0px` })
	: null;

	if (cleanupObserver) cleanupObserver.observe(list);

	function finish(reason) {
		done = true;
		status.textContent = 'End of results';
		console.log('[Steamy34] Infinite scroll finished:', reason);
	}

	const sleep = ms => new Promise(r => setTimeout(r, ms));

	async function loadNext() {
		if (loading || done) return;
		if (maxPid !== null && nextPid > maxPid) { finish('passed the last page (pid ' + maxPid + ')'); return; }
		loading = true;
		status.onclick = null;
		status.textContent = 'Loading more…';
		const nextUrl = urlForPid(nextPid);

		let ok = false;
		try {
			// (through the shared line - a check throws err.cloudflare)
			const res = await loadPage(nextUrl, 'scroll', { ms: 30000 });
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const doc = new DOMParser().parseFromString(res.html, 'text/html');

			// No post list at all = rate limit / check page, not the end
			if (!doc.querySelector('.image-list')) throw new Error('page had no post list (rate limit or check page?)');

			learnTagTypes(doc); // its sidebar lists the types of that page's tags
			// (Beta 3.9.2) the same post twice (random sort, or posts moving
			// between pages while you scroll) is only shown once
			const onPage = new Set(Array.from(document.querySelectorAll('.image-list span.thumb')).map(t => thumbPostId(t)));
			const newThumbs = Array.from(doc.querySelectorAll('.image-list span.thumb'))
			.filter(t => !onPage.has(thumbPostId(t)))
			.map(t => document.adoptNode(t));

			// The site may know about more pages now
			const more = readPagination(doc, nextPid);
			if (more.maxPid !== null && (maxPid === null || more.maxPid > maxPid)) maxPid = more.maxPid;

			if (!newThumbs.length) {
				finish('page ' + pageNumberOf(nextUrl) + ' was empty');
			} else {
				if (CONFIG.pageDividers) {
					status.parentNode.insertBefore(makeDivider(pageNumberOf(nextUrl)), status);
				}

				// Each page gets its own block, so the half-full last row
				// of a page isn't stretched by the justified layout
				const block = document.createElement('div');
				block.className = list.className;
				block.dataset.s34Pid = String(nextPid);
				hideBlocklisted(newThumbs); // before they're shown
				newThumbs.forEach(t => block.appendChild(t));
				status.parentNode.insertBefore(block, status);
				if (cleanupObserver) cleanupObserver.observe(block);
				enhanceThumbs(newThumbs);

				nextPid += pageStep;
				status.textContent = '';
			}
			failures = 0;
			ok = true;
		} catch (err) {
			if (err.cloudflare) {
				// Can't continue until the check is solved: wait for it
				// ("Solve check" right here, where loading stopped)
				status.replaceChildren(cloudflareInline('Loading more waits for a quick Cloudflare check.'));
				window.addEventListener('s34-cf-passed', () => {
					status.textContent = '';
					failures = 0;
					loadNext();
				}, { once: true });
				loading = false;
				return;
			}
			failures++;
			console.warn('[Steamy34] Could not load', nextUrl, '-', err.message || err, '(attempt ' + failures + ')');
			const reason = String(err.message || err).slice(0, 60);
			if (failures <= 3) {
				// Wait a bit longer each time, then try again by itself
				status.textContent = `Site is busy (${reason}) – retrying…`;
				await sleep(2500 * failures);
			} else {
				status.textContent = `Could not load more (${reason}) – click to retry`;
				status.onclick = () => { failures = 0; loadNext(); };
				loading = false;
				return;
			}
		}

		loading = false;
		if (done) return;
		// Still near the bottom (e.g. lots of blocked posts, or a retry)? Keep going,
		// with a short pause so the site isn't flooded with requests.
		if (!ok || status.getBoundingClientRect().top < window.innerHeight + CONFIG.infiniteScrollMargin) {
			await sleep(ok ? 400 : 0);
			loadNext();
		}
	}

	new IntersectionObserver(entries => {
		if (entries.some(e => e.isIntersecting)) loadNext();
	}, { rootMargin: `0px 0px ${CONFIG.infiniteScrollMargin}px 0px` }).observe(status);

	// The popup reached the end of the loaded posts
	infiniteState = () => (done ? 'done' : loading ? 'loading' : 'more');
	window.addEventListener('s34-load-more', () => { if (!loading && !done) loadNext(); });

	// Posts were hidden (e.g. "Hide viewed" switched on) while the end of
	// the list was already on screen: the observer doesn't fire again in
	// that case, so check by hand and keep loading.
	window.addEventListener('s34-layout-changed', () => {
		requestAnimationFrame(() => {
			if (!loading && !done && status.getBoundingClientRect().top < window.innerHeight + CONFIG.infiniteScrollMargin) loadNext();
		});
	});
}

export { getNextPageUrl, infiniteState, pageStep, pidOf, setupInfiniteScroll };
