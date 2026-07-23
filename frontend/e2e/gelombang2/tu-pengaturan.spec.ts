import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test('TU-PENGATURAN: satu halaman 4 section, nol sub-link, nol BackLink', async ({ page }) => {
  await page.goto('/login');
  await loginAsAdmin(page);
  await page.goto('/tu/pengaturan');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 1. 4 section ada
  await expect(page.locator('#pengaturan-jam')).toBeVisible();
  await expect(page.locator('#pengaturan-libur')).toBeVisible();
  await expect(page.locator('#pengaturan-lokasi')).toBeVisible();
  await expect(page.locator('#pengaturan-sekolah')).toBeVisible();

  // 2. Nol sub-link ke /tu/pengaturan/*
  const subLinks = await page.locator('a[href^="/tu/pengaturan/"]').count();
  expect(subLinks).toBe(0);

  // 3. Nol BackLink dalam section (BackLink component has class "back-link" or text "←")
  const backLinks = await page.locator('a:has-text("←")').count();
  expect(backLinks).toBe(0);

  // 4. Heading section ada
  await expect(page.getByText('Jam Presensi')).toBeVisible();
  await expect(page.getByText('Kalender Libur')).toBeVisible();
  await expect(page.getByText('Lokasi Presensi')).toBeVisible();
  await expect(page.getByText('Profil Sekolah')).toBeVisible();
});

test('TU-PENGATURAN: rute lama ter-redirect ke /tu/pengaturan', async ({ page }) => {
  await page.goto('/login');
  await loginAsAdmin(page);

  for (const sub of ['jam', 'libur', 'lokasi', 'sekolah']) {
    await page.goto(`/tu/pengaturan/${sub}`);
    await page.waitForURL('**/tu/pengaturan');
    expect(page.url()).toMatch(/\/tu\/pengaturan$/);
  }
});
