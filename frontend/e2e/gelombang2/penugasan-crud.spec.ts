import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { ensureActiveTahunAjaran } from '../helpers/api';

/**
 * T16-SPRINT — Matriks Penugasan: Tambah + 409 duplikat (mapel+kelas di TA
 * aktif), Ganti-guru (paket id TETAP) via UI, Hapus 409 (masih dipakai jadwal).
 * §12.17e: entitas unik per run + cleanup via API di afterEach.
 */
test.describe('CRUD Penugasan (Matriks T16)', () => {
  const createdGuruIds: number[] = [];
  const createdKelasIds: number[] = [];
  const createdMapelIds: number[] = [];
  const createdPenugasanIds: number[] = [];
  const createdJadwalIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const jid of createdJadwalIds) {
      await request.delete(`/api/kurikulum/jadwal/${jid}`, { headers }).catch(() => {});
    }
    for (const pid of createdPenugasanIds) {
      await request.delete(`/api/kurikulum/penugasan/${pid}`, { headers }).catch(() => {});
    }
    for (const mid of createdMapelIds) {
      await request.delete(`/api/kurikulum/mapel/${mid}`, { headers }).catch(() => {});
    }
    for (const kid of createdKelasIds) {
      await request.delete(`/api/admin/kelas/${kid}`, { headers }).catch(() => {});
    }
    for (const gid of createdGuruIds) {
      await request.delete(`/api/admin/guru/${gid}`, { headers }).catch(() => {});
    }
    createdJadwalIds.length = 0;
    createdPenugasanIds.length = 0;
    createdMapelIds.length = 0;
    createdKelasIds.length = 0;
    createdGuruIds.length = 0;
  });

  test('Tambah penugasan + 409 duplikat via UI; ganti-guru; hapus 409 (dipakai jadwal)', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    await ensureActiveTahunAjaran(request, token as string);
    const suffix = Date.now();

    const guru1Res = await request.post('/api/admin/guru', {
      headers, data: { nip: `PN1${suffix}`.slice(0, 20), nama: `Guru Penugasan1 ${suffix}`, jenisKelamin: 'L', status: 'aktif' },
    });
    const guru1 = await guru1Res.json();
    createdGuruIds.push(guru1.id);

    const guru2Res = await request.post('/api/admin/guru', {
      headers, data: { nip: `PN2${suffix}`.slice(0, 20), nama: `Guru Penugasan2 ${suffix}`, jenisKelamin: 'P', status: 'aktif' },
    });
    const guru2 = await guru2Res.json();
    createdGuruIds.push(guru2.id);

    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers, data: { nama: `Mapel Penugasan ${suffix}`, kode: `MPN${suffix}`.slice(0, 20), kelompok: 'A', urutan: 1 },
    });
    const mapel = await mapelRes.json();
    createdMapelIds.push(mapel.id);

    const kelasRes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 7, nama: `KPN-${suffix}` } });
    const kelas = await kelasRes.json();
    createdKelasIds.push(kelas.id);

    // 1. Tambah penugasan via UI.
    await page.goto('/kurikulum/penugasan/baru');
    await page.locator('#penugasan-guru').selectOption({ label: new RegExp(`Guru Penugasan1 ${suffix}`) as any }).catch(async () => {
      await page.locator('#penugasan-guru').selectOption({ value: String(guru1.id) });
    });
    await page.locator('#penugasan-mapel').selectOption({ value: String(mapel.id) });
    await page.getByText(kelas.nama, { exact: true }).click();
    await page.getByRole('button', { name: /Simpan \(1 kelas\)/ }).last().click();
    await page.waitForURL('**/kurikulum/penugasan/sukses');

    const listRes = await request.get(`/api/kurikulum/penugasan?mapelId=${mapel.id}`, { headers });
    const list = await listRes.json();
    const penugasanId = list.data[0].id;
    createdPenugasanIds.push(penugasanId);

    // 2. 409 duplikat: mapel+kelas sama, guru beda, di TA aktif yang sama.
    await page.goto('/kurikulum/penugasan/baru');
    await page.locator('#penugasan-guru').selectOption({ value: String(guru2.id) });
    await page.locator('#penugasan-mapel').selectOption({ value: String(mapel.id) });
    await page.getByText(kelas.nama, { exact: true }).click();
    await page.getByRole('button', { name: /Simpan \(1 kelas\)/ }).last().click();
    await expect(page.getByText(/sudah terdaftar/i)).toBeVisible();
    await expect(page).toHaveURL('/kurikulum/penugasan/baru');

    // 3. Ganti-guru via UI: paket id TETAP, hanya guruId berubah (BUG-B
    // sudah diperbaiki: aksi "Ganti Guru" + dialog SearchSelect ditambah).
    await page.goto('/kurikulum/penugasan');
    const penugasanRow = page.locator('tr', { hasText: kelas.nama }).first();
    await penugasanRow.getByRole('button', { name: 'Ganti Guru' }).click();
    await page.getByRole('button', { name: new RegExp(`Guru Penugasan1 ${suffix}`) }).click();
    await page.getByPlaceholder('Cari guru…').fill(`Guru Penugasan2 ${suffix}`);
    await page.getByRole('button', { name: new RegExp(`Guru Penugasan2 ${suffix}`) }).click();
    await page.getByRole('button', { name: /^swap_horiz Simpan$/ }).click();
    await expect(page.getByText(/berhasil diganti/i)).toBeVisible();
    await expect(penugasanRow.getByText(`Guru Penugasan2 ${suffix}`)).toBeVisible();

    const afterPatchRes = await request.get(`/api/kurikulum/penugasan?mapelId=${mapel.id}`, { headers });
    const afterPatchList = await afterPatchRes.json();
    expect(afterPatchList.data[0].id).toBe(penugasanId); // id paket TETAP
    expect(afterPatchList.data[0].guruId).toBe(guru2.id);

    // 4. Buat jadwal yg memakai penugasan ini -> hapus penugasan harus 409.
    const jadwalRes = await request.post('/api/kurikulum/jadwal', {
      headers, data: { penugasanId, hari: 1, jamMulai: '07:00', jamSelesai: '07:40', sesiKe: 1 },
    });
    expect(jadwalRes.ok(), await jadwalRes.text()).toBeTruthy();
    const jadwal = await jadwalRes.json();
    createdJadwalIds.push(jadwal.id);

    await page.goto('/kurikulum/penugasan');
    const row = page.locator('tr', { hasText: kelas.nama }).first();
    await row.getByRole('button', { name: 'Hapus' }).click();
    await page.getByRole('button', { name: 'Hapus', exact: true }).click();
    await expect(page.getByText(/gagal menghapus/i)).toBeVisible();
    // Baris TIDAK hilang dari daftar (penghapusan gagal).
    await expect(row).toBeVisible();
  });
});

