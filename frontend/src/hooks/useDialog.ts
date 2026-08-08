import { useEffect, useRef } from 'react';

interface UseDialogOptions {
  open: boolean;
  onClose: () => void;
  dialogRef: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog a11y: focus moves into the dialog on open, Tab cycles inside
 * (focus trap), Escape closes, and focus returns to the trigger on close.
 */
export function useDialog({ open, onClose, dialogRef }: UseDialogOptions) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled'),
    );
    const first = focusables[0] ?? dialog;
    const last = focusables[focusables.length - 1] ?? dialog;
    first.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose, dialogRef]);
}
