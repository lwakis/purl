import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from './useAutosave';
import { createProject, updateProject } from '../services/api';
import { useAppStore } from '../store/appStore';
import type { Project } from '../types';
import toast from 'react-hot-toast';

vi.mock('../services/api', () => ({
  createProject: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});

const CODE = '<html><body>Hello</body></html>';
const PROMPT = 'Build a landing page';

const project: Project = {
  id: 7,
  name: 'P',
  prompt: 'old',
  current_code: 'old-code',
  theme: 'dark',
  style: 'minimal',
  session_id: 'sess-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const storeDefaults = {
  projects: [] as Project[],
  currentProject: null as Project | null,
  currentCode: '',
  sessionId: '',
  chatHistory: [] as Array<{ role: 'user' | 'assistant'; content: string }>,
  isGenerating: false,
  generationStatus: '',
  generationError: null,
  prompt: '',
  theme: 'dark' as 'light' | 'dark' | 'auto',
  style: 'minimal' as 'minimal' | 'corporate' | 'playful' | 'techno',
  templates: [],
  sidebarOpen: false,
  activePanel: 'code' as 'code' | 'chat',
  previewSize: 'desktop' as 'desktop' | 'tablet' | 'mobile',
  locale: 'ru' as 'ru' | 'en',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(createProject).mockReset();
  vi.mocked(updateProject).mockReset();
  vi.mocked(toast.error).mockReset();
  useAppStore.setState(storeDefaults);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutosave', () => {
  it('creates a project after the debounce when none exists', async () => {
    const created: Project = { ...project, prompt: PROMPT, current_code: CODE };
    vi.mocked(createProject).mockResolvedValue(created);
    useAppStore.setState({ sessionId: 'sess-1', currentCode: CODE, prompt: PROMPT });

    const { result } = renderHook(() => useAutosave());
    expect(createProject).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(createProject).toHaveBeenCalledTimes(1);
    expect(createProject).toHaveBeenCalledWith({
      name: 'Build a landing page',
      prompt: PROMPT,
      current_code: CODE,
      theme: 'dark',
      style: 'minimal',
      session_id: 'sess-1',
    });
    expect(result.current.status).toBe('saved');
    expect(useAppStore.getState().currentProject).toEqual(created);
    expect(useAppStore.getState().projects).toEqual([created]);
  });

  it('truncates a long prompt for the project name', async () => {
    const longPrompt = 'A very long prompt '.repeat(6);
    vi.mocked(createProject).mockResolvedValue(project);
    useAppStore.setState({ sessionId: 'sess-1', currentCode: CODE, prompt: longPrompt });

    renderHook(() => useAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: longPrompt.trim().slice(0, 40) }),
    );
  });

  it('falls back to "Untitled" for a blank prompt', async () => {
    vi.mocked(createProject).mockResolvedValue(project);
    useAppStore.setState({ sessionId: 'sess-1', currentCode: CODE, prompt: '   ' });

    renderHook(() => useAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(createProject).toHaveBeenCalledWith(expect.objectContaining({ name: 'Untitled' }));
  });

  it('updates the existing project when the code changed and skips repeats', async () => {
    const updated: Project = { ...project, prompt: PROMPT, current_code: CODE };
    vi.mocked(updateProject).mockResolvedValue(updated);
    useAppStore.setState({
      sessionId: 'sess-1',
      currentCode: CODE,
      prompt: PROMPT,
      currentProject: project,
      projects: [project],
    });

    const { result } = renderHook(() => useAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(updateProject).toHaveBeenCalledWith(7, {
      current_code: CODE,
      prompt: PROMPT,
      theme: 'dark',
      style: 'minimal',
    });
    expect(result.current.status).toBe('saved');
    expect(useAppStore.getState().currentProject).toEqual(updated);
    expect(useAppStore.getState().projects).toEqual([updated]);

    // The save re-arms the debounce; when nothing changed it must not save again.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(updateProject).toHaveBeenCalledTimes(1);
  });

  it('does nothing for empty code, while generating, or without a session', async () => {
    useAppStore.setState({ sessionId: 'sess-1', currentCode: '', isGenerating: false });
    renderHook(() => useAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(createProject).not.toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();

    useAppStore.setState({ currentCode: CODE, isGenerating: true });
    renderHook(() => useAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(createProject).not.toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();

    useAppStore.setState({ currentCode: CODE, isGenerating: false, sessionId: '', currentProject: null });
    renderHook(() => useAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(createProject).not.toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it('reports an error status and toast when the API call rejects', async () => {
    let rejectCreate!: (err: Error) => void;
    vi.mocked(createProject).mockImplementation(
      () => new Promise((_resolve, reject) => {
        rejectCreate = reject;
      }),
    );
    useAppStore.setState({ sessionId: 'sess-1', currentCode: CODE, prompt: PROMPT });

    const { result } = renderHook(() => useAutosave());

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.status).toBe('saving');

    await act(async () => {
      rejectCreate!(new Error('boom'));
    });
    expect(result.current.status).toBe('error');
    expect(toast.error).toHaveBeenCalledWith('boom');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(result.current.status).toBe('idle');
  });
});
