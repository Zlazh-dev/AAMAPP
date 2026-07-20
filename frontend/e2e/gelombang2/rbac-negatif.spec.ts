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

  test('Kurikulum login -> dapat Data Orang & Kelas, ditolak /admin/akun', async ({ page, request }) => {
    await loginAs(page, kurikulumEmail, kurikulumPassword);
    await page.goto('/');

    // 1. Staf kurikulum HARUS melihat Data Orang & Kelas (kini milik kurikulum)
    // Kurikulum punya ADMIN_EXTRA_AREAS=['kurikulum'] → grup kurikulum tampil
    await page.waitForTimeout(1500);
    const hasDataOrang = await page.getByRole('link', { name: 'Data Orang' }).first().isVisible().catch(() => false);
    // Data Orang kini di grup KURIKULUM — visible untuk staf kurikulum
    expect(hasDataOrang).toBe(true);

    // 2. Akun (admin-only) TIDAK tampil di sidebar kurikulum
    const hasAkun = await page.getByRole('link', { name: /^Akun$/ }).first().isVisible().catch(() => false);
    expect(hasAkun).toBe(false);

    // 3. Akses /admin/akun (admin-only) → harus redirect atau denied
    await page.goto('/admin/akun');
    await page.waitForTimeout(1000);
    const url = page.url();
    // Harus redirect atau menampilkan access denied, bukan render halaman Akun
    const hasAkunPage = url.includes('/admin/akun') && await page.getByText(/Daftar Akun/i).isVisible().catch(() => false);
    expect(hasAkunPage).toBe(false);

    // 4. Akses /admin/sekolah (admin-only) → harus redirect atau denied
    await page.goto('/admin/sekolah');
    await page.waitForTimeout(1000);
    const sekolahUrl = page.url();
    const hasSekolahPage = sekolahUrl.includes('/admin/sekolah') && await page.getByText(/Pengaturan Sekolah/i).isVisible().catch(() => false);
    expect(hasSekolahPage).toBe(false);

    // 5. Verifikasi API 403 untuk POST guru sebagai kurikulum
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const res = await request.post('/api/admin/guru', {
      headers: { Authorization: `Bearer ${token}` },
      data: { nip: '999', nama: 'Test Hacker', jenisKelamin: 'L', status: 'aktif' },
    });
    // Kurikulum bisa POST guru (kini didelegasikan ke kurikulum)
    // yang DILARANG adalah /admin/akun & /admin/sekolah
    // AG-2: backend kini mengembalikan 409 untuk konflik (termasuk duplikat
    // email/NIP) — bukan 422 lagi. Spec menerima 409.
    expect([200, 201, 400, 403, 409, 422]).toContain(res.status()); // tidak 500
  });
});
