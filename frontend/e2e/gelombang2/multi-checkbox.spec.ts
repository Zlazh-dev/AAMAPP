import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { ensureActiveTahunAjaran } from '../helpers/api';

/**
 * Spec komponen: multi-checkbox kelas (Poin 3 Perluasan T16 — §12.17).
 * Diuji lewat PenugasanFormPage: pilih 1 guru + 1 mapel + CENTANG 2 kelas
 * -> Simpan -> backend menerima SATU request createPenugasan PER kelas
 * tercentang -> verifikasi via API bahwa 2 baris penugasan terbentuk.
 */
test.describe('Multi-checkbox Kelas (Poin 3 Perluasan T16)', () => {
  let guruId: number;
  let mapelId: number;
  let kelasAId: number;
  let kelasBId: number;
  let guruNama: string;
  let mapelNama: string;
  let kelasANama: string;
  let kelasBNama: string;
  const createdPenugasanIds: number[] = [];

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    await ensureActiveTahunAjaran(request, token as string);

    const suffix = Date.now();
    guruNama = `Guru MultiCB ${suffix}`;
    const guruRes = await request.post('/api/admin/guru', { headers, data: { nama: guruNama, jenisKelamin: 'L', status: 'aktif' } });
    guruId = (await guruRes.json()).id;

    mapelNama = `Mapel MultiCB ${suffix}`;
    const mapelRes = await request.post('/api/kurikulum/mapel', { headers, data: { nama: mapelNama, kode: `MCB${suffix}`.slice(0, 15), kelompok: 'A', urutan: 99 } });
    mapelId = (await mapelRes.json()).id;

    kelasANama = `MCA-${suffix}`;
    const kelasARes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 9, nama: kelasANama } });
    kelasAId = (await kelasARes.json()).id;

    kelasBNama = `MCB-${suffix}`;
    const kelasBRes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 9, nama: kelasBNama } });
    kelasBId = (await kelasBRes.json()).id;
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const pid of createdPenugasanIds) {
      await request.delete(`/api/kurikulum/penugasan/${pid}`, { headers }).catch(() => {});
    }
    await request.delete(`/api/admin/kelas/${kelasAId}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/kelas/${kelasBId}`, { headers }).catch(() => {});
    await request.delete(`/api/kurikulum/mapel/${mapelId}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/guru/${guruId}`, { headers }).catch(() => {});
  });

  test('Pilih 1 guru + 1 mapel + centang 2 kelas -> simpan -> 2 penugasan terbentuk', async ({ page, request }) => {
    await page.goto('/kurikulum/penugasan/baru');

    await page.getByLabel('Guru').selectOption(String(guruId));
    await page.getByLabel('Mata Pelajaran').selectOption(String(mapelId));

    // Centang 2 kelas dari daftar multi-checkbox
    await page.getByText(kelasANama, { exact: true }).locator('..').locator('input[type="checkbox"]').check();
    await page.getByText(kelasBNama, { exact: true }).locator('..').locator('input[type="checkbox"]').check();

    await expect(page.getByRole('button', { name: /Simpan \(2 kelas\)/ }).first()).toBeVisible();
    await page.getByRole('button', { name: /Simpan \(2 kelas\)/ }).first().click();

    await page.waitForURL('**/kurikulum/penugasan/sukses');

    // Verifikasi via API: 2 baris penugasan (guru+mapel sama, kelas berbeda) terbentuk
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const listRes = await request.get(`/api/kurikulum/penugasan?guruId=${guruId}&mapelId=${mapelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    expect(list.data.length).toBe(2);
    for (const p of list.data) createdPenugasanIds.push(p.id);
    const kelasIds = list.data.map((p: any) => p.kelasId).sort();
    expect(kelasIds).toEqual([kelasAId, kelasBId].sort());
  });
});

