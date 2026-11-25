// pages – Steamy34 (aus Steamy34.js aufgeteilt)
import { hasApiKey } from './api.js';
import { POST_DOC_KEEP, cacheSet, postDocCache } from './hover.js';
import { SETTINGS_TAB_KEY, openSettings } from './settings-menu.js';
import { hideToast, learnTagTypes, lookupQueue, runLookups, setLookupRunning, showToast } from './tag-bar.js';

let cfPausedUntil = 0;

const CF_PAUSE_MS = 3 * 60 * 1000;

const CF_SLOW_MS = 10 * 60 * 1000;

let cfSlowUntil = 0;

function isCloudflareCheck(status, html) {
	html = html || '';
	if (/<title>\s*(Just a moment|Attention Required)/i.test(html)) return true;
	const errorStatus = status === 403 || status === 429 || status === 503;
	return errorStatus && /cf-chl-|cf_chl_|challenge-form|cf-browser-verification/i.test(html);
}

function cloudflarePaused() {
	return Date.now() < cfPausedUntil;
}

let cfCheckUrl = location.href;

const PAGE_KINDS = {
	action:  { prio: 0, gap: 0,    label: 'vote / favourite' },
	popup:   { prio: 0, gap: 250,  label: 'popup' },
	scroll:  { prio: 1, gap: 400,  label: 'scrolling' },
	batch:   { prio: 2, gap: 900,  label: 'batch / collection download' },
	followNow: { prio: 2, gap: 900, label: 'Following "Check now"' },
	preload: { prio: 3, gap: 1000, label: 'next post in advance' },
	hover:   { prio: 3, gap: 1000, label: 'size on hover' },
	lookup:  { prio: 4, gap: 1200, label: 'artist lookup' },
	follow:  { prio: 5, gap: 1500, label: 'Following check' }
};

const pageKind = k => PAGE_KINDS[k] || PAGE_KINDS.lookup;

const isUserKind = k => pageKind(k).prio <= 1;

const BG_PER_MINUTE = 20;

const FOLLOW_IDLE_MS = 15000;

const pageQueue = [];

const pageLog = [];

let pageJobN = 0, pagePumping = false, pageStartedAt = 0, pageDoneAt = 0, pagesInFlight = 0;

let lastUserInputAt = 0;

const pageSleep = ms => new Promise(r => setTimeout(r, ms));

const pageError = (msg, flags) => Object.assign(new Error(msg), flags);

function logPage(kind) {
	const now = Date.now();
	pageLog.push({ at: now, kind });
	while (pageLog.length && now - pageLog[0].at > 600000) pageLog.shift();
}

function recentPages(ms) {
	const since = Date.now() - ms, out = {};
	pageLog.forEach(p => { if (p.at >= since) out[p.kind] = (out[p.kind] || 0) + 1; });
	return out;
}

function loadPage(url, kind = 'popup', opts = {}) {
	const abs = new URL(url, location.href).href;
	if (pageQueue.some(j => j.url === abs)) { bumpPage(abs, kind, opts.wanted); return pageQueue.find(j => j.url === abs).promise; }
	let job;
	const promise = new Promise((resolve, reject) => {
		job = { url: abs, kind, prio: pageKind(kind).prio, n: ++pageJobN, wanted: opts.wanted || null, ms: opts.ms || 12000, resolve, reject };
	});
	job.promise = promise;
	pageQueue.push(job);
	pumpPages();
	return promise;
}

function bumpPage(url, kind, wanted) {
	const abs = new URL(url, location.href).href;
	const j = pageQueue.find(x => x.url === abs);
	if (!j) return;
	if (pageKind(kind).prio < j.prio) { j.prio = pageKind(kind).prio; j.kind = kind; }
	if (!wanted) j.wanted = null; // needed for sure now
}

function pageGap(kind) {
	const g = pageKind(kind).gap;
	return Date.now() < cfSlowUntil ? g * 2.5 + 500 : g;
}

function extrasWait(now) {
	const cap = now < cfSlowUntil ? BG_PER_MINUTE / 2 : BG_PER_MINUTE;
	const recent = pageLog.filter(p => pageKind(p.kind).prio >= 3 && now - p.at < 60000);
	return recent.length < cap ? 0 : recent[recent.length - cap].at + 60000 - now;
}

