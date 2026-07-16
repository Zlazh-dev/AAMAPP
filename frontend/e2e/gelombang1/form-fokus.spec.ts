import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * Gelombang 1 — spec (a): form-fokus.
 * Menutup poin QA manual T15-FIX-2: ketik "Budi Santoso" huruf demi huruf
 * di field Nama form siswa → nilai utuh & fokus TIDAK PERNAH lepas dari
 * input (regresi re-mount SectionCard/Field yang sudah diperbaiki).
 */
test('form siswa: ketik nama huruf demi huruf tanpa kehilangan fokus', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/orang/siswa/baru');

  const namaInput = page.getByPlaceholder('Nama lengkap siswa');
  await expect(namaInput).toBeVisible();

  const target = 'Budi Santoso';
  await namaInput.click();
  for (const ch of target) {
    await namaInput.pressSequentially(ch, { delay: 30 });
    // Fokus HARUS tetap di input yang sama setelah SETIAP keystroke —
    // ini adalah bukti util komponen tidak di-unmount/mount ulang.
    await expect(namaInput).toBeFocused();
  }

  await expect(namaInput).toHaveValue(target);
  await expect(namaInput).toBeFocused();
});
