import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Paginasi + SearchSelect kurikulum — bukti jaringan (Tahap 3, Kelompok 3).
 *
 * WaliKelas: kelas limit=25 (bukan 1000), guru onSearch.
 * Penugasan: daftar limit=25, guru onSearch.
 * PenugasanForm: guru & mapel onSearch (bukan 1000x3), kelas limit=100 (multi-checkbox).
 * JadwalKbm: kelas onSearch (bukan 1000), jadwal per-kelas (bukan paginasi baris).
 * Mapel: daftar limit=25 (bukan 200).
 */

test.describe('Paginasi + SearchSelect kurikulum — bukti jaringan', () => {
  test('WaliKelasPage: kelas limit=25 (bukan 1000)', async ({ page }) => {
    let capturedLimit: string | null = null;
    await page.route('**/api/admin/kelas?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '1000') capturedLimit = '1000';
      else capturedLimit = url.searchParams.get('limit');
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/wali-kelas');
    await page.waitForLoadState('networkidle');
    expect(capturedLimit).toBe('25');
  });

  test('PenugasanPage: daftar penugasan limit=25', async ({ page }) => {
    let capturedLimit: string | null = null;
    await page.route('**/api/kurikulum/penugasan?**', async (route) => {
      const url = new URL(route.request().url());
      capturedLimit = url.searchParams.get('limit');
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/penugasan');
    await page.waitForLoadState('networkidle');
    expect(capturedLimit).toBe('25');
  });

  test('PenugasanPage: guru TIDAK dimuat dgn limit=1000 (onSearch saja)', async ({ page }) => {
    let guruLoadedWithBorongan = false;
    await page.route('**/api/admin/guru?**', async (route) => {
      const url = new URL(route.request().url());
      const limit = url.searchParams.get('limit');
      if (limit === '1000') guruLoadedWithBorongan = true;
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/penugasan');
    await page.waitForLoadState('networkidle');
    expect(guruLoadedWithBorongan).toBe(false);
  });

  test('PenugasanFormPage: guru & mapel TIDAK dimuat dgn limit=1000', async ({ page }) => {
    let boronganGuru = false;
    let boronganMapel = false;
    await page.route('**/api/admin/guru?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '1000') boronganGuru = true;
      await route.continue();
    });
    await page.route('**/api/kurikulum/mapel?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '1000') boronganMapel = true;
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/penugasan/baru');
    await page.waitForLoadState('networkidle');
    expect(boronganGuru).toBe(false);
    expect(boronganMapel).toBe(false);
  });

  test('JadwalKbmPage: kelas TIDAK dimuat dgn limit=1000', async ({ page }) => {
    let boronganKelas = false;
    await page.route('**/api/admin/kelas?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('limit') === '1000') boronganKelas = true;
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/jadwal');
    await page.waitForLoadState('networkidle');
    expect(boronganKelas).toBe(false);
  });

  test('MapelListPage: daftar limit=25 (bukan 200)', async ({ page }) => {
    let capturedLimit: string | null = null;
    await page.route('**/api/kurikulum/mapel?**', async (route) => {
      const url = new URL(route.request().url());
      // Hanya tangkap permintaan daftar (bukan pencarian dropdown).
      const limit = url.searchParams.get('limit');
      if (limit === '25' || limit === '200') capturedLimit = limit;
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/mapel');
    await page.waitForLoadState('networkidle');
    expect(capturedLimit).toBe('25');
  });

  test('WaliKelasPage: SearchSelect guru mengirim q= ke server', async ({ page }) => {
    let guruQ: string | null = null;
    await page.route('**/api/admin/guru?**', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('q')) guruQ = url.searchParams.get('q');
      await route.continue();
    });
    await loginAsAdmin(page);
    await page.goto('/kurikulum/wali-kelas');
    await page.waitForLoadState('networkidle');

    // Klik trigger SearchSelect wali kelas (baris pertama).
    await page.getByText('-- pilih wali --').first().click().catch(async () => {
      // Bila baris sudah punya wali, cari "Guru" di dalam SearchSelect.
      await page.locator('button').filter({ hasText: /wali|guru/i }).first().click().catch(() => {});
    });

    const searchInput = page.getByPlaceholder(/Cari nama guru/i).first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('Admin');
    await page.waitForTimeout(500);
    expect(guruQ).toBe('Admin');
  });
});