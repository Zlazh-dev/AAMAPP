import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { ensureActiveTahunAjaran, authHeaders } from '../helpers/api';

/**
 * F2-REKAP-FRONTEND e2e — halaman /guru/rekap (Rekap Presensi per kelas).
 * Login sbg admin (admin lolos RBAC guru juga — roles.guard.ts). Setup data
 * murni via API lalu verifikasi UI: pilih kelas + rentang tanggal → tabel
 * Σ H/S/I/A/T per siswa muncul, paginasi berfungsi.
 */
test.describe('F2 — Rekap Presensi (UI)', () => {
  const createdGuruIds: number[] = [];
  const createdKelasIds: number[] = [];
  const createdMapelIds: number[] = [];
  const createdPenugasanIds: number[] = [];
  const createdJadwalIds: number[] = [];
  const createdSiswaIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = authHeaders(token as string);
    for (const sid of createdSiswaIds) {
      await request.delete(`/api/admin/siswa/${sid}`, { headers }).catch(() => {});
    }
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
    createdSiswaIds.length = 0;
    createdJadwalIds.length = 0;
    createdPenugasanIds.length = 0;
    createdMapelIds.length = 0;
    createdKelasIds.length = 0;
    createdGuruIds.length = 0;
  });

  test('Pilih kelas + rentang tanggal menampilkan tabel rekap H/S/I/A/T per siswa', async ({ page, request }) => {
    const token = (await page.evaluate(() => localStorage.getItem('aamapp_token'))) as string;
    const headers = authHeaders(token);
    const suffix = Date.now();
    await ensureActiveTahunAjaran(request, token);

    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `RK${suffix}`.slice(0, 20), nama: `Guru Rekap ${suffix}`, jenisKelamin: 'L', status: 'aktif' },
    });
    const guru = await guruRes.json();
    createdGuruIds.push(guru.id);

    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers,
      data: { nama: `Mapel Rekap ${suffix}`, kode: `MR${suffix}`.slice(0, 20), kelompok: 'A', urutan: 1 },
    });
    const mapel = await mapelRes.json();
    createdMapelIds.push(mapel.id);

    const kelasRes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `KR-${suffix}` },
    });
    const kelas = await kelasRes.json();
    createdKelasIds.push(kelas.id);

    const siswaRes = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Rekap ${suffix}`, nis: `SRK${suffix}`.slice(0, 20), jenisKelamin: 'L', kelasId: kelas.id, status: 'aktif' },
    });
    const siswa = await siswaRes.json();
    createdSiswaIds.push(siswa.id);

    const penugasanRes = await request.post('/api/kurikulum/penugasan', {
      headers,
      data: { guruId: guru.id, mapelId: mapel.id, kelasIds: [kelas.id] },
    });
    const penugasan = (await penugasanRes.json())[0];
    createdPenugasanIds.push(penugasan.id);

    const now = new Date();
    const wibNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const jsDay = wibNow.getDay();
    const hari = jsDay === 0 ? 1 : jsDay;

    const jadwalRes = await request.post('/api/kurikulum/jadwal', {
      headers,
      data: { penugasanId: penugasan.id, hari, jamMulai: '00:00', jamSelesai: '23:59' },
    });
    const jadwal = await jadwalRes.json();
    createdJadwalIds.push(jadwal.id);

    const tanggal = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    // Simpan roster siswa = Hadir, agar rekap punya data.
    await request.post(`/api/guru/kbm/${jadwal.id}/roster`, {
      headers,
      data: { tanggal, entri: [{ siswaId: siswa.id, status: 'H' }] },
    });

    await page.goto('/guru/rekap');
    await expect(page.getByRole('heading', { name: 'Rekap Presensi' })).toBeVisible();

    // Pilih kelas via AdaptiveSelect (trigger berlabel "Pilih Kelas").
    await page.getByRole('button', { name: /Pilih Kelas/ }).click();
    await page.getByRole('option', { name: new RegExp(`KR-${suffix}`) }).click();

    // Set rentang tanggal mencakup hari ini.
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(tanggal);
    await dateInputs.nth(1).fill(tanggal);

    // Tabel rekap (desktop) muncul dengan nama siswa & kolom H terisi 1.
    // Mobile card list juga ada di DOM (disembunyikan via CSS), jadi scope
    // ke tabel desktop agar tidak bentrok strict-mode.
    const desktopTable = page.locator('div.hidden.md\\:block table');
    await expect(desktopTable.getByText(`Siswa Rekap ${suffix}`)).toBeVisible();
    const row = desktopTable.locator('tr', { hasText: `Siswa Rekap ${suffix}` });
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(2)).toHaveText('1'); // kolom H
  });
});
