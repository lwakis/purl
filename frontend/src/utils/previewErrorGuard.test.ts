import { describe, it, expect } from 'vitest';
import {
  PREVIEW_ERROR_GUARD,
  PREVIEW_ERROR_MAX_LENGTH,
  PREVIEW_ERROR_MAX_TRACKED,
  appendPreviewError,
  parsePreviewError,
  type PreviewError,
} from './previewErrorGuard';

const makeError = (message: string): PreviewError => ({ message, line: null, col: null });

describe('parsePreviewError', () => {
  it('normalizes a well-formed report', () => {
    expect(
      parsePreviewError({ type: 'purl:preview-error', message: 'boom', line: 3, col: 9 }),
    ).toEqual({ message: 'boom', line: 3, col: 9 });
  });

  it('nulls missing or non-finite coordinates', () => {
    expect(parsePreviewError({ type: 'purl:preview-error', message: 'boom' })).toEqual({
      message: 'boom',
      line: null,
      col: null,
    });
    expect(
      parsePreviewError({ type: 'purl:preview-error', message: 'boom', line: Infinity }),
    ).toEqual({ message: 'boom', line: null, col: null });
  });

  it('collapses whitespace in the message', () => {
    expect(parsePreviewError({ type: 'purl:preview-error', message: ' a \n b ' })?.message).toBe(
      'a b',
    );
  });

  it('caps the message at the maximum length', () => {
    const long = 'x'.repeat(PREVIEW_ERROR_MAX_LENGTH + 50);
    expect(parsePreviewError({ type: 'purl:preview-error', message: long })?.message).toBe(
      'x'.repeat(PREVIEW_ERROR_MAX_LENGTH),
    );
  });

  it('rejects anything the guard never posts', () => {
    expect(parsePreviewError(null)).toBeNull();
    expect(parsePreviewError('nope')).toBeNull();
    expect(parsePreviewError({ type: 'unrelated', message: 'boom' })).toBeNull();
    expect(parsePreviewError({ type: 'purl:preview-error' })).toBeNull();
    expect(parsePreviewError({ type: 'purl:preview-error', message: 42 })).toBeNull();
    expect(parsePreviewError({ type: 'purl:preview-error', message: '   ' })).toBeNull();
  });
});

describe('appendPreviewError', () => {
  it('appends a new error', () => {
    expect(appendPreviewError([], makeError('a'))).toEqual([makeError('a')]);
  });

  it('returns the same list for a duplicate', () => {
    const list = [makeError('a')];
    expect(appendPreviewError(list, makeError('a'))).toBe(list);
  });

  it('keeps the tracked list bounded', () => {
    let list: PreviewError[] = [];
    for (let i = 0; i < PREVIEW_ERROR_MAX_TRACKED + 5; i++) {
      list = appendPreviewError(list, makeError(`e${i}`));
    }
    expect(list).toHaveLength(PREVIEW_ERROR_MAX_TRACKED);
    expect(list[list.length - 1].message).toBe(`e${PREVIEW_ERROR_MAX_TRACKED + 4}`);
  });
});

describe('PREVIEW_ERROR_GUARD', () => {
  it('is a self-contained script that reports runtime failures', () => {
    expect(PREVIEW_ERROR_GUARD.startsWith('<script>')).toBe(true);
    expect(PREVIEW_ERROR_GUARD.trimEnd().endsWith('</script>')).toBe(true);
    expect(PREVIEW_ERROR_GUARD).toContain("addEventListener('error'");
    expect(PREVIEW_ERROR_GUARD).toContain("addEventListener('unhandledrejection'");
    expect(PREVIEW_ERROR_GUARD).toContain('purl:preview-error');
    expect(PREVIEW_ERROR_GUARD).toContain("postMessage");
  });

  it('guards its own reporting so the guard never throws', () => {
    // Every listener and the reporter wrap their work in try/catch.
    expect((PREVIEW_ERROR_GUARD.match(/catch \(err\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
