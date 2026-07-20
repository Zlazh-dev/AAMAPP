import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * Tahap 2 — Halaman detail pelanggaran.
 * Baris tabel /kesiswaan/pelanggaran bisa diklik → /kesiswaan/pelanggaran/:id.
 * Endpoint detail per-id (bukan ambil seluruh daftar lalu saring).
 */

const ADMIN_EMAIL = 'e2e-admin@aamapp.sch.id';
const ADMIN_PASS = 'e2e-admin-pass';

test.describe('Detail Pelanggaran (Tahap 2)', () => {
  let adminToken: string;
  let testPelanggaranId: number;
  let testSiswaId: number;
  let testKatalogId: number;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    const adminLogin = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
    adminToken = (await adminLogin.json()).accessToken;
    const headers = authHeaders(adminToken);

    // Buat siswa uji.
    const suffix = Date.now();
    const siswaRes = await ctx.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Detail Pelanggaran ${suffix}`, nis: `SDP${suffix}`.slice(0, 20), jenisKelamin: 'L', status: 'aktif' },
    });
    testSiswaId = (await siswaRes.json()).id;

    // Buat katalog uji (atau ambil katalog pertama yg ada).
    const katalogRes = await ctx.get('/api/kesiswaan/katalog?limit=1', { headers });
    const katalogBody = await katalogRes.json();
    testKatalogId = katalogBody.data?.[0]?.id ?? katalogBody[0]?.id;

    // Catat pelanggaran uji.
    const pelanggaranRes = await ctx.post('/api/kesiswaan/pelanggaran', {
      headers,
      data: { siswaId: testSiswaId, katalogId: testKatalogId, tanggal: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }), catatan: 'Pelanggaran uji e2e detail' },
    });
    testPelanggaranId = (await pelanggaranRes.json()).id;
  });

  test.afterAll(async () => {
    const ctx = await pwRequest.newContext();
    const headers = authHeaders(adminToken);
    await ctx.delete(`/api/kesiswaan/pelanggaran/${testPelanggaranId}`, { headers }).catch(() => {});
    await ctx.delete(`/api/admin/siswa/${testSiswaId}`, { headers }).catch(() => {});
  });

  test('GET /api/kesiswaan/pelanggaran/:id mengembalikan detail lengkap', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get(`/api/kesiswaan/pelanggaran/${testPelanggaranId}`, {
      headers: authHeaders(adminToken),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(testPelanggaranId);
    expect(body.siswa).toBeDefined();
    expect(body.siswa.nama).toContain('Siswa Detail');
    expect(body.kategori).toBeDefined();
    expect(body.poin).toBeGreaterThan(0);
    expect(body.tanggal).toBeDefined();
    expect(body.status).toBe('DISETUJUI'); // admin catat langsung → DISETUJUI
    expect(body.pelapor).toBeDefined();
    expect(body.riwayat).toBeInstanceOf(Array);
    expect(body.riwayat.length).toBeGreaterThanOrEqual(1);
    expect(body.tindakLanjut).toBeInstanceOf(Array);
  });

  test('GET /api/kesiswaan/pelanggaran/:id — 404 bila tidak ada', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/kesiswaan/pelanggaran/9999999', {
      headers: authHeaders(adminToken),
    });
    expect(res.status()).toBe(404);
  });

  test('Baris tabel pelanggaran bisa diklik → halaman detail', async ({ page }) => {
    await loginAsAdmin(page);
    // Langsung navigasi ke detail (baris diklik → navigate).
    await page.goto(`/kesiswaan/pelanggaran/${testPelanggaranId}`);
    await expect(page.getByRole('heading', { name: /Detail Pelanggaran/ })).toBeVisible();
    await expect(page.getByText(/Siswa Detail Pelanggaran/).first()).toBeVisible();
    // BackLink ke daftar pelanggaran.
    const backLink = page.getByRole('link', { name: /Kembali/ });
    await expect(backLink).toBeVisible();
  });

  test('Endpoint detail TIDAK mengambil seluruh daftar', async ({ page, request }) => {
    // Intercept: pastikan endpoint yg dipanggil adalah /:id, BUKAN daftar.
    let calledDetail = false;
    let calledList = false;
    await page.route('**/api/kesiswaan/pelanggaran**', async (route) => {
      const url = route.request().url();
      if (/\/api\/kesiswaan\/pelanggaran\/\d+/.test(url)) {
        calledDetail = true;
      } else if (url.includes('/api/kesiswaan/pelanggaran?') || url.endsWith('/api/kesiswaan/pelanggaran')) {
        calledList = true;
      }
      await route.continue();
    });

    await loginAsAdmin(page);
    await page.goto(`/kesiswaan/pelanggaran/${testPelanggaranId}`);
    await expect(page.getByRole('heading', { name: /Detail Pelanggaran/ })).toBeVisible();

    // Detail endpoint dipanggil, daftar TIDAK dipanggil.
    expect(calledDetail).toBe(true);
    expect(calledList).toBe(false);
  });
});