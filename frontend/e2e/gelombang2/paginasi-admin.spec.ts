import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Paginasi admin (Kelompok 4) — bukti jaringan.
 *
 * AkunDaftar: limit=25 (bukan 200).
 * AkunSesi: limit=25 (bukan 200).
 * KelasList: limit=25 (bukan 200).
 * GuruList: limit=25 (bukan 200).
 * SiswaList: limit=25 (bukan 200), kelas filter limit=100 (bukan 1000).
 * KelasDetail: pemilih guru/kelas onSearch (bukan 1000); anggota kelas tetap 500 (wajar).
 */

test.describe('Paginasi admin — bukti jaringan', () => {
  test('AkunDaftarPage limit=25 (bukan 200)', async ({ page }) => {
    let captured: string | null = null;
    await page.route('**/api/admin/users?**', async (route) => {
      const url = new URL(route.request().url());
      captured = url.searchParams.get('limit');
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/admin/akun');
    await page.waitForLoadState('networkidle');
    expect(captured).toBe('25');
  });

  test('AkunSesiPage limit=25 (bukan 200)', async ({ page }) => {
    let captured: string | null = null;
    await page.route('**/api/admin/sessions?**', async (route) => {
      const url = new URL(route.request().url());
      captured = url.searchParams.get('limit');
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/admin/akun/sesi');
    await page.waitForLoadState('networkidle');
    expect(captured).toBe('25');
  });

  test('KelasListPage limit=25 (bukan 200)', async ({ page }) => {
    let captured: string | null = null;
    await page.route('**/api/admin/kelas?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '25' || url.searchParams.get('limit') === '200') {
        captured = url.searchParams.get('limit');
      }
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/kelas');
    await page.waitForLoadState('networkidle');
    expect(captured).toBe('25');
  });

  test('GuruListPage limit=25 (bukan 200)', async ({ page }) => {
    let captured: string | null = null;
    await page.route('**/api/admin/guru?**', async (route) => {
      const url = new URL(route.request().url());
      const limit = url.searchParams.get('limit');
      if (limit === '25' || limit === '200') captured = limit;
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/orang/guru');
    await page.waitForLoadState('networkidle');
    expect(captured).toBe('25');
  });

  test('SiswaListPage limit=25 (bukan 200), kelas filter TIDAK 1000', async ({ page }) => {
    let siswaLimit: string | null = null;
    let kelasBorongan = false;
    await page.route('**/api/admin/siswa?**', async (route) => {
      const url = new URL(route.request().url());
      const limit = url.searchParams.get('limit');
      if (limit === '25' || limit === '200') siswaLimit = limit;
      await route.continue();
    });
    await page.route('**/api/admin/kelas?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '1000') kelasBorongan = true;
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/orang/siswa');
    await page.waitForLoadState('networkidle');
    expect(siswaLimit).toBe('25');
    expect(kelasBorongan).toBe(false);
  });

  test('KelasDetailPage: guru & kelas TIDAK dimuat dgn limit=1000', async ({ page, request }) => {
    let guruBorongan = false;
    let kelasBorongan = false;
    await page.route('**/api/admin/guru?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '1000') guruBorongan = true;
      await route.continue();
    });
    await page.route('**/api/admin/kelas?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '1000') kelasBorongan = true;
      await route.continue();
    });

    // Buat kelas uji supaya ada halaman detail untuk dibuka.
    const ctx = request;
    const adminLogin = await ctx.post('/api/auth/login', { data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' } });
    const token = (await adminLogin.json()).accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    const kelasRes = await ctx.post('/api/admin/kelas', { headers, data: { tingkat: 9, nama: `PagAdmin-${Date.now()}` } });
    const kelas = await kelasRes.json();

    await loginAsAdmin(page);
    await page.goto(`/kurikulum/kelas/${kelas.id}`);
    await page.waitForLoadState('networkidle');

    expect(guruBorongan).toBe(false);
    expect(kelasBorongan).toBe(false);

    // Cleanup.
    await ctx.delete(`/api/admin/kelas/${kelas.id}`, { headers }).catch(() => {});
  });

  test('KelasDetailPage: daftar anggota kelas tetap dimuat penuh (limit=500, wajar)', async ({ page, request }) => {
    let siswaKelasLimit: string | null = null;
    await page.route('**/api/admin/siswa?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('kelasId')) {
        siswaKelasLimit = url.searchParams.get('limit');
      }
      await route.continue();
    });

    const ctx = request;
    const adminLogin = await ctx.post('/api/auth/login', { data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' } });
    const token = (await adminLogin.json()).accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    const kelasRes = await ctx.post('/api/admin/kelas', { headers, data: { tingkat: 9, nama: `PagAnggota-${Date.now()}` } });
    const kelas = await kelasRes.json();

    await loginAsAdmin(page);
    await page.goto(`/kurikulum/kelas/${kelas.id}`);
    await page.waitForLoadState('networkidle');

    // Daftar anggota kelas = ±30 siswa, wajar dimuat penuh (limit=500).
    expect(siswaKelasLimit).toBe('500');

    await ctx.delete(`/api/admin/kelas/${kelas.id}`, { headers }).catch(() => {});
  });
});