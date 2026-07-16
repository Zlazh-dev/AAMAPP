import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { ensureActiveTahunAjaran } from '../helpers/api';

/**
 * T16-SPRINT — Matriks Mapel: Tambah, Edit, Hapus 409 (dipakai penugasan).
 * §12.17e: kode/nama unik per run + cleanup via API di afterEach.
 */
test.describe('CRUD Mapel (Matriks T16)', () => {
  let namaMapel: string;
  let kodeMapel: string;
  const createdMapelIds: number[] = [];
  const createdGuruIds: number[] = [];
  const createdKelasIds: number[] = [];
  const createdPenugasanIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    const suffix = Date.now();
    namaMapel = `Mapel Playwright ${suffix}`;
    kodeMapel = `MP${suffix}`.slice(0, 20);
    await page.goto('/kurikulum/mapel');
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const pid of createdPenugasanIds) {
      await request.delete(`/api/kurikulum/penugasan/${pid}`, { headers }).catch(() => {});
    }
    for (const kid of createdKelasIds) {
      await request.delete(`/api/admin/kelas/${kid}`, { headers }).catch(() => {});
    }
    for (const gid of createdGuruIds) {
      await request.delete(`/api/admin/guru/${gid}`, { headers }).catch(() => {});
    }
    for (const mid of createdMapelIds) {
      await request.delete(`/api/kurikulum/mapel/${mid}`, { headers }).catch(() => {});
    }
    createdPenugasanIds.length = 0;
    createdKelasIds.length = 0;
    createdGuruIds.length = 0;
    createdMapelIds.length = 0;
  });

  test('Tambah mapel sukses -> Edit -> Hapus 409 (dipakai penugasan)', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    await ensureActiveTahunAjaran(request, token as string);

    // 1. Tambah mapel via UI
    await page.getByRole('button', { name: 'add Tambah Mapel' }).click();
    await page.waitForURL('**/kurikulum/mapel/baru');
    await page.locator('#mapel-nama').fill(namaMapel);
    await page.locator('#mapel-kode').fill(kodeMapel);
    await page.locator('#mapel-kelompok').fill('A (Wajib)');
    await page.getByRole('button', { name: 'Simpan' }).click();
    await page.waitForURL('**/kurikulum/mapel/sukses');

    const listRes = await request.get(`/api/kurikulum/mapel?q=${encodeURIComponent(namaMapel)}`, { headers });
    const list = await listRes.json();
    const mapelId = list.data[0].id;
    createdMapelIds.push(mapelId);

    // 2. Edit mapel -> ganti nama
    const namaBaru = `${namaMapel} EDIT`;
    await page.goto(`/kurikulum/mapel/${mapelId}/edit`);
    await expect(page.locator('#mapel-nama')).toHaveValue(namaMapel);
    await page.locator('#mapel-nama').fill(namaBaru);
    await page.getByRole('button', { name: 'save Simpan' }).last().click();
    await page.waitForURL('**/kurikulum/mapel');
    const afterEditRes = await request.get(`/api/kurikulum/mapel/${mapelId}`, { headers });
    expect((await afterEditRes.json()).nama).toBe(namaBaru);

    // 3. Buat penugasan yang memakai mapel ini -> hapus mapel harus 409
    const suffix = Date.now();
    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `MPG${suffix}`.slice(0, 20), nama: `Guru MapelHapus ${suffix}`, jenisKelamin: 'L', status: 'aktif' },
    });
    const guru = await guruRes.json();
    createdGuruIds.push(guru.id);

    const kelasRes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 7, nama: `MPK-${suffix}` } });
    const kelas = await kelasRes.json();
    createdKelasIds.push(kelas.id);

    const penugasanRes = await request.post('/api/kurikulum/penugasan', {
      headers,
      data: { guruId: guru.id, mapelId, kelasIds: [kelas.id] },
    });
    const penugasan = (await penugasanRes.json())[0];
    createdPenugasanIds.push(penugasan.id);

    // Hapus via UI -> harus gagal dgn pesan 409 (BUG-A sudah diperbaiki:
    // MapelListPage kini punya tombol Hapus per-baris yang memanggil
    // setDeleteTarget()).
    await page.goto('/kurikulum/mapel');
    const row = page.locator('tr', { hasText: namaBaru });
    await row.getByRole('button', { name: 'Hapus' }).click();
    await page.getByRole('button', { name: 'Hapus', exact: true }).click();
    await expect(page.getByText(/gagal menghapus/i)).toBeVisible();
    // Baris TIDAK hilang dari daftar (penghapusan gagal, sesuai 409 backend).
    await expect(row).toBeVisible();
    const stillThereRes = await request.get(`/api/kurikulum/mapel/${mapelId}`, { headers });
    expect(stillThereRes.ok()).toBeTruthy();
  });
});
