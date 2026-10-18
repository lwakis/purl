// Runtime-error reporting from the sandboxed preview.
//
// The preview iframe runs without allow-same-origin, so the host cannot read
// the generated document, let alone listen for its errors. Like the other
// guards, this one is injected as a string script at the end of every
// srcDoc and speaks to the host purely through postMessage.

/** Longest error text kept — an error banner is a caption, not a stack trace. */
export const PREVIEW_ERROR_MAX_LENGTH = 200;

/** Distinct errors shown at once; the rest collapse into the overflow line. */
export const PREVIEW_ERROR_MAX_VISIBLE = 3;

/** Hard bound on the collected list so a page that throws in a loop can't grow it forever. */
export const PREVIEW_ERROR_MAX_TRACKED = 20;

export interface PreviewError {
  message: string;
  line: number | null;
  col: number | null;
}

// Injected at the end of every preview document (after the navigation and
// select guards). Two hosts of failure are watched:
//   - `error` events (runtime throws, plus resource load failures, which carry
//     no message and are therefore skipped);
//   - `unhandledrejection` (a rejected promise nobody caught).
// Every handler and the reporter itself are wrapped in try/catch: a throwing
// listener would fire a fresh `error` event and report the guard's own fault,
// so the guard must be unable to raise one. Line/col travel along so a
// repeated error is still distinguishable if it ever needs to be.
export const PREVIEW_ERROR_GUARD = `<script>
(function () {
  'use strict';
  var MAX = ${PREVIEW_ERROR_MAX_LENGTH};

  function clean(value) {
    if (typeof value !== 'string') { return ''; }
    var text = value.replace(/\\s+/g, ' ').trim();
    return text.length > MAX ? text.slice(0, MAX) : text;
  }

  function report(message, line, col) {
    try {
      var text = clean(message);
      if (!text) { return; }
      window.parent.postMessage(
        { type: 'purl:preview-error', message: text, line: line, col: col },
        '*'
      );
    } catch (err) {}
  }

  window.addEventListener('error', function (e) {
    try {
      if (!e || typeof e.message !== 'string' || !e.message) { return; }
      report(
        e.message,
        typeof e.lineno === 'number' ? e.lineno : null,
        typeof e.colno === 'number' ? e.colno : null
      );
    } catch (err) {}
  });

  window.addEventListener('unhandledrejection', function (e) {
    try {
      var reason = e && e.reason;
      var message = '';
      if (typeof reason === 'string') { message = reason; }
      else if (reason && typeof reason.message === 'string') { message = reason.message; }
      report(message, null, null);
    } catch (err) {}
  });
})();
</script>`;

/**
 * Validate a `message` event payload from the preview. Returns a normalized
 * error or null when the report is malformed — anything the guard never gets
 * to post is treated as noise.
 */
export function parsePreviewError(data: unknown): PreviewError | null {
  if (typeof data !== 'object' || data === null) return null;
  const payload = data as Record<string, unknown>;
  if (payload.type !== 'purl:preview-error') return null;
  if (typeof payload.message !== 'string') return null;

  const collapsed = payload.message.replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;

  const message =
    collapsed.length > PREVIEW_ERROR_MAX_LENGTH
      ? collapsed.slice(0, PREVIEW_ERROR_MAX_LENGTH)
      : collapsed;

  return {
    message,
    line: typeof payload.line === 'number' && Number.isFinite(payload.line) ? payload.line : null,
    col: typeof payload.col === 'number' && Number.isFinite(payload.col) ? payload.col : null,
  };
}

/**
 * Append an error unless an identical one is already collected, trimming the
 * list to its bound. Returns the previous array untouched when nothing
 * changes so React can skip the re-render.
 */
export function appendPreviewError(list: PreviewError[], next: PreviewError): PreviewError[] {
  if (list.some((error) => error.message === next.message)) return list;
  const appended = [...list, next];
  return appended.length > PREVIEW_ERROR_MAX_TRACKED
    ? appended.slice(appended.length - PREVIEW_ERROR_MAX_TRACKED)
    : appended;
}
