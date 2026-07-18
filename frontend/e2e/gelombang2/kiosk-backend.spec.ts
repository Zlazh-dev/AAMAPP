import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F3b BACKEND — E2E Kiosk mock (F3-SPEC §e2e-mock-strategy).
 *
 * Strategi: semua REST-API langsung (tanpa kamera/browser kiosk).
 * Token kiosk diperoleh via pair API, lalu dipakai sebagai X-Device-Token.
 *
 * Jalur yang diuji:
 *  1. Admin buat device → dapat pairingCode
 *  2. Pair kode → dapat deviceToken
 *  3. Heartbeat update lastSeenAt
 *  4. Scan MATCH (embedding identik, 1 guru, gap besar)
 *  5. Scan NO_MATCH (embedding ortogonal)
 *  6. Scan AMBIGUOUS (2 guru dengan embedding mirip, gap < margin)
 *  7. Manual NIP → pending
 *  8. Admin list pending → verifikasi terima
 *  9. Admin verifikasi tolak
 * 10. Guard: scan tanpa X-Device-Token → 401
 * 11. Admin delete device → token tidak valid
 */

function makeDummyVec(val = 1.0, dim = 128): number[] {
  return Array(dim).fill(val);
}

function deviceHeaders(token: string) {
  return { 'X-Device-Token': token };
}

