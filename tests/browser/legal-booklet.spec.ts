import { test, expect, profileRoute, sessionCors } from './sessionFixtures';
import { seedRouting } from './routingFixtures';
import { catalogueServer } from './catalogueFixtures';
import en from '../../src/i18n/locales/en/legal.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/legal.json' with { type: 'json' };

const endpoint = 'https://localhost:7249/api/v1/terms-and-conditions/current';
const headings = {
  en: ['Article 1: Participation', 'Article 2: Documentation', 'Article 3: Project review', 'Article 4: Inquiries'],
  ar: ['المادة الأولى: المشاركة', 'المادة الثانية: الوثائق', 'المادة الثالثة: مراجعة المشروعات', 'المادة الرابعة: الاستفسارات'],
};
function publication(locale: 'en' | 'ar') {
  const paragraph = locale === 'en'
    ? 'The published booklet brings the initiative’s participation information together in one reference. Read the complete wording alongside the project information and contact the Brouj team if you need clarification. Each paragraph is displayed as supplied by the publication service.'
    : 'تجمع الكراسة المنشورة معلومات المشاركة في المبادرة في مرجع واحد. يُرجى قراءة النص كاملًا إلى جانب معلومات المشروع، والتواصل مع فريق بروج عند الحاجة إلى توضيح. تظهر كل فقرة كما وردت من خدمة نشر الوثائق.';
  const notice = locale === 'en' ? 'Notice: This is the wording supplied in the published document.' : 'تنبيه: هذا هو النص الوارد في الوثيقة المنشورة.';
  return {
    id: 'booklet-review', title: locale === 'en' ? 'Brouj Initiative · Participation terms' : 'مبادرة بروج · شروط المشاركة',
    content: headings[locale].map((heading, index) => `${heading}\n\n${Array(3).fill(paragraph).join('\n\n')}${index === 1 ? `\n\n${notice}` : ''}`).join('\n\n'),
    versionNumber: '3.2', effectiveDate: '2026-10-01T00:00:00Z', isActive: true,
  };
}

for (const locale of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`legal reader ${locale} at ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== 'chromium');
      const copy = locale === 'en' ? en : ar;
      const publishedDocument = publication(locale);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401'))) errors.push(message.text());
      });
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await seedRouting(page, 'anonymous', locale);
      await page.route(endpoint, route => route.fulfill({ headers: sessionCors, json: { success: true, data: publishedDocument } }));
      await page.goto('/terms');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.hero.title);
      await expect(page.locator('.legal-page')).toHaveCSS('direction', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.legal-document h3')).toHaveText(headings[locale]);
      await expect(page.locator('.legal-callout')).toBeVisible();
      await expect(page.locator('.legal-hero-intro')).toHaveCSS('opacity', '1');
      await expect(page.getByRole('button', { name: copy.hero.print })).toBeEnabled();
      await expect(page.locator('.legal-metadata')).toContainText('3.2');
      await page.screenshot({ path: info.outputPath(`legal-hero-${locale}-${width}.png`), animations: 'disabled' });
      const index = page.locator(width === 1440 ? '.legal-desktop-index' : '.legal-mobile-index');
      if (width === 390) await index.locator('summary').click();
      await index.locator('a').nth(2).click();
      const target = page.locator('#legal-section-3');
      await expect(target).toBeFocused();
      await expect(index.locator('a').nth(2)).toHaveAttribute('aria-current', 'location');
      if (width === 390) await expect(index).not.toHaveAttribute('open');
      const header = (await page.locator('.home-shell > header').boundingBox())!;
      const targetBounds = (await target.boundingBox())!;
      const indexBounds = (await index.boundingBox())!;
      expect(targetBounds.y).toBeGreaterThan(header.height + (width === 390 ? indexBounds.height : 0));
      if (width === 1440) expect(indexBounds.y).toBeGreaterThan(header.height);
      await expect.poll(async () => Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThan(10);
      await page.screenshot({ path: info.outputPath(`legal-reader-${locale}-${width}.png`), animations: 'disabled' });
      await page.locator('.legal-closing').scrollIntoViewIfNeeded();
      await expect.poll(async () => Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'))).toBe(100);
      await expect(index.locator('a').last()).toHaveAttribute('aria-current', 'location');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.legal-clause').evaluateAll(elements => elements.some(el => el.scrollWidth > el.clientWidth + 1))).toBe(false);
      await page.screenshot({ path: info.outputPath(`legal-full-${locale}-${width}.png`), fullPage: true, animations: 'disabled', style: '.home-shell > header, a[href="#route-content"], .legal-mobile-index, .legal-reading-progress { visibility: hidden; }' });
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('.home-shell > header')).toBeHidden();
      await expect(index).toBeHidden();
      await expect(page.locator('.legal-print')).toBeHidden();
      await expect(page.locator('.legal-closing')).toBeHidden();
      await expect(page.locator('.legal-clause-body').first()).toBeVisible();
      await expect(page.locator('.legal-clause-text').first()).toHaveCSS('opacity', '1');
      if (locale === 'en' && width === 1440) await page.pdf({ path: info.outputPath('legal-booklet-print.pdf'), printBackground: true });
      await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
      await page.evaluate(() => window.scrollTo(0, 0));
      if (width === 390) await index.locator('summary').click();
      await index.locator('a').nth(1).click();
      await expect(page.locator('#legal-section-2')).toBeFocused();
      expect(errors).toEqual([]);
    });

    test(`pending legal publication ${locale} at ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== 'chromium');
      const copy = locale === 'en' ? en : ar;
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await seedRouting(page, 'anonymous', locale);
      let published = false;
      await page.route(endpoint, route => published
        ? route.fulfill({ headers: sessionCors, json: { success: true, data: publication(locale) } })
        : route.fulfill({ status: 404, headers: sessionCors, json: { status: 404 } }));
      await page.goto('/terms');
      await expect(page.getByRole('heading', { name: copy.pending.title })).toBeVisible();
      await expect(page.getByRole('progressbar')).toHaveCount(0);
      await expect(page.locator('.legal-print')).toBeDisabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`legal-pending-${locale}-${width}.png`), fullPage: true, animations: 'disabled', style: 'a[href="#route-content"] { visibility: hidden; }' });
      published = true;
      await page.getByRole('button', { name: copy.pending.check }).click();
      await expect(page.locator('.legal-document')).toBeVisible();
    });
  }
}

