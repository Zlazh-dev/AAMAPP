import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Mobile Bottom Sheet (Poin 12/15 T16)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/orang/guru');
  });

  test('Klik menu 3-titik menampilkan BottomSheet pada mobile viewport', async ({ page }) => {
    // Wait for the list to load
    await expect(page.getByRole('heading', { name: 'Data Guru' })).toBeVisible();

    // Click the ⋮ ("Menu halaman") trigger button — PageMenu renders this
    // as an accessible button with aria-label="Menu halaman".
    await page.getByRole('button', { name: 'Menu halaman' }).click();

    // Verify Bottom Sheet appears (PageMenu renders role="dialog" aria-modal on mobile)
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify primary action exists in the bottom sheet
    await expect(dialog.getByText('Tambah Guru')).toBeVisible();

    // Tap the action -> it should navigate and close the sheet
    await dialog.getByText('Tambah Guru').click();

    // Check navigation to the Guru form page
    await page.waitForURL('**/admin/orang/guru/baru');
    await expect(dialog).not.toBeVisible();
  });
});
