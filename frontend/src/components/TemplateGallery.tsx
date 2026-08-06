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
        <h2 className="text-sm font-semibold text-surface-200">Шаблоны</h2>
        <button
          onClick={handleRefresh}
          className="p-1 rounded-lg text-surface-400 hover:text-surface-300 hover:bg-surface-800 transition-colors"
          aria-label="Обновить шаблоны"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.value
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                : 'text-surface-400 bg-surface-800/50 border border-surface-700/50 hover:text-surface-200 hover:bg-surface-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-52 h-24 rounded-xl bg-surface-800/50 animate-pulse border border-surface-700/50"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <p className="text-surface-400 text-xs">Нет шаблонов в категории «{currentCategoryLabel}»</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {filteredTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className="flex-shrink-0 w-52 text-left glass-panel rounded-xl p-3.5 hover:bg-surface-700/60 hover:border-surface-600/50 transition-all border border-surface-700/50 group"
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
