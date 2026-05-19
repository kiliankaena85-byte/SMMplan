import { test, expect } from './fixtures/auth.fixture';

const USER_ROUTES = [
  '/dashboard',
  '/dashboard/new-order',
  '/dashboard/orders',
  '/dashboard/add-funds',
  '/dashboard/tickets',
  '/dashboard/settings',
  '/dashboard/settings/api',
  '/dashboard/referrals'
];

const ADMIN_ROUTES = [
  '/admin/dashboard',
  '/admin/catalog',
  '/admin/providers',
  '/admin/orders',
  '/admin/clients',
  '/admin/tickets',
  '/admin/finance',
  '/admin/settings',
  '/admin/catalog/quarantine'
];

for (const route of USER_ROUTES) {
  test(`User: ${route} returns 200`, async ({ userPage }) => {
    const response = await userPage.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    expect(userPage.url()).not.toContain('/login');
    await expect(userPage.locator('body')).not.toContainText('Страница не найдена');
  });
}

for (const route of ADMIN_ROUTES) {
  test(`Admin: ${route} returns 200`, async ({ adminPage }) => {
    const response = await adminPage.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    expect(adminPage.url()).not.toContain('/login');
    await expect(adminPage.locator('body')).not.toContainText('Страница не найдена');
  });
}