function stillWanted(j) {
	if (!j.wanted) return true;
	try { return !!j.wanted(); } catch (e) { return false; }
}

async function pumpPages() {
	if (pagePumping) return;
	pagePumping = true;
	try {
		while (pageQueue.length) {
			const now = Date.now();
			for (let i = pageQueue.length - 1; i >= 0; i--) {
				const j = pageQueue[i];
				// While a check waits, the extras give up (they come back
				// later) - what you asked for still tries: maybe it's solved
				if (cloudflarePaused() && !isUserKind(j.kind)) { pageQueue.splice(i, 1); j.reject(pageError('waiting for the Cloudflare check', { paused: true })); }
				// Gone stale meanwhile (mouse left, popup closed, scrolled away)
				else if (!stillWanted(j)) { pageQueue.splice(i, 1); j.reject(pageError('no longer needed', { cancelled: true })); }
			}
			if (!pageQueue.length) break;
			pageQueue.sort((a, b) => a.prio - b.prio || a.n - b.n);
			const job = pageQueue.find(j => j.kind !== 'follow' || now - lastUserInputAt > FOLLOW_IDLE_MS);
			if (!job) { await pageSleep(2000); continue; }
			// What you asked for may run next to one other load; extras one at a time
			if (pagesInFlight >= (isUserKind(job.kind) ? 2 : 1)) { await pageSleep(100); continue; }
			const from = isUserKind(job.kind) ? pageStartedAt : Math.max(pageStartedAt, pageDoneAt);
			const wait = Math.max(from + pageGap(job.kind) - now, pageKind(job.kind).prio >= 3 ? extrasWait(now) : 0);
			if (wait > 0) { await pageSleep(Math.min(wait, 300)); continue; } // look again: something more important may have come in
			pageQueue.splice(pageQueue.indexOf(job), 1);
			runPageJob(job);
		}
	} finally {
		pagePumping = false;
	}
}

async function runPageJob(job) {
	pagesInFlight++;
	pageStartedAt = Date.now();
	logPage(job.kind);
	try {
		const r = await fetchWithTimeout(job.url, job.ms);
		const html = await r.text();
		if (isCloudflareCheck(r.status, html)) {
			pauseForCloudflare(job.url, job.kind);
			job.reject(pageError('Cloudflare check (HTTP ' + r.status + ')', { cloudflare: true }));
		} else {
			job.resolve({ status: r.status, ok: r.ok, html, url: r.url || job.url });
		}
	} catch (e) {
		job.reject(e);
	} finally {
		pagesInFlight--;
		pageDoneAt = Date.now();
	}
}

const CF_LAST_KEY = 'steamy34_cf_last';

function lastCheckInfo() {
	try { return GM_getValue(CF_LAST_KEY, null); } catch (e) { return null; }
}

function pauseForCloudflare(url, kind) {
	kind = kind || 'action';
	const wasPaused = cloudflarePaused();
	cfPausedUntil = Date.now() + CF_PAUSE_MS;
	cfSlowUntil = Date.now() + CF_PAUSE_MS + CF_SLOW_MS;
	if (url) cfCheckUrl = url;
	if (!wasPaused) {
		try { GM_setValue(CF_LAST_KEY, { at: Date.now(), kind, before: recentPages(120000) }); } catch (e) {}
	}
	console.warn('[Steamy34] Cloudflare check (' + pageKind(kind).label + ') - background loading paused.');
	showCloudflarePill(isUserKind(kind));
}

const CF_SHIELD_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>';

let cfTitleBefore = null;

let cfPillHidden = false;

let cfWatchTimer = null;

function watchCloudflarePause() {
	if (cfWatchTimer) return;
	cfWatchTimer = setInterval(() => {
		if (cloudflarePaused()) return;
		clearInterval(cfWatchTimer);
		cfWatchTimer = null;
		hideCloudflarePill();
	}, 5000);
}

