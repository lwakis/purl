import { useCallback, useState } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { useProjects } from '../hooks/useProjects';
import { getProjectVersions } from '../services/api';
import type { Project, ProjectVersion } from '../types';

export default function ProjectSidebar() {
  const { sidebarOpen, setSidebarOpen, currentProject, setCurrentProject, setCurrentCode, setPrompt, setChatHistory, setSessionId } = useAppStore();
  const { projects, loading, remove } = useProjects();
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
      setCurrentCode(project.current_code);
      setPrompt(project.prompt);
      setSessionId(project.session_id);
      setChatHistory([]);
      setSidebarOpen(false);
    },
    [setCurrentProject, setCurrentCode, setPrompt, setSessionId, setChatHistory, setSidebarOpen]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      if (!window.confirm('Удалить проект? Это действие нельзя отменить.')) return;
      remove(id);
    },
    [remove]
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
    [versionsOpen]
  );

  const handleLoadVersion = useCallback(
    (project: Project, version: ProjectVersion) => {
      setCurrentProject(project);
      setCurrentCode(version.code);
      setPrompt(project.prompt);
      setSessionId(project.session_id);
      setChatHistory([]);
      setSidebarOpen(false);
    },
    [setCurrentProject, setCurrentCode, setPrompt, setSessionId, setChatHistory, setSidebarOpen]
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full z-40 bg-surface-900 border-r border-surface-700/50 transition-all duration-300 ease-out overflow-hidden flex-shrink-0 ${
          sidebarOpen
            ? 'translate-x-0 w-72'
            : '-translate-x-full w-72'
        } lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen
            ? 'lg:w-72 lg:opacity-100 lg:border-r'
            : 'lg:w-0 lg:opacity-0 lg:border-r-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-surface-700/50">
            <h2 className="text-sm font-semibold text-surface-200">Проекты</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewProject}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                title="Новый проект"
                aria-label="Новый проект"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors lg:hidden"
                aria-label="Закрыть панель проектов"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg bg-surface-800/50 animate-pulse"
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <DocumentTextIcon className="w-8 h-8 text-surface-700 mb-2" />
                <p className="text-surface-400 text-xs">Проектов пока нет</p>
                <p className="text-surface-400 text-xs mt-1">
                  Создайте дизайн и сохраните его
                </p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={`rounded-xl transition-all group ${
                    currentProject?.id === project.id
                      ? 'bg-primary-500/10 border border-primary-500/20'
                      : 'hover:bg-surface-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 p-3">
                    <button
                      onClick={() => handleLoadProject(project)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-surface-200 truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">
                        {project.prompt}
                      </p>
                      <p className="text-xs text-surface-400 mt-1">
                        {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={(e) => toggleVersions(e, project.id)}
                        className={`p-1 rounded-md transition-all ${
                          versionsOpen === project.id
                            ? 'text-primary-300 bg-primary-500/10'
                            : 'text-surface-400 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-surface-100 hover:bg-surface-800'
                        }`}
                        aria-label="Версии проекта"
                        aria-expanded={versionsOpen === project.id}
                      >
                        <ClockIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="p-1 rounded-md text-surface-400 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        aria-label="Удалить проект"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {versionsOpen === project.id && (
                    <div className="px-3 pb-3 space-y-1">
                      {versionsLoading ? (
                        <div className="h-8 rounded-lg bg-surface-800/50 animate-pulse" />
                      ) : versions.length === 0 ? (
                        <p className="text-xs text-surface-400 px-1 py-1">
                          Версий пока нет
                        </p>
                      ) : (
                        versions.map((version) => (
                          <button
                            key={version.id}
                            onClick={() => handleLoadVersion(project, version)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                          >
                            <span className="font-medium text-surface-300">
                              Версия {version.version_num}
                            </span>
                            <span className="ml-2">
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
      </div>
    </>
  );
}