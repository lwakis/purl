// Minimal line-based diff for the version comparison view.
//
// Deliberately dependency-free: the whole feature needs ordered, per-line
// statuses (equal / added / removed) plus two counts. A classic LCS dynamic
// program over lines gives that in O(n·m) time and memory, which is plenty for
// a handful of generated snapshots (a few hundred lines each).

export type LineDiffStatus = 'equal' | 'added' | 'removed';

export interface LineDiffEntry {
  status: LineDiffStatus;
  text: string;
}

export interface LineDiffResult {
  lines: LineDiffEntry[];
  added: number;
  removed: number;
}

// '' has no lines at all; anything else splits on newlines, keeping blank
// lines in the middle (they are meaningful in HTML output).
function splitLines(code: string): string[] {
  if (code === '') return [];
  return code.split('\n');
}

/**
 * Compare two code strings line by line.
 *
 * Returns the merged sequence in reading order — the "before" lines that are
 * missing from "after" are emitted as `removed` right before the `added`
 * replacements, which is the ordering people expect from a unified diff.
 */
export function diffLines(before: string, after: string): LineDiffResult {
  const a = splitLines(before);
  const b = splitLines(after);
  const n = a.length;
  const m = b.length;
  const width = m + 1;

  // dp[i][j] = length of the longest common subsequence of a[i..] and b[j..].
  const dp = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i * width + j] =
        a[i] === b[j]
          ? dp[(i + 1) * width + (j + 1)] + 1
          : Math.max(dp[(i + 1) * width + j], dp[i * width + (j + 1)]);
    }
  }

  const lines: LineDiffEntry[] = [];
  let added = 0;
  let removed = 0;
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      lines.push({ status: 'equal', text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + (j + 1)]) {
      // Ties prefer removal first so a changed line reads as "old, then new".
      lines.push({ status: 'removed', text: a[i] });
      removed += 1;
      i += 1;
    } else {
      lines.push({ status: 'added', text: b[j] });
      added += 1;
      j += 1;
    }
  }
  while (i < n) {
    lines.push({ status: 'removed', text: a[i] });
    removed += 1;
    i += 1;
  }
  while (j < m) {
    lines.push({ status: 'added', text: b[j] });
    added += 1;
    j += 1;
  }

  return { lines, added, removed };
}
