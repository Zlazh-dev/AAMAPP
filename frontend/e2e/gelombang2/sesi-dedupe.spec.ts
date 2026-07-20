import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Dedup sesi by deviceId (bukan deviceSummary).
 *
 * Akar masalah: device.util.ts menghasilkan label "Chrome - Windows" —
 * itu kategori, bukan identitas. Setiap login menyisipkan baris sessions
 * baru → tabel membengkak (12.529 baris untuk 31 pengguna).
 *
 * Solusi: cookie deviceId (acak, httpOnly, sameSite=lax, umur ±1 tahun).
 * Dedupe saat login: (userId, deviceId) → update baris, bukan insert.
 *
 * Bukti via DATABASE (bukan pesan sukses layar):
 *   1. Login 2x dari browser sama (deviceId sama) → 1 baris.
 *   2. Login dari deviceId beda → 2 baris terpisah.
 */

const DB_CONTAINER = 'aamapp-db-1';
const DB_USER = 'aamapp';
const DB_NAME = 'aamapp';

const ADMIN_EMAIL = 'e2e-admin@aamapp.sch.id';
const ADMIN_PASSWORD = 'e2e-admin-pass';

async function execDocker(sql: string): Promise<string> {
  const { execFile } = await import('child_process');
  return new Promise((resolve, reject) => {
    execFile(
      'docker',
      ['exec', DB_CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c', sql],
      { shell: false },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      },
    );
  });
}

async function countActiveSessions(userId: number): Promise<number> {
  const out = await execDocker(
    `SELECT COUNT(*) FROM sessions WHERE "userId" = ${userId} AND "revokedAt" IS NULL`,
  );
  return parseInt(out, 10) || 0;
}

async function getDeviceIdOfSession(userId: number): Promise<string[]> {
  const out = await execDocker(
    `SELECT "deviceId" FROM sessions WHERE "userId" = ${userId} AND "revokedAt" IS NULL ORDER BY "lastActiveAt" DESC`,
  );
  return out.split('\n').filter((x) => x.trim());
}

async function loginWithDeviceId(
  ctx: import('@playwright/test').APIRequestContext,
  deviceId: string,
): Promise<{ token: string; userId: number }> {
  const res = await ctx.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    headers: { Cookie: `deviceId=${deviceId}` },
  });
  const body = await res.json();
  return { token: body.accessToken, userId: body.user.id };
}

test.describe('Dedupe sesi by deviceId (DB proof)', () => {
  test('Login 2x dari perangkat sama → 1 baris (bukan 2)', async () => {
    const ctx = await pwRequest.newContext();
    const deviceId = 'testdevice-aaaa-bbbb-cccc-dddd';

    // Login pertama.
    const login1 = await loginWithDeviceId(ctx, deviceId);
    const after1 = await countActiveSessions(login1.userId);
    expect(after1).toBeGreaterThanOrEqual(1);
    const baseline = after1;

    // Login kedua dari perangkat yg sama (deviceId sama).
    const login2 = await loginWithDeviceId(ctx, deviceId);
    const after2 = await countActiveSessions(login2.userId);

    // BARIS TIDAK BERTAMBAH — dedupe terjadi.
    expect(after2).toBe(baseline);

    // Cleanup: revoke sesi uji via API (token pertama sudah ditimpa).
    await ctx.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${login2.token}` },
    });
  });

  test('Login dari deviceId berbeda → 2 baris terpisah', async () => {
    const ctx = await pwRequest.newContext();
    const deviceIdA = 'testdevice-1111-aaaa-bbbb-cccc';
    const deviceIdB = 'testdevice-2222-dddd-eeee-ffff';

    // Login dari perangkat A.
    const loginA = await loginWithDeviceId(ctx, deviceIdA);
    const afterA = await countActiveSessions(loginA.userId);

    // Login dari perangkat B (deviceId beda).
    const loginB = await loginWithDeviceId(ctx, deviceIdB);
    const afterB = await countActiveSessions(loginB.userId);

    // Baris BERTAMBAH — deviceId berbeda = perangkat berbeda.
    expect(afterB).toBe(afterA + 1);

    // Verifikasi dua baris punya deviceId berbeda.
    const deviceIds = await getDeviceIdOfSession(loginA.userId);
    expect(deviceIds).toContain(deviceIdA);
    expect(deviceIds).toContain(deviceIdB);

    // Cleanup: revoke kedua sesi.
    await ctx.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${loginA.token}` },
    });
    await ctx.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${loginB.token}` },
    });
  });
});