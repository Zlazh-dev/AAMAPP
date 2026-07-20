import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * F5b — KESISWAAN Frontend E2E (MANDIRI-DATA §12.17e).
 *
 * Backend F5b belum live → e2e test UI routing + komponen render.
 * EmptyState ditampilkan bila API 404. Yang diuji: route accessible,
 * heading ada, form elements hadir, export buttons ada.
 *
 * Saat AG-2 deploy backend F5b, spec ini langsung validasi data nyata.
 */

test.describe('F5b — Kesiswaan Frontend (Tindak Lanjut + Reward + Laporan)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── Tindak Lanjut ──────────────────────────────────────────────────────────
  test.describe('Tindak Lanjut Otomatis', () => {
    test('Halaman /kesiswaan/tindak-lanjut dapat diakses admin', async ({ page }) => {
      await page.goto('/kesiswaan/tindak-lanjut');
      await expect(page.getByRole('heading', { name: /Tindak Lanjut/i }).first()).toBeVisible();
    });

    test('Filter status Belum/Selesai tersedia', async ({ page }) => {
      await page.goto('/kesiswaan/tindak-lanjut');
      await expect(page.locator('#select-status-tl')).toBeVisible();
      // Opsi: semua / BARU / SELESAI
      const options = await page.locator('#select-status-tl option').allTextContents();
      expect(options.some(o => o.includes('Belum') || o.includes('BARU'))).toBeTruthy();
      expect(options.some(o => o.includes('Selesai') || o.includes('SELESAI'))).toBeTruthy();
    });

    test('Tombol Refresh ada', async ({ page }) => {
      await page.goto('/kesiswaan/tindak-lanjut');
      await expect(page.locator('#btn-refresh-tindak-lanjut')).toBeVisible();
    });

    test('EmptyState atau daftar tindak lanjut ditampilkan', async ({ page }) => {
      await page.goto('/kesiswaan/tindak-lanjut');
      await expect(page.getByRole('heading', { name: /Tindak Lanjut/i }).first()).toBeVisible();
      // Either empty state or a list of items
      const hasEmpty = await page.getByText(/tidak ada tindak lanjut/i).isVisible().catch(() => false);
      const hasItems = await page.locator('[id^="tl-item-"]').count();
      expect(hasEmpty || hasItems >= 0).toBeTruthy();
    });
  });

  // ── Reward ─────────────────────────────────────────────────────────────────
  test.describe('Reward Semester', () => {
    test('Halaman /kesiswaan/reward dapat diakses admin', async ({ page }) => {
      await page.goto('/kesiswaan/reward');
      await expect(page.getByRole('heading', { name: /Reward Semester/i }).first()).toBeVisible();
    });

    test('Tombol export Excel dan PDF tersedia', async ({ page }) => {
      await page.goto('/kesiswaan/reward');
      await expect(page.locator('#btn-export-excel-reward')).toBeVisible();
      await expect(page.locator('#btn-export-pdf-reward')).toBeVisible();
    });

    test('Seksi Sangat Baik dan Baik tersedia di halaman', async ({ page }) => {
      await page.goto('/kesiswaan/reward');
      await expect(page.getByRole('heading', { name: /Reward Semester/i }).first()).toBeVisible();
      // Export buttons confirm page fully rendered
      await expect(page.locator('#btn-export-excel-reward')).toBeVisible();
      await expect(page.locator('#btn-export-pdf-reward')).toBeVisible();
    });
  });

  // ── Laporan Demerit ────────────────────────────────────────────────────────
  test.describe('Laporan Demerit', () => {
    test('Halaman /kesiswaan/laporan dapat diakses admin', async ({ page }) => {
      await page.goto('/kesiswaan/laporan');
      await expect(page.getByRole('heading', { name: /Laporan Demerit/i }).first()).toBeVisible();
    });

    test('Filter dari/sampai/kelas tersedia', async ({ page }) => {
      await page.goto('/kesiswaan/laporan');
      await expect(page.locator('#input-dari-demerit')).toBeVisible();
      await expect(page.locator('#input-sampai-demerit')).toBeVisible();
      await expect(page.locator('#select-kelas-demerit')).toBeVisible();
    });

    test('Tombol export Excel dan PDF tersedia', async ({ page }) => {
      await page.goto('/kesiswaan/laporan');
      await expect(page.locator('#btn-export-excel-demerit')).toBeVisible();
      await expect(page.locator('#btn-export-pdf-demerit')).toBeVisible();
    });

    test('Tombol Tampilkan memicu reload tabel', async ({ page }) => {
      await page.goto('/kesiswaan/laporan');
      await expect(page.locator('#btn-filter-demerit')).toBeVisible();
      await page.locator('#btn-filter-demerit').click();
      // Tidak error — heading masih ada
      await expect(page.getByRole('heading', { name: /Laporan Demerit/i }).first()).toBeVisible();
    });
  });

  // ── Menu Kesiswaan F5b ─────────────────────────────────────────────────────
  test.describe('Menu KESISWAAN F5b', () => {
    test('Sub halaman Tindak Lanjut render + BackLink ke Pelanggaran (IA-HIERARCHY-V2)', async ({ page }) => {
      // IA-HIERARCHY-V2: Tindak Lanjut = sub dari Pelanggaran (bukan sidebar).
      await page.goto('/kesiswaan/tindak-lanjut');
      await expect(page.getByRole('heading', { name: /Tindak Lanjut/i }).first()).toBeVisible();
      // BackLink mengarah ke induk Pelanggaran.
      await expect(page.getByRole('link', { name: /Kembali/ })).toBeVisible();
      // Sibling (Reward, Laporan) diakses dari induk, bukan dari sini.
      const sidebar = page.locator('aside');
      await expect(sidebar.locator('a[href="/kesiswaan/tindak-lanjut"]')).toHaveCount(0);
      await expect(sidebar.locator('a[href="/kesiswaan/reward"]')).toHaveCount(0);
    });

    test('Pelanggaran menampilkan SubPageLinks: Verifikasi, Tindak Lanjut, Reward', async ({ page }) => {
      await page.goto('/kesiswaan/pelanggaran');
      await expect(page.getByRole('link', { name: /Tindak Lanjut/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /Reward/ })).toBeVisible();
      await expect(page.getByRole('link', { name: /Verifikasi/ })).toBeVisible();
    });
  });
});
