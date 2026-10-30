import { expect, test } from '@playwright/test';
import { openPublicSessionActions } from './publicHeaderActions';
import { accountIds as ids, accountServer } from './accountFixtures';
import { catalogueIds } from './catalogueFixtures';
import { seedRouting, signIn } from './routingFixtures';

const unitPath = `/projects/${catalogueIds.project}/units/${catalogueIds.unit}`;
test('register, browse unit, confirm once, fetch detail/list and cancel using authoritative state', async ({ page, context }) => {
  const server = await accountServer(context, 'anonymous'); await seedRouting(page);
  await page.goto('/register?returnTo=' + encodeURIComponent(unitPath));
  for (const [field, value] of Object.entries({ fName: 'Fixture', lName: 'Customer', phone: '01000000000', identityNumber: '10000000000000', email: 'customer@example.test', password: 'fixture-password' })) await page.locator('#auth-' + field).fill(value);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(catalogueIds.unit + '$'));
  server.state.createMode = 'slow';
  await page.getByRole('button', { name: 'Request reservation', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp('/account/reservations/' + ids.created + '$'));
  await expect(page.getByText('R-FIXTURE-CREATED', { exact: true })).toBeVisible();
  const writes = server.calls.filter((call) => call.method === 'POST' && call.path === '/api/v1/reservations');
  expect(writes).toHaveLength(1); expect(writes[0]!.body).toEqual({ unitId: catalogueIds.unit });
  await page.getByRole('button', { name: 'Cancel reservation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel reservation', exact: true })).toHaveCount(0);
  await page.goto('/account/reservations?status=1&pageSize=1');
  await expect(page.getByText('R-FIXTURE-CREATED', { exact: true }).first()).toBeVisible();
  expect(server.calls.some((call) => call.path === '/api/v1/reservations/me' && call.query.get('status') === '1')).toBe(true);
});
test('duplicate and unavailable conflicts refresh unit status without replaying the request', async ({ page, context }) => {
  const server = await accountServer(context); await seedRouting(page, 'customer');
  for (const mode of ['duplicate', 'unavailable'] as const) {
    server.state.createMode = mode; await page.goto(unitPath);
    await page.getByRole('button', { name: 'Request reservation', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm reservation', exact: true }).click();
    await expect(page.getByText('The current information has changed', { exact: false }).first()).toBeVisible();
    await expect.poll(() => server.calls.filter((call) => call.method === 'POST' && call.path === '/api/v1/reservations').length).toBe(mode === 'duplicate' ? 1 : 2);
    await expect(page.getByRole('dialog')).not.toBeVisible();
  }
  expect(server.calls.some((call) => call.path.endsWith('/refresh'))).toBe(false);
});
test('uncertain create/cancel outcomes stay blocked and offer a current reservation check', async ({ page, context }) => {
  const server = await accountServer(context); await seedRouting(page, 'customer'); server.state.createMode = 'network';
  await page.goto(unitPath); await page.getByRole('button', { name: 'Request reservation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('We could not confirm the outcome.', { exact: false })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Confirm reservation', exact: true })).toBeDisabled();
  await page.getByRole('dialog').getByRole('link', { name: 'Check current reservations' }).click();
  await expect(page).toHaveURL(/\/account\/reservations$/);
  expect(server.calls.filter((call) => call.method === 'POST' && call.path === '/api/v1/reservations')).toHaveLength(1);
  server.state.cancelMode = 'network'; await page.goto('/account/reservations/' + ids.reservation);
  await page.getByRole('button', { name: 'Cancel reservation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Confirm cancellation', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Check current reservations' })).toBeVisible();
  expect(server.calls.filter((call) => call.path.endsWith('/cancel'))).toHaveLength(1);
});
test('cancel conflicts reload eligibility; foreign records produce a single scoped 404', async ({ page, context }) => {
  const server = await accountServer(context); await seedRouting(page, 'customer'); server.state.cancelMode = 'conflict';
  await page.goto('/account/reservations/' + ids.reservation);
  await page.getByRole('button', { name: 'Cancel reservation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel reservation', exact: true })).toHaveCount(0);
  expect(server.calls.filter((call) => call.path.endsWith('/cancel'))).toHaveLength(1);
  for (const kind of ['reservations', 'orders']) {
    await page.goto('/account/' + kind + '/' + ids.foreign);
    await expect(page.getByText('This record is unavailable', { exact: true })).toBeVisible();
  }
  const foreignCalls = server.calls.filter((call) => call.path.includes(ids.foreign));
  expect(foreignCalls.map((call) => call.path)).toEqual(['/api/v1/reservations/' + ids.foreign, '/api/v1/admin/orders/' + ids.foreign]);
});
test('profile validation preserves edits, submits only approved fields and reloads the profile', async ({ page, context }) => {
  const server = await accountServer(context); await seedRouting(page, 'customer'); await page.goto('/account');
  await page.locator('#profile-fName').fill(''); await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('#profile-fName')).toBeFocused();
  await page.locator('#profile-fName').fill('Changed'); server.state.profileValidation = true;
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('#profile-phone')).toHaveAttribute('aria-invalid', 'true'); await expect(page.locator('#profile-fName')).toHaveValue('Changed');
  await expect(page.getByText('Must not appear verbatim', { exact: false })).toHaveCount(0);
  server.state.profileValidation = false; await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Your profile was saved.', { exact: true })).toBeVisible(); await expect(page.locator('#profile-fName')).toHaveValue('Changed');
  const patch = server.calls.filter((call) => call.method === 'PATCH').at(-1)!;
  expect(Object.keys(patch.body as object).sort()).toEqual(['email', 'fName', 'identityNumber', 'lName', 'phone']);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toMatch(/customer@example|10000000000000|Changed/);
  // A committed save followed by a failed identity read must preserve the draft
  // and require an explicit current-profile check before another write.
  await page.locator('#profile-fName').fill('Saved during outage'); server.state.profileReadsFail = 1;
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Your current profile could not be checked.', { exact: false })).toBeVisible();
  await expect(page.locator('#profile-fName')).toHaveValue('Saved during outage');
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reload current profile' }).click();
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeEnabled();
  await expect(page.locator('#profile-fName')).toHaveValue('Saved during outage');
});
test('password validation and wrong-current-password never rotate; success retains or reauthenticates as the server requires', async ({ page, context }) => {
  const server = await accountServer(context); await seedRouting(page, 'customer'); await page.goto('/account');
  await page.getByRole('button', { name: 'Update password', exact: true }).click(); await expect(page.locator('#password-currentPassword')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#password-currentPassword').fill(' old password '); await page.locator('#password-newPassword').fill(' new password ');
  server.state.passwordMode = 'wrong'; await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByText('The current password is incorrect.', { exact: true })).toBeVisible();
  await expect(page.locator('#password-currentPassword')).toHaveValue(' old password ');
  expect(server.calls.filter((call) => call.path.endsWith('/refresh'))).toHaveLength(0);
  server.state.passwordMode = 'success'; await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByText('Your password was updated.', { exact: true })).toBeVisible(); await expect(page.locator('#password-newPassword')).toHaveValue('');
  await expect(page).toHaveURL(/\/account$/);
  const body = server.calls.filter((call) => call.path.endsWith('/change-password')).at(-1)!.body;
  expect(body).toEqual({ currentPassword: ' old password ', newPassword: ' new password ' });
  await page.locator('#password-currentPassword').fill(' new password '); await page.locator('#password-newPassword').fill(' another password ');
  server.state.passwordMode = 'invalidate'; await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.locator('#auth-email')).toBeVisible(); await expect(page.locator('#password-newPassword')).toHaveCount(0);
});
test('personal orders use the member detail endpoint, and schedules require no reservation prerequisite', async ({ page, context }) => {
  const server = await accountServer(context); await seedRouting(page, 'customer'); await page.goto('/account/orders?status=1');
  await page.getByRole('link', { name: 'View details', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/account/orders/' + ids.order + '$'));
  await expect.poll(() => server.calls.some((call) => call.path === '/api/v1/admin/orders/' + ids.order)).toBe(true);
  await expect(page.getByText('1,234,567.89', { exact: false })).toBeVisible();
  expect(server.calls.some((call) => call.method !== 'GET' && call.path.includes('/orders'))).toBe(false);
  const before = server.calls.length; await page.goto(`/projects/${catalogueIds.project}/time-plan`);
  await expect(page.getByRole('heading', { name: 'Foundations', exact: true })).toBeVisible();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  expect(server.calls.slice(before).some((call) => call.path.includes('/reservations'))).toBe(false);
  expect(await page.locator('main').innerHTML()).not.toContain('PRIVATE-PROGRESS');
});
test('expired sessions recover once and definitive expiry or logout removes private data', async ({ page, context }) => {
  const server = await accountServer(context); await seedRouting(page, 'customer'); await page.goto('/account/reservations');
  await expect(page.getByText('R-FIXTURE-ONE', { exact: true }).first()).toBeVisible();
  server.state.expired = true;
  await page.getByRole('button', { name: 'Refresh current status', exact: true }).click();
  await expect.poll(() => server.calls.filter((call) => call.path.endsWith('/refresh')).length).toBe(1);
  await expect(page.getByText('R-FIXTURE-ONE', { exact: true }).first()).toBeVisible();
  server.state.expired = true; server.state.rejectRefresh = true;
  await page.getByRole('button', { name: 'Refresh current status', exact: true }).click();
  await expect(page.locator('#auth-email')).toBeVisible(); await expect(page.getByText('R-FIXTURE-ONE', { exact: true })).toHaveCount(0);
  server.state.expired = false; server.state.rejectRefresh = false; server.state.actor = 'anonymous'; await signIn(page);
  await expect(page.getByText('R-FIXTURE-ONE', { exact: true }).first()).toBeVisible();
  await openPublicSessionActions(page);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#auth-email')).toBeVisible(); await expect(page.getByText('R-FIXTURE-ONE', { exact: true })).toHaveCount(0);
  await page.goBack(); await expect(page.getByText('R-FIXTURE-ONE', { exact: true })).toHaveCount(0);
});
for (const language of ['ar', 'en'] as const) {
  test(`private account and schedule visual review in ${language}`, async ({ page, context }, info) => {
    test.setTimeout(90_000); await accountServer(context); await seedRouting(page, 'customer', language);
    for (const [view, path] of [
      ['profile', '/account'], ['reservations', '/account/reservations'], ['reservation', '/account/reservations/' + ids.reservation],
      ['orders', '/account/orders'], ['order', '/account/orders/' + ids.order], ['plan', `/projects/${catalogueIds.project}/time-plan`], ['confirmation', unitPath],
    ] as const) {
      await page.goto(path); await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(language === 'en' ? 'Loading your account' : 'جارٍ تحميل حسابك', { exact: true })).toHaveCount(0);
      if (view === 'profile') await expect(page.locator('#profile-fName')).toBeVisible();
      if (view === 'confirmation') await page.getByRole('button', { name: language === 'en' ? 'Request reservation' : 'طلب حجز', exact: true }).click();
      await page.evaluate(() => document.fonts.ready); await page.evaluate(() => scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      await page.screenshot({ path: info.outputPath(`${language}-${view}.png`), fullPage: true, animations: 'disabled', scale: 'css', ...(view === 'profile' ? { mask: [page.locator('input')], maskColor: '#d6c9ae' } : {}) });
    }
  });
}
