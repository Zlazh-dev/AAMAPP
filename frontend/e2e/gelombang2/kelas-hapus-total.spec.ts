import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders, ensureActiveTahunAjaran } from '../helpers/api';

/**
 * Hapus Kelas = Hapus Total (opsi B, keputusan pemilik produk).
 *
 * Membuktikan lewat DATABASE (bukan pesan sukses layar) bahwa menghapus
 * kelas benar-benar menghapus permanen: penugasan, jadwal_kbm, presensi_sesi.
 * Siswa DIKELUARKAN (kelasId SET NULL) — datanya tetap ada.
 *
 * Urutan transaksi: (a) presensi_sesi -> (b) penugasan -> (c) kelas.
 */

const DB_CONTAINER = 'aamapp-db-1';
const DB_USER = 'aamapp';
const DB_NAME = 'aamapp';

async function dbCount(table: string, where: string): Promise<number> {
  const sql = `SELECT COUNT(*) FROM ${table} WHERE ${where}`;
  const out = await execDocker(sql);
  return parseInt(out.trim(), 10) || 0;
}

async function dbScalar(query: string): Promise<string> {
  return (await execDocker(query)).trim();
}

/** Jalankan SQL via docker exec tanpa interpretasi shell PowerShell. */
async function execDocker(sql: string): Promise<string> {
  const { execFile } = await import('child_process');
  return new Promise((resolve, reject) => {
    execFile(
      'docker',
      ['exec', DB_CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c', sql],
      { shell: false },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      },
    );
  });
}

