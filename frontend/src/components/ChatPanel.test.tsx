import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPanel from './ChatPanel';
import { useAppStore } from '../store/appStore';
import type { ChatMessage, Project, ProjectVersion, ProviderInfo, ProviderTestResult } from '../types';

vi.mock('../services/sse', () => ({
  connectGenerateSSE: vi.fn(),
  connectIterateSSE: vi.fn(),
}));

vi.mock('../services/api', () => ({
  getModels: vi.fn(),
  getProjectVersions: vi.fn(),
  getProjects: vi.fn(),
  branchFromVersion: vi.fn(),
  testProvider: vi.fn(),
}));

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});

import { connectIterateSSE } from '../services/sse';
import { branchFromVersion, getModels, getProjectVersions, getProjects, testProvider } from '../services/api';
import toast from 'react-hot-toast';

const project: Project = {
  id: 1,
  name: 'Лендинг',
  prompt: 'Лендинг для стартапа',
  current_code: '<html>current</html>',
  session_id: 's1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const versions: ProjectVersion[] = [
  {
    id: 11,
    project_id: 1,
    version_num: 1,
    code: '<html>\n<p>v1</p>\n</html>',
    message: 'first',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 12,
    project_id: 1,
    version_num: 2,
    code: '<html>\n<p>v2</p>\n</html>',
    message: 'second',
    created_at: '2024-01-02T00:00:00Z',
  },
];

const providers: ProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    ready: true,
    models: [{ id: 'gpt-4o', label: 'GPT-4o' }],
  },
];

beforeEach(() => {
  vi.mocked(connectIterateSSE).mockReset();
  vi.mocked(connectIterateSSE).mockResolvedValue(undefined);
  vi.mocked(getProjectVersions).mockReset();
  vi.mocked(getProjectVersions).mockResolvedValue([]);
  vi.mocked(getProjects).mockReset();
  vi.mocked(getProjects).mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 });
  vi.mocked(branchFromVersion).mockReset();
  vi.mocked(getModels).mockReset();
  vi.mocked(getModels).mockResolvedValue(providers);
  vi.mocked(testProvider).mockReset();
  vi.mocked(toast).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  useAppStore.setState({
    currentCode: '<html>design</html>',
    sessionId: 's1',
    chatHistory: [],
    isGenerating: false,
  });
});

