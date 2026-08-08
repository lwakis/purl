import { useCallback } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';
import GenerationProgress from './GenerationProgress';
import ErrorAlert from './ErrorAlert';
import type { ThemeMode, DesignStyle, PromptTemplate } from '../types';

const MAX_PROMPT_LENGTH = 2000;

const THEMES: { value: ThemeMode; label: string; icon: string }[] = [
  {
    value: 'dark',
    label: 'Тёмная',
    icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  },
  {
    value: 'light',
    label: 'Светлая',
    icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    value: 'auto',
    label: 'Авто',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
];

const STYLES: { value: DesignStyle; label: string }[] = [
  { value: 'minimal', label: 'Минимал' },
  { value: 'corporate', label: 'Корпоратив' },
  { value: 'playful', label: 'Игривый' },
  { value: 'techno', label: 'Техно' },
];

interface PromptInputProps {
  templates: PromptTemplate[];
  onTemplateSelect: (template: PromptTemplate) => void;
}

export default function PromptInput({ templates, onTemplateSelect }: PromptInputProps) {
  const {
    prompt,
    theme,
    style,
    setPrompt,
    setTheme,
    setStyle,
    generationError,
    setGenerationError,
  } = useAppStore();
  const { generate, isGenerating } = useGeneration();

  const charCount = prompt.length;
  const atLimit = charCount >= MAX_PROMPT_LENGTH;

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
    generate(prompt.trim(), theme, style);
  }, [prompt, theme, style, generate, isGenerating]);

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
    <div className="space-y-3.5 animate-fade-in bg-surface-900 border border-line rounded-xl p-4 lg:p-5">
      {generationError && (
        <ErrorAlert message={generationError} onDismiss={() => setGenerationError(null)} />
      )}

      <div className="relative">
        <textarea
          value={prompt}
          onChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          placeholder="Опишите дизайн, который хотите... (например: Лендинг для SaaS по автоматизации HR, тёмная тема, корпоративный стиль)"
          aria-label="Описание дизайна"
          className="w-full bg-surface-950/60 border border-line rounded-lg px-4 py-3 text-sm text-surface-100 placeholder-surface-500 focus:border-line-strong focus:ring-2 focus:ring-primary-500/20 transition-all resize-none min-h-[110px] leading-relaxed focus:outline-none"
          rows={3}
          disabled={isGenerating}
        />
        <div
          className={`absolute bottom-3 right-3 text-xs ${
            atLimit ? 'text-status-error font-semibold' : 'text-surface-500'
          }`}
        >
          {charCount}/{MAX_PROMPT_LENGTH}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5 bg-surface-800/70 border border-line rounded-lg p-0.5">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
                theme === t.value
                  ? 'bg-surface-700 text-surface-100'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 bg-surface-800/70 border border-line rounded-lg p-0.5">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              disabled={isGenerating}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors focus-ring ${
                style === s.value
                  ? 'bg-surface-700 text-surface-100'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <GenerationProgress />

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white font-medium px-4 py-2.5 rounded-md text-sm transition-all hover:bg-primary-500 active:scale-[0.98] disabled:bg-white/10 disabled:text-surface-400 disabled:cursor-not-allowed focus-ring"
        >
          {isGenerating ? (
            <>
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="ml-1">Генерация...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4" />
              Сгенерировать
            </>
          )}
        </button>
      </div>

      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {templates.slice(0, 5).map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onTemplateSelect(tpl)}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-800/60 border border-line text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors text-xs disabled:opacity-40 focus-ring"
            >
              <span className="text-surface-400">{tpl.icon || '#'}</span>
              {tpl.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
