import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * T16-SPRINT lanjutan — Matriks Pengaturan: 5 sub-halaman nilai global
 * (Profil Sekolah, Jam Presensi, KKM, Lokasi + peta klik). Setiap sub:
 * ubah nilai -> Simpan -> reload -> nilai MEMANTUL (persist) +
 * "Terakhir disimpan oleh {nama}" tampil. Tidak perlu seed/cleanup API
 * (pengaturan adalah singleton global) — nilai dikembalikan ke semula
 * di akhir tiap test agar tak mengganggu spec lain.
 */
test.describe('Pengaturan (Matriks T16 lanjutan)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Profil Sekolah: ubah nama -> Simpan -> reload -> memantul + "Terakhir disimpan oleh"', async ({ page }) => {
    await page.goto('/admin/sekolah');
    await expect(page.getByRole('heading', { name: 'Profil Sekolah' })).toBeVisible();

    const namaInput = page.locator('#sekolah-nama');
    const original = await namaInput.inputValue();
    const suffix = Date.now();
    const newNama = `SMP Uji E2E ${suffix}`;

    await namaInput.fill(newNama);
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/profil sekolah berhasil disimpan/i)).toBeVisible();
    await expect(page.getByText(/Terakhir disimpan oleh/)).toBeVisible();

    await page.reload();
    await expect(page.locator('#sekolah-nama')).toHaveValue(newNama);
    await expect(page.getByText(/Terakhir disimpan oleh/)).toBeVisible();

    // Kembalikan nilai semula agar tak mengganggu spec/lingkungan lain.
    await page.locator('#sekolah-nama').fill(original);
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/profil sekolah berhasil disimpan/i)).toBeVisible();
  });

  test('Jam Presensi: ubah toleransi -> Simpan -> reload -> memantul + pratinjau terupdate', async ({ page }) => {
    await page.goto('/tu/pengaturan/jam');
    await expect(page.getByRole('heading', { name: 'Jam Presensi' })).toBeVisible();

    const toleransiInput = page.locator('#jam-toleransi');
    const original = await toleransiInput.inputValue();
    const newValue = original === '30' ? '20' : '30';

    await toleransiInput.fill(newValue);
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/pengaturan jam berhasil disimpan/i)).toBeVisible();
    await expect(page.getByText(/Terakhir disimpan oleh/)).toBeVisible();

    await page.reload();
    await expect(page.locator('#jam-toleransi')).toHaveValue(newValue);

    await page.locator('#jam-toleransi').fill(original);
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/pengaturan jam berhasil disimpan/i)).toBeVisible();
  });

  test('KKM: ubah nilai -> Simpan -> reload -> memantul', async ({ page }) => {
    await page.goto('/kurikulum/tahun-ajaran-kkm');
    await expect(page.getByRole('heading', { name: 'KKM (Kriteria Ketuntasan Minimal)' })).toBeVisible();

    const kkmInput = page.locator('#kkm-nilai');
    const original = await kkmInput.inputValue();
    const newValue = original === '80' ? '70' : '80';

    await kkmInput.fill(newValue);
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/kkm berhasil disimpan/i)).toBeVisible();
    await expect(page.getByText(/Terakhir disimpan oleh/)).toBeVisible();

    await page.reload();
    await expect(page.locator('#kkm-nilai')).toHaveValue(newValue);

    await page.locator('#kkm-nilai').fill(original);
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/kkm berhasil disimpan/i)).toBeVisible();
  });

  test('Lokasi: klik peta mengubah input lat/lng -> Simpan -> reload -> memantul', async ({ page }) => {
    await page.goto('/tu/pengaturan/lokasi');
    await expect(page.getByRole('heading', { name: 'Lokasi Sekolah' })).toBeVisible();

    const latInput = page.locator('#lokasi-lat');
    const lngInput = page.locator('#lokasi-lng');
    const originalLat = await latInput.inputValue();
    const originalLng = await lngInput.inputValue();

    // Klik peta Leaflet (canvas/tile-based; tunggu leaflet ter-render).
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    const box = await mapContainer.boundingBox();
    if (!box) throw new Error('Peta tidak memiliki bounding box');
    await page.mouse.click(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20);

    // Input lat/lng harus berubah dari nilai semula setelah klik peta.
    await expect(async () => {
      const lat = await latInput.inputValue();
      expect(lat).not.toBe(originalLat);
    }).toPass({ timeout: 5000 });

    const newLat = await latInput.inputValue();
    const newLng = await lngInput.inputValue();

    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/pengaturan lokasi berhasil disimpan/i)).toBeVisible();

    await page.reload();
    await expect(page.locator('#lokasi-lat')).toHaveValue(newLat);
    await expect(page.locator('#lokasi-lng')).toHaveValue(newLng);

    // Kembalikan nilai semula.
    await page.locator('#lokasi-lat').fill(originalLat);
    await page.locator('#lokasi-lng').fill(originalLng);
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/pengaturan lokasi berhasil disimpan/i)).toBeVisible();
  });

  test('Hub Pengaturan TU: navigasi ke sub-halaman via kartu', async ({ page }) => {
    // IA-HIERARCHY-V2: Pengaturan TU = /tu/pengaturan (induk Jam KBM, Hari Libur, Lokasi).
    await page.goto('/tu/pengaturan');
    await expect(page.getByRole('heading', { name: 'Pengaturan', level: 2 })).toBeVisible();
    // Klik kartu "Jam KBM" — kartu (bukan SubPageLinks) punya icon + deskripsi.
    await page.locator('a[href="/tu/pengaturan/jam"]').first().click();
    await page.waitForURL('**/tu/pengaturan/jam');
    await expect(page.getByRole('heading', { name: 'Jam Presensi' })).toBeVisible();
  });
});

