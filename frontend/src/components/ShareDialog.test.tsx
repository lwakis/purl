import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareDialog from './ShareDialog';
import { useAppStore } from '../store/appStore';
import type { Project } from '../types';

vi.mock('../services/api', () => ({
  createShareLink: vi.fn(),
}));

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});

import { createShareLink } from '../services/api';
import toast from 'react-hot-toast';

const project: Project = {
  id: 3,
  name: 'Лендинг',
  prompt: 'p',
  current_code: '<html>share</html>',
  theme: 'dark',
  style: 'minimal',
  session_id: 's1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(createShareLink).mockReset();
  vi.mocked(createShareLink).mockResolvedValue({ short_code: 'abc123', url: 'http://x/abc123' });
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  useAppStore.setState({ currentProject: project, shareUrl: null });
});

describe('ShareDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ShareDialog open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the dialog when open', () => {
    render(<ShareDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Поделиться дизайном' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать ссылку' })).toBeInTheDocument();
  });

  it('disables "Создать ссылку" without a current project', () => {
    useAppStore.setState({ currentProject: null });
    render(<ShareDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Создать ссылку' })).toBeDisabled();
  });

  it('creates a share link and shows the URL input', async () => {
    const user = userEvent.setup();
    render(<ShareDialog open={true} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Создать ссылку' }));

    await waitFor(() => {
      expect(createShareLink).toHaveBeenCalledWith(3);
    });
    const input = await screen.findByLabelText('Ссылка для публикации');
    expect(input).toHaveValue(`${window.location.origin}/share/abc123`);
    expect(useAppStore.getState().shareUrl).toBe(`${window.location.origin}/share/abc123`);
  });

  it('copies the share link to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<ShareDialog open={true} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Создать ссылку' }));
    await screen.findByLabelText('Ссылка для публикации');
    await user.click(screen.getByRole('button', { name: 'Скопировать ссылку' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/share/abc123`);
    expect(toast.success).toHaveBeenCalledWith('Ссылка скопирована');
  });

  it('shows an error toast when link creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(createShareLink).mockRejectedValue(new Error('Лимит исчерпан'));
    render(<ShareDialog open={true} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Создать ссылку' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Лимит исчерпан');
    });
    expect(screen.getByRole('button', { name: 'Создать ссылку' })).toBeEnabled();
  });

  it('closes via the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ShareDialog open={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});