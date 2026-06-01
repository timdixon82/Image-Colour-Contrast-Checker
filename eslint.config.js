// ESLint flat config (ESLint 9+).
// ICCC source files use ES modules (package.json "type": "module").
// Browser globals come from the `globals` package so the no-undef rule
// catches real undefined references without a hand-kept list.

import globals from 'globals';

export default [
  {
    // Vendored file: apca-w3 0.1.9. Do not edit or lint.
    ignores: ['src/core/apca.js'],
  },
  {
    files: ['src/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'eqeqeq': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    // The pdf-ua wrapper and all test files run in Node.js (Vitest) as well
    // as in the browser (via Vite polyfills). Include Node globals so that
    // Buffer, process, etc. are recognised without triggering no-undef.
    files: ['src/lib/pdf-ua/**/*.js', 'src/**/*.test.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'eqeqeq': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
];
