import { describe, it, expect, beforeEach } from 'vitest';
import { t } from './index';
import { useAppStore } from '../store/appStore';

describe('translate', () => {
  beforeEach(() => {
    useAppStore.setState({ locale: 'ru' });
  });

  it('returns the Russian string in the ru locale', () => {
    expect(t('common.close')).toBe('Закрыть');
  });

  it('returns the English string in the en locale', () => {
    useAppStore.setState({ locale: 'en' });
    expect(t('common.close')).toBe('Close');
  });

  it('interpolates {param} placeholders', () => {
    expect(t('chat.errorOccurred', { message: 'X' })).toContain('X');
  });

  it('pluralizes with the n param', () => {
    expect(t('chat.iterations', { n: 5 })).toBe('5 итераций');
  });
});