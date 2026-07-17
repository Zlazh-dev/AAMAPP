import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * menu-admin.spec.ts — FIX-MENU-ADMIN (keputusan user: admin = superuser).
 *
 * Regresi utk bug: login admin (peran ['admin']) tidak melihat grup menu
 * KURIKULUM di sidebar meski route-nya sudah mengizinkan admin
 * (RequireRole roles={['kurikulum','admin']}). Root cause: getMenuForUser
 * (frontend/src/app/menu.ts) hanya menambah grup bila
 * `user.roles.includes(area)` — admin tidak literally punya peran
 * 'kurikulum'. Fix: ADMIN_EXTRA_AREAS ditambahkan ke grup admin.
 *
 * Spec ini menutup celah "visibilitas menu tak pernah diuji" (baru
 * ditemukan setelah T15/T16) — sebelumnya semua spec CRUD kurikulum
 * mengakses langsung via page.goto(), tak pernah lewat klik sidebar.
 */
test.describe('Menu Admin (FIX-MENU-ADMIN)', () => {
  test('Admin melihat grup Kurikulum di sidebar -> klik Jadwal KBM -> mendarat & render', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    // 1. Grup label KURIKULUM tampil di sidebar (bukan cuma grup ADMIN).
    await expect(page.getByText('KURIKULUM', { exact: true })).toBeVisible();

    // 2. Item menu "Jadwal KBM" terlihat & bisa diklik.
    const jadwalLink = page.getByRole('link', { name: 'Jadwal KBM' });
    await expect(jadwalLink).toBeVisible();
    await jadwalLink.click();

    // 3. Mendarat di /kurikulum/jadwal dan halaman render (bukan blank/403).
    await page.waitForURL('**/kurikulum/jadwal');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM' })).toBeVisible();

    // 4. Item menu Mapel & Penugasan (grup Kurikulum lain) juga tampil,
    //    membuktikan seluruh grup — bukan cuma satu item — ikut muncul.
    await expect(page.getByRole('link', { name: 'Mata Pelajaran' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Penugasan' })).toBeVisible();
  });
});
