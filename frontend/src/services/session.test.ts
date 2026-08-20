import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSessionId, loadSession, saveSession, clearSession } from './session';

const SESSION_KEY = 'purl_session_id';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('session', () => {
  it('createSessionId returns a UUID-shaped string', () => {
    const id = createSessionId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('createSessionId falls back to a random string without crypto.randomUUID', () => {
    vi.stubGlobal('crypto', { randomUUID: undefined });
    const id = createSessionId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('saveSession writes the id under the session key', () => {
    saveSession('sess-abc');
    expect(window.localStorage.getItem(SESSION_KEY)).toBe('sess-abc');
  });

  it('loadSession returns the stored id', () => {
    window.localStorage.setItem(SESSION_KEY, 'sess-xyz');
    expect(loadSession()).toBe('sess-xyz');
  });

  it('loadSession returns null when nothing is stored', () => {
    expect(loadSession()).toBeNull();
  });

  it('clearSession removes the stored id', () => {
    window.localStorage.setItem(SESSION_KEY, 'sess-xyz');
    clearSession();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('saveSession, loadSession and clearSession are no-ops without localStorage', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadSession()).toBeNull();
    expect(() => saveSession('sess-1')).not.toThrow();
    expect(() => clearSession()).not.toThrow();
  });
});