import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * T16-SPRINT lanjutan — Matriks Akun: tambah akun (RoleSelector) -> ubah
 * peran -> hapus akun. Persetujuan/penolakan pendaftar via
 * conditional-skip: pendaftaran memakai Google OAuth (`register-google`)
 * yang memerlukan GOOGLE_CLIENT_ID -- di lingkungan dev/CI variabel ini
 * kosong (`throw 'Login Google belum dikonfigurasi'`), jadi tak ada jalur
 * API untuk men-seed user berstatus 'pending' tanpa kredensial Google
 * asli. §12.17e: email unik per run + cleanup via API di afterEach.
 */
test.describe('Akun (Matriks T16 lanjutan)', () => {
  const createdIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    for (const id of createdIds) {
      await request.delete(`/api/admin/users/${id}`, { headers }).catch(() => {});
    }
    createdIds.length = 0;
  });

  test('Tambah akun (RoleSelector) -> ubah peran via edit -> hapus akun', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    const suffix = Date.now();
    const email = `uji.akun.${suffix}@aamapp.sch.id`;
    const nama = `Uji Akun ${suffix}`;

    // 1. Tambah akun via form -> pilih peran Guru via RoleSelector.
    await page.goto('/admin/akun/baru');
    await expect(page.getByRole('heading', { name: 'Tambah Akun' })).toBeVisible();
    await page.locator('input[placeholder="Nama lengkap"]').fill(nama);
    await page.locator('input[placeholder="nama@sekolah.sch.id"]').fill(email);
    await page.locator('input[placeholder="Minimal 8 karakter"]').fill('password123');
    await page.getByText('Guru', { exact: true }).click();
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.getByText(new RegExp(`Akun ${nama} berhasil dibuat`))).toBeVisible({ timeout: 10000 });

    // Ambil id akun baru utk navigasi & cleanup.
    const listRes = await request.get(`/api/admin/users?q=${encodeURIComponent(email)}`, { headers });
    const listBody = await listRes.json();
    const users = listBody.data ?? listBody;
    const created = users.find((u: any) => u.email === email);
    expect(created).toBeTruthy();
    createdIds.push(created.id);

    // Verifikasi peran Guru tersimpan.
    expect(created.roles).toContain('guru');

    // 2. Ubah peran via halaman Edit: tambah Staf Kurikulum, hapus Guru.
    await page.goto(`/admin/akun/${created.id}/edit`);
    await expect(page.getByRole('heading', { name: 'Edit Akun' })).toBeVisible();
    await page.getByText('Guru', { exact: true }).click(); // un-toggle
    await page.getByText('Staf Kurikulum', { exact: true }).click(); // toggle on
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.getByText(/Akun berhasil diperbarui/)).toBeVisible({ timeout: 10000 });

    const afterEdit = await (await request.get(`/api/admin/users/${created.id}`, { headers })).json();
    expect(afterEdit.roles).toContain('kurikulum');
    expect(afterEdit.roles).not.toContain('guru');

    // 3. Hapus akun via PageMenu (overflow ⋮) di halaman detail.
    await page.goto(`/admin/akun/${created.id}`);
    await expect(page.getByRole('heading', { name: nama })).toBeVisible();
    await page.getByRole('button', { name: 'Menu halaman' }).click();
    await page.getByText('Hapus Akun Ini').click();
    await expect(page.getByRole('heading', { name: 'Hapus Akun' })).toBeVisible();
    await page.getByRole('button', { name: 'Hapus', exact: true }).click();
    await expect(page.getByText(/Akun berhasil dihapus/)).toBeVisible();
    await page.waitForURL('**/admin/akun');

    createdIds.length = 0; // sudah dihapus via UI
  });

  test.skip('Setujui/Tolak pendaftar via halaman Persetujuan (butuh GOOGLE_CLIENT_ID utk seed via register-google — tidak tersedia di lingkungan ini)', async () => {
    // Conditional-skip resmi: pendaftaran hanya via Google OAuth
    // (POST /api/auth/register-google) yg memvalidasi idToken via
    // GoogleClient -- tanpa GOOGLE_CLIENT_ID/kredensial nyata, tak ada
    // jalur utk membuat user status='pending' dari e2e. Jika kelak ada
    // endpoint seed test-only atau GOOGLE_CLIENT_ID tersedia di CI,
    // aktifkan kembali test ini.
  });
});
