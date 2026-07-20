import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { bulkHapusLibur } from '../helpers/api';

/**
 * Gelombang 1 â€” spec (c): libur-seleksi.
 * Klik 3 tanggal (toggle seleksi, TANPA membuka dialog langsung â€” pola
 * rev.2 Â§14.10.4) â†’ bar aksi "3 tanggal terpilih" muncul â†’ "Tandai Libur"
 * â†’ isi keterangan â†’ tersimpan (sel berubah merah) â†’ regresi "+ Rentang":
 * menambah rentang tanggal LAIN ke seleksi dgn benar (union, bukan replace).
 */
test('libur: seleksi-multi tandai + regresi tombol + Rentang', async ({ page, request }) => {
  const { accessToken } = await loginAsAdmin(page);

  const now = new Date();
  const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const y = targetMonthDate.getFullYear();
  const m = targetMonthDate.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = [15, 16, 17];
  const tanggalList = days.map((d) => `${y}-${pad(m + 1)}-${pad(d)}`);
  const rentangDays = [20, 21];
  const rentangTanggal = rentangDays.map((d) => `${y}-${pad(m + 1)}-${pad(d)}`);

  // Bersihkan sisa run sebelumnya.
  await bulkHapusLibur(request, accessToken, [...tanggalList, ...rentangTanggal]);

  await page.goto('/admin/pengaturan/libur');
  await page.getByLabel('Bulan berikutnya').click();

  // Klik 3 tanggal â†’ toggle seleksi (bukan dialog langsung).
  for (const d of days) {
    await page.getByRole('button', { name: String(d), exact: true }).click();
  }
  await expect(page.getByText('3 tanggal terpilih')).toBeVisible();

  // "+ Rentang" menambah SELEKSI (union) â€” regresi seleksi-multi.
  await page.getByRole('button', { name: '+ Rentang' }).click();
  await page.locator('#range-start').fill(rentangTanggal[0]);
  await page.locator('#range-end').fill(rentangTanggal[1]);
  await page.getByRole('button', { name: 'Tambahkan ke Seleksi' }).click();

  // 3 + 2 = 5 tanggal terpilih (union, bukan menimpa 3 yang sudah ada).
  await expect(page.getByText('5 tanggal terpilih')).toBeVisible();

  // Tandai Libur (5) â†’ isi keterangan â†’ simpan.
  await page.getByRole('button', { name: /Tandai Libur \(5\)/ }).click();
  await page.locator('#libur-keterangan').fill('Testing E2E Seleksi');
  await page.getByRole('button', { name: 'Simpan' }).click();

  // Bar aksi tertutup (seleksi dibersihkan) & tanggal kini merah (libur).
  await expect(page.getByText('5 tanggal terpilih')).toHaveCount(0);
  // After marking libur, button accessible name changes to "N event_busy"
  // (the icon text appended). Match with regex and verify title attribute.
  for (const d of days) {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${d}\\b`) }),
    ).toHaveAttribute('title', 'Testing E2E Seleksi');
  }

  // Verifikasi via API: 5 baris tersimpan dgn keterangan yang benar.
  const res = await request.get('/api/admin/libur', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const list = await res.json();
  const saved = list.filter((l: any) =>
    [...tanggalList, ...rentangTanggal].includes(l.tanggal),
  );
  expect(saved.length).toBe(5);
  expect(saved.every((l: any) => l.keterangan === 'Testing E2E Seleksi')).toBe(true);

  // Bersih-bersih data uji.
  await bulkHapusLibur(request, accessToken, [...tanggalList, ...rentangTanggal]);
});
