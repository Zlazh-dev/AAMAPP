import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F4c Backend — Rekap TU Bulanan + RBAC kepsek konfirmasi
 *
 *  1. GET /api/tu/rekap-guru?bulan=YYYY-MM → shape valid (total, dari, sampai, data)
 *  2. Rekap bulan: data[].pctHadir + hariWajib + HADIR/ALPHA ada
 *  3. Default bulan (tanpa param) → tidak error, kembalikan data
 *  4. Format bulan invalid → 400/500 (endpoint error gracefully)
 *  5. RBAC: guru tidak bisa akses /api/tu/rekap-guru → 403
 *  6. RBAC: kepsek bisa akses /api/admin/dashboard → 200 ✅
 *  7. RBAC: kepsek bisa akses /api/admin/laporan/harian-guru → 200 ✅
 *  8. RBAC: kepsek bisa akses /api/admin/laporan/keterlaksanaan-kbm → 200 ✅
 *  9. RBAC: kepsek bisa akses /api/admin/laporan/siswa → 200 ✅
 * 10. Rekap bulan: dari = awal bulan, sampai = akhir bulan yang benar
 */

let adminToken: string;
let guruToken: string;
let kepsekToken: string;
let guruUserId: number;
let kepsekUserId: number;
let suffix: string;

