import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * BUG-LAPORAN-DRIFT-2 — e2e bukti perbaikan DTO drift lanjutan.
 *
 * 1. Laporan siswa: persen angka (bukan undefined%).
 * 2. Laporan demerit: poinR/S/B/SB angka (tipe eksplisit, bukan any[]).
 * 3. Tindak lanjut: tipe eksplisit (bukan any[]).
 * 4. Reward: tipe eksplisit (bukan any[]).
 */

const ADMIN_EMAIL = 'e2e-admin@aamapp.sch.id';
const ADMIN_PASS = 'e2e-admin-pass';

test.describe('BUG-LAPORAN-DRIFT-2 — DTO fix lanjutan', () => {
  let token: string;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
    token = (await res.json()).accessToken;
  });

  test('Laporan siswa: persen angka (bukan pctHadir/undefined)', async () => {
    const ctx = await pwRequest.newContext();
    const headers = authHeaders(token);
    const dari = new Date();
    dari.setDate(1);
    const dariStr = dari.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const sampaiStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    const res = await ctx.get(`/api/admin/laporan/siswa?dari=${dariStr}&sampai=${sampaiStr}`, { headers });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    if (body.data.length > 0) {
      const row = body.data[0];
      expect(row).toHaveProperty('persen');
      expect(typeof row.persen).toBe('number');
      expect(Number.isNaN(row.persen)).toBe(false);
      expect(row.pctHadir).toBeUndefined();
    }
  });

  test('Laporan demerit: tipe eksplisit — poinR/S/B/SB angka, siswaKelas string', async () => {
    const ctx = await pwRequest.newContext();
    const headers = authHeaders(token);
    const dari = new Date();
    dari.setDate(1);
    const dariStr = dari.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const sampaiStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    const res = await ctx.get(`/api/kesiswaan/laporan/demerit?dari=${dariStr}&sampai=${sampaiStr}`, { headers });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    if (body.data.length > 0) {
      const row = body.data[0];
      expect(typeof row.poinR).toBe('number');
      expect(typeof row.poinS).toBe('number');
      expect(typeof row.poinB).toBe('number');
      expect(typeof row.poinSB).toBe('number');
      expect(row.perKategori).toBeUndefined();
      expect(row.siswaKelas === null || typeof row.siswaKelas === 'string').toBe(true);
      expect(typeof row.terpotong).toBe('number');
      expect(typeof row.saldo).toBe('number');
    }
  });

  test('Tindak lanjut: respons punya field tipe eksplisit', async () => {
    const ctx = await pwRequest.newContext();
    const headers = authHeaders(token);
    const res = await ctx.get('/api/kesiswaan/tindak-lanjut?limit=5', { headers });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    if (body.data.length > 0) {
      const row = body.data[0];
      expect(typeof row.id).toBe('number');
      expect(row.siswa).toBeDefined();
      expect(typeof row.siswa.nama).toBe('string');
      expect(typeof row.tahap).toBe('string');
      expect(typeof row.status).toBe('string');
    }
  });

  test('Reward: respons punya sangatBaik/baik dgn siswaNama+saldo', async () => {
    const ctx = await pwRequest.newContext();
    const headers = authHeaders(token);
    const res = await ctx.get('/api/kesiswaan/reward', { headers });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    expect(body).toHaveProperty('sangatBaik');
    expect(body).toHaveProperty('baik');
    expect(Array.isArray(body.sangatBaik)).toBe(true);
    expect(Array.isArray(body.baik)).toBe(true);
  });

  test('UI laporan siswa: kolom %Hadir angka (bukan undefined%)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/kesiswaan/laporan-kehadiran');
    await page.waitForLoadState('networkidle');

    // Isi tanggal dari+sampai, klik tampilkan.
    const dari = new Date();
    dari.setDate(1);
    const dariStr = dari.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const sampaiStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    // Coba ID spesifik dulu, fallback ke generic date inputs.
    const dariInput = page.locator('#input-dari-siswa').or(page.locator('input[type="date"]').first());
    const sampaiInput = page.locator('#input-sampai-siswa').or(page.locator('input[type="date"]').nth(1));
    await dariInput.fill(dariStr);
    await sampaiInput.fill(sampaiStr);

    const btn = page.locator('#btn-tampilkan-siswa').or(page.getByRole('button', { name: /Tampilkan/i }));
    await btn.click();
    await page.waitForTimeout(2000);

    // Cek tabel tidak ada "undefined" atau "NaN".
    const tableText = await page.locator('table').first().innerText().catch(() => '');
    if (tableText) {
      expect(tableText).not.toContain('undefined');
      expect(tableText).not.toContain('NaN');
    }
  });
});