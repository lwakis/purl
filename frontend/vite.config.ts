import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Group heavy third-party code into stable vendor chunks so no single bundle
// trips rollup's 500 kB warning and each group caches independently of app
// code. Anything unmatched keeps its default chunk — in particular
// react-syntax-highlighter stays inside the lazy-loaded CodePanel chunk.
//
// Note: rolldown (Vite 8) only supports the function form of manualChunks,
// not the object form documented for Rollup.
const MARKDOWN_PREFIXES = [
  'remark-',
  'micromark',
  'mdast-',
  'hast-',
  'unist-',
  'estree-util-',
  'vfile',
  'style-to-',
  'character-entities',
  'character-reference-',
];
const MARKDOWN_PACKAGES = new Set([
  'react-markdown',
  'unified',
  'bail',
  'trough',
  'devlop',
  'zwitch',
  'ccount',
  'extend',
  'dequal',
  'debug',
  'ms',
  'escape-string-regexp',
  'is-plain-obj',
  'longest-streak',
  'markdown-table',
  'parse-entities',
  'stringify-entities',
  'decode-named-character-reference',
  'property-information',
  'space-separated-tokens',
  'comma-separated-tokens',
  'html-url-attributes',
  'trim-lines',
  'inline-style-parser',
  'is-alphabetical',
  'is-alphanumerical',
  'is-decimal',
  'is-hexadecimal',
  '@ungap/structured-clone',
]);

function packageName(id: string): string | undefined {
  const segments = id.split(/[\\/]/);
  const i = segments.lastIndexOf('node_modules');
  if (i === -1 || i >= segments.length - 1) return undefined;
  const first = segments[i + 1];
  return first.startsWith('@') ? `${first}/${segments[i + 2]}` : first;
}

function manualChunks(id: string): string | undefined {
  const pkg = packageName(id);
  if (!pkg) return undefined;
  if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') {
    return 'vendor-react';
  }
  if (pkg === 'react-hot-toast' || pkg === 'zustand' || pkg.startsWith('@heroicons/')) {
    return 'vendor-ui';
  }
  if (MARKDOWN_PACKAGES.has(pkg) || MARKDOWN_PREFIXES.some((prefix) => pkg.startsWith(prefix))) {
    return 'vendor-markdown';
  }
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
