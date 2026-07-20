import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Verifikasi SubPageLinks berpindah posisi per viewport (IA-HIERARCHY-V2 Tahap 1 koreksi).
 * Desktop: SubPageLinks di ATAS tabel. Mobile: SubPageLinks di BAWAH konten.
 * Diverifikasi di viewport mobile sungguhan (mobile-chromium), bukan baca kode.
 */

test.describe.configure({ mode: 'serial' });

test.describe('SubPageLinks pembalikan posisi per viewport', () => {
  test('Desktop: SubPageLinks di atas konten', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await loginAsAdmin(page);
    await page.goto('/kurikulum/mapel');

    const subLinksNav = page.getByRole('navigation', { name: 'Sub halaman' });
    const table = page.locator('table').first();

    await expect(subLinksNav).toBeVisible();
    await expect(table).toBeVisible();

    // Desktop: SubPageLinks harus di ATAS tabel (boundingBox.y lebih kecil).
    const navBox = await subLinksNav.boundingBox();
    const tableBox = await table.boundingBox();
    expect(navBox!.y).toBeLessThan(tableBox!.y);

    await ctx.close();
  });

  test('Mobile: SubPageLinks di bawah konten', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await loginAsAdmin(page);
    await page.goto('/kurikulum/mapel');

    const subLinksNav = page.getByRole('navigation', { name: 'Sub halaman' });

    // Mobile: halaman mapel mungkin menampilkan tabel (hidden md:block) ATAU
    // daftar kartu (md:hidden). Cari elemen konten utama setelah header.
    // SubPageLinks harus di BAWAH konten utama.
    await expect(subLinksNav).toBeVisible();

    // Ambil heading "Mata Pelajaran" (header halaman) dan SubPageLinks.
    const heading = page.getByRole('heading', { name: /Mata Pelajaran/i }).first();
    const headingBox = await heading.boundingBox();
    const navBox = await subLinksNav.boundingBox();

    // Header tetap di atas (selalu).
    expect(headingBox!.y).toBeLessThan(navBox!.y);

    // Cari elemen konten (Card/tabel/daftar) — di mobile, SubPageLinks harus
    // di bawah konten. Ambil Card pertama setelah heading.
    const card = page.locator('[class*="rounded"]').filter({ has: page.locator('table, ul, .material-symbols') }).first();
    const cardBox = await card.boundingBox();

    // Mobile: SubPageLinks di BAWAH konten (navBox.y > cardBox.y).
    expect(navBox!.y).toBeGreaterThan(cardBox!.y);

    await ctx.close();
  });

  test('Desktop TU Pengaturan: SubPageLinks di atas kartu', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await loginAsAdmin(page);
    await page.goto('/tu/pengaturan');

    const subLinksNav = page.getByRole('navigation', { name: 'Sub halaman' });
    const firstCard = page.locator('a[href="/tu/pengaturan/jam"]').first();

    await expect(subLinksNav).toBeVisible();
    const navBox = await subLinksNav.boundingBox();
    const cardBox = await firstCard.boundingBox();
    expect(navBox!.y).toBeLessThan(cardBox!.y);

    await ctx.close();
  });

  test('Mobile TU Pengaturan: SubPageLinks di bawah kartu', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await loginAsAdmin(page);
    await page.goto('/tu/pengaturan');

    const subLinksNav = page.getByRole('navigation', { name: 'Sub halaman' });
    const firstCard = page.locator('a[href="/tu/pengaturan/jam"]').first();

    await expect(subLinksNav).toBeVisible();
    const navBox = await subLinksNav.boundingBox();
    const cardBox = await firstCard.boundingBox();

    // Mobile: SubPageLinks di BAWAH kartu.
    expect(navBox!.y).toBeGreaterThan(cardBox!.y);

    await ctx.close();
  });
});