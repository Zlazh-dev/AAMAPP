import { test, expect } from '@playwright/test';
import { authHeaders } from '../helpers/api';

/**
 * F6-INTEGRASI Backend — Rapor Lengkap 3 Bagian
 *
 *  Setup:
 *   - Guru wali kelas + siswa di kelasnya
 *   - Penugasan mapel + nilai sumatif (akademik)
 *   - Kegiatan kokurikuler + asesmen (kokurikuler)
 *   - Ekskul + nilai + kehadiran (ekstrakurikuler)
 *
 *  Test:
 *  1. GET rapor siswa → memuat bagian akademik (mapel + nilai)
 *  2. GET rapor siswa → memuat bagian kokurikuler (dimensi + nilai)
 *  3. GET rapor siswa → memuat bagian ekstrakurikuler (nama + kehadiran% + tujuan)
 *  4. PATCH finalisasi → status FINAL
 *  5. GET rapor FINAL → dari snapshot; snapshot memuat 3 bagian (immutable beku)
 *  6. Override setelah FINAL → 400
 *  7. PATCH batal-final → kembali DRAFT (muat ulang dari derived)
 */

let adminToken: string;
let waliToken: string;
let waliUserId: number;
let waliGuruId: number;
let kelasId: number;
let siswaId: number;
let mapelId: number;
let penugasanId: number;
let kegiatanId: number;
let targetId: number;
let ekskulId: number;
let pesertaId: number;
let suffix: string;

