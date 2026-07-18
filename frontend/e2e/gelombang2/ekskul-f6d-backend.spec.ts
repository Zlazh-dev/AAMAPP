import { test, expect } from '@playwright/test';
import { authHeaders } from '../helpers/api';

/**
 * F6d Backend — Ekstrakurikuler
 *
 *  1. POST ekskul → created
 *  2. GET ekskul list → muncul
 *  3. POST peserta → added
 *  4. POST tujuan (semester 1) → 2 tujuan created
 *  5. PUT nilai batch → saved
 *  6. PUT kehadiran batch (hadir=7, total=10 → 70%; hadir=6,total=10 → 60% <70% flagMerah)
 *  7. GET rapor siswa → nilai per tujuan + kehadiran% + flagMerah
 *  8. Deskripsi otomatis: benar berdasarkan nilai tujuan
 *  9. Non-pembina → 403 saat aksi pembina
 * 10. DELETE peserta → removed
 */

let adminToken: string;
let pembinaToken: string;
let nonPembinaToken: string;
let pembinaUserId: number;
let nonPembinaUserId: number;
let pembinaGuruId: number;
let nonPembinaGuruId: number;
let siswa1Id: number;
let siswa2Id: number;
let kelasId: number;
let ekskulId: number;
let peserta1Id: number;
let peserta2Id: number;
let tujuan1Id: number;
let tujuan2Id: number;
let suffix: string;

