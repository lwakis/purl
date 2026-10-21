import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TokenGate from './TokenGate';

function setup(onSubmit: (token: string) => Promise<void> = async () => {}) {
  render(<TokenGate onSubmit={onSubmit} />);
  return {
    onSubmit,
    input: screen.getByLabelText('Токен'),
    submit: screen.getByRole('button', { name: 'Войти' }),
  };
}

describe('TokenGate', () => {
  it('renders the title and the token field', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Токен инстанса' })).toBeInTheDocument();
    expect(screen.getByLabelText('Токен')).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText('Вставьте токен инстанса')).toBeInTheDocument();
  });

  it('submits the token with surrounding whitespace trimmed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(token: string) => Promise<void>>(async () => {});
    setup(onSubmit);

    await user.type(screen.getByLabelText('Токен'), '  secret-token  ');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('secret-token');
  });

  it('submits when Enter is pressed in the field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(token: string) => Promise<void>>(async () => {});
    setup(onSubmit);

    await user.type(screen.getByLabelText('Токен'), 'secret-token{Enter}');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('secret-token'));
  });

  it('disables the field and the button while the request is pending', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const onSubmit = vi.fn<(token: string) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    setup(onSubmit);

    const input = screen.getByLabelText('Токен');
    await user.type(input, 'secret-token');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(input).toBeDisabled();
    const pendingButton = screen.getByRole('button', { name: 'Проверяю…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      release();
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled());
  });

  it('shows the rejection message and keeps the token for a retry', async () => {
    const user = userEvent.setup();
    const { input } = setup(
      vi.fn<(token: string) => Promise<void>>(async () => {
        throw new Error('Токен не подошёл');
      }),
    );

    await user.type(input, 'wrong-token');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Токен не подошёл');
    expect(input).toHaveValue('wrong-token');
    expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled();
  });

  it('clears the error once the token is edited', async () => {
    const user = userEvent.setup();
    setup(
      vi.fn<(token: string) => Promise<void>>(async () => {
        throw new Error('Токен не подошёл');
      }),
    );

    const input = screen.getByLabelText('Токен');
    await user.type(input, 'wrong-token');
    await user.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(input, 'x');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps submit disabled while the field is empty or whitespace-only', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(token: string) => Promise<void>>(async () => {});
    setup(onSubmit);

    expect(screen.getByRole('button', { name: 'Войти' })).toBeDisabled();

    await user.type(screen.getByLabelText('Токен'), '   ');
    expect(screen.getByRole('button', { name: 'Войти' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