test.describe('F6-INTEGRASI Backend — Rapor 3 Bagian', () => {
  test.beforeAll(async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'admin@aamapp.sch.id', password: 'admin12345' },
    });
    adminToken = (await login.json()).accessToken;
    suffix = Date.now().toString().slice(-6);

    // Buat wali guru
    const u = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `INT Wali ${suffix}`, email: `intw${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    waliUserId = (await u.json()).id;
    const g = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: waliUserId, nip: `INTW${suffix}`, nama: `INT Wali ${suffix}`, jenisKelamin: 'L' },
    });
    waliGuruId = (await g.json()).id;
    const lw = await request.post('/api/auth/login', { data: { email: `intw${suffix}@test.com`, password: 'pass1234' } });
    waliToken = (await lw.json()).accessToken;

    // Kelas + siswa
    const kelasRes = await request.post('/api/admin/kelas', {
      headers: authHeaders(adminToken),
      data: { nama: `INT-Kelas-${suffix}`, tingkat: 8, fase: 'D', waliGuruId },
    });
    kelasId = (await kelasRes.json()).id;
    const siswaRes = await request.post('/api/admin/siswa', {
      headers: authHeaders(adminToken),
      data: { nama: `INT Siswa ${suffix}`, nis: `INTS${suffix}`, kelasId, jenisKelamin: 'L', tanggalLahir: '2012-01-01' },
    });
    siswaId = (await siswaRes.json()).id;

    // ─── AKADEMIK: mapel + penugasan + penilaian + nilai ─────────────────────
    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers: authHeaders(adminToken),
      data: { nama: `INT-Mapel-${suffix}`, kode: `INTM${suffix}` },
    });
    mapelId = (await mapelRes.json()).id;
    const ptRes = await request.post('/api/kurikulum/penugasan', {
      headers: authHeaders(adminToken),
      data: { mapelId, kelasIds: [kelasId], guruId: waliGuruId },
    });
    const ptBody = await ptRes.json();
    penugasanId = Array.isArray(ptBody) ? ptBody[0].id : ptBody.id;

    const tpRes = await request.post(`/api/guru/penilaian/${penugasanId}/tp`, {
      headers: authHeaders(waliToken),
      data: { deskripsi: 'Memahami konsep integrasi', urutan: 1 },
    });
    const tpId = (await tpRes.json()).id;

    const pRes = await request.post(`/api/guru/penilaian/${penugasanId}/penilaian`, {
      headers: authHeaders(waliToken),
      data: { nama: 'UTS INT', jenis: 'Sumatif', subjenis: 'SUMATIF_TP', bobot: 1, tanggal: '2026-07-20', tpIds: [tpId] },
    });
    const pId = (await pRes.json()).id;

    await request.put(`/api/guru/penilaian/penilaian/${pId}/nilai`, {
      headers: authHeaders(waliToken),
      data: { entri: [{ siswaId, nilai: 90 }] },
    });

    // ─── KOKURIKULER: kegiatan + target + tim + asesmen ──────────────────────
    const kgRes = await request.post('/api/kokurikuler/kegiatan', {
      headers: authHeaders(adminToken),
      data: { semester: 1, tema: `INT Proyek ${suffix}` },
    });
    kegiatanId = (await kgRes.json()).id;
    const tRes = await request.post(`/api/kokurikuler/kegiatan/${kegiatanId}/target`, {
      headers: authHeaders(adminToken),
      data: { namaDimensi: 'Kreativitas' },
    });
    targetId = (await tRes.json()).id;
    await request.post(`/api/kokurikuler/kegiatan/${kegiatanId}/tim`, {
      headers: authHeaders(adminToken),
      data: { kelasId, guruId: waliGuruId },
    });
    await request.put(`/api/kokurikuler/asesmen?kegiatanId=${kegiatanId}&kelasId=${kelasId}`, {
      headers: authHeaders(waliToken),
      data: { entri: [{ siswaId, targetId, nilai: 'Sangat Baik' }] },
    });

    // ─── EKSKUL: ekskul + peserta + tujuan + nilai + kehadiran ───────────────
    const ekRes = await request.post('/api/ekskul', {
      headers: authHeaders(adminToken),
      data: { nama: `INT Pramuka ${suffix}`, pembinaGuruId: waliGuruId },
    });
    ekskulId = (await ekRes.json()).id;
    const pesRes = await request.post(`/api/ekskul/${ekskulId}/peserta`, {
      headers: authHeaders(waliToken),
      data: { siswaId },
    });
    pesertaId = (await pesRes.json()).id;
    const tujRes = await request.post(`/api/ekskul/${ekskulId}/tujuan`, {
      headers: authHeaders(waliToken),
      data: { semester: 1, deskripsi: 'Disiplin dalam kegiatan' },
    });
    const tujuanId = (await tujRes.json()).id;
    await request.put(`/api/ekskul/${ekskulId}/nilai`, {
      headers: authHeaders(waliToken),
      data: { semester: 1, entri: [{ pesertaId, tujuanId, nilai: 'Baik' }] },
    });
    await request.put(`/api/ekskul/${ekskulId}/kehadiran`, {
      headers: authHeaders(waliToken),
      data: { semester: 1, entri: [{ pesertaId, jumlahHadir: 8, totalPertemuan: 10 }] },
    });
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (kegiatanId) await request.delete(`/api/kokurikuler/kegiatan/${kegiatanId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (ekskulId) await request.delete(`/api/ekskul/${ekskulId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (penugasanId) await request.delete(`/api/kurikulum/penugasan/${penugasanId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (siswaId) await request.delete(`/api/admin/siswa/${siswaId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (kelasId) await request.delete(`/api/admin/kelas/${kelasId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (mapelId) await request.delete(`/api/kurikulum/mapel/${mapelId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (waliGuruId) await request.delete(`/api/admin/guru/${waliGuruId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (waliUserId) await request.delete(`/api/admin/users/${waliUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
  });

  // ─── 1. Akademik ─────────────────────────────────────────────────────────
  test('1. GET rapor siswa → bagian akademik (mapel + nilai)', async ({ request }) => {
    const res = await request.get(`/api/rapor/siswa/${siswaId}`, {
      headers: authHeaders(waliToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.siswaId).toBe(siswaId);
    expect(body.status).toBe('DRAFT');
    expect(Array.isArray(body.mapel)).toBeTruthy();
    const m = body.mapel.find((m: any) => m.mapelId === mapelId);
    expect(m, 'mapel integrasi harus ada').toBeTruthy();
    expect(m.nilaiAkhir).toBe(90);
  });

  // ─── 2. Kokurikuler ───────────────────────────────────────────────────────
  test('2. GET rapor siswa → bagian kokurikuler (dimensi Kreativitas=Sangat Baik)', async ({ request }) => {
    const res = await request.get(`/api/rapor/siswa/${siswaId}`, {
      headers: authHeaders(waliToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.kokurikuler)).toBeTruthy();
    const kreativitas = body.kokurikuler.find((k: any) => k.namaDimensi === 'Kreativitas');
    expect(kreativitas, 'dimensi Kreativitas harus ada').toBeTruthy();
    expect(kreativitas.nilai).toBe('Sangat Baik');
  });

  // ─── 3. Ekstrakurikuler ───────────────────────────────────────────────────
  test('3. GET rapor siswa → bagian ekstrakurikuler (ekskul + kehadiran% + tujuan)', async ({ request }) => {
    const res = await request.get(`/api/rapor/siswa/${siswaId}`, {
      headers: authHeaders(waliToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.ekstrakurikuler)).toBeTruthy();
    const ek = body.ekstrakurikuler.find((e: any) => e.nama?.includes('INT Pramuka'));
    expect(ek, 'ekskul INT Pramuka harus ada').toBeTruthy();
    expect(ek.kehadiranPersen).toBe(80);
    expect(ek.flagMerah).toBe(false);
    expect(Array.isArray(ek.tujuan)).toBeTruthy();
    expect(ek.tujuan[0].nilai).toBe('Baik');
  });

  // ─── 4. Finalisasi → FINAL ───────────────────────────────────────────────
  test('4. PATCH finalisasi → status FINAL', async ({ request }) => {
    const res = await request.patch(`/api/rapor/siswa/${siswaId}/finalisasi`, {
      headers: authHeaders(waliToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).status).toBe('FINAL');
  });

  // ─── 5. Snapshot FINAL memuat 3 bagian ────────────────────────────────────
  test('5. GET rapor FINAL → snapshot memuat 3 bagian (immutable)', async ({ request }) => {
    const res = await request.get(`/api/rapor/siswa/${siswaId}`, {
      headers: authHeaders(waliToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('FINAL');

    // Snapshot harus memuat 3 bagian
    expect(Array.isArray(body.mapel)).toBeTruthy();
    expect(body.mapel.length).toBeGreaterThan(0);
    expect(Array.isArray(body.kokurikuler)).toBeTruthy();
    expect(Array.isArray(body.ekstrakurikuler)).toBeTruthy();

    // Nilai akademik dalam snapshot
    const m = body.mapel.find((m: any) => m.mapelId === mapelId);
    expect(m?.nilaiAkhir).toBe(90);

    // Kokurikuler dalam snapshot
    const kr = body.kokurikuler.find((k: any) => k.namaDimensi === 'Kreativitas');
    expect(kr?.nilai).toBe('Sangat Baik');

    // Ekstrakurikuler dalam snapshot
    const ek = body.ekstrakurikuler.find((e: any) => e.nama?.includes('INT Pramuka'));
    expect(ek?.kehadiranPersen).toBe(80);
  });

  // ─── 6. Override setelah FINAL → 400 ─────────────────────────────────────
  test('6. Override setelah FINAL → 400', async ({ request }) => {
    const res = await request.put(`/api/rapor/siswa/${siswaId}/mapel/${mapelId}`, {
      headers: authHeaders(waliToken),
      data: { nilaiKatrol: 95 },
    });
    expect(res.status()).toBe(400);
  });

  // ─── 7. Batal-final → DRAFT ───────────────────────────────────────────────
  test('7. PATCH batal-final (admin) → kembali DRAFT + derived kembali', async ({ request }) => {
    const res = await request.patch(`/api/rapor/siswa/${siswaId}/batal-final`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).status).toBe('DRAFT');

    // GET kembali DRAFT + derived
    const getRes = await request.get(`/api/rapor/siswa/${siswaId}`, {
      headers: authHeaders(adminToken),
    });
    const body = await getRes.json();
    expect(body.status).toBe('DRAFT');
    // 3 bagian masih ada di DRAFT derived
    expect(Array.isArray(body.mapel)).toBeTruthy();
    expect(Array.isArray(body.kokurikuler)).toBeTruthy();
    expect(Array.isArray(body.ekstrakurikuler)).toBeTruthy();
  });
});
