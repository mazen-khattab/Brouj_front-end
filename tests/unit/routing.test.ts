import { expect, test } from 'vitest';
import { allowedReturnPath } from '../../src/Router/routeDefinitions';
import { routePaths, apiPaths } from '../../src/Router/routePaths';
import type { AuthState } from '../../src/Types/auth';
import { UserRole } from '../../src/Types/contracts';

const common = { generation: 1, pending: false, automaticRefresh: true, logoutRequired: false };
const customer: AuthState = { ...common, status: 'customer', actor: 'customer', profile: { id: 'customer', fName: 'Test', lName: 'Customer', email: '', phone: '', identityNumber: '' } };
const staff: AuthState = { ...common, status: 'staff', actor: 'staff', role: UserRole.Admin, profile: { id: 'staff', name: 'Test', email: '', phone: '', role: UserRole.Admin, deletedAt: null } };
const superAdmin: AuthState = { ...staff, role: UserRole.SuperAdmin, profile: { ...staff.profile, role: UserRole.SuperAdmin } };

test.each([
  null, '', 'https://example.test/account', 'https://brouj.com/account', '//example.test', '///example.test',
  '/\\example.test', '/%5cexample.test', '/%2fexample.test', '/account%0a', '/account%00', '/account\t',
  '/%zz', 'account', '/login?returnTo=/account', '/register', '/admin/login', '/unknown',
  '/admin', '/admin/users', '/account/' + 'a'.repeat(2050),
])('unsafe or forbidden customer return value falls back: %s', (value) => {
  expect(allowedReturnPath(value, customer)).toBe('/account');
});
test('return authorization follows actor policy and preserves a safe query/hash', () => {
  expect(allowedReturnPath('/account/reservations/fixture?tab=history#details', customer)).toBe('/account/reservations/fixture?tab=history#details');
  expect(allowedReturnPath('/projects/fixture/time-plan', customer)).toBe('/projects/fixture/time-plan');
  expect(allowedReturnPath('/projects/fixture/time-plan', staff)).toBe('/projects/fixture/time-plan');
  expect(allowedReturnPath('/account/orders', staff)).toBe('/admin');
  expect(allowedReturnPath('/admin/users', staff)).toBe('/admin');
  expect(allowedReturnPath('/admin/users/fixture', superAdmin)).toBe('/admin/users/fixture');
  expect(allowedReturnPath('/projects', customer)).toBe('/projects');
});
test('browser path builders encode identifiers independently of API routes', () => {
  expect(routePaths.unit('a/b', '#value')).toBe('/projects/a%2Fb/units/%23value');
  expect(routePaths.admin.staffUser('a?b')).toBe('/admin/users/a%3Fb');
  expect(() => routePaths.city('..')).toThrow();
  expect(apiPaths.Cities.getCityById('a/b')).toBe('/api/v1/cities/a%2Fb');
});
