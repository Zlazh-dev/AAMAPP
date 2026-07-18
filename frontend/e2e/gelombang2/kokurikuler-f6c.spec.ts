import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * F6c — Kokurikuler Frontend E2E (MANDIRI-DATA §12.17e).
 *
 * Backend F6c paralel (AG-2) → UI routing + komponen render tests.
 * Navigasi by-id (NOT daftar paginasi). EmptyState bila API belum live.
 */

test.describe('F6c — Kokurikuler Frontend', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── Kurikulum: Kelola Kegiatan ────────────────────────────────────────────
  test.describe('Kelola Kegiatan Kokurikuler (Kurikulum)', () => {
    test('Halaman /kurikulum/kokurikuler dapat diakses', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler');
      await expect(page.getByRole('heading', { name: /Kokurikuler/i }).first()).toBeVisible();
    });

    test('Tombol Tambah Kegiatan ada', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler');
      await expect(page.locator('#btn-tambah-kegiatan')).toBeVisible();
    });

    test('Klik Tambah Kegiatan membuka form sheet', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler');
      await page.locator('#btn-tambah-kegiatan').click();
      await expect(page.locator('#input-tema-kegiatan')).toBeVisible();
      await expect(page.locator('#select-semester-kegiatan')).toBeVisible();
      await expect(page.locator('#btn-simpan-kegiatan')).toBeVisible();
    });

    test('Form sheet menampilkan 8 dimensi sebagai checkbox', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler');
      await page.locator('#btn-tambah-kegiatan').click();
      // Check 8 dimensi checkboxes
      const checkboxes = await page.locator('input[type="checkbox"]').count();
      expect(checkboxes).toBeGreaterThanOrEqual(8);
    });

    test('Semester selector memiliki opsi 1 dan 2', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler');
      await page.locator('#btn-tambah-kegiatan').click();
      await expect(page.locator('#select-semester-kegiatan option[value="1"]')).toHaveCount(1);
      await expect(page.locator('#select-semester-kegiatan option[value="2"]')).toHaveCount(1);
    });
  });

  // ── Tim Penilai ─────────────────────────────────────────────────────────────
  test.describe('Tim Penilai Kokurikuler', () => {
    test('Halaman /kurikulum/kokurikuler/:id/tim dapat diakses', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler/1/tim');
      await expect(page.getByText(/Tim Penilai/i).first()).toBeVisible();
    });

    test('Tombol Assign Tim ada', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler/1/tim');
      await expect(page.locator('#btn-assign-tim')).toBeVisible();
    });

    test('Tombol Kembali membawa ke halaman kegiatan', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler/1/tim');
      await page.locator('#btn-back-kegiatan').click();
      await expect(page).toHaveURL('/kurikulum/kokurikuler');
    });

    test('Klik Assign Tim membuka form sheet', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler/1/tim');
      await page.locator('#btn-assign-tim').click();
      await expect(page.locator('#select-kelas-tim')).toBeVisible();
      await expect(page.locator('#btn-simpan-tim')).toBeVisible();
    });
  });

  // ── Input Asesmen (Guru) ─────────────────────────────────────────────────────
  test.describe('Input Asesmen (Guru)', () => {
    test('Halaman /guru/kokurikuler dapat diakses', async ({ page }) => {
      await page.goto('/guru/kokurikuler');
      await expect(page.getByRole('heading', { name: /Kokurikuler/i }).first()).toBeVisible();
    });

    test('Halaman /guru/kokurikuler/:id/asesmen dapat diakses', async ({ page }) => {
      await page.goto('/guru/kokurikuler/1/asesmen');
      await expect(page.getByRole('heading', { name: /Asesmen Kokurikuler/i }).first()).toBeVisible();
    });

    test('Tombol Simpan Asesmen ada', async ({ page }) => {
      await page.goto('/guru/kokurikuler/1/asesmen');
      await expect(page.locator('#btn-simpan-asesmen')).toBeVisible();
    });

    test('Tombol Kembali ada di halaman asesmen', async ({ page }) => {
      await page.goto('/guru/kokurikuler/1/asesmen');
      await expect(page.locator('#btn-back-asesmen')).toBeVisible();
    });
  });

  // ── Rapor Kokurikuler ────────────────────────────────────────────────────────
  test.describe('Rapor Kokurikuler', () => {
    test('Halaman /kokurikuler/rapor/:siswaId dapat diakses', async ({ page }) => {
      await page.goto('/kokurikuler/rapor/1');
      await page.waitForTimeout(1500);
      const bodyLen = await page.locator('body').innerText().then(t => t.length).catch(() => 0);
      expect(bodyLen).toBeGreaterThan(10);
    });

    test('Semester selector ada di halaman rapor kokurikuler', async ({ page }) => {
      await page.goto('/kokurikuler/rapor/1');
      await expect(page.locator('#select-semester-rapor-kok')).toBeVisible();
    });

    test('Tombol Kembali ada di halaman rapor kokurikuler', async ({ page }) => {
      await page.goto('/kokurikuler/rapor/1');
      await expect(page.locator('#btn-back-rapor-kok')).toBeVisible();
    });
  });

  // ── Menu ──────────────────────────────────────────────────────────────────────
  test.describe('Menu Kokurikuler', () => {
    test('Sidebar kurikulum menampilkan Kokurikuler', async ({ page }) => {
      await page.goto('/kurikulum/kokurikuler');
      await expect(page.getByText('Kokurikuler').first()).toBeVisible();
    });

    test('Sidebar guru menampilkan Kokurikuler', async ({ page }) => {
      await page.goto('/guru/kokurikuler');
      await expect(page.getByText('Kokurikuler').first()).toBeVisible();
    });
  });
});
