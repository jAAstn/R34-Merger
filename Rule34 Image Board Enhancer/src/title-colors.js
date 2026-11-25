// title-colors.js – Header-Farb-Validierung + Input-Beobachtung.
// Enthält die puren, testbaren Helfer (parseSearchTokens/tokenMatchesDb) und
// die DOM-Logik (readTagsInput, updateTitleColors, setupInputObserver) sowie
// addTagToInputWithReplace für die "+"-Links der Favorite-Tag-Listen.
import { debounce, getParsedTagsFromInput, getPairSet, state, debugMode } from './core.js';
import { settings } from './settings.js';

// Hält für jedes input[name="tags"] den zuletzt gesehenen Wert fest, um
// beim nächsten Aufruf zu erkennen, welcher Input sich seit dem letzten
// Tick inhaltlich geändert hat (rule34 kann z. B. nur den Hidden-Submission-
// Input aktualisieren während der sichtbare Filter-Input alt bleibt).
const lastSeenInputs = new WeakMap();

// ── Pure Helfer (testbar) ────────────────────────────────────────────────────
// Tokenisiert den Such-Input und entfernt Ignorier-Liste + user:-Präfix –
// der "validTokensToCheck"-Teil von updateTitleColors() als reine Funktion.
export function parseSearchTokens(rawInput) {
    const cleanInput = rawInput.replace(/[()~]/g, ' ');
    const tokens = cleanInput.split(/\s+/).filter(t => t);

    const ignoredExact = ['sort:score', '-animated', '-video', 'height:>1000', '-animation'];
    const validTokensToCheck = [];

    for (let token of tokens) {
        const tokenLower = token.toLowerCase();
        if (ignoredExact.includes(tokenLower)) continue;
        const baseTag = tokenLower.startsWith('user:') ? tokenLower.substring(5) : tokenLower;
        if (baseTag) validTokensToCheck.push(baseTag);
    }
    return validTokensToCheck;
}

// Prüft, ob ein Such-Token in der Favorite-Tag-Liste (dbString) vorkommt –
// der "checkTokensInDB"-Teil von updateTitleColors() als reine Funktion.
export function tokenMatchesDb(searchTokens, dbString) {
    const cleanDbString = (dbString || "").toLowerCase().replace(/[()~+]/g, ' ');
    const dbTokens = cleanDbString.split(/\s+/).filter(t => t);
    const finalDbBases = dbTokens.map(t => t.startsWith('user:') ? t.substring(5) : t);
    return searchTokens.some(searchBase => finalDbBases.includes(searchBase));
}

// ── Input-Logik ──────────────────────────────────────────────────────────────
// Pure Helfer: wendet die +-Link-Ersetzungslogik auf eine geparste Tag-Liste
// (Kanon-Form) an. displayTag ist die Anzeige-Form (einfacher Tag oder
// "( a ~ b )"). Ersetzt einfache Tags mit gleicher Basis an gleicher Position
// und – v2.0.9 – Pairs mit denselben Mitgliedern (Reihenfolge egal:
// ( TAG1 ~ TAG2 ) == ( TAG2 ~ TAG1 ), ( a ~ b ~ c ) == ( c ~ a ~ b )). Sonst
// wird angehängt, sofern die kanonische Form nicht schon enthalten ist.
export function replaceTagInParsedList(parsed, displayTag) {
    const trimmed = String(displayTag).trim();
    const isPairDisplay = trimmed.startsWith('(') && trimmed.endsWith(')');
    let baseForMatch = trimmed;
    let canonical = trimmed;
    if (isPairDisplay) {
        const inner = trimmed.slice(1, -1).trim();
        baseForMatch = inner.split('~')[0].trim();
        canonical = '(+' + inner.split('~').map(s => s.trim()).join('+~+') + '+)';
    }
    const baseLower = baseForMatch.toLowerCase();
    const canonicalLower = canonical.toLowerCase();
    const canonicalSet = isPairDisplay ? getPairSet(canonical) : null;
    const canonicalSetKey = canonicalSet ? canonicalSet.join('\u0000') : null;

    const result = parsed.map(t => {
        // 1) Einfacher Tag mit gleicher Basis → ersetzen (Original-Verhalten).
        if (!t.startsWith('(+') && t.toLowerCase() === baseLower) {
            return displayTag;
        }
        // 2) v2.0.9: Pair mit denselben Mitgliedern (Reihenfolge egal) → ersetzen.
        //    Ausnahme: identische Kanon-Form → unangetastet lassen (wie bisher).
        if (canonicalSetKey && t.toLowerCase() !== canonicalLower) {
            const tSet = getPairSet(t);
            if (tSet && tSet.join('\u0000') === canonicalSetKey) {
                return displayTag;
            }
        }
        return t;
    });
    let changed = result.some((t, i) => t !== parsed[i]);
    if (!changed) {
        // Falls nichts ersetzt wurde: hänge an, sofern die kanonische Form
        // noch nicht enthalten ist.
        const present = result.some(t => t.toLowerCase() === canonicalLower);
        if (!present) {
            result.push(displayTag);
            changed = true;
        }
    }
    return { list: result, changed };
}

