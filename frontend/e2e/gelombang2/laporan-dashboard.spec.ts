import { test, expect } from '@playwright/test';

/**
 * E2E spec F4b â€” Dashboard + Laporan + Export lazy.
 *
 * Strategy:
 * 1. Dashboard accessible (mocked + fallback statis).
 * 2. Laporan HUB: 3 sub-link cards visible.
 * 3. Laporan harian guru: filter + tampilkan â†’ tabel muncul.
 * 4. Export buttons exist on laporan pages.
 * 5. exceljs dan pdfmake TIDAK ada di main chunk (bundle check).
 */

const BASE_URL = 'http://localhost';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'e2e-admin@aamapp.sch.id';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'e2e-admin-pass';

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

test.describe('F4b â€” Dashboard + Laporan + Export', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('Dashboard admin accessible â€” hanya aktivitas akun (IA-HIERARCHY-V2)', async ({ page }) => {
    await setToken(page, adminToken);

    // Mock aktivitas akun (satu-satunya yang ditampilkan di dashboard admin).
    await page.route('**/api/admin/activities**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          items: [{ id: 1, userId: 1, userName: 'Admin', action: 'LOGIN', entity: 'auth', entityId: null, entityLabel: null, summary: 'Login berhasil', ipAddress: '127.0.0.1', deviceSummary: null, createdAt: new Date().toISOString() }],
          total: 1, page: 1, limit: 15,
        }),
      });
    });
    await page.route('**/api/admin/users/pending/count**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
    });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
    // IA-HIERARCHY-V2: dashboard admin HANYA aktivitas akun.
    await expect(page.getByText('Aktivitas Akun Terbaru')).toBeVisible({ timeout: 5_000 });
    // Statistik kehadiran guru/siswa/KBM TIDAK boleh muncul lagi di admin.
    await expect(page.getByText('Status Guru Hari Ini')).toHaveCount(0);
    await expect(page.getByText('Kehadiran Siswa Hari Ini')).toHaveCount(0);
  });

  test('Dashboard TU menampilkan stats kehadiran guru (IA-HIERARCHY-V2)', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/dashboard**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          guruStatus: { HADIR: 5, TERLAMBAT: 1, IZIN: 0, SAKIT: 0, DINAS: 0, ALPHA: 1, LIBUR: 0 },
          kbm: { terlaksana: 8, kosong: 1 },
          siswa: { hadir: 120, alpha: 3, total: 123 },
          perluPerhatian: { izinMenunggu: 2, presensiPending: 0 },
        }),
      });
    });

    await page.goto('/tu');
    await expect(page.getByRole('heading', { name: 'Dashboard TU' })).toBeVisible({ timeout: 10_000 });
    // TU dashboard fokus pada kehadiran guru.
    await expect(page.getByText('Kehadiran Guru Hari Ini').or(page.getByText('Guru Hadir'))).toBeVisible({ timeout: 5_000 });
  });

  test('Laporan area berpisah â€” /tu/laporan/harian-guru accessible', async ({ page }) => {
    await setToken(page, adminToken);
    // /admin/laporan hub dibubarkan (IA migration). Test area baru saja.
    await page.goto('/tu/laporan/harian-guru');
    await expect(page.locator('h2, h1').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Sub-halaman laporan harian guru â€” filter + tabel', async ({ page }) => {
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

    await page.goto('/tu/laporan/harian-guru');
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

    await page.goto('/tu/laporan/harian-guru');
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

  test('Laporan keterlaksanaan KBM â€” accessible', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/laporan/keterlaksanaan-kbm**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/kurikulum/laporan/keterlaksanaan');
    await expect(page.getByRole('heading', { name: 'Laporan Keterlaksanaan KBM' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-tampilkan-kbm')).toBeVisible();
  });

  test('Laporan siswa â€” accessible', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/laporan/siswa**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/kesiswaan/laporan-kehadiran');
    await expect(page.locator('h2, h1').first()).toBeVisible({ timeout: 10_000 });
  });

  test('exceljs dan pdfmake TIDAK di main bundle', async ({ page }) => {
    await setToken(page, adminToken);

    const mainChunks: string[] = [];
    await page.route('**/*.js', async route => {
      const url = route.request().url();
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

    // Hub /admin/laporan bubar â€” pakai /admin (dashboard) untuk test lazy bundle
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    expect(mainChunks, `exceljs/pdfmake ditemukan di main chunk: ${mainChunks.join(', ')}`).toHaveLength(0);
  });
});

