import { expect, test } from './test';
import { accountIds, accountServer } from './accountFixtures';
import { catalogueIds, catalogueProject, catalogueUnit } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import { bookingDetails, fillBooking } from './bookingActions';
import { sessionCors } from './sessionFixtures';

const unitPath = `/projects/${catalogueIds.project}/units/${catalogueIds.unit}`;

for (const projectType of [0, 1]) {
  test(`customer books a ${projectType === 0 ? 'regular' : 'initiative'} unit with reservation-specific details`, async ({ page, context }) => {
    const server = await accountServer(context);
    await seedRouting(page, 'customer');
    await context.route(`https://localhost:7249/api/v1/projects/${catalogueIds.project}`, (route) => route.fulfill({
      headers: sessionCors, json: { success: true, data: { ...catalogueProject, projectType }, message: null },
    }));
    await page.goto(`/projects/${catalogueIds.project}`);
    await page.getByRole('link', { name: 'View units', exact: true }).click();
    await page.getByRole('link', { name: 'Unit A-204', exact: true }).click();
    const button = page.getByRole('button', { name: 'Reserve now', exact: true });
    await expect(button).toBeVisible();
    expect(await button.evaluate((node) => !!node.closest('article'))).toBe(true);
    await button.click();
    await expect(page.locator('#booking-phone')).toHaveValue(server.profile.phone);
    await expect(page.locator('#booking-fullName')).toHaveValue('Fixture Customer');
    await expect(page.locator('#booking-email')).toHaveCount(0);
    await expect(page.locator('#booking-password')).toHaveCount(0);
    if (projectType === 1) {
      await expect(page.locator('#booking-identityNumber')).toHaveValue(server.profile.identityNumber);
      await fillBooking(page);
      await page.locator('#booking-identityNumber').fill('20000000000000');
    } else {
      const dialog = page.getByRole('dialog');
      await expect(dialog.locator('input')).toHaveCount(2);
      await expect(dialog.locator('select')).toHaveCount(0);
      await page.locator('#booking-fullName').fill('Updated Customer');
    }
    await page.locator('#booking-phone').fill('01111111111');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm reservation', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/account/reservations/${accountIds.created}$`));
    expect(server.calls.filter((call) => call.method === 'POST' && call.path === '/api/v1/reservations').map((call) => call.body)).toEqual([
      projectType === 1
        ? { unitId: catalogueIds.unit, ...bookingDetails, phone: '01111111111', identityNumber: '20000000000000' }
        : {
            unitId: catalogueIds.unit, fullName: 'Updated Customer', phone: '01111111111',
            identityNumber: null, ageGroup: null, placeOfResidence: null, preferredFinancialBracket: null, preferredRepaymentPeriod: null,
          },
    ]);
    expect(server.calls.some((call) => call.method === 'PATCH')).toBe(false);
    expect(server.profile.phone).toBe('01000000000');
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/Second Third|01111111111|20000000000000|Cairo/);
  });
}

test('guest registration is followed by exactly one complete booking request', async ({ page, context }) => {
  const server = await accountServer(context, 'anonymous');
  await seedRouting(page);
  await page.goto(unitPath);
  await page.getByRole('button', { name: 'Reserve now', exact: true }).click();
  await fillBooking(page);
  await page.locator('#booking-email').fill('booking@example.test');
  await page.locator('#booking-password').fill(' booking-password ');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm reservation', exact: true }).dblclick();
  await expect(page).toHaveURL(new RegExp(`/account/reservations/${accountIds.created}$`));
  const writes = server.calls.filter((call) => call.method === 'POST' && (call.path.endsWith('/register') || call.path === '/api/v1/reservations'));
  expect(writes.map((call) => call.path)).toEqual(['/api/v1/auth/customers/register', '/api/v1/reservations']);
  expect(writes[0]!.body).toEqual({
    fName: 'Fixture', lName: 'Second Third Customer', phone: bookingDetails.phone,
    identityNumber: bookingDetails.identityNumber, email: 'booking@example.test', password: ' booking-password ',
  });
  expect(writes[1]!.body).toEqual({ unitId: catalogueIds.unit, ...bookingDetails });
  expect(server.calls.some((call) => call.method === 'PATCH')).toBe(false);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/booking@example|booking-password|Cairo/);
});

