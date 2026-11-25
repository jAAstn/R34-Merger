// blacklist – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG } from './config.js';
import { getTagFromRow } from './thumbs.js';

const BL_COOKIE = 'tag_blacklist';

function unescapeHtml(s) {
	return s.replace(/&#0*39;|&#x0*27;/gi, "'").replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function escapeHtml(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

let blCacheRaw = null;

let blCacheList = [];

const BL_FULL_KEY = 'steamy34_bl_full';

const BL_COOKIE_MAX = 4000;

let blFullCache = null;

let blFullAt = 0;

function readFullBlocklist() {
	if (blFullCache && Date.now() - blFullAt < 2000) return blFullCache;
	let v = null;
	try { v = GM_getValue(BL_FULL_KEY, null); } catch (e) {}
	blFullCache = Array.isArray(v) ? v.filter(t => typeof t === 'string' && t).map(unescapeHtml) : [];
	blFullAt = Date.now();
	return blFullCache;
}

function readCookieBlocklist() {
	const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + BL_COOKIE + '=([^;]*)'));
	if (!m) { blCacheRaw = ''; blCacheList = []; return []; }
	if (m[1] === blCacheRaw) return blCacheList.slice();
	blCacheRaw = m[1];
	blCacheList = parseBlocklist(m[1]);
	return blCacheList.slice();
}

const RATING_LONG = { e: 'explicit', q: 'questionable', s: 'safe', g: 'general' };

const SOFT_KEY = 'steamy34_bl_soft';

let softCache = null, softAt = 0;

function getSoftTags() {
	if (softCache && Date.now() - softAt < 2000) return softCache;
	let v = [];
	try { v = GM_getValue(SOFT_KEY, []); } catch (e) {}
	softCache = new Set(Array.isArray(v) ? v.map(t => unescapeHtml(String(t)).toLowerCase()) : []);
	softAt = Date.now();
	return softCache;
}

function setSoftTag(tag, on) {
	const s = new Set(getSoftTags());
	const k = unescapeHtml(String(tag)).toLowerCase();
	if (on) s.add(k); else s.delete(k);
	try { GM_setValue(SOFT_KEY, Array.from(s)); } catch (e) {}
	softCache = s; softAt = Date.now();
}

function blockModeOf(hit, mutes) {
	if (!hit.length) return '';
	const soft = getSoftTags(), m = mutes || getMutes();
	return hit.every(t => soft.has(t) && !(t in m)) ? 'soft' : 'hide';
}

const MUTE_KEY = 'steamy34_muted';

function getMutes() {
	let m = {};
	try { const v = GM_getValue(MUTE_KEY, {}); m = v && typeof v === 'object' ? v : {}; } catch (e) {}
	const now = Date.now();
	let changed = false;
	Object.keys(m).forEach(t => { if (!(m[t] > now)) { delete m[t]; changed = true; } });
	if (changed) { try { GM_setValue(MUTE_KEY, m); } catch (e) {} }
	return m;
}

function muteTags(tags, ms) {
	const m = getMutes();
	const until = Date.now() + ms;
	tags.forEach(t => { const k = unescapeHtml(String(t)).toLowerCase().trim(); if (k) m[k] = until; });
	GM_setValue(MUTE_KEY, m);
}

function unmuteTag(tag) {
	const m = getMutes();
	delete m[String(tag).toLowerCase()];
	GM_setValue(MUTE_KEY, m);
}

function blockedTagSet() {
	const set = new Set(Object.keys(getMutes()));
	readBlocklist().forEach(t => {
		let k = unescapeHtml(String(t)).toLowerCase().trim();
		if (!k) return;
		const r = k.match(/^rating:([eqsg])$/);
		if (r) k = 'rating:' + RATING_LONG[r[1]];
		set.add(k);
	});
	return set;
}

function blockedTagsOf(tags, set) {
	const s = set || blockedTagSet();
	if (!s.size) return [];
	return Array.from(new Set((Array.isArray(tags) ? tags : String(tags).split(/\s+/))
							  .map(t => unescapeHtml(String(t)).toLowerCase()).filter(t => t && s.has(t))));
}

let blMergeKey = null, blMergeFull = null, blMergeList = [];

function readBlocklist() {
	const cookie = readCookieBlocklist();
	const full = readFullBlocklist();
	if (!full.length) return cookie;
	if (blMergeFull === full && blMergeKey === blCacheRaw) return blMergeList.slice();
	const seen = new Set(full.map(t => t.toLowerCase()));
	blMergeList = full.concat(cookie.filter(t => looksLikeTag(t) && !seen.has(t.toLowerCase())));
	blMergeFull = full;
	blMergeKey = blCacheRaw;
	return blMergeList.slice();
}

const blCookieValue = list => encodeURIComponent(list.map(escapeHtml).join('%20'));

function blCookieFit(list) {
	const fit = [];
	let len = BL_COOKIE.length + 1;
	list.forEach(t => {
		const add = encodeURIComponent(escapeHtml(t)).length + (fit.length ? 5 : 0); // ("%2520" between tags)
		if (len + add <= BL_COOKIE_MAX) { fit.push(t); len += add; }
	});
	return fit;
}

