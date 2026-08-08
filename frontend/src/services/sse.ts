import type { ChatMessage, SSEEvent } from '../types';
import { getToken } from './session';
import { BASE_URL } from './api';
import { t } from '../i18n';

interface SSEOptions {
  onEvent: (event: SSEEvent) => void;
  onError: (error: Error) => void;
  onComplete: (finalHtml: string) => void;
}

const INACTIVITY_TIMEOUT_MS = 120_000;
const RETRY_BACKOFF_MS = 800;

/**
 * Streams an SSE POST response to `onEvent`/`onComplete`, reporting failures
 * through `onError`.
 *
 * Transient network failures get exactly one automatic retry after a short
 * backoff: fetch() rejecting with a network-level error (TypeError), an HTTP
 * status >= 500, or the response body stream erroring mid-read. Never
 * retried: 4xx responses (429 keeps its rate-limit message), aborted
 * requests, and the inactivity timeout.
 */
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

async function connectSSE(url: string, body: unknown, options: SSEOptions): Promise<void> {
  const { onEvent, onError, onComplete } = options;
  let finalHtml = '';
  let completed = false;
  let settled = false;
  let retried = false;
  let abortRequested = false;
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
      settle(() => onError(new Error(t('errors.timeout'))));
    }, INACTIVITY_TIMEOUT_MS);
  };

  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    clearTimer();
    fn();
  };

  const isAborted = () => abortRequested || controller.signal.aborted;

  const isRetryable = (error: unknown, status?: number): boolean => {
    if (retried || settled || isAborted()) return false;
    if (status !== undefined) return status >= 500;
    // fetch() rejects with a TypeError on network-level failures.
    return error instanceof TypeError;
  };

  // Runs one attempt; returns true when a retry should be performed. A
  // retryable failure on the retry attempt itself settles with the underlying
  // error instead of returning true (retried is already set).
  const runAttempt = async (): Promise<boolean> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status >= 500) {
        if (isRetryable(undefined, response.status)) return true;
        throw new Error(t('errors.serverError', { status: response.status }));
      }

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? t('errors.rateLimit')
            : t('errors.serverError', { status: response.status }),
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(t('errors.bodyUnreadable'));
      }

      const decoder = new TextDecoder();
      let buffer = '';
      resetTimer();

      while (true) {
        let done: boolean;
        let value: Uint8Array | undefined;
        try {
          ({ done, value } = await reader.read());
        } catch (error) {
          // Stream failed mid-read (connection dropped, proxy reset).
          if (isRetryable(error)) return true;
          throw error;
        }
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
        settle(() => onError(new Error(t('errors.connectionLost'))));
      }
      return false;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // User-initiated cancel (or inactivity timeout, already settled above).
        settle(() => onError(new Error(t('errors.cancelled'))));
        return false;
      }
      if (isRetryable(error)) return true;
      settle(() => onError(error instanceof Error ? error : new Error(t('errors.network'))));
      return false;
    }
  };

  if (await runAttempt()) {
    retried = true;
    clearTimer();
    await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));
    if (settled || isAborted()) return;
    // Discard any partial output from the failed attempt before retrying.
    finalHtml = '';
    await runAttempt();
  }
}

export function connectGenerateSSE(
  prompt: string,
  theme: string,
  style: string,
  options: SSEOptions,
): Promise<void> {
  return connectSSE(`${BASE_URL}/api/generate`, { prompt, theme, style }, options);
}

export function connectIterateSSE(
  sessionId: string | undefined,
  message: string,
  currentCode: string,
  history: ChatMessage[],
  options: SSEOptions,
): Promise<void> {
  return connectSSE(
    `${BASE_URL}/api/iterate`,
    {
      session_id: sessionId,
      message,
      current_code: currentCode,
      history: history.slice(-10),
    },
    options,
  );
}
