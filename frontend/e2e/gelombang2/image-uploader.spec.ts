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
 * Test ini melakukan upload NYATA (1x1 PNG) lewat UI — bukan mock —
 * supaya benar-benar melewati endpoint upload asli + validasi DTO.
 */

// 1x1 transparent PNG, valid magic bytes agar lolos fileFilter mimetype.
const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test.describe('ImageUploader (Poin 4 Perluasan T16)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Upload foto nyata -> pratinjau -> simpan -> foto tampil di detail -> hapus foto', async ({ page }) => {
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

    // Pratinjau: <img> preview muncul menggantikan placeholder ikon kamera
    // (ImageUploader merender <img src={value}> begitu upload sukses).
    const preview = page.locator('img[alt="Foto Guru"]');
    await expect(preview).toBeVisible();
    // Pastikan src bukan lagi kosong (upload asli sudah selesai, bukan pending).
    await expect(preview).toHaveAttribute('src', /\/uploads\//);

    // Simpan
    await page.getByRole('button', { name: 'Simpan' }).click();

    // Ini adalah bukti utama: JIKA bug relatif-URL masih ada, simpan akan
    // gagal 400 dan halaman SaveSuccess TIDAK akan muncul.
    await expect(page.getByText(/berhasil ditambahkan/i).first()).toBeVisible();

    // Ke detail: klik "Lihat Daftar Guru" lalu buka guru yang baru dibuat.
    await page.getByRole('button', { name: 'Lihat Daftar Guru' }).click();
    await page.waitForURL('**/admin/orang/guru');
    await page.getByText(namaUnik).first().click();

    // Detail: <img> foto guru tampil (bukan avatar inisial fallback).
    await expect(page.getByRole('heading', { name: namaUnik })).toBeVisible();
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
