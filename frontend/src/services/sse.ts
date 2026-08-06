import type { ChatMessage, SSEEvent } from '../types';
import { getToken } from './session';

interface SSEOptions {
  onEvent: (event: SSEEvent) => void;
  onError: (error: Error) => void;
  onComplete: (finalHtml: string) => void;
}

const INACTIVITY_TIMEOUT_MS = 120_000;

function parseSSELine(line: string): SSEEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data: ')) return null;

  const jsonStr = trimmed.slice(6).trim();
  if (!jsonStr) return null;

  try {
    return JSON.parse(jsonStr) as SSEEvent;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function connectSSE(
  url: string,
  body: unknown,
  options: SSEOptions
): Promise<void> {
  const { onEvent, onError, onComplete } = options;
  let finalHtml = '';
  let completed = false;
  let settled = false;
  const controller = new AbortController();
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  };

  const resetTimer = () => {
    clearTimer();
    inactivityTimer = setTimeout(() => {
      controller.abort();
      settle(() =>
        onError(new Error('Превышено время ожидания ответа сервера'))
      );
    }, INACTIVITY_TIMEOUT_MS);
  };

  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    clearTimer();
    fn();
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? 'Превышен лимит запросов, попробуйте позже'
          : `Ошибка сервера (${response.status})`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    resetTimer();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resetTimer();

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) continue;

        onEvent(event);

        if (event.type === 'code') {
          finalHtml += event.content;
        } else if (event.type === 'complete') {
          completed = true;
          if (event.content) {
            finalHtml = event.content;
          }
          settle(() => onComplete(finalHtml));
        } else if (event.type === 'error') {
          settle(() => onError(new Error(event.content)));
        }
      }
    }

    // Clean EOF without a `complete` event means the stream was cut short —
    // surface an error so the loading state never hangs forever.
    if (!completed) {
      settle(() => onError(new Error('Соединение с сервером прервано')));
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // User-initiated cancel (or inactivity timeout, already settled above).
      settle(() => onError(new Error('Генерация отменена')));
    } else {
      settle(() =>
        onError(
          error instanceof Error
            ? error
            : new Error('Не удалось связаться с сервером')
        )
      );
    }
  }
}

export function connectGenerateSSE(
  prompt: string,
  theme: string,
  style: string,
  options: SSEOptions
): Promise<void> {
  return connectSSE('/api/generate', { prompt, theme, style }, options);
}

export function connectIterateSSE(
  sessionId: string | undefined,
  message: string,
  currentCode: string,
  history: ChatMessage[],
  options: SSEOptions
): Promise<void> {
  return connectSSE(
    '/api/iterate',
    {
      session_id: sessionId,
      message,
      current_code: currentCode,
      history: history.slice(-10),
    },
    options
  );
}
