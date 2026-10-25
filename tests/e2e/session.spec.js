import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('server login survives reload, lazy tools open, logout removes access', async ({
  page,
  context,
}) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ body: '', contentType: 'text/css' }),
  );
  await page.goto('/');
  await page.evaluate(() => sessionStorage.setItem('pc_auth', '1'));
  await page.reload();
  await expect(page.getByLabel('Username')).toBeVisible();
  await page.getByLabel('Username').fill('test-owner');
  await page.getByLabel('Password').fill('test-only-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /generate post/i }),
  ).toBeVisible();
  if (process.env.UPDATE_SCREENSHOTS) {
    await mkdir('docs/screenshots', { recursive: true });
    await page.screenshot({
      path: 'docs/screenshots/postcraft.png',
      fullPage: true,
    });
  }
  await page
    .getByRole('button', { name: 'Carousel Maker', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /generate carousel/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.getByLabel('Username')).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === 'pc_session')).toBe(
    false,
  );
  expect((await page.request.get('/api/linkedin/status')).status()).toBe(401);
});
