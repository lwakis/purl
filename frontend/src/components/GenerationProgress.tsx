import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';

const STAGES = [
  { key: 'анализирую', label: 'Анализ промпта' },
  { key: 'разрабатываю', label: 'Разработка дизайна' },
  { key: 'генерирую', label: 'Генерация кода' },
];

export default function GenerationProgress() {
  const { generationStatus, isGenerating } = useAppStore();
  const { cancel } = useGeneration();

  if (!isGenerating) return null;

  const statusLower = generationStatus.toLowerCase();
  const currentIndex = STAGES.findIndex((s) => statusLower.includes(s.key));

  return (
    <div className="bg-surface-900 border border-line rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-surface-300">{generationStatus}</span>
        <button
          onClick={cancel}
          disabled={!isGenerating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring"
          aria-label="Отменить генерацию"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
          Отмена
        </button>
      </div>
      <div className="flex items-center gap-2">
        {STAGES.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                i < currentIndex
                  ? 'bg-primary-500'
                  : i === currentIndex
                  ? 'bg-primary-400 relative overflow-hidden before:absolute before:inset-0 before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent'
                  : 'bg-white/8'
              }`}
            />
            <span
              className={`text-xs whitespace-nowrap ${
                i <= currentIndex ? 'text-primary-400' : 'text-surface-400'
              }`}
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-xs text-surface-400">Обработка</span>
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
      </div>
    </div>
  );
}
