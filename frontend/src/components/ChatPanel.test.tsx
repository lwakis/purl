import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPanel from './ChatPanel';
import { useAppStore } from '../store/appStore';
import type { ChatMessage } from '../types';

vi.mock('../services/sse', () => ({
  connectGenerateSSE: vi.fn(),
  connectIterateSSE: vi.fn(),
}));

import { connectIterateSSE } from '../services/sse';

beforeEach(() => {
  vi.mocked(connectIterateSSE).mockReset();
  vi.mocked(connectIterateSSE).mockResolvedValue(undefined);
  useAppStore.setState({
    currentCode: '<html>design</html>',
    sessionId: 's1',
    chatHistory: [],
    isGenerating: false,
  });
});

describe('ChatPanel', () => {
  it('prompts to create a design first when there is no code', () => {
    useAppStore.setState({ currentCode: '' });
    render(<ChatPanel />);
    expect(screen.getByText('Сначала создайте дизайн, затем обсуждайте правки')).toBeInTheDocument();
  });

  it('disables the send button but keeps the input enabled without code', () => {
    useAppStore.setState({ currentCode: '' });
    render(<ChatPanel />);
    expect(screen.getByRole('textbox', { name: 'Сообщение в чат' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();
  });

  it('sends a message and calls iterate with it', async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);
    await user.type(screen.getByRole('textbox', { name: 'Сообщение в чат' }), 'Сделай кнопки больше');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));

    await waitFor(() => {
      expect(connectIterateSSE).toHaveBeenCalledWith(
        's1',
        'Сделай кнопки больше',
        '<html>design</html>',
        expect.any(Array),
        expect.any(Object),
        expect.any(Object),
      );
    });
    expect(screen.getByText('Сделай кнопки больше')).toBeInTheDocument();
    expect(useAppStore.getState().chatHistory[0].content).toBe('Сделай кнопки больше');
  });

  it('renders existing chat history', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'Сделай тёмнее' },
      { role: 'assistant', content: 'Готово!' },
    ];
    useAppStore.setState({ chatHistory: history });
    render(<ChatPanel />);
    expect(screen.getByText('Сделай тёмнее')).toBeInTheDocument();
    expect(screen.getByText('Готово!')).toBeInTheDocument();
    expect(screen.getByText('1 итерация')).toBeInTheDocument();
  });

  it('hides the input when hideInput is set', () => {
    render(<ChatPanel hideInput />);
    expect(screen.queryByRole('textbox', { name: 'Сообщение в чат' })).not.toBeInTheDocument();
  });
});