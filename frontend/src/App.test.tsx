import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { useAppStore } from './store/appStore';
import { createSessionId, loadSession, saveSession } from './services/session';

vi.mock('./services/session', () => ({
  createSessionId: vi.fn(),
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock('./services/api', () => ({
  createProject: vi.fn(),
  updateProject: vi.fn(),
  getProjects: vi.fn(),
  getProject: vi.fn(),
  getModels: vi.fn(),
  getProjectVersions: vi.fn(),
  deleteProject: vi.fn(),
  saveProjectVersion: vi.fn(),
}));

vi.mock('./services/sse', () => ({
  connectGenerateSSE: vi.fn(),
  connectIterateSSE: vi.fn(),
}));

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast, Toaster: () => null };
});

// CodePanel is lazy-loaded and pulls in react-syntax-highlighter; the App
// suite only cares about the top-level workspace/code-view switch.
vi.mock('./components/CodePanel', () => ({
  default: () => <div>CodePanel mock</div>,
}));

import { getProjects } from './services/api';

beforeEach(() => {
  vi.mocked(createSessionId).mockReset();
  vi.mocked(loadSession).mockReset();
  vi.mocked(saveSession).mockReset();
  vi.mocked(getProjects).mockReset();
  vi.mocked(getProjects).mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 });
  // jsdom does not implement matchMedia; PromptInput's example rotation
  // guards on it.
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  useAppStore.setState({
    currentCode: '',
    sessionId: '',
    workspaceView: 'preview',
    locale: 'ru',
  });
});

describe('App', () => {
  it('renders the landing screen when there is no design', () => {
    vi.mocked(loadSession).mockReturnValue(null);
    vi.mocked(createSessionId).mockReturnValue('fresh-sid');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Что вы хотите создать?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Проекты' })).toBeInTheDocument();
    expect(screen.getByText('Purl')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Предпросмотр' })).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ru');
  });

  it('creates and persists a new session when none is stored', async () => {
    vi.mocked(loadSession).mockReturnValue(null);
    vi.mocked(createSessionId).mockReturnValue('fresh-sid');
    render(<App />);
    await waitFor(() => {
      expect(useAppStore.getState().sessionId).toBe('fresh-sid');
    });
    expect(createSessionId).toHaveBeenCalledTimes(1);
    expect(saveSession).toHaveBeenCalledWith('fresh-sid');
  });

  it('restores the stored session instead of creating a new one', async () => {
    vi.mocked(loadSession).mockReturnValue('stored-sid');
    render(<App />);
    await waitFor(() => {
      expect(useAppStore.getState().sessionId).toBe('stored-sid');
    });
    expect(createSessionId).not.toHaveBeenCalled();
    expect(saveSession).not.toHaveBeenCalled();
  });

  it('renders the workspace when a design exists', () => {
    vi.mocked(loadSession).mockReturnValue(null);
    vi.mocked(createSessionId).mockReturnValue('fresh-sid');
    useAppStore.setState({ currentCode: '<html>design</html>', sessionId: 's1' });
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Предпросмотр' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Сообщение в чат' })).toBeInTheDocument();
    expect(screen.getByTestId('preview-iframe')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Что вы хотите создать?' }),
    ).not.toBeInTheDocument();
  });

  it('renders the code panel when workspaceView is code', async () => {
    vi.mocked(loadSession).mockReturnValue(null);
    vi.mocked(createSessionId).mockReturnValue('fresh-sid');
    useAppStore.setState({
      currentCode: '<html>design</html>',
      sessionId: 's1',
      workspaceView: 'code',
    });
    render(<App />);
    expect(await screen.findByText('CodePanel mock')).toBeInTheDocument();
  });

  it('opens and closes the mobile chat overlay with Escape', async () => {
    const user = userEvent.setup();
    vi.mocked(loadSession).mockReturnValue(null);
    vi.mocked(createSessionId).mockReturnValue('fresh-sid');
    useAppStore.setState({ currentCode: '<html>design</html>', sessionId: 's1' });
    const { container } = render(<App />);

    const trigger = screen.getByRole('button', { name: 'Панель дизайнера' });
    await user.click(trigger);
    expect(screen.queryByRole('button', { name: 'Панель дизайнера' })).not.toBeInTheDocument();
    expect(container.querySelector('[class*="bg-surface-950/60"]')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Панель дизайнера' })).toBeInTheDocument();
  });

  it('closes the mobile chat overlay when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(loadSession).mockReturnValue(null);
    vi.mocked(createSessionId).mockReturnValue('fresh-sid');
    useAppStore.setState({ currentCode: '<html>design</html>', sessionId: 's1' });
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Панель дизайнера' }));
    const backdrop = container.querySelector('[class*="bg-surface-950/60"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);
    expect(screen.getByRole('button', { name: 'Панель дизайнера' })).toBeInTheDocument();
  });

  it('syncs the html lang attribute with the store locale', () => {
    vi.mocked(loadSession).mockReturnValue(null);
    vi.mocked(createSessionId).mockReturnValue('fresh-sid');
    useAppStore.setState({ locale: 'en' });
    render(<App />);
    expect(document.documentElement.lang).toBe('en');
  });
});