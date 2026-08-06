import { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAppStore } from './store/appStore';
import { useGeneration } from './hooks/useGeneration';
import { useDialog } from './hooks/useDialog';
import { fetchTemplates, createAnonSession } from './services/api';
import { loadSession, saveSession } from './services/session';
import Header from './components/Header';
import EmptyState from './components/EmptyState';
import PromptInput from './components/PromptInput';
import PreviewPanel from './components/PreviewPanel';
import CodePanel from './components/CodePanel';
import ChatPanel from './components/ChatPanel';
import TemplateGallery from './components/TemplateGallery';
import ProjectSidebar from './components/ProjectSidebar';
import ShareDialog from './components/ShareDialog';
import SaveDialog from './components/SaveDialog';
import ShareView from './components/ShareView';
import type { PromptTemplate } from './types';

export default function App() {
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
  const [chatOpen, setChatOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [bottomInput, setBottomInput] = useState('');
  const hasDesign = !!currentCode;

  const chatPanelRef = useRef<HTMLDivElement>(null);
  const codeOverlayRef = useRef<HTMLDivElement>(null);

  const closeChat = useCallback(() => setChatOpen(false), []);
  const closeCode = useCallback(() => setCodeOpen(false), []);
  const closeShare = useCallback(() => setShareDialogOpen(false), []);
  const closeSave = useCallback(() => setSaveDialogOpen(false), []);

  useDialog({ open: chatOpen && hasDesign, onClose: closeChat, dialogRef: chatPanelRef });
  useDialog({ open: codeOpen && hasDesign, onClose: closeCode, dialogRef: codeOverlayRef });

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
          setGenerationError('Не удалось создать сессию. Обновите страницу и попробуйте снова.');
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
    [setPrompt]
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

  const canSave =
    currentProject === null || currentProject.current_code !== currentCode;

  return (
    <div className="h-screen flex flex-col bg-surface-950 text-surface-100">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#6366f1',
              secondary: '#f8fafc',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f8fafc',
            },
          },
        }}
      />

      <Header
        chatOpen={chatOpen}
        onChatToggle={() => setChatOpen((v) => !v)}
        codeOpen={codeOpen}
        onCodeToggle={() => setCodeOpen((v) => !v)}
        hasDesign={hasDesign}
        canSave={canSave}
        onSave={() => setSaveDialogOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <ProjectSidebar />

        {!hasDesign ? (
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12 space-y-8">
              <EmptyState />
              <PromptInput
                templates={templates}
                onTemplateSelect={handleTemplateSelect}
              />
              <TemplateGallery
                templates={templates}
                loading={templatesLoading}
                onSelect={handleTemplateSelect}
              />
            </div>
          </main>
        ) : (
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Full-screen preview */}
            <div className="flex-1 px-4 pb-20 pt-4 min-h-0">
              <PreviewPanel />
            </div>

            {/* Floating bottom input bar */}
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <div className="max-w-3xl mx-auto bg-surface-900/90 backdrop-blur-xl border border-surface-700/50 rounded-2xl shadow-2xl p-1.5 flex items-end gap-1.5">
                <textarea
                  value={bottomInput}
                  onChange={(e) => setBottomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleBottomSend();
                    }
                  }}
                  placeholder="Что вы хотите создать или изменить?"
                  aria-label="Сообщение для генерации или правки"
                  className="flex-1 bg-transparent text-surface-100 placeholder-surface-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 rounded-lg text-sm py-2 px-3 leading-relaxed max-h-32"
                  rows={1}
                  disabled={isGenerating}
                />
                <button
                  onClick={handleBottomSend}
                  disabled={!bottomInput.trim() || isGenerating}
                  className="p-2.5 rounded-xl generation-gradient text-white transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0"
                  aria-label="Отправить"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Chat overlay */}
      {chatOpen && hasDesign && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1" onClick={() => setChatOpen(false)} />
          <div
            ref={chatPanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Чат с дизайнером"
            className="w-96 max-w-[85vw] bg-surface-900 border-l border-surface-700/50 shadow-2xl flex flex-col animate-slide-in-right"
          >
            <div className="flex items-center justify-between p-4 border-b border-surface-700/50">
              <h3 className="text-sm font-semibold text-surface-200">Чат</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                aria-label="Закрыть чат"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ChatPanel />
            </div>
          </div>
        </div>
      )}

      {/* Code overlay */}
      {codeOpen && hasDesign && (
        <div
          ref={codeOverlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Код дизайна"
          className="fixed inset-0 z-50 bg-surface-950/90 backdrop-blur-sm flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/50">
            <h2 className="text-sm font-semibold text-surface-200">Код</h2>
            <button
              onClick={() => setCodeOpen(false)}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
              aria-label="Закрыть код"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <CodePanel onShare={() => setShareDialogOpen(true)} />
          </div>
        </div>
      )}

      <ShareDialog
        open={shareDialogOpen}
        onClose={closeShare}
      />

      <SaveDialog
        open={saveDialogOpen}
        onClose={closeSave}
      />
    </div>
  );
}