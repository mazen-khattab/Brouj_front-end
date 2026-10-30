import type { Page } from '@playwright/test';

export async function openProjectFilters(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) < 1024) {
    const trigger = page.getByRole('button', { name: /^(Filters|Hide filters|التصفية|إخفاء التصفية)$/ });
    if (await trigger.getAttribute('aria-expanded') !== 'true') {
      await trigger.click();
    }
  }
}
