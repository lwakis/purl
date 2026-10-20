import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodePanel from './CodePanel';
import { useAppStore } from '../store/appStore';
import type { Project } from '../types';

vi.mock('../services/api', () => ({
  exportReactProject: vi.fn(),
}));

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
import { exportReactProject } from '../services/api';

const CODE = '<html><body>Hello</body></html>';
const SEARCH_CODE = '<p>match</p><p>match</p><p>match</p>';
const SEARCH_TITLE = 'Найти в коде';
const SEARCH_PLACEHOLDER = 'Найти в коде…';

const PROJECT: Project = {
  id: 1,
  name: 'My Project',
  prompt: 'a landing page',
  current_code: CODE,
  session_id: 's1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(exportReactProject).mockReset();
  useAppStore.setState({ currentCode: '', currentProject: null, selectedModel: null });
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

  it('exports the code as a ready-to-run React project ZIP', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      currentCode: CODE,
      currentProject: PROJECT,
      selectedModel: 'openai:gpt-4o',
    });
    const zip = new Blob(['zip-bytes'], { type: 'application/zip' });
    vi.mocked(exportReactProject).mockResolvedValue(zip);
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const downloads: string[] = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });

    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: /React/ }));

    expect(exportReactProject).toHaveBeenCalledWith(CODE, 'openai:gpt-4o');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(zip);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(downloads).toEqual(['my-project.zip']);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(toast.success).toHaveBeenCalledWith('React-проект скачан');
  });

  it('shows an error toast when the React export fails', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    vi.mocked(exportReactProject).mockRejectedValue(new Error('boom'));

    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: /React/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('boom'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('disables the React button while the export is in flight', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: CODE });
    let resolveExport!: (value: Blob) => void;
    vi.mocked(exportReactProject).mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          resolveExport = resolve;
        }),
    );
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<CodePanel />);
    const button = screen.getByRole('button', { name: /React/ });
    await user.click(button);

    expect(button).toBeDisabled();

    await act(async () => {
      resolveExport(new Blob(['zip-bytes'], { type: 'application/zip' }));
    });

    await waitFor(() => expect(button).toBeEnabled());
  });

  it('renders the code inside the syntax highlighter', () => {
    useAppStore.setState({ currentCode: CODE });
    render(<CodePanel />);
    expect(screen.getByText(CODE)).toBeInTheDocument();
  });
});

