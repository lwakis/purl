import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorAlert from './ErrorAlert';

describe('ErrorAlert', () => {
  it('renders the error message', () => {
    render(<ErrorAlert message="Ошибка генерации" onDismiss={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Ошибка генерации');
  });

  it('fires onDismiss when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorAlert message="Ошибка" onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: 'Закрыть сообщение об ошибке' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});