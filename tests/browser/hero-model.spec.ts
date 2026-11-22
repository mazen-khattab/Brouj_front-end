import { test, expect, profileRoute } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';

test('twilight pavilion renders, tracks the pointer, settles and remounts cleanly at 1440px', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromium');
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('console', message => {
    // Screenshot readbacks can produce Chrome GPU performance notices; capture actual errors.
    if ((message.type() === 'error' || /shader.*(error|fail)|INVALID_(OPERATION|VALUE|ENUM)|context lost/i.test(message.text())) &&
      !(profileRoute.test(message.location().url) && message.text().includes('401')))
      errors.push(message.text());
  });
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.drawElementsInstanced;
    WebGL2RenderingContext.prototype.drawElementsInstanced = function (...args) {
      if (this.canvas instanceof HTMLCanvasElement) {
        this.canvas.dataset.draws = String(Number(this.canvas.dataset.draws ?? 0) + 1);
        this.canvas.dataset.lastDraw = String(performance.now());
      }
      original.apply(this, args);
    };
  });
  await catalogueServer(context);
  await seedRouting(page, 'anonymous', 'en');
  await page.goto('/');
  const toggle = page.locator('.home-model-toggle');
  const stage = page.locator('.home-hero-stage');
  await expect(page.locator('.home-hero-showcase')).toHaveCSS('transform', /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  const frame = await stage.boundingBox();
  await toggle.click();
  const canvas = page.locator('.home-model canvas');
  await expect.poll(() => canvas.getAttribute('data-draws').then(Number), { timeout: 20000 }).toBeGreaterThan(10);
  await expect.poll(() => canvas.evaluate(el => performance.now() - Number(el.dataset.lastDraw))).toBeGreaterThan(350);
  expect(await stage.boundingBox()).toEqual(frame);
  const idle = Number(await canvas.getAttribute('data-draws'));
  await page.mouse.move(1100, 250);
  await expect.poll(() => canvas.getAttribute('data-draws').then(Number)).toBeGreaterThan(idle);
  await expect.poll(() => canvas.evaluate(el => performance.now() - Number(el.dataset.lastDraw))).toBeGreaterThan(350);
  await page.screenshot({ path: info.outputPath('twilight-pavilion-1440.png'), animations: 'disabled' });
  await toggle.click();
  await expect(canvas).toHaveCount(0);
  await toggle.click();
  await expect.poll(() => canvas.getAttribute('data-draws').then(Number), { timeout: 20000 }).toBeGreaterThan(10);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveCount(0);
  expect(errors).toEqual([]);
});
