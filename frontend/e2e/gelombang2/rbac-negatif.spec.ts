import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAs } from '../helpers/auth';

/**
 * T16-SPRINT: spec ini dulu mengasumsikan seed.service.ts membuat akun
 * `kurikulum@test.com` — TIDAK BENAR (seed hanya membuat 1 admin). Pada
 * DB benar-benar kosong (fresh start T16 poin 2) login gagal 401.
 * Fix: buat akun peran kurikulum via API admin di beforeEach (unique
 * email per run) + hapus di afterEach — self-contained & idempoten
 * (§12.17e).
 */
test.describe('RBAC Negatif (Poin 10 T16)', () => {
  let kurikulumEmail: string;
  const kurikulumPassword = 'password123XYZ';
  let kurikulumUserId: number;

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    const adminToken = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${adminToken}` };

    const suffix = Date.now();
    kurikulumEmail = `kurikulum.rbac.${suffix}@test.com`;
    const createRes = await request.post('/api/admin/users', {
      headers,
      data: {
        name: `Staf Kurikulum RBAC ${suffix}`,
        email: kurikulumEmail,
        password: kurikulumPassword,
        roles: ['kurikulum'],
      },
    });
    if (!createRes.ok()) {
      throw new Error(`Gagal membuat akun uji kurikulum (${createRes.status()}): ${await createRes.text()}`);
    }
    kurikulumUserId = (await createRes.json()).id;
  });

  test.afterEach(async ({ page, request }) => {
    // Re-login sbg admin (page context mungkin sudah beralih ke akun kurikulum).
    await loginAsAdmin(page);
    const adminToken = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${adminToken}` };
    if (kurikulumUserId) {
      await request.delete(`/api/admin/users/${kurikulumUserId}`, { headers }).catch(() => {});
    }
  });

  test('Kurikulum login -> 403 POST guru & menu admin hilang', async ({ page, request }) => {
    await loginAs(page, kurikulumEmail, kurikulumPassword);
    await page.goto('/');

    // 1. Menu admin tidak tampil
    await expect(page.getByRole('link', { name: 'Daftar Guru' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Pengaturan Akun' })).toBeHidden();

    // 2. Akses halaman admin manual -> harus redirect atau access denied
    await page.goto('/admin/guru');
    await expect(page.getByText('Daftar Guru')).toBeHidden();

    // 3. Verifikasi API 403 secara langsung
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const res = await request.post('/api/admin/guru', {
      headers: { Authorization: `Bearer ${token}` },
      data: { nip: '999', nama: 'Test Hacker', jenisKelamin: 'L', status: 'aktif' },
    });
    expect(res.status()).toBe(403);
  });
});
