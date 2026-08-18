import { useCallback } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import { ClipboardIcon, ArrowDownTrayIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';

// Register only the markup grammar — it covers HTML (alias) and keeps the
// lazily-loaded CodePanel chunk far smaller than the full Prism bundle.
SyntaxHighlighter.registerLanguage('markup', markup);

// Warm "darkroom" token palette for Prism — safelight-warm, no cold blues or
// purples. The container background is forced by .syntax-highlighter-override,
// so the theme only carries token colors. All values clear 4.5:1 on surface-900.
const darkroomPrismTheme = {
  'code[class*="language-"]': { color: '#D9D4CB', background: 'transparent' },
  'pre[class*="language-"]': { color: '#D9D4CB', background: 'transparent' },
  comment: { color: '#857F74' },
  prolog: { color: '#857F74' },
  doctype: { color: '#857F74' },
  cdata: { color: '#857F74' },
  punctuation: { color: '#8F897E' },
  property: { color: '#F1EDE6' },
  tag: { color: '#FFB3A5' },
  boolean: { color: '#E8B34B' },
  number: { color: '#E8B34B' },
  constant: { color: '#E8B34B' },
  symbol: { color: '#E8B34B' },
  deleted: { color: '#F2555A' },
  selector: { color: '#E8B34B' },
  'attr-name': { color: '#E8B34B' },
  string: { color: '#A9B465' },
  char: { color: '#A9B465' },
  builtin: { color: '#F1EDE6' },
  inserted: { color: '#4CB05E' },
  operator: { color: '#8F897E' },
  entity: { color: '#FFB3A5' },
  url: { color: '#A9B465' },
  variable: { color: '#F1EDE6' },
  atrule: { color: '#E8B34B' },
  'attr-value': { color: '#A9B465' },
  function: { color: '#F1EDE6' },
  'class-name': { color: '#F1EDE6' },
  keyword: { color: '#FFB3A5' },
  regex: { color: '#E0A03E' },
  important: { color: '#FFB3A5', fontWeight: 'bold' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  namespace: { color: '#8F897E' },
};

export default function CodePanel() {
  const { currentCode } = useAppStore();
  const { t } = useT();

  const handleCopy = useCallback(async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      toast.success(t('code.copied'));
    } catch {
      toast.error(t('code.copyFailed'));
    }
  }, [currentCode, t]);

  const handleDownload = useCallback(() => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('code.downloadStarted'));
  }, [currentCode, t]);

  const handleDownloadZip = useCallback(async () => {
    if (!currentCode) return;
    // Dynamic import keeps jszip (and its deps) out of the main bundle;
    // CodePanel is itself lazily loaded (see App.tsx).
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    zip.file('index.html', currentCode);
    zip.file(
      'README.txt',
      [
        t('code.zipTitle'),
        '',
        t('code.zipGenerated'),
        'https://github.com/lwakis/purl',
        '',
        t('code.zipOpen'),
      ].join('\n'),
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purl-design.zip';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('code.downloadStarted'));
  }, [currentCode, t]);

  const handleReactPlaceholder = useCallback(() => {
    toast(t('code.reactSoon'), { icon: '🚧' });
  }, [t]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="exposure-label text-surface-500">{t('code.source')}</span>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <button
            onClick={handleCopy}
            disabled={!currentCode}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-900 border border-line text-surface-300 hover:text-surface-100 hover:border-line-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
            title={t('code.copyTitle')}
          >
            <ClipboardIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('code.copy')}</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!currentCode}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-900 border border-line text-surface-300 hover:text-surface-100 hover:border-line-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
            title={t('code.downloadTitle')}
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('code.download')}</span>
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={!currentCode}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-900 border border-line text-surface-300 hover:text-surface-100 hover:border-line-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
            title={t('code.downloadZipTitle')}
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ZIP</span>
          </button>
          <button
            onClick={handleReactPlaceholder}
            disabled={!currentCode}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-900 border border-line text-surface-300 hover:text-surface-100 hover:border-line-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
            title={t('code.reactTitle')}
          >
            <CodeBracketIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">React</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-surface-900 border border-line rounded-xl overflow-hidden">
        {currentCode ? (
          <div className="absolute inset-0 overflow-auto syntax-highlighter-override">
            <SyntaxHighlighter
              language="html"
              style={darkroomPrismTheme}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                borderRadius: 0,
                minHeight: '100%',
                fontSize: '13px',
                lineHeight: '1.6',
              }}
            >
              {currentCode}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-900">
            <div className="text-center">
              <CodeBracketIcon className="w-10 h-10 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-400 text-sm">{t('code.empty')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
