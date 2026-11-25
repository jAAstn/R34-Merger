// downloads/download – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG, params, saveSettingsNow } from '../config.js';
import { folderAllowed, folderAskShown, getFolderHandle, setFolderAskShown, writeToFolder } from './folder.js';
import { buildFilename, readPostSize, saveBlob } from './names.js';
import { isDownloaded, rememberDownload } from './state.js';
import { popupState } from '../popup.js';
import { showToast } from '../tag-bar.js';
import { getOriginalUrl, getTags } from '../thumbs.js';
import { popupThumbSrc } from '../window-shell.js';

const DL_TIMEOUT_MS = 2 * 60000;

const DL_BIG_TIMEOUT_MS = 10 * 60000;

async function saveUrlAs(url, filename, referer, opts = {}) {
	const video = /\.(mp4|webm|mkv|mov)(\?|$)/i.test(url);
	const timeout = video ? DL_BIG_TIMEOUT_MS : DL_TIMEOUT_MS;
	const folder = await getFolderHandle().catch(() => null);
	if (folder) {
		// Ask now, while the key press still counts
		if (await folderAllowed(folder, true)) {
			const blob = await fetchBlob(url, referer, timeout);
			if (!blob) return false;
			try {
				let dir = folder;
				if (CONFIG.dlArtistFolders) {
					const sub = String(opts.artist || 'unknown artist').replace(/_/g, ' ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'unknown artist';
					dir = await folder.getDirectoryHandle(sub, { create: true });
				}
				const name = await writeToFolder(dir, filename, blob);
				console.log('[Steamy34] Saved into folder "' + folder.name + '":', name);
				return true;
			} catch (e) {
				console.error('[Steamy34] Writing into the folder failed:', e);
				showToast('Couldn\'t write into the folder "' + folder.name + '" (' + (e && e.message || e) + ') – saved to Downloads instead.');
				try { saveBlob(blob, filename); return true; } catch (e2) { return false; }
			}
		}
		if (!folderAskShown) {
			setFolderAskShown(true);
			showToast('Steamy34 may not write into "' + folder.name + '" yet – this one went to Downloads.', 'Allow folder', () => {
				folderAllowed(folder, true).then(ok => showToast(ok ? 'Folder allowed – the next downloads go into "' + folder.name + '".' : 'Not allowed – downloads keep going to Downloads.'));
			}, 15000);
		}
	}
	return saveViaBlob(url, filename, referer, timeout).then(ok => {
		if (ok || typeof GM_download !== 'function') return ok;
		console.log('[Steamy34] Trying Tampermonkey\'s downloader instead…');
		return saveViaDownloader(url, filename, referer);
	});
}

function saveViaDownloader(url, filename, referer) {
	return new Promise(resolve => {
		let done = false;
		let task = null;
		const finish = (ok, why) => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			if (!ok) console.error('[Steamy34] Tampermonkey\'s downloader failed (' + why + '):', filename, url);
			resolve(ok);
		};
		const timer = setTimeout(() => {
			try { if (task && task.abort) task.abort(); } catch (e) {}
			finish(false, 'took too long');
		}, DL_BIG_TIMEOUT_MS);
		try {
			const opts = {
				url,
				name: filename,
				saveAs: false,
				onload: () => finish(true),
				onerror: e => {
					const err = e && e.error ? String(e.error) : '';
					const det = e && e.details ? (typeof e.details === 'string' ? e.details : JSON.stringify(e.details)) : '';
					finish(false, [err, det].filter(Boolean).join(': ') || 'error');
				},
				ontimeout: () => finish(false, 'timeout'),
				headers: { Referer: referer || location.href }
			};
			task = GM_download(opts);
		} catch (e) {
			finish(false, 'not available: ' + e.message);
		}
	});
}

function fetchBlob(url, referer, timeout) {
	return new Promise(resolve => {
		GM_xmlhttpRequest({
			method: 'GET',
			url,
			responseType: 'blob',
			headers: { Referer: referer || location.href },
			timeout: timeout || DL_TIMEOUT_MS,
			onload: res => {
				if (res.status < 200 || res.status >= 300 || !res.response) {
					console.error('[Steamy34] Download failed: HTTP ' + res.status, url);
					resolve(null);
					return;
				}
				resolve(res.response);
			},
			onerror: () => { console.error('[Steamy34] Download failed: no answer', url); resolve(null); },
			ontimeout: () => { console.error('[Steamy34] Download failed: took too long', url); resolve(null); }
		});
	});
}

