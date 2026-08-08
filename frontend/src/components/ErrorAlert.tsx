import { XMarkIcon } from '@heroicons/react/24/outline';

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-2 bg-status-error/10 border border-status-error rounded-lg px-3.5 py-2.5 text-sm text-status-error animate-fade-in shadow-overlay"
    >
      <span className="flex-1 leading-relaxed">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Закрыть сообщение об ошибке"
        className="p-0.5 rounded-md text-status-error/70 hover:text-status-error hover:bg-status-error/10 transition-colors flex-shrink-0 focus-ring"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