describe('CodePanel find in code', () => {
  it('keeps the search toggle disabled with no code and enabled with code', () => {
    const { rerender } = render(<CodePanel />);
    expect(screen.getByRole('button', { name: SEARCH_TITLE })).toBeDisabled();
    expect(screen.queryByLabelText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();

    useAppStore.setState({ currentCode: CODE });
    rerender(<CodePanel />);
    expect(screen.getByRole('button', { name: SEARCH_TITLE })).toBeEnabled();
  });

  it('opens the find bar and focuses the input from the toolbar button', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);

    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));

    const input = screen.getByLabelText(SEARCH_PLACEHOLDER);
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(screen.getByRole('button', { name: SEARCH_TITLE })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('counts all matches for the query', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
    await user.type(screen.getByLabelText(SEARCH_PLACEHOLDER), 'match');

    expect(screen.getByText('1 из 3')).toBeInTheDocument();
  });

  it('navigates next and previous, wrapping at both ends', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
    await user.type(screen.getByLabelText(SEARCH_PLACEHOLDER), 'match');

    await user.click(screen.getByRole('button', { name: 'Следующее совпадение' }));
    expect(screen.getByText('2 из 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Следующее совпадение' }));
    expect(screen.getByText('3 из 3')).toBeInTheDocument();

    // wraps forward to the first
    await user.click(screen.getByRole('button', { name: 'Следующее совпадение' }));
    expect(screen.getByText('1 из 3')).toBeInTheDocument();

    // wraps backward to the last
    await user.click(screen.getByRole('button', { name: 'Предыдущее совпадение' }));
    expect(screen.getByText('3 из 3')).toBeInTheDocument();
  });

  it('steps with Enter and Shift+Enter', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
    await user.type(screen.getByLabelText(SEARCH_PLACEHOLDER), 'match');

    await user.keyboard('{Enter}');
    expect(screen.getByText('2 из 3')).toBeInTheDocument();

    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(screen.getByText('1 из 3')).toBeInTheDocument();
  });

  it('shows the no-results state for a query with no matches', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
    await user.type(screen.getByLabelText(SEARCH_PLACEHOLDER), 'zzz');

    expect(screen.getByText('Нет совпадений')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Следующее совпадение' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Предыдущее совпадение' })).toBeDisabled();
  });

  it('closes on Escape and returns focus to the toggle button', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    const toggle = screen.getByRole('button', { name: SEARCH_TITLE });
    await user.click(toggle);
    expect(screen.getByLabelText(SEARCH_PLACEHOLDER)).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByLabelText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('closes on the close button and returns focus to the toggle button', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    const toggle = screen.getByRole('button', { name: SEARCH_TITLE });
    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Закрыть поиск' }));

    expect(screen.queryByLabelText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it('recalculates matches and clamps the active index when the code shrinks', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
    await user.type(screen.getByLabelText(SEARCH_PLACEHOLDER), 'match');

    await user.click(screen.getByRole('button', { name: 'Следующее совпадение' }));
    await user.click(screen.getByRole('button', { name: 'Следующее совпадение' }));
    expect(screen.getByText('3 из 3')).toBeInTheDocument();

    act(() => {
      useAppStore.setState({ currentCode: '<p>match</p>' });
    });

    expect(screen.getByText('1 из 1')).toBeInTheDocument();
  });

  it('closes the bar when the code disappears', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
    expect(screen.getByLabelText(SEARCH_PLACEHOLDER)).toBeInTheDocument();

    act(() => {
      useAppStore.setState({ currentCode: '' });
    });

    expect(screen.queryByLabelText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
  });

  it('degrades gracefully without the CSS Custom Highlight API', async () => {
    // jsdom ships neither CSS.highlights nor Highlight — the fallback path
    // must still count and navigate without throwing.
    expect(
      (globalThis as { CSS?: { highlights?: unknown } }).CSS?.highlights,
    ).toBeUndefined();

    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
    await user.type(screen.getByLabelText(SEARCH_PLACEHOLDER), 'match');
    await user.click(screen.getByRole('button', { name: 'Следующее совпадение' }));

    expect(screen.getByText('2 из 3')).toBeInTheDocument();
  });

  it('registers ranges through the Custom Highlight API when available', async () => {
    const registry = new Map<string, unknown>();
    class HighlightStub {
      ranges: Range[];
      constructor(...ranges: Range[]) {
        this.ranges = ranges;
      }
    }
    const previousCSS = (globalThis as { CSS?: unknown }).CSS;
    vi.stubGlobal('Highlight', HighlightStub);
    (globalThis as { CSS?: unknown }).CSS = { highlights: registry };

    try {
      const user = userEvent.setup();
      useAppStore.setState({ currentCode: SEARCH_CODE });
      render(<CodePanel />);
      await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
      await user.type(screen.getByLabelText(SEARCH_PLACEHOLDER), 'match');

      expect(registry.has('purl-code-search')).toBe(true);
      expect(registry.has('purl-code-search-active')).toBe(true);
      const all = registry.get('purl-code-search') as HighlightStub;
      expect(all.ranges).toHaveLength(3);
    } finally {
      (globalThis as { CSS?: unknown }).CSS = previousCSS;
      vi.unstubAllGlobals();
    }
  });

  it('opens the find bar on Ctrl+F and focuses the input', async () => {
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    expect(screen.queryByLabelText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'f', ctrlKey: true });

    const input = screen.getByLabelText(SEARCH_PLACEHOLDER);
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('opens the find bar on Cmd+F', () => {
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    fireEvent.keyDown(document, { key: 'f', metaKey: true });
    expect(screen.getByLabelText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
  });

  it('opens and focuses the find bar on the purl:open-find window event', () => {
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    act(() => {
      window.dispatchEvent(new Event('purl:open-find'));
    });
    expect(screen.getByLabelText(SEARCH_PLACEHOLDER)).toHaveFocus();
  });

  it('does not open the find bar on Ctrl+F without code', () => {
    render(<CodePanel />);
    fireEvent.keyDown(document, { key: 'f', ctrlKey: true });
    expect(screen.queryByLabelText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
  });

  it('re-focuses the input on a repeated shortcut when the bar is already open', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: SEARCH_CODE });
    render(<CodePanel />);
    await user.click(screen.getByRole('button', { name: SEARCH_TITLE }));
    await user.type(screen.getByLabelText(SEARCH_PLACEHOLDER), 'ma');

    // Move focus elsewhere, then trigger the shortcut again.
    screen.getByRole('button', { name: SEARCH_TITLE }).focus();
    fireEvent.keyDown(document, { key: 'f', ctrlKey: true });

    expect(screen.getByLabelText(SEARCH_PLACEHOLDER)).toHaveFocus();
  });

  it('removes the shortcut listeners on unmount', () => {
    useAppStore.setState({ currentCode: SEARCH_CODE });
    const { unmount } = render(<CodePanel />);
    unmount();

    // Neither should reach the (now unmounted) component.
    fireEvent.keyDown(document, { key: 'f', ctrlKey: true });
    act(() => {
      window.dispatchEvent(new Event('purl:open-find'));
    });
    expect(screen.queryByLabelText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
  });
});
