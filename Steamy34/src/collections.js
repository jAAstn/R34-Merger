// collections – Steamy34 (aus Steamy34.js aufgeteilt)
import { openDownloadPanel } from './batch.js';
import { timeAgo } from './blacklist-window.js';
import { blockedTagSet, blockedTagsOf } from './blacklist.js';
import { buildCollSyncCard, checkFavouritesElsewhere, collSyncAsked, collectionsAdded } from './collections-sync.js';
import { CONFIG } from './config.js';
import { pause } from './favourites.js';
import { cloudflarePaused } from './pages.js';
import { openPopup } from './popup.js';
import { updateHubCounts } from './sidebar.js';
import { showToast } from './tag-bar.js';
import { refreshCollThumbButtons, thumbButtonsHidden } from './thumb-buttons.js';
import { FOLDER_SVG, downloadPostById, openWindow, postPageUrl, thumbOrPlaceholder } from './window-shell.js';

const COLL_KEY = 'steamy34_collections';

function getCollections() {
	try {
		const v = GM_getValue(COLL_KEY, []);
		return Array.isArray(v) ? v.filter(c => c && c.id && Array.isArray(c.posts)) : [];
	} catch (e) { return []; }
}

function saveCollections(list) {
	GM_setValue(COLL_KEY, list);
	updateHubCounts();
	try { refreshCollThumbButtons(); } catch (e) {}
}

function createCollection(name) {
	const list = getCollections();
	const c = { id: 'c' + Date.now().toString(36), name: name.trim().slice(0, 60) || 'New collection', created: Date.now(), posts: [] };
	list.push(c);
	saveCollections(list);
	return c;
}

function openCollectMenu(anchor, posts) {
	// (Beta 3.9.6) the same button again closes it
	const open = document.querySelector('.s34-cmenu');
	if (open && open._anchor === anchor) { open.remove(); return; }
	document.querySelectorAll('.s34-cmenu').forEach(m => m.remove());
	const single = posts.length === 1;
	const menu = document.createElement('div');
	menu.className = 's34-cmenu';
	menu._anchor = anchor;

	function render() {
		menu.replaceChildren();
		const head = document.createElement('div');
		head.className = 's34-cmenu-head';
		head.textContent = single ? 'Save to collection' : `Add ${posts.length} posts to…`;
		menu.appendChild(head);
		const list = getCollections();
		if (!list.length) {
			const e = document.createElement('div');
			e.className = 's34-cmenu-empty';
			e.textContent = 'No collections yet – make your first one:';
			menu.appendChild(e);
		}
		list.forEach(c => {
			const has = single && c.posts.some(p => p.id === posts[0].id);
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 's34-cmenu-item' + (has ? ' s34-on' : '');
			b.innerHTML = `<span class="s34-cmenu-check">${has ? '✓' : ''}</span><span class="s34-cmenu-name"></span><span class="s34-cmenu-n">${c.posts.length}</span>`;
			b.querySelector('.s34-cmenu-name').textContent = c.name;
			b.addEventListener('click', () => {
				const all = getCollections();
				const col = all.find(x => x.id === c.id);
				if (!col) return;
				if (single && has) {
					col.posts = col.posts.filter(p => p.id !== posts[0].id);
					showToast(`Removed from "${col.name}".`);
				} else {
					let added = 0;
					const addedIds = [];
					posts.forEach(p => {
						if (p.id && !col.posts.some(x => x.id === p.id)) {
							col.posts.unshift(Object.assign({ id: p.id, thumb: p.thumb || '', time: Date.now() }, p.tags ? { tags: String(p.tags).slice(0, 2000) } : {}));
							added++;
							addedIds.push(p.id);
						}
					});
					setTimeout(() => collectionsAdded(addedIds), 0); // (after saving below)
					showToast(added ? `Saved ${added === 1 ? '' : added + ' posts '}to "${col.name}".` : `Already in "${col.name}".`);
				}
				saveCollections(all);
				if (single) render(); else menu.remove();
			});
			menu.appendChild(b);
		});
		const add = document.createElement('div');
		add.className = 's34-cmenu-new';
		add.innerHTML = '<input type="text" placeholder="New collection…" maxlength="60"><button type="button">Create</button>';
		const input = add.querySelector('input');
		const create = () => {
			if (!input.value.trim()) { input.focus(); return; }
			const c = createCollection(input.value);
			const all = getCollections();
			const col = all.find(x => x.id === c.id);
			posts.forEach(p => { if (p.id) col.posts.unshift(Object.assign({ id: p.id, thumb: p.thumb || '', time: Date.now() }, p.tags ? { tags: String(p.tags).slice(0, 2000) } : {})); });
			saveCollections(all);
			collectionsAdded(posts.map(p => p.id).filter(Boolean));
			showToast(`Made "${col.name}" and saved ${posts.length === 1 ? 'the post' : posts.length + ' posts'}.`);
			if (single) render(); else menu.remove();
		};
		add.querySelector('button').addEventListener('click', create);
		input.addEventListener('keydown', e => {
			e.stopPropagation(); // typing doesn't trigger hotkeys
			if (e.key === 'Enter') { e.preventDefault(); create(); }
			if (e.key === 'Escape') menu.remove();
		});
		menu.appendChild(add);
	}
	render();
	document.body.appendChild(menu);
	// Next to the button, kept on screen
	const r = anchor.getBoundingClientRect();
	const mw = menu.offsetWidth, mh = menu.offsetHeight;
	let left = Math.min(r.left, window.innerWidth - mw - 8);
	let top = r.bottom + 6;
	if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
	menu.style.left = Math.max(8, left) + 'px';
	menu.style.top = top + 'px';
	const off = e => {
		if (!menu.isConnected) { document.removeEventListener('mousedown', off, true); return; }
		if (!menu.contains(e.target) && !anchor.contains(e.target)) {
			menu.remove();
			document.removeEventListener('mousedown', off, true);
		}
	};
	setTimeout(() => document.addEventListener('mousedown', off, true), 0);
}

