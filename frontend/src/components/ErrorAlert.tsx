import { XMarkIcon } from '@heroicons/react/24/outline';

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2.5 text-sm text-red-300 animate-fade-in"
    >
      <span className="flex-1 leading-relaxed">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Закрыть сообщение об ошибке"
        className="p-0.5 rounded-md text-red-300/70 hover:text-red-200 hover:bg-red-500/10 transition-colors flex-shrink-0"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
