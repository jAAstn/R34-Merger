// styles/windows – Steamy34 (aus Steamy34.js aufgeteilt)
const WINDOWS_CSS = `
        /* Quick tips window */
        .s34-tips {
            width: min(600px, calc(100vw - 24px));
            max-height: min(88vh, 820px);
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            border-radius: 18px;
            overflow: hidden;
            background: linear-gradient(180deg, #1f1d26 0%, #17161c 100%) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
            color: #e8e8ee !important;
            font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
            animation: s34-blm-in .16s ease-out;
        }
        .s34-tips-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px 12px; }
        .s34-tips-head img { width: 40px; height: 40px; border-radius: 11px; flex: none; }
        .s34-tips-head > div { flex: 1; min-width: 0; }
        .s34-tips-title { font-size: 18px; font-weight: 800; }
        .s34-tips-sub { font-size: 12px; opacity: .6; }
        .s34-tips .s34-tips-close {
            width: 32px; height: 32px; padding: 0 !important;
            border-radius: 10px; border: none !important;
            background-color: rgba(255,255,255,0.06) !important;
            color: #e8e8ee !important; cursor: pointer; font-size: 14px;
        }
        .s34-tips .s34-tips-close:hover { background-color: rgba(255,255,255,0.12) !important; }
        /* Computer / Phone switch */
        .s34-tips-modes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            margin: 0 20px 14px;
            padding: 4px;
            border-radius: 12px;
            background-color: rgba(0,0,0,0.35) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
        }
        .s34-tips .s34-tips-modes button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            height: 34px;
            padding: 0 !important;
            border-radius: 9px;
            border: none !important;
            background: transparent !important;
            color: #a9a9b3 !important;
            font: 700 13px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
        }
        .s34-tips .s34-tips-modes button svg { display: block; }
        .s34-tips .s34-tips-modes button:hover { color: #fff !important; }
        .s34-tips .s34-tips-modes button.s34-on {
            background: linear-gradient(135deg, rgba(255,95,143,0.28), rgba(139,61,255,0.28)) !important;
            color: #fff !important;
            box-shadow: inset 0 0 0 1px rgba(255,143,176,0.45);
        }
        /* Groups as cards, one row per key / gesture */
        .s34-tips-body { overflow-y: auto; padding: 0 20px 8px; }
        .s34-tips-group { margin-bottom: 16px; }
        .s34-tips-label {
            display: flex;
            align-items: center;
            gap: 7px;
            margin: 2px 2px 8px;
            font-size: 11.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.1px;
            color: #ff8fa3 !important;
        }
        .s34-tips-label svg { display: block; width: 15px; height: 15px; }
        .s34-tips-card {
            border-radius: 14px;
            overflow: hidden;
            background-color: rgba(255,255,255,0.035) !important;
            border: 1px solid rgba(255,255,255,0.07) !important;
        }
        .s34-tips-row {
            display: grid;
            grid-template-columns: minmax(150px, 42%) 1fr;
            gap: 14px;
            align-items: center;
            padding: 11px 14px;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
        }
        .s34-tips-row:first-child { border-top: none !important; }
        .s34-tips-keys { font-size: 12.5px; line-height: 1.9; color: #b8b8c2 !important; }
        .s34-tips-what { font-size: 13.5px; line-height: 1.5; color: #ececf1 !important; }
        @media (max-width: 520px) {
            .s34-tips-row { grid-template-columns: 1fr; gap: 4px; }
            .s34-tips-head, .s34-tips-body, .s34-tips-foot { padding-left: 14px; padding-right: 14px; }
            .s34-tips-modes { margin: 0 14px 12px; }
        }
        .s34-tips kbd {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            min-width: 18px;
            justify-content: center;
            padding: 3px 8px;
            border-radius: 6px;
            font: 700 12px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            color: #fff !important;
            background-color: #2b2933 !important;
            border: 1px solid rgba(255,255,255,0.16) !important;
            box-shadow: 0 2px 0 rgba(0,0,0,0.5);
        }
        .s34-tips kbd svg { display: block; }
        .s34-tips-new {
            display: inline-block;
            margin-right: 6px;
            padding: 0 5px;
            border-radius: 4px;
            vertical-align: 1px;
            font: 800 9.5px/15px system-ui, -apple-system, Segoe UI, sans-serif;
            letter-spacing: .5px;
            color: #fff !important;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important;
        }
        /* Example tag bubble (looks like the ones in the search box) */
        .s34-tips-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin: 1px 0;
            padding: 0 6px 0 8px;
            border-radius: 999px;
            font: 600 11.5px/18px system-ui, -apple-system, Segoe UI, sans-serif;
            white-space: nowrap;
            color: #7ee07e !important;
            background-color: rgba(255,255,255,0.06) !important;
            border: 1px solid rgba(126,224,126,0.5) !important;
        }
        .s34-tips-pill i { font-style: normal; opacity: .55; }
        .s34-tips-pill.s34-tips-pill-ex {
            text-decoration: line-through;
            border: 1px dashed rgba(255,80,80,0.75) !important;
            background-color: rgba(255,60,60,0.10) !important;
        }
        .s34-tips-foot {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px 16px;
            border-top: 1px solid rgba(255,255,255,0.07) !important;
            font-size: 11.5px;
        }
        .s34-tips-foot > span { flex: 1; opacity: .7; line-height: 1.5; }
        .s34-tips-hobby { display: block; margin-top: 3px; font-size: 11px; color: #ff9fbf !important; }
        .s34-tips-foot .s34-qmark { opacity: 1; flex: none; }
        .s34-tips .s34-tips-ok {
            height: 34px;
            padding: 0 22px !important;
            border-radius: 10px;
            border: none !important;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important;
            color: #fff !important;
            font-weight: 700;
            cursor: pointer;
        }
        .s34-tips .s34-tips-ok:hover { filter: brightness(1.12); }
        /* Our windows never inherit the page's centred text */
        .s34-tips, .s34-blm, .s34-panel, .s34-pv-side { text-align: left !important; }

        /* Round "?" badge: opens the quick tips */
        .s34-qmark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 17px;
            height: 17px;
            box-sizing: border-box;
            border-radius: 50%;
            border: 1.5px solid currentColor !important;
            font: 800 11px/1 system-ui, -apple-system, Segoe UI, sans-serif;
            vertical-align: -3px;
            margin: 0 2px;
        }
        .s34-pv-help {
            width: 22px;
            height: 22px;
            font-size: 13px;
            cursor: pointer;
            color: #dcdce0 !important;
            opacity: .65;
        }
        .s34-pv-help:hover { opacity: 1; }
        .s34-panel-foot { flex-wrap: wrap; row-gap: 8px; }
        .s34-panel-foot .s34-btn { white-space: nowrap; }
        /* "? Shortcuts & tips" under the sidebar settings button */
        .s34-tipslink {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap; /* the real site's sidebar is only 180px: two lines then */
            gap: 0 4px;
            width: 100%;
            box-sizing: border-box;
            margin: -6px 0 14px !important;
        }
        .s34-tools .s34-tipslink { margin: -2px 0 0 !important; }
        .s34-tipslink button {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 6px !important;
            border: none !important;
            background: transparent !important;
            color: #b8b8c2 !important;
            font: 600 11.5px system-ui, -apple-system, Segoe UI, sans-serif;
            white-space: nowrap;
            cursor: pointer;
            opacity: .75;
        }
        .s34-tipslink button svg { display: block; width: 13px; height: 13px; color: #ffb347; }
        .s34-tipslink button:hover { opacity: 1; color: #fff !important; }

        /* Changelog window */
        .s34-cl-list { display: flex; flex-direction: column; gap: 10px; }
        .s34-cl-list[hidden] { display: none; }
        .s34-win .s34-cl-more { align-self: flex-start; }
        .s34-cl-entry {
            padding: 10px 14px;
            border-radius: 12px;
            background-color: rgba(255,255,255,0.03) !important;
            border: 1px solid rgba(255,255,255,0.06) !important;
        }
        .s34-cl-entry.s34-cl-new {
            background-color: rgba(255,179,71,0.07) !important;
            border-color: rgba(255,179,71,0.4) !important;
        }
        .s34-cl-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
        .s34-cl-head b { font-size: 14px; }
        .s34-cl-head span { font-size: 11.5px; opacity: .5; }
        .s34-cl-head em {
            margin-left: auto;
            padding: 0 6px;
            border-radius: 4px;
            font: 800 9.5px/16px system-ui, -apple-system, Segoe UI, sans-serif;
            font-style: normal;
            letter-spacing: .5px;
            color: #fff !important;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important;
        }
        .s34-cl-entry ul { margin: 0 !important; padding: 0 0 0 18px !important; }
        .s34-cl-entry li { margin: 3px 0; font-size: 12.5px; line-height: 1.45; color: #d4d4dc !important; list-style: disc !important; }
        .s34-cl-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 4px; }
        .s34-win .s34-cl-tips {
            display: flex; align-items: center; gap: 6px;
            height: 34px; padding: 0 12px !important; border-radius: 10px; cursor: pointer;
            background-color: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.12) !important;
            color: #e8e8ee !important; font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-win .s34-cl-ok {
            height: 34px; padding: 0 22px !important; border-radius: 10px; border: none !important; cursor: pointer;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; color: #fff !important; font-weight: 700;
        }

        /* Sidebar "Blacklist" button: slim, like the Settings button
           (line icon + name, the number of tags small and quiet) */
        .s34-blbtn {
            box-sizing: border-box;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            margin: 14px 0 -6px;
            padding: 7px 10px;
            border-radius: 8px;
            border: 1px solid #33333a !important;
            background-color: #1c1c20 !important;
            color: #dcdce0 !important;
            cursor: pointer;
            user-select: none;
            opacity: .85;
            transition: opacity .15s, background-color .15s;
        }
        .s34-tools .s34-blbtn { margin: 0; }
        .s34-blbtn:hover { opacity: 1; background-color: #24242a !important; }
        .s34-blbtn-icon { flex: none; display: flex; color: inherit !important; }
        .s34-blbtn-icon svg { display: block; width: 16px; height: 16px; color: inherit !important; }
        .s34-blbtn-icon svg * { color: inherit !important; stroke-width: 2; }
        .s34-blbtn-text { display: flex; align-items: baseline; gap: 6px; min-width: 0; white-space: nowrap; }
        .s34-blbtn-text b { font-size: 13px; font-weight: 600; color: #dcdce0 !important; }
        .s34-blbtn-count { font-size: 11px; opacity: .55; color: #dcdce0 !important; }

        /* Blacklist window */
        .s34-blm {
            width: min(560px, calc(100vw - 32px));
            max-height: min(84vh, 760px);
            display: flex;
            flex-direction: column;
            gap: 14px;
            box-sizing: border-box;
            padding: 20px;
            border-radius: 18px;
            background: linear-gradient(180deg, #1f1d26 0%, #17161c 100%) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
            color: #e8e8ee !important;
            font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
            animation: s34-blm-in .16s ease-out;
        }
        @keyframes s34-blm-in { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: none; opacity: 1; } }
        .s34-blm-head { display: flex; align-items: center; gap: 12px; }
        .s34-blm-icon {
            flex: none;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #ff4d6d, #b5179e) !important;
            color: #fff !important;
            box-shadow: 0 6px 18px rgba(255,77,109,0.35);
        }
        .s34-blm-icon svg { width: 22px; height: 22px; }
        .s34-blm-heading { flex: 1; min-width: 0; }
        .s34-blm-title { font-size: 18px; font-weight: 800; letter-spacing: .2px; }
        .s34-blm-sub { font-size: 12px; opacity: .6; }
        .s34-blm .s34-blm-close {
            width: 32px;
            height: 32px;
            padding: 0 !important;
            border-radius: 10px;
            border: none !important;
            background-color: rgba(255,255,255,0.06) !important;
            color: #e8e8ee !important;
            cursor: pointer;
            font-size: 14px;
        }
        .s34-blm .s34-blm-close:hover { background-color: rgba(255,255,255,0.12) !important; }

        .s34-blm-add { display: flex; gap: 8px; }
        .s34-blm-add .s34-ac-wrap { flex: 1; }
        .s34-blm .s34-blm-input, .s34-blm .s34-blm-filter {
            width: 100%;
            height: 36px;
            box-sizing: border-box;
            padding: 0 12px !important;
            border-radius: 10px;
            font-size: 13px;
            background-color: rgba(0,0,0,0.35) !important;
            border: 1px solid rgba(255,255,255,0.10) !important;
            color: #e8e8ee !important;
            outline: none;
        }
        .s34-blm .s34-blm-input:focus, .s34-blm .s34-blm-filter:focus { border-color: #ff4d6d !important; }
        .s34-blm .s34-blm-addbtn {
            flex: none;
            height: 36px;
            padding: 0 18px !important;
            border-radius: 10px;
            border: none !important;
            background: linear-gradient(135deg, #ff4d6d, #b5179e) !important;
            color: #fff !important;
            font-weight: 700;
            cursor: pointer;
        }
        .s34-blm .s34-blm-addbtn:hover { filter: brightness(1.12); }

        .s34-blm-recent-box[hidden] { display: none; }
        .s34-blm-label, .s34-blm-group {
            margin-bottom: 7px;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: .55;
        }
        .s34-blm-recent { display: flex; flex-wrap: wrap; gap: 8px; }
        .s34-blm-recent-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .s34-blm-ago { font-size: 10px; opacity: .5; padding-left: 8px; }

        .s34-blm-chip {
            display: inline-flex;
            align-items: center;
            max-width: 100%;
            padding: 2px 10px;
            border-radius: 999px;
            font-weight: 600;
            font-size: 12px;
            background-color: rgba(255,255,255,0.05) !important;
            border: 1px solid rgba(255,255,255,0.14) !important;
            color: #c9c9d1 !important;
            overflow-wrap: anywhere;
        }
        .s34-blm-artist    { color: #ff8a80 !important; border-color: rgba(255,138,128,0.45) !important; }
        .s34-blm-character { color: #7ee07e !important; border-color: rgba(126,224,126,0.45) !important; }
        .s34-blm-copyright { color: #d68cff !important; border-color: rgba(214,140,255,0.45) !important; }
        .s34-blm-general   { color: #8ab4f8 !important; border-color: rgba(138,180,248,0.45) !important; }
        .s34-blm-metadata  { color: #ffb86b !important; border-color: rgba(255,184,107,0.45) !important; }
        .s34-blm .s34-blm-x {
            margin: 0 -4px 0 6px;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            color: inherit !important;
            opacity: .55;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
        }
        .s34-blm .s34-blm-x:hover { opacity: 1; color: #ff6b6b !important; }

        .s34-blm-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .s34-blm-tools .s34-blm-filter { flex: 1 1 140px; width: auto; }
        .s34-blm-sort {
            display: flex;
            padding: 3px;
            border-radius: 10px;
            background-color: rgba(0,0,0,0.35) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
        }
        .s34-blm .s34-blm-sort button {
            height: 28px;
            padding: 0 10px !important;
            border-radius: 8px;
            border: none !important;
            background: transparent !important;
            color: #b8b8c2 !important;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
        }
        .s34-blm .s34-blm-sort button:hover { color: #fff !important; }
        .s34-blm .s34-blm-sort button.s34-on {
            background-color: rgba(255,77,109,0.18) !important;
            color: #ff8fa3 !important;
            box-shadow: inset 0 0 0 1px rgba(255,77,109,0.45);
        }

        .s34-blm-list {
            flex: 1;
            min-height: 120px;
            overflow-y: auto;
            margin: 0 -6px;
            padding: 0 6px;
        }
        .s34-blm-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 4px; }
        .s34-blm-item { padding: 3px 10px 3px 11px; cursor: default; transition: background-color .12s, border-color .12s; }
        .s34-blm-item:hover { background-color: rgba(255,255,255,0.10) !important; }
        .s34-blm-name { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s34-blm-group { margin: 12px 0 6px; }
        .s34-blm-group:first-child { margin-top: 2px; }
        .s34-blm-empty { padding: 26px 8px; text-align: center; opacity: .55; font-style: italic; }
        .s34-blm-foot { display: flex; flex-direction: column; gap: 6px; font-size: 11px; text-align: center; }
        .s34-blm-foot > div:last-child { opacity: .55; }
        /* Not on the account yet (Beta 3.7): an amber dashed outline */
        .s34-blm-chip.s34-blm-unsaved { border-style: dashed !important; box-shadow: inset 0 0 0 1px rgba(255,179,71,0.55); }
        .s34-blm-account { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: -6px 0 -2px; font-size: 12px; color: #9fe3b8 !important; }
        .s34-blm-account[hidden] { display: none; }
        .s34-blm-for { flex: none; padding: 0 8px; border-radius: 8px; border: 1px solid #3a3a44 !important; background: #1b1b20 !important; color: #e8e8ee !important; font: 500 12px system-ui, sans-serif; }
        .s34-blm-muted-box[hidden] { display: none; }
        .s34-blm-muted { display: flex; flex-wrap: wrap; gap: 6px; }
        .s34-blm-mutedchip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 4px 3px 10px; border-radius: 7px; border: 1px dashed rgba(138,180,248,.5) !important; color: #cfe0ff !important; font-size: 12px; }
        .s34-blm-mutedchip small { opacity: .65; }
        .s34-blm-mutedchip button { border: none !important; background: none !important; color: inherit !important; cursor: pointer; padding: 0 4px; }
        .s34-blm-account-save { margin-left: auto; padding: 4px 12px; border-radius: 7px; border: 1px solid rgba(255,179,71,0.6) !important; background: rgba(255,179,71,0.15) !important; color: #ffd9ad !important; font: 600 12px system-ui, sans-serif; cursor: pointer; }
        .s34-blm-account-save:hover { background: rgba(255,179,71,0.28) !important; }
        .s34-blm-account-save:disabled { opacity: .6; cursor: progress; }
        .s34-blm-account.s34-blm-account-diff { margin: 0; padding: 8px 12px; border-radius: 9px; color: #ffd9ad !important; border: 1px dashed rgba(255,179,71,0.5) !important; background: rgba(255,179,71,0.07) !important; }
        .s34-blm a.s34-blm-account-go { margin-left: auto; color: #ffb347 !important; font-weight: 700; text-decoration: none !important; white-space: nowrap; }
        .s34-blm a.s34-blm-account-go:hover { text-decoration: underline !important; }
        /* The same panel inline on rule34's Options page */
        .s34-blm.s34-blm-inline {
            width: auto; max-height: none; padding: 4px 0 12px; border-radius: 0; animation: none;
            background: none !important; border: none !important; box-shadow: none;
        }
        .s34-blm-inline .s34-blm-list { flex: none; min-height: 0; max-height: 460px; }
        .s34-blm-dates[hidden], .s34-blm-status[hidden] { display: none; }
        .s34-blm-dates {
            padding: 7px 10px;
            border-radius: 8px;
            text-align: left;
            line-height: 1.45;
            background-color: rgba(255,255,255,0.04) !important;
            color: #b8b8c2 !important;
        }
        .s34-blm-status {
            margin: -4px 0;
            font-size: 11.5px;
            color: #8ab4f8 !important;
        }
        .s34-blm-why {
            margin: -2px 0 8px;
            padding: 7px 10px;
            border-radius: 8px;
            font-size: 11.5px;
            line-height: 1.45;
            background-color: rgba(255,184,107,0.08) !important;
            border: 1px dashed rgba(255,184,107,0.35) !important;
            color: #e8cfa8 !important;
        }
        .s34-blm { position: relative; }
        .s34-blm-name { cursor: pointer; }
        .s34-blm-typemenu {
            position: absolute;
            z-index: 5;
            display: flex;
            flex-direction: column;
            gap: 3px;
            min-width: 160px;
            padding: 8px;
            border-radius: 12px;
            background-color: #24222c !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            box-shadow: 0 14px 34px rgba(0,0,0,0.6);
        }
        .s34-blm-typemenu-head { font-size: 11px; opacity: .6; padding: 0 4px 4px; overflow-wrap: anywhere; }
        .s34-blm .s34-blm-typemenu button {
            text-align: left;
            height: 28px;
            padding: 0 10px !important;
            border-radius: 8px;
            border: 1px solid transparent !important;
            background: transparent !important;
            font-size: 12.5px;
            font-weight: 600;
            cursor: pointer;
        }
        .s34-blm .s34-blm-typemenu button:hover { background-color: rgba(255,255,255,0.07) !important; }
        .s34-blm .s34-blm-typemenu button.s34-on { border-color: currentColor !important; }
        .s34-blm-typemenu-head2 { margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); }
        .s34-blm .s34-blm-typemenu button.s34-blm-mode { color: #dcdce4 !important; }
        .s34-blm-softmark { margin-right: 4px; opacity: .8; }
        .s34-blm-softchip { border-style: dashed !important; }

        /* Settings: privacy & your data */
        .s34-privacy { display: flex; flex-direction: column; gap: 10px; margin-bottom: 6px; font-size: 12.5px; }
        .s34-privacy-hero {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 12px;
            border-radius: 10px;
            line-height: 1.5;
            background-color: rgba(46,160,90,0.10) !important;
            border: 1px solid rgba(46,160,90,0.45) !important;
            color: #d8f2e0 !important;
        }
        .s34-privacy-icon { font-size: 20px; line-height: 1; }
        .s34-privacy-note { font-size: 11.5px; line-height: 1.5; opacity: .7; }
        .s34-privacy-head {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: .6;
            margin-top: 4px;
        }
        .s34-privacy-list {
            display: flex;
            flex-direction: column;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #2c2c33 !important;
        }
        .s34-privacy-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 7px 10px;
            border-top: 1px solid #2c2c33 !important;
        }
        .s34-privacy-row:first-child { border-top: none !important; }
        .s34-privacy-row.s34-privacy-empty { opacity: .45; }
        .s34-privacy-info { flex: 1; min-width: 0; }
        .s34-privacy-name { font-weight: 600; }
        .s34-privacy-what { font-size: 11px; opacity: .6; }
        .s34-privacy-amount { font-size: 11px; opacity: .7; white-space: nowrap; }
        .s34-privacy-actions { display: flex; flex-wrap: wrap; gap: 8px; }

        /* "Already downloaded" question */
        .s34-confirm {
            width: min(380px, calc(100vw - 32px));
            box-sizing: border-box;
            padding: 22px 22px 16px;
            border-radius: 14px;
            text-align: center;
            background-color: #1c1c21 !important;
            border: 1px solid #33333a !important;
            box-shadow: 0 20px 60px rgba(0,0,0,0.7);
            color: #e8e8ec !important;
            font: 13px/1.45 system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-confirm-icon {
            width: 44px;
            height: 44px;
            margin: 0 auto 10px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #1f7a3e !important;
            color: #fff !important;
            font-size: 20px;
        }
        .s34-confirm-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
        .s34-confirm-text { opacity: .85; margin-bottom: 14px; }
        .s34-confirm-check {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 16px;
            font-size: 12px;
            opacity: .8;
            cursor: pointer;
            user-select: none;
        }
        .s34-confirm-check input { margin: 0; cursor: pointer; accent-color: #2c5fcc; }
        .s34-confirm-foot { display: flex; gap: 8px; justify-content: center; }
        .s34-confirm-foot .s34-btn { min-width: 120px; }

    `;

