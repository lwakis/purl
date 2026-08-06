const SESSION_KEY = 'purl_session_id';
const TOKEN_KEY = 'purl_token';

export interface StoredSession {
  sessionId: string;
  token: string;
}

export function loadSession(): StoredSession | null {
  if (typeof localStorage === 'undefined') return null;
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;
  const token = localStorage.getItem(TOKEN_KEY);
  return { sessionId, token: token || '' };
}

export function saveSession(sessionId: string, token: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SESSION_KEY, sessionId);
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
