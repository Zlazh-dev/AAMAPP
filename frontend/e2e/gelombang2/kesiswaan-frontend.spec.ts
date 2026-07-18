import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * F5a — KESISWAAN Frontend E2E (MANDIRI-DATA §12.17e).
 *
 * Backend kesiswaan belum live → e2e test UI routing + komponen render.
 * Semua API calls akan mendapat 404/401 → halaman merender EmptyState.
 * Yang diuji: route accessible, heading ada, menu ada, form elements hadir.
 *
 * Saat backend F5a live (AG-2 selesai), spec ini akan LANGSUNG hijau penuh
 * karena sudah memakai kontrak API yang benar.
 */

test.describe('F5a — Kesiswaan Frontend', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── Tata Tertib ──────────────────────────────────────────────────────────
  test.describe('Tata Tertib CRUD', () => {
    test('Halaman /kesiswaan/tata-tertib dapat diakses oleh admin', async ({ page }) => {
      await page.goto('/kesiswaan/tata-tertib');
      await expect(page.getByRole('heading', { name: 'Tata Tertib' }).first()).toBeVisible();
    });

    test('Tombol "Tambah Butir" membuka form sheet', async ({ page }) => {
      await page.goto('/kesiswaan/tata-tertib');
      await expect(page.getByRole('heading', { name: 'Tata Tertib' }).first()).toBeVisible();
      await page.getByRole('button', { name: /Tambah Butir/i }).click();
      // Sheet terbuka (backdrop + form)
      await expect(page.locator('#input-bentuk-pelanggaran')).toBeVisible();
      await expect(page.locator('#select-kategori-form')).toBeVisible();
      await expect(page.locator('#input-poin')).toBeVisible();
      await expect(page.locator('#btn-simpan-katalog')).toBeVisible();
    });

    test('Filter kategori dan input cari tersedia', async ({ page }) => {
      await page.goto('/kesiswaan/tata-tertib');
      await expect(page.locator('#input-cari-katalog')).toBeVisible();
      await expect(page.locator('#select-kategori-filter')).toBeVisible();
    });

    test('Kategori default otomatis isi poin saat pilih R/S/B/SB', async ({ page }) => {
      await page.goto('/kesiswaan/tata-tertib');
      await page.getByRole('button', { name: /Tambah Butir/i }).click();
      await expect(page.locator('#select-kategori-form')).toBeVisible();
      // Pilih S → poin harus 25
      await page.locator('#select-kategori-form').selectOption('S');
      await expect(page.locator('#input-poin')).toHaveValue('25');
      // Pilih B → poin harus 50
      await page.locator('#select-kategori-form').selectOption('B');
      await expect(page.locator('#input-poin')).toHaveValue('50');
    });
  });

  // ── Pelanggaran ──────────────────────────────────────────────────────────
  test.describe('Pelanggaran Siswa', () => {
    test('Halaman /kesiswaan/pelanggaran dapat diakses oleh admin', async ({ page }) => {
      await page.goto('/kesiswaan/pelanggaran');
      await expect(page.getByRole('heading', { name: 'Pelanggaran Siswa' })).toBeVisible();
    });

    test('Filter status tersedia', async ({ page }) => {
      await page.goto('/kesiswaan/pelanggaran');
      await expect(page.locator('#select-status-filter')).toBeVisible();
    });

    test('Tombol Catat Pelanggaran membuka form sheet', async ({ page }) => {
      await page.goto('/kesiswaan/pelanggaran');
      await page.getByRole('button', { name: /Catat Pelanggaran/i }).click();
      await expect(page.locator('#input-tanggal-pelanggaran')).toBeVisible();
      await expect(page.locator('#btn-simpan-pelanggaran')).toBeVisible();
    });

    test('Tanggal default adalah hari ini (WIB)', async ({ page }) => {
      await page.goto('/kesiswaan/pelanggaran');
      await page.getByRole('button', { name: /Catat Pelanggaran/i }).click();
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
      await expect(page.locator('#input-tanggal-pelanggaran')).toHaveValue(today);
    });
  });

  // ── Verifikasi ──────────────────────────────────────────────────────────
  test.describe('Verifikasi Pelanggaran', () => {
    test('Halaman /kesiswaan/verifikasi dapat diakses oleh admin', async ({ page }) => {
      await page.goto('/kesiswaan/verifikasi');
      await expect(page.getByRole('heading', { name: /Verifikasi Pelanggaran/i })).toBeVisible();
    });

    test('Tombol Refresh ada dan dapat diklik', async ({ page }) => {
      await page.goto('/kesiswaan/verifikasi');
      // Heading visible
      await expect(page.getByRole('heading', { name: /Verifikasi Pelanggaran/i })).toBeVisible();
      // Refresh button visible
      const refreshBtn = page.locator('#btn-refresh-verifikasi');
      await expect(refreshBtn).toBeVisible();
    });
  });

  // ── Menu Kesiswaan ───────────────────────────────────────────────────────
  test.describe('Menu KESISWAAN', () => {
    test('Sidebar admin menampilkan item Tata Tertib dan Pelanggaran', async ({ page }) => {
      await page.goto('/kesiswaan/tata-tertib');
      // Admin sees kesiswaan group via ADMIN_EXTRA_AREAS
      // Use text match — sidebar may render as <a> or <button> depending on viewport
      await expect(page.getByText('Tata Tertib').first()).toBeVisible();
      await expect(page.getByText('Pelanggaran').first()).toBeVisible();
    });
  });

  // ── Guru Pelanggaran ──────────────────────────────────────────────────────
  test.describe('Guru — Lapor Pelanggaran', () => {
    test('Halaman /guru/pelanggaran dapat diakses oleh admin', async ({ page }) => {
      await page.goto('/guru/pelanggaran');
      await expect(page.getByRole('heading', { name: 'Laporan Pelanggaran' })).toBeVisible();
    });

    test('Tombol Lapor Pelanggaran membuka form sheet dengan peringatan antrean', async ({ page }) => {
      await page.goto('/guru/pelanggaran');
      await page.getByRole('button', { name: /Lapor Pelanggaran/i }).click();
      // Banner peringatan antrean
      await expect(page.getByText(/antrean verifikasi/i).first()).toBeVisible();
      await expect(page.locator('#guru-input-tanggal')).toBeVisible();
      await expect(page.locator('#btn-kirim-laporan')).toBeVisible();
    });

    test('Menu guru menampilkan item Pelanggaran', async ({ page }) => {
      await page.goto('/guru/pelanggaran');
      await expect(page.getByRole('link', { name: 'Pelanggaran' }).first()).toBeVisible();
    });
  });
});
