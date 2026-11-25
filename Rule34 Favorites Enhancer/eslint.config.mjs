import js from '@eslint/js';
import globals from 'globals';

// Userscript-Globals (Tampermonkey/Greasemonkey) – `unsafeWindow` kommt
// aus @grant unsafeWindow im Userscript-Header.
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
            'Rule34 Favorites Enhancer.js', // gebautes Bundle – nicht linten
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
            globals: { ...globals.node, document: 'readonly' }, // Tests stubben Browser-Globals auf globalThis
        },
        rules: {
            eqeqeq: ['error', 'always'],
        },
    },
];
