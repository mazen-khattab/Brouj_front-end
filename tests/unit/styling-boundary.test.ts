import { readdirSync } from 'node:fs';
import { expect, test } from 'vitest';

test('source CSS is confined to src/Styles', () => {
  const cssFiles = readdirSync('src', { recursive: true }).map(String)
    .map((path) => path.replaceAll('\\', '/')).filter((path) => path.endsWith('.css'));
  expect(cssFiles.length).toBeGreaterThan(0);
  expect(cssFiles.filter((path) => !path.startsWith('Styles/'))).toEqual([]);
});
