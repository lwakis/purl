import { useState, useEffect, useCallback } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../services/api';
import { useAppStore } from '../store/appStore';
import { t } from '../i18n';
import type { Project } from '../types';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

export function useProjects() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    setProjects,
    projects,
    addProject,
    sessionId,
    projectSearch,
    projectPage,
    projectTotal,
    setProjectSearch,
    setProjectPage,
    setProjectTotal,
  } = useAppStore();

  const fetchProjects = useCallback(async () => {
    // Without a session we cannot scope the query — never list other users' projects.
    if (!sessionId) {
      setProjects([]);
      setProjectTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects(sessionId, {
        search: projectSearch || undefined,
        page: projectPage,
        pageSize: PAGE_SIZE,
      });
      setProjects(data.items);
      setProjectTotal(data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.loadProjects');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setProjects, setProjectTotal, sessionId, projectSearch, projectPage]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const setSearch = useCallback(
    (search: string) => {
      setProjectSearch(search);
      setProjectPage(1);
    },
    [setProjectSearch, setProjectPage],
  );

  const setPage = useCallback(
    (page: number) => {
      setProjectPage(page);
    },
    [setProjectPage],
  );

  const totalPages = Math.max(1, Math.ceil(projectTotal / PAGE_SIZE));

  const create = useCallback(
    async (data: {
      name: string;
      prompt: string;
      current_code: string;
      theme: string;
      style: string;
      session_id: string;
    }) => {
      try {
        const project = await createProject(data);
        addProject(project);
        toast.success(t('toasts.projectSaved'));
        return project;
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.createProject');
        toast.error(message);
        return null;
      }
    },
    [addProject],
  );

  const update = useCallback(
    async (id: number, data: Partial<Project>) => {
      try {
        const updated = await updateProject(id, data);
        setProjects(projects.map((p) => (p.id === id ? updated : p)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.updateProject');
        toast.error(message);
        return null;
      }
    },
    [projects, setProjects],
  );

  const remove = useCallback(
    async (id: number) => {
      try {
        await deleteProject(id);
        setProjects(projects.filter((p) => p.id !== id));
        toast.success(t('toasts.projectDeleted'));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.deleteProject');
        toast.error(message);
      }
    },
    [projects, setProjects],
  );

  return {
    projects,
    loading,
    error,
    fetchProjects,
    create,
    update,
    remove,
    search: projectSearch,
    setSearch,
    page: projectPage,
    setPage,
    total: projectTotal,
    totalPages,
  };
}
