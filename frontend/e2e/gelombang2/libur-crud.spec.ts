import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { bulkHapusLibur } from '../helpers/api';

/**
 * T16-SPRINT lanjutan â€” Matriks Kalender Libur: seleksi tanggal + Tandai
 * Libur (via bar aksi UI), + Rentang (multi-tanggal via dialog), Hapus satu
 * baris rentang dari daftar "Libur bulan ini". Â§12.17e: tanggal unik per
 * run (jauh di masa depan, hindari collision antar spec) + cleanup via
 * API di afterEach.
 */
test.describe('Kalender Libur (Matriks T16 lanjutan)', () => {
  const createdTanggal: string[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    if (createdTanggal.length > 0) {
      await bulkHapusLibur(request, token as string, createdTanggal).catch(() => {});
    }
    createdTanggal.length = 0;
  });

  test('Tandai satu tanggal libur via seleksi + bar aksi; Hapus via daftar rentang', async ({ page, request }) => {
    // Tanggal H+ beberapa hari dari HARI INI, tetap di bulan yg SEDANG
    // ditampilkan kalender (default = bulan berjalan) -- supaya baris
    // "Libur bulan ini" langsung terlihat tanpa navigasi kalender manual.
    // Pakai jam+menit sbg bagian tanggal (mod 28) agar kecil kemungkinan
    // bentrok antar run tanpa keluar dari bulan berjalan.
    const now = new Date();
    const day = 1 + (Date.now() % 27); // 1..27, aman utk semua bulan
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Keterangan unik per tanggal â€” mencegah locator ambiguous bila spec
    // sebelumnya meninggalkan baris dengan keterangan generik yang sama.
    const keterangan = `Libur Uji E2E ${dateStr}`;

    // Bersihkan sisa run sebelumnya untuk tanggal ini sebelum test dimulai,
    // sehingga halaman tidak menampilkan baris lama yang dapat membuat
    // locator tombol Hapus menjadi tidak unik (strict mode violation).
    const tokenPre = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    await bulkHapusLibur(request, tokenPre as string, [dateStr]).catch(() => {});

    createdTanggal.push(dateStr);

    await page.goto('/tu/pengaturan/libur');
    await expect(page.getByRole('heading', { name: 'Kalender Libur' })).toBeVisible();

    // Pilih tanggal via dialog "+ Rentang" (mulai=selesai=1 hari) -- lebih
    // cepat & andal drpd menavigasi kalender bulan demi bulan ke tahun jauh.
    await page.getByRole('button', { name: '+ Rentang' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Rentang ke Seleksi' })).toBeVisible();
    await page.locator('#range-start').fill(dateStr);
    await page.locator('#range-end').fill(dateStr);
    await page.getByRole('button', { name: 'add Tambahkan ke Seleksi' }).click();
    await expect(page.getByText('1 tanggal terpilih')).toBeVisible();

    // Tandai Libur via bar aksi -> dialog -> isi keterangan -> Simpan.
    await page.getByRole('button', { name: /Tandai Libur/ }).click();
    await expect(page.getByRole('heading', { name: 'Tandai Libur' })).toBeVisible();
    await page.getByLabel('Keterangan (untuk semua tanggal ini)').fill(keterangan);
    await page.getByRole('button', { name: 'event_available Simpan' }).click();
    await expect(page.getByText(/ditandai libur/i)).toBeVisible();

    // Tanggal kini tampil merah (libur) + muncul di daftar "Libur bulan ini".
    await expect(page.getByTestId(`libur-day-${dateStr}`)).toHaveAttribute('title', keterangan);
    await expect(page.getByText(keterangan)).toBeVisible();

    // Hapus via tombol delete pada baris "Libur bulan ini" yang sesuai.
    // Locator di-scope ke baris (li) yg berisi keterangan unik ini,
    // sehingga selalu single-match meski ada baris libur lain di halaman.
    const liburRow = page.locator('li').filter({ hasText: keterangan });
    await liburRow.getByRole('button', { name: /Hapus libur/ }).click();
    await expect(page.getByRole('button', { name: 'Hapus', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hapus', exact: true }).click();
    await expect(page.getByText(/tanggal libur dihapus/i)).toBeVisible();
    await expect(page.getByText(keterangan)).not.toBeVisible();

    createdTanggal.length = 0; // sudah dihapus via UI, jangan dobel-hapus
  });

  test('+ Rentang menambah beberapa tanggal ke seleksi sekaligus', async ({ page }) => {
    const year = 2099;
    const start = `${year}-04-01`;
    const end = `${year}-04-03`;
    createdTanggal.push(`${year}-04-01`, `${year}-04-02`, `${year}-04-03`);

    await page.goto('/tu/pengaturan/libur');
    await page.getByRole('button', { name: '+ Rentang' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Rentang ke Seleksi' })).toBeVisible();
    await page.locator('#range-start').fill(start);
    await page.locator('#range-end').fill(end);
    await page.getByRole('button', { name: 'add Tambahkan ke Seleksi' }).click();
    await expect(page.getByText(/3 tanggal ditambahkan ke seleksi/i)).toBeVisible();
    await expect(page.getByText('3 tanggal terpilih')).toBeVisible();

    // Bersihkan seleksi tanpa menyimpan -> tak perlu cleanup API (tak jadi dibuat).
    await page.getByRole('button', { name: 'Batal' }).click();
    createdTanggal.length = 0;
  });
});
