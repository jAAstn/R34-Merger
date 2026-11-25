// popup-more – Steamy34 (aus Steamy34.js aufgeteilt)
import { getCollections, saveCollections } from './collections.js';
import { CONFIG, isPhoneLayout } from './config.js';
import { postIdFrom, thumbPostId } from './downloads/state.js';
import { setBusy } from './favourites.js';
import { hideBlocklisted } from './list-actions.js';
import { loadPage, openCloudflarePanel } from './pages.js';
import { browseKeyText, openPopup, popupState, popupTagList } from './popup.js';
import { showToast } from './tag-bar.js';
import { popupThumbSrc } from './window-shell.js';

const namesText = names => names.length === 1 ? `"${names[0]}"` : names.length + ' collections';

const SPLASH_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><g transform="rotate(38 12 12)">'
+ '<path d="M14.5 1.5c3.4 4 5.6 7.4 5.6 10.2a5.6 5.6 0 0 1-11.2 0c0-2.8 2.2-6.2 5.6-10.2z"/>'
+ '<path d="M5.6 9.5c2 2.4 3.3 4.4 3.3 6.1a3.3 3.3 0 0 1-6.6 0c0-1.7 1.3-3.7 3.3-6.1z"/>'
+ '<path d="M13 16.4c1.6 1.9 2.6 3.4 2.6 4.7a2.6 2.6 0 0 1-5.2 0c0-1.3 1-2.8 2.6-4.7z"/></g></svg>';

const CLOCK_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

const ICAME_KEY = 'steamy34_icame';

function iCameDone(id) { try { return !!(GM_getValue(ICAME_KEY, {}) || {})[id]; } catch (e) { return false; } }

async function sendICame(btn) {
	const id = popupState && postIdFrom(popupState.postUrl);
	if (!id || (btn && btn.classList.contains('s34-busy'))) return;
	// (Beta 3.9.2) rule34 allows one iCame every 24 hours - a second one isn't
	// even sent (rule34 answered it with a whole page, which ended up in the message)
	let m = {};
	try { m = GM_getValue(ICAME_KEY, {}) || {}; } catch (e) {}
	if (m[id]) { showToast('You already did iCame on this post.', 'Top list', () => window.open('index.php?page=icame', '_blank', 'noopener')); return; }
	const last = Math.max(0, ...Object.values(m).map(Number).filter(Boolean));
	const wait = last + 24 * 3600000 - Date.now();
	if (wait > 0) { showToast(`rule34 allows one iCame every 24 hours – the next one in about ${Math.max(1, Math.ceil(wait / 3600000))} h.`); return; }
	setBusy(btn, true);
	let text = '';
	try {
		const r = await loadPage('public/icame.php?postid=' + encodeURIComponent(id), 'action');
		const raw = String(r && r.html || '');
		// only a short, plain answer is shown - a whole page never is
		text = /<(html|head|body|style|script|!doctype)/i.test(raw) || raw.length > 300 ? '' : raw.replace(/<[^>]+>/g, '').trim();
	} catch (e) { text = e && e.cloudflare ? 'Not sent – solve the quick check first.' : 'Not sent (' + (e.message || e) + ').'; }
	setBusy(btn, false);
	if (/not sent/i.test(text)) { showToast(text); return; }
	try { m[id] = Date.now(); GM_setValue(ICAME_KEY, m); } catch (e) {}
	styleICame(btn, id);
	btn.classList.add('s34-pop');
	setTimeout(() => btn.classList.remove('s34-pop'), 700);
	showToast(text || 'iCame sent.', 'Top list', () => window.open('index.php?page=icame', '_blank', 'noopener'));
}

function styleICame(btn, id) {
	if (!btn) return;
	const on = iCameDone(id);
	btn.classList.toggle('s34-on', on);
	btn.title = on ? 'You did iCame on this post' : 'iCame – rule34\'s own counter (once every 24 hours)';
}

const LATER_ID = 'watchlater';

function laterCollection(all) {
	let c = all.find(x => x.id === LATER_ID);
	if (!c) { c = { id: LATER_ID, name: 'Watch later', created: Date.now(), posts: [] }; all.unshift(c); }
	return c;
}

function toggleLaterFor(id, thumb, tags) {
	const all = getCollections();
	const c = laterCollection(all);
	const i = c.posts.findIndex(p => String(p.id) === String(id));
	if (i >= 0) { c.posts.splice(i, 1); showToast('Taken off Watch later.'); }
	else { c.posts.unshift({ id, thumb: thumb || '', time: Date.now(), tags: tags || '' }); showToast('On your Watch later list – it\'s in Collections.'); }
	saveCollections(all);
}

function inWatchLater(id) { const c = getCollections().find(x => x.id === LATER_ID); return !!c && c.posts.some(p => String(p.id) === String(id)); }

function toggleWatchLater() {
	const st = popupState;
	if (!st) return;
	toggleLaterFor(postIdFrom(st.postUrl), popupThumbSrc(st), popupTagList(st).join(' '));
	stylePopupExtras();
}