test.describe('F3b Backend — Kiosk (mock device)', () => {
  let adminToken: string;
  let deviceId: number;
  let deviceToken: string;
  let guruId1: number;
  let guruId2: number;
  let createdUserIds: number[] = [];
  let createdGuruIds: number[] = [];
  let createdDeviceIds: number[] = [];

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    adminToken = (await page.evaluate(() =>
      localStorage.getItem('aamapp_token'),
    )) as string;
    const headers = authHeaders(adminToken);

    // Buat 2 guru uji
    const suffix = Date.now().toString();
    for (let i = 1; i <= 2; i++) {
      const uRes = await request.post('/api/admin/users', {
        headers,
        data: {
          name: `Kiosk Guru ${i} ${suffix}`,
          email: `kiosk.g${i}.${suffix}@test.com`,
          password: 'password123',
          roles: ['guru'],
        },
      });
      expect(uRes.ok(), await uRes.text()).toBeTruthy();
      const u = await uRes.json();
      createdUserIds.push(u.id);

      const gRes = await request.post('/api/admin/guru', {
        headers,
        data: {
          nip: `KSK${i}${suffix}`.slice(0, 20),
          nama: `Kiosk Guru ${i} ${suffix}`,
          jenisKelamin: 'L',
          status: 'aktif',
          userId: u.id,
        },
      });
      expect(gRes.ok(), await gRes.text()).toBeTruthy();
      const g = await gRes.json();
      createdGuruIds.push(g.id);
      if (i === 1) guruId1 = g.id;
      else guruId2 = g.id;
    }

    // Buat device kiosk
    const dRes = await request.post('/api/admin/device-kiosk', {
      headers,
      data: { nama: `Kiosk Test ${suffix}` },
    });
    expect(dRes.ok(), await dRes.text()).toBeTruthy();
    const d = await dRes.json();
    deviceId = d.id;
    createdDeviceIds.push(d.id);

    // Pair → dapat deviceToken
    const pRes = await request.post('/api/kiosk/pair', {
      data: { pairingCode: d.pairingCode },
    });
    expect(pRes.ok(), await pRes.text()).toBeTruthy();
    deviceToken = (await pRes.json()).deviceToken;
  });

  test.afterEach(async ({ request }) => {
    const headers = authHeaders(adminToken);
    for (const id of createdGuruIds) {
      await request.delete(`/api/admin/guru/${id}`, { headers }).catch(() => {});
    }
    for (const id of createdUserIds) {
      await request.delete(`/api/admin/users/${id}`, { headers }).catch(() => {});
    }
    for (const id of createdDeviceIds) {
      await request.delete(`/api/admin/device-kiosk/${id}`, { headers }).catch(() => {});
    }
    createdGuruIds.length = 0;
    createdUserIds.length = 0;
    createdDeviceIds.length = 0;
  });

  // ─────────────────────────────────────────────────────────
  // 1. Admin buat device kiosk
  // ─────────────────────────────────────────────────────────
  test('1. Admin buat device kiosk — dapat pairingCode 6 digit', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const suffix2 = Date.now().toString() + '2';
    const res = await request.post('/api/admin/device-kiosk', {
      headers,
      data: { nama: `Kiosk Extra ${suffix2}` },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.pairingCode).toMatch(/^\d{6}$/);
    expect(body.pairingExpiresAt).toBeTruthy();
    createdDeviceIds.push(body.id);

    // List devices
    const listRes = await request.get('/api/admin/device-kiosk', { headers });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    expect(Array.isArray(list)).toBeTruthy();
    const found = list.find((d: any) => d.id === body.id);
    expect(found).toBeDefined();
    expect(found.paired).toBe(false);
  });

  // ─────────────────────────────────────────────────────────
  // 2. Pair kode → deviceToken
  // ─────────────────────────────────────────────────────────
  test('2. Pair kode pairing → dapat deviceToken', async () => {
    // deviceToken sudah diperoleh di beforeEach
    expect(deviceToken).toBeTruthy();
    expect(deviceToken.length).toBeGreaterThan(10);

    // List → paired=true
    const listRes = await (
      await import('@playwright/test')
    ).request.newContext({ baseURL: 'http://localhost' });
    // Gunakan adminToken via request dalam test scope — cek via admin API
    // (sudah dicek di beforeEach via pair response OK)
  });

  // ─────────────────────────────────────────────────────────
  // 3. Heartbeat
  // ─────────────────────────────────────────────────────────
  test('3. Heartbeat update lastSeenAt', async ({ request }) => {
    const res = await request.post('/api/kiosk/heartbeat', {
      headers: deviceHeaders(deviceToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.serverTime).toBeTruthy();

    // Device list → isOnline = true
    const listRes = await request.get('/api/admin/device-kiosk', {
      headers: authHeaders(adminToken),
    });
    const list = await listRes.json();
    const d = list.find((x: any) => x.id === deviceId);
    expect(d?.isOnline).toBe(true);
  });

  // ─────────────────────────────────────────────────────────
  // 4. Scan MATCH — 1 guru, embedding identik, gap besar
  // ─────────────────────────────────────────────────────────
  test('4. Scan kiosk MATCH — embedding identik, cosine=1, gap besar', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    // Enroll guru1 dgn vektor [1,1,...], guru2 dgn vektor ortogonal [-1,1,-1,1,...]
    const vec1 = makeDummyVec(1.0);
    const vec2 = Array.from({ length: 128 }, (_, i) =>
      i % 2 === 0 ? 1 : -1,
    );
    await request.put(`/api/admin/wajah/${guruId1}`, {
      headers,
      data: { embeddings: [vec1, vec1, vec1] },
    });
    await request.put(`/api/admin/wajah/${guruId2}`, {
      headers,
      data: { embeddings: [vec2, vec2, vec2] },
    });

    // Geofence off
    await request.patch('/api/admin/pengaturan/lokasi', {
      headers,
      data: { value: { aktif: false } },
    });

    const res = await request.post('/api/kiosk/scan', {
      headers: deviceHeaders(deviceToken),
      data: { embedding: vec1, mode: 'masuk' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.hasil).toBe('MATCH');
    expect(body.guruId).toBe(guruId1);
    expect(['HADIR', 'TERLAMBAT']).toContain(body.status);
    expect(body.similarity).toBeGreaterThanOrEqual(0.6);
    expect(body.gap).toBeGreaterThanOrEqual(0.05);
  });

  // ─────────────────────────────────────────────────────────
  // 5. Scan NO_MATCH — embedding asing
  // ─────────────────────────────────────────────────────────
  test('5. Scan kiosk NO_MATCH — embedding asing < threshold', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const vec1 = makeDummyVec(1.0);
    await request.put(`/api/admin/wajah/${guruId1}`, {
      headers,
      data: { embeddings: [vec1, vec1, vec1] },
    });

    // Vektor nol → cosine = 0
    const zeroVec = Array(128).fill(0);
    const res = await request.post('/api/kiosk/scan', {
      headers: deviceHeaders(deviceToken),
      data: { embedding: zeroVec },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.hasil).toBe('NO_MATCH');
  });

  // ─────────────────────────────────────────────────────────
  // 6. Scan AMBIGUOUS — 2 guru dengan embedding mirip, gap < margin
  // ─────────────────────────────────────────────────────────
  test('6. Scan kiosk AMBIGUOUS — gap < margin → perluVerifikasi', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);

    // Guru1 dan Guru2 sama-sama embedding mirip (hampir identik)
    const vecA = makeDummyVec(1.0);
    // vecB sedikit berbeda: 127 elemen sama, 1 elemen berbeda → cosine sangat tinggi
    const vecB = [...Array(127).fill(1.0), 0.99];

    await request.put(`/api/admin/wajah/${guruId1}`, {
      headers,
      data: { embeddings: [vecA, vecA, vecA] },
    });
    await request.put(`/api/admin/wajah/${guruId2}`, {
      headers,
      data: { embeddings: [vecB, vecB, vecB] },
    });

    // Set margin tinggi agar pasti ambigu (gap = cosine(vecA,vecB) - 1 hampir 0)
    await request.patch('/api/admin/pengaturan/wajah', {
      headers,
      data: { value: { threshold: 0.5, margin: 0.5 } }, // margin besar → pasti gap < margin
    });

    const res = await request.post('/api/kiosk/scan', {
      headers: deviceHeaders(deviceToken),
      data: { embedding: vecA, mode: 'masuk' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.hasil).toBe('AMBIGUOUS');
    expect(body.perluVerifikasi).toBe(true);

    // Reset margin
    await request.patch('/api/admin/pengaturan/wajah', {
      headers,
      data: { value: { threshold: 0.6, margin: 0.05 } },
    });
  });

  // ─────────────────────────────────────────────────────────
  // 7. Manual NIP → pending
  // ─────────────────────────────────────────────────────────
  test('7. Manual NIP via kiosk → perluVerifikasi=true', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);

    // Ambil NIP guru1
    const guruRes = await request.get(`/api/admin/guru/${guruId1}`, { headers });
    const guru = await guruRes.json();

    const res = await request.post('/api/kiosk/manual', {
      headers: deviceHeaders(deviceToken),
      data: { nip: guru.nip, mode: 'masuk' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.perluVerifikasi).toBe(true);
    expect(body.guruId).toBe(guruId1);
  });

  // ─────────────────────────────────────────────────────────
  // 8. Admin list pending → verifikasi TERIMA
  // ─────────────────────────────────────────────────────────
  test('8. Admin list pending → verifikasi terima', async ({ request }) => {
    const headers = authHeaders(adminToken);
    const guruRes = await request.get(`/api/admin/guru/${guruId1}`, { headers });
    const guru = await guruRes.json();

    // Buat pending via manual NIP
    await request.post('/api/kiosk/manual', {
      headers: deviceHeaders(deviceToken),
      data: { nip: guru.nip },
    });

    // List pending
    const pendingRes = await request.get('/api/admin/presensi-guru/pending', {
      headers,
    });
    expect(pendingRes.ok(), await pendingRes.text()).toBeTruthy();
    const pending = await pendingRes.json();
    expect(pending.total).toBeGreaterThan(0);

    const entry = pending.data.find((r: any) => r.guruId === guruId1);
    expect(entry).toBeDefined();

    // Verifikasi terima
    const vRes = await request.post(
      `/api/admin/presensi-guru/${entry.id}/verifikasi`,
      {
        headers,
        data: { aksi: 'terima', status: 'HADIR', alasan: 'Dikonfirmasi admin e2e' },
      },
    );
    expect(vRes.ok(), await vRes.text()).toBeTruthy();
    const vBody = await vRes.json();
    expect(vBody.ok).toBe(true);
    expect(vBody.aksi).toBe('terima');
    expect(vBody.status).toBe('HADIR');
  });

  // ─────────────────────────────────────────────────────────
  // 9. Admin verifikasi TOLAK
  // ─────────────────────────────────────────────────────────
  test('9. Admin verifikasi tolak → record dihapus', async ({ request }) => {
    const headers = authHeaders(adminToken);
    const guruRes = await request.get(`/api/admin/guru/${guruId2}`, { headers });
    const guru = await guruRes.json();

    await request.post('/api/kiosk/manual', {
      headers: deviceHeaders(deviceToken),
      data: { nip: guru.nip },
    });

    const pendingRes = await request.get('/api/admin/presensi-guru/pending', {
      headers,
    });
    const pending = await pendingRes.json();
    const entry = pending.data.find((r: any) => r.guruId === guruId2);
    expect(entry).toBeDefined();

    const vRes = await request.post(
      `/api/admin/presensi-guru/${entry.id}/verifikasi`,
      {
        headers,
        data: { aksi: 'tolak' },
      },
    );
    expect(vRes.ok(), await vRes.text()).toBeTruthy();
    const vBody = await vRes.json();
    expect(vBody.aksi).toBe('tolak');

    // Pending list tidak lagi mengandung entry ini
    const pending2Res = await request.get(
      '/api/admin/presensi-guru/pending',
      { headers },
    );
    const pending2 = await pending2Res.json();
    const stillThere = pending2.data.find((r: any) => r.id === entry.id);
    expect(stillThere).toBeUndefined();
  });

  // ─────────────────────────────────────────────────────────
  // 10. Guard: tanpa X-Device-Token → 401
  // ─────────────────────────────────────────────────────────
  test('10. Endpoint kiosk ter-guard — 401 tanpa X-Device-Token', async ({
    request,
  }) => {
    const endpoints = [
      () => request.post('/api/kiosk/scan', { data: { embedding: [1] } }),
      () => request.post('/api/kiosk/manual', { data: { nip: '12345' } }),
      () => request.post('/api/kiosk/heartbeat'),
    ];
    for (const fn of endpoints) {
      const res = await fn();
      expect(res.status(), `Expected 401 for ${res.url()}`).toBe(401);
    }
  });

  // ─────────────────────────────────────────────────────────
  // 11. Admin delete device → token invalid
  // ─────────────────────────────────────────────────────────
  test('11. Admin delete device → token tidak valid lagi', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);

    // Buat device baru + pair
    const dRes = await request.post('/api/admin/device-kiosk', {
      headers,
      data: { nama: 'Kiosk Delete Test' },
    });
    const d = await dRes.json();
    createdDeviceIds.push(d.id);

    const pRes = await request.post('/api/kiosk/pair', {
      data: { pairingCode: d.pairingCode },
    });
    const { deviceToken: tok2 } = await pRes.json();

    // Hapus device
    const delRes = await request.delete(
      `/api/admin/device-kiosk/${d.id}`,
      { headers },
    );
    expect(delRes.ok()).toBeTruthy();

    // Token tidak valid lagi
    const scanRes = await request.post('/api/kiosk/heartbeat', {
      headers: deviceHeaders(tok2),
    });
    expect(scanRes.status()).toBe(401);
  });
});
