// theme – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG, isPostView } from './config.js';
import { AC_CSS, BUTTON_CSS, CORE_CSS, DARK_CSS, EXTRA_CSS, GRID_CSS, POST_TAGS_CSS } from './styles/core.js';
import { FOLLOW_CSS, PHONE_CSS, TOUR_CSS } from './styles/pages.js';
import { ACCOUNT_CSS, HIDE_LIST_TAGS_CSS, LIST_SIDEBAR_CSS, SEARCH_CSS, SETTINGS_CSS } from './styles/site.js';
import { COLLECTIONS_CSS, CONTROLS_CSS, MISC_CSS, POPUP_INFO_CSS, POPUP_SIDE_CSS, WINDOWS_CSS } from './styles/windows.js';

const KEEP_DARK_RE = /s34-(sfw-label|badge|info|dl-mark|seen-mark|fav-btn|new-badge|bl-label|tagbar|chip|hover|loading|load|pv-tbar|cf-pill|cf-inline|cf-why|batch|fw-by)|span\.thumb\.s34-(selected|was)|s34-selecting/;

function rgbToHsl(r, g, b) {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h;
	if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
	else if (max === g) h = (b - r) / d + 2;
	else h = (r - g) / d + 4;
	return [h / 6, s, l];
}

function hslToRgb(h, s, l) {
	if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
	const hue = (p, q, t) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map(v => Math.round(v * 255));
}

function themeColor(r, g, b, hasAlpha, theme, role) {
	const [h, s, l] = rgbToHsl(r, g, b);
	const neutral = s < 0.2;
	let l2 = l;
	if (theme === 'oled') {
		if (!neutral || l >= 0.4) return null;
		if (role === 'line') return null;                          // lines: as in Dark
		l2 = l < 0.09 ? 0 : Math.max(0, l - 0.05);                 // page black, panels above it
	} else {
		if (r === 255 && g === 255 && b === 255 && !hasAlpha) return null; // white text on coloured buttons
		if (neutral) {
			if (l >= 0.5) l2 = (1 - l) * 0.9;                       // light (text, icons) -> dark
			else if (role === 'surface' && l <= 0.2) l2 = 0.955 + (l - 0.05) * 0.18; // raised = lighter
			else if (role === 'surface' || role === 'line') l2 = 0.86 - Math.max(0, l - 0.15) * 0.6; // lines - and mid-grey backgrounds (switch tracks, rails): darker than the surfaces
			else l2 = 1 - l * 0.6;                                   // anything else: as before
		}
		else if (l > 0.65 && s > 0.3) l2 = l - 0.32;
		else return null;
	}
	return hslToRgb(h, neutral ? Math.min(s, 0.12) : s, Math.min(1, Math.max(0, l2)));
}

function colorRole(prop) {
	prop = prop.toLowerCase();
	if (prop.startsWith('--')) return /border|line/.test(prop) ? 'line' : /bg|panel|card|surface/.test(prop) ? 'surface' : /fg|text|muted|link/.test(prop) ? 'text' : 'other';
	if (/border|outline|column-rule/.test(prop)) return 'line';
	if (/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color|accent-color)$/.test(prop)) return 'text';
	if (/background|box-shadow/.test(prop)) return 'surface';
	return 'other';
}

