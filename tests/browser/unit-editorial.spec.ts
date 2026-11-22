import { expect, test } from './test';
import { profileRoute } from './sessionFixtures';
import { mkdir } from 'node:fs/promises';
import { catalogueIds as ids, catalogueServer, initiativePaymentPlan } from './catalogueFixtures';
import { routingServer, seedRouting } from './routingFixtures';
import en from '../../src/i18n/locales/en/catalogue.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/catalogue.json' with { type: 'json' };

for (const language of ['en', 'ar'] as const) {
  test(`unit editorial layout and gallery in ${language} at 1440px and 390px`, async ({ page, context }, info) => {
    test.skip(info.project.name !== 'chromium');
    const labels = language === 'en' ? en : ar;
    const errors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401')))
        errors.push(message.text());
    });
    await routingServer(context);
    const server = await catalogueServer(context);
    server.state.initiativePaymentPlan = true;
    await seedRouting(page, 'anonymous', language);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/projects/${ids.project}/units/${ids.unit}`);
    await expect(page.locator('.ud-hero h1')).toHaveText(labels.unitLabel.replace('{{number}}', 'A-204'));
    await expect(page.locator('.home-shell > header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('.ud-availability')).toHaveText(labels.available);
    await expect(page.locator('.ud-back-link')).toHaveAttribute('href', `/projects/${ids.project}`);
    await expect(page.locator('.ud-payment-row h3')).toHaveText(initiativePaymentPlan.map(row => row.stageName));
    await expect(page.locator('.ud-payment-plan')).toContainText(labels.paymentPlan.pricingUnavailable);
    await expect(page.locator('.ud-gallery-main').getByRole('img', { name: labels.imageUnavailable })).toBeVisible();
    await page.getByRole('button', { name: labels.nextPhoto, exact: true }).click();
    await expect(page.getByRole('button', { name: labels.nextPhoto, exact: true })).toBeDisabled();
    await expect(page.locator('.ud-gallery-thumbnails button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.ud-gallery-thumbnails button').first().click();
    await expect(page.locator('.ud-gallery-thumbnails button').first()).toHaveAttribute('aria-pressed', 'true');
    await mkdir('docs/evidence/unit-details', { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); scrollTo(0, 0); });
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const priceBoxes = await page.locator('.ud-price-comparison > div').all();
      const first = (await priceBoxes[0]!.boundingBox())!;
      const second = (await priceBoxes[1]!.boundingBox())!;
      expect(Math.abs(first.y - second.y)).toBeLessThan(1);
      expect(Math.abs(first.width - second.width)).toBeLessThan(1);
      expect(language === 'en' ? first.x < second.x : first.x > second.x).toBe(true);
      const gallery = (await page.locator('.ud-gallery-column').boundingBox())!;
      const pricing = (await page.locator('.ud-pricing').boundingBox())!;
      if (width === 1440) {
        expect(language === 'en' ? gallery.x < pricing.x : gallery.x > pricing.x).toBe(true);
        await expect(page.locator('.ud-gallery-column')).toHaveCSS('position', 'sticky');
      } else expect(gallery.y + gallery.height).toBeLessThan(pricing.y);
      await page.screenshot({ path: `docs/evidence/unit-details/${language}-${width}.png`, fullPage: true, animations: 'disabled', scale: 'css' });
    }
    await page.getByRole('button', { name: labels.booking.reserveNow, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: labels.booking.reserveNow, exact: true })).toBeFocused();
    expect(await page.locator('main').innerHTML()).not.toContain('PRIVATE-STORAGE');
    expect(errors).toEqual([]);
  });

  test(`unit motion releases cleanly when switching to reduced motion in ${language}`, async ({ page, context }, info) => {
    test.skip(info.project.name !== 'chromium');
    await routingServer(context);
    const server = await catalogueServer(context);
    server.state.initiativePaymentPlan = true;
    await seedRouting(page, 'anonymous', language);
    await page.goto(`/projects/${ids.project}/units/${ids.unit}`);
    await expect(page.locator('.ud-title-mask h1')).toHaveCSS('opacity', '1');
    await page.locator('.ud-payment-plan').scrollIntoViewIfNeeded();
    await expect(page.locator('.ud-payment-row').first()).toHaveCSS('opacity', '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.ud-payment-row').last()).toBeVisible();
    await page.locator('.ud-back-link').click();
    await expect(page.locator('.pd-hero h1')).toHaveText('Garden Residence 1');
  });
}

test('staff receives the client-account notice instead of a reservation action', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromium');
  await routingServer(context, 'admin');
  await catalogueServer(context);
  await seedRouting(page, 'admin', 'en');
  await page.goto(`/projects/${ids.project}/units/${ids.unit}`);
  await expect(page.locator('.ud-reservation')).toContainText(en.staffReservation);
  await expect(page.locator('.ud-reservation button')).toHaveCount(0);
  await expect(page.locator('.ud-reservation')).toHaveCSS('border-inline-start-width', '2px');
});