function saveViaBlob(url, filename, referer, timeout) {
	return fetchBlob(url, referer, timeout).then(blob => {
		if (!blob) return false;
		try {
			saveBlob(blob, filename);
			return true;
		} catch (e) {
			console.error('[Steamy34] Saving the file failed:', e);
			return false;
		}
	});
}

function confirmRedownload() {
	return new Promise(resolve => {
		const overlay = document.createElement('div');
		overlay.className = 's34-overlay s34-confirm-overlay';
		overlay.innerHTML = `
                <div class="s34-confirm" role="dialog" aria-modal="true">
                    <div class="s34-confirm-icon">⬇</div>
                    <div class="s34-confirm-title">Already downloaded</div>
                    <div class="s34-confirm-text">You already downloaded this post. Are you sure you want to download it again?</div>
                    <label class="s34-confirm-check"><input type="checkbox"> Don't show this again</label>
                    <div class="s34-confirm-foot">
                        <button type="button" class="s34-btn" data-act="no">Cancel</button>
                        <button type="button" class="s34-btn s34-primary" data-act="yes">Download again</button>
                    </div>
                </div>`;
		const check = overlay.querySelector('input[type="checkbox"]');

		let done = false;
		function finish(ok) {
			if (done) return;
			done = true;
			document.removeEventListener('keydown', onKey, true);
			overlay.remove();
			if (check.checked) {
				saveSettingsNow({ confirmRedownload: false });
				showToast('Won\'t ask again – turn it back on in Settings → Download.');
			}
			resolve(ok);
		}
		function onKey(e) {
			if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
			else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(true); }
			else if (e.code === CONFIG.downloadKey) { e.preventDefault(); e.stopPropagation(); } // no double trigger
		}
		overlay.addEventListener('click', e => {
			const act = e.target.closest('[data-act]');
			if (act) finish(act.dataset.act === 'yes');
			else if (e.target === overlay) finish(false);
		});
		document.addEventListener('keydown', onKey, true);
		document.body.appendChild(overlay);
		overlay.querySelector('[data-act="yes"]').focus();
	});
}

async function downloadOriginal(givenUrl, tagsByType, postId, confirmed, size, thumbSrc) {
	if (typeof givenUrl !== 'string') givenUrl = null; // called as a click handler
	const url = givenUrl || getOriginalUrl();
	if (!url) {
		showToast('Couldn\'t find the original file on this page – try again once it has loaded.', null, null, 8000);
		return;
	}

	const id = givenUrl ? postId : params.get('id');
	if (!confirmed && CONFIG.confirmRedownload && CONFIG.trackDownloads && isDownloaded(id)) {
		if (document.querySelector('.s34-confirm-overlay')) return; // already asking
		if (!(await confirmRedownload())) return;
	}
	if (!givenUrl) size = readPostSize(document); // post page: from its own info list
	const filename = buildFilename(url, givenUrl ? tagsByType : undefined, size, id);
	// Tags of the download (for Stats)
	const historyInfo = {
		tags: givenUrl ? (tagsByType || {}) : {
			artist: getTags('artist'), character: getTags('character'), copyright: getTags('copyright')
		},
		thumb: thumbSrc != null ? thumbSrc : givenUrl ? popupThumbSrc(popupState) : ((document.querySelector('#image') || {}).src || '')
	};
	showToast('Downloading ' + filename.slice(0, 80) + (filename.length > 80 ? '…' : ''));
	console.log('[Steamy34] Downloading:', url, '→', filename);

	// Same saving as batch downloads: time limit, big files via the downloader
	const ok = await saveUrlAs(url, filename, location.href, { artist: ((historyInfo.tags || {}).artist || [])[0] });
	if (ok) {
		rememberDownload(id, historyInfo);
		console.log('[Steamy34] Download complete:', filename);
	} else {
		showToast('Download failed – the server didn\'t answer in time or refused it. Try again in a moment.',
				  'Retry', () => downloadOriginal(url, historyInfo.tags, id, true, size, historyInfo.thumb), 12000);
	}
}

function keyLabel(code) {
	return String(code || '').replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
}

export { confirmRedownload, downloadOriginal, keyLabel, saveUrlAs };
