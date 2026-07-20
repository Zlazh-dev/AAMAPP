import { test, expect } from '@playwright/test';
import { authHeaders } from '../helpers/api';

/**
 * F6c Backend â€” Kokurikuler
 *
 *  1. POST kegiatan â†’ created
 *  2. GET kegiatan list â†’ muncul
 *  3. POST target dimensi (valid dari 8) â†’ created
 *  4. POST target dimensi tidak valid â†’ 400
 *  5. POST tim penilai (guru1 kelas) â†’ created
 *  6. GET asesmen guru tim â†’ siswa Ã— dimensi (nilai null awal)
 *  7. PUT asesmen guru1 â†’ tersimpan
 *  8. PUT asesmen guru2 â†’ tersimpan (multi-penilai)
 *  9. GET rapor siswa â†’ rata 2 penilai benar (SB=4, B=3 â†’ rata=3.5 â†’ >3.5 false â†’ Baik)
 * 10. Non-anggota tim â†’ 403 saat GET/PUT asesmen
 */

let adminToken: string;
let guru1Token: string;
let guru2Token: string;
let guru1UserId: number;
let guru2UserId: number;
let guru1Id: number;
let guru2Id: number;
let kelasId: number;
let siswaId: number;
let kegiatanId: number;
let target1Id: number;
let target2Id: number;
let suffix: string;

