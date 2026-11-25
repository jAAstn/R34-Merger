// styles/core – Steamy34 (aus Steamy34.js aufgeteilt)
import { CONFIG } from '../config.js';

const DARK_CSS = `
        :root {
            --s34-bg: #121214;
            --s34-panel: #1c1c20;
            --s34-panel-2: #26262c;
            --s34-border: #33333a;
            --s34-fg: #dcdce0;
            --s34-muted: #9a9aa3;
            --s34-link: #8ab4f8;
            --s34-link-hover: #b3cdfb;
            color-scheme: dark;
        }

        html, body {
            background: var(--s34-bg) !important;
            color: var(--s34-fg) !important;
        }

        /* Strip the site's light backgrounds everywhere (not inside the video player) */
        /* :where() keeps these at minimum specificity so the specific rules below win */
        /* Toggle switches (e.g. "Filter AI posts") are a checkbox + a styled
           span whose background IS the switch - keep the site's colours there */
        /* (.tlabel / .tradio: the site's ☰ menu buttons in the phone layout -
           they keep their own look) */
        body *:where(:not(input, textarea, select, button, img, video,
                          .tlabel, .tlabel *,
                          .fluid_video_wrapper, .fluid_video_wrapper *, .s34-badge,
                          .slider, .switch *, .toggle *, .toggle-switch *,
                          input[type="checkbox"] + *, input[type="checkbox"] ~ span)) {
            background-color: transparent !important;
            border-color: var(--s34-border) !important;
        }
        body *:where(:not(a, .tlabel, .tlabel *, .fluid_video_wrapper *, .s34-badge)) {
            color: var(--s34-fg) !important;
        }

        a, a:visited { color: var(--s34-link) !important; }
        a:hover { color: var(--s34-link-hover) !important; }

        /* Header / navigation */
        #header, #navbar, #subnavbar, .sidebar, #tag-sidebar, .tag-search {
            background-color: var(--s34-panel) !important;
        }
        /* Modern pill-style navigation */
        #navbar li, #subnavbar li {
            background: none !important;
            border: 0 !important;
            margin: 0 2px 4px 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        #navbar li a, #subnavbar li a {
            display: inline-block;
            background: none !important;
            border: 1px solid transparent !important;
            border-radius: 999px;
            text-decoration: none !important;
        }
        /* (Beta 3.9.2) the colour fade only once the page is there - it used to
           play while a page loaded, so every menu border flashed */
        html.s34-nav-ready #navbar li a, html.s34-nav-ready #subnavbar li a {
            transition: background-color .15s ease, color .15s ease, border-color .15s ease;
        }
        #navbar li a {
            padding: 5px 14px !important;
            font-weight: 600;
            color: var(--s34-fg) !important;
        }
        /* the page you're on, in the second row (rule34 doesn't mark it) */
        #subnavbar li.s34-sub-current a { background-color: var(--s34-panel-2) !important; border-color: var(--s34-border) !important; color: #fff !important; }
        #subnavbar li a {
            padding: 3px 11px !important;
            font-size: 0.9em;
            color: var(--s34-muted) !important;
        }
        #navbar li a:hover, #subnavbar li a:hover {
            background-color: var(--s34-panel-2) !important;
            border-color: var(--s34-border) !important;
            color: #fff !important;
        }
        /* Current section */
        #navbar li.current-page a, #navbar li.current a, #navbar li[class*="current"] a {
            background-color: #2f5fbf !important;
            border-color: #2f5fbf !important;
            color: #fff !important;
        }
        #navbar li.current-page a:hover, #navbar li[class*="current"] a:hover {
            background-color: #3a6fd4 !important;
        }

        /* Form fields (not the hidden radio buttons behind the site's ☰ menus) */
        input:not(.tradio), textarea, select, button {
            background-color: var(--s34-panel-2) !important;
            color: var(--s34-fg) !important;
            border: 1px solid var(--s34-border) !important;
            border-radius: 4px;
        }
        input[type="submit"]:hover, button:hover { background-color: #33333b !important; }

        /* Tables (comments, wiki, options) */
        th { background-color: var(--s34-panel-2) !important; }
        tr:nth-child(even) td { background-color: rgba(255,255,255,0.02) !important; }

        /* Tag colours, readable on dark */
        #tag-sidebar li.tag-type-copyright a { color: #d68cff !important; }
        #tag-sidebar li.tag-type-character a { color: #7ee07e !important; }
        #tag-sidebar li.tag-type-artist    a { color: #ff8a80 !important; }
        #tag-sidebar li.tag-type-general   a { color: #8ab4f8 !important; }
        #tag-sidebar li.tag-type-metadata  a { color: #ffb86b !important; }
        #tag-sidebar li .tag-count, #tag-sidebar li span { color: var(--s34-muted) !important; }

        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: var(--s34-bg); }
        ::-webkit-scrollbar-thumb { background: #3a3a42; border-radius: 5px; }

        /* rule34's own dark theme (Steamy34 switches it on with the colour mode -
           matchSiteTheme) draws halos around the header links and a black glow on
           every link while hovered - not wanted under Steamy34's colours */
        #header a, #header li a { text-shadow: none !important; }
        html body a:hover { text-shadow: none; }
    `;

