import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Spec komponen: <ImageUploader> (§12.17 perluasan Gelombang-2).
 *
 * Membuktikan/membantah dugaan bug relatif-URL: endpoint upload
 * (`POST /api/admin/uploads`) mengembalikan path RELATIF
 * (`/uploads/<filename>`), sedangkan `CreateGuruDto.fotoUrl` sempat
 * memvalidasi dengan `@IsUrl({ require_protocol: true })` yang
 * MENOLAK path relatif. Fix: DTO kini menerima path `/uploads/...`
 * ATAU URL http(s) penuh (create-guru.dto.ts).
 *
 * FIX MANDIRI-DATA (§12.17e):
 * - Setelah simpan sukses, cari guru by nama unik via API → dapat ID.
 * - Navigasi langsung by ID ke /admin/orang/guru/:id (bukan klik daftar).
 * - afterEach: hapus guru via API agar tidak menumpuk.
 */

// 1x1 transparent PNG, valid magic bytes agar lolos fileFilter mimetype.
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test.describe('ImageUploader (Poin 4 Perluasan T16)', () => {
  let createdGuruId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    createdGuruId = null;
  });

  test.afterEach(async ({ page, request }) => {
    if (!createdGuruId) return;
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    await request
      .delete(`/api/admin/guru/${createdGuruId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch(() => {});
    createdGuruId = null;
  });

  test('Upload foto nyata -> pratinjau -> simpan -> foto tampil di detail -> hapus foto', async ({ page, request }) => {
    await page.goto('/admin/orang/guru/baru');
    await expect(page.getByRole('heading', { name: 'Tambah Guru' })).toBeVisible();

    const namaUnik = `Guru Foto ${Date.now()}`;
    await page.getByPlaceholder('Masukkan nama lengkap').fill(namaUnik);
    await page.getByRole('button', { name: 'Jenis Kelamin' }).click();
    await page.getByRole('option', { name: 'Laki-laki' }).click();

    // Upload file nyata via hidden <input type="file"> di dalam ImageUploader.
    const buffer = Buffer.from(PNG_1X1_BASE64, 'base64');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'foto-test.png',
      mimeType: 'image/png',
      buffer,
    });

    // Pratinjau: <img> preview muncul menggantikan placeholder ikon kamera.
    const preview = page.locator('img[alt="Foto Guru"]');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('src', /\/uploads\//);

    // Simpan
    await page.getByRole('button', { name: 'Simpan' }).click();

    // Bukti utama: jika bug relatif-URL masih ada → 400 → SaveSuccess tidak muncul.
    await expect(page.getByText(/berhasil ditambahkan/i).first()).toBeVisible({ timeout: 10_000 });

    // Cari guru by nama unik via API → dapat ID → navigasi by ID.
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    const searchRes = await request.get(
      `/api/admin/guru?q=${encodeURIComponent(namaUnik)}&limit=5`,
      { headers },
    );
    const searchBody = await searchRes.json();
    const found = (searchBody.data ?? []).find((g: any) => g.nama === namaUnik);
    if (found) {
      createdGuruId = found.id;
    }

    expect(createdGuruId, 'Guru yang baru dibuat harus ditemukan via API').not.toBeNull();

    // Navigasi langsung ke detail by ID — tidak bergantung urutan daftar.
    await page.goto(`/admin/orang/guru/${createdGuruId}`);

    // Detail: <img> foto guru tampil (bukan avatar inisial fallback).
    await expect(page.getByRole('heading', { name: namaUnik })).toBeVisible({ timeout: 8_000 });
    const detailImg = page.locator(`img[alt="${namaUnik}"]`);
    await expect(detailImg).toBeVisible();
    await expect(detailImg).toHaveAttribute('src', /\/uploads\//);

    // Edit -> hapus foto -> simpan -> avatar inisial muncul kembali.
    await page.getByRole('button', { name: /Edit/i }).click();
    await page.waitForURL('**/edit');
    await page.getByRole('button', { name: 'Hapus Foto' }).click();
    await expect(page.locator('img[alt="Foto Guru"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.getByText(/tersimpan/i).first()).toBeVisible();
  });
});
