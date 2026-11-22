import { expect, test, profileRoute, sessionCors } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';
import { routingServer, seedRouting } from './routingFixtures';
import { openPublicSessionActions } from './publicHeaderActions';
import en from '../../src/i18n/locales/en/home.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/home.json' with { type: 'json' };
import aboutEn from '../../src/i18n/locales/en/about.json' with { type: 'json' };

for (const locale of ['en', 'ar'] as const) {
  test(`homepage catalogue, booklet, leadership and forms in ${locale}`, async ({ page, context }, info) => {
    const copy = locale === 'en' ? en : ar;
    const consoleErrors: string[] = [];
    page.on('console', message => {
      // Browsers report the anonymous profile bootstrap's expected 401 as a resource error.
      if (message.type() === 'error' && !(/401/.test(message.text()) && profileRoute.test(message.location().url))) consoleErrors.push(message.text());
    });
    await routingServer(context, 'anonymous');
    const server = await catalogueServer(context);
    server.state.projectCount = 4;
    server.state.regularProjectCount = 4;
    let contact: unknown;
    await context.route('**/api/v1/contact-submissions', route => {
      contact = route.request().postDataJSON();
      return route.fulfill({ headers: sessionCors, status: 201, json: { success: true, data: 'fixture-id' } });
    });
    await seedRouting(page, 'anonymous', locale);
    await page.goto('/');
    const hero = page.locator('.home-hero');
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(copy.hero.title);
    const carousel = page.locator('#initiatives');
    await expect(carousel.getByRole('article')).toHaveCount(3);
    const next = carousel.getByRole('button', { name: copy.projects.next });
    const prev = carousel.getByRole('button', { name: copy.projects.previous });
    await expect(prev).toBeDisabled();
    const onMobile = info.project.name.includes('mobile');
    await next.click();
    if (onMobile) await next.click();
    await next.click();
    await expect(carousel.getByRole('link', {name: 'Garden Residence 4'})).toBeVisible();
    await expect(next).toBeDisabled();
    await prev.click();
    await expect(carousel.getByRole('article')).toHaveCount(3);
    const booklet = page.locator('#booklet');
    await booklet.locator('summary').click();
    await expect(booklet.locator('.home-document')).toContainText('<b>This stays plain text.</b>');
    await expect(page.locator('#about h3')).toHaveText([copy.leadership.ceo.name, copy.leadership.strategy.name, copy.leadership.legal.name]);
    const works = page.locator('#regular-projects');
    await works.getByRole('button', { name: copy.regular.current, exact: true }).click();
    await expect(works.getByRole('status')).toHaveText(copy.regular.unclassified);
    await works.getByRole('button', { name: copy.regular.all }).click();
    await works.getByRole('button', { name: copy.projects.next }).click();
    await expect(works.getByRole('link', {name: 'Terrace Residence 4'})).toBeVisible();
    const form = page.getByRole('form', {name: copy.contact.registration});
    await expect(form.locator('input')).toHaveCount(2);
    await form.getByLabel(copy.contact.name).fill('Visitor');
    await form.getByLabel(copy.contact.phone).fill('123');
    await form.getByRole('button').click();
    await expect(form.getByText(copy.contact.invalidPhone)).toBeVisible();
    await form.getByLabel(copy.contact.phone).fill('٠١٠١٢٣٤٥٦٧٨');
    await form.getByRole('button').click();
    await expect(form.getByRole('status')).toHaveText(copy.contact.registered);
    expect(contact).toEqual({name:'Visitor', phone:'01012345678', inquiry:copy.contact.callback});
    await expect(page.getByRole('button', {name:copy.survey.send})).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await hero.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath(`home-${locale}.png`), animations:'disabled' });
    expect(consoleErrors).toEqual([]);
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
  await expect(navigation.getByRole('link')).toHaveText(['Home', 'About us', 'Projects', 'Terms']);
  await navigation.getByRole('link', { name: 'About us', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { name: aboutEn.hero.title, level: 1 })).toBeFocused();
  await openMenu();
  await expect(navigation.getByRole('link', { name: 'About us', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: 'Home', exact: true })).not.toHaveAttribute('aria-current');
  await navigation.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'All projects', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.goto('/');
  await page.locator('#initiatives').getByRole('link', { name: 'See all' }).click();
  await expect(page.getByRole('tab', { name: 'Initiative projects', exact: true })).toHaveAttribute('aria-selected', 'true');
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
      await expect(page.locator('#about h2')).toBeVisible();
      if (width < 1024) {
        await expect(page.locator('.home-hero-overlay')).toBeVisible();
        const imageBounds = (await hero.locator('.home-hero-image').boundingBox())!;
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
        await expect(page.locator('.home-hero-overlay')).toBeVisible();
        await expect(page.getByRole('link', { name: locale === 'ar' ? 'تسجيل الدخول' : 'Sign in', exact: true })).toBeVisible();
      }
      expect(await page.locator('body').innerText()).not.toContain('↗');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('.home-hero-image').evaluate(async (image) => (image as HTMLImageElement).decode());
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
  const terms = page.getByRole('region', { name: 'The initiative legal booklet', exact: true });
  await expect(terms.getByRole('button', { name: 'Try again' })).toBeVisible();
  server.state.failTerms = false;
  await terms.getByRole('button', { name: 'Try again' }).click();
  await expect(terms.locator('summary')).toBeVisible();
  await expect(terms.locator('.home-book')).toBeVisible();
  await expect(terms.getByRole('link', { name: 'Read the full booklet' })).toHaveAttribute('href', '/terms');
  server.state.missingTerms = true;
  await context.route('https://localhost:7249/api/v1/projects?*', (route) => route.fulfill({
    headers: { 'access-control-allow-origin': `https://localhost:${process.env.BROUJ_TEST_PORT ?? '5173'}`, 'access-control-allow-credentials': 'true' },
    json: { success: true, data: { items: [], pageNumber: 1, pageSize: 3, totalCount: 0, totalPages: 0 }, message: null },
  }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'New beginnings are on the way.' })).toBeVisible();
  const initiative = page.locator('#initiatives');
  await expect(initiative.getByRole('button', { name: 'Next projects' })).toBeDisabled();
  await expect(initiative.getByRole('button', { name: 'Previous projects' })).toBeDisabled();
  await expect(terms.getByRole('heading', { name: 'The booklet is awaiting publication.' })).toBeVisible();
  await expect(terms.getByRole('link')).toHaveCount(0);
});

