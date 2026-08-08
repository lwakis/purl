import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the hero heading and description', () => {
    render(<EmptyState />);
    expect(
      screen.getByRole('heading', { name: 'Создайте дизайн по текстовому описанию' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Опишите, что вам нужно/)).toBeInTheDocument();
  });
});