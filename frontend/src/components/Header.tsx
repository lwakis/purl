import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  BookmarkIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';

interface HeaderProps {
  chatOpen: boolean;
  onChatToggle: () => void;
  codeOpen: boolean;
  onCodeToggle: () => void;
  hasDesign: boolean;
  canSave: boolean;
  onSave: () => void;
}

export default function Header({
  chatOpen,
  onChatToggle,
  codeOpen,
  onCodeToggle,
  hasDesign,
  canSave,
  onSave,
}: HeaderProps) {
  const { sidebarOpen, setSidebarOpen, currentProject } = useAppStore();
  const { t, locale, setLocale } = useT();

  const toggleLocale = () => setLocale(locale === 'ru' ? 'en' : 'ru');

  return (
    <header className="sticky top-0 z-40 h-14 bg-surface-950/80 border-b border-line">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-white/5 active:scale-95 transition-colors focus-ring"
            aria-label={t('header.toggleSidebar')}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/purl-mark.svg" alt="Purl" className="w-7 h-7" />
            <span className="font-semibold text-lg tracking-tight text-surface-100">Purl</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <span className="text-surface-600 text-sm">/</span>
            {currentProject?.name ? (
              <span className="text-sm font-medium text-surface-200 truncate max-w-[180px]">
                {currentProject.name}
              </span>
            ) : (
              <span className="text-sm text-surface-400">{t('header.newDesign')}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasDesign && (
            <>
              <button
                onClick={onSave}
                disabled={!canSave}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring disabled:opacity-30 disabled:cursor-not-allowed ${
                  canSave
                    ? 'text-surface-400 hover:text-surface-100 hover:bg-white/5 active:scale-[0.98]'
                    : 'text-surface-600'
                }`}
                title={canSave ? t('header.saveProject') : t('header.projectSaved')}
                aria-label={t('header.saveProject')}
              >
                <BookmarkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('common.save')}</span>
              </button>
              <button
                onClick={onCodeToggle}
                aria-pressed={codeOpen}
                aria-label={t('header.openCode')}
                title={t('header.code')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
                  codeOpen
                    ? 'bg-primary-500/15 text-primary-300'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-white/5 active:scale-95'
                }`}
              >
                <CodeBracketIcon className="w-4 h-4" />
                <span className="hidden md:inline">{t('header.code')}</span>
              </button>
              <button
                onClick={onChatToggle}
                aria-pressed={chatOpen}
                aria-label={t('header.openChat')}
                title={t('header.chat')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
                  chatOpen
                    ? 'bg-primary-500/15 text-primary-300'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-white/5 active:scale-95'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span className="hidden md:inline">{t('header.chat')}</span>
              </button>
            </>
          )}
          <button
            onClick={toggleLocale}
            aria-label={t('header.switchLanguage')}
            title={t('header.switchLanguage')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 active:scale-95 transition-colors focus-ring"
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span className="uppercase">{locale}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
