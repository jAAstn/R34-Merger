// styles/pages – Steamy34 (aus Steamy34.js aufgeteilt)
const PHONE_CSS = `
        /* (Beta 3.9.4) Hold a thumbnail: its buttons as a sheet from the bottom */
        .s34-tsheet-overlay { align-items: flex-end !important; }
        .s34-tsheet { width: min(520px, 100vw); margin: 0 auto; box-sizing: border-box; padding: 10px 12px calc(12px + env(safe-area-inset-bottom)); border-radius: 16px 16px 0 0;
            background: var(--s34-panel, #1c1c20) !important; border: 1px solid var(--s34-border, #33333b); display: grid; gap: 8px; }
        .s34-tsheet-head { display: flex; align-items: center; justify-content: space-between; padding: 2px 2px 4px; font-size: 15px; }
        .s34-tsheet-head button { border: none !important; background: none !important; color: inherit !important; font-size: 18px; }
        .s34-tsheet > button { height: 48px; border-radius: 12px; border: 1px solid var(--s34-border, #33333b) !important; background: var(--s34-panel-2, #24242a) !important; color: inherit !important; font: 600 16px system-ui, sans-serif; text-align: left; padding: 0 16px !important; }
        .image-list span.thumb { -webkit-touch-callout: none; user-select: none; }
        /* ================= PHONES ================= */
        /* No mouse: buttons that normally appear on hover are always there */
        @media (hover: none) {
            span.thumb .s34-chip .s34-chip-add,
            span.thumb .s34-chip .s34-chip-block {
                max-width: 22px; opacity: .85; padding: 0 5px 0 0 !important; transition: none;
            }
            span.thumb .s34-fav-btn { opacity: .85; }
            .s34-tile-acts { opacity: 1; }
            .s34-tile.s34-tile-iscover .s34-tile-acts button { opacity: 1; }
            .image-list span.thumb:hover { transform: none; }
        }
        @media (max-width: 760px), (pointer: coarse) and (max-width: 1000px) {
            /* The sidebar doesn't stick on a small screen (it would cover the posts) */
            html body #post-list > .sidebar,
            html body .sidebar:has(+ .content .image-list),
            html body .sidebar:has(~ .content .image-list),
            html body .sidebar, html body #sidebar,
            html body .s34-sticky-top {
                position: static !important;
                top: auto !important;
            }

            /* Popup: picture on top, then buttons, info and tags, then comments -
               one page you scroll through */
            .s34-pv-overlay {
                display: flex !important;
                flex-direction: column;
                background-color: #0a0a0c !important;
                overflow-y: auto;
                overflow-x: hidden;
                overscroll-behavior: contain;
            }
            /* fully opaque in every colour mode (beats the White / OLED tints) */
            html[class] .s34-pv-overlay.s34-pv-overlay { background-color: #0a0a0c !important; }
            .s34-pv-main { display: contents; }
            .s34-pv-main > .s34-pv-stage, .s34-pv-overlay .s34-pv-stage {
                order: 1;
                flex: none;
                height: 72vh;
                height: 72svh;
                padding: 0;
                cursor: default;
                touch-action: pan-y pinch-zoom;
            }
            .s34-pv-overlay .s34-pv-stage.s34-pv-zoomed { touch-action: auto; }
            .s34-pv-overlay .s34-pv-side,
            .s34-pv-overlay.s34-pv-theater .s34-pv-side {
                order: 2;
                display: flex;
                flex: none;
                overflow: visible;
                min-height: 0;
                padding: 14px 14px 18px;
                border-right: none !important;
                border-top: 1px solid #2a2a31 !important;
            }
            .s34-pv-overlay .s34-cm-section { order: 3; flex: none; width: 100%; padding: 20px 14px 70px; }
            /* (Beta 3.10.1) Similar: a row right under the picture (not floating over it) */
            .s34-pv-overlay .s34-pv-simstrip { order: 1; flex: none; position: relative; margin: 0; height: auto; padding: 10px 12px 12px; border-top: 1px solid #2a2a31; }
            .s34-pv-overlay .s34-pv-strip-row { height: 80px; gap: 10px; -webkit-overflow-scrolling: touch; }
            .s34-pv-overlay .s34-pv-strip-item { width: 76px; height: 76px; }
            .s34-pv-overlay .s34-pv-strip-head button { font-size: 18px; padding: 4px 8px !important; }
            /* Collections: hold a post, then drag it (no mouse) */
            .s34-tiles-drag .s34-tile { -webkit-touch-callout: none; user-select: none; }
            .s34-tile.s34-dragging { transform: scale(1.04); }
            .s34-win textarea.s34-coll-note { font-size: 16px; } /* (smaller text makes phones zoom in) */
            .s34-cm-head { flex-wrap: wrap; }
            .s34-cm-write { margin-left: 0; align-items: flex-start; }
            /* Floating buttons over the picture: previous, next, close */
            .s34-pv-overlay .s34-pv-tbar,
            .s34-pv-overlay.s34-pv-theater .s34-pv-tbar {
                display: flex;
                position: fixed;
                top: 10px;
                right: 10px;
                opacity: .92;
            }
            .s34-pv-tbar button { width: 42px; height: 42px; font-size: 20px; }
            .s34-pv-tbar [data-act="theater"], .s34-pv-theaterbtn { display: none !important; }
            .s34-pv-top .s34-pv-nav, .s34-pv-top .s34-pv-close { display: none; }
            /* Bigger tap targets */
            .s34-pv-side .s34-dl-btn.s34-inline { padding: 13px 12px; }
            .s34-pv-fav, .s34-pv-collect, .s34-pv-later, .s34-pv-icame { height: 42px; }
            .s34-pv-chips .s34-chip { font-size: 13px; line-height: 1.9; }
            .s34-pv-chips .s34-chip .s34-chip-add, .s34-pv-chips .s34-chip .s34-chip-block { padding: 0 8px 0 4px !important; font-size: 15px; }
        }

        /* "Steamy34 on your phone" announcement + Android guide */
        .s34-mob-hero {
            position: relative;
            display: flex;
            align-items: center;
            gap: 18px;
            padding: 20px 22px;
            border-radius: 16px;
            overflow: hidden;
            background: linear-gradient(135deg, #ff5f8f 0%, #b04bff 55%, #6a3dff 100%) !important;
            color: #fff !important;
            box-shadow: 0 14px 34px rgba(139,61,255,0.35);
        }
        .s34-mob-hero::after {
            content: '';
            position: absolute;
            right: -40px; top: -60px;
            width: 220px; height: 220px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,0.28), transparent 65%) !important;
            pointer-events: none;
        }
        .s34-mob-hero, .s34-mob-steps, .s34-mob-note, .s34-mob-foot { flex: none; }
        .s34-mob-phone { flex: none; width: 74px; height: auto; filter: drop-shadow(0 8px 14px rgba(0,0,0,0.35)); }
        .s34-mob-hero-text { position: relative; z-index: 1; min-width: 0; }
        .s34-mob-badge {
            display: inline-block;
            margin-bottom: 6px;
            padding: 1px 8px;
            border-radius: 999px;
            font: 800 10px/18px system-ui, -apple-system, Segoe UI, sans-serif;
            letter-spacing: .8px;
            text-transform: uppercase;
            background-color: rgba(255,255,255,0.22) !important;
            color: #fff !important;
        }
        .s34-mob-hero h3 { margin: 0 0 4px !important; font-size: 21px !important; font-weight: 800; line-height: 1.2; color: #fff !important; }
        .s34-mob-hero p { margin: 0 !important; font-size: 13px; line-height: 1.45; color: rgba(255,255,255,0.9) !important; }
        .s34-mob-steps { display: flex; flex-direction: column; gap: 8px; counter-reset: s34step; }
        .s34-mob-step {
            display: flex;
            gap: 12px;
            padding: 11px 13px;
            border-radius: 12px;
            background-color: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.07) !important;
        }
        .s34-mob-step::before {
            counter-increment: s34step;
            content: counter(s34step);
            flex: none;
            width: 26px; height: 26px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font: 800 13px system-ui, -apple-system, Segoe UI, sans-serif;
            color: #fff;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff);
        }
        .s34-mob-step b { display: block; font-size: 13.5px; margin-bottom: 2px; }
        .s34-mob-step span { font-size: 12.5px; line-height: 1.5; color: #c4c4cc !important; }
        .s34-mob-step em { font-style: normal; font-weight: 700; color: #e8e8ee !important; }
        .s34-mob-step.s34-mob-optional { border-style: dashed !important; }        .s34-mob-opt { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; opacity: .55; margin-left: 6px; }
        .s34-mob-note {
            padding: 10px 13px;
            border-radius: 12px;
            font-size: 12px;
            line-height: 1.55;
            background-color: rgba(255,179,71,0.07) !important;
            border: 1px solid rgba(255,179,71,0.3) !important;
            color: #e8d4b4 !important;
        }
        .s34-mob-note b { color: #ffcf8a !important; }
        .s34-mob-note ul { margin: 4px 0 0 !important; padding-left: 18px !important; }
        .s34-mob-note li { list-style: disc !important; margin: 2px 0; }
        .s34-mob-note a { color: #ffcf8a !important; }
        .s34-mob-foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
        .s34-win .s34-mob-backup {
            display: flex; align-items: center; gap: 6px;
            height: 34px; padding: 0 14px !important; border-radius: 10px; cursor: pointer;
            background-color: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.12) !important;
            color: #e8e8ee !important; font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-win .s34-mob-backup:hover { border-color: #ff5f8f !important; }
        .s34-win .s34-mob-ok {
            height: 34px; padding: 0 22px !important; border-radius: 10px; border: none !important; cursor: pointer;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important; font-weight: 700;
        }
        @media (max-width: 520px) {
            .s34-mob-hero { flex-direction: column; text-align: center; }
        }

    `;

