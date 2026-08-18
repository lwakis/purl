const SESSION_KEY = 'purl_session_id';

export function createSessionId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function loadSession(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

export function saveSession(sessionId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearSession(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}
