import { useEffect, useId, useRef, useState } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useT } from '../i18n';

interface TokenGateProps {
  onSubmit: (token: string) => Promise<void>;
}

/**
 * The lock on a protected instance. A single field, one action, and the
 * safelight glow of the darkroom — nothing to browse, nothing to sell.
 */
export default function TokenGate({ onSubmit }: TokenGateProps) {
  const { t } = useT();
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const [token, setToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A failed unlock never needs to outlive the screen.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canSubmit = token.trim().length > 0 && !pending;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setToken(event.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = token.trim();
    if (!value || pending) return;

    setPending(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : t('gate.invalidToken'));
    } finally {
      if (mountedRef.current) setPending(false);
    }
  };

  return (
    <main className="relative h-dvh w-full overflow-y-auto bg-surface-950">
      {/* Safelight spill from above: atmosphere, not decoration. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(240,106,82,0.07),transparent_70%)]"
      />

      <div className="relative flex min-h-full items-center justify-center px-5 py-10 sm:px-6">
        <div className="w-full max-w-[21rem] animate-slide-up">
          {/* An exposure marker: one lit dot on a hairline. */}
          <div aria-hidden="true" className="mb-9 flex items-center gap-3">
            <span className="relative flex h-1.5 w-1.5 items-center justify-center">
              <span className="absolute h-4 w-4 rounded-full bg-primary-500/20 blur-[6px]" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-primary-500" />
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <h1 className="text-balance text-2xl font-semibold tracking-tight text-surface-100">
            {t('gate.title')}
          </h1>
          <p className="mt-2.5 text-balance text-sm leading-relaxed text-surface-400">
            {t('gate.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor={inputId} className="exposure-label mb-2 block text-surface-500">
                {t('gate.label')}
              </label>
              <input
                id={inputId}
                name="token"
                type="password"
                value={token}
                onChange={handleChange}
                placeholder={t('gate.placeholder')}
                autoFocus
                autoComplete="current-password"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={pending}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className="h-11 w-full rounded-lg border border-line bg-surface-900 px-3.5 text-sm text-surface-100 transition-[border-color,box-shadow] duration-150 placeholder:text-surface-500 hover:border-line-strong focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {error && (
              <div
                id={errorId}
                role="alert"
                className="flex animate-fade-in items-start gap-2.5 rounded-lg border border-status-error/25 bg-status-error/[0.06] px-3 py-2.5 text-sm leading-relaxed text-surface-200"
              >
                <ExclamationCircleIcon
                  className="mt-px h-4 w-4 flex-shrink-0 text-status-error"
                  aria-hidden="true"
                />
                <span className="break-words">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              aria-busy={pending}
              className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-ring ${
                pending
                  ? 'cursor-progress bg-primary-600/80 text-surface-50 shadow-cta'
                  : canSubmit
                    ? 'bg-primary-600 text-surface-50 shadow-cta hover:bg-primary-500 active:scale-[0.99]'
                    : 'cursor-not-allowed border border-line bg-surface-800 text-surface-500'
              }`}
            >
              {pending && (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              )}
              {pending ? t('gate.submitting') : t('gate.submit')}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
