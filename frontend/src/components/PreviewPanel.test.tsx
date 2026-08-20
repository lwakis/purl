import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PreviewPanel from './PreviewPanel';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { default: toast };
});

beforeEach(() => {
  vi.mocked(toast).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe('PreviewPanel', () => {
  it('shows the empty state when there is no code', () => {
    useAppStore.setState({ currentCode: '' });
    render(<PreviewPanel />);
    expect(screen.getByText('Ваш дизайн появится здесь')).toBeInTheDocument();
  });

  it('applies the selected preview size to the iframe container', () => {
    useAppStore.setState({ currentCode: '<html></html>', previewSize: 'tablet' });
    const { container } = render(<PreviewPanel />);
    const frame = container.querySelector('[data-testid="preview-iframe"]');
    expect(frame).not.toBeNull();
    const holder = frame?.parentElement as HTMLElement;
    expect(holder.style.maxWidth).toBe('768px');
  });

  it('renders the preview iframe only when code exists', () => {
    useAppStore.setState({ currentCode: '' });
    const { unmount } = render(<PreviewPanel />);
    expect(screen.queryByTestId('preview-iframe')).not.toBeInTheDocument();
    unmount();
    useAppStore.setState({ currentCode: '<html></html>' });
    render(<PreviewPanel />);
    expect(screen.getByTestId('preview-iframe')).toBeInTheDocument();
  });

  it('renders the error alert when generationError is set', () => {
    useAppStore.setState({ generationError: 'Сбой сети' });
    render(<PreviewPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent('Сбой сети');
  });

  it('shows the select-mode hint chip when selectMode is on', () => {
    useAppStore.setState({ currentCode: '<html></html>', selectMode: true });
    render(<PreviewPanel />);
    expect(screen.getByText('Нажмите на элемент в предпросмотре')).toBeInTheDocument();
  });

  it('hides the select-mode hint chip when selectMode is off', () => {
    useAppStore.setState({ currentCode: '<html></html>', selectMode: false });
    render(<PreviewPanel />);
    expect(screen.queryByText('Нажмите на элемент в предпросмотре')).not.toBeInTheDocument();
  });

  it('arms the select guard inside the iframe when selectMode turns on', () => {
    useAppStore.setState({ currentCode: '<html></html>', selectMode: false });
    const { rerender } = render(<PreviewPanel />);
    const iframe = screen.getByTestId('preview-iframe') as HTMLIFrameElement;
    const contentWindow = iframe.contentWindow;
    expect(contentWindow).not.toBeNull();
    const postMessageSpy = vi.spyOn(contentWindow!, 'postMessage');
    useAppStore.setState({ selectMode: true });
    rerender(<PreviewPanel />);
    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 'purl:select-toggle', active: true },
      '*',
    );
  });

  it('disarms the select guard inside the iframe when selectMode turns off', () => {
    useAppStore.setState({ currentCode: '<html></html>', selectMode: true });
    const { rerender } = render(<PreviewPanel />);
    const iframe = screen.getByTestId('preview-iframe') as HTMLIFrameElement;
    const contentWindow = iframe.contentWindow;
    expect(contentWindow).not.toBeNull();
    const postMessageSpy = vi.spyOn(contentWindow!, 'postMessage');
    useAppStore.setState({ selectMode: false });
    rerender(<PreviewPanel />);
    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 'purl:select-toggle', active: false },
      '*',
    );
  });

  it('stores the selected element and exits select mode on a purl:selected report', async () => {
    useAppStore.setState({ currentCode: '<html></html>', selectMode: true });
    render(<PreviewPanel />);

    window.postMessage(
      {
        type: 'purl:selected',
        element: {
          tag: 'button',
          id: 'cta',
          classes: ['btn', 'primary', 42],
          text: 'Go',
          selector: 'button#cta',
        },
      },
      '*',
    );

    await waitFor(() => {
      expect(useAppStore.getState().selectedElement).toEqual({
        tag: 'button',
        id: 'cta',
        classes: ['btn', 'primary'],
        text: 'Go',
        selector: 'button#cta',
      });
      expect(useAppStore.getState().selectMode).toBe(false);
    });
    expect(toast.success).toHaveBeenCalledWith('Элемент выбран');
  });

  it('normalizes a missing or non-string element id to null', async () => {
    useAppStore.setState({ currentCode: '<html></html>' });
    render(<PreviewPanel />);

    window.postMessage(
      {
        type: 'purl:selected',
        element: { tag: 'div', id: 123, classes: [], text: '', selector: 'div' },
      },
      '*',
    );

    await waitFor(() => {
      expect(useAppStore.getState().selectedElement).toEqual({
        tag: 'div',
        id: null,
        classes: [],
        text: '',
        selector: 'div',
      });
    });
  });

  it('ignores malformed purl:selected reports', () => {
    useAppStore.setState({ currentCode: '<html></html>', selectMode: true });
    render(<PreviewPanel />);

    window.postMessage({ type: 'purl:selected', element: null }, '*');
    window.postMessage(
      { type: 'purl:selected', element: { tag: 42, selector: 'x', text: 'y', classes: [] } },
      '*',
    );
    window.postMessage(
      { type: 'purl:selected', element: { tag: 'div', selector: 'x', text: 'y', classes: 'nope' } },
      '*',
    );
    window.postMessage({ type: 'purl:selected' }, '*');
    window.postMessage({ type: 'unrelated' }, '*');

    expect(useAppStore.getState().selectedElement).toBeNull();
    expect(useAppStore.getState().selectMode).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('toasts when the navigation guard reports a blocked link', async () => {
    useAppStore.setState({ currentCode: '<html></html>' });
    render(<PreviewPanel />);

    window.postMessage({ type: 'purl:navigation', href: '/internal', blocked: true }, '*');

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Внутренние ссылки в предпросмотре недоступны');
    });
  });

  it('toasts success when the navigation guard opens an external link', async () => {
    useAppStore.setState({ currentCode: '<html></html>' });
    render(<PreviewPanel />);

    window.postMessage({ type: 'purl:navigation', href: 'https://example.com', blocked: false }, '*');

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Ссылка открыта в новой вкладке');
    });
  });

  it('ignores navigation reports with a non-string href', () => {
    useAppStore.setState({ currentCode: '<html></html>' });
    render(<PreviewPanel />);

    window.postMessage({ type: 'purl:navigation', href: 123, blocked: true }, '*');
    window.postMessage({ type: 'purl:navigation' }, '*');

    expect(toast).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('commits streamed code to the preview only when generation settles', () => {
    useAppStore.setState({ currentCode: '<html>A</html>', isGenerating: false });
    const { rerender } = render(<PreviewPanel />);
    let iframe = screen.getByTestId('preview-iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('<html>A</html>');

    // While generating, new code must not replace the settled frame.
    useAppStore.setState({ currentCode: '<html>B</html>', isGenerating: true });
    rerender(<PreviewPanel />);
    iframe = screen.getByTestId('preview-iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('<html>A</html>');

    // Once generation settles, the frame develops.
    useAppStore.setState({ isGenerating: false });
    rerender(<PreviewPanel />);
    iframe = screen.getByTestId('preview-iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('<html>B</html>');
  });

  it('shows the generating overlay over an existing preview', () => {
    useAppStore.setState({ currentCode: '<html></html>', isGenerating: true });
    const { container } = render(<PreviewPanel />);
    expect(container.querySelectorAll('.loading-dot')).toHaveLength(3);
  });

  it('hides the generating overlay when there is no code to preview', () => {
    useAppStore.setState({ currentCode: '', isGenerating: true });
    const { container } = render(<PreviewPanel />);
    expect(container.querySelectorAll('.loading-dot')).toHaveLength(0);
  });

  it('remounts the iframe when the preview refresh key bumps', () => {
    useAppStore.setState({ currentCode: '<html></html>' });
    const { rerender } = render(<PreviewPanel />);
    const first = screen.getByTestId('preview-iframe');
    useAppStore.getState().bumpPreviewRefresh();
    rerender(<PreviewPanel />);
    const second = screen.getByTestId('preview-iframe');
    expect(second).not.toBe(first);
  });
});