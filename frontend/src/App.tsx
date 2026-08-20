import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useAppStore } from './store/appStore';
import { createSessionId, loadSession, saveSession } from './services/session';
import { useT } from './i18n';
import Header from './components/Header';
import Topbar from './components/Topbar';
import PromptInput from './components/PromptInput';
import PreviewPanel from './components/PreviewPanel';
import ChatPanel from './components/ChatPanel';
import ProjectSidebar from './components/ProjectSidebar';
import { useAutosave } from './hooks/useAutosave';

// react-syntax-highlighter is heavy (~300kB) — load CodePanel on demand so
// it lands in its own chunk instead of the main bundle.
const CodePanel = lazy(() => import('./components/CodePanel'));

// Landing screen mounts its own autosave-aware header; the workspace mounts
// Topbar (which owns its own useAutosave instance). Never both at once, so
// the debounced save loop never runs twice.
function LandingHeader() {
  const { status } = useAutosave();
  return (
    <Header
      chatOpen={false}
      onChatToggle={() => {}}
      codeOpen={false}
      onCodeToggle={() => {}}
      hasDesign={false}
      saveStatus={status}
    />
  );
}

export default function App() {
  const { t, locale } = useT();

  // Keep <html lang> in sync with the UI language for a11y and translation tools.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const { currentCode, setSessionId, workspaceView } = useAppStore();

  const [chatMobileOpen, setChatMobileOpen] = useState(false);
  const hasDesign = !!currentCode;

  // Escape closes the mobile chat overlay.
  useEffect(() => {
    if (!chatMobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setChatMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [chatMobileOpen]);

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

  const closeChatMobile = useCallback(() => setChatMobileOpen(false), []);

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

      {!hasDesign ? (
        <>
          <LandingHeader />
          <div className="flex-1 flex min-w-0 overflow-hidden">
            <ProjectSidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
              <div className="w-full max-w-5xl mx-auto px-4 py-10 lg:py-16 flex-1 flex flex-col justify-center space-y-6">
                <PromptInput />
              </div>
            </main>
          </div>
        </>
      ) : (
        <>
          <Topbar />

          <div className="flex-1 flex min-w-0 overflow-hidden">
            {/* Chat overlay on mobile, static column on md+ */}
            {chatMobileOpen && (
              <div
                className="fixed inset-0 z-40 bg-surface-950/60 md:hidden animate-fade-in"
                onClick={closeChatMobile}
              />
            )}
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={t('app.panelAria')}
              className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[380px] md:static md:z-auto md:w-[360px] md:max-w-none md:shrink-0 flex-col bg-surface-900 border-r border-line shadow-overlay md:shadow-none ${
                chatMobileOpen ? 'flex animate-slide-in-left' : 'hidden'
              } md:flex`}
            >
              <ChatPanel />
            </aside>

            {/* Canvas area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="flex-1 min-h-0">
                {workspaceView === 'preview' ? (
                  <PreviewPanel />
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
            </main>
          </div>

          {/* Floating chat trigger on mobile */}
          {!chatMobileOpen && (
            <button
              onClick={() => setChatMobileOpen(true)}
              className="fixed bottom-4 left-4 z-40 md:hidden p-3 rounded-full bg-surface-800 border border-line text-surface-200 shadow-overlay hover:text-surface-100 hover:border-line-strong transition-colors focus-ring active:scale-95"
              aria-label={t('app.panelAria')}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
