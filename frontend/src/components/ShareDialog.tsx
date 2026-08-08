import { useState, useCallback, useRef } from 'react';
import { XMarkIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { createShareLink } from '../services/api';
import { useDialog } from '../hooks/useDialog';
import { useT } from '../i18n';
import toast from 'react-hot-toast';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ShareDialog({ open, onClose }: ShareDialogProps) {
  const { shareUrl, setShareUrl, currentProject } = useAppStore();
  const { t } = useT();
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
      const message = err instanceof Error ? err.message : t('shareDialog.createFailed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [currentProject, setShareUrl, t]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t('shareDialog.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('shareDialog.copyFailed'));
    }
  }, [shareUrl, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('shareDialog.title')}
        className="relative w-full max-w-md bg-surface-900 border border-line rounded-2xl p-6 shadow-overlay animate-slide-up"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-surface-100">{t('shareDialog.title')}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="p-1.5 rounded-md text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors focus-ring active:scale-[0.98]"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {!shareUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-surface-400">{t('shareDialog.description')}</p>
            <button
              onClick={handleGenerateLink}
              disabled={loading || !currentProject}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary-600 font-medium text-white text-sm transition-all hover:bg-primary-500 active:scale-[0.98] disabled:bg-white/10 disabled:text-surface-400 disabled:cursor-not-allowed focus-ring"
            >
              {loading ? t('shareDialog.creating') : t('shareDialog.create')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-surface-800/70 rounded-md p-3 border border-line">
              <input
                type="text"
                value={shareUrl}
                readOnly
                aria-label={t('shareDialog.linkAria')}
                className="flex-1 bg-transparent text-sm text-surface-200 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                aria-label={t('shareDialog.copyLinkAria')}
                className="p-2 rounded-md bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 transition-colors focus-ring active:scale-[0.98]"
              >
                {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
              </button>
            </div>
            <div className="bg-surface-900 border border-line rounded-lg overflow-hidden h-48">
              <iframe
                srcDoc={currentProject?.current_code || ''}
                sandbox="allow-scripts"
                title={t('shareDialog.iframeTitle')}
                className="w-full h-full"
              />
            </div>
            <p className="text-xs text-surface-400">{t('shareDialog.anyoneCanView')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