function coverBlockedTile(tile, link, hit, onShow) {
	tile.classList.add('s34-tile-bl');
	const box = link.querySelector('.s34-tile-img') || link;
	const cover = document.createElement('div');
	cover.className = 's34-tile-blcover';
	cover.innerHTML = '<span></span><button type="button">Show</button>';
	cover.querySelector('span').textContent = 'Blacklisted: ' + hit.slice(0, 3).map(t => t.replace(/_/g, ' ')).join(', ');
	cover.querySelector('button').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onShow(); });
	box.appendChild(cover);
	// a covered post doesn't open - except its own "Show" button works
	link.addEventListener('click', e => {
		if (!tile.classList.contains('s34-tile-bl') || (e.target.closest && e.target.closest('.s34-tile-blcover button'))) return;
		e.preventDefault(); e.stopImmediatePropagation();
	}, true);
}

function uncoverTile(tile) {
	tile.classList.remove('s34-tile-bl');
	const c = tile.querySelector('.s34-tile-blcover');
	if (c) c.remove();
}

function blacklistToggle(bar, count, on, onChange) {
	if (!count) return null;
	const b = document.createElement('button');
	b.type = 'button';
	b.className = 's34-bl-toggle' + (on ? ' s34-on' : '');
	b.textContent = (on ? 'Hide' : 'Show') + ' blacklisted (' + count + ')';
	b.title = 'Posts with a blacklisted tag – you saved them yourself, so you decide';
	b.addEventListener('click', () => onChange(!on));
	const grow = bar.querySelector('.s34-grow');
	if (grow) grow.after(b); else bar.appendChild(b);
	return b;
}

