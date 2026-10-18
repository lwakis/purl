import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import {
  ClipboardIcon,
  ArrowDownTrayIcon,
  CodeBracketIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { useT } from '../i18n';
import { clampMatchIndex, findMatches, nextMatchIndex, prevMatchIndex } from '../utils/findMatches';

// Register only the markup grammar — it covers HTML (alias) and keeps the
// lazily-loaded CodePanel chunk far smaller than the full Prism bundle.
SyntaxHighlighter.registerLanguage('markup', markup);

// Warm "darkroom" token palette for Prism — safelight-warm, no cold blues or
// purples. The container background is forced by .syntax-highlighter-override,
// so the theme only carries token colors. All values clear 4.5:1 on surface-900.
const darkroomPrismTheme = {
  'code[class*="language-"]': { color: '#D9D4CB', background: 'transparent' },
  'pre[class*="language-"]': { color: '#D9D4CB', background: 'transparent' },
  comment: { color: '#857F74' },
  prolog: { color: '#857F74' },
  doctype: { color: '#857F74' },
  cdata: { color: '#857F74' },
  punctuation: { color: '#8F897E' },
  property: { color: '#F1EDE6' },
  tag: { color: '#FFB3A5' },
  boolean: { color: '#E8B34B' },
  number: { color: '#E8B34B' },
  constant: { color: '#E8B34B' },
  symbol: { color: '#E8B34B' },
  deleted: { color: '#F2555A' },
  selector: { color: '#E8B34B' },
  'attr-name': { color: '#E8B34B' },
  string: { color: '#A9B465' },
  char: { color: '#A9B465' },
  builtin: { color: '#F1EDE6' },
  inserted: { color: '#4CB05E' },
  operator: { color: '#8F897E' },
  entity: { color: '#FFB3A5' },
  url: { color: '#A9B465' },
  variable: { color: '#F1EDE6' },
  atrule: { color: '#E8B34B' },
  'attr-value': { color: '#A9B465' },
  function: { color: '#F1EDE6' },
  'class-name': { color: '#F1EDE6' },
  keyword: { color: '#FFB3A5' },
  regex: { color: '#E0A03E' },
  important: { color: '#FFB3A5', fontWeight: 'bold' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  namespace: { color: '#8F897E' },
};

// --- Find-in-code highlighting -------------------------------------------
//
// Visual emphasis uses the CSS Custom Highlight API: matches are painted over
// the *existing* syntax-highlighter text via ::highlight() pseudo-elements,
// so no tags are injected and the highlighted markup is never re-rendered.
// The API is feature-detected — where it is missing (e.g. jsdom, older
// engines) the bar still works and simply scrolls to the active match.

const HIGHLIGHT_ALL = 'purl-code-search';
const HIGHLIGHT_ACTIVE = 'purl-code-search-active';

interface HighlightRegistryLike {
  set(name: string, value: unknown): void;
  delete(name: string): void;
}

type HighlightConstructor = new (...ranges: Range[]) => unknown;

function getHighlightRegistry(): HighlightRegistryLike | undefined {
  const css = (globalThis as unknown as { CSS?: { highlights?: HighlightRegistryLike } }).CSS;
  return css?.highlights;
}

function getHighlightConstructor(): HighlightConstructor | undefined {
  return (globalThis as unknown as { Highlight?: HighlightConstructor }).Highlight;
}

const CAN_HIGHLIGHT = Boolean(getHighlightRegistry() && getHighlightConstructor());

const HIGHLIGHT_STYLES = `::highlight(${HIGHLIGHT_ALL}) { background-color: rgba(240, 106, 82, 0.2); }
::highlight(${HIGHLIGHT_ACTIVE}) { background-color: rgba(240, 106, 82, 0.52); }`;

interface TextSpan {
  node: Text;
  start: number;
  end: number;
}

// Concatenate the rendered text nodes in document order and remember each
// node's offset, so source-level match offsets can be mapped back onto ranges.
// Line-number gutters are skipped: they are chrome, not code.
function collectTextSpans(root: Node): TextSpan[] {
  const spans: TextSpan[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    const isGutter = node.parentElement?.classList.contains('react-syntax-highlighter-line-number');
    const value = node.nodeValue ?? '';
    if (!isGutter && value.length > 0) {
      spans.push({ node, start: offset, end: offset + value.length });
      offset += value.length;
    }
    current = walker.nextNode();
  }
  return spans;
}

function rangeForMatch(spans: TextSpan[], start: number, end: number): Range | null {
  const startSpan = spans.find((span) => start >= span.start && start < span.end);
  const endSpan = spans.find((span) => end > span.start && end <= span.end);
  if (!startSpan || !endSpan) return null;
  const range = document.createRange();
  range.setStart(startSpan.node, start - startSpan.start);
  range.setEnd(endSpan.node, end - endSpan.start);
  return range;
}

// Nudge the scroll container so the active match sits inside the viewport,
// with a little breathing room. jsdom returns zeroed rects — nothing moves.
function revealRange(container: HTMLElement, range: Range): void {
  // Some engines (notably jsdom) do not implement Range#getBoundingClientRect.
  if (typeof range.getBoundingClientRect !== 'function') return;
  const rect = range.getBoundingClientRect();
  if (rect.top === 0 && rect.bottom === 0 && rect.height === 0) return;
  const view = container.getBoundingClientRect();
  const margin = 48;
  if (rect.top < view.top + margin) {
    container.scrollTop -= view.top + margin - rect.top;
  } else if (rect.bottom > view.bottom - margin) {
    container.scrollTop += rect.bottom - (view.bottom - margin);
  }
}

const findNavClass =
  'w-6 h-6 flex items-center justify-center rounded text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]';

export default function CodePanel() {
  const { currentCode } = useAppStore();
  const { t } = useT();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const matches = useMemo(() => findMatches(currentCode, query), [currentCode, query]);
  const total = matches.length;
  // The code streams and shrinks between iterations; never trust the stored
  // index — clamp it against the current match count on every render.
  const safeActive = clampMatchIndex(activeIndex, total);

  // Keep the stored index tidy when the match count drops below it.
  useEffect(() => {
    setActiveIndex((index) => clampMatchIndex(index, total));
  }, [total]);

  // Opening the bar moves focus into the input.
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // No code means no find bar — the toolbar toggle is disabled in that state.
  useEffect(() => {
    if (!currentCode) setSearchOpen(false);
  }, [currentCode]);

  useEffect(() => {
    const registry = getHighlightRegistry();
    const HighlightCtor = getHighlightConstructor();
    const clear = () => {
      registry?.delete(HIGHLIGHT_ALL);
      registry?.delete(HIGHLIGHT_ACTIVE);
    };

    if (!searchOpen || total === 0) {
      clear();
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      clear();
      return;
    }

    // The code element excludes the line-number gutter; fall back to the
    // container (e.g. the test double) when it is not present.
    const root = container.querySelector('code[class*="language-"]') ?? container;
    const spans = collectTextSpans(root);
    const ranges = matches
      .map((match) => rangeForMatch(spans, match.start, match.end))
      .filter((range): range is Range => range !== null);

    const activeRange = ranges[safeActive];
    if (activeRange) revealRange(container, activeRange);

    if (!registry || !HighlightCtor || ranges.length === 0) {
      clear();
      return;
    }

    try {
      registry.set(HIGHLIGHT_ALL, new HighlightCtor(...ranges));
      if (activeRange) registry.set(HIGHLIGHT_ACTIVE, new HighlightCtor(activeRange));
    } catch {
      clear();
    }

    return clear;
  }, [searchOpen, total, matches, safeActive]);

  const handleCopy = useCallback(async () => {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      toast.success(t('code.copied'));
    } catch {
      toast.error(t('code.copyFailed'));
    }
  }, [currentCode, t]);

  const handleDownload = useCallback(() => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('code.downloadStarted'));
  }, [currentCode, t]);

  const handleReactPlaceholder = useCallback(() => {
    toast(t('code.reactSoon'), { icon: '🚧' });
  }, [t]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    // Return focus to the control that owns the bar.
    toggleRef.current?.focus();
  }, []);

  const handleToggleSearch = useCallback(() => {
    setSearchOpen((open) => !open);
  }, []);

  const goToNext = useCallback(() => {
    setActiveIndex((index) => nextMatchIndex(clampMatchIndex(index, total), total));
  }, [total]);

  const goToPrev = useCallback(() => {
    setActiveIndex((index) => prevMatchIndex(clampMatchIndex(index, total), total));
  }, [total]);

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setActiveIndex(0);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) goToPrev();
      else goToNext();
    }
  };

  const handleBarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeSearch();
    }
  };

  const counterLabel =
    query && total === 0
      ? t('code.searchNoResults')
      : t('code.searchCount', { current: total ? safeActive + 1 : 0, total });

  return (
    <div className="relative h-full animate-fade-in">
      <div className="absolute inset-0 bg-surface-900 border border-line rounded-xl overflow-hidden">
        {currentCode ? (
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-auto syntax-highlighter-override"
          >
            <SyntaxHighlighter
              language="html"
              style={darkroomPrismTheme}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                borderRadius: 0,
                minHeight: '100%',
                fontSize: '13px',
                lineHeight: '1.6',
              }}
            >
              {currentCode}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-900">
            <div className="text-center">
              <CodeBracketIcon className="w-10 h-10 text-surface-700 mx-auto mb-3" />
              <p className="text-surface-400 text-sm">{t('code.empty')}</p>
            </div>
          </div>
        )}

        {searchOpen && (
          <>
            {CAN_HIGHLIGHT && <style>{HIGHLIGHT_STYLES}</style>}
            <div
              role="search"
              onKeyDown={handleBarKeyDown}
              className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-lg bg-surface-800 border border-line shadow-overlay px-2 py-1 animate-fade-in transition-shadow focus-within:border-primary-500/60 focus-within:ring-2 focus-within:ring-primary-500/30"
            >
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleInputKeyDown}
                placeholder={t('code.searchPlaceholder')}
                aria-label={t('code.searchPlaceholder')}
                spellCheck={false}
                autoComplete="off"
                className="h-6 w-40 bg-transparent text-xs text-surface-100 placeholder:text-surface-500 outline-none"
              />
              <span
                aria-live="polite"
                className={`exposure-label px-1 whitespace-nowrap ${
                  query && total === 0 ? 'text-surface-400' : 'text-surface-500'
                }`}
              >
                {counterLabel}
              </span>
              <button
                type="button"
                onClick={goToPrev}
                disabled={total === 0}
                title={t('code.searchPrev')}
                aria-label={t('code.searchPrev')}
                className={findNavClass}
              >
                <ChevronUpIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={total === 0}
                title={t('code.searchNext')}
                aria-label={t('code.searchNext')}
                className={findNavClass}
              >
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={closeSearch}
                title={t('code.searchClose')}
                aria-label={t('code.searchClose')}
                className={findNavClass}
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
          <button
            ref={toggleRef}
            type="button"
            onClick={handleToggleSearch}
            disabled={!currentCode}
            aria-pressed={searchOpen}
            title={t('code.searchTitle')}
            aria-label={t('code.searchTitle')}
            className={`w-8 h-8 flex items-center justify-center rounded-md bg-surface-800 border shadow-overlay transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98] ${
              searchOpen
                ? 'text-primary-400 border-primary-500/40'
                : 'border-line text-surface-400 hover:text-surface-100 hover:border-line-strong'
            }`}
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            disabled={!currentCode}
            title={t('code.copyTitle')}
            aria-label={t('code.copyTitle')}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-800 border border-line text-surface-400 shadow-overlay hover:text-surface-100 hover:border-line-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          >
            <ClipboardIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={!currentCode}
            title={t('code.downloadTitle')}
            aria-label={t('code.downloadTitle')}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-800 border border-line text-surface-400 shadow-overlay hover:text-surface-100 hover:border-line-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleReactPlaceholder}
            disabled={!currentCode}
            title={t('code.reactTitle')}
            aria-label={t('code.reactTitle')}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-800 border border-line text-surface-400 shadow-overlay hover:text-surface-100 hover:border-line-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-ring active:scale-[0.98]"
          >
            <CodeBracketIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