const TOUR_CSS = `
        /* Welcome tour (first start, or Settings → Help → Welcome tour) */
        .s34-wel-overlay .s34-win-body { gap: 14px; }
        .s34-wel-stage { position: relative; display: flex; flex-direction: column; gap: 14px; animation: s34-wel-in .35s ease-out; }
        .s34-wel-stage.s34-wel-back { animation-name: s34-wel-in-back; }
        @keyframes s34-wel-in { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: none; } }
        @keyframes s34-wel-in-back { from { opacity: 0; transform: translateX(-26px); } to { opacity: 1; transform: none; } }
        .s34-wel-hero {
            position: relative;
            display: flex;
            align-items: center;
            gap: 18px;
            padding: 22px 24px;
            border-radius: 18px;
            overflow: hidden;
            background: linear-gradient(135deg, #ff5f8f 0%, #b04bff 55%, #6a3dff 100%) !important;
            color: #fff !important;
            box-shadow: 0 14px 34px rgba(139,61,255,0.35);
        }
        .s34-wel-hero::after {
            content: '';
            position: absolute;
            right: -50px; top: -70px;
            width: 240px; height: 240px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,0.3), transparent 65%) !important;
            pointer-events: none;
        }
        .s34-wel-art {
            flex: none;
            width: 64px; height: 64px;
            border-radius: 18px;
            display: flex; align-items: center; justify-content: center;
            background-color: rgba(255,255,255,0.18) !important;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25);
        }
        .s34-wel-art svg { width: 34px; height: 34px; color: #fff !important; }
        .s34-wel-art img { width: 64px; height: 64px; border-radius: 18px; display: block; }
        .s34-wel-hero-text { position: relative; z-index: 1; min-width: 0; }
        .s34-wel-step {
            display: inline-block;
            margin-bottom: 5px;
            padding: 1px 8px;
            border-radius: 999px;
            font: 800 10px/18px system-ui, -apple-system, Segoe UI, sans-serif;
            letter-spacing: .8px;
            text-transform: uppercase;
            background-color: rgba(255,255,255,0.22) !important;
            color: #fff !important;
        }
        .s34-wel-hero h3 { margin: 0 0 4px !important; font-size: 22px !important; font-weight: 800; line-height: 1.2; color: #fff !important; }
        .s34-wel-hero p { margin: 0 !important; font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.92) !important; }
        .s34-wel-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
        .s34-wel-card {
            display: flex;
            gap: 11px;
            padding: 12px 13px;
            border-radius: 13px;
            background-color: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.07) !important;
        }
        .s34-wel-ico {
            flex: none;
            width: 30px; height: 30px;
            border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            font-size: 15px;
            background: linear-gradient(135deg, rgba(255,95,143,0.22), rgba(139,61,255,0.22)) !important;
            color: #ff8fb0 !important;
        }
        .s34-wel-ico svg { width: 16px; height: 16px; color: inherit !important; }
        .s34-wel-card b { display: block; font-size: 13px; margin-bottom: 2px; }
        .s34-wel-card span { display: block; font-size: 12px; line-height: 1.5; color: #b9b9c3 !important; }
        .s34-wel-card kbd {
            display: inline-block;
            min-width: 18px;
            padding: 0 5px;
            border-radius: 5px;
            font: 700 11px/18px system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: center;
            background-color: #2a2a31 !important;
            border: 1px solid #3c3c46 !important;
            border-bottom-width: 2px !important;
            color: #f0f0f4 !important;
        }
        .s34-wel-promise { display: flex; flex-wrap: wrap; gap: 6px; }
        .s34-wel-promise span {
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            background-color: rgba(255,255,255,0.05) !important;
            border: 1px solid rgba(255,255,255,0.09) !important;
        }
        .s34-wel-themes { display: flex; gap: 8px; }
        .s34-win .s34-wel-themes button {
            flex: 1;
            display: flex; flex-direction: column; align-items: center; gap: 6px;
            padding: 10px 8px !important;
            border-radius: 12px;
            cursor: pointer;
            font: 700 12px system-ui, -apple-system, Segoe UI, sans-serif;
            background-color: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            color: inherit !important;
        }
        .s34-win .s34-wel-themes button.s34-on { border-color: #ff5f8f !important; box-shadow: 0 0 0 1px #ff5f8f inset; }
        .s34-wel-themes i { display: block; width: 100%; height: 28px; border-radius: 7px; border: 1px solid rgba(128,128,128,0.35); }
        .s34-wel-themes svg { display: block; width: 64px; height: 44px; }
        .s34-wel-picklabel { margin: 2px 2px -4px; font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; opacity: .55; }
        .s34-wel-foot { display: flex; align-items: center; gap: 10px; }
        .s34-wel-dots { display: flex; gap: 6px; margin-right: auto; }
        .s34-win .s34-wel-dots button {
            width: 8px; height: 8px; padding: 0 !important;
            border-radius: 999px; border: none !important; cursor: pointer;
            background-color: rgba(255,255,255,0.2) !important;
            transition: width .25s, background-color .25s;
        }
        .s34-win .s34-wel-dots button.s34-on { width: 22px; background: linear-gradient(90deg, #ff5f8f, #8b3dff) !important; }
        .s34-win .s34-wel-btn {
            height: 34px; padding: 0 16px !important; border-radius: 10px; cursor: pointer;
            background-color: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.12) !important;
            color: #e8e8ee !important; font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-win .s34-wel-btn:hover { border-color: #ff5f8f !important; }
        .s34-win .s34-wel-btn[hidden] { display: none; }
        .s34-win .s34-wel-next {
            height: 34px; padding: 0 22px !important; border-radius: 10px; border: none !important; cursor: pointer;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important;
            font: 700 13px system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-wel-skip { font-size: 12px; opacity: .55; cursor: pointer; background: none !important; border: none !important; color: inherit !important; padding: 0 4px !important; }
        .s34-wel-skip:hover { opacity: .9; }
        @media (max-width: 560px) {
            .s34-wel-cards { grid-template-columns: minmax(0, 1fr); }
            .s34-wel-hero { padding: 18px; gap: 14px; }
            .s34-wel-hero h3 { font-size: 19px !important; }
            .s34-wel-art { width: 52px; height: 52px; }
            .s34-wel-art img { width: 52px; height: 52px; }
            .s34-wel-foot { flex-wrap: wrap; }
            .s34-wel-dots { flex-basis: 100%; justify-content: center; margin: 0 0 4px; }
            .s34-wel-foot .s34-wel-next { margin-left: auto; }
        }

        /* (Beta 3.11) The big welcome guide: chapters on the left, Computer / Phone on top */
        .s34-wel-big .s34-win { width: min(1120px, calc(100vw - 32px)) !important; height: min(860px, calc(100vh - 40px)); max-height: none; }
        .s34-wel-big .s34-win-body { flex: 1; min-height: 0; overflow: hidden; padding: 0; gap: 0; }
        .s34-wel-shell { flex: 1; min-height: 0; display: grid; grid-template-columns: 220px minmax(0, 1fr); border-top: 1px solid rgba(255,255,255,0.07); }
        .s34-wel-nav { overflow-y: auto; padding: 14px 10px; display: flex; flex-direction: column; gap: 2px; border-right: 1px solid rgba(255,255,255,0.07); scrollbar-width: thin; }
        .s34-win .s34-wel-nav button { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 10px !important; border-radius: 10px; border: none !important;
            background: transparent !important; color: #b9b9c3 !important; font: 600 13.5px system-ui, -apple-system, Segoe UI, sans-serif; text-align: left; cursor: pointer; flex: none; }
        .s34-win .s34-wel-nav button:hover { background-color: rgba(255,255,255,0.05) !important; color: #fff !important; }
        .s34-win .s34-wel-nav button.s34-on { background: linear-gradient(90deg, rgba(255,95,143,0.2), rgba(139,61,255,0.12)) !important; color: #fff !important; }
        .s34-wel-navico { flex: none; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;
            background-color: rgba(255,255,255,0.05) !important; color: #ff8fb0 !important; }
        .s34-wel-nav button.s34-on .s34-wel-navico { background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important; }
        .s34-wel-navico svg { width: 16px; height: 16px; color: inherit !important; }
        .s34-wel-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
        .s34-wel-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 26px 0; }
        .s34-wel-devices { display: inline-flex; padding: 3px; border-radius: 12px; background-color: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.08) !important; }
        .s34-win .s34-wel-devices button { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 16px !important; border-radius: 9px; border: none !important; cursor: pointer;
            background: transparent !important; color: #b9b9c3 !important; font: 700 13px system-ui, -apple-system, Segoe UI, sans-serif; }
        .s34-win .s34-wel-devices button.s34-on { background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important; }
        .s34-wel-count { font-size: 12px; font-weight: 700; opacity: .5; }
        .s34-wel-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 16px 26px 26px; scrollbar-width: thin; }
        .s34-wel-big .s34-wel-stage { gap: 18px; }
        .s34-wel-big .s34-wel-hero { padding: 28px 30px; gap: 22px; }
        .s34-wel-big .s34-wel-art { width: 78px; height: 78px; border-radius: 22px; }
        .s34-wel-big .s34-wel-art svg { width: 40px; height: 40px; }
        .s34-wel-big .s34-wel-art img { width: 78px; height: 78px; border-radius: 22px; }
        .s34-wel-big .s34-wel-hero h3 { font-size: 28px !important; }
        .s34-wel-big .s34-wel-hero p { font-size: 15px; max-width: 680px; }
        .s34-wel-big .s34-wel-cards { grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 10px; }
        .s34-wel-big .s34-wel-card { padding: 14px 16px; }
        .s34-wel-big .s34-wel-ico { width: 36px; height: 36px; border-radius: 11px; font-size: 17px; }
        .s34-wel-big .s34-wel-ico svg { width: 19px; height: 19px; }
        .s34-wel-big .s34-wel-card b { font-size: 14px; }
        .s34-wel-big .s34-wel-card span { font-size: 13px; }
        .s34-wel-big .s34-wel-promise span { font-size: 13px; padding: 6px 12px; }
        .s34-wel-note { margin: 0 !important; font-size: 12px; opacity: .6; }
        /* Welcome: everything at a glance, each tile opens its chapter */
        .s34-wel-overview { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
        .s34-win .s34-wel-otile { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px !important; border-radius: 14px; cursor: pointer; text-align: left;
            background-color: rgba(255,255,255,0.04) !important; border: 1px solid rgba(255,255,255,0.08) !important; color: inherit !important; font: inherit; transition: border-color .15s, transform .15s; }
        .s34-win .s34-wel-otile:hover { border-color: #ff5f8f !important; transform: translateY(-2px); }
        .s34-wel-otile b { font-size: 14px; }
        .s34-wel-otile > span:last-child { font-size: 12px; line-height: 1.45; color: #b9b9c3 !important; }
        /* Controls: the keyboard */
        .s34-kb { display: flex; gap: 22px; justify-content: center; align-items: flex-end; padding: 20px; border-radius: 18px; overflow-x: auto;
            background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)) !important; border: 1px solid rgba(255,255,255,0.08) !important; }
        .s34-kb-row { display: flex; gap: 6px; margin-bottom: 6px; }
        .s34-kb-pad { flex: none; width: 18px; }
        .s34-kb-key { position: relative; flex: none; width: 50px; height: 50px; box-sizing: border-box; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
            background-color: #24232c !important; border: 1px solid #33313d !important; box-shadow: 0 3px 0 #121117; color: #6f6e80 !important; transition: transform .1s, box-shadow .1s; }
        .s34-kb-key b { font: 700 14px/1 system-ui, -apple-system, Segoe UI, sans-serif; }
        .s34-kb-key i { font: 700 8.5px/1.1 system-ui, -apple-system, Segoe UI, sans-serif; font-style: normal; max-width: 46px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--kc) !important; }
        .s34-kb-key.s34-kb-lit { background-color: color-mix(in srgb, var(--kc) 20%, #24232c) !important; border-color: var(--kc) !important; color: #fff !important; cursor: help; }
        .s34-kb-key.s34-kb-lit i { color: #fff !important; opacity: .85; }
        .s34-kb-key.s34-kb-hot, .s34-kb-key.s34-kb-press { transform: translateY(2px); box-shadow: 0 1px 0 #121117, 0 0 0 3px var(--kc, #8a8a99); }
        .s34-kb-key.s34-kb-press:not(.s34-kb-lit) { --kc: #6f6e80; }
        .s34-kb-wide { width: 76px; }
        .s34-kb-wider { width: 92px; }
        .s34-kb-space { width: 330px; }
        .s34-kb-arrows .s34-kb-row { justify-content: center; }
        .s34-kb-try { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 30px; font-size: 14px; font-weight: 600; text-align: center; }
        .s34-kb-try > span:only-child { opacity: .45; font-weight: 500; }
        .s34-kb-try .s34-kb-none { opacity: .55; font-weight: 500; }
        .s34-kb-try kbd, .s34-wel-ckeys kbd {
            display: inline-block; min-width: 20px; padding: 0 6px; border-radius: 6px; text-align: center;
            font: 700 12px/22px system-ui, -apple-system, Segoe UI, sans-serif;
            background-color: #2a2a31 !important; border: 1px solid #3c3c46 !important; border-bottom-width: 2px !important; color: #f0f0f4 !important;
        }
        .s34-wel-ckeys kbd svg { width: 13px; height: 13px; vertical-align: -2px; }
        .s34-wel-legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 12px; }
        .s34-wel-cgroup { padding: 12px 16px; border-radius: 14px; background-color: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.07) !important; border-left: 3px solid var(--gc) !important; }
        .s34-wel-cgtitle { margin-bottom: 6px; font-size: 11px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: var(--gc) !important; }
        .s34-wel-crow { display: flex; align-items: center; gap: 12px; padding: 7px 0; border-top: 1px solid rgba(255,255,255,0.05); }
        .s34-wel-cgtitle + .s34-wel-crow { border-top: none; }
        .s34-wel-ckeys { flex: none; width: 150px; font-size: 12px; color: #b9b9c3 !important; }
        .s34-wel-cwhat { font-size: 13px; line-height: 1.45; }
        /* Controls: the phone gestures */
        .s34-wel-gestures { display: flex; flex-direction: column; gap: 14px; }
        .s34-wel-gcards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
        .s34-wel-gcard { display: flex; align-items: center; gap: 14px; padding: 10px 14px 10px 10px; border-radius: 14px; background-color: rgba(255,255,255,0.04) !important; border: 1px solid rgba(255,255,255,0.07) !important; }
        .s34-wel-gcard svg { flex: none; width: 72px; height: 72px; }
        .s34-wel-gcard b { display: block; font-size: 14px; margin-bottom: 3px; }
        .s34-wel-gcard span { display: block; font-size: 13px; line-height: 1.45; color: #b9b9c3 !important; }
        .s34-wel-big .s34-wel-themes { flex-wrap: wrap; }
        .s34-wel-big .s34-wel-themes button { min-width: 120px; }
        .s34-wel-big .s34-wel-foot { padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.07); }
        .s34-wel-progress { flex: 1; height: 4px; margin: 0 6px; border-radius: 4px; overflow: hidden; background-color: rgba(255,255,255,0.08) !important; }
        .s34-wel-progress i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ff5f8f, #8b3dff) !important; transition: width .3s; }
        @media (max-width: 900px) {
            .s34-kb-key { width: 38px; height: 40px; border-radius: 8px; }
            .s34-kb-key i { display: none; }
            .s34-kb-wide { width: 58px; } .s34-kb-wider { width: 70px; } .s34-kb-space { width: 220px; }
            .s34-kb { justify-content: flex-start; padding: 14px; gap: 14px; }
        }
        /* Phones: the window fills the screen, chapters become a row of chips */
        @media (max-width: 760px) {
            .s34-wel-big .s34-win { width: 100vw !important; height: 100vh; height: 100dvh; border-radius: 0; }
            .s34-wel-shell { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
            .s34-wel-nav { flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 8px 12px; gap: 6px; scrollbar-width: none; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); }
            .s34-win .s34-wel-nav button { min-height: 36px; padding: 0 12px 0 6px !important; border-radius: 99px; white-space: nowrap; font-size: 13px; background-color: rgba(255,255,255,0.04) !important; }
            .s34-wel-navico { width: 24px; height: 24px; border-radius: 99px; }
            .s34-wel-topbar { padding: 10px 14px 0; }
            .s34-wel-scroll { padding: 12px 14px 18px; }
            .s34-wel-big .s34-wel-hero { padding: 18px; gap: 14px; }
            .s34-wel-big .s34-wel-hero h3 { font-size: 21px !important; }
            .s34-wel-big .s34-wel-hero p { font-size: 14px; }
            .s34-wel-big .s34-wel-art, .s34-wel-big .s34-wel-art img { width: 54px; height: 54px; border-radius: 16px; }
            .s34-wel-big .s34-wel-art svg { width: 28px; height: 28px; }
            .s34-wel-big .s34-wel-cards, .s34-wel-gcards, .s34-wel-legend { grid-template-columns: minmax(0, 1fr); }
            .s34-wel-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .s34-wel-big .s34-wel-foot { padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); }
            .s34-wel-ckeys { width: 118px; }
        }
    `;

