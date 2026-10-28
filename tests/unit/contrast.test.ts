import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tokens = readFileSync(resolve(process.cwd(), 'src/Styles/tokens.css'), 'utf8');

function color(name: string) {
  const value = tokens.match(new RegExp(`--color-${name}: #([a-f0-9]{6});`))?.[1];
  if (!value) throw new Error(`Missing token ${name}`);
  return [0, 2, 4].map((index) => {
    const component = parseInt(value.slice(index, index + 2), 16) / 255;
    return component <= 0.04045 ? component / 12.92 : ((component + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
}

test.each([
  ['primary', 'background'], ['text', 'background'], ['muted', 'background'],
  ['error', 'error-surface'], ['success', 'success-surface'], ['primary', 'accent'],
])('actual CSS text tokens satisfy 4.5:1 contrast: %s on %s', (foreground, background) => {
  const a = color(foreground); const b = color(background);
  expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
});

test('control outlines remain distinguishable against white', () => {
  expect((color('background') + 0.05) / (color('control-border') + 0.05)).toBeGreaterThanOrEqual(3);
});
