import { describe, it, expect, beforeEach } from 'vitest';
import { localizeTemplate, t } from './index';
import { useAppStore } from '../store/appStore';

describe('localizeTemplate', () => {
  beforeEach(() => {
    useAppStore.setState({ locale: 'en' });
  });

  it('returns English content for a known category in the en locale', () => {
    const result = localizeTemplate('landing');
    expect(result).toEqual({
      title: 'SaaS Landing Page',
      description: expect.stringContaining('One-page landing'),
      prompt_text: expect.stringContaining('Create a modern landing page'),
    });
    expect(result?.prompt_text).toBe(t('templates.items.landing.prompt'));
  });

  it('is case-insensitive for category names', () => {
    expect(localizeTemplate('Landing')).toEqual(localizeTemplate('landing'));
  });

  it('returns null in the ru locale (backend provides Russian text)', () => {
    useAppStore.setState({ locale: 'ru' });
    expect(localizeTemplate('landing')).toBeNull();
  });

  it('returns null for an unknown category', () => {
    useAppStore.setState({ locale: 'en' });
    expect(localizeTemplate('quantum-fusion')).toBeNull();
  });

  it('returns null for null/undefined category', () => {
    expect(localizeTemplate(null)).toBeNull();
    expect(localizeTemplate(undefined)).toBeNull();
  });
});