const GRID_CSS = `
        /* The content column shrinks to fit its contents by default, which
           squeezes the grid into ~2 columns. Make it take all the space to the
           right of the sidebar instead (the sidebar itself is not touched). */
        #post-list > .content,
        #post-list .content:has(> .image-list),
        .content:has(> .image-list) {
            float: none !important;
            display: flow-root !important;
            width: auto !important;
            max-width: none !important;
            /* #post-list is a flex row: let the content take all leftover space */
            flex: 1 1 0 !important;
            min-width: 0 !important;
        }
        ${CONFIG.thumbLayout === 'justified' ? `
        /* Justified rows: every tile's width is proportional to its aspect
           ratio (--r, set by script), so each row has one height and fills
           the full width - original ratios, no cropping, no gaps. */
        .image-list {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: flex-start;
        }
        .image-list span.thumb {
            flex-grow: calc(var(--r, 1) * 100) !important;
            /* --s34-row is the row height (the sidebar size slider changes it live) */
            flex-basis: calc(var(--r, 1) * var(--s34-row, ${CONFIG.thumbRowHeight}px)) !important;
            aspect-ratio: var(--r, 1);
            max-height: calc(var(--s34-row, ${CONFIG.thumbRowHeight}px) * 1.8);
        }
        /* Stops the last, half-full row from stretching huge */
        .image-list::after {
            content: '';
            flex-grow: 1000000000;
        }
        ` : `
        .image-list {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(var(--s34-tile, ${CONFIG.thumbMinWidth}px), 1fr));
        }
        .image-list span.thumb { aspect-ratio: 1 / 1; }
        `}
        .image-list {
            gap: ${CONFIG.thumbGap}px;
            padding: ${CONFIG.thumbGap}px 0;
            width: 100% !important;
            box-sizing: border-box;
            text-align: left !important;
        }
        .image-list > br, .image-list > p:empty { display: none !important; }

        .image-list span.thumb {
            position: relative;
            display: block !important;
            width: auto !important;
            height: auto !important;
            min-width: 0;
            margin: 0 !important;
            padding: 0 !important;
            float: none !important;
            overflow: hidden;
            border-radius: 8px;
            background-color: #1c1c20 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.35);
            transition: transform .15s ease, box-shadow .15s ease;
        }
        .image-list span.thumb:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.5);
        }
        .image-list span.thumb > a {
            display: block !important;
            width: 100%;
            height: 100%;
        }
        .image-list span.thumb img {
            display: block;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
            object-fit: ${CONFIG.thumbLayout === 'justified' ? 'cover' : CONFIG.thumbFit};
            border: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        ${CONFIG.thumbExtras === 'below' ? `
        /* Thumbnail extras BELOW the picture: the picture keeps its shape in
           the link, the tile grows by a strip that holds the VIDEO / GIF label,
           the tag chips, ♥ and the viewed / downloaded mark. */
        html.s34-tx-below .image-list span.thumb {
            aspect-ratio: auto !important;
            max-height: none !important;
            padding-bottom: var(--s34-strip) !important;
        }
        html.s34-tx-below .image-list span.thumb > a {
            height: auto !important;
            aspect-ratio: ${CONFIG.thumbLayout === 'justified' ? 'var(--r, 1)' : '1 / 1'};
            ${CONFIG.thumbLayout === 'justified' ? `max-height: calc(var(--s34-row, ${CONFIG.thumbRowHeight}px) * 1.8);` : ''}
            overflow: hidden;
        }
        html.s34-tx-below .image-list span.thumb .s34-hover-video { bottom: var(--s34-strip); height: auto !important; }
        html.s34-tx-below .image-list span.thumb.s34-loading::before { bottom: var(--s34-strip); }
        html.s34-tx-below span.thumb .s34-tagbar {
            top: auto;
            bottom: 0;
            height: var(--s34-strip);
            box-sizing: border-box;
            flex-direction: row;
            align-items: center;
            padding: 0 36px 0 6px;
            background: none !important;
        }
        html.s34-tx-below span.thumb .s34-chiprow { flex: 0 1 auto; }
        html.s34-tx-below span.thumb:has(.s34-dl-mark) .s34-tagbar { padding-right: 64px; }
        /* room for the labels on the left (▶ VID is ~42px, GIF ~33px, NEW ~36px) */
        html.s34-tx-below span.thumb:has(.s34-badge) .s34-tagbar { padding-left: 44px; }
        html.s34-tx-below span.thumb:has(.s34-badge.s34-video) .s34-tagbar { padding-left: 54px; }
        html.s34-tx-below span.thumb:has(.s34-new-badge) .s34-tagbar { padding-left: 48px; }
        html.s34-tx-below span.thumb:has(.s34-new-badge):has(.s34-badge) .s34-tagbar { padding-left: 84px; }
        html.s34-tx-below span.thumb:has(.s34-new-badge):has(.s34-badge.s34-video) .s34-tagbar { padding-left: 94px; }
        html.s34-tx-below span.thumb .s34-badge { top: auto; bottom: calc((var(--s34-strip) - 18px) / 2); }
        html.s34-tx-below span.thumb .s34-new-badge { top: auto; bottom: calc((var(--s34-strip) - 18px) / 2); }
        html.s34-tx-below span.thumb .s34-fav-btn { top: auto; bottom: calc((var(--s34-strip) - 24px) / 2); opacity: .75; }
        html.s34-tx-below span.thumb .s34-dl-mark { top: auto; bottom: calc((var(--s34-strip) - 24px) / 2); }
        html.s34-tx-below { --s34-strip: 30px; }
        ` : ''}
    `;

