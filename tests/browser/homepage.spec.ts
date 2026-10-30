import { expect, test, profileRoute } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';
import { routingServer, seedRouting } from './routingFixtures';
import { openPublicSessionActions } from './publicHeaderActions';

for (const locale of ['en', 'ar'] as const) {
  test(`homepage sections, carousel and owner panels in ${locale}`, async ({ page, context }, info) => {
    const server = await catalogueServer(context);
    server.state.projectCount = 4;
    await page.addInitScript((language) => localStorage.setItem('brouj.locale', language), locale);
    await page.goto('/');
    const english = locale === 'en';
    const hero = page.getByRole('region', { name: english ? 'Welcome to Brouj' : 'مرحبًا بك في بروج', exact: true });
    await expect(hero.getByRole('link')).toHaveCount(1);
    await expect(hero.getByRole('link', { name: english ? 'Explore projects' : 'استكشف المشروعات' })).toBeVisible();
    const carousel = page.getByRole('region', { name: english ? 'Initiative projects' : 'مشروعات المبادرة', exact: true }).last();
    await expect(carousel.getByRole('article')).toHaveCount(3);
    await expect(carousel.getByRole('link', { name: 'Garden Residence 1', exact: true })).toBeVisible();
    const previous = carousel.getByRole('button', { name: english ? 'Previous projects' : 'المشروعات السابقة' });
    const next = carousel.getByRole('button', { name: english ? 'Next projects' : 'المشروعات التالية' });
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(carousel.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
    await expect(carousel.getByRole('article')).toHaveCount(1);
    await expect(next).toBeDisabled();
    await previous.click();
    await expect(carousel.getByRole('link', { name: 'Garden Residence 1', exact: true })).toBeVisible();
    const projectCalls = server.calls.filter((url) => url.pathname === '/api/v1/projects');
    expect(projectCalls.map((url) => url.searchParams.get('pageNumber'))).toEqual(['1', '2', '1']);
    expect(projectCalls.every((url) => url.searchParams.get('projectType') === '1' && url.searchParams.get('pageSize') === '3')).toBe(true);

    const about = page.locator('#about');
    const panels = about.getByRole('button');
    await expect(panels.nth(0)).toHaveAttribute('aria-expanded', 'true');
    await panels.nth(1).focus();
    await expect(panels.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(panels.nth(0)).toHaveAttribute('aria-expanded', 'false');
    if (info.project.name === 'chromium') {
      await panels.nth(2).hover();
      await expect(panels.nth(2)).toHaveAttribute('aria-expanded', 'true');
      await expect.poll(async () => (await panels.nth(2).boundingBox())!.width > (await panels.nth(1).boundingBox())!.width).toBe(true);
    } else {
      await panels.nth(2).tap();
      await expect(panels.nth(2)).toHaveAttribute('aria-expanded', 'true');
    }

    await expect(page.locator('form input')).toHaveCount(1);
    await expect(page.locator('form textarea')).toHaveCount(1);
    await page.getByLabel(english ? 'Name' : 'الاسم', { exact: true }).fill('Visitor');
    await page.getByLabel(english ? 'Subject' : 'الموضوع', { exact: true }).fill('A question about Brouj');
    await expect(page.getByRole('button', { name: english ? 'Send message' : 'إرسال الرسالة' })).toBeDisabled();
    await expect(page.locator('footer')).toContainText(english ? 'All rights reserved.' : 'جميع الحقوق محفوظة.');
    await expect(page.locator('footer a')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Capture the resting design after the interaction checks.
    await page.locator('#contact-name').fill('');
    await page.locator('#contact-subject').fill('');
    await panels.nth(0).click();
    await page.mouse.move(0, 0);
    await page.locator('#about').evaluate((element) => (element as HTMLElement).blur());
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      scrollTo(0, 0);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath(`home-${locale}.png`), fullPage: true, animations: 'disabled' });
  });
}

test('navbar destinations preserve initiative filtering and open the About page', async ({ page, context }, info) => {
  await catalogueServer(context);
  await page.addInitScript(() => localStorage.setItem('brouj.locale', 'en'));
  await page.goto('/terms');
  const openMenu = async () => {
    if (info.project.name.includes('mobile')) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
    }
  };
  await openMenu();
  const navigation = page.getByRole('navigation', { name: 'Main navigation' }).filter({ visible: true });
  await expect(navigation.getByRole('link')).toHaveText(['Home', 'About us', 'Initiative projects', 'Terms']);
  await navigation.getByRole('link', { name: 'About us', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { name: 'About us', level: 1 })).toBeFocused();
  await openMenu();
  await expect(navigation.getByRole('link', { name: 'About us', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: 'Home', exact: true })).not.toHaveAttribute('aria-current');
  await navigation.getByRole('link', { name: 'Initiative projects', exact: true }).click();
  await expect(page.getByLabel('Project type', { exact: true })).toHaveValue('1');
  await page.goto('/');
  await page.locator('#initiatives').getByRole('link', { name: 'See all' }).click();
  await expect(page.getByLabel('Project type', { exact: true })).toHaveValue('1');
});

