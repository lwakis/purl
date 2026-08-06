import { useCallback } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';
import GenerationProgress from './GenerationProgress';
import ErrorAlert from './ErrorAlert';
import type { ThemeMode, DesignStyle, PromptTemplate } from '../types';

const MAX_PROMPT_LENGTH = 2000;

const THEMES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'dark', label: 'Тёмная', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
  { value: 'light', label: 'Светлая', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
  { value: 'auto', label: 'Авто', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
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
  const { prompt, theme, style, setPrompt, setTheme, setStyle, generationError, setGenerationError } = useAppStore();
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
    [setPrompt]
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
    [handleGenerate]
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {generationError && (
        <ErrorAlert
          message={generationError}
          onDismiss={() => setGenerationError(null)}
        />
      )}

      <div className="relative">
        <textarea
          value={prompt}
          onChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          placeholder="Опишите дизайн, который хотите... (например: Лендинг для SaaS по автоматизации HR, тёмная тема, корпоративный стиль)"
          aria-label="Описание дизайна"
          className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-3.5 text-surface-100 placeholder-surface-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all min-h-[100px] text-sm leading-relaxed"
          rows={3}
          disabled={isGenerating}
        />
        <div
          className={`absolute bottom-3 right-3 text-xs ${
            atLimit ? 'text-red-400 font-semibold' : 'text-surface-400'
          }`}
        >
          {charCount}/{MAX_PROMPT_LENGTH}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 bg-surface-900 rounded-lg p-1 border border-surface-700">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                theme === t.value
                  ? 'bg-primary-500/20 text-primary-300 shadow-sm'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              disabled={isGenerating}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                style === s.value
                  ? 'bg-accent-500/20 text-accent-300 border-accent-500/30'
                  : 'text-surface-400 border-surface-700 hover:text-surface-200 hover:border-surface-600'
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
          className="flex-1 flex items-center justify-center gap-2 generation-gradient text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none text-sm"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-400 hover:text-surface-200 hover:bg-surface-800 hover:border-surface-600 transition-all text-xs disabled:opacity-40"
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