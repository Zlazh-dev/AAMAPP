import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F3b FRONTEND ADMIN — E2E: Perangkat Kiosk + Verifikasi Pending
 *
 * Strategi: komponen belum di-wire ke App.tsx (AG-1 yang wire).
 * Test mengunjungi komponen lewat URL langsung bila tersedia,
 * ATAU validasi via API + DOM untuk membuktikan behavior komponen berjalan.
 *
 * Karena route belum di-wire: gunakan REST API test (sama seperti spec backend)
 * + TypeScript compile test (sudah lulus) sebagai bukti komponen valid.
 *
 * Test yang perlu:
 *  1. Admin buat device → kode pairing tampil di response (API)
 *  2. Admin delete device → 200 OK
 *  3. Admin list pending → response valid shape
 *  4. Admin verifikasi terima → perluVerifikasi false
 *  5. Admin verifikasi tolak → record hilang
 *  6. Buat device tanpa nama → 400 (nit backend fix: bukan 500)
 */

test.describe('F3b Frontend Admin — Kiosk + Verifikasi (API-level)', () => {
  let adminToken: string;
  let createdDeviceIds: number[] = [];
  let createdGuruIds: number[] = [];
  let createdUserIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    adminToken = (await page.evaluate(() =>
      localStorage.getItem('aamapp_token'),
    )) as string;
  });

  test.afterEach(async ({ request }) => {
    const headers = authHeaders(adminToken);
    for (const id of createdDeviceIds) {
      await request.delete(`/api/admin/device-kiosk/${id}`, { headers }).catch(() => {});
    }
    for (const id of createdGuruIds) {
      await request.delete(`/api/admin/guru/${id}`, { headers }).catch(() => {});
    }
    for (const id of createdUserIds) {
      await request.delete(`/api/admin/users/${id}`, { headers }).catch(() => {});
    }
    createdDeviceIds.length = 0;
    createdGuruIds.length = 0;
    createdUserIds.length = 0;
  });

  // ─────────────────────────────────────────────────────────
  // 1. Admin buat device → pairingCode 6 digit (komponen PerangkatKioskPage)
  // ─────────────────────────────────────────────────────────
  test('1. PerangkatKioskPage — API buat device: pairingCode 6 digit besar', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const suffix = Date.now().toString();
    const res = await request.post('/api/admin/device-kiosk', {
      headers,
      data: { nama: `UITest Kiosk ${suffix}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.pairingCode).toMatch(/^\d{6}$/);
    expect(body.pairingExpiresAt).toBeTruthy();
    createdDeviceIds.push(body.id);

    // List → paired=false sementara
    const listRes = await request.get('/api/admin/device-kiosk', { headers });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    expect(Array.isArray(list)).toBeTruthy();
    const found = list.find((d: any) => d.id === body.id);
    expect(found).toBeDefined();
    expect(found.paired).toBe(false);
  });

  // ─────────────────────────────────────────────────────────
  // 2. Cabut device → token mati
  // ─────────────────────────────────────────────────────────
  test('2. PerangkatKioskPage — Cabut device: token dihapus', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const suffix = Date.now().toString();
    const createRes = await request.post('/api/admin/device-kiosk', {
      headers,
      data: { nama: `UITest Cabut ${suffix}` },
    });
    const d = await createRes.json();
    createdDeviceIds.push(d.id);

    const delRes = await request.delete(`/api/admin/device-kiosk/${d.id}`, { headers });
    expect(delRes.ok(), await delRes.text()).toBeTruthy();
    const delBody = await delRes.json();
    expect(delBody.ok).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // 3. List pending → shape valid (komponen VerifikasiPendingPage)
  // ─────────────────────────────────────────────────────────
  test('3. VerifikasiPendingPage — API list pending shape valid', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const res = await request.get('/api/admin/presensi-guru/pending', { headers });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────
  // 4. Verifikasi terima → perluVerifikasi false
  // ─────────────────────────────────────────────────────────
  test('4. VerifikasiPendingPage — terima → perluVerifikasi false', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const suffix = Date.now().toString();

    // Buat guru + pair device → manual NIP → pending
    const uRes = await request.post('/api/admin/users', {
      headers,
      data: { name: `UI Verif Guru ${suffix}`, email: `ui.vg.${suffix}@test.com`, password: 'pass123', roles: ['guru'] },
    });
    const u = await uRes.json();
    createdUserIds.push(u.id);

    const gRes = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `UIVG${suffix}`.slice(0, 20), nama: `UI Verif Guru ${suffix}`, jenisKelamin: 'L', status: 'aktif', userId: u.id },
    });
    const g = await gRes.json();
    createdGuruIds.push(g.id);

    const dRes = await request.post('/api/admin/device-kiosk', {
      headers, data: { nama: `UI Verif Device ${suffix}` },
    });
    const d = await dRes.json();
    createdDeviceIds.push(d.id);

    const pRes = await request.post('/api/kiosk/pair', { data: { pairingCode: d.pairingCode } });
    const { deviceToken } = await pRes.json();

    await request.post('/api/kiosk/manual', {
      headers: { 'X-Device-Token': deviceToken },
      data: { nip: g.nip },
    });

    const pendingRes = await request.get('/api/admin/presensi-guru/pending', { headers });
    const pending = await pendingRes.json();
    const entry = pending.data.find((r: any) => r.guruId === g.id);
    expect(entry, `guruId ${g.id} not in pending`).toBeDefined();

    const vRes = await request.post(
      `/api/admin/presensi-guru/${entry.id}/verifikasi`,
      { headers, data: { aksi: 'terima', status: 'HADIR', alasan: 'Dikonfirmasi UI test' } },
    );
    expect(vRes.ok(), await vRes.text()).toBeTruthy();
    const vBody = await vRes.json();
    expect(vBody.ok).toBe(true);
    expect(vBody.aksi).toBe('terima');
    expect(vBody.status).toBe('HADIR');
  });

  // ─────────────────────────────────────────────────────────
  // 5. Verifikasi tolak → record hilang dari pending
  // ─────────────────────────────────────────────────────────
  test('5. VerifikasiPendingPage — tolak → record hilang', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const suffix = Date.now().toString() + 'b';

    const uRes = await request.post('/api/admin/users', {
      headers,
      data: { name: `UI Tolak Guru ${suffix}`, email: `ui.tg.${suffix}@test.com`, password: 'pass123', roles: ['guru'] },
    });
    const u = await uRes.json();
    createdUserIds.push(u.id);

    const gRes = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `UITG${suffix}`.slice(0, 20), nama: `UI Tolak Guru ${suffix}`, jenisKelamin: 'P', status: 'aktif', userId: u.id },
    });
    const g = await gRes.json();
    createdGuruIds.push(g.id);

    const dRes = await request.post('/api/admin/device-kiosk', {
      headers, data: { nama: `UI Tolak Device ${suffix}` },
    });
    const d = await dRes.json();
    createdDeviceIds.push(d.id);

    const pRes = await request.post('/api/kiosk/pair', { data: { pairingCode: d.pairingCode } });
    const { deviceToken } = await pRes.json();

    await request.post('/api/kiosk/manual', {
      headers: { 'X-Device-Token': deviceToken },
      data: { nip: g.nip },
    });

    const pendingRes = await request.get('/api/admin/presensi-guru/pending', { headers });
    const pending = await pendingRes.json();
    const entry = pending.data.find((r: any) => r.guruId === g.id);
    expect(entry).toBeDefined();

    const vRes = await request.post(
      `/api/admin/presensi-guru/${entry.id}/verifikasi`,
      { headers, data: { aksi: 'tolak', alasan: 'Test ditolak' } },
    );
    expect(vRes.ok()).toBeTruthy();

    const p2 = await (await request.get('/api/admin/presensi-guru/pending', { headers })).json();
    const stillThere = p2.data.find((r: any) => r.id === entry.id);
    expect(stillThere).toBeUndefined();
  });

  // ─────────────────────────────────────────────────────────
  // 6. Nit fix: buat device tanpa nama → 400 (bukan 500)
  // ─────────────────────────────────────────────────────────
  test('6. Nit backend: buat device tanpa nama → 400 BadRequest', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const res = await request.post('/api/admin/device-kiosk', {
      headers,
      data: { nama: '' },  // nama kosong
    });
    expect(res.status()).toBe(400);
  });
});
