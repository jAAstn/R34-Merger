// styles/site – Steamy34 (aus Steamy34.js aufgeteilt)
const ACCOUNT_CSS = `
        /* The site's own list / table stay in the page, hidden */
        #user-index.s34-acc-on > :not(.s34-acc) { display: none !important; }
        #user-edit.s34-opt-on > p, #user-edit.s34-opt-on form > table { display: none !important; }

        .s34-acc, .s34-opt {
            --acc-line: #2a2a31;
            --acc-card: #121216;
            --acc-card-2: #18181d;
            --acc-fg: #ececf1;
            --acc-muted: #9a9aa6;
            box-sizing: border-box;
            max-width: 1080px;
            margin: 8px auto 40px;
            padding: 0 4px;
            color: var(--acc-fg) !important;
            font: 13.5px/1.45 system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left;
        }
        .s34-acc *, .s34-opt * { box-sizing: border-box; }

        /* ---- My Account ---- */
        .s34-acc-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 22px; }
        .s34-acc-avatar {
            width: 52px; height: 52px; border-radius: 50%; flex: none;
            display: grid; place-items: center;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important;
        }
        .s34-acc-avatar svg { width: 26px; height: 26px; }
        .s34-acc-name { flex: 1; min-width: 150px; display: flex; flex-direction: column; }
        .s34-acc-name b { font-size: 20px; font-weight: 800; color: var(--acc-fg) !important; }
        .s34-acc-name small { color: var(--acc-muted) !important; font-size: 12.5px; }
        .s34-acc-headbtns { display: flex; gap: 8px; flex-wrap: wrap; }
        .s34-acc .s34-acc-btn, .s34-opt .s34-opt-btn {
            display: inline-flex; align-items: center; gap: 7px;
            height: 34px; padding: 0 14px !important; border-radius: 9px;
            border: 1px solid #3a3a44 !important; background: #222228 !important; color: #e8e8ee !important;
            font: 600 13px system-ui, -apple-system, Segoe UI, sans-serif; text-decoration: none !important;
            cursor: pointer; white-space: nowrap;
        }
        .s34-acc .s34-acc-btn:hover, .s34-opt .s34-opt-btn:hover { border-color: #ff5f8f !important; background: #26262d !important; color: #fff !important; }
        .s34-acc-btn svg { width: 16px; height: 16px; }

        .s34-acc-label { display: flex; align-items: center; gap: 8px; margin: 18px 0 8px; }
        .s34-acc-label span { font: 800 11px system-ui, -apple-system, Segoe UI, sans-serif; letter-spacing: .8px; text-transform: uppercase; color: var(--acc-muted) !important; }
        .s34-acc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
        .s34-acc .s34-acc-tile {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 13px 14px !important; margin: 0; border-radius: 12px;
            border: 1px solid var(--acc-line) !important; background: var(--acc-card) !important;
            color: var(--acc-fg) !important; text-decoration: none !important; text-align: left;
            font: inherit; cursor: pointer; min-width: 0; width: 100%;
            transition: border-color .15s ease, background-color .15s ease, transform .15s ease;
        }
        .s34-acc .s34-acc-tile:hover { border-color: #4a4a55 !important; background: var(--acc-card-2) !important; transform: translateY(-1px); }
        .s34-acc .s34-acc-tile:focus-visible { outline: 2px solid #ff5f8f; outline-offset: 2px; }
        .s34-acc-ico {
            width: 36px; height: 36px; border-radius: 10px; flex: none; display: grid; place-items: center;
            border: 1px solid var(--acc-line) !important; background: #1c1c22 !important; color: #c9c9d3 !important;
        }
        .s34-acc-txt { display: flex; flex-direction: column; min-width: 0; }
        .s34-acc-txt b { color: #f2f2f5 !important; font-size: 14px; font-weight: 700; }
        .s34-acc-txt small { color: var(--acc-muted) !important; font-size: 12.5px; line-height: 1.4; }
        .s34-acc-quiet .s34-acc-tile { background: transparent !important; }
        .s34-acc-quiet .s34-acc-ico { background: transparent !important; }

        /* ---- Options ---- */
        .s34-opt { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 18px; align-items: start; }
        .s34-opt-nav { position: sticky; top: 12px; display: flex; flex-direction: column; gap: 2px; }
        .s34-opt-nav button {
            all: unset; border: none !important; box-sizing: border-box; display: block; padding: 8px 12px; border-radius: 9px; cursor: pointer;
            color: #b9b9c3 !important; font: 600 13.5px system-ui, -apple-system, Segoe UI, sans-serif;
            background: transparent !important;
        }
        .s34-opt-nav button:hover { color: #fff !important; background: #17171c !important; }
        .s34-opt-nav button.s34-on { color: #fff !important; background: #1d1d23 !important; box-shadow: inset 3px 0 0 #ff5f8f; }
        .s34-opt-nav button:focus-visible { outline: 2px solid #ff5f8f; }
        .s34-opt-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        .s34-opt-card {
            padding: 6px 18px 8px; border-radius: 14px; scroll-margin-top: 12px;
            border: 1px solid var(--acc-line) !important; background: var(--acc-card) !important;
        }
        .s34-opt .s34-opt-h {
            margin: 10px 0 2px !important; padding: 0 !important; border: none !important;
            font: 800 11px system-ui, -apple-system, Segoe UI, sans-serif !important; letter-spacing: .8px; text-transform: uppercase;
            color: var(--acc-muted) !important; background: none !important;
        }
        .s34-opt-row {
            display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 20px; align-items: center;
            padding: 13px 0; border-top: 1px solid #1f1f25;
        }
        .s34-opt-h + .s34-opt-row { border-top: none; }
        .s34-opt-row.s34-opt-wide { grid-template-columns: minmax(0, 1fr); }
        .s34-opt-txt { display: flex; flex-direction: column; min-width: 0; }
        .s34-opt-txt b { color: #f2f2f5 !important; font-size: 14px; font-weight: 700; }
        .s34-opt-txt small { color: var(--acc-muted) !important; font-size: 12.5px; line-height: 1.45; }
        .s34-opt-ctl { min-width: 0; }
        .s34-opt-wide .s34-opt-ctl { display: flex; flex-direction: column; gap: 10px; }
        .s34-opt-auto .s34-opt-seg { opacity: .55; }
        .s34-opt-locked .s34-opt-txt { padding-left: 30px; position: relative; }
        .s34-opt-lock { position: absolute; left: 0; top: 1px; color: #9a9aa6 !important; }

        /* inputs the site's fields became */
        .s34-opt input.s34-opt-num, .s34-opt input[type="text"], .s34-opt textarea, .s34-opt select {
            box-sizing: border-box; border-radius: 8px !important;
            border: 1px solid #3a3a44 !important; background: #0d0d10 !important; color: #e8e8ee !important;
            font: 13.5px system-ui, -apple-system, Segoe UI, sans-serif; padding: 6px 10px !important;
        }
        .s34-opt input.s34-opt-num { width: 84px; height: 34px; text-align: center; }
        .s34-opt textarea { width: 100% !important; min-height: 64px; resize: vertical; }
        .s34-opt input:focus, .s34-opt textarea:focus, .s34-opt select:focus { outline: none; border-color: #ff5f8f !important; }
        .s34-opt .awesomplete { display: block; width: 100%; }

        /* a row of choices (it clicks the site's own radio buttons) */
        .s34-opt-seg { display: inline-flex; flex-wrap: wrap; padding: 3px; gap: 2px; border-radius: 10px; border: 1px solid #33333c !important; background: #0d0d10 !important; }
        .s34-opt-seg button {
            all: unset; box-sizing: border-box; padding: 6px 12px; border-radius: 7px; cursor: pointer; white-space: nowrap;
            color: #a9a9b3 !important; font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif; background: transparent !important;
            border: none !important;
        }
        .s34-opt-wide .s34-opt-ctl > .s34-opt-seg { align-self: flex-start; }
        .s34-opt-seg button:hover:not(:disabled) { color: #fff !important; }
        .s34-opt-seg button.s34-on { color: #fff !important; background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; }
        .s34-opt-seg button:disabled { cursor: default; }
        .s34-opt-seg button:focus-visible { outline: 2px solid #ff5f8f; }

        /* the blacklist: Steamy34's Blacklist panel, inline (styles in 06b) */
        .s34-opt-bl { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }
        .s34-opt-picked[hidden] { display: none; }
        .s34-opt-picked {
            margin: 0 !important; padding: 9px 12px; border-radius: 10px; font-size: 13px;
            border: 1px solid rgba(95,208,138,0.35) !important; background: rgba(95,208,138,0.08) !important; color: #9fe3b8 !important;
        }
        .s34-opt .s34-opt-btn:disabled { opacity: .6; cursor: default; }

        .s34-opt-fold { padding: 4px 0 8px; }
        .s34-opt-fold[hidden] { display: none; }
        .s34-opt-fold ul { margin: 6px 0 0 18px; color: var(--acc-muted) !important; }
        .s34-opt-api textarea { width: 100% !important; }

        /* Save: the site's own button, kept in reach at the bottom */
        .s34-opt-save {
            position: sticky; bottom: 0; z-index: 5;
            display: flex; align-items: center; justify-content: flex-end; gap: 10px;
            padding: 12px 64px 12px 0; /* (room for the Steamy34 button in the corner) */
            background: linear-gradient(to bottom, transparent, #000 40%) !important;
        }
        html.s34-theme-dark .s34-opt-save { background: linear-gradient(to bottom, transparent, #0e0e11 40%) !important; }
        .s34-opt-dirty { margin-right: auto; color: #ffb347 !important; font-weight: 700; font-size: 12.5px; }
        .s34-opt input.s34-opt-submit {
            height: 36px; padding: 0 26px !important; border-radius: 9px !important; border: none !important; cursor: pointer;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important; font: 700 14px system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-opt input.s34-opt-submit:hover { filter: brightness(1.1); }

        @media (max-width: 760px) {
            .s34-acc, .s34-opt { padding: 0; margin-top: 4px; }
            .s34-acc-grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
            .s34-acc-headbtns { width: 100%; }
            .s34-acc-headbtns > * { flex: 1; justify-content: center; }
            .s34-opt { grid-template-columns: minmax(0, 1fr); gap: 10px; }
            .s34-opt-nav { flex-direction: row; overflow-x: auto; top: 0; z-index: 6; padding: 6px 0; scrollbar-width: none; background: #000 !important; }
            .s34-opt-nav::-webkit-scrollbar { display: none; }
            .s34-opt-nav button { white-space: nowrap; }
            .s34-opt-nav button.s34-on { box-shadow: inset 0 -2px 0 #ff5f8f; }
            .s34-opt-card { padding: 4px 14px 6px; }
            .s34-opt-row { grid-template-columns: minmax(0, 1fr); }
        }
        @media (prefers-reduced-motion: reduce) {
            .s34-acc .s34-acc-tile { transition: none; }
        }
    `;

