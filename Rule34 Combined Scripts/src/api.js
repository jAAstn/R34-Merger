import { getRoute, safeStorageGet, safeStorageSet, CONSTANTS, API_KEY_NAME, USER_ID_NAME, REMINDER_KEY, gmRequest, buildApiUrl, sleep } from './core.js';
import { API_MODAL_CSS } from './css.js';

    // --- VALIDIERUNG & CREDENTIALS ---
    const validateCredentials = async (apiKey, userId) => {
        try {
            const testUrl = buildApiUrl({
                page: 'dapi',
                s: 'post',
                q: 'index',
                limit: 1,
                json: 1,
                api_key: apiKey,
                user_id: userId,
            });
            const response = await gmRequest(testUrl);
            if (response.status !== 200) return false;

            // Nicht nur auf Status 200 vertrauen, sondern die Antwort tatsächlich prüfen
            const body = response.response;
            if (!body) return false;
            if (typeof body === 'string') {
                try { JSON.parse(body); } catch { return false; }
            } else if (typeof body === 'object') {
                if (body.error || body.message || body.success === false) return false;
            }
            return true;
        } catch {
            return false;
        }
    };
    async function handleOptionsPage() {
        if (!getRoute().isOptionsPage) return;
        const credTextarea = Array.from(document.querySelectorAll('textarea')).find(ta => ta.value.includes('&api_key=') && ta.value.includes('&user_id='));
        if (credTextarea) {
            try {
                const params = new URLSearchParams(credTextarea.value.replace(/&amp;/g, '&'));
                const apiKey = params.get('api_key');
                const userId = params.get('user_id');

                if (apiKey && userId) {
                    const isValid = await validateCredentials(apiKey, userId);
                    if (isValid) {
                        await GM.setValue(API_KEY_NAME, apiKey);
                        await GM.setValue(USER_ID_NAME, userId);
                        const banner = document.createElement('div');
                        banner.textContent = 'Rule34 Combined Scripts: API Key and User ID validated and saved!';
                        Object.assign(banner.style, { backgroundColor: '#4CAF50', color: 'white', padding: '15px', textAlign: 'center', position: 'fixed', top: '0', left: '0', width: '100%', zIndex: '10000', fontSize: '16px' });
                        document.body.prepend(banner);
                        setTimeout(() => banner.remove(), CONSTANTS.BANNER_DISPLAY_MS);
                    } else {
                        alert('Invalid API credentials. Please check and try again.');
                    }
                }
            } catch (e) {
                console.error("[Userscript] Could not parse API credentials.", e);
            }
        }
    }
    function showApiKeyPrompt() {
        const lastReminder = safeStorageGet(REMINDER_KEY);
        if (lastReminder && Date.now() - parseInt(lastReminder, 10) < 24 * 60 * 60 * 1000) return;

        // Modal-Styles zentral aus src/css.js
        GM_addStyle(API_MODAL_CSS);
        const overlay = document.createElement('div');
        overlay.id = 'r34-modal-overlay';
        overlay.innerHTML = `
            <div id="r34-modal-content">
                <p>For the "Restore Deleted Post" feature, this script now needs an API key. Please generate one or enter it manually.</p>
                <div id="r34-modal-buttons">
                    <button id="r34-manual-btn">Enter Manually</button>
                    <button id="r34-generate-btn">Go to Options Page</button>
                    <button id="r34-later-btn">Remind Later</button>
                </div>
                <div id="r34-manual-input" style="display: none;">
                    <p style="font-size: 0.9em;">Copy the full text from the 'API Access Credentials' box and paste it here.</p>
                    <input type="text" id="r34-credential-input" placeholder="&api_key=...&user_id=...">
                    <button id="r34-save-manual-btn">Save & Reload</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        document.getElementById('r34-generate-btn').addEventListener('click', () => window.location.href = 'https://rule34.xxx/index.php?page=account&s=options');
        document.getElementById('r34-manual-btn').addEventListener('click', () => {
            document.getElementById('r34-modal-buttons').style.display = 'none';
            document.getElementById('r34-manual-input').style.display = 'block';
        });
        document.getElementById('r34-later-btn').addEventListener('click', () => {
            safeStorageSet(REMINDER_KEY, Date.now().toString());
            overlay.remove();
        });
        document.getElementById('r34-save-manual-btn').addEventListener('click', async () => {
            const credString = document.getElementById('r34-credential-input').value.trim();
            if (!credString) return;
            try {
                const params = new URLSearchParams(credString.startsWith('?') ? credString : '?' + credString);
                const apiKey = params.get('api_key');
                const userId = params.get('user_id');
                if (apiKey && userId) {
                    const isValid = await validateCredentials(apiKey, userId);
                    if (isValid) {
                        await GM.setValue(API_KEY_NAME, apiKey);
                        await GM.setValue(USER_ID_NAME, userId);
                        alert('API Key and User ID validated and saved! The page will now reload.');
                        location.reload();
                    } else {
                        alert('Invalid credentials. Please check and try again.');
                    }
                } else alert('Invalid format. Please paste the full string.');
            } catch { alert('Could not parse the provided string.'); }
        });
    }
    async function checkApiKey() {
        if (getRoute().isOptionsPage) return true;
        const apiKey = await GM.getValue(API_KEY_NAME);
        const userId = await GM.getValue(USER_ID_NAME);
        if (!apiKey || !userId) {
            console.log("Rule34 Combined Scripts: API key or User ID not found. Displaying prompt.");
            showApiKeyPrompt();
            return false;
        }
        return true;
    }
    async function restoreDeletedPost() {
        try {
            const notice = document.querySelector('.status-notice');
            if (!notice || !notice.innerText.includes("This post was deleted.")) return;

            const postId = getRoute().id;

            // Idempotent: init.js ruft restoreDeletedPost() beim Start UND nach
            // jedem Route-Scan erneut auf. Ohne Guard wurde das Medium jedes Mal
            // neu eingesetzt und die "Restored"-Meldung mehrfach angehängt.
            // Der Marker hängt am Container – nach einem echten Re-Render der
            // Post-Ansicht ist er weg und die Restauration läuft korrekt erneut.
            const existingContainer = document.getElementById('fit-to-screen');
            if (existingContainer && existingContainer.dataset.r34thRestored === postId) return;
            if (!postId) return;

            const apiKey = await GM.getValue(API_KEY_NAME, '');
            const userId = await GM.getValue(USER_ID_NAME, '');
            const apiUrl = buildApiUrl({
                page: 'dapi',
                s: 'post',
                q: 'index',
                id: postId,
                json: 1,
                api_key: apiKey,
                user_id: userId,
            });

            let attempts = 0;
            const maxAttempts = CONSTANTS.API_RETRY_ATTEMPTS;
            let response = null;

            // Fail-fast bei 4xx (außer 429), Retry mit Backoff nur bei 429/Netzwerkfehlern
            while (attempts < maxAttempts) {
                let res;
                try {
                    res = await gmRequest(apiUrl);
                } catch (error) {
                    console.debug(`API attempt ${attempts + 1} failed (network/timeout):`, error);
                    attempts++;
                    if (attempts < maxAttempts) await sleep(1000 * attempts);
                    continue;
                }

                if (res.status === 200) { response = res; break; }
                if (res.status === 429) {
                    const waitTime = Math.pow(2, attempts) * 1000;
                    await sleep(waitTime);
                    attempts++;
                    continue;
                }
                if (res.status >= 400 && res.status < 500) {
                    throw new Error(`API responded with ${res.status} (post not found or forbidden)`);
                }
                attempts++;
                if (attempts < maxAttempts) await sleep(1000 * attempts);
            }

            if (!response || response.status !== 200) throw new Error(`Failed after ${maxAttempts} attempts`);

            let data = response.response;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch { throw new Error("Invalid JSON in API response"); }
            }
            if (!data) throw new Error("Empty API response");
            const post = Array.isArray(data) ? data[0] : data;
            if (!post?.file_url) throw new Error(`Post not found: ${postId || 'unknown'}`);

            const isVideo = ['webm', 'mp4'].includes(post.file_url.split('.').pop().toLowerCase());
            const mediaElement = document.createElement(isVideo ? 'video' : 'img');
            mediaElement.src = post.file_url;
            Object.assign(mediaElement.style, { maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', display: 'block' });
            if (isVideo) Object.assign(mediaElement, { controls: true, autoplay: true, loop: true, muted: true });

            const container = document.getElementById('fit-to-screen');
            if (container) {
                container.innerHTML = '';
                container.appendChild(mediaElement);
                container.dataset.r34thRestored = postId;
                notice.innerText += `\n[Userscript] Restored deleted media.`;
            }
        } catch (err) {
            const notice = document.querySelector('.status-notice');
            if (notice) {
                const errorMsg = document.createElement('div');
                errorMsg.style.cssText = 'color:#ff6b6b;margin-top:10px;';
                errorMsg.textContent = '⚠️ Media could not be restored.';
                notice.appendChild(errorMsg);
            }
            console.warn("[Userscript] Could not restore deleted post:", err);
        }
    }

export { handleOptionsPage, checkApiKey, restoreDeletedPost };
