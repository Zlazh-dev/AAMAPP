import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * Pindah antar-kelas + Keluarkan dari kelas (multi-select).
 *
 * Skenario ini sebelumnya TIDAK punya tes sama sekali â€” itulah sebabnya
 * bug "save() mengutamakan objek relasi kelas" lolos. Spec ini membuktikan
 * lewat DATABASE (bukan pesan sukses layar) bahwa kelasId benar-benar
 * berubah.
 */

const DB_CONTAINER = 'aamapp-db-1';
const DB_USER = 'aamapp';
const DB_NAME = 'aamapp';

async function dbScalar(query: string): Promise<string> {
  const { execFile } = await import('child_process');
  return new Promise((resolve, reject) => {
    execFile(
      'docker',
      ['exec', DB_CONTAINER, 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c', query],
      { shell: false },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      },
    );
  });
}

async function dbKelasIdOf(siswaId: number): Promise<string> {
  return dbScalar(`SELECT "kelasId" FROM siswa WHERE id = ${siswaId}`);
}

test.describe('Pindah antar-kelas & Keluarkan dari kelas (DB proof)', () => {
  let adminToken: string;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    adminToken = await loginViaApi(ctx);
  });

  test('Pindahkan siswa antar-kelas via API â€” kelasId berubah di DB', async ({ request }) => {
    const headers = authHeaders(adminToken);
    const suffix = Date.now();

    // Buat 2 kelas + 1 siswa di kelas A.
    const kelasARes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `Pindah-A-${suffix}` },
    });
    const kelasA = await kelasARes.json();

    const kelasBRes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `Pindah-B-${suffix}` },
    });
    const kelasB = await kelasBRes.json();

    const siswaRes = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Pindah ${suffix}`, nis: `SP${suffix}`.slice(0, 20), jenisKelamin: 'L', kelasId: kelasA.id, status: 'aktif' },
    });
    const siswa = await siswaRes.json();

    // DB: siswa kelasId = kelasA.id
    expect(await dbKelasIdOf(siswa.id)).toBe(String(kelasA.id));

    // Pindahkan siswa ke kelas B via PATCH /api/admin/siswa/:id { kelasId: kelasB.id }.
    // Bug lama (sudah diperbaiki): save() mengutamakan objek relasi kelas,
    // jadi kelasId gagal berubah diam-diam bila row.kelas tidak disetel.
    const pindahRes = await request.patch(`/api/admin/siswa/${siswa.id}`, {
      headers,
      data: { kelasId: kelasB.id },
    });
    expect(pindahRes.ok()).toBe(true);

    // DB proof: siswa kelasId = kelasB.id (BUKAN kelasA.id).
    expect(await dbKelasIdOf(siswa.id)).toBe(String(kelasB.id));

    // Pindahkan kembali ke kelas A â€” verifikasi perubahan dua arah.
    const pindahKembaliRes = await request.patch(`/api/admin/siswa/${siswa.id}`, {
      headers,
      data: { kelasId: kelasA.id },
    });
    expect(pindahKembaliRes.ok()).toBe(true);
    expect(await dbKelasIdOf(siswa.id)).toBe(String(kelasA.id));

    // Cleanup.
    await request.delete(`/api/admin/siswa/${siswa.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/kelas/${kelasA.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/kelas/${kelasB.id}`, { headers }).catch(() => {});
  });

  test('Keluarkan siswa dari kelas via UI â€” kelasId = NULL di DB', async ({ page, request }) => {
    const headers = authHeaders(adminToken);
    const suffix = Date.now() + 1;

    // Buat kelas + 1 siswa di kelas itu.
    const kelasRes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `Keluarkan-${suffix}` },
    });
    const kelas = await kelasRes.json();

    const siswaRes = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa Keluar ${suffix}`, nis: `SK${suffix}`.slice(0, 20), jenisKelamin: 'L', kelasId: kelas.id, status: 'aktif' },
    });
    const siswa = await siswaRes.json();

    // DB: siswa kelasId = kelas.id
    expect(await dbKelasIdOf(siswa.id)).toBe(String(kelas.id));

    // Login admin, buka detail kelas.
    await loginAsAdmin(page);
    await page.goto(`/kurikulum/kelas/${kelas.id}`);
    await expect(page.getByRole('heading', { name: new RegExp(kelas.nama) })).toBeVisible();

    // Centang siswa, klik "Keluarkan".
    await page.locator(`input[type="checkbox"]`).first().check();
    await page.getByRole('button', { name: /Keluarkan/ }).click();

    // Tunggu toast sukses.
    await expect(page.getByText(/berhasil dikeluarkan/i)).toBeVisible({ timeout: 10_000 });

    // DB proof: siswa kelasId = NULL (data siswa tetap ada).
    expect(await dbKelasIdOf(siswa.id)).toBe('');

    // Cleanup.
    await request.delete(`/api/admin/siswa/${siswa.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/kelas/${kelas.id}`, { headers }).catch(() => {});
  });
});

async function loginViaApi(ctx: import('@playwright/test').APIRequestContext): Promise<string> {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'e2e-admin@aamapp.sch.id';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'e2e-admin-pass';
  const res = await ctx.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const body = await res.json();
  return body.accessToken;
}
