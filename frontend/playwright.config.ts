import { defineConfig, devices } from '@playwright/test';

/**
 * Konfigurasi Playwright (T15.9 — §12.17).
 * - Chromium saja (keputusan user — cukup utk sekolah, hemat waktu CI).
 * - baseURL http://localhost (stack docker compose HARUS up: `docker
 *   compose up -d --build` sebelum menjalankan test).
 * - storageState per-role dibuat oleh e2e/helpers/auth.ts (login via API),
 *   BUKAN dengan mengetik form login di setiap spec (§12.17e).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // data uji dibuat/dibersihkan via API — hindari race antar spec
  forbidOnly: !!process.env.CI,
  retries: 0, // test flaky = bug, bukan retry (§12.17c)
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testIgnore: /.*\.mobile\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],
});
