import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * T16-SPRINT lanjutan — Matriks Tahun Ajaran: tambah (SaveSuccess route) ->
 * AKTIFKAN (ConfirmDialog tegas) -> hanya 1 aktif -> hapus TA aktif = 409
 * (tombol Hapus dinonaktifkan di UI utk TA aktif; tetap uji ConfirmDialog
 * hapus utk TA non-aktif berjalan normal). §12.17e: nama TA unik per run
 * (tahun acak jauh dr data nyata) + cleanup via API di afterEach.
 */
test.describe('Tahun Ajaran (Matriks T16 lanjutan)', () => {
  const createdTaIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const id of createdTaIds) {
      await request.delete(`/api/admin/tahun-ajaran/${id}`, { headers }).catch(() => {});
    }
    createdTaIds.length = 0;
  });

  test('Tambah TA (SaveSuccess) -> Aktifkan (ConfirmDialog) -> hanya 1 aktif; hapus TA aktif = 409 (via API)', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };

    // Tahun acak besar (2100-an) agar unik antar run & tak bentrok TA nyata.
    const yearBase = 2100 + Math.floor(Math.random() * 50);
    const nama = `${yearBase}/${yearBase + 1}`;

    // 1. Tambah via form -> SaveSuccess route.
    await page.goto('/admin/pengaturan/tahun-ajaran');
    await expect(page.getByRole('heading', { name: 'Tahun Ajaran', level: 2 })).toBeVisible();
    await page.getByRole('button', { name: 'add Tambah Tahun Ajaran' }).click();
    await page.waitForURL('**/admin/pengaturan/tahun-ajaran/baru');
    await page.locator('#ta-nama').fill(nama);
    await page.getByRole('button', { name: 'save Simpan' }).click();

    // SaveSuccess route menampilkan entityName.
    await expect(page.getByText(new RegExp(`${nama.replace('/', '\\/')} Semester Ganjil`))).toBeVisible({ timeout: 10000 });

    // Cari id TA yg baru dibuat utk cleanup + verifikasi lanjutan via API.
    const listRes = await request.get('/api/admin/tahun-ajaran', { headers });
    const list = await listRes.json();
    const created = list.find((t: any) => t.nama === nama && t.semester === 1);
    expect(created).toBeTruthy();
    createdTaIds.push(created.id);

    // 2. Kembali ke daftar -> Aktifkan via ConfirmDialog tegas.
    await page.goto('/admin/pengaturan/tahun-ajaran');
    const row = page.locator('tr', { hasText: nama });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /Aktifkan/ }).click();
    await expect(page.getByRole('heading', { name: 'Aktifkan Tahun Ajaran?' })).toBeVisible();
    await expect(page.getByText(/akan menonaktifkan tahun ajaran aktif saat ini/i)).toBeVisible();
    await page.getByRole('button', { name: 'Ya, Aktifkan' }).click();
    await expect(page.getByText(new RegExp(`${nama.replace('/', '\\/')} Semester 1 diaktifkan`))).toBeVisible();

    // 3. Hanya 1 aktif -- verifikasi via API.
    const afterActivate = await (await request.get('/api/admin/tahun-ajaran', { headers })).json();
    const activeRows = afterActivate.filter((t: any) => t.aktif);
    expect(activeRows.length).toBe(1);
    expect(activeRows[0].id).toBe(created.id);

    // 4. Hapus TA yang SEDANG AKTIF = 409 (tombol Hapus dinonaktifkan di
    // UI -- verifikasi disabled DAN verifikasi backend menolak via API).
    await page.reload();
    const activeRow = page.locator('tr', { hasText: nama });
    await expect(activeRow.getByRole('button', { name: 'Hapus' })).toBeDisabled();

    const delRes = await request.delete(`/api/admin/tahun-ajaran/${created.id}`, { headers });
    expect(delRes.status()).toBe(409);

    // Nonaktifkan lagi TA lain (kembalikan yg lama aktif) sebelum cleanup,
    // supaya TA test bisa dihapus & environment lain tak terganggu.
    const otherActive = afterActivate.find((t: any) => t.id !== created.id);
    if (otherActive) {
      await request.post(`/api/admin/tahun-ajaran/${otherActive.id}/aktifkan`, { headers });
    }
  });
});
