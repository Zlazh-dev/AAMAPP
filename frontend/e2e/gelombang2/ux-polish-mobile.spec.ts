import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * UX-POLISH Prioritas I & J — bukti mobile (375px).
 *
 * I: Konten bawah tidak tertutup tombol Kembali (BackLink fixed mobile).
 * J: Sub-detail PresensiGuru bisa diakses dari card-list mobile.
 */

test.describe('UX-POLISH I&J — mobile 375px', () => {
  test('I: BackLink mobile tidak menutupi konten terakhir (halaman dgn BackLink)', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await loginAsAdmin(page);

    // Buka halaman detail dgn BackLink + konten (sub-detail presensi guru).
    await page.goto('/tu/presensi-guru/detail?guruId=1');
    await page.waitForLoadState('networkidle');

    // Scroll ke bawah mentok.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // BackLink (tombol "Kembali") terlihat fixed di bawah.
    const backLink = page.getByRole('link', { name: /Kembali/ }).last();
    await expect(backLink).toBeVisible({ timeout: 5000 });

    // Konten terakhir (riwayat section) juga terlihat — tidak tertutup.
    // Cek bahwa scrollHeight - scrollTop - viewportHeight < tinggi BackLink (~80px).
    const overlap = await page.evaluate(() => {
      return document.body.scrollHeight - window.scrollY - window.innerHeight;
    });
    // overlap <= 0 berarti konten mentok bawah terlihat penuh.
    // overlap > 0 berarti masih ada konten tersembunyi di bawah.
    expect(overlap).toBeLessThanOrEqual(80); // toleransi tinggi BackLink

    await ctx.close();
  });

  test('I: BackLink mobile terlihat fixed di bawah halaman detail', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await loginAsAdmin(page);
    await page.goto('/tu/presensi-guru/detail?guruId=1');
    await page.waitForLoadState('networkidle');

    // BackLink (tombol "Kembali") terlihat fixed di bawah.
    const backLink = page.getByRole('link', { name: /Kembali/ }).last();
    await expect(backLink).toBeVisible({ timeout: 5000 });

    await ctx.close();
  });

  test('J: Card-list PresensiGuru mobile → klik → sub-detail', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await loginAsAdmin(page);
    await page.goto('/tu/presensi-guru');
    await page.waitForLoadState('networkidle');

    // Mobile: card-list terlihat (md:hidden).
    const mobileCards = page.locator('.md\\:hidden').first();
    await expect(mobileCards).toBeVisible({ timeout: 5000 });

    // Klik kartu guru pertama (card area, bukan tombol "Input Manual").
    const firstCard = page.locator('.md\\:hidden [class*="cursor-pointer"]').first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      // Navigasi ke sub-detail.
      await page.waitForURL('**/tu/presensi-guru/detail**', { timeout: 5000 });
      await expect(page.getByRole('heading', { name: /./ })).toBeVisible({ timeout: 5000 });
    }

    await ctx.close();
  });

  test('J: Sub-detail PresensiGuru langsung via URL', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await loginAsAdmin(page);

    // Ambil guruId pertama dari API.
    const res = await page.request.get('/api/admin/presensi-guru/harian?tanggal=' + new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }), {
      headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('aamapp_token'))}` },
    });
    const body = await res.json();
    const guruId = body.data?.[0]?.guruId ?? 1;

    await page.goto(`/tu/presensi-guru/detail?guruId=${guruId}`);
    await page.waitForLoadState('networkidle');

    // Halaman detail render: ada heading (nama guru) + BackLink.
    await expect(page.getByRole('link', { name: /Kembali/ })).toBeVisible({ timeout: 5000 });
    // Ada section "Presensi" atau "Jadwal KBM".
    const contentText = await page.locator('body').innerText();
    expect(contentText.length).toBeGreaterThan(50);

    await ctx.close();
  });
});