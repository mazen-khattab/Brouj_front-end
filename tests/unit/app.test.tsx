import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from '../../src/App';
import { bootstrapLocale } from '../../src/i18n/bootstrap';
import { renderUi } from '../renderUi';
import { AuthContext } from '../../src/Context/AuthContext';
import type { AuthValue } from '../../src/Context/AuthContext';
import { vi } from 'vitest';

const anonymous: AuthValue = { status: 'anonymous', actor: null, generation: 0, pending: false, automaticRefresh: true, logoutRequired: false,
  loginCustomer: vi.fn(), registerCustomer: vi.fn(), loginStaff: vi.fn(), logout: vi.fn(), retryBootstrap: vi.fn() };

test.each(['ar', 'en'] as const)('the real lazy route renders the %s welcome page', async (locale) => {
  localStorage.setItem('brouj.locale', locale);
  bootstrapLocale();
  renderUi(<AuthContext value={anonymous}><App /></AuthContext>, locale);
  expect(await screen.findByRole('heading', { name: locale === 'ar' ? 'بروج' : 'Brouj', level: 1 })).toBeVisible();
  expect(screen.getByRole('main')).toHaveTextContent(locale === 'ar' ? 'مرحبًا بك في بروج' : 'Welcome to Brouj');
  expect(document.documentElement).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
});
