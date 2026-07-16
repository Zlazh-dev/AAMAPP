import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Spec CRUD Siswa — Bukti-fix P0 2026-07-16.
 *
 * P0: CreateSiswaDto/UpdateSiswaDto hanya mewhitelist sebagian kecil
 * field siswa. Karena main.ts memakai `forbidNonWhitelisted: true` dan
 * SiswaFormPage SELALU mengirim SEMUA field form (tempatLahir, agama,
 * statusDalamKeluarga, anakKe, alamat, telepon, sekolahAsal,
 * diterimaDiKelas, diterimaTanggal, pekerjaanAyah, pekerjaanIbu,
 * namaWali, alamatWali, teleponWali, pekerjaanWali, fotoUrl), SETIAP
 * tambah/edit siswa dari UI gagal 400 "property X should not exist".
 * Fix: whitelist semua kolom siswa.entity.ts di kedua DTO.
 *
 * Spec ini submit form TANPA mock (network asli) untuk membuktikan
 * DTO backend benar-benar menerima payload penuh dari UI.
 *
 * §12.17e higiene data uji: NIS unik per run (suffix timestamp) +
 * cleanup via API di afterEach — spec SELF-CONTAINED dan idempoten.
 *
 * T16-SPRINT poin 1: backend q= siswa diperluas mencocokkan nama ATAU
 * nis ATAU nisn (bukan hanya nama) — dibuktikan lewat pencarian via NIS
 * di kotak cari daftar siswa.
 */
test.describe('CRUD Siswa (P0 Perbaikan DTO fotoUrl+field lengkap)', () => {
  let nisUnik: string;
  let nisnUnik: string;
  let namaSiswa: string;
  const createdSiswaIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    const suffix = Date.now();
    nisUnik = `SW${suffix}`.slice(0, 20);
    nisnUnik = `${suffix}`.slice(-10);
    namaSiswa = `Siswa Playwright Lengkap ${suffix}`;
    await page.goto('/admin/orang/siswa');
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const sid of createdSiswaIds) {
      await request.delete(`/api/admin/siswa/${sid}`, { headers }).catch(() => {});
    }
    createdSiswaIds.length = 0;
  });

  test('Tambah siswa dgn semua field terisi -> sukses (bukan 400 whitelist)', async ({ page, request }) => {
    await page.getByRole('button', { name: 'Tambah Siswa' }).click();
    await page.waitForURL('**/admin/orang/siswa/baru');

    await page.getByPlaceholder('Nama lengkap siswa').fill(namaSiswa);
    await page.getByPlaceholder('Nomor Induk Siswa').fill(nisUnik);
    await page.getByPlaceholder('NISN (opsional)').fill(nisnUnik);
    await page.getByRole('button', { name: 'Jenis Kelamin' }).click();
    await page.getByRole('option', { name: 'Perempuan' }).click();
    await page.getByPlaceholder('Tempat lahir').fill('Jakarta');

    // Isi field dari Data Orang Tua/Wali agar payload penuh dikirim
    // (semua field ini ada di form; kita isi beberapa saja utk verifikasi
    // whitelist DTO, tidak perlu isi semuanya).
    const namaAyahInput = page.locator('input[placeholder*="ayah" i]').first();
    if (await namaAyahInput.count()) {
      await namaAyahInput.fill('Bapak Playwright');
    }

    await page.getByRole('button', { name: 'Simpan' }).click();

    // Bukti utama: JIKA bug whitelist masih ada, ini akan gagal 400 dan
    // SaveSuccess TIDAK akan muncul.
    await expect(page.getByText(/berhasil ditambahkan/i).first()).toBeVisible();

    // Catat id yang terbentuk untuk cleanup (via API list by q=nama unik).
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const listRes = await request.get(`/api/admin/siswa?q=${encodeURIComponent(namaSiswa)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    for (const s of list.data) createdSiswaIds.push(s.id);

    // Bukti T16-SPRINT poin 1: q= sekarang juga mencocokkan NIS, bukan
    // hanya nama. Cari via kotak cari daftar siswa memakai NIS unik.
    await page.goto('/admin/orang/siswa');
    const searchBox = page.getByPlaceholder('Cari nama siswa...').locator('visible=true');
    await searchBox.fill(nisUnik);
    await expect(page.getByText(namaSiswa).first()).toBeVisible();
  });
});
