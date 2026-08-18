import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectSidebar from './ProjectSidebar';
import { useAppStore } from '../store/appStore';
import type { Project, ProjectVersion } from '../types';

vi.mock('../services/api', () => ({
  getProjects: vi.fn(),
  getProjectVersions: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { getProjects, getProjectVersions, deleteProject } from '../services/api';

const projectA: Project = {
  id: 1,
  name: 'Лендинг A',
  prompt: 'Лендинг для стартапа',
  current_code: '<html>A</html>',
  theme: 'dark',
  style: 'minimal',
  session_id: 's1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const projectB: Project = {
  id: 2,
  name: 'Дашборд B',
  prompt: 'Аналитика продаж',
  current_code: '<html>B</html>',
  theme: 'light',
  style: 'corporate',
  session_id: 's1',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const versions: ProjectVersion[] = [
  {
    id: 11,
    project_id: 1,
    version_num: 1,
    code: '<html>v1</html>',
    message: 'first',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 12,
    project_id: 1,
    version_num: 2,
    code: '<html>v2</html>',
    message: 'second',
    created_at: '2024-01-02T00:00:00Z',
  },
];

beforeEach(() => {
  vi.mocked(getProjects).mockReset();
  vi.mocked(getProjectVersions).mockReset();
  vi.mocked(deleteProject).mockReset();
  vi.mocked(getProjects).mockResolvedValue([projectA, projectB]);
  vi.mocked(getProjectVersions).mockResolvedValue(versions);
  vi.mocked(deleteProject).mockResolvedValue(undefined);
  useAppStore.setState({
    sessionId: 's1',
    sidebarOpen: true,
    projects: [projectA, projectB],
    currentProject: projectA,
  });
});

describe('ProjectSidebar', () => {
  it('renders the "Новый проект" button and heading', () => {
    render(<ProjectSidebar />);
    expect(screen.getByRole('heading', { name: 'Проекты' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Новый проект' })).toBeInTheDocument();
  });

  it('renders projects fetched from the API', async () => {
    render(<ProjectSidebar />);
    expect(await screen.findByText('Лендинг A')).toBeInTheDocument();
    expect(screen.getByText('Дашборд B')).toBeInTheDocument();
    expect(screen.getByText('Лендинг для стартапа')).toBeInTheDocument();
  });

  it('shows the empty state when there are no projects', async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    render(<ProjectSidebar />);
    expect(await screen.findByText('Проектов пока нет')).toBeInTheDocument();
  });

  it('expands and collapses versions for a project', async () => {
    const user = userEvent.setup();
    render(<ProjectSidebar />);
    await screen.findByText('Лендинг A');

    const versionsButton = screen.getAllByRole('button', { name: 'Версии проекта' })[0];
    expect(versionsButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(versionsButton);
    expect(await screen.findByText('Версия 2')).toBeInTheDocument();
    expect(screen.getByText('Версия 1')).toBeInTheDocument();
    expect(getProjectVersions).toHaveBeenCalledWith(1);
    expect(versionsButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(versionsButton);
    expect(versionsButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Версия 2')).not.toBeInTheDocument();
  });

  it('shows "Версий пока нет" when a project has no versions', async () => {
    vi.mocked(getProjectVersions).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<ProjectSidebar />);
    await screen.findByText('Лендинг A');
    await user.click(screen.getAllByRole('button', { name: 'Версии проекта' })[0]);
    expect(await screen.findByText('Версий пока нет')).toBeInTheDocument();
  });

  it('loads a project into the store on click', async () => {
    const user = userEvent.setup();
    render(<ProjectSidebar />);
    await user.click(await screen.findByText('Дашборд B'));
    const state = useAppStore.getState();
    expect(state.currentProject?.id).toBe(2);
    expect(state.currentCode).toBe('<html>B</html>');
    expect(state.prompt).toBe(projectB.prompt);
    expect(state.sidebarOpen).toBe(false);
  });

  it('normalizes null code/prompt to empty strings when loading a project', async () => {
    const nullProject: Project = {
      id: 3,
      name: 'Пустой проект',
      prompt: null,
      current_code: null,
      theme: 'dark',
      style: 'minimal',
      session_id: 's1',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    };
    vi.mocked(getProjects).mockResolvedValue([projectA, nullProject]);
    useAppStore.setState({ projects: [projectA, nullProject] });

    const user = userEvent.setup();
    render(<ProjectSidebar />);
    await user.click(await screen.findByText('Пустой проект'));
    const state = useAppStore.getState();
    expect(state.currentProject?.id).toBe(3);
    expect(state.currentCode).toBe('');
    expect(state.prompt).toBe('');
  });

  it('normalizes null version code to empty string when loading a version', async () => {
    const nullVersion: ProjectVersion = {
      id: 13,
      project_id: 1,
      version_num: 3,
      code: null,
      message: 'empty',
      created_at: '2024-01-03T00:00:00Z',
    };
    vi.mocked(getProjectVersions).mockResolvedValue([nullVersion]);

    const user = userEvent.setup();
    render(<ProjectSidebar />);
    await screen.findByText('Лендинг A');
    await user.click(screen.getAllByRole('button', { name: 'Версии проекта' })[0]);
    await user.click(await screen.findByText('Версия 3'));
    expect(useAppStore.getState().currentCode).toBe('');
  });

  it('starts a new project via the "Новый проект" button', async () => {
    const user = userEvent.setup();
    render(<ProjectSidebar />);
    await user.click(screen.getByRole('button', { name: 'Новый проект' }));
    const state = useAppStore.getState();
    expect(state.currentProject).toBeNull();
    expect(state.currentCode).toBe('');
    expect(state.prompt).toBe('');
    expect(state.sessionId).toBe('');
    expect(state.sidebarOpen).toBe(false);
  });

  it('deletes a project after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ProjectSidebar />);
    await screen.findByText('Лендинг A');
    await user.click(screen.getAllByRole('button', { name: 'Удалить проект' })[0]);
    expect(deleteProject).toHaveBeenCalledWith(1);
    await waitFor(() => {
      expect(useAppStore.getState().projects.map((p) => p.id)).toEqual([2]);
    });
  });

  it('does not delete when confirmation is declined', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProjectSidebar />);
    await screen.findByText('Лендинг A');
    await user.click(screen.getAllByRole('button', { name: 'Удалить проект' })[0]);
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it('closes the sidebar via the close button', async () => {
    const user = userEvent.setup();
    render(<ProjectSidebar />);
    await user.click(screen.getByRole('button', { name: 'Закрыть панель проектов' }));
    expect(useAppStore.getState().sidebarOpen).toBe(false);
  });
});