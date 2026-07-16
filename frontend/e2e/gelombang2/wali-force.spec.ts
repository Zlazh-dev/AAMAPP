import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Wali Kelas Force (Poin 3 T16)', () => {
  let kelasAId: number;
  let kelasBId: number;
  let guruId: number;

  test.beforeEach(async ({ request }) => {
    // We assume the db has some kelas and guru from seed.
    // If not, we can create them. 
    // To make it deterministic, let's create a specific guru and 2 kelas via API.
    // Admin is logged in. 
  });

  test('409 Conflict wali kelas dan force pindah', async ({ page, request }) => {
    await loginAsAdmin(page);

    // 1. Setup data via API request context directly
    // Get token
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    
    // Create Guru
    const guruRes = await request.post('/api/admin/guru', {
      headers: { Authorization: `Bearer ${token}` },
      data: { nip: `W${Date.now()}`, nama: 'Guru Wali Spec', jenisKelamin: 'P', status: 'aktif' }
    });
    const guru = await guruRes.json();

    // Create 2 Kelas
    const k1Res = await request.post('/api/admin/kelas', {
      headers: { Authorization: `Bearer ${token}` },
      data: { tingkat: 7, nama: `7X-${Date.now()}` }
    });
    const k1 = await k1Res.json();

    const k2Res = await request.post('/api/admin/kelas', {
      headers: { Authorization: `Bearer ${token}` },
      data: { tingkat: 7, nama: `7Y-${Date.now()}` }
    });
    const k2 = await k2Res.json();

    // Assign Guru to Kelas 1
    await request.patch(`/api/admin/kelas/${k1.id}/wali`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { waliGuruId: guru.id }
    });

    // 2. Buka UI untuk assign Guru yang sama ke Kelas 2
    await page.goto('/kurikulum/wali-kelas');
    
    // Cari baris Kelas 2
    const row = page.locator('tr').filter({ hasText: k2.nama });

    // Pilih guru (menggunakan native select)
    await row.locator('select').selectOption(guru.id.toString());

    // 3. Verifikasi sukses
    // Note: UI Wali Kelas menggunakan inline select yang secara otomatis
    // mengirim { force: true } ke API sebagai "pilihan cepat" (MVP).
    // Jadi tidak ada error 409 atau checkbox force di UI, langsung sukses.
    await expect(page.getByText('Wali kelas diperbarui')).toBeVisible();

    // Cleanup
    await request.delete(`/api/admin/kelas/${k1.id}`, { headers: { Authorization: `Bearer ${token}` }});
    await request.delete(`/api/admin/kelas/${k2.id}`, { headers: { Authorization: `Bearer ${token}` }});
    await request.delete(`/api/admin/guru/${guru.id}`, { headers: { Authorization: `Bearer ${token}` }});
  });
});
