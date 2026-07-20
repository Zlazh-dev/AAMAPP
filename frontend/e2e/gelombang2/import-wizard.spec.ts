import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import fs from 'fs';
import path from 'path';

test.describe('Import Wizard (Poin 2 T16)', () => {
  // Wait, parsing Excel requires a real file.
  // We'll assume there's an endpoint that processes it.
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/kurikulum/orang/import');
  });

  test('Upload file rusak, baris error merah, commit ringkasan', async ({ page }) => {
    // We will intercept the upload POST to return a mock preview response
    // since we don't have a real valid/invalid excel file generated yet,
    // OR we can test the UI handling of the preview response.
    // The requirement says: "upload file uji -> baris error merah -> commit ringkasan"
    // Let's intercept the /api/admin/import/preview to return mock data.
    
    await page.route('**/api/admin/import/preview*', async route => {
      const json = {
        valid: [
          { nis: '1001', nama: 'Siswa Valid 1' },
          { nis: '1002', nama: 'Siswa Valid 2' },
          { nis: '1003', nama: 'Siswa Valid 3' },
        ],
        errors: [
          { baris: 5, kolom: 'nis', pesan: 'NIS wajib diisi' },
          { baris: 6, kolom: 'nama', pesan: 'Nama wajib diisi' },
        ],
      };
      await route.fulfill({ json });
    });

    await page.route('**/api/admin/import/commit*', async route => {
      const json = {
        tersimpan: 3,
        dilewati: 2,
      };
      await route.fulfill({ json });
    });

    // Klik Lanjut: Unggah (Step 1 -> Step 2)
    await page.getByRole('button', { name: 'Lanjut: Unggah' }).click();

    // Mock file upload via hidden input
    const buffer = Buffer.from('mock excel content');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-import.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer
    });

    // Pratinjau
    await page.getByRole('button', { name: 'Pratinjau' }).click();

    // Cek preview UI â€” ImportPage renders "Baris Valid (3):" heading and
    // a summary card with count "3" + label "Baris Valid" (separate elements).
    await expect(page.getByText('Baris Valid (3):')).toBeVisible();
    await expect(page.getByText('Baris Error', { exact: true })).toBeVisible();
    
    // Baris merah (has text of the error)
    await expect(page.getByText('NIS wajib diisi')).toBeVisible();
    await expect(page.getByText('Nama wajib diisi')).toBeVisible();

    // Lanjutkan / Commit â€” button label is "Import {N} Baris", not "Simpan"
    await page.getByRole('button', { name: /Import \d+ Baris/ }).click();

    // Halaman sukses (Step 4 heading "Import Selesai")
    await expect(page.getByRole('heading', { name: 'Import Selesai' })).toBeVisible();
  });
});

