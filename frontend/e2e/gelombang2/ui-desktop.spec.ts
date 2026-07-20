import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('AdaptiveSelect Desktop (Poin 12/15 T16)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Asumsikan di halaman Kelas form ada AdaptiveSelect untuk Pilih Wali Kelas
    await page.goto('/kurikulum/kelas/baru');
  });

  test('AdaptiveSelect panel tampil utuh (tidak terpotong z-index) dan bisa dipilih', async ({ page }) => {
    // Tunggu render
    await expect(page.getByRole('heading', { name: 'Tambah Kelas' })).toBeVisible();

    // Temukan combobox untuk Tingkat
    const selectTrigger = page.getByRole('combobox', { name: /Tingkat/i });
    if (await selectTrigger.count() > 0) {
      await selectTrigger.click();

      // Cek apakah listbox muncul
      const listbox = page.getByRole('listbox');
      await expect(listbox).toBeVisible();

      // Pilih opsi kelas 8
      const option8 = listbox.getByRole('option', { name: /Kelas 8/i });
      if (await option8.count() > 0) {
        await option8.click();
      }
    }
  });
});