const CONTROLS_CSS = `
        /* Loading circle while ♥ / ▲ wait for the site */
        .s34-spin {
            display: inline-block;
            flex: none;
            width: 11px;
            height: 11px;
            margin-left: 6px;
            box-sizing: border-box;
            border: 2px solid currentColor;
            border-right-color: transparent;
            border-radius: 50%;
            vertical-align: -1px;
            animation: s34-spin .7s linear infinite;
        }
        @keyframes s34-spin { to { transform: rotate(360deg); } }
        .s34-busy { cursor: progress !important; }
        /* Thumbnail heart: the circle replaces the heart */
        .s34-fav-btn.s34-busy { opacity: 1 !important; }
        .s34-fav-btn.s34-busy svg { display: none; }
        .s34-fav-btn .s34-spin { margin: 0; width: 12px; height: 12px; }

        /* ---- Settings window: sections left, one section at a time ---- */
        .s34-set {
            width: min(860px, calc(100vw - 32px));
            height: min(640px, calc(100vh - 48px));
            display: grid;
            grid-template-columns: 220px minmax(0, 1fr);
            border-radius: 18px;
            overflow: hidden;
            background-color: #17161c !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 30px 80px rgba(0,0,0,0.7);
            color: #e8e8ee !important;
            font: 13px/1.45 system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left !important;
            animation: s34-blm-in .16s ease-out;
        }
        .s34-set-nav {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 18px 12px;
            background-color: #121116 !important;
            border-right: 1px solid rgba(255,255,255,0.06) !important;
            min-height: 0;
            overflow-y: auto;
        }
        .s34-set-brand { display: flex; align-items: center; gap: 10px; padding: 0 6px 14px; }
        .s34-set-brand img { width: 36px; height: 36px; border-radius: 10px; }
        .s34-set-brand b { display: block; font-size: 15px; }
        .s34-set-brand span { font-size: 11px; opacity: .5; }
        .s34-set-nav nav { display: flex; flex-direction: column; gap: 2px; }
        /* Search settings (in the header) and its results */
        .s34-set .s34-set-search {
            margin-left: auto;
            width: 210px;
            max-width: 45%;
            height: 30px;
            box-sizing: border-box;
            padding: 0 10px !important;
            border-radius: 8px;
            font-size: 12.5px;
            background-color: #1a1a1f !important;
            border: 1px solid #34343c !important;
            color: #e6e6ea !important;
        }
        .s34-set-results { padding: 4px !important; }
        .s34-set .s34-set-hit-btn {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 1px 12px;
            width: 100%;
            text-align: left;
            padding: 9px 12px !important;
            border: none !important;
            border-radius: 8px;
            background: none !important;
            color: inherit !important;
            cursor: pointer;
            font: inherit;
        }
        .s34-set .s34-set-hit-btn:hover, .s34-set .s34-set-hit-btn:focus-visible { background-color: rgba(255,255,255,0.05) !important; }
        .s34-set-hit-btn span { font-weight: 600; font-size: 13px; }
        .s34-set-hit-btn small { grid-column: 1; font-size: 11.5px; opacity: .55; white-space: normal !important; }
        .s34-set-hit-btn em { grid-column: 2; grid-row: 1 / span 2; align-self: center; font-style: normal; font-size: 11px; opacity: .6; white-space: nowrap; }
        .s34-set-nohit { padding: 14px; opacity: .6; }
        @keyframes s34-set-flash { 0%, 40% { background-color: rgba(255,95,143,0.18); } 100% { background-color: transparent; } }
        .s34-set-row.s34-set-flash { animation: s34-set-flash 1.8s ease-out; }
        .s34-set-nav nav button {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            height: 36px;
            padding: 0 10px !important;
            border-radius: 9px;
            border: none !important;
            background: transparent !important;
            color: #b8b8c2 !important;
            font: 600 13px system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left;
            cursor: pointer;
        }
        .s34-set-nav nav button svg { flex: none; display: block; opacity: .8; }
        .s34-set-nav nav button:hover { background-color: rgba(255,255,255,0.05) !important; color: #fff !important; }
        .s34-set-nav nav button.s34-on { background-color: rgba(255,95,143,0.14) !important; color: #ff8fb0 !important; }
        .s34-set-nav nav button.s34-on svg { opacity: 1; }
        .s34-set-safe {
            margin-top: auto;
            display: flex;
            gap: 8px;
            align-items: flex-start;
            padding: 10px;
            border-radius: 10px;
            font-size: 11px;
            line-height: 1.4;
            color: #9fd9b4 !important;
            background-color: rgba(46,160,90,0.08) !important;
        }
        .s34-set-safe svg { flex: none; width: 15px; height: 15px; margin-top: 1px; }
        /* Discord invite (Beta 3.6): always in reach, under the menu */
        a.s34-set-discord:is(:link, :visited) {
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 11px;
            border-radius: 10px;
            background-color: #5865f2 !important;
            color: #fff !important;
            text-decoration: none !important;
        }
        a.s34-set-discord:hover { background-color: #4752c4 !important; color: #fff !important; }
        .s34-set-discord svg { flex: none; width: 20px; height: 20px; color: #fff !important; }
        .s34-set-discord svg * { color: inherit !important; }
        .s34-set-discord span { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; color: #fff !important; }
        .s34-set-discord b { font-size: 12.5px; color: #fff !important; }
        .s34-set-discord small { font-size: 11px; opacity: .85; color: #fff !important; }
        .s34-set-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
        .s34-set-head { display: flex; align-items: center; padding: 18px 22px 10px; }
        .s34-set-head h2 { margin: 0 !important; font-size: 19px !important; font-weight: 800; color: #fff !important; flex: 1; }
        .s34-set .s34-set-x {
            width: 32px; height: 32px; padding: 0 !important; border-radius: 10px; border: none !important;
            background-color: rgba(255,255,255,0.06) !important; color: #e8e8ee !important; cursor: pointer; font-size: 14px;
        }
        .s34-set .s34-set-x:hover { background-color: rgba(255,255,255,0.12) !important; }
        .s34-set-body { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 22px 18px; }
        .s34-set-page { display: flex; flex-direction: column; gap: 12px; }
        .s34-set-card {
            border-radius: 14px;
            background-color: rgba(255,255,255,0.03) !important;
            border: 1px solid rgba(255,255,255,0.07) !important;
        }
        .s34-set-card[hidden] { display: none; }
        .s34-set-row {
            display: flex;
            align-items: center;
            gap: 14px;
            min-height: 52px;
            padding: 8px 14px;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
        }
        .s34-set-row:first-child { border-top: none !important; }
        .s34-set-label { flex: 1; min-width: 0; display: flex; flex-direction: column; cursor: pointer; }
        /* always wrap (the site's own label styles would keep them on one line) */
        .s34-set-label span, .s34-set-label small { white-space: normal !important; overflow-wrap: anywhere; }
        .s34-set-label span { font-weight: 600; font-size: 13px; }
        .s34-set-label small { font-size: 11.5px; opacity: .55; margin-top: 1px; line-height: 1.4; }
        .s34-set-plain p, .s34-set-row { white-space: normal !important; }
        .s34-set-ctl { flex: none; display: flex; align-items: center; gap: 6px; }
        .s34-set-ctl.s34-folder-ctl { flex: 0 1 auto; flex-wrap: wrap; justify-content: flex-end; max-width: 60%; }
        .s34-folder-name { font-size: 12.5px; font-weight: 600; overflow-wrap: anywhere; }
        .s34-folder-note { font-size: 11.5px; opacity: .7; text-align: right; white-space: normal !important; overflow-wrap: anywhere; max-width: 260px; }
        .s34-set .s34-set-ctl select, .s34-set .s34-set-ctl input[type="number"], .s34-set .s34-set-ctl input[type="text"] {
            height: 32px;
            box-sizing: border-box;
            padding: 0 10px !important;
            border-radius: 9px;
            font-size: 12.5px;
            background-color: #24232b !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            color: #e8e8ee !important;
        }
        .s34-set .s34-set-ctl select { min-width: 170px; cursor: pointer; }
        .s34-set .s34-set-ctl input[type="number"] { width: 84px; }
        .s34-set .s34-set-ctl input[type="text"] { width: 84px; text-align: center; }
        .s34-set .s34-set-ctl .s34-hotkey { width: 110px !important; font-weight: 700; cursor: pointer; }
        .s34-set .s34-unit { font-size: 11.5px; opacity: .55; }
        /* Switch */
        .s34-sw { position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; }
        .s34-sw input { position: absolute; opacity: 0; width: 0; height: 0; }
        .s34-sw-track {
            position: absolute;
            inset: 0;
            border-radius: 999px;
            background-color: #3a3a44 !important;
            transition: background-color .15s;
        }
        .s34-sw-track::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: #fff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            transition: transform .15s;
        }
        .s34-sw input:checked + .s34-sw-track { background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important; }
        .s34-sw input:checked + .s34-sw-track::after { transform: translateX(18px); }
        .s34-sw input:focus-visible + .s34-sw-track { outline: 2px solid #8b3dff; outline-offset: 2px; }
        .s34-set .s34-set-advbtn {
            align-self: flex-start;
            padding: 4px 6px !important;
            border: none !important;
            background: transparent !important;
            color: #9a9aa3 !important;
            font: 600 12px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
        }
        .s34-set .s34-set-advbtn:hover { color: #fff !important; }
        .s34-set-plain { padding: 4px 16px 14px; }
        .s34-set-cardhead { margin: 14px 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ff8fa3 !important; }
        .s34-set-plain p { margin: 0 0 10px !important; font-size: 12.5px; opacity: .8; }
        .s34-set-plain a { color: #8ab4f8 !important; }
        .s34-set-ver { opacity: .45 !important; font-size: 11.5px !important; }
        .s34-set-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .s34-set .s34-set-btn, .s34-set .s34-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 34px;
            padding: 0 14px !important;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.12) !important;
            background-color: rgba(255,255,255,0.06) !important;
            color: #e8e8ee !important;
            font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
            white-space: nowrap;
            cursor: pointer;
        }
        .s34-set .s34-set-btn:hover, .s34-set .s34-btn:hover { border-color: #ff5f8f !important; }
        .s34-set .s34-set-btn.s34-set-primary {
            border: none !important;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important;
            color: #fff !important;
            padding: 0 20px !important;
        }
        .s34-set .s34-set-btn.s34-set-danger, .s34-set .s34-btn.s34-danger { border-color: rgba(255,80,100,0.5) !important; color: #ff8a9a !important; }
        .s34-set .s34-set-tourbtn { margin-right: auto; }
        .s34-set-foot {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 22px;
            border-top: 1px solid rgba(255,255,255,0.07) !important;
        }
        .s34-set-dirty { margin-right: auto; font-size: 12px; color: #ffcf8a !important; }
        .s34-set-dirty[hidden] { display: none; }
        /* Privacy section inside the settings window */
        .s34-set .s34-privacy-clear {
            height: 26px; padding: 0 10px !important; border-radius: 7px; cursor: pointer; font-size: 11.5px;
            background: transparent !important; border: 1px solid rgba(255,255,255,0.14) !important; color: #dcdce0 !important;
        }
        .s34-set .s34-privacy-clear:hover:not(:disabled) { border-color: #ff4d6d !important; color: #ff8fa3 !important; }
        .s34-set .s34-privacy-clear:disabled { opacity: .35; cursor: default; }
        .s34-set .s34-privacy-list { border-color: rgba(255,255,255,0.07) !important; }
        .s34-set .s34-privacy-row { border-color: rgba(255,255,255,0.06) !important; }
        @media (max-width: 640px) {
            .s34-set { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
            .s34-set-nav { flex-direction: row; overflow-x: auto; padding: 10px; border-right: none !important; }
            .s34-set-brand, .s34-set-safe { display: none; }
            a.s34-set-discord:is(:link, :visited) { margin: 0 0 0 6px; padding: 6px 9px; flex: none; }
            .s34-set-discord span { display: none; } /* just the logo at the end of the row */
            .s34-set-nav nav { flex-direction: row; }
            .s34-set-nav nav button span { white-space: nowrap; }
        }

        /* Cloudflare check (Beta 3.6.3): big and centred at the bottom, with a
           pulse that keeps going - without the check nothing loads, so it must
           not be missed. (Beta 3.5 had a small pill in the corner.) */
        @keyframes s34-cf-glow {
            0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,0.55), 0 0 14px rgba(255,95,143,0.35), 0 0 30px rgba(139,61,255,0.22); }
            50%      { box-shadow: 0 10px 30px rgba(0,0,0,0.55), 0 0 26px rgba(255,95,143,0.75), 0 0 56px rgba(139,61,255,0.55); }
        }
        @keyframes s34-cf-ring {
            0%   { transform: scale(1, 1); opacity: .85; }
            100% { transform: scale(1.08, 1.45); opacity: 0; }
        }
        .s34-cf-pill {
            position: fixed;
            left: 50%;
            bottom: 22px;
            z-index: 100003;
            display: flex;
            align-items: center;
            gap: 14px;
            max-width: calc(100vw - 24px);
            box-sizing: border-box;
            padding: 10px 10px 10px 12px;
            border-radius: 999px;
            border: 2px solid transparent !important;
            background: linear-gradient(rgba(24,22,30,0.98), rgba(24,22,30,0.98)) padding-box,
                        linear-gradient(135deg, #ff5f8f, #8b3dff) border-box !important;
            color: #e8e8ee !important;
            font: 14px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left;
            box-shadow: 0 10px 30px rgba(0,0,0,0.55), 0 0 14px rgba(255,95,143,0.35), 0 0 30px rgba(139,61,255,0.22);
            opacity: 0;
            transform: translate(-50%, 16px);
            transition: opacity .25s ease, transform .25s ease;
            animation: s34-cf-glow 1.8s ease-in-out infinite;
        }
        /* a ring that keeps rippling outwards */
        .s34-cf-pill::after {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: inherit;
            border: 2px solid #ff5f8f;
            pointer-events: none;
            animation: s34-cf-ring 1.8s ease-out infinite;
        }
        .s34-cf-pill.s34-show { opacity: 1; transform: translate(-50%, 0); }
        /* Messages and the download bar move up above it */
        body:has(.s34-cf-pill.s34-show) .s34-toasts,
        body:has(.s34-cf-pill.s34-show) .s34-batch { bottom: 104px; }
        @media (max-width: 760px) {
            .s34-cf-pill {
                bottom: calc(12px + env(safe-area-inset-bottom, 0px));
                width: calc(100vw - 24px);
                gap: 12px;
            }
            .s34-cf-pill-text b, .s34-cf-pill-text small { white-space: normal !important; }
            .s34-cf-pill { padding-left: 16px; gap: 10px; }
            .s34-cf-pill .s34-cf-pill-icon { display: none; }
            .s34-cf-pill .s34-cf-pill-text b { font-size: 15px; }
            .s34-cf-pill.s34-cf-pill .s34-cf-pill-solve { padding: 0 18px !important; } /* (doubled: beats the rule further down) */
            html.s34-sfw .s34-cf-pill { bottom: calc(56px + env(safe-area-inset-bottom, 0px)); }
            body:has(.s34-cf-pill.s34-show) .s34-toasts,
            body:has(.s34-cf-pill.s34-show) .s34-batch { bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
        }
        /* Not needed while the check window itself is open */
        body:has(.s34-cf-overlay) .s34-cf-pill { opacity: 0; pointer-events: none; }
        .s34-cf-pill-icon {
            flex: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, rgba(255,95,143,0.22), rgba(139,61,255,0.22)) !important;
            color: #ff8fb0 !important;
        }
        .s34-cf-pill-icon svg { display: block; }
        .s34-cf-pill .s34-cf-pill-icon svg { width: 22px; height: 22px; }
        .s34-cf-inline .s34-cf-pill-icon { width: 28px; height: 28px; }
        /* ? with the explanation (hover, focus or tap) */
        .s34-cf-why {
            flex: none;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1.5px solid rgba(255,255,255,0.28) !important;
            color: #d6d6de !important;
            font: 700 14px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: help;
            outline: none;
        }
        .s34-cf-why:hover, .s34-cf-why:focus-visible, .s34-cf-why.s34-on { border-color: #ff5f8f !important; color: #fff !important; }
        .s34-cf-why-pop {
            position: absolute;
            left: 50%;
            bottom: calc(100% + 14px);
            width: min(380px, calc(100vw - 24px));
            box-sizing: border-box;
            padding: 14px 16px;
            border-radius: 14px;
            border: 1px solid rgba(255,95,143,0.45) !important;
            background-color: #1c1a22 !important;
            color: #cfcfd8 !important;
            font: 400 13px/1.5 system-ui, -apple-system, Segoe UI, sans-serif;
            box-shadow: 0 12px 32px rgba(0,0,0,0.6);
            cursor: default;
            opacity: 0;
            visibility: hidden;
            transform: translate(-50%, 6px);
            transition: opacity .15s ease, transform .15s ease, visibility .15s;
        }
        .s34-cf-why-pop b { color: #fff !important; }
        .s34-cf-why-pop > b:first-child { display: block; margin-bottom: 4px; font-size: 14px; }
        .s34-cf-why:hover .s34-cf-why-pop, .s34-cf-why:focus-visible .s34-cf-why-pop, .s34-cf-why.s34-on .s34-cf-why-pop { opacity: 1; visibility: visible; transform: translate(-50%, 0); }
        .s34-cf-pill-text { display: flex; flex-direction: column; min-width: 0; }
        .s34-cf-pill-text { flex: 1; } .s34-cf-pill-text b { font-size: 16px; color: #f2f2f6 !important; white-space: nowrap; }
        .s34-cf-pill-text small { font-size: 13px; color: #a9a9b3 !important; white-space: nowrap; }
        .s34-cf-pill .s34-cf-pill-solve, .s34-cf-inline .s34-cf-pill-solve {
            flex: none;
            height: 28px;
            padding: 0 13px !important;
            border-radius: 999px;
            border: none !important;
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important;
            color: #fff !important;
            font: 700 12px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
            box-shadow: 0 0 12px rgba(255,95,143,0.35);
        }
        .s34-cf-pill .s34-cf-pill-solve { height: 42px; padding: 0 24px !important; font-size: 15px; }
        .s34-cf-pill .s34-cf-pill-solve:hover, .s34-cf-inline .s34-cf-pill-solve:hover { filter: brightness(1.12); box-shadow: 0 0 16px rgba(255,95,143,0.55); }
        .s34-cf-pill .s34-cf-pill-x {
            flex: none;
            width: 24px;
            height: 24px;
            padding: 0 !important;
            border-radius: 50%;
            border: none !important;
            background: transparent !important;
            color: #8a8a94 !important;
            font-size: 11px;
            cursor: pointer;
        }
        .s34-cf-pill .s34-cf-pill-x:hover { color: #e8e8ee !important; background-color: rgba(255,255,255,0.08) !important; }
        /* The same, right where something stopped (end of the list, popup tags) */
        .s34-cf-inline {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin: 6px auto;
            padding: 6px 6px 6px 8px;
            border-radius: 999px;
            border: 1.5px solid transparent !important;
            background: linear-gradient(rgba(24,22,30,0.97), rgba(24,22,30,0.97)) padding-box,
                        linear-gradient(135deg, #ff5f8f, #8b3dff) border-box !important;
            color: #e8e8ee !important;
            font: 12.5px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left;
            animation: s34-cf-glow 1.6s ease-in-out 3;
            box-shadow: 0 6px 18px rgba(0,0,0,0.35), 0 0 10px rgba(255,95,143,0.30), 0 0 22px rgba(139,61,255,0.18);
        }
        .s34-cf-inline-text { color: inherit !important; }
        .s34-pv-tags .s34-cf-inline { display: flex; margin: 10px 0; }
        @media (prefers-reduced-motion: reduce) {
            .s34-cf-pill, .s34-cf-pill::after, .s34-cf-inline { animation: none; }
            .s34-cf-pill { transition: none; }
        }

        /* Search: 5th filter (Rating) uses the whole row */
        .s34-sb-filters .s34-sb-filter:last-child:nth-child(odd) { grid-column: 1 / -1; }

    `;

