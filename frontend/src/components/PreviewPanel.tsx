import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import type { PreviewSize, SelectedElement } from '../types';
import { useGeneration } from '../hooks/useGeneration';
import GenerationProgress from './GenerationProgress';
import ErrorAlert from './ErrorAlert';
import { useT } from '../i18n';
import {
  PREVIEW_ERROR_GUARD,
  PREVIEW_ERROR_MAX_VISIBLE,
  appendPreviewError,
  parsePreviewError,
  type PreviewError,
} from '../utils/previewErrorGuard';

const PREVIEW_SIZES: { value: PreviewSize; width: string }[] = [
  { value: 'desktop', width: '100%' },
  { value: 'tablet', width: '768px' },
  { value: 'mobile', width: '375px' },
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

// Select-mode guard: armed by the host via postMessage, highlights hovered
// elements and reports the clicked one back. PRIMARY_HEX is the safelight
// accent (tailwind primary-500).
const SELECT_GUARD = `<script>
(function () {
  'use strict';
  var active = false;
  var current = null;
  var PRIMARY_HEX = '#F06A52';

  function clearHighlight() {
    if (current) {
      current.style.outline = '';
      current.style.outlineOffset = '';
      current = null;
    }
  }

  function buildSelector(el) {
    var tag = el.tagName.toLowerCase();
    if (el.id) { return tag + '#' + el.id; }
    var classes = Array.prototype.slice.call(el.classList || []).filter(function (c) {
      return c.indexOf('__purl') !== 0;
    });
    if (classes.length) { return tag + '.' + classes.join('.'); }
    var parent = el.parentNode;
    var n = 1;
    if (parent && parent.children) {
      for (var i = 0; i < parent.children.length; i++) {
        var child = parent.children[i];
        if (child === el) { break; }
        if (child.tagName === el.tagName) { n++; }
      }
    }
    return tag + ':nth-of-type(' + n + ')';
  }

  window.addEventListener('message', function (e) {
    var data = e.data;
    if (!data || data.type !== 'purl:select-toggle') { return; }
    active = !!data.active;
    document.body.style.cursor = active ? 'crosshair' : '';
    clearHighlight();
  });

  document.addEventListener('mouseover', function (e) {
    if (!active) { return; }
    var node = e.target;
    while (node && node.nodeType !== 1) { node = node.parentNode; }
    if (!node || node === document.documentElement || node === document.body) { return; }
    clearHighlight();
    current = node;
    current.style.outline = '2px solid ' + PRIMARY_HEX;
    current.style.outlineOffset = '1px';
  });

  document.addEventListener('mouseout', function (e) {
    if (!active || !current) { return; }
    var to = e.relatedTarget;
    if (!to || !current.contains(to)) { clearHighlight(); }
  });

  document.addEventListener('click', function (e) {
    if (!active) { return; }
    e.preventDefault();
    e.stopPropagation();
    var node = e.target;
    while (node && node.nodeType !== 1) { node = node.parentNode; }
    if (!node || node === document.documentElement || node === document.body) { return; }
    var el = node;
    var classes = Array.prototype.slice.call(el.classList || []).filter(function (c) {
      return c.indexOf('__purl') !== 0;
    });
    var info = {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: classes,
      text: (el.textContent || '').trim().slice(0, 80),
      selector: buildSelector(el)
    };
    clearHighlight();
    active = false;
    document.body.style.cursor = '';
    try {
      window.parent.postMessage({ type: 'purl:selected', element: info }, '*');
    } catch (err) {}
  }, true);
})();
</script>`;

export default function PreviewPanel() {
  const {
    currentCode,
    isGenerating,
    previewSize,
    previewRefreshKey,
    generationError,
    setGenerationError,
    selectMode,
    setSelectMode,
    setSelectedElement,
  } = useAppStore();
  const { t } = useT();
  const { iterate } = useGeneration();
  // The frame the preview actually renders. Streamed code commits here only
  // when the stream settles: swapping srcDoc mid-stream reloads the iframe
  // every few hundred milliseconds (violent flicker) and partial HTML renders
  // broken. The code panel streams live; the print develops once, at the end.
  const [displayCode, setDisplayCode] = useState(currentCode);
  // Runtime errors reported by the error guard inside the preview. Distinct
  // messages only, bounded: this is a caption for the failure, not a log.
  const [previewErrors, setPreviewErrors] = useState<PreviewError[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isGenerating && currentCode !== displayCode) {
      setDisplayCode(currentCode);
    }
  }, [currentCode, isGenerating, displayCode]);

  // A fresh frame is a clean slate: errors travelling with the previous
  // document must not linger over the one that just developed.
  useEffect(() => {
    setPreviewErrors([]);
  }, [displayCode, previewRefreshKey]);

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

  // Runtime-error reports from the error guard inside the preview iframe.
  // Shaped like every other guard report; malformed payloads are dropped.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const error = parsePreviewError(e.data);
      if (!error) return;
      setPreviewErrors((prev) => appendPreviewError(prev, error));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Arm/disarm the select guard inside the preview iframe. The sandbox has no
  // allow-same-origin, so the guard is driven purely by postMessage; re-send
  // whenever the frame reloads (new code or a refresh bump) so an armed mode
  // survives a reload.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow?.postMessage({ type: 'purl:select-toggle', active: selectMode }, '*');
  }, [selectMode, previewRefreshKey, displayCode]);

  // Reports from the select guard inside the preview iframe.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: unknown; element?: unknown } | null;
      if (!data || data.type !== 'purl:selected') return;
      const el = data.element as SelectedElement | null;
      if (!el || typeof el !== 'object') return;
      if (typeof el.tag !== 'string' || typeof el.selector !== 'string') return;
      if (typeof el.text !== 'string' || !Array.isArray(el.classes)) return;
      setSelectedElement({
        tag: el.tag,
        id: typeof el.id === 'string' ? el.id : null,
        classes: el.classes.filter((c): c is string => typeof c === 'string'),
        text: el.text,
        selector: el.selector,
      });
      setSelectMode(false);
      toast.success(t('chat.elementSelected'));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setSelectedElement, setSelectMode, t]);

  const selectedSize = PREVIEW_SIZES.find((s) => s.value === previewSize) || PREVIEW_SIZES[0];

  const visibleErrors = previewErrors.slice(0, PREVIEW_ERROR_MAX_VISIBLE);
  const overflowCount = previewErrors.length - visibleErrors.length;

  // The fix is just another iteration: describe the failure in the same voice
  // the chat uses and let the normal stream produce a new frame. Clear the
  // banner at once — the banner must not sit over the print it just asked for,
  // and the settled frame resets the collected errors anyway.
  const handleFixError = useCallback(() => {
    if (!previewErrors.length || isGenerating) return;
    const message = visibleErrors.map((error) => error.message).join('\n');
    iterate(t('preview.errorFixMessage', { message }));
    setPreviewErrors([]);
  }, [previewErrors, visibleErrors, isGenerating, iterate, t]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {generationError && (
        <div className="mb-2">
          <ErrorAlert message={generationError} onDismiss={() => setGenerationError(null)} />
        </div>
      )}

      <GenerationProgress />

      <div id="purl-preview-stage" className="flex-1 relative bg-surface-900 overflow-hidden">
        <div className="absolute inset-0 flex flex-col overflow-auto">
          <div className="flex-1 flex items-center justify-center">
            {displayCode ? (
              <div
                style={{ maxWidth: selectedSize.width }}
                className="w-full h-full min-h-[300px] bg-paper shadow-canvas overflow-hidden"
              >
                <iframe
                  ref={iframeRef}
                  key={previewRefreshKey}
                  srcDoc={displayCode + NAVIGATION_GUARD + SELECT_GUARD + PREVIEW_ERROR_GUARD}
                  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                  title={t('preview.iframeTitle')}
                  data-testid="preview-iframe"
                  className="w-full h-full"
                  style={{ minHeight: '300px' }}
                />
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
        </div>

        {selectMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-surface-800/95 border border-line rounded-full px-3 py-1.5 text-xs text-surface-300 pointer-events-none">
            {t('chat.selectElementHint')}
          </div>
        )}

        {isGenerating && displayCode && (
          <div className="absolute inset-0 bg-surface-950/70 flex items-center justify-center">
            <div className="flex items-center gap-1.5 bg-surface-800/90 px-4 py-2 rounded-full">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          </div>
        )}

        {/* Failure report from inside the frame: a caption pinned to the
            bottom of the stage, never covering the print. It stays above the
            generating overlay so a known fault remains visible (and readable)
            while its fix develops. */}
        {previewErrors.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex justify-center pointer-events-none">
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-auto w-full max-w-md rounded-lg bg-surface-800 border border-line border-l-2 border-l-status-error/50 px-3.5 py-3 shadow-overlay animate-slide-up"
            >
              <div className="flex items-start gap-2.5">
                <ExclamationTriangleIcon
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-status-error"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-100">{t('preview.errorTitle')}</p>
                  <ul className="mt-1 space-y-0.5">
                    {visibleErrors.map((error) => (
                      <li
                        key={error.message}
                        title={error.message}
                        className="font-mono text-[11px] leading-snug text-surface-300 truncate"
                      >
                        {error.message}
                      </li>
                    ))}
                  </ul>
                  {overflowCount > 0 && (
                    <p className="exposure-label mt-1.5 text-surface-500">
                      {t('preview.errorMore', { count: overflowCount })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleFixError}
                    disabled={isGenerating}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary-600 text-white border border-transparent shadow-cta hover:bg-primary-500 active:scale-[0.98] transition-colors focus-ring disabled:bg-surface-800 disabled:text-surface-500 disabled:border-line disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    {t('preview.errorFix')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewErrors([])}
                    aria-label={t('preview.errorDismiss')}
                    className="p-1.5 rounded-md bg-surface-900 border border-line text-surface-300 hover:text-surface-100 hover:border-line-strong transition-colors focus-ring"
                  >
                    <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
