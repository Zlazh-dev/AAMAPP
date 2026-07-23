import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test('JADWAL-MATRIX-RENDER: sel kode saja + table sempit + nol BackLink', async ({ page }) => {
  await page.goto('/login');
  await loginAsAdmin(page);
  await page.goto('/kurikulum/jadwal');
  await page.waitForLoadState('networkidle');

  // Set viewport desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);

  // 1. Nol BackLink di halaman /kurikulum/jadwal (embedded)
  const backLinks = page.locator('a:has-text("Jadwal KBM")');
  await expect(backLinks).toHaveCount(0);

  // 2. Table exists
  const table = page.locator('table').first();
  await expect(table).toBeVisible();

  // 3. scrollWidth < 1300px
  const scrollWidth = await table.evaluate((el) => el.scrollWidth);
  expect(scrollWidth).toBeLessThan(1300);

  // 4. Sel berisi kode guru saja (2-3 karakter), bukan kode+mapel
  // Ambil td yang punya title berisi "—" (format: "KODE — Nama (Mapel)")
  const dataCells = page.locator('td[title*="—"]');
  const cellCount = await dataCells.count();
  if (cellCount > 0) {
    const firstCellText = await dataCells.first().textContent();
    // Kode guru = 2-3 chars (mis. C4, A3, K5)
    expect(firstCellText!.trim().length).toBeLessThanOrEqual(4);

    // Title attribute berisi nama guru + mapel
    const title = await dataCells.first().getAttribute('title');
    if (title) {
      expect(title.length).toBeGreaterThan(5); // "C4 — Nama Guru (Mapel)"
    }
  }

  // 5. Body tidak meluber (tidak ada overflow horizontal di body)
  const bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const bodyClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  // Body scroll melebihi viewport = meluber
  expect(bodyScrollWidth - bodyClientWidth).toBeLessThan(50); // toleransi scrollbar
});
