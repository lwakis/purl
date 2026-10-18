import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompareModal from './CompareModal';
import type { ProjectVersion } from '../types';

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

const currentCode = '<html>\n<p>current</p>\n</html>';

function renderModal(overrides: Partial<Parameters<typeof CompareModal>[0]> = {}) {
  const props = {
    versions,
    currentCode,
    initialVersionId: 12,
    onClose: vi.fn(),
    ...overrides,
  };
  render(<CompareModal {...props} />);
  return props;
}

describe('CompareModal', () => {
  it('renders a labelled modal dialog with the heading', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Сравнение версий' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Сравнение версий' })).toBeInTheDocument();
  });

  it('preselects the clicked version on A and the current code on B', () => {
    renderModal();
    expect(screen.getByLabelText('Версия A')).toHaveValue('12');
    expect(screen.getByLabelText('Версия B')).toHaveValue('current');
  });

  it('lists every version plus the working copy as B options', () => {
    renderModal();
    const selectA = screen.getByLabelText('Версия A');
    const selectB = screen.getByLabelText('Версия B');
    expect(within(selectA).getAllByRole('option')).toHaveLength(2);
    expect(within(selectB).getAllByRole('option')).toHaveLength(3);
    expect(within(selectB).getByRole('option', { name: 'Текущий код' })).toBeInTheDocument();
  });

  it('defaults B to another snapshot when there is no current code', () => {
    renderModal({ currentCode: '' });
    expect(screen.getByLabelText('Версия B')).toHaveValue('11');
    expect(
      within(screen.getByLabelText('Версия B')).queryByRole('option', { name: 'Текущий код' }),
    ).toBeNull();
  });

  it('starts in preview with two sandboxed frames', () => {
    renderModal();
    const frames = screen.getAllByTestId('compare-iframe');
    expect(frames).toHaveLength(2);
    for (const frame of frames) {
      expect(frame).toHaveAttribute(
        'sandbox',
        'allow-scripts allow-popups allow-popups-to-escape-sandbox',
      );
    }
  });

  it('switches to the code view and back without keeping frames mounted', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /Код/ }));
    expect(screen.queryByTestId('compare-iframe')).toBeNull();
    expect(screen.getByTestId('diff-view')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Предпросмотр/ }));
    expect(screen.getAllByTestId('compare-iframe')).toHaveLength(2);
    expect(screen.queryByTestId('diff-view')).toBeNull();
  });

  it('renders added and removed lines with a stats line', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Код/ }));

    expect(screen.getByTestId('diff-stats')).toHaveTextContent('+1 / −1');
    expect(screen.getByText('<p>v2</p>')).toBeInTheDocument();
    expect(screen.getByText('<p>current</p>')).toBeInTheDocument();
    expect(screen.getByText('<html>')).toBeInTheDocument();
  });

  it('recomputes the diff when a picker changes', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Код/ }));
    // Compare v1 against v2: both sides are snapshots now.
    await user.selectOptions(screen.getByLabelText('Версия A'), '11');
    await user.selectOptions(screen.getByLabelText('Версия B'), '12');
    expect(screen.getByTestId('diff-stats')).toHaveTextContent('+1 / −1');
    expect(screen.queryByText('<p>current</p>')).toBeNull();
  });

  it('closes on Escape', () => {
    const props = renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop click but not on a panel click', async () => {
    const user = userEvent.setup();
    const props = renderModal();
    await user.click(screen.getByRole('heading', { name: 'Сравнение версий' }));
    expect(props.onClose).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('compare-backdrop'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows notEnough instead of the pickers with fewer than two sources', () => {
    renderModal({ versions: [versions[0]], currentCode: '' });
    expect(screen.getByText('Нужно минимум две версии')).toBeInTheDocument();
    expect(screen.queryByLabelText('Версия A')).toBeNull();
    expect(screen.queryByLabelText('Версия B')).toBeNull();
  });
});

describe('CompareModal snapshot actions', () => {
  it('offers restore only for the snapshot side, not the current code', () => {
    renderModal({ onRestore: vi.fn() });
    // A is a snapshot (v2), B is the working copy.
    expect(screen.getAllByRole('button', { name: 'Восстановить' })).toHaveLength(1);
  });

  it('adds the action for a second snapshot side too', async () => {
    const user = userEvent.setup();
    renderModal({ onRestore: vi.fn() });
    await user.selectOptions(screen.getByLabelText('Версия B'), '11');
    expect(screen.getAllByRole('button', { name: 'Восстановить' })).toHaveLength(2);
  });

  it('restores the snapshot shown on a side', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    renderModal({ onRestore });
    await user.click(screen.getByRole('button', { name: 'Восстановить' }));
    expect(onRestore).toHaveBeenCalledWith(versions[1]);
  });

  it('keeps the action available in the code view', async () => {
    const user = userEvent.setup();
    renderModal({ onRestore: vi.fn() });
    await user.click(screen.getByRole('button', { name: /Код/ }));
    expect(screen.getByRole('button', { name: 'Восстановить' })).toBeInTheDocument();
  });

  it('renders without the callback (action is inert, not crashing)', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Восстановить' }));
    // Still open — closing is the caller's decision.
    expect(screen.getByRole('dialog', { name: 'Сравнение версий' })).toBeInTheDocument();
  });
});