test.describe('Hapus Kelas = Hapus Total (DB proof)', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    adminToken = await loginViaApi(ctx);
  });

  test('Hapus kelas menghapus permanen penugasan, jadwal, sesi presensi; siswa SET NULL', async ({ page, request }) => {
    const headers = authHeaders(adminToken);
    await ensureActiveTahunAjaran(request, adminToken);
    const suffix = Date.now();

    // 1. Buat kelas uji.
    const kelasRes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 9, nama: `HapusTotal-${suffix}` },
    });
    expect(kelasRes.ok()).toBe(true);
    const kelas = await kelasRes.json();

    // 2. Buat guru + mapel + penugasan + jadwal + 1 siswa di kelas itu.
    // Buat akun guru pengampu dulu (IA-HIERARCHY-V2: /api/guru/* @Roles('guru')).
    const guruEmail = `guru.ht.${suffix}@aamapp.sch.id`;
    const guruUserRes = await request.post('/api/admin/users', {
      headers,
      data: { name: `Guru HT ${suffix}`, email: guruEmail, password: 'password123', roles: ['guru'] },
    });
    const guruUserId = (await guruUserRes.json()).id;
    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: { userId: guruUserId, nip: `HT${suffix}`.slice(0, 20), nama: `Guru HT ${suffix}`, jenisKelamin: 'L', status: 'aktif' },
    });
    const guru = await guruRes.json();

    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers,
      data: { nama: `Mapel HT ${suffix}`, kode: `MHT${suffix}`.slice(0, 20), kelompok: 'A', urutan: 1 },
    });
    const mapel = await mapelRes.json();

    const penugasanRes = await request.post('/api/kurikulum/penugasan', {
      headers,
      data: { guruId: guru.id, mapelId: mapel.id, kelasIds: [kelas.id] },
    });
    const penugasan = (await penugasanRes.json())[0];

    // Hari WIB hari ini.
    const jsDay = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const hari = new Date(jsDay).getDay() || 1;
    const jadwalRes = await request.post('/api/kurikulum/jadwal', {
      headers,
      data: { penugasanId: penugasan.id, hari, jamMulai: '00:00', jamSelesai: '23:59' },
    });
    const jadwal = await jadwalRes.json();

    // Buat 2 siswa di kelas ini.
    const siswa1Res = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa HT A ${suffix}`, nis: `SHTA${suffix}`.slice(0, 20), jenisKelamin: 'L', kelasId: kelas.id, status: 'aktif' },
    });
    const siswa1 = await siswa1Res.json();
    const siswa2Res = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa HT B ${suffix}`, nis: `SHTB${suffix}`.slice(0, 20), jenisKelamin: 'P', kelasId: kelas.id, status: 'aktif' },
    });
    const siswa2 = await siswa2Res.json();

    // 3. Simpan 1 sesi presensi (membuat presensi_sesi + presensi_siswa).
    // Login sebagai guru pengampu (akun sudah dibuat di atas).
    const guruLoginRes = await request.post('/api/auth/login', { data: { email: guruEmail, password: 'password123' } });
    const { accessToken: guruToken } = await guruLoginRes.json();
    const guruHeaders = authHeaders(guruToken);

    const tanggal = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const simpanRes = await request.post(`/api/guru/kbm/${jadwal.id}/roster`, {
      headers: guruHeaders,
      data: { tanggal, entri: [{ siswaId: siswa1.id, status: 'H' }, { siswaId: siswa2.id, status: 'I' }] },
    });
    expect(simpanRes.ok()).toBe(true);

    // 4. Verifikasi DB SEBELUM hapus: baris ada.
    const beforeSiswa = await dbCount('siswa', `"kelasId" = ${kelas.id}`);
    const beforePenugasan = await dbCount('penugasan', `"kelasId" = ${kelas.id}`);
    const beforeJadwal = await dbCount('jadwal_kbm', `"penugasanId" = ${penugasan.id}`);
    const beforeSesi = await dbCount('presensi_sesi', `"jadwalKbmId" = ${jadwal.id}`);
    expect(beforeSiswa).toBe(2);
    expect(beforePenugasan).toBe(1);
    expect(beforeJadwal).toBeGreaterThanOrEqual(1);
    expect(beforeSesi).toBeGreaterThanOrEqual(1);

    // 5. GET /dampak-hapus — hitungan konsisten dgn DB.
    const dampakRes = await request.get(`/api/admin/kelas/${kelas.id}/dampak-hapus`, { headers });
    expect(dampakRes.ok()).toBe(true);
    const dampak = await dampakRes.json();
    expect(dampak.siswa).toBe(beforeSiswa);
    expect(dampak.penugasan).toBe(beforePenugasan);
    expect(dampak.jadwal).toBe(beforeJadwal);
    expect(dampak.sesiPresensi).toBe(beforeSesi);

    // 6. Hapus kelas via API.
    const delRes = await request.delete(`/api/admin/kelas/${kelas.id}`, { headers });
    expect(delRes.ok()).toBe(true);

    // 7. Verifikasi DB SETELAH hapus: baris hilang permanen.
    const afterKelas = await dbCount('kelas', `"id" = ${kelas.id}`);
    const afterPenugasan = await dbCount('penugasan', `"kelasId" = ${kelas.id}`);
    const afterJadwal = await dbCount('jadwal_kbm', `"penugasanId" = ${penugasan.id}`);
    const afterSesi = await dbCount('presensi_sesi', `"jadwalKbmId" = ${jadwal.id}`);
    const afterSiswaKelasNull = await dbCount('siswa', `"id" IN (${siswa1.id}, ${siswa2.id}) AND "kelasId" IS NULL`);

    expect(afterKelas).toBe(0);
    expect(afterPenugasan).toBe(0);
    expect(afterJadwal).toBe(0);
    expect(afterSesi).toBe(0);
    // Siswa DIKELUARKAN (kelasId SET NULL) — data tetap ada.
    expect(afterSiswaKelasNull).toBe(2);

    // 8. Cleanup siswa (data siswa tidak ikut terhapus).
    await request.delete(`/api/admin/siswa/${siswa1.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/siswa/${siswa2.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/guru/${guru.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/users/${guruUserId}`, { headers }).catch(() => {});
    await request.delete(`/api/kurikulum/mapel/${mapel.id}`, { headers }).catch(() => {});
  });

  test('dampak-hapus mengembalikan 404 untuk kelas yg tidak ada', async ({ request }) => {
    const headers = authHeaders(adminToken);
    const res = await request.get('/api/admin/kelas/9999999/dampak-hapus', { headers });
    expect(res.status()).toBe(404);
  });
});

async function loginViaApi(ctx: import('@playwright/test').APIRequestContext): Promise<string> {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aamapp.sch.id';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';
  const res = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const body = await res.json();
  return body.accessToken;
}
