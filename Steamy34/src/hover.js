// hover – Steamy34 (aus Steamy34.js aufgeteilt)
import { apiPostMedia, hasApiKey } from './api.js';
import { CONFIG, NO_HOVER } from './config.js';
import { bumpPage, fetchPostDoc } from './pages.js';
import { isVideoThumb, thumbTags } from './thumbs.js';

const mediaCache = new Map();

const postDocCache = new Map();

const POST_DOC_KEEP = 60, MEDIA_KEEP = 1500;

function cacheSet(map, key, value, keep) {
	map.delete(key);
	map.set(key, value);
	while (map.size > keep) map.delete(map.keys().next().value); // (the oldest first)
}

function getPostMedia(postUrl, kind = 'popup', opts) {
	if (mediaCache.has(postUrl)) bumpPage(postUrl, kind, opts && opts.wanted);
	if (!mediaCache.has(postUrl)) {
		// With an API key (20h): hover previews ask the API for the file
		// first - much less than the whole post page. (Not batch downloads:
		// they need the post page anyway, for the tags in the file name.)
		const viaApi = kind === 'hover' && hasApiKey()
		? apiPostMedia(postUrl).then(m => { if (m) { if (m.video) rememberMediaHost('video', m.video); if (m.image) rememberMediaHost('image', m.image); } return m; })
		: Promise.resolve(null);
		const p = viaApi.then(m => m || fetchPostDoc(postUrl, kind, opts)
							  .then(doc => {
			if (!doc) throw new Error('post page not available');
			const abs = u => u ? new URL(u, location.href).href : null;

			const source = doc.querySelector('#gelcomVideoPlayer source, video source, video[src]');
			let video = source && (source.getAttribute('src') || '');

			const orig = Array.from(doc.querySelectorAll('a'))
			.find(a => /original\s*image/i.test(a.textContent));
			const origHref = orig && orig.getAttribute('href');

			let image = null;
			if (origHref && /\.(mp4|webm)(\?|$)/i.test(origHref)) {
				if (!video) video = origHref;
			} else if (origHref) {
				image = origHref;
			} else {
				const main = doc.querySelector('#image');
				image = main && main.getAttribute('src');
			}
			const result = { video: abs(video), image: abs(image) };
			if (result.video) rememberMediaHost('video', result.video);
			if (result.image) rememberMediaHost('image', result.image);
			return result;
		})
							  .catch(err => {
			console.warn('[Steamy34] Could not read post', postUrl, err);
			mediaCache.delete(postUrl); // allow a retry later
			return null;
		})); // (the API's answer, or else the page's)
		cacheSet(mediaCache, postUrl, p, MEDIA_KEEP);
	}
	return mediaCache.get(postUrl);
}

const MEDIA_HOSTS_KEY = 'steamy34_mediahosts';

const DEFAULT_MEDIA_HOSTS = {
	video: ['https://aws-mp4.rule34.xxx', 'https://wimg.rule34.xxx', 'https://api-cdn-mp4.rule34.xxx'],
	image: ['https://wimg.rule34.xxx', 'https://api-cdn.rule34.xxx']
};

const mediaHosts = (() => {
	try { return GM_getValue(MEDIA_HOSTS_KEY, null) || {}; } catch (e) { return {}; }
})();

function hostsFor(kind) {
	return [...new Set([...(mediaHosts[kind] || []), ...DEFAULT_MEDIA_HOSTS[kind]])];
}

function rememberMediaHost(kind, url) {
	try {
		const origin = new URL(url).origin;
		const list = mediaHosts[kind] || [];
		if (list[0] === origin) return;
		mediaHosts[kind] = [origin, ...list.filter(h => h !== origin)].slice(0, 4);
		GM_setValue(MEDIA_HOSTS_KEY, mediaHosts);
	} catch (e) {}
}

function mediaCandidates(img, isVideo) {
	const src = img.getAttribute('src') || img.dataset.s34Src || '';
	const m = src.match(/\/thumbnails\/+([^/]+)\/+thumbnail_([^./?]+)\./i);
	if (!m) return [];
	const [, dir, hash] = m;
	const isGif = /\s(animated|gif|animated_gif)\s/.test(thumbTags(img));
	const exts = isVideo ? ['mp4', 'webm']
	: isGif   ? ['gif', 'jpeg', 'jpg', 'png']
	: ['jpeg', 'jpg', 'png', 'gif'];
	const out = [];
	hostsFor(isVideo ? 'video' : 'image').forEach(host =>
												  exts.forEach(ext => out.push(`${host}/images/${dir}/${hash}.${ext}`)));
	return out;
}

