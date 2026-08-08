import { useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  ClipboardIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';

interface CodePanelProps {
  onShare: () => void;
}

export default function CodePanel({ onShare }: CodePanelProps) {
  const { currentCode } = useAppStore();

  const handleCopy = useCallback(async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      toast.success('Код скопирован в буфер обмена');
    } catch {
      toast.error('Не удалось скопировать код');
    }
  }, [currentCode]);

  const handleDownload = useCallback(() => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Скачивание начато');
  }, [currentCode]);

  const handleDownloadZip = useCallback(() => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purl-design.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Скачивание начато');
  }, [currentCode]);

  const handleReactPlaceholder = useCallback(() => {
    toast('Экспорт в React скоро появится', { icon: '🚧' });
  }, []);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex flex-wrap items-center gap-1 mb-3">
        <button
          onClick={handleCopy}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title="Копировать код"
        >
          <ClipboardIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Копировать</span>
        </button>
        <button
          onClick={handleDownload}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title="Скачать HTML"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Скачать</span>
        </button>
        <button
          onClick={handleDownloadZip}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title="Скачать как ZIP"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ZIP</span>
        </button>
        <button
          onClick={onShare}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title="Поделиться"
        >
          <ShareIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Поделиться</span>
        </button>
        <button
          onClick={handleReactPlaceholder}
          disabled={!currentCode}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          title="Экспорт в React"
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
              <p className="text-surface-400 text-sm">Сгенерированный код появится здесь</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
