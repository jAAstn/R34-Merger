// thumbs – Steamy34 (aus Steamy34.js aufgeteilt)
import { unescapeHtml } from './blacklist.js';

const pageThumbs = () => document.querySelectorAll('.image-list span.thumb');

function setThumbRatios(thumbs) {
	(thumbs || pageThumbs()).forEach(thumb => {
		if (thumb.dataset.s34Ratio) return;
		const img = thumb.querySelector('img');
		if (!img) return;
		thumb.dataset.s34Ratio = '1';

		const apply = () => {
			const w = img.naturalWidth || parseInt(img.getAttribute('width'), 10);
			const h = img.naturalHeight || parseInt(img.getAttribute('height'), 10);
			if (w && h) {
				// Clamp extreme panoramas / tall strips so rows stay sane
				const r = Math.min(Math.max(w / h, 0.4), 3);
				thumb.style.setProperty('--r', r.toFixed(4));
			}
		};

		if (img.complete && img.naturalWidth) apply();
		else img.addEventListener('load', apply, { once: true });
	});
}

function thumbTags(img) {
	const text = img.dataset.s34Tags || img.title || img.alt || '';
	// (Beta 3.8) rule34 writes ' as &#039; - "five_nights_at_freddy&#039;s"
	// never matched the blacklisted "five_nights_at_freddy's"
	return ' ' + unescapeHtml(text.toLowerCase()).replace(/\s+/g, ' ') + ' ';
}

function removeTagTooltips(thumbs) {
	(thumbs || document.querySelectorAll('.image-list span.thumb, .thumb')).forEach(thumb => {
		thumb.querySelectorAll('[title]').forEach(el => {
			if (!el.dataset.s34Tags) el.dataset.s34Tags = el.getAttribute('title');
			el.removeAttribute('title');
		});
	});
	const main = document.querySelector('#image[title]');
	if (main) main.removeAttribute('title');
}

function isVideoThumb(img) {
	// the site marks video thumbnails with "webm-thumb" – also catches videos without a video tag
	return img.classList.contains('webm-thumb') || /\s(video|webm|mp4|animated_video)\s/.test(thumbTags(img));
}

function addThumbBadges(thumbs) {
	(thumbs || pageThumbs()).forEach(thumb => {
		if (thumb.querySelector('.s34-badge')) return;
		const img = thumb.querySelector('img');
		if (!img) return;

		const tags = thumbTags(img);
		let label = '';
		let cls = '';
		if (isVideoThumb(img)) { label = '▶ VID'; cls = 's34-video'; }
		else if (/\s(animated|gif|animated_gif)\s/.test(tags)) { label = 'GIF'; cls = 's34-gif'; }
		if (!label) return;

		const badge = document.createElement('span');
		badge.className = 's34-badge ' + cls;
		badge.textContent = label;
		thumb.appendChild(badge);
	});
}

function getTagFromRow(row) {
	let tag = '';

	// 1. Wiki link ("?") contains the real tag name
	const wikiLink = row.querySelector('a[href*="page=wiki"][href*="search="]');
	if (wikiLink) {
		try { tag = new URL(wikiLink.href).searchParams.get('search') || ''; } catch (e) {}
	}

	// 2. Post-search link
	if (!tag) {
		const tagLink = row.querySelector('a[href*="tags="]');
		if (tagLink) {
			try {
				tag = (new URL(tagLink.href).searchParams.get('tags') || '')
					.trim().split(/\s+/)[0];
			} catch (e) {}
		}
	}

	// 3. Visible text, excluding the ? + - controls
	if (!tag) {
		const link = Array.from(row.querySelectorAll('a')).find(a => {
			const t = a.textContent.trim();
			return t && !['?', '+', '-'].includes(t);
		});
		if (link) tag = link.textContent.trim().replace(/\s+/g, '_');
	}

	return unescapeHtml(tag.trim()); // (Beta 3.8: rule34 writes ' as &#039;)
}

function getTags(type) {
	const result = [];
	document.querySelectorAll(`#tag-sidebar li.tag-type-${type}`).forEach(row => {
		const tag = getTagFromRow(row);
		if (tag && !result.includes(tag)) result.push(tag);
	});
	return result;
}

const LONG_STRIP_RATIO = 2.5;

const isLongStrip = (w, h) => !!w && h / w >= LONG_STRIP_RATIO;

function getOriginalUrl() {
	const link = Array.from(document.querySelectorAll('a'))
	.find(a => /original\s*image/i.test(a.textContent));
	if (link && link.href) return link.href;

	const video = document.querySelector('#gelcomVideoPlayer source, video source');
	if (video && video.src) return video.src;

	return null;
}

export { addThumbBadges, getOriginalUrl, getTagFromRow, getTags, isLongStrip, isVideoThumb, pageThumbs, removeTagTooltips, setThumbRatios, thumbTags };