const FOLLOW_CSS = `
        /* The bell next to artist tags (outline = follow, filled = following) */
        svg.s34-bell, svg.s34-bell * { color: inherit !important; }
        .s34-chip .s34-chip-follow {
            all: unset;
            background: transparent !important; /* beats the general button look */
            border: none !important;
            display: inline-flex;
            align-items: center;
            cursor: pointer;
            padding: 0 7px 0 1px;
            color: #b9b9c3 !important;
            opacity: .7;
        }
        .s34-chip .s34-chip-follow svg { width: 13px; height: 13px; }
        #tag-sidebar li a.r34-follow-btn svg { width: 13px; height: 13px; vertical-align: -2px; }
        .s34-bell-i svg { width: 1.05em; height: 1.05em; vertical-align: -.16em; color: #ffb347 !important; }
        .s34-follow-win .s34-follow-addbtn { display: inline-flex; align-items: center; gap: 6px; }
        .s34-follow-addbtn svg { width: 14px; height: 14px; color: #ffb347 !important; }
        .s34-chip .s34-chip-follow:hover { opacity: 1; color: #ffcf6b !important; }
        .s34-chip .s34-chip-follow.s34-following { opacity: 1; color: #ffb347 !important; }
        #tag-sidebar li a.r34-follow-btn {
            margin: 0 1px 0 4px !important;
            text-decoration: none !important;
            cursor: pointer;
            font-size: 13px;
            opacity: .7;
            color: #b9b9c3 !important;
        }
        #tag-sidebar li a.r34-follow-btn:hover { opacity: 1; color: #ffcf6b !important; }
        #tag-sidebar li a.r34-follow-btn.s34-following { opacity: 1; color: #ffb347 !important; }

        /* Sidebar: "Followed artists", one row per artist with "N new" */
        .s34-follow-box {
            box-sizing: border-box;
            width: 100%;
            margin: 14px 0 -6px;
            padding: 8px 6px 6px;
            border-radius: 8px;
            border: 1px solid #33333a !important;
            background-color: #1c1c20 !important;
            color: #dcdce0 !important;
            font: 12.5px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-tools .s34-follow-box, .s34-menu-tools .s34-follow-box { margin: 0; }
        .s34-follow-head { display: flex; align-items: center; gap: 6px; padding: 0 4px 5px; }
        .s34-follow-head svg { flex: none; width: 14px; height: 14px; color: #ffb347 !important; }
        .s34-follow-head svg * { color: inherit !important; }
        .s34-follow-head b {
            font-size: 10.5px;
            font-weight: 800;
            letter-spacing: .8px;
            text-transform: uppercase;
            color: #dcdce0 !important;
            opacity: .75;
        }
        .s34-follow-head a { margin-left: auto; font-size: 11px; color: #9a9aa6 !important; text-decoration: none !important; }
        .s34-follow-head a:hover { color: #ffb347 !important; }
        /* (the rows are real links since 3.6: :link / :visited keeps the general
           "visited link" blue from colouring artists you once searched) */
        .s34-follow-box a.s34-follow-row:is(:link, :visited) { color: #ff8a80 !important; }
        .s34-follow-box a.s34-follow-row.s34-follow-allrow:is(:link, :visited) { color: #ffcf8a !important; }
        .s34-follow-row {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
            padding: 4px 6px;
            border-radius: 5px;
            color: #ff8a80 !important;
            font-weight: 600;
            text-decoration: none !important;
        }
        .s34-follow-row span { color: inherit !important; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s34-follow-row:hover { background-color: #2a2a31 !important; }
        .s34-follow-row.s34-on { background-color: rgba(255,179,71,0.12) !important; }
        .s34-follow-row.s34-follow-allrow { color: #ffcf8a !important; }
        /* Saved searches (Beta 3.7): the same box, a disk instead of a bell, plain-coloured rows */
        .s34-saved-box[hidden] { display: none !important; }
        .s34-saved-box .s34-follow-head svg { color: #8ab4f8 !important; }
        .s34-saved-box .s34-follow-head a:hover { color: #8ab4f8 !important; }
        .s34-follow-box.s34-saved-box a.s34-follow-row:is(:link, :visited) { color: #d6d6de !important; }
        .s34-saved-box .s34-follow-row.s34-on { background-color: rgba(138,180,248,0.12) !important; }
        .s34-saved-item { display: flex; align-items: center; gap: 2px; }
        .s34-saved-item .s34-follow-row { flex: 1; min-width: 0; }
        .s34-follow-box .s34-saved-x {
            all: unset; box-sizing: border-box; flex: none; width: 22px; height: 22px; border-radius: 6px;
            display: grid; place-items: center; cursor: pointer; font-size: 10px; line-height: 1;
            color: #9a9aa6 !important; background: transparent !important; opacity: .55;
        }
        .s34-follow-box .s34-saved-x:hover, .s34-follow-box .s34-saved-x:focus-visible { opacity: 1; color: #ff6b6b !important; background-color: rgba(255,255,255,0.08) !important; }
        .s34-follow-box .s34-saved-x:focus-visible { outline: 2px solid #8ab4f8; }
        @media (max-width: 760px) { .s34-follow-box .s34-saved-x { width: 34px; height: 34px; font-size: 12px; opacity: .8; } }
        .s34-follow-grouphead { display: flex; align-items: center; gap: 6px; margin: 14px 0 6px; font: 800 10.5px system-ui, -apple-system, Segoe UI, sans-serif; letter-spacing: .8px; text-transform: uppercase; color: #9a9aa6 !important; }
        .s34-follow-grouphead svg { width: 13px; height: 13px; color: #8ab4f8 !important; }
        .s34-follow-chip a { text-decoration: none !important; font-weight: 600; }
        .s34-follow-chip a:hover { text-decoration: underline !important; }
        .s34-follow-chip.s34-feed-artist a { color: #ff8a80 !important; }
        .s34-follow-box small.s34-has-new, .s34-follow-chip small.s34-has-new {
            flex: none;
            padding: 0 6px;
            border-radius: 4px;
            font-size: 10.5px;
            font-weight: 700;
            line-height: 17px;
            background-color: #e0457b !important;
            color: #fff !important;
            white-space: nowrap;
        }
        .s34-follow-chip small.s34-has-new { margin-left: 4px; }
        .s34-follow-more { display: block; padding: 4px 6px 1px; font-size: 11px; color: #9a9aa6 !important; text-decoration: none !important; }
        .s34-follow-more:hover { color: #ffb347 !important; }
        .s34-follow-none { padding: 0 4px 2px; font-size: 11.5px; opacity: .6; }

        /* ---- Sidebar layout (Beta 3.3) ---- */
        /* "View" header: same small caps as "Following" */
        .s34-q-head {
            font: 800 10.5px/1.2 system-ui, -apple-system, Segoe UI, sans-serif;
            letter-spacing: .8px;
            text-transform: uppercase;
            color: #dcdce0 !important;
            opacity: .75;
            margin-bottom: 1px;
        }
        .s34-follow-box { margin: 12px 0 0; }
        /* Collections · Stats · Blacklist · Settings: one calm 2×2 block */
        .s34-dock { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 12px 0; }
        .s34-tools .s34-dock, .s34-menu-tools .s34-dock { margin: 0; }
        .s34-dock .s34-hub { display: contents; }
        /* (Beta 3.8) Collections · Stats / Blacklist · Downloads (· Settings on phones) */
        .s34-dock .s34-hub [data-hub="coll"] { order: 1; }
        .s34-dock .s34-hub [data-hub="stats"] { order: 2; }
        .s34-dock .s34-blbtn { order: 3; }
        .s34-dock .s34-hub [data-hub="dl"] { order: 4; }
        .s34-dock .s34-gear { order: 5; }
        .s34-gear.s34-inline.s34-gear-in-nav { display: none !important; }
        .s34-dock .s34-hub button, .s34-dock .s34-blbtn, .s34-dock .s34-gear.s34-inline {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 7px !important;
            width: auto !important;
            height: 32px;
            min-width: 0;
            margin: 0 !important;
            padding: 0 9px !important;
            box-sizing: border-box;
            border-radius: 8px;
            border: 1px solid #33333a !important;
            background-color: #1c1c20 !important;
            color: #dcdce0 !important;
            font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif !important;
            opacity: .9;
            cursor: pointer;
        }
        .s34-dock .s34-hub button:hover, .s34-dock .s34-blbtn:hover, .s34-dock .s34-gear.s34-inline:hover {
            opacity: 1; background-color: #24242a !important; border-color: #4a4a56 !important;
        }
        .s34-dock svg { flex: none; width: 15px !important; height: 15px !important; color: #b9b9c3 !important; }
        .s34-dock svg * { color: inherit !important; }
        .s34-dock .s34-hub b, .s34-dock .s34-blbtn-text b, .s34-dock .s34-gear-text {
            min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            font: inherit !important; color: inherit !important; text-align: left;
        }
        .s34-dock .s34-hub small, .s34-dock .s34-blbtn-count { display: none !important; }
        .s34-dock .s34-blbtn-icon, .s34-dock .s34-blbtn-text { display: flex; min-width: 0; }
        /* Narrow sidebar (the real site's is ~165px): icon above the word,
           so "Collections" etc. are never cut off */
        .s34-dock { container-type: inline-size; }
        @container (max-width: 250px) {
            .s34-dock .s34-hub button, .s34-dock .s34-blbtn, .s34-dock .s34-gear.s34-inline {
                flex-direction: column !important;
                justify-content: center !important;
                gap: 3px !important;
                height: 46px;
                padding: 0 3px !important;
                font-size: 11.5px !important;
            }
            .s34-dock .s34-hub b, .s34-dock .s34-blbtn-text b, .s34-dock .s34-gear-text { text-align: center; max-width: 100%; }
        }

        /* Manage window */
        .s34-follow-win .s34-win-body { display: flex; flex-direction: column; gap: 14px; }
        .s34-follow-addrow { display: flex; gap: 8px; }
        .s34-follow-win .s34-follow-input {
            flex: 1;
            min-width: 0;
            height: 34px;
            box-sizing: border-box;
            padding: 0 12px !important;
            border-radius: 9px;
            background-color: rgba(0,0,0,0.35) !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            color: #e8e8ee !important;
            font-size: 13px;
        }
        .s34-follow-win .s34-follow-addbtn { height: 34px; }
        .s34-follow-list { display: flex; flex-direction: column; gap: 6px; max-height: 42vh; overflow-y: auto; }
        .s34-follow-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .s34-follow-chip {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            padding: 2px 4px 2px 10px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.14) !important;
            background-color: rgba(18,18,22,0.85) !important;
            font-size: 12.5px;
        }
        .s34-follow-chip button {
            all: unset;
            cursor: pointer;
            padding: 0 6px;
            font-size: 11px;
            opacity: .5;
            color: #dcdce0 !important;
        }
        .s34-follow-chip button:hover { opacity: 1; color: #ff6b6b !important; }
        /* "Follow which artist?" (L in the popup with several artists):
           a bell instead of the checkbox, the number key on the right */
        .s34-follow-menu .s34-cmenu-check,
        .s34-follow-menu .s34-cmenu-item.s34-on .s34-cmenu-check { border: none !important; background: transparent !important; color: #b9b9c3 !important; }
        .s34-follow-menu .s34-cmenu-item.s34-on .s34-cmenu-check { color: #ffb347 !important; }
        .s34-follow-menu .s34-cmenu-check svg { width: 15px; height: 15px; }
        .s34-follow-menu .s34-cmenu-item.s34-on .s34-cmenu-name { color: #ffcf8a !important; }
        .s34-follow-menu kbd.s34-cmenu-n {
            opacity: 1;
            min-width: 18px;
            padding: 1px 5px;
            border-radius: 4px;
            text-align: center;
            background-color: rgba(255,255,255,0.1) !important;
            color: #dcdce0 !important;
            font: 700 11px system-ui, sans-serif;
        }
        .s34-follow-empty { padding: 14px 4px; font-size: 13px; line-height: 1.55; opacity: .75; }
        .s34-follow-win .s34-follow-act, .s34-follow-win .s34-follow-addbtn {
            height: 30px;
            padding: 0 14px !important;
            border-radius: 8px;
            border: 1px solid #3a3a44 !important;
            background-color: #26262c !important;
            color: #e8e8ee !important;
            font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
            white-space: nowrap;
        }
        .s34-follow-win .s34-follow-act:hover, .s34-follow-win .s34-follow-addbtn:hover { border-color: #ffb347 !important; }
        .s34-follow-foot { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
        .s34-follow-win .s34-follow-act[disabled] { opacity: .4; cursor: default; }
        .s34-follow-win .s34-follow-act[hidden] { display: none !important; }
        .s34-follow-win .s34-follow-primary {
            display: inline-flex; align-items: center; gap: 6px;
            border: none !important;
            background: linear-gradient(135deg, #ffb347, #ff5f8f) !important;
            color: #fff !important;
        }
        .s34-follow-primary svg, .s34-follow-primary svg * { color: inherit !important; }
        @media (max-width: 760px) {
            .s34-chip .s34-chip-follow { padding: 0 8px 0 4px; }
            .s34-chip .s34-chip-follow svg { width: 15px; height: 15px; }
        }

        /* ---- The Following window (Beta 3.6): circles, header, grid ---- */
        html.s34-fw-open { overflow: hidden !important; }
        .s34-fw-overlay {
            position: fixed;
            inset: 0;
            z-index: 99985; /* under the popup viewer (a tile opens on top), over the page */
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            box-sizing: border-box;
            /* nearly opaque: the page behind steps right back */
            background-color: rgba(3,3,6,0.94) !important;
        }
        .s34-fw {
            display: flex;
            flex-direction: column;
            width: min(1000px, 100%);
            height: min(920px, 100%);
            box-sizing: border-box;
            overflow: hidden;
            border-radius: 16px;
            border: 1.5px solid transparent !important;
            background: linear-gradient(#18181c, #18181c) padding-box, linear-gradient(135deg, rgba(255,95,143,0.7), rgba(139,61,255,0.7)) border-box !important;
            box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 30px rgba(255,95,143,0.12);
            color: #e8e8ee !important;
            font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-fw * { box-sizing: border-box; }
        /* "Bigger": nearly the whole window, with a margin of dimmed page around it */
        .s34-fw-overlay.s34-fw-large { padding: 18px 22px; }
        .s34-fw-overlay.s34-fw-large .s34-fw { width: 100%; height: 100%; }
        .s34-fw-foot .s34-fw-size { margin-left: auto; height: 26px; padding: 0 10px !important; font-size: 12px; }
        .s34-fw-top { display: flex; align-items: center; gap: 10px; padding: 10px 14px 10px 16px; border-bottom: 1px solid #2c2c33 !important; }
        .s34-fw-title { display: flex; align-items: center; gap: 8px; font-size: 15px; }
        .s34-fw-title b { color: #f2f2f5 !important; }
        .s34-fw-title svg { width: 16px; height: 16px; color: #ffb347 !important; }
        .s34-fw-checked { flex: 1; min-width: 0; font-size: 11.5px; color: #8e8e9a !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .s34-fw-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 30px;
            padding: 0 12px !important;
            border-radius: 8px;
            border: 1px solid #3a3a44 !important;
            background-color: #24242a !important;
            color: #e8e8ee !important;
            font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
            text-decoration: none !important;
            white-space: nowrap;
            cursor: pointer;
        }
        .s34-fw-btn:hover { border-color: #ff5f8f !important; }
        .s34-fw-btn svg { width: 14px; height: 14px; color: inherit !important; }
        .s34-fw-btn svg * { color: inherit !important; }
        .s34-fw-x { width: 30px; justify-content: center; padding: 0 !important; }
        .s34-fw-follow.s34-following { border-color: rgba(255,179,71,0.5) !important; color: #ffb347 !important; }

        /* The row of circles (scrolls sideways) */
        .s34-fw-circles {
            display: flex;
            gap: 12px;
            flex: none;
            padding: 12px 16px 10px;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: thin;
            border-bottom: 1px solid #2c2c33 !important;
        }
        .s34-fw-c {
            all: unset;
            flex: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            width: 68px;
            cursor: pointer;
            text-align: center;
            background: transparent !important; /* beats the general button look */
            border: 0 !important;
        }
        .s34-fw-ring {
            display: grid;
            place-items: center;
            width: 62px;
            height: 62px;
            padding: 2.5px;
            border-radius: 50%;
            background: #3a3a44 !important;
        }
        .s34-fw-c.s34-new .s34-fw-ring { background: linear-gradient(135deg, #ffb347, #ff5f8f, #8b3dff) !important; }
        .s34-fw-c.s34-on .s34-fw-ring { outline: 2px solid #f2f2f5; outline-offset: 2px; }
        /* (the general button hover would paint a grey box behind the circle) */
        .s34-fw-c.s34-fw-c:hover, .s34-fw-c.s34-fw-c:focus, .s34-fw-c.s34-fw-c:active { background: transparent !important; border: 0 !important; }
        .s34-fw-c:focus-visible .s34-fw-ring { outline: 2px solid #ff5f8f; outline-offset: 2px; }
        .s34-fw-c.s34-gone { opacity: .45; }
        .s34-fw-pic {
            position: relative;
            display: grid;
            place-items: center;
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: 50%;
            border: 2.5px solid #18181c !important;
            background: linear-gradient(135deg, hsl(var(--h, 330) 62% 52%), hsl(calc(var(--h, 330) + 40) 58% 32%)) !important;
            color: #fff !important;
        }
        .s34-fw-pic img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
        .s34-fw-pic svg { width: 42%; height: 42%; color: #fff !important; }
        .s34-fw-pic svg * { color: inherit !important; }
        .s34-fw-allpic { background: conic-gradient(from 200deg, #ff5f8f, #8b3dff, #ffb347, #ff5f8f) !important; }
        .s34-fw-letter { font: 700 20px system-ui, -apple-system, Segoe UI, sans-serif; color: #fff !important; }
        .s34-fw-name { max-width: 68px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; color: #a4a4b0 !important; }
        .s34-fw-c.s34-on .s34-fw-name { color: #f2f2f5 !important; font-weight: 700; }

        /* Header + grid scroll together (like a profile page) */
        .s34-fw-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
        .s34-fw-head { display: flex; align-items: center; gap: 18px; padding: 16px 18px; flex-wrap: wrap; }
        .s34-fw-big { flex: none; width: 76px; height: 76px; border-radius: 50%; }
        .s34-fw-big .s34-fw-pic { border-color: transparent !important; }
        .s34-fw-big .s34-fw-letter { font-size: 28px; }
        .s34-fw-info { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; }
        .s34-fw-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .s34-fw-nm { font-size: 19px; color: #f2f2f5 !important; overflow-wrap: anywhere; }
        .s34-fw-nums { display: flex; flex-wrap: wrap; gap: 4px 18px; color: #a4a4b0 !important; font-size: 13px; font-variant-numeric: tabular-nums; }
        .s34-fw-nums b { color: #f2f2f5 !important; }
        .s34-fw-empty { padding: 30px 8px; max-width: 520px; margin: 0 auto; text-align: center; font-size: 13.5px; line-height: 1.6; color: #b9b9c3 !important; }

        /* Each post in its own shape, in rows of one height that fill the
           width (like the posts page) - newest first, left to right. --r is
           the picture's ratio (setThumbRatios); a tall guess until it's known */
        .s34-fw { --s34-fw-row: 230px; }
        .s34-fw-grid {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            gap: 3px;
            padding: 0 3px 3px;
        }
        .s34-fw-grid::after { content: ''; flex-grow: 1000000000; } /* the last row doesn't stretch */
        .s34-fw-grid span.thumb {
            position: relative;
            display: block !important;
            flex-grow: calc(var(--r, 0.75) * 100);
            flex-basis: calc(var(--r, 0.75) * var(--s34-fw-row));
            aspect-ratio: var(--r, 0.75);
            max-height: calc(var(--s34-fw-row) * 1.8);
            min-width: 0;
            width: auto !important;
            height: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden;
            background-color: #26262c !important;
            text-align: left;
        }
        .s34-fw-grid span.thumb > a { position: absolute; inset: 0; display: block; }
        .s34-fw-grid span.thumb img {
            display: block;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            object-fit: cover;
        }
        .s34-fw-grid span.thumb:hover img { filter: brightness(.85); }
        .s34-fw-by {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 14px 8px 5px;
            background: linear-gradient(transparent, rgba(0,0,0,0.75)) !important;
            color: #fff !important;
            font: 600 11px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;
        }
        .s34-fw-status { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 56px; padding: 12px; color: #a4a4b0 !important; font-size: 12.5px; }
        .s34-fw-foot {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px 16px;
            padding: 8px 16px;
            border-top: 1px solid #2c2c33 !important;
            color: #8e8e9a !important;
            font-size: 12px;
        }
        .s34-fw-foot kbd {
            padding: 1px 6px;
            border-radius: 4px;
            border: 1px solid #3a3a44 !important;
            background-color: #24242a !important;
            color: #e8e8ee !important;
            font: 700 11px system-ui, sans-serif;
        }
        /* Phones: the whole screen, lower rows, no key hints */
        @media (max-width: 760px) {
            .s34-fw-overlay { padding: 0; }
            .s34-fw { --s34-fw-row: 140px; width: 100%; height: 100%; border-radius: 0; border: 0 !important; background: #18181c !important; }
            .s34-fw-grid { gap: 2px; padding: 0 0 2px; }
            .s34-fw-head { gap: 14px; padding: 14px; }
            .s34-fw-big { width: 64px; height: 64px; }
            .s34-fw-info { min-width: 0; }
            .s34-fw-nm { font-size: 17px; }
            .s34-fw-foot { display: none; }
        }

        /* ---- Home: rule34's start page as a small home (Beta 3.6, 26c-home.js) ---- */
        html.s34-home-on div#static-index { display: block; text-align: left; align-items: stretch; }
        .s34-home-old { display: none !important; }
        .s34-home {
            max-width: 1180px;
            margin: 0 auto;
            padding: 18px 20px 48px;
            box-sizing: border-box;
            font: 13px/1.45 system-ui, -apple-system, Segoe UI, sans-serif;
            color: #dcdce0 !important;
        }
        .s34-home * { box-sizing: border-box; }
        .s34-home-head { display: flex; align-items: center; gap: 10px 26px; flex-wrap: wrap; margin-bottom: 16px; }
        .s34-home-head .s34-home-logo { margin: 0; line-height: 0; }
        .s34-home-head .s34-home-logo img { width: auto !important; max-width: 260px !important; max-height: 96px; height: auto; }
        .s34-home-head #links { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 14px; }
        .s34-home-main { display: grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr); gap: 16px; align-items: start; }
        .s34-home-left { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        .s34-home-card {
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 0;
            padding: 14px;
            border-radius: 12px;
            border: 1px solid #2c2c33 !important;
            background-color: #101014 !important;
        }
        .s34-home-card[hidden] { display: none !important; }
        .s34-home-label {
            font: 800 10.5px/1.2 system-ui, -apple-system, Segoe UI, sans-serif;
            letter-spacing: .8px;
            text-transform: uppercase;
            color: #9a9aa6 !important;
        }
        .s34-home-search .space, .s34-home-search form { margin: 0; }
        /* Recent and favourite tags have their own card here (the bell needs a search) */
        .s34-home .s34-sb-tools { display: none !important; }
        .s34-home-resume { flex-direction: row; align-items: center; gap: 12px; }
        .s34-home-resume-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .s34-home-resume-text b { font-size: 14px; color: #f2f2f5 !important; overflow-wrap: anywhere; }
        .s34-home-resume-text small { font-size: 12px; color: #9a9aa6 !important; }
        .s34-home-btn {
            flex: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 30px;
            padding: 0 12px !important;
            border-radius: 8px;
            border: 1px solid #3a3a44 !important;
            background-color: #24242a !important;
            color: #e8e8ee !important;
            font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
            text-decoration: none !important;
            white-space: nowrap;
            cursor: pointer;
        }
        .s34-home-btn:hover { border-color: #ff5f8f !important; }
        .s34-home-btn[hidden] { display: none !important; }
        .s34-home-btn kbd { padding: 0 5px; border-radius: 4px; border: 1px solid #3a3a44 !important; background-color: #18181c !important; color: #e8e8ee !important; font: 700 11px system-ui, sans-serif; }
        .s34-home-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .s34-home a.s34-home-recent-item:is(:link, :visited) {
            max-width: 100%;
            padding: 4px 10px;
            border-radius: 8px;
            border: 1px solid #2c2c33 !important;
            background-color: #17171b !important;
            color: #c9c9d2 !important;
            font-size: 12px;
            text-decoration: none !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .s34-home a.s34-home-recent-item:hover { border-color: #3a6fd4 !important; color: #f2f2f5 !important; }
        .s34-home .s34-home-fav-chip {
            padding: 2px 10px !important;
            border-radius: 999px;
            border: 1px solid #34508c !important;
            background-color: #1f2a44 !important;
            color: #cfe0ff !important;
            font: 600 12px/20px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
        }
        .s34-home .s34-home-fav-chip:hover { border-color: #3a6fd4 !important; }
        .s34-home .s34-home-fav-chip.s34-on { border-color: #3a6fd4 !important; background-color: rgba(44,95,204,0.45) !important; }
        /* The post count as text, Terms · Contact · DMCA below it */
        .s34-home-meta { display: flex; flex-direction: column; gap: 6px; padding: 0 4px; font-size: 11.5px; color: #8e8e9a !important; }
        .s34-home-meta p { margin: 0; }
        .s34-home-meta small { font-size: 11px; line-height: 1.6; }
        /* The site's own welcome line, under the following card */
        .s34-home-right { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
        .s34-home-tagline:empty { display: none; }
        .s34-home-tagline > div {
            padding: 8px 10px;
            border-left: 2px solid #ff5f8f !important;
            border-radius: 0 8px 8px 0;
            background-color: rgba(255,95,143,0.07) !important;
            font-size: 13px;
            line-height: 1.5;
            font-weight: 500;
            color: #e8e8ee !important;
        }
        .s34-home-meta small a { margin-right: 10px; }
        .s34-home-follow-head { display: flex; align-items: center; gap: 10px; }
        .s34-home-follow-head .s34-home-label { flex: 1; min-width: 0; }
        .s34-home-new { flex: none; padding: 0 7px; border-radius: 4px; background-color: #e0457b !important; color: #fff !important; font: 700 11px/19px system-ui, sans-serif; }
        /* room for the selected circle's ring (the row scrolls sideways and
           would cut it off) */
        .s34-home .s34-home-circles { padding: 6px 6px 4px; margin: -6px -6px 0; border: 0 !important; }
        .s34-home .s34-fw-pic { border-color: #101014 !important; }
        .s34-home-grid { --s34-fw-row: 170px; padding: 0; border-radius: 10px; overflow: hidden; }
        .s34-home-status { display: flex; align-items: center; gap: 8px; font-size: 12.5px; line-height: 1.5; color: #a4a4b0 !important; }
        .s34-home-status:empty { display: none; }
        /* Brand new (nothing followed yet): three steps instead of the circles */
        .s34-home-start { gap: 12px; }
        .s34-home-start-title { margin: 0; font: 700 18px/1.3 system-ui, -apple-system, Segoe UI, sans-serif; color: #f2f2f5 !important; }
        .s34-home-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .s34-home-steps li { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; border: 1px solid #24242b !important; background-color: #14141a !important; }
        .s34-home-steps b { display: block; font-size: 13.5px; color: #f2f2f5 !important; }
        .s34-home-steps small { display: block; font-size: 12.5px; line-height: 1.5; color: #a4a4b0 !important; }
        .s34-home-step-ico { flex: none; width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; font-size: 15px; background: linear-gradient(135deg, rgba(255,95,143,0.22), rgba(139,61,255,0.22)) !important; color: #ffcf8a !important; }
        .s34-home-bell svg { width: 16px; height: 16px; color: #ffb347 !important; }
        .s34-home-start-btns { display: flex; flex-wrap: wrap; gap: 8px; }
        .s34-home .s34-home-primary { border: 0 !important; background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important; }
        /* Phones: one column - search, following, continue, recent */
        @media (max-width: 760px) {
            .s34-home { padding: 12px 12px 36px; }
            .s34-home-head { justify-content: center; text-align: center; }
            .s34-home-head .s34-home-logo img { max-width: 220px !important; max-height: 80px; }
            .s34-home-head #links { justify-content: center; }
            .s34-home-main { display: flex; flex-direction: column; align-items: stretch; gap: 12px; }
            .s34-home-search .space, .s34-home-search form, .s34-home-search .s34-sb { width: 100% !important; max-width: none !important; }
            .s34-home-grid span.thumb:nth-child(n+9) { display: none !important; } /* 8 here - all of them in the window */
            .s34-home-left { display: contents; }
            .s34-home-search { order: 1; }
            .s34-home-follow { order: 2; }
            .s34-home-resume { order: 3; }
            .s34-home-recent { order: 4; }
            .s34-home-meta { order: 6; text-align: center; }
            .s34-home-right { display: contents; }
            .s34-home-tagline { order: 5; }
            .s34-home-grid { --s34-fw-row: 120px; }
        }
    `;

export { FOLLOW_CSS, PHONE_CSS, TOUR_CSS };