const SEARCH_CSS = `
        .s34-sb { width: 100%; box-sizing: border-box; font: 12px/1.4 system-ui, -apple-system, Segoe UI, sans-serif; }
        .s34-sb-box {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px;
            min-height: 32px;
            padding: 4px 26px 4px 4px;
            position: relative;
            box-sizing: border-box;
            border-radius: 8px;
            cursor: text;
            background-color: #18181c !important;
            border: 1px solid #3a3a44 !important;
        }
        .s34-sb-box:focus-within { border-color: #3a6fd4 !important; }
        .s34-sb-pills { display: contents; }
        .s34-sb-box .s34-ac-wrap { flex: 1 1 70px; width: auto; min-width: 70px; }
        .s34-sb .s34-sb-input {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
            border: none !important;
            outline: none !important;
            background: transparent !important;
            padding: 3px 4px !important;
            font: inherit;
            font-size: 13px;
            color: #e8e8ec !important;
        }
        .s34-sb .s34-ac-list { min-width: 200px; }
        .s34-sb .s34-sb-clear {
            position: absolute;
            top: 6px;
            right: 4px;
            border: none !important;
            background: transparent !important;
            padding: 0 4px !important;
            cursor: pointer;
            font-size: 12px;
            opacity: .5;
            color: inherit !important;
        }
        .s34-sb .s34-sb-clear:hover { opacity: 1; color: #ff6b6b !important; }

        /* Tag chips inside the box */
        .s34-pill {
            display: inline-flex;
            align-items: center;
            max-width: 100%;
            box-sizing: border-box;
            border-radius: 999px;
            padding: 1px 2px 1px 8px;
            font-weight: 600;
            background-color: rgba(255,255,255,0.06) !important;
            border: 1px solid rgba(138,180,248,0.45) !important;
            color: #8ab4f8 !important;
        }
        .s34-pill-artist    { color: #ff8a80 !important; border-color: rgba(255,138,128,0.5) !important; }
        .s34-pill-character { color: #7ee07e !important; border-color: rgba(126,224,126,0.5) !important; }
        .s34-pill-copyright { color: #d68cff !important; border-color: rgba(214,140,255,0.5) !important; }
        .s34-pill-metadata  { color: #ffb86b !important; border-color: rgba(255,184,107,0.5) !important; }
        .s34-pill.s34-pill-ex {
            border-style: dashed !important;
            border-color: rgba(255,80,80,0.75) !important;
            background-color: rgba(255,60,60,0.10) !important;
        }
        .s34-pill.s34-pill-ex .s34-pill-text { text-decoration: line-through; }
        .s34-pill-text { cursor: pointer; overflow-wrap: anywhere; }
        .s34-sb .s34-pill-x {
            border: none !important;
            background: transparent !important;
            padding: 0 5px 0 4px !important;
            margin: 0;
            cursor: pointer;
            font-size: 13px;
            line-height: 1;
            opacity: .55;
            color: inherit !important;
        }
        .s34-sb .s34-pill-x:hover { opacity: 1; color: #ff6b6b !important; }

        /* Everything stacked with even spacing, never wider than the sidebar */
        .s34-sb { display: flex; flex-direction: column; gap: 8px; max-width: 100%; }
        .s34-sb > * { min-width: 0; }

        /* Filters: tidy 2 x 2 grid */
        .s34-sb-filters {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
        }
        .s34-sb-filter { display: flex; flex-direction: column; gap: 2px; min-width: 0; margin: 0 !important; }
        .s34-sb-filter-top { display: flex; align-items: center; justify-content: space-between; min-height: 16px; }
        .s34-sb-filter-top > span {
            font-size: 9.5px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .8px;
            opacity: .5;
            padding-left: 2px;
        }
        /* Pin: keep this filter for every new search */
        .s34-sb .s34-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 16px;
            padding: 0 !important;
            border: none !important;
            border-radius: 4px;
            background: transparent !important;
            color: #9a9aa3 !important;
            cursor: pointer;
            opacity: .45;
            transition: opacity .12s;
        }
        .s34-sb .s34-pin svg { display: block; transform: rotate(35deg); }
        .s34-sb-filter:hover .s34-pin { opacity: .8; }
        .s34-sb .s34-pin:hover { opacity: 1; color: #8ab4f8 !important; }
        .s34-sb .s34-pin.s34-on { opacity: 1; color: #ffb347 !important; }
        .s34-sb .s34-pin.s34-on svg { fill: currentColor; transform: none; }
        .s34-sb-filter.s34-pinned .s34-sb-filter-top > span { opacity: .9; color: #ffb347 !important; }
        /* "pinned" / "paused" sits right next to the pin it belongs to */
        .s34-sb .s34-pin.s34-on { width: auto; gap: 3px; padding: 0 1px 0 3px !important; }
        .s34-sb .s34-pin.s34-on::before { content: 'pinned'; font: 500 10px/1 system-ui, -apple-system, Segoe UI, sans-serif; color: inherit; white-space: nowrap; }
        .s34-sb .s34-sb-filter.s34-pinned select,
        .s34-sb .s34-sb-filter.s34-pinned select.s34-sb-set { border-color: #c98a2e !important; color: #ffcf8a !important; }
        .s34-sb .s34-sb-filter select {
            width: 100%;
            min-width: 0;
            height: 26px;
            box-sizing: border-box;
            padding: 0 4px !important;
            margin: 0 !important;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            background-color: #18181c !important;
            border: 1px solid #3a3a44 !important;
        }
        .s34-sb .s34-sb-filter select.s34-sb-set {
            border-color: #3a6fd4 !important;
            color: #8ab4f8 !important;
        }

        /* Favourite tags */
        .s34-ft {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 8px;
            border-radius: 8px;
            background-color: #18181c !important;
            border: 1px solid #2e2e36 !important;
        }
        .s34-ft-head { display: flex; align-items: center; justify-content: space-between; }
        .s34-ft-head > span {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .8px;
            opacity: .6;
        }
        .s34-sb .s34-ft-edit {
            padding: 0 6px !important;
            border: none !important;
            background: transparent !important;
            color: #8ab4f8 !important;
            font-size: 11px;
            cursor: pointer;
        }
        .s34-sb .s34-ft-edit[hidden] { display: none; }
        .s34-ft-chips { display: flex; flex-wrap: wrap; gap: 4px; }
        .s34-ft-hint { font-size: 11px; font-style: italic; opacity: .55; }
        .s34-ft-chip {
            display: inline-flex;
            align-items: center;
            max-width: 100%;
            border-radius: 999px;
            font-weight: 600;
            font-size: 11.5px;
            line-height: 20px;
            background-color: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(138,180,248,0.4) !important;
            color: #8ab4f8 !important;
        }
        .s34-ft-name { padding: 0 8px; cursor: pointer; overflow-wrap: anywhere; }
        .s34-ft-chip:hover { background-color: rgba(255,255,255,0.09) !important; }
        /* Already in the search: filled */
        .s34-ft-chip.s34-ft-in {
            background-color: rgba(44,95,204,0.35) !important;
            border-color: #3a6fd4 !important;
        }
        .s34-ft-chip.s34-ft-in .s34-ft-name::before { content: '✓ '; }
        /* Excluded: red, crossed out */
        .s34-ft-chip.s34-ft-out { border: 1px dashed rgba(255,80,80,0.75) !important; background-color: rgba(255,60,60,0.10) !important; }
        .s34-ft-chip.s34-ft-out .s34-ft-name { text-decoration: line-through; }
        .s34-sb .s34-ft-x {
            border: none !important;
            background: transparent !important;
            padding: 0 6px 0 0 !important;
            cursor: pointer;
            font-size: 13px;
            line-height: 1;
            opacity: .6;
            color: inherit !important;
        }
        .s34-sb .s34-ft-x:hover { opacity: 1; color: #ff6b6b !important; }
        .s34-ft-add { display: none; }
        .s34-ft.s34-ft-editing .s34-ft-add { display: block; }
        .s34-sb .s34-ft-input {
            width: 100%;
            height: 26px;
            box-sizing: border-box;
            padding: 0 7px !important;
            border-radius: 6px;
            font-size: 12px;
            background-color: #111114 !important;
            border: 1px solid #3a3a44 !important;
        }

        /* Search button (the site's own, moved under the filters) */
        .s34-sb .s34-sb-submit {
            display: block !important;            /* the site's phone layout hides its own */
            visibility: visible !important;
            position: static !important;
            opacity: 1 !important;
            width: 100% !important;
            height: 30px;
            box-sizing: border-box;
            margin: 0 !important;
            border-radius: 8px;
            border: 1px solid #2f5fbf !important;
            background-color: #2c5fcc !important;
            color: #fff !important;
            font: 600 13px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
        }
        .s34-sb .s34-sb-submit:hover { background-color: #3a6fd4 !important; }
        /* Search + the square disk button: save this search (Beta 3.7) */
        .s34-sb-gorow { display: flex; gap: 6px; }
        .s34-sb .s34-sb-gorow .s34-sb-submit { flex: 1; min-width: 0; width: auto !important; }
        .s34-sb .s34-sb-save {
            flex: none; width: 30px; height: 30px; box-sizing: border-box; padding: 0 !important; margin: 0;
            display: grid; place-items: center; cursor: pointer; border-radius: 8px;
            border: 1px solid #3a3a44 !important; background-color: #1c1c22 !important; color: #b9b9c3 !important;
        }
        .s34-sb .s34-sb-save svg { display: block; pointer-events: none; }
        .s34-sb .s34-sb-save svg * { color: inherit !important; }
        .s34-sb .s34-sb-save:hover { border-color: #8ab4f8 !important; color: #fff !important; }
        .s34-sb .s34-sb-save.s34-on { border-color: rgba(138,180,248,0.65) !important; background-color: rgba(138,180,248,0.14) !important; color: #8ab4f8 !important; }
        .s34-sb .s34-sb-save.s34-on svg path:first-child { fill: currentColor; fill-opacity: .3; }
        .s34-sb .s34-sb-save:focus-visible { outline: 2px solid #8ab4f8; outline-offset: 2px; }

        /* 🕘 Recent · ★ Tags · 🔔 (follow this search) - one list opens below */
        .s34-sb-tools {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 6px;
        }
        .s34-sb .s34-sb-tools .s34-sb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 0 6px !important; }
        .s34-sb .s34-sb-tools .s34-sb-btn > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .s34-sb .s34-sb-tools .s34-sb-btn svg { flex: none; opacity: .75; }
        .s34-sb .s34-sb-tools .s34-sb-btn svg * { color: inherit !important; }
        .s34-sb .s34-sb-tools .s34-sb-btn.s34-sb-open svg { opacity: 1; color: #8ab4f8 !important; }
        .s34-sb .s34-ft[hidden], .s34-sb .s34-sb-menu[hidden] { display: none !important; }
        /* Narrow sidebar (the real site's is ~165px): words only, no icons */
        .s34-sb-tools { container-type: inline-size; }
        @container (max-width: 215px) {
            .s34-sb .s34-sb-tools .s34-sb-btn svg { display: none; }
            .s34-sb .s34-sb-tools .s34-sb-btn { padding: 0 4px !important; }
        }
        .s34-sr { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        .s34-sb .s34-sb-btn {
            min-width: 0;
            height: 26px;
            box-sizing: border-box;
            padding: 0 8px !important;
            margin: 0 !important;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: left;
            background-color: #18181c !important;
            border: 1px solid #3a3a44 !important;
        }
        /* The site's "search options" gear (phone layout): hidden - it
           covered the Steamy34 search box and only unfolded a heading */
        #displayOptsLink { display: none !important; }
        .s34-sb .s34-sb-btn:hover { border-color: #3a6fd4 !important; }
        .s34-sb-caret { display: inline-block; width: 11px; opacity: .7; }
        .s34-sb .s34-sb-btn.s34-sb-open { border-color: #3a6fd4 !important; }
        .s34-sb-menu {
            margin-top: -2px;
            padding: 6px;
            max-height: 50vh;
            overflow-y: auto;
            border-radius: 8px;
            background-color: #1c1c20 !important;
            border: 1px solid #33333a !important;
        }
        .s34-sb-menu[hidden] { display: none !important; }
        /* Recent · Tags as small menus next to the sidebar (Beta 3.6), like
           "Follow which artist?" */
        .s34-sb .s34-sb-pop {
            position: fixed;
            z-index: 100004;
            margin: 0;
            max-height: min(60vh, 520px);
            overflow-y: auto;
            box-sizing: border-box;
            padding: 8px;
            border-radius: 10px;
            background-color: #1c1c20 !important;
            border: 1px solid #3a3a44 !important;
            box-shadow: 0 12px 32px rgba(0,0,0,0.55);
        }
        /* the add field right under the title (its suggestions then drop over the tags) */
        .s34-sb-pop .s34-ft-add { order: 1; }
        .s34-sb-pop .s34-ft-chips { order: 2; }
        /* Phones: a sheet from the bottom over the dimmed page - bigger to tap,
           swipe it down (or tap the page, or Back) to close */
        .s34-sb .s34-sb-pop.s34-sb-sheet {
            top: auto;
            left: 0;
            right: 0;
            bottom: 0;
            width: auto;
            max-height: 72vh;
            padding: 24px 14px calc(16px + env(safe-area-inset-bottom, 0px));
            border-radius: 16px 16px 0 0;
            border-bottom: 0 !important;
            overscroll-behavior: contain;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
            animation: s34-sheet-up .22s ease-out;
        }
        .s34-sb-pop.s34-sb-sheet::before {
            content: '';
            position: absolute;
            top: 8px;
            left: 50%;
            width: 40px;
            height: 4px;
            margin-left: -20px;
            border-radius: 2px;
            background-color: #4a4a56 !important;
        }
        @keyframes s34-sheet-up { from { transform: translateY(100%); } to { transform: none; } }
        .s34-sheet-backdrop {
            position: fixed;
            inset: 0;
            z-index: 100003;
            background-color: rgba(0,0,0,0.5) !important;
            animation: s34-sheet-fade .2s ease-out;
        }
        @keyframes s34-sheet-fade { from { opacity: 0; } }
        html.s34-sheet-open { overflow: hidden !important; }
        .s34-sb-sheet .s34-sb-item-main { padding: 9px 8px; font-size: 14px; }
        .s34-sb .s34-sb-sheet .s34-sb-item-del { padding: 0 12px !important; font-size: 15px; }
        .s34-sb-sheet .s34-sb-menu-head, .s34-sb-sheet .s34-ft-head > span { font-size: 11px; }
        .s34-sb .s34-sb-sheet .s34-sb-clear-recent { height: 36px; font-size: 13px; }
        .s34-sb-sheet .s34-ft-chips { gap: 7px; }
        .s34-sb-sheet .s34-ft-chip { font-size: 13.5px; line-height: 32px; }
        .s34-sb-sheet .s34-ft-name { padding: 0 13px; }
        .s34-sb .s34-sb-sheet .s34-ft-edit { font-size: 13px; padding: 4px 8px !important; }
        .s34-sb .s34-sb-sheet .s34-ft-input { height: 38px; font-size: 15px; }
        @media (prefers-reduced-motion: reduce) { .s34-sb-pop.s34-sb-sheet, .s34-sheet-backdrop { animation: none; } }
        .s34-sb-menu-head {
            padding: 2px 5px 6px;
            font-size: 10.5px;
            font-weight: 800;
            letter-spacing: .8px;
            text-transform: uppercase;
            opacity: .6;
        }
        .s34-sb-menu h5 {
            margin: 4px 2px 3px !important;
            font-size: 10px !important;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: .6;
        }
        .s34-sb-item { display: flex; align-items: center; border-radius: 5px; }
        .s34-sb-item:hover { background-color: #2e2e36 !important; }
        .s34-sb-item-main { flex: 1; min-width: 0; padding: 3px 5px; cursor: pointer; }
        .s34-sb-item-label, .s34-sb-item-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s34-sb-item-sub { font-size: 10.5px; opacity: .55; }
        .s34-sb .s34-sb-item-del {
            border: none !important;
            background: transparent !important;
            cursor: pointer;
            opacity: .4;
            padding: 0 5px !important;
            color: inherit !important;
        }
        .s34-sb .s34-sb-item-del:hover { opacity: 1; color: #ff6b6b !important; }
        .s34-sb-empty { padding: 2px 5px 4px; opacity: .5; font-style: italic; }
        .s34-sb .s34-sb-clear-recent { display: block; width: 100%; margin-top: 5px; }
    `;

