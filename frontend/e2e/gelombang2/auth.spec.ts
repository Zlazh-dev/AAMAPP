import { test, expect } from '@playwright/test';

test.describe('Auth (Login/Logout)', () => {
  test('Login berhasil, lalu logout kembali ke login form', async ({ page }) => {
    // 1. Kunjungi halaman login
    await page.goto('/login');
    await expect(page.getByText('AAMAPP').first()).toBeVisible();

    // 2. Isi form
    await page.locator('input[type="email"]').fill('admin@aamapp.sch.id');
    await page.locator('input[type="password"]').fill('admin12345');
    await page.getByRole('button', { name: 'Masuk' }).click();

    // 3. Verifikasi masuk ke dashboard (home)
    await page.waitForURL('**/admin');
    // Ensure dashboard title or user profile menu is visible
    await expect(page.getByRole('button', { name: /admin/i })).toBeVisible();

    // 4. Logout
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: /Keluar/i }).click();

    // 5. Kembali ke login form
    await page.waitForURL('**/login');
    await expect(page.getByText('AAMAPP').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
  });
});