const CORE_CSS = `
        /* Square corners (setting "Rounded corners" off): everything Steamy34
           draws and styles - except loading circles, the round pictures in
           the Following window and the video player */
        html.s34-square body *:not(.s34-spin, .s34-fw-av, .fluid_video_wrapper *),
        html.s34-square body *:not(.s34-spin, .s34-fw-av, .fluid_video_wrapper *)::before,
        html.s34-square body *:not(.s34-spin, .s34-fw-av, .fluid_video_wrapper *)::after { border-radius: 0 !important; }
        /* Download panel (batch downloads / collections): progress, pause, cancel */
        .s34-dlp {
            position: fixed;
            left: 16px;
            bottom: 16px;
            z-index: 2147483600;
            width: 300px;
            max-width: calc(100vw - 32px);
            box-sizing: border-box;
            padding: 12px 14px;
            border-radius: 12px;
            background-color: #1c1c21 !important;
            border: 1px solid #34343c !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.45);
            color: #e8e8ec !important;
            font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-dlp-head { display: flex; align-items: baseline; gap: 8px; }
        .s34-dlp-head b { font-size: 13px; }
        .s34-dlp-count { margin-left: auto; font-variant-numeric: tabular-nums; opacity: .8; }
        .s34-dlp-bar { height: 6px; margin: 9px 0 7px; border-radius: 3px; background-color: #2c2c33 !important; overflow: hidden; }
        .s34-dlp-bar i { display: block; height: 100%; width: 0; border-radius: 3px; background: linear-gradient(90deg, #ff5f8f, #8f5bff); transition: width .3s; }
        .s34-dlp.s34-dlp-paused .s34-dlp-bar i { background: #8a8a95; }
        .s34-dlp-text { font-size: 12px; opacity: .7; min-height: 17px; overflow-wrap: anywhere; }
        .s34-dlp-btns { display: flex; gap: 6px; margin-top: 9px; }
        .s34-dlp .s34-dlp-btns button {
            flex: 1;
            height: 28px;
            border-radius: 7px;
            border: 1px solid #3a3a44 !important;
            background-color: #26262c !important;
            color: inherit !important;
            font: 600 12px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
        }
        .s34-dlp .s34-dlp-btns button:hover { background-color: #303038 !important; }
        @media (max-width: 760px) { .s34-dlp { left: 10px; right: 10px; width: auto; max-width: none; bottom: 10px; } }

        /* Tag bars and marks sit on top of the thumbnail */
        .image-list span.thumb { position: relative; }

        .s34-hover-video {
            position: absolute;
            inset: 0;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover;
            z-index: 1;
            pointer-events: none;   /* clicks still open the post */
            background: transparent !important; /* (black made a not-yet-drawn video look like a dark box) */
            opacity: 0;
            transition: opacity .15s ease;
        }
        .s34-hover-video.s34-playing { opacity: 1; }
        .s34-loading::before {
            content: '';
            position: absolute;
            z-index: 3;
            bottom: 0; left: 0;
            height: 3px; width: 100%;
            background: linear-gradient(90deg, transparent, #8ab4f8, transparent) !important;
            animation: s34-load 1s linear infinite;
        }
        @keyframes s34-load { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

        /* Artist / character bar at the bottom of each thumbnail */
        .image-list span.thumb.s34-bl-hidden, span.thumb.s34-bl-hidden { display: none !important; }
        .s34-tagbar {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 3;
            display: flex;
            flex-direction: column;
            gap: 3px;
            padding: 16px 5px 5px;
            background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.82)) !important;
            pointer-events: none; /* the image underneath stays clickable */
        }
        .s34-chiprow {
            display: flex;
            gap: 3px;
            overflow: hidden;
            min-width: 0;
        }
        .s34-chip {
            pointer-events: auto;
            display: inline-flex;
            align-items: center;
            min-width: 0;
            max-width: 100%;
            border-radius: 999px;
            background-color: rgba(18,18,22,0.85) !important;
            border: 1px solid rgba(255,255,255,0.14) !important;
            font: 600 10.5px/1.6 system-ui, -apple-system, Segoe UI, sans-serif;
            overflow: hidden;
        }
        .s34-chip .s34-chip-name {
            padding: 0 7px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-decoration: none !important;
        }
        .s34-chip-artist    .s34-chip-name { color: #ff8a80 !important; }
        .s34-chip-character .s34-chip-name { color: #7ee07e !important; }
        .s34-chip .s34-chip-name:hover { text-decoration: underline !important; }
        /* Block icon: appears while the thumbnail is hovered and lingers
           ~1.5s after the mouse leaves, so it's easy to reach */
        .s34-chip .s34-chip-block {
            display: inline-block;
            flex: none;
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            color: #ff6b6b !important;
            font-size: 12px;
            line-height: 1;
            cursor: pointer;
            transition: max-width .15s ease 1.5s, opacity .15s ease 1.5s, padding .15s ease 1.5s;
        }
        span.thumb:hover .s34-chip .s34-chip-block {
            max-width: 20px;
            opacity: .6;
            padding: 0 6px 0 0 !important;
            transition-delay: 0s;
        }
        span.thumb .s34-chip:hover .s34-chip-block { opacity: 1; }

        /* "+" (add to search) on thumbnail chips: shows up with the block icon */
        span.thumb .s34-chip .s34-chip-add {
            display: inline-block;
            flex: none;
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            padding: 0 !important;
            font-size: 12px;
            transition: max-width .15s ease 1.5s, opacity .15s ease 1.5s, padding .15s ease 1.5s;
        }
        span.thumb:hover .s34-chip .s34-chip-add {
            max-width: 20px;
            opacity: .7;
            padding: 0 4px 0 0 !important;
            transition-delay: 0s;
        }
        span.thumb .s34-chip .s34-chip-add:hover { opacity: 1; }
        /* Already in the search (− / ↺): always shown */
        span.thumb .s34-chip .s34-chip-add[data-state="in"],
        span.thumb .s34-chip .s34-chip-add[data-state="out"] {
            max-width: 20px;
            opacity: 1;
            padding: 0 4px 0 0 !important;
            transition: none;
        }

        /* Blacklisted tag chip: crossed out, unblock (↺) button always shown */
        .s34-chip.s34-chip-blocked { border-color: rgba(255,80,80,0.6) !important; }
        .s34-chip.s34-chip-blocked .s34-chip-name { text-decoration: line-through !important; opacity: .7; }
        span.thumb .s34-chip.s34-chip-blocked .s34-chip-block {
            max-width: 20px;
            opacity: 1;
            padding: 0 6px 0 0 !important;
            color: #8ab4f8 !important;
            transition: none;
        }

        /* Post blacklisted while on screen: fully blurred and labelled (Beta 3.8.1 -
           before only greyed, the picture could still be made out) */
        span.thumb.s34-bl-marked img:not(.s34-hover-video) {
            filter: grayscale(1) brightness(.3) blur(14px);
        }
        span.thumb.s34-bl-marked { overflow: hidden; }
        span.thumb.s34-bl-marked video { visibility: hidden !important; }

        /* (Beta 3.9.4) Versions of one picture: folded into the first one */
        .image-list span.thumb.s34-var-hidden:not(.s34-var-open) { display: none !important; }
        span.thumb.s34-var-open { outline: 2px dashed rgba(138,180,248,.6); outline-offset: 2px; }
        .s34-var-badge { position: absolute; left: 6px; bottom: 6px; z-index: 5; padding: 3px 9px; border-radius: 99px; border: none !important;
            background: rgba(52,98,196,.95) !important; color: #fff !important; font: 700 11px/1.3 system-ui, sans-serif; cursor: pointer; }
        span.thumb:has(.s34-tagbar) .s34-var-badge { bottom: auto; top: 34px; }

        /* (Beta 3.9.1) Comments page: posts with a blacklisted tag hidden (until "Show them") */
        html.s34-cm-pending #comment-list .post, html.s34-cm-pending div.post[id^="p"] { visibility: hidden !important; }
        html:not(.s34-bl-posts-shown) div.post.s34-bl-post { display: none !important; }
        html.s34-bl-posts-shown div.post.s34-bl-post { outline: 2px dashed rgba(255,90,90,.5); outline-offset: 4px; }
        .s34-bl-postnote { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin: 0 0 14px; padding: 10px 14px; border-radius: 10px;
            background: rgba(255,90,90,0.08) !important; border: 1px solid rgba(255,90,90,0.35) !important; color: #ffd0d0 !important; font: 500 13px/1.4 system-ui, sans-serif; }
        .s34-bl-postnote span { flex: 1 1 240px; }
        .s34-bl-postnote button { padding: 5px 12px; border-radius: 7px; border: 1px solid rgba(255,90,90,0.5) !important; background: rgba(255,90,90,0.12) !important; color: #fff !important; font: 600 12px system-ui, sans-serif; cursor: pointer; }

        /* (Beta 3.9.1) Collections / Downloads: a tile with a blacklisted tag - covered, "Show" uncovers it */
        .s34-tile.s34-tile-bl .s34-tile-img img { filter: grayscale(1) brightness(.3) blur(16px); }
        .s34-tile-blcover { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 8px;
            text-align: center; color: #ffd0d0 !important; font: 600 11px/1.35 system-ui, sans-serif; overflow-wrap: anywhere; }
        .s34-tile-blcover button { padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.3) !important; background: rgba(20,20,24,.85) !important; color: #fff !important; font: 600 11px system-ui, sans-serif; cursor: pointer; }
        .s34-tile-img { position: relative; }
        .s34-win-tools .s34-bl-toggle.s34-on { border-color: #ff8a8a !important; color: #ffd0d0 !important; }

        /* (Beta 3.9) An empty posts page: what's going on */
        .s34-empty-note { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 10px 0 16px; padding: 12px 16px; border-radius: 10px;
            background: rgba(255,179,71,0.08) !important; border: 1px solid rgba(255,179,71,0.4) !important; color: #ffe2bf !important; font: 500 14px/1.45 system-ui, sans-serif; }
        .s34-empty-note b { color: #fff !important; }
        .s34-empty-note span { flex: 1 1 260px; }
        .s34-empty-note button { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,179,71,0.6) !important; background: rgba(255,179,71,0.15) !important; color: #fff !important; font: 600 13px system-ui, sans-serif; cursor: pointer; }

        /* (Beta 3.8.1) A post with a blacklisted tag, opened anyway (a link, the
           post page): covered until you choose to see it */
        .s34-blcover {
            position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 10px; padding: 20px; text-align: center; background: #121216 !important; color: #e8e8ee !important; border-radius: 10px;
            font: 500 14px/1.45 system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-blcover b { font-size: 16px; color: #fff !important; }
        .s34-blcover .s34-blcover-tags { color: #ff8a8a !important; font-weight: 700; overflow-wrap: anywhere; }
        .s34-blcover button { margin-top: 4px; padding: 7px 14px; border-radius: 8px; border: 1px solid #4a4a56 !important; background: #24242a !important; color: #fff !important; font: 600 13px system-ui, sans-serif; cursor: pointer; }
        .s34-blcover button:hover { border-color: #ff5f8f !important; }
        .s34-pv-overlay.s34-pv-blocked .s34-pv-stage > :not(.s34-blcover) { visibility: hidden !important; }
        .s34-pv-overlay.s34-pv-blocked .s34-pv-stage { position: relative; }
        html.s34-post-pending #image, html.s34-post-pending #gelcomVideoPlayer, html.s34-post-pending .fluid_video_wrapper,
        html.s34-post-blocked #image, html.s34-post-blocked #gelcomVideoPlayer, html.s34-post-blocked .fluid_video_wrapper { visibility: hidden !important; }
        .s34-blcover-post { position: relative; inset: auto; min-height: 260px; max-width: 640px; margin: 10px 0; }
        span.thumb.s34-bl-marked .s34-badge { display: none; }
        /* (Beta 3.10) Soft block: blurred, a calm label with Show */
        span.thumb.s34-bl-soft .s34-bl-label { display: flex; align-items: center; justify-content: space-between; gap: 6px; background-color: rgba(28,28,36,0.9) !important; }
        span.thumb.s34-bl-soft .s34-bl-label span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s34-bl-show { pointer-events: auto; flex: none; padding: 2px 9px !important; border-radius: 99px; border: 1px solid rgba(255,255,255,.35) !important;
            background: rgba(255,255,255,.12) !important; color: #fff !important; font: 700 11px/1.3 system-ui, sans-serif; cursor: pointer; }
        .s34-bl-show:hover { background: #ff5f8f !important; border-color: #ff5f8f !important; }
        span.thumb.s34-bl-soft.s34-bl-unblur img:not(.s34-hover-video) { filter: none; }
        span.thumb.s34-bl-soft.s34-bl-unblur video { visibility: visible !important; }
        span.thumb.s34-bl-soft.s34-bl-unblur .s34-bl-label { display: none; }
        .s34-bl-label {
            position: absolute;
            top: 6px;
            left: 6px;
            right: 6px;
            z-index: 4;
            padding: 4px 8px;
            border-radius: 6px;
            background-color: rgba(190,30,30,0.88) !important;
            color: #fff !important;
            font: 700 11px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;
            pointer-events: none;
            overflow-wrap: anywhere;
        }
        .s34-chip .s34-chip-block:hover { color: #ff2d2d !important; }
        .s34-chip-more {
            pointer-events: auto;
            flex: none;
            padding: 0 6px;
            border-radius: 999px;
            background-color: rgba(18,18,22,0.85) !important;
            color: #c8c8d0 !important;
            font: 600 10.5px/1.6 system-ui, sans-serif;
            cursor: default;
        }

        .s34-chip-wait {
            align-self: flex-start;
            opacity: .65;
            font-style: italic;
            animation: s34-pulse 1.2s ease-in-out infinite;
        }
        @keyframes s34-pulse { 50% { opacity: .3; } }

        /* ---- Messages: a stack at the bottom (newest at the bottom, max 3) ---- */
        .s34-toasts {
            position: fixed;
            left: 50%;
            bottom: 24px;
            z-index: 100000;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            pointer-events: none;
            width: max-content;
            max-width: calc(100vw - 24px);
        }
        .s34-toast {
            position: relative;
            display: flex;
            align-items: center;
            gap: 14px;
            max-width: 100%;
            box-sizing: border-box;
            padding: 10px 16px;
            border-radius: 10px;
            background-color: #1c1c20 !important;
            border: 1px solid #33333a !important;
            color: #dcdce0 !important;
            font: 13px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            box-shadow: 0 8px 24px rgba(0,0,0,0.55);
            transform: translateY(16px);
            opacity: 0;
            pointer-events: none;
            transition: opacity .2s, transform .2s;
        }
        .s34-toast.s34-show { opacity: 1; transform: none; pointer-events: auto; }
        /* long file names wrap instead of running off the edge */
        .s34-toast > span:first-child { min-width: 0; flex: 1 1 auto; overflow-wrap: anywhere; text-align: left; }
        .s34-toast .s34-toast-close,
        .s34-toast .s34-toast-close:hover {
            background: transparent !important;
            border: none !important;
            padding: 0 2px !important;
            color: inherit !important;
            font: inherit;
            font-weight: 400;
            cursor: pointer;
            opacity: .6;
        }
        .s34-toast .s34-toast-close:hover { opacity: 1; }
        @media (max-width: 760px) {
            .s34-toasts { width: calc(100vw - 24px); bottom: 14px; }
            .s34-toast { width: 100%; }
        }

        /* ---- Popup viewer ---- */
        html.s34-pv-open { overflow: hidden !important; }
        /* Keep room for the scrollbar even while it's hidden by the popup,
           so the thumbnail rows don't get wider and shift around */
        html { scrollbar-gutter: stable; }
        .s34-pv-overlay {
            position: fixed;
            inset: 0;
            z-index: 99990;
            display: grid;
            grid-template-columns: 290px 1fr;
            background-color: rgba(8,8,10,0.94) !important;
            font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-pv-side {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-height: 0;
            overflow-y: auto;
            padding: 14px;
            background-color: #16161a !important;
            border-right: 1px solid #2a2a31 !important;
        }
        .s34-pv-top { display: flex; align-items: center; gap: 6px; }
        .s34-pv-nav {
            width: 34px;
            height: 30px;
            padding: 0 !important;
            border-radius: 8px;
            border: 1px solid #33333a !important;
            background-color: #24242a !important;
            color: #dcdce0 !important;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
        }
        .s34-pv-nav:hover { background-color: #2f2f37 !important; }
        .s34-pv-full {
            flex: 1;
            text-align: center;
            font-size: 12px;
            color: #8ab4f8 !important;
            text-decoration: none !important;
        }
        .s34-pv-full:hover { text-decoration: underline !important; }
        .s34-pv-close {
            font-size: 18px;
            padding: 0 6px;
            cursor: pointer;
            color: #dcdce0 !important;
            opacity: .7;
        }
        .s34-pv-close:hover { opacity: 1; }
        .s34-pv-tags h4 {
            margin: 12px 0 6px !important;
            font-size: 11px !important;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #9a9aa3 !important;
        }
        .s34-pv-chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .s34-pv-chips .s34-chip { font-size: 12px; }
        /* No hover needed in the popup: block buttons always visible */
        .s34-pv-chips .s34-chip .s34-chip-block {
            max-width: 20px;
            opacity: .75;
            padding: 0 7px 0 0 !important;
            transition: none;
        }
        .s34-pv-chips .s34-chip .s34-chip-block:hover { opacity: 1; }
        .s34-chip .s34-chip-add {
            all: unset;
            cursor: pointer;
            padding: 0 4px 0 1px;
            font: 700 13px/1 system-ui, sans-serif;
            color: #7ee07e !important;
            opacity: .75;
        }
        .s34-chip .s34-chip-add:hover { opacity: 1; color: #a6ffa6 !important; }
        .s34-chip .s34-chip-add, .s34-chip .s34-chip-block { background: transparent !important; border: none !important; }
        .s34-chip .s34-chip-add[data-state="in"],
        #tag-sidebar li a.r34-add-btn[data-state="in"] { color: #ffb86b !important; opacity: 1; }
        .s34-chip .s34-chip-add[data-state="out"],
        #tag-sidebar li a.r34-add-btn[data-state="out"] { color: #8ab4f8 !important; opacity: 1; }
        .s34-chip-count { font-size: 10.5px; opacity: .55; padding-right: 5px; color: #dcdce0 !important; }
        .s34-chip-copyright .s34-chip-name { color: #d68cff !important; }
        .s34-chip-general   .s34-chip-name { color: #8ab4f8 !important; }
        .s34-chip-metadata  .s34-chip-name { color: #ffb86b !important; }
        .s34-pv-note { margin-top: 8px; font-size: 11px; font-style: italic; opacity: .6; color: #dcdce0 !important; }

        .s34-pv-stage {
            position: relative;
            min-width: 0;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            cursor: zoom-out;
        }
        .s34-pv-media {
            width: 100%;
            height: 100%;
            object-fit: contain;
            cursor: default;
            background: transparent !important;
        }
        .s34-pv-placeholder { position: absolute; inset: 16px; width: calc(100% - 32px); height: calc(100% - 32px); filter: blur(6px); opacity: .6; }
        .s34-pv-media.s34-pv-loading { opacity: 0; position: absolute; }

        /* Cloudflare check window - same look as the other Steamy34 windows */
        .s34-panel.s34-cf-panel {
            width: min(860px, calc(100vw - 32px));
            border-radius: 18px;
            overflow: hidden;
            /* our window around the check gets the pink-to-purple glow
               (the check page inside stays exactly as Cloudflare sends it) */
            border: 1.5px solid transparent !important;
            background: linear-gradient(#17161c, #17161c) padding-box,
                        linear-gradient(135deg, rgba(255,95,143,0.9), rgba(139,61,255,0.9)) border-box !important;
            box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 28px rgba(255,95,143,0.28), 0 0 60px rgba(139,61,255,0.22);
            animation: s34-blm-in .16s ease-out;
        }
        .s34-cf-panel .s34-panel-head { padding: 18px 20px 6px; border-bottom: none !important; }
        .s34-cf-panel .s34-panel-head h2 { font-size: 18px !important; font-weight: 800; }
        .s34-cf-panel .s34-close {
            width: 32px; height: 32px; padding: 0; border-radius: 10px; font-size: 14px; line-height: 32px; text-align: center;
            background-color: rgba(255,255,255,0.06) !important; opacity: 1;
        }
        .s34-cf-panel .s34-close:hover { background-color: rgba(255,255,255,0.12) !important; }
        .s34-cf-note { padding: 0 20px 12px; font-size: 13px; opacity: .75; }
        .s34-cf-api { display: flex; align-items: center; gap: 14px; margin: 12px 20px 0; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); font-size: 12.5px; line-height: 1.45; }
        .s34-cf-api span { opacity: .85; }
        .s34-cf-api .s34-btn { flex: none; white-space: nowrap; }
        @media (max-width: 700px) { .s34-cf-api { flex-direction: column; align-items: stretch; } }
        .s34-cf-panel .s34-cf-frame { margin: 0 20px; width: calc(100% - 40px); border-radius: 12px; }
        .s34-cf-panel .s34-panel-foot { padding: 14px 20px 18px; border-top: none !important; gap: 8px; }
        .s34-cf-panel .s34-btn {
            height: 34px; padding: 0 14px; border-radius: 10px; font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
            background-color: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.12) !important;
        }
        .s34-cf-panel .s34-btn:hover { border-color: #ff5f8f !important; }
        .s34-cf-panel .s34-btn.s34-primary { background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; border: none !important; color: #fff !important; }
        .s34-cf-panel .s34-btn.s34-link { background: transparent !important; border-color: transparent !important; margin-right: auto; }
        .s34-batch button svg, .s34-vopts button svg { display: inline-block; vertical-align: -2px; }
        .s34-cf-frame {
            display: block;
            width: 100%;
            /* As tall as the screen allows (title, note and buttons need
               about 200px), so the tick box further down is always in view */
            height: min(820px, calc(100vh - 210px));
            min-height: 300px;
            border: 0 !important;
            border-top: 1px solid #2c2c33 !important;
            background-color: #fff !important;
        }
        .s34-toast button:not(.s34-toast-close) {
            padding: 4px 12px !important;
            border-radius: 6px;
            border: 1px solid #2f5fbf !important;
            background-color: #2f5fbf !important;
            color: #fff !important;
            font-weight: 600;
            cursor: pointer;
        }

        .s34-badge {
            z-index: 2;
            position: absolute;
            top: 6px;
            left: 6px;
            padding: 2px 6px;
            border-radius: 4px;
            font: bold 10px/1.4 sans-serif;
            letter-spacing: .5px;
            color: #fff !important;
            background: rgba(0,0,0,0.7) !important;
            pointer-events: none;
        }
        .s34-badge.s34-video { background: rgba(30,90,220,0.85) !important; }

        #paginator { text-align: center; margin: 16px 0; }
        /* Only one page (e.g. a short favourites list): no lone "1" */
        #paginator:not(:has(a)) { display: none !important; }

        /* Page divider: a line across with a "PAGE N" pill in the middle */
        .s34-page-divider {
            display: flex;
            align-items: center;
            gap: 14px;
            margin: 28px 0 14px;
        }
        .s34-page-divider::before,
        .s34-page-divider::after {
            content: '';
            flex: 1;
            height: 2px;
            border-radius: 2px;
            background: linear-gradient(90deg, transparent, #2f5fbf) !important;
        }
        .s34-page-divider::after {
            background: linear-gradient(90deg, #2f5fbf, transparent) !important;
        }
        .s34-page-divider span {
            padding: 5px 16px;
            border-radius: 999px;
            border: 1px solid #2f5fbf !important;
            background-color: rgba(47,95,191,0.18) !important;
            color: #cfe0ff !important;
            font: 700 13px/1 system-ui, -apple-system, Segoe UI, sans-serif;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .s34-page-divider.s34-first { margin-top: 6px; }
        .s34-scroll-status {
            text-align: center;
            padding: 20px 0 40px;
            min-height: 1px;
            opacity: .7;
            cursor: default;
        }
    `;

