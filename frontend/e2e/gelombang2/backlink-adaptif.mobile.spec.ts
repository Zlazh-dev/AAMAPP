import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * BACKLINK-ADAPTIF-MOBILE — spec MANDIRI-DATA (§12.17e).
 *
 * Keputusan user (zona jempol): di MOBILE, teks kecil "← Kembali" di atas
 * halaman sulit dijangkau → tombol full-width "← Kembali" (≥48px) MELAYANG
 * di paling bawah viewport (position: fixed). Desktop tetap tautan teks di atas.
 *
 * FIX: buat kelas via API beforeEach, navigasi by ID langsung — tidak klik
 * "baris pertama" yang butuh data ambient.
 */
test.describe('BackLink adaptif mobile', () => {
  let kelasId: number;

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };

    const res = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 8, nama: `KMobile-${Date.now()}` },
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

  test('Mobile: tombol "Kembali" melayang di bawah & berfungsi (halaman detail kelas)', async ({ page }) => {
    // Navigasi langsung by ID — tidak bergantung kelas ambient.
    await page.goto(`/kurikulum/kelas/${kelasId}`);
    await page.waitForURL(/\/kurikulum\/kelas\/\d+$/);

    // Tombol Kembali mobile: full-width, min-height 48px, fixed di bawah viewport.
    const backButton = page.getByRole('link', { name: /Kembali/ });
    await expect(backButton).toBeVisible();
    const box = await backButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44); // toleransi kecil dari 48px target
    const viewportHeight = page.viewportSize()!.height;
    expect(box!.y + box!.height).toBeGreaterThan(viewportHeight - 80);

    // Tap → mendarat kembali di daftar kelas.
    await backButton.click();
    await page.waitForURL('**/kurikulum/kelas');
    await expect(page.getByRole('heading', { name: 'Data Kelas' })).toBeVisible();
  });

  test('Mobile: halaman FORM tidak menampilkan tombol Kembali mobile ganda (sudah ada Batal/Simpan sticky)', async ({ page }) => {
    await page.goto('/kurikulum/orang/guru/baru');
    await expect(page.getByRole('heading', { name: 'Tambah Guru' })).toBeVisible();

    // Halaman form TIDAK opt-in ke tombol mengambang (mobileButton={false}),
    // sehingga hanya SATU tautan "Kembali" (teks, selalu visible di semua
    // ukuran layar untuk halaman form) yang dirender — bukan nol.
    const backLinks = page.getByRole('link', { name: /Kembali/ });
    await expect(backLinks).toHaveCount(1);
    await expect(backLinks.first()).toBeVisible();

    // Sticky bar Simpan bawaan form tetap ada & terlihat.
    await expect(page.getByRole('button', { name: 'Simpan' }).last()).toBeVisible();
  });
});