test.describe('F4c Backend — Rekap TU Bulanan + RBAC kepsek', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    adminToken = (await page.evaluate(() =>
      localStorage.getItem('aamapp_token'),
    )) as string;

    if (!suffix) {
      suffix = Date.now().toString();

      // Buat user guru
      const guruEmail = `f4c.guru.${suffix}@test.com`;
      const uRes = await page.request.post('/api/admin/users', {
        data: { name: `F4c Guru ${suffix}`, email: guruEmail, password: 'pass1234', roles: ['guru'] },
        headers: authHeaders(adminToken),
      });
      guruUserId = (await uRes.json()).id;

      // Buat user kepsek
      const kepsekEmail = `f4c.kepsek.${suffix}@test.com`;
      const kRes = await page.request.post('/api/admin/users', {
        data: { name: `F4c Kepsek ${suffix}`, email: kepsekEmail, password: 'pass1234', roles: ['kepsek'] },
        headers: authHeaders(adminToken),
      });
      kepsekUserId = (await kRes.json()).id;

      // Login guru
      const gLogin = await page.request.post('/api/auth/login', {
        data: { email: guruEmail, password: 'pass1234' },
      });
      const gBody = await gLogin.json();
      guruToken = gBody.token ?? gBody.accessToken ?? gBody.access_token;

      // Login kepsek
      const kLogin = await page.request.post('/api/auth/login', {
        data: { email: kepsekEmail, password: 'pass1234' },
      });
      const kBody = await kLogin.json();
      kepsekToken = kBody.token ?? kBody.accessToken ?? kBody.access_token;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (guruUserId) await request.delete(`/api/admin/users/${guruUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (kepsekUserId) await request.delete(`/api/admin/users/${kepsekUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    suffix = ''; guruUserId = 0; kepsekUserId = 0;
  });

  // ─── 1. Shape valid ────────────────────────────────────────────────────────
  test('1. GET /api/tu/rekap-guru?bulan=2026-07 → shape valid', async ({ request }) => {
    const res = await request.get('/api/tu/rekap-guru?bulan=2026-07', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(typeof body.page).toBe('number');
    expect(typeof body.limit).toBe('number');
    expect(body.dari).toBe('2026-07-01');
    expect(body.sampai).toBe('2026-07-31');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  // ─── 2. Data fields valid ─────────────────────────────────────────────────
  test('2. Rekap bulan: data baris punya HADIR, ALPHA, hariWajib, pctHadir', async ({
    request,
  }) => {
    const res = await request.get('/api/tu/rekap-guru?bulan=2026-07', {
      headers: authHeaders(adminToken),
    });
    const body = await res.json();
    if (body.data.length > 0) {
      const row = body.data[0];
      expect('guruId' in row).toBeTruthy();
      expect('nama' in row).toBeTruthy();
      expect('HADIR' in row).toBeTruthy();
      expect('TERLAMBAT' in row).toBeTruthy();
      expect('ALPHA' in row).toBeTruthy();
      expect('LIBUR' in row).toBeTruthy();
      expect('hariWajib' in row).toBeTruthy();
      expect('hariHadir' in row).toBeTruthy();
      expect('pctHadir' in row).toBeTruthy();
    }
  });

  // ─── 3. Default bulan (tanpa param) → OK ─────────────────────────────────
  test('3. Rekap tanpa bulan param → default bulan ini, tidak error', async ({
    request,
  }) => {
    const res = await request.get('/api/tu/rekap-guru', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.data)).toBeTruthy();
    // dari harus awal bulan ini
    const expectedDari = new Date().toISOString().slice(0, 7) + '-01';
    expect(body.dari).toBe(expectedDari);
  });

  // ─── 4. Format bulan invalid → error (tidak crash server) ─────────────────
  test('4. Format bulan invalid → error 400/500, tidak crash server', async ({
    request,
  }) => {
    const res = await request.get('/api/tu/rekap-guru?bulan=bukan-bulan', {
      headers: authHeaders(adminToken),
    });
    // Harus error (400 atau 500), bukan 200
    expect(res.status()).toBeGreaterThanOrEqual(400);
    // Server masih hidup setelah error
    const healthy = await request.get('/api/admin/dashboard', {
      headers: authHeaders(adminToken),
    });
    expect(healthy.ok()).toBeTruthy();
  });

  // ─── 5. RBAC: guru → 403 ──────────────────────────────────────────────────
  test('5. RBAC: guru tidak bisa akses /api/tu/rekap-guru → 403', async ({
    request,
  }) => {
    const res = await request.get('/api/tu/rekap-guru?bulan=2026-07', {
      headers: authHeaders(guruToken),
    });
    expect(res.status()).toBe(403);
  });

  // ─── 6. RBAC kepsek: dashboard → 200 ─────────────────────────────────────
  test('6. RBAC: kepsek bisa akses /api/admin/dashboard → 200', async ({
    request,
  }) => {
    const res = await request.get('/api/admin/dashboard', {
      headers: authHeaders(kepsekToken),
    });
    expect(res.ok(), `kepsek dashboard: ${await res.text()}`).toBeTruthy();
  });

  // ─── 7. RBAC kepsek: laporan harian-guru → 200 ───────────────────────────
  test('7. RBAC: kepsek bisa akses /api/admin/laporan/harian-guru → 200', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/harian-guru?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(kepsekToken) },
    );
    expect(res.ok(), `kepsek harian-guru: ${await res.text()}`).toBeTruthy();
  });

  // ─── 8. RBAC kepsek: keterlaksanaan-kbm → 200 ────────────────────────────
  test('8. RBAC: kepsek bisa akses /api/admin/laporan/keterlaksanaan-kbm → 200', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/keterlaksanaan-kbm?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(kepsekToken) },
    );
    expect(res.ok(), `kepsek keterlaksanaan: ${await res.text()}`).toBeTruthy();
  });

  // ─── 9. RBAC kepsek: laporan siswa → 200 ─────────────────────────────────
  test('9. RBAC: kepsek bisa akses /api/admin/laporan/siswa → 200', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/siswa?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(kepsekToken) },
    );
    expect(res.ok(), `kepsek laporan siswa: ${await res.text()}`).toBeTruthy();
  });

  // ─── 10. dari/sampai tepat awal/akhir bulan ───────────────────────────────
  test('10. Rekap bulan: dari=awal bulan, sampai=akhir bulan yang benar', async ({
    request,
  }) => {
    // Februari 2026 (bukan tahun kabisat → 28 hari)
    const res = await request.get('/api/tu/rekap-guru?bulan=2026-02', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.dari).toBe('2026-02-01');
    expect(body.sampai).toBe('2026-02-28');

    // Desember 2026 (31 hari)
    const res2 = await request.get('/api/tu/rekap-guru?bulan=2026-12', {
      headers: authHeaders(adminToken),
    });
    const body2 = await res2.json();
    expect(body2.dari).toBe('2026-12-01');
    expect(body2.sampai).toBe('2026-12-31');
  });
});
