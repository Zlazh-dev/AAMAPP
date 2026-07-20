import { test, expect } from '@playwright/test';
import { authHeaders } from '../helpers/api';

/**
 * UX-POLISH-BE â€” RBAC ketat + validasi wajah
 *
 * (A) @Roles KETAT:
 *  1. Admin (pure) â†’ 403 GET /api/guru/kbm (endpoint milik-guru)
 *  2. Admin â†’ 403 PUT /api/guru/penilaian/... (endpoint milik-guru)
 *  3. Admin â†’ 403 PUT /api/rapor/siswa/:id/mapel/:mapelId (wali only)
 *  4. Admin â†’ 403 POST /api/izin/guru (guru-only)
 *  5. Guru (dengan token guru) â†’ 200 GET /api/guru/wajah/status
 *  6. Admin â†’ 403 GET /api/guru/wajah/status (guru-only)
 *
 * (B) Kiosk dihapus:
 *  7. GET /api/admin/perangkat â†’ 404 (endpoint lama kiosk tidak ada)
 *
 * (D) Validasi wajah:
 *  8. Guru enroll wajah â†’ faceStatus=MENUNGGU_VALIDASI
 *  9. Admin PATCH validasi {aksi:'terima'} â†’ faceStatus=TERVALIDASI
 * 10. GET status guru â†’ faceStatus=TERVALIDASI
 * 11. Admin PATCH validasi {aksi:'tolak'} â†’ faceStatus=DITOLAK
 */

let adminToken: string;
let guruToken: string;
let guruUserId: number;
let guruId: number;
let suffix: string;

test.describe('UX-POLISH-BE â€” RBAC Ketat + Validasi Wajah', () => {
  test.beforeAll(async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' },
    });
    adminToken = (await login.json()).accessToken;
    suffix = Date.now().toString().slice(-6);

    // Buat guru + login
    const u = await request.post('/api/admin/users', {
      headers: authHeaders(adminToken),
      data: { name: `Polish Guru ${suffix}`, email: `pg${suffix}@test.com`, password: 'pass1234', roles: ['guru'] },
    });
    guruUserId = (await u.json()).id;
    const g = await request.post('/api/admin/guru', {
      headers: authHeaders(adminToken),
      data: { userId: guruUserId, nip: `PG${suffix}`, nama: `Polish Guru ${suffix}`, jenisKelamin: 'L' },
    });
    guruId = (await g.json()).id;
    const lg = await request.post('/api/auth/login', { data: { email: `pg${suffix}@test.com`, password: 'pass1234' } });
    guruToken = (await lg.json()).accessToken;
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (guruId) await request.delete(`/api/admin/guru/${guruId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guruUserId) await request.delete(`/api/admin/users/${guruUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
  });

  // â”€â”€â”€ (A) RBAC KETAT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test('1. Admin (pure) â†’ 403 GET /api/guru/kbm (endpoint milik-guru)', async ({ request }) => {
    const res = await request.get('/api/guru/kbm', {
      headers: authHeaders(adminToken),
    });
    expect(res.status()).toBe(403);
  });

  test('2. Admin â†’ 403 GET /api/guru/penilaian (endpoint milik-guru)', async ({ request }) => {
    const res = await request.get('/api/guru/penilaian', {
      headers: authHeaders(adminToken),
    });
    expect(res.status()).toBe(403);
  });

  test('3. Admin â†’ 403 PATCH /api/rapor/siswa/9999/catatan (wali only)', async ({ request }) => {
    const res = await request.patch('/api/rapor/siswa/9999/catatan', {
      headers: authHeaders(adminToken),
      data: { catatan: 'coba' },
    });
    // 403 karena bukan guru (bukan 404 dulu)
    expect(res.status()).toBe(403);
  });

  test('4. Admin â†’ 403 POST /api/izin/guru (guru-only)', async ({ request }) => {
    const res = await request.post('/api/izin/guru', {
      headers: authHeaders(adminToken),
      data: { jenis: 'SAKIT', tanggalMulai: '2026-07-20', tanggalSelesai: '2026-07-20', alasan: 'test' },
    });
    expect(res.status()).toBe(403);
  });

  test('5. Guru â†’ 200 GET /api/guru/wajah/status (guru bisa akses)', async ({ request }) => {
    const res = await request.get('/api/guru/wajah/status', {
      headers: authHeaders(guruToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('faceStatus');
  });

  test('6. Admin â†’ 403 GET /api/guru/wajah/status (guru-only)', async ({ request }) => {
    const res = await request.get('/api/guru/wajah/status', {
      headers: authHeaders(adminToken),
    });
    expect(res.status()).toBe(403);
  });

  // â”€â”€â”€ (B) Kiosk dihapus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test('7. Endpoint kiosk /api/admin/perangkat â†’ 404 (dihapus)', async ({ request }) => {
    const res = await request.get('/api/admin/perangkat', {
      headers: authHeaders(adminToken),
    });
    expect(res.status()).toBe(404);
  });

  // â”€â”€â”€ (D) Validasi wajah â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  test('8. Guru enroll wajah â†’ faceStatus=MENUNGGU_VALIDASI', async ({ request }) => {
    // Buat dummy embeddings (3 pose Ã— 128 dim)
    const embeddings = Array.from({ length: 3 }, () =>
      Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1) * 0.5),
    );
    const res = await request.put('/api/guru/wajah', {
      headers: authHeaders(guruToken),
      data: { embeddings },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.faceStatus).toBe('MENUNGGU_VALIDASI');
  });

  test('9. Admin PATCH validasi {aksi:terima} â†’ faceStatus=TERVALIDASI', async ({ request }) => {
    const res = await request.patch(`/api/admin/guru/${guruId}/wajah/validasi`, {
      headers: authHeaders(adminToken),
      data: { aksi: 'terima' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.faceStatus).toBe('TERVALIDASI');
  });

  test('10. GET status guru â†’ faceStatus=TERVALIDASI', async ({ request }) => {
    const res = await request.get('/api/guru/wajah/status', {
      headers: authHeaders(guruToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).faceStatus).toBe('TERVALIDASI');
  });

  test('11. Admin PATCH validasi {aksi:tolak} â†’ faceStatus=DITOLAK', async ({ request }) => {
    const res = await request.patch(`/api/admin/guru/${guruId}/wajah/validasi`, {
      headers: authHeaders(adminToken),
      data: { aksi: 'tolak' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    expect((await res.json()).faceStatus).toBe('DITOLAK');
  });
});
