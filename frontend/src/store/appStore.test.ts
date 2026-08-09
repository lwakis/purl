import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';
import type {
  ChatMessage,
  Project,
  PromptTemplate,
  ThemeMode,
  DesignStyle,
  ActivePanel,
  PreviewSize,
  Locale,
} from '../types';

const initialState = {
  projects: [] as Project[],
  currentProject: null as Project | null,
  currentCode: '',
  sessionId: '',
  chatHistory: [] as ChatMessage[],
  isGenerating: false,
  generationStatus: '',
  generationError: null,
  prompt: '',
  theme: 'dark' as ThemeMode,
  style: 'minimal' as DesignStyle,
  templates: [] as PromptTemplate[],
  sidebarOpen: false,
  activePanel: 'code' as ActivePanel,
  previewSize: 'desktop' as PreviewSize,
  locale: 'ru' as Locale,
};

const projectA: Project = {
  id: 1,
  name: 'A',
  prompt: 'p',
  current_code: 'code-a',
  theme: 'dark',
  style: 'minimal',
  session_id: 's1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const projectB: Project = {
  id: 2,
  name: 'B',
  prompt: 'p',
  current_code: 'code-b',
  theme: 'light',
  style: 'corporate',
  session_id: 's2',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

beforeEach(() => {
  useAppStore.setState(initialState);
});

describe('appStore', () => {
  it('has the expected initial state', () => {
    const state = useAppStore.getState();

    expect(state.sessionId).toBe('');
    expect(state.currentCode).toBe('');
    expect(state.theme).toBe('dark');
    expect(state.style).toBe('minimal');
    expect(state.activePanel).toBe('code');
    expect(state.projects).toEqual([]);
    expect(state.currentProject).toBeNull();
    expect(state.chatHistory).toEqual([]);
    expect(state.isGenerating).toBe(false);
    expect(state.generationStatus).toBe('');
    expect(state.generationError).toBeNull();
    expect(state.prompt).toBe('');
    expect(state.templates).toEqual([]);
    expect(state.sidebarOpen).toBe(false);
    expect(state.previewSize).toBe('desktop');
    expect(state.locale).toBe('ru');
  });

  it('setPrompt updates the prompt', () => {
    useAppStore.getState().setPrompt('hello');
    expect(useAppStore.getState().prompt).toBe('hello');
  });

  it('setTheme updates the theme', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('setStyle updates the style', () => {
    useAppStore.getState().setStyle('techno');
    expect(useAppStore.getState().style).toBe('techno');
  });

  it('setCurrentCode updates the current code', () => {
    useAppStore.getState().setCurrentCode('<div/>');
    expect(useAppStore.getState().currentCode).toBe('<div/>');
  });

  it('setChatHistory replaces the chat history', () => {
    const history: ChatMessage[] = [{ role: 'user', content: 'hi' }];
    useAppStore.getState().setChatHistory(history);
    expect(useAppStore.getState().chatHistory).toEqual(history);
  });

  it('setGenerating updates the generating flag', () => {
    useAppStore.getState().setGenerating(true);
    expect(useAppStore.getState().isGenerating).toBe(true);
  });

  it('setGenerationStatus updates the generation status', () => {
    useAppStore.getState().setGenerationStatus('generating…');
    expect(useAppStore.getState().generationStatus).toBe('generating…');
  });

  it('setSessionId updates the session id', () => {
    useAppStore.getState().setSessionId('sess-42');
    expect(useAppStore.getState().sessionId).toBe('sess-42');
  });

  it('setCurrentProject updates the current project', () => {
    useAppStore.getState().setCurrentProject(projectA);
    expect(useAppStore.getState().currentProject).toBe(projectA);

    useAppStore.getState().setCurrentProject(null);
    expect(useAppStore.getState().currentProject).toBeNull();
  });

  it('setProjects replaces the projects list', () => {
    useAppStore.getState().setProjects([projectA, projectB]);
    expect(useAppStore.getState().projects).toEqual([projectA, projectB]);
  });

  it('setTemplates replaces the templates list', () => {
    const templates: PromptTemplate[] = [
      {
        id: 1,
        title: 'Landing',
        description: 'd',
        prompt_text: 'p',
        category: 'c',
        icon: 'i',
      },
    ];
    useAppStore.getState().setTemplates(templates);
    expect(useAppStore.getState().templates).toEqual(templates);
  });

  it('setSidebarOpen updates the sidebar flag', () => {
    useAppStore.getState().setSidebarOpen(true);
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });

  it('setActivePanel updates the active panel', () => {
    useAppStore.getState().setActivePanel('chat');
    expect(useAppStore.getState().activePanel).toBe('chat');
  });

  it('setPreviewSize updates the preview size', () => {
    useAppStore.getState().setPreviewSize('mobile');
    expect(useAppStore.getState().previewSize).toBe('mobile');
  });

  it('setLocale updates the locale', () => {
    useAppStore.getState().setLocale('en');
    expect(useAppStore.getState().locale).toBe('en');

    useAppStore.getState().setLocale('ru');
    expect(useAppStore.getState().locale).toBe('ru');
  });

  it('addProject prepends and does not mutate state in place', () => {
    useAppStore.getState().setProjects([projectA]);
    const before = useAppStore.getState().projects;

    useAppStore.getState().addProject(projectB);

    const after = useAppStore.getState().projects;
    expect(after).toHaveLength(2);
    expect(after[0]).toBe(projectB);
    expect(after[1]).toBe(projectA);
    expect(after).not.toBe(before);
    expect(before).toHaveLength(1);
    expect(before[0]).toBe(projectA);
  });

  it('addChatMessage appends to chatHistory', () => {
    const msg1: ChatMessage = { role: 'user', content: 'hi' };
    const msg2: ChatMessage = { role: 'assistant', content: 'hello' };

    useAppStore.getState().addChatMessage(msg1);
    useAppStore.getState().addChatMessage(msg2);

    expect(useAppStore.getState().chatHistory).toEqual([msg1, msg2]);
  });

  it('reset restores the initial state', () => {
    useAppStore.getState().setPrompt('x');
    useAppStore.getState().setTheme('light');
    useAppStore.getState().setStyle('techno');
    useAppStore.getState().setCurrentCode('code');
    useAppStore.getState().setSessionId('s1');
    useAppStore.getState().setChatHistory([{ role: 'user', content: 'hi' }]);
    useAppStore.getState().setGenerating(true);
    useAppStore.getState().setGenerationStatus('done');
    useAppStore.getState().setCurrentProject(projectA);
    useAppStore.getState().addProject(projectA);
    useAppStore.getState().setTemplates([
      {
        id: 1,
        title: 'T',
        description: 'd',
        prompt_text: 'p',
        category: 'c',
        icon: 'i',
      },
    ]);
    useAppStore.getState().setSidebarOpen(true);
    useAppStore.getState().setActivePanel('chat');
    useAppStore.getState().setPreviewSize('mobile');
    useAppStore.getState().setLocale('en');

    useAppStore.getState().reset();

    const state = useAppStore.getState();
    expect(state.prompt).toBe('');
    expect(state.theme).toBe('dark');
    expect(state.style).toBe('minimal');
    expect(state.currentCode).toBe('');
    expect(state.sessionId).toBe('');
    expect(state.chatHistory).toEqual([]);
    expect(state.isGenerating).toBe(false);
    expect(state.generationStatus).toBe('');
    expect(state.generationError).toBeNull();
    expect(state.currentProject).toBeNull();
    expect(state.projects).toEqual([]);
    expect(state.templates).toEqual([]);
    expect(state.sidebarOpen).toBe(false);
    expect(state.activePanel).toBe('code');
    expect(state.previewSize).toBe('desktop');
    expect(state.locale).toBe('ru');
  });
});
