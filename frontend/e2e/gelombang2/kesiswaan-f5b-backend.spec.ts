import { test, expect } from '@playwright/test';
import { authHeaders } from '../helpers/api';

/**
 * F5b Backend — Tindak Lanjut + Reward + Laporan Demerit
 *
 *  1. Siswa dengan terpotong ≥200 → PERINGATAN_1 auto dibuat
 *  2. Auto-trigger idempoten (trigger lagi → tidak duplikasi)
 *  3. List tindak lanjut → ada PERINGATAN_1
 *  4. Selesai tindak lanjut → status SELESAI
 *  5. Tindak lanjut SELESAI tidak bisa diselesaikan lagi → 400
 *  6. Reward: siswa 0 pelanggaran → sangatBaik
 *  7. Reward: siswa terpotong 10 → baik
 *  8. Reward: siswa terpotong ≥100 → tidak di sangatBaik/baik
 *  9. Laporan demerit → agregat per siswa
 * 10. Laporan demerit filter kelasId → hanya siswa kelas itu
 */

let adminToken: string;
let kelasId: number;
let siswaIds: number[] = [];
let katalogR07Id: number;
let katalogBId: number;
let suffix: string;

test.describe('F5b Backend — Tindak Lanjut + Reward + Laporan Demerit', () => {
  test.beforeAll(async ({ request }) => {
    // Login admin
    const login = await request.post('/api/auth/login', {
      data: { email: 'admin@aamapp.sch.id', password: 'admin12345' },
    });
    adminToken = (await login.json()).accessToken;
    suffix = Date.now().toString();

    // Buat kelas
    const kelasRes = await request.post('/api/admin/kelas', {
      headers: authHeaders(adminToken),
      data: { nama: `F5b-Kelas-${suffix}`, tingkat: 8, fase: 'D' },
    });
    kelasId = (await kelasRes.json()).id;

    // Buat 3 siswa
    for (let i = 0; i < 3; i++) {
      const r = await request.post('/api/admin/siswa', {
        headers: authHeaders(adminToken),
        data: {
          nama: `F5b Siswa ${i} ${suffix}`,
          nis: `F5B${i}${suffix.slice(-5)}`,
          kelasId,
          jenisKelamin: 'L',
          tanggalLahir: '2011-01-01',
        },
      });
      siswaIds.push((await r.json()).id);
    }

    // Ambil katalog R (poin 10) dan B (poin 50)
    const katalogRes = await request.get('/api/kesiswaan/katalog?limit=50', {
      headers: authHeaders(adminToken),
    });
    const katalogData = (await katalogRes.json()).data;
    katalogR07Id = katalogData.find((k: any) => k.nomor === 7)?.id;
    katalogBId = katalogData.find((k: any) => k.kategori === 'B')?.id;
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    for (const id of siswaIds) {
      await request.delete(`/api/admin/siswa/${id}`, { headers: authHeaders(adminToken) }).catch(() => {});
    }
    if (kelasId) await request.delete(`/api/admin/kelas/${kelasId}`, { headers: authHeaders(adminToken) }).catch(() => {});
  });

  // Helper: catat N pelanggaran senilai poin tertentu untuk siswa
  async function catatPelanggaran(request: any, siswaId: number, katalogId: number, count: number, fromDate = '2026-07-01') {
    for (let i = 0; i < count; i++) {
      const date = `2026-07-${String(1 + i).padStart(2, '0')}`;
      await request.post('/api/kesiswaan/pelanggaran', {
        headers: authHeaders(adminToken),
        data: { siswaId, katalogId, tanggal: date },
      });
    }
  }

  // ─── 1. Auto-trigger PERINGATAN_1 ─────────────────────────────────────────
  test('1. Catat pelanggaran hingga terpotong ≥200 → PERINGATAN_1 auto muncul', async ({ request }) => {
    // Siswa 0: 20 pelanggaran R-07 (10 poin each = 200 total)
    await catatPelanggaran(request, siswaIds[0], katalogR07Id, 20);

    // Tunggu sebentar agar fire-and-forget selesai
    await new Promise(r => setTimeout(r, 800));

    // Cek tindak lanjut muncul
    const tlRes = await request.get(`/api/kesiswaan/tindak-lanjut?kelasId=${kelasId}`, {
      headers: authHeaders(adminToken),
    });
    expect(tlRes.ok(), await tlRes.text()).toBeTruthy();
    const tlBody = await tlRes.json();
    const p1 = tlBody.data.find((t: any) => t.siswaId === siswaIds[0] && t.tahap === 'PERINGATAN_1');
    expect(p1, 'PERINGATAN_1 harus ada').toBeTruthy();
    expect(p1.ambang).toBe(200);
    expect(p1.status).toBe('BARU');
  });

  // ─── 2. Idempoten ──────────────────────────────────────────────────────────
  test('2. Auto-trigger idempoten — trigger lagi tidak duplikasi', async ({ request }) => {
    // Tambah 1 pelanggaran lagi → trigger lagi
    await request.post('/api/kesiswaan/pelanggaran', {
      headers: authHeaders(adminToken),
      data: { siswaId: siswaIds[0], katalogId: katalogR07Id, tanggal: '2026-07-25' },
    });
    await new Promise(r => setTimeout(r, 500));

    const tlRes = await request.get(`/api/kesiswaan/tindak-lanjut?kelasId=${kelasId}`, {
      headers: authHeaders(adminToken),
    });
    const tlBody = await tlRes.json();
    const p1List = tlBody.data.filter((t: any) => t.siswaId === siswaIds[0] && t.tahap === 'PERINGATAN_1');
    // Harus tepat 1 (idempoten)
    expect(p1List.length).toBe(1);
  });

  // ─── 3. List tindak lanjut filter status BARU ─────────────────────────────
  test('3. List tindak lanjut?status=BARU → berisi PERINGATAN_1 siswa 0', async ({ request }) => {
    const res = await request.get('/api/kesiswaan/tindak-lanjut?status=BARU', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    const found = body.data.find((t: any) => t.siswaId === siswaIds[0] && t.tahap === 'PERINGATAN_1');
    expect(found).toBeTruthy();
  });

  // ─── 4. Selesai tindak lanjut ─────────────────────────────────────────────
  test('4. PATCH tindak-lanjut/:id/selesai → status SELESAI', async ({ request }) => {
    const tlRes = await request.get(`/api/kesiswaan/tindak-lanjut?kelasId=${kelasId}&status=BARU`, {
      headers: authHeaders(adminToken),
    });
    const p1 = (await tlRes.json()).data.find((t: any) => t.siswaId === siswaIds[0] && t.tahap === 'PERINGATAN_1');

    const res = await request.patch(`/api/kesiswaan/tindak-lanjut/${p1.id}/selesai`, {
      headers: authHeaders(adminToken),
      data: { catatanPelaksanaan: 'Sudah dipanggil wali dan orang tua' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('SELESAI');
    expect(body.catatanPelaksanaan).toBe('Sudah dipanggil wali dan orang tua');
  });

  // ─── 5. Selesai dua kali → 400 ────────────────────────────────────────────
  test('5. PATCH selesai dua kali → 400 BadRequest', async ({ request }) => {
    const tlRes = await request.get(`/api/kesiswaan/tindak-lanjut?kelasId=${kelasId}&status=SELESAI`, {
      headers: authHeaders(adminToken),
    });
    const p1 = (await tlRes.json()).data.find((t: any) => t.siswaId === siswaIds[0] && t.tahap === 'PERINGATAN_1');
    if (!p1) return; // jika tidak ada, lewati

    const res = await request.patch(`/api/kesiswaan/tindak-lanjut/${p1.id}/selesai`, {
      headers: authHeaders(adminToken),
      data: { catatanPelaksanaan: 'Coba lagi' },
    });
    expect(res.status()).toBe(400);
  });

  // ─── 6. Reward: siswa tanpa pelanggaran → sangatBaik ─────────────────────
  test('6. Reward: siswa baru tanpa pelanggaran → masuk sangatBaik (saldo 500)', async ({ request }) => {
    // Siswa 2 belum ada pelanggaran
    const res = await request.get('/api/kesiswaan/reward', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    // Siswa 2 harus masuk sangatBaik
    const inSangatBaik = body.sangatBaik.find((s: any) => s.siswaId === siswaIds[2]);
    expect(inSangatBaik, 'siswa tanpa pelanggaran harus sangatBaik').toBeTruthy();
    expect(inSangatBaik.saldo).toBe(500);
  });

  // ─── 7. Reward: siswa terpotong 10 → baik ────────────────────────────────
  test('7. Reward: siswa terpotong 10 (saldo 490) → masuk baik', async ({ request }) => {
    // Siswa 1: 1 pelanggaran R (10 poin) → saldo 490
    await request.post('/api/kesiswaan/pelanggaran', {
      headers: authHeaders(adminToken),
      data: { siswaId: siswaIds[1], katalogId: katalogR07Id, tanggal: '2026-07-01' },
    });
    await new Promise(r => setTimeout(r, 300));

    const res = await request.get('/api/kesiswaan/reward', {
      headers: authHeaders(adminToken),
    });
    const body = await res.json();
    const inBaik = body.baik.find((s: any) => s.siswaId === siswaIds[1]);
    expect(inBaik, 'siswa saldo 490 harus masuk baik').toBeTruthy();
    expect(inBaik.saldo).toBe(490);
  });

  // ─── 8. Reward: siswa terpotong ≥100 → tidak di baik/sangatBaik ──────────
  test('8. Reward: siswa terpotong ≥110 → tidak di sangatBaik, tidak di baik', async ({ request }) => {
    // Siswa 0 sudah terpotong 200+ → tidak di sangatBaik dan tidak di baik
    const res = await request.get('/api/kesiswaan/reward', {
      headers: authHeaders(adminToken),
    });
    const body = await res.json();
    const inSangatBaik = body.sangatBaik.find((s: any) => s.siswaId === siswaIds[0]);
    const inBaik = body.baik.find((s: any) => s.siswaId === siswaIds[0]);
    expect(inSangatBaik).toBeFalsy();
    expect(inBaik).toBeFalsy();
  });

  // ─── 9. Laporan demerit → agregat per siswa ───────────────────────────────
  test('9. GET laporan/demerit → hasil agregat per siswa anti-N+1', async ({ request }) => {
    const res = await request.get('/api/kesiswaan/laporan/demerit', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    // Siswa 0 harus di laporan dengan terpotong tertinggi
    const s0 = body.data.find((d: any) => d.siswaId === siswaIds[0]);
    expect(s0, 'siswa 0 harus ada di laporan').toBeTruthy();
    expect(s0.terpotong).toBeGreaterThanOrEqual(200);
    expect(typeof s0.perKategori.R).toBe('number');
    expect(s0.saldo).toBe(500 - s0.terpotong);
  });

  // ─── 10. Laporan demerit filter kelasId ───────────────────────────────────
  test('10. GET laporan/demerit?kelasId= → hanya siswa kelas itu', async ({ request }) => {
    const res = await request.get(`/api/kesiswaan/laporan/demerit?kelasId=${kelasId}`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    // Semua hasil harus kelasId yang benar
    for (const d of body.data) {
      expect(d.kelasId).toBe(kelasId);
    }
    // Harus ada setidaknya siswa kita yang punya pelanggaran
    expect(body.total).toBeGreaterThan(0);
  });
});

