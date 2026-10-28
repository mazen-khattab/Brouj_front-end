import { act, fireEvent, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { resources, translationGaps } from '../../src/i18n/resources';
import { createLocaleInstance } from '../../src/i18n/instance';
import { LanguageSwitcher } from '../../src/Components/LanguageSwitcher';
import ComponentShowcase from '../../src/Pages/ComponentShowcase';
import { renderUi } from '../renderUi';

test('launch keys have complete nonempty parity across every registered namespace', () => {
  expect(translationGaps(resources.ar, resources.en)).toEqual([]);
  expect(translationGaps({ common: { heading: 'عنوان' } }, { common: { heading: 'Title', missing: 'Launch key' } })).toEqual(['common.missing']);
  expect(() => translationGaps({ title: '' }, { title: 'Title' })).toThrow('Empty translation');
});

test('missing Arabic resources fall back to English; completely unknown keys never leak', () => {
  const instance = createLocaleInstance('ar');
  instance.removeResourceBundle('ar', 'common');
  expect(instance.t('save')).toBe('Save');
  expect(instance.t('nonexistent.internal.key')).toBe('Content unavailable');
});

test('switching persists only locale and updates document attributes synchronously', () => {
  renderUi(<LanguageSwitcher />, 'ar');
  fireEvent.click(screen.getByRole('button', { name: 'التبديل إلى الإنجليزية' }));
  expect(document.documentElement).toHaveAttribute('lang', 'en');
  expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  expect(localStorage.getItem('brouj.locale')).toBe('en');
  expect(localStorage.length).toBe(1);
});

test('switching still works when persistence is denied', () => {
  renderUi(<LanguageSwitcher />, 'en');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Denied'); });
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Arabic' }));
  expect(document.documentElement.lang).toBe('ar');
  expect(document.documentElement.dir).toBe('rtl');
});

test('validation and an existing toast retranslate without discarding form edits', async () => {
  const { instance } = renderUi(<MemoryRouter><ComponentShowcase /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'invalid-email' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Enter a valid email address.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Show notification' }));
  await act(async () => { await instance.changeLanguage('ar'); });
  expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument();
  expect(screen.getByText('أدخل بريدًا إلكترونيًا صالحًا.')).toBeVisible();
  expect(screen.getByLabelText('البريد الإلكتروني')).toHaveValue('invalid-email');
  expect(screen.getByRole('complementary', { name: 'الإشعارات' })).toHaveTextContent('كل شيء جاهز للخطوة التالية.');
  expect(screen.getByTestId('unchanged-text').textContent).toContain('<b>Sample content</b>');
  expect(screen.getByTestId('unchanged-text').querySelector('b')).toBeNull();
});