function recolorCss(css, theme) {
	const COLOR_RE = /#([0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/gi;
	const convert = role => (m, hex, r, g, b, a) => {
		let rgb;
		if (hex) {
			const x = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
			rgb = [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16));
		} else {
			rgb = [+r, +g, +b];
		}
		// White (Beta 3.7): shadows and dimming stay dark - softer - instead
		// of turning white (white shadows were invisible: no depth at all)
		// (strong dimming behind windows - alpha 0.6 and up - stays as strong as in Dark)
		if (theme === 'white' && a != null && Math.max(rgb[0], rgb[1], rgb[2]) < 40) {
			return parseFloat(a) >= 0.6 ? m : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.round(parseFloat(a) * 50) / 100})`;
		}
		const out = themeColor(rgb[0], rgb[1], rgb[2], a != null, theme, role);
		if (!out) return m;
		return a != null ? `rgba(${out[0]},${out[1]},${out[2]},${a})`
		: '#' + out.map(v => v.toString(16).padStart(2, '0')).join('');
	};
	// declaration by declaration, so each colour knows its role
	// (comments out first: one between two declarations hid the next one
	// from this, and its colour stayed as in Dark - e.g. a black bar in White)
	const fix = decls => decls.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|;)(\s*)([-\w]+)(\s*:)([^;]*)/g, (m, sep, sp, prop, colon, val) =>
																		sep + sp + prop + colon + val.replace(COLOR_RE, convert(colorRole(prop))));
	// Each innermost "selector { … }" block; keep-dark ones are skipped
	return css.replace(/([^{}]*)\{([^{}]*)\}/g, (m, sel, decls) =>
					   KEEP_DARK_RE.test(sel) || /^\s*(\d+%|from|to)\s*$/.test(sel) ? m : sel + '{' + fix(decls) + '}')
		.replace(/color-scheme:\s*dark/g, theme === 'white' ? 'color-scheme: light' : 'color-scheme: dark');
}

const THEME_FIX_CSS = {
	white: `
            html.s34-theme-white #navbar li a:hover, html.s34-theme-white #subnavbar li a:hover { color: #1d1f24 !important; }
            html.s34-theme-white #subnavbar li.s34-sub-current a { color: #1d1f24 !important; }
            html.s34-theme-white .s34-cm-user, html.s34-theme-white .s34-cm-head h3,
            html.s34-theme-white .s34-auto-sec, html.s34-theme-white .s34-tipslink button:hover { color: #1d1f24 !important; }
            html.s34-theme-white .s34-set-head h2, html.s34-theme-white .s34-set-nav nav button:hover,
            html.s34-theme-white .s34-set .s34-set-advbtn:hover { color: #1d1f24 !important; }
            html.s34-theme-white .s34-tips kbd {
                color: #1d1f24 !important;
                background-color: #fff !important;
                border-color: #cfd3dc !important;
                box-shadow: 0 2px 0 rgba(0,0,0,0.12);
            }
            /* My Account / Options (Beta 3.7) */
            html.s34-theme-white .s34-opt-nav button.s34-on, html.s34-theme-white .s34-opt-nav button:hover,
            html.s34-theme-white .s34-opt-seg button:hover:not(:disabled):not(.s34-on),
            html.s34-theme-white .s34-acc .s34-acc-btn:hover, html.s34-theme-white .s34-opt .s34-opt-btn:hover:not(.s34-opt-primary) { color: #1d1f24 !important; }
            /* Tag bubbles in the popup sidebar (on thumbnails they stay dark) */
            html.s34-theme-white .s34-pv-chips .s34-chip { background-color: #fff !important; border-color: #d3d6de !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-artist    .s34-chip-name { color: #c62828 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-character .s34-chip-name { color: #2e7d32 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-copyright .s34-chip-name { color: #7b1fa2 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-general   .s34-chip-name { color: #1a56c4 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-metadata  .s34-chip-name { color: #b35c00 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-count { color: #555a66 !important; }
            /* + / ⊘ / bell on the popup's white tag bubbles: deeper colours */
            html.s34-theme-white .s34-pv-chips .s34-chip-add { color: #2e7d32 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-add[data-state="in"] { color: #b35c00 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-add[data-state="out"] { color: #1a56c4 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-block { color: #c62828 !important; }
            html.s34-theme-white .s34-pv-chips .s34-chip-follow { color: #6b6f7a !important; }
            html.s34-theme-white .s34-chip-follow.s34-following,
            html.s34-theme-white #tag-sidebar li a.r34-follow-btn.s34-following { color: #d97800 !important; }
            html.s34-theme-white .s34-fw-follow.s34-following { color: #a85d00 !important; border-color: rgba(168,93,0,0.45) !important; }
            html.s34-theme-white .s34-gear.s34-gear-nav:hover { color: #1d1f24 !important; }
            /* Saved searches (Beta 3.7) */
            html.s34-theme-white .s34-sb .s34-sb-save:hover { color: #1d1f24 !important; }
            html.s34-theme-white .s34-sb .s34-sb-save.s34-on, html.s34-theme-white .s34-saved-box .s34-follow-head svg { color: #2c5fcc !important; }
            html.s34-theme-white .s34-follow-box a.s34-follow-row.s34-follow-allrow:is(:link, :visited) { color: #b35c00 !important; }
            html.s34-theme-white .s34-follow-menu .s34-cmenu-item.s34-on .s34-cmenu-check { color: #d97800 !important; }
            html.s34-theme-white .s34-follow-menu .s34-cmenu-item.s34-on .s34-cmenu-name { color: #8a4a00 !important; }
            html.s34-theme-white .s34-sb .s34-pin.s34-on { color: #b35c00 !important; }
            /* Score and the "child posts" notice in the popup */
            html.s34-theme-white .s34-pv-score { color: #8a6100 !important; }
            html.s34-theme-white .s34-pv-notice { color: #7a4300 !important; }
            /* Light page behind pictures in the popup */
            html.s34-theme-white .s34-pv-overlay { background-color: rgba(238,240,244,0.97) !important; }
            html.s34-theme-white .s34-overlay { background-color: rgba(30,32,40,0.35) !important; }
            html.s34-theme-white .s34-stat-tile b { -webkit-text-fill-color: transparent; }
            html.s34-theme-white ::-webkit-scrollbar-thumb { background: #c5c8d0 !important; }
            /* (Beta 3.7) the page a soft grey, so the lighter cards and panels stand out on it */
            html.s34-theme-white { --s34-bg: #e2e4e9 !important; }
        `,
	oled: `
            html.s34-theme-oled, html.s34-theme-oled body { background: #000 !important; }
            html.s34-theme-oled .s34-pv-overlay { background-color: rgba(0,0,0,0.98) !important; }
            html.s34-theme-oled ::-webkit-scrollbar-thumb { background: #222 !important; }
        `,
	dark: ''
};

function injectStyles() {
	const style = document.createElement('style');
	style.id = 'steamy34-styles';
	let css =
		DARK_CSS +
		(CONFIG.thumbGrid ? GRID_CSS : '') + CORE_CSS +
		BUTTON_CSS + AC_CSS + (CONFIG.searchChips ? SEARCH_CSS : '') + SETTINGS_CSS +
		// the big extras block, in its original order (src\06a-06i)
		EXTRA_CSS + WINDOWS_CSS + CONTROLS_CSS + POPUP_SIDE_CSS + COLLECTIONS_CSS +
		POPUP_INFO_CSS + MISC_CSS + PHONE_CSS + TOUR_CSS + FOLLOW_CSS + ACCOUNT_CSS +
		(CONFIG.hideListTags && !isPostView ? HIDE_LIST_TAGS_CSS : '') +
		(!isPostView ? LIST_SIDEBAR_CSS : '') +
		(CONFIG.postTagChips && isPostView ? POST_TAGS_CSS : '');
	if (CONFIG.theme !== 'dark') css = recolorCss(css, CONFIG.theme) + THEME_FIX_CSS[CONFIG.theme];
	style.textContent = css;
	(document.head || document.documentElement).appendChild(style);
}

export { injectStyles };
