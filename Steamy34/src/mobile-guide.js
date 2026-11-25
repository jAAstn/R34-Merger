// mobile-guide – Steamy34 (aus Steamy34.js aufgeteilt)
import { exportBackup } from './backup.js';
import { DISCORD_URL } from './config.js';
import { openWindow } from './window-shell.js';

const MOBILE_ANNOUNCE_KEY = 'steamy34_mobile_seen';

const MOBILE_ANNOUNCE_VERSION = 1;

const PHONE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>';

const PHONE_ART = '<svg class="s34-mob-phone" viewBox="0 0 80 140" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="74" height="134" rx="14" fill="#16151c" stroke="#fff" stroke-opacity=".85" stroke-width="3"/><rect x="9" y="14" width="62" height="108" rx="6" fill="#1f1d27"/><rect x="31" y="7" width="18" height="3" rx="1.5" fill="#fff" opacity=".5"/><g transform="translate(22 46) scale(.56)"><rect width="64" height="64" rx="15" fill="#ff5f8f"/><g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"><path d="M22 26c-3.2-3 3.2-5.6 0-8.6s3.2-5.6 0-8.4"/><path d="M31 26c-3.2-3 3.2-5.6 0-8.6s3.2-5.6 0-8.4"/><path d="M40 26c-3.2-3 3.2-5.6 0-8.6s3.2-5.6 0-8.4"/></g><path d="M14 31h34v7a13 13 0 0 1-13 13h-8a13 13 0 0 1-13-13z" fill="#fff"/><path d="M47.5 34.5h2.5a5.5 5.5 0 0 1 0 11h-4" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></g><rect x="17" y="94" width="46" height="5" rx="2.5" fill="#fff" opacity=".22"/><rect x="23" y="104" width="34" height="5" rx="2.5" fill="#fff" opacity=".14"/><rect x="32" y="128" width="16" height="3" rx="1.5" fill="#fff" opacity=".5"/></svg>';

const onTouchDevice = () => {
	try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (e) { return false; }
};

function openMobileGuide() {
	if (document.querySelector('.s34-mob-overlay')) return;
	const w = openWindow({ cls: 's34-mob-overlay', icon: PHONE_SVG, title: 'Steamy34 on Android', width: 600 });
	w.setSub('Take your setup with you – step by step');
	w.body.innerHTML = `
            <div class="s34-mob-hero">
                ${PHONE_ART}
                <div class="s34-mob-hero-text">
                    <span class="s34-mob-badge">New · Beta</span>
                    <h3>Steamy34, now in your pocket</h3>
                    <p>Popup viewer, smart search, collections and tag-named downloads – on your Android phone too.
                       Setup takes about two minutes.</p>
                </div>
            </div>
            <div class="s34-mob-steps">
                <div class="s34-mob-step"><div>
                    <b>Get Firefox</b>
                    <span>Install <em>Firefox</em> from the Play Store. (Chrome on Android can't run add-ons, so it won't work there.)</span>
                </div></div>
                <div class="s34-mob-step"><div>
                    <b>Add Tampermonkey</b>
                    <span>In Firefox tap <em>⋮</em> → <em>Extensions</em> (or <em>Add-ons</em>) → find <em>Tampermonkey</em>
                          → <em>Add</em>. Violentmonkey works too.</span>
                </div></div>
                <div class="s34-mob-step"><div>
                    <b>Install Steamy34</b>
                    <span>Put the Steamy34 file (<em>Steamy34_….user.js</em>) on your phone – e.g. send it to yourself
                          and download it. Then open the <em>Tampermonkey dashboard</em> → <em>Utilities</em> tab →
                          <em>Import from file</em> → <em>Browse…</em>, pick the file and confirm the install.</span>
                </div></div>
                <div class="s34-mob-step s34-mob-optional"><div>
                    <b>Bring your stuff along <span class="s34-mob-opt">optional</span></b>
                    <span>Here on the computer: <em>Export backup</em> (button below). Send the file to your phone
                          (e.g. e-mail it to yourself). On the phone: <em>☰ Menu</em> → <em>⚙ Settings</em> → <em>Privacy &amp; data</em>
                          → <em>Import backup</em>. Searches, favourite tags, collections and marks come along.
                          Steamy34 keeps its data per browser – importing <em>combines</em>, so do it again now and then (both ways) to keep the two in step.</span>
                </div></div>
                <div class="s34-mob-step"><div>
                    <b>Open rule34.xxx in Firefox</b>
                    <span>That's it – Steamy34 starts by itself.</span>
                </div></div>
            </div>
            <div class="s34-mob-note">
                <b>Good to know – Steamy34 is in beta.</b> It was made for mouse and keyboard first, so on a phone:
                <ul>
                    <li>Tap a post to open it – swipe left / right on the picture to browse, swipe down or press <b>Back</b> to close.</li>
                    <li>Steamy34's switches, Settings, Blacklist and the quick tips (with a <b>Phone</b> tab for all gestures) are in the <b>☰ Menu</b> at the top right.</li>
                    <li>Hover previews need a mouse, so they're off on phones.</li>
                    <li><b>Now and then rule34 asks for a quick Cloudflare check</b> – a pulsing notice at the bottom. Tap <b>Solve</b>, tick the box, and everything carries on. Until then nothing new loads.</li>
                    <li>Something awkward or broken? Tell steamycorner in #feedback on the <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">Discord</a> – it helps make the touch version better.</li>
                </ul>
            </div>
            <div class="s34-mob-foot">
                <button type="button" class="s34-mob-backup">⬇ Export backup</button>
                <button type="button" class="s34-mob-ok">Got it</button>
            </div>`;
	w.body.querySelector('.s34-mob-backup').addEventListener('click', exportBackup);
	w.body.querySelector('.s34-mob-ok').addEventListener('click', () => w.close());
	w.onClose = () => GM_setValue(MOBILE_ANNOUNCE_KEY, MOBILE_ANNOUNCE_VERSION);
	w.body.querySelector('.s34-mob-ok').focus({ preventScroll: true });
	w.body.scrollTop = 0;
}

export { MOBILE_ANNOUNCE_KEY, MOBILE_ANNOUNCE_VERSION, PHONE_SVG, onTouchDevice, openMobileGuide };
