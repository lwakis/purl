import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CodeBracketIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useT } from '../i18n';
import type { ProjectVersion } from '../types';
import { diffLines, type LineDiffStatus } from '../utils/lineDiff';

// B may point at a stored snapshot or at the working copy on the stage.
type CompareSource = 'current' | number;

interface CompareModalProps {
  /** Snapshots that actually carry code (ChatPanel already filters these). */
  versions: ProjectVersion[];
  /** Code currently on the stage — offered as a source for side B. */
  currentCode: string;
  /** Version clicked in the chat, preselected on side A. */
  initialVersionId: number | null;
  onClose: () => void;
}

// Same sandbox as the stage preview: generated markup never gets same-origin
// access to the app.
const IFRAME_SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';

const DIFF_ROW: Record<LineDiffStatus, string> = {
  equal: 'text-surface-300',
  added: 'bg-primary-600/10 text-primary-300',
  removed: 'bg-surface-800 text-surface-400',
};

const DIFF_GUTTER: Record<LineDiffStatus, string> = {
  equal: 'text-surface-600',
  added: 'text-primary-400',
  removed: 'text-surface-500',
};

const DIFF_SIGN: Record<LineDiffStatus, string> = {
  equal: ' ',
  added: '+',
  removed: '−',
};

const TOGGLE_ACTIVE = 'bg-primary-600/15 text-primary-300 border-primary-500/50';
const TOGGLE_IDLE = 'text-surface-400 hover:text-surface-200 border-transparent';

