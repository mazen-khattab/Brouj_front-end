import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default defineConfig(
  globalIgnores(['dist/**', 'coverage/**', 'test-results/**', 'playwright-report/**']),
  { files: ['**/*.{js,mjs}'], ...js.configs.recommended, languageOptions: { globals: globals.node } },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  { files: ['src/**/*.{ts,tsx}'], extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite] },
  // The required route module exports route objects and the router, rather than components.
  { files: ['src/Router/router.tsx'], rules: { 'react-refresh/only-export-components': 'off' } },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/API.tsx'],
    rules: {
      // Type references may cross layers; every executable Axios import belongs in API.tsx.
      'no-restricted-imports': ['error', {
        paths: [{ name: 'axios', allowTypeImports: true, message: 'Use the transport in src/API.tsx.' }],
        patterns: [{ group: ['axios/*'], allowTypeImports: true, message: 'Axios runtime belongs in src/API.tsx.' }],
      }],
      'no-restricted-syntax': ['error',
        { selector: 'ImportExpression[source.value=/^axios/]', message: 'Dynamic Axios imports belong in src/API.tsx.' },
        { selector: 'CallExpression[callee.name="require"][arguments.0.value=/^axios/]', message: 'Axios require belongs in src/API.tsx.' },
      ],
    },
  },
);
