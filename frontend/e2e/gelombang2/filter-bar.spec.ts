import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Spec komponen: <FilterBar> (Poin 5 Perluasan T16 — §12.17).
 * Diuji lewat SiswaListPage: search (q= ke server) + filter kelas.
 *
 * Desktop: search inline + <select> filter kelas langsung mengubah hasil.
 * Mobile: search full-width + tombol "Filter (n)" -> bottom sheet -> pilih
 * chip kelas -> Terapkan -> hasil terfilter + badge count muncul.
 */
test.describe('FilterBar (Poin 5 Perluasan T16)', () => {
  let kelasId: number;
  let kelasNama: string;
  let siswaDalamKelasNama: string;
  let siswaLuarKelasNama: string;
  const cleanupSiswaIds: number[] = [];

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    const suffix = Date.now();

    kelasNama = `FB-${suffix}`;
    const kelasRes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 7, nama: kelasNama } });
    kelasId = (await kelasRes.json()).id;

    siswaDalamKelasNama = `Siswa DalamKelas ${suffix}`;
    const s1 = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: siswaDalamKelasNama, nis: `FBIN${suffix}`.slice(0, 20), jenisKelamin: 'L', kelasId, status: 'aktif' },
    });
    cleanupSiswaIds.push((await s1.json()).id);

    siswaLuarKelasNama = `Siswa LuarKelas ${suffix}`;
    const s2 = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: siswaLuarKelasNama, nis: `FBOUT${suffix}`.slice(0, 20), jenisKelamin: 'P', status: 'aktif' },
    });
    cleanupSiswaIds.push((await s2.json()).id);
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const sid of cleanupSiswaIds) {
      await request.delete(`/api/admin/siswa/${sid}`, { headers }).catch(() => {});
    }
    await request.delete(`/api/admin/kelas/${kelasId}`, { headers }).catch(() => {});
  });

  test('Desktop: cari nama (q= ke server) menyempitkan hasil', async ({ page }) => {
    await page.goto('/kurikulum/orang/siswa');
    await expect(page.getByText(siswaDalamKelasNama).first()).toBeVisible();
    await expect(page.getByText(siswaLuarKelasNama).first()).toBeVisible();

    // Desktop-only input is visible; mobile-only copy stays hidden but is still
    // in the DOM (both share the same placeholder), so scope to the visible one.
    const searchBox = page.getByPlaceholder('Cari nama siswa...').locator('visible=true');
    await searchBox.fill(siswaDalamKelasNama);

    // Debounce/network — tunggu hasil menyempit
    await expect(page.getByText(siswaLuarKelasNama)).toHaveCount(0);
    await expect(page.getByText(siswaDalamKelasNama).first()).toBeVisible();
  });

  test('Mobile: tombol Filter(n) -> sheet -> pilih chip kelas -> terapkan -> hasil terfilter', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/kurikulum/orang/siswa');

    // Button's accessible name includes the material-icon ligature text
    // ("tune") before the visible "Filter" label, so match on substring.
    const filterBtn = page.getByRole('button', { name: /Filter/ });
    await filterBtn.click();

    await expect(page.getByText('Atur filter untuk mempersempit daftar')).toBeVisible();
    await page.getByRole('button', { name: kelasNama, exact: true }).click();
    await page.getByRole('button', { name: 'Terapkan' }).click();

    // Badge count "Filter" harus menunjukkan 1 filter aktif
    await expect(page.getByRole('button', { name: /Filter/ })).toContainText('1');

    // Hasil terfilter: hanya siswa dalam kelas ini yang muncul. Scope to the
    // visible copy — the (hidden) desktop table row for this student is also
    // in the DOM at mobile viewport width, and .first() would lock onto it.
    await expect(page.getByText(siswaDalamKelasNama).locator('visible=true').first()).toBeVisible();
    await expect(page.getByText(siswaLuarKelasNama).locator('visible=true')).toHaveCount(0);
  });
});

