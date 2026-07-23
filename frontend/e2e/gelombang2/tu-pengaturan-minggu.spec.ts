import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test('TU-PENGATURAN A: Minggu merah tanpa baris DB', async ({ page }) => {
  await page.goto('/login');
  await loginAsAdmin(page);
  await page.goto('/tu/pengaturan');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Navigasi ke Januari 2027 (bulan jauh di masa depan, pasti tidak ada LU Minggu)
  const nextBtn = page.locator('button[aria-label="Bulan berikutnya"]');
  for (let i = 0; i < 18; i++) {
    await nextBtn.click().catch(() => {});
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(500);

  // Cari sel Minggu — gunakan selector yang fleksibel
  // Cari sel merah dengan title "Minggu"
  const sundayRedCells = page.locator('[data-testid^="libur-day-"][title="Minggu"]');
  const sundayCount = await sundayRedCells.count();
  expect(sundayCount).toBeGreaterThan(0);

  // Verifikasi sel pertama ber-class red
  const firstSunday = sundayRedCells.first();
  const cls = await firstSunday.getAttribute('class');
  expect(cls).toContain('bg-red-50');
});