function setupHoverPreview(thumbs) {
	if (NO_HOVER) return; // touch screens: a tap opens the post instead
	(thumbs || document.querySelectorAll('.image-list span.thumb')).forEach(thumb => {
		if (thumb.dataset.s34Hover) return;
		const img = thumb.querySelector('img');
		const link = thumb.querySelector('a[href]');
		if (!img || !link) return;

		const isVideo = isVideoThumb(img);
		if (isVideo && !CONFIG.hoverPreview) return;
		if (!isVideo && !CONFIG.hoverHighRes) return;
		thumb.dataset.s34Hover = '1';

		let timer = null;
		let overlay = null;
		let hovering = false;
		let hoverId = 0;

		function stop() {
			hovering = false;
			clearTimeout(timer);
			thumb.classList.remove('s34-loading');
			if (overlay) {
				if (overlay.tagName === 'VIDEO') {
					overlay.pause();
					overlay.removeAttribute('src');
					overlay.load(); // abort the download
				} else {
					overlay.removeAttribute('src'); // cancel a half-loaded image
				}
				overlay.remove();
				overlay = null;
			}
		}

		thumb.addEventListener('mouseenter', () => {
			hovering = true;
			const myId = ++hoverId;
			timer = setTimeout(() => {
				if (!hovering || myId !== hoverId || overlay) return;
				if (thumb.classList.contains('s34-bl-marked') && !thumb.classList.contains('s34-bl-unblur')) return; // blacklisted: no preview
				thumb.classList.add('s34-loading');

				// 1st choice: build the file address straight from the
				// thumbnail (no post page needed, so Cloudflare checks on
				// the site don't matter). 2nd choice: read the post page.
				const candidates = mediaCandidates(img, isVideo);
				let next = 0;
				let triedPostPage = false;

				const el = overlay = isVideo ? document.createElement('video') : new Image();
				el.className = 's34-hover-video';
				if (isVideo) {
					el.muted = CONFIG.hoverMuted;
					el.loop = true;
					el.playsInline = true;
					el.preload = 'auto';
					el.autoplay = true;
				} else {
					el.decoding = 'async';
				}

				function play() {
					el.play().catch(err => {
						// Sound blocked -> fall back to muted
						if (overlay === el && err.name === 'NotAllowedError' && !el.muted) {
							el.muted = true;
							el.play().catch(() => {});
						}
					});
				}

				async function tryNext() {
					if (overlay !== el) return; // mouse already left
					if (next < candidates.length) {
						el.src = candidates[next++];
						if (isVideo) play();
						return;
					}
					if (triedPostPage) { thumb.classList.remove('s34-loading'); return; }
					triedPostPage = true;
					const media = await getPostMedia(link.href, 'hover', { wanted: () => overlay === el });
					const url = media && (isVideo ? media.video : media.image);
					if (overlay !== el) return;
					if (url) {
						el.src = url;
						if (isVideo) play();
					} else {
						thumb.classList.remove('s34-loading');
					}
				}

				const reveal = () => {
					if (overlay !== el || el.classList.contains('s34-playing')) return;
					thumb.classList.remove('s34-loading');
					el.classList.add('s34-playing');
					rememberMediaHost(isVideo ? 'video' : 'image', el.currentSrc || el.src);
				};
				if (!isVideo) el.addEventListener('load', reveal);
				else {
					// Videos (Beta 3.6): start a bit into the clip - many open
					// on a dark intro or fade-in - and only show the video once a
					// real frame is drawn (before, it showed on "playing", and a
					// not yet drawn frame looked like a black box)
					el.addEventListener('loadedmetadata', () => {
						const d = el.duration;
						if (isFinite(d) && d > 4) { try { el.currentTime = Math.min(d * 0.15, 8); } catch (e) {} }
					}, { once: true });
					el.addEventListener('playing', () => {
						if (typeof el.requestVideoFrameCallback === 'function') el.requestVideoFrameCallback(() => reveal());
						el.addEventListener('timeupdate', reveal, { once: true }); // (whichever comes first)
					});
				}
				el.addEventListener('error', tryNext); // wrong guess -> next one

				thumb.appendChild(el);
				tryNext();
			}, isVideo ? CONFIG.hoverVideoDelay : CONFIG.hoverDelay); // videos wait a bit longer (they're big)
		});

		thumb.addEventListener('mouseleave', stop);
	});
}

export { POST_DOC_KEEP, cacheSet, getPostMedia, mediaCandidates, postDocCache, rememberMediaHost, setupHoverPreview };
