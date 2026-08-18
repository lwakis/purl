import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { ChatMessage, Project, ActivePanel, PreviewSize, Locale } from '../types';

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  currentCode: string;
  sessionId: string;
  chatHistory: ChatMessage[];
  isGenerating: boolean;
  generationStatus: string;
  generationError: string | null;
  prompt: string;
  sidebarOpen: boolean;
  activePanel: ActivePanel;
  previewSize: PreviewSize;
  locale: Locale;

  setPrompt: (prompt: string) => void;
  setCurrentCode: (code: string) => void;
  setChatHistory: (history: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setGenerating: (isGenerating: boolean) => void;
  setGenerationStatus: (status: string) => void;
  setGenerationError: (error: string | null) => void;
  setSessionId: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  setProjects: (projects: Project[]) => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setPreviewSize: (size: PreviewSize) => void;
  setLocale: (locale: Locale) => void;
  reset: () => void;
}

// The slice of state that survives reloads.
interface PersistedUIState {
  locale: Locale;
}

const initialState = {
  projects: [],
  currentProject: null,
  currentCode: '',
  sessionId: '',
  chatHistory: [] as ChatMessage[],
  isGenerating: false,
  generationStatus: '',
  generationError: null,
  prompt: '',
  sidebarOpen: false,
  activePanel: 'code' as ActivePanel,
  previewSize: 'desktop' as PreviewSize,
  locale: 'ru' as Locale,
};

// Resolve localStorage lazily on every call. In the test environment the
// store module is imported before the setup file swaps in jsdom's real
// localStorage, so an eager `createJSONStorage(() => localStorage)` would
// capture Node's undefined accessor and crash every `set()`.
// Persistence is best-effort: if storage is unavailable, silently skip.
const lazyStorage: StateStorage = {
  getItem: (name) => {
    try {
      return globalThis.localStorage?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      globalThis.localStorage?.setItem(name, value);
    } catch {
      // storage unavailable — ignore
    }
  },
  removeItem: (name) => {
    try {
      globalThis.localStorage?.removeItem(name);
    } catch {
      // storage unavailable — ignore
    }
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setPrompt: (prompt) => set({ prompt }),
      setCurrentCode: (currentCode) => set({ currentCode }),
      setChatHistory: (chatHistory) => set({ chatHistory }),
      addChatMessage: (message) =>
        set((state) => ({ chatHistory: [...state.chatHistory, message] })),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationStatus: (generationStatus) => set({ generationStatus }),
      setGenerationError: (generationError) => set({ generationError }),
      setSessionId: (sessionId) => set({ sessionId }),
      setCurrentProject: (currentProject) => set({ currentProject }),
      addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
      setProjects: (projects) => set({ projects }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setActivePanel: (activePanel) => set({ activePanel }),
      setPreviewSize: (previewSize) => set({ previewSize }),
      setLocale: (locale) => set({ locale }),
      reset: () => set(initialState),
    }),
    {
      // Persist only the UI language choice; everything else is runtime state.
      name: 'purl-ui',
      storage: createJSONStorage<PersistedUIState>(() => lazyStorage),
      partialize: (state) => ({ locale: state.locale }),
    },
  ),
);
