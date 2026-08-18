import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useT } from '../i18n';

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  const { t } = useT();

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg bg-surface-800 border border-line border-l-2 border-l-status-error/50 px-3.5 py-3 text-sm animate-fade-in shadow-overlay"
    >
      <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 text-status-error flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-surface-100 font-medium">{t('errors.title')}</p>
        <p className="text-surface-300 leading-relaxed mt-0.5 break-words">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        aria-label={t('common.dismissError')}
        className="p-1.5 rounded-md bg-surface-900 border border-line text-surface-300 hover:text-surface-100 hover:border-line-strong transition-colors flex-shrink-0 focus-ring"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
