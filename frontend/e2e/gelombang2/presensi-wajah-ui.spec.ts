import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * F3a FRONTEND — UI smoke tests untuk halaman wajah & presensi guru.
 *
 * Strategi: tidak buka kamera nyata (CI tidak bisa); uji navigasi,
 * render halaman, keberadaan elemen kunci. Scan API sudah diuji di
 * presensi-wajah.spec.ts (mock embedding backend tests).
 */

test.describe('F3a Frontend — Wajah & Presensi Guru (UI)', () => {
  test('Guru: /guru/kbm memiliki tombol Presensi Sekarang & Daftar Wajah', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/guru/kbm');
    // Tombol "Presensi Sekarang" harus ada (F3a requirement)
    await expect(page.locator('#btn-presensi-sekarang')).toBeVisible({ timeout: 8000 });
    // Tombol "Daftar Wajah Saya" harus ada (alur TERPISAH dari presensi)
    await expect(page.locator('#btn-daftar-wajah')).toBeVisible({ timeout: 3000 });
  });

  test('Admin: /admin/wajah menampilkan halaman pendaftaran wajah', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/wajah');
    await expect(
      page.locator('h2').filter({ hasText: /wajah/i }),
    ).toBeVisible({ timeout: 8000 });
    // Input pencarian atau tabel / empty state harus ada
    await expect(
      page.locator('input[type="text"], table, [data-testid="empty"]').first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Admin: /admin/presensi-guru menampilkan monitor presensi', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/presensi-guru');
    await expect(
      page.locator('h2').filter({ hasText: /presensi guru/i }),
    ).toBeVisible({ timeout: 8000 });
    // Date picker harus ada
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 5000 });
  });

  test('Guru: /guru/wajah menampilkan status enrollment mandiri', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/guru/wajah');
    await expect(
      page.locator('h2').filter({ hasText: /daftar wajah/i }),
    ).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#btn-mulai-enroll-guru')).toBeVisible({ timeout: 5000 });
  });

  test('Admin: /admin/wajah/:guruId render wizard (panel izin kamera atau form)', async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page);
    // Cari guru pertama
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const guruRes = await request.get('/api/admin/guru?limit=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!guruRes.ok()) { test.skip(true, 'Tidak ada guru'); return; }
    const guruList = await guruRes.json();
    const guru = guruList.data?.[0];
    if (!guru) { test.skip(true, 'Tidak ada guru'); return; }

    await page.goto(`/admin/wajah/${guru.id}`);
    // Wizard harus render header dengan "Daftar Wajah" atau panel error
    await expect(
      page.locator('h2').filter({
        hasText: /daftar wajah|izin kamera|terjadi kesalahan/i,
      }),
    ).toBeVisible({ timeout: 8000 });
  });

  test('Menu admin memiliki item Presensi Guru & Pendaftaran Wajah', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await expect(page.locator('a, button').filter({ hasText: /presensi guru/i })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('a, button').filter({ hasText: /pendaftaran wajah/i })).toBeVisible({ timeout: 3000 });
  });

  test('Menu guru memiliki item Daftar Wajah', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/guru/kbm');
    await expect(page.locator('a, button').filter({ hasText: /daftar wajah/i })).toBeVisible({ timeout: 8000 });
  });
});
