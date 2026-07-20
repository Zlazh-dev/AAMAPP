import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Otorisasi per-kunci pengaturan (IA-HIERARCHY-V2 revisi 2026-07-20).
 *
 * Sebelumnya @Roles('admin','tu') dibuka lebar di PATCH generik → TU bisa
 * mengubah KKM dan wajah (kelebihan wewenang). Sekarang peta eksplisit:
 *   profil_sekolah → ['admin','tu']
 *   jam_presensi   → ['admin','tu']
 *   lokasi         → ['admin','tu']
 *   kkm            → ['admin','kurikulum']
 *   wajah          → ['admin']
 *
 * Tanpa tes negatif, kelebihan wewenang tidak akan pernah ketahuan —
 * ini kedua kalinya spec hanya menguji jalur yg berhasil.
 */

const ADMIN_EMAIL = 'e2e-admin@aamapp.sch.id';
const ADMIN_PASS = 'e2e-admin-pass';

interface TestUser {
  email: string;
  pass: string;
  token: string;
  userId: number;
}

async function createUserWithRole(
  ctx: import('@playwright/test').APIRequestContext,
  adminToken: string,
  role: string,
  suffix: string,
): Promise<TestUser> {
  const email = `${role}-pengaturan-${suffix}@aamapp.sch.id`;
  const pass = `${role}-pass-123`;
  const headers = { Authorization: `Bearer ${adminToken}` };
  const createRes = await ctx.post('/api/admin/users', {
    headers,
    data: { name: `${role} pengaturan`, email, password: pass, roles: [role] },
  });
  expect(createRes.ok()).toBe(true);
  const loginRes = await ctx.post('/api/auth/login', { data: { email, password: pass } });
  const { accessToken, user } = await loginRes.json();
  return { email, pass, token: accessToken, userId: user.id };
}

async function cleanupUser(ctx: import('@playwright/test').APIRequestContext, adminToken: string, userId: number) {
  await ctx.delete(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${adminToken}` } }).catch(() => {});
}

test.describe('Otorisasi per-kunci pengaturan', () => {
  let adminToken: string;
  let tu: TestUser;
  let kurikulum: TestUser;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    const adminLogin = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
    adminToken = (await adminLogin.json()).accessToken;

    const suffix = String(Date.now());
    tu = await createUserWithRole(ctx, adminToken, 'tu', suffix);
    kurikulum = await createUserWithRole(ctx, adminToken, 'kurikulum', suffix);
  });

  test.afterAll(async () => {
    const ctx = await pwRequest.newContext();
    await cleanupUser(ctx, adminToken, tu.userId);
    await cleanupUser(ctx, adminToken, kurikulum.userId);
  });

  // ── TU ──────────────────────────────────────────────────────────────
  test('TU PATCH profil_sekolah → 200 (diizinkan)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.patch('/api/admin/pengaturan/profil_sekolah', {
      headers: { Authorization: `Bearer ${tu.token}`, 'Content-Type': 'application/json' },
      data: { value: { nama: 'SMP Test TU', npsn: '99999999' } },
    });
    expect(res.status()).toBe(200);
  });

  test('TU PATCH jam_presensi → 200 (diizinkan)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.patch('/api/admin/pengaturan/jam_presensi', {
      headers: { Authorization: `Bearer ${tu.token}`, 'Content-Type': 'application/json' },
      data: { value: { jamMasuk: '07:00', jamPulang: '15:00', toleransiMenit: 15, cutoff: '09:00' } },
    });
    expect(res.status()).toBe(200);
  });

  test('TU PATCH kkm → 403 (dilarang)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.patch('/api/admin/pengaturan/kkm', {
      headers: { Authorization: `Bearer ${tu.token}`, 'Content-Type': 'application/json' },
      data: { value: { nilai: 70 } },
    });
    expect(res.status()).toBe(403);
    const body = await res.json().catch(() => ({}));
    expect(body.message).toContain('kkm');
  });

  test('TU PATCH wajah → 403 (dilarang)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.patch('/api/admin/pengaturan/wajah', {
      headers: { Authorization: `Bearer ${tu.token}`, 'Content-Type': 'application/json' },
      data: { value: { threshold: 0.5 } },
    });
    expect(res.status()).toBe(403);
    const body = await res.json().catch(() => ({}));
    expect(body.message).toContain('wajah');
  });

  // ── Kurikulum ───────────────────────────────────────────────────────
  test('Kurikulum PATCH kkm → 200 (diizinkan)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.patch('/api/admin/pengaturan/kkm', {
      headers: { Authorization: `Bearer ${kurikulum.token}`, 'Content-Type': 'application/json' },
      data: { value: { nilai: 75 } },
    });
    expect(res.status()).toBe(200);
  });

  test('Kurikulum PATCH profil_sekolah → 403 (dilarang)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.patch('/api/admin/pengaturan/profil_sekolah', {
      headers: { Authorization: `Bearer ${kurikulum.token}`, 'Content-Type': 'application/json' },
      data: { value: { nama: 'SMP Test Kurikulum' } },
    });
    expect(res.status()).toBe(403);
    const body = await res.json().catch(() => ({}));
    expect(body.message).toContain('profil_sekolah');
  });

  // ── Admin (positive control) ────────────────────────────────────────
  test('Admin PATCH wajah → 200 (diizinkan)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.patch('/api/admin/pengaturan/wajah', {
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      data: { value: { threshold: 0.5 } },
    });
    expect(res.status()).toBe(200);
  });
});