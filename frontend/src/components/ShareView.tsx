import { useEffect, useState } from 'react';
import { getSharedProject } from '../services/api';

interface ShareViewProps {
  code: string;
}

interface ShareViewState {
  loading: boolean;
  error: string | null;
  name: string;
  html: string;
}

export default function ShareView({ code }: ShareViewProps) {
  const [state, setState] = useState<ShareViewState>({
    loading: true,
    error: null,
    name: '',
    html: '',
  });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, name: '', html: '' });

    getSharedProject(code)
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          name: data.name,
          html: data.code || '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, error: 'Ссылка недействительна или истекла', name: '', html: '' });
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-surface-950 text-surface-100 flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold text-surface-200">Дизайн не найден</h1>
        <p className="text-surface-400 text-sm">{state.error}</p>
        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary-600 font-medium text-white text-sm transition-all hover:bg-primary-500 active:scale-[0.98] focus-ring"
        >
          Открыть Purl
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col">
      <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-line-subtle">
        <div className="flex items-center gap-2">
          <img src="/purl-mark.svg" alt="Purl" className="w-7 h-7" />
          <span className="font-semibold text-lg tracking-tight">Purl</span>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-white/5 transition-colors focus-ring active:scale-[0.98]"
        >
          Открыть в Purl
        </a>
      </header>
      <main className="flex-1 flex flex-col p-4 lg:p-6 min-h-0">
        <h1 className="text-lg font-semibold text-surface-100 mb-4">{state.name}</h1>
        <div className="flex-1 bg-white rounded-lg ring-1 ring-black/40 shadow-canvas overflow-hidden min-h-[300px]">
          {state.html ? (
            <iframe
              srcDoc={state.html}
              sandbox="allow-scripts"
              title="Shared Design Preview"
              className="w-full h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-surface-600 text-sm">
              В этом дизайне нет содержимого
            </div>
          )}
        </div>
      </main>
    </div>
  );
}