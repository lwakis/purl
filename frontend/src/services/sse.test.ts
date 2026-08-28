import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectGenerateSSE, connectIterateSSE } from './sse';

const fetchMock = vi.fn();

function sseResponse(frames: string): Response {
  return new Response(frames, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

const completeFrame = 'data: {"type":"complete","content":"<html/>"}\n\n';

const noopEvent = () => {};
const noopError = () => {};
const noopComplete = () => {};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sse client', () => {
  it('connectGenerateSSE forwards model, plan and images in the request body', async () => {
    fetchMock.mockResolvedValue(sseResponse(completeFrame));
    const onComplete = vi.fn();

    await connectGenerateSSE(
      'Build a page',
      'dark',
      'minimal',
      { onEvent: noopEvent, onError: noopError, onComplete },
      { model: 'openai:gpt-4o', plan: true, images: ['data:image/png;base64,AAA'] },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'Build a page',
      theme: 'dark',
      style: 'minimal',
      model: 'openai:gpt-4o',
      plan: true,
      images: ['data:image/png;base64,AAA'],
    });
    expect(onComplete).toHaveBeenCalledWith('<html/>');
  });

  it('connectIterateSSE forwards model, plan, images and selected_element', async () => {
    fetchMock.mockResolvedValue(sseResponse(completeFrame));
    const onComplete = vi.fn();

    await connectIterateSSE(
      's1',
      'Make it bigger',
      '<html/>',
      [{ role: 'user', content: 'Make it bigger' }],
      { onEvent: noopEvent, onError: noopError, onComplete },
      {
        model: 'openai:gpt-4o',
        plan: false,
        images: [],
        selected_element: '{"tag":"button","id":null,"classes":["btn"],"text":"Go","selector":"button.btn"}',
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({
      session_id: 's1',
      message: 'Make it bigger',
      current_code: '<html/>',
      history: [{ role: 'user', content: 'Make it bigger' }],
      model: 'openai:gpt-4o',
      plan: false,
      images: [],
      selected_element:
        '{"tag":"button","id":null,"classes":["btn"],"text":"Go","selector":"button.btn"}',
    });
    expect(onComplete).toHaveBeenCalledWith('<html/>');
  });

  it('omits the new fields when no extras are passed', async () => {
    fetchMock.mockResolvedValue(sseResponse(completeFrame));

    await connectGenerateSSE('Build a page', 'dark', 'minimal', {
      onEvent: noopEvent,
      onError: noopError,
      onComplete: noopComplete,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'Build a page',
      theme: 'dark',
      style: 'minimal',
    });
  });

  it('reports an error event through onError', async () => {
    fetchMock.mockResolvedValue(sseResponse('data: {"type":"error","content":"boom"}\n\n'));
    const onError = vi.fn();

    await connectGenerateSSE('Build a page', 'dark', 'minimal', {
      onEvent: noopEvent,
      onError,
      onComplete: noopComplete,
    });

    expect(onError).toHaveBeenCalledWith(new Error('boom'));
  });

  it('translates a known backend error code via the active locale', async () => {
    fetchMock.mockResolvedValue(
      sseResponse('data: {"type":"error","content":"llm_provider_error:401"}\n\n'),
    );
    const onError = vi.fn();

    await connectGenerateSSE('Build a page', 'dark', 'minimal', {
      onEvent: noopEvent,
      onError,
      onComplete: noopComplete,
    });

    expect(onError).toHaveBeenCalledWith(
      new Error('Ошибка LLM-провайдера (401). Проверьте ключ и настройки.'),
    );
  });
});