const POPUP_SIDE_CSS = `
        /* Popup: theater mode (no sidebar) */
        .s34-pv-theaterbtn {
            display: flex;
            align-items: center;
            padding: 0 3px;
            cursor: pointer;
            color: #dcdce0 !important;
            opacity: .65;
        }
        .s34-pv-theaterbtn:hover { opacity: 1; }
        .s34-pv-theaterbtn svg { display: block; }
        .s34-pv-overlay.s34-pv-theater { grid-template-columns: minmax(0, 1fr); }
        .s34-pv-overlay.s34-pv-theater .s34-pv-side { display: none; }
        .s34-pv-overlay.s34-pv-theater .s34-pv-stage { padding: 0; }
        .s34-pv-tbar {
            display: none;
            position: absolute;
            top: 12px;
            right: 18px;
            z-index: 6;
            gap: 6px;
            opacity: .4;
            transition: opacity .15s;
        }
        .s34-pv-theater .s34-pv-tbar { display: flex; }
        .s34-pv-tbar:hover { opacity: 1; }
        .s34-pv-tbar button {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.18) !important;
            background-color: rgba(16,16,20,0.75) !important;
            backdrop-filter: blur(6px);
            color: #fff !important;
            font-size: 18px;
            cursor: pointer;
        }
        .s34-pv-tbar button:hover { background-color: rgba(40,40,50,0.9) !important; }

        /* Popup: ♥ Favourite + 📁 Collection side by side */
        .s34-pv-row2 { display: flex; gap: 8px; }
        .s34-pv-row2 > * { flex: 1; min-width: 0; }
        .s34-pv-collect, .s34-post-collect, .s34-pv-later, .s34-pv-icame {
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
            color: #e8e8ee !important;
        }
        .s34-pv-collect:hover, .s34-post-collect:hover, .s34-pv-later:hover, .s34-pv-icame:hover { border-color: #ffb347 !important; }
        .s34-pv-collect svg, .s34-post-collect svg, .s34-pv-later svg, .s34-pv-icame svg { display: block; flex: none; }
        .s34-post-collect { width: 100%; }

        /* "Save to collection" menu */
        .s34-cmenu {
            position: fixed;
            z-index: 100001;
            width: 250px;
            max-height: 60vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 8px;
            border-radius: 12px;
            background-color: #24222c !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            box-shadow: 0 14px 34px rgba(0,0,0,0.6);
            color: #e8e8ee !important;
            font: 13px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left;
        }
        .s34-cmenu-head { padding: 2px 6px 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; opacity: .6; }
        .s34-cmenu-empty { padding: 2px 6px 6px; font-size: 12px; opacity: .7; }
        .s34-cmenu .s34-cmenu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 7px 8px !important;
            border-radius: 8px;
            border: none !important;
            background: transparent !important;
            color: inherit !important;
            font: inherit;
            text-align: left;
            cursor: pointer;
        }
        .s34-cmenu .s34-cmenu-item:hover { background-color: rgba(255,255,255,0.07) !important; }
        .s34-cmenu-check {
            flex: none;
            width: 16px;
            height: 16px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            border: 1.5px solid rgba(255,255,255,0.3) !important;
        }
        .s34-cmenu-item.s34-on .s34-cmenu-check { background-color: #ffb347 !important; border-color: #ffb347 !important; color: #1a1a1a !important; }
        .s34-cmenu-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s34-cmenu-n { font-size: 11px; opacity: .5; }
        .s34-cmenu-new { display: flex; gap: 6px; margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08) !important; }
        .s34-cmenu-new input, .s34-coll-new input {
            flex: 1;
            min-width: 0;
            height: 30px;
            box-sizing: border-box;
            padding: 0 8px !important;
            border-radius: 7px;
            font-size: 12.5px;
            background-color: rgba(0,0,0,0.35) !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            color: #e8e8ee !important;
        }
        .s34-cmenu-new button, .s34-coll-new button {
            height: 30px;
            padding: 0 12px !important;
            border-radius: 7px;
            border: none !important;
            background: linear-gradient(135deg, #ffb347, #ff5f8f) !important;
            color: #fff !important;
            font-weight: 700;
            cursor: pointer;
        }

    `;

