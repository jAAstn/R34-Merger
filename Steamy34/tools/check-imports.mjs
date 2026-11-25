// Prüft für jedes src/-Modul: Wird ein Name aus einem ANDEREN Modul verwendet,
// ohne importiert zu sein? Die Prüfung arbeitet mit acorn und einer echten
// Scope-Analyse (lokale Variablen/Parameter verdecken keine fehlenden Imports).
// Lauf: npm run test:imports
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const ROOT = path.join(import.meta.dirname, '..', 'src');

function listFiles(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) listFiles(p, out);
        else if (entry.name.endsWith('.js')) out.push(p);
    }
    return out;
}

function patternNames(p, out = []) {
    if (!p) return out;
    switch (p.type) {
        case 'Identifier': out.push(p.name); break;
        case 'ObjectPattern': for (const pr of p.properties) patternNames(pr.type === 'RestElement' ? pr.argument : pr.value, out); break;
        case 'ArrayPattern': for (const e of p.elements) patternNames(e, out); break;
        case 'AssignmentPattern': patternNames(p.left, out); break;
        case 'RestElement': patternNames(p.argument, out); break;
    }
    return out;
}

function childNodes(node) {
    const out = [];
    for (const key of Object.keys(node)) {
        if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
        const v = node[key];
        if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') out.push(c); }
        else if (v && typeof v.type === 'string') out.push(v);
    }
    return out;
}

function blockDecls(list, out = []) {
    for (const st of list || []) {
        if (st.type === 'VariableDeclaration' && st.kind !== 'var') {
            for (const d of st.declarations) patternNames(d.id, out);
        } else if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') {
            if (st.id) out.push(st.id.name);
        }
    }
    return out;
}

function collectVars(node, out) {
    if (!node) return;
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') return;
    if (node.type === 'VariableDeclaration' && node.kind === 'var') {
        for (const d of node.declarations) patternNames(d.id, out);
    }
    for (const c of childNodes(node)) collectVars(c, out);
}