test.describe('F6c Backend â€” Kokurikuler', () => {
  test.beforeAll(async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' },
    });
    adminToken = (await login.json()).accessToken;
    suffix = Date.now().toString().slice(-6);

    // Buat guru1
    const u1 = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `F6c Guru1 ${suffix}`, email: `f6cg1${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    guru1UserId = (await u1.json()).id;
    const g1 = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: guru1UserId, nip: `F6C1${suffix}`, nama: `F6c Guru1 ${suffix}`, jenisKelamin: 'L' },
    });
    guru1Id = (await g1.json()).id;

    // Buat guru2
    const u2 = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `F6c Guru2 ${suffix}`, email: `f6cg2${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    guru2UserId = (await u2.json()).id;
    const g2 = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: guru2UserId, nip: `F6C2${suffix}`, nama: `F6c Guru2 ${suffix}`, jenisKelamin: 'P' },
    });
    guru2Id = (await g2.json()).id;

    // Login
    const l1 = await request.post('/api/auth/login', { data: { email: `f6cg1${suffix}@test.com`, password: 'pass1234' } });
    guru1Token = (await l1.json()).accessToken;
    const l2 = await request.post('/api/auth/login', { data: { email: `f6cg2${suffix}@test.com`, password: 'pass1234' } });
    guru2Token = (await l2.json()).accessToken;

    // Buat kelas
    const kelasRes = await request.post('/api/admin/kelas', {
      headers: authHeaders(adminToken),
      data: { nama: `F6c-Kelas-${suffix}`, tingkat: 8, fase: 'D' },
    });
    kelasId = (await kelasRes.json()).id;

    // Buat siswa
    const siswaRes = await request.post('/api/admin/siswa', {
      headers: authHeaders(adminToken),
      data: { nama: `F6c Siswa ${suffix}`, nis: `F6CS${suffix}`, kelasId, jenisKelamin: 'L', tanggalLahir: '2012-01-01' },
    });
    siswaId = (await siswaRes.json()).id;
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (kegiatanId) await request.delete(`/api/kokurikuler/kegiatan/${kegiatanId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (siswaId) await request.delete(`/api/admin/siswa/${siswaId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (kelasId) await request.delete(`/api/admin/kelas/${kelasId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guru1Id) await request.delete(`/api/admin/guru/${guru1Id}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guru2Id) await request.delete(`/api/admin/guru/${guru2Id}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guru1UserId) await request.delete(`/api/admin/users/${guru1UserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guru2UserId) await request.delete(`/api/admin/users/${guru2UserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
  });

  // â”€â”€â”€ 1. Create kegiatan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('1. POST kegiatan â†’ created dengan tema + semester', async ({ request }) => {
    const res = await request.post('/api/kokurikuler/kegiatan', {
      headers: authHeaders(adminToken),
      data: { semester: 1, tema: `Proyek Kewargaan ${suffix}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    kegiatanId = body.id;
    expect(body.tema).toContain('Proyek Kewargaan');
    expect(body.semester).toBe(1);
  });

  // â”€â”€â”€ 2. List kegiatan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('2. GET kegiatan list â†’ kegiatan muncul', async ({ request }) => {
    const res = await request.get('/api/kokurikuler/kegiatan', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.data.some((k: any) => k.id === kegiatanId)).toBeTruthy();
  });

  // â”€â”€â”€ 3. Add target dimensi valid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('3. POST target dimensi valid (Kreativitas) â†’ created', async ({ request }) => {
    const res = await request.post(`/api/kokurikuler/kegiatan/${kegiatanId}/target`, {
      headers: authHeaders(adminToken),
      data: { namaDimensi: 'Kreativitas' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    target1Id = body.id;
    expect(body.namaDimensi).toBe('Kreativitas');
    expect(body.kegiatanId).toBe(kegiatanId);

    // Target ke-2: Kolaborasi
    const res2 = await request.post(`/api/kokurikuler/kegiatan/${kegiatanId}/target`, {
      headers: authHeaders(adminToken),
      data: { namaDimensi: 'Kolaborasi' },
    });
    expect(res2.ok(), await res2.text()).toBeTruthy();
    target2Id = (await res2.json()).id;
  });

  // â”€â”€â”€ 4. Target dimensi invalid â†’ 400 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('4. POST target dimensi tidak valid â†’ 400', async ({ request }) => {
    const res = await request.post(`/api/kokurikuler/kegiatan/${kegiatanId}/target`, {
      headers: authHeaders(adminToken),
      data: { namaDimensi: 'Dimensi Palsu XYZ' },
    });
    expect(res.status()).toBe(400);
  });

  // â”€â”€â”€ 5. Add tim penilai â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('5. POST tim penilai guru1 + guru2 â†’ created', async ({ request }) => {
    const res1 = await request.post(`/api/kokurikuler/kegiatan/${kegiatanId}/tim`, {
      headers: authHeaders(adminToken),
      data: { kelasId, guruId: guru1Id },
    });
    expect(res1.ok(), `tim guru1: ${await res1.text()}`).toBeTruthy();

    const res2 = await request.post(`/api/kokurikuler/kegiatan/${kegiatanId}/tim`, {
      headers: authHeaders(adminToken),
      data: { kelasId, guruId: guru2Id },
    });
    expect(res2.ok(), `tim guru2: ${await res2.text()}`).toBeTruthy();
  });

  // â”€â”€â”€ 6. GET asesmen guru1 â†’ null semua â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('6. GET asesmen guru tim â†’ siswa Ã— dimensi (nilai null awal)', async ({ request }) => {
    const res = await request.get(`/api/kokurikuler/asesmen?kegiatanId=${kegiatanId}&kelasId=${kelasId}`, {
      headers: authHeaders(guru1Token),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.siswa)).toBeTruthy();
    const s = body.siswa.find((s: any) => s.siswaId === siswaId);
    expect(s, 'siswa harus ada').toBeTruthy();
    expect(s.dimensi.length).toBe(2);
    expect(s.dimensi.every((d: any) => d.nilai === null)).toBeTruthy();
  });

  // â”€â”€â”€ 7. PUT asesmen guru1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('7. PUT asesmen guru1: Kreativitas=Sangat Baik, Kolaborasi=Baik', async ({ request }) => {
    const res = await request.put(`/api/kokurikuler/asesmen?kegiatanId=${kegiatanId}&kelasId=${kelasId}`, {
      headers: authHeaders(guru1Token),
      data: {
        entri: [
          { siswaId, targetId: target1Id, nilai: 'Sangat Baik' },
          { siswaId, targetId: target2Id, nilai: 'Baik' },
        ],
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).saved).toBe(2);
  });

  // â”€â”€â”€ 8. PUT asesmen guru2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('8. PUT asesmen guru2: Kreativitas=Baik, Kolaborasi=Cukup', async ({ request }) => {
    const res = await request.put(`/api/kokurikuler/asesmen?kegiatanId=${kegiatanId}&kelasId=${kelasId}`, {
      headers: authHeaders(guru2Token),
      data: {
        entri: [
          { siswaId, targetId: target1Id, nilai: 'Baik' },
          { siswaId, targetId: target2Id, nilai: 'Cukup' },
        ],
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).saved).toBe(2);
  });

  // â”€â”€â”€ 9. Rapor: rata multi-penilai benar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('9. GET rapor siswa â†’ rata-rata 2 penilai benar', async ({ request }) => {
    const res = await request.get(`/api/kokurikuler/rapor/${siswaId}`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();

    expect(Array.isArray(body.kegiatan)).toBeTruthy();
    const kg = body.kegiatan.find((k: any) => k.kegiatanId === kegiatanId);
    expect(kg, 'kegiatan harus ada di rapor').toBeTruthy();

    // Kreativitas: guru1=SB(4), guru2=B(3) â†’ rata=3.5 â†’ TIDAK >3.5 â†’ Baik
    const kreativitas = kg.dimensi.find((d: any) => d.namaDimensi === 'Kreativitas');
    expect(kreativitas, 'dimensi Kreativitas harus ada').toBeTruthy();
    expect(kreativitas.rata).toBe(3.5);
    expect(kreativitas.nilaiAkhir).toBe('Baik'); // 3.5 NOT > 3.5 â†’ Baik per spec

    // Kolaborasi: guru1=B(3), guru2=C(2) â†’ rata=2.5 â†’ NOT >2.5 â†’ Cukup
    const kolaborasi = kg.dimensi.find((d: any) => d.namaDimensi === 'Kolaborasi');
    expect(kolaborasi.rata).toBe(2.5);
    expect(kolaborasi.nilaiAkhir).toBe('Cukup');

    // Deskripsi: Baik pada Kreativitas. Cukup pada Kolaborasi.
    expect(body.deskripsi).toContain('Baik pada Kreativitas');
    expect(body.deskripsi).toContain('Cukup pada Kolaborasi');
  });

  // â”€â”€â”€ 10. Non-tim â†’ 403 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('10. Guru bukan anggota tim â†’ 403 GET/PUT asesmen', async ({ request }) => {
    // Buat guru ketiga yang tidak ada di tim
    const u3 = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `F6c Guru3 ${suffix}`, email: `f6cg3${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    const guru3UserId = (await u3.json()).id;
    const g3 = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: guru3UserId, nip: `F6C3${suffix}`, nama: `F6c Guru3 ${suffix}`, jenisKelamin: 'L' },
    });

    const l3 = await request.post('/api/auth/login', { data: { email: `f6cg3${suffix}@test.com`, password: 'pass1234' } });
    const guru3Token = (await l3.json()).accessToken;

    // GET asesmen â†’ 403
    const getRes = await request.get(`/api/kokurikuler/asesmen?kegiatanId=${kegiatanId}&kelasId=${kelasId}`, {
      headers: authHeaders(guru3Token),
    });
    expect(getRes.status()).toBe(403);

    // PUT asesmen â†’ 403
    const putRes = await request.put(`/api/kokurikuler/asesmen?kegiatanId=${kegiatanId}&kelasId=${kelasId}`, {
      headers: authHeaders(guru3Token),
      data: { entri: [{ siswaId, targetId: target1Id, nilai: 'Baik' }] },
    });
    expect(putRes.status()).toBe(403);

    // Cleanup guru3
    const g3Id = (await g3.json()).id;
    await request.delete(`/api/admin/guru/${g3Id}`, { headers: authHeaders(adminToken) }).catch(() => {});
    await request.delete(`/api/admin/users/${guru3UserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
  });
});

