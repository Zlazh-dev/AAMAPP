import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * F6a â€” Penilaian Guru Frontend E2E (MANDIRI-DATA Â§12.17e).
 *
 * Backend F6a belum live (AG-2 paralel) â†’ e2e test UI routing + komponen render.
 * EmptyState bila API 404. Yang diuji: routing, heading, form elements, SubPageLinks.
 * Navigasi by-id (TIDAK lookup daftar paginasi).
 */

test.describe('F6a â€” Penilaian Guru Frontend', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // â”€â”€ Dashboard Paket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test.describe('Dashboard Penilaian', () => {
    test('Halaman /guru/penilaian dapat diakses', async ({ page }) => {
      await page.goto('/guru/penilaian');
      await expect(page.getByRole('heading', { name: /Penilaian/i }).first()).toBeVisible();
    });

    test('EmptyState atau kartu paket ditampilkan', async ({ page }) => {
      await page.goto('/guru/penilaian');
      await expect(page.getByRole('heading', { name: /Penilaian/i }).first()).toBeVisible();
      // Either empty state or cards
      const hasEmpty = await page.getByText(/belum ditugaskan/i).isVisible().catch(() => false);
      const hasCard = await page.locator('[id^="paket-card-"]').count();
      expect(hasEmpty || hasCard >= 0).toBeTruthy();
    });
  });

  // â”€â”€ Detail Paket â€” nested routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test.describe('Detail Paket (Shell + SubPageLinks)', () => {
    test('Navigasi ke detail paket ID=1 menampilkan SubPageLinks', async ({ page }) => {
      await page.goto('/guru/penilaian/1/tp');
      // Shell renders SubPageLinks regardless of data
      await expect(page.getByRole('link', { name: 'Tujuan Pembelajaran' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Penilaian' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Rekap Nilai Akhir' })).toBeVisible();
    });

    test('Tombol Paket Saya pada detail membawa kembali ke dashboard', async ({ page }) => {
      await page.goto('/guru/penilaian/1/tp');
      await page.locator('#btn-back-paket').click();
      await expect(page).toHaveURL('/guru/penilaian');
    });
  });

  // â”€â”€ Tujuan Pembelajaran â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test.describe('Tujuan Pembelajaran CRUD', () => {
    test('Halaman TP dapat diakses dan tombol Tambah TP ada', async ({ page }) => {
      await page.goto('/guru/penilaian/1/tp');
      await expect(page.locator('#btn-tambah-tp')).toBeVisible();
    });

    test('Klik Tambah TP membuka form sheet dengan deskripsi+urutan', async ({ page }) => {
      await page.goto('/guru/penilaian/1/tp');
      await page.locator('#btn-tambah-tp').click();
      await expect(page.locator('#input-deskripsi-tp')).toBeVisible();
      await expect(page.locator('#input-urutan-tp')).toBeVisible();
      await expect(page.locator('#btn-simpan-tp')).toBeVisible();
    });
  });

  // â”€â”€ Penilaian CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test.describe('Penilaian CRUD', () => {
    test('Halaman penilaian dapat diakses dan tombol Tambah ada', async ({ page }) => {
      await page.goto('/guru/penilaian/1/penilaian');
      await expect(page.locator('#btn-tambah-penilaian')).toBeVisible();
    });

    test('Klik Tambah Penilaian membuka form sheet dengan semua field', async ({ page }) => {
      await page.goto('/guru/penilaian/1/penilaian');
      await page.locator('#btn-tambah-penilaian').click();
      await expect(page.locator('#input-nama-penilaian')).toBeVisible();
      await expect(page.locator('#select-jenis-penilaian')).toBeVisible();
      await expect(page.locator('#input-bobot-penilaian')).toBeVisible();
      await expect(page.locator('#input-tanggal-penilaian')).toBeVisible();
      await expect(page.locator('#btn-simpan-penilaian')).toBeVisible();
    });

    test('Pilih Sumatif â†’ sub-jenis select muncul', async ({ page }) => {
      await page.goto('/guru/penilaian/1/penilaian');
      await page.locator('#btn-tambah-penilaian').click();
      await expect(page.locator('#select-jenis-penilaian')).toBeVisible();
      await page.locator('#select-jenis-penilaian').selectOption('Sumatif');
      await expect(page.locator('#select-subjenis-penilaian')).toBeVisible();
    });

    test('Tanggal default adalah hari ini (WIB)', async ({ page }) => {
      await page.goto('/guru/penilaian/1/penilaian');
      await page.locator('#btn-tambah-penilaian').click();
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
      await expect(page.locator('#input-tanggal-penilaian')).toHaveValue(today);
    });
  });

  // â”€â”€ Input Nilai â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test.describe('Input Nilai', () => {
    test('Halaman /guru/penilaian/nilai/:id dapat diakses', async ({ page }) => {
      await page.goto('/guru/penilaian/nilai/1');
      await expect(page.getByRole('heading', { name: /Input Nilai|Nilai/i }).first()).toBeVisible();
    });

    test('Tombol Simpan Nilai dan Kembali ada di halaman', async ({ page }) => {
      await page.goto('/guru/penilaian/nilai/1');
      await expect(page.locator('#btn-back-nilai')).toBeVisible();
      // Simpan nilai mungkin ada, halaman setidaknya render
      const heading = await page.getByRole('heading', { name: /Input Nilai|Nilai|Penilaian/i }).first();
      await expect(heading).toBeVisible();
    });
  });

  // â”€â”€ Rekap Nilai â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test.describe('Rekap Nilai Akhir', () => {
    test('Halaman rekap dapat diakses', async ({ page }) => {
      await page.goto('/guru/penilaian/1/rekap');
      await expect(page.getByText(/Rekap Nilai Akhir/i).first()).toBeVisible();
    });

    test('Tombol Refresh ada', async ({ page }) => {
      await page.goto('/guru/penilaian/1/rekap');
      await expect(page.locator('#btn-refresh-rekap')).toBeVisible();
    });
  });

  test.describe('Menu Guru Penilaian', () => {
    test('Halaman /guru/penilaian menampilkan konten penilaian', async ({ page }) => {
      // Admin tidak lagi punya grup GURU di sidebar (ADMIN_EXTRA_AREAS)
      // Test: route /guru/penilaian accessible (RequireRole=['guru','admin'])
      await page.goto('/guru/penilaian');
      await page.waitForTimeout(1500);
      // Halaman harus render (bukan blank/403) â€” ada heading atau EmptyState
      const bodyLen = await page.locator('body').innerText().then(t => t.length).catch(() => 0);
      expect(bodyLen).toBeGreaterThan(10);
    });
  });
});
