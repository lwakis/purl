// ESLint 10 flat config.
//
// TypeScript files are intentionally not linted here: typescript-eslint
// rejects TypeScript 7 (peer range <6.1.0, hard crash on import), so it is
// not installed — npm resolution stays conflict-free. TS is type-checked by
// `tsc -b` (part of `npm run build`) and formatted by Prettier. ESLint covers
// plain JS/JSX with core + React rules. Revisit once typescript-eslint
// supports TS >= 7.
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      // TypeScript sources can't be parsed without a TS-capable parser —
      // excluded from ESLint, covered by `tsc -b` and Prettier instead.
      '**/*.{ts,tsx}',
      // Test files are owned by the test suite agent.
      '**/*.test.{js,jsx,ts,tsx}',
      '**/src/test/**',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      ...reactHooks.configs['recommended-latest'].rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
  prettier,
];
