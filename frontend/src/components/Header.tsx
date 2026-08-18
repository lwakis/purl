import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';
import type { AutosaveStatus } from '../hooks/useAutosave';

interface HeaderProps {
  chatOpen: boolean;
  onChatToggle: () => void;
  codeOpen: boolean;
  onCodeToggle: () => void;
  hasDesign: boolean;
  saveStatus?: AutosaveStatus;
}

export default function Header({
  chatOpen,
  onChatToggle,
  codeOpen,
  onCodeToggle,
  hasDesign,
  saveStatus = 'idle',
}: HeaderProps) {
  const { sidebarOpen, setSidebarOpen, currentProject } = useAppStore();
  const { t, locale, setLocale } = useT();

  const toggleLocale = () => setLocale(locale === 'ru' ? 'en' : 'ru');

  const statusLabel =
    saveStatus === 'saving'
      ? t('autosave.saving')
      : saveStatus === 'saved'
        ? t('autosave.saved')
        : t('autosave.error');

  return (
    <header className="sticky top-0 z-40 h-14 bg-surface-900 border-b border-line">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:scale-95 transition-colors focus-ring"
            aria-label={t('header.toggleSidebar')}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/purl-mark.svg" alt="Purl" className="w-7 h-7" />
            <span className="font-semibold text-lg tracking-tight text-surface-100">Purl</span>
          </div>
          <div className="hidden sm:flex items-center gap-2.5 min-w-0">
            <span aria-hidden="true" className="h-3.5 w-px bg-line-strong" />
            {currentProject?.name ? (
              <span className="exposure-label text-surface-300 truncate max-w-[180px]">
                {currentProject.name}
              </span>
            ) : (
              <span className="exposure-label text-surface-500">{t('header.newDesign')}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasDesign && (
            <>
              {saveStatus !== 'idle' && (
                <span
                  aria-live="polite"
                  className={`exposure-label whitespace-nowrap ${
                    saveStatus === 'error' ? 'text-status-error' : 'text-surface-500'
                  }`}
                >
                  {statusLabel}
                </span>
              )}
              <button
                onClick={onCodeToggle}
                aria-pressed={codeOpen}
                aria-label={t('header.openCode')}
                title={t('header.code')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
                  codeOpen
                    ? 'bg-primary-600/10 text-primary-400'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:scale-95'
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
                    ? 'bg-primary-600/10 text-primary-400'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:scale-95'
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:scale-95 transition-colors focus-ring"
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span className="exposure-label">{locale}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
