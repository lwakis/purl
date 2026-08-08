import { useState, useCallback } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import type { PromptTemplate } from '../types';

interface TemplateGalleryProps {
  templates: PromptTemplate[];
  loading?: boolean;
  onSelect: (template: PromptTemplate) => void;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Все', value: 'All' },
  { label: 'Лендинг', value: 'Landing' },
  { label: 'Дашборд', value: 'Dashboard' },
  { label: 'Форма', value: 'Form' },
];

export default function TemplateGallery({
  templates,
  loading,
  onSelect,
}: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTemplates =
    activeCategory === 'All'
      ? templates
      : templates.filter(
          (t) => t.category?.toLowerCase() === activeCategory.toLowerCase()
        );

  const currentCategoryLabel = CATEGORIES.find((c) => c.value === activeCategory)?.label || 'Все';

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-surface-200">Шаблоны</h2>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-md text-surface-400 hover:text-surface-100 hover:bg-white/5 active:scale-95 transition-colors focus-ring"
          aria-label="Обновить шаблоны"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors focus-ring ${
              activeCategory === cat.value
                ? 'bg-surface-700 text-surface-100'
                : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 60}ms` }}
              className="h-28 rounded-lg skeleton animate-fade-in"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <p className="text-surface-400 text-xs">Нет шаблонов в категории «{currentCategoryLabel}»</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {filteredTemplates.map((tpl, i) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              style={{ animationDelay: `${i * 60}ms` }}
              className="w-full text-left rounded-lg bg-surface-800/60 border border-line p-3.5 hover:border-line-strong hover:bg-surface-800 transition-colors group focus-ring animate-fade-in"
            >
              <div className="text-xl mb-2">{tpl.icon || '#'}</div>
              <h3 className="text-sm font-medium text-surface-200 group-hover:text-surface-100 transition-colors">
                {tpl.title}
              </h3>
              <p className="text-xs text-surface-400 mt-1 line-clamp-2">
                {tpl.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
