import { test, expect, request as pwRequest } from '@playwright/test';
import { authHeaders } from '../helpers/api';

/**
 * Backend paginasi konsistensi (Tahap 3 — backend).
 *
 * Semua endpoint daftar yang datanya bisa tumbuh harus mengembalikan
 * bentuk konsisten { data, total, page, limit }.
 *
 * Yg sudah punya paginasi sebelum Tahap 3: kesiswaan (pelanggaran, katalog,
 * laporan demerit, verifikasi), kurikulum (mapel, penugasan, jadwal),
 * admin (users, sessions, siswa, guru, kelas), audit (activities).
 *
 * Yg ditambah di Tahap 3: ekskul (listEkskul), kokurikuler (listKegiatan).
 */

const ADMIN_EMAIL = 'e2e-admin@aamapp.sch.id';
const ADMIN_PASS = 'e2e-admin-pass';

async function getToken(ctx: import('@playwright/test').APIRequestContext): Promise<string> {
  const res = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
  return (await res.json()).accessToken;
}

test.describe('Backend paginasi konsistensi { data, total, page, limit }', () => {
  let token: string;
  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    token = await getToken(ctx);
  });

  // Helper: cek respons punya semua 4 field.
  function expectPaginated(body: any, expectedLimit?: number) {
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body).toHaveProperty('total');
    expect(typeof body.total).toBe('number');
    expect(body).toHaveProperty('page');
    expect(typeof body.page).toBe('number');
    expect(body).toHaveProperty('limit');
    expect(typeof body.limit).toBe('number');
    if (expectedLimit) expect(body.limit).toBe(expectedLimit);
    expect(body.data.length).toBeLessThanOrEqual(body.limit);
  }

  test('GET /api/ekskul?page=1&limit=25 → { data, total, page, limit }', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/ekskul?page=1&limit=25', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    expectPaginated(await res.json(), 25);
  });

  test('GET /api/ekskul default limit=25', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/ekskul', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expectPaginated(body);
    expect(body.limit).toBe(25);
    expect(body.page).toBe(1);
  });

  test('GET /api/kokurikuler/kegiatan?page=1&limit=25 → { data, total, page, limit }', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/kokurikuler/kegiatan?page=1&limit=25', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Kokurikuler return { data, total, page, limit }.
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(body.limit).toBe(25);
  });

  test('GET /api/kurikulum/penugasan?page=1&limit=25 → konsisten', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/kurikulum/penugasan?page=1&limit=25', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(body.limit).toBe(25);
  });

  test('GET /api/kesiswaan/pelanggaran?page=1&limit=25 → konsisten', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/kesiswaan/pelanggaran?page=1&limit=25', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    expectPaginated(await res.json(), 25);
  });

  test('GET /api/admin/users?page=1&limit=25 → konsisten', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/admin/users?page=1&limit=25', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(body.limit).toBe(25);
  });

  test('GET /api/admin/siswa?page=1&limit=25 → konsisten', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/admin/siswa?page=1&limit=25', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    expectPaginated(await res.json(), 25);
  });

  test('GET /api/admin/guru?page=1&limit=25 → konsisten', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/admin/guru?page=1&limit=25', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    expectPaginated(await res.json(), 25);
  });

  test('GET /api/admin/kelas?page=1&limit=25 → konsisten', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get('/api/admin/kelas?page=1&limit=25', { headers: authHeaders(token) });
    expect(res.status()).toBe(200);
    expectPaginated(await res.json(), 25);
  });
});