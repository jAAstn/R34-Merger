// quick-panel – Steamy34 (aus Steamy34.js aufgeteilt)
import { selectMode, setSelectMode } from './batch.js';
import { addSfwSwitch } from './censored-mode.js';
import { CONFIG, isPostView, params, saveSettingsNow, thumbSizeKeys } from './config.js';
import { thumbPostId } from './downloads/state.js';

function normalizeQuery(q) {
	return String(q || '').toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ');
}

function pageMaxPostId(root = document) {
	let max = 0;
	root.querySelectorAll('span.thumb').forEach(t => {
		const n = parseInt(thumbPostId(t), 10);
		if (n > max) max = n;
	});
	return max;
}

function onFirstResultsPage() {
	return !isPostView && !(parseInt(params.get('pid') || '0', 10) > 0);
}

function applyHideClasses() {
	document.documentElement.classList.toggle('s34-hide-viewed', !!CONFIG.hideViewed);
	document.documentElement.classList.toggle('s34-hide-downloaded', !!CONFIG.hideDownloaded);
	window.dispatchEvent(new CustomEvent('s34-layout-changed')); // infinite scroll may need more
}

function setupQuickPanel() {
	if (isPostView || !document.querySelector('.image-list')) return;
	if (document.querySelector('.s34-quick')) return;

	const panel = document.createElement('div');
	panel.className = 's34-quick';
	const justified = CONFIG.thumbLayout === 'justified';
	const sizeKey = thumbSizeKeys()[justified ? 0 : 1]; // (phones: their own size)
	const sizeVar = justified ? '--s34-row' : '--s34-tile';
	// (The White / Dark / OLED picker lived here until Beta 3.3 - it's in
	// Settings → Look and the welcome tour now: you set it once.)
	panel.innerHTML = `
            <div class="s34-q-head">View</div>
            <label class="s34-q-switch"><input type="checkbox" data-k="hideViewed"><span class="s34-q-track"></span>Hide viewed</label>
            <label class="s34-q-switch"><input type="checkbox" data-k="hideDownloaded"><span class="s34-q-track"></span>Hide downloaded</label>
            <label class="s34-q-size" title="Thumbnail size">
                <span>Size</span>
                <input type="range" min="100" max="500" step="10">
            </label>
            <button type="button" class="s34-q-select" title="Pick posts, then download them all at once">⬇ Batch download</button>`;

	panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
		const k = cb.dataset.k;
		cb.checked = !!CONFIG[k];
		cb.addEventListener('change', () => {
			saveSettingsNow({ [k]: cb.checked });
			applyHideClasses();
		});
	});
	if (!CONFIG.trackViewed) panel.querySelector('[data-k="hideViewed"]').closest('label').remove();
	if (!CONFIG.trackDownloads) panel.querySelector('[data-k="hideDownloaded"]').closest('label').remove();

	const range = panel.querySelector('input[type="range"]');
	range.value = CONFIG[sizeKey];
	let saveTimer = null;
	range.addEventListener('input', () => {
		document.documentElement.style.setProperty(sizeVar, range.value + 'px');
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveSettingsNow({ [sizeKey]: parseInt(range.value, 10) }), 400);
	});

	panel.querySelector('.s34-q-select').addEventListener('click', () => setSelectMode(!selectMode));

	// Under the search, above the settings button
	const gear = document.querySelector('.s34-gear.s34-inline');
	const form = (document.querySelector('textarea.s34-search') || {}).form;
	if (gear) gear.before(panel);
	else if (form) form.after(panel);
	else {
		const sidebar = document.querySelector('.sidebar, #sidebar');
		if (sidebar) sidebar.appendChild(panel); else return;
	}
	adoptAiFilter(panel);
	addSfwSwitch(panel); // "Blur pictures" (screenshot mode, 20d)
}

function findAiFilterBox() {
	const sidebar = document.querySelector('.sidebar, #sidebar') || document.body;
	const walker = document.createTreeWalker(sidebar, NodeFilter.SHOW_TEXT, {
		acceptNode: n => /filter\s+ai/i.test(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
	});
	const textNode = walker.nextNode();
	if (!textNode) return null;
	// Climb a few levels until the box holds the checkbox too
	let box = textNode.parentElement;
	for (let i = 0; i < 4 && box && !box.querySelector('input[type="checkbox"]'); i++) box = box.parentElement;
	const input = box && box.querySelector('input[type="checkbox"]');
	if (!input || box.contains(panelOrNull()) || box.querySelector('.s34-sb, #tag-sidebar, .image-list')) return null;
	return { box, input };
}

const panelOrNull = () => document.querySelector('.s34-quick');

function adoptAiFilter(panel) {
	const found = findAiFilterBox();
	if (!found) return;
	const { box, input } = found;
	const row = document.createElement('label');
	row.className = 's34-q-switch s34-q-ai';
	row.title = 'The site\'s own AI filter: hides posts tagged as AI-generated';
	row.innerHTML = '<input type="checkbox"><span class="s34-q-track"></span>Filter AI posts';
	const mine = row.querySelector('input');
	const sync = () => { mine.checked = input.checked; };
	sync();
	mine.addEventListener('change', () => {
		if (input.checked !== mine.checked) input.click(); // the site does the rest
		setTimeout(sync, 50);
	});
	input.addEventListener('change', sync);
	// Hide the list around it too when the switch is all it holds
	// (the site's <ul id="displayOptions"><li> would leave an empty bullet)
	let hide = box;
	while (hide.parentElement && hide.parentElement.children.length === 1 && /^(LI|UL|OL)$/.test(hide.parentElement.tagName)) hide = hide.parentElement;
	hide.classList.add('s34-ai-original');
	const head = panel.querySelector('.s34-q-head');
	if (head) head.after(row); else panel.prepend(row);
}

export { applyHideClasses, normalizeQuery, onFirstResultsPage, pageMaxPostId, setupQuickPanel };
