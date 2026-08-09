import { useEffect, useRef, useState } from 'react';
import { createProject, updateProject } from '../services/api';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';
import toast from 'react-hot-toast';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 1500;
const SAVED_RESET_MS = 2000;
const ERROR_RESET_MS = 4000;

/**
 * Autosaves the current design, like chats in AI apps: after the user stops
 * typing (debounce) the latest code is persisted to the current project, or
 * a new project is created on first save. Skipped while streaming and when
 * there is nothing to save yet.
 */
export function useAutosave() {
  const { t } = useT();
  const {
    currentCode,
    currentProject,
    prompt,
    theme,
    style,
    sessionId,
    isGenerating,
    projects,
    setCurrentProject,
    addProject,
    setProjects,
  } = useAppStore();

  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const inFlightRef = useRef(false);
  const statusResetTimerRef = useRef<number | null>(null);

  const scheduleStatusReset = (ms: number) => {
    if (statusResetTimerRef.current !== null) {
      window.clearTimeout(statusResetTimerRef.current);
    }
    statusResetTimerRef.current = window.setTimeout(() => setStatus('idle'), ms);
  };

  useEffect(() => {
    if (isGenerating || !currentCode.trim()) return;
    if (!sessionId && !currentProject) return;

    const timer = window.setTimeout(async () => {
      if (inFlightRef.current) return;
      if (currentProject && currentProject.current_code === currentCode) return;

      inFlightRef.current = true;
      setStatus('saving');
      try {
        if (!currentProject) {
          const created = await createProject({
            name: prompt.trim().slice(0, 40) || 'Untitled',
            prompt,
            current_code: currentCode,
            theme,
            style,
            session_id: sessionId,
          });
          setCurrentProject(created);
          addProject(created);
        } else {
          const updated = await updateProject(currentProject.id, {
            current_code: currentCode,
            prompt,
            theme,
            style,
          });
          setCurrentProject(updated);
          setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
        }
        setStatus('saved');
        scheduleStatusReset(SAVED_RESET_MS);
      } catch (err) {
        setStatus('error');
        const fallback = currentProject ? t('errors.updateProject') : t('errors.createProject');
        toast.error(err instanceof Error ? err.message : fallback);
        scheduleStatusReset(ERROR_RESET_MS);
      } finally {
        inFlightRef.current = false;
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    currentCode,
    currentProject,
    prompt,
    theme,
    style,
    sessionId,
    isGenerating,
    projects,
    setCurrentProject,
    addProject,
    setProjects,
    t,
  ]);

  useEffect(() => {
    return () => {
      if (statusResetTimerRef.current !== null) {
        window.clearTimeout(statusResetTimerRef.current);
      }
    };
  }, []);

  return { status };
}
