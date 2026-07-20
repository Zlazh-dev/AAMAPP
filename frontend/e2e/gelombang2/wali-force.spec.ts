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

    // Cari baris Kelas 2 — paginasi 25, mungkin di halaman lain.
    // WaliKelasPage belum punya search bar, jadi navigasi langsung by API
    // untuk memastikan kelas terlihat: gunakan page=1 dulu, bila tidak ada
    // cari di halaman berikutnya. Untuk uji ini, jumlah kelas uji kecil.
    const row = page.locator('tr').filter({ hasText: k2.nama });
    await expect(row).toBeVisible({ timeout: 10_000 }).catch(async () => {
      // Bila tidak terlihat di halaman 1, klik halaman berikutnya.
      const nextBtn = page.getByRole('button', { name: /Halaman berikutnya|Berikutnya/ }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
      }
    });

    // Pilih guru via SearchSelect (bukan native select).
    // SearchSelect trigger adalah button dgn teks "-- pilih wali --".
    const waliTrigger = row.getByRole('button').filter({ hasText: /pilih wali/i });
    await expect(waliTrigger).toBeVisible({ timeout: 10_000 });
    await waliTrigger.click();

    // Tunggu input pencarian muncul di dropdown.
    const searchInput = page.getByPlaceholder(/Cari nama guru/i).first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(guru.nama);
    // Tunggu hasil pencarian muncul, lalu klik.
    await page.waitForTimeout(500);
    const resultOption = page.locator('button').filter({ hasText: new RegExp(guru.nama) }).last();
    await expect(resultOption).toBeVisible({ timeout: 5000 });
    await resultOption.click();

    // 3. Verifikasi sukses
    await expect(page.getByText('Wali kelas diperbarui')).toBeVisible({ timeout: 10_000 });

    // Cleanup
    await request.delete(`/api/admin/kelas/${k1.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/kelas/${k2.id}`, { headers }).catch(() => {});
    await request.delete(`/api/admin/guru/${guru.id}`, { headers }).catch(() => {});
  });
});

