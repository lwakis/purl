import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptInput from './PromptInput';
import { useAppStore } from '../store/appStore';

vi.mock('../services/sse', () => ({
  connectGenerateSSE: vi.fn(),
  connectIterateSSE: vi.fn(),
}));

vi.mock('../services/api', () => ({
  enhancePrompt: vi.fn(),
  getUsage: vi.fn(),
  saveProjectVersion: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { connectGenerateSSE } from '../services/sse';
import { enhancePrompt } from '../services/api';
import toast from 'react-hot-toast';

beforeEach(() => {
  vi.mocked(connectGenerateSSE).mockReset();
  vi.mocked(connectGenerateSSE).mockResolvedValue(undefined);
  vi.mocked(enhancePrompt).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.success).mockReset();
  // Each test starts from a clean prompt/generation slice.
  useAppStore.setState({
    prompt: '',
    isGenerating: false,
    generationError: null,
    selectedModel: null,
  });
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

  it('disables the Improve button when the prompt is empty', () => {
    render(<PromptInput />);
    expect(screen.getByRole('button', { name: 'Улучшить промпт' })).toBeDisabled();
  });

  it('disables the Improve button while generating', () => {
    useAppStore.setState({ prompt: 'Лендинг', isGenerating: true });
    render(<PromptInput />);
    expect(screen.getByRole('button', { name: 'Улучшить промпт' })).toBeDisabled();
  });

  it('calls enhancePrompt with the trimmed prompt and the selected model', async () => {
    const user = userEvent.setup();
    vi.mocked(enhancePrompt).mockResolvedValue('обогащённый промпт');
    useAppStore.setState({ prompt: '  лендинг для HR  ', selectedModel: 'openai:gpt-4o' });
    render(<PromptInput />);

    await user.click(screen.getByRole('button', { name: 'Улучшить промпт' }));

    await waitFor(() => {
      expect(enhancePrompt).toHaveBeenCalledWith('лендинг для HR', 'openai:gpt-4o');
    });
  });

  it('replaces the prompt with the result, keeps focus and does not generate', async () => {
    const user = userEvent.setup();
    vi.mocked(enhancePrompt).mockResolvedValue('Богатый промпт');
    useAppStore.setState({ prompt: 'лендинг' });
    render(<PromptInput />);

    await user.click(screen.getByRole('button', { name: 'Улучшить промпт' }));

    await waitFor(() => expect(useAppStore.getState().prompt).toBe('Богатый промпт'));
    const textarea = screen.getByRole('textbox', { name: 'Описание дизайна' });
    expect(textarea).toHaveValue('Богатый промпт');
    expect(textarea).toHaveFocus();
    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(connectGenerateSSE).not.toHaveBeenCalled();
  });

  it('shows the localized error toast on failure and keeps the original prompt', async () => {
    const user = userEvent.setup();
    vi.mocked(enhancePrompt).mockRejectedValue(new Error('llm_provider_error'));
    useAppStore.setState({ prompt: 'исходный промпт' });
    render(<PromptInput />);

    await user.click(screen.getByRole('button', { name: 'Улучшить промпт' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Не удалось улучшить промпт'));
    expect(useAppStore.getState().prompt).toBe('исходный промпт');
  });

  it('shows the improving state and ignores a second click while pending', async () => {
    const user = userEvent.setup();
    let resolveEnhance: (value: string) => void = () => {};
    vi.mocked(enhancePrompt).mockReturnValue(
      new Promise<string>((resolve) => {
        resolveEnhance = resolve;
      }),
    );
    useAppStore.setState({ prompt: 'лендинг' });
    render(<PromptInput />);

    const button = screen.getByTestId('improve-button');
    await user.click(button);
    await user.click(button);

    expect(enhancePrompt).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Улучшаю…')).toBeInTheDocument();

    await act(async () => {
      resolveEnhance('готово');
    });
    await waitFor(() => expect(useAppStore.getState().prompt).toBe('готово'));
    expect(screen.getByTestId('improve-button')).toHaveAttribute('aria-busy', 'false');
  });
});
