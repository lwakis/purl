import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownTrayIcon,
  ClipboardIcon,
  CodeBracketIcon,
  EyeIcon,
  FolderIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { useGeneration } from '../hooks/useGeneration';
import { useT } from '../i18n';

type IconType = ComponentType<{ className?: string }>;

interface PaletteCommand {
  id: string;
  label: string;
  /** Hidden latin/ru terms so both keyboard layouts can find a command. */
  keywords: string[];
  icon: IconType;
  run: () => void;
}

// The hint chip shows the platform-correct modifier: macOS users expect ⌘.
const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? '');
const HOTKEY_LABEL = IS_MAC ? '⌘K' : 'Ctrl+K';

/**
 * Global command palette. Mounted once at the app root, so it is reachable from
 * the landing screen and the workspace alike. Ctrl/Cmd+K toggles it; every
 * command is a shortcut to an action the UI already exposes elsewhere.
 */
export default function CommandPalette() {
  const { t, locale } = useT();
  const { cancel } = useGeneration();

  const currentCode = useAppStore((s) => s.currentCode);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const setWorkspaceView = useAppStore((s) => s.setWorkspaceView);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const setLocale = useAppStore((s) => s.setLocale);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setCurrentCode = useAppStore((s) => s.setCurrentCode);
  const setPrompt = useAppStore((s) => s.setPrompt);
  const setChatHistory = useAppStore((s) => s.setChatHistory);
  const setSessionId = useAppStore((s) => s.setSessionId);
  const setPreset = useAppStore((s) => s.setPreset);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (id: string) => `${baseId}-opt-${id}`;

  const hasCode = currentCode.length > 0;

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  // Commands that can't run in the current state are simply left out — an
  // unavailable action is noise, not information.
  const commands = useMemo<PaletteCommand[]>(() => {
    const handleDownload = () => {
      if (!hasCode) return;
      const blob = new Blob([currentCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'index.html';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('code.downloadStarted'));
    };

    const handleCopy = async () => {
      if (!hasCode) return;
      try {
        await navigator.clipboard.writeText(currentCode);
        toast.success(t('code.copied'));
      } catch {
        toast.error(t('code.copyFailed'));
      }
    };

    const list: PaletteCommand[] = [
      {
        id: 'new-design',
        label: t('header.newDesign'),
        keywords: ['new', 'create', 'reset', 'landing', 'fresh', 'новый', 'создать', 'сброс'],
        icon: PlusIcon,
        run: () => {
          setCurrentProject(null);
          setCurrentCode('');
          setPrompt('');
          setChatHistory([]);
          setSessionId('');
          setPreset(null);
          setSidebarOpen(false);
        },
      },
      {
        id: 'projects',
        label: t('topbar.projectsAria'),
        keywords: ['projects', 'list', 'sidebar', 'panel', 'проекты', 'список', 'панель'],
        icon: FolderIcon,
        run: () => setSidebarOpen(true),
      },
    ];

    if (hasCode) {
      list.push(
        {
          id: 'preview',
          label: t('topbar.preview'),
          keywords: ['preview', 'view', 'предпросмотр', 'просмотр', 'результат'],
          icon: EyeIcon,
          run: () => setWorkspaceView('preview'),
        },
        {
          id: 'code',
          label: t('topbar.code'),
          keywords: ['code', 'source', 'html', 'код', 'исходник'],
          icon: CodeBracketIcon,
          run: () => setWorkspaceView('code'),
        },
        {
          id: 'find',
          label: t('code.searchTitle'),
          keywords: ['find', 'search', 'найти', 'поиск'],
          icon: MagnifyingGlassIcon,
          run: () => {
            setWorkspaceView('code');
            window.dispatchEvent(new CustomEvent('purl:open-find'));
          },
        },
        {
          id: 'download',
          label: t('code.downloadTitle'),
          keywords: ['download', 'export', 'save', 'скачать', 'загрузить', 'экспорт'],
          icon: ArrowDownTrayIcon,
          run: handleDownload,
        },
        {
          id: 'copy',
          label: t('code.copyTitle'),
          keywords: ['copy', 'clipboard', 'копировать', 'буфер'],
          icon: ClipboardIcon,
          run: handleCopy,
        },
      );
    }

    list.push({
      id: 'switch-language',
      label: t('header.switchLanguage'),
      keywords: ['language', 'locale', 'lang', 'язык', 'локализация', 'перевод'],
      icon: GlobeAltIcon,
      run: () => setLocale(locale === 'ru' ? 'en' : 'ru'),
    });

    if (isGenerating) {
      list.push({
        id: 'cancel',
        label: t('progress.cancel'),
        keywords: ['cancel', 'stop', 'abort', 'отмена', 'отменить', 'стоп'],
        icon: XMarkIcon,
        run: cancel,
      });
    }

    return list;
  }, [
    t,
    locale,
    hasCode,
    currentCode,
    isGenerating,
    cancel,
    setWorkspaceView,
    setSidebarOpen,
    setLocale,
    setCurrentProject,
    setCurrentCode,
    setPrompt,
    setChatHistory,
    setSessionId,
    setPreset,
  ]);

  // Case-insensitive substring match on the localized label or a hidden keyword.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(q) || command.keywords.some((k) => k.includes(q)),
    );
  }, [commands, query]);

  // activeIndex is kept within bounds so a shrinking list never strands the
  // highlight past the last row.
  const safeActive = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1);

  // A new query restarts selection at the top.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // On open: clear the query and move focus into the input.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    inputRef.current?.focus();
  }, [open]);

  // Ctrl/Cmd+K toggles the palette from anywhere in the app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Escape closes while the palette is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const select = useCallback(
    (command: PaletteCommand) => {
      close();
      command.run();
    },
    [close],
  );

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((safeActive + 1) % filtered.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((safeActive - 1 + filtered.length) % filtered.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(filtered.length - 1);
        break;
      case 'Enter': {
        event.preventDefault();
        const command = filtered[safeActive];
        if (command) select(command);
        break;
      }
      default:
        break;
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div
        data-testid="palette-backdrop"
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 bg-surface-950/70 animate-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.title')}
        className="relative flex flex-col w-full max-w-lg rounded-xl border border-line bg-surface-900 shadow-overlay animate-slide-up overflow-hidden"
      >
        <div className="flex items-center gap-3 h-12 px-4 border-b border-line">
          <MagnifyingGlassIcon className="w-4 h-4 shrink-0 text-surface-500" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={
              filtered.length > 0 ? optionId(filtered[safeActive].id) : undefined
            }
            aria-autocomplete="list"
            aria-label={t('palette.placeholder')}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('palette.placeholder')}
            className="flex-1 min-w-0 bg-transparent text-sm text-surface-100 placeholder:text-surface-500 outline-none"
          />
          <kbd className="exposure-label shrink-0 rounded border border-line px-1.5 py-0.5 text-surface-500">
            {HOTKEY_LABEL}
          </kbd>
        </div>

        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('palette.title')}
          className="max-h-[min(60vh,22rem)] overflow-y-auto p-1.5"
        >
          {filtered.map((command, index) => {
            const Icon = command.icon;
            const active = index === safeActive;
            return (
              <li
                key={command.id}
                id={optionId(command.id)}
                role="option"
                aria-selected={active}
                data-testid={`palette-option-${command.id}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(command)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer border-l-2 transition-colors ${
                  active
                    ? 'bg-primary-600/10 text-surface-100 border-primary-500'
                    : 'text-surface-300 border-transparent hover:bg-surface-800 hover:text-surface-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-primary-400' : 'text-surface-500'}`}
                />
                <span className="truncate">{command.label}</span>
              </li>
            );
          })}
        </ul>

        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-surface-400">{t('palette.empty')}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
