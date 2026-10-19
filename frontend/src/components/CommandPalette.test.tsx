import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommandPalette from './CommandPalette';
import { useAppStore } from '../store/appStore';
import type { ChatMessage, Project } from '../types';

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});

import toast from 'react-hot-toast';

const CODE = '<html><body>hello</body></html>';

const project: Project = {
  id: 1,
  name: 'Лендинг',
  prompt: 'p',
  current_code: CODE,
  session_id: 's1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Opens the palette the way a user would.
function openPalette() {
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
}

beforeEach(() => {
  vi.mocked(toast).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  useAppStore.setState({ locale: 'ru', currentCode: '', isGenerating: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('CommandPalette', () => {
  it('is closed initially and opens with Ctrl+K, focusing the input', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).toBeNull();

    openPalette();

    const dialog = screen.getByRole('dialog', { name: 'Палитра команд' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('combobox', { name: 'Команда или поиск…' })).toHaveFocus();
  });

  it('toggles closed with Ctrl+K and closes on Escape', () => {
    render(<CommandPalette />);

    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();

    openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();

    await user.click(screen.getByTestId('palette-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('hides code-dependent and cancel commands when they cannot run', () => {
    useAppStore.setState({ currentCode: '', isGenerating: false });
    render(<CommandPalette />);
    openPalette();

    expect(screen.getByTestId('palette-option-new-design')).toBeInTheDocument();
    expect(screen.getByTestId('palette-option-projects')).toBeInTheDocument();
    expect(screen.getByTestId('palette-option-switch-language')).toBeInTheDocument();
    expect(screen.queryByTestId('palette-option-preview')).toBeNull();
    expect(screen.queryByTestId('palette-option-code')).toBeNull();
    expect(screen.queryByTestId('palette-option-find')).toBeNull();
    expect(screen.queryByTestId('palette-option-download')).toBeNull();
    expect(screen.queryByTestId('palette-option-copy')).toBeNull();
    expect(screen.queryByTestId('palette-option-cancel')).toBeNull();
  });

  it('shows code commands with code and the cancel command while generating', () => {
    useAppStore.setState({ currentCode: CODE, isGenerating: true });
    render(<CommandPalette />);
    openPalette();

    expect(screen.getByTestId('palette-option-preview')).toBeInTheDocument();
    expect(screen.getByTestId('palette-option-code')).toBeInTheDocument();
    expect(screen.getByTestId('palette-option-find')).toBeInTheDocument();
    expect(screen.getByTestId('palette-option-download')).toBeInTheDocument();
    expect(screen.getByTestId('palette-option-copy')).toBeInTheDocument();
    expect(screen.getByTestId('palette-option-cancel')).toBeInTheDocument();
  });

  it('filters by label, case-insensitively', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    render(<CommandPalette />);
    openPalette();

    await user.type(screen.getByRole('combobox'), 'СКАЧ');

    expect(screen.getByTestId('palette-option-download')).toBeInTheDocument();
    expect(screen.queryByTestId('palette-option-preview')).toBeNull();
    expect(screen.queryByTestId('palette-option-projects')).toBeNull();
  });

  it('matches hidden latin keywords even when the label is Russian', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();

    await user.type(screen.getByRole('combobox'), 'lang');

    expect(screen.getByTestId('palette-option-switch-language')).toBeInTheDocument();
    expect(screen.queryByTestId('palette-option-projects')).toBeNull();
  });

  it('shows the empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openPalette();

    await user.type(screen.getByRole('combobox'), 'zzzzz');

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('wraps keyboard navigation with ArrowUp and ArrowDown', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    render(<CommandPalette />);
    openPalette();

    const input = screen.getByRole('combobox');
    const options = screen.getAllByRole('option');
    const last = options.length - 1;

    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.type(input, '{ArrowUp}');
    expect(options[last]).toHaveAttribute('aria-selected', 'true');

    await user.type(input, '{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('runs the active command on Enter and closes', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE, workspaceView: 'code' });
    render(<CommandPalette />);
    openPalette();

    await user.type(screen.getByRole('combobox'), 'предпросмотр');
    await user.keyboard('{Enter}');

    expect(useAppStore.getState().workspaceView).toBe('preview');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('runs a command on click', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE, workspaceView: 'preview' });
    render(<CommandPalette />);
    openPalette();

    await user.click(screen.getByTestId('palette-option-code'));

    expect(useAppStore.getState().workspaceView).toBe('code');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches to code and dispatches purl:open-find for the find command', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE, workspaceView: 'preview' });
    const listener = vi.fn();
    window.addEventListener('purl:open-find', listener);

    render(<CommandPalette />);
    openPalette();
    await user.type(screen.getByRole('combobox'), 'найти');
    await user.keyboard('{Enter}');

    expect(useAppStore.getState().workspaceView).toBe('code');
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('purl:open-find', listener);
  });

  it('resets to the new-design flow', async () => {
    const user = userEvent.setup();
    const history: ChatMessage[] = [{ role: 'user', content: 'hi' }];
    useAppStore.setState({
      currentCode: CODE,
      prompt: 'draft',
      sessionId: 's1',
      chatHistory: history,
      currentProject: project,
    });
    render(<CommandPalette />);
    openPalette();

    await user.click(screen.getByTestId('palette-option-new-design'));

    const state = useAppStore.getState();
    expect(state.currentCode).toBe('');
    expect(state.currentProject).toBeNull();
    expect(state.sessionId).toBe('');
    expect(state.chatHistory).toEqual([]);
  });

  it('toggles the locale', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ locale: 'ru' });
    render(<CommandPalette />);
    openPalette();

    await user.type(screen.getByRole('combobox'), 'язык');
    await user.keyboard('{Enter}');

    expect(useAppStore.getState().locale).toBe('en');
  });

  it('cancels generation when the cancel command runs', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ isGenerating: true, generationStatus: 'status.code' });
    render(<CommandPalette />);
    openPalette();

    await user.type(screen.getByRole('combobox'), 'отмена');
    await user.keyboard('{Enter}');

    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().generationStatus).toBe('');
  });

  it('downloads the current code as index.html', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<CommandPalette />);
    openPalette();
    await user.type(screen.getByRole('combobox'), 'скачать');
    await user.keyboard('{Enter}');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(toast.success).toHaveBeenCalledWith('Скачивание начато');
  });

  it('copies the current code to the clipboard', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<CommandPalette />);
    openPalette();
    await user.type(screen.getByRole('combobox'), 'копировать');
    await user.keyboard('{Enter}');

    expect(writeText).toHaveBeenCalledWith(CODE);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Код скопирован в буфер обмена'));
  });

  it('shows an error toast when the clipboard write fails', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });

    render(<CommandPalette />);
    openPalette();
    await user.type(screen.getByRole('combobox'), 'копировать');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Не удалось скопировать код'));
  });

  it('opens the projects sidebar from the projects command', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ sidebarOpen: false });
    render(<CommandPalette />);
    openPalette();

    await user.type(screen.getByRole('combobox'), 'проекты');
    await user.keyboard('{Enter}');

    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });
});