// Wird von den "+" Links in den Favorite-Tag-Listen aufgerufen.
// Ersetzt im Input einen einfachen Tag, dessen Wert der "Basis" (linker
// Teil eines Pair-Tags) entspricht, durch den übergebenen Tag am gleichen
// Platz. v2.0.9: Pairs mit denselben Mitgliedern werden unabhängig von der
// Reihenfolge ersetzt statt doppelt angehängt. Findet sich keine
// Entsprechung, wird der Tag ans Ende angehängt. Hat der Input noch keinen
// Wert, wird er auf den übergebenen Tag gesetzt.
export function addTagToInputWithReplace(displayTag) {
    const inputEl = document.querySelector('input[name="tags"]');
    if (!inputEl) return;

    const parsed = getParsedTagsFromInput();
    let result;
    let changed;
    if (parsed) {
        const merged = replaceTagInParsedList(parsed, displayTag);
        result = merged.list;
        changed = merged.changed;
    } else {
        result = [displayTag];
        changed = true;
    }

    inputEl.value = result.join(' ');
    if (changed) updateTitleColors();
}

// Wählt das relevante Tags-Input aus und liest seinen Wert. `preferInput`
// (optional) ist ein Input, dessen Wert sich seit dem letzten Aufruf
// verändert hat — er hat Vorrang vor aktiver / nicht-leerer Auswahl.
function readTagsInput(preferInput) {
    const inputs = Array.from(document.querySelectorAll('input[name="tags"]'));
    if (inputs.length === 0) return { inputEl: null, value: '' };

    // 0. Zuvor geänderter Input bekommt Vorrang, falls er noch im DOM ist
    // und einen nicht-leeren Wert hat.
    if (preferInput && inputs.indexOf(preferInput) !== -1) {
        const v = (preferInput.value || '').trim();
        if (v) return { inputEl: preferInput, value: v };
    }

    // Aktiver Input (nur, wenn mehrere vorhanden).
    let active = null;
    if (inputs.length > 1) {
        const cand = document.activeElement;
        if (cand && inputs.indexOf(cand) !== -1) active = cand;
    }

    // 1. Aktiver Input, wenn er einen nicht-leeren Wert hat.
    if (active) {
        const v = (active.value || '').trim();
        if (v) return { inputEl: active, value: v };
    }
    // 2. Erster nicht-leerer Input (beliebig).
    for (const inp of inputs) {
        const v = (inp.value || '').trim();
        if (v) return { inputEl: inp, value: v };
    }
    // 3. Alle input.value leer: aktiver oder ersten Input nehmen und
    // schmalen Shadow-Rot-Fallback probieren.
    const chosen = active || inputs[0];
    let value = (chosen.value || '').trim();
    if (!value && chosen.shadowRoot && chosen.shadowRoot.firstElementChild) {
        const firstChild = chosen.shadowRoot.firstElementChild;
        // Nur lesen, wenn im Shadow-Rot kein input/textarea liegt
        // (sonst wäre der eigentliche Wert vermutlich in einem inneren
        // Eingabe-Element, nicht als Textknoten im Container).
        if (!firstChild.querySelector('input, textarea')) {
            const t = (firstChild.textContent || '').trim();
            if (t) value = t;
        }
    }
    return { inputEl: chosen, value };
}