const BUTTON_CSS = `
        #tag-sidebar li a.r34-block-btn {
            margin-right: 4px;
            text-decoration: none;
            cursor: pointer;
            font-size: 11px;
            color: #888 !important;
        }
        #tag-sidebar li a.r34-block-btn:hover { color: #ff6b6b !important; }
        #tag-sidebar li a.r34-block-btn.blocked { color: #8ab4f8 !important; font-weight: bold; }
        #tag-sidebar li a.r34-add-btn {
            margin: 0 2px 0 4px !important;
            text-decoration: none !important;
            cursor: pointer;
            font-weight: 700;
            font-size: 13px;
            opacity: .75;
            color: #7ee07e !important;
        }
        #tag-sidebar li a.r34-add-btn:hover { opacity: 1; color: #a6ffa6 !important; }
    `;

const POST_TAGS_CSS = `
        #tag-sidebar {
            display: flex !important;
            flex-wrap: wrap;
            align-items: center;
            gap: 5px;
            margin: 0 !important;
            padding: 0 !important;
            list-style: none !important;
        }
        #tag-sidebar > li {
            list-style: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        /* Group titles (Copyright, Character, Artist, ...) take a full line */
        #tag-sidebar > li:not([class*="tag-type-"]) {
            flex-basis: 100%;
        }
        #tag-sidebar > li:not([class*="tag-type-"]) h6,
        #tag-sidebar > li:not([class*="tag-type-"]) b {
            display: block;
            margin: 10px 0 2px !important;
            font-size: 11px !important;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: .7;
        }

        /* The tag chips */
        #tag-sidebar > li[class*="tag-type-"] {
            display: inline-flex !important;
            align-items: center;
            gap: 5px;
            max-width: 100%;
            box-sizing: border-box;
            padding: 2px 8px 2px 10px !important;
            border-radius: 999px;
            background-color: rgba(18,18,22,0.85) !important;
            border: 1px solid rgba(255,255,255,0.14) !important;
            font: 600 12px/1.6 system-ui, -apple-system, Segoe UI, sans-serif;
            overflow-wrap: anywhere;
        }
        #tag-sidebar > li.tag-type-artist    { border-color: rgba(255,138,128,0.45) !important; }
        #tag-sidebar > li.tag-type-character { border-color: rgba(126,224,126,0.45) !important; }
        #tag-sidebar > li.tag-type-copyright { border-color: rgba(214,140,255,0.45) !important; }
        #tag-sidebar > li.tag-type-metadata  { border-color: rgba(255,184,107,0.45) !important; }
        #tag-sidebar > li[class*="tag-type-"] a { text-decoration: none !important; }
        #tag-sidebar > li[class*="tag-type-"] a:hover { text-decoration: underline !important; }

        /* "?" wiki link: small and quiet */
        #tag-sidebar > li[class*="tag-type-"] a[href*="page=wiki"] {
            font-size: 10px;
            opacity: .45;
        }
        /* Post count: small and muted */
        #tag-sidebar > li[class*="tag-type-"] span:not(.s34-chip-x) {
            font-size: 10.5px;
            font-weight: 400;
            opacity: .6;
        }

        /* Block / unblock button: always visible, at the end of the chip */
        #tag-sidebar > li[class*="tag-type-"] a.r34-block-btn {
            margin: 0 0 0 2px !important;
            font-size: 12px;
            opacity: .75;
            color: #ff6b6b !important;
        }
        #tag-sidebar > li[class*="tag-type-"] a.r34-block-btn:hover {
            opacity: 1;
            color: #ff2d2d !important;
            text-decoration: none !important;
        }
        #tag-sidebar > li[class*="tag-type-"] a.r34-block-btn.blocked {
            opacity: 1;
            color: #8ab4f8 !important;
        }

        /* Blacklisted tag: crossed out with a red outline */
        #tag-sidebar > li.s34-li-blocked { border-color: rgba(255,80,80,0.7) !important; }
        #tag-sidebar > li.s34-li-blocked a:not(.r34-block-btn):not([href*="page=wiki"]) {
            text-decoration: line-through !important;
            opacity: .7;
        }
    `;

