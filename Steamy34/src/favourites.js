// favourites – Steamy34 (aus Steamy34.js aufgeteilt)
import { restoreToCollections, showCollectionChips, unfavouritedHere } from './collections-sync.js';
import { CONFIG, params } from './config.js';
import { postIdFrom, thumbPostId } from './downloads/state.js';
import { loadPage, openCloudflarePanel } from './pages.js';
import { namesText } from './popup-more.js';
import { popupState } from './popup.js';
import { showToast } from './tag-bar.js';
import { addThumbButtons } from './thumb-buttons.js';

const pause = ms => new Promise(r => setTimeout(r, ms));

function allThumbs() {
	return Array.from(document.querySelectorAll('.image-list span.thumb'));
}

const FAVS_KEY = 'steamy34_favs';

const HEART_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9.4-9.3C1.2 7.6 3.6 4 7.1 4c2.1 0 3.6 1.1 4.9 2.8C13.3 5.1 14.8 4 16.9 4c3.5 0 5.9 3.6 4.5 7.2-1.9 4.7-9.4 9.3-9.4 9.3z"/></svg>';

function getFavs() {
	try {
		const v = GM_getValue(FAVS_KEY, {});
		return v && typeof v === 'object' ? v : {};
	} catch (e) { return {}; }
}

function isFav(id) {
	return !!(id && getFavs()[id]);
}

function rememberFav(id) {
	const f = getFavs();
	f[id] = Date.now();
	GM_setValue(FAVS_KEY, f);
}

async function addFavourite(id, opts = {}) {
	if (!id) return false;
	try {
		let r;
		try { r = await loadPage('public/addfav.php?id=' + encodeURIComponent(id), opts.kind || 'action'); }
		catch (e) { if (e.cloudflare) { showToast('Favourite not saved – solve the quick check first.', 'Solve check', openCloudflarePanel, 10000); return false; } throw e; }
		const text = r.html.trim();
		if (!r.ok) throw new Error('HTTP ' + r.status);
		if (text === '2') {
			showToast('Log in to rule34.xxx to use favourites.');
			return false;
		}
		rememberFav(id);
		if (!opts.quiet) showToast(text === '1' ? 'Already in your favourites ♥' : 'Added to your favourites ♥');
		return true;
	} catch (e) {
		showToast('Could not add to favourites (' + (e.message || e) + ').');
		return false;
	}
}

function forgetFav(id) {
	const f = getFavs();
	delete f[id];
	GM_setValue(FAVS_KEY, f);
}

async function removeFavourite(id, opts = {}) {
	if (!id) return false;
	try {
		let r;
		try { r = await loadPage('index.php?page=favorites&s=delete&id=' + encodeURIComponent(id) + '&return_pid=0', opts.kind || 'action'); }
		catch (e) { if (e.cloudflare) { showToast('Favourite not removed – solve the quick check first.', 'Solve check', openCloudflarePanel, 10000); return false; } throw e; }
		if (!r.ok) throw new Error('HTTP ' + r.status);
		if (/[?&]s=login\b/.test(r.url || '') || /name=["']?pass(word)?["']?/i.test(r.html)) {
			showToast('Log in to rule34.xxx to use favourites.');
			return false;
		}
		forgetFav(id);
		return true;
	} catch (e) {
		showToast('Could not remove the favourite (' + (e.message || e) + ').');
		return false;
	}
}

function showFavState(id, faved) {
	allThumbs().filter(t => String(thumbPostId(t)) === String(id)).forEach(t => {
		styleFavButton(t.querySelector('.s34-fav-btn'), faved, false);
		t.classList.toggle('s34-unfaved', !faved && t.classList.contains('s34-on-favpage'));
	});
	if (popupState && String(postIdFrom(popupState.postUrl)) === String(id)) {
		styleFavButton(popupState.overlay.querySelector('.s34-pv-fav'), faved, true);
	}
}

async function toggleFavourite(id, btn) {
	if (!id || (btn && btn.classList.contains('s34-busy'))) return;
	const faved = isFav(id) || (btn && btn.classList.contains('s34-faved'));
	setBusy(btn, true);
	const ok = faved ? await removeFavourite(id) : await addFavourite(id);
	setBusy(btn, false);
	if (!ok) return;
	showFavState(id, !faved);
	if (faved) {
		const gone = unfavouritedHere(id); // collections on all devices: out of its collections too
		const names = Array.from(new Set(gone.map(g => g.name)));
		showCollectionChips();
		showToast(names.length ? `Removed from your favourites and from ${namesText(names)}` : 'Removed from your favourites', 'Undo', async () => {
			if (await addFavourite(id, { quiet: !!gone.length })) {
				showFavState(id, true);
				if (gone.length) { restoreToCollections(gone); showCollectionChips(); showToast('Back in your favourites and collections ♥'); }
			}
		});
	}
}

function setupFavouritesPage() {
	if (!CONFIG.favButtons || params.get('page') !== 'favorites') return;
	const removes = Array.from(document.querySelectorAll('.image-list a[onclick*="s=delete"]'));
	removes.forEach(a => {
		const m = (a.getAttribute('onclick') || '').match(/[?&;]id=(\d+)/);
		const cell = a.parentElement;
		const thumb = cell && cell.querySelector('span.thumb');
		if (!m || !thumb) return;
		if (!isFav(m[1])) rememberFav(m[1]);
		thumb.classList.add('s34-on-favpage');
		a.classList.add('s34-site-remove');
		const br = a.previousElementSibling;
		if (br && br.tagName === 'BR') br.classList.add('s34-site-remove');
		styleFavButton(thumb.querySelector('.s34-fav-btn'), true, false);
	});
}

function setBusy(btn, busy) {
	if (!btn) return;
	btn.classList.toggle('s34-busy', busy);
	btn.disabled = busy;
	let spin = btn.querySelector('.s34-spin');
	if (busy && !spin) {
		spin = document.createElement('span');
		spin.className = 's34-spin';
		btn.appendChild(spin);
	} else if (!busy && spin) {
		spin.remove();
	}
}

function styleFavButton(btn, faved, withText) {
	if (!btn) return;
	btn.classList.toggle('s34-faved', faved);
	btn.innerHTML = HEART_SVG + (withText ? `<span>${faved ? 'In favourites' : 'Favourite'}</span>` : '');
	btn.title = faved ? 'In your favourites – click to remove' : 'Add to your favourites';
}

function addFavButtons(thumbs) {
	addThumbButtons(thumbs || allThumbs());
	// (your own favourites page keeps the ♥ - it's how posts are removed there)
	if (!CONFIG.favButtons || (!CONFIG.thumbHeart && params.get('page') !== 'favorites')) return;
	const favs = getFavs();
	(thumbs || allThumbs()).forEach(thumb => {
		if (thumb.querySelector('.s34-fav-btn')) return;
		const id = thumbPostId(thumb);
		if (!id) return;
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 's34-fav-btn';
		styleFavButton(btn, !!favs[id], false);
		btn.addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();
			toggleFavourite(id, btn);
		});
		thumb.appendChild(btn);
	});
}

export { FAVS_KEY, addFavButtons, addFavourite, allThumbs, getFavs, isFav, pause, removeFavourite, setBusy, setupFavouritesPage, showFavState, styleFavButton, toggleFavourite };