export default function CompareModal({
  versions,
  currentCode,
  initialVersionId,
  onClose,
}: CompareModalProps) {
  const { t } = useT();
  const headingId = useId();
  const selectAId = useId();
  const selectBId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const hasCurrent = currentCode.length > 0;

  // A is always a snapshot; B falls back to another snapshot when there is no
  // working copy to compare against.
  const [sourceA, setSourceA] = useState<number | null>(() => {
    if (initialVersionId != null && versions.some((v) => v.id === initialVersionId)) {
      return initialVersionId;
    }
    return versions[0]?.id ?? null;
  });
  const [sourceB, setSourceB] = useState<CompareSource>(() => {
    if (hasCurrent) return 'current';
    return versions.find((v) => v.id !== initialVersionId)?.id ?? versions[0]?.id ?? 'current';
  });
  const [mode, setMode] = useState<'preview' | 'code'>('preview');

  const byId = useMemo(() => new Map(versions.map((v) => [v.id, v])), [versions]);

  const labelFor = useCallback(
    (source: CompareSource | null): string => {
      if (source === null) return '';
      if (source === 'current') return t('compare.currentCode');
      const version = byId.get(source);
      return version ? t('chat.version', { num: version.version_num }) : '';
    },
    [byId, t],
  );

  const codeA = sourceA != null ? (byId.get(sourceA)?.code ?? '') : '';
  const codeB = sourceB === 'current' ? currentCode : (byId.get(sourceB)?.code ?? '');

  // Only the code mode needs a diff; preview mode never pays for it.
  const diff = useMemo(
    () => (mode === 'code' ? diffLines(codeA, codeB) : null),
    [mode, codeA, codeB],
  );

  const sourceCount = versions.length + (hasCurrent ? 1 : 0);
  const notEnough = sourceCount < 2;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Move focus into the dialog so keyboard users land inside it.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const panels = [
    { key: 'a', label: labelFor(sourceA), code: codeA },
    { key: 'b', label: labelFor(sourceB), code: codeB },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        data-testid="compare-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-surface-950/70 animate-fade-in"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="relative flex flex-col w-full max-w-[1120px] h-[min(680px,calc(100dvh_-_2rem))] rounded-xl border border-line bg-surface-900 shadow-overlay animate-slide-up focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <h2 id={headingId} className="text-sm font-medium text-surface-100">
            {t('compare.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            title={t('compare.close')}
            aria-label={t('compare.close')}
            className="p-1.5 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors focus-ring active:scale-95"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {notEnough ? (
          <div className="flex-1 min-h-0 flex items-center justify-center px-4">
            <p className="text-sm text-surface-400 text-center">{t('compare.notEnough')}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-line">
              <div className="flex flex-col gap-1">
                <label htmlFor={selectAId} className="exposure-label text-surface-500">
                  {t('compare.versionA')}
                </label>
                <select
                  id={selectAId}
                  value={sourceA ?? ''}
                  onChange={(e) => setSourceA(Number(e.target.value))}
                  className="min-w-[9rem] bg-surface-800 border border-line rounded-md px-2 py-1.5 text-xs text-surface-100 hover:border-line-strong transition-colors focus-ring [color-scheme:dark]"
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {t('chat.version', { num: version.version_num })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={selectBId} className="exposure-label text-surface-500">
                  {t('compare.versionB')}
                </label>
                <select
                  id={selectBId}
                  value={sourceB}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setSourceB(raw === 'current' ? 'current' : Number(raw));
                  }}
                  className="min-w-[9rem] bg-surface-800 border border-line rounded-md px-2 py-1.5 text-xs text-surface-100 hover:border-line-strong transition-colors focus-ring [color-scheme:dark]"
                >
                  {hasCurrent && <option value="current">{t('compare.currentCode')}</option>}
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {t('chat.version', { num: version.version_num })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-0.5 bg-surface-800 border border-line rounded-lg p-0.5 shadow-segment-inset">
                <button
                  type="button"
                  onClick={() => setMode('preview')}
                  aria-pressed={mode === 'preview'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring active:scale-[0.98] border ${
                    mode === 'preview' ? TOGGLE_ACTIVE : TOGGLE_IDLE
                  }`}
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  {t('compare.preview')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('code')}
                  aria-pressed={mode === 'code'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-ring active:scale-[0.98] border ${
                    mode === 'code' ? TOGGLE_ACTIVE : TOGGLE_IDLE
                  }`}
                >
                  <CodeBracketIcon className="w-3.5 h-3.5" />
                  {t('compare.code')}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col p-4">
              {mode === 'preview' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
                  {panels.map((panel) => (
                    <figure key={panel.key} className="flex flex-col gap-2 min-h-0 min-w-0">
                      <figcaption className="exposure-label text-surface-500 truncate">
                        {panel.label}
                      </figcaption>
                      {/* Frames mount only in preview mode: the code view never
                          spins up sandboxed documents. */}
                      <div className="flex-1 min-h-0 bg-paper shadow-canvas overflow-hidden">
                        <iframe
                          key={panel.code}
                          srcDoc={panel.code}
                          sandbox={IFRAME_SANDBOX}
                          title={`${panel.label} · ${t('preview.iframeTitle')}`}
                          data-testid="compare-iframe"
                          className="w-full h-full border-0"
                        />
                      </div>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0 gap-2">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="exposure-label text-surface-500 truncate">
                      {panels[0].label} · {panels[1].label}
                    </span>
                    {diff && (
                      <span
                        data-testid="diff-stats"
                        className="exposure-label text-surface-400 flex-shrink-0"
                      >
                        {t('compare.diffStats', { added: diff.added, removed: diff.removed })}
                      </span>
                    )}
                  </div>
                  <div
                    data-testid="diff-view"
                    className="flex-1 min-h-0 overflow-auto rounded-lg border border-line bg-surface-900"
                  >
                    {diff?.lines.map((line, index) => (
                      <div
                        key={index}
                        className={`flex font-mono text-xs leading-relaxed ${DIFF_ROW[line.status]}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`w-6 flex-shrink-0 select-none text-right pr-2 ${DIFF_GUTTER[line.status]}`}
                        >
                          {DIFF_SIGN[line.status]}
                        </span>
                        <span className="whitespace-pre pr-3">{line.text || ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