const AC_CSS = `
        .s34-ac-wrap { position: relative; width: 100%; }
        /* Safety net: never show the site's own suggestion list next to ours */
        .s34-ac-wrap .awesomplete > ul:not(.s34-ac-list),
        .awesomplete:has(.s34-search) > ul:not(.s34-ac-list) { display: none !important; }
        ul.s34-ac-list {
            display: none;
            position: absolute;
            z-index: 1000;
            top: 100%;
            left: 0;
            width: 100%;
            box-sizing: border-box;
            max-height: 320px;
            overflow-y: auto;
            margin: 2px 0 0 !important;
            padding: 4px 0 !important;
            list-style: none !important;
            background-color: #1c1c20 !important;
            border: 1px solid #33333a !important;
            border-radius: 6px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.45);
        }
        ul.s34-ac-list li {
            padding: 4px 8px !important;
            margin: 0 !important;
            font-size: 12px;
            cursor: pointer;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        ul.s34-ac-list li.s34-ac-active {
            background-color: #2e2e36 !important;
        }
        ul.s34-ac-list li.s34-ac-copyright { color: #d68cff !important; }
        ul.s34-ac-list li.s34-ac-character { color: #7ee07e !important; }
        ul.s34-ac-list li.s34-ac-artist    { color: #ff8a80 !important; }
        ul.s34-ac-list li.s34-ac-metadata,
        ul.s34-ac-list li.s34-ac-meta      { color: #ffb86b !important; }
    `;

