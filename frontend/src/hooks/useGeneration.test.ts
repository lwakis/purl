import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeneration } from './useGeneration';
import { connectGenerateSSE, connectIterateSSE } from '../services/sse';
import { saveProjectVersion, getUsage } from '../services/api';
import { createSessionId } from '../services/session';
import { useAppStore } from '../store/appStore';
import type { Attachment, SelectedElement, Project } from '../types';

vi.mock('../services/sse', () => ({
  connectGenerateSSE: vi.fn(),
  connectIterateSSE: vi.fn(),
}));

vi.mock('../services/api', () => ({
  saveProjectVersion: vi.fn(),
  getUsage: vi.fn(),
}));

vi.mock('../services/session', () => ({
  createSessionId: vi.fn(() => 'sess-test'),
  saveSession: vi.fn(),
}));

const attachment: Attachment = {
  id: 'a1',
  name: 'logo.png',
  type: 'image/png',
  dataUrl: 'data:image/png;base64,AAA',
};

const element: SelectedElement = {
  tag: 'button',
  id: null,
  classes: ['btn', 'primary'],
  text: 'Go',
  selector: 'button.btn.primary',
};

beforeEach(() => {
  vi.mocked(connectGenerateSSE).mockReset();
  vi.mocked(connectIterateSSE).mockReset();
  vi.mocked(saveProjectVersion).mockReset();
  vi.mocked(getUsage).mockReset();
  vi.mocked(connectGenerateSSE).mockResolvedValue(undefined);
  vi.mocked(connectIterateSSE).mockResolvedValue(undefined);
  vi.mocked(saveProjectVersion).mockResolvedValue({
    id: 1,
    project_id: 7,
    version_num: 1,
    code: '<html>new</html>',
    message: 'Make it bigger',
    created_at: '2026-08-20T00:00:00Z',
  });
  vi.mocked(getUsage).mockResolvedValue(null);
  vi.mocked(createSessionId).mockClear();
  useAppStore.setState({
    selectedModel: 'openai:gpt-4o',
    planOn: true,
    attachments: [attachment],
    selectedElement: element,
    tokenUsage: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useGeneration', () => {
  it('generate forwards model, plan and images from the store', async () => {
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generate('Build a page');
    });

    expect(connectGenerateSSE).toHaveBeenCalledWith(
      'Build a page',
      'dark',
      'minimal',
      expect.any(Object),
      {
        session_id: 'sess-test',
        model: 'openai:gpt-4o',
        plan: true,
        images: ['data:image/png;base64,AAA'],
      },
    );
  });

  it('generate sends null model, false plan and empty images by default', async () => {
    useAppStore.setState({ selectedModel: null, planOn: false, attachments: [] });
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generate('Build a page');
    });

    expect(connectGenerateSSE).toHaveBeenCalledWith(
      'Build a page',
      'dark',
      'minimal',
      expect.any(Object),
      { session_id: 'sess-test', model: null, plan: false, images: [] },
    );
  });

  it('iterate forwards model, plan, images and the selected element as JSON', async () => {
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.iterate('Make it bigger');
    });

    expect(connectIterateSSE).toHaveBeenCalledWith(
      'sess-test',
      'Make it bigger',
      '',
      expect.any(Array),
      expect.any(Object),
      {
        model: 'openai:gpt-4o',
        plan: true,
        images: ['data:image/png;base64,AAA'],
        selected_element: JSON.stringify({
          tag: 'button',
          id: null,
          classes: ['btn', 'primary'],
          text: 'Go',
          selector: 'button.btn.primary',
        }),
      },
    );
  });

  it('clears the selected element after iterate completes', async () => {
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.iterate('Make it bigger');
    });

    const options = vi.mocked(connectIterateSSE).mock.calls[0][4];
    await act(async () => {
      options.onComplete('<html>new</html>');
    });

    expect(useAppStore.getState().selectedElement).toBeNull();
  });

  it('sends null selected_element when nothing is selected', async () => {
    useAppStore.setState({ selectedElement: null });
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.iterate('Make it bigger');
    });

    expect(connectIterateSSE).toHaveBeenCalledWith(
      'sess-test',
      'Make it bigger',
      '',
      expect.any(Array),
      expect.any(Object),
      expect.objectContaining({ selected_element: null }),
    );
  });

  it('generate drives status through analysis/design/code events and flushes code', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generate('Build a page');
    });

    const options = vi.mocked(connectGenerateSSE).mock.calls[0][3];

    act(() => {
      options.onEvent({ type: 'analysis', content: '' });
    });
    expect(useAppStore.getState().generationStatus).toBe('status.analysis');

    act(() => {
      options.onEvent({ type: 'design', content: '' });
    });
    expect(useAppStore.getState().generationStatus).toBe('status.design');

    act(() => {
      options.onEvent({ type: 'code', content: '<div>' });
      options.onEvent({ type: 'code', content: '</div>' });
    });
    expect(useAppStore.getState().generationStatus).toBe('status.code');
    expect(useAppStore.getState().currentCode).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(useAppStore.getState().currentCode).toBe('<div></div>');
  });

  it('generate finalize publishes the final html and marks done', async () => {
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generate('Build a page');
    });

    const options = vi.mocked(connectGenerateSSE).mock.calls[0][3];
    act(() => {
      options.onComplete('<html>final</html>');
    });

    expect(useAppStore.getState().currentCode).toBe('<html>final</html>');
    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().generationStatus).toBe('status.done');
    expect(getUsage).toHaveBeenCalledWith('sess-test');
  });

  it('generate stores token usage returned by the backend on completion', async () => {
    vi.mocked(getUsage).mockResolvedValue({ input: 10, output: 5, total: 15 });
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generate('Build a page');
    });

    const options = vi.mocked(connectGenerateSSE).mock.calls[0][3];
    await act(async () => {
      options.onComplete('<html>final</html>');
    });

    expect(useAppStore.getState().tokenUsage).toEqual({ input: 10, output: 5, total: 15 });
  });

  it('generate reports errors through the store', async () => {
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generate('Build a page');
    });

    const options = vi.mocked(connectGenerateSSE).mock.calls[0][3];
    act(() => {
      options.onError(new Error('boom'));
    });

    expect(useAppStore.getState().generationError).toBe('boom');
    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().generationStatus).toBe('');
  });

  it('iterate drives status through analysis/design/code events', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.iterate('Make it bigger');
    });

    const options = vi.mocked(connectIterateSSE).mock.calls[0][4];

    act(() => {
      options.onEvent({ type: 'analysis', content: '' });
    });
    expect(useAppStore.getState().generationStatus).toBe('status.analysisEdits');

    act(() => {
      options.onEvent({ type: 'design', content: '' });
    });
    expect(useAppStore.getState().generationStatus).toBe('status.designEdits');

    act(() => {
      options.onEvent({ type: 'code', content: '<main>' });
    });
    expect(useAppStore.getState().generationStatus).toBe('status.code');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(useAppStore.getState().currentCode).toBe('<main>');
  });

  it('iterate reports errors and adds an assistant message', async () => {
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.iterate('Make it bigger');
    });

    const options = vi.mocked(connectIterateSSE).mock.calls[0][4];
    act(() => {
      options.onError(new Error('boom'));
    });

    expect(useAppStore.getState().generationError).toBe('boom');
    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().generationStatus).toBe('');
    const history = useAppStore.getState().chatHistory;
    expect(history[history.length - 1]).toEqual({
      role: 'assistant',
      content: expect.stringContaining('boom'),
    });
  });

  it('iterate saves a project version when a project exists', async () => {
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
    useAppStore.setState({ currentProject: project });
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.iterate('Make it bigger');
    });

    const options = vi.mocked(connectIterateSSE).mock.calls[0][4];
    await act(async () => {
      options.onComplete('<html>new</html>');
    });

    expect(saveProjectVersion).toHaveBeenCalledWith(7, '<html>new</html>', 'Make it bigger');
    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().generationStatus).toBe('');
    const history = useAppStore.getState().chatHistory;
    expect(history[history.length - 1]).toEqual({
      role: 'assistant',
      content: expect.any(String),
    });
  });

  it('iterate reuses an existing session id', async () => {
    useAppStore.setState({ sessionId: 'sess-existing' });
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.iterate('Make it bigger');
    });

    expect(connectIterateSSE).toHaveBeenCalledWith(
      'sess-existing',
      'Make it bigger',
      '',
      expect.any(Array),
      expect.any(Object),
      expect.any(Object),
    );
    expect(createSessionId).not.toHaveBeenCalled();
  });

  it('cancel aborts the active stream and disposes the publisher', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generate('Build a page');
    });

    const options = vi.mocked(connectGenerateSSE).mock.calls[0][3];
    act(() => {
      options.onEvent({ type: 'code', content: '<div>' });
    });

    act(() => {
      result.current.cancel();
    });

    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().generationStatus).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(useAppStore.getState().currentCode).toBe('');
  });

  it('cancel is a no-op when nothing is running', () => {
    const { result } = renderHook(() => useGeneration());

    act(() => {
      result.current.cancel();
    });

    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().generationStatus).toBe('');
  });

  it('generate ignores SSE events after cancel', async () => {
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.generate('Build a page');
    });

    const options = vi.mocked(connectGenerateSSE).mock.calls[0][3];
    act(() => {
      result.current.cancel();
    });

    act(() => {
      options.onEvent({ type: 'design', content: '' });
      options.onError(new Error('late'));
      options.onComplete('<html>late</html>');
    });

    expect(useAppStore.getState().generationStatus).toBe('');
    expect(useAppStore.getState().generationError).toBeNull();
    expect(useAppStore.getState().isGenerating).toBe(false);
  });

  it('iterate ignores SSE events after cancel', async () => {
    const { result } = renderHook(() => useGeneration());

    await act(async () => {
      await result.current.iterate('Make it bigger');
    });

    const options = vi.mocked(connectIterateSSE).mock.calls[0][4];
    act(() => {
      result.current.cancel();
    });

    act(() => {
      options.onEvent({ type: 'design', content: '' });
      options.onError(new Error('late'));
      options.onComplete('<html>late</html>');
    });

    expect(useAppStore.getState().generationStatus).toBe('');
    expect(useAppStore.getState().generationError).toBeNull();
    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().selectedElement).not.toBeNull();
  });
});