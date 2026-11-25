// downloads/names – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG } from '../config.js';
import { getTags } from '../thumbs.js';

function clean(text) {
	return String(text)
		.replace(/\s+/g, '_')
		.replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
		.replace(/_+/g, '_')
		.replace(/^[._]+|[. _]+$/g, '');
}

function formatGroup(tags, fallback) {
	if (!tags.length) return fallback;
	const shown = tags.slice(0, CONFIG.maxTagsPerGroup).map(clean).filter(Boolean);
	if (tags.length > CONFIG.maxTagsPerGroup) shown.push('etc');
	const joined = shown.join(CONFIG.tagJoiner);
	return CONFIG.wrapInBrackets ? `[${joined}]` : joined;
}

function getOriginalFilename(url) {
	try {
		const name = decodeURIComponent(new URL(url).pathname.split('/').pop());
		if (name && name.includes('.')) return clean(name);
	} catch (e) {}
	return 'original_file.jpg';
}

function readPostSize(doc) {
	const li = Array.from(doc.querySelectorAll('#stats li')).find(l => /^\s*Size\s*:/i.test(l.textContent));
	const text = li ? li.textContent : ((doc.querySelector('#stats') || {}).textContent || '');
	const m = text.match(/Size:?\s*(\d+)\s*[x×]\s*(\d+)/i);
	return m ? m[1] + 'x' + m[2] : '';
}

function buildFilename(url, tagsByType, size, postId) {
	const tagsOf = type => tagsByType ? (tagsByType[type] || []) : getTags(type);
	if (CONFIG.fileNameStyle !== 'classic') return buildBracketFilename(url, tagsOf, postId);
	const sep = CONFIG.groupSeparator;
	const prefixParts = [
		formatGroup(tagsOf('character'), 'Unknown_Character'),
		formatGroup(tagsOf('copyright'), 'Unknown_Copyright'),
		formatGroup(tagsOf('artist'), 'Unknown_Artist')
	];
	const ext = ((getOriginalFilename(url).match(/\.[a-z0-9]{2,5}$/i) || ['.jpg'])[0]).toLowerCase();
	const res = clean(String(size || '').replace(/\s*[×x]\s*/i, 'x'));
	const tail = (res ? sep + res : '') + ext;

	let prefix = prefixParts.join(sep);
	const budget = CONFIG.maxFilenameLength - tail.length;
	if (prefix.length > budget) {
		prefix = prefix.slice(0, Math.max(0, budget)).replace(/[_+\[\]]+$/, '');
	}
	return (prefix || 'rule34') + tail;
}

function bracketTag(t) {
	return String(t)
		.replace(/_/g, ' ')
		.replace(/[<>:"/\\|?*\x00-\x1F,]/g, ' ')   // not allowed in file names, comma = separator
		.replace(/\[/g, '(').replace(/\]/g, ')')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/[. ]+$/, '');
}

const NAME_SKIP_SERIES = new Set([
	'blizzard entertainment', 'cd projekt red', 'riot games', 'nintendo', 'capcom', 'square enix', 'bioware',
	'ubisoft', 'naughty dog', 'sega', 'konami', 'bandai namco', 'koei tecmo', 'team ninja', 'respawn entertainment',
	'larian studios', 'activision', 'electronic arts', 'sony', 'playstation', 'xbox', 'microsoft', 'netflix',
	'disney', 'lucasfilm', 'shift up', 'sandfall interactive', 'quantic dream', 'square enix', 'warner bros', 'dc comics'
]);

function nameKey(t) {
	return String(t).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/['’`´]/g, '').replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the (?=\S)/, '');
}

function tidyNameGroup(list, type) {
	let keys = list.map(nameKey);
	let out = list.filter((t, i) => keys[i] && keys.indexOf(keys[i]) === i);   // "lara croft (survivor)" after "lara croft"
	if (type === 'copyright') {
		const series = out.filter(t => !NAME_SKIP_SERIES.has(nameKey(t)));
		if (series.length) out = series;                                      // keep a company if it's all there is
	}
	keys = out.map(nameKey);
	if (type === 'character')   // "nyl widowmaker" when "widowmaker" is there
		out = out.filter((t, i) => !keys.some((o, j) => j !== i && keys[i].endsWith(' ' + o)));
	if (type === 'copyright')   // "call of duty warzone" when "call of duty" is there
		out = out.filter((t, i) => !keys.some((o, j) => j !== i && keys[i].startsWith(o + ' ')));
	return out;
}

function buildBracketFilename(url, tagsOf, postId) {
	const ext = ((getOriginalFilename(url).match(/\.[a-z0-9]{2,5}$/i) || ['.jpg'])[0]).toLowerCase();
	const idPart = CONFIG.fileNamePostId && /^\d+$/.test(String(postId || '')) ? ' #' + postId : '';
	const groups = ['character', 'copyright', 'artist'].map(type =>
															tidyNameGroup(Array.from(new Set(tagsOf(type).map(bracketTag).filter(Boolean))), type).slice(0, CONFIG.maxTagsPerGroup));
	const make = () => {
		let last = groups.length;
		while (last > 0 && !groups[last - 1].length) last--;
		return groups.slice(0, last).map(g => '[' + g.join(', ') + ']').join(' ');
	};
	let name = make();
	// Too long: drop tags from the end of the biggest group (never cut a name in half)
	while (name.length + idPart.length + ext.length > CONFIG.maxFilenameLength) {
		const big = groups.reduce((a, b) => (b.length > a.length ? b : a));
		if (big.length > 1) big.pop();
		else { name = name.slice(0, CONFIG.maxFilenameLength - idPart.length - ext.length); break; }
		name = make();
	}
	return (name || 'rule34') + idPart + ext;
}

function saveBlob(blob, filename) {
	const blobUrl = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = blobUrl;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

export { buildFilename, readPostSize, saveBlob };
