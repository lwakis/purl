import { useState, useCallback } from 'react';
import { ArrowPathIcon, ComputerDesktopIcon, DeviceTabletIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import type { PreviewSize } from '../types';
import GenerationProgress from './GenerationProgress';
import ErrorAlert from './ErrorAlert';

const PREVIEW_SIZES: { value: PreviewSize; icon: typeof ComputerDesktopIcon; width: string }[] = [
  { value: 'desktop', icon: ComputerDesktopIcon, width: '100%' },
  { value: 'tablet', icon: DeviceTabletIcon, width: '768px' },
  { value: 'mobile', icon: DevicePhoneMobileIcon, width: '375px' },
];

export default function PreviewPanel() {
  const { currentCode, isGenerating, previewSize, setPreviewSize, generationError, setGenerationError } = useAppStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const selectedSize = PREVIEW_SIZES.find((s) => s.value === previewSize) || PREVIEW_SIZES[0];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 bg-surface-900 rounded-lg p-0.5 border border-surface-700/50">
          {PREVIEW_SIZES.map((size) => {
            const Icon = size.icon;
            return (
              <button
                key={size.value}
                onClick={() => setPreviewSize(size.value)}
                className={`p-1.5 rounded-md transition-all ${
                  previewSize === size.value
                    ? 'bg-surface-700 text-surface-100'
                    : 'text-surface-400 hover:text-surface-300'
                }`}
                title={size.value}
                aria-label={`Предпросмотр: ${size.value}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
        {currentCode && (
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
            title="Обновить предпросмотр"
            aria-label="Обновить предпросмотр"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {generationError && (
        <div className="mb-3">
          <ErrorAlert
            message={generationError}
            onDismiss={() => setGenerationError(null)}
          />
        </div>
      )}

      <GenerationProgress />

      <div className="flex-1 relative bg-surface-900/50 rounded-xl border border-surface-700/50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
          {currentCode ? (
            <div
              style={{ maxWidth: selectedSize.width }}
              className="w-full h-full min-h-[300px] bg-white rounded-lg shadow-2xl transition-all duration-300"
            >
              <iframe
                key={refreshKey}
                srcDoc={currentCode}
                sandbox="allow-scripts"
                title="Design Preview"
                className="w-full h-full rounded-lg"
                style={{ minHeight: '300px' }}
              />
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800 flex items-center justify-center">
                <ComputerDesktopIcon className="w-8 h-8 text-surface-400" />
              </div>
              <p className="text-surface-400 text-sm">Ваш дизайн появится здесь</p>
              <p className="text-surface-400 text-xs mt-1">
                Введите промпт и нажмите «Сгенерировать»
              </p>
            </div>
          )}
        </div>

        {isGenerating && currentCode && (
          <div className="absolute inset-0 bg-surface-900/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-1.5 bg-surface-800/80 px-4 py-2 rounded-full">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}