function renderPopupMore() {
	const st = popupState;
	if (!st) return;
	const side = st.overlay.querySelector('.s34-pv-row2');
	if (!side) return;
	let row = st.overlay.querySelector('.s34-pv-more');
	if (!row) {
		row = document.createElement('div');
		row.className = 's34-pv-more';
		side.after(row);
	}
	const abs = u => { try { return new URL(u, location.href).href; } catch (e) { return ''; } };
	const thumb = abs(popupThumbSrc(st));
	const media = abs(st.mediaUrl || '');
	const isPic = media && !/\.(mp4|webm|mkv|mov)(\?|$)/i.test(media);
	const links = [
		['🔍', 'Find source', thumb && 'https://saucenao.com/search.php?db=999&url=' + encodeURIComponent(thumb), 'Who made it? Reverse image search on SauceNAO (opens in a new tab)'],

		['⤢', 'Upscale', isPic && 'https://waifu2x.booru.pics/Home/fromlink?denoise=1&scale=2&url=' + encodeURIComponent(media), 'Twice the size with Waifu2x (opens in a new tab)']
	];
	row.replaceChildren();
	links.forEach(([ic, label, href, title]) => {
		if (!href) return;
		const a = document.createElement('a');
		a.className = 's34-pv-morebtn';
		a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.title = title;
		a.textContent = ic + ' ' + label + ' ↗';
		row.appendChild(a);
	});
	// (Beta 3.9.4) Similar: a filmstrip of rule34's own posts - same artist and character
	const sim = document.createElement('button');
	sim.type = 'button';
	sim.className = 's34-pv-morebtn s34-pv-similar';
	sim.textContent = '◫ Similar';
	sim.title = 'Posts with the same artist and character, as a strip along the bottom';
	sim.addEventListener('click', () => openSimilarStrip());
	row.insertBefore(sim, row.firstChild ? row.children[1] || null : null);
	const rep = document.createElement('button');
	rep.type = 'button';
	rep.className = 's34-pv-morebtn s34-pv-report';
	rep.textContent = '⚑ Report';
	rep.title = 'Report this post to rule34\'s moderators';
	rep.addEventListener('click', () => reportPost(postIdFrom(st.postUrl)));
	row.appendChild(rep);
}

async function openSimilarStrip(refresh) {
	const st = popupState;
	if (!st) return;
	const stage = st.overlay.querySelector('.s34-pv-stage');
	let strip = st.overlay.querySelector('.s34-pv-simstrip');
	if (strip && !refresh) { strip.remove(); return; } // (a second click closes it)
	if (!strip && refresh) return;
	const pick = type => ((st.tags || {})[type] || []).map(x => x.tag)[0];
	const words = [pick('artist'), pick('character') || pick('copyright')].filter(Boolean);
	if (!words.length) {
		if (!refresh) showToast('No artist or character on this post to look for.');
		else if (strip) { strip._from = st.thumb; strip.querySelectorAll('.s34-on').forEach(x => x.classList.remove('s34-on')); }
		return;
	}
	const q = words.join(' ');
	if (!strip) {
		strip = document.createElement('div');
		strip.className = 's34-pv-simstrip';
		strip.innerHTML = '<div class="s34-pv-strip-head"><b></b><span class="s34-pv-strip-keys"></span><button type="button" title="Close">✕</button></div><div class="s34-pv-strip-row"></div>';
		strip.querySelector('.s34-pv-strip-keys').textContent = 'Shift + ' + browseKeyText() + ' through the strip · ' + browseKeyText() + ' the page';
		strip.addEventListener('click', e => e.stopPropagation());
		strip.querySelector('.s34-pv-strip-head button').addEventListener('click', () => strip.remove());
		const rowEl = strip.querySelector('.s34-pv-strip-row');
		// the mouse wheel scrolls the strip sideways
		rowEl.addEventListener('wheel', e => {
			if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
			e.preventDefault();
			rowEl.scrollLeft += e.deltaY;
		}, { passive: false });
		stage.after(strip);
	}
	strip._from = st.thumb; // ← / → go on from this page post
	if (strip._q === q) { strip.querySelectorAll('.s34-on').forEach(x => x.classList.remove('s34-on')); return; } // same artist + character: same strip
	strip._q = q;
	const myQ = q;
	strip.querySelector('b').textContent = 'Similar: ' + words.map(w => w.replace(/_/g, ' ')).join(' + ');
	const rowEl = strip.querySelector('.s34-pv-strip-row');
	rowEl.innerHTML = '<span class="s34-pv-strip-wait">Looking for similar posts…</span>';
	rowEl.scrollLeft = 0;
	const here = postIdFrom(st.postUrl);
	let thumbs = [];
	try {
		const r = await loadPage('index.php?page=post&s=list&tags=' + encodeURIComponent(q + ' sort:score'), 'popup');
		const doc = new DOMParser().parseFromString(r.html, 'text/html');
		thumbs = Array.from(doc.querySelectorAll('.image-list span.thumb')).map(t => document.adoptNode(t));
	} catch (e) {
		if (strip._q === myQ) rowEl.querySelector('.s34-pv-strip-wait').textContent = e && e.cloudflare ? 'Waiting for the Cloudflare check.' : 'Couldn\'t load similar posts.';
		return;
	}
	if (strip._q !== myQ || !strip.isConnected) return; // (moved on meanwhile)
	hideBlocklisted(thumbs);
	thumbs = thumbs.filter(t => !t.classList.contains('s34-bl-hidden') && !t.classList.contains('s34-bl-soft') && thumbPostId(t) !== here).slice(0, 30);
	rowEl.replaceChildren();
	if (!thumbs.length) { rowEl.innerHTML = '<span class="s34-pv-strip-wait">Nothing similar found.</span>'; return; }
	thumbs.forEach(t => {
		const img = t.querySelector('img');
		if (!img) return;
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 's34-pv-strip-item';
		b.title = 'Post #' + thumbPostId(t);
		const im = new Image();
		im.src = img.getAttribute('src');
		im.alt = '';
		im.loading = 'lazy';
		b.appendChild(im);
		b.addEventListener('click', () => {
			rowEl.querySelectorAll('.s34-on').forEach(x => x.classList.remove('s34-on'));
			b.classList.add('s34-on');
			try { b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) {}
			openPopup(t);
			if (popupState) popupState.fromStrip = true; // (the strip stays as it is)
			if (isPhoneLayout() && popupState) { try { popupState.overlay.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} }
		});
		rowEl.appendChild(b);
	});
}