const SETTINGS_CSS = `
        .s34-gear {
            position: fixed;
            right: 14px;
            bottom: 14px;
            z-index: 99998;
            cursor: pointer;
            opacity: .6;
            transition: opacity .15s, transform .2s;
            user-select: none;
            filter: drop-shadow(0 3px 8px rgba(0,0,0,0.6));
        }
        .s34-gear img {
            display: block;
            height: 44px;
            width: auto;
            pointer-events: none;
        }
        .s34-gear:hover { opacity: 1; transform: scale(1.08); }
        /* Settings → API key (optional, Beta 3.7) */
        .s34-api-hero { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 6px; border-radius: 12px; border: 1px solid rgba(95,208,138,0.35) !important; background: rgba(95,208,138,0.08) !important; color: #cfeedd !important; }
        .s34-api-hero b { color: #9fe3b8 !important; }
        .s34-api-icon { flex: none; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important; }
        .s34-api-icon svg * { color: inherit !important; }
        .s34-api ul { margin: 4px 0 10px; padding-left: 20px; }
        .s34-api li { margin: 3px 0; line-height: 1.45; }
        .s34-api-promises { list-style: none; padding-left: 0 !important; }
        .s34-api-promises li { position: relative; padding-left: 24px; }
        .s34-api-promises li::before { content: '✓'; position: absolute; left: 4px; top: 0; font-weight: 800; color: #5fd08a !important; }
        .s34-api code { padding: 1px 5px; border-radius: 4px; background: #24242a !important; font-size: 12px; }
        .s34-api-row { display: flex; gap: 8px; margin: 6px 0 8px; }
        .s34-api .s34-api-input { flex: 1; min-width: 0; height: 34px; box-sizing: border-box; padding: 0 10px !important; border-radius: 8px; border: 1px solid #3a3a44 !important; background: #0d0d10 !important; color: #e8e8ee !important; font: 13px ui-monospace, SFMono-Regular, Consolas, monospace; }
        .s34-api .s34-api-input:focus { outline: none; border-color: #8b3dff !important; }
        .s34-api-status { min-height: 18px; margin: 2px 0 8px; font-size: 12.5px; color: #a9a9b3 !important; }
        .s34-api-status.s34-api-ok { color: #5fd08a !important; }
        .s34-api-status.s34-api-bad { color: #ff8a8a !important; }
        .s34-api-ask { color: #b9b9c3 !important; }
        .s34-api-terms { margin-top: 10px !important; font-size: 11.5px; color: #8e8e9a !important; }
        /* Pages without the sidebar (favourites, My Account, Options…): an item
           at the end of rule34's own menu at the top, instead of the corner */
        #navbar li.s34-nav-steamy { display: inline-block; }
        .s34-gear.s34-gear-nav {
            position: static; z-index: auto; opacity: 1; filter: none;
            display: inline-flex; align-items: center; gap: 7px;
            padding: 5px 14px 5px 10px; border-radius: 999px;
            border: 1px solid transparent !important; background-color: transparent !important; /* (beats the general box look) */
            font-weight: 600; color: var(--s34-fg) !important;
            transition: background-color .15s ease, border-color .15s ease;
        }
        .s34-gear.s34-gear-nav img { height: 20px; border-radius: 5px; }
        .s34-gear.s34-gear-nav span { color: inherit !important; }
        .s34-gear.s34-gear-nav:hover { transform: none; background-color: var(--s34-panel-2) !important; border-color: var(--s34-border) !important; color: #fff !important; }

        /* Download button (single post pages), sits above the logo button */
        .s34-dl-btn {
            position: fixed;
            right: 14px;
            bottom: 76px;
            z-index: 99998;
            padding: 8px 14px;
            border-radius: 999px;
            border: 1px solid #2f5fbf !important;
            background-color: #2f5fbf !important;
            color: #fff !important;
            font: 600 13px/1 system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
            user-select: none;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            opacity: .8;
            transition: opacity .15s, transform .15s;
        }
        .s34-dl-btn:hover { opacity: 1; transform: translateY(-1px); }

        /* Sidebar versions (single post pages) */
        .s34-tools {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin: 12px 0;
            width: 100%;
            box-sizing: border-box;
        }
        .s34-tools .s34-gear.s34-inline { margin: 0; }

        /* Single post page: search + Download + tools on top of the sidebar.
           (Beta 3.8.5: no longer sticky - with the tool tiles it grew tall
           enough to cover the tag list while scrolling. B still downloads.) */
        .s34-sticky-top {
            position: static;
            padding: 8px 0 2px;
        }
        .s34-sticky-top .s34-tools { margin: 10px 0 8px; }
        /* The sidebar must be as tall as the page for sticky to work
           (only its height changes, never its width) */
        .sidebar:has(.s34-sticky-top), #sidebar:has(.s34-sticky-top) {
            align-self: stretch !important;
        }
        .s34-dl-btn.s34-inline {
            position: static;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            box-sizing: border-box;
            padding: 10px 12px;
            border-radius: 8px;
            opacity: .9;
            box-shadow: none;
        }
        /* "⬇ Download [B]" with a small second line */
        .s34-dl-btn { flex-wrap: wrap; text-align: center; }
        .s34-dl-btn .s34-dl-main { font-weight: 700; }
        .s34-dl-btn .s34-dl-sub {
            flex-basis: 100%;
            margin-top: 4px;
            font-size: 10.5px;
            font-weight: 500;
            line-height: 1.2;
            opacity: .8;
            color: #fff !important; /* white on the coloured button in every mode */
        }
        .s34-dl-btn:not(.s34-inline) .s34-dl-sub { display: none; } /* floating button stays small */
        /* Already downloaded: green, still clickable to download again */
        .s34-dl-btn.s34-dl-done {
            background-color: #1f7a3e !important;
            border-color: #1f7a3e !important;
        }
        /* ✓ in the corner of thumbnails you already downloaded */
        .s34-dl-mark {
            position: absolute;
            top: 6px;
            right: 6px;
            z-index: 3;
            width: 24px;
            height: 24px;
            box-sizing: border-box;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(31,122,62,0.92) !important;
            color: #fff !important;
            font: 700 13px/1 system-ui, sans-serif;
            box-shadow: 0 1px 4px rgba(0,0,0,0.45);
            cursor: pointer; /* a click still opens the post */
        }
        /* Viewed (not downloaded): grey eye - same size as ♥ and the download mark */
        .s34-dl-mark.s34-seen-mark {
            background-color: rgba(20,20,24,0.8) !important;
        }
        /* Label on hover: "Viewed" / "Downloaded" */
        .s34-dl-mark svg { display: block; width: 14px; height: 14px; pointer-events: none; }
        .s34-dl-mark::after {
            content: attr(data-label);
            position: absolute;
            top: 50%;
            right: calc(100% + 5px);
            transform: translateY(-50%);
            padding: 3px 7px;
            border-radius: 5px;
            white-space: nowrap;
            background-color: rgba(20,20,24,0.92);
            color: #fff;
            font: 600 11px/1.2 system-ui, -apple-system, Segoe UI, sans-serif;
            opacity: 0;
            pointer-events: none;
            transition: opacity .12s;
        }
        /* (Beta 3.8) The label floated over the ♥ next to it - the browser's own
           tooltip (title) says it now, so nothing covers anything */
        .s34-dl-mark::after { display: none !important; }
        .s34-dl-btn kbd {
            display: inline-block;
            margin-left: 6px;
            padding: 2px 6px;
            border-radius: 4px;
            background-color: rgba(255,255,255,0.2) !important;
            color: #fff !important;
            font: bold 11px/1.2 monospace;
        }

        .s34-hotkey { cursor: pointer; text-align: center; font-weight: bold; width: 110px !important; }

        /* Slim "⚙ Settings" button in the sidebar (posts page, single posts) */
        .s34-gear.s34-inline {
            position: static;
            box-sizing: border-box;
            flex: none !important;
            align-self: flex-start;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            margin: 12px 0;
            padding: 7px 10px;
            border-radius: 8px;
            border: 1px solid #33333a !important;
            background-color: #1c1c20 !important;
            color: #dcdce0 !important;
            opacity: .85;
            filter: none;
        }
        .s34-gear.s34-inline:hover { opacity: 1; transform: none; background-color: #24242a !important; }
        .s34-gear.s34-inline svg { display: block; flex: none; color: inherit !important; }
        .s34-gear.s34-inline svg * { color: inherit !important; }
        .s34-gear.s34-inline span { font-weight: 600; font-size: 13px; color: #dcdce0 !important; }
        /* Small line with the logo and the installed version (not a button) */
        .s34-brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin: -8px 0 14px;
            font: 600 11px/1.2 system-ui, -apple-system, Segoe UI, sans-serif;
            color: #dcdce0 !important;
            opacity: .5;
            user-select: none;
        }
        .s34-brand img { display: block; width: 16px; height: 16px; border-radius: 4px; }
        .s34-brand small { font-size: 11px; font-weight: 400; color: inherit !important; }
        .s34-tools .s34-brand, .s34-menu-tools .s34-brand { margin: 0; }
        .s34-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background-color: rgba(0,0,0,0.55) !important;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        /* A window that opened the popup viewer (a collection) waits invisibly
           underneath, scroll position kept, until the popup closes */
        .s34-overlay.s34-under-popup { visibility: hidden !important; }
        .s34-panel {
            width: min(560px, calc(100vw - 32px));
            max-height: calc(100vh - 48px);
            display: flex;
            flex-direction: column;
            background-color: #18181c !important;
            color: #dcdce0 !important;
            border: 1px solid #33333a !important;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6);
            font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-panel * { color: #dcdce0 !important; }
        .s34-panel input:not([type="checkbox"]), .s34-panel select {
            background-color: #26262c !important;
            border: 1px solid #3a3a42 !important;
            border-radius: 4px;
        }
        .s34-panel input[type="checkbox"] { accent-color: #2f5fbf; }
        .s34-panel-head, .s34-panel-foot {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 14px 18px;
            border-color: #2c2c33 !important;
        }
        .s34-panel-head { border-bottom: 1px solid #2c2c33; }
        .s34-panel-head h2 { margin: 0; font-size: 16px; flex: 1; }
        .s34-panel-head img { height: 40px; width: auto; display: block; }        .s34-panel-foot { border-top: 1px solid #2c2c33; justify-content: flex-end; }
        .s34-btn {
            padding: 6px 14px;
            border-radius: 6px;
            border: 1px solid #3a3a42 !important;
            background-color: #26262c !important;
            cursor: pointer;
        }
        .s34-btn:hover { background-color: #303038 !important; }
        .s34-btn.s34-primary { background-color: #2f5fbf !important; border-color: #2f5fbf !important; }
        .s34-btn.s34-primary:hover { background-color: #3a6fd4 !important; }
        .s34-btn.s34-link { background-color: transparent !important; border-color: transparent !important; opacity: .7; margin-right: auto; }
        .s34-close { font-size: 20px; cursor: pointer; opacity: .6; padding: 0 4px; }
        .s34-close:hover { opacity: 1; }
    `;

