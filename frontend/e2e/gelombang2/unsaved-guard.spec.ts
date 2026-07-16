import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Spec komponen: UnsavedGuard / useUnsavedChanges (Poin 6 Perluasan
 * T16 — §12.17). Diuji lewat SiswaFormPage:
 *
 * 1. Isi form -> coba navigasi via BackLink -> dialog konfirmasi muncul.
 * 2. "Lanjut Mengedit" (cancel) -> tetap di form, isian utuh.
 * 3. "Buang Perubahan" (confirm) -> pindah halaman.
 * 4. Simpan sukses -> navigasi ke SaveSuccess TANPA dialog muncul
 *    (regresi T10: setDirty(false) sebelum navigate()).
 */
test.describe('UnsavedGuard (Poin 6 Perluasan T16)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Isi form -> navigasi -> dialog -> Lanjut Mengedit tetap di form', async ({ page }) => {
    await page.goto('/admin/orang/siswa/baru');
    await page.getByPlaceholder('Nama lengkap siswa').fill('Siswa UnsavedGuard Test');

    // Coba pergi via BackLink (link "Kembali" biasa)
    await page.getByRole('link', { name: /kembali/i }).click();

    // Dialog konfirmasi muncul
    await expect(page.getByText('Perubahan belum disimpan')).toBeVisible();

    // "Lanjut Mengedit" -> tetap di form, isian utuh
    await page.getByRole('button', { name: 'Lanjut Mengedit' }).click();
    await expect(page.getByText('Perubahan belum disimpan')).toHaveCount(0);
    await expect(page.getByPlaceholder('Nama lengkap siswa')).toHaveValue('Siswa UnsavedGuard Test');
  });

  test('Isi form -> navigasi -> Buang Perubahan -> pindah halaman', async ({ page }) => {
    await page.goto('/admin/orang/siswa/baru');
    await page.getByPlaceholder('Nama lengkap siswa').fill('Siswa UnsavedGuard Buang');

    await page.getByRole('link', { name: /kembali/i }).click();
    await expect(page.getByText('Perubahan belum disimpan')).toBeVisible();

    await page.getByRole('button', { name: 'Buang Perubahan' }).click();
    await page.waitForURL('**/admin/orang/siswa');
    await expect(page.getByRole('heading', { name: 'Data Siswa' })).toBeVisible();
  });

  test('Isi form -> simpan sukses -> pindah TANPA dialog (regresi T10)', async ({ page, request }) => {
    await page.goto('/admin/orang/siswa/baru');
    const nisUnik = `UG${Date.now()}`.slice(0, 20);
    await page.getByPlaceholder('Nama lengkap siswa').fill('Siswa UnsavedGuard Simpan');
    await page.getByPlaceholder('Nomor Induk Siswa').fill(nisUnik);
    await page.getByRole('button', { name: 'Jenis Kelamin' }).click();
    await page.getByRole('option', { name: 'Laki-laki' }).click();

    await page.getByRole('button', { name: 'Simpan' }).click();

    // Sukses page muncul TANPA dialog "Perubahan belum disimpan" sempat tampil
    await expect(page.getByText(/berhasil ditambahkan/i).first()).toBeVisible();
    await expect(page.getByText('Perubahan belum disimpan')).toHaveCount(0);

    // Cleanup
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const listRes = await request.get(`/api/admin/siswa?q=${nisUnik}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    for (const s of list.data ?? []) {
      await request.delete(`/api/admin/siswa/${s.id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  });
});
