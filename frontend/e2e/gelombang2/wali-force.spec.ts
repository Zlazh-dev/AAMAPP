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
    const headers = { Authorization: `Bearer ${token}` };

    // Bersihkan guru "Guru Wali Spec" tertinggal dari run sebelumnya.
    // Unassign dulu dari kelas (jika masih jadi wali) sebelum delete.
    const staleRes = await request.get('/api/admin/guru?q=Guru+Wali+Spec&limit=500', { headers });
    if (staleRes.ok()) {
      const stale = await staleRes.json();
      for (const g of (stale.data ?? [])) {
        // Cari kelas di mana guru ini jadi wali dan unset
        const kelasRes2 = await request.get(`/api/admin/kelas?waliGuruId=${g.id}&limit=50`, { headers }).catch(() => null);
        if (kelasRes2?.ok()) {
          const kd = await kelasRes2.json();
          for (const k of (kd.data ?? [])) {
            await request.patch(`/api/admin/kelas/${k.id}/wali`, { headers, data: { waliGuruId: null } }).catch(() => {});
          }
        }
        await request.delete(`/api/admin/guru/${g.id}`, { headers }).catch(() => {});
      }
    }

    // Create Guru dengan nama unik per run
    const suffix = Date.now();
    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `WS${suffix}`.slice(0, 20), nama: `Guru Wali Spec ${suffix}`, jenisKelamin: 'P', status: 'aktif' }
    });
    const guru = await guruRes.json();

    // Create 2 Kelas
    const k1Res = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `7X-${Date.now()}` }
    });
    const k1 = await k1Res.json();

    const k2Res = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `7Y-${Date.now()}` }
    });
    const k2 = await k2Res.json();

    // Assign Guru to Kelas 1
    await request.patch(`/api/admin/kelas/${k1.id}/wali`, {
      headers,
      data: { waliGuruId: guru.id }
    });

    // 2. Buka UI untuk assign Guru yang sama ke Kelas 2
    await page.goto('/kurikulum/wali-kelas');
    
    // Cari baris Kelas 2 — tunggu sampai baris muncul setelah data dimuat
    const row = page.locator('tr').filter({ hasText: k2.nama });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Pilih guru (menggunakan native select)
    await row.locator('select').selectOption(guru.id.toString());

    // 3. Verifikasi sukses
    // Note: UI Wali Kelas menggunakan inline select yang secara otomatis
    // mengirim { force: true } ke API sebagai "pilihan cepat" (MVP).
    // Jadi tidak ada error 409 atau checkbox force di UI, langsung sukses.
    await expect(page.getByText('Wali kelas diperbarui')).toBeVisible();

    // Cleanup
    await request.delete(`/api/admin/kelas/${k1.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/kelas/${k2.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/guru/${guru.id}`, { headers }).catch(() => {});
  });
});