for (const locale of ['en', 'ar'] as const) {
  test(`tablet and desktop hero/nav layout in ${locale}`, async ({ page, context }, info) => {
    test.skip(info.project.name !== 'chromium', 'These intermediate widths supplement the existing mobile captures.');
    await catalogueServer(context);
    await seedRouting(page, 'anonymous', locale);
    for (const width of [768, 1024]) {
      await page.setViewportSize({ width, height: 1024 });
      await page.goto('/');
      const hero = page.locator('.home-hero');
      await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.locator('html').evaluate((element) => getComputedStyle(element).fontSize)).toBe(locale === 'ar' ? '18px' : '16px');
      await expect(page.getByRole('heading', { name: locale === 'ar' ? 'من نحن' : 'About us', exact: true })).toBeVisible();
      if (width < 1024) {
        await expect(page.locator('.home-hero-overlay')).toBeVisible();
        const imageBounds = (await hero.locator('img').boundingBox())!;
        const titleBounds = (await hero.getByRole('heading', { level: 1 }).boundingBox())!;
        expect(titleBounds.y).toBeGreaterThan(imageBounds.y);
        expect(titleBounds.y + titleBounds.height).toBeLessThan(imageBounds.y + imageBounds.height);
        const menu = page.getByRole('button', { name: locale === 'ar' ? 'القائمة' : 'Menu', exact: true });
        await expect(menu).toHaveText('');
        await menu.click();
        const links = page.getByRole('navigation', { name: locale === 'ar' ? 'التنقل الرئيسي' : 'Main navigation' }).filter({ visible: true }).getByRole('link');
        const positions = await links.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
        expect(positions.every((top, index) => index === 0 || top > positions[index - 1]!)).toBe(true);
        await page.keyboard.press('Escape');
        await expect(menu).toBeFocused();
      } else {
        await expect(page.locator('.home-hero-overlay')).toBeHidden();
        await expect(page.getByRole('link', { name: locale === 'ar' ? 'تسجيل الدخول' : 'Sign in', exact: true })).toBeVisible();
      }
      expect(await page.locator('body').innerText()).not.toContain('↗');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('.home-hero img').evaluate(async (image) => (image as HTMLImageElement).decode());
      await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); scrollTo(0, 0); });
      await page.screenshot({ path: info.outputPath(`home-${locale}-${width}.png`), fullPage: true, animations: 'disabled' });
    }
  });

  for (const actor of ['customer', 'admin'] as const) {
    test(`public account actions for ${actor} in ${locale}`, async ({ page, context }, info) => {
      // The foundation fixture forces anonymous profile reads; let the signed-in fixture own these tests.
      await page.unroute(profileRoute);
      const server = await routingServer(context, actor);
      await catalogueServer(context);
      await seedRouting(page, actor, locale);
      await page.goto('/');
      await openPublicSessionActions(page);
      const accountName = actor === 'customer' ? (locale === 'ar' ? 'حسابي' : 'My account') : (locale === 'ar' ? 'لوحة الإدارة' : 'Dashboard');
      const account = page.locator('header').getByRole('link', { name: accountName, exact: true });
      await expect(account).toBeVisible();
      if (info.project.name === 'chromium') {
        await page.keyboard.press('Escape');
        const trigger = page.getByRole('button', { name: locale === 'ar' ? 'خيارات الحساب' : 'Account actions', exact: true });
        await expect(trigger).toBeFocused();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await trigger.click();
        await page.getByRole('heading', { level: 1 }).click();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await trigger.click();
      }
      await account.click();
      await expect(page).toHaveURL(actor === 'customer' ? /\/account$/ : /\/admin$/);
      await page.goto('/');
      await openPublicSessionActions(page);
      await page.getByRole('button', { name: locale === 'ar' ? 'تسجيل الخروج' : 'Sign out', exact: true }).click();
      await expect.poll(() => server.state.actor).toBe('anonymous');
      await expect(page.getByRole('button', { name: locale === 'ar' ? 'خيارات الحساب' : 'Account actions', exact: true })).toHaveCount(0);
    });
  }
}

test('homepage handles independent read failures, retry and an empty initiative collection', async ({ page, context }) => {
  const server = await catalogueServer(context);
  server.state.failTerms = true;
  await page.addInitScript(() => localStorage.setItem('brouj.locale', 'en'));
  await page.goto('/');
  await expect(page.locator('#initiatives article')).toHaveCount(3);
  const terms = page.getByRole('region', { name: 'Terms & conditions', exact: true });
  await expect(terms.getByRole('button', { name: 'Try again' })).toBeVisible();
  server.state.failTerms = false;
  await terms.getByRole('button', { name: 'Try again' }).click();
  await expect(terms.getByRole('heading', { name: 'Published terms' })).toBeVisible();
  await context.route('https://localhost:7249/api/v1/projects?*', (route) => route.fulfill({
    headers: { 'access-control-allow-origin': 'https://localhost:5173', 'access-control-allow-credentials': 'true' },
    json: { success: true, data: { items: [], pageNumber: 1, pageSize: 3, totalCount: 0, totalPages: 0 }, message: null },
  }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'New beginnings are on the way.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next projects' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous projects' })).toBeDisabled();
});

test('hero entrance follows locale direction and respects reduced motion', async ({ page, context }) => {
  await catalogueServer(context);
  await page.addInitScript(() => localStorage.setItem('brouj.locale', 'en'));
  await page.goto('/');
  await expect(page.locator('.home-hero-image')).toBeVisible();
  expect(await page.locator('.home-hero-image').evaluate((element) => getComputedStyle(element).getPropertyValue('--hero-start').trim())).toBe('3rem');
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  expect(await page.locator('.home-hero-image').evaluate((element) => getComputedStyle(element).getPropertyValue('--hero-start').trim())).toBe('-3rem');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.home-hero-image')).toHaveCSS('animation-name', 'none');
});
