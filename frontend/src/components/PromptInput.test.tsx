import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptInput from './PromptInput';
import { useAppStore } from '../store/appStore';
import type { PromptTemplate } from '../types';

vi.mock('../services/sse', () => ({
  connectGenerateSSE: vi.fn(),
  connectIterateSSE: vi.fn(),
}));

import { connectGenerateSSE } from '../services/sse';

const templates: PromptTemplate[] = [
  {
    id: 1,
    title: 'Лендинг',
    description: 'Одностраничник',
    prompt_text: 'prompt 1',
    category: 'Landing',
    icon: '🚀',
  },
  {
    id: 2,
    title: 'Дашборд',
    description: 'Аналитика',
    prompt_text: 'prompt 2',
    category: 'Dashboard',
    icon: '📊',
  },
];

function renderPromptInput() {
  const onTemplateSelect = vi.fn();
  render(<PromptInput templates={templates} onTemplateSelect={onTemplateSelect} />);
  return { onTemplateSelect };
}

beforeEach(() => {
  vi.mocked(connectGenerateSSE).mockReset();
  vi.mocked(connectGenerateSSE).mockResolvedValue(undefined);
});

describe('PromptInput', () => {
  it('renders the textarea with the "Описание дизайна" label', () => {
    renderPromptInput();
    expect(screen.getByRole('textbox', { name: 'Описание дизайна' })).toBeInTheDocument();
  });

  it('shows the 0/2000 char counter initially', () => {
    renderPromptInput();
    expect(screen.getByText('0/2000')).toBeInTheDocument();
  });

  it('updates the counter and store prompt while typing', async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByRole('textbox', { name: 'Описание дизайна' });
    await user.type(textarea, 'Привет');
    expect(screen.getByText('6/2000')).toBeInTheDocument();
    expect(useAppStore.getState().prompt).toBe('Привет');
  });

  it('renders all theme and style segment buttons', () => {
    renderPromptInput();
    for (const label of ['Тёмная', 'Светлая', 'Авто']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    for (const label of ['Минимал', 'Корпоратив', 'Игривый', 'Техно']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('sets the theme in the store when a theme button is clicked', async () => {
    const user = userEvent.setup();
    renderPromptInput();
    await user.click(screen.getByRole('button', { name: 'Светлая' }));
    expect(useAppStore.getState().theme).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Авто' }));
    expect(useAppStore.getState().theme).toBe('auto');
  });

  it('sets the style in the store when a style button is clicked', async () => {
    const user = userEvent.setup();
    renderPromptInput();
    await user.click(screen.getByRole('button', { name: 'Техно' }));
    expect(useAppStore.getState().style).toBe('techno');
  });

  it('disables the Generate button when the prompt is empty', () => {
    renderPromptInput();
    expect(screen.getByRole('button', { name: 'Сгенерировать' })).toBeDisabled();
  });

  it('calls generate with prompt, theme and style selections', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ theme: 'light', style: 'techno' });
    renderPromptInput();
    await user.type(screen.getByRole('textbox', { name: 'Описание дизайна' }), '  Лендинг для HR  ');
    await user.click(screen.getByRole('button', { name: 'Сгенерировать' }));
    await waitFor(() => {
      expect(connectGenerateSSE).toHaveBeenCalledWith('Лендинг для HR', 'light', 'techno', expect.any(Object));
    });
  });

  it('enforces the 2000 character limit', () => {
    renderPromptInput();
    const textarea = screen.getByRole('textbox', { name: 'Описание дизайна' });
    fireEvent.change(textarea, { target: { value: 'x'.repeat(2000) } });
    expect(useAppStore.getState().prompt).toHaveLength(2000);
    expect(screen.getByText('2000/2000')).toBeInTheDocument();
    // Input beyond the limit is rejected entirely (not truncated).
    fireEvent.change(textarea, { target: { value: 'x'.repeat(2001) } });
    expect(useAppStore.getState().prompt).toHaveLength(2000);
    expect(screen.getByText('2000/2000')).toBeInTheDocument();
  });

  it('generates on Ctrl+Enter', async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByRole('textbox', { name: 'Описание дизайна' });
    await user.type(textarea, 'быстрый промпт');
    await user.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => {
      expect(connectGenerateSSE).toHaveBeenCalledWith('быстрый промпт', 'dark', 'minimal', expect.any(Object));
    });
  });

  it('renders template chips and fires onTemplateSelect', async () => {
    const user = userEvent.setup();
    const { onTemplateSelect } = renderPromptInput();
    await user.click(screen.getByRole('button', { name: /Лендинг/ }));
    expect(onTemplateSelect).toHaveBeenCalledWith(templates[0]);
  });

  it('shows the error alert when generationError is set and dismisses it', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ generationError: 'Что-то пошло не так' });
    renderPromptInput();
    expect(screen.getByRole('alert')).toHaveTextContent('Что-то пошло не так');
    await user.click(screen.getByRole('button', { name: 'Закрыть сообщение об ошибке' }));
    expect(useAppStore.getState().generationError).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});