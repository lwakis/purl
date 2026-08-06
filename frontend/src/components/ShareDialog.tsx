import { useState, useCallback, useRef } from 'react';
import { XMarkIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { createShareLink } from '../services/api';
import { useDialog } from '../hooks/useDialog';
import toast from 'react-hot-toast';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ShareDialog({ open, onClose }: ShareDialogProps) {
  const { shareUrl, setShareUrl, currentProject } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialog({ open, onClose, dialogRef });

  const handleGenerateLink = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const result = await createShareLink(currentProject.id);
      const url = `${window.location.origin}/share/${result.short_code}`;
      setShareUrl(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось создать ссылку';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [currentProject, setShareUrl]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Ссылка скопирована');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  }, [shareUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Поделиться дизайном"
        className="relative w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-100">Поделиться дизайном</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {!shareUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-surface-400">
              Создайте публичную ссылку, чтобы поделиться дизайном. Любой, у кого есть ссылка, сможет его просмотреть.
            </p>
            <button
              onClick={handleGenerateLink}
              disabled={loading || !currentProject}
              className="w-full generation-gradient text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Создание...' : 'Создать ссылку'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-surface-900 rounded-xl p-3 border border-surface-700/50">
              <input
                type="text"
                value={shareUrl}
                readOnly
                aria-label="Ссылка для публикации"
                className="flex-1 bg-transparent text-sm text-surface-200 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                aria-label="Скопировать ссылку"
                className="p-2 rounded-lg bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 transition-colors"
              >
                {copied ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <ClipboardIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="bg-surface-900 rounded-xl border border-surface-700/50 overflow-hidden h-48">
              <iframe
                srcDoc={currentProject?.current_code || ''}
                sandbox="allow-scripts"
                title="Shared Preview"
                className="w-full h-full"
              />
            </div>
            <p className="text-xs text-surface-400">
              Любой, у кого есть эта ссылка, может просмотреть дизайн
            </p>
          </div>
        )}
      </div>
    </div>
  );
}