function showCloudflarePill(loud) {
	if (!document.body) { document.addEventListener('DOMContentLoaded', () => showCloudflarePill(loud), { once: true }); return; }
	if (loud) cfPillHidden = false;
	watchCloudflarePause();
	if (cfPillHidden) return;
	let pill = document.querySelector('.s34-cf-pill');
	if (!pill) {
		pill = document.createElement('div');
		pill.className = 's34-cf-pill';
		pill.setAttribute('role', 'status');
		pill.innerHTML = `<span class="s34-cf-pill-icon">${CF_SHIELD_SVG}</span>
                <span class="s34-cf-pill-text"><b>Quick check needed</b><small>Nothing new loads until it's solved</small></span>
                <span class="s34-cf-why" tabindex="0" role="button" aria-label="Why is this needed?">?<span class="s34-cf-why-pop" role="tooltip"><b>Why is this needed?</b>rule34 is protected by Cloudflare, which now and then asks for a quick check that a real person is browsing. Until it's solved, rule34 turns down every request: no new pages, no post info in the popup, no hover previews, no Following updates. Steamy34 pauses its loading meanwhile, so it doesn't make things worse. <b>Solve</b> opens the check right here – afterwards everything carries on.</span></span>
                <button type="button" class="s34-cf-pill-solve">Solve</button>
                <button type="button" class="s34-cf-pill-x" title="Hide – loading stays paused until the check is solved" aria-label="Hide">✕</button>`;
		pill.querySelector('.s34-cf-pill-solve').addEventListener('click', openCloudflarePanel);
		// ? : the explanation on hover - and on a tap (phones can't hover)
		const why = pill.querySelector('.s34-cf-why');
		why.addEventListener('click', e => { e.stopPropagation(); why.classList.toggle('s34-on'); });
		why.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); why.classList.toggle('s34-on'); } });
		document.addEventListener('pointerdown', e => { if (!why.contains(e.target)) why.classList.remove('s34-on'); }, true);
		// (Beta 3.9) The very first check: the explanation opens by itself, once
		let explained = true;
		try { explained = !!GM_getValue('steamy34_cf_explained', false); } catch (e) {}
		if (!explained) {
			why.classList.add('s34-on');
			try { GM_setValue('steamy34_cf_explained', Date.now()); } catch (e) {}
		}
		pill.querySelector('.s34-cf-pill-x').addEventListener('click', () => { cfPillHidden = true; hideCloudflarePill(); });
		document.body.appendChild(pill);
	}
	pill.title = 'rule34 (Cloudflare) wants to confirm you\'re human. Steamy34 pauses its extra loading until then.';
	// Something you asked for is blocked: a few pulses of the glow
	if (loud) {
		pill.classList.remove('s34-cf-pulse');
		void pill.offsetWidth; // restart the animation
		pill.classList.add('s34-cf-pulse');
		// A quiet note in the tab title, so it's seen from other tabs too
		if (cfTitleBefore === null) { cfTitleBefore = document.title; document.title = 'Check needed · ' + cfTitleBefore; }
	}
	setTimeout(() => pill.classList.add('s34-show'), 20); // (not requestAnimationFrame: background tabs skip those)
}

function hideCloudflarePill() {
	const pill = document.querySelector('.s34-cf-pill');
	if (pill) {
		pill.classList.remove('s34-show');
		setTimeout(() => { if (!pill.classList.contains('s34-show')) pill.remove(); }, 250);
	}
	if (cfTitleBefore !== null) document.title = document.title.replace('Check needed · ', '');
	cfTitleBefore = null;
}

function cloudflareInline(text) {
	const box = document.createElement('div');
	box.className = 's34-cf-inline';
	box.innerHTML = `<span class="s34-cf-pill-icon">${CF_SHIELD_SVG}</span><span class="s34-cf-inline-text"></span><button type="button" class="s34-cf-pill-solve">Solve check</button>`;
	box.querySelector('.s34-cf-inline-text').textContent = text;
	box.querySelector('button').addEventListener('click', e => { e.stopPropagation(); openCloudflarePanel(); });
	return box;
}

function cloudflarePassed() {
	cfPausedUntil = 0;
	cfPillHidden = false;
	console.log('[Steamy34] Cloudflare check passed - resuming.');
	hideCloudflarePill();
	// Drop "loading stays paused…" reminders
	document.querySelectorAll('.s34-toasts .s34-toast').forEach(t => {
		if (/paused|Cloudflare|check/i.test(t.textContent)) hideToast(t);
	});
	window.dispatchEvent(new CustomEvent('s34-cf-passed'));
	if (lookupQueue.length) { setLookupRunning(false); runLookups(); }
}

