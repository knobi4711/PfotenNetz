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
  '/missing',
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

  test('renders a valid cached emergency card when offline', async ({ page }) => {
    const token = 'offline-test-token';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await page.addInitScript(
      ({ cacheKey, card }) => {
        window.localStorage.setItem(cacheKey, JSON.stringify(card));
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      },
      {
        cacheKey: `pfotennetz.public-emergency.${token}`,
        card: {
          name: 'Testtier',
          species: 'dog',
          breed: 'Mischling',
          color: 'Braun',
          birth_date: null,
          microchip_number: 'TEST-123',
          medications: ['Keine'],
          allergies: [],
          special_needs: null,
          vet_clinic: 'Testpraxis',
          vet_phone: null,
          insurance_policy: null,
          avatar_url: null,
          expires_at: expiresAt,
        },
      }
    );
    await page.goto(`/emergency/${token}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Offline-Modus: zuletzt synchronisierte Karte.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Testtier' })).toBeVisible();
  });
});
