import { expect, test } from 'vitest';
import { readEnvironment } from '../../src/config/environment';

test.each([
  'http://localhost:7249', 'https://example.com/path', 'https://user:password@example.com',
  'https://example.com?query=1', 'https://example.com#fragment', '/api',
])('rejects an invalid API origin: %s', (origin) => {
  expect(() => readEnvironment({ VITE_API_ORIGIN: origin })).toThrow('VITE_API_ORIGIN');
});

test('uses the approved origins and never invents a currency or media URL', () => {
  expect(readEnvironment({})).toEqual({ apiOrigin: 'https://localhost:7249', mediaOrigin: undefined, businessCurrency: undefined });
  expect(readEnvironment({ MODE: 'production' }).apiOrigin).toBe('https://api.brouj.com');
  expect(readEnvironment({ VITE_BUSINESS_CURRENCY: 'USD', VITE_MEDIA_ORIGIN: 'https://media.example.com/' }))
    .toMatchObject({ businessCurrency: 'USD', mediaOrigin: 'https://media.example.com' });
});

test('validates optional media and currency configuration', () => {
  expect(() => readEnvironment({ VITE_MEDIA_ORIGIN: 'file:///uploads/image.png' })).toThrow('VITE_MEDIA_ORIGIN');
  expect(() => readEnvironment({ VITE_BUSINESS_CURRENCY: 'made-up' })).toThrow('VITE_BUSINESS_CURRENCY');
});
