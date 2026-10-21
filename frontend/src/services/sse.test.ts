import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectGenerateSSE, connectIterateSSE } from './sse';
import {
  UNAUTHORIZED_EVENT,
  clearInstanceToken,
  setInstanceToken,
} from './instanceAuth';

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
  clearInstanceToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearInstanceToken();
});

describe('sse client', () => {
  it('connectGenerateSSE forwards model, plan and images in the request body', async () => {
    fetchMock.mockResolvedValue(sseResponse(completeFrame));
    const onComplete = vi.fn();

    await connectGenerateSSE(
      'Build a page',
      { onEvent: noopEvent, onError: noopError, onComplete },
      { model: 'openai:gpt-4o', plan: true, images: ['data:image/png;base64,AAA'] },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'Build a page',
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

    await connectGenerateSSE('Build a page', {
      onEvent: noopEvent,
      onError: noopError,
      onComplete: noopComplete,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'Build a page',
    });
  });

  it('reports an error event through onError', async () => {
    fetchMock.mockResolvedValue(sseResponse('data: {"type":"error","content":"boom"}\n\n'));
    const onError = vi.fn();

    await connectGenerateSSE('Build a page', {
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

    await connectGenerateSSE('Build a page', {
      onEvent: noopEvent,
      onError,
      onComplete: noopComplete,
    });

    expect(onError).toHaveBeenCalledWith(
      new Error('Ошибка LLM-провайдера (401). Проверьте ключ и настройки.'),
    );
  });

  it('attaches a stored instance token as a Bearer header', async () => {
    setInstanceToken('secret-token');
    fetchMock.mockResolvedValue(sseResponse(completeFrame));

    await connectGenerateSSE('Build a page', {
      onEvent: noopEvent,
      onError: noopError,
      onComplete: noopComplete,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret-token',
    });
  });

  it('notifies and reports the unauthorized error on 401 without retrying', async () => {
    const onError = vi.fn();
    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    fetchMock.mockResolvedValue(new Response('unauthorized', { status: 401 }));

    await connectGenerateSSE('Build a page', {
      onEvent: noopEvent,
      onError,
      onComplete: noopComplete,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      new Error('Для доступа к этому инстансу нужен токен'),
    );
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  });
});