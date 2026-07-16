import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { seedLibur, bulkHapusLibur } from '../helpers/api';

/**
 * Gelombang 1 — spec (b): libur-rentang.
 * Seed 3 tanggal BERURUTAN (hari 10-12 bulan depan) dgn keterangan sama
 * via API → halaman /admin/pengaturan/libur menampilkan SATU baris
 * tergabung berisi "(3 hari)" di daftar "Libur bulan ini" (setelah
 * navigasi ke bulan tsb.) → klik tombol hapus baris → ketiga tanggal
 * hilang dari kalender (verifikasi via API GET /admin/libur).
 */
test('libur: 3 tanggal beruntun tampil tergabung & hapus per baris', async ({ page, request }) => {
  const { accessToken } = await loginAsAdmin(page);

  // Bulan depan (aman dari edge-of-month rollover: hari 10-12 selalu ada).
  const now = new Date();
  const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const y = targetMonthDate.getFullYear();
  const m = targetMonthDate.getMonth(); // 0-indexed
  const pad = (n: number) => String(n).padStart(2, '0');
  const tanggal10 = `${y}-${pad(m + 1)}-10`;
  const tanggal11 = `${y}-${pad(m + 1)}-11`;
  const tanggal12 = `${y}-${pad(m + 1)}-12`;
  const keterangan = 'Testing E2E Rentang';

  // Bersih-bersih sebelum (jaga-jaga sisa run sebelumnya) & seed baru.
  await bulkHapusLibur(request, accessToken, [tanggal10, tanggal11, tanggal12]);
  for (const t of [tanggal10, tanggal11, tanggal12]) {
    await seedLibur(request, accessToken, t, keterangan);
  }

  await page.goto('/admin/pengaturan/libur');
  await expect(page.getByRole('heading', { name: 'Kalender Libur' })).toBeVisible();

  // Navigasi ke bulan target (selalu tepat satu klik "Bulan berikutnya"
  // dari bulan berjalan, karena target = now.month + 1).
  await page.getByLabel('Bulan berikutnya').click();

  // Baris tergabung "10–12 <Bulan> <Tahun> — Testing E2E Rentang (3 hari)"
  const row = page.locator('li', { hasText: keterangan });
  await expect(row).toBeVisible();
  await expect(row).toContainText('(3 hari)');

  // Klik tombol hapus baris rentang → konfirmasi → ketiga tanggal hilang.
  await row.getByRole('button', { name: /Hapus libur/ }).click();
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();

  await expect(row).toHaveCount(0);

  // Verifikasi via API: ketiga tanggal benar-benar terhapus dari DB.
  const res = await request.get('/api/admin/libur', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const list = await res.json();
  const remaining = list.filter((l: any) =>
    [tanggal10, tanggal11, tanggal12].includes(l.tanggal),
  );
  expect(remaining.length).toBe(0);
});
