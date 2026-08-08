// ESLint 10 flat config.
//
// FALLBACK MODE — typescript-eslint 8.66 hard-crashes at import with the
// project's TypeScript 7.0.2 (`typescript-eslint does not support TS 7.0.`),
// and no TS-capable ESLint parser is available. Verified empirically — see
// `npm run lint` report. Therefore:
//   - .ts/.tsx files are excluded from ESLint entirely; they are type-checked
//     by `tsc -b` (part of `npm run build`) and formatted by Prettier.
//   - ESLint covers plain JS/JSX (config files today) with core + React rules.
// Revisit once typescript-eslint supports TS >= 7.1.
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
