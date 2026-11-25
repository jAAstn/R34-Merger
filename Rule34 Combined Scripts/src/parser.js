        const normalizeTag = t => String(t ?? '').trim().toLowerCase().replace(/\s+/g, '_');
        const wildcardToRegex = pattern => {
            const ph = [];
            let tmp = String(pattern).replace(/\*/g, () => { const p = '__W' + ph.length + '__'; ph.push(p); return p; });
            tmp = tmp.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
            ph.forEach(p => { tmp = tmp.split(p).join('.*'); });
            return new RegExp('^' + tmp + '$', 'i');
        };
        const tokenizeRule = line => {
            const raw = String(line).split('//')[0];
            const out = [];
            for (let i = 0; i < raw.length;) {
                const c = raw[i];
                if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
                if (c === '(' || c === ')' || c === '|' || c === '&' || c === '!') { out.push({ type: c }); i++; continue; }
                let j = i;
                while (j < raw.length && ' \t\r\n&|()!'.indexOf(raw[j]) === -1) j++;
                const w = normalizeTag(raw.slice(i, j));
                if (w) out.push({ type: 'word', value: w });
                i = j;
            }
            return out;
        };
        const parseRuleLine = line => {
            const tokens = tokenizeRule(line);
            if (!tokens.length) return null;
            let pos = 0;
            const peek = () => tokens[pos];
            const parseOr = () => {
                let left = parseAnd();
                while (peek() && peek().type === '|') { pos++; left = { kind: 'or', a: left, b: parseAnd() }; }
                return left;
            };
            const parseAnd = () => {
                let left = parseNot();
                while (peek() && (peek().type === '&' || peek().type === 'word' || peek().type === '!' || peek().type === '(')) {
                    if (peek().type === '&') pos++;
                    left = { kind: 'and', a: left, b: parseNot() };
                }
                return left;
            };
            const parseNot = () => (peek() && peek().type === '!') ? (pos++, { kind: 'not', child: parsePrimary() }) : parsePrimary();
            const parsePrimary = () => {
                const t = peek();
                if (!t) return null;
                if (t.type === '(') { pos++; const inner = parseOr(); if (peek() && peek().type === ')') pos++; return inner; }
                if (t.type === 'word') { pos++; return { kind: 'word', value: t.value }; }
                pos++;
                return null;
            };
            return parseOr() || null;
        };
        const AST_PREC = { or: 1, and: 2, not: 3, word: 4 };
        const renderPrec = (node, parentPrec) => {
            if (!node) return '';
            if (node.kind === 'word') return node.value;
            const myPrec = AST_PREC[node.kind];
            let str;
            if (node.kind === 'or') str = renderPrec(node.a, myPrec) + ' | ' + renderPrec(node.b, myPrec);
            else if (node.kind === 'and') str = renderPrec(node.a, myPrec) + ' ' + renderPrec(node.b, myPrec);
            else if (node.kind === 'not') str = '!' + renderPrec(node.child, myPrec);
            return myPrec < parentPrec ? '(' + str + ')' : str;
        };
        const astToText = ast => renderPrec(ast, 0);
        const walkTokens = (ast, out) => {
            if (!ast) return;
            if (ast.kind === 'word') { out.push(ast.value); return; }
            if (ast.kind === 'and' || ast.kind === 'or') { walkTokens(ast.a, out); walkTokens(ast.b, out); return; }
            if (ast.kind === 'not') walkTokens(ast.child, out);
        };
        const compileAst = ast => {
            if (!ast) return () => true;
            if (ast.kind === 'word') {
                const word = ast.value;
                if (word.indexOf('*') === -1) return set => set.has(word);
                const re = wildcardToRegex(word);
                return (set, tags) => { for (let i = 0; i < tags.length; i++) if (re.test(tags[i])) return true; return false; };
            }
            if (ast.kind === 'and') { const a = compileAst(ast.a), b = compileAst(ast.b); return (set, tags) => a(set, tags) && b(set, tags); }
            if (ast.kind === 'or') { const a = compileAst(ast.a), b = compileAst(ast.b); return (set, tags) => a(set, tags) || b(set, tags); }
            if (ast.kind === 'not') { const c = compileAst(ast.child); return (set, tags) => !c(set, tags); }
            return () => true;
        };
        const v2ToAst = rule => {
            if (!rule || !Array.isArray(rule.orGroups) || !rule.orGroups.length) return null;
            const branches = [];
            rule.orGroups.forEach(g => {
                if (!Array.isArray(g) || !g.length) return;
                let acc = null;
                g.forEach(raw => {
                    const s = String(raw || '');
                    const neg = s.charAt(0) === '-';
                    const w = normalizeTag(neg ? s.slice(1) : s);
                    if (!w) return;
                    const node = neg ? { kind: 'not', child: { kind: 'word', value: w } } : { kind: 'word', value: w };
                    acc = acc ? { kind: 'and', a: acc, b: node } : node;
                });
                if (acc) branches.push(acc);
            });
            if (!branches.length) return null;
            let res = branches[0];
            for (let k = 1; k < branches.length; k++) res = { kind: 'or', a: res, b: branches[k] };
            return res;
        };
        const parseRulesInput = input => {
            if (Array.isArray(input)) return input.map(l => parseRuleLine(String(l))).filter(Boolean);
            return String(input ?? '').split(/[\n,;]/).map(l => parseRuleLine(l)).filter(Boolean);
        };
        const compileRules = asts => asts.map(compileAst);
        const anyRuleMatches = (compiled, postTags) => {
            if (!postTags || !postTags.length) return false;
            const set = new Set(postTags);
            for (let i = 0; i < compiled.length; i++) if (compiled[i](set, postTags)) return true;
            return false;
        };

export { normalizeTag, wildcardToRegex, tokenizeRule, parseRuleLine, astToText, walkTokens, compileAst, v2ToAst, parseRulesInput, compileRules, anyRuleMatches };
