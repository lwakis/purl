import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SaveDialog from './SaveDialog';
import { useAppStore } from '../store/appStore';
import type { Project } from '../types';

vi.mock('../services/api', () => ({
  getProjects: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { createProject, getProjects } from '../services/api';

const savedProject: Project = {
  id: 7,
  name: 'Мой лендинг',
  prompt: 'Лендинг для HR',
  current_code: '<html>saved</html>',
  theme: 'dark',
  style: 'minimal',
  session_id: 's1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(createProject).mockReset();
  vi.mocked(getProjects).mockReset();
  vi.mocked(createProject).mockResolvedValue(savedProject);
  vi.mocked(getProjects).mockResolvedValue([]);
  useAppStore.setState({
    currentCode: '<html>hello</html>',
    prompt: 'Лендинг для HR',
    theme: 'dark',
    style: 'minimal',
    sessionId: 's1',
    currentProject: null,
  });
});

describe('SaveDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SaveDialog open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the dialog with the name field when open', () => {
    render(<SaveDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Сохранить проект' })).toBeInTheDocument();
    expect(screen.getByLabelText('Название проекта')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
  });

  it('prefills the name field with the current project name', () => {
    useAppStore.setState({ currentProject: savedProject });
    render(<SaveDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Название проекта')).toHaveValue('Мой лендинг');
  });

  it('submits createProject with the form data and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaveDialog open={true} onClose={onClose} />);
    await user.clear(screen.getByLabelText('Название проекта'));
    await user.type(screen.getByLabelText('Название проекта'), 'Проект X');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({
        name: 'Проект X',
        prompt: 'Лендинг для HR',
        current_code: '<html>hello</html>',
        theme: 'dark',
        style: 'minimal',
        session_id: 's1',
      });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().currentProject?.id).toBe(7);
  });

  it('disables the submit button when there is no current code', () => {
    useAppStore.setState({ currentCode: '' });
    render(<SaveDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  });

  it('submits on Enter key in the name field', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaveDialog open={true} onClose={onClose} />);
    await user.clear(screen.getByLabelText('Название проекта'));
    await user.type(screen.getByLabelText('Название проекта'), 'Enter project{Enter}');
    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Enter project' })
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaveDialog open={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the saving state while submitting', async () => {
    const user = userEvent.setup();
    let resolveCreate!: (p: Project) => void;
    vi.mocked(createProject).mockImplementation(
      () => new Promise<Project>((resolve) => (resolveCreate = resolve))
    );
    render(<SaveDialog open={true} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByText('Сохранение...')).toBeInTheDocument();
    resolveCreate(savedProject);
  });
});