function parseBlocklist(cookieValue) {
	let raw = cookieValue.replace(/\+/g, ' ');
	for (let i = 0; i < 4 && /%[0-9a-f]{2}/i.test(raw); i++) {
		try { raw = decodeURIComponent(raw); } catch (e) { break; }
	}
	const seen = new Set();
	return raw.split(/\s+/).map(unescapeHtml).filter(t => {
		const k = t.toLowerCase();
		if (!t || seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

const BL_TIMES_KEY = 'steamy34_bltimes';

function getBlTimes() {
	try {
		const v = GM_getValue(BL_TIMES_KEY, {});
		return v && typeof v === 'object' ? v : {};
	} catch (e) { return {}; }
}

function writeBlocklist(list, quiet) {
	const before = new Set(readBlocklist().map(t => t.toLowerCase()));
	// The full list in Steamy34's storage, what fits into the cookie -
	// in the same format the site itself writes (see readBlocklist)
	const seen = new Set();
	list = list.map(t => unescapeHtml(String(t || ''))).filter(t => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
	try { GM_setValue(BL_FULL_KEY, list); blFullCache = list.slice(); blFullAt = Date.now(); } catch (e) {}
	const maxAge = 60 * 60 * 24 * 365 * 5; // 5 years
	document.cookie = `${BL_COOKIE}=${blCookieValue(blCookieFit(list))}; path=/; max-age=${maxAge}; SameSite=Lax`;
	try {
		const times = getBlTimes();
		const now = Date.now();
		const lower = new Set(list.map(t => t.toLowerCase()));
		if (!quiet) lower.forEach(k => { if (!before.has(k) && !times[k]) times[k] = now; });
		Object.keys(times).forEach(k => { if (!lower.has(k)) delete times[k]; });
		GM_setValue(BL_TIMES_KEY, times);
	} catch (e) {}
	// Keep the sidebar "Blacklist · N tags" button up to date
	const count = document.querySelector('.s34-blbtn-count');
	if (count) count.textContent = list.length === 1 ? '1 tag' : list.length + ' tags';
}

function looksLikeTag(t) {
	return typeof t === 'string' && /^[^\s%<>"]{1,150}$/.test(t);
}

let blCookieRepaired = '';

function repairBlacklistCookie() {
	let stored = null;
	try { stored = GM_getValue(BL_FULL_KEY, null); } catch (e) {}
	if (Array.isArray(stored) && stored.some(t => typeof t === 'string' && /&(#0*39|#x0*27|amp|quot|lt|gt);/i.test(t))) {
		console.log('[Steamy34] Blacklist: tag names with "&#039;" cleaned up.');
		writeBlocklist(stored, true); // (writeBlocklist stores the real names)
	}
	const full = readFullBlocklist();
	if (!full.length) return;
	const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + BL_COOKIE + '=([^;]*)'));
	const raw = m ? m[1] : null;
	const cookieTags = raw === null ? [] : parseBlocklist(raw);
	const damaged = cookieTags.some(t => !looksLikeTag(t));
	const seen = new Set(full.map(t => t.toLowerCase()));
	const merged = full.concat(cookieTags.filter(t => looksLikeTag(t) && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase())));
	const want = blCookieValue(blCookieFit(merged));
	if (raw === want) return;
	blCookieRepaired = raw === null ? 'missing' : damaged ? 'damaged' : 'out of step';
	console.log('[Steamy34] rule34\'s blacklist cookie was ' + blCookieRepaired + ' – written fresh.');
	writeBlocklist(merged, true);
}

function isBlocked(tag) {
	return readBlocklist().some(t => t.toLowerCase() === tag.toLowerCase());
}

function toggleBlock(tag) {
	let list = readBlocklist();
	const lower = tag.toLowerCase();
	const blocked = list.some(t => t.toLowerCase() === lower);

	if (blocked) {
		list = list.filter(t => t.toLowerCase() !== lower);
	} else {
		list.push(tag);
	}
	writeBlocklist(list);
	console.log(`[Steamy34] ${blocked ? 'Removed from the blacklist' : 'Blacklisted'}: ${tag}`);
	return !blocked;
}

function styleButton(btn, blocked) {
	btn.textContent = blocked ? '↺' : '⊘'; // ↺ unblock / ⊘ block
	btn.title = blocked ? 'Blacklisted - click to remove from the blacklist'
	: 'Add to blacklist';
	btn.classList.toggle('blocked', blocked);
	const row = btn.closest('li');
	if (row) row.classList.toggle('s34-li-blocked', blocked); // crossed-out tag
}

function addBlocklistButtons() {
	document.querySelectorAll('#tag-sidebar li[class*="tag-type-"]').forEach(row => {
		if (row.querySelector('.r34-block-btn')) return;

		const tag = getTagFromRow(row);
		if (!tag) return;

		const btn = document.createElement('a');
		btn.href = '#';
		btn.className = 'r34-block-btn';
		styleButton(btn, isBlocked(tag));

		btn.addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();
			const nowBlocked = toggleBlock(tag);
			styleButton(btn, nowBlocked);
			if (CONFIG.reloadAfterBlock) location.reload();
		});

		// At the end of the tag, like on the thumbnail chips
		row.appendChild(btn);
		styleButton(btn, isBlocked(tag)); // again, now that it's in the row
	});
}

export { BL_COOKIE_MAX, BL_TIMES_KEY, addBlocklistButtons, blCookieFit, blCookieRepaired, blockModeOf, blockedTagSet, blockedTagsOf, escapeHtml, getBlTimes, getMutes, getSoftTags, isBlocked, muteTags, readBlocklist, readCookieBlocklist, repairBlacklistCookie, setSoftTag, styleButton, toggleBlock, unescapeHtml, unmuteTag, writeBlocklist };
