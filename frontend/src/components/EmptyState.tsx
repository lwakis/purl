import { SparklesIcon } from '@heroicons/react/24/outline';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in">
      <div className="w-20 h-20 rounded-2xl generation-gradient flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20">
        <SparklesIcon className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-surface-100 text-center text-balance mb-3">
        Создайте дизайн по текстовому описанию
      </h1>
      <p className="text-surface-400 text-center max-w-md text-balance text-lg leading-relaxed">
        Опишите, что вам нужно — и получите готовый HTML/CSS дизайн за секунды.
        Уточняйте его в диалоге.
      </p>
    </div>
  );
}
