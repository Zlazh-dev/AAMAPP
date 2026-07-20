import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * SearchSelect async + paginasi kesiswaan — bukti jaringan (Tahap 3).
 *
 * 1. SearchSelect mengirim q= ke server (bukan menyaring 200 baris di browser).
 * 2. VerifikasiPage memakai limit=25 (bukan 50).
 * 3. TataTertibPage memakai limit=25 (bukan 100).
 */

const ADMIN_EMAIL = 'e2e-admin@aamapp.sch.id';
const ADMIN_PASS = 'e2e-admin-pass';

test.describe('SearchSelect async + paginasi kesiswaan', () => {
  test('SearchSelect siswa mengirim q= ke server (bukan filter browser)', async ({ page }) => {
    let siswaRequestUrl: string | null = null;
    let siswaRequestQ: string | null = null;
    let siswaRequestLimit: string | null = null;

    await page.route('**/api/admin/siswa?**', async (route) => {
      const url = new URL(route.request().url());
      siswaRequestUrl = url.toString();
      siswaRequestQ = url.searchParams.get('q');
      siswaRequestLimit = url.searchParams.get('limit');
      await route.continue();
    });

    await loginAsAdmin(page);
    await page.goto('/kesiswaan/pelanggaran');
    await page.waitForLoadState('networkidle');

    // "Catat Pelanggaran" adalah primary action — tampil inline di desktop.
    await page.getByRole('button', { name: /Catat Pelanggaran/i }).click();

    // Klik trigger SearchSelect siswa ("Cari dan pilih siswa...").
    const siswaTrigger = page.getByText('Cari dan pilih siswa...').first();
    await expect(siswaTrigger).toBeVisible({ timeout: 10_000 });
    await siswaTrigger.click();

    // Sekarang input pencarian terlihat — ketik query.
    const siswaInput = page.getByPlaceholder(/Ketik nama\/NIS siswa/i).first();
    await expect(siswaInput).toBeVisible({ timeout: 5000 });
    await siswaInput.fill('Budi');

    // Tunggu request ke server (debounce 300ms).
    await page.waitForTimeout(600);

    // Permintaan membawa q=Budi (bukan ambil semua 200 lalu saring).
    expect(siswaRequestUrl).not.toBeNull();
    expect(siswaRequestQ).toBe('Budi');
    // Limit <= 20 (bukan 200).
    expect(parseInt(siswaRequestLimit ?? '999', 10)).toBeLessThanOrEqual(20);
  });

  test('VerifikasiPage memakai limit=25 (bukan 50)', async ({ page }) => {
    let capturedLimit: string | null = null;

    await page.route('**/api/kesiswaan/verifikasi?**', async (route) => {
      const url = new URL(route.request().url());
      capturedLimit = url.searchParams.get('limit');
      await route.continue();
    });

    await loginAsAdmin(page);
    await page.goto('/kesiswaan/verifikasi');
    await page.waitForLoadState('networkidle');

    expect(capturedLimit).toBe('25');
  });

  test('TataTertibPage memakai limit=25 (bukan 100)', async ({ page }) => {
    let capturedLimit: string | null = null;

    await page.route('**/api/kesiswaan/katalog?**', async (route) => {
      const url = new URL(route.request().url());
      capturedLimit = url.searchParams.get('limit');
      await route.continue();
    });

    await loginAsAdmin(page);
    await page.goto('/kesiswaan/tata-tertib');
    await page.waitForLoadState('networkidle');

    expect(capturedLimit).toBe('25');
  });

  test('LaporanDemeritPage memakai limit=25 (bukan 200)', async ({ page }) => {
    let capturedLimit: string | null = null;

    await page.route('**/api/kesiswaan/laporan/demerit?**', async (route) => {
      const url = new URL(route.request().url());
      capturedLimit = url.searchParams.get('limit');
      await route.continue();
    });

    await loginAsAdmin(page);
    await page.goto('/kesiswaan/laporan');
    await page.waitForLoadState('networkidle');

    expect(capturedLimit).toBe('25');
  });
});