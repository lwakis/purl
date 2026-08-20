import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptInput from './PromptInput';
import { useAppStore } from '../store/appStore';

vi.mock('../services/sse', () => ({
  connectGenerateSSE: vi.fn(),
  connectIterateSSE: vi.fn(),
}));

import { connectGenerateSSE } from '../services/sse';

beforeEach(() => {
  vi.mocked(connectGenerateSSE).mockReset();
  vi.mocked(connectGenerateSSE).mockResolvedValue(undefined);
  // jsdom does not implement matchMedia; the rotation effect guards on it.
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

describe('PromptInput', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the textarea with the "Описание дизайна" label', () => {
    render(<PromptInput />);
    expect(screen.getByRole('textbox', { name: 'Описание дизайна' })).toBeInTheDocument();
  });

  it('shows the headline and subtitle', () => {
    render(<PromptInput />);
    expect(
      screen.getByRole('heading', { name: 'Что вы хотите создать?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Опишите идею на естественном языке — получите готовую страницу')).toBeInTheDocument();
  });

  it('shows the first rotation example as placeholder when empty and unfocused', () => {
    render(<PromptInput />);
    expect(screen.getByPlaceholderText('Лендинг для HR-SaaS')).toBeInTheDocument();
  });

  it('rotates through examples in the placeholder', () => {
    vi.useFakeTimers();
    render(<PromptInput />);
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByPlaceholderText('Дашборд аналитики')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByPlaceholderText('Форма регистрации')).toBeInTheDocument();
  });

  it('switches to the static question as placeholder when focused', () => {
    render(<PromptInput />);
    const textarea = screen.getByRole('textbox', { name: 'Описание дизайна' });
    fireEvent.focus(textarea);
    expect(screen.getByPlaceholderText('Опишите, что создать...')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Лендинг для HR-SaaS')).toBeNull();
  });

  it('disables the Generate button when the prompt is empty', () => {
    render(<PromptInput />);
    expect(screen.getByRole('button', { name: 'Сгенерировать' })).toBeDisabled();
  });

  it('calls generate with the trimmed prompt and fixed dark/minimal', async () => {
    const user = userEvent.setup();
    render(<PromptInput />);
    await user.type(screen.getByRole('textbox', { name: 'Описание дизайна' }), '  Лендинг для HR  ');
    await user.click(screen.getByRole('button', { name: 'Сгенерировать' }));
    await waitFor(() => {
      expect(connectGenerateSSE).toHaveBeenCalledWith(
        'Лендинг для HR',
        'dark',
        'minimal',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  it('generates on Ctrl+Enter', async () => {
    const user = userEvent.setup();
    render(<PromptInput />);
    const textarea = screen.getByRole('textbox', { name: 'Описание дизайна' });
    await user.type(textarea, 'быстрый промпт');
    await user.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() => {
      expect(connectGenerateSSE).toHaveBeenCalledWith(
        'быстрый промпт',
        'dark',
        'minimal',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  it('enforces the 2000 character limit', () => {
    render(<PromptInput />);
    const textarea = screen.getByRole('textbox', { name: 'Описание дизайна' });
    fireEvent.change(textarea, { target: { value: 'x'.repeat(2000) } });
    expect(useAppStore.getState().prompt).toHaveLength(2000);
    // Input beyond the limit is rejected entirely (not truncated).
    fireEvent.change(textarea, { target: { value: 'x'.repeat(2001) } });
    expect(useAppStore.getState().prompt).toHaveLength(2000);
  });

  it('disables Generate while generating', () => {
    useAppStore.setState({ isGenerating: true });
    render(<PromptInput />);
    expect(screen.getByRole('button', { name: 'Сгенерировать' })).toBeDisabled();
  });

  it('shows the error alert and dismisses it', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ generationError: 'Что-то пошло не так' });
    render(<PromptInput />);
    expect(screen.getByRole('alert')).toHaveTextContent('Что-то пошло не так');
    await user.click(screen.getByRole('button', { name: 'Закрыть сообщение об ошибке' }));
    expect(useAppStore.getState().generationError).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