const COLLECTIONS_CSS = `
        /* Windows: Collections / Stats / What's new (same look as the blacklist) */
        .s34-win {
            width: min(720px, calc(100vw - 32px));
            max-height: min(86vh, 860px);
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            border-radius: 18px;
            overflow: hidden;
            background: linear-gradient(180deg, #1f1d26 0%, #17161c 100%) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
            color: #e8e8ee !important;
            font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left !important;
            animation: s34-blm-in .16s ease-out;
        }
        .s34-win-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px 12px; }
        .s34-win-icon {
            flex: none;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #ffb347, #ff5f8f) !important;
            color: #fff !important;
        }
        .s34-win-icon svg { width: 22px; height: 22px; }
        .s34-win-heading { flex: 1; min-width: 0; }
        .s34-win-title { font-size: 18px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s34-win-sub { font-size: 12px; opacity: .6; }
        .s34-win .s34-win-close {
            width: 32px; height: 32px; padding: 0 !important; border-radius: 10px; border: none !important;
            background-color: rgba(255,255,255,0.06) !important; color: #e8e8ee !important; cursor: pointer; font-size: 14px;
        }
        .s34-win .s34-win-close:hover { background-color: rgba(255,255,255,0.12) !important; }
        .s34-win-body { overflow-y: auto; padding: 4px 20px 20px; display: flex; flex-direction: column; gap: 12px; }
        .s34-win-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .s34-win-tools .s34-grow { flex: 1; }
        .s34-win .s34-win-tools button, .s34-win .s34-win-more {
            height: 32px;
            padding: 0 12px !important;
            border-radius: 9px;
            font-size: 12.5px;
            font-weight: 600;
            cursor: pointer;
            background-color: rgba(255,255,255,0.06) !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            color: #e8e8ee !important;
        }
        .s34-win .s34-win-tools button:hover, .s34-win .s34-win-more:hover { border-color: #ffb347 !important; }
        .s34-win .s34-win-tools button.s34-win-primary { background: linear-gradient(135deg, #ffb347, #ff5f8f) !important; border-color: transparent !important; color: #fff !important; }
        .s34-win-status { font-size: 12px; color: #ffcf8a !important; }
        .s34-win-status[hidden] { display: none; }
        .s34-win-empty { padding: 26px 4px; opacity: .55; font-style: italic; grid-column: 1 / -1; }
        .s34-win-note { font-size: 11.5px; opacity: .55; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }

        /* Picture tiles (inside a collection) */
        .s34-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
        .s34-tile {
            position: relative;
            display: flex;
            flex-direction: column;
            border-radius: 12px;
            overflow: hidden;
            background-color: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.07) !important;
        }
        .s34-tile > a { display: block; text-decoration: none !important; }
        .s34-tile-img {
            aspect-ratio: 1 / 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background-color: #121216 !important;
            color: #8a8a94 !important;
            font-size: 12px;
            font-weight: 600;
        }
        .s34-tile-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .s34-tile-cap { padding: 6px 8px 8px; min-width: 0; }
        .s34-tile-title { font-size: 12px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s34-tile-sub { font-size: 10.5px; opacity: .5; }
        .s34-tile-acts { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; opacity: 0; transition: opacity .12s; }
        .s34-tile:hover .s34-tile-acts { opacity: 1; }
        .s34-tile-acts a, .s34-win .s34-tile-acts button {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            border-radius: 50%;
            border: none !important;
            background-color: rgba(16,16,20,0.82) !important;
            color: #fff !important;
            font-size: 13px;
            text-decoration: none !important;
            cursor: pointer;
        }
        .s34-tile-acts a:hover, .s34-win .s34-tile-acts button:hover { background-color: #ff5f8f !important; }

        /* Collections overview */
        .s34-coll-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
        .s34-win .s34-coll-card {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 8px !important;
            border-radius: 14px;
            text-align: left;
            cursor: pointer;
            background-color: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            color: #e8e8ee !important;
            font: inherit;
        }
        .s34-win .s34-coll-card:hover { border-color: #ffb347 !important; }
        .s34-coll-cover {
            aspect-ratio: 4 / 3;
            border-radius: 10px;
            overflow: hidden;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(2, minmax(0, 1fr));
            gap: 2px;
            place-items: stretch;
            background-color: #121216 !important;
            color: #6a6a74 !important;
        }
        .s34-coll-cover svg { width: 34px; height: 34px; grid-column: 1 / -1; grid-row: 1 / 3; place-self: center; }
        .s34-coll-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .s34-coll-cover.s34-coll-cover-n1 img { grid-column: 1 / -1; grid-row: 1 / 3; }
        .s34-coll-cover.s34-coll-cover-n2 img { grid-row: 1 / 3; }
        .s34-coll-cover.s34-coll-cover-n3 img:first-child { grid-row: 1 / 3; }
        .s34-coll-name { font-weight: 700; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 2px 2px 0; }
        .s34-coll-n { font-size: 11px; opacity: .55; padding: 0 2px; }
        /* (Beta 3.10) collection tools: note, sort, cover, drag to arrange */
        .s34-coll-notep { font-size: 11px; opacity: .7; padding: 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: italic; }
        .s34-win textarea.s34-coll-note { display: block; width: 100%; box-sizing: border-box; margin: 0 0 12px; padding: 8px 12px; min-height: 36px; resize: none; border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.1) !important; background: rgba(255,255,255,0.03) !important; color: inherit !important; font: 13px/1.45 system-ui, sans-serif; }
        .s34-win textarea.s34-coll-note:focus { outline: none; border-color: rgba(255,95,143,.6) !important; }
        .s34-win select.s34-coll-sort { height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12) !important; background: rgba(255,255,255,0.04) !important; color: inherit !important; font: 600 12px system-ui, sans-serif; }
        .s34-win select.s34-coll-sort option { background: #1c1c22; color: #e8e8ee; }
        .s34-tiles-drag .s34-tile { cursor: grab; }
        .s34-tile.s34-dragging { opacity: .35; }
        .s34-tile.s34-drop-before { box-shadow: -4px 0 0 #ff5f8f; }
        .s34-tile.s34-drop-after { box-shadow: 4px 0 0 #ff5f8f; }
        .s34-win .s34-tile-acts button.s34-tile-cover.s34-on { background-color: #f5b301 !important; color: #111 !important; }
        .s34-tile.s34-tile-iscover .s34-tile-acts { opacity: 1; }
        .s34-tile.s34-tile-iscover .s34-tile-acts button:not(.s34-on) { opacity: 0; }
        .s34-tile.s34-tile-iscover:hover .s34-tile-acts button { opacity: 1; }
        .s34-coll-new { cursor: default; justify-content: center; gap: 8px !important; }
        .s34-coll-plus { font-size: 26px; font-weight: 300; text-align: center; opacity: .5; }
        .s34-coll-new input { flex: none; width: 100%; }

        /* Stats */
        .s34-stat-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .s34-stat-tile {
            display: flex;
            flex-direction: column;
            padding: 12px 14px;
            border-radius: 12px;
            background-color: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.07) !important;
        }
        .s34-stat-tile b {
            font-size: 22px;
            font-weight: 800;
            background: linear-gradient(135deg, #ffb347, #ff5f8f);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent !important;
        }
        .s34-stat-tile span { font-size: 11.5px; opacity: .6; }
        .s34-stat-label { margin: 6px 0 2px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ff8fa3 !important; }
        .s34-stat-chart { display: flex; gap: 5px; align-items: flex-end; height: 120px; }
        .s34-stat-day { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
        .s34-stat-cols { flex: 1; width: 100%; display: flex; gap: 2px; align-items: flex-end; }
        .s34-stat-cols i { flex: 1; min-height: 2px; border-radius: 3px 3px 0 0; }
        .s34-stat-v { background-color: #8b7bff !important; }
        .s34-stat-d { background-color: #ff5f8f !important; }
        .s34-stat-day span { font-size: 10px; opacity: .5; }
        .s34-stat-legend { display: flex; align-items: center; gap: 6px; font-size: 11.5px; opacity: .7; }
        .s34-stat-legend span { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
        .s34-stat-legend span + span { margin-left: 10px; }
        .s34-stat-tops { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .s34-stat-bar { display: grid; grid-template-columns: minmax(0, 1fr) 60px 24px; align-items: center; gap: 6px; margin: 4px 0; font-size: 12px; }
        .s34-stat-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: inherit !important; }
        .s34-stat-track i { color: inherit !important; }
        .s34-stat-bar.s34-blm-artist    { color: #ff8a80 !important; }
        .s34-stat-bar.s34-blm-character { color: #7ee07e !important; }
        .s34-stat-bar.s34-blm-copyright { color: #d68cff !important; }
        .s34-stat-track { height: 6px; border-radius: 999px; background-color: rgba(255,255,255,0.07) !important; overflow: hidden; }
        .s34-stat-track i { display: block; height: 100%; border-radius: 999px; background-color: currentColor !important; }
        .s34-stat-bar b { font-size: 11px; text-align: right; color: #e8e8ee !important; }
        .s34-stat-bar.s34-blm-artist, .s34-stat-bar.s34-blm-character, .s34-stat-bar.s34-blm-copyright { border: none !important; background: none !important; }
        @media (max-width: 640px) {
            .s34-stat-tops, .s34-stat-tiles { grid-template-columns: 1fr 1fr; }
        }

        /* Sidebar: Collections · Stats */
        .s34-hub { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin: 14px 0 -6px; }
        .s34-tools .s34-hub { margin: 0; }
        .s34-hub button {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            min-width: 0;
            padding: 8px 4px !important;
            border-radius: 9px;
            cursor: pointer;
            background-color: #1c1c20 !important;
            border: 1px solid #33333a !important;
            color: #dcdce0 !important;
            font: 12px system-ui, -apple-system, Segoe UI, sans-serif;
        }
        .s34-hub button:hover { background-color: #24242a !important; border-color: #ffb347 !important; }
        .s34-hub svg { display: block; color: #ffb347 !important; }
        .s34-hub button { overflow: hidden; }
        .s34-hub b, .s34-hub small {
            display: block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: center;
        }
        .s34-hub b { font-size: 10.5px; letter-spacing: -.1px; }
        .s34-hub small { font-size: 9.5px; opacity: .55; }

        /* (Beta 3.8) Collections on all devices: the one-time choice, the
           favourites page bar and the folder chips on its thumbnails */
        .s34-collsync-card { margin: 0 0 16px; padding: 14px 16px; border-radius: 12px; background: rgba(255,95,143,.08); border: 1px solid rgba(255,95,143,.35); }
        .s34-collsync-card b { display: block; font-size: 15px; margin-bottom: 4px; }
        .s34-collsync-card p { margin: 0 0 8px; font-size: 13px; line-height: 1.5; opacity: .9; }
        .s34-collsync-card .s34-collsync-small { font-size: 12px; opacity: .65; }
        .s34-collsync-btns { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
        .s34-favcoll-bar { margin: 0 0 16px; padding: 14px 16px; border-radius: 12px; background: var(--s34-panel, rgba(255,255,255,.04)); border: 1px solid rgba(255,255,255,.08); }
        .s34-favcoll-bar h2 { margin: 0; font-size: 20px; }
        .s34-dlw-filter { flex: 1 1 240px; min-width: 0; padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.14) !important; background: rgba(0,0,0,.25) !important; color: inherit !important; font: inherit; font-size: 13px; }
        .s34-shuffle { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 10px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.14) !important; background: rgba(255,255,255,.05) !important; color: inherit !important; font: 600 13px system-ui, sans-serif; cursor: pointer; }
        .s34-shuffle:hover { border-color: #ff5f8f !important; }
        .s34-shuffle.s34-shuffle-sb { display: flex; width: 100%; justify-content: center; margin: 8px 0 0; box-sizing: border-box; }
        .s34-win-more { display: block; margin: 14px auto 4px; padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: inherit; font: inherit; font-weight: 600; cursor: pointer; }
        .s34-win-more:hover { border-color: #ff5f8f; }
        .s34-favcoll-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
        .s34-favcoll-acts { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
        .s34-favcoll-acts button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: inherit; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .s34-favcoll-acts button:hover { border-color: #ff5f8f; }
        .s34-favcoll-acts button svg { width: 14px; height: 14px; }
        .s34-favcoll-acts .s34-favcoll-primary { background: #ff5f8f !important; border-color: #ff5f8f !important; color: #fff !important; }
        .s34-batch button.s34-armed { background: #c0392b !important; color: #fff !important; }
        .s34-favcoll-bar p { margin: 0 0 10px; opacity: .7; font-size: 13px; }
        .s34-favcoll-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .s34-favcoll-list button { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 99px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
        .s34-favcoll-list button:hover { border-color: #ff5f8f; }
        .s34-favcoll-list small { opacity: .6; }
        .s34-cchip { position: absolute; left: 6px; top: 6px; z-index: 4; transition: opacity .15s; max-width: calc(100% - 12px); display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 6px; background-color: rgba(20,20,24,0.85) !important; color: #fff !important; font: 600 11px/1.4 system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
        .s34-cchip svg { flex: none; width: 12px; height: 12px; }
        /* top left like the VID / GIF label - under it when there is one; the
           score pill takes its place while hovering */
        span.thumb:has(.s34-badge, .s34-new-badge) .s34-cchip { top: 30px; }
        html.s34-tx-below span.thumb .s34-cchip { top: 6px; }
        span.thumb:hover:has(.s34-info) .s34-cchip { opacity: 0; }

    `;

