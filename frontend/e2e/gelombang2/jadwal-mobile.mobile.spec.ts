import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { ensureActiveTahunAjaran } from '../helpers/api';

/**
 * T16-SPRINT lanjutan — Jadwal KBM mobile: pemilih hari segmented (Senin..
 * Sabtu) menyaring daftar sesi vertikal per hari (project mobile 375×812).
 * §12.17e: entitas unik per run + cleanup via API di afterEach.
 */
test.describe('Jadwal KBM Mobile (Matriks T16 lanjutan)', () => {
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

  test('Pemilih hari (Senin/Selasa) menyaring daftar sesi vertikal', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    await ensureActiveTahunAjaran(request, token as string);
    const suffix = Date.now();

    const guruRes = await request.post('/api/admin/guru', {
      headers, data: { nip: `JM1${suffix}`.slice(0, 20), nama: `Guru JadwalMobile ${suffix}`, jenisKelamin: 'P', status: 'aktif' },
    });
    const guru = await guruRes.json();
    createdGuruIds.push(guru.id);

    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers, data: { nama: `Mapel JadwalMobile ${suffix}`, kode: `MJM${suffix}`.slice(0, 20), kelompok: 'A', urutan: 1 },
    });
    const mapel = await mapelRes.json();
    createdMapelIds.push(mapel.id);

    const kelasRes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 7, nama: `KJM-${suffix}` } });
    const kelas = await kelasRes.json();
    createdKelasIds.push(kelas.id);

    const penugasanRes = await request.post('/api/kurikulum/penugasan', {
      headers, data: { guruId: guru.id, mapelId: mapel.id, kelasIds: [kelas.id] },
    });
    const penugasan = (await penugasanRes.json())[0];
    createdPenugasanIds.push(penugasan.id);

    // Seed 1 slot Senin + 1 slot Selasa via API (kelas yg sama, jam beda
    // hari agar tidak bentrok).
    const seninRes = await request.post('/api/kurikulum/jadwal', {
      headers, data: { penugasanId: penugasan.id, hari: 1, jamMulai: '07:00', jamSelesai: '07:40' },
    });
    const senin = await seninRes.json();
    createdJadwalIds.push(senin.id);

    const selasaRes = await request.post('/api/kurikulum/jadwal', {
      headers, data: { penugasanId: penugasan.id, hari: 2, jamMulai: '08:00', jamSelesai: '08:40' },
    });
    const selasa = await selasaRes.json();
    createdJadwalIds.push(selasa.id);

    await page.goto('/kurikulum/jadwal');
    await page.locator('select').first().selectOption({ value: String(kelas.id) });

    // Default hari terpilih = Senin -> sesi Senin (07:00) tampil.
    await expect(page.getByText('07:00:00–07:40:00')).toBeVisible();
    await expect(page.getByText('08:00:00–08:40:00')).not.toBeVisible();

    // Pindah ke Selasa -> hanya sesi Selasa (08:00) tampil, Senin hilang.
    await page.getByRole('button', { name: 'Sel' }).click();
    await expect(page.getByText('08:00:00–08:40:00')).toBeVisible();
    await expect(page.getByText('07:00:00–07:40:00')).not.toBeVisible();
  });
});

