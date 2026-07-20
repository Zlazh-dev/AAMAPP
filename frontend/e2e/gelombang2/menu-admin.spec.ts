import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * menu-admin.spec.ts â€” FIX-MENU-ADMIN (keputusan user: admin = superuser).
 *
 * Regresi utk bug: login admin (peran ['admin']) tidak melihat grup menu
 * KURIKULUM di sidebar meski route-nya sudah mengizinkan admin
 * (RequireRole roles={['kurikulum','admin']}). Root cause: getMenuForUser
 * (frontend/src/app/menu.ts) hanya menambah grup bila
 * `user.roles.includes(area)` â€” admin tidak literally punya peran
 * 'kurikulum'. Fix: ADMIN_EXTRA_AREAS ditambahkan ke grup admin.
 *
 * Spec ini menutup celah "visibilitas menu tak pernah diuji" (baru
 * ditemukan setelah T15/T16) â€” sebelumnya semua spec CRUD kurikulum
 * mengakses langsung via page.goto(), tak pernah lewat klik sidebar.
 */
test.describe('Menu Admin (FIX-MENU-ADMIN)', () => {
  test('Admin melihat grup Kurikulum di sidebar -> klik Mata Pelajaran -> mendarat & render', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    // 1. Grup label KURIKULUM tampil di sidebar (bukan cuma grup ADMIN).
    await expect(page.getByText('KURIKULUM', { exact: true })).toBeVisible();

    // 2. Item menu "Mata Pelajaran" terlihat & bisa diklik.
    //    IA-HIERARCHY-V2: Mata Pelajaran = main sidebar; sub (Penugasan,
    //    Jadwal KBM, Kokurikuler, Ekskul, Tahun Ajaran & KKM) lewat SubPageLinks.
    const mapelLink = page.getByRole('link', { name: 'Mata Pelajaran' });
    await expect(mapelLink).toBeVisible();
    await mapelLink.click();

    // 3. Mendarat di /kurikulum/mapel dan halaman render (bukan blank/403).
    await page.waitForURL('**/kurikulum/mapel');
    await expect(page.getByRole('heading', { name: 'Mata Pelajaran', level: 2 })).toBeVisible();

    // 4. Sidebar hanya main items (href-based â€” icon material ikut accessible name).
    const sidebar = page.locator('aside');
    await expect(sidebar.locator('a[href="/kurikulum/mapel"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/kurikulum/kelas"]')).toBeVisible();
    await expect(sidebar.locator('a[href="/kurikulum/orang"]')).toBeVisible();
    // Sub halaman DILARANG di sidebar.
    await expect(sidebar.locator('a[href="/kurikulum/penugasan"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/kurikulum/jadwal"]')).toHaveCount(0);

    // 5. SubPageLinks di body: masuk lewat induk Mata Pelajaran.
    await expect(page.getByRole('link', { name: /Penugasan Mapel/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Tahun Ajaran & KKM/ })).toBeVisible();
  });
});
