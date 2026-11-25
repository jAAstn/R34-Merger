// batch – Steamy34 (aus Steamy34.js aufgeteilt)
import { batchUnfavourite, onOwnFavourites } from './collections-sync.js';
import { openCollectMenu } from './collections.js';
import { CONFIG } from './config.js';
import { saveUrlAs } from './downloads/download.js';
import { buildFilename, readPostSize } from './downloads/names.js';
import { postIdFrom, rememberDownload, thumbPostId } from './downloads/state.js';
import { allThumbs, pause } from './favourites.js';
import { getPostMedia } from './hover.js';
import { cloudflarePaused, fetchPostDoc } from './pages.js';
import { readPostTags } from './popup.js';
import { showToast } from './tag-bar.js';
import { thumbTags } from './thumbs.js';
import { FOLDER_SVG } from './window-shell.js';

let selectMode = false;

let batchRunning = false;

let batchStop = false;

let batchStatus = '';

const selected = new Set();

function setSelectMode(on) {
	selectMode = on;
	document.documentElement.classList.toggle('s34-selecting', on);
	const btn = document.querySelector('.s34-q-select');
	if (btn) {
		btn.textContent = on ? '✕ Stop selecting' : '⬇ Batch download';
		btn.classList.toggle('s34-on', on);
	}
	if (!on && !batchRunning) {
		selected.forEach(t => t.classList.remove('s34-selected'));
		selected.clear();
	}
	renderBatchBar();
}

function toggleSelected(thumb, force) {
	const on = force !== undefined ? force : !selected.has(thumb);
	if (on) selected.add(thumb); else selected.delete(thumb);
	thumb.classList.toggle('s34-selected', on);
	renderBatchBar();
}

function renderBatchBar() {
	let bar = document.querySelector('.s34-batch');
	if (!selectMode && !batchRunning) {
		if (bar) bar.remove();
		return;
	}
	if (!bar) {
		bar = document.createElement('div');
		bar.className = 's34-batch';
		bar.addEventListener('click', e => {
			const act = e.target.closest('[data-act]');
			if (!act) return;
			const a = act.dataset.act;
			if (a === 'every') {
				allThumbs().filter(t => t.offsetParent !== null).forEach(t => toggleSelected(t, true));
			} else if (a === 'unfav') {
				// two clicks, so a slip can't unfavourite a whole page
				if (!act.classList.contains('s34-armed')) {
					act.classList.add('s34-armed');
					act.textContent = `Click again to unfavourite ${selected.size}`;
					setTimeout(() => { if (act.isConnected) renderBatchBar(); }, 4000);
					return;
				}
				const list = allThumbs().filter(t => selected.has(t));
				if (list.length) batchUnfavourite(list);
			} else if (a === 'all') {
				allThumbs().filter(t => t.offsetParent !== null && !t.classList.contains('s34-was-downloaded'))
					.forEach(t => toggleSelected(t, true));
			} else if (a === 'none') {
				Array.from(selected).forEach(t => toggleSelected(t, false));
			} else if (a === 'go') {
				const list = allThumbs().filter(t => selected.has(t)); // page order
				if (list.length) batchDownload(list);
			} else if (a === 'collect') {
				const posts = allThumbs().filter(t => selected.has(t)).map(t => {
					const img = t.querySelector('img');
					return { id: thumbPostId(t), thumb: img ? img.getAttribute('src') : '', tags: img ? thumbTags(img).trim() : '' };
				});
				if (posts.length) openCollectMenu(act, posts);
			} else if (a === 'stop') {
				batchStop = true;
			} else if (a === 'done') {
				setSelectMode(false);
			}
		});
		document.body.appendChild(bar);
	}
	const n = selected.size;
	const favPage = onOwnFavourites();
	bar.innerHTML = batchRunning
		? `<span class="s34-batch-status"></span>
               <button type="button" data-act="stop">Stop</button>`
	: `<span class="s34-batch-status"><b>${n}</b> selected</span>
               ${favPage ? '<button type="button" data-act="every" title="Select every loaded post">Select all</button>' : ''}
               <button type="button" data-act="all" title="Select every loaded post you haven't downloaded yet">Select all new</button>
               <button type="button" data-act="none">Clear</button>
               <button type="button" data-act="collect" ${n ? '' : 'disabled'} title="Save the selected posts in a collection" class="s34-batch-icon">${FOLDER_SVG} Add to collection</button>
               ${favPage ? `<button type="button" data-act="unfav" ${n ? '' : 'disabled'} title="Take the selected posts out of your favourites">♥ Unfavourite</button>` : ''}
               <button type="button" data-act="go" class="s34-batch-go" ${n ? '' : 'disabled'}>⬇ Download ${n || ''}</button>
               <button type="button" data-act="done" title="Leave select mode">✕</button>`;
	if (batchRunning) bar.querySelector('.s34-batch-status').textContent = batchStatus;
}

