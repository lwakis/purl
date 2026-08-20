import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownMessage from './MarkdownMessage';

describe('MarkdownMessage', () => {
  it('renders plain paragraphs', () => {
    render(<MarkdownMessage content="Простой текст абзаца" />);
    expect(screen.getByText('Простой текст абзаца')).toBeInTheDocument();
  });

  it('renders headings of all levels', () => {
    render(
      <MarkdownMessage
        content={'# Заголовок 1\n\n## Заголовок 2\n\n### Заголовок 3\n\n#### Заголовок 4'}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Заголовок 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Заголовок 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Заголовок 3' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Заголовок 4' })).toBeInTheDocument();
  });

  it('renders bold and italic emphasis', () => {
    const { container } = render(<MarkdownMessage content="**жирный** и *курсив*" />);
    expect(screen.getByText('жирный')).toBeInTheDocument();
    expect(screen.getByText('курсив')).toBeInTheDocument();
    expect(container.querySelector('strong')).not.toBeNull();
    expect(container.querySelector('em')).not.toBeNull();
  });

  it('renders unordered and ordered lists', () => {
    const { container } = render(
      <MarkdownMessage content={'- первый\n- второй\n\n1. один\n2. два'} />,
    );
    expect(screen.getByText('первый')).toBeInTheDocument();
    expect(screen.getByText('второй')).toBeInTheDocument();
    expect(screen.getByText('один')).toBeInTheDocument();
    expect(screen.getByText('два')).toBeInTheDocument();
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelector('ol')).not.toBeNull();
  });

  it('renders inline code and fenced code blocks', () => {
    const { container } = render(
      <MarkdownMessage content={'Инлайн `const a = 1;`\n\n```js\nconst b = 2;\n```'} />,
    );
    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
    const block = container.querySelector('pre code.language-js');
    expect(block).not.toBeNull();
    expect(block).toHaveTextContent('const b = 2;');
  });

  it('renders links, blockquotes and horizontal rules', () => {
    const { container } = render(
      <MarkdownMessage content={'[Ссылка](https://example.com)\n\n> Цитата\n\n---'} />,
    );
    const link = screen.getByRole('link', { name: 'Ссылка' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('Цитата')).toBeInTheDocument();
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('renders GFM tables', () => {
    const { container } = render(
      <MarkdownMessage content={'| Имя | Возраст |\n| --- | --- |\n| Анна | 30 |'} />,
    );
    expect(container.querySelector('table')).not.toBeNull();
    expect(screen.getByText('Имя')).toBeInTheDocument();
    expect(screen.getByText('Анна')).toBeInTheDocument();
    expect(container.querySelector('th')).not.toBeNull();
    expect(container.querySelector('td')).not.toBeNull();
  });
});