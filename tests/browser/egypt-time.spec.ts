import { test, expect } from './test';
import { catalogueIds, catalogueServer } from './catalogueFixtures';
import { routingServer, seedRouting } from './routingFixtures';

test.use({ timezoneId: 'America/Los_Angeles' });

test('project dates display in Egypt while the browser uses Los Angeles time', async ({ page, context }) => {
  await routingServer(context);
  await catalogueServer(context);
  await seedRouting(page, 'anonymous', 'en');
  await page.goto('/projects/' + catalogueIds.project);
  const draw = page.locator('time[datetime="2026-12-01T12:00:00Z"]');
  await expect(draw).toContainText('Dec 1, 2026');
  await expect(draw).toContainText('02:00 PM');
  expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe('America/Los_Angeles');
});
