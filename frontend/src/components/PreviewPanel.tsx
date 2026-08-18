import { useState, useCallback, useEffect } from 'react';
import {
  ArrowPathIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import type { PreviewSize } from '../types';
import GenerationProgress from './GenerationProgress';
import ErrorAlert from './ErrorAlert';
import { useT } from '../i18n';

const PREVIEW_SIZES: { value: PreviewSize; icon: typeof ComputerDesktopIcon; width: string }[] = [
  { value: 'desktop', icon: ComputerDesktopIcon, width: '100%' },
  { value: 'tablet', icon: DeviceTabletIcon, width: '768px' },
  { value: 'mobile', icon: DevicePhoneMobileIcon, width: '375px' },
];

// Injected at the end of every preview document. The iframe is sandboxed
// without allow-same-origin, so a plain link click navigates the iframe
// itself — most sites refuse to render inside a frame (X-Frame-Options) and
// the preview goes blank. The guard runs on the capture phase, before the
// generated page's own handlers:
//   - in-page anchors (#...) and explicit target="_blank" links pass through;
//   - absolute http(s) links open in a real tab (sandbox needs allow-popups);
//   - everything else is blocked and reported to the host for a toast.
const NAVIGATION_GUARD = `<script>
(function () {
  'use strict';
  var absolute = /^(https?:)?\\/\\//i;
  document.addEventListener('click', function (e) {
    var node = e.target;
    while (node && node.nodeType !== 1) { node = node.parentNode; }
    if (!node || !node.closest) { return; }
    var link = node.closest('a[href]');
    if (!link) { return; }
    var href = link.getAttribute('href') || '';
    if (!href) {
      e.preventDefault();
      return;
    }
    if (href.charAt(0) === '#' || link.getAttribute('target')) { return; }
    e.preventDefault();
    e.stopPropagation();
    if (absolute.test(href)) {
      window.open(href, '_blank', 'noopener');
      try {
        window.parent.postMessage({ type: 'purl:navigation', href: href, blocked: false }, '*');
      } catch (err) {}
    } else {
      try {
        window.parent.postMessage({ type: 'purl:navigation', href: href, blocked: true }, '*');
      } catch (err) {}
    }
  }, true);
})();
</script>`;

export default function PreviewPanel() {
  const {
    currentCode,
    isGenerating,
    previewSize,
    setPreviewSize,
    generationError,
    setGenerationError,
  } = useAppStore();
  const { t } = useT();
  const [refreshKey, setRefreshKey] = useState(0);
  // The frame the preview actually renders. Streamed code commits here only
  // when the stream settles: swapping srcDoc mid-stream reloads the iframe
  // every few hundred milliseconds (violent flicker) and partial HTML renders
  // broken. The code panel streams live; the print develops once, at the end.
  const [displayCode, setDisplayCode] = useState(currentCode);

  useEffect(() => {
    if (!isGenerating && currentCode !== displayCode) {
      setDisplayCode(currentCode);
    }
  }, [currentCode, isGenerating, displayCode]);

  // Reports from the navigation guard inside the preview iframe.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: unknown; href?: unknown; blocked?: unknown } | null;
      if (!data || data.type !== 'purl:navigation' || typeof data.href !== 'string') return;
      if (data.blocked) {
        toast(t('preview.linkBlocked'));
      } else {
        toast.success(t('preview.linkOpened'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [t]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const selectedSize = PREVIEW_SIZES.find((s) => s.value === previewSize) || PREVIEW_SIZES[0];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="exposure-label text-surface-500 hidden sm:block">
            {t('preview.title')}
          </span>
          <div className="flex items-center gap-0.5 bg-surface-900 border border-line rounded-lg p-0.5">
            {PREVIEW_SIZES.map((size) => {
              const Icon = size.icon;
              return (
                <button
                  key={size.value}
                  onClick={() => setPreviewSize(size.value)}
                  className={`p-1.5 rounded-md transition-colors focus-ring active:scale-[0.98] ${
                    previewSize === size.value
                      ? 'bg-primary-600/10 text-primary-400'
                      : 'text-surface-300 hover:text-surface-100 hover:bg-surface-800'
                  }`}
                  title={t('preview.sizeAria', { size: size.value })}
                  aria-label={t('preview.sizeAria', { size: size.value })}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
        {displayCode && (
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md bg-surface-900 border border-line text-surface-300 hover:text-surface-100 hover:border-line-strong transition-colors focus-ring active:scale-[0.98]"
            title={t('preview.refresh')}
            aria-label={t('preview.refresh')}
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {generationError && (
        <div className="mb-3">
          <ErrorAlert message={generationError} onDismiss={() => setGenerationError(null)} />
        </div>
      )}

      <GenerationProgress />

      <div className="flex-1 relative bg-surface-900 border border-line rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex flex-col overflow-auto">
          <div className="flex-1 flex items-center justify-center p-6">
            {displayCode ? (
              <div
                style={{ maxWidth: selectedSize.width }}
                className="w-full h-full min-h-[300px] bg-paper p-6"
              >
                <div className="w-full h-full bg-paper shadow-canvas overflow-hidden">
                  <iframe
                    key={refreshKey}
                    srcDoc={displayCode + NAVIGATION_GUARD}
                    sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                    title={t('preview.iframeTitle')}
                    data-testid="preview-iframe"
                    className="w-full h-full"
                    style={{ minHeight: '300px' }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800 flex items-center justify-center">
                  <ComputerDesktopIcon className="w-8 h-8 text-surface-400" />
                </div>
                <p className="text-surface-400 text-sm">{t('preview.emptyTitle')}</p>
                <p className="text-surface-400 text-xs mt-1">{t('preview.emptySubtitle')}</p>
              </div>
            )}
          </div>
          {displayCode && (
            <div className="flex items-center justify-center gap-2 px-6 pb-4">
              <span className="exposure-label text-surface-500">{t('preview.print')}</span>
              <span className="exposure-label text-surface-500">{selectedSize.width}</span>
            </div>
          )}
        </div>

        {isGenerating && displayCode && (
          <div className="absolute inset-0 bg-surface-950/70 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-1.5 bg-surface-800/90 px-4 py-2 rounded-full">
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
