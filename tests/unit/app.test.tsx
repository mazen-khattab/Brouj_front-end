import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from '../../src/App';
import { bootstrapLocale } from '../../src/i18n/bootstrap';
import { renderUi } from '../renderUi';

test.each(['ar', 'en'] as const)('the real lazy route renders the %s welcome page', async (locale) => {
  localStorage.setItem('brouj.locale', locale);
  bootstrapLocale();
  renderUi(<App />, locale);
  expect(await screen.findByRole('heading', { name: locale === 'ar' ? 'بروج' : 'Brouj', level: 1 })).toBeVisible();
  expect(screen.getByRole('main')).toHaveTextContent(locale === 'ar' ? 'مرحبًا بك في بروج' : 'Welcome to Brouj');
  expect(document.documentElement).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
});