describe('ChatPanel', () => {
  it('prompts to create a design first when there is no code', () => {
    useAppStore.setState({ currentCode: '' });
    render(<ChatPanel />);
    expect(screen.getByText('Сначала создайте дизайн, затем обсуждайте правки')).toBeInTheDocument();
  });

  it('disables the send button but keeps the input enabled without code', () => {
    useAppStore.setState({ currentCode: '' });
    render(<ChatPanel />);
    expect(screen.getByRole('textbox', { name: 'Сообщение в чат' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();
  });

  it('sends a message and calls iterate with it', async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);
    await user.type(screen.getByRole('textbox', { name: 'Сообщение в чат' }), 'Сделай кнопки больше');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));

    await waitFor(() => {
      expect(connectIterateSSE).toHaveBeenCalledWith(
        's1',
        'Сделай кнопки больше',
        '<html>design</html>',
        expect.any(Array),
        expect.any(Object),
        expect.any(Object),
      );
    });
    expect(screen.getByText('Сделай кнопки больше')).toBeInTheDocument();
    expect(useAppStore.getState().chatHistory[0].content).toBe('Сделай кнопки больше');
  });

  it('renders existing chat history', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'Сделай тёмнее' },
      { role: 'assistant', content: 'Готово!' },
    ];
    useAppStore.setState({ chatHistory: history });
    render(<ChatPanel />);
    expect(screen.getByText('Сделай тёмнее')).toBeInTheDocument();
    expect(screen.getByText('Готово!')).toBeInTheDocument();
    expect(screen.getByText('1 итерация')).toBeInTheDocument();
  });

  it('hides the input when hideInput is set', () => {
    render(<ChatPanel hideInput />);
    expect(screen.queryByRole('textbox', { name: 'Сообщение в чат' })).not.toBeInTheDocument();
  });

  it('opens the compare modal with the clicked version preselected', async () => {
    useAppStore.setState({ currentProject: project, currentCode: '<html>\ncurrent\n</html>' });
    vi.mocked(getProjectVersions).mockResolvedValue(versions);
    const user = userEvent.setup();
    render(<ChatPanel />);

    const compareButtons = await screen.findAllByRole('button', { name: 'Сравнить' });
    await user.click(compareButtons[0]);

    expect(await screen.findByRole('dialog', { name: 'Сравнение версий' })).toBeInTheDocument();
    expect(screen.getByLabelText('Версия A')).toHaveValue('11');
    expect(screen.getByLabelText('Версия B')).toHaveValue('current');
  });

  it('closes the compare modal with Escape', async () => {
    useAppStore.setState({ currentProject: project, currentCode: '<html>\ncurrent\n</html>' });
    vi.mocked(getProjectVersions).mockResolvedValue(versions);
    const user = userEvent.setup();
    render(<ChatPanel />);

    const compareButtons = await screen.findAllByRole('button', { name: 'Сравнить' });
    await user.click(compareButtons[0]);
    expect(await screen.findByRole('dialog', { name: 'Сравнение версий' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Сравнение версий' })).not.toBeInTheDocument();
    });
  });

  it('hides the compare entry when there are no usable versions', async () => {
    useAppStore.setState({ currentProject: project });
    vi.mocked(getProjectVersions).mockResolvedValue([{ ...versions[0], code: null }]);
    render(<ChatPanel />);

    await waitFor(() => expect(getProjectVersions).toHaveBeenCalledWith(1));
    await waitFor(() => {
      expect(screen.queryByText('Снимки')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Сравнить' })).not.toBeInTheDocument();
  });

  it('shows diff stats against the next-older snapshot', async () => {
    useAppStore.setState({ currentProject: project, currentCode: '<html>\ncurrent\n</html>' });
    vi.mocked(getProjectVersions).mockResolvedValue(versions);
    render(<ChatPanel />);

    // v2 (newest) differs from v1 by one replaced line.
    expect(await screen.findByText('+1 / −1')).toBeInTheDocument();
  });

  it('restores a snapshot from the compare modal and closes it', async () => {
    useAppStore.setState({ currentProject: project, currentCode: '<html>\ncurrent\n</html>' });
    vi.mocked(getProjectVersions).mockResolvedValue(versions);
    const user = userEvent.setup();
    render(<ChatPanel />);

    const compareButtons = await screen.findAllByRole('button', { name: 'Сравнить' });
    await user.click(compareButtons[0]);
    await user.click(await screen.findByRole('button', { name: 'Восстановить' }));

    expect(useAppStore.getState().currentCode).toBe(versions[0].code);
    expect(toast.success).toHaveBeenCalledWith('Снимок загружен');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Сравнение версий' })).not.toBeInTheDocument();
    });
  });

  it('branches from a snapshot, activates the new project and closes the modal', async () => {
    const branch: Project = { ...project, id: 42, name: 'Лендинг — v1' };
    vi.mocked(branchFromVersion).mockResolvedValue(branch);
    useAppStore.setState({ currentProject: project, currentCode: '<html>\ncurrent\n</html>' });
    vi.mocked(getProjectVersions).mockResolvedValue(versions);
    const user = userEvent.setup();
    render(<ChatPanel />);

    const compareButtons = await screen.findAllByRole('button', { name: 'Сравнить' });
    await user.click(compareButtons[0]);
    await user.click(await screen.findByRole('button', { name: 'Создать ветку от этой версии' }));

    await waitFor(() => {
      expect(branchFromVersion).toHaveBeenCalledWith(1, 11, 'Лендинг — v1');
    });
    expect(useAppStore.getState().currentProject?.id).toBe(42);
    expect(useAppStore.getState().currentCode).toBe(branch.current_code);
    expect(toast.success).toHaveBeenCalledWith('Ветка создана');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Сравнение версий' })).not.toBeInTheDocument();
    });
  });

  it('keeps the modal open and toasts when branching fails', async () => {
    vi.mocked(branchFromVersion).mockRejectedValue(new Error('nope'));
    useAppStore.setState({ currentProject: project, currentCode: '<html>\ncurrent\n</html>' });
    vi.mocked(getProjectVersions).mockResolvedValue(versions);
    const user = userEvent.setup();
    render(<ChatPanel />);

    const compareButtons = await screen.findAllByRole('button', { name: 'Сравнить' });
    await user.click(compareButtons[0]);
    await user.click(await screen.findByRole('button', { name: 'Создать ветку от этой версии' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Не удалось создать ветку');
    });
    expect(screen.getByRole('dialog', { name: 'Сравнение версий' })).toBeInTheDocument();
  });

  it('tests the auto provider (null) from the model popover', async () => {
    vi.mocked(testProvider).mockResolvedValue({
      ok: true,
      reason: 'ok',
      provider: 'openai',
      model: 'gpt-4o',
    });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole('button', { name: 'Выбор модели' }));
    await user.click(await screen.findByRole('button', { name: 'Проверить соединение' }));

    await waitFor(() => expect(testProvider).toHaveBeenCalledWith(null));
    expect(toast.success).toHaveBeenCalledWith('Соединение в порядке');
    // The popover stays open so the toast is the only feedback.
    expect(screen.getByRole('listbox', { name: 'Выбор модели' })).toBeInTheDocument();
  });

  it('tests the explicitly selected model', async () => {
    useAppStore.setState({ selectedModel: 'openai:gpt-4o' });
    vi.mocked(testProvider).mockResolvedValue({
      ok: true,
      reason: 'ok',
      provider: 'openai',
      model: 'gpt-4o',
    });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole('button', { name: 'Выбор модели' }));
    await user.click(await screen.findByRole('button', { name: 'Проверить соединение' }));

    await waitFor(() => expect(testProvider).toHaveBeenCalledWith('openai:gpt-4o'));
  });

  it('shows a neutral toast in mock mode', async () => {
    vi.mocked(testProvider).mockResolvedValue({
      ok: false,
      reason: 'mock',
      provider: null,
      model: null,
    });
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole('button', { name: 'Выбор модели' }));
    await user.click(await screen.findByRole('button', { name: 'Проверить соединение' }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Mock-режим: внешний провайдер не подключён');
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows an error toast when the connection test fails', async () => {
    vi.mocked(testProvider).mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole('button', { name: 'Выбор модели' }));
    await user.click(await screen.findByRole('button', { name: 'Проверить соединение' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Не удалось подключиться');
    });
  });

  it('disables the test button while the check is pending', async () => {
    let resolveTest!: (value: ProviderTestResult) => void;
    vi.mocked(testProvider).mockImplementation(
      () =>
        new Promise<ProviderTestResult>((resolve) => {
          resolveTest = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByRole('button', { name: 'Выбор модели' }));
    const testButton = await screen.findByRole('button', { name: 'Проверить соединение' });
    await user.click(testButton);

    await waitFor(() => expect(testButton).toBeDisabled());
    expect(screen.getByText('Проверяю…')).toBeInTheDocument();

    resolveTest({ ok: true, reason: 'ok', provider: 'openai', model: 'gpt-4o' });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Соединение в порядке'));
    await waitFor(() => expect(testButton).toBeEnabled());
  });
});