const POPUP_INFO_CSS = `
        /* Popup: auto next (slideshow) */
        .s34-auto {
            display: flex;
            flex-direction: column;
            gap: 7px;
            padding: 9px 10px;
            border-radius: 10px;
            background-color: #1c1c21 !important;
            border: 1px solid #2a2a31 !important;
            color: #dcdce0 !important;
            font-size: 12px;
        }
        .s34-auto.s34-auto-running { border-color: rgba(255,95,143,0.5) !important; }
        .s34-auto .s34-auto-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            height: 32px;
            border-radius: 8px;
            cursor: pointer;
            font: 600 13px system-ui, -apple-system, Segoe UI, sans-serif;
            background-color: #24242a !important;
            border: 1px solid #3a3a44 !important;
            color: #e8e8ee !important;
        }
        .s34-auto .s34-auto-toggle:hover { border-color: #ff5f8f !important; }
        .s34-auto .s34-auto-toggle.s34-on {
            background: linear-gradient(135deg, #ff5f8f, #8b3dff) !important;
            border-color: transparent !important;
            color: #fff !important;
        }
        .s34-auto-icon { font-size: 11px; letter-spacing: -1px; }
        .s34-auto-row { display: flex; align-items: center; gap: 8px; }
        .s34-auto-row span { opacity: .65; }
        .s34-auto .s34-auto-row input[type="range"] {
            flex: 1;
            min-width: 0;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            accent-color: #ff5f8f;
            cursor: pointer;
        }
        .s34-auto-sec { min-width: 30px; text-align: right; font-size: 12px; color: #fff !important; }
        .s34-auto-bar {
            display: none;
            height: 4px;
            border-radius: 999px;
            overflow: hidden;
            background-color: rgba(255,255,255,0.08) !important;
        }
        .s34-auto.s34-auto-running .s34-auto-bar { display: block; }
        .s34-auto-bar i {
            display: block;
            height: 100%;
            width: 0%;
            border-radius: 999px;
            background: linear-gradient(90deg, #ff5f8f, #8b3dff) !important;
            transition: width .1s linear;
        }
        .s34-auto-note { font-size: 10.5px; opacity: .5; }

        /* Popup: post info */
        .s34-pv-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 10px;
            border-radius: 8px;
            background-color: #1c1c21 !important;
            border: 1px solid #2a2a31 !important;
            font-size: 12px;
            color: #c8c8ce !important;
        }
        .s34-pv-info:empty { display: none; }
        .s34-pv-stats { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .s34-pv-score { font-weight: 700; color: #ffd36b !important; font-size: 13px; }
        .s34-pv-vote {
            height: 22px;
            padding: 0 7px !important;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            background-color: #26262d !important;
            border: 1px solid #3a3a44 !important;
            color: #e8e8ec !important;
        }
        .s34-pv-vote:hover { border-color: #7ee07e !important; color: #7ee07e !important; }
        .s34-pv-vote.s34-on { background-color: rgba(126,224,126,0.15) !important; border-color: #7ee07e !important; color: #7ee07e !important; }
        .s34-pv-pill {
            padding: 1px 7px;
            border-radius: 999px;
            background-color: #26262d !important;
            border: 1px solid #33333a !important;
            font-size: 11px;
        }
        .s34-pv-line { overflow-wrap: anywhere; }
        .s34-pv-info a { color: #8ab4f8 !important; text-decoration: none !important; }
        .s34-pv-info a:hover { text-decoration: underline !important; }
        .s34-pv-notice {
            padding: 6px 8px;
            border-radius: 6px;
            background-color: rgba(255,184,107,0.10) !important;
            border: 1px solid rgba(255,184,107,0.35) !important;
            color: #ffd9ad !important;
            overflow-wrap: anywhere;
        }

        /* Popup: right side scrolls - media fills the first screen, comments below */
        .s34-pv-main {
            position: relative;
            min-width: 0;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: thin;
        }
        .s34-pv-main > .s34-pv-stage { height: 100%; box-sizing: border-box; }
        /* Comments */
        .s34-cm-section {
            max-width: 820px;
            margin: 0 auto;
            padding: 28px 24px 70px;
            box-sizing: border-box;
            color: #e4e4ea !important;
            font: 13.5px/1.55 system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left;
        }
        .s34-cm-head {
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 14px;
            margin-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .s34-cm-head h3 { margin: 0 !important; font-size: 18px !important; font-weight: 800; color: #fff !important; }
        .s34-cm-count {
            padding: 1px 9px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            background-color: rgba(255,95,143,0.16) !important;
            color: #ff8fb0 !important;
        }
        .s34-cm-count[hidden] { display: none; }
        .s34-cm-write {
            margin-left: auto;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 1px;
            padding: 6px 12px;
            border-radius: 9px;
            text-decoration: none !important;
            background-color: rgba(255,255,255,0.06) !important;
            border: 1px solid rgba(255,255,255,0.12) !important;
            color: #e8e8ee !important;
        }
        .s34-cm-write-main { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; }
        .s34-cm-write-main svg { display: block; opacity: .8; }
        .s34-cm-write-sub { font-size: 10.5px; font-weight: 500; opacity: .55; white-space: nowrap; }
        .s34-cm-write:hover { border-color: #ff5f8f !important; color: #fff !important; }
        .s34-cm-write:hover .s34-cm-write-sub { opacity: .8; }
        .s34-cm-list { display: flex; flex-direction: column; gap: 4px; }
        .s34-cm {
            display: flex;
            gap: 12px;
            padding: 12px 10px;
            border-radius: 12px;
            transition: background-color .12s;
        }
        .s34-cm:hover { background-color: rgba(255,255,255,0.035) !important; }
        .s34-cm-avatar {
            flex: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font: 800 15px system-ui, -apple-system, Segoe UI, sans-serif;
            color: #fff !important;
            box-shadow: inset 0 0 0 2px rgba(255,255,255,0.12);
        }
        .s34-cm-main { flex: 1; min-width: 0; }
        .s34-cm-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin-bottom: 3px; }
        .s34-cm-user { font-weight: 700; color: #fff !important; text-decoration: none !important; }
        a.s34-cm-user:hover { text-decoration: underline !important; }
        .s34-cm-date { font-size: 11.5px; opacity: .5; }
        .s34-cm-score {
            font-size: 11px;
            font-weight: 700;
            padding: 0 6px;
            border-radius: 6px;
            background-color: rgba(126,224,126,0.12) !important;
            color: #7ee07e !important;
        }
        .s34-cm-text { white-space: pre-wrap; overflow-wrap: anywhere; color: #d4d4dc !important; }
        .s34-cm-text a { color: #8ab4f8 !important; }
        .s34-cm-empty { padding: 26px 4px; opacity: .6; font-style: italic; display: flex; align-items: center; gap: 8px; }
        .s34-cm-more {
            display: block;
            width: 100%;
            margin: 8px 0 4px;
            height: 36px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.12) !important;
            background-color: rgba(255,255,255,0.05) !important;
            color: #e8e8ee !important;
            font: 600 12.5px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
        }
        .s34-cm-more:hover { border-color: #ff5f8f !important; }
        .s34-cm-more:disabled { opacity: .6; cursor: progress; }

        /* (Beta 3.9.2) Info as chips: when, who, where from */
        .s34-pv-chips2 { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .s34-pv-chip2 { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 99px; border: 1px solid rgba(255,255,255,.12) !important;
            background: rgba(255,255,255,.05) !important; color: #dcdce4 !important; font: 500 12px/1.4 system-ui, sans-serif; text-decoration: none !important; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        a.s34-pv-chip2:hover { border-color: #ff5f8f !important; color: #fff !important; }
        .s34-pv-source { font-weight: 700; }
        /* (Beta 3.9.2) Favourite · Collection / Later · iCame: two even rows */
        .s34-pv-row2 { display: grid !important; grid-template-columns: 1fr 1fr; gap: 6px; }
        .s34-pv-row2 > button { width: auto !important; min-width: 0; justify-content: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .s34-pv-row2 > button span { overflow: hidden; text-overflow: ellipsis; }
        /* (Beta 3.9.3) More: Find source · Similar · Upscale · Report */
        .s34-pv-more { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
        .s34-pv-morebtn { display: flex; align-items: center; justify-content: center; height: 30px; padding: 0 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12) !important;
            background: rgba(255,255,255,.04) !important; color: #cfcfd8 !important; font: 600 12px/1 system-ui, sans-serif; text-decoration: none !important; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box; }
        .s34-pv-morebtn:hover { border-color: #ff5f8f !important; color: #fff !important; }
        .s34-pv-report:hover { border-color: #ff6b6b !important; }
        .s34-report-why { width: 100%; box-sizing: border-box; margin: 4px 0 10px; padding: 8px 10px; border-radius: 8px; border: 1px solid #3a3a44 !important; background: #121216 !important; color: #eee !important; font: 14px system-ui, sans-serif; resize: vertical; }
        /* (Beta 3.9.4) Similar: a filmstrip along the bottom of the picture */
        .s34-pv-simstrip { position: sticky; bottom: 0; z-index: 6; margin-top: -132px; height: 132px; box-sizing: border-box; padding: 8px 10px; background: linear-gradient(to top, rgba(10,10,14,.96), rgba(10,10,14,.82)) !important; border-top: 1px solid rgba(255,255,255,.12); }
        .s34-pv-strip-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font: 600 12px system-ui, sans-serif; color: #dcdce4; }
        .s34-pv-strip-head b { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .s34-pv-strip-keys { flex: none; font-weight: 500; font-size: 11px; color: #9a9aa6; }
        @media (max-width: 700px) { .s34-pv-strip-keys { display: none; } }
        .s34-pv-strip-head button { border: none !important; background: none !important; color: #ccc !important; cursor: pointer; font-size: 14px; }
        .s34-pv-strip-row { display: flex; gap: 8px; overflow-x: auto; overflow-y: hidden; height: 90px; align-items: center; scrollbar-width: thin; overscroll-behavior: contain; }
        .s34-pv-strip-item { flex: none; height: 86px; width: 86px; padding: 0 !important; border-radius: 8px; overflow: hidden; border: 2px solid transparent !important; background: #1b1b20 !important; cursor: pointer; }
        .s34-pv-strip-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .s34-pv-strip-item:hover, .s34-pv-strip-item.s34-on { border-color: #ff5f8f !important; }
        .s34-pv-strip-wait { color: #aaa; font-size: 12px; }
        /* Later / iCame next to Collection */
        .s34-pv-later.s34-on { border-color: #8ab4f8 !important; color: #cfe0ff !important; }
        .s34-pv-icame svg { width: 17px; height: 17px; }
        .s34-pv-icame.s34-on { color: #9fd8ff !important; border-color: rgba(159,216,255,.6) !important; }
        .s34-pv-icame.s34-pop svg { animation: s34-splash .6s ease-out; }
        @keyframes s34-splash { 0% { transform: scale(1); } 35% { transform: scale(1.45) rotate(-8deg); } 100% { transform: scale(1); } }

        /* Popup: zoom */
        .s34-pv-overlay { grid-template-rows: minmax(0, 1fr); }
        .s34-pv-stage img.s34-pv-media:not(.s34-pv-placeholder) { cursor: zoom-in; }
        .s34-pv-stage.s34-pv-zoomed {
            display: block;
            overflow: auto;
            padding: 0;
            cursor: default;
        }
        .s34-pv-stage.s34-pv-zoomed img.s34-pv-media {
            display: block;
            max-width: none !important;
            max-height: none !important;
            object-fit: fill;
            margin: 0 auto;
            cursor: grab;
        }
        .s34-pv-stage.s34-pv-dragging img.s34-pv-media { cursor: grabbing !important; }
        .s34-pv-stage.s34-pv-strip { overflow-x: hidden; overflow-y: auto; }
        .s34-pv-stage.s34-pv-strip img.s34-pv-media { cursor: zoom-out; }

    `;

