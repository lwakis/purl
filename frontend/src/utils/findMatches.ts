/**
 * Find-in-code primitives — pure, DOM-free logic used by CodePanel's find bar.
 *
 * Kept separate from the component so the matching/`wrap` arithmetic is
 * unit-testable on its own (the panel only maps these offsets onto rendered
 * text nodes for highlighting).
 */

export interface MatchRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Case-insensitive literal substring search.
 *
 * Not a regex: the query is matched verbatim, so characters like `.` or `*`
 * carry no special meaning. Matches never overlap — after a hit the scan
 * resumes past it, so searching `aa` in `aaa` yields a single match.
 */
export function findMatches(haystack: string, query: string): MatchRange[] {
  if (!query) return [];

  const hay = haystack.toLowerCase();
  const needle = query.toLowerCase();
  const matches: MatchRange[] = [];

  let index = hay.indexOf(needle);
  while (index !== -1) {
    matches.push({ start: index, end: index + needle.length });
    index = hay.indexOf(needle, index + needle.length);
  }

  return matches;
}

/** Next match, wrapping to the first at the end. Returns 0 when empty. */
export function nextMatchIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

/** Previous match, wrapping to the last at the start. Returns 0 when empty. */
export function prevMatchIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current - 1 + total) % total;
}

/** Clamp a stored index into `[0, total - 1]`; 0 when there is nothing. */
export function clampMatchIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index > total - 1) return total - 1;
  return index;
}