const EXTRA_CSS = `
        /* ♥ on thumbnails: top right, left of the viewed/downloaded mark */
        .s34-fav-btn {
            position: absolute;
            top: 6px;
            right: 6px;
            z-index: 4;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            border-radius: 50% !important;
            border: none !important;
            background-color: rgba(20,20,24,0.8) !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.45);
            color: #fff !important;
            fill: none;
            cursor: pointer;
            opacity: 0;
            transition: opacity .15s, transform .15s;
        }
        span.thumb:has(.s34-dl-mark) .s34-fav-btn { right: 34px; }
        span.thumb:hover .s34-fav-btn { opacity: .9; }
        .s34-fav-btn:hover { opacity: 1 !important; transform: scale(1.12); color: #ff6b7a !important; }
        .s34-fav-btn.s34-faved { opacity: 1; color: #ff6b7a !important; }
        /* (Beta 3.7.4 / 3.8) Download and viewed buttons in a column under the ♥ -
           never under the score pill, fits narrow (tall) thumbnails. While
           hovering all of them; otherwise only the ones that are on (green =
           downloaded, blue = viewed), like a favourited ♥ */
        .s34-tbtns { position: absolute; top: 34px; right: 6px; z-index: 5; display: flex; flex-direction: column; gap: 4px; pointer-events: none; }
        span.thumb:not(:has(.s34-fav-btn)):not(:has(.s34-dl-mark)) .s34-tbtns { top: 6px; }
        html.s34-tx-below span.thumb .s34-tbtns { top: 6px; }
        /* not hovering and no ♥ showing: the green / blue ones move up into the corner */
        span.thumb:not(:hover):not(:has(.s34-fav-btn.s34-faved)):not(:has(.s34-dl-mark)) .s34-tbtns { top: 6px; }
        .s34-tbtn {
            width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
            padding: 0 !important; border-radius: 50% !important; border: none !important;
            background-color: rgba(20,20,24,0.8) !important; box-shadow: 0 1px 4px rgba(0,0,0,0.45);
            color: #fff !important; cursor: pointer; pointer-events: auto; opacity: .9;
            transition: transform .15s;
        }
        .s34-tbtn:not(.s34-on):not(.s34-busy) { display: none; }
        span.thumb:hover .s34-tbtn { display: flex; }
        /* the eye and its strip: one item in the column (none while it's hidden) */
        .s34-tseen-wrap { position: relative; display: flex; pointer-events: auto; }
        span.thumb:not(:hover) .s34-tseen-wrap:not(:has(.s34-tseen.s34-on)) { display: none; }
        ${CONFIG.thumbMarks ? '' : 'span.thumb:not(:hover) .s34-tseen-wrap { display: none; }'}
        .s34-tseen-fly { position: absolute; right: 100%; top: 0; z-index: 6; display: none; gap: 4px; padding-right: 4px; white-space: nowrap; }
        .s34-tseen-wrap:hover .s34-tseen-fly { display: flex; }
        .s34-tseen-fly button {
            display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px 0 7px !important;
            border-radius: 12px !important; border: none !important; background-color: rgba(20,20,24,0.9) !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.45); color: #fff !important; font: 600 11px/1 system-ui, -apple-system, Segoe UI, sans-serif; cursor: pointer;
        }
        .s34-tseen-fly button svg { width: 12px; height: 12px; flex: none; pointer-events: none; }
        .s34-tseen-fly button span { pointer-events: none; }
        .s34-tseen-fly button:hover { filter: brightness(1.25); }
        .s34-tseen-fly button[data-m="viewed"].s34-on { background-color: rgba(52,98,196,0.95) !important; }
        .s34-tseen-fly button[data-m="dl"].s34-on { background-color: rgba(31,122,62,0.95) !important; }
        .s34-tseen-fly button.s34-on::after { content: '✓'; margin-left: 2px; }
        ${CONFIG.thumbMarks ? '' : 'span.thumb:not(:hover) .s34-tbtn.s34-on:not(.s34-busy) { display: none; }'}
        .s34-tbtn:hover { opacity: 1 !important; transform: scale(1.12); }
        .s34-tdl.s34-on { background-color: rgba(31,122,62,0.92) !important; }
        .s34-tseen.s34-on { background-color: rgba(52,98,196,0.92) !important; }
        .s34-tcoll.s34-on { background-color: rgba(201,138,26,0.92) !important; }
        .s34-tcoll:not(.s34-on):hover { color: #ffd27a !important; }
        .s34-tdl:not(.s34-on):hover { color: #6ee7a8 !important; }
        .s34-tseen:not(.s34-on):hover { color: #8ab4f8 !important; }
        .s34-tbtn svg { display: block; pointer-events: none; }
        .s34-tbtn.s34-busy { opacity: 1 !important; }
        .s34-tbtn.s34-busy svg { display: none; }
        .s34-tbtn .s34-spin { margin: 0; width: 12px; height: 12px; }
        @media (hover: none), (max-width: 760px), (pointer: coarse) and (max-width: 1000px) { .s34-tbtns { display: none !important; } }
        /* Favourites pages: rule34 wraps each thumbnail in an extra box (with
           "Remove" under it on your own list) - the box steps aside so the
           thumbnails join the normal grid, and the ♥ does the removing */
        ${CONFIG.favButtons ? `
        .image-list > span:has(> span.thumb) { display: contents !important; }
        .image-list > span:has(> span.thumb) > :is(br, a[onclick*="s=delete"]) { display: none !important; }` : ''}
        .image-list .s34-site-remove { display: none !important; }
        .image-list span.thumb.s34-unfaved { opacity: .35; filter: grayscale(1); transition: opacity .2s ease; }
        .image-list span.thumb.s34-unfaved:hover { opacity: .7; }

        /* Thumbnail extras only while hovering (the picture stays clean).
           visibility too, so hidden chips can't catch taps on phones.
           VID / GIF labels, NEW, viewed / downloaded marks and favourited
           hearts always stay (while hovering, the score pill takes the
           labels' place). */
        html.s34-tx-hover span.thumb :is(.s34-tagbar, .s34-fav-btn:not(.s34-faved)) {
            opacity: 0 !important;
            visibility: hidden;
            transition: opacity .15s, visibility 0s linear .15s;
        }
        html.s34-tx-hover span.thumb:hover :is(.s34-tagbar, .s34-fav-btn:not(.s34-faved)) {
            opacity: 1 !important;
            visibility: visible;
            transition: opacity .15s;
        }
        /* Phones (no hover, or the phone layout): nothing to hover, so the
           tags and ♥ are simply always there */
        @media (hover: none), (max-width: 760px), (pointer: coarse) and (max-width: 1000px) {
            html.s34-tx-hover span.thumb :is(.s34-tagbar, .s34-tagbar:not(.s34-x)) { opacity: 1 !important; visibility: visible; }
            html.s34-tx-hover span.thumb :is(.s34-fav-btn, .s34-fav-btn:not(.s34-faved)) { opacity: .85 !important; visibility: visible; }
        }
        .s34-fav-btn.s34-faved svg, .s34-pv-fav.s34-faved svg { fill: currentColor; }
        .s34-fav-btn svg, .s34-pv-fav svg { display: block; pointer-events: none; }

        /* Score & resolution while hovering (the labels step aside meanwhile) */
        .s34-info {
            position: absolute;
            top: 6px;
            left: 6px;
            z-index: 4;
            padding: 3px 8px;
            border-radius: 6px;
            background-color: rgba(20,20,24,0.85) !important;
            color: #fff !important;
            font: 600 11px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity .15s;
        }
        span.thumb:hover .s34-info { opacity: 1; }
        /* narrow thumbnails: the pill stops before the ♥ / corner mark (cut off with …) */
        .s34-info { max-width: calc(100% - 12px); overflow: hidden; text-overflow: ellipsis; box-sizing: border-box; }
        span.thumb:has(.s34-fav-btn) .s34-info, span.thumb:has(.s34-dl-mark) .s34-info { max-width: calc(100% - 46px); }
        span.thumb:has(.s34-fav-btn):has(.s34-dl-mark) .s34-info { max-width: calc(100% - 74px); }
        /* The pill takes the labels' place while hovering, so nothing
           overlaps (a hovered video plays anyway). In "Below" the labels sit
           in the strip, out of the pill's way, and stay. */
        html:not(.s34-tx-below) body span.thumb:hover:has(.s34-info) .s34-badge,
        html body span.thumb:hover:has(.s34-info) .s34-new-badge { opacity: 0 !important; }
        .s34-info.s34-info-loading::after { content: '  ·  …'; opacity: .6; }

        /* NEW since the last visit of a saved search */
        .s34-new-badge {
            position: absolute;
            top: 6px;
            left: 6px;
            z-index: 3;
            padding: 2px 6px;
            border-radius: 4px;
            background-color: #e0457b !important;
            color: #fff !important;
            font: bold 10px/1.4 sans-serif;
            letter-spacing: .5px;
            pointer-events: none;
        }
        span.thumb:has(.s34-new-badge) .s34-badge { left: 46px; }

        /* Hide viewed / downloaded (not the ones you opened just now) */
        html.s34-hide-viewed .image-list span.thumb.s34-was-viewed:not(.s34-touched-now),
        html.s34-hide-downloaded .image-list span.thumb.s34-was-downloaded:not(.s34-touched-now) {
            display: none !important;
        }

        /* Sidebar quick controls */
        .s34-quick {
            display: flex;
            flex-direction: column;
            gap: 7px;
            margin: 12px 0;
            padding: 10px;
            border-radius: 10px;
            box-sizing: border-box;
            width: 100%;
            font: 12px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            background-color: #18181c !important;
            border: 1px solid #2e2e36 !important;
        }
        .s34-q-switch {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            user-select: none;
        }
        .s34-q-switch input { display: none; }
        /* The site's own AI switch: replaced by the matching one in the panel */
        .s34-ai-original, .s34-site-hidden { display: none !important; }
        .s34-q-track {
            position: relative;
            flex: none;
            width: 30px;
            height: 16px;
            border-radius: 999px;
            background-color: #3a3a44 !important;
            transition: background-color .15s;
        }
        .s34-q-track::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #fff;
            transition: transform .15s;
        }
        .s34-q-switch input:checked + .s34-q-track { background-color: #2c5fcc !important; }
        .s34-q-switch input:checked + .s34-q-track::after { transform: translateX(14px); }
        .s34-q-theme {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            padding: 3px;
            border-radius: 8px;
            background-color: rgba(0,0,0,0.3) !important;
            border: 1px solid #2e2e36 !important;
        }
        .s34-quick .s34-q-theme button {
            height: 24px;
            padding: 0 !important;
            border-radius: 6px;
            border: none !important;
            background: transparent !important;
            color: #9a9aa3 !important;
            font: 600 11.5px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
        }
        .s34-quick .s34-q-theme button:hover { color: #e8e8ee !important; }
        .s34-quick .s34-q-theme button.s34-on { background-color: #2c5fcc !important; color: #fff !important; }
        .s34-q-size { display: flex; align-items: center; gap: 8px; }
        .s34-q-size span { opacity: .7; }
        .s34-quick .s34-q-size input[type="range"] {
            flex: 1;
            min-width: 0;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            accent-color: #2c5fcc;
            cursor: pointer;
        }
        .s34-quick .s34-q-select {
            display: block;
            width: 100%;
            height: 30px;
            box-sizing: border-box;
            margin: 2px 0 0 !important;
            padding: 0 10px !important;
            border-radius: 7px;
            cursor: pointer;
            font: 600 12.5px/28px system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            background-color: #222228 !important;
            border: 1px solid #3a3a44 !important;
        }
        .s34-quick .s34-q-select:hover,
        .s34-quick .s34-q-select.s34-on { border-color: #3a6fd4 !important; }

        /* Select mode */
        html.s34-selecting .image-list span.thumb { cursor: pointer; }
        html.s34-selecting .image-list span.thumb::after {
            content: '';
            position: absolute;
            top: 8px;
            left: 8px;
            z-index: 6;
            width: 18px;
            height: 18px;
            border-radius: 5px;
            border: 2px solid #fff;
            background-color: rgba(0,0,0,0.45);
            box-shadow: 0 1px 4px rgba(0,0,0,0.6);
            pointer-events: none;
        }
        html.s34-selecting .image-list span.thumb.s34-selected { outline: 3px solid #2c5fcc; outline-offset: -3px; }
        html.s34-selecting .image-list span.thumb.s34-selected::after {
            content: '✓';
            color: #fff;
            font: 700 13px/18px system-ui, sans-serif;
            text-align: center;
            background-color: #2c5fcc;
            border-color: #2c5fcc;
        }
        .s34-batch {
            position: fixed;
            left: 50%;
            bottom: 22px;
            transform: translateX(-50%);
            z-index: 99995;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px 8px 16px;
            border-radius: 12px;
            background-color: #1c1c22 !important;
            border: 1px solid #3a3a44 !important;
            color: #e8e8ec !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6);
            font: 13px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-batch-status { margin-right: 6px; white-space: nowrap; }
        .s34-batch button {
            height: 30px;
            padding: 0 12px !important;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12.5px;
            background-color: #26262d !important;
            border: 1px solid #3a3a44 !important;
            color: #e8e8ec !important;
        }
        .s34-batch button:hover { border-color: #3a6fd4 !important; }
        .s34-batch button.s34-batch-go { background-color: #2c5fcc !important; border-color: #2c5fcc !important; font-weight: 600; }
        .s34-batch button:disabled { opacity: .45; cursor: default; }

        /* Video options (popup and single post) */
        .s34-vopts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .s34-vopts[hidden], .s34-pv-vopts[hidden] { display: none !important; }
        .s34-vopts button, .s34-vopts select {
            height: 28px;
            border-radius: 7px;
            cursor: pointer;
            font-size: 12px;
            background-color: #222228 !important;
            border: 1px solid #3a3a44 !important;
            color: #e8e8ec !important;
        }
        .s34-vopts button { flex: 1; padding: 0 8px !important; white-space: nowrap; }
        .s34-vopts button.s34-on { border-color: #3a6fd4 !important; }
        .s34-vopt-speed { display: flex; align-items: center; gap: 5px; font-size: 12px; white-space: nowrap; }
        .s34-vopt-speed select { padding: 0 4px !important; }

        /* Popup: favourite button */
        .s34-pv-fav {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            height: 34px;
            border-radius: 8px;
            cursor: pointer;
            font: 600 13px system-ui, -apple-system, Segoe UI, sans-serif;
            background-color: #24242a !important;
            border: 1px solid #3a3a44 !important;
            color: #e8e8ec !important;
            fill: none;
        }
        .s34-pv-fav:hover { border-color: #ff5c8a !important; }
        .s34-pv-fav.s34-faved { color: #ff6b7a !important; border-color: rgba(255,107,122,0.6) !important; }

    `;

export { AC_CSS, BUTTON_CSS, CORE_CSS, DARK_CSS, EXTRA_CSS, GRID_CSS, POST_TAGS_CSS };
