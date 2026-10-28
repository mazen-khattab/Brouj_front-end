import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { AuthContext } from '../../src/Context/AuthContext';
import type { AuthValue } from '../../src/Context/AuthContext';
import { LocaleProvider } from '../../src/Context/LocaleProvider';
import { ToastProvider } from '../../src/Context/ToastProvider';
import { createLocaleInstance } from '../../src/i18n/instance';
import { useToast } from '../../src/Hooks/useToast';

test('session invalidation removes old notices without discarding form edits', () => {
  const instance = createLocaleInstance('en');
  const state: AuthValue = { status: 'anonymous', actor: null, generation: 0, pending: false, automaticRefresh: true, logoutRequired: false,
    loginCustomer: vi.fn(async () => {}), registerCustomer: vi.fn(async () => {}), loginStaff: vi.fn(async () => {}), logout: vi.fn(async () => {}), retryBootstrap: vi.fn(async () => {}) };
  function Content() { const notify = useToast(); return <><input aria-label="Draft" defaultValue="" /><button onClick={() => notify({ message: { key: 'showcase.saved' } })}>Notify</button></>; }
  const tree = (generation: number) => <LocaleProvider instance={instance}><AuthContext value={{ ...state, generation }}><ToastProvider><Content /></ToastProvider></AuthContext></LocaleProvider>;
  const view = render(tree(0));
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'preserved edit' } });
  fireEvent.click(screen.getByText('Notify'));
  expect(screen.getByRole('status')).toBeVisible();
  view.rerender(tree(1));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Draft')).toHaveValue('preserved edit');
});
