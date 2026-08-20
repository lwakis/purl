import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeneration } from './useGeneration';
import { connectGenerateSSE, connectIterateSSE } from '../services/sse';
import { saveProjectVersion } from '../services/api';
import { useAppStore } from '../store/appStore';
import type { Attachment, SelectedElement } from '../types';

vi.mock('../services/sse', () => ({
  connectGenerateSSE: vi.fn(),
  connectIterateSSE: vi.fn(),
}));

vi.mock('../services/api', () => ({
  saveProjectVersion: vi.fn(),
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
  vi.mocked(connectGenerateSSE).mockResolvedValue(undefined);
  vi.mocked(connectIterateSSE).mockResolvedValue(undefined);
  useAppStore.setState({
    selectedModel: 'openai:gpt-4o',
    planOn: true,
    attachments: [attachment],
    selectedElement: element,
  });
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
      { model: null, plan: false, images: [] },
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
});