function openCollectionsWindow(openId) {
	if (document.querySelector('.s34-coll-overlay')) return;
	const w = openWindow({ cls: 's34-coll-overlay', icon: FOLDER_SVG, title: 'Collections', width: 820 });
	let current = openId || null;
	let downloading = null; // { stop }
	let showBlocked = false;              // (Beta 3.9.1) "Show blacklisted (N)"
	const shownNow = new Set();           // single posts uncovered with "Show"
	checkFavouritesElsewhere(15 * 60000); // posts un-favourited on another device leave their collections

	function renderList() {
		current = null;
		w.setTitle('Collections');
		const list = getCollections();
		const where = CONFIG.collectionsSync ? 'on all your devices (as favourites)' : 'only on this device';
		w.setSub(list.length ? `${list.length} collection${list.length === 1 ? '' : 's'} · ${where}` : 'Your own folders for posts – ' + where);
		w.body.replaceChildren();
		if (!collSyncAsked()) w.body.appendChild(buildCollSyncCard(renderList));
		const grid = document.createElement('div');
		grid.className = 's34-coll-grid';
		list.forEach(c => {
			const card = document.createElement('button');
			card.type = 'button';
			card.className = 's34-coll-card';
			const cover = document.createElement('div');
			cover.className = 's34-coll-cover';
			const blSet = blockedTagSet();
			const clean = c.posts.filter(p => !(p.tags && blockedTagsOf(p.tags, blSet).length));
			// (Beta 3.10) a chosen cover fills the card; otherwise the first four
			const chosen = c.cover && clean.find(p => String(p.id) === String(c.cover) && p.thumb);
			(chosen ? [chosen] : clean.slice(0, 4)).forEach(p => { if (p.thumb) { const i = new Image(); i.src = p.thumb; i.alt = ''; i.loading = 'lazy'; cover.appendChild(i); } });
			if (!cover.childElementCount) cover.innerHTML = FOLDER_SVG;
			cover.classList.toggle('s34-coll-cover-n' + Math.min(4, cover.querySelectorAll('img').length), true);
			const name = document.createElement('div');
			name.className = 's34-coll-name';
			name.textContent = c.name;
			const n = document.createElement('div');
			n.className = 's34-coll-n';
			n.textContent = c.posts.length + (c.posts.length === 1 ? ' post' : ' posts');
			card.append(cover, name, n);
			if (c.note) {
				const note = document.createElement('div');
				note.className = 's34-coll-notep';
				note.textContent = c.note;
				card.appendChild(note);
			}
			card.addEventListener('click', () => renderOne(c.id));
			grid.appendChild(card);
		});
		// New collection card
		const add = document.createElement('div');
		add.className = 's34-coll-card s34-coll-new';
		add.innerHTML = '<div class="s34-coll-plus">+</div><input type="text" placeholder="New collection…" maxlength="60"><button type="button">Create</button>';
		const input = add.querySelector('input');
		const create = () => {
			if (!input.value.trim()) { input.focus(); return; }
			createCollection(input.value);
			renderList();
		};
		add.querySelector('button').addEventListener('click', create);
		input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') create(); if (e.key === 'Escape') w.close(); });
		grid.appendChild(add);
		w.body.appendChild(grid);
		if (!list.length) {
			const hint = document.createElement('div');
			hint.className = 's34-win-note';
			hint.textContent = 'Save posts with the Collection button in the popup or on a post page – or tick several with Batch download and use "Add to collection".';
			w.body.appendChild(hint);
		}
	}

	function renderOne(id) {
		const c = getCollections().find(x => x.id === id);
		if (!c) { renderList(); return; }
		current = id;
		w.setTitle(c.name);
		w.setSub(`${c.posts.length} post${c.posts.length === 1 ? '' : 's'} · collection`);
		w.body.replaceChildren();
		const bar = document.createElement('div');
		bar.className = 's34-win-tools';
		bar.innerHTML = `
                <button type="button" data-a="back">← All collections</button>
                <select class="s34-coll-sort" title="Order of the posts">
                    <option value="mine">${thumbButtonsHidden() ? 'My order (hold a post, then drag)' : 'My order (drag to arrange)'}</option>
                    <option value="new">Newest added first</option>
                    <option value="old">Oldest added first</option>
                    <option value="idhi">Post number, high → low</option>
                    <option value="idlo">Post number, low → high</option>
                </select>
                <span class="s34-grow"></span>
                <button type="button" data-a="rename">✎ Rename</button>
                <button type="button" data-a="delete">Delete</button>
                <button type="button" data-a="dl" class="s34-win-primary">⬇ Download all</button>`;
		bar.addEventListener('click', async e => {
			const a = e.target.closest('[data-a]');
			if (!a) return;
			const act = a.dataset.a;
			if (act === 'back') { if (downloading) downloading.stop = true; renderList(); }
			else if (act === 'rename') {
				const name = prompt('New name for this collection:', c.name);
				if (name === null || !name.trim()) return;
				const all = getCollections();
				all.find(x => x.id === id).name = name.trim().slice(0, 60);
				saveCollections(all);
				renderOne(id);
			} else if (act === 'delete') {
				if (!confirm(`Delete the collection "${c.name}"? The posts themselves stay on rule34 – only this list is removed.`)) return;
				saveCollections(getCollections().filter(x => x.id !== id));
				renderList();
			} else if (act === 'dl') {
				if (downloading) { downloading.stop = true; return; }
				const posts = getCollections().find(x => x.id === id).posts.slice();
				if (!posts.length) return;
				downloading = { stop: false };
				const status = w.body.querySelector('.s34-win-status');
				a.textContent = '■ Stop';
				let ok = 0, failed = 0;
				const job = downloading;
				const panel = openDownloadPanel(posts.length, 'Collection "' + c.name + '"', () => { job.stop = true; });
				for (let i = 0; i < posts.length && !job.stop; i++) {
					await panel.waitWhilePaused();
					if (job.stop) break;
					status.hidden = false;
					status.textContent = `Downloading ${i + 1} / ${posts.length}…`;
					panel.status(`Post ${i + 1} of ${posts.length}…`);
					while (cloudflarePaused() && !job.stop) {
						status.textContent = 'Paused – solve the Cloudflare check to continue';
						panel.status(status.textContent);
						await pause(2000);
					}
					if (job.stop) break;
					const done = await downloadPostById(posts[i].id, posts[i].thumb);
					if (done) ok++; else failed++;
					panel.item(done);
					if (i < posts.length - 1 && !job.stop) await pause(CONFIG.batchDelay);
				}
				const stopped = job.stop;
				const sum = panel.finish(stopped);
				downloading = null;
				if (!w.overlay.isConnected) return;
				a.textContent = '⬇ Download all';
				status.textContent = sum;
			}
		});
		// (Beta 3.10) order: your own (drag), by date added or by post number
		const sort = c.sort || 'mine';
		const sortSel = bar.querySelector('.s34-coll-sort');
		sortSel.value = sort;
		sortSel.addEventListener('change', () => {
			const all = getCollections();
			all.find(x => x.id === id).sort = sortSel.value;
			saveCollections(all);
			renderOne(id);
		});
		const shown = c.posts.slice();
		if (sort === 'new') shown.sort((a, b) => (b.time || 0) - (a.time || 0));
		else if (sort === 'old') shown.sort((a, b) => (a.time || 0) - (b.time || 0));
		else if (sort === 'idhi') shown.sort((a, b) => b.id - a.id);
		else if (sort === 'idlo') shown.sort((a, b) => a.id - b.id);
		// a note for the collection (saved as you type)
		const note = document.createElement('textarea');
		note.className = 's34-coll-note';
		note.rows = 1;
		note.maxLength = 500;
		note.placeholder = 'Add a note to this collection…';
		note.value = c.note || '';
		let noteTimer = null;
		const fitNote = () => { note.style.height = 'auto'; note.style.height = Math.min(140, note.scrollHeight + 2) + 'px'; };
		note.addEventListener('input', () => {
			fitNote();
			clearTimeout(noteTimer);
			noteTimer = setTimeout(() => {
				const all = getCollections();
				const col = all.find(x => x.id === id);
				if (!col) return;
				col.note = note.value.trim().slice(0, 500);
				if (!col.note) delete col.note;
				saveCollections(all);
			}, 400);
		});
		note.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') note.blur(); });
		setTimeout(fitNote, 0);
		const status = document.createElement('div');
		status.className = 's34-win-status';
		status.hidden = true;
		const tiles = document.createElement('div');
		tiles.className = 's34-tiles' + (sort === 'mine' && shown.length > 1 ? ' s34-tiles-drag' : '');
		if (!c.posts.length) {
			const e = document.createElement('div');
			e.className = 's34-win-empty';
			e.textContent = 'Empty – save posts here with the Collection button.';
			tiles.appendChild(e);
		}
		// A post opens in the popup viewer on top, ← / → go through this
		// collection (Beta 3.6 - before, the post page in a new tab; Ctrl /
		// middle click still does that). The popup gets a small stand-in
		// thumbnail per post; picture or video is learned from the post page
		// the first time and kept with the post.
		const proxies = shown.map(p => {
			const s = document.createElement('span');
			s.className = 'thumb';
			s.innerHTML = '<a></a>';
			s.firstChild.href = postPageUrl(p.id);
			const im = new Image();
			im.alt = '';
			if (p.thumb) im.src = p.thumb;
			if (typeof p.video === 'boolean') { if (p.video) im.className = 'webm-thumb'; }
			else s.dataset.s34TypeUnknown = '1';
			s.firstChild.appendChild(im);
			s._s34OnType = isVideo => {
				const all = getCollections();
				const col = all.find(x => x.id === id);
				const item = col && col.posts.find(x => x.id === p.id);
				if (item && item.video !== isVideo) { item.video = isVideo; saveCollections(all); }
			};
			return s;
		});
		const list = { thumbs: () => proxies, state: () => 'done', more: () => {} };
		const blSet = blockedTagSet();
		const hitOf = p => (p.tags ? blockedTagsOf(p.tags, blSet) : []);
		const blCount = c.posts.filter(p => hitOf(p).length).length;
		blacklistToggle(bar, blCount, showBlocked, v => { showBlocked = v; renderOne(id); });
		let dragFrom = null;
		// move a post (in "My order") to a place in front of index "to"
		const movePost = (from, to) => {
			if (from < to) to--;
			if (to === from) { renderOne(id); return; }
			const all = getCollections();
			const col = all.find(x => x.id === id);
			const [moved] = col.posts.splice(from, 1);
			col.posts.splice(to, 0, moved);
			saveCollections(all);
			renderOne(id);
		};
		// (Beta 3.10.1) phones: hold a post for a moment, then drag it with the finger
		if (sort === 'mine' && shown.length > 1) {
			let hold = null, drag = null, start = null;
			const tileList = () => Array.from(tiles.querySelectorAll('.s34-tile'));
			const clearMarks = () => tiles.querySelectorAll('.s34-drop-before, .s34-drop-after').forEach(x => x.classList.remove('s34-drop-before', 's34-drop-after'));
			tiles.addEventListener('touchstart', e => {
				const tile = e.target.closest('.s34-tile');
				if (!tile || e.touches.length !== 1 || e.target.closest('.s34-tile-acts, .s34-tile-blcover')) return;
				start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
				clearTimeout(hold);
				hold = setTimeout(() => {
					hold = null;
					drag = { from: tileList().indexOf(tile), tile, over: null, after: false };
					tile.classList.add('s34-dragging');
					try { navigator.vibrate && navigator.vibrate(12); } catch (err) {}
				}, 380);
			}, { passive: true });
			tiles.addEventListener('touchmove', e => {
				const t = e.touches[0];
				if (!drag) {
					if (hold && start && Math.abs(t.clientX - start.x) + Math.abs(t.clientY - start.y) > 10) { clearTimeout(hold); hold = null; }
					return;
				}
				e.preventDefault(); // (the finger moves the post, not the page)
				const el = document.elementFromPoint(t.clientX, t.clientY);
				const over = el && el.closest && el.closest('.s34-tile');
				clearMarks();
				drag.over = over && over !== drag.tile && tiles.contains(over) ? over : null;
				if (drag.over) {
					const r = drag.over.getBoundingClientRect();
					drag.after = t.clientX > r.left + r.width / 2;
					drag.over.classList.add(drag.after ? 's34-drop-after' : 's34-drop-before');
				}
				// near the top / bottom edge: the list scrolls along
				const sc = w.body;
				const br = sc.getBoundingClientRect();
				if (t.clientY < br.top + 60) sc.scrollTop -= 14;
				else if (t.clientY > br.bottom - 60) sc.scrollTop += 14;
			}, { passive: false });
			const end = e => {
				clearTimeout(hold); hold = null;
				if (!drag) return;
				const d = drag; drag = null;
				d.tile.classList.remove('s34-dragging');
				clearMarks();
				if (e.cancelable) e.preventDefault(); // (no tap on the post afterwards)
				tiles._s34NoClick = Date.now();
				if (e.type === 'touchend' && d.over) movePost(d.from, tileList().indexOf(d.over) + (d.after ? 1 : 0));
			};
			tiles.addEventListener('touchend', end);
			tiles.addEventListener('touchcancel', end);
			tiles.addEventListener('click', e => { if (Date.now() - (tiles._s34NoClick || 0) < 600) { e.preventDefault(); e.stopPropagation(); } }, true);
			tiles.addEventListener('contextmenu', e => { if (e.target.closest('.s34-tile')) e.preventDefault(); });
		}
		shown.forEach((p, n) => {
			const tile = document.createElement('div');
			tile.className = 's34-tile' + (String(c.cover) === String(p.id) ? ' s34-tile-iscover' : '');
			// (Beta 3.10) drag to arrange (in "My order")
			if (sort === 'mine' && shown.length > 1) {
				tile.draggable = true;
				tile.addEventListener('dragstart', e => { dragFrom = n; tile.classList.add('s34-dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(p.id)); } catch (err) {} });
				tile.addEventListener('dragend', () => { tile.classList.remove('s34-dragging'); tiles.querySelectorAll('.s34-drop-before, .s34-drop-after').forEach(x => x.classList.remove('s34-drop-before', 's34-drop-after')); });
				tile.addEventListener('dragover', e => {
					if (dragFrom === null) return;
					e.preventDefault();
					const r = tile.getBoundingClientRect();
					const after = e.clientX > r.left + r.width / 2;
					tiles.querySelectorAll('.s34-drop-before, .s34-drop-after').forEach(x => { if (x !== tile) x.classList.remove('s34-drop-before', 's34-drop-after'); });
					tile.classList.toggle('s34-drop-after', after);
					tile.classList.toggle('s34-drop-before', !after);
				});
				tile.addEventListener('drop', e => {
					if (dragFrom === null) return;
					e.preventDefault();
					const after = tile.classList.contains('s34-drop-after');
					const from = dragFrom;
					dragFrom = null;
					movePost(from, n + (after ? 1 : 0));
				});
			}
			const link = document.createElement('a');
			link.href = postPageUrl(p.id);
			link.target = '_blank';
			link.rel = 'noopener';
			link.title = 'Open the post (Ctrl + click: the post page in a new tab)';
			link.addEventListener('click', e => {
				if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
				e.preventDefault();
				w.overlay.classList.add('s34-under-popup'); // steps aside until the popup closes
				openPopup(proxies[n], list);
			});
			link.appendChild(thumbOrPlaceholder(p.thumb, p.id));
			link.draggable = false;
			link.querySelectorAll('img').forEach(i => { i.draggable = false; });
			const cap = document.createElement('div');
			cap.className = 's34-tile-cap';
			cap.innerHTML = '<div class="s34-tile-title"></div><div class="s34-tile-sub"></div>';
			cap.firstChild.textContent = '#' + p.id;
			cap.lastChild.textContent = 'added ' + timeAgo(p.time);
			const acts = document.createElement('div');
			acts.className = 's34-tile-acts';
			const rm = document.createElement('button');
			rm.type = 'button';
			rm.textContent = '×';
			rm.title = 'Remove from this collection';
			rm.addEventListener('click', () => {
				const all = getCollections();
				const col = all.find(x => x.id === id);
				col.posts = col.posts.filter(x => x.id !== p.id);
				saveCollections(all);
				renderOne(id);
			});
			// (Beta 3.10) this post as the collection's cover
			const cv = document.createElement('button');
			cv.type = 'button';
			cv.className = 's34-tile-cover' + (String(c.cover) === String(p.id) ? ' s34-on' : '');
			cv.textContent = '★';
			cv.title = String(c.cover) === String(p.id) ? 'The cover – click to go back to the first four posts' : 'Use as the collection\'s cover';
			cv.addEventListener('click', () => {
				const all = getCollections();
				const col = all.find(x => x.id === id);
				if (String(col.cover) === String(p.id)) delete col.cover; else col.cover = p.id;
				saveCollections(all);
				renderOne(id);
			});
			acts.append(cv, rm);
			tile.append(link, cap, acts);
			const hit = hitOf(p);
			if (hit.length && !showBlocked && !shownNow.has(p.id)) coverBlockedTile(tile, link, hit, () => { shownNow.add(p.id); uncoverTile(tile); });
			tiles.appendChild(tile);
		});
		w.body.append(bar, note, status, tiles);
	}

	w.onClose = () => { if (downloading) downloading.stop = true; };
	if (current) renderOne(current); else renderList();
}

export { COLL_KEY, blacklistToggle, coverBlockedTile, getCollections, openCollectMenu, openCollectionsWindow, saveCollections, uncoverTile };
