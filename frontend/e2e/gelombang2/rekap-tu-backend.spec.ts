import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F4c Backend â€” Rekap TU Bulanan + RBAC kepsek konfirmasi
 *
 *  1. GET /api/tu/rekap-guru?bulan=YYYY-MM â†’ shape valid (total, dari, sampai, data)
 *  2. Rekap bulan: data[].pctHadir + hariWajib + HADIR/ALPHA ada
 *  3. Default bulan (tanpa param) â†’ tidak error, kembalikan data
 *  4. Format bulan invalid â†’ 400/500 (endpoint error gracefully)
 *  5. RBAC: guru tidak bisa akses /api/tu/rekap-guru â†’ 403
 *  6. RBAC: kepsek bisa akses /api/admin/dashboard â†’ 200 âœ…
 *  7. RBAC: kepsek bisa akses /api/admin/laporan/harian-guru â†’ 200 âœ…
 *  8. RBAC: kepsek bisa akses /api/admin/laporan/keterlaksanaan-kbm â†’ 200 âœ…
 *  9. RBAC: kepsek bisa akses /api/admin/laporan/siswa â†’ 200 âœ…
 * 10. Rekap bulan: dari = awal bulan, sampai = akhir bulan yang benar
 */

let adminToken: string;
let guruToken: string;
let kepsekToken: string;
let guruUserId: number;
let kepsekUserId: number;
let suffix: string;

test.describe('F4c Backend â€” Rekap TU Bulanan + RBAC kepsek', () => {
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

  // â”€â”€â”€ 1. Shape valid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('1. GET /api/tu/rekap-guru?bulan=2026-07 â†’ shape valid', async ({ request }) => {
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

  // â”€â”€â”€ 2. Data fields valid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ 3. Default bulan (tanpa param) â†’ OK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('3. Rekap tanpa bulan param â†’ default bulan ini, tidak error', async ({
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

  // â”€â”€â”€ 4. Format bulan invalid â†’ error (tidak crash server) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('4. Format bulan invalid â†’ error 400/500, tidak crash server', async ({
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

  // â”€â”€â”€ 5. RBAC: guru â†’ 403 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('5. RBAC: guru tidak bisa akses /api/tu/rekap-guru â†’ 403', async ({
    request,
  }) => {
    const res = await request.get('/api/tu/rekap-guru?bulan=2026-07', {
      headers: authHeaders(guruToken),
    });
    expect(res.status()).toBe(403);
  });

  // â”€â”€â”€ 6. RBAC kepsek: dashboard â†’ 200 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('6. RBAC: kepsek bisa akses /api/admin/dashboard â†’ 200', async ({
    request,
  }) => {
    const res = await request.get('/api/admin/dashboard', {
      headers: authHeaders(kepsekToken),
    });
    expect(res.ok(), `kepsek dashboard: ${await res.text()}`).toBeTruthy();
  });

  // â”€â”€â”€ 7. RBAC kepsek: laporan harian-guru â†’ 200 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('7. RBAC: kepsek bisa akses /api/admin/laporan/harian-guru â†’ 200', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/harian-guru?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(kepsekToken) },
    );
    expect(res.ok(), `kepsek harian-guru: ${await res.text()}`).toBeTruthy();
  });

  // â”€â”€â”€ 8. RBAC kepsek: keterlaksanaan-kbm â†’ 200 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('8. RBAC: kepsek bisa akses /api/admin/laporan/keterlaksanaan-kbm â†’ 200', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/keterlaksanaan-kbm?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(kepsekToken) },
    );
    expect(res.ok(), `kepsek keterlaksanaan: ${await res.text()}`).toBeTruthy();
  });

  // â”€â”€â”€ 9. RBAC kepsek: laporan siswa â†’ 200 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('9. RBAC: kepsek bisa akses /api/admin/laporan/siswa â†’ 200', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/admin/laporan/siswa?dari=2026-07-01&sampai=2026-07-18',
      { headers: authHeaders(kepsekToken) },
    );
    expect(res.ok(), `kepsek laporan siswa: ${await res.text()}`).toBeTruthy();
  });

  // â”€â”€â”€ 10. dari/sampai tepat awal/akhir bulan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('10. Rekap bulan: dari=awal bulan, sampai=akhir bulan yang benar', async ({
    request,
  }) => {
    // Februari 2026 (bukan tahun kabisat â†’ 28 hari)
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