const HIDE_LIST_TAGS_CSS = `
        #tag-sidebar, .s34-tags-heading, .s34-hidden { display: none !important; }

        /* With the tag list gone the sidebar is short (search, AI filter,
           settings), so the whole sidebar sticks to the top left while you
           scroll. Its width is untouched. */
        #post-list > .sidebar,
        .sidebar:has(+ .content .image-list),
        .sidebar:has(~ .content .image-list) {
            position: sticky !important;
            top: 10px !important;
            align-self: flex-start !important;
            z-index: 50;
            /* Taller than the window (a long Following list)? Then it scrolls
               on its own with the mouse wheel - infinite scroll never reaches
               the page's end, so its bottom (Settings, tips) was out of reach
               before Beta 3.6. No scrollbar: it looked out of place */
            max-height: calc(100vh - 20px);
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: none;
        }
        #post-list > .sidebar::-webkit-scrollbar,
        .sidebar:has(+ .content .image-list)::-webkit-scrollbar,
        .sidebar:has(~ .content .image-list)::-webkit-scrollbar { display: none; }
    `;

const LIST_SIDEBAR_CSS = `
        html body .sidebar,
        html body .sidebar .tag-search,
        html body .tag-search,
        html body #tag-sidebar {
            background-color: var(--s34-bg) !important;
            box-shadow: none !important;
        }
    `;

export { ACCOUNT_CSS, HIDE_LIST_TAGS_CSS, LIST_SIDEBAR_CSS, SEARCH_CSS, SETTINGS_CSS };