test('legal reader preserves unstructured text, retries errors and invokes print', async ({ page }) => {
  await seedRouting(page);
  let failed = true;
  const content = 'Supplied legal text.\n<b>This stays plain text.</b>\n<script>window.unexpectedExecution = true</script>';
  await page.route(endpoint, route => failed
    ? route.fulfill({ status: 503, headers: sessionCors, json: { status: 503 } })
    : route.fulfill({ headers: sessionCors, json: { success: true, data: { ...publication('en'), content } } }));
  await page.goto('/terms');
  await expect(page.getByText('We could not load this section', { exact: true })).toBeVisible();
  failed = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.legal-clause')).toHaveCount(1);
  await expect(page.locator('.legal-clause-body')).toHaveText(content);
  await expect(page.locator('.legal-clause b, .legal-clause script')).toHaveCount(0);
  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printed = 'true'; }; });
  await page.locator('.legal-print').click();
  await expect(page.locator('html')).toHaveAttribute('data-printed', 'true');
  await page.locator('.legal-closing a').first().click();
  await expect(page).toHaveURL(/\/projects\?projectType=1$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false);
});

test('empty and inactive publications remain pending', async ({ page }) => {
  await seedRouting(page);
  let inactive = false;
  await page.route(endpoint, route => route.fulfill({ headers: sessionCors, json: {
    success: true, data: { ...publication('en'), ...(inactive ? { isActive: false } : { content: ' \n\t ' }) },
  } }));
  for (const value of [false, true]) {
    inactive = value;
    await page.goto('/terms');
    await expect(page.locator('.legal-pending')).toBeVisible();
    await expect(page.locator('.legal-document')).toHaveCount(0);
    await expect(page.locator('.legal-print')).toBeDisabled();
  }
});

test('legal closing contact link reaches the homepage contact section', async ({ page, context }) => {
  await seedRouting(page);
  await catalogueServer(context);
  await page.goto('/terms');
  await expect(page.locator('.legal-closing a').last()).toHaveAttribute('href', '/#contact');
  await page.locator('.legal-closing a').last().click();
  await expect(page).toHaveURL(/\/#contact$/);
  const contact = page.locator('#contact');
  await expect(contact).toBeVisible();
  await expect.poll(async () => Math.abs((await contact.boundingBox())!.y)).toBeLessThan(200);
});
