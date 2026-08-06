import { useCallback } from 'react';
import { connectGenerateSSE, connectIterateSSE } from '../services/sse';
import { createAnonSession, saveProjectVersion } from '../services/api';
import { saveSession } from '../services/session';
import { useAppStore } from '../store/appStore';
import type { ChatMessage, SSEEvent } from '../types';

// Module-level abort state: the Cancel button lives in a different component
// instance than the one that started the generation, so the flag and the
// active AbortController must be shared across all useGeneration() callers.
let abortRequested = false;
let activeController: AbortController | null = null;

export function useGeneration() {
  const {
    setGenerating,
    setGenerationStatus,
    setGenerationError,
    setCurrentCode,
    addChatMessage,
    sessionId,
    setSessionId,
    currentCode,
    chatHistory,
    isGenerating,
    generationStatus,
    generationError,
  } = useAppStore();

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    try {
      const anon = await createAnonSession();
      setSessionId(anon.session_id);
      saveSession(anon.session_id, anon.token);
      return anon.session_id;
    } catch {
      return null;
    }
  }, [sessionId, setSessionId]);

  const generate = useCallback(
    async (prompt: string, theme?: string, style?: string) => {
      abortRequested = false;
      activeController = new AbortController();
      setGenerationError(null);
      setGenerating(true);
      setGenerationStatus('Анализирую промпт...');
      setCurrentCode('');

      let accumulatedCode = '';

      const handleEvent = (event: SSEEvent) => {
        if (abortRequested) return;

        switch (event.type) {
          case 'analysis':
            setGenerationStatus('Анализирую промпт...');
            break;
          case 'design':
            setGenerationStatus('Разрабатываю дизайн...');
            break;
          case 'code':
            setGenerationStatus('Генерирую код...');
            accumulatedCode += event.content;
            setCurrentCode(accumulatedCode);
            break;
        }
      };

      const handleError = (err: Error) => {
        if (abortRequested) return;
        setGenerationError(err.message);
        setGenerating(false);
        setGenerationStatus('');
      };

      const handleComplete = (finalHtml: string) => {
        if (abortRequested) return;
        setCurrentCode(finalHtml);
        setGenerating(false);
        setGenerationStatus('Готово!');
      };

      await connectGenerateSSE(prompt, theme || 'dark', style || 'minimal', {
        onEvent: handleEvent,
        onError: handleError,
        onComplete: handleComplete,
      });
    },
    [setGenerating, setGenerationStatus, setGenerationError, setCurrentCode]
  );

  const iterate = useCallback(
    async (message: string) => {
      const sid = await ensureSession();
      if (!sid) {
        setGenerationError('Не удалось создать сессию. Попробуйте ещё раз.');
        return;
      }

      abortRequested = false;
      activeController = new AbortController();
      setGenerationError(null);
      setGenerating(true);
      setGenerationStatus('Обрабатываю правки...');

      const userMessage: ChatMessage = { role: 'user', content: message };
      addChatMessage(userMessage);

      const updatedHistory = [...chatHistory, userMessage];
      let accumulatedCode = '';

      const handleEvent = (event: SSEEvent) => {
        if (abortRequested) return;

        switch (event.type) {
          case 'analysis':
            setGenerationStatus('Анализирую правки...');
            break;
          case 'design':
            setGenerationStatus('Обновляю дизайн...');
            break;
          case 'code':
            setGenerationStatus('Генерирую код...');
            accumulatedCode += event.content;
            setCurrentCode(accumulatedCode);
            break;
        }
      };

      const handleError = (err: Error) => {
        if (abortRequested) return;
        setGenerationError(err.message);
        setGenerating(false);
        setGenerationStatus('');
        addChatMessage({
          role: 'assistant',
          content: `Произошла ошибка: ${err.message}. Пожалуйста, попробуйте ещё раз.`,
        });
      };

      const handleComplete = (finalHtml: string) => {
        if (abortRequested) return;
        setCurrentCode(finalHtml);
        setGenerating(false);
        setGenerationStatus('');

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: `Готово! Я обновил дизайн согласно вашим правкам.`,
        };
        addChatMessage(assistantMessage);

        // Auto-save a version when iterating on a saved project so the
        // version history stays meaningful.
        const project = useAppStore.getState().currentProject;
        if (project) {
          saveProjectVersion(project.id, finalHtml, message).catch(() => {});
        }
      };

      await connectIterateSSE(sid, message, currentCode, updatedHistory, {
        onEvent: handleEvent,
        onError: handleError,
        onComplete: handleComplete,
      });
    },
    [
      ensureSession,
      sessionId,
      currentCode,
      chatHistory,
      addChatMessage,
      setGenerating,
      setGenerationStatus,
      setGenerationError,
      setCurrentCode,
    ]
  );

  const cancel = useCallback(() => {
    abortRequested = true;
    activeController?.abort();
    activeController = null;
    setGenerating(false);
    setGenerationStatus('');
  }, [setGenerating, setGenerationStatus]);

  return {
    generate,
    iterate,
    cancel,
    error: generationError,
    isGenerating,
    status: generationStatus,
  };
}