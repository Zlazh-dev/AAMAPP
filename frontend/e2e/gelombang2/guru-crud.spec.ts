import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * §12.17e higiene data uji: nama/NIP unik per run (suffix timestamp) +
 * cleanup via API di afterEach — spec ini SELF-CONTAINED dan idempoten
 * (harus lolos berulang kali tanpa reset DB di antaranya).
 */
test.describe('CRUD Guru (Poin 1 T16)', () => {
  let nip: string;
  let namaGuru: string;
  let namaDuplikat: string;
  const createdGuruIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    const suffix = Date.now();
    nip = `NIP${suffix}`.slice(0, 20);
    namaGuru = `Guru Playwright ${suffix}`;
    namaDuplikat = `Guru Duplikat ${suffix}`;
    await page.goto('/admin/orang/guru');
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const gid of createdGuruIds) {
      await request.delete(`/api/admin/guru/${gid}`, { headers }).catch(() => {});
    }
    createdGuruIds.length = 0;
  });

  test('Tambah guru sukses, back tidak kembali ke form, error 409 NIP', async ({ page, request }) => {
    // 1. Tambah guru sukses (SaveSuccess)
    await page.getByRole('button', { name: 'Tambah Guru' }).click();
    await page.waitForURL('**/admin/orang/guru/baru');

    await page.getByPlaceholder('Masukkan nama lengkap').fill(namaGuru);
    await page.getByPlaceholder('Nomor Induk Pegawai').fill(nip);
    // Jenis Kelamin is an AdaptiveSelect (button trigger -> listbox), not a checkbox.
    await page.getByRole('button', { name: 'Jenis Kelamin' }).click();
    await page.getByRole('option', { name: 'Laki-laki' }).click();
    // submit
    await page.getByRole('button', { name: 'Simpan' }).click();

    // SaveSuccess page (matches both a toast and the page heading; use .first())
    await expect(page.getByText(/berhasil ditambahkan/i).first()).toBeVisible();

    // Catat id yang terbentuk untuk cleanup (via API list by q=nama unik).
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const listRes = await request.get(`/api/admin/guru?q=${encodeURIComponent(namaGuru)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    for (const g of list.data) createdGuruIds.push(g.id);

    await page.getByRole('button', { name: 'Lihat Daftar Guru' }).click();

    // Pastikan tidak kembali ke form (back history test).
    // Alur history: /guru -> /guru/baru (push) -> /guru/sukses (REPLACE atas /baru)
    // -> klik "Lihat Daftar Guru" -> /guru (push). Jadi stack: [guru, sukses, guru].
    // goBack() akan mendarat di halaman SUKSES (bukan form) — ini tetap memenuhi
    // syarat "back tidak kembali ke form".
    await page.waitForURL('**/admin/orang/guru');
    await page.goBack();
    await expect(page.getByText(/berhasil ditambahkan/i).first()).toBeVisible();
    // Pastikan form TIDAK muncul setelah back
    await expect(page.getByPlaceholder('Masukkan nama lengkap')).toHaveCount(0);

    await page.goto('/admin/orang/guru');
    await expect(page.getByRole('heading', { name: 'Data Guru' })).toBeVisible();

    // 2. Test 409 NIP inline
    await page.getByRole('button', { name: 'Tambah Guru' }).click();
    await page.waitForURL('**/admin/orang/guru/baru');
    await page.getByPlaceholder('Masukkan nama lengkap').fill(namaDuplikat);
    await page.getByPlaceholder('Nomor Induk Pegawai').fill(nip); // NIP sama
    await page.getByRole('button', { name: 'Jenis Kelamin' }).click();
    await page.getByRole('option', { name: 'Perempuan' }).click();
    await page.getByRole('button', { name: 'Simpan' }).click();

    // Verifikasi error 409 inline (Alert/Error message)
    await expect(page.getByText(/sudah terdaftar/i)).toBeVisible();
  });
});
