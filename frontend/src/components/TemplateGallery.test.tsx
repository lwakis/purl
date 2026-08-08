import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateGallery from './TemplateGallery';
import { useAppStore } from '../store/appStore';
import type { PromptTemplate } from '../types';

const templates: PromptTemplate[] = [
  { id: 1, title: 'Лендинг стартапа', description: 'd1', prompt_text: 'p1', category: 'Landing', icon: '🚀' },
  { id: 2, title: 'Лендинг продукта', description: 'd2', prompt_text: 'p2', category: 'Landing', icon: '🛒' },
  { id: 3, title: 'Дашборд продаж', description: 'd3', prompt_text: 'p3', category: 'Dashboard', icon: '📊' },
  { id: 4, title: 'Дашборд аналитики', description: 'd4', prompt_text: 'p4', category: 'Dashboard', icon: '📈' },
  { id: 5, title: 'Форма регистрации', description: 'd5', prompt_text: 'p5', category: 'Form', icon: '📝' },
  { id: 6, title: 'Форма заявки', description: 'd6', prompt_text: 'p6', category: 'Form', icon: '✉️' },
  { id: 7, title: 'Промо-страница', description: 'd7', prompt_text: 'p7', category: 'Landing', icon: '🎉' },
  { id: 8, title: 'Панель метрик', description: 'd8', prompt_text: 'p8', category: 'Dashboard', icon: '📉' },
];

function renderGallery(overrides: Partial<Parameters<typeof TemplateGallery>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <TemplateGallery templates={templates} onSelect={onSelect} {...overrides} />
  );
  return { onSelect };
}

afterEach(() => {
  vi.restoreAllMocks();
  useAppStore.setState({ locale: 'ru' });
});

describe('TemplateGallery', () => {
  it('renders all 8 template cards', () => {
    renderGallery();
    expect(screen.getAllByRole('button')).toHaveLength(8 + 4 + 1); // cards + categories + refresh
    expect(screen.getByText('Лендинг стартапа')).toBeInTheDocument();
    expect(screen.getByText('Панель метрик')).toBeInTheDocument();
  });

  it('renders the category filter buttons', () => {
    renderGallery();
    for (const label of ['Все', 'Лендинг', 'Дашборд', 'Форма']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('filters templates by category', async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(screen.getByRole('button', { name: 'Лендинг' }));
    expect(screen.getByText('Лендинг стартапа')).toBeInTheDocument();
    expect(screen.queryByText('Дашборд продаж')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Форма' }));
    expect(screen.getByText('Форма регистрации')).toBeInTheDocument();
    expect(screen.queryByText('Лендинг стартапа')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Все' }));
    expect(screen.getByText('Лендинг стартапа')).toBeInTheDocument();
    expect(screen.getByText('Дашборд продаж')).toBeInTheDocument();
  });

  it('shows the empty category message when no templates match', async () => {
    const user = userEvent.setup();
    render(
      <TemplateGallery
        templates={templates.slice(0, 2)}
        onSelect={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Форма' }));
    expect(screen.getByText('Нет шаблонов в категории «Форма»')).toBeInTheDocument();
  });

  it('fires onSelect with the clicked template', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderGallery();
    await user.click(screen.getByText('Лендинг стартапа'));
    expect(onSelect).toHaveBeenCalledWith(templates[0]);
  });

  it('reloads the page on refresh button click', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    renderGallery();
    await user.click(screen.getByRole('button', { name: 'Обновить шаблоны' }));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('renders skeleton placeholders while loading', () => {
    renderGallery({ loading: true });
    expect(screen.queryByText('Лендинг стартапа')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.skeleton')).toHaveLength(8);
  });

  it('renders localized titles in the English locale', () => {
    useAppStore.setState({ locale: 'en' });
    renderGallery();
    expect(screen.getAllByText('SaaS Landing Page')).toHaveLength(3);
    expect(screen.getAllByText('Analytics Dashboard')).toHaveLength(3);
    expect(screen.getAllByText('Registration Form')).toHaveLength(2);
  });
});