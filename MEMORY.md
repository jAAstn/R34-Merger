AGENTS.md-Hash: f2072d675654f1b05f42ce799a6d1089ebdbfe1bd253f619bb61bbc3ebec8573 (Bytes: 3159, Stand: 25.11.2026 19:00)

# Current step (Aktueller Schritt)
Kein offener Schritt: Modul-Split ist committet (8554aaf), Arbeitsbaum bis auf MEMORY.md sauber.

# Next action (Nächste Aktion)
Warte auf die nächste Anweisung des Nutzers.

# My choices so far (Meine bisherigen Entscheidungen)
- Struktur wie in "Rule34 Image Board Enhancer" / "Rule34 Combined Scripts": `src/`-Module + `build.js` (esbuild, Userscript-Banner) + `package.json` + `tools/` + `eslint.config.mjs`.
- 60 Module: Feature-Module flach in `src/`, CSS in `src/styles/`, Download-Logik in `src/downloads/`, `init.js` als Entry.
- Alle Top-Level-Statements ohne Deklaration (Nebenwirkungen) liegen gesammelt in `init.js` in der Original-Reihenfolge; die Module enthalten nur Deklarationen. Ausnahme: die CONFIG-Normalisierung bleibt in `config.js`, weil `GRID_CSS`/`EXTRA_CSS` CONFIG beim Laden auslesen.
- Mutable Top-Level-`let` (z. B. `downloaded`, `viewed`, `fwState`, `selectMode`) bleiben in ihrem Modul; andere Module lesen per Live-Binding und schreiben über exportierte `set…()`-Funktionen.
- Version: `@version` kommt aus `src/version.js` (3.11.1-beta), der Build erhöht standardmäßig NICHT; `--bump` erhöht die letzte Zahl. Beim Commit bewusst nicht erhöht.
- Lint-Regeln an den Bestandscode angepasst (eqeqeq/no-unused-vars u. a. aus), `no-undef` bleibt aktiv.
- Commit enthält src/, build.js, package.json, package-lock.json, eslint.config.mjs, tools/, .gitignore, README-Abschnitt und die gebaute Steamy34.js – MEMORY.md bewusst nicht.

# Important paths and commands (Wichtige Pfade und Befehle)
- Projekt (aktueller Worktree): `/c/Users/jAstn/.freebuff/worktrees/13c50cb2/2dc778c9d7450ea3b53b7099b122672f7e190febd2acb299/`
- Quelle: `Steamy34/src/` (60 Module + `version.js`), Entry `src/init.js`
- Gebaute Einzeldatei: `Steamy34/Steamy34.js`
- Build: `cd Steamy34 && npm install && npm run build` (ohne Versionserhöhung)
- Prüfungen: `npm run test:imports`, `npm run lint`, `npm run test:smoke`
- Zeiten: `date "+%Y-%m-%d %H:%M:%S"`
- Git: Branch `freebuff/steamy34-in-module-aufteilen`, `core.autocrlf=true` (Repo speichert LF).

# Done (Erledigt)
- AGENTS.md gelesen; Hash geprüft (stimmt).
- Steamy34/README.md gelesen (Überblick über Features und Aufbau).
- Steamy34.js (19846 Zeilen, 775 Top-Level-Deklarationen) vollständig in 60 Module unter `Steamy34/src/` aufgeteilt; Build-Infrastruktur (`build.js`, `package.json`, `eslint.config.mjs`, `tools/check-imports.mjs`, `tools/smoke-test.js`, `.gitignore`) angelegt.
- README um den Abschnitt "Build / development (since the module split)" ergänzt.
- Verifikation: Build OK, alle 819 Statements übernommen (10 nur durch die beabsichtigten Setter-Umschreibungen verändert), Imports vollständig, ESLint ohne Fehler, Smoke-Test: Bundle und Git-HEAD-Baseline verhalten sich identisch.
- Modul-Split committet (8554aaf, 70 Dateien), Version bleibt 3.11.1-beta; nach dem Restore erneut installiert, gebaut und alle Prüfungen wiederholt.

# Problems and fixes (Probleme und Lösungen)
- AGENTS.md nach dem Neustart geändert: Hash 4a652d… (3113 Bytes) → f2072d… (3159 Bytes). Inhalt Wort für Wort identisch, nur Zeilenenden LF → CRLF (Windows-Worktree); neuer Hash eingetragen, keine inhaltliche Änderung.
- Workspace-Pfad nach Neustart verschoben (`/workspace/chats/...` → Windows-Worktree); MEMORY.md-Pfadangabe aktualisiert.
- Reihenfolge-Falle: `GRID_CSS` und `EXTRA_CSS` lesen `CONFIG` beim Modul-Laden. Die CONFIG-Normalisierung (Theme/ThumbExtras/Handy-Preload) wurde deshalb in `config.js` belassen statt nach `init.js` verschoben.
- Erster Build schlug fehl ("Multiple exports with the same name set…"), weil die Setter-Namen zusätzlich in der `export { … }`-Liste standen. Filter im Generator korrigiert.
- Referenz-Analyse importierte anfangs Namen, die nur lokal (z. B. `const clean` in `loadSaved`) vorkommen; Scope-Prüfung ergänzt.
- `init.js` hatte zunächst keine Imports, weil die Init-Statements nicht mitanalysiert wurden; Analyse nachgezogen.
- ESLint meldete 319 Bestandsfehler (==, leere catch, ungenutzte Zähler); Regeln an den übernommenen Code angepasst, `GM_info` als Userscript-Global ergänzt.

# Time per step (Zeit pro Schritt)
- Schritt 1–2 (README lesen + Modul-Split inkl. Build und Prüfungen): 24 min (17:29:37–17:53:37)
- Schritt 3 (Commit des Modul-Splits inkl. Neuinstallation, Rebuild und Prüfungen): 41 s (18:59:20–19:00:01)
