import js from '@eslint/js';
import globals from 'globals';

// Userscript-Globals (Tampermonkey/Greasemonkey) – `GM` kommt aus
// @grant GM.setValue / GM.getValue im Userscript-Header.
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
            'Rule34 Image Board Enhancer.js', // gebautes Bundle – nicht linten
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