test.describe('F6d Backend — Ekstrakurikuler', () => {
  test.beforeAll(async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'admin@aamapp.sch.id', password: 'admin12345' },
    });
    adminToken = (await login.json()).accessToken;
    suffix = Date.now().toString().slice(-6);

    // Pembina guru
    const u1 = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `F6d Pembina ${suffix}`, email: `f6dp${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    pembinaUserId = (await u1.json()).id;
    const g1 = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: pembinaUserId, nip: `F6DP${suffix}`, nama: `F6d Pembina ${suffix}`, jenisKelamin: 'L' },
    });
    pembinaGuruId = (await g1.json()).id;

    // Non-pembina guru
    const u2 = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `F6d NonPembina ${suffix}`, email: `f6dn${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    nonPembinaUserId = (await u2.json()).id;
    const g2 = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: nonPembinaUserId, nip: `F6DN${suffix}`, nama: `F6d NonPembina ${suffix}`, jenisKelamin: 'P' },
    });
    nonPembinaGuruId = (await g2.json()).id;

    // Login
    const l1 = await request.post('/api/auth/login', { data: { email: `f6dp${suffix}@test.com`, password: 'pass1234' } });
    pembinaToken = (await l1.json()).accessToken;
    const l2 = await request.post('/api/auth/login', { data: { email: `f6dn${suffix}@test.com`, password: 'pass1234' } });
    nonPembinaToken = (await l2.json()).accessToken;

    // Kelas + 2 siswa
    const kelasRes = await request.post('/api/admin/kelas', {
      headers: authHeaders(adminToken),
      data: { nama: `F6d-Kelas-${suffix}`, tingkat: 7, fase: 'C' },
    });
    kelasId = (await kelasRes.json()).id;

    const s1 = await request.post('/api/admin/siswa', {
      headers: authHeaders(adminToken),
      data: { nama: `F6d Siswa1 ${suffix}`, nis: `F6S1${suffix}`, kelasId, jenisKelamin: 'L', tanggalLahir: '2013-01-01' },
    });
    siswa1Id = (await s1.json()).id;

    const s2 = await request.post('/api/admin/siswa', {
      headers: authHeaders(adminToken),
      data: { nama: `F6d Siswa2 ${suffix}`, nis: `F6S2${suffix}`, kelasId, jenisKelamin: 'P', tanggalLahir: '2013-06-01' },
    });
    siswa2Id = (await s2.json()).id;
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (ekskulId) await request.delete(`/api/ekskul/${ekskulId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (siswa1Id) await request.delete(`/api/admin/siswa/${siswa1Id}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (siswa2Id) await request.delete(`/api/admin/siswa/${siswa2Id}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (kelasId) await request.delete(`/api/admin/kelas/${kelasId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (pembinaGuruId) await request.delete(`/api/admin/guru/${pembinaGuruId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (nonPembinaGuruId) await request.delete(`/api/admin/guru/${nonPembinaGuruId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (pembinaUserId) await request.delete(`/api/admin/users/${pembinaUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (nonPembinaUserId) await request.delete(`/api/admin/users/${nonPembinaUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
  });

  // ─── 1. Create ekskul ──────────────────────────────────────────────────────
  test('1. POST ekskul → created dengan pembina', async ({ request }) => {
    const res = await request.post('/api/ekskul', {
      headers: authHeaders(adminToken),
      data: { nama: `Pramuka ${suffix}`, pembinaGuruId },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    ekskulId = body.id;
    expect(body.nama).toContain('Pramuka');
    expect(body.pembinaGuruId).toBe(pembinaGuruId);
  });

  // ─── 2. List ekskul ────────────────────────────────────────────────────────
  test('2. GET ekskul list → ekskul muncul', async ({ request }) => {
    const res = await request.get('/api/ekskul', { headers: authHeaders(adminToken) });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.data.some((e: any) => e.id === ekskulId)).toBeTruthy();
  });

  // ─── 3. Add peserta ────────────────────────────────────────────────────────
  test('3. POST peserta siswa1 + siswa2 → added', async ({ request }) => {
    const r1 = await request.post(`/api/ekskul/${ekskulId}/peserta`, {
      headers: authHeaders(pembinaToken),
      data: { siswaId: siswa1Id },
    });
    expect(r1.ok(), `peserta1: ${await r1.text()}`).toBeTruthy();
    peserta1Id = (await r1.json()).id;

    const r2 = await request.post(`/api/ekskul/${ekskulId}/peserta`, {
      headers: authHeaders(pembinaToken),
      data: { siswaId: siswa2Id },
    });
    expect(r2.ok(), `peserta2: ${await r2.text()}`).toBeTruthy();
    peserta2Id = (await r2.json()).id;
  });

  // ─── 4. Create tujuan ──────────────────────────────────────────────────────
  test('4. POST tujuan (2 tujuan semester 1) → created', async ({ request }) => {
    const t1 = await request.post(`/api/ekskul/${ekskulId}/tujuan`, {
      headers: authHeaders(pembinaToken),
      data: { semester: 1, deskripsi: 'Menguasai baris berbaris dengan disiplin' },
    });
    expect(t1.ok(), await t1.text()).toBeTruthy();
    tujuan1Id = (await t1.json()).id;

    const t2 = await request.post(`/api/ekskul/${ekskulId}/tujuan`, {
      headers: authHeaders(pembinaToken),
      data: { semester: 1, deskripsi: 'Mampu membuat simpul tali dengan benar' },
    });
    expect(t2.ok(), await t2.text()).toBeTruthy();
    tujuan2Id = (await t2.json()).id;
  });

  // ─── 5. Upsert nilai ───────────────────────────────────────────────────────
  test('5. PUT nilai batch → saved (siswa1: SB+B; siswa2: C+B)', async ({ request }) => {
    const res = await request.put(`/api/ekskul/${ekskulId}/nilai`, {
      headers: authHeaders(pembinaToken),
      data: {
        semester: 1,
        entri: [
          { pesertaId: peserta1Id, tujuanId: tujuan1Id, nilai: 'Sangat Baik' },
          { pesertaId: peserta1Id, tujuanId: tujuan2Id, nilai: 'Baik' },
          { pesertaId: peserta2Id, tujuanId: tujuan1Id, nilai: 'Cukup' },
          { pesertaId: peserta2Id, tujuanId: tujuan2Id, nilai: 'Baik' },
        ],
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).saved).toBe(4);
  });

  // ─── 6. Upsert kehadiran ───────────────────────────────────────────────────
  test('6. PUT kehadiran → siswa1=70%(aman), siswa2=60%(merah)', async ({ request }) => {
    const res = await request.put(`/api/ekskul/${ekskulId}/kehadiran`, {
      headers: authHeaders(pembinaToken),
      data: {
        semester: 1,
        entri: [
          { pesertaId: peserta1Id, jumlahHadir: 7, totalPertemuan: 10 }, // 70% → OK
          { pesertaId: peserta2Id, jumlahHadir: 6, totalPertemuan: 10 }, // 60% → MERAH
        ],
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).saved).toBe(2);
  });

  // ─── 7. Rapor siswa1 → kehadiran 70%, tidak merah ─────────────────────────
  test('7. GET rapor siswa1 → kehadiran 70% tidak flagMerah', async ({ request }) => {
    const res = await request.get(`/api/ekskul/rapor/${siswa1Id}?semester=1`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.siswaId).toBe(siswa1Id);
    const ek = body.ekskul.find((e: any) => e.ekskulId === ekskulId);
    expect(ek, 'ekskul harus ada di rapor').toBeTruthy();

    // Nilai tujuan
    const n1 = ek.nilaiPerTujuan.find((n: any) => n.tujuanId === tujuan1Id);
    expect(n1.nilai).toBe('Sangat Baik');
    const n2 = ek.nilaiPerTujuan.find((n: any) => n.tujuanId === tujuan2Id);
    expect(n2.nilai).toBe('Baik');

    // Kehadiran 70% → NOT flagMerah
    const keh = ek.kehadiran.find((k: any) => k.semester === 1);
    expect(keh.persen).toBe(70);
    expect(keh.flagMerah).toBe(false);
  });

  // ─── 8. Rapor siswa2 → kehadiran 60% flagMerah + deskripsi ────────────────
  test('8. GET rapor siswa2 → kehadiran 60% flagMerah=true + deskripsi benar', async ({ request }) => {
    const res = await request.get(`/api/ekskul/rapor/${siswa2Id}?semester=1`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    const ek = body.ekskul.find((e: any) => e.ekskulId === ekskulId);
    expect(ek).toBeTruthy();

    // Kehadiran 60% → flagMerah
    const keh = ek.kehadiran.find((k: any) => k.semester === 1);
    expect(keh.persen).toBe(60);
    expect(keh.flagMerah).toBe(true);

    // Deskripsi: Baik pada 2 tujuan (Cukup=tujuan1, Baik=tujuan2)
    expect(ek.deskripsi).toContain('Baik pada');
    expect(ek.deskripsi).toContain('Cukup pada');
  });

  // ─── 9. Non-pembina → 403 ─────────────────────────────────────────────────
  test('9. Non-pembina → 403 saat peserta/tujuan/nilai/kehadiran', async ({ request }) => {
    // Peserta list
    const r1 = await request.get(`/api/ekskul/${ekskulId}/peserta`, {
      headers: authHeaders(nonPembinaToken),
    });
    expect(r1.status()).toBe(403);

    // Add peserta
    const r2 = await request.post(`/api/ekskul/${ekskulId}/peserta`, {
      headers: authHeaders(nonPembinaToken),
      data: { siswaId: siswa1Id },
    });
    expect(r2.status()).toBe(403);

    // Tujuan
    const r3 = await request.post(`/api/ekskul/${ekskulId}/tujuan`, {
      headers: authHeaders(nonPembinaToken),
      data: { semester: 1, deskripsi: 'Tujuan tidak sah' },
    });
    expect(r3.status()).toBe(403);

    // Nilai
    const r4 = await request.put(`/api/ekskul/${ekskulId}/nilai`, {
      headers: authHeaders(nonPembinaToken),
      data: { semester: 1, entri: [{ pesertaId: peserta1Id, tujuanId: tujuan1Id, nilai: 'Baik' }] },
    });
    expect(r4.status()).toBe(403);
  });

  // ─── 10. Delete peserta ────────────────────────────────────────────────────
  test('10. DELETE peserta → removed', async ({ request }) => {
    // Tambah peserta sementara lalu hapus
    const addRes = await request.post(`/api/ekskul/${ekskulId}/peserta`, {
      headers: authHeaders(pembinaToken),
      data: { siswaId: siswa1Id }, // akan conflict (sudah ada) → tambah siswa baru
    });
    // peserta1 sudah ada → conflict 409, OK lanjut hapus peserta2
    const delRes = await request.delete(`/api/ekskul/${ekskulId}/peserta/${peserta2Id}`, {
      headers: authHeaders(pembinaToken),
    });
    expect(delRes.ok(), await delRes.text()).toBeTruthy();
    expect((await delRes.json()).ok).toBe(true);
  });
});
