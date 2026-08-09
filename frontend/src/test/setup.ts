import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useAppStore } from '../store/appStore';

// Node 25+ exposes a global `localStorage` accessor returning undefined
// (unless --localstorage-file is passed); vitest then skips populating
// jsdom's Storage because the key already exists. Swap in jsdom's real one.
const jsdomWindow = (globalThis as Record<string, unknown>).jsdom as
  | { window: Window & { localStorage: Storage } }
  | undefined;
if (jsdomWindow && typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomWindow.window.localStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: jsdomWindow.window.sessionStorage,
    configurable: true,
    writable: true,
  });
}

// jsdom does not implement scrollIntoView; ChatPanel scrolls the chat log.
Element.prototype.scrollIntoView = () => {};

// Reset the zustand store and DOM between tests so component suites are
// isolated from each other (and from the store/api unit tests).
afterEach(() => {
  cleanup();
  useAppStore.setState({
    projects: [],
    currentProject: null,
    currentCode: '',
    sessionId: '',
    chatHistory: [],
    isGenerating: false,
    generationStatus: '',
    generationError: null,
    prompt: '',
    theme: 'dark',
    style: 'minimal',
    templates: [],
    sidebarOpen: false,
    activePanel: 'code',
    previewSize: 'desktop',
    locale: 'ru',
  });
  window.localStorage.clear();
});