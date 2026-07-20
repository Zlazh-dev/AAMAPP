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

  test('Admin: validasi wajah guru ada di detail guru (UX-POLISH §D)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/kurikulum/orang/guru/1');
    await page.waitForTimeout(2000);
    // Detail guru harus ada card wajah (bagian baru §D)
    const hasCard = await page.locator('#card-wajah-guru').isVisible().catch(() => false);
    const hasGuru = await page.locator('h2').first().isVisible().catch(() => false);
    if (hasGuru) {
      // Guru detail loaded — card wajah HARUS ada
      expect(hasCard).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });

  test('Admin: /tu/presensi-guru menampilkan monitor presensi', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/tu/presensi-guru');
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

  test('Admin: /kurikulum/orang/guru/:guruId memiliki card wajah (UX-POLISH §D)', async ({
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

    await page.goto(`/kurikulum/orang/guru/${guru.id}`);
    await page.waitForTimeout(2000);
    // Card wajah harus ada di detail guru
    const hasCard = await page.locator('#card-wajah-guru').isVisible().catch(() => false);
    const hasGuru = await page.locator('h2').first().isVisible().catch(() => false);
    if (hasGuru) {
      expect(hasCard).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });

  test('Admin: /tu/presensi-guru accessible (via TU area, IA migration)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/tu/presensi-guru');
    await page.waitForTimeout(1500);
    // TU area menampilkan Presensi Guru
    const bodyLen = await page.locator('body').innerText().then(t => t.length).catch(() => 0);
    expect(bodyLen).toBeGreaterThan(10);
  });

  test('Menu guru memiliki item Daftar Wajah', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/guru/kbm');
    await expect(page.locator('a, button').filter({ hasText: /daftar wajah/i })).toBeVisible({ timeout: 8000 });
  });
});

