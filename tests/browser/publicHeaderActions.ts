import type { Page } from '@playwright/test';

/** Public account actions live in the compact desktop disclosure or the mobile navigation panel. */
export async function openPublicSessionActions(page: Page) {
  // Finish lazy route focus restoration before opening a disclosure that closes when focus leaves it.
  await page.locator('[data-route-focus]').waitFor({ state: 'visible' });
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    const menu = page.getByRole('button', { name: /^(Menu|Close menu|القائمة|إغلاق القائمة)$/ });
    if (await menu.getAttribute('aria-expanded') !== 'true') {
      await menu.click();
    }
    return;
  }
  await page.getByRole('button', { name: /^(Account actions|خيارات الحساب)$/ }).click();
}
