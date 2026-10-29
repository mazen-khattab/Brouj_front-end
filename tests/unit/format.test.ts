import { expect, test } from 'vitest';
import { formatCurrency, formatDateOnly, formatDateTime, formatNumber } from '../../src/i18n/format';

test('numbers are localized without modifying numeric payloads or inferring currency', () => {
  const payload = { price: 1234.5 };
  expect(formatCurrency(payload.price, 'en', '')).toBe('1,234.5');
  expect(formatCurrency(payload.price, 'en', 'USD')).toContain('$');
  expect(formatCurrency(1.2345, 'en', 'USD')).toBe('$1.2345');
  expect(formatCurrency(payload.price, 'ar', 'EUR')).toContain('€');
  expect(formatNumber(payload.price, 'ar', { numberingSystem: 'arab' })).toMatch(/[٠-٩]/);
  expect(payload).toEqual({ price: 1234.5 });
  expect(() => formatNumber(NaN, 'en')).toThrow(RangeError);
  expect(() => formatCurrency(Infinity, 'ar', 'USD')).toThrow(RangeError);
});

test('date-only formatting preserves the calendar day and forces Gregorian dates', () => {
  expect(formatDateOnly('2026-01-01', 'en')).toBe('January 1, 2026');
  expect(formatDateOnly('2024-02-29', 'en')).toBe('February 29, 2024');
  const options = { year: 'numeric' as const, calendar: 'islamic', timeZone: 'America/Los_Angeles' };
  expect(formatDateOnly('2026-01-01', 'en', options)).toBe('January 1, 2026');
  expect(formatDateOnly('0099-01-01', 'en')).toContain('99');
  expect(formatDateOnly('2026-01-01', 'en', { dateStyle: 'long' })).toBe('January 1, 2026');
});

test.each(['2026-02-29', '2026-13-01', '2026-01-00', '2026-01-01T00:00:00Z', 'not-a-date'])('invalid date-only input is rejected: %s', (input) => {
  expect(() => formatDateOnly(input, 'en')).toThrow(RangeError);
});

test('offset timestamps represent the same instant, with explicit local display and Gregorian override', () => {
  expect(formatDateTime('2026-01-01T00:30:00Z', 'en', { timeZone: 'UTC' }))
    .toBe(formatDateTime('2026-01-01T02:30:00+02:00', 'en', { timeZone: 'UTC' }));
  expect(formatDateTime('2026-01-01T00:30:00Z', 'en', { timeZone: 'America/Los_Angeles' })).toContain('Dec 31, 2025');
  expect(formatDateTime('2026-01-01T00:30:00Z', 'en', { calendar: 'islamic', timeZone: 'UTC' })).toContain('2026');
  const instant = '2026-01-01T00:30:00Z';
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  expect(formatDateTime(instant, 'en')).toBe(formatDateTime(instant, 'en', { timeZone: browserZone }));
  expect(formatDateTime(instant, 'en', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })).toContain('2026');
});

test.each(['2026-02-30T12:00:00Z', '2026-01-01', '2026-01-01T12:00:00', '2026-01-01T25:00:00Z'])('date-times require a valid date and explicit offset: %s', (input) => {
  expect(() => formatDateTime(input, 'en')).toThrow(RangeError);
});
