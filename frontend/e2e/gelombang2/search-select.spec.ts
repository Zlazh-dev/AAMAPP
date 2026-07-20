import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Spec komponen: <SearchSelect> (Poin 2 Perluasan T16 â€” Â§12.17).
 * Diuji lewat KelasDetailPage (kartu "Wali Kelas" â€” SearchSelect guru).
 *
 * Desktop: ketik cari â†’ hasil menyempit â†’ pilih â†’ dropdown tertutup.
 * Mobile: trigger membuka BOTTOM SHEET, search box DI DALAM sheet.
 */
test.describe('SearchSelect (Poin 2 Perluasan T16)', () => {
  let kelasId: number;
  let guruNama: string;

  let guruId: number;

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };

    // Bersihkan guru "Guru SearchSelect" yang tertinggal dari run sebelumnya.
    // Tanpa ini, 200+ guru terakumulasi dan menggeser guru baru dari limit=200.
    const staleRes = await request.get('/api/admin/guru?q=Guru+SearchSelect&limit=500', { headers });
    if (staleRes.ok()) {
      const stale = await staleRes.json();
      for (const g of (stale.data ?? [])) {
        await request.delete(`/api/admin/guru/${g.id}`, { headers }).catch(() => {});
      }
    }

    guruNama = `Guru SearchSelect ${Date.now()}`;
    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: { nama: guruNama, jenisKelamin: 'P', status: 'aktif' },
    });
    expect(guruRes.ok()).toBeTruthy();
    const guru = await guruRes.json();
    guruId = guru.id;

    const kelasRes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 8, nama: `SS-${Date.now()}` },
    });
    expect(kelasRes.ok()).toBeTruthy();
    const kelas = await kelasRes.json();
    kelasId = kelas.id;
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    if (guruId) {
      await request.delete(`/api/admin/guru/${guruId}`, { headers }).catch(() => {});
    }
    if (kelasId) {
      await request.delete(`/api/admin/kelas/${kelasId}`, { headers }).catch(() => {});
    }
  });

  test('Desktop: ketik cari -> hasil menyempit -> pilih -> dropdown tertutup', async ({ page }) => {
    await page.goto(`/kurikulum/kelas/${kelasId}`);
    await expect(page.getByRole('heading', { name: 'Wali Kelas' })).toBeVisible();

    const trigger = page.getByRole('button', { name: 'Pilih wali kelas...' });
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();

    const searchBox = page.getByPlaceholder('Cari nama guru...');
    await expect(searchBox).toBeVisible();

    // Tunggu opsi dimuat (loadAll async) â€” cek ada konten dropdown
    await expect(
      page.locator('[placeholder="Cari nama guru..."]').or(page.getByText('Tidak ada hasil')).first(),
    ).toBeVisible({ timeout: 8_000 });

    // Ketik prefix unik dari nama guru yang dibuat -> hasil menyempit ke 1.
    const prefix = guruNama.slice(0, 15);
    await searchBox.fill(prefix);
    await expect(page.getByRole('button', { name: new RegExp(guruNama) }).first()).toBeVisible({ timeout: 8_000 });

    // Pilih -> dropdown tertutup, trigger menampilkan nama terpilih.
    await page.getByRole('button', { name: new RegExp(guruNama) }).first().click();
    await expect(searchBox).toHaveCount(0);
    await expect(page.getByRole('button', { name: new RegExp(guruNama) })).toBeVisible();
  });

  test('Mobile: trigger membuka bottom sheet, cari di dalam sheet', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/kurikulum/kelas/${kelasId}`);
    await expect(page.getByRole('heading', { name: 'Wali Kelas' })).toBeVisible();

    const trigger = page.getByRole('button', { name: 'Pilih wali kelas...' });
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();

    // Bottom sheet: search box + hasil ada DI DALAM sheet (bukan dropdown desktop).
    const searchBox = page.getByPlaceholder('Cari nama guru...');
    await expect(searchBox).toBeVisible({ timeout: 5_000 });

    // Tunggu minimal 1 opsi tampil sebelum filter (loadAll mungkin belum selesai)
    await expect(
      page.locator('[placeholder="Cari nama guru..."]').or(page.getByText('Tidak ada hasil')).first(),
    ).toBeVisible({ timeout: 8_000 });

    const prefix = guruNama.slice(0, 15);
    await searchBox.fill(prefix);
    const option = page.getByRole('button', { name: new RegExp(guruNama) }).first();
    await expect(option).toBeVisible({ timeout: 8_000 });
    await option.click();
    await expect(searchBox).toHaveCount(0);
  });
});

