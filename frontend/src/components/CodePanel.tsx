import { useCallback } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import { ClipboardIcon, ArrowDownTrayIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';

// Register only the markup grammar — it covers HTML (alias) and keeps the
// lazily-loaded CodePanel chunk far smaller than the full Prism bundle.
SyntaxHighlighter.registerLanguage('markup', markup);

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
      <div className="flex flex-wrap items-center gap-1 mb-3">
        <button
          onClick={handleCopy}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title={t('code.copyTitle')}
        >
          <ClipboardIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('code.copy')}</span>
        </button>
        <button
          onClick={handleDownload}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title={t('code.downloadTitle')}
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('code.download')}</span>
        </button>
        <button
          onClick={handleDownloadZip}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title={t('code.downloadZipTitle')}
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ZIP</span>
        </button>
        <button
          onClick={handleReactPlaceholder}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title={t('code.reactTitle')}
        >
          <CodeBracketIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">React</span>
        </button>
      </div>

      <div className="flex-1 relative bg-surface-900 border border-line rounded-xl overflow-hidden">
        {currentCode ? (
          <div className="absolute inset-0 overflow-auto syntax-highlighter-override">
            <SyntaxHighlighter
              language="html"
              style={oneDark}
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
