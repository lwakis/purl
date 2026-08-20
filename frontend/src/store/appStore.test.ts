import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';
import type {
  ChatMessage,
  Project,
  ActivePanel,
  PreviewSize,
  Locale,
  Attachment,
  SelectedElement,
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
  sidebarOpen: false,
  activePanel: 'code' as ActivePanel,
  previewSize: 'desktop' as PreviewSize,
  locale: 'ru' as Locale,
  selectedModel: null as string | null,
  planOn: false,
  selectMode: false,
  selectedElement: null as SelectedElement | null,
  attachments: [] as Attachment[],
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
    expect(state.activePanel).toBe('code');
    expect(state.projects).toEqual([]);
    expect(state.currentProject).toBeNull();
    expect(state.chatHistory).toEqual([]);
    expect(state.isGenerating).toBe(false);
    expect(state.generationStatus).toBe('');
    expect(state.generationError).toBeNull();
    expect(state.prompt).toBe('');
    expect(state.sidebarOpen).toBe(false);
    expect(state.previewSize).toBe('desktop');
    expect(state.locale).toBe('ru');
    expect(state.selectedModel).toBeNull();
    expect(state.planOn).toBe(false);
    expect(state.selectMode).toBe(false);
    expect(state.selectedElement).toBeNull();
    expect(state.attachments).toEqual([]);
  });

  it('setPrompt updates the prompt', () => {
    useAppStore.getState().setPrompt('hello');
    expect(useAppStore.getState().prompt).toBe('hello');
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

  it('setSelectedModel updates the selected model', () => {
    useAppStore.getState().setSelectedModel('openai:gpt-4o');
    expect(useAppStore.getState().selectedModel).toBe('openai:gpt-4o');

    useAppStore.getState().setSelectedModel(null);
    expect(useAppStore.getState().selectedModel).toBeNull();
  });

  it('setPlanOn toggles the plan flag', () => {
    useAppStore.getState().setPlanOn(true);
    expect(useAppStore.getState().planOn).toBe(true);

    useAppStore.getState().setPlanOn(false);
    expect(useAppStore.getState().planOn).toBe(false);
  });

  it('setSelectMode toggles the select mode flag', () => {
    useAppStore.getState().setSelectMode(true);
    expect(useAppStore.getState().selectMode).toBe(true);

    useAppStore.getState().setSelectMode(false);
    expect(useAppStore.getState().selectMode).toBe(false);
  });

  it('setSelectedElement and clearSelectedElement manage the selection', () => {
    const element: SelectedElement = {
      tag: 'button',
      id: null,
      classes: ['btn'],
      text: 'Go',
      selector: 'button.btn',
    };

    useAppStore.getState().setSelectedElement(element);
    expect(useAppStore.getState().selectedElement).toEqual(element);

    useAppStore.getState().clearSelectedElement();
    expect(useAppStore.getState().selectedElement).toBeNull();
  });

  it('addAttachment appends and does not mutate state in place', () => {
    const a1: Attachment = { id: '1', name: 'a.png', type: 'image/png', dataUrl: 'data:1' };
    const a2: Attachment = { id: '2', name: 'b.png', type: 'image/png', dataUrl: 'data:2' };

    useAppStore.getState().addAttachment(a1);
    const before = useAppStore.getState().attachments;

    useAppStore.getState().addAttachment(a2);

    const after = useAppStore.getState().attachments;
    expect(after).toEqual([a1, a2]);
    expect(after).not.toBe(before);
    expect(before).toEqual([a1]);
  });

  it('addAttachment dedupes by name', () => {
    const a1: Attachment = { id: '1', name: 'a.png', type: 'image/png', dataUrl: 'data:1' };
    const dup: Attachment = { id: '2', name: 'a.png', type: 'image/png', dataUrl: 'data:2' };

    useAppStore.getState().addAttachment(a1);
    useAppStore.getState().addAttachment(dup);

    expect(useAppStore.getState().attachments).toEqual([a1]);
  });

  it('addAttachment caps the list at 8', () => {
    for (let i = 0; i < 9; i++) {
      useAppStore.getState().addAttachment({
        id: String(i),
        name: `file-${i}.png`,
        type: 'image/png',
        dataUrl: `data:${i}`,
      });
    }

    expect(useAppStore.getState().attachments).toHaveLength(8);
    expect(useAppStore.getState().attachments[7].name).toBe('file-7.png');
  });

  it('removeAttachment removes by id', () => {
    const a1: Attachment = { id: '1', name: 'a.png', type: 'image/png', dataUrl: 'data:1' };
    const a2: Attachment = { id: '2', name: 'b.png', type: 'image/png', dataUrl: 'data:2' };
    useAppStore.getState().addAttachment(a1);
    useAppStore.getState().addAttachment(a2);

    useAppStore.getState().removeAttachment('1');

    expect(useAppStore.getState().attachments).toEqual([a2]);
  });

  it('clearAttachments empties the list', () => {
    useAppStore.getState().addAttachment({
      id: '1',
      name: 'a.png',
      type: 'image/png',
      dataUrl: 'data:1',
    });

    useAppStore.getState().clearAttachments();

    expect(useAppStore.getState().attachments).toEqual([]);
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
    useAppStore.getState().setCurrentCode('code');
    useAppStore.getState().setSessionId('s1');
    useAppStore.getState().setChatHistory([{ role: 'user', content: 'hi' }]);
    useAppStore.getState().setGenerating(true);
    useAppStore.getState().setGenerationStatus('done');
    useAppStore.getState().setCurrentProject(projectA);
    useAppStore.getState().addProject(projectA);
    useAppStore.getState().setSidebarOpen(true);
    useAppStore.getState().setActivePanel('chat');
    useAppStore.getState().setPreviewSize('mobile');
    useAppStore.getState().setLocale('en');
    useAppStore.getState().setSelectedModel('openai:gpt-4o');
    useAppStore.getState().setPlanOn(true);
    useAppStore.getState().setSelectMode(true);
    useAppStore.getState().setSelectedElement({
      tag: 'button',
      id: null,
      classes: ['btn'],
      text: 'Go',
      selector: 'button.btn',
    });
    useAppStore.getState().addAttachment({
      id: '1',
      name: 'a.png',
      type: 'image/png',
      dataUrl: 'data:1',
    });

    useAppStore.getState().reset();

    const state = useAppStore.getState();
    expect(state.prompt).toBe('');
    expect(state.currentCode).toBe('');
    expect(state.sessionId).toBe('');
    expect(state.chatHistory).toEqual([]);
    expect(state.isGenerating).toBe(false);
    expect(state.generationStatus).toBe('');
    expect(state.generationError).toBeNull();
    expect(state.currentProject).toBeNull();
    expect(state.projects).toEqual([]);
    expect(state.sidebarOpen).toBe(false);
    expect(state.activePanel).toBe('code');
    expect(state.previewSize).toBe('desktop');
    expect(state.locale).toBe('ru');
    expect(state.selectedModel).toBeNull();
    expect(state.planOn).toBe(false);
    expect(state.selectMode).toBe(false);
    expect(state.selectedElement).toBeNull();
    expect(state.attachments).toEqual([]);
  });
});
