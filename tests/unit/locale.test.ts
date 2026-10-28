import { expect, test, vi } from 'vitest';
import { bootstrapLocale } from '../../src/i18n/bootstrap';

test.each([['en', 'en', 'ltr'], ['ar', 'ar', 'rtl'], ['invalid', 'ar', 'rtl']])(
  'restores %s safely before rendering', (stored, expected, direction) => {
    localStorage.setItem('brouj.locale', stored);
    expect(bootstrapLocale()).toBe(expected);
    expect(document.documentElement.lang).toBe(expected);
    expect(document.documentElement.dir).toBe(direction);
  },
);

test('storage denial preserves the Arabic default', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
  expect(bootstrapLocale()).toBe('ar');
  expect(document.documentElement.dir).toBe('rtl');
});
