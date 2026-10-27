import { useCallback, useEffect, useRef, useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';
import { enhancePrompt } from '../services/api';
import GenerationProgress from './GenerationProgress';
import ErrorAlert from './ErrorAlert';
import PresetPicker from './PresetPicker';
import { useT } from '../i18n';

const MAX_PROMPT_LENGTH = 2000;

export default function PromptInput() {
  const { prompt, setPrompt, generationError, setGenerationError, selectedModel } = useAppStore();
  const { generate, isGenerating } = useGeneration();
  const { t } = useT();

  const [focused, setFocused] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isImproving, setIsImproving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Guards against a second click landing while a request is in flight, and
  // against writing state after the component has unmounted (React 19-safe).
  const improvingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const examples = [
    t('prompt.example1'),
    t('prompt.example2'),
    t('prompt.example3'),
    t('prompt.example4'),
  ];

  // Rotating placeholder examples only while idle: empty, unfocused, and not
  // generating. Focused/typed states fall back to the static question.
  const idle = !focused && prompt.trim() === '' && !isGenerating;
  const placeholder = idle ? examples[exampleIndex] : t('prompt.placeholder');

  useEffect(() => {
    if (!idle) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const id = setInterval(() => setExampleIndex((i) => (i + 1) % examples.length), 3500);
    return () => clearInterval(id);
  }, [idle, examples.length]);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_PROMPT_LENGTH) {
        setPrompt(value);
      }
    },
    [setPrompt],
  );

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || isGenerating) return;
    generate(prompt.trim());
  }, [prompt, generate, isGenerating]);

  const handleImprove = useCallback(async () => {
    const value = prompt.trim();
    if (!value || isGenerating || improvingRef.current) return;
    improvingRef.current = true;
    setIsImproving(true);
    try {
      const improved = await enhancePrompt(value, selectedModel);
      if (!mountedRef.current) return;
      setPrompt(improved);
      textareaRef.current?.focus();
    } catch {
      // The raw backend detail is technical; surface the localized message.
      if (mountedRef.current) toast.error(t('errors.enhancePrompt'));
    } finally {
      improvingRef.current = false;
      if (mountedRef.current) setIsImproving(false);
    }
  }, [prompt, isGenerating, selectedModel, setPrompt, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {generationError && (
        <ErrorAlert message={generationError} onDismiss={() => setGenerationError(null)} />
      )}

      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-surface-100 text-balance">
          {t('prompt.title')}
        </h1>
        <p className="text-sm lg:text-base text-surface-400 text-balance">{t('prompt.subtitle')}</p>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={t('prompt.aria')}
          data-testid="prompt-input"
          disabled={isGenerating}
          placeholder={placeholder}
          className="w-full bg-surface-900 border border-line rounded-xl px-5 pt-4 pb-14 text-base text-surface-100 placeholder:text-surface-500 focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/30 focus:outline-none transition-shadow resize-none min-h-[200px] leading-relaxed pr-20"
          rows={4}
        />

        <button
          type="button"
          onClick={handleImprove}
          disabled={!prompt.trim() || isGenerating || isImproving}
          aria-busy={isImproving}
          data-testid="improve-button"
          aria-label={t('prompt.improve')}
          className={`absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all focus-ring ${
            isImproving
              ? 'bg-surface-800 text-primary-400 border-primary-500/40 cursor-progress'
              : prompt.trim() && !isGenerating
                ? 'bg-surface-800 text-surface-300 border-line hover:text-surface-100 hover:border-line-strong active:scale-[0.98]'
                : 'bg-surface-800 text-surface-500 border-line cursor-not-allowed'
          }`}
        >
          {isImproving ? (
            <span
              className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
              aria-hidden="true"
            />
          ) : (
            <SparklesIcon className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{isImproving ? t('prompt.improving') : t('prompt.improve')}</span>
        </button>

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          data-testid="generate-button"
          aria-label={t('prompt.generate')}
          className={`absolute bottom-3 right-3 z-10 flex items-center justify-center gap-2 p-3 rounded-lg transition-all focus-ring ${
            isGenerating
              ? 'bg-primary-600 text-white shadow-cta animate-safelight-breathe'
              : prompt.trim()
                ? 'bg-primary-600 text-white shadow-cta hover:bg-primary-500 active:scale-[0.98]'
                : 'bg-surface-800 text-surface-500 border-line cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <>
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </>
          ) : (
            <SparklesIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      <PresetPicker />

      <GenerationProgress />
    </div>
  );
}
