import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjects } from './useProjects';
import { getProjects, createProject, updateProject, deleteProject } from '../services/api';
import { useAppStore } from '../store/appStore';
import type { Project } from '../types';
import toast from 'react-hot-toast';

vi.mock('../services/api', () => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});

const project: Project = {
  id: 7,
  name: 'P',
  prompt: 'old',
  current_code: 'old-code',
  theme: 'dark',
  style: 'minimal',
  session_id: 'sess-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const createPayload = {
  name: 'N',
  prompt: 'P',
  current_code: 'C',
  theme: 'dark',
  style: 'minimal',
  session_id: 'sess-1',
};

beforeEach(() => {
  vi.mocked(getProjects).mockReset();
  vi.mocked(createProject).mockReset();
  vi.mocked(updateProject).mockReset();
  vi.mocked(deleteProject).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  useAppStore.setState({ projects: [], sessionId: '' });
});

describe('useProjects', () => {
  it('loads projects scoped to the session on mount', async () => {
    const projects = [project];
    vi.mocked(getProjects).mockResolvedValue({ items: projects, total: 1, page: 1, page_size: 50 });
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledWith('sess-1', {
        search: undefined,
        page: 1,
        pageSize: 50,
      });
      expect(useAppStore.getState().projects).toEqual(projects);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('clears projects without a session and skips the API call', async () => {
    useAppStore.setState({ sessionId: '', projects: [project] });

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(useAppStore.getState().projects).toEqual([]);
    });
    expect(getProjects).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('reports an error when loading projects fails', async () => {
    vi.mocked(getProjects).mockRejectedValue(new Error('boom'));
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.error).toBe('boom');
    });
    expect(result.current.loading).toBe(false);
  });

  it('falls back to a generic message when the load error is not an Error', async () => {
    vi.mocked(getProjects).mockRejectedValue('raw');
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.error).toBe('Не удалось загрузить проекты');
    });
  });

  it('refetches projects when fetchProjects is called again', async () => {
    vi.mocked(getProjects).mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 });
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(getProjects).toHaveBeenCalledTimes(1));

    vi.mocked(getProjects).mockResolvedValue({ items: [project], total: 1, page: 1, page_size: 50 });
    await act(async () => {
      await result.current.fetchProjects();
    });

    expect(getProjects).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().projects).toEqual([project]);
  });

  it('filters by search term when setSearch is called', async () => {
    vi.mocked(getProjects).mockResolvedValue({
      items: [project],
      total: 1,
      page: 1,
      page_size: 50,
    });
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(getProjects).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.setSearch('landing');
    });

    await waitFor(() => {
      expect(getProjects).toHaveBeenLastCalledWith('sess-1', {
        search: 'landing',
        page: 1,
        pageSize: 50,
      });
    });
    expect(useAppStore.getState().projectSearch).toBe('landing');
  });

  it('moves to the next page via setPage', async () => {
    vi.mocked(getProjects).mockResolvedValue({
      items: [project],
      total: 60,
      page: 1,
      page_size: 50,
    });
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(getProjects).toHaveBeenCalledTimes(1));
    expect(result.current.totalPages).toBe(2);

    await act(async () => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(getProjects).toHaveBeenLastCalledWith('sess-1', {
        search: undefined,
        page: 2,
        pageSize: 50,
      });
    });
    expect(useAppStore.getState().projectPage).toBe(2);
  });

  it('creates a project and adds it to the store', async () => {
    const created = { ...project, id: 9 };
    vi.mocked(createProject).mockResolvedValue(created);

    const { result } = renderHook(() => useProjects());

    let returned!: Project | null;
    await act(async () => {
      returned = await result.current.create(createPayload);
    });

    expect(createProject).toHaveBeenCalledWith(createPayload);
    expect(returned).toEqual(created);
    expect(useAppStore.getState().projects).toEqual([created]);
    expect(result.current.projects).toEqual([created]);
    expect(toast.success).toHaveBeenCalledWith('Проект сохранён');
  });

  it('returns null and toasts the error when create fails', async () => {
    vi.mocked(createProject).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useProjects());

    let returned!: Project | null;
    await act(async () => {
      returned = await result.current.create(createPayload);
    });

    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('boom');
  });

  it('falls back to a generic message when the create error is not an Error', async () => {
    vi.mocked(createProject).mockRejectedValue('raw');

    const { result } = renderHook(() => useProjects());

    let returned!: Project | null;
    await act(async () => {
      returned = await result.current.create(createPayload);
    });

    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Не удалось создать проект');
  });

  it('updates a project in the store', async () => {
    const updated = { ...project, name: 'Renamed' };
    vi.mocked(getProjects).mockResolvedValue({ items: [project], total: 1, page: 1, page_size: 50 });
    vi.mocked(updateProject).mockResolvedValue(updated);
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(useAppStore.getState().projects).toEqual([project]));

    let returned!: Project | null;
    await act(async () => {
      returned = await result.current.update(7, { name: 'Renamed' });
    });

    expect(updateProject).toHaveBeenCalledWith(7, { name: 'Renamed' });
    expect(returned).toEqual(updated);
    expect(useAppStore.getState().projects).toEqual([updated]);
  });

  it('returns null and toasts the error when update fails', async () => {
    vi.mocked(getProjects).mockResolvedValue({ items: [project], total: 1, page: 1, page_size: 50 });
    vi.mocked(updateProject).mockRejectedValue(new Error('boom'));
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(useAppStore.getState().projects).toEqual([project]));

    let returned!: Project | null;
    await act(async () => {
      returned = await result.current.update(7, { name: 'X' });
    });

    expect(returned).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('boom');
  });

  it('deletes a project and removes it from the store', async () => {
    const other = { ...project, id: 8, name: 'Other' };
    vi.mocked(getProjects).mockResolvedValue({
      items: [project, other],
      total: 2,
      page: 1,
      page_size: 50,
    });
    vi.mocked(deleteProject).mockResolvedValue(undefined);
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(useAppStore.getState().projects).toEqual([project, other]));

    await act(async () => {
      await result.current.remove(7);
    });

    expect(deleteProject).toHaveBeenCalledWith(7);
    expect(useAppStore.getState().projects).toEqual([other]);
    expect(toast.success).toHaveBeenCalledWith('Проект удалён');
  });

  it('toasts the error when delete fails', async () => {
    vi.mocked(getProjects).mockResolvedValue({ items: [project], total: 1, page: 1, page_size: 50 });
    vi.mocked(deleteProject).mockRejectedValue(new Error('boom'));
    useAppStore.setState({ sessionId: 'sess-1' });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(useAppStore.getState().projects).toEqual([project]));

    await act(async () => {
      await result.current.remove(7);
    });

    expect(deleteProject).toHaveBeenCalledWith(7);
    expect(useAppStore.getState().projects).toEqual([project]);
    expect(toast.error).toHaveBeenCalledWith('boom');
  });
});