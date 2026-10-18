import { describe, it, expect } from 'vitest';
import {
  findMatches,
  nextMatchIndex,
  prevMatchIndex,
  clampMatchIndex,
} from './findMatches';

describe('findMatches', () => {
  it('returns nothing for an empty query', () => {
    expect(findMatches('anything', '')).toEqual([]);
  });

  it('returns nothing when there is no match', () => {
    expect(findMatches('hello world', 'xyz')).toEqual([]);
  });

  it('matches case-insensitively', () => {
    expect(findMatches('AbcABC', 'abc')).toEqual([
      { start: 0, end: 3 },
      { start: 3, end: 6 },
    ]);
  });

  it('reports every non-overlapping occurrence', () => {
    expect(findMatches('divdivdiv', 'div')).toEqual([
      { start: 0, end: 3 },
      { start: 3, end: 6 },
      { start: 6, end: 9 },
    ]);
  });

  it('does not overlap matches', () => {
    expect(findMatches('aaa', 'aa')).toEqual([{ start: 0, end: 2 }]);
  });

  it('treats the query as a literal, not a pattern', () => {
    expect(findMatches('a.b*c', '.')).toEqual([{ start: 1, end: 2 }]);
    expect(findMatches('a.b*c', '*')).toEqual([{ start: 3, end: 4 }]);
    expect(findMatches('a.b*c', '.*')).toEqual([]);
  });
});

describe('match navigation', () => {
  it('wraps forward', () => {
    expect(nextMatchIndex(0, 3)).toBe(1);
    expect(nextMatchIndex(2, 3)).toBe(0);
  });

  it('wraps backward', () => {
    expect(prevMatchIndex(0, 3)).toBe(2);
    expect(prevMatchIndex(2, 3)).toBe(1);
  });

  it('returns 0 when there are no matches', () => {
    expect(nextMatchIndex(5, 0)).toBe(0);
    expect(prevMatchIndex(5, 0)).toBe(0);
  });

  it('clamps a stale index into range', () => {
    expect(clampMatchIndex(7, 3)).toBe(2);
    expect(clampMatchIndex(-1, 3)).toBe(0);
    expect(clampMatchIndex(1, 3)).toBe(1);
    expect(clampMatchIndex(4, 0)).toBe(0);
  });
});
