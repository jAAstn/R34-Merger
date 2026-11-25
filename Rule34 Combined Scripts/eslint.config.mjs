import js from '@eslint/js';
import globals from 'globals';

// Userscript-Globals (Tampermonkey/Greasemonkey). `GM` ist das Objekt
// (GM.xmlHttpRequest / GM.setValue / GM.getValue / GM.deleteValue),
// `GM_addStyle`/`GM_getValue`/`GM_setValue`/`GM_deleteValue` die Legacy-Funktionen,
// `unsafeWindow` kommt aus @grant unsafeWindow im Userscript-Header.
const gmGlobals = {
    GM: 'readonly',
    GM_addStyle: 'readonly',
    GM_getValue: 'readonly',
    GM_setValue: 'readonly',
    GM_deleteValue: 'readonly',
    unsafeWindow: 'readonly',
};

export default [
    {
        ignores: [
            'node_modules/**',
            'Rule34 Combined Scripts.js', // gebautes Bundle – nicht linten
        ],
    },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser, ...gmGlobals },
        },
        rules: {
            eqeqeq: ['error', 'always'],
        },
    },
    {
        files: ['build.js', 'tools/**/*.js', 'tools/**/*.mjs', 'test/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            eqeqeq: ['error', 'always'],
        },
    },
];
