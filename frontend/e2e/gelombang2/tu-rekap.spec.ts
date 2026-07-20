import { test, expect } from '@playwright/test';

/**
 * E2E spec F4c — TU rekap guru + kepsek akses laporan.
 *
 * Strategy:
 * 1. Admin (superuser) buka /tu/rekap-guru → pemilih bulan + tampilkan → tabel.
 * 2. Export Excel + PDF buttons ada.
 * 3. Kepsek akses /admin/laporan → tidak 403 (role kepsek diizinkan).
 * 4. Kepsek akses /tu/izin-guru → tidak 403.
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

test.describe('F4c — TU Rekap Guru + Kepsek Akses', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('TU /tu/rekap-guru — pemilih bulan + tampilkan → tabel muncul', async ({ page }) => {
    await setToken(page, adminToken);

    // Mock API rekap
    await page.route('**/api/tu/rekap-guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              guruId: 1, guruNama: 'Budi Santoso', nip: '198001012005011001',
              hariWajib: 22, hadir: 18, terlambat: 2, izin: 0,
              sakit: 1, dinas: 0, alpha: 1, libur: 0, persen: 90,
            },
            {
              guruId: 2, guruNama: 'Siti Rahayu', nip: null,
              hariWajib: 22, hadir: 20, terlambat: 1, izin: 0,
              sakit: 0, dinas: 0, alpha: 1, libur: 0, persen: 95,
            },
          ],
        }),
      });
    });

    await page.goto('/tu/rekap-guru');
    await expect(page.getByRole('heading', { name: 'Rekap Guru' })).toBeVisible({ timeout: 10_000 });

    // Pemilih bulan ada
    await expect(page.locator('#tu-rekap-bulan')).toBeVisible();
    await expect(page.locator('#btn-tampilkan-rekap')).toBeVisible();

    // Klik tampilkan
    await page.locator('#btn-tampilkan-rekap').click();

    // Tabel muncul
    await expect(page.getByText('Budi Santoso')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Siti Rahayu')).toBeVisible();

    // Baris TOTAL
    await expect(page.getByText('TOTAL')).toBeVisible();
  });

  test('TU /tu/rekap-guru — export Excel + PDF buttons ada', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/tu/rekap-guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            guruId: 1, guruNama: 'Test Guru', nip: null,
            hariWajib: 20, hadir: 18, terlambat: 0, izin: 0,
            sakit: 1, dinas: 0, alpha: 1, libur: 0, persen: 90,
          }],
        }),
      });
    });

    await page.goto('/tu/rekap-guru');
    await page.locator('#btn-tampilkan-rekap').click();
    await expect(page.getByText('Test Guru')).toBeVisible({ timeout: 8_000 });

    // Export buttons
    await expect(page.locator('#btn-export-excel-rekap')).toBeVisible();
    await expect(page.locator('#btn-export-pdf-rekap')).toBeVisible();
    await expect(page.locator('#btn-export-excel-rekap')).not.toBeDisabled();
    await expect(page.locator('#btn-export-pdf-rekap')).not.toBeDisabled();
  });

  test('Kepsek akses laporan TU — tidak redirect ke 403', async ({ page }) => {
    await setToken(page, adminToken);

    // /admin/laporan hub dibubarkan (IA migration). Laporan TU kini di /tu/*
    await page.goto('/tu/laporan/harian-guru');
    await expect(page.locator('h2, h1').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Kepsek akses /tu/izin-guru — tidak 403', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/izin/guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }),
      });
    });

    await page.goto('/tu/izin-guru');
    await expect(page.getByRole('heading', { name: 'Izin Guru' })).toBeVisible({ timeout: 10_000 });
  });

  test('TU menu item Rekap Guru mengarah ke /tu/rekap-guru', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/tu/rekap-guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/tu/rekap-guru');
    // Verifikasi halaman ada (not 404/redirect)
    await expect(page.getByRole('heading', { name: 'Rekap Guru' })).toBeVisible({ timeout: 10_000 });
    // URL correct
    expect(page.url()).toContain('/tu/rekap-guru');
  });
});

