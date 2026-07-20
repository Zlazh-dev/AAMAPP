import { APIRequestContext, Browser, request as pwRequest } from '@playwright/test';

/**
 * Helper login (T15.9 / §12.17e): login via API POST /api/auth/login,
 * lalu tulis token ke localStorage sebelum spec membuka halaman —
 * BUKAN mengetik form login di tiap spec.
 *
 * Akun admin khusus e2e (TERPISAH dari admin pemilik produk) supaya
 * suite e2e tidak mengotori daftar sesi admin sungguhan. Akun ini dibuat
 * seed.service.ts (seedE2EAdmin): e2e-admin@aamapp.sch.id / e2e-admin-pass.
 * Bisa ditimpa lewat env ADMIN_EMAIL / ADMIN_PASSWORD.
 */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'e2e-admin@aamapp.sch.id';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'e2e-admin-pass';

export interface LoginResult {
  accessToken: string;
  user: { id: number; name: string; email: string; roles: string[] };
}

/** Login via API (tanpa browser) — dipakai utk storageState & data setup. */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<LoginResult> {
  const res = await request.post('/api/auth/login', {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(
      `Login API gagal (${res.status()}) utk ${email}: ${await res.text()}`,
    );
  }
  return res.json();
}

/**
 * Buat storageState (localStorage token) utk sebuah akun, tanpa menyentuh
 * UI form login. Dipakai di awal spec via `page.addInitScript` + goto,
 * ATAU langsung set localStorage setelah `page.goto('/')` pertama kali
 * (localStorage butuh origin yang sudah dimuat).
 *
 * CATATAN (E2E-ISOLASI-HARDENING): sempat dicoba menghapus token lama via
 * `page.addInitScript` di sini, TAPI itu salah — init script berlaku utk
 * SEMUA navigasi berikutnya di context yang sama (termasuk `page.reload()`
 * / `page.goto()` lain di dalam body test setelah login), jadi token yang
 * baru saja di-set pun ikut terhapus tiap kali halaman dimuat ulang ->
 * regresi masif (44 test gagal). Race sesungguhnya (token lama tertimpa
 * balapan oleh `AuthProvider.refresh()` yang gagal) diperbaiki di level
 * produk: `frontend/src/app/AuthContext.tsx` (refresh() hanya clearToken()
 * bila token belum berubah sejak request /me dimulai), bukan di harness.
 */
export async function loginAs(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<LoginResult> {
  const result = await apiLogin(page.request, email, password);
  // Origin harus sudah dimuat sebelum localStorage bisa ditulis.
  // waitForURL memastikan halaman BENAR-BENAR di /login sebelum evaluate,
  // bukan sedang transisi ke about:blank (penyebab SecurityError di CI
  // saat backend sedang sibuk setelah test sebelumnya).
  await page.goto('/login');
  await page.waitForURL('**/login', { timeout: 10_000 });
  await page.evaluate((token) => {
    localStorage.setItem('aamapp_token', token);
  }, result.accessToken);
  return result;
}

/** Login sbg admin seed (peran tetap; dipakai paling sering di gelombang 1). */
export async function loginAsAdmin(page: import('@playwright/test').Page) {
  return loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}