const MISC_CSS = `
        /* Saved search: "+N new" */
        .s34-sb-new {
            display: inline-block;
            margin-right: 5px;
            padding: 0 5px;
            border-radius: 4px;
            background-color: #e0457b !important;
            color: #fff !important;
            font-size: 10px;
            font-weight: 700;
            line-height: 16px;
        }

        /* Screenshot mode (X): every picture and video blurred - Steamy34's
           own little icons (data: pictures) stay sharp. clip-path keeps the
           blur inside each picture's box. */
        html.s34-sfw img:not([src^="data:"]),
        html.s34-sfw video,
        html.s34-sfw canvas {
            filter: blur(24px) saturate(.6) !important;
            clip-path: inset(0) !important;
        }
        /* ...and comments: text and names (setting censorComments) - in the
           popup and on the site's own post pages */
        html.s34-sfw-text :is(.s34-cm-text, .s34-cm-user, .s34-cm-avatar, #comment-list [id^="cbody"], #comment-list .col1 a) {
            filter: blur(5px) !important;
            user-select: none;
        }
        /* "Info for a bug report" window */
        .s34-debug-win .s34-win-body { display: flex; flex-direction: column; gap: 12px; }
        .s34-debug-text {
            margin: 0;
            padding: 10px 12px;
            max-height: 44vh;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-word;
            border-radius: 8px;
            border: 1px solid #2e2e36 !important;
            background-color: #121216 !important;
            color: #dcdce0 !important;
            font: 12px/1.5 ui-monospace, Consolas, monospace;
            user-select: text;
        }
        .s34-debug-how { margin: 0; font-size: 12.5px; line-height: 1.5; opacity: .85; }
        .s34-debug-foot { display: flex; justify-content: flex-end; }
        .s34-debug-foot button {
            height: 32px;
            padding: 0 18px !important;
            border-radius: 8px;
            border: none !important;
            background: linear-gradient(135deg, #ffb347, #ff5f8f) !important;
            color: #fff !important;
            font: 600 13px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
        }
        .s34-sfw-label {
            position: fixed;
            right: 12px;
            bottom: 12px;
            z-index: 100000;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            height: 28px;
            padding: 0 6px 0 11px !important;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.18) !important;
            background-color: rgba(18,18,22,0.9) !important;
            color: #e8e8ee !important;
            font: 600 12px system-ui, -apple-system, Segoe UI, sans-serif;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        }
        .s34-sfw-label span { color: inherit !important; }
        @media (max-width: 760px) { .s34-sfw-label { bottom: 76px; } } /* above the messages on phones */
        .s34-sfw-label kbd {
            padding: 1px 6px;
            border-radius: 4px;
            background-color: rgba(255,255,255,0.14) !important;
            color: #fff !important;
            font: 700 11px system-ui, sans-serif;
        }

        /* Ad spaces with an ad blocker on (right column, the box above the
           posts) - posts use the space */
        .s34-empty-col { display: none !important; }
        /* Until the check (ad blocker seen last time): out of the layout */
        html.s34-adcol-early .content ~ span:has(.postListSidebarRight),
        html.s34-adcol-early .content ~ .postListSidebarRight,
        html.s34-adcol-early :is(span, div):has(~ .image-list):has(ins):not([class*="s34-"]) {
            position: absolute !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        /* Small icon buttons (popup ✕ ? Theater, message ✕, window ✕): real
           buttons for the keyboard, but without the page's button look */
        .s34-pv-top .s34-pv-iconbtn,
        .s34-pv-top .s34-pv-iconbtn:hover {
            background: transparent !important;
            margin: 0 !important;
            font: inherit;
            line-height: 1;
            cursor: pointer;
        }
        .s34-pv-top .s34-pv-close, .s34-pv-top .s34-pv-theaterbtn { border: none !important; padding: 0 6px !important; }
        .s34-pv-top .s34-pv-close { font-size: 18px; }
        .s34-pv-top .s34-pv-help { padding: 0 !important; font-size: 13px; font-weight: 800; }
        .s34-cf-panel .s34-close { border: none !important; }
        /* Keyboard focus: a clear ring (mouse clicks don't show it) */
        .s34-pv-iconbtn:focus-visible, .s34-toast-close:focus-visible, .s34-close:focus-visible,
        .s34-gear:focus-visible, .s34-blbtn:focus-visible, .s34-dl-btn:focus-visible,
        .s34-menu-btn:focus-visible, .s34-menu-list a:focus-visible {
            outline: 2px solid #b48cff !important;
            outline-offset: 2px;
        }

        /* Phones: one Menu button (on the banner) + side panel */
        html.s34-phone-menu label.tlabel { display: none !important; }
        html.s34-phone-menu #header { position: relative; }
        .s34-menu-btn {
            position: absolute;
            top: 15px;
            right: 12px;
            z-index: 60;
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 !important;
            border-radius: 13px !important;
            background-color: rgba(16,16,20,0.72) !important;
            border: 1px solid rgba(255,255,255,0.22) !important;
            color: #f4f4f6 !important; /* follows the colour mode (pure #fff wouldn't) */
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            cursor: pointer;
        }
        .s34-menu-btn svg { display: block; color: inherit !important; }
        .s34-menu-btn.s34-menu-btn-fixed { position: fixed; top: 10px; right: 10px; z-index: 9990; }
        /* Steamy34's own tools: hidden, shown inside the menu panel */
        .s34-menu-tools { display: none; }
        .s34-menu .s34-menu-tools { display: flex; flex-direction: column; gap: 8px; }
        .s34-menu .s34-menu-tools > * { margin: 0 !important; }
        .s34-menu .s34-menu-tools .s34-tipslink { justify-content: space-around; }
        /* Icons on dark buttons keep the button's colour (White mode would
           otherwise paint them dark - dark on dark) */
        .s34-fav-btn svg, .s34-dl-mark svg, .s34-pv-tbar svg { color: inherit !important; }
        .s34-vopt-tools { display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 6px; flex: 0 0 100%; margin-top: 0; }
        .s34-vopt-tools button { height: 28px; padding: 0 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,.14) !important; background: rgba(255,255,255,.04) !important; color: inherit !important; font: 600 12px system-ui, sans-serif; cursor: pointer; white-space: nowrap; }
        .s34-vopt-tools button.s34-on { border-color: #8ab4f8 !important; color: #cfe0ff !important; }
        /* ...and the shapes inside them: the colour-mode rule paints every
           element grey, which turned favourited hearts grey instead of red */
        .s34-fav-btn svg *, .s34-pv-fav svg *, .s34-dl-mark svg *, .s34-pv-tbar svg * { color: inherit !important; }
        .s34-menu-overlay {
            position: fixed;
            inset: 0;
            z-index: 100002;
            background-color: rgba(0,0,0,0.5) !important;
            opacity: 0;
            transition: opacity .18s;
        }
        .s34-menu-overlay.s34-show { opacity: 1; }
        .s34-menu {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: min(320px, 86vw);
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 14px 14px 28px;
            overflow-y: auto;
            background-color: #17161c !important;
            border-left: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: -20px 0 50px rgba(0,0,0,0.5);
            transform: translateX(100%);
            transition: transform .2s ease;
            font: 14px/1.3 system-ui, -apple-system, Segoe UI, sans-serif;
            text-align: left;
        }
        .s34-menu-overlay.s34-show .s34-menu { transform: none; }
        .s34-menu-head { display: flex; align-items: center; justify-content: space-between; padding: 2px 4px 6px; }
        .s34-menu-head b { font-size: 19px; font-weight: 800; color: #f2f2f6 !important; }
        .s34-menu .s34-menu-x {
            width: 38px; height: 38px; padding: 0 !important; border-radius: 11px;
            border: none !important; background-color: rgba(255,255,255,0.07) !important;
            color: #e8e8ee !important; font-size: 15px; cursor: pointer;
        }
        .s34-menu-label {
            margin: 12px 4px 4px;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #ff8fa3 !important;
        }
        .s34-menu-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .s34-menu .s34-menu-list a {
            display: flex;
            align-items: center;
            min-height: 44px;
            padding: 0 12px;
            border-radius: 12px;
            text-decoration: none !important;
            font-weight: 600;
            overflow-wrap: anywhere;
            color: #e8e8ee !important;
            background-color: rgba(255,255,255,0.045) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
        }
        .s34-menu .s34-menu-list a:active { background-color: rgba(255,255,255,0.1) !important; }
        .s34-menu .s34-menu-list a.s34-on {
            background: linear-gradient(135deg, rgba(255,95,143,0.3), rgba(139,61,255,0.3)) !important;
            border-color: rgba(255,143,176,0.55) !important;
            color: #ffd6e6 !important;
        }

    `;

export { COLLECTIONS_CSS, CONTROLS_CSS, MISC_CSS, POPUP_INFO_CSS, POPUP_SIDE_CSS, WINDOWS_CSS };
