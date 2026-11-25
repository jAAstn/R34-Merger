// downloads/folder – Steamy34 (aus Steamy34.js aufgeteilt)
import { isPhoneLayout } from '../config.js';
import { showToast } from '../tag-bar.js';

const FOLDER_NAME_KEY = 'steamy34_dlfolder';

let folderHandle;

function folderPickerAvailable() {
	return typeof window.showDirectoryPicker === 'function' && !isPhoneLayout();
}

function folderDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open('steamy34', 1);
		req.onupgradeneeded = () => req.result.createObjectStore('handles');
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function folderDbDo(mode, fn) {
	const db = await folderDb();
	return new Promise((resolve, reject) => {
		const req = fn(db.transaction('handles', mode).objectStore('handles'));
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function getFolderHandle() {
	if (!folderPickerAvailable() || !GM_getValue(FOLDER_NAME_KEY, '')) return null;
	if (folderHandle === undefined) {
		try { folderHandle = (await folderDbDo('readonly', s => s.get('dlFolder'))) || null; } catch (e) { folderHandle = null; }
	}
	return folderHandle;
}

async function chooseDownloadFolder() {
	const h = await window.showDirectoryPicker({ id: 'steamy34-downloads', mode: 'readwrite' });
	await folderDbDo('readwrite', s => s.put(h, 'dlFolder'));
	folderHandle = h;
	GM_setValue(FOLDER_NAME_KEY, h.name);
	return h.name;
}

function clearDownloadFolder() {
	folderHandle = null;
	try { GM_deleteValue(FOLDER_NAME_KEY); } catch (e) {}
	folderDbDo('readwrite', s => s.delete('dlFolder')).catch(() => {});
}

async function folderAllowed(h, ask) {
	const opts = { mode: 'readwrite' };
	let state = 'denied';
	try { state = await h.queryPermission(opts); } catch (e) {}
	if (state === 'prompt' && ask) {
		try { state = await h.requestPermission(opts); } catch (e) {}
	}
	return state === 'granted';
}

async function writeToFolder(h, filename, blob) {
	const dot = filename.lastIndexOf('.');
	const base = dot > 0 ? filename.slice(0, dot) : filename;
	const ext = dot > 0 ? filename.slice(dot) : '';
	let name = filename;
	for (let i = 1; i < 500; i++) {
		try {
			await h.getFileHandle(name);              // exists -> try the next number
		} catch (e) {
			if (e && e.name === 'NotFoundError') break;
			if (!e || e.name !== 'TypeMismatchError') throw e;   // a folder with that name: next number
		}
		name = base + ' (' + i + ')' + ext;
	}
	const file = await h.getFileHandle(name, { create: true });
	const out = await file.createWritable();
	await out.write(blob);
	await out.close();
	return name;
}

function buildFolderControl(ctl, id) {
	ctl.textContent = '';
	if (!folderPickerAvailable()) {
		const note = document.createElement('small');
		note.className = 's34-folder-note';
		note.textContent = isPhoneLayout() ? 'Not on phones – downloads go to Downloads.'
		: navigator.brave ? 'Brave: turn on brave://flags/#file-system-access-api, restart Brave and reload this page.'
		: 'Not available in this browser (works in Chrome, Edge and Brave) – downloads go to Downloads.';
		ctl.appendChild(note);
		return;
	}
	const name = GM_getValue(FOLDER_NAME_KEY, '');
	const label = document.createElement('span');
	label.className = 's34-folder-name';
	label.textContent = name ? '📁 ' + name : 'Downloads (normal)';
	label.title = name ? 'Downloads are written into this folder' : 'No own folder – files go to your browser\'s download folder';
	const pick = document.createElement('button');
	pick.type = 'button';
	pick.id = id;
	pick.className = 's34-set-btn';
	pick.textContent = name ? 'Change…' : 'Choose folder…';
	pick.addEventListener('click', () => {
		chooseDownloadFolder()
			.then(n => { showToast('Downloads now go into "' + n + '".'); buildFolderControl(ctl, id); })
			.catch(e => { if (!e || e.name !== 'AbortError') showToast('Couldn\'t use that folder: ' + (e && e.message || e)); });
	});
	ctl.append(label, pick);
	if (name) {
		const clear = document.createElement('button');
		clear.type = 'button';
		clear.className = 's34-set-btn';
		clear.textContent = 'Remove';
		clear.title = 'Back to the normal Downloads folder';
		clear.addEventListener('click', () => { clearDownloadFolder(); showToast('Downloads go to Downloads again.'); buildFolderControl(ctl, id); });
		ctl.appendChild(clear);
	}
}

let folderAskShown = false;

export { buildFolderControl, folderAllowed, folderAskShown, getFolderHandle, writeToFolder };
export function setFolderAskShown(value) { folderAskShown = value; return value; }
