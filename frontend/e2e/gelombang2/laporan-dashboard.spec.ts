import { test, expect } from '@playwright/test';

/**
 * E2E spec F4b — Dashboard + Laporan + Export lazy.
 *
 * Strategy:
 * 1. Dashboard accessible (mocked + fallback statis).
 * 2. Laporan HUB: 3 sub-link cards visible.
 * 3. Laporan harian guru: filter + tampilkan → tabel muncul.
 * 4. Export buttons exist on laporan pages.
 * 5. exceljs dan pdfmake TIDAK ada di main chunk (bundle check).
 */

const BASE_URL = 'http://localhost';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aamapp.sch.id';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';

async function loginViaApi(request: any, email: string, password: string): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email, password },
  });
  const body = await res.json();
  return body.accessToken as string;
}

async function setToken(page: any, token: string) {
  await page.goto('/login');
  await page.evaluate((t: string) => localStorage.setItem('aamapp_token', t), token);
}

test.describe('F4b — Dashboard + Laporan + Export', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('Dashboard admin accessible + kartu muncul', async ({ page }) => {
    await setToken(page, adminToken);

    // Mock F4b dashboard (backend mungkin belum live)
    await page.route('**/api/admin/dashboard**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          guruStatus: { HADIR: 5, TERLAMBAT: 1, IZIN: 0, SAKIT: 0, DINAS: 0, ALPHA: 1, LIBUR: 0 },
          kbm: { terlaksana: 8, kosong: 1 },
          siswa: { hadir: 120, alpha: 3, total: 123 },
          perluPerhatian: { izinMenunggu: 2, presensiPending: 0 },
          feed: [{ waktu: new Date().toISOString(), pesan: 'Budi Santoso check-in', tipe: 'HADIR' }],
        }),
      });
    });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
    // Status guru grid
    await expect(page.getByText('Status Guru Hari Ini')).toBeVisible({ timeout: 5_000 });
    // Perlu perhatian
    await expect(page.getByText('Izin Menunggu Persetujuan')).toBeVisible();
    // Feed
    await expect(page.getByText('Aktivitas Terbaru')).toBeVisible();
  });

  test('Laporan HUB /admin/laporan — 3 sub-link muncul', async ({ page }) => {
    await setToken(page, adminToken);

    await page.goto('/admin/laporan');
    await expect(page.getByRole('heading', { name: 'Laporan' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Laporan Harian Guru')).toBeVisible();
    await expect(page.getByText('Keterlaksanaan KBM')).toBeVisible();
    await expect(page.getByText('Kehadiran Siswa')).toBeVisible();
  });

  test('Sub-halaman laporan harian guru — filter + tabel', async ({ page }) => {
    await setToken(page, adminToken);

    // Mock laporan harian guru
    await page.route('**/api/admin/laporan/harian-guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { guruId: 1, guruNama: 'Budi Santoso', hadir: 18, terlambat: 2, izin: 0, sakit: 1, dinas: 0, alpha: 1, libur: 2, persen: 90 },
            { guruId: 2, guruNama: 'Siti Rahayu', hadir: 20, terlambat: 0, izin: 1, sakit: 0, dinas: 0, alpha: 0, libur: 3, persen: 95 },
          ],
        }),
      });
    });

    await page.goto('/admin/laporan/harian-guru');
    await expect(page.getByRole('heading', { name: 'Laporan Harian Guru' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-tampilkan-harian')).toBeVisible();

    // Klik tampilkan
    await page.locator('#btn-tampilkan-harian').click();

    // Tabel muncul dengan data
    await expect(page.getByText('Budi Santoso')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Siti Rahayu')).toBeVisible();
    // Baris TOTAL
    await expect(page.getByText('TOTAL')).toBeVisible();
  });

  test('Tombol export Excel dan PDF ada di laporan harian', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/laporan/harian-guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { guruId: 1, guruNama: 'Test Guru', hadir: 10, terlambat: 0, izin: 0, sakit: 0, dinas: 0, alpha: 0, libur: 0, persen: 100 },
          ],
        }),
      });
    });

    await page.goto('/admin/laporan/harian-guru');
    await page.locator('#btn-tampilkan-harian').click();
    await expect(page.getByText('Test Guru')).toBeVisible({ timeout: 8_000 });

    // Export buttons visible and enabled
    const btnExcel = page.locator('[id^="btn-export-excel"]').first();
    const btnPdf = page.locator('[id^="btn-export-pdf"]').first();
    await expect(btnExcel).toBeVisible();
    await expect(btnPdf).toBeVisible();
    await expect(btnExcel).not.toBeDisabled();
    await expect(btnPdf).not.toBeDisabled();
  });

  test('Laporan keterlaksanaan KBM — accessible', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/laporan/keterlaksanaan-kbm**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/admin/laporan/keterlaksanaan');
    await expect(page.getByRole('heading', { name: 'Laporan Keterlaksanaan KBM' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-tampilkan-kbm')).toBeVisible();
  });

  test('Laporan siswa — accessible', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/laporan/siswa**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/admin/laporan/siswa');
    await expect(page.getByRole('heading', { name: 'Laporan Kehadiran Siswa' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-tampilkan-siswa')).toBeVisible();
  });

  test('exceljs dan pdfmake TIDAK di main bundle', async ({ page }) => {
    await setToken(page, adminToken);

    // Intercept all JS files and record chunks
    const mainChunks: string[] = [];
    await page.route('**/*.js', async route => {
      const url = route.request().url();
      // Only check chunk files that look like the main entry
      if (url.includes('index') || url.includes('main') || url.includes('app')) {
        const res = await route.fetch();
        const body = await res.text();
        if (body.includes('exceljs') || body.includes('pdfmake')) {
          mainChunks.push(url);
        }
        await route.fulfill({ response: res });
      } else {
        await route.continue();
      }
    });

    await page.goto('/admin/laporan');
    await page.waitForLoadState('networkidle');

    // exceljs/pdfmake must NOT be in main bundle
    expect(mainChunks, `exceljs/pdfmake ditemukan di main chunk: ${mainChunks.join(', ')}`).toHaveLength(0);
  });
});
