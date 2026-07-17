import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * BACKLINK-ADAPTIF-MOBILE — keputusan user (zona jempol): di MOBILE, teks
 * kecil "← Kembali" di atas halaman sulit dijangkau → tombol full-width
 * "← Kembali" (≥48px) MELAYANG di paling bawah viewport (position: fixed,
 * bukan elemen terakhir konten — sengaja dipilih agar selalu terjangkau
 * tanpa scroll, dan tidak perlu reorder JSX per halaman).
 * Desktop tetap tautan teks di atas.
 */
test.describe('BackLink adaptif mobile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Mobile: tombol "Kembali" melayang di bawah & berfungsi (halaman detail kelas)', async ({ page }) => {
    await page.goto('/admin/kelas');
    await expect(page.getByRole('heading', { name: 'Data Kelas' })).toBeVisible();

    // List mobile pakai <Card onClick> yang dirender sebagai <button> berlabel
    // "<nama kelas> Fase X Tingkat Y" → cocokkan lewat accessible name agar
    // tidak salah pilih elemen lain yang kebetulan berbagi class CSS.
    await page.getByRole('button', { name: /Fase .* Tingkat/ }).first().click();

    await page.waitForURL(/\/admin\/kelas\/\d+$/);

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
    await page.waitForURL('**/admin/kelas');
    await expect(page.getByRole('heading', { name: 'Data Kelas' })).toBeVisible();
  });

  test('Mobile: halaman FORM tidak menampilkan tombol Kembali mobile ganda (sudah ada Batal/Simpan sticky)', async ({ page }) => {
    await page.goto('/admin/orang/guru/baru');
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


