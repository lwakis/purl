import { useState, useCallback, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useProjects } from '../hooks/useProjects';
import { useDialog } from '../hooks/useDialog';

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SaveDialog({ open, onClose }: SaveDialogProps) {
  const { currentCode, prompt, theme, style, sessionId, currentProject, setCurrentProject } =
    useAppStore();
  const { create, fetchProjects } = useProjects();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useDialog({ open, onClose, dialogRef });

  useEffect(() => {
    if (open) {
      setName(currentProject?.name || '');
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, currentProject]);

  const handleSave = useCallback(async () => {
    if (!currentCode.trim() || saving) return;
    setSaving(true);
    const project = await create({
      name: name.trim() || 'Untitled',
      prompt,
      current_code: currentCode,
      theme,
      style,
      session_id: sessionId,
    });
    setSaving(false);
    if (project) {
      setCurrentProject(project);
      await fetchProjects();
      onClose();
    }
  }, [
    name,
    currentCode,
    prompt,
    theme,
    style,
    sessionId,
    saving,
    create,
    fetchProjects,
    setCurrentProject,
    onClose,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Сохранить проект"
        className="relative w-full max-w-md bg-surface-900 border border-line rounded-2xl p-6 shadow-overlay animate-slide-up"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-surface-100">Сохранить проект</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-md text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors focus-ring active:scale-[0.98]"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm text-surface-400 mb-1.5">
              Название проекта
            </label>
            <input
              id="project-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="Например: Лендинг для стартапа"
              className="w-full bg-surface-800/70 border border-line rounded-md px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:border-line-strong focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !currentCode}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary-600 font-medium text-white text-sm transition-all hover:bg-primary-500 active:scale-[0.98] disabled:bg-white/10 disabled:text-surface-400 disabled:cursor-not-allowed focus-ring"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
