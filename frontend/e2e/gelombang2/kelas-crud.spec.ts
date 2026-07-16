import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * T16-SPRINT — Matriks Kelas: Tambah (409 nama duplikat), Edit
 * (auto-fase), Hapus (409 siswa aktif), Wali force (409 -> pindah).
 * §12.17e: nama unik per run + cleanup via API di afterEach.
 */
test.describe('CRUD Kelas (Matriks T16)', () => {
  let namaKelas: string;
  const createdKelasIds: number[] = [];
  const createdSiswaIds: number[] = [];
  const createdGuruIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    namaKelas = `KX-${Date.now()}`;
    await page.goto('/admin/kelas');
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const sid of createdSiswaIds) {
      await request.delete(`/api/admin/siswa/${sid}`, { headers }).catch(() => {});
    }
    for (const kid of createdKelasIds) {
      await request.delete(`/api/admin/kelas/${kid}`, { headers }).catch(() => {});
    }
    for (const gid of createdGuruIds) {
      await request.delete(`/api/admin/guru/${gid}`, { headers }).catch(() => {});
    }
    createdSiswaIds.length = 0;
    createdKelasIds.length = 0;
    createdGuruIds.length = 0;
  });

  test('Tambah kelas + 409 nama duplikat; Edit auto-fase; Hapus 409 siswa aktif', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };

    // 1. Tambah kelas via UI -> sukses
    await page.getByRole('button', { name: 'Tambah Kelas' }).click();
    await page.waitForURL('**/admin/kelas/baru');
    await page.getByPlaceholder('Mis. 7A').fill(namaKelas);
    await page.getByRole('button', { name: 'Tingkat' }).click();
    await page.getByRole('option', { name: 'Kelas 8 (Fase E)' }).click();
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.getByText(/berhasil ditambahkan/i).first()).toBeVisible();

    // Catat id via API untuk cleanup + pengujian lanjutan.
    const listRes = await request.get(`/api/admin/kelas?q=${encodeURIComponent(namaKelas)}`, { headers });
    const list = await listRes.json();
    const kelasId = list.data[0].id;
    createdKelasIds.push(kelasId);
    expect(list.data[0].fase).toBe('E'); // auto-fase dari tingkat 8

    // 2. 409 nama duplikat
    await page.goto('/admin/kelas/baru');
    await page.getByPlaceholder('Mis. 7A').fill(namaKelas);
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.getByText(/sudah digunakan/i)).toBeVisible();

    // 3. Edit -> ganti tingkat 9 -> fase auto berubah F
    await page.goto(`/admin/kelas/${kelasId}/edit`);
    await page.getByRole('button', { name: 'Tingkat' }).click();
    await page.getByRole('option', { name: 'Kelas 9 (Fase F)' }).click();
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.getByText(/berhasil diperbarui/i).first()).toBeVisible();
    const afterEditRes = await request.get(`/api/admin/kelas/${kelasId}`, { headers });
    expect((await afterEditRes.json()).fase).toBe('F');

    // 4. Tambah 1 siswa aktif ke kelas ini via API -> hapus kelas harus 409
    const suffix = Date.now();
    const siswaRes = await request.post('/api/admin/siswa', {
      headers,
      data: {
        nama: `Siswa KelasHapus ${suffix}`,
        nis: `SKH${suffix}`.slice(0, 20),
        jenisKelamin: 'L',
        status: 'aktif',
        kelasId,
      },
    });
    const siswa = await siswaRes.json();
    createdSiswaIds.push(siswa.id);

    await page.goto(`/admin/kelas/${kelasId}`);
    // Buka menu 3-titik -> Hapus
    await page.getByRole('button', { name: 'Menu halaman' }).click();
    await page.getByText('Hapus', { exact: true }).click();
    await page.getByRole('button', { name: 'Hapus', exact: true }).click();
    // 409 -> toast error, kelas TIDAK terhapus, tetap di halaman detail
    await expect(page.getByText(/siswa aktif/i)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/admin/kelas/${kelasId}$`));
  });

  test('Wali kelas: konflik 409 menyebut kelas lama -> force pindah', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    const suffix = Date.now();

    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `WK${suffix}`.slice(0, 20), nama: `Guru WaliForce ${suffix}`, jenisKelamin: 'P', status: 'aktif' },
    });
    const guru = await guruRes.json();
    createdGuruIds.push(guru.id);

    const kelasLamaRes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 7, nama: `KWL-${suffix}` } });
    const kelasLama = await kelasLamaRes.json();
    createdKelasIds.push(kelasLama.id);

    const kelasBaruRes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 7, nama: `KWB-${suffix}` } });
    const kelasBaru = await kelasBaruRes.json();
    createdKelasIds.push(kelasBaru.id);

    // Assign guru sbg wali kelasLama via API.
    await request.patch(`/api/admin/kelas/${kelasLama.id}/wali`, { headers, data: { waliGuruId: guru.id } });

    // Buka detail kelasBaru -> pilih guru yg sama sbg wali -> 409 -> force.
    await page.goto(`/admin/kelas/${kelasBaru.id}`);
    await page.getByRole('button', { name: 'Pilih wali kelas... expand_more' }).click();
    await page.getByPlaceholder('Cari nama guru...').fill(`Guru WaliForce ${suffix}`);
    await page.getByText(`Guru WaliForce ${suffix}`, { exact: true }).click();
    await page.getByRole('button', { name: 'Simpan Wali' }).click();

    // 409 dialog menyebut nama kelas lama.
    await expect(page.getByText(new RegExp(kelasLama.nama))).toBeVisible();
    await page.getByRole('button', { name: 'Pindahkan' }).click();

    await expect(page.getByText(/berhasil dipindahkan/i)).toBeVisible();
    const finalRes = await request.get(`/api/admin/kelas/${kelasBaru.id}`, { headers });
    expect((await finalRes.json()).waliGuruId).toBe(guru.id);
  });
});
