import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * Paginasi sungguhan — bukti jaringan (Tahap 3).
 *
 * Mencegat request: pastikan permintaan benar-benar membawa limit=25
 * (bukan 1000) dan respons berisi <= 25 baris.
 * Pola sama dgn spec Tahap 2 (pelanggaran-detail) yg intercept jaringan.
 */

const ADMIN_EMAIL = 'e2e-admin@aamapp.sch.id';
const ADMIN_PASS = 'e2e-admin-pass';

test.describe('Paginasi PelanggaranPage — bukti jaringan', () => {
  test('permintaan membawa limit=25, bukan 1000', async ({ page }) => {
    let capturedUrl: string | null = null;
    let capturedLimit: string | null = null;

    await page.route('**/api/kesiswaan/pelanggaran**', async (route) => {
      const url = new URL(route.request().url());
      capturedUrl = url.toString();
      capturedLimit = url.searchParams.get('limit');
      await route.continue();
    });

    await loginAsAdmin(page);
    await page.goto('/kesiswaan/pelanggaran');
    await page.waitForLoadState('networkidle');

    // Permintaan ke daftar pelanggaran terjadi.
    expect(capturedUrl).not.toBeNull();
    // Limit = 25, BUKAN 1000 atau 200.
    expect(capturedLimit).toBe('25');
  });

  test('respons berisi <= 25 baris per halaman', async ({ page, request }) => {
    // Buat 30 pelanggaran uji supaya paginasi benar-benar aktif.
    const ctx = request;
    const adminLogin = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
    const adminToken = (await adminLogin.json()).accessToken;
    const headers = authHeaders(adminToken);
    const suffix = Date.now();

    // Buat siswa uji.
    const siswaRes = await ctx.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Pag ${suffix}`, nis: `PG${suffix}`.slice(0, 20), jenisKelamin: 'L', status: 'aktif' },
    });
    const siswaId = (await siswaRes.json()).id;

    // Ambil katalog pertama.
    const katalogRes = await ctx.get('/api/kesiswaan/katalog?limit=1', { headers });
    const katalogId = (await katalogRes.json()).data?.[0]?.id;

    // Catat 30 pelanggaran — tanggal berbeda supaya tak kena UNIQUE.
    const createdIds: number[] = [];
    const baseDate = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(baseDate.getTime() - i * 86400000);
      const tanggal = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const res = await ctx.post('/api/kesiswaan/pelanggaran', {
        headers,
        data: { siswaId, katalogId, tanggal, catatan: `Uji paginasi #${i}` },
      });
      if (res.ok()) createdIds.push((await res.json()).id);
    }

    // Intercept respons daftar (URL dgn query params, bukan /:id).
    let responseRows = 0;
    let listResponseTotal = 0;
    await page.route('**/api/kesiswaan/pelanggaran?**', async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      if (Array.isArray(body.data)) {
        responseRows = body.data.length;
        listResponseTotal = body.total ?? 0;
      }
      await route.fulfill({ status: res.status(), json: body });
    });

    await loginAsAdmin(page);
    await page.goto('/kesiswaan/pelanggaran');
    await page.waitForLoadState('networkidle');

    // Respons daftar berisi <= 25 baris (bukan 30).
    expect(responseRows).toBeLessThanOrEqual(25);
    expect(responseRows).toBe(25); // 30 data → halaman 1 = 25.
    // Total >= 30 (bisa ada data lain dari spec/test sebelumnya).
    expect(listResponseTotal).toBeGreaterThanOrEqual(30);

    // Cleanup.
    for (const id of createdIds) {
      await ctx.delete(`/api/kesiswaan/pelanggaran/${id}`, { headers }).catch(() => {});
    }
    await ctx.delete(`/api/admin/siswa/${siswaId}`, { headers }).catch(() => {});
  });

  test('tombol berikutnya memuat halaman 2 (offset benar)', async ({ page, request }) => {
    // Buat 30 pelanggaran (atau gunakan data yg sudah ada dari test sebelumnya).
    const ctx = request;
    const adminLogin = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
    const adminToken = (await adminLogin.json()).accessToken;
    const headers = authHeaders(adminToken);
    const suffix = Date.now() + 1;

    const siswaRes = await ctx.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Pag2 ${suffix}`, nis: `PG2${suffix}`.slice(0, 20), jenisKelamin: 'L', status: 'aktif' },
    });
    const siswaId = (await siswaRes.json()).id;

    const katalogRes = await ctx.get('/api/kesiswaan/katalog?limit=1', { headers });
    const katalogId = (await katalogRes.json()).data?.[0]?.id;

    const createdIds: number[] = [];
    const baseDate = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(baseDate.getTime() - i * 86400000);
      const tanggal = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const res = await ctx.post('/api/kesiswaan/pelanggaran', {
        headers,
        data: { siswaId, katalogId, tanggal, catatan: `Uji hal2 #${i}` },
      });
      if (res.ok()) createdIds.push((await res.json()).id);
    }

    let page2Url: string | null = null;
    await page.route('**/api/kesiswaan/pelanggaran?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('page') === '2') page2Url = url.toString();
      await route.continue();
    });

    await loginAsAdmin(page);
    await page.goto('/kesiswaan/pelanggaran');
    await page.waitForLoadState('networkidle');

    // Klik tombol berikutnya — desktop pakai aria-label "Halaman berikutnya".
    const nextBtn = page.getByRole('button', { name: /Halaman berikutnya|Berikutnya/ }).first();
    await expect(nextBtn).toBeVisible({ timeout: 10_000 });
    await nextBtn.click();
    await page.waitForLoadState('networkidle');

    // Permintaan halaman 2 terjadi (page=2, limit=25).
    expect(page2Url).not.toBeNull();

    // Cleanup.
    for (const id of createdIds) {
      await ctx.delete(`/api/kesiswaan/pelanggaran/${id}`, { headers }).catch(() => {});
    }
    await ctx.delete(`/api/admin/siswa/${siswaId}`, { headers }).catch(() => {});
  });
});