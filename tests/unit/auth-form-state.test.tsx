import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { AuthContext } from '../../src/Context/AuthContext';
import type { AuthValue } from '../../src/Context/AuthContext';
import { LocaleProvider } from '../../src/Context/LocaleProvider';
import { createLocaleInstance } from '../../src/i18n/instance';
import CustomerLoginPage from '../../src/Pages/Auth/CustomerLoginPage';

test('failed login keeps edits but a session identity change removes old credentials', () => {
  const instance = createLocaleInstance('en');
  const state: AuthValue = { status: 'anonymous', actor: null, generation: 0, pending: false, automaticRefresh: true, logoutRequired: false,
    loginCustomer: vi.fn(async () => {}), registerCustomer: vi.fn(async () => {}), loginStaff: vi.fn(async () => {}), logout: vi.fn(async () => {}), retryBootstrap: vi.fn(async () => {}), reloadIdentity: vi.fn(async () => {}) };
  const tree = (value: AuthValue) => <LocaleProvider instance={instance}><AuthContext value={value}><MemoryRouter><CustomerLoginPage /></MemoryRouter></AuthContext></LocaleProvider>;
  const view = render(tree(state));
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'private@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'private-password' } });
  view.rerender(tree({ ...state, generation: 1, pending: true }));
  view.rerender(tree({ ...state, generation: 1 }));
  expect(screen.getByLabelText('Email address')).toHaveValue('private@example.test');
  view.rerender(tree({ ...state, generation: 2, status: 'customer', actor: 'customer', profile: { id: 'id', fName: 'Customer', lName: 'Fixture', email: 'other@example.test', phone: '01000000000', identityNumber: '10000000000000' } }));
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  view.rerender(tree({ ...state, generation: 3 }));
  expect(screen.getByLabelText('Email address')).toHaveValue('');
  expect(screen.getByLabelText('Password')).toHaveValue('');
});
