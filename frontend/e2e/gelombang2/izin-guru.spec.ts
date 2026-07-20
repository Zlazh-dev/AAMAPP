import { test, expect } from '@playwright/test';

/**
 * E2E spec F4a â€” Izin Guru frontend.
 *
 * Strategy:
 * 1. Login guru â†’ /izin/guru â†’ form ajukan izin â†’ submit â†’ muncul di daftar.
 * 2. Login admin â†’ /tu/izin-guru â†’ filter â†’ baris item â†’ sheet â†’ setujui.
 * 3. Tolak tanpa alasan â†’ validasi error.
 * 4. Backend F4a mungkin belum live saat suite dijalankan â†’ pakai route mock
 *    untuk endpoints izin agar test tidak bergantung pada timing backend AG-2.
 */

const BASE_URL = 'http://localhost';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'e2e-admin@aamapp.sch.id';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'e2e-admin-pass';

// Contoh seed guru (dari backend seed default)
const GURU_EMAIL = process.env.GURU_EMAIL || 'guru@aamapp.sch.id';
const GURU_PASSWORD = process.env.GURU_PASSWORD || 'guru12345';

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

test.describe('F4a â€” Izin Guru (guru: form + daftar)', () => {
  test('Halaman /izin/guru accessible oleh guru', async ({ page, request }) => {
    const token = await loginViaApi(request, GURU_EMAIL, GURU_PASSWORD).catch(() => null);
    if (!token) { test.skip(); return; }
    await setToken(page, token);

    // Mock GET /api/izin/guru â†’ empty list
    await page.route('/api/izin/guru', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/izin/guru');
    await expect(page.getByRole('heading', { name: /Izin Saya/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-ajukan-izin')).toBeVisible();
  });

  test('Form ajukan izin â€” validasi keterangan kosong', async ({ page, request }) => {
    const token = await loginViaApi(request, GURU_EMAIL, GURU_PASSWORD).catch(() => null);
    if (!token) { test.skip(); return; }
    await setToken(page, token);

    await page.route('/api/izin/guru', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.goto('/izin/guru');
    await expect(page.locator('#btn-ajukan-izin')).toBeVisible({ timeout: 8_000 });
    await page.locator('#btn-ajukan-izin').click();

    // Form tampil
    await expect(page.locator('#btn-submit-izin')).toBeVisible({ timeout: 5_000 });

    // Submit tanpa keterangan â†’ error
    await page.locator('#btn-submit-izin').click();
    await expect(page.getByText('Keterangan wajib diisi')).toBeVisible();
  });

  test('Form ajukan izin â†’ submit sukses â†’ muncul di daftar', async ({ page, request }) => {
    const token = await loginViaApi(request, GURU_EMAIL, GURU_PASSWORD).catch(() => null);
    if (!token) { test.skip(); return; }
    await setToken(page, token);

    let callCount = 0;
    await page.route('/api/izin/guru', async route => {
      if (route.request().method() === 'POST') {
        // Simulate successful submit
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 999, status: 'MENUNGGU' }),
        });
      } else {
        // GET: return list (empty first, then with item after submit)
        callCount++;
        const data = callCount > 1
          ? [{
              id: 999, jenis: 'SAKIT', mulaiTanggal: '2026-07-20', selesaiTanggal: '2026-07-20',
              keterangan: 'Demam', lampiranUrl: null, status: 'MENUNGGU',
              alasanKeputusan: null, disetujuiPada: null, createdAt: new Date().toISOString(),
            }]
          : [];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
      }
    });

    await page.goto('/izin/guru');
    await expect(page.locator('#btn-ajukan-izin')).toBeVisible({ timeout: 8_000 });
    await page.locator('#btn-ajukan-izin').click();

    // Pilih jenis Sakit
    await expect(page.locator('#btn-submit-izin')).toBeVisible();
    await page.locator('#izin-keterangan').fill('Demam tinggi tidak bisa masuk.');
    await page.locator('#btn-submit-izin').click();

    // Setelah submit, toast sukses muncul + form tutup
    await expect(page.getByText(/berhasil diajukan/i)).toBeVisible({ timeout: 8_000 });

    // Daftar reload â†’ item muncul
    await expect(page.getByText('Sakit')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Menunggu')).toBeVisible();
  });
});

test.describe('F4a â€” Admin izin guru (list + setujui/tolak)', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('Halaman /tu/izin-guru accessible oleh admin', async ({ page }) => {
    await setToken(page, adminToken);

    // Mock GET /api/admin/izin/guru
    await page.route('**/api/admin/izin/guru**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1, guruId: 2, guruNama: 'Budi Santoso',
              jenis: 'IZIN', mulaiTanggal: '2026-07-20', selesaiTanggal: '2026-07-21',
              keterangan: 'Keperluan keluarga', lampiranUrl: null,
              status: 'MENUNGGU', alasanKeputusan: null, disetujuiPada: null,
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1, page: 1, limit: 20,
        }),
      });
    });

    await page.goto('/tu/izin-guru');
    await expect(page.getByRole('heading', { name: /Izin Guru/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Budi Santoso')).toBeVisible();
    await expect(page.getByText('Menunggu')).toBeVisible();
  });

  test('Admin: klik baris â†’ sheet muncul', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/izin/guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 2, guruId: 3, guruNama: 'Siti Rahayu',
            jenis: 'SAKIT', mulaiTanggal: '2026-07-18', selesaiTanggal: '2026-07-19',
            keterangan: 'Sakit flu', lampiranUrl: null,
            status: 'MENUNGGU', alasanKeputusan: null, disetujuiPada: null,
            createdAt: new Date().toISOString(),
          }],
          total: 1, page: 1, limit: 20,
        }),
      });
    });

    await page.goto('/tu/izin-guru');
    await expect(page.getByText('Siti Rahayu')).toBeVisible({ timeout: 8_000 });

    // Klik baris â†’ sheet tampil
    await page.getByText('Siti Rahayu').click();
    await expect(page.locator('#btn-setujui-izin')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#btn-tolak-izin')).toBeVisible();
  });

  test('Admin: tolak tanpa alasan â†’ validasi error', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/izin/guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 3, guruId: 4, guruNama: 'Andi Wijaya',
            jenis: 'DINAS', mulaiTanggal: '2026-07-25', selesaiTanggal: '2026-07-27',
            keterangan: 'Dinas luar kota', lampiranUrl: null,
            status: 'MENUNGGU', alasanKeputusan: null, disetujuiPada: null,
            createdAt: new Date().toISOString(),
          }],
          total: 1, page: 1, limit: 20,
        }),
      });
    });

    await page.goto('/tu/izin-guru');
    await expect(page.getByText('Andi Wijaya')).toBeVisible({ timeout: 8_000 });
    await page.getByText('Andi Wijaya').click();

    await expect(page.locator('#btn-tolak-izin')).toBeVisible({ timeout: 5_000 });

    // Klik tolak tanpa isi alasan â†’ validasi muncul
    await page.locator('#btn-tolak-izin').click();
    await expect(page.getByText(/Alasan wajib diisi/i)).toBeVisible();
  });

  test('Admin: setujui izin â†’ sukses', async ({ page }) => {
    await setToken(page, adminToken);

    await page.route('**/api/admin/izin/guru**', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 4, guruId: 5, guruNama: 'Dewi Kusuma',
            jenis: 'IZIN', mulaiTanggal: '2026-07-22', selesaiTanggal: '2026-07-22',
            keterangan: 'Acara keluarga', lampiranUrl: null,
            status: 'MENUNGGU', alasanKeputusan: null, disetujuiPada: null,
            createdAt: new Date().toISOString(),
          }],
          total: 1, page: 1, limit: 20,
        }),
      });
    });

    // Mock PATCH setujui
    await page.route('**/api/admin/izin/guru/4/setujui', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.goto('/tu/izin-guru');
    await expect(page.getByText('Dewi Kusuma')).toBeVisible({ timeout: 8_000 });
    await page.getByText('Dewi Kusuma').click();

    await expect(page.locator('#btn-setujui-izin')).toBeVisible({ timeout: 5_000 });
    await page.locator('#btn-setujui-izin').click();

    await expect(page.getByText(/Izin disetujui/i)).toBeVisible({ timeout: 8_000 });
  });
});

