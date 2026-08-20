import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodePanel from './CodePanel';
import { useAppStore } from '../store/appStore';

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});

vi.mock('react-syntax-highlighter', () => {
  const MockHighlighter = ({ children }: { children: string }) => (
    <pre>{children}</pre>
  );
  MockHighlighter.registerLanguage = vi.fn();
  return { PrismLight: MockHighlighter };
});

vi.mock('react-syntax-highlighter/dist/esm/languages/prism/markup', () => ({
  default: {},
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism/one-dark', () => ({
  default: {},
}));

import toast from 'react-hot-toast';

const CODE = '<html><body>Hello</body></html>';

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  useAppStore.setState({ currentCode: '' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CodePanel', () => {
  it('disables copy/download/react buttons without code', () => {
    render(<CodePanel />);
    expect(screen.getByRole('button', { name: /Копировать/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Скачать/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /React/ })).toBeDisabled();
    expect(screen.getByText('Сгенерированный код появится здесь')).toBeInTheDocument();
  });

  it('enables the toolbar buttons when code is present', () => {
    useAppStore.setState({ currentCode: CODE });
    render(<CodePanel />);
    expect(screen.getByRole('button', { name: /Копировать/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Скачать/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /React/ })).toBeEnabled();
  });

  it('copies the code to the clipboard and shows a success toast', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: /Копировать/ }));
    expect(writeText).toHaveBeenCalledWith(CODE);
    expect(toast.success).toHaveBeenCalledWith('Код скопирован в буфер обмена');
  });

  it('shows an error toast when the clipboard write fails', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: /Копировать/ }));
    expect(toast.error).toHaveBeenCalledWith('Не удалось скопировать код');
  });

  it('downloads the code as index.html via a temporary anchor', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: /Скачать/ }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(toast.success).toHaveBeenCalledWith('Скачивание начато');
  });

  it('shows the React export placeholder toast', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: /React/ }));
    expect(toast).toHaveBeenCalledWith('Экспорт в React скоро появится', { icon: '🚧' });
  });

  it('renders the code inside the syntax highlighter', () => {
    useAppStore.setState({ currentCode: CODE });
    render(<CodePanel />);
    expect(screen.getByText(CODE)).toBeInTheDocument();
  });
});