test('regular guest booking sends account details to signup and contact details to reservations', async ({ page, context }) => {
  const server = await accountServer(context, 'anonymous');
  await seedRouting(page);
  await context.route(`https://localhost:7249/api/v1/projects/${catalogueIds.project}`, (route) => route.fulfill({
    headers: sessionCors, json: { success: true, data: { ...catalogueProject, projectType: 0 }, message: null },
  }));
  await page.goto(unitPath);
  await page.getByRole('button', { name: 'Reserve now', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('input')).toHaveCount(4);
  await expect(dialog.locator('select')).toHaveCount(0);
  await page.locator('#booking-fullName').fill('Fixture Customer');
  await page.locator('#booking-phone').fill(bookingDetails.phone);
  await page.locator('#booking-email').fill('regular@example.test');
  await page.locator('#booking-password').fill('fixture-password');
  await dialog.getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/account/reservations/${accountIds.created}$`));
  const writes = server.calls.filter((call) => call.method === 'POST' && (call.path.endsWith('/register') || call.path === '/api/v1/reservations'));
  expect(writes.map((call) => [call.path, call.body])).toEqual([
    ['/api/v1/auth/customers/register', {
      fName: 'Fixture', lName: 'Customer', phone: bookingDetails.phone,
      regularReservationUnitId: catalogueIds.unit, email: 'regular@example.test', password: 'fixture-password',
    }],
    ['/api/v1/reservations', {
      unitId: catalogueIds.unit, fullName: 'Fixture Customer', phone: bookingDetails.phone,
      identityNumber: null, ageGroup: null, placeOfResidence: null, preferredFinancialBracket: null, preferredRepaymentPeriod: null,
    }],
  ]);
});

test('validation and failed registration preserve the draft and cannot submit a reservation', async ({ page, context }) => {
  const server = await accountServer(context, 'anonymous');
  await seedRouting(page);
  await context.route('https://localhost:7249/api/v1/auth/customers/register', (route) => route.fulfill({ status: 409, headers: sessionCors, json: { status: 409 } }));
  await page.goto(unitPath);
  await page.getByRole('button', { name: 'Reserve now', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await expect(page.locator('#booking-fullName')).toBeFocused();
  await expect(page.locator('#booking-identityNumber')).toHaveAttribute('aria-invalid', 'true');
  await fillBooking(page);
  await page.locator('#booking-email').fill('existing@example.test');
  await page.locator('#booking-password').fill('fixture-password');
  await page.locator('#booking-fullName').fill('Only Two');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await expect(page.locator('#booking-fullName')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#booking-fullName').fill(bookingDetails.fullName);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm reservation', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('An account already uses these details.');
  await expect(page.locator('#booking-placeOfResidence')).toHaveValue('Cairo');
  expect(server.calls.some((call) => call.path === '/api/v1/reservations')).toBe(false);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Reserve now', exact: true }).click();
  await expect(page.locator('#booking-placeOfResidence')).toHaveValue('');
  await expect(page.locator('#booking-password')).toHaveValue('');
});

test('unavailable units cannot open the booking form', async ({ page, context }) => {
  const server = await accountServer(context);
  await seedRouting(page, 'customer');
  await context.route(`https://localhost:7249/api/v1/units/${catalogueIds.unit}?*`, (route) => route.fulfill({
    headers: sessionCors, json: { success: true, data: { ...catalogueUnit, isAvailable: false }, message: null },
  }));
  await page.goto(unitPath);
  await expect(page.getByRole('button', { name: 'Reserve now', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(server.calls.some((call) => call.method === 'POST' && call.path === '/api/v1/reservations')).toBe(false);
});

for (const language of ['ar', 'en'] as const) {
  test(`booking dialog is usable in ${language}`, async ({ page, context }, info) => {
    await accountServer(context, 'anonymous');
    await seedRouting(page, 'anonymous', language);
    await page.goto(unitPath);
    await page.getByRole('button', { name: language === 'en' ? 'Reserve now' : 'احجز الآن', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input')).toHaveCount(6);
    await expect(dialog.locator('select')).toHaveCount(3);
    await expect(page.locator('#booking-ageGroup option')).toHaveCount(4);
    await expect(page.locator('#booking-preferredFinancialBracket option')).toHaveCount(4);
    await expect(page.locator('#booking-preferredRepaymentPeriod option')).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${language}-booking.png`), fullPage: true, animations: 'disabled', mask: [page.locator('input')] });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: language === 'en' ? 'Reserve now' : 'احجز الآن', exact: true })).toBeFocused();
  });
}
