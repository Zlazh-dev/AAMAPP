import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * kelas-assign-siswa.spec.ts â€” FIX-ASSIGN-SISWA-KELAS.
 *
 * Bug: kelas kosong menampilkan tombol "Tambah Siswa" yang navigasi ke
 * form CREATE siswa baru, padahal alur nyata = siswa sudah ada (dari
 * import) tinggal DITUGASKAN ke kelas. Fix: aksi "Assign Siswa ke Kelas
 * Ini" (picker multi-select siswa existing) + logika empty-state yang
 * membedakan "ada siswa lain di sistem" (tombol Assign) vs "nol siswa
 * di seluruh sistem" (tombol Tambah, alur create asli).
 */
test.describe('Assign Siswa ke Kelas (FIX-ASSIGN-SISWA-KELAS)', () => {
  let kelasKosongId: number;
  let kelasKosongNama: string;
  let siswaAId: number;
  let siswaBId: number;
  let siswaANama: string;
  let siswaBNama: string;

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };

    const suffix = Date.now();
    kelasKosongNama = `AssignKosong-${suffix}`;
    const kelasRes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: kelasKosongNama },
    });
    kelasKosongId = (await kelasRes.json()).id;

    siswaANama = `Siswa Assign A ${suffix}`;
    const sA = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: siswaANama, nis: `ASA${suffix}`.slice(0, 15), jenisKelamin: 'L', status: 'aktif' },
    });
    siswaAId = (await sA.json()).id;

    siswaBNama = `Siswa Assign B ${suffix}`;
    const sB = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: siswaBNama, nis: `ASB${suffix}`.slice(0, 15), jenisKelamin: 'P', status: 'aktif' },
    });
    siswaBId = (await sB.json()).id;
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    await request.delete(`/api/admin/siswa/${siswaAId}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/siswa/${siswaBId}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/kelas/${kelasKosongId}`, { headers }).catch(() => {});
  });

  test('Kelas kosong (siswa lain ada) -> tombol Assign Siswa -> pilih 2 -> keduanya jadi anggota', async ({ page, request }) => {
    await page.goto(`/kurikulum/kelas/${kelasKosongId}`);

    // Kelas kosong TAPI ada siswa lain di sistem -> tombol "Assign Siswa", BUKAN "Tambah Siswa"
    await expect(page.getByRole('button', { name: 'Assign Siswa' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tambah Siswa' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Assign Siswa' }).first().click();

    // Bottom sheet: cari + centang 2 siswa
    await page.getByPlaceholder('Cari nama / NIS / NISN...').fill('Siswa Assign');
    await page.getByText(siswaANama, { exact: true }).locator('..').locator('..').locator('input[type="checkbox"]').check();
    await page.getByText(siswaBNama, { exact: true }).locator('..').locator('..').locator('input[type="checkbox"]').check();

    await page.getByRole('button', { name: /Assign \(2\)/ }).click();

    await expect(page.getByRole('button', { name: siswaANama, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: siswaBNama, exact: true })).toBeVisible();

    // Verifikasi via API
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    const sA = await (await request.get(`/api/admin/siswa/${siswaAId}`, { headers })).json();
    const sB = await (await request.get(`/api/admin/siswa/${siswaBId}`, { headers })).json();
    expect(sA.kelasId).toBe(kelasKosongId);
    expect(sB.kelasId).toBe(kelasKosongId);
  });
});

