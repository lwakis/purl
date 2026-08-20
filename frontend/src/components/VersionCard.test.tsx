import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VersionCard from './VersionCard';
import type { ProjectVersion } from '../types';

const version: ProjectVersion = {
  id: 1,
  project_id: 1,
  version_num: 3,
  code: '<html>v3</html>',
  message: 'Тёмная тема',
  created_at: '2024-01-01T00:00:00Z',
};

function renderCard(overrides: Partial<Parameters<typeof VersionCard>[0]> = {}) {
  const props = {
    version,
    bookmarked: false,
    onRestore: vi.fn(),
    onDownload: vi.fn(),
    onBookmark: vi.fn(),
    ...overrides,
  };
  const view = render(<VersionCard {...props} />);
  return { ...props, ...view };
}

describe('VersionCard', () => {
  it('renders the version message and version number', () => {
    renderCard();
    expect(screen.getByText('Тёмная тема')).toBeInTheDocument();
    expect(screen.getByText(/Версия 3/)).toBeInTheDocument();
  });

  it('falls back to "Версия N" when the version has no message', () => {
    renderCard({ version: { ...version, message: '' } });
    expect(screen.getAllByText(/Версия 3/)).toHaveLength(2);
  });

  it('renders nothing when the version has no code', () => {
    const { container } = renderCard({ version: { ...version, code: null } });
    expect(container).toBeEmptyDOMElement();
  });

  it('restores the version when the card is clicked', async () => {
    const user = userEvent.setup();
    const props = renderCard();
    await user.click(screen.getByRole('button', { name: /Тёмная тема/ }));
    expect(props.onRestore).toHaveBeenCalledTimes(1);
  });

  it('restores the version on Enter and Space keys', () => {
    const props = renderCard();
    const card = screen.getByRole('button', { name: /Тёмная тема/ });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(props.onRestore).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(card, { key: ' ' });
    expect(props.onRestore).toHaveBeenCalledTimes(2);
  });

  it('downloads the version without restoring', async () => {
    const user = userEvent.setup();
    const props = renderCard();
    await user.click(screen.getByRole('button', { name: 'Скачать снимок' }));
    expect(props.onDownload).toHaveBeenCalledTimes(1);
    expect(props.onRestore).not.toHaveBeenCalled();
  });

  it('bookmarks the version without restoring', async () => {
    const user = userEvent.setup();
    const props = renderCard();
    await user.click(screen.getByRole('button', { name: 'В закладки' }));
    expect(props.onBookmark).toHaveBeenCalledTimes(1);
    expect(props.onRestore).not.toHaveBeenCalled();
  });

  it('reflects the bookmarked state', () => {
    renderCard({ bookmarked: true });
    const bookmark = screen.getByRole('button', { name: 'Добавлено в закладки' });
    expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  });

  it('reflects the unbookmarked state', () => {
    renderCard();
    const bookmark = screen.getByRole('button', { name: 'В закладки' });
    expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  });
});