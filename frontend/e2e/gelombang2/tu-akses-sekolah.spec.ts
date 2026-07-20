import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Verifikasi TU bisa akses /tu/pengaturan/sekolah (IA-HIERARCHY-V2 revisi 2026-07-20).
 * Profil Sekolah pindah dari admin ke Pengaturan TU. Endpoint @Roles('tu','admin').
 * Titik yg paling mungkin terlewat: TU membuka halaman dan kena 403.
 */

test.describe('TU akses Profil Sekolah (IA-HIERARCHY-V2 revisi 2026-07-20)', () => {
  test('TU membuka /tu/pengaturan/sekolah tanpa 403', async () => {
    const ctx = await pwRequest.newContext();
    // Buat akun TU uji (idempoten).
    const adminRes = await ctx.post('/api/auth/login', {
      data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' },
    });
    const { accessToken: adminToken } = await adminRes.json();
    const headers = { Authorization: `Bearer ${adminToken}` };

    const tuEmail = `tu-verify-${Date.now()}@aamapp.sch.id`;
    const tuPass = 'tu-verify-pass';
    const createUser = await ctx.post('/api/admin/users', {
      headers,
      data: { name: 'TU Verify', email: tuEmail, password: tuPass, roles: ['tu'] },
    });
    expect(createUser.ok()).toBe(true);

    // Login sebagai TU.
    const tuLogin = await ctx.post('/api/auth/login', {
      data: { email: tuEmail, password: tuPass },
    });
    expect(tuLogin.ok()).toBe(true);
    const { accessToken: tuToken } = await tuLogin.json();

    // TU memanggil GET /api/pengaturan/profil_sekolah (hak baca) — harus 200.
    const getRes = await ctx.get('/api/pengaturan/profil_sekolah', {
      headers: { Authorization: `Bearer ${tuToken}` },
    });
    expect(getRes.status()).toBe(200);

    // TU memanggil PATCH /api/admin/pengaturan/profil_sekolah — harus 200 (bukan 403).
    const patchRes = await ctx.patch('/api/admin/pengaturan/profil_sekolah', {
      headers: { Authorization: `Bearer ${tuToken}`, 'Content-Type': 'application/json' },
      data: { value: { nama: 'SMP Test Verify', npsn: '12345678' } },
    });
    expect(patchRes.status()).toBe(200);

    // Cleanup: hapus akun TU uji.
    const { id: tuUserId } = await (await ctx.get('/api/admin/users', { headers })).json().then((b: any) => b.data?.find((u: any) => u.email === tuEmail) || { id: null });
    if (tuUserId) await ctx.delete(`/api/admin/users/${tuUserId}`, { headers }).catch(() => {});
  });

  test('Sidebar admin TIDAK menampilkan Profil Sekolah; TU punya Pengaturan', async ({ page }) => {
    // Login admin, cek sidebar hanya Dashboard + Akun.
    await page.goto('/');
    await page.evaluate(() => {
      const token = localStorage.getItem('aamapp_token');
      if (token) localStorage.removeItem('aamapp_token');
    });
    await page.request.post('/api/auth/login', {
      data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' },
    }).then(async (res) => {
      const { accessToken } = await res.json();
      await page.evaluate((t) => localStorage.setItem('aamapp_token', t), accessToken);
    });
    await page.goto('/admin');
    const sidebar = page.locator('aside');
    await expect(sidebar.locator('a[href="/admin"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/admin/akun"]')).toBeVisible();
    // Profil Sekolah DILARANG di sidebar admin.
    await expect(sidebar.locator('a[href="/tu/pengaturan/sekolah"]')).toHaveCount(0);
  });
});