async function downloadThumb(thumb, kind = 'batch') {
	const a = thumb.querySelector('a[href]');
	if (!a) return false;
	const doc = await fetchPostDoc(a.href, kind);
	if (!doc) return false;
	const media = await getPostMedia(a.href, kind);
	const url = media && (media.video || media.image);
	if (!url) return false;
	const g = readPostTags(doc);
	const names = k => (g[k] || []).map(x => x.tag);
	const tags = {
		copyright: names('copyright'),
		character: names('character'),
		artist: names('artist')
	};
	const filename = buildFilename(url, tags, readPostSize(doc), postIdFrom(a.href));
	const ok = await saveUrlAs(url, filename, a.href, { artist: (tags.artist || [])[0] });
	const img = thumb.querySelector('img');
	if (ok) rememberDownload(thumbPostId(thumb), { thumb: img ? img.getAttribute('src') : '', tags });
	return ok;
}

function openDownloadPanel(total, title, onCancel) {
	const old = document.querySelector('.s34-dlp');
	if (old) old.remove();
	const el = document.createElement('div');
	el.className = 's34-dlp';
	el.setAttribute('role', 'status');
	el.innerHTML = `
            <div class="s34-dlp-head"><b></b><span class="s34-dlp-count"></span></div>
            <div class="s34-dlp-bar"><i></i></div>
            <div class="s34-dlp-text"></div>
            <div class="s34-dlp-btns">
                <button type="button" data-a="pause">Pause</button>
                <button type="button" data-a="cancel">Cancel</button>
            </div>`;
	el.querySelector('b').textContent = title;
	const st = { paused: false, stopped: false, done: 0, ok: 0, failed: 0 };
	const pauseBtn = el.querySelector('[data-a="pause"]');
	const draw = text => {
		el.querySelector('.s34-dlp-count').textContent = st.done + ' / ' + total;
		el.querySelector('.s34-dlp-bar i').style.width = (total ? Math.round(st.done / total * 100) : 0) + '%';
		if (text != null) el.querySelector('.s34-dlp-text').textContent = text;
		el.classList.toggle('s34-dlp-paused', st.paused);
		pauseBtn.textContent = st.paused ? 'Resume' : 'Pause';
	};
	el.addEventListener('click', e => {
		const a = e.target.closest('[data-a]');
		if (!a) return;
		if (a.dataset.a === 'pause') { st.paused = !st.paused; draw(st.paused ? 'Paused – the current file still finishes.' : 'Going on…'); }
		else if (a.dataset.a === 'cancel') { st.stopped = true; st.paused = false; draw('Cancelling…'); if (onCancel) onCancel(); }
		else if (a.dataset.a === 'close') el.remove();
	});
	document.body.appendChild(el);
	draw('Starting…');
	return {
		get stopped() { return st.stopped; },
		stop() { st.stopped = true; },
		status(text) { draw(text); },
		item(ok) { st.done++; if (ok) st.ok++; else st.failed++; draw(); },
		async waitWhilePaused() { while (st.paused && !st.stopped) await pause(400); },
		finish(stopped) {
			st.paused = false;
			const sum = st.ok + ' saved' + (st.failed ? ', ' + st.failed + ' failed' : '') + (stopped ? ' – stopped.' : '.');
			draw(sum);
			el.querySelector('b').textContent = stopped ? 'Download stopped' : 'Download finished';
			el.querySelector('.s34-dlp-btns').innerHTML = '<button type="button" data-a="close">Close</button>';
			setTimeout(() => { if (el.isConnected) el.remove(); }, 12000);
			return sum;
		}
	};
}

async function batchDownload(list) {
	batchRunning = true;
	batchStop = false;
	let ok = 0, failed = 0;
	const panel = openDownloadPanel(list.length, 'Downloading ' + list.length + ' posts', () => { batchStop = true; renderBatchBar(); });
	for (let i = 0; i < list.length && !batchStop; i++) {
		const thumb = list[i];
		await panel.waitWhilePaused();
		if (batchStop) break;
		batchStatus = `Downloading ${i + 1} / ${list.length}…`;
		panel.status(`Post ${i + 1} of ${list.length}…`);
		renderBatchBar();
		// Cloudflare check open? Wait until it's solved.
		while (cloudflarePaused() && !batchStop) {
			batchStatus = 'Paused – solve the Cloudflare check to continue';
			panel.status(batchStatus);
			renderBatchBar();
			await pause(2000);
		}
		if (batchStop) break;
		let done = await downloadThumb(thumb);
		if (!done && cloudflarePaused()) {   // check came up mid-way: retry once after
			while (cloudflarePaused() && !batchStop) await pause(2000);
			if (!batchStop) done = await downloadThumb(thumb);
		}
		if (done) {
			ok++;
			selected.delete(thumb);
			thumb.classList.remove('s34-selected');
		} else {
			failed++;
		}
		panel.item(done);
		if (i < list.length - 1 && !batchStop) await pause(CONFIG.batchDelay);
	}
	batchRunning = false;
	renderBatchBar();
	panel.finish(batchStop);
	if (failed) showToast(`${failed} download${failed === 1 ? '' : 's'} failed – those posts are still ticked, so you can try again.`, null, null, 10000);
}

export { batchRunning, batchStop, downloadThumb, openDownloadPanel, renderBatchBar, selectMode, selected, setSelectMode, toggleSelected };
export function setBatchRunning(value) { batchRunning = value; return value; }
export function setBatchStop(value) { batchStop = value; return value; }
export function setBatchStatus(value) { batchStatus = value; return value; }
