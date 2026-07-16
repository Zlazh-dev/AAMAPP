import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * T16-SPRINT lanjutan — Sel matriks kecil: banner deteksi otomatis
 * "Impor Libur Nasional" di /admin/pengaturan/libur. Provider pihak
 * ketiga (api-harilibur.vercel.app) diakses SERVER-SIDE oleh backend;
 * bila egress diblokir (Docker tanpa akses internet luar), endpoint
 * `GET /api/admin/libur/cek-nasional` diam-diam mengembalikan
 * `{baru: 0}` (fail-open, lihat kurikulum.service.ts `cekNasional()`),
 * sehingga banner TIDAK PERNAH tampil dan skenario "review pratinjau"
 * tak bisa diuji end-to-end. Spec ini CEK dulu via API apakah `baru > 0`
 * (bukti egress berhasil) SEBELUM lanjut ke UI — bila tidak, skip resmi
 * dgn alasan tercatat (conditional-skip sesuai arahan planner).
 */
test.describe('Libur — Banner Deteksi Otomatis Nasional (Matriks T16 lanjutan)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Banner tampil saat ada libur nasional belum diimpor -> buka dialog pratinjau -> tutup', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };

    const cekRes = await request.get('/api/admin/libur/cek-nasional', { headers });
    const { baru } = await cekRes.json();

    test.skip(
      baru === 0,
      'Egress ke provider api-harilibur.vercel.app tampaknya diblokir di ' +
      'lingkungan ini (atau seluruh libur nasional tahun ini/depan sudah ' +
      'diimpor) — cekNasional() fail-open mengembalikan {baru:0} dan ' +
      'banner tidak akan tampil. Conditional-skip resmi per arahan planner.',
    );

    await page.goto('/admin/pengaturan/libur');
    await expect(page.getByRole('heading', { name: 'Kalender Libur' })).toBeVisible();

    // Banner deteksi otomatis harus tampil dgn jumlah yg cocok.
    const banner = page.getByText(/libur nasional belum ada di kalender/);
    await expect(banner).toBeVisible();
    await expect(page.getByText(new RegExp(String(baru)))).toBeVisible();

    // Buka dialog pratinjau via tombol "Tinjau & Impor" di banner.
    await page.getByRole('button', { name: 'Tinjau & Impor' }).click();
    await expect(page.getByRole('heading', { name: 'Impor Libur Nasional' })).toBeVisible();
    await expect(page.locator('li', { hasText: /—/ }).first()).toBeVisible();

    // Tutup tanpa mengimpor (tidak mengubah data — spec ini murni verifikasi banner+dialog).
    await page.getByRole('button', { name: 'Batal' }).click();
    await expect(page.getByRole('heading', { name: 'Impor Libur Nasional' })).not.toBeVisible();
  });
});
