import { Bars3Icon, ChatBubbleLeftRightIcon, CodeBracketIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';

interface HeaderProps {
  chatOpen: boolean;
  onChatToggle: () => void;
  codeOpen: boolean;
  onCodeToggle: () => void;
  hasDesign: boolean;
  canSave: boolean;
  onSave: () => void;
}

export default function Header({ chatOpen, onChatToggle, codeOpen, onCodeToggle, hasDesign, canSave, onSave }: HeaderProps) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-surface-700/50">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 -ml-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
            aria-label="Переключить боковую панель"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg generation-gradient flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-semibold text-lg tracking-tight text-surface-100">
              Purl
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasDesign && (
            <>
              <button
                onClick={onSave}
                disabled={!canSave}
                className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  canSave
                    ? 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
                    : 'text-surface-600'
                }`}
                title={canSave ? 'Сохранить проект' : 'Проект сохранён'}
                aria-label="Сохранить проект"
              >
                <BookmarkIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onCodeToggle}
                aria-pressed={codeOpen}
                aria-label="Открыть код"
                className={`p-2 rounded-lg transition-colors ${
                  codeOpen
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
                }`}
                title="Код"
              >
                <CodeBracketIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onChatToggle}
                aria-pressed={chatOpen}
                aria-label="Открыть чат"
                className={`p-2 rounded-lg transition-colors ${
                  chatOpen
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
                }`}
                title="Чат"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}