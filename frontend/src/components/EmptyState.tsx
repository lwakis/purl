import { SparklesIcon } from '@heroicons/react/24/outline';
import { useT } from '../i18n';

export default function EmptyState() {
  const { t } = useT();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 animate-fade-in">
      <div className="w-14 h-14 rounded-xl bg-primary-600 flex items-center justify-center mb-5 shadow-cta">
        <SparklesIcon className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-surface-100 text-center text-balance mb-2.5">
        {t('empty.title')}
      </h1>
      <p className="text-sm text-surface-400 text-center max-w-md text-balance leading-relaxed">
        {t('empty.subtitle')}
      </p>
    </div>
  );
}
