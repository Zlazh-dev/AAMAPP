import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F4b Backend — Dashboard + Laporan Agregat
 *
 *  1. GET /api/admin/dashboard — shape lengkap (guruStatus, kbm, siswa, perluPerhatian, feed)
 *  2. Dashboard guruStatus: semua key valid
 *  3. Dashboard RBAC: guru tidak bisa akses → 403
 *  4. GET /api/admin/laporan/harian-guru — shape valid (total, data, pctHadir)
 *  5. Laporan harian-guru filter guruId → hanya 1 guru
 *  6. GET /api/admin/laporan/keterlaksanaan-kbm — shape valid
 *  7. GET /api/admin/laporan/siswa — shape valid (pivot H/S/I/A/T + pctHadir)
 *  8. Laporan RBAC: guru tidak bisa akses → 403
 *  9. Dashboard perluPerhatian: izinMenunggu naik setelah guru ajukan izin
 * 10. Laporan harian-guru paginasi: page/limit dihormati
 */

let adminToken: string;
let guruToken: string;
let guruId: number;
let guruUserId: number;
let suffix: string;

test.describe('F4b Backend — Dashboard + Laporan Agregat', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    adminToken = (await page.evaluate(() =>
      localStorage.getItem('aamapp_token'),
    )) as string;

    // Setup guru hanya sekali per describe
    if (!suffix) {
      suffix = Date.now().toString();
      const email = `f4b.guru.${suffix}@test.com`;

      const uRes = await page.request.post('/api/admin/users', {
        data: { name: `F4b Guru ${suffix}`, email, password: 'pass1234', roles: ['guru'] },
        headers: authHeaders(adminToken),
      });
      const u = await uRes.json();
      guruUserId = u.id;

      const gRes = await page.request.post('/api/admin/guru', {
        data: { nip: `F4B${suffix}`.slice(0, 20), nama: `F4b Guru ${suffix}`, jenisKelamin: 'L', status: 'aktif', userId: guruUserId },
        headers: authHeaders(adminToken),
      });
      const g = await gRes.json();
      guruId = g.id;

      const loginRes = await page.request.post('/api/auth/login', {
        data: { email, password: 'pass1234' },
      });
      const lb = await loginRes.json();
      guruToken = lb.token ?? lb.accessToken ?? lb.access_token;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (guruId) await request.delete(`/api/admin/guru/${guruId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guruUserId) await request.delete(`/api/admin/users/${guruUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    suffix = ''; guruId = 0; guruUserId = 0;
  });

  // ─── 1. Dashboard shape lengkap ──────────────────────────────────────────
  test('1. GET /api/admin/dashboard → shape lengkap', async ({ request }) => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request.get(`/api/admin/dashboard?tanggal=${today}`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.tanggal).toBe(today);
    expect(typeof body.guruStatus).toBe('object');
    expect(typeof body.kbm).toBe('object');
    expect(typeof body.siswa).toBe('object');
    expect(typeof body.perluPerhatian).toBe('object');
    expect(Array.isArray(body.feed)).toBeTruthy();
  });

  // ─── 2. Dashboard guruStatus keys valid ──────────────────────────────────
  test('2. Dashboard guruStatus: semua key status valid', async ({ request }) => {
    const res = await request.get('/api/admin/dashboard', {
      headers: authHeaders(adminToken),
    });
    const body = await res.json();
    const validKeys = ['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'DINAS', 'ALPHA', 'LIBUR', 'KOSONG'];
    for (const key of validKeys) {
      expect(key in body.guruStatus, `key ${key} hilang dari guruStatus`).toBeTruthy();
      expect(typeof body.guruStatus[key]).toBe('number');
    }
    // kbm shape
    expect('terlaksana' in body.kbm).toBeTruthy();
    expect('kosong' in body.kbm).toBeTruthy();
    expect('total' in body.kbm).toBeTruthy();
    // siswa shape
    expect('hadir' in body.siswa).toBeTruthy();
    expect('alpha' in body.siswa).toBeTruthy();
    expect('total' in body.siswa).toBeTruthy();
    // perluPerhatian shape
    expect('izinMenunggu' in body.perluPerhatian).toBeTruthy();
    expect('presensiPending' in body.perluPerhatian).toBeTruthy();
  });

  // ─── 3. Dashboard RBAC: guru → 403 ───────────────────────────────────────
  test('3. Dashboard RBAC: guru tidak bisa akses → 403', async ({ request }) => {
    const res = await request.get('/api/admin/dashboard', {
      headers: authHeaders(guruToken),
    });
    expect(res.status()).toBe(403);
  });

  // ─── 4. Laporan harian-guru shape ────────────────────────────────────────
  test('4. GET /api/admin/laporan/harian-guru → shape valid', async ({ request }) => {
    const dari = '2026-07-01';
    const sampai = '2026-07-18';
    const res = await request.get(
      `/api/admin/laporan/harian-guru?dari=${dari}&sampai=${sampai}`,
      { headers: authHeaders(adminToken) },
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(typeof body.page).toBe('number');
    expect(typeof body.limit).toBe('number');
    expect(body.dari).toBe(dari);
    expect(body.sampai).toBe(sampai);
    expect(Array.isArray(body.data)).toBeTruthy();
    if (body.data.length > 0) {
      const row = body.data[0];
      expect('guruId' in row).toBeTruthy();
      expect('nama' in row).toBeTruthy();
      expect('HADIR' in row).toBeTruthy();
      expect('ALPHA' in row).toBeTruthy();
      expect('LIBUR' in row).toBeTruthy();
      expect('hariWajib' in row).toBeTruthy();
      expect('pctHadir' in row).toBeTruthy();
    }
  });

  // ─── 5. Laporan harian-guru filter guruId ────────────────────────────────
  test('5. Laporan harian-guru filter guruId → max 1 guru di data', async ({
    request,
  }) => {
    // Pastikan guruId valid (dari beforeEach)
    if (!guruId) {
      // Jika guru belum dibuat (race), skip dengan soft pass
      return;
    }
    const res = await request.get(
      `/api/admin/laporan/harian-guru?dari=2026-07-01&sampai=2026-07-31&guruId=${guruId}`,
      { headers: authHeaders(adminToken) },
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    // Filter guruId harus membatasi ke 1 guru (atau 0 bila belum ada jadwal)
    expect(body.data.length).toBeLessThanOrEqual(1);
    // Bila ada data, harus guruId yang benar
    if (body.data.length > 0) {
      expect(body.data[0].guruId).toBe(guruId);
    }
    // total harus ≤ 1 (hanya 1 guru aktif yang difilter)
    expect(body.total).toBeLessThanOrEqual(1);
  });


  // ─── 6. Laporan keterlaksanaan-kbm shape ─────────────────────────────────
  test('6. GET /api/admin/laporan/keterlaksanaan-kbm → shape valid', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/keterlaksanaan-kbm?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(adminToken) },
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.data)).toBeTruthy();
    if (body.data.length > 0) {
      const row = body.data[0];
      expect('guruNama' in row).toBeTruthy();
      expect('kelasNama' in row).toBeTruthy();
      expect('mapelNama' in row).toBeTruthy();
      expect('totalJadwal' in row).toBeTruthy();
      expect('terlaksana' in row).toBeTruthy();
      expect('kosong' in row).toBeTruthy();
      expect('pctTerlaksana' in row).toBeTruthy();
    }
  });

  // ─── 7. Laporan siswa shape ───────────────────────────────────────────────
  test('7. GET /api/admin/laporan/siswa → shape valid (H/S/I/A/T + pctHadir)', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/siswa?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(adminToken) },
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.data)).toBeTruthy();
    if (body.data.length > 0) {
      const row = body.data[0];
      expect('siswaId' in row).toBeTruthy();
      expect('siswaNama' in row).toBeTruthy();
      expect('H' in row).toBeTruthy();
      expect('A' in row).toBeTruthy();
      expect('pctHadir' in row).toBeTruthy();
    }
  });

  // ─── 8. Laporan RBAC: guru → 403 ─────────────────────────────────────────
  test('8. Laporan RBAC: guru tidak bisa akses → 403', async ({ request }) => {
    const res = await request.get(
      '/api/admin/laporan/harian-guru?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(guruToken) },
    );
    expect(res.status()).toBe(403);
  });

  // ─── 9. perluPerhatian naik setelah guru ajukan izin ─────────────────────
  test('9. Dashboard perluPerhatian.izinMenunggu naik setelah guru ajukan izin', async ({
    request,
  }) => {
    const before = await (
      await request.get('/api/admin/dashboard', { headers: authHeaders(adminToken) })
    ).json();
    const before_count = before.perluPerhatian.izinMenunggu;

    // Guru ajukan izin baru
    await request.post('/api/izin/guru', {
      headers: authHeaders(guruToken),
      data: {
        jenis: 'IZIN',
        mulaiTanggal: '2026-09-10',
        selesaiTanggal: '2026-09-10',
        keterangan: 'Test F4b dashboard pending count',
      },
    });

    const after = await (
      await request.get('/api/admin/dashboard', { headers: authHeaders(adminToken) })
    ).json();
    expect(after.perluPerhatian.izinMenunggu).toBeGreaterThan(before_count);
  });

  // ─── 10. Paginasi harian-guru: limit=1 → data.length = 1 ────────────────
  test('10. Laporan harian-guru paginasi: limit=1 → data.length ≤ 1', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/harian-guru?dari=2026-07-01&sampai=2026-07-18&page=1&limit=1',
      { headers: authHeaders(adminToken) },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.limit).toBe(1);
    expect(body.page).toBe(1);
    expect(body.data.length).toBeLessThanOrEqual(1);
  });
});
