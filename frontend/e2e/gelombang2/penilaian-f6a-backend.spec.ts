import { test, expect } from '@playwright/test';
import { authHeaders } from '../helpers/api';

/**
 * F6a Backend â€” Penilaian Inti
 *
 *  1. GET paket guru â†’ paket muncul untuk guru yang ditugaskan
 *  2. GET paket â†’ kosong untuk guru yang belum ditugaskan
 *  3. TP CRUD: create, list, update, soft-delete
 *  4. Penilaian CRUD: Formatif + Sumatif (dengan tpIds)
 *  5. Input nilai: GET siswa list (null = belum diisi), PUT upsert
 *  6. Rekap nilai akhir: round(Î£(nilaiÃ—bobot)/Î£bobot) Sumatif only
 *  7. Formatif tidak masuk rekap nilai akhir
 *  8. Guru lain (bukan pemilik paket) â†’ 403
 *  9. Nilai 0â€“100 validasi (nilai 101 â†’ 400)
 * 10. Nilai akhir masih ada meski penilaian sumatif baru belum diisi
 */

let adminToken: string;
let guruToken: string;
let guru2Token: string;
let guruId: number;
let guru2Id: number;
let guruUserId: number;
let guru2UserId: number;
let mapelId: number;
let kelasId: number;
let tahunAjaranId: number;
let penugasanId: number;
let siswaIds: number[] = [];
let suffix: string;

