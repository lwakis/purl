import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShareView from './ShareView';

vi.mock('../services/api', () => ({
  getSharedProject: vi.fn(),
}));

import { getSharedProject } from '../services/api';

beforeEach(() => {
  vi.mocked(getSharedProject).mockReset();
});

describe('ShareView', () => {
  it('shows a loading state initially', () => {
    vi.mocked(getSharedProject).mockReturnValue(new Promise(() => {}));
    render(<ShareView code="abc" />);
    expect(document.querySelectorAll('.loading-dot')).toHaveLength(3);
  });

  it('renders the shared project name and preview after load', async () => {
    vi.mocked(getSharedProject).mockResolvedValue({ name: 'Общий лендинг', code: '<html>shared</html>' });
    render(<ShareView code="abc" />);
    expect(await screen.findByRole('heading', { name: 'Общий лендинг' })).toBeInTheDocument();
    expect(screen.getByTitle('Shared Design Preview')).toBeInTheDocument();
  });

  it('shows the error state when the link is invalid', async () => {
    vi.mocked(getSharedProject).mockRejectedValue(new Error('404'));
    render(<ShareView code="bad" />);
    expect(await screen.findByText('Дизайн не найден')).toBeInTheDocument();
    expect(screen.getByText('Ссылка недействительна или истекла')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть Purl' })).toHaveAttribute('href', '/');
  });

  it('shows the empty content message when the project has no code', async () => {
    vi.mocked(getSharedProject).mockResolvedValue({ name: 'Пустой', code: '' });
    render(<ShareView code="empty" />);
    expect(await screen.findByText('В этом дизайне нет содержимого')).toBeInTheDocument();
  });
});