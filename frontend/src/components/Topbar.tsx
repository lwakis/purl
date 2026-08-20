import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsPointingOutIcon,
  ClockIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  EyeIcon,
  GlobeAltIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { useAutosave } from '../hooks/useAutosave';
import { useProjects } from '../hooks/useProjects';
import { useT } from '../i18n';
import { getProjectVersions, updateProject } from '../services/api';
import type { PreviewSize, Project, ProjectVersion } from '../types';

const PREVIEW_SIZE_CYCLE: PreviewSize[] = ['desktop', 'tablet', 'mobile'];

interface ProjectsPopoverProps {
  onClose: () => void;
  projects: Project[];
  loading: boolean;
  remove: (id: number) => Promise<void>;
}

function GitHubMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

/**
 * Projects popover: the project list with version history and delete actions.
 * Mirrors ProjectSidebar's list/version patterns, positioned below the logo
 * button in the topbar.
 */
const ProjectsPopover = forwardRef<HTMLDivElement, ProjectsPopoverProps>(function ProjectsPopover(
  { onClose, projects, loading, remove },
  ref,
) {
  const {
    currentProject,
    setCurrentProject,
    setCurrentCode,
    setPrompt,
    setChatHistory,
    setSessionId,
  } = useAppStore();
  const { t } = useT();
  const [versionsOpen, setVersionsOpen] = useState<number | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const isEmpty = !loading && projects.length === 0;

  const handleNewProject = useCallback(() => {
    setCurrentProject(null);
    setCurrentCode('');
    setPrompt('');
    setChatHistory([]);
    setSessionId('');
    onClose();
  }, [setCurrentProject, setCurrentCode, setPrompt, setChatHistory, setSessionId, onClose]);

  const handleLoadProject = useCallback(
    (project: Project) => {
      setCurrentProject(project);
      setCurrentCode(project.current_code ?? '');
      setPrompt(project.prompt ?? '');
      setSessionId(project.session_id);
      setChatHistory([]);
      onClose();
    },
    [setCurrentProject, setCurrentCode, setPrompt, setSessionId, setChatHistory, onClose],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if (!window.confirm(t('topbar.deleteConfirm'))) return;
      remove(id);
    },
    [remove, t],
  );

  const toggleVersions = useCallback(
    async (e: React.MouseEvent, projectId: number) => {
      e.stopPropagation();
      if (versionsOpen === projectId) {
        setVersionsOpen(null);
        return;
      }
      setVersionsOpen(projectId);
      setVersionsLoading(true);
      try {
        const data = await getProjectVersions(projectId);
        setVersions(data);
      } catch {
        setVersions([]);
      } finally {
        setVersionsLoading(false);
      }
    },
    [versionsOpen],
  );

  const handleLoadVersion = useCallback(
    (project: Project, version: ProjectVersion) => {
      setCurrentProject(project);
      setCurrentCode(version.code ?? '');
      setPrompt(project.prompt ?? '');
      setSessionId(project.session_id);
      setChatHistory([]);
      onClose();
    },
    [setCurrentProject, setCurrentCode, setPrompt, setSessionId, setChatHistory, onClose],
  );

  return (
    <div
      ref={ref}
      className="absolute left-4 top-14 z-50 w-72 bg-surface-900 border border-line rounded-lg shadow-overlay animate-fade-in flex flex-col max-h-[70vh] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="exposure-label text-surface-500">{t('topbar.projectsAria')}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleNewProject}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
              isEmpty
                ? 'bg-primary-600 text-white shadow-cta hover:bg-primary-500 active:bg-primary-700'
                : 'border border-line text-surface-200 hover:border-line-strong hover:text-surface-100 hover:bg-surface-800 active:bg-surface-700'
            }`}
            title={t('topbar.newProject')}
            aria-label={t('topbar.newProject')}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('topbar.newProject')}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:bg-surface-700 transition-colors focus-ring"
            aria-label={t('topbar.closeProjects')}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-14" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-40 text-center border border-dashed border-line-subtle rounded-md px-4">
            <DocumentTextIcon className="w-8 h-8 text-surface-700 mb-2" />
            <p className="text-surface-400 text-xs">{t('topbar.noProjects')}</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`rounded-md transition-colors group shadow-segment-inset ${
                currentProject?.id === project.id
                  ? 'bg-primary-600/10 border border-primary-500/70'
                  : 'bg-surface-800 border border-line hover:border-line-strong'
              }`}
            >
              <div className="flex items-start justify-between gap-2 p-3">
                <button
                  type="button"
                  onClick={() => handleLoadProject(project)}
                  className="min-w-0 flex-1 text-left focus-ring"
                  aria-label={t('topbar.loadProject')}
                >
                  <p className="text-sm font-medium text-surface-100 truncate">{project.name}</p>
                  <p className="text-xs text-surface-400 mt-0.5 truncate">{project.prompt}</p>
                  <p className="exposure-label text-surface-500 mt-1">
                    {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                  </p>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => toggleVersions(e, project.id)}
                    className={`p-1.5 rounded-md border transition-colors focus-ring ${
                      versionsOpen === project.id
                        ? 'text-primary-400 bg-primary-600/10 border-primary-500/40'
                        : 'text-surface-400 border-line opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-surface-100 hover:bg-surface-900/50 hover:border-line-strong'
                    }`}
                    aria-label={t('topbar.versionsAria')}
                    aria-expanded={versionsOpen === project.id}
                  >
                    <ClockIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, project.id)}
                    className="p-1.5 rounded-md border border-line text-surface-400 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-status-error hover:bg-status-error/10 hover:border-line-strong transition-colors focus-ring"
                    aria-label={t('topbar.deleteProject')}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {versionsOpen === project.id && (
                <div className="mx-3 mb-3 p-2 space-y-0.5 rounded-md bg-surface-900/50 border border-line-subtle animate-fade-in">
                  {versionsLoading ? (
                    <div className="skeleton h-7" />
                  ) : versions.length === 0 ? (
                    <p className="exposure-label text-surface-500 px-1 py-1">
                      {t('sidebar.noVersions')}
                    </p>
                  ) : (
                    versions.map((version) => (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => handleLoadVersion(project, version)}
                        className="w-full text-left px-2 py-1.5 rounded-sm text-xs text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors focus-ring"
                      >
                        <span className="font-mono text-surface-300">
                          {t('sidebar.version', { num: version.version_num })}
                        </span>
                        <span className="exposure-label text-surface-500 ml-2">
                          {new Date(version.created_at).toLocaleDateString()}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

/**
 * Workspace topbar: logo + project switcher on the left,
 * view segmented control + omnibox in the center, locale / GitHub / help on
 * the right. The popover anchors to the header: a sticky header is a
 * positioned box, so it establishes the containing block for the popover.
 */
export default function Topbar() {
  const {
    workspaceView,
    setWorkspaceView,
    previewSize,
    setPreviewSize,
    bumpPreviewRefresh,
    currentProject,
    setCurrentProject,
    currentCode,
  } = useAppStore();
  const { t, locale, setLocale } = useT();
  const { projects, loading, remove } = useProjects();
  const { status } = useAutosave();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [command, setCommand] = useState('');

  const popoverRef = useRef<HTMLDivElement>(null);
  const logoButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const cancelRenameRef = useRef(false);

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!popoverOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      if (logoButtonRef.current?.contains(event.target as Node)) return;
      setPopoverOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [popoverOpen]);

  // Focus and select-all when the rename input mounts.
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const startRename = useCallback(() => {
    if (!currentProject) return;
    cancelRenameRef.current = false;
    setNameDraft(currentProject.name);
    setEditingName(true);
  }, [currentProject]);

  const cancelRename = useCallback(() => {
    cancelRenameRef.current = true;
    setEditingName(false);
  }, []);

  const commitRename = useCallback(async () => {
    setEditingName(false);
    if (cancelRenameRef.current || !currentProject) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === currentProject.name) return;
    try {
      await updateProject(currentProject.id, { name: trimmed });
      setCurrentProject({ ...currentProject, name: trimmed });
      toast.success(t('toasts.projectSaved'));
    } catch {
      // Rename failed — keep the previous name in the store, show nothing.
    }
  }, [currentProject, nameDraft, setCurrentProject, t]);

  const openInNewTab = useCallback(() => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Deliberately not revoked: the new tab reads the blob lazily.
  }, [currentCode]);

  const cyclePreviewSize = useCallback(() => {
    const next =
      PREVIEW_SIZE_CYCLE[(PREVIEW_SIZE_CYCLE.indexOf(previewSize) + 1) % PREVIEW_SIZE_CYCLE.length];
    setPreviewSize(next);
  }, [previewSize, setPreviewSize]);

  const handleFullscreen = useCallback(() => {
    try {
      const stage = document.getElementById('purl-preview-stage');
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else if (stage?.requestFullscreen) {
        void stage.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by the browser (iframe policy, gesture loss).
    }
  }, []);

  const ghostIconButton =
    'p-1 rounded-md text-surface-500 hover:text-surface-100 hover:bg-surface-700 transition-colors focus-ring active:scale-95';

  const statusLabel =
    status === 'saving'
      ? t('autosave.saving')
      : status === 'saved'
        ? t('autosave.saved')
        : t('autosave.error');

  return (
    <header className="sticky top-0 z-40 h-14 bg-surface-900 border-b border-line">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6 gap-3">
        {/* Left: logo / project switcher, divider, editable project name */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            ref={logoButtonRef}
            type="button"
            onClick={() => setPopoverOpen((open) => !open)}
            className="rounded-md focus-ring active:scale-95 transition-transform"
            aria-label={t('topbar.projectsAria')}
            aria-expanded={popoverOpen}
          >
            <img src="/purl-mark.svg" alt="Purl" className="w-7 h-7 rounded-md focus-ring" />
          </button>
          <span aria-hidden className="font-mono text-surface-600">
            /
          </span>
          {editingName && currentProject ? (
            <input
              ref={nameInputRef}
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') cancelRename();
              }}
              onBlur={commitRename}
              autoFocus
              aria-label={t('topbar.renameAria')}
              className="bg-surface-800 border border-line rounded-md px-2 py-1 text-sm text-surface-100 focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/30 focus:outline-none"
            />
          ) : currentProject ? (
            <button
              type="button"
              onClick={startRename}
              title={t('topbar.renameAria')}
              className="text-base font-semibold text-surface-100 truncate max-w-[220px] focus-ring rounded-sm text-left"
            >
              {currentProject.name}
            </button>
          ) : (
            <span className="text-base font-semibold text-surface-500 truncate max-w-[220px]">
              {t('topbar.newDesign')}
            </span>
          )}
          {status !== 'idle' && (
            <span
              aria-live="polite"
              className={`exposure-label whitespace-nowrap ${
                status === 'error' ? 'text-status-error' : 'text-surface-500'
              }`}
            >
              {statusLabel}
            </span>
          )}
        </div>

        {/* Center: view segmented control, settings, omnibox */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <div className="flex items-center gap-0.5 bg-surface-800 border border-line rounded-lg p-0.5 shadow-segment-inset">
            <button
              type="button"
              role="tab"
              aria-selected={workspaceView === 'preview'}
              onClick={() => setWorkspaceView('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring active:scale-[0.98] border ${
                workspaceView === 'preview'
                  ? 'bg-primary-600/15 text-primary-300 border-primary-500/50'
                  : 'text-surface-400 hover:text-surface-200 border-transparent'
              }`}
            >
              <EyeIcon className="w-3.5 h-3.5" />
              {t('topbar.preview')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceView === 'code'}
              onClick={() => setWorkspaceView('code')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring active:scale-[0.98] border ${
                workspaceView === 'code'
                  ? 'bg-primary-600/15 text-primary-300 border-primary-500/50'
                  : 'text-surface-400 hover:text-surface-200 border-transparent'
              }`}
            >
              <CodeBracketIcon className="w-3.5 h-3.5" />
              {t('topbar.code')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => toast(t('topbar.settingsSoon'))}
            aria-label={t('topbar.settings')}
            title={t('topbar.settings')}
            className="p-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:scale-95 transition-colors focus-ring"
          >
            <Cog6ToothIcon className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex items-center gap-1.5 bg-surface-800 border border-line rounded-lg h-9 px-2.5 flex-1 min-w-0 max-w-xl focus-within:border-primary-500/60 focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:outline-none transition-all">
            <CommandLineIcon className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && command.trim()) {
                  setCommand('');
                  toast(t('topbar.commandSoon'));
                }
              }}
              placeholder={t('topbar.commandPlaceholder')}
              aria-label={t('topbar.commandPlaceholder')}
              className="flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none min-w-0"
            />
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={bumpPreviewRefresh}
                className={ghostIconButton}
                title={t('topbar.refresh')}
                aria-label={t('topbar.refresh')}
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={openInNewTab}
                className={ghostIconButton}
                title={t('topbar.openNewTab')}
                aria-label={t('topbar.openNewTab')}
              >
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={cyclePreviewSize}
                className={ghostIconButton}
                title={t('topbar.devicePreview')}
                aria-label={t('topbar.devicePreview')}
              >
                <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleFullscreen}
                className={ghostIconButton}
                title={t('topbar.fullscreen')}
                aria-label={t('topbar.fullscreen')}
              >
                <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: language, GitHub, help */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
            aria-label={t('header.switchLanguage')}
            title={t('header.switchLanguage')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:scale-95 transition-colors focus-ring"
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span className="exposure-label">{locale}</span>
          </button>
          <a
            href="https://github.com/lwakis/purl"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('topbar.github')}
            title={t('topbar.github')}
            className="p-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:scale-95 transition-colors focus-ring inline-flex"
          >
            <GitHubMarkIcon />
          </a>
          <button
            type="button"
            onClick={() => toast(t('topbar.helpSoon'))}
            aria-label={t('topbar.help')}
            title={t('topbar.help')}
            className="p-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:scale-95 transition-colors focus-ring"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {popoverOpen && (
        <ProjectsPopover
          ref={popoverRef}
          onClose={() => setPopoverOpen(false)}
          projects={projects}
          loading={loading}
          remove={remove}
        />
      )}
    </header>
  );
}
