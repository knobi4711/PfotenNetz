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
  '/booking/smoke-test',
  '/chat/smoke-test',
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

  test('covers authenticated pet health, booking chat and media flows', async ({ page }) => {
    const userId = '00000000-0000-0000-0000-000000000001';
    const petId = '00000000-0000-0000-0000-000000000002';
    const pet = {
      id: petId,
      owner_id: userId,
      name: 'Testtier',
      species: 'dog',
      breed: 'Mischling',
      birth_date: '2020-01-01',
      weight_kg: 12,
      color: 'Braun',
      microchip_number: null,
      tattoo_number: null,
      insurance_policy: null,
      vet_clinic: 'Testpraxis',
      vet_phone: '+49 30 123456',
      medications: ['Bisheriges Mittel'],
      allergies: ['Keine bekannt'],
      special_needs: null,
      emergency_card: {},
      avatar_url: null,
      is_active: true,
      is_deceased: false,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    const bookingId = '00000000-0000-0000-0000-000000000003';
    const helperId = '00000000-0000-0000-0000-000000000004';
    const profile = {
      id: userId,
      display_name: 'Testkonto',
      role: 'user',
      trust_level: 'new',
      avatar_url: null,
      phone: null,
      bio: null,
      address: null,
      city: null,
      postal_code: null,
      notification_prefs: {},
      kiez_radius_km: 5,
    };
    const booking = {
      id: bookingId,
      booking_number: 'PN-TEST-0001',
      seeker_id: userId,
      helper_id: helperId,
      pet_id: petId,
      type: 'dog_walking',
      status: 'confirmed',
      start_at: '2026-10-01T10:00:00.000Z',
      end_at: '2026-10-01T11:00:00.000Z',
      meeting_address: 'Teststraße 1',
      notes: null,
      currency: 'KIEZ_HOURS',
      price_kiez_hours: 1,
      price_eur_cents: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      pet,
      seekerProfile: profile,
      helperProfile: { id: helperId, display_name: 'Testhelfer' },
    };
    const message = {
      id: '00000000-0000-0000-0000-000000000005',
      booking_id: bookingId,
      sender_id: userId,
      type: 'text',
      content: 'Bin gleich da.',
      metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    };

    const authUser = {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.invalid',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const authSession = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: authUser,
    };
    await page.addInitScript(
      ({ session }) => {
        window.localStorage.setItem('sb-njkyujhbcolvtcnlahsk-auth-token', JSON.stringify(session));
      },
      { session: authSession }
    );
    await page.unroute('**/auth/v1/session');
    await page.unroute('**/rest/v1/**');
    await page.route('**/auth/v1/session', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...authSession,
        }),
      })
    );
    await page.route('**/auth/v1/user', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(authUser),
      })
    );
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/pets')) {
        if (route.request().method() === 'PATCH') {
          const body = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
          expect(body.medications).toEqual(['Insulin', 'Vitamin B']);
          expect(body.allergies).toEqual(['Huhn']);
          expect(body.vet_clinic).toBe('Neue Testpraxis');
          expect(body.vet_phone).toBe('+49 30 987654');
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([pet]),
        });
        return;
      }
      if (url.pathname.endsWith('/profiles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([profile]),
        });
        return;
      }
      if (url.pathname.endsWith('/bookings')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(booking),
        });
        return;
      }
      if (url.pathname.endsWith('/messages')) {
        if (route.request().method() === 'POST') {
          const body = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
          expect(body.booking_id).toBe(bookingId);
          if (body.type === 'text') {
            expect(body.content).toBe('Bin gleich da.');
          } else {
            expect(body.type).toBe('image');
            expect(body.content).toBe('Foto');
          }
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(message),
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/storage/v1/object/**', async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: 'test.jpg' }),
      })
    );

    await page.goto('/pets', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Testtier' })).toBeVisible();
    await page.getByRole('button', { name: 'Gesundheitsdaten bearbeiten' }).click();
    await page.getByLabel('Medikamente').fill('Insulin, Vitamin B');
    await page.getByLabel('Allergien').fill('Huhn');
    await page.getByLabel('Tierarztpraxis').fill('Neue Testpraxis');
    await page.getByLabel('Tierarzt-Telefon').fill('+49 30 987654');
    await page.getByRole('button', { name: 'Gesundheitsdaten speichern' }).click();
    await expect(page.getByRole('button', { name: 'Gesundheitsdaten speichern' })).toBeVisible();
    await page.goto(`/chat/${bookingId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Betreuung für Testtier')).toBeVisible();
    await page.getByRole('textbox', { name: 'Nachricht' }).fill('Bin gleich da.');
    await page.getByRole('button', { name: 'Senden' }).click();
    await expect(page.getByRole('textbox', { name: 'Nachricht' })).toHaveValue('');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'sichtung.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test-image'),
    });
  });
});
