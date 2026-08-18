import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { XMarkIcon, ChatBubbleLeftRightIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { useAppStore } from './store/appStore';
import { createSessionId, loadSession, saveSession } from './services/session';
import { useT } from './i18n';
import Header from './components/Header';
import PromptInput from './components/PromptInput';
import PreviewPanel from './components/PreviewPanel';
import ChatPanel from './components/ChatPanel';
import ProjectSidebar from './components/ProjectSidebar';
import { useAutosave } from './hooks/useAutosave';

// react-syntax-highlighter is heavy (~300kB) — load CodePanel on demand so
// it lands in its own chunk instead of the main bundle.
const CodePanel = lazy(() => import('./components/CodePanel'));

type PanelTab = 'chat' | 'code' | null;

export default function App() {
  const { t, locale } = useT();

  // Keep <html lang> in sync with the UI language for a11y and translation tools.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const { currentCode, setSessionId } = useAppStore();

  const [panelTab, setPanelTab] = useState<PanelTab>(null);
  const hasDesign = !!currentCode;
  const { status: saveStatus } = useAutosave();

  const closePanel = useCallback(() => setPanelTab(null), []);

  // Escape closes the right panel (chat/code).
  useEffect(() => {
    if (panelTab === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelTab(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelTab]);

  useEffect(() => {
    const init = async () => {
      // Restore an existing anonymous session so projects/chat survive reloads.
      const stored = loadSession();
      if (stored) {
        setSessionId(stored);
      } else {
        const sid = createSessionId();
        setSessionId(sid);
        saveSession(sid);
      }
    };

    init();
  }, [setSessionId]);

  const chatOpen = panelTab === 'chat';
  const codeOpen = panelTab === 'code';
  const onChatToggle = useCallback(
    () => setPanelTab((prev) => (prev === 'chat' ? null : 'chat')),
    [],
  );
  const onCodeToggle = useCallback(
    () => setPanelTab((prev) => (prev === 'code' ? null : 'code')),
    [],
  );

  return (
    <div className="h-dvh flex flex-col bg-surface-950 text-surface-100">
      {/* Darkroom — the world contract.
          1. The room: warm graphite surfaces lit by one safelight.
             Work happens here; nothing performs for the visitor.
          2. One color: safelight red marks action and exposure.
             It is never decoration.
          3. One light surface: the paper. A developed print,
             never a card. Everything else stays in the dark.
          4. Captions: exposure data in mono on the margins —
             versions, timestamps, frame numbers. Measurement.
          5. Motion: frames develop. When an exposure starts it
             flashes into being; the rest stays quiet. */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1917',
            color: '#F1EDE6',
            border: '1px solid rgba(241,237,230,0.14)',
            borderRadius: '8px',
            fontSize: '14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.55)',
          },
          success: {
            iconTheme: {
              primary: '#F06A52',
              secondary: '#1A1917',
            },
          },
          error: {
            iconTheme: {
              primary: '#F2555A',
              secondary: '#1A1917',
            },
          },
        }}
      />

      <Header
        chatOpen={chatOpen}
        onChatToggle={onChatToggle}
        codeOpen={codeOpen}
        onCodeToggle={onCodeToggle}
        hasDesign={hasDesign}
        saveStatus={saveStatus}
      />

      <div className="flex-1 flex min-w-0 overflow-hidden">
        <ProjectSidebar />

        {!hasDesign ? (
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <div className="w-full max-w-5xl mx-auto px-4 py-10 lg:py-16 flex-1 flex flex-col justify-center space-y-6">
              <PromptInput />
            </div>
          </main>
        ) : (
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Canvas area */}
            <div className="flex-1 min-h-0 px-4 pt-4 pb-3 lg:px-6 lg:pt-6">
              <PreviewPanel />
            </div>
          </main>
        )}

        {/* Right panel (chat / code): static column on lg+, overlay on mobile */}
        {hasDesign && panelTab !== null && (
          <>
            <div
              className="fixed inset-0 z-40 bg-surface-950/60 lg:hidden animate-fade-in"
              onClick={closePanel}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={t('app.panelAria')}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:shrink-0 flex flex-col bg-surface-900 border-l border-line shadow-overlay lg:shadow-none animate-slide-in-right lg:animate-none"
            >
              <div className="flex items-center gap-1 px-3 py-2.5 border-b border-line">
                <div
                  role="tablist"
                  aria-label={t('app.tabsAria')}
                  className="flex items-center gap-0.5 bg-surface-800 shadow-segment-inset border border-line rounded-md p-0.5 flex-1"
                >
                  <button
                    role="tab"
                    aria-selected={panelTab === 'chat'}
                    onClick={() => setPanelTab('chat')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
                      panelTab === 'chat'
                        ? 'bg-primary-600/10 text-primary-400'
                        : 'text-surface-400 hover:text-surface-200'
                    }`}
                  >
                    <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                    {t('header.chat')}
                  </button>
                  <button
                    role="tab"
                    aria-selected={panelTab === 'code'}
                    onClick={() => setPanelTab('code')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
                      panelTab === 'code'
                        ? 'bg-primary-600/10 text-primary-400'
                        : 'text-surface-400 hover:text-surface-200'
                    }`}
                  >
                    <CodeBracketIcon className="w-3.5 h-3.5" />
                    {t('header.code')}
                  </button>
                </div>
                <button
                  onClick={closePanel}
                  className="p-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors focus-ring"
                  aria-label={t('app.closePanelAria')}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {panelTab === 'chat' ? (
                  <ChatPanel />
                ) : (
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center">
                        <div className="w-full max-w-sm animate-pulse rounded-md border border-line bg-surface-800 p-4">
                          <div className="mb-3 h-4 w-2/3 rounded bg-surface-700" />
                          <div className="h-40 rounded bg-surface-700/70" />
                        </div>
                      </div>
                    }
                  >
                    <CodePanel />
                  </Suspense>
                )}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
