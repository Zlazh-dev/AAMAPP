import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * BACKLINK-ADAPTIF-MOBILE — bagian desktop: memastikan tautan teks
 * "← Kembali" tetap ditampilkan di atas halaman pada layar besar
 * (perilaku lama, tidak berubah).
 */
test.describe('BackLink adaptif desktop', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Desktop: tautan teks "Kembali" tampil di atas halaman detail kelas', async ({ page }) => {
    await page.goto('/admin/kelas');
    await expect(page.getByRole('heading', { name: 'Data Kelas' })).toBeVisible();
    // Baris tabel desktop pakai onClick (bukan <a href>) → klik baris pertama.
    await page.locator('table tbody tr').first().click();
    await page.waitForURL(/\/admin\/kelas\/\d+$/);

    // Elemen "Kembali" mobile pakai class `hidden` (display:none) di
    // desktop, sehingga TIDAK muncul di accessibility tree sama sekali —
    // hanya varian teks desktop yang terhitung.
    const backLinks = page.getByRole('link', { name: /Kembali/ });
    await expect(backLinks).toHaveCount(1);
    await expect(backLinks.first()).toBeVisible();
  });
});