// Sammelt alle freien Identifier eines Moduls (ohne lokale Bindungen).
function freeNames(ast) {
    const free = new Set();
    const local = (name, scopes) => {
        for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(name)) return true;
        return false;
    };
    const visitPatternDefault = (p, scopes) => {
        if (!p) return;
        switch (p.type) {
            case 'AssignmentPattern': visit(p.right, scopes); visitPatternDefault(p.left, scopes); return;
            case 'ObjectPattern': for (const pr of p.properties) { if (pr.type === 'RestElement') visitPatternDefault(pr.argument, scopes); else { if (pr.computed) visit(pr.key, scopes); visitPatternDefault(pr.value, scopes); } } return;
            case 'ArrayPattern': for (const e of p.elements) visitPatternDefault(e, scopes); return;
            case 'RestElement': visitPatternDefault(p.argument, scopes); return;
        }
    };
    const funcScope = (fn) => {
        const s = new Set();
        for (const p of fn.params) for (const n of patternNames(p)) s.add(n);
        if (fn.type === 'FunctionExpression' && fn.id) s.add(fn.id.name);
        collectVars(fn.body, s);
        return s;
    };
    function visit(node, scopes) {
        if (!node) return;
        switch (node.type) {
            case 'Identifier': if (!local(node.name, scopes)) free.add(node.name); return;
            case 'MemberExpression': visit(node.object, scopes); if (node.computed) visit(node.property, scopes); return;
            case 'Property': if (node.computed) visit(node.key, scopes); visit(node.value, scopes); return;
            case 'MethodDefinition': case 'PropertyDefinition': if (node.computed) visit(node.key, scopes); visit(node.value, scopes); return;
            case 'VariableDeclarator': visitPatternDefault(node.id, scopes); visit(node.init, scopes); return;
            case 'AssignmentExpression': if (node.left.type === 'Identifier') { visitPatternDefault(node.left, scopes); } else visit(node.left, scopes); visit(node.right, scopes); return;
            case 'UpdateExpression': visit(node.argument, scopes); return;
            case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
                const s = [...scopes, funcScope(node)];
                for (const p of node.params) visitPatternDefault(p, s);
                if (node.body.type === 'BlockStatement') { const s2 = [...s, new Set(blockDecls(node.body.body))]; for (const st of node.body.body) visit(st, s2); }
                else visit(node.body, s);
                return;
            }
            case 'ClassDeclaration': case 'ClassExpression': {
                const s = [...scopes, new Set(node.id ? [node.id.name] : [])];
                visit(node.superClass, s);
                visit(node.body, s);
                return;
            }
            case 'BlockStatement': {
                const s = [...scopes, new Set(blockDecls(node.body))];
                for (const st of node.body) visit(st, s);
                return;
            }
            case 'SwitchStatement': {
                const s = [...scopes, new Set(blockDecls(node.cases.flatMap(c => c.consequent)))];
                visit(node.discriminant, s);
                for (const c of node.cases) { visit(c.test, s); for (const st of c.consequent) visit(st, s); }
                return;
            }
            case 'ForStatement': {
                const s = [...scopes];
                if (node.init && node.init.type === 'VariableDeclaration' && node.init.kind !== 'var') {
                    s.push(new Set(node.init.declarations.flatMap(d => patternNames(d.id))));
                }
                visit(node.init, s); visit(node.test, s); visit(node.update, s); visit(node.body, s); return;
            }
            case 'ForInStatement': case 'ForOfStatement': {
                const s = [...scopes];
                if (node.left.type === 'VariableDeclaration') {
                    if (node.left.kind !== 'var') s.push(new Set(node.left.declarations.flatMap(d => patternNames(d.id))));
                    visit(node.left, s);
                } else visit(node.left, s);
                visit(node.right, s); visit(node.body, s); return;
            }
            case 'CatchClause': {
                const s = [...scopes, new Set(patternNames(node.param))];
                visitPatternDefault(node.param, s);
                visit(node.body, s); return;
            }
            case 'ImportDeclaration': return;
            case 'ExportNamedDeclaration': case 'ExportDefaultDeclaration': visit(node.declaration, scopes); return;
            case 'BreakStatement': case 'ContinueStatement': case 'LabeledStatement': return;
            case 'MetaProperty': return;
            default: for (const c of childNodes(node)) visit(c, scopes);
        }
    }
    visit(ast, []);
    return free;
}

const files = listFiles(ROOT);
const modules = new Map();
for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const code = fs.readFileSync(file, 'utf8');
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true });

    const exported = new Set();
    const imported = new Set();
    for (const node of ast.body) {
        if (node.type === 'ImportDeclaration') {
            for (const s of node.specifiers) imported.add(s.local.name);
        } else if (node.type === 'ExportNamedDeclaration') {
            if (node.declaration) {
                for (const n of ['FunctionDeclaration', 'ClassDeclaration'].includes(node.declaration.type) ? [node.declaration.id && node.declaration.id.name] : node.declaration.declarations ? node.declaration.declarations.flatMap(d => patternNames(d.id)) : []) {
                    if (n) exported.add(n);
                }
            }
            for (const s of node.specifiers) exported.add(s.local.name);
        }
    }
    modules.set(rel, { ast, exported, imported, free: freeNames(ast) });
}

// Wo kommt welcher Name her?
const providedBy = new Map();
for (const [rel, m] of modules) {
    for (const name of m.exported) {
        if (!providedBy.has(name)) providedBy.set(name, []);
        providedBy.get(name).push(rel);
    }
}

let problems = 0;
for (const [rel, m] of [...modules].sort()) {
    for (const name of m.free) {
        const providers = (providedBy.get(name) || []).filter(p => p !== rel);
        if (!providers.length) continue;      // global (window, document, GM_* …)
        if (m.imported.has(name)) continue;   // korrekt importiert
        console.log(`FEHLT: ${rel} verwendet "${name}" (aus ${providers.join(', ')}), aber importiert es nicht`);
        problems++;
    }
}

console.log(problems === 0 ? `ALLE IMPORTS VOLLSTÄNDIG (${modules.size} Module)` : problems + ' fehlende Imports!');
process.exit(problems === 0 ? 0 : 1);
