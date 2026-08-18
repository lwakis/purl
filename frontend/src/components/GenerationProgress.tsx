import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n';

// Status keys stored in the store double as stage markers: prefix matching
// works for both generate ('status.analysis') and iterate ('status.analysisEdits')
// variants, so the strip stays correct in any locale.
const STAGES = [
  { key: 'status.analysis', labelKey: 'progress.analysis' },
  { key: 'status.design', labelKey: 'progress.design' },
  { key: 'status.code', labelKey: 'progress.code' },
] as const;

// All statuses the store can hold while generating. Every value is a
// translation key, so `t()` can resolve them; `satisfies` keeps the list
// in sync with the dictionary at compile time.
const STATUS_KEYS = [
  'status.analysis',
  'status.design',
  'status.code',
  'status.processingEdits',
  'status.analysisEdits',
  'status.designEdits',
  'status.done',
] as const satisfies readonly TranslationKey[];

export default function GenerationProgress() {
  // Subscribe to the two fields that drive this panel only. Streaming code
  // chunks update the store every few hundred milliseconds; re-rendering the
  // progress panel on each flush would churn the DOM and re-announce the
  // live region for screen readers.
  const isGenerating = useAppStore((s) => s.isGenerating);
  const generationStatus = useAppStore((s) => s.generationStatus);
  const { cancel } = useGeneration();
  const { t } = useT();

  if (!isGenerating) return null;

  const currentIndex = STAGES.findIndex((s) => generationStatus.startsWith(s.key));
  const statusLabel = STATUS_KEYS.find((key) => key === generationStatus);

  return (
    <div className="bg-surface-900 border border-line rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span role="status" className="exposure-label text-surface-500 truncate">
          {statusLabel ? t(statusLabel) : null}
        </span>
        <div className="flex items-center gap-4 shrink-0">
          <span className="exposure-label text-primary-400">
            {String(currentIndex + 1).padStart(2, '0')}/{STAGES.length}
          </span>
          <button
            onClick={cancel}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-900 border border-line text-surface-300 hover:text-surface-100 hover:border-line-strong transition-colors focus-ring active:scale-[0.98]"
            aria-label={t('progress.cancelAria')}
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            {t('progress.cancel')}
          </button>
        </div>
      </div>

      {/* The development strip — a film strip, not a card grid. Each stage is
          a frame: an exposure number, a caption, and a line that "develops"
          (fills with safelight) once its frame is exposed. The active frame
          breathes; everything else stays quiet. No borders, no gradients. */}
      <div className="flex gap-1.5">
        {STAGES.map((stage, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;
          return (
            <div key={stage.key} className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-2">
                <span
                  className={`exposure-label ${
                    isActive ? 'text-primary-400' : isDone ? 'text-surface-400' : 'text-surface-500'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={`text-xs truncate ${
                    isActive
                      ? 'text-surface-100 font-medium'
                      : isDone
                        ? 'text-surface-300'
                        : 'text-surface-500'
                  }`}
                >
                  {t(stage.labelKey)}
                </span>
              </div>
              <div
                className={`h-0.5 rounded-full transition-colors duration-500 ${
                  isActive
                    ? 'bg-primary-500 animate-safelight-breathe'
                    : isDone
                      ? 'bg-primary-600'
                      : 'bg-surface-700'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
