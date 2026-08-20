import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Topbar from './Topbar';
import { useAppStore } from '../store/appStore';
import type { Project, ProjectVersion } from '../types';

vi.mock('../services/api', () => ({
  getProjects: vi.fn(),
  getProjectVersions: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import {
  getProjects,
  getProjectVersions,
  updateProject,
  deleteProject,
  createProject,
} from '../services/api';
import toast from 'react-hot-toast';

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
  vi.mocked(updateProject).mockReset();
  vi.mocked(deleteProject).mockReset();
  vi.mocked(createProject).mockReset();
  vi.mocked(getProjects).mockResolvedValue([projectA, projectB]);
  vi.mocked(getProjectVersions).mockResolvedValue(versions);
  vi.mocked(updateProject).mockResolvedValue(projectA);
  vi.mocked(deleteProject).mockResolvedValue(undefined);
  vi.mocked(createProject).mockResolvedValue(projectA);
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  useAppStore.setState({
    sessionId: 's1',
    projects: [projectA, projectB],
    currentProject: null,
    currentCode: '',
    workspaceView: 'preview',
    previewSize: 'desktop',
    previewRefreshKey: 0,
    locale: 'ru',
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Topbar', () => {
  it('renders the topbar with tabs, preview actions, locale and GitHub link', () => {
    render(<Topbar />);
    expect(screen.getByRole('button', { name: 'Проекты' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Предпросмотр' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Код' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить предпросмотр' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть в новой вкладке' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Размер предпросмотра' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Во весь экран' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Переключить язык' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Исходный код на GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/lwakis/purl',
    );
  });

  it('shows "Новый дизайн" when no project is selected', () => {
    render(<Topbar />);
    expect(screen.getByText('Новый дизайн')).toBeInTheDocument();
  });

  it('shows the current project name as a rename button', () => {
    useAppStore.setState({ currentProject: projectA });
    render(<Topbar />);
    expect(screen.getByRole('button', { name: 'Лендинг A' })).toBeInTheDocument();
  });

  it('switches the workspace view between preview and code', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    const previewTab = screen.getByRole('tab', { name: 'Предпросмотр' });
    const codeTab = screen.getByRole('tab', { name: 'Код' });
    expect(previewTab).toHaveAttribute('aria-selected', 'true');
    expect(codeTab).toHaveAttribute('aria-selected', 'false');

    await user.click(codeTab);
    expect(useAppStore.getState().workspaceView).toBe('code');
    expect(codeTab).toHaveAttribute('aria-selected', 'true');
    expect(previewTab).toHaveAttribute('aria-selected', 'false');

    await user.click(previewTab);
    expect(useAppStore.getState().workspaceView).toBe('preview');
    expect(previewTab).toHaveAttribute('aria-selected', 'true');
  });

  it('bumps the preview refresh key via the refresh button', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    const before = useAppStore.getState().previewRefreshKey;
    await user.click(screen.getByRole('button', { name: 'Обновить предпросмотр' }));
    expect(useAppStore.getState().previewRefreshKey).toBe(before + 1);
  });

  it('cycles the preview size desktop → tablet → mobile → desktop', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    const button = screen.getByRole('button', { name: 'Размер предпросмотра' });
    await user.click(button);
    expect(useAppStore.getState().previewSize).toBe('tablet');
    await user.click(button);
    expect(useAppStore.getState().previewSize).toBe('mobile');
    await user.click(button);
    expect(useAppStore.getState().previewSize).toBe('desktop');
  });

  it('toggles the locale between ru and en', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    const button = screen.getByRole('button', { name: 'Переключить язык' });
    expect(button).toHaveTextContent('ru');
    await user.click(button);
    expect(useAppStore.getState().locale).toBe('en');
    expect(button).toHaveTextContent('en');
    await user.click(button);
    expect(useAppStore.getState().locale).toBe('ru');
  });

  it('opens the current code in a new tab', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.createObjectURL = createObjectURL;
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    useAppStore.setState({ currentProject: projectA, currentCode: '<html>A</html>' });
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Открыть в новой вкладке' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith('blob:mock-url', '_blank');
  });

  it('does not open a new tab when there is no code', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Открыть в новой вкладке' }));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('requests fullscreen on the preview stage', async () => {
    const user = userEvent.setup();
    const requestFullscreen = vi.fn();
    const stage = document.createElement('div');
    stage.requestFullscreen = requestFullscreen;
    vi.spyOn(document, 'getElementById').mockReturnValue(stage);
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Во весь экран' }));
    expect(requestFullscreen).toHaveBeenCalled();
  });

  it('exits fullscreen when already fullscreen', async () => {
    const user = userEvent.setup();
    const exitFullscreen = vi.fn();
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.documentElement,
      configurable: true,
    });
    document.exitFullscreen = exitFullscreen;
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Во весь экран' }));
    expect(exitFullscreen).toHaveBeenCalled();
  });

  it('renames the current project via the inline input', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentProject: projectA });
    vi.mocked(updateProject).mockResolvedValue({ ...projectA, name: 'Новый лендинг' });
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Лендинг A' }));
    const input = screen.getByRole('textbox', { name: 'Переименовать проект' });
    expect(input).toHaveValue('Лендинг A');
    await user.clear(input);
    await user.type(input, 'Новый лендинг');
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith(1, { name: 'Новый лендинг' });
    });
    await waitFor(() => {
      expect(useAppStore.getState().currentProject?.name).toBe('Новый лендинг');
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Проект сохранён');
  });

  it('cancels rename on Escape without saving', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentProject: projectA });
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Лендинг A' }));
    const input = screen.getByRole('textbox', { name: 'Переименовать проект' });
    await user.clear(input);
    await user.type(input, 'Не сохранять');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox', { name: 'Переименовать проект' })).not.toBeInTheDocument();
    expect(updateProject).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Лендинг A' })).toBeInTheDocument();
  });

  it('does not save an empty rename', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentProject: projectA });
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Лендинг A' }));
    const input = screen.getByRole('textbox', { name: 'Переименовать проект' });
    await user.clear(input);
    await user.keyboard('{Enter}');
    expect(updateProject).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Лендинг A' })).toBeInTheDocument();
  });

  it('keeps the previous name when the rename fails', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentProject: projectA });
    vi.mocked(updateProject).mockRejectedValue(new Error('fail'));
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Лендинг A' }));
    const input = screen.getByRole('textbox', { name: 'Переименовать проект' });
    await user.clear(input);
    await user.type(input, 'Не сохранится');
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(useAppStore.getState().currentProject?.name).toBe('Лендинг A');
    });
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled();
  });

  it('shows autosave status while saving and after save', async () => {
    vi.useFakeTimers();
    useAppStore.setState({ currentCode: '<html>design</html>', sessionId: 's1' });
    let resolveCreate!: (p: Project) => void;
    vi.mocked(createProject).mockReturnValue(
      new Promise<Project>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    render(<Topbar />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText('Сохранение…')).toBeInTheDocument();
    await act(async () => {
      resolveCreate(projectA);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Сохранено')).toBeInTheDocument();
  });

  it('shows the autosave error status when saving fails', async () => {
    vi.useFakeTimers();
    useAppStore.setState({ currentCode: '<html>design</html>', sessionId: 's1' });
    vi.mocked(createProject).mockRejectedValue(new Error('boom'));
    render(<Topbar />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Не удалось сохранить')).toBeInTheDocument();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('boom');
  });
});

describe('Topbar projects popover', () => {
  it('opens the projects popover from the logo button', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    const logoButton = screen.getByRole('button', { name: 'Проекты' });
    expect(logoButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(logoButton);
    expect(logoButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Проекты' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Новый проект' })).toBeInTheDocument();
  });

  it('closes the popover on Escape', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    expect(screen.getByRole('heading', { name: 'Проекты' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('heading', { name: 'Проекты' })).not.toBeInTheDocument();
  });

  it('closes the popover on an outside click', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    expect(screen.getByRole('heading', { name: 'Проекты' })).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('heading', { name: 'Проекты' })).not.toBeInTheDocument();
  });

  it('closes the popover via the close button', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    await user.click(screen.getByRole('button', { name: 'Закрыть список проектов' }));
    expect(screen.queryByRole('heading', { name: 'Проекты' })).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no projects', async () => {
    const user = userEvent.setup();
    vi.mocked(getProjects).mockResolvedValue([]);
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    expect(await screen.findByText('Проектов пока нет')).toBeInTheDocument();
  });

  it('shows skeletons while projects are loading', async () => {
    const user = userEvent.setup();
    let resolveProjects!: (v: Project[]) => void;
    vi.mocked(getProjects).mockReturnValue(
      new Promise<Project[]>((resolve) => {
        resolveProjects = resolve;
      }),
    );
    const { container } = render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    await act(async () => {
      resolveProjects([]);
    });
    expect(await screen.findByText('Проектов пока нет')).toBeInTheDocument();
  });

  it('lists projects fetched from the API', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    expect(await screen.findByText('Лендинг A')).toBeInTheDocument();
    expect(screen.getByText('Дашборд B')).toBeInTheDocument();
    expect(screen.getByText('Лендинг для стартапа')).toBeInTheDocument();
  });

  it('starts a new project via the "Новый проект" button', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    await user.click(screen.getByRole('button', { name: 'Новый проект' }));
    const state = useAppStore.getState();
    expect(state.currentProject).toBeNull();
    expect(state.currentCode).toBe('');
    expect(state.prompt).toBe('');
    expect(state.sessionId).toBe('');
    expect(state.chatHistory).toEqual([]);
    expect(screen.queryByRole('heading', { name: 'Проекты' })).not.toBeInTheDocument();
  });

  it('loads a project into the store on click', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    await user.click(await screen.findByText('Дашборд B'));
    const state = useAppStore.getState();
    expect(state.currentProject?.id).toBe(2);
    expect(state.currentCode).toBe('<html>B</html>');
    expect(state.prompt).toBe(projectB.prompt);
    expect(state.sessionId).toBe('s1');
    expect(screen.queryByRole('heading', { name: 'Проекты' })).not.toBeInTheDocument();
  });

  it('normalizes null code/prompt when loading a project', async () => {
    const user = userEvent.setup();
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
    vi.mocked(getProjects).mockResolvedValue([nullProject]);
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    await user.click(await screen.findByText('Пустой проект'));
    const state = useAppStore.getState();
    expect(state.currentProject?.id).toBe(3);
    expect(state.currentCode).toBe('');
    expect(state.prompt).toBe('');
  });

  it('expands and collapses versions for a project', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
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

  it('loads a version into the store', async () => {
    const user = userEvent.setup();
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    await screen.findByText('Лендинг A');
    await user.click(screen.getAllByRole('button', { name: 'Версии проекта' })[0]);
    await user.click(await screen.findByText('Версия 1'));
    const state = useAppStore.getState();
    expect(state.currentProject?.id).toBe(1);
    expect(state.currentCode).toBe('<html>v1</html>');
    expect(state.prompt).toBe(projectA.prompt);
    expect(screen.queryByRole('heading', { name: 'Проекты' })).not.toBeInTheDocument();
  });

  it('shows "Версий пока нет" when versions fail to load', async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectVersions).mockRejectedValue(new Error('fail'));
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    await screen.findByText('Лендинг A');
    await user.click(screen.getAllByRole('button', { name: 'Версии проекта' })[0]);
    expect(await screen.findByText('Версий пока нет')).toBeInTheDocument();
  });

  it('deletes a project after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
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
    render(<Topbar />);
    await user.click(screen.getByRole('button', { name: 'Проекты' }));
    await screen.findByText('Лендинг A');
    await user.click(screen.getAllByRole('button', { name: 'Удалить проект' })[0]);
    expect(deleteProject).not.toHaveBeenCalled();
  });
});