export function updateTitleColors() {
    // Vorherige Werte mit aktuellen vergleichen — wenn ein Input sich
    // seit dem letzten Tick inhaltlich geändert hat, diesen bevorzugen.
    const inputsNow = document.querySelectorAll('input[name="tags"]');
    let changed = null;
    for (const inp of inputsNow) {
        const current = (inp.value || '').trim();
        const prev = lastSeenInputs.get(inp);
        if (prev !== undefined && prev !== current) {
            changed = inp;
            break;
        }
    }

    const { inputEl, value: rawInput } = readTagsInput(changed);
    if (!inputEl) {
        // Kein Tracking nötig: lastSeenInputs ist eine WeakMap, ihre Einträge
        // verschwinden mit den Input-Elementen selbst. (v2.0.9 versuchte hier
        // lastSeenInputs.clear() – WeakMap hat keine clear()-Methode, der
        // Aufruf war toter Code und wurde in v2.0.10 entfernt.)
        return;
    }

    // Aktuelle Werte cachen, damit der nächste Aufruf Diffs erkennen kann.
    for (const inp of inputsNow) {
        lastSeenInputs.set(inp, (inp.value || '').trim());
    }

    const validTokensToCheck = parseSearchTokens(rawInput);

    // v2.0.7: Beide Titel werden UNABHÄNGIG voneinander gefärbt. Vorher brach
    // die Funktion ab, sobald nur EIN Titel-Element existierte (z.B. wenn das
    // USER-Panel nicht gezeichnet ist) – dann wurde kein Titel mehr gefärbt.
    const titleMain = document.getElementById('ibe-title-main');
    const titleUser = document.getElementById('ibe-title-user');

    if (!titleMain && !titleUser) return;

    if (validTokensToCheck.length === 0) {
        if (titleMain) titleMain.style.color = '#fff';
        if (titleUser) titleUser.style.color = '#fff';
        return;
    }

    if (titleMain) {
        const matchMain = tokenMatchesDb(validTokensToCheck, settings.favoriteTags[state.site]);
        titleMain.style.color = matchMain ? '#00FF00' : '#FF0000';
    }
    if (titleUser) {
        const matchUser = tokenMatchesDb(validTokensToCheck, settings.favoriteTagsUSER[state.site]);
        titleUser.style.color = matchUser ? '#00FF00' : '#FF0000';
    }
}

// Beobachtet die Such-Inputs (und ggf. ihre Shadow Roots) auf Mutationen.
// Fängt auch Fälle ab, in denen rule34 das Input programmatisch oder über
// internes Shadow-DOM aktualisiert (z. B. Klick auf Sidebar-Tag "+/-"),
// ohne dass ein 'input'-Event gefeuert wird.
export function setupInputObserver() {
    const observed = new WeakSet();
    const observer = new MutationObserver(debounce(updateTitleColors, 50));
    const valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    const observe = (inp) => {
        if (!inp || observed.has(inp)) return;
        observed.add(inp);
        observer.observe(inp, { attributes: true, attributeFilter: ['value'] });
        if (inp.shadowRoot) {
            observer.observe(inp.shadowRoot, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true
            });
        }
        // value-Setter abfangen — fängt programmatische input.value = ...
        // Zuweisungen, auch wenn kein DOM-Mutation-Trigger / 'input'-Event
        // kommt oder der Shadow Root geschlossen ist.
        try {
            Object.defineProperty(inp, 'value', {
                configurable: true,
                get: valueDesc.get,
                set: function(v) {
                    valueDesc.set.call(this, v);
                    updateTitleColors();
                }
            });
        } catch (e) {
            if (debugMode) console.warn('ibe: defineProperty failed', e);
        }
    };

    document.querySelectorAll('input[name="tags"]').forEach(observe);

    // Auch nachträglich eingefügte oder ersetzte Input-Elemente erfassen
    // (rule34 kann die Suchleiste dynamisch austauschen).
    const bodyObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.matches && node.matches('input[name="tags"]')) observe(node);
                if (node.querySelectorAll) {
                    node.querySelectorAll('input[name="tags"]').forEach(observe);
                }
            }
        }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
}
