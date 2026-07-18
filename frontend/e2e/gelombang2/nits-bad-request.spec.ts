import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F4-NITS — BadRequestException (500→400) untuk input klien
 *
 *  1. Kiosk create device nama kosong → 400
 *  2. Kiosk create device nama hanya spasi → 400
 *  3. Kiosk create device nama valid → 201/200 (positif)
 *  4. Laporan rekap TU bulan format invalid → 400
 *  5. Laporan rekap TU bulan month out of range → 400
 *  6. Laporan rekap TU bulan valid → 200 (positif)
 */

let adminToken: string;
let createdDeviceId: number;

test.describe('F4-NITS — BadRequestException 500→400', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    adminToken = (await page.evaluate(() =>
      localStorage.getItem('aamapp_token'),
    )) as string;
  });

  test.afterAll(async ({ request }) => {
    if (createdDeviceId && adminToken) {
      await request
        .delete(`/api/admin/device-kiosk/${createdDeviceId}`, {
          headers: authHeaders(adminToken),
        })
        .catch(() => {});
    }
  });

  // ─── 1. Kiosk nama kosong → 400 ───────────────────────────────────────────
  test('1. Kiosk create device: nama="" → 400 BadRequest', async ({ request }) => {
    const res = await request.post('/api/admin/device-kiosk', {
      headers: authHeaders(adminToken),
      data: { nama: '' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message ?? body.error ?? '').toBeTruthy();
  });

  // ─── 2. Kiosk nama spasi → 400 ────────────────────────────────────────────
  test('2. Kiosk create device: nama="   " (spasi saja) → 400 BadRequest', async ({
    request,
  }) => {
    const res = await request.post('/api/admin/device-kiosk', {
      headers: authHeaders(adminToken),
      data: { nama: '   ' },
    });
    expect(res.status()).toBe(400);
  });

  // ─── 3. Kiosk nama valid → 2xx ────────────────────────────────────────────
  test('3. Kiosk create device: nama valid → 2xx (positif)', async ({ request }) => {
    const res = await request.post('/api/admin/device-kiosk', {
      headers: authHeaders(adminToken),
      data: { nama: `NIT-Test-${Date.now()}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.pairingCode).toHaveLength(6);
    createdDeviceId = body.id;
  });

  // ─── 4. Rekap TU bulan format salah → 400 ────────────────────────────────
  test('4. Rekap TU bulan="bukan-bulan" → 400 BadRequest', async ({ request }) => {
    const res = await request.get('/api/tu/rekap-guru?bulan=bukan-bulan', {
      headers: authHeaders(adminToken),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message ?? body.error ?? '').toBeTruthy();
  });

  // ─── 5. Rekap TU bulan month out of range → 400 ──────────────────────────
  test('5. Rekap TU bulan="2026-13" (month>12) → 400 BadRequest', async ({
    request,
  }) => {
    const res = await request.get('/api/tu/rekap-guru?bulan=2026-13', {
      headers: authHeaders(adminToken),
    });
    expect(res.status()).toBe(400);
  });

  // ─── 6. Rekap TU bulan valid → 200 ───────────────────────────────────────
  test('6. Rekap TU bulan="2026-07" (valid) → 200 (positif)', async ({ request }) => {
    const res = await request.get('/api/tu/rekap-guru?bulan=2026-07', {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.dari).toBe('2026-07-01');
    expect(body.sampai).toBe('2026-07-31');
  });
});
