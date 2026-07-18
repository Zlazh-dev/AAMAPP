import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * BACKLINK-ADAPTIF desktop — spec MANDIRI-DATA (§12.17e).
 *
 * Sebelumnya spec ini klik "baris pertama daftar" tanpa membuat
 * entitas sendiri → gagal di DB bersih. Sekarang:
 * 1. beforeEach: buat kelas via API, simpan id.
 * 2. Navigasi langsung ke /admin/kelas/:id (bukan klik baris pertama).
 * 3. afterEach: hapus kelas via API.
 */
test.describe('BackLink adaptif desktop', () => {
  let kelasId: number;

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };

    const res = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `KBacklink-${Date.now()}` },
    });
    const kelas = await res.json();
    kelasId = kelas.id;
  });

  test.afterEach(async ({ page, request }) => {
    if (!kelasId) return;
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    await request.delete(`/api/admin/kelas/${kelasId}`, { headers }).catch(() => {});
  });

  test('Desktop: tautan teks "Kembali" tampil di atas halaman detail kelas', async ({ page }) => {
    // Navigasi langsung by ID — tidak bergantung baris pertama.
    await page.goto(`/admin/kelas/${kelasId}`);
    await page.waitForURL(/\/admin\/kelas\/\d+$/);

    // Elemen "Kembali" mobile pakai class `hidden` (display:none) di
    // desktop, sehingga TIDAK muncul di accessibility tree sama sekali —
    // hanya varian teks desktop yang terhitung.
    const backLinks = page.getByRole('link', { name: /Kembali/ });
    await expect(backLinks).toHaveCount(1);
    await expect(backLinks.first()).toBeVisible();
  });
});
