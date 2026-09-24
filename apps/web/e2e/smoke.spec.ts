import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/explore',
  '/community',
  '/bookings',
  '/pets',
  '/profile',
  '/tracking',
  '/hazard/radar',
  '/hazard/report',
];

test.beforeEach(async ({ page }) => {
  await page.route('**/auth/v1/session', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: null, token_type: 'bearer', user: null, session: null }),
    })
  );
  await page.route('**/rest/v1/**', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
});

test.describe('Web smoke flows', () => {
  for (const route of routes) {
    test(`${route} renders with the design system stylesheet`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
      const stylesheets = page.locator('link[rel="stylesheet"]');
      await expect(stylesheets.first()).toBeAttached();
      const stylesheetResponse = await page.request.get(
        new URL((await stylesheets.first().getAttribute('href')) ?? '', page.url()).toString()
      );
      expect(stylesheetResponse.status()).toBe(200);
    });
  }

  test('keeps the shared back navigation on the left', async ({ page }) => {
    await page.goto('/community', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: /Dashboard/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/');
  });
});
