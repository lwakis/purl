import { useCallback } from 'react';
import { connectGenerateSSE, connectIterateSSE } from '../services/sse';
import { getUsage, saveProjectVersion } from '../services/api';
import { createSessionId, saveSession } from '../services/session';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';
import type { ChatMessage, SSEEvent } from '../types';

// Module-level abort state: the Cancel button lives in a different component
// instance than the one that started the generation, so the flag and the
// active AbortController must be shared across all useGeneration() callers.
let abortRequested = false;
let activeController: AbortController | null = null;
let activePublisher: CodePublisher | null = null;

// How often the preview may refresh while a stream is running. Code chunks
// arrive far faster than the iframe can meaningfully re-render, and each
// srcDoc swap reloads the whole generated page — dozens of them per second
// read as a violent flicker. Accumulate locally, publish on a throttle.
const CODE_FLUSH_MS = 300;

interface CodePublisher {
  push: (chunk: string) => void;
  finalize: (html: string) => void;
  dispose: () => void;
}

function createCodePublisher(setCurrentCode: (code: string) => void): CodePublisher {
  let accumulated = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    setCurrentCode(accumulated);
  };

  return {
    push(chunk) {
      accumulated += chunk;
      if (timer === null) {
        timer = setTimeout(flush, CODE_FLUSH_MS);
      }
    },
    finalize(html) {
      accumulated = html;
      flush();
    },
    dispose() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

export function useGeneration() {
  const { t } = useT();
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

  const ensureSession = useCallback((): string => {
    if (sessionId) return sessionId;
    const sid = createSessionId();
    setSessionId(sid);
    saveSession(sid);
    return sid;
  }, [sessionId, setSessionId]);

  const generate = useCallback(
    async (prompt: string) => {
      const sid = ensureSession();

      abortRequested = false;
      activeController = new AbortController();
      setGenerationError(null);
      setGenerating(true);
      setGenerationStatus('status.analysis');
      setCurrentCode('');

      const publisher = createCodePublisher(setCurrentCode);
      activePublisher = publisher;

      const handleEvent = (event: SSEEvent) => {
        if (abortRequested) return;

        switch (event.type) {
          case 'analysis':
            setGenerationStatus('status.analysis');
            break;
          case 'design':
            setGenerationStatus('status.design');
            break;
          case 'code':
            setGenerationStatus('status.code');
            publisher.push(event.content);
            break;
        }
      };

      const handleError = (err: Error) => {
        if (abortRequested) return;
        activePublisher = null;
        publisher.dispose();
        setGenerationError(err.message);
        setGenerating(false);
        setGenerationStatus('');
      };

      const refreshUsage = async () => {
        const { tokenUsage } = useAppStore.getState();
        try {
          const usage = await getUsage(sid);
          // Best-effort: refresh the badge when the backend has recorded usage;
          // ignore failures so a transient network hiccup never breaks generation.
          if (usage) useAppStore.getState().setTokenUsage(usage);
        } catch {
          if (tokenUsage !== null) return;
        }
      };

      const handleComplete = (finalHtml: string) => {
        if (abortRequested) return;
        activePublisher = null;
        publisher.finalize(finalHtml);
        setGenerating(false);
        setGenerationStatus('status.done');
        void refreshUsage();
      };

      const { selectedModel, planOn, attachments } = useAppStore.getState();
      // A fresh generation starts a new visual context: consume the current
      // attachments for this request only, so stale images never leak into
      // an unrelated page created later.
      useAppStore.getState().clearAttachments();
      await connectGenerateSSE(
        prompt,
        'dark',
        'minimal',
        {
          onEvent: handleEvent,
          onError: handleError,
          onComplete: handleComplete,
        },
        {
          session_id: sid,
          model: selectedModel,
          plan: planOn,
          images: attachments.map((a) => a.dataUrl),
        },
      );
    },
    [ensureSession, setGenerating, setGenerationStatus, setGenerationError, setCurrentCode],
  );

  const iterate = useCallback(
    async (message: string) => {
      const sid = ensureSession();

      abortRequested = false;
      activeController = new AbortController();
      setGenerationError(null);
      setGenerating(true);
      setGenerationStatus('status.processingEdits');

      const userMessage: ChatMessage = { role: 'user', content: message };
      addChatMessage(userMessage);

      const updatedHistory = [...chatHistory, userMessage];

      const publisher = createCodePublisher(setCurrentCode);
      activePublisher = publisher;

      const handleEvent = (event: SSEEvent) => {
        if (abortRequested) return;

        switch (event.type) {
          case 'analysis':
            setGenerationStatus('status.analysisEdits');
            break;
          case 'design':
            setGenerationStatus('status.designEdits');
            break;
          case 'code':
            setGenerationStatus('status.code');
            publisher.push(event.content);
            break;
        }
      };

      const handleError = (err: Error) => {
        if (abortRequested) return;
        activePublisher = null;
        publisher.dispose();
        setGenerationError(err.message);
        setGenerating(false);
        setGenerationStatus('');
        addChatMessage({
          role: 'assistant',
          content: t('chat.errorOccurred', { message: err.message }),
        });
      };

      const handleComplete = (finalHtml: string) => {
        if (abortRequested) return;
        activePublisher = null;
        publisher.finalize(finalHtml);
        setGenerating(false);
        setGenerationStatus('');

        // The selected element is a one-shot hint for this iteration; drop it
        // so a later chat message does not silently re-target the same node.
        useAppStore.getState().clearSelectedElement();

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: t('chat.designUpdated'),
        };
        addChatMessage(assistantMessage);

        // Auto-save a version when iterating on a saved project so the
        // version history stays meaningful.
        const project = useAppStore.getState().currentProject;
        if (project) {
          saveProjectVersion(project.id, finalHtml, message).catch(() => {});
        }

        void refreshUsage();
      };

      const refreshUsage = async () => {
        try {
          const usage = await getUsage(sid);
          if (usage) useAppStore.getState().setTokenUsage(usage);
        } catch {
          // Best-effort: ignore usage refresh failures so a transient network
          // hiccup never surfaces an error in an otherwise-successful flow.
        }
      };

      const { selectedModel, planOn, attachments, selectedElement } = useAppStore.getState();
      const selectedElementJson = selectedElement
        ? JSON.stringify({
            tag: selectedElement.tag,
            id: selectedElement.id,
            classes: selectedElement.classes,
            text: selectedElement.text,
            selector: selectedElement.selector,
          })
        : null;

      await connectIterateSSE(
        sid,
        message,
        currentCode,
        updatedHistory,
        {
          onEvent: handleEvent,
          onError: handleError,
          onComplete: handleComplete,
        },
        {
          model: selectedModel,
          plan: planOn,
          images: attachments.map((a) => a.dataUrl),
          selected_element: selectedElementJson,
        },
      );
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
      t,
    ],
  );

  const cancel = useCallback(() => {
    abortRequested = true;
    activeController?.abort();
    activeController = null;
    activePublisher?.dispose();
    activePublisher = null;
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
