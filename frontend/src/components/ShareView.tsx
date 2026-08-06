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
          className="generation-gradient text-white font-medium px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25 text-sm"
        >
          Открыть Purl
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col">
      <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-surface-700/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg generation-gradient flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Purl</span>
        </div>
        <a
          href="/"
          className="text-sm font-medium text-surface-300 hover:text-surface-100 px-3 py-1.5 rounded-lg hover:bg-surface-800 transition-colors"
        >
          Открыть в Purl
        </a>
      </header>
      <main className="flex-1 flex flex-col p-4 lg:p-6 min-h-0">
        <h1 className="text-lg font-semibold text-surface-100 mb-4">{state.name}</h1>
        <div className="flex-1 bg-surface-900/50 rounded-xl border border-surface-700/50 overflow-hidden min-h-[300px]">
          {state.html ? (
            <iframe
              srcDoc={state.html}
              sandbox="allow-scripts"
              title="Shared Design Preview"
              className="w-full h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-surface-400 text-sm">
              В этом дизайне нет содержимого
            </div>
          )}
        </div>
      </main>
    </div>
  );
}