test('hero layout follows locale direction and respects reduced motion', async ({ page, context }) => {
  await catalogueServer(context);
  await page.addInitScript(() => localStorage.setItem('brouj.locale', 'en'));
  await page.goto('/');
  await expect(page.locator('.home-hero-image')).toBeVisible();
  await expect(page.locator('.home-hero')).toHaveCSS('direction', 'ltr');
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  await expect(page.locator('.home-hero')).toHaveCSS('direction', 'rtl');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.home-hero-image')).toHaveCSS('animation-name', 'none');
});

test('all three local films play and return focus when closed', async ({ page, context }) => {
  await catalogueServer(context);
  await page.addInitScript(() => localStorage.setItem('brouj.locale', 'en'));
  await page.goto('/');
  const films = page.getByRole('button', { name: /^Play / });
  await expect(films).toHaveCount(3);
  for (const trigger of await films.all()) {
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('model rendering settles at rest and releases the canvas for reduced motion', async ({ page, context }, info) => {
  await catalogueServer(context);
  await seedRouting(page);
  await page.addInitScript(() => {
    if (!window.WebGL2RenderingContext) return;
    const original = WebGL2RenderingContext.prototype.drawElementsInstanced;
    WebGL2RenderingContext.prototype.drawElementsInstanced = function (...args) {
      const canvas = this.canvas;
      if (canvas instanceof HTMLCanvasElement) {
        canvas.dataset.draws = String(Number(canvas.dataset.draws ?? 0) + 1);
        canvas.dataset.lastDraw = String(performance.now());
      }
      original.apply(this, args);
    };
  });
  await page.goto('/');
  const canvas = page.locator('.home-model canvas');
  if (info.project.name.includes('mobile')) {
    await expect(page.locator('.home-hero-image')).toBeVisible();
    await expect(canvas).toHaveCount(0);
    return;
  }
  await page.getByRole('button', { name: en.hero.model }).click();
  await expect.poll(() => canvas.getAttribute('data-draws').then(Number)).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.home-hero')).toHaveAttribute('data-model','true');
  await expect.poll(() => canvas.evaluate(el => performance.now() - Number(el.dataset.lastDraw))).toBeGreaterThan(300);
  const idle = Number(await canvas.getAttribute('data-draws'));
  await page.mouse.move(500, 280);
  await expect.poll(() => canvas.getAttribute('data-draws').then(Number)).toBeGreaterThan(idle);
  await expect.poll(() => canvas.evaluate(el => performance.now() - Number(el.dataset.lastDraw))).toBeGreaterThan(300);
  await page.screenshot({path:info.outputPath('scale-model.png'), animations:'disabled'});
  await page.emulateMedia({ reducedMotion:'reduce' });
  await expect(canvas).toHaveCount(0);
  await expect(page.locator('.home-hero-image')).toHaveCSS('opacity', '1');
});

test('dragging the initiative gallery reveals the following project', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromium', 'Mouse drag complements the mobile navigation checks.');
  await catalogueServer(context);
  await seedRouting(page);
  await page.goto('/');
  const viewport = page.locator('.home-carousel-viewport');
  await viewport.scrollIntoViewIfNeeded();
  const bounds = (await viewport.boundingBox())!;
  const start = bounds.x + bounds.width * .8;
  const y = bounds.y + bounds.height * .4;
  const track = page.locator('.home-project-track');
  const resting = await track.evaluate(el => getComputedStyle(el).transform);
  await page.mouse.move(start, y);
  await page.mouse.down();
  await page.mouse.move(start + (await page.locator('html').getAttribute('dir') === 'rtl' ? 1 : -1) * bounds.width * .35, y, {steps:12});
  await page.mouse.up();
  await expect.poll(() => track.evaluate(el => getComputedStyle(el).transform)).not.toEqual(resting);
});

test('configured status collections and survey submit through the public API', async ({ page, context }) => {
  const surveyPath = process.env.VITE_HOME_SURVEY_PATH;
  const projectId = process.env.VITE_HOME_CURRENT_PROJECT_IDS;
  test.skip(!surveyPath || !projectId, 'Run with a connected survey and curated project status.');
  await routingServer(context);
  await catalogueServer(context);
  await context.route('**/api/v1/projects/' + projectId, route => route.fulfill({
    headers:sessionCors, json:{success:true, data:{id:projectId,name:'Published current work',projectType:0,size:1250}},
  }));
  let body: unknown;
  await context.route('**' + surveyPath, route => {
    body = route.request().postDataJSON();
    return route.fulfill({headers: sessionCors, json:{success:true, data:'response-id'}});
  });
  await seedRouting(page);
  await page.goto('/');
  const works = page.locator('#regular-projects');
  await works.getByRole('button', {name: en.regular.current, exact:true}).click();
  await expect(works.getByRole('link', {name:'Published current work'})).toHaveAttribute('href', '/projects/' + projectId);
  const survey = page.getByRole('form', {name:en.survey.title});
  await survey.getByRole('button').click();
  expect(body).toBeUndefined();
  await survey.getByLabel(en.survey.priority).selectOption('design');
  await survey.getByLabel(en.survey.clarity).selectOption('clear');
  await survey.getByLabel(en.survey.suggestion).fill('More courtyard plans');
  await survey.getByRole('button').click();
  await expect(survey.getByRole('status')).toHaveText(en.survey.sent);
  expect(body).toEqual({priority:'design', clarity:'clear', suggestion:'More courtyard plans'});
});
