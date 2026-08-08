import { SparklesIcon } from '@heroicons/react/24/outline';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 animate-fade-in">
      <div className="w-14 h-14 rounded-xl bg-primary-600 flex items-center justify-center mb-5 shadow-cta">
        <SparklesIcon className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-surface-100 text-center text-balance mb-2.5">
        Создайте дизайн по текстовому описанию
      </h1>
      <p className="text-sm text-surface-400 text-center max-w-md text-balance leading-relaxed">
        Опишите, что вам нужно — и получите готовый HTML/CSS дизайн за секунды.
        Уточняйте его в диалоге.
      </p>
    </div>
  );
}
