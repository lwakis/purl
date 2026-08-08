import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewPanel from './PreviewPanel';
import { useAppStore } from '../store/appStore';

describe('PreviewPanel', () => {
  it('shows the empty state when there is no code', () => {
    useAppStore.setState({ currentCode: '' });
    render(<PreviewPanel />);
    expect(screen.getByText('Ваш дизайн появится здесь')).toBeInTheDocument();
  });

  it('switches preview size via the device toggle buttons', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ currentCode: '<html></html>' });
    render(<PreviewPanel />);
    await user.click(screen.getByRole('button', { name: 'Предпросмотр: tablet' }));
    expect(useAppStore.getState().previewSize).toBe('tablet');
    await user.click(screen.getByRole('button', { name: 'Предпросмотр: mobile' }));
    expect(useAppStore.getState().previewSize).toBe('mobile');
    await user.click(screen.getByRole('button', { name: 'Предпросмотр: desktop' }));
    expect(useAppStore.getState().previewSize).toBe('desktop');
  });

  it('shows the refresh button only when code exists', () => {
    useAppStore.setState({ currentCode: '' });
    const { unmount } = render(<PreviewPanel />);
    expect(screen.queryByRole('button', { name: 'Обновить предпросмотр' })).not.toBeInTheDocument();
    unmount();
    useAppStore.setState({ currentCode: '<html></html>' });
    render(<PreviewPanel />);
    expect(screen.getByRole('button', { name: 'Обновить предпросмотр' })).toBeInTheDocument();
  });

  it('renders the error alert when generationError is set', () => {
    useAppStore.setState({ generationError: 'Сбой сети' });
    render(<PreviewPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent('Сбой сети');
  });
});