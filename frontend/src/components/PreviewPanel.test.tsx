import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreviewPanel from './PreviewPanel';
import { useAppStore } from '../store/appStore';

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
});