import js from '@eslint/js';
import globals from 'globals';

// Userscript-Globals (Tampermonkey/Greasemonkey). Steamy34 nutzt die
// Legacy-Funktionen GM_getValue / GM_setValue / GM_deleteValue / GM_listValues
// sowie GM_xmlhttpRequest und GM_download.
const gmGlobals = {
    GM: 'readonly',
    GM_getValue: 'readonly',
    GM_setValue: 'readonly',
    GM_deleteValue: 'readonly',
    GM_listValues: 'readonly',
    GM_xmlhttpRequest: 'readonly',
    GM_download: 'readonly',
    GM_info: 'readonly',
    unsafeWindow: 'readonly',
};

export default [
    {
        ignores: [
            'node_modules/**',
            'Steamy34.js', // gebautes Bundle – nicht linten
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
            // Der Bestandscode (aus der Einzeldatei übernommen) nutzt bewusst
            // == / !=, leere catch-Blöcke und einzelne ungenutzte Zähler.
            // Die Regeln bleiben aus, damit der Split keine Verhaltensänderung
            // erzwingt; no-undef (fehlende Imports/Globals) bleibt aktiv.
            eqeqeq: 'off',
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-unused-vars': 'off',
            'no-useless-assignment': 'off',
            'no-useless-escape': 'off',
            'no-control-regex': 'off',
            'no-cond-assign': 'off',
        },
    },
    {
        files: ['build.js', 'tools/**/*.js', 'tools/**/*.mjs'],
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
