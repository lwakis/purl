import { create } from 'zustand';
import type {
  ChatMessage,
  Project,
  PromptTemplate,
  ThemeMode,
  DesignStyle,
  ActivePanel,
  PreviewSize,
} from '../types';

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
  theme: ThemeMode;
  style: DesignStyle;
  templates: PromptTemplate[];
  shareUrl: string | null;
  sidebarOpen: boolean;
  activePanel: ActivePanel;
  previewSize: PreviewSize;

  setPrompt: (prompt: string) => void;
  setTheme: (theme: ThemeMode) => void;
  setStyle: (style: DesignStyle) => void;
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
  setTemplates: (templates: PromptTemplate[]) => void;
  setShareUrl: (url: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setPreviewSize: (size: PreviewSize) => void;
  reset: () => void;
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
  theme: 'dark' as ThemeMode,
  style: 'minimal' as DesignStyle,
  templates: [],
  shareUrl: null,
  sidebarOpen: false,
  activePanel: 'code' as ActivePanel,
  previewSize: 'desktop' as PreviewSize,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setPrompt: (prompt) => set({ prompt }),
  setTheme: (theme) => set({ theme }),
  setStyle: (style) => set({ style }),
  setCurrentCode: (currentCode) => set({ currentCode }),
  setChatHistory: (chatHistory) => set({ chatHistory }),
  addChatMessage: (message) => set((state) => ({ chatHistory: [...state.chatHistory, message] })),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationStatus: (generationStatus) => set({ generationStatus }),
  setGenerationError: (generationError) => set({ generationError }),
  setSessionId: (sessionId) => set({ sessionId }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
  setProjects: (projects) => set({ projects }),
  setTemplates: (templates) => set({ templates }),
  setShareUrl: (shareUrl) => set({ shareUrl }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setPreviewSize: (previewSize) => set({ previewSize }),
  reset: () => set(initialState),
}));
