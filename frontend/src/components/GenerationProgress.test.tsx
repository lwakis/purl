import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenerationProgress from './GenerationProgress';
import { useAppStore } from '../store/appStore';

describe('GenerationProgress', () => {
  it('renders nothing when not generating', () => {
    useAppStore.setState({ isGenerating: false });
    const { container } = render(<GenerationProgress />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the generation status text and stage labels', () => {
    useAppStore.setState({ isGenerating: true, generationStatus: 'Анализирую промпт...' });
    render(<GenerationProgress />);
    expect(screen.getByText('Анализирую промпт...')).toBeInTheDocument();
    expect(screen.getByText('Анализ промпта')).toBeInTheDocument();
    expect(screen.getByText('Разработка дизайна')).toBeInTheDocument();
    expect(screen.getByText('Генерация кода')).toBeInTheDocument();
  });

  it('cancels generation via the cancel button', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ isGenerating: true, generationStatus: 'Генерирую код...' });
    render(<GenerationProgress />);
    await user.click(screen.getByRole('button', { name: 'Отменить генерацию' }));
    expect(useAppStore.getState().isGenerating).toBe(false);
    expect(useAppStore.getState().generationStatus).toBe('');
  });
});