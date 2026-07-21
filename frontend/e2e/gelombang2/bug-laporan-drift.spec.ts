import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * BUG-LAPORAN-DRIFT — e2e bukti perbaikan DTO drift.
 *
 * 1. Laporan demerit: poinR/S/B/SB angka (bukan undefined), siswaKelas nama kelas (bukan "-"), TOTAL bukan NaN.
 * 2. Rekap TU: guruNama (bukan undefined), persen angka (bukan "undefined%").
 */

const ADMIN_EMAIL = 'e2e-admin@aamapp.sch.id';
const ADMIN_PASS = 'e2e-admin-pass';

test.describe('BUG-LAPORAN-DRIFT — DTO fix', () => {
  let token: string;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
    token = (await res.json()).accessToken;
  });

  test('Laporan demerit: poinR/S/B/SB angka, siswaKelas string, terpotong angka', async () => {
    const ctx = await pwRequest.newContext();
    const headers = authHeaders(token);

    // Buat siswa + kelas + pelanggaran uji.
    const suffix = Date.now();
    const kelasRes = await ctx.post('/api/admin/kelas', { headers, data: { tingkat: 8, nama: `DemDrift-${suffix}` } });
    const kelas = await kelasRes.json();

    const siswaRes = await ctx.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Drift ${suffix}`, nis: `DRT${suffix}`.slice(0, 20), jenisKelamin: 'L', kelasId: kelas.id, status: 'aktif' },
    });
    const siswa = await siswaRes.json();

    const katalogRes = await ctx.get('/api/kesiswaan/katalog?limit=1', { headers });
    const katalogId = (await katalogRes.json()).data?.[0]?.id;

    // Catat pelanggaran (auto-DISETUJUI krn admin).
    const tanggal = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    await ctx.post('/api/kesiswaan/pelanggaran', {
      headers,
      data: { siswaId: siswa.id, katalogId, tanggal, catatan: 'Uji drift' },
    });

    // Panggil laporan demerit.
    const dari = tanggal.slice(0, 8) + '01';
    const demRes = await ctx.get(`/api/kesiswaan/laporan/demerit?dari=${dari}&sampai=${tanggal}`, { headers });
    expect(demRes.ok()).toBe(true);
    const demBody = await demRes.json();

    // Cari baris siswa uji.
    const row = demBody.data.find((r: any) => r.siswaId === siswa.id);
    expect(row).toBeDefined();

    // Field FLAT (bukan nested perKategori).
    expect(typeof row.poinR).toBe('number');
    expect(typeof row.poinS).toBe('number');
    expect(typeof row.poinB).toBe('number');
    expect(typeof row.poinSB).toBe('number');
    expect(row.perKategori).toBeUndefined(); // tidak boleh nested

    // siswaKelas = nama kelas (bukan angka kelasId, bukan null).
    expect(row.siswaKelas).toBe(kelas.nama);

    // terpotong & saldo angka (bukan NaN).
    expect(typeof row.terpotong).toBe('number');
    expect(typeof row.saldo).toBe('number');
    expect(Number.isNaN(row.terpotong)).toBe(false);
    expect(Number.isNaN(row.saldo)).toBe(false);

    // Cleanup.
    await ctx.delete(`/api/kesiswaan/pelanggaran/${row.terpotong > 0 ? '?' : ''}`, { headers }).catch(() => {});
    await ctx.delete(`/api/admin/siswa/${siswa.id}`, { headers }).catch(() => {});
    await ctx.delete(`/api/admin/kelas/${kelas.id}`, { headers }).catch(() => {});
  });

  test('Rekap TU: guruNama string, persen angka (bukan undefined)', async () => {
    const ctx = await pwRequest.newContext();
    const headers = authHeaders(token);

    // Panggil rekap guru bulan ini.
    const bulan = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' });
    const res = await ctx.get(`/api/tu/rekap-guru?bulan=${bulan}`, { headers });
    expect(res.ok()).toBe(true);
    const body = await res.json();

    if (body.data.length > 0) {
      const row = body.data[0];

      // guruNama = string (bukan undefined).
      expect(typeof row.guruNama).toBe('string');
      expect(row.guruNama.length).toBeGreaterThan(0);
      expect(row.nama).toBeUndefined(); // field lama tidak boleh ada

      // persen = angka (bukan undefined).
      expect(typeof row.persen).toBe('number');
      expect(Number.isNaN(row.persen)).toBe(false);
      expect(row.pctHadir).toBeUndefined(); // field lama tidak boleh ada
    }
  });

  test('Laporan demerit di UI: tabel tampil angka, bukan undefined/NaN', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/kesiswaan/laporan');
    await page.waitForLoadState('networkidle');

    // Tabel demerit terlihat (desktop).
    const table = page.locator('table').first();
    if (await table.isVisible().catch(() => false)) {
      // Cek tidak ada "undefined" atau "NaN" di sel tabel.
      const tableText = await table.innerText();
      expect(tableText).not.toContain('undefined');
      expect(tableText).not.toContain('NaN');
    }
  });
});