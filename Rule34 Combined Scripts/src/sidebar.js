import { TAG } from './tag-hider.js';
import { CONSTANTS, observers, debounce } from './core.js';

    // =========================================================================
    // MODUL: Blacklisted-Sidebar → SmartSkip+ (Auto-Create & Color Toggle)
    // Erstellt die Sidebar in der Navbar, falls keine existiert (z.B. Favoriten).
    // =========================================================================
    const BLACKLISTED_LINK_ON = 'Blacklist ON🟢';
    const BLACKLISTED_LINK_OFF = 'Blacklist OFF🔴';
    const COLOR_ON = 'rgb(72 239 67 / 43%)';
    const COLOR_OFF = 'rgb(239 67 67 / 43%)';

    const refreshBlacklistedSidebar = () => {
        const sidebar = document.getElementById('blacklisted-sidebar');
        if (!sidebar) return;
        const enabled = TAG.getEnabled();
        const link = sidebar.querySelector('#blacklistedSidebarLink');
        if (link) link.textContent = enabled ? BLACKLISTED_LINK_ON : BLACKLISTED_LINK_OFF;
        // Hintergrundfarbe je nach Zustand wechseln
        sidebar.style.backgroundColor = enabled ? COLOR_ON : COLOR_OFF;
        const count = sidebar.querySelector('#blacklist-count');
        if (count) {
            // Inkrementeller Zähler aus dem TAG-Modul statt Voll-Dokument-Scan
            const n = TAG.getHiddenCount();
            count.textContent = n > 0 ? String(n) : '';
        }
    };

    const createBlacklistedSidebar = () => {
        if (document.getElementById('blacklisted-sidebar')) return;
        const navbar = document.querySelector('ul#navbar.flat-list') || document.getElementById('navbar');
        if (!navbar) return;
        const sidebar = document.createElement('div');
        sidebar.id = 'blacklisted-sidebar';
        sidebar.style.cssText = 'top: -31px; position: absolute; left: 380px; padding: 5px 10px; color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); border-radius: 3px; cursor: pointer; font-size: 14px; height: 22px; display: flex; align-items: center; margin: 0;';
        const h5 = document.createElement('h5');
        h5.style.margin = '0';
        sidebar.appendChild(h5);
        // 4. Platz in der Navbar (sonst ans Ende)
        const ref = navbar.children[3] || null;
        navbar.insertBefore(sidebar, ref);
    };

    const integrateBlacklistedSidebar = (sidebar) => {
        if (!sidebar || sidebar.dataset.r34thSmartSkip === '1') return;
        sidebar.dataset.r34thSmartSkip = '1';
        sidebar.style.display = '';
        let h5 = sidebar.querySelector('h5');
        if (!h5) { h5 = document.createElement('h5'); sidebar.appendChild(h5); }
        const oldLink = sidebar.querySelector('a[href="#"]');
        const link = document.createElement('a');
        link.href = '#';
        link.id = 'blacklistedSidebarLink';
        link.style.color = 'white';

        const toggleAction = (e) => { e.preventDefault(); e.stopPropagation(); TAG.toggle(); };
        const editAction  = (e) => { e.preventDefault(); e.stopPropagation(); TAG.openRules(); };
        // Events auf Link UND ganze Sidebar (auch Klicks aufs Padding)
        link.addEventListener('click', toggleAction);
        link.addEventListener('contextmenu', editAction);
        sidebar.addEventListener('click', toggleAction);
        sidebar.addEventListener('contextmenu', editAction);

        if (oldLink && oldLink.parentNode) oldLink.parentNode.replaceChild(link, oldLink);
        else h5.insertBefore(link, h5.firstChild);

        let count = sidebar.querySelector('#blacklist-count');
        if (!count) {
            count = document.createElement('span');
            count.id = 'blacklist-count';
            count.className = 'post-count';
            count.style.marginLeft = '5px';
            h5.appendChild(count);
        }
        refreshBlacklistedSidebar();
    };

    const setupSidebarIntegration = () => {
        const tryIntegrate = () => {
            const sidebar = document.getElementById('blacklisted-sidebar');
            // Bereits integriert: nur noch prüfen, ob die Route die Sidebar entfernen will
            if (sidebar && sidebar.dataset.r34thSmartSkip === '1') {
                if (TAG.isRouteLockedOff()) sidebar.remove();
                return;
            }
            // Gesperrte Routen (Post-Ansicht, Ausnahme-Favorit): Sidebar komplett entfernen
            if (TAG.isRouteLockedOff()) {
                if (sidebar) sidebar.remove();
                return;
            }
            createBlacklistedSidebar();
            const sb = document.getElementById('blacklisted-sidebar');
            if (sb) integrateBlacklistedSidebar(sb);
        };
        tryIntegrate();
        // Sicherheitsnetz für später eingefügte Sidebars – debounced statt pro Mutation
        const obs = new MutationObserver(debounce(tryIntegrate, CONSTANTS.DEBOUNCE_MUTATION_MS));
        obs.observe(document.documentElement, { childList: true, subtree: true });
        observers.push(obs);
    };

export { setupSidebarIntegration, refreshBlacklistedSidebar };