function openCloudflarePanel() {
	if (document.querySelector('.s34-cf-overlay')) return;

	const overlay = document.createElement('div');
	overlay.className = 's34-overlay s34-cf-overlay';
	const panel = document.createElement('div');
	panel.className = 's34-panel s34-cf-panel';
	panel.innerHTML = `
            <div class="s34-panel-head">
                <h2>Cloudflare check</h2>
                <button type="button" class="s34-close" title="Close" aria-label="Close">✕</button>
            </div>
            <div class="s34-cf-note">
                Confirm below that you're not a robot. This window closes by itself
                once the check is passed, and Steamy34 continues where it stopped.
            </div>
            <iframe class="s34-cf-frame" referrerpolicy="same-origin"></iframe>
            ${hasApiKey() ? '' : `<div class="s34-cf-api">
                <span><b>Fewer checks?</b> With your own rule34 API key, Steamy34 gets new-post counts and hover previews from rule34's API instead of its pages, so these checks come up less often. Optional: Steamy34 works fine without it.</span>
                <button class="s34-btn" data-act="api">About the API key</button>
            </div>`}
            <div class="s34-panel-foot">
                <button class="s34-btn s34-link" data-act="tab">Open in new tab instead</button>
                <button class="s34-btn" data-act="reload">Reload page</button>
                <button class="s34-btn s34-primary" data-act="done">I'm done</button>
            </div>`;
	overlay.appendChild(panel);

	const frame = panel.querySelector('.s34-cf-frame');

	function close() {
		clearInterval(poll);
		overlay.remove();
	}

	// The frame is on the same site, so we can see when it shows a normal
	// page again (= check passed)
	function frameShowsNormalPage() {
		try {
			const doc = frame.contentDocument;
			if (!doc || !doc.documentElement || doc.URL === 'about:blank') return false;
			const html = doc.documentElement.outerHTML;
			return html.length > 500 && !isCloudflareCheck(200, html);
		} catch (e) {
			return false; // not readable yet
		}
	}

	const poll = setInterval(() => {
		if (frameShowsNormalPage()) {
			close();
			cloudflarePassed();
			showToast('Cloudflare check passed – continuing.');
		}
	}, 1000);

	panel.addEventListener('click', e => {
		const act = e.target.dataset && e.target.dataset.act;
		if (e.target.classList.contains('s34-close')) close();
		else if (act === 'api') { close(); try { sessionStorage.setItem(SETTINGS_TAB_KEY, 'api'); } catch (err) {} openSettings(); } // (the check waits - the notice stays)
		else if (act === 'tab') window.open(cfCheckUrl, '_blank', 'noopener');
		else if (act === 'reload') location.reload();
		else if (act === 'done') { close(); cloudflarePassed(); }
	});

	document.body.appendChild(overlay);
	frame.src = cfCheckUrl;
}

function fetchWithTimeout(url, ms = 12000) {
	const ctrl = new AbortController();
	setTimeout(() => ctrl.abort(), ms);
	return fetch(url, { credentials: 'include', signal: ctrl.signal });
}

function fetchPostDoc(postUrl, kind = 'popup', opts) {
	if (postDocCache.has(postUrl)) {
		bumpPage(postUrl, kind, opts && opts.wanted);
		return postDocCache.get(postUrl);
	}
	if (!isUserKind(kind) && cloudflarePaused()) return Promise.resolve(null);
	const p = loadPage(postUrl, kind, opts)
	.then(page => {
		if (!page.ok) throw new Error('HTTP ' + page.status);
		const doc = new DOMParser().parseFromString(page.html, 'text/html');
		learnTagTypes(doc);
		return doc;
	})
	.catch(err => {
		if (!err.cancelled && !err.paused) console.warn('[Steamy34] Could not read post', postUrl, err.message || err);
		postDocCache.delete(postUrl); // allow a retry later
		return null;
	});
	cacheSet(postDocCache, postUrl, p, POST_DOC_KEEP);
	return p;
}

export { CF_SHIELD_SVG, bumpPage, cloudflareInline, cloudflarePaused, fetchPostDoc, lastCheckInfo, loadPage, openCloudflarePanel, pageKind, recentPages };
export function setLastUserInputAt(value) { lastUserInputAt = value; return value; }
