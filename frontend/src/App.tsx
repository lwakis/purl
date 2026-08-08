import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from './store/appStore';
import { useGeneration } from './hooks/useGeneration';
import { fetchTemplates, createAnonSession } from './services/api';
import { loadSession, saveSession } from './services/session';
import { useT } from './i18n';
import Header from './components/Header';
import EmptyState from './components/EmptyState';
import PromptInput from './components/PromptInput';
import PreviewPanel from './components/PreviewPanel';
import ChatPanel from './components/ChatPanel';
import TemplateGallery from './components/TemplateGallery';
import ProjectSidebar from './components/ProjectSidebar';
import ShareDialog from './components/ShareDialog';
import SaveDialog from './components/SaveDialog';
import ShareView from './components/ShareView';
import type { PromptTemplate } from './types';

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

  // Share landing: /share/:code renders a dedicated screen, not the generator.
  const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)\/?$/);
  if (shareMatch) {
    return <ShareView code={shareMatch[1]} />;
  }

  const {
    currentCode,
    templates,
    isGenerating,
    setTemplates,
    setSessionId,
    setPrompt,
    currentProject,
    setGenerationError,
  } = useAppStore();

  const { generate, iterate } = useGeneration();
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>(null);
  const [bottomInput, setBottomInput] = useState('');
  const hasDesign = !!currentCode;

  const closeShare = useCallback(() => setShareDialogOpen(false), []);
  const closeSave = useCallback(() => setSaveDialogOpen(false), []);
  const closePanel = useCallback(() => setPanelTab(null), []);

  // Escape closes the right panel (chat/code). Save/Share dialogs handle
  // their own Escape via useDialog — skip while one of them is open.
  useEffect(() => {
    if (panelTab === null || saveDialogOpen || shareDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelTab(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelTab, saveDialogOpen, shareDialogOpen]);

  useEffect(() => {
    const init = async () => {
      // Restore an existing anonymous session so projects/chat survive reloads.
      const stored = loadSession();
      if (stored) {
        setSessionId(stored.sessionId);
      } else {
        try {
          const anon = await createAnonSession();
          setSessionId(anon.session_id);
          saveSession(anon.session_id, anon.token);
        } catch {
          setGenerationError(t('errors.sessionInitFailed'));
        }
      }

      setTemplatesLoading(true);
      try {
        const data = await fetchTemplates();
        setTemplates(data);
      } catch {
        // Templates are optional
      } finally {
        setTemplatesLoading(false);
      }
    };

    init();
  }, [setSessionId, setTemplates, setGenerationError]);

  const handleTemplateSelect = useCallback(
    (template: PromptTemplate) => {
      setPrompt(template.prompt_text);
      setBottomInput(template.prompt_text);
    },
    [setPrompt],
  );

  const handleBottomSend = useCallback(() => {
    if (!bottomInput.trim() || isGenerating) return;
    if (!hasDesign) {
      const text = bottomInput.trim();
      setPrompt(text);
      generate(text);
    } else {
      iterate(bottomInput.trim());
    }
    setBottomInput('');
  }, [bottomInput, hasDesign, isGenerating, generate, iterate, setPrompt]);

  const canSave = currentProject === null || currentProject.current_code !== currentCode;

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
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0F1113',
            color: '#F7F8F8',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#8B93FF',
              secondary: '#F7F8F8',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#F7F8F8',
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
        canSave={canSave}
        onSave={() => setSaveDialogOpen(true)}
      />

      <div className="flex-1 flex min-w-0 overflow-hidden">
        <ProjectSidebar />

        {!hasDesign ? (
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12 space-y-6 w-full">
              <EmptyState />
              <PromptInput templates={templates} onTemplateSelect={handleTemplateSelect} />
              <TemplateGallery
                templates={templates}
                loading={templatesLoading}
                onSelect={handleTemplateSelect}
              />
            </div>
          </main>
        ) : (
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Canvas area */}
            <div className="flex-1 min-h-0 px-4 pt-4 pb-3 lg:px-6 lg:pt-6">
              <PreviewPanel />
            </div>

            {/* Bottom command bar — in flow, not floating */}
            <div className="border-t border-line bg-surface-900/60 px-3 py-3">
              <div className="max-w-3xl mx-auto flex items-end gap-1.5">
                <textarea
                  value={bottomInput}
                  onChange={(e) => setBottomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleBottomSend();
                    }
                  }}
                  placeholder={t('app.inputPlaceholder')}
                  aria-label={t('app.inputAria')}
                  className="flex-1 bg-transparent text-surface-100 placeholder-surface-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40 rounded-lg text-sm py-2 px-3 leading-relaxed max-h-32"
                  rows={1}
                  disabled={isGenerating}
                />
                <button
                  onClick={handleBottomSend}
                  disabled={!bottomInput.trim() || isGenerating}
                  className="p-2.5 rounded-md bg-primary-600 text-white transition-all duration-150 hover:bg-primary-500 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-primary-600 flex-shrink-0 focus-ring"
                  aria-label={t('app.sendAria')}
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </main>
        )}
      </div>

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
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] lg:static lg:z-auto lg:w-[380px] lg:max-w-none flex flex-col bg-surface-900 border-l border-line shadow-overlay lg:shadow-none animate-slide-in-right lg:animate-none"
          >
            <div className="flex items-center gap-1 px-3 py-2.5 border-b border-line">
              <div
                role="tablist"
                aria-label={t('app.tabsAria')}
                className="flex items-center gap-0.5 bg-surface-800/70 border border-line rounded-lg p-0.5 flex-1"
              >
                <button
                  role="tab"
                  aria-selected={panelTab === 'chat'}
                  onClick={() => setPanelTab('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
                    panelTab === 'chat'
                      ? 'bg-surface-700 text-surface-100'
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
                      ? 'bg-surface-700 text-surface-100'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <CodeBracketIcon className="w-3.5 h-3.5" />
                  {t('header.code')}
                </button>
              </div>
              <button
                onClick={closePanel}
                className="p-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors focus-ring"
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
                      <div className="w-full max-w-sm animate-pulse rounded-xl border border-line bg-surface-800 p-4">
                        <div className="mb-3 h-4 w-2/3 rounded bg-surface-700" />
                        <div className="h-40 rounded bg-surface-700/70" />
                      </div>
                    </div>
                  }
                >
                  <CodePanel onShare={() => setShareDialogOpen(true)} />
                </Suspense>
              )}
            </div>
          </aside>
        </>
      )}

      <ShareDialog open={shareDialogOpen} onClose={closeShare} />

      <SaveDialog open={saveDialogOpen} onClose={closeSave} />
    </div>
  );
}