test.describe('F6a Backend â€” Penilaian Inti', () => {
  test.beforeAll(async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' },
    });
    adminToken = (await login.json()).accessToken;
    suffix = Date.now().toString().slice(-6);

    // Ambil TA aktif
    const taRes = await request.get('/api/admin/tahun-ajaran', {
      headers: authHeaders(adminToken),
    });
    const taBody = await taRes.json();
    const taList = Array.isArray(taBody) ? taBody : (taBody.data ?? []);
    const taAktif = taList.find((t: any) => t.aktif);
    tahunAjaranId = taAktif?.id;

    if (!tahunAjaranId) {
      const newTa = await request.post('/api/admin/tahun-ajaran', {
        headers: authHeaders(adminToken),
        data: { nama: `F6a-TA-${suffix}`, tahun: 2026, semester: 1, aktif: true },
      });
      tahunAjaranId = (await newTa.json()).id;
    }

    // Buat mapel via kurikulum
    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers: authHeaders(adminToken),
      data: { nama: `F6a-Mapel-${suffix}`, kode: `F6${suffix}` },
    });
    expect(mapelRes.ok(), `mapel: ${await mapelRes.text()}`).toBeTruthy();
    mapelId = (await mapelRes.json()).id;

    // Buat kelas
    const kelasRes = await request.post('/api/admin/kelas', {
      headers: authHeaders(adminToken),
      data: { nama: `F6a-Kelas-${suffix}`, tingkat: 7, fase: 'D' },
    });
    expect(kelasRes.ok(), `kelas: ${await kelasRes.text()}`).toBeTruthy();
    kelasId = (await kelasRes.json()).id;

    // Buat 3 siswa
    for (let i = 0; i < 3; i++) {
      const r = await request.post('/api/admin/siswa', {
        headers: authHeaders(adminToken),
        data: {
          nama: `F6a Siswa ${i} ${suffix}`,
          nis: `F6A${i}${suffix}`,
          kelasId,
          jenisKelamin: 'L',
          tanggalLahir: '2012-01-01',
        },
      });
      expect(r.ok(), `siswa ${i}: ${await r.text()}`).toBeTruthy();
      siswaIds.push((await r.json()).id);
    }

    // Buat user + guru 1
    const u1 = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `F6a Guru1 ${suffix}`, email: `f6ag1${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    expect(u1.ok(), `user1: ${await u1.text()}`).toBeTruthy();
    guruUserId = (await u1.json()).id;

    const g1 = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: guruUserId, nip: `G1${suffix}`, nama: `F6a Guru1 ${suffix}`, jenisKelamin: 'L' },
    });
    expect(g1.ok(), `guru1: ${await g1.text()}`).toBeTruthy();
    guruId = (await g1.json()).id;

    // Buat user + guru 2
    const u2 = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `F6a Guru2 ${suffix}`, email: `f6ag2${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    guru2UserId = (await u2.json()).id;

    const g2 = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: guru2UserId, nip: `G2${suffix}`, nama: `F6a Guru2 ${suffix}`, jenisKelamin: 'P' },
    });
    guru2Id = (await g2.json()).id;

    // Login guru 1 & 2
    const l1 = await request.post('/api/auth/login', {
      data: { email: `f6ag1${suffix}@test.com`, password: 'pass1234' },
    });
    guruToken = (await l1.json()).accessToken;

    const l2 = await request.post('/api/auth/login', {
      data: { email: `f6ag2${suffix}@test.com`, password: 'pass1234' },
    });
    guru2Token = (await l2.json()).accessToken;

    // Buat penugasan untuk guru 1 via /api/kurikulum/penugasan
    const ptRes = await request.post('/api/kurikulum/penugasan', {
      headers: authHeaders(adminToken),
      data: { mapelId, kelasIds: [kelasId], guruId },
    });
    expect(ptRes.ok(), `penugasan: ${await ptRes.text()}`).toBeTruthy();
    const ptBody = await ptRes.json();
    // createPenugasan returns array of created records (one per kelasId)
    penugasanId = Array.isArray(ptBody) ? ptBody[0].id : ptBody.id;
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (penugasanId) await request.delete(`/api/kurikulum/penugasan/${penugasanId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    for (const id of siswaIds) await request.delete(`/api/admin/siswa/${id}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (kelasId) await request.delete(`/api/admin/kelas/${kelasId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (mapelId) await request.delete(`/api/kurikulum/mapel/${mapelId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guruId) await request.delete(`/api/admin/guru/${guruId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guru2Id) await request.delete(`/api/admin/guru/${guru2Id}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guruUserId) await request.delete(`/api/admin/users/${guruUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guru2UserId) await request.delete(`/api/admin/users/${guru2UserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
  });

  // â”€â”€â”€ 1. Daftar paket guru â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('1. GET paket guru â†’ paket muncul untuk guru yang ditugaskan', async ({ request }) => {
    const res = await request.get('/api/guru/penilaian', {
      headers: authHeaders(guruToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    const paket = body.data.find((p: any) => p.id === penugasanId);
    expect(paket, 'paket harus muncul untuk guru yang ditugaskan').toBeTruthy();
    expect(paket.mapelId).toBe(mapelId);
    expect(paket.kelasId).toBe(kelasId);
    expect(paket.jumlahSiswa).toBe(3);
  });

  // â”€â”€â”€ 2. Paket kosong untuk guru 2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('2. GET paket â†’ kosong untuk guru belum ditugaskan', async ({ request }) => {
    const res = await request.get('/api/guru/penilaian', {
      headers: authHeaders(guru2Token),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    // Paket guru 1 tidak muncul untuk guru 2
    const paket = body.data.find((p: any) => p.id === penugasanId);
    expect(paket).toBeFalsy();
  });

  let tpId: number;

  // â”€â”€â”€ 3. TP CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('3. TP CRUD: create, list, update, soft-delete', async ({ request }) => {
    const createRes = await request.post(`/api/guru/penilaian/${penugasanId}/tp`, {
      headers: authHeaders(guruToken),
      data: { deskripsi: 'Memahami konsep bilangan bulat', urutan: 1 },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const tp = await createRes.json();
    tpId = tp.id;
    expect(tp.mapelId).toBe(mapelId);
    expect(tp.deskripsi).toBe('Memahami konsep bilangan bulat');

    const listRes = await request.get(`/api/guru/penilaian/${penugasanId}/tp`, {
      headers: authHeaders(guruToken),
    });
    const listBody = await listRes.json();
    expect(listBody.data.some((t: any) => t.id === tpId)).toBeTruthy();

    const updateRes = await request.patch(`/api/guru/penilaian/${penugasanId}/tp/${tpId}`, {
      headers: authHeaders(guruToken),
      data: { deskripsi: 'Memahami konsep bilangan bulat dan cacah' },
    });
    expect(updateRes.ok(), await updateRes.text()).toBeTruthy();
    expect((await updateRes.json()).deskripsi).toContain('cacah');

    const delRes = await request.delete(`/api/guru/penilaian/${penugasanId}/tp/${tpId}`, {
      headers: authHeaders(guruToken),
    });
    expect(delRes.ok(), await delRes.text()).toBeTruthy();

    const listAfterRes = await request.get(`/api/guru/penilaian/${penugasanId}/tp`, {
      headers: authHeaders(guruToken),
    });
    const listAfterBody = await listAfterRes.json();
    expect(listAfterBody.data.some((t: any) => t.id === tpId)).toBeFalsy();
  });

  let penilaianFormatifId: number;
  let penilaianSumatif1Id: number;
  let penilaianSumatif2Id: number;

  // â”€â”€â”€ 4. Penilaian CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('4. Penilaian CRUD: Formatif dan Sumatif', async ({ request }) => {
    // Buat TP baru untuk dipakai di Sumatif TP
    const tpRes = await request.post(`/api/guru/penilaian/${penugasanId}/tp`, {
      headers: authHeaders(guruToken),
      data: { deskripsi: 'TP untuk penilaian F6a', urutan: 1 },
    });
    tpId = (await tpRes.json()).id;

    // Buat Formatif
    const fRes = await request.post(`/api/guru/penilaian/${penugasanId}/penilaian`, {
      headers: authHeaders(guruToken),
      data: { nama: 'Kuis 1', jenis: 'Formatif', bobot: 1, tanggal: '2026-07-10' },
    });
    expect(fRes.ok(), await fRes.text()).toBeTruthy();
    const f = await fRes.json();
    penilaianFormatifId = f.id;
    expect(f.jenis).toBe('Formatif');

    // Buat Sumatif-1 (bobot 2)
    const s1Res = await request.post(`/api/guru/penilaian/${penugasanId}/penilaian`, {
      headers: authHeaders(guruToken),
      data: { nama: 'UTS', jenis: 'Sumatif', subjenis: 'SUMATIF_TP', bobot: 2, tanggal: '2026-07-15', tpIds: [tpId] },
    });
    expect(s1Res.ok(), await s1Res.text()).toBeTruthy();
    penilaianSumatif1Id = (await s1Res.json()).id;

    // Buat Sumatif-2 (bobot 3)
    const s2Res = await request.post(`/api/guru/penilaian/${penugasanId}/penilaian`, {
      headers: authHeaders(guruToken),
      data: { nama: 'UAS', jenis: 'Sumatif', subjenis: 'SUMATIF_AKHIR_SEMESTER', bobot: 3, tanggal: '2026-07-20' },
    });
    expect(s2Res.ok(), await s2Res.text()).toBeTruthy();
    penilaianSumatif2Id = (await s2Res.json()).id;

    // List penilaian
    const listRes = await request.get(`/api/guru/penilaian/${penugasanId}/penilaian`, {
      headers: authHeaders(guruToken),
    });
    const listBody = await listRes.json();
    expect(listBody.data.length).toBeGreaterThanOrEqual(3);
  });

  // â”€â”€â”€ 5. Input nilai â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('5. GET daftar nilai siswa (null belum diisi) + PUT upsert nilai', async ({ request }) => {
    const getRes = await request.get(`/api/guru/penilaian/penilaian/${penilaianSumatif1Id}/nilai`, {
      headers: authHeaders(guruToken),
    });
    expect(getRes.ok(), await getRes.text()).toBeTruthy();
    const getBody = await getRes.json();
    expect(getBody.siswa.length).toBe(3);
    expect(getBody.siswa.every((s: any) => s.nilai === null)).toBeTruthy();

    const putRes = await request.put(`/api/guru/penilaian/penilaian/${penilaianSumatif1Id}/nilai`, {
      headers: authHeaders(guruToken),
      data: {
        entri: [
          { siswaId: siswaIds[0], nilai: 80, catatan: 'Baik' },
          { siswaId: siswaIds[1], nilai: 90 },
          { siswaId: siswaIds[2], nilai: 70 },
        ],
      },
    });
    expect(putRes.ok(), await putRes.text()).toBeTruthy();
    expect((await putRes.json()).saved).toBe(3);

    const getRes2 = await request.get(`/api/guru/penilaian/penilaian/${penilaianSumatif1Id}/nilai`, {
      headers: authHeaders(guruToken),
    });
    const s0 = (await getRes2.json()).siswa.find((s: any) => s.siswaId === siswaIds[0]);
    expect(s0.nilai).toBe(80);
    expect(s0.catatan).toBe('Baik');
  });

  // â”€â”€â”€ 6. Rekap nilai akhir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('6. Rekap nilai akhir: formula sumatif round(Î£(nilaiÃ—bobot)/Î£bobot)', async ({ request }) => {
    // Isi nilai Sumatif-2 (bobot 3)
    // Siswa[0]: sumatif1(bobot=2)=80, sumatif2(bobot=3)=60
    // Nilai akhir = round((80*2 + 60*3)/(2+3)) = round(340/5) = round(68) = 68
    await request.put(`/api/guru/penilaian/penilaian/${penilaianSumatif2Id}/nilai`, {
      headers: authHeaders(guruToken),
      data: {
        entri: [
          { siswaId: siswaIds[0], nilai: 60 },
          { siswaId: siswaIds[1], nilai: 80 },
          { siswaId: siswaIds[2], nilai: 75 },
        ],
      },
    });

    const res = await request.get(`/api/guru/penilaian/${penugasanId}/rekap`, {
      headers: authHeaders(guruToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();

    const s0 = body.data.find((d: any) => d.siswaId === siswaIds[0]);
    expect(s0.nilaiAkhir).toBe(68);

    // Siswa[1]: sumatif1=90(bobot2), sumatif2=80(bobot3)
    // = round((90*2 + 80*3)/(2+3)) = round((180+240)/5) = round(420/5) = round(84) = 84
    const s1 = body.data.find((d: any) => d.siswaId === siswaIds[1]);
    expect(s1.nilaiAkhir).toBe(84);
  });

  // â”€â”€â”€ 7. Formatif tidak masuk rekap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('7. Formatif tidak masuk rekap nilai akhir', async ({ request }) => {
    await request.put(`/api/guru/penilaian/penilaian/${penilaianFormatifId}/nilai`, {
      headers: authHeaders(guruToken),
      data: { entri: siswaIds.map((id) => ({ siswaId: id, nilai: 100 })) },
    });

    const res = await request.get(`/api/guru/penilaian/${penugasanId}/rekap`, {
      headers: authHeaders(guruToken),
    });
    const body = await res.json();
    const s0 = body.data.find((d: any) => d.siswaId === siswaIds[0]);
    // Rekap masih 68 (formatif tidak masuk)
    expect(s0.nilaiAkhir).toBe(68);
  });

  // â”€â”€â”€ 8. Guru lain â†’ 403 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('8. Guru lain bukan pemilik paket â†’ 403', async ({ request }) => {
    const res = await request.get(`/api/guru/penilaian/${penugasanId}/tp`, {
      headers: authHeaders(guru2Token),
    });
    expect(res.status()).toBe(403);
  });

  // â”€â”€â”€ 9. Nilai > 100 â†’ 400 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('9. Input nilai > 100 â†’ 400 BadRequest', async ({ request }) => {
    const res = await request.put(`/api/guru/penilaian/penilaian/${penilaianSumatif1Id}/nilai`, {
      headers: authHeaders(guruToken),
      data: { entri: [{ siswaId: siswaIds[0], nilai: 101 }] },
    });
    expect(res.status()).toBe(400);
  });

  // â”€â”€â”€ 10. Rekap valid meski sumatif baru belum semua diisi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('10. Rekap tetap valid meski ada sumatif baru belum diisi', async ({ request }) => {
    // Buat penilaian sumatif baru tanpa input nilai
    const newPRes = await request.post(`/api/guru/penilaian/${penugasanId}/penilaian`, {
      headers: authHeaders(guruToken),
      data: { nama: 'Sumatif Tambahan', jenis: 'Sumatif', subjenis: 'SUMATIF_AKHIR_TAHUN', bobot: 1, tanggal: '2026-07-25' },
    });
    expect(newPRes.ok(), await newPRes.text()).toBeTruthy();

    // Rekap harus ok (siswa yang ada nilainya di sumatif sebelumnya tetap punya nilai akhir)
    const res = await request.get(`/api/guru/penilaian/${penugasanId}/rekap`, {
      headers: authHeaders(guruToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    const s0 = body.data.find((d: any) => d.siswaId === siswaIds[0]);
    // Nilai akhir berubah: sumBobot = 2+3+1=6, sumNilaiBobot = 80*2+60*3+0=340 (sumatif baru belum diisi)
    // Karena sumatif baru belum ada nilai â†’ tidak masuk sumBobot â†’ sumBobot masih 5
    expect(s0.nilaiAkhir).not.toBeNull();
  });
});