function similarStripStep(e) {
	const strip = popupState && popupState.overlay.querySelector('.s34-pv-simstrip');
	if (!strip || !e.shiftKey || e.code === CONFIG.downloadKey) return false;
	const mode = CONFIG.browseKeys;
	let dir = 0;
	if (mode !== 'wasd') { if (e.key === 'ArrowLeft') dir = -1; if (e.key === 'ArrowRight') dir = 1; }
	if (mode !== 'arrows' && !dir) { if (e.code === 'KeyA') dir = -1; if (e.code === 'KeyD') dir = 1; }
	if (!dir) return false;
	const items = Array.from(strip.querySelectorAll('.s34-pv-strip-item'));
	if (!items.length) return true;
	const at = items.findIndex(x => x.classList.contains('s34-on'));
	const next = items[at < 0 ? (dir > 0 ? 0 : items.length - 1) : at + dir];
	if (next) next.click();
	return true;
}

function reportPost(id) {
	if (!id || document.querySelector('.s34-report-overlay')) return;
	const overlay = document.createElement('div');
	overlay.className = 's34-overlay s34-confirm-overlay s34-report-overlay';
	overlay.innerHTML = `
            <div class="s34-confirm" role="dialog" aria-modal="true">
                <div class="s34-confirm-icon">⚑</div>
                <div class="s34-confirm-title">Report this post?</div>
                <div class="s34-confirm-text">Why does it break rule34's rules? (Not for copyright takedowns – rule34 asks you to use its DMCA page for those.)</div>
                <textarea class="s34-report-why" rows="3" maxlength="500" placeholder="Reason…"></textarea>
                <div class="s34-confirm-foot">
                    <button type="button" class="s34-btn" data-act="no">Cancel</button>
                    <button type="button" class="s34-btn s34-primary" data-act="yes">Send report</button>
                </div>
            </div>`;
	const box = overlay.querySelector('textarea');
	box.addEventListener('keydown', e => e.stopPropagation());
	const done = () => overlay.remove();
	overlay.addEventListener('click', async e => {
		const act = e.target.closest('[data-act]');
		if (e.target === overlay || (act && act.dataset.act === 'no')) { done(); return; }
		if (!act) return;
		const why = box.value.trim();
		if (!why) { box.focus(); return; }
		act.disabled = true;
		let res = '';
		try {
			const r = await loadPage('public/report.php?type=post&rid=' + encodeURIComponent(id) + '&reason=' + encodeURIComponent(encodeURI(why)), 'action');
			res = String(r && r.html || '').trim();
		} catch (err) { res = err && err.cloudflare ? 'cf' : 'error'; }
		done();
		if (res === 'limit') showToast('Report limit reached – your report was NOT sent. Try again later.');
		else if (res === 'cf') showToast('Not sent – solve the quick check first.', 'Solve check', openCloudflarePanel);
		else if (res === 'error') showToast('The report couldn\'t be sent – try again in a moment.');
		else showToast('Report sent – thanks.');
	});
	document.body.appendChild(overlay);
	box.focus();
}

function stylePopupExtras() {
	const st = popupState;
	if (!st) return;
	try { renderPopupMore(); } catch (e) {}
	const id = postIdFrom(st.postUrl);
	const later = st.overlay.querySelector('.s34-pv-later');
	if (later) { const on = inWatchLater(id); later.classList.toggle('s34-on', on); later.title = on ? 'On your Watch later list – click to take it off' : 'Watch later – a list for posts to look at properly later'; }
	styleICame(st.overlay.querySelector('.s34-pv-icame'), id);
}

export { CLOCK_SVG, SPLASH_SVG, inWatchLater, namesText, openSimilarStrip, sendICame, similarStripStep, stylePopupExtras, toggleLaterFor, toggleWatchLater };
