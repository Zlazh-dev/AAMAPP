import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { ensureActiveTahunAjaran, authHeaders } from '../helpers/api';

/**
 * F2-SPEC e2e â€” Presensi Siswa per KBM.
 * Â§12.17e: spec wajib â€” simpan roster, cutoff 403, koreksi guru pengampu,
 * matriks batch, rekap.
 *
 * Setup murni via API (guru, mapel, kelas, siswa, penugasan, jadwal)
 * karena F2 backend tidak bergantung pada UI guru untuk diverifikasi.
 * IA-HIERARCHY-V2 Â§Keputusan otorisasi: koreksi presensi siswa = hak murni
 * guru pengampu. Admin TIDAK lagi lolos @Roles('guru') â€” panggilan
 * /api/guru/* wajib pakai token guru pengampu jadwal itu.
 */
test.describe('F2 â€” Presensi Siswa per KBM', () => {
  // Alur KBM "hari ini" tidak berlaku pada MINGGU (produk: hari 7 = tak ada
  // KBM). Skip agar suite tetap hijau di hari Minggu (bukan bug produk).
  const _wibDay = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' });
  test.skip(_wibDay === 'Sun', 'Minggu: tidak ada KBM (hari 7) â€” alur presensi hari-ini tidak berlaku');

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

  /** Setup bersama: guru + mapel + kelas + 2 siswa + penugasan + jadwal hari ini.
   *  IA-HIERARCHY-V2: guru pengampu WAJIB punya user account supaya bisa
   *  memanggil endpoint /api/guru/* (admin tak lagi lolos @Roles('guru')). */
  async function setupSesiHariIni(request: any, token: string, suffix: number) {
    const headers = authHeaders(token);
    await ensureActiveTahunAjaran(request, token);

    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `PS${suffix}`.slice(0, 20), nama: `Guru Presensi ${suffix}`, jenisKelamin: 'L', status: 'aktif' },
    });
    const guru = await guruRes.json();

    // Buat user account untuk guru pengampu + tautkan ke record guru.
    const guruEmail = `guru.presensi.${suffix}@aamapp.sch.id`;
    const userRes = await request.post('/api/admin/users', {
      headers,
      data: { name: `Guru Presensi ${suffix}`, email: guruEmail, password: 'password123', roles: ['guru'] },
    });
    const user = await userRes.json();
    await request.patch(`/api/admin/guru/${guru.id}`, { headers, data: { userId: user.id } });

    // Login sebagai guru pengampu untuk dapatkan token /api/guru/*.
    const guruLoginRes = await request.post('/api/auth/login', { data: { email: guruEmail, password: 'password123' } });
    const { accessToken: guruToken } = await guruLoginRes.json();
    const guruHeaders = authHeaders(guruToken);

    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers,
      data: { nama: `Mapel Presensi ${suffix}`, kode: `MP${suffix}`.slice(0, 20), kelompok: 'A', urutan: 1 },
    });
    const mapel = await mapelRes.json();

    const kelasRes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `KP-${suffix}`, waliGuruId: guru.id },
    });
    const kelas = await kelasRes.json();

    const siswa1Res = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Presensi A ${suffix}`, nis: `SPA${suffix}`.slice(0, 20), jenisKelamin: 'L', kelasId: kelas.id, status: 'aktif' },
    });
    const siswa1 = await siswa1Res.json();
    const siswa2Res = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Presensi B ${suffix}`, nis: `SPB${suffix}`.slice(0, 20), jenisKelamin: 'P', kelasId: kelas.id, status: 'aktif' },
    });
    const siswa2 = await siswa2Res.json();

    const penugasanRes = await request.post('/api/kurikulum/penugasan', {
      headers,
      data: { guruId: guru.id, mapelId: mapel.id, kelasIds: [kelas.id] },
    });
    const penugasan = (await penugasanRes.json())[0];

    // Hari WIB hari ini (1=Senin..6=Sabtu, jadwal tidak dijadwalkan hari 7).
    const now = new Date();
    const wibNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const jsDay = wibNow.getDay(); // 0=Minggu..6=Sabtu
    const hari = jsDay === 0 ? 1 : jsDay; // fallback Senin bila kebetulan Minggu

    const jadwalRes = await request.post('/api/kurikulum/jadwal', {
      headers,
      data: { penugasanId: penugasan.id, hari, jamMulai: '00:00', jamSelesai: '23:59' },
    });
    const jadwal = await jadwalRes.json();

    return { guru, guruToken, guruHeaders, mapel, kelas, siswa1, siswa2, penugasan, jadwal };
  }

  test('Simpan roster, baca kembali, matriks admin, dan koreksi guru pengampu dgn alasan', async ({ page, request }) => {
    const token = (await page.evaluate(() => localStorage.getItem('aamapp_token'))) as string;
    const headers = authHeaders(token);
    const suffix = Date.now();
    const { kelas, siswa1, siswa2, jadwal, guruHeaders } = await setupSesiHariIni(request, token, suffix);
    createdKelasIds.push(kelas.id);
    createdSiswaIds.push(siswa1.id, siswa2.id);
    createdJadwalIds.push(jadwal.id);

    const tanggal = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD

    // 1. Simpan roster: siswa1=H, siswa2=I.
    const simpanRes = await request.post(`/api/guru/kbm/${jadwal.id}/roster`, {
      headers: guruHeaders,
      data: {
        tanggal,
        entri: [
          { siswaId: siswa1.id, status: 'H' },
          { siswaId: siswa2.id, status: 'I' },
        ],
      },
    });
    expect(simpanRes.ok(), await simpanRes.text()).toBeTruthy();
    const simpanBody = await simpanRes.json();
    expect(simpanBody.ok).toBe(true);
    expect(simpanBody.ringkasan.H).toBe(1);
    expect(simpanBody.ringkasan.I).toBe(1);

    // 2. Baca roster kembali -> status tersimpan sesuai & tersimpan=true.
    const rosterRes = await request.get(`/api/guru/kbm/${jadwal.id}/roster?tanggal=${tanggal}`, { headers: guruHeaders });
    expect(rosterRes.ok()).toBeTruthy();
    const rosterBody = await rosterRes.json();
    expect(rosterBody.tersimpan).toBe(true);
    const s1 = rosterBody.siswa.find((s: any) => s.siswaId === siswa1.id);
    const s2 = rosterBody.siswa.find((s: any) => s.siswaId === siswa2.id);
    expect(s1.status).toBe('H');
    expect(s2.status).toBe('I');

    // 3. Matriks admin -> sesi TERLAKSANA dengan ringkasan 1H 1I.
    const matriksRes = await request.get(`/api/admin/presensi-siswa?kelasId=${kelas.id}&tanggal=${tanggal}`, { headers });
    expect(matriksRes.ok()).toBeTruthy();
    const matriksBody = await matriksRes.json();
    const sesiMatriks = matriksBody.sesi.find((s: any) => s.jadwalKbmId === jadwal.id);
    expect(sesiMatriks.status).toBe('TERLAKSANA');
    expect(sesiMatriks.ringkasan.H).toBe(1);
    expect(sesiMatriks.ringkasan.I).toBe(1);

    // 4. Koreksi guru pengampu (PATCH) untuk tanggal LAMPAU -> 403 (cutoff).
    //    IA-HIERARCHY-V2 Â§Keputusan otorisasi: guru pengampu tidak bisa
    //    mengoreksi tanggal lampau (melewati cutoff) -> 403, bukan 400.
    const kemarin = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const koreksiTanpaAlasanRes = await request.patch(`/api/guru/kbm/${jadwal.id}/roster`, {
      headers: guruHeaders,
      data: { tanggal: kemarin, entri: [{ siswaId: siswa1.id, status: 'A' }] },
    });
    expect(koreksiTanpaAlasanRes.status()).toBe(403);

    // 5. Koreksi guru pengampu dgn alasan -> berhasil & status berubah jadi A.
    const koreksiRes = await request.patch(`/api/guru/kbm/${jadwal.id}/roster`, {
      headers: guruHeaders,
      data: {
        tanggal,
        entri: [{ siswaId: siswa1.id, status: 'A' }, { siswaId: siswa2.id, status: 'I' }],
        alasan: 'Koreksi uji e2e',
      },
    });
    expect(koreksiRes.ok(), await koreksiRes.text()).toBeTruthy();

    const rosterSetelahKoreksi = await request.get(`/api/guru/kbm/${jadwal.id}/roster?tanggal=${tanggal}`, { headers: guruHeaders });
    const bodySetelah = await rosterSetelahKoreksi.json();
    const s1Setelah = bodySetelah.siswa.find((s: any) => s.siswaId === siswa1.id);
    expect(s1Setelah.status).toBe('A');
  });

  test('Rekap presensi kelas berpaginasi menghitung H/S/I/A/T dari sesi TERLAKSANA', async ({ page, request }) => {
    const token = (await page.evaluate(() => localStorage.getItem('aamapp_token'))) as string;
    const headers = authHeaders(token);
    const suffix = Date.now() + 1;
    const { kelas, siswa1, siswa2, jadwal, guruHeaders } = await setupSesiHariIni(request, token, suffix);
    createdKelasIds.push(kelas.id);
    createdSiswaIds.push(siswa1.id, siswa2.id);
    createdJadwalIds.push(jadwal.id);

    const tanggal = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    await request.post(`/api/guru/kbm/${jadwal.id}/roster`, {
      headers: guruHeaders,
      data: {
        tanggal,
        entri: [
          { siswaId: siswa1.id, status: 'H' },
          { siswaId: siswa2.id, status: 'S' },
        ],
      },
    });

    const rekapRes = await request.get(
      `/api/guru/kelas/rekap-presensi?kelasId=${kelas.id}&dari=${tanggal}&sampai=${tanggal}&page=1&limit=10`,
      { headers: guruHeaders },
    );
    expect(rekapRes.ok(), await rekapRes.text()).toBeTruthy();
    const rekapBody = await rekapRes.json();
    expect(rekapBody.total).toBeGreaterThanOrEqual(2);
    const rekapS1 = rekapBody.data.find((d: any) => d.siswaId === siswa1.id);
    const rekapS2 = rekapBody.data.find((d: any) => d.siswaId === siswa2.id);
    expect(rekapS1.rekap.H).toBe(1);
    expect(rekapS2.rekap.S).toBe(1);
  });

  test('Guru non-pemilik & non-admin ditolak 403 saat simpan roster sesi orang lain', async ({ page, request }) => {
    const token = (await page.evaluate(() => localStorage.getItem('aamapp_token'))) as string;
    const headers = authHeaders(token);
    const suffix = Date.now() + 2;
    const { kelas, siswa1, jadwal } = await setupSesiHariIni(request, token, suffix);
    createdKelasIds.push(kelas.id);
    createdSiswaIds.push(siswa1.id);
    createdJadwalIds.push(jadwal.id);

    const guru2Res = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `PS2${suffix}`.slice(0, 20), nama: `Guru Lain ${suffix}`, jenisKelamin: 'P', status: 'aktif' },
    });
    const guru2 = await guru2Res.json();
    createdGuruIds.push(guru2.id);

    const email = `guru.lain.${suffix}@aamapp.sch.id`;
    const userRes = await request.post('/api/admin/users', {
      headers,
      data: { name: `Guru Lain ${suffix}`, email, password: 'password123', roles: ['guru'] },
    });
    const user = await userRes.json();

    await request.patch(`/api/admin/guru/${guru2.id}`, { headers, data: { userId: user.id } });

    const loginRes = await request.post('/api/auth/login', { data: { email, password: 'password123' } });
    expect(loginRes.ok()).toBeTruthy();
    const { accessToken } = await loginRes.json();
    const guru2Headers = authHeaders(accessToken);

    const tanggal = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const simpanRes = await request.post(`/api/guru/kbm/${jadwal.id}/roster`, {
      headers: guru2Headers,
      data: { tanggal, entri: [{ siswaId: siswa1.id, status: 'H' }] },
    });
    expect(simpanRes.status()).toBe(403);
  });
});

