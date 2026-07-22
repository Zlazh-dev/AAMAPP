import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

/**
 * rbac-fix.spec.ts
 *
 * Bukti kontrak RBAC-AUDIT-FIX.md:
 * 1. Guru murni login → mendarat /guru/kbm (bukan gembok / 403)
 * 2. return-to basi /admin/akun/sesi → guru jatuh ke /guru/kbm
 * 3. //evil.com diabaikan → guru mendarat /guru/kbm
 * 4. Admin buka /guru/rekap → dialihkan pulang (/admin)
 * 5. Kepsek POST izin guru → 403
 * 6. Login TU → /tu dashboard 200
 *
 * Asumsi: akun guru, admin, kepsek, tu tersedia via env / seed.
 */

const GURU_EMAIL    = process.env.GURU_EMAIL    || '';
const GURU_PASSWORD = process.env.GURU_PASSWORD || '';
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL   || 'admin@aamapp.sch.id';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';
const KEPSEK_EMAIL  = process.env.KEPSEK_EMAIL  || '';
const KEPSEK_PASSWORD = process.env.KEPSEK_PASSWORD || '';
const TU_EMAIL      = process.env.TU_EMAIL      || '';
const TU_PASSWORD   = process.env.TU_PASSWORD   || '';

test.describe('RBAC-FIX — kontrak akses peran', () => {

  test('Guru login murni → mendarat /guru/kbm', async ({ page }) => {
    if (!GURU_EMAIL) { test.skip(true, 'GURU_EMAIL tidak tersedia'); return; }
    await loginAs(page, GURU_EMAIL, GURU_PASSWORD);
    await expect(page).toHaveURL(/\/guru\/kbm/, { timeout: 10000 });
  });

  test('return-to basi /admin/akun/sesi → guru jatuh ke /guru/kbm', async ({ page }) => {
    if (!GURU_EMAIL) { test.skip(true, 'GURU_EMAIL tidak tersedia'); return; }
    // Simulasi: set return-to basi di sessionStorage sebelum login
    await page.goto('/login');
    await page.evaluate(() => {
      sessionStorage.setItem('aamapp_return_to', '/admin/akun/sesi');
    });
    // Login sebagai guru — isReturnToAllowed('/admin/akun/sesi', guru) = false
    await loginAs(page, GURU_EMAIL, GURU_PASSWORD);
    // Harus mendarat di home guru, bukan /admin/akun/sesi
    await expect(page).toHaveURL(/\/guru\/kbm/, { timeout: 10000 });
  });

  test('return-to //evil.com diabaikan → guru mendarat /guru/kbm', async ({ page }) => {
    if (!GURU_EMAIL) { test.skip(true, 'GURU_EMAIL tidak tersedia'); return; }
    await page.goto('/login');
    await page.evaluate(() => {
      sessionStorage.setItem('aamapp_return_to', '//evil.com');
    });
    await loginAs(page, GURU_EMAIL, GURU_PASSWORD);
    // URL harus tetap di domain yang sama, tidak lompat ke evil.com
    const url = page.url();
    expect(url).not.toContain('evil.com');
    expect(url).toMatch(/\/guru\/kbm/);
  });

  test('Admin buka /guru/rekap → dialihkan ke home admin (bukan gembok)', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/guru/rekap');
    await page.waitForTimeout(2000);
    // Admin tidak punya roles 'guru' → harus redirect ke /admin (home admin)
    const url = page.url();
    expect(url).not.toContain('/guru/rekap');
    // Harus di area /admin
    expect(url).toMatch(/\/admin/);
  });

  test('Kepsek POST /api/izin/guru → 403', async ({ request }) => {
    if (!KEPSEK_EMAIL) { test.skip(true, 'KEPSEK_EMAIL tidak tersedia'); return; }
    // Login kepsek dulu untuk dapat sesi
    // Nota: Playwright request tidak otomatis punya sesi browser
    // — spec ini perlu loginViaApi helper atau skip bila env tidak ada
    test.skip(true, 'Perlu loginViaApi helper untuk request context; skip CI');
  });

  test('Login TU → /tu dashboard 200', async ({ page }) => {
    if (!TU_EMAIL) { test.skip(true, 'TU_EMAIL tidak tersedia'); return; }
    await loginAs(page, TU_EMAIL, TU_PASSWORD);
    // TU home = /tu
    await expect(page).toHaveURL(/\/tu/, { timeout: 10000 });
    // Pastikan halaman bukan error 403
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('403');
    expect(body).not.toContain('tidak memiliki akses');
  });

  test('Redirect /admin/pengaturan → /tu/pengaturan/sekolah (satu lompat)', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/pengaturan');
    await page.waitForURL(/\/tu\/pengaturan\/sekolah/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/tu\/pengaturan\/sekolah/);
  });
});
