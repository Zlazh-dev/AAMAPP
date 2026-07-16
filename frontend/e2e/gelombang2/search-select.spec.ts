import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Spec komponen: <SearchSelect> (Poin 2 Perluasan T16 — §12.17).
 * Diuji lewat KelasDetailPage (kartu "Wali Kelas" — SearchSelect guru).
 *
 * Desktop: ketik cari → hasil menyempit → pilih → dropdown tertutup.
 * Mobile: trigger membuka BOTTOM SHEET, search box DI DALAM sheet.
 */
test.describe('SearchSelect (Poin 2 Perluasan T16)', () => {
  let kelasId: number;
  let guruNama: string;

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));

    guruNama = `Guru SearchSelect ${Date.now()}`;
    const guruRes = await request.post('/api/admin/guru', {
      headers: { Authorization: `Bearer ${token}` },
      data: { nama: guruNama, jenisKelamin: 'P', status: 'aktif' },
    });
    expect(guruRes.ok()).toBeTruthy();

    const kelasRes = await request.post('/api/admin/kelas', {
      headers: { Authorization: `Bearer ${token}` },
      data: { tingkat: 8, nama: `SS-${Date.now()}` },
    });
    expect(kelasRes.ok()).toBeTruthy();
    const kelas = await kelasRes.json();
    kelasId = kelas.id;
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    if (kelasId) {
      await request.delete(`/api/admin/kelas/${kelasId}`, { headers: { Authorization: `Bearer ${token}` } });
    }
  });

  test('Desktop: ketik cari -> hasil menyempit -> pilih -> dropdown tertutup', async ({ page }) => {
    await page.goto(`/admin/kelas/${kelasId}`);
    await expect(page.getByRole('heading', { name: 'Wali Kelas' })).toBeVisible();

    const trigger = page.getByRole('button', { name: 'Pilih wali kelas...' });
    await trigger.click();

    const searchBox = page.getByPlaceholder('Cari nama guru...');
    await expect(searchBox).toBeVisible();

    // Ketik prefix unik dari nama guru yang dibuat -> hasil menyempit ke 1.
    const prefix = guruNama.slice(0, 15);
    await searchBox.fill(prefix);
    await expect(page.getByRole('button', { name: new RegExp(guruNama) })).toBeVisible();

    // Pilih -> dropdown tertutup, trigger menampilkan nama terpilih.
    await page.getByRole('button', { name: new RegExp(guruNama) }).click();
    await expect(searchBox).toHaveCount(0);
    await expect(page.getByRole('button', { name: new RegExp(guruNama) })).toBeVisible();
  });

  test('Mobile: trigger membuka bottom sheet, cari di dalam sheet', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/admin/kelas/${kelasId}`);
    await expect(page.getByRole('heading', { name: 'Wali Kelas' })).toBeVisible();

    const trigger = page.getByRole('button', { name: 'Pilih wali kelas...' });
    await trigger.click();

    // Bottom sheet: search box + hasil ada DI DALAM sheet (bukan dropdown desktop).
    const searchBox = page.getByPlaceholder('Cari nama guru...');
    await expect(searchBox).toBeVisible();
    const prefix = guruNama.slice(0, 15);
    await searchBox.fill(prefix);
    const option = page.getByRole('button', { name: new RegExp(guruNama) });
    await expect(option).toBeVisible();
    await option.click();
    await expect(searchBox).toHaveCount(0);
  });
});
