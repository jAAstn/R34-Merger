// autocomplete – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG } from './config.js';

function findAutocompleteEndpoints() {
	const found = [];
	for (const s of document.scripts) {
		const text = (s.src || '') + ' ' + (s.textContent || '');
		const m = text.match(/((?:https?:)?\/\/[^"'\s]*autocomplete\.php[^"'\s]*)/i);
		if (m) found.push(m[1]);
	}
	found.push('https://ac.rule34.xxx/autocomplete.php', 'https://api.rule34.xxx/autocomplete.php');
	return [...new Set(found.map(u => {
		let base = u.startsWith('//') ? 'https:' + u : u;
		base = base.replace(/([?&])q=[^&]*/, '$1').replace(/[?&]+$/, '');
		return base;
	}))];
}

let acEndpoints = null;

let acWorking = null;

function acUrl(base, term) {
	return base + (base.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(term);
}

function gmGet(url) {
	return new Promise((resolve, reject) => {
		GM_xmlhttpRequest({
			method: 'GET',
			url,
			headers: { Referer: location.href },
			onload: r => (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject(r.status),
			onerror: reject,
			ontimeout: reject,
			timeout: 8000
		});
	});
}

function parseSuggestions(text) {
	const data = JSON.parse(text);
	const list = Array.isArray(data) ? data : (data.tags || data.results || []);
	return list.map(item => {
		if (typeof item === 'string') return { value: item, label: item, type: '' };
		const value = item.value || item.name || item.tag || '';
		return {
			value,
			label: item.label || (item.count != null ? `${value} (${item.count})` : value),
			type: String(item.type || item.category || '').toLowerCase()
		};
	}).filter(s => s.value);
}

async function acQuery(term) {
	if (!acEndpoints) acEndpoints = findAutocompleteEndpoints();
	const order = acWorking ? [acWorking] : acEndpoints;
	for (const base of order) {
		try {
			const list = parseSuggestions(await gmGet(acUrl(base, term)));
			if (!acWorking) {
				acWorking = base;
				console.log('[Steamy34] Using suggestions from', base);
			}
			return list;
		} catch (e) {
			if (acWorking) break;
		}
	}
	throw new Error('no tag-suggestion server answered');
}

async function fetchSuggestions(term) {
	try {
		return await acQuery(term);
	} catch (e) {
		console.warn('[Steamy34] No tag-suggestion endpoint answered.', acEndpoints);
		return [];
	}
}

function attachSuggestions(ta) {
	const wrap = document.createElement('div');
	wrap.className = 's34-ac-wrap';
	// (the textarea is moved into the wrapper once it's in the page - see below)
	const list = document.createElement('ul');
	list.className = 's34-ac-list';

	let items = [];
	let active = -1;
	let debounce = null;
	let reqId = 0;

	// Current word under the cursor, plus a leading - or ~ prefix
	function currentToken() {
		const v = ta.value;
		const pos = ta.selectionStart;
		const start = v.slice(0, pos).search(/\S*$/);
		const endMatch = v.slice(pos).match(/^\S*/);
		const end = pos + (endMatch ? endMatch[0].length : 0);
		const raw = v.slice(start, end);
		const prefix = (raw.match(/^[-~]+/) || [''])[0];
		return { start, end, prefix, term: raw.slice(prefix.length) };
	}

	function close() {
		list.style.display = 'none';
		list.innerHTML = '';
		items = [];
		active = -1;
		ta.dataset.acOpen = '0';
	}

	function highlight(i) {
		active = i;
		Array.from(list.children).forEach((li, n) => li.classList.toggle('s34-ac-active', n === i));
		if (list.children[i]) list.children[i].scrollIntoView({ block: 'nearest' });
	}

	function pick(i) {
		const s = items[i];
		if (!s) return;
		const t = currentToken();
		const before = ta.value.slice(0, t.start);
		const after = ta.value.slice(t.end).replace(/^\s*/, '');
		const insert = t.prefix + s.value + ' ';
		ta.value = before + insert + after;
		const caret = before.length + insert.length;
		ta.setSelectionRange(caret, caret);
		close();
		ta.dispatchEvent(new Event('input')); // regrow
		ta.focus();
	}

	function render(suggestions) {
		items = suggestions.slice(0, CONFIG.suggestionCount);
		list.innerHTML = '';
		if (!items.length) { close(); return; }
		items.forEach((s, i) => {
			const li = document.createElement('li');
			li.textContent = s.label;
			li.title = s.value;
			if (s.type) li.classList.add('s34-ac-' + s.type.replace(/[^a-z]/g, ''));
			li.addEventListener('mousedown', e => { e.preventDefault(); pick(i); });
			li.addEventListener('mouseenter', () => highlight(i));
			list.appendChild(li);
		});
		list.style.display = 'block';
		ta.dataset.acOpen = '1';
		highlight(0);
	}

	function update() {
		clearTimeout(debounce);
		const { term } = currentToken();
		if (!term) { close(); return; }
		const myId = ++reqId;
		debounce = setTimeout(async () => {
			const res = await fetchSuggestions(term);
			if (myId !== reqId || document.activeElement !== ta) return;
			render(res);
		}, 150);
	}

	ta.addEventListener('input', update);
	ta.addEventListener('click', update);
	ta.addEventListener('blur', () => setTimeout(close, 100));

	ta.addEventListener('keydown', e => {
		if (ta.dataset.acOpen !== '1') return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlight((active + 1) % items.length);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlight((active - 1 + items.length) % items.length);
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			if (active >= 0) {
				e.preventDefault();
				pick(active);
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	});

	// Finish wiring once the textarea is in place
	queueMicrotask(() => {
		if (ta.parentNode && ta.parentNode !== wrap) {
			ta.parentNode.insertBefore(wrap, ta);
			wrap.appendChild(ta);
			wrap.appendChild(list);
		}
	});
	close();
}

export { acQuery, attachSuggestions };
