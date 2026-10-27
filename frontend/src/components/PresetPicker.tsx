import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../store/appStore';
import { getPresets } from '../services/api';
import { useT } from '../i18n';
import type { PresetInfo } from '../types';

interface PresetPickerProps {
  /** A single trigger with a popover — for the workspace composer. */
  compact?: boolean;
  className?: string;
}

const AUTO_VALUE = 'auto';

function presetName(preset: PresetInfo, locale: 'ru' | 'en'): string {
  return preset.name[locale] || preset.name.en;
}

function presetDescription(preset: PresetInfo, locale: 'ru' | 'en'): string {
  return preset.description[locale] || preset.description.en;
}

/** Three-colour swatch; a neutral stack stands in for Auto. */
function Swatch({
  colors,
  selected = false,
}: {
  colors: readonly string[] | null;
  selected?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-3.5 w-3.5 shrink-0 overflow-hidden rounded-[3px] border ${
        selected ? 'border-white/20' : 'border-line'
      }`}
    >
      {colors ? (
        colors.map((color, index) => (
          <span
            key={`${color}-${index}`}
            className="h-full flex-1"
            style={{ backgroundColor: color }}
          />
        ))
      ) : (
        <>
          <span className="h-full flex-1 bg-surface-600" />
          <span className="h-full flex-1 bg-surface-500" />
          <span className="h-full flex-1 bg-surface-400" />
        </>
      )}
    </span>
  );
}

/**
 * Curated style direction for the next exposure. This is a product choice, not
 * a system prompt editor: the API supplies names, descriptions and swatches,
 * and the internal prompt text never reaches the UI.
 */
export default function PresetPicker({ compact = false, className = '' }: PresetPickerProps) {
  const preset = useAppStore((state) => state.preset);
  const setPreset = useAppStore((state) => state.setPreset);
  const isGenerating = useAppStore((state) => state.isGenerating);
  const { t, locale } = useT();

  // null while the catalogue is in flight. A failed request degrades to the
  // Auto chip only — room for the control stays, no toast, no layout collapse.
  const [presets, setPresets] = useState<PresetInfo[] | null>(null);
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    getPresets()
      .then((data) => {
        if (alive) setPresets(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setPresets([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const options = presets ?? [];
  const selectedPreset = preset ? (options.find((item) => item.id === preset) ?? null) : null;
  const autoSelected = preset === null;
  const description = autoSelected
    ? t('preset.autoDescription')
    : selectedPreset
      ? presetDescription(selectedPreset, locale)
      : '';
  const disabled = isGenerating;

  // Close the compact popover on outside click or Escape.
  useEffect(() => {
    if (!compact || !open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      if (triggerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [compact, open]);

  // Shared arrow-key selection for both the chip row and the compact listbox.
  const selectByKeyboard = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, container: HTMLElement | null) => {
      if (disabled) return;
      const navigationKeys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
      if (!navigationKeys.includes(event.key)) return;
      event.preventDefault();

      const values: (string | null)[] = [null, ...options.map((item) => item.id)];
      const current = values.indexOf(preset);
      let nextIndex: number;
      if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = values.length - 1;
      } else if (current === -1) {
        nextIndex = 0;
      } else {
        const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
        nextIndex = (current + delta + values.length) % values.length;
      }

      const next = values[nextIndex];
      container
        ?.querySelector<HTMLButtonElement>(`[data-preset-value="${next ?? AUTO_VALUE}"]`)
        ?.focus();
      setPreset(next);
    },
    [disabled, options, preset, setPreset],
  );

  if (compact) {
    const triggerName = autoSelected
      ? t('preset.auto')
      : selectedPreset
        ? presetName(selectedPreset, locale)
        : t('preset.auto');

    return (
      <div className={`relative ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${t('preset.label')}: ${triggerName}`}
          title={description || t('preset.label')}
          className="h-8 flex items-center gap-1.5 px-2 rounded-md text-xs text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-colors focus-ring active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Swatch colors={autoSelected ? null : (selectedPreset?.swatch ?? null)} />
          <span className="max-w-[150px] truncate">{triggerName}</span>
          <ChevronDownIcon className="w-3 h-3 text-surface-500" />
        </button>

        {open && (
          <div
            ref={popoverRef}
            className="absolute bottom-full left-0 mb-2 w-60 rounded-lg bg-surface-800 border border-line shadow-overlay z-30 flex flex-col overflow-hidden animate-fade-in"
          >
            <div
              role="listbox"
              aria-label={t('preset.groupAria')}
              onKeyDown={(event) => selectByKeyboard(event, popoverRef.current)}
              className="overflow-y-auto max-h-64 p-1"
            >
              <button
                type="button"
                role="option"
                aria-selected={autoSelected}
                data-preset-value={AUTO_VALUE}
                onClick={() => {
                  setPreset(null);
                  setOpen(false);
                }}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-colors focus-ring flex items-center justify-between gap-2 ${
                  autoSelected ? 'text-primary-400' : 'text-surface-100 hover:bg-surface-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Swatch colors={null} />
                  {t('preset.auto')}
                </span>
                {autoSelected && <CheckIcon className="w-3 h-3 text-primary-400 shrink-0" />}
              </button>
              {options.map((item) => {
                const selected = preset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-preset-value={item.id}
                    onClick={() => {
                      setPreset(item.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-colors focus-ring flex items-center justify-between gap-2 ${
                      selected ? 'text-primary-400' : 'text-surface-100 hover:bg-surface-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Swatch colors={item.swatch} selected={selected} />
                      <span className="truncate">{presetName(item, locale)}</span>
                    </span>
                    {selected && <CheckIcon className="w-3 h-3 text-primary-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {description && (
              <p className="border-t border-line px-2.5 py-1.5 text-[11px] leading-relaxed text-surface-500">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const chipClass = (selected: boolean) =>
    `inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors focus-ring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
      selected
        ? 'border-primary-500/50 bg-primary-600/15 text-primary-300'
        : 'border-line text-surface-400 hover:border-line-strong hover:bg-surface-800 hover:text-surface-200'
    }`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="exposure-label text-surface-500">{t('preset.label')}</span>

      <div
        ref={rowRef}
        role="radiogroup"
        aria-label={t('preset.groupAria')}
        aria-busy={presets === null}
        onKeyDown={(event) => selectByKeyboard(event, rowRef.current)}
        className="flex flex-wrap gap-1.5"
      >
        <button
          type="button"
          role="radio"
          aria-checked={autoSelected}
          aria-label={t('preset.auto')}
          data-testid="preset-auto"
          data-preset-value={AUTO_VALUE}
          tabIndex={autoSelected || (!selectedPreset && presets === null) ? 0 : -1}
          disabled={disabled}
          onClick={() => setPreset(null)}
          className={chipClass(autoSelected)}
        >
          <Swatch colors={null} selected={autoSelected} />
          <span>{t('preset.auto')}</span>
        </button>

        {options.map((item) => {
          const selected = preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={presetName(item, locale)}
              data-testid={`preset-${item.id}`}
              data-preset-value={item.id}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => setPreset(item.id)}
              className={chipClass(selected)}
            >
              <Swatch colors={item.swatch} selected={selected} />
              <span>{presetName(item, locale)}</span>
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        data-testid="preset-description"
        className="min-h-[1.125rem] text-xs leading-relaxed text-surface-500"
      >
        {description}
      </p>
    </div>
  );
}
