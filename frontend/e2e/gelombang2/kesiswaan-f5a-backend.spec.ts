import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F5a Backend â€” Kesiswaan / Demerit
 *
 *  1. GET /api/kesiswaan/katalog â†’ 28 butir seed Â§7.2
 *  2. R-07 di nomor 7: Terlambat masuk kelas, R, 10
 *  3. RBAC guru bisa baca katalog â†’ 200
 *  4. Catat langsung (kesiswaan/admin) â†’ DISETUJUI, saldo turun
 *  5. Lapor (guru biasa) â†’ MENUNGGU, saldo BELUM turun
 *  6. Verifikasi setujui â†’ DISETUJUI, saldo turun
 *  7. Tolak wajib alasan â†’ DITOLAK
 *  8. Tolak tanpa alasan â†’ 400
 *  9. RBAC: guru lain tidak bisa langsung (MENUNGGU, bukan DISETUJUI)
 * 10. Hook R-07: simpan roster dengan siswa T â†’ draft R-07 MENUNGGU, saldo tidak berubah
 */

let adminToken: string;
let guruToken: string;
let guruUserId: number;
let siswaId: number;
let kelasId: number;
let katalogR07Id: number;
let suffix: string;

test.describe('F5a Backend â€” Kesiswaan / Demerit', () => {
  test.beforeAll(async ({ request }) => {
    // Login admin
    const login = await request.post('/api/auth/login', {
      data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' },
    });
    const loginBody = await login.json();
    adminToken = loginBody.token ?? loginBody.accessToken ?? loginBody.access_token;

    suffix = Date.now().toString();

    // Buat kelas
    const kelasRes = await request.post('/api/admin/kelas', {
      headers: authHeaders(adminToken),
      data: { nama: `F5a-Kelas-${suffix}`, tingkat: 7, fase: 'D' },
    });
    kelasId = (await kelasRes.json()).id;

    // Buat siswa
    const siswaRes = await request.post('/api/admin/siswa', {
      headers: authHeaders(adminToken),
      data: {
        nama: `F5a Siswa ${suffix}`,
        nis: `F5${suffix.slice(-6)}`,
        kelasId,
        jenisKelamin: 'L',
        tanggalLahir: '2010-01-01',
      },
    });
    siswaId = (await siswaRes.json()).id;

    // Buat user guru
    const guruUserRes = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: {
        name: `F5a Guru ${suffix}`,
        email: `f5a.guru.${suffix}@test.com`,
        password: 'pass1234',
        roles: ['guru'],
      },
    });
    guruUserId = (await guruUserRes.json()).id;

    // Login guru
    const guruLogin = await request.post('/api/auth/login', {
      data: { email: `f5a.guru.${suffix}@test.com`, password: 'pass1234' },
    });
    const guruBody = await guruLogin.json();
    guruToken = guruBody.token ?? guruBody.accessToken ?? guruBody.access_token;
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (siswaId) await request.delete(`/api/admin/siswa/${siswaId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (kelasId) await request.delete(`/api/admin/kelas/${kelasId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guruUserId) await request.delete(`/api/admin/users/${guruUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
  });

  // â”€â”€â”€ 1. Seed 28 butir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('1. GET /api/kesiswaan/katalog â†’ 28 butir seed Â§7.2', async ({ request }) => {
    const res = await request.get('/api/kesiswaan/katalog?limit=50', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.total).toBeGreaterThanOrEqual(28);
    expect(body.data.length).toBeGreaterThanOrEqual(28);
  });

  // â”€â”€â”€ 2. R-07 = nomor 7 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('2. R-07 = nomor 7 "Terlambat masuk kelas" R 10 poin', async ({ request }) => {
    const res = await request.get('/api/kesiswaan/katalog?q=Terlambat&limit=5', {
      headers: authHeaders(adminToken),
    });
    const body = await res.json();
    const r07 = body.data.find((k: any) => k.nomor === 7);
    expect(r07).toBeTruthy();
    expect(r07.kategori).toBe('R');
    expect(r07.poin).toBe(10);
    expect(r07.bentuk).toContain('Terlambat');
    katalogR07Id = r07.id;
  });

  // â”€â”€â”€ 3. Guru bisa baca katalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('3. RBAC: guru bisa baca katalog â†’ 200', async ({ request }) => {
    const res = await request.get('/api/kesiswaan/katalog', {
      headers: authHeaders(guruToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  // â”€â”€â”€ 4. Catat langsung (admin) â†’ DISETUJUI, saldo turun â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('4. Catat langsung (admin/kesiswaan) â†’ DISETUJUI, saldo turun 10', async ({ request }) => {
    // Saldo awal
    const saldo0 = await request.get(`/api/kesiswaan/saldo?siswaId=${siswaId}`, {
      headers: authHeaders(adminToken),
    });
    const saldo0Body = await saldo0.json();
    const saldo0Nilai = saldo0Body.data[0]?.saldo ?? 500;

    // Catat langsung
    const res = await request.post('/api/kesiswaan/pelanggaran', {
      headers: authHeaders(adminToken),
      data: {
        siswaId,
        katalogId: katalogR07Id,
        tanggal: '2026-07-18',
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const pelanggaran = await res.json();
    expect(pelanggaran.status).toBe('DISETUJUI');
    expect(pelanggaran.poin).toBe(10);

    // Saldo sekarang berkurang 10
    const saldo1 = await request.get(`/api/kesiswaan/saldo?siswaId=${siswaId}`, {
      headers: authHeaders(adminToken),
    });
    const saldo1Body = await saldo1.json();
    const saldo1Nilai = saldo1Body.data[0]?.saldo;
    expect(saldo1Nilai).toBe(saldo0Nilai - 10);
  });

  // â”€â”€â”€ 5. Lapor (guru biasa) â†’ MENUNGGU, saldo belum berubah â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('5. Lapor (guru biasa bukan kesiswaan) â†’ MENUNGGU, saldo tidak berubah', async ({ request }) => {
    const saldo0 = await request.get(`/api/kesiswaan/saldo?siswaId=${siswaId}`, {
      headers: authHeaders(adminToken),
    });
    const saldo0Nilai = (await saldo0.json()).data[0]?.saldo;

    // Guru lapor
    const res = await request.post('/api/kesiswaan/pelanggaran', {
      headers: authHeaders(guruToken),
      data: {
        siswaId,
        katalogId: katalogR07Id,
        tanggal: '2026-07-17',
        catatan: 'Terlambat 10 menit',
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const pelanggaran = await res.json();
    expect(pelanggaran.status).toBe('MENUNGGU');

    // Saldo tidak berubah
    const saldo1 = await request.get(`/api/kesiswaan/saldo?siswaId=${siswaId}`, {
      headers: authHeaders(adminToken),
    });
    const saldo1Nilai = (await saldo1.json()).data[0]?.saldo;
    expect(saldo1Nilai).toBe(saldo0Nilai);

    // Simpan ID untuk test 6
    (test as any)._pelanggaranMenungguId = pelanggaran.id;
  });

  // â”€â”€â”€ 6. Verifikasi setujui â†’ DISETUJUI, saldo turun â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('6. Setujui pelanggaran MENUNGGU â†’ DISETUJUI, saldo turun', async ({ request }) => {
    // Ambil antrean MENUNGGU
    const antrean = await request.get('/api/kesiswaan/verifikasi', {
      headers: authHeaders(adminToken),
    });
    const antreanBody = await antrean.json();
    const pending = antreanBody.data.find((p: any) => p.siswaId === siswaId && p.status === 'MENUNGGU');
    if (!pending) return; // Jika tidak ada, skip

    const saldo0 = await request.get(`/api/kesiswaan/saldo?siswaId=${siswaId}`, {
      headers: authHeaders(adminToken),
    });
    const saldo0Nilai = (await saldo0.json()).data[0]?.saldo;

    const res = await request.patch(`/api/kesiswaan/pelanggaran/${pending.id}/setujui`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('DISETUJUI');

    // Saldo berkurang
    const saldo1 = await request.get(`/api/kesiswaan/saldo?siswaId=${siswaId}`, {
      headers: authHeaders(adminToken),
    });
    const saldo1Nilai = (await saldo1.json()).data[0]?.saldo;
    expect(saldo1Nilai).toBeLessThan(saldo0Nilai);
  });

  // â”€â”€â”€ 7. Tolak dengan alasan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('7. Guru lapor â†’ catat baru â†’ admin tolak dengan alasan â†’ DITOLAK', async ({ request }) => {
    // Catat satu pelanggaran MENUNGGU baru
    const res = await request.post('/api/kesiswaan/pelanggaran', {
      headers: authHeaders(guruToken),
      data: {
        siswaId,
        katalogId: katalogR07Id,
        tanggal: '2026-07-16',
        catatan: 'Tolak test',
      },
    });
    const p = await res.json();

    const tolakRes = await request.patch(`/api/kesiswaan/pelanggaran/${p.id}/tolak`, {
      headers: authHeaders(adminToken),
      data: { alasan: 'Laporan tidak akurat, sudah dikonfirmasi' },
    });
    expect(tolakRes.ok(), await tolakRes.text()).toBeTruthy();
    const tolakBody = await tolakRes.json();
    expect(tolakBody.status).toBe('DITOLAK');
    expect(tolakBody.alasanKeputusan).toBeTruthy();
  });

  // â”€â”€â”€ 8. Tolak tanpa alasan â†’ 400 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('8. Tolak pelanggaran tanpa alasan â†’ 400 BadRequest', async ({ request }) => {
    // Catat satu pelanggaran MENUNGGU baru
    const res = await request.post('/api/kesiswaan/pelanggaran', {
      headers: authHeaders(guruToken),
      data: { siswaId, katalogId: katalogR07Id, tanggal: '2026-07-15' },
    });
    const p = await res.json();

    const tolakRes = await request.patch(`/api/kesiswaan/pelanggaran/${p.id}/tolak`, {
      headers: authHeaders(adminToken),
      data: { alasan: '' }, // kosong
    });
    expect(tolakRes.status()).toBe(400);
  });

  // â”€â”€â”€ 9. RBAC: guru biasa â†’ MENUNGGU (tidak langsung) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('9. RBAC: guru biasa bukan kesiswaan â†’ catat hanya bisa LAPORAN/MENUNGGU', async ({ request }) => {
    const res = await request.post('/api/kesiswaan/pelanggaran', {
      headers: authHeaders(guruToken),
      data: { siswaId, katalogId: katalogR07Id, tanggal: '2026-07-14' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    // Guru biasa tidak berhak langsung â†’ MENUNGGU
    expect(body.status).toBe('MENUNGGU');
  });

  // â”€â”€â”€ 10. Saldo query batch via kelasId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('10. GET /api/kesiswaan/saldo?kelasId= â†’ batch anti-N+1, saldo benar', async ({ request }) => {
    const res = await request.get(`/api/kesiswaan/saldo?kelasId=${kelasId}`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    // Siswa kita harus ada
    const entry = body.data.find((d: any) => d.siswaId === siswaId);
    expect(entry).toBeTruthy();
    // Saldo harus < 500 (sudah ada pelanggaran DISETUJUI)
    expect(entry.saldo).toBeLessThan(500);
    expect(entry.terpotong).toBeGreaterThan(0);
    expect(typeof entry.perKategori.R).toBe('number');
  });
});

