import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CursorArrowRaysIcon,
  EllipsisHorizontalIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  LightBulbIcon,
  PaperClipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';
import { getProjectVersions } from '../services/api';
import { useT } from '../i18n';
import type { ProjectVersion } from '../types';
import MarkdownMessage from './MarkdownMessage';
import VersionCard from './VersionCard';

interface ChatPanelProps {
  hideInput?: boolean;
}

const MAX_VERSIONS_SHOWN = 3;

export default function ChatPanel({ hideInput }: ChatPanelProps) {
  const { chatHistory, isGenerating, currentCode, currentProject, setCurrentCode } = useAppStore();
  const { iterate } = useGeneration();
  const { t } = useT();
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [planOn, setPlanOn] = useState(false);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [disliked, setDisliked] = useState<Set<number>>(new Set());
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Refetch versions after every iteration: a completed run auto-saves a new
  // snapshot on the backend, so the list should follow the chat.
  useEffect(() => {
    if (!currentProject) return;
    let alive = true;
    getProjectVersions(currentProject.id)
      .then((v) => alive && setVersions(v.filter((x) => x.code)))
      .catch(() => alive && setVersions([]));
    return () => {
      alive = false;
    };
  }, [currentProject?.id, chatHistory.length]);

  const handleSend = useCallback(() => {
    if (!message.trim() || isGenerating || !currentCode) return;
    iterate(message.trim());
    setMessage('');
  }, [message, isGenerating, currentCode, iterate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    setInputHeight(Math.min(el.scrollHeight, 160));
  }, []);

  const handleCopy = useCallback(
    async (content: string) => {
      try {
        await navigator.clipboard.writeText(content);
        toast.success(t('chat.copied'));
      } catch {
        toast.error(t('code.copyFailed'));
      }
    },
    [t],
  );

  const toggleLiked = useCallback((index: number) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleDisliked = useCallback((index: number) => {
    setDisliked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleMore = useCallback(() => {
    toast(t('chat.more'));
  }, [t]);

  const handleRestoreVersion = useCallback(
    (version: ProjectVersion) => {
      if (version.code == null) return;
      setCurrentCode(version.code);
      toast.success(t('chat.versionRestored'));
    },
    [setCurrentCode, t],
  );

  const handleDownloadVersion = useCallback(
    (version: ProjectVersion) => {
      if (!version.code) return;
      const blob = new Blob([version.code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purl-version-${version.version_num}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('code.downloadStarted'));
    },
    [t],
  );

  const toggleBookmark = useCallback(
    (id: number) => {
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      toast(t('chat.bookmarked'));
    },
    [t],
  );

  const togglePlan = useCallback(() => {
    setPlanOn((prev) => !prev);
    toast(t('chat.planSoon'));
  }, [t]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {chatHistory.length > 0 && (
        <div className="exposure-label text-surface-500 px-1 mb-2">
          {t('chat.iterations', { n: Math.ceil(chatHistory.length / 2) })}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-400 text-sm text-center">
              {currentCode ? t('chat.whatToChange') : t('chat.createFirst')}
            </p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div
              key={i}
              className="flex flex-col animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="exposure-label text-surface-500 mb-1">
                {msg.role === 'user' ? t('chat.you') : t('chat.assistant')} ·{' '}
                {String(i + 1).padStart(2, '0')}
              </span>
              {msg.role === 'user' ? (
                <div className="max-w-[85%] self-end rounded-lg px-3.5 py-2.5 text-sm text-surface-100 bg-primary-600/10">
                  {msg.content}
                </div>
              ) : (
                <div className="self-start w-full">
                  <MarkdownMessage content={msg.content} />
                  <div
                    className="mt-1.5 flex items-center gap-0.5 opacity-50 hover:opacity-100 transition-opacity"
                    aria-label={t('chat.more')}
                  >
                    <button
                      onClick={() => handleCopy(msg.content)}
                      title={t('chat.copy')}
                      aria-label={t('chat.copy')}
                      className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-colors focus-ring active:scale-95"
                    >
                      <ClipboardIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => toggleLiked(i)}
                      title={t('chat.like')}
                      aria-label={t('chat.like')}
                      aria-pressed={liked.has(i)}
                      className={`p-1 rounded-md transition-colors focus-ring active:scale-95 ${
                        liked.has(i)
                          ? 'text-primary-400'
                          : 'text-surface-500 hover:text-surface-200 hover:bg-surface-700'
                      }`}
                    >
                      <HandThumbUpIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => toggleDisliked(i)}
                      title={t('chat.dislike')}
                      aria-label={t('chat.dislike')}
                      aria-pressed={disliked.has(i)}
                      className={`p-1 rounded-md transition-colors focus-ring active:scale-95 ${
                        disliked.has(i)
                          ? 'text-primary-400'
                          : 'text-surface-500 hover:text-surface-200 hover:bg-surface-700'
                      }`}
                    >
                      <HandThumbDownIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleMore}
                      title={t('chat.more')}
                      aria-label={t('chat.more')}
                      className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-colors focus-ring active:scale-95"
                    >
                      <EllipsisHorizontalIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {/* The thinking pill belongs to iterations only: during the first
            generation the preview overlay already communicates progress. */}
        {isGenerating && chatHistory.length > 0 && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 bg-surface-800 border border-line rounded-lg px-3.5 py-2.5">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          </div>
        )}
        {currentProject && versions.length > 0 && (
          <div>
            <div className="exposure-label text-surface-500 px-1 mt-2">{t('chat.versions')}</div>
            <div className="space-y-2 mt-2">
              {versions.slice(0, MAX_VERSIONS_SHOWN).map((version) => (
                <VersionCard
                  key={version.id}
                  version={version}
                  bookmarked={bookmarks.has(version.id)}
                  onRestore={() => handleRestoreVersion(version)}
                  onDownload={() => handleDownloadVersion(version)}
                  onBookmark={() => toggleBookmark(version.id)}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!hideInput && (
        <div className="border-t border-line p-3">
          <div className="rounded-2xl bg-surface-800 border border-line focus-within:border-primary-500/60 focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:outline-none transition-all shadow-segment-inset">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.workspacePlaceholder')}
              aria-label={t('chat.inputAria')}
              rows={1}
              style={{ minHeight: '40px', maxHeight: '160px', height: inputHeight }}
              className="block w-full bg-transparent px-4 pt-3 pb-1 text-sm text-surface-100 placeholder:text-surface-500 resize-none focus:outline-none disabled:opacity-30"
            />
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => toast(t('chat.attachSoon'))}
                  title={t('chat.attach')}
                  aria-label={t('chat.attach')}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-colors focus-ring active:scale-[0.98]"
                >
                  <PaperClipIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toast(t('chat.modelSoon'))}
                  title={`${t('chat.model')}: Opus 4.7`}
                  aria-label={`${t('chat.model')}: Opus 4.7`}
                  className="h-8 flex items-center gap-1.5 px-2 rounded-md text-xs text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-colors focus-ring active:scale-[0.98]"
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span>Opus 4.7</span>
                  <ChevronDownIcon className="w-3 h-3 text-surface-500" />
                </button>
                <button
                  onClick={() => toast(t('chat.modeSoon'))}
                  title={`${t('chat.mode')}: Select`}
                  aria-label={`${t('chat.mode')}: Select`}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-colors focus-ring active:scale-[0.98]"
                >
                  <CursorArrowRaysIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlan}
                  title={t('chat.plan')}
                  aria-label={t('chat.plan')}
                  aria-pressed={planOn}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors focus-ring active:scale-[0.98] ${
                    planOn
                      ? 'text-primary-400 bg-primary-600/10 border border-primary-500/40'
                      : 'text-surface-500 hover:text-surface-200 hover:bg-surface-700'
                  }`}
                >
                  <LightBulbIcon className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!message.trim() || isGenerating || !currentCode}
                aria-label={t('app.sendAria')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-600 text-white shadow-cta hover:bg-primary-500 active:scale-[0.98] transition-all disabled:bg-surface-700 disabled:text-surface-500 disabled:shadow-none disabled:cursor-not-allowed focus-ring"
              >
                <ArrowUpIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
