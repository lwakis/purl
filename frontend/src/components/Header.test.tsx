import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import { useAppStore } from '../store/appStore';
import type { Project } from '../types';

const project: Project = {
  id: 1,
  name: 'Мой лендинг',
  prompt: 'p',
  current_code: '<html></html>',
  theme: 'dark',
  style: 'minimal',
  session_id: 's1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function renderHeader(overrides: Partial<Parameters<typeof Header>[0]> = {}) {
  const props = {
    chatOpen: false,
    onChatToggle: vi.fn(),
    codeOpen: false,
    onCodeToggle: vi.fn(),
    hasDesign: true,
    ...overrides,
  };
  render(<Header {...props} />);
  return props;
}

describe('Header', () => {
  it('shows "Новый дизайн" breadcrumb when no project is selected', () => {
    useAppStore.setState({ currentProject: null });
    renderHeader();
    expect(screen.getByText('Новый дизайн')).toBeInTheDocument();
  });

  it('shows the current project name in the breadcrumb', () => {
    useAppStore.setState({ currentProject: project });
    renderHeader();
    expect(screen.getByText('Мой лендинг')).toBeInTheDocument();
  });

  it('renders Code/Chat buttons only when hasDesign is true', () => {
    renderHeader({ hasDesign: false });
    expect(screen.queryByRole('button', { name: 'Открыть код' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Открыть чат' })).not.toBeInTheDocument();
  });

  it('renders Code/Chat buttons when hasDesign is true', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Открыть код' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть чат' })).toBeInTheDocument();
  });

  it('reflects aria-pressed state for code and chat buttons', () => {
    renderHeader({ codeOpen: true, chatOpen: true });
    expect(screen.getByRole('button', { name: 'Открыть код' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Открыть чат' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('fires onCodeToggle and onChatToggle handlers', async () => {
    const user = userEvent.setup();
    const props = renderHeader();
    await user.click(screen.getByRole('button', { name: 'Открыть код' }));
    expect(props.onCodeToggle).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Открыть чат' }));
    expect(props.onChatToggle).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['saving', 'Сохранение…'],
    ['saved', 'Сохранено'],
    ['error', 'Не удалось сохранить'],
  ] as const)('renders the %s autosave status text', (saveStatus, label) => {
    renderHeader({ saveStatus });
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(label)).toHaveAttribute('aria-live', 'polite');
  });

  it('renders nothing for the idle autosave status', () => {
    renderHeader({ saveStatus: 'idle' });
    expect(screen.queryByText('Сохранение…')).not.toBeInTheDocument();
    expect(screen.queryByText('Сохранено')).not.toBeInTheDocument();
    expect(screen.queryByText('Не удалось сохранить')).not.toBeInTheDocument();
  });

  it('does not render autosave status when hasDesign is false', () => {
    renderHeader({ hasDesign: false, saveStatus: 'saving' });
    expect(screen.queryByText('Сохранение…')).not.toBeInTheDocument();
  });

  it('toggles sidebarOpen in the store via the sidebar button', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ sidebarOpen: false });
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Переключить боковую панель' }));
    expect(useAppStore.getState().sidebarOpen).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Переключить боковую панель' }));
    expect(useAppStore.getState().sidebarOpen).toBe(false);
  });
});