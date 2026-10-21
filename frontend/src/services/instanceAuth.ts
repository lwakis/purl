const TOKEN_KEY = 'purl-instance-token';

// Fired on the window when any API call is rejected with 401 so the app can
// fall back to the token gate without every caller handling that case.
export const UNAUTHORIZED_EVENT = 'purl:unauthorized';

export function getInstanceToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setInstanceToken(token: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearInstanceToken(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function instanceAuthHeaders(): Record<string, string> {
  const token = getInstanceToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function notifyUnauthorized(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}
