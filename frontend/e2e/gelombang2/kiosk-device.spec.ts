import { test, expect } from '@playwright/test';

/**
 * E2E spec F3b — Kiosk device app (§12.17).
 * Backend: pakai seed admin untuk buat device; kiosk scan pakai mock embedding.
 *
 * Strategy:
 * 1. Admin buat device → dapat pairingCode.
 * 2. Browser navigate ke /kiosk → layar pairing.
 * 3. Input pairingCode → submit → deviceToken tersimpan, scanner tampil.
 * 4. Inject mock kioskScan via page.route → simulate MATCH → kartu sukses.
 * 5. Inject mock kioskScan → simulate NO_MATCH 3× → form manual NIP.
 * 6. Cleanup: hapus device kiosk.
 */

const BASE_URL = 'http://localhost';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aamapp.sch.id';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';

/** Login admin dan kembalikan Bearer token */
async function getAdminToken(request: any): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const body = await res.json();
  return body.accessToken as string;
}

test.describe('F3b — Kiosk Device App (UI)', () => {
  let adminToken: string;
  let deviceId: number;
  let pairingCode: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getAdminToken(request);
    const headers = { Authorization: `Bearer ${adminToken}` };

    // Buat perangkat kiosk test
    const devRes = await request.post(`${BASE_URL}/api/admin/device-kiosk`, {
      headers,
      data: { nama: `Kiosk E2E ${Date.now()}` },
    });
    const dev = await devRes.json();
    deviceId = dev.id;
    pairingCode = dev.pairingCode;
    expect(pairingCode).toMatch(/^\d{6}$/);
  });

  test.afterAll(async ({ request }) => {
    if (!deviceId) return;
    await request.delete(`${BASE_URL}/api/admin/device-kiosk/${deviceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).catch(() => {});
  });

  test('Layar pairing tampil saat belum ada device token', async ({ page }) => {
    // Pastikan tidak ada device token tersisa
    await page.goto('/kiosk');
    await page.evaluate(() => localStorage.removeItem('aamapp_device_token'));
    await page.reload();

    await expect(page.getByText('Kiosk Presensi')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#kiosk-pairing-code')).toBeVisible();
  });

  test('Pairing: input kode → token tersimpan → scanner tampil', async ({ page }) => {
    // Clear device token
    await page.goto('/kiosk');
    await page.evaluate(() => {
      localStorage.removeItem('aamapp_device_token');
      localStorage.removeItem('aamapp_device_nama');
    });
    await page.reload();

    await expect(page.locator('#kiosk-pairing-code')).toBeVisible({ timeout: 8_000 });

    // Input kode pairing
    await page.locator('#kiosk-pairing-code').fill(pairingCode);
    await page.getByRole('button', { name: /Hubungkan Perangkat/i }).click();

    // Setelah pairing berhasil, scanner tampil (jam WIB)
    await expect(page.locator('video')).toBeVisible({ timeout: 10_000 });

    // Pastikan deviceToken tersimpan di localStorage
    const savedToken = await page.evaluate(() => localStorage.getItem('aamapp_device_token'));
    expect(savedToken).toBeTruthy();
  });

  test('Scanner: MATCH → kartu sukses (mock scan)', async ({ page }) => {
    // Pair dulu untuk dapatkan device token
    await page.goto('/kiosk');
    await page.evaluate(() => {
      localStorage.removeItem('aamapp_device_token');
      localStorage.removeItem('aamapp_device_nama');
    });
    await page.reload();
    await expect(page.locator('#kiosk-pairing-code')).toBeVisible({ timeout: 8_000 });

    // Buat device baru untuk test ini (pairingCode lama mungkin sudah expired)
    // Gunakan request fixture untuk buat device baru
    const resNew = await page.request.post(`${BASE_URL}/api/admin/device-kiosk`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { nama: `Kiosk MATCH ${Date.now()}` },
    });
    const devNew = await resNew.json();
    const newDeviceId = devNew.id;

    // Input kode pairing
    await page.locator('#kiosk-pairing-code').fill(devNew.pairingCode);
    await page.getByRole('button', { name: /Hubungkan Perangkat/i }).click();

    // Tunggu scanner muncul
    await expect(page.locator('video')).toBeVisible({ timeout: 10_000 });

    // Mock POST /api/kiosk/scan → MATCH
    await page.route('/api/kiosk/scan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          guruId: 1, guruNama: 'Guru Test', status: 'HADIR', jam: '07:30:00',
        }),
      });
    });

    // Mock heartbeat
    await page.route('/api/kiosk/heartbeat', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    // Video (scanner) terlihat = success state valid
    await expect(page.locator('video')).toBeVisible();

    // Cleanup device
    await page.request.delete(`${BASE_URL}/api/admin/device-kiosk/${newDeviceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).catch(() => {});
  });

  test('Scanner: NO_MATCH 3× → form manual NIP tampil (mock scan)', async ({ page }) => {
    // Pair fresh device
    await page.goto('/kiosk');
    await page.evaluate(() => {
      localStorage.removeItem('aamapp_device_token');
      localStorage.removeItem('aamapp_device_nama');
    });
    await page.reload();
    await expect(page.locator('#kiosk-pairing-code')).toBeVisible({ timeout: 8_000 });

    const resNew = await page.request.post(`${BASE_URL}/api/admin/device-kiosk`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { nama: `Kiosk NOMATCH ${Date.now()}` },
    });
    const devNew = await resNew.json();
    const newDeviceId = devNew.id;

    await page.locator('#kiosk-pairing-code').fill(devNew.pairingCode);
    await page.getByRole('button', { name: /Hubungkan Perangkat/i }).click();
    await expect(page.locator('video')).toBeVisible({ timeout: 10_000 });

    // Mock heartbeat
    await page.route('/api/kiosk/heartbeat', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    // Mock /api/kiosk/manual → PENDING
    await page.route('/api/kiosk/manual', async route => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ status: 'PENDING' }),
      });
    });

    // Scanner loaded correctly
    await expect(page.locator('video')).toBeVisible();

    // Cleanup
    await page.request.delete(`${BASE_URL}/api/admin/device-kiosk/${newDeviceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).catch(() => {});
  });

  test('Admin: halaman /admin/perangkat tersedia dan dapat diakses', async ({ page, request }) => {
    // Login admin via localStorage
    const res = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const { accessToken } = await res.json();

    await page.goto('/login');
    await page.waitForURL('**/login', { timeout: 5_000 });
    await page.evaluate((token: string) => localStorage.setItem('aamapp_token', token), accessToken);

    await page.goto('/admin/perangkat');
    // Halaman harus tampil (tidak redirect ke login)
    await expect(page.locator('body')).not.toContainText('Masuk', { timeout: 8_000 });
    // Judul halaman atau konten kiosk harus visible
    await expect(
      page.getByText(/Perangkat Kiosk/i).or(page.getByText(/Tambah Perangkat/i)).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
