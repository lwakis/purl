import { describe, it, expect } from 'vitest';
import { diffLines } from './lineDiff';

describe('diffLines', () => {
  it('marks identical inputs as fully unchanged', () => {
    const result = diffLines('a\nb\nc', 'a\nb\nc');
    expect(result.lines).toHaveLength(3);
    expect(result.lines.every((line) => line.status === 'equal')).toBe(true);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
  });

  it('marks pure additions', () => {
    const result = diffLines('a\nb', 'a\nb\nc');
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
    expect(result.lines.filter((line) => line.status === 'added').map((line) => line.text)).toEqual([
      'c',
    ]);
  });

  it('marks pure removals', () => {
    const result = diffLines('a\nb\nc', 'a\nb');
    expect(result.added).toBe(0);
    expect(result.removed).toBe(1);
    expect(
      result.lines.filter((line) => line.status === 'removed').map((line) => line.text),
    ).toEqual(['c']);
  });

  it('keeps the reading order on mixed changes (removal before addition)', () => {
    const result = diffLines('a\nb\nc', 'a\nx\nc');
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.lines.map((line) => `${line.status}:${line.text}`)).toEqual([
      'equal:a',
      'removed:b',
      'added:x',
      'equal:c',
    ]);
  });

  it('treats two empty inputs as no lines', () => {
    const result = diffLines('', '');
    expect(result.lines).toEqual([]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
  });

  it('treats an empty input as pure additions', () => {
    const result = diffLines('', 'a\nb');
    expect(result.added).toBe(2);
    expect(result.removed).toBe(0);
    expect(result.lines.every((line) => line.status === 'added')).toBe(true);
  });

  it('treats an empty output as pure removals', () => {
    const result = diffLines('a\nb', '');
    expect(result.added).toBe(0);
    expect(result.removed).toBe(2);
    expect(result.lines.every((line) => line.status === 'removed')).toBe(true);
  });

  it('counts a moved line as one removal and one addition', () => {
    const result = diffLines('a\nb\nc', 'b\nc\na');
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(
      result.lines.filter((line) => line.status === 'equal').map((line) => line.text),
    ).toEqual(['b', 'c']);
  });
});
