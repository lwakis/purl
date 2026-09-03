import { useCallback, useState } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  DocumentTextIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useProjects } from '../hooks/useProjects';
import { getProjectVersions } from '../services/api';
import { useT } from '../i18n';
import type { Project, ProjectVersion } from '../types';

export default function ProjectSidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    currentProject,
    setCurrentProject,
    setCurrentCode,
    setPrompt,
    setChatHistory,
    setSessionId,
  } = useAppStore();
  const { projects, loading, remove, search, setSearch, page, setPage, totalPages } =
    useProjects();
  const { t } = useT();
  const [versionsOpen, setVersionsOpen] = useState<number | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const handleNewProject = useCallback(() => {
    setCurrentProject(null);
    setCurrentCode('');
    setPrompt('');
    setChatHistory([]);
    setSessionId('');
    setSidebarOpen(false);
  }, [setCurrentProject, setCurrentCode, setPrompt, setChatHistory, setSessionId, setSidebarOpen]);

  const handleLoadProject = useCallback(
    (project: Project) => {
      setCurrentProject(project);
      setCurrentCode(project.current_code ?? '');
      setPrompt(project.prompt ?? '');
      setSessionId(project.session_id);
      setChatHistory([]);
      setSidebarOpen(false);
    },
    [setCurrentProject, setCurrentCode, setPrompt, setSessionId, setChatHistory, setSidebarOpen],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if (!window.confirm(t('sidebar.deleteConfirm'))) return;
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
      setSidebarOpen(false);
    },
    [setCurrentProject, setCurrentCode, setPrompt, setSessionId, setChatHistory, setSidebarOpen],
  );

  const isEmpty = !loading && projects.length === 0;
  const noSearchResults = !loading && projects.length === 0 && search.trim() !== '';

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-surface-950/60 z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full z-40 bg-surface-900 border-r border-line transition-all duration-300 ease-out overflow-hidden flex-shrink-0 shadow-overlay lg:shadow-none ${
          sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'
        } lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'lg:w-72 lg:opacity-100 lg:border-r' : 'lg:w-0 lg:opacity-0 lg:border-r-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <h2 className="exposure-label text-surface-500">{t('sidebar.title')}</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleNewProject}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring ${
                  isEmpty
                    ? 'bg-primary-600 text-white shadow-cta hover:bg-primary-500 active:bg-primary-700'
                    : 'border border-line text-surface-200 hover:border-line-strong hover:text-surface-100 hover:bg-surface-800 active:bg-surface-700'
                }`}
                title={t('sidebar.newProject')}
                aria-label={t('sidebar.newProject')}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('sidebar.newProject')}</span>
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 active:bg-surface-700 transition-colors focus-ring lg:hidden"
                aria-label={t('sidebar.closeAria')}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-3 pt-3">
            <div className="relative">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 text-surface-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('sidebar.searchPlaceholder')}
                aria-label={t('sidebar.searchAria')}
                className="w-full pl-8 pr-7 py-1.5 rounded-md bg-surface-800 border border-line text-sm text-surface-100 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-surface-500 hover:text-surface-100 focus-ring"
                  aria-label={t('sidebar.clearSearch')}
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-14" />
                ))}
              </div>
            ) : noSearchResults ? (
              <div className="flex flex-col items-center justify-center h-40 text-center border border-dashed border-line-subtle rounded-md px-4">
                <DocumentTextIcon className="w-8 h-8 text-surface-700 mb-2" />
                <p className="text-surface-400 text-xs">{t('sidebar.noResultsTitle')}</p>
                <p className="text-surface-400 text-xs mt-1">{t('sidebar.noResultsSubtitle')}</p>
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center h-40 text-center border border-dashed border-line-subtle rounded-md px-4">
                <DocumentTextIcon className="w-8 h-8 text-surface-700 mb-2" />
                <p className="text-surface-400 text-xs">{t('sidebar.emptyTitle')}</p>
                <p className="text-surface-400 text-xs mt-1">{t('sidebar.emptySubtitle')}</p>
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
                      onClick={() => handleLoadProject(project)}
                      className="min-w-0 flex-1 text-left focus-ring"
                    >
                      <p className="text-sm font-medium text-surface-100 truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5 truncate">{project.prompt}</p>
                      <p className="exposure-label text-surface-500 mt-1">
                        {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => toggleVersions(e, project.id)}
                        className={`p-1.5 rounded-md border transition-colors focus-ring ${
                          versionsOpen === project.id
                            ? 'text-primary-400 bg-primary-600/10 border-primary-500/40'
                            : 'text-surface-400 border-line opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-surface-100 hover:bg-surface-900/50 hover:border-line-strong'
                        }`}
                        aria-label={t('sidebar.versionsAria')}
                        aria-expanded={versionsOpen === project.id}
                      >
                        <ClockIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="p-1.5 rounded-md border border-line text-surface-400 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-status-error hover:bg-status-error/10 hover:border-line-strong transition-colors focus-ring"
                        aria-label={t('sidebar.deleteAria')}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-line">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-line text-surface-400 hover:text-surface-100 hover:bg-surface-800 disabled:opacity-40 disabled:pointer-events-none transition-colors focus-ring"
                aria-label={t('sidebar.prevPage')}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="exposure-label text-surface-500">
                {t('sidebar.pageInfo', { page, total: totalPages })}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-line text-surface-400 hover:text-surface-100 hover:bg-surface-800 disabled:opacity-40 disabled:pointer-events-none transition-colors focus-ring"
                aria-label={t('sidebar.nextPage')}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
