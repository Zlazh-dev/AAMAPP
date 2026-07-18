import { APIRequestContext, Browser, request as pwRequest } from '@playwright/test';

/**
 * Helper login (T15.9 / §12.17e): login via API POST /api/auth/login,
 * lalu tulis token ke localStorage sebelum spec membuka halaman —
 * BUKAN mengetik form login di tiap spec.
 *
 * Kredensial admin: default seed (backend/src/seed/seed.service.ts)
 * — bisa ditimpa lewat env ADMIN_EMAIL / ADMIN_PASSWORD agar konsisten
 * dengan konfigurasi .env proyek.
 */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@aamapp.sch.id';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';

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
 * HARDENING (E2E-ISOLASI-HARDENING): sebelum fix ini, urutan
 * `goto('/login')` lalu `evaluate(setToken)` punya race window — bila
 * ada token LAMA (mis. dari akun sebelumnya yg sesinya baru saja
 * di-revoke oleh `afterEach` test lain via hapus user ->
 * `revokeAllByUser`) masih tersimpan di localStorage saat `/login`
 * mounting, `AuthProvider.refresh()` memanggil `/api/me` dgn token lama
 * itu secara ASYNC. Jika request itu baru resolve (gagal, 401) SETELAH
 * `evaluate()` di bawah menulis token baru, `clearToken()` di catch-nya
 * menghapus token baru itu tanpa syarat — sesi jadi "hilang" secara acak
 * tergantung timing jaringan, bukan bug produk tapi kerapuhan harness.
 *
 * Perbaikan: hapus token LAMA lewat `addInitScript` SEBELUM navigasi apa
 * pun terjadi, sehingga saat halaman benar2 mounting, `getToken()` sudah
 * null -> `refresh()` selesai sinkron (tanpa fetch async) -> tidak ada
 * balapan sama sekali. Token baru baru ditulis setelah origin termuat.
 */
export async function loginAs(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<LoginResult> {
  const result = await apiLogin(page.request, email, password);

  // Bersihkan token & return-to LAMA dari context ini SEBELUM navigasi apa
  // pun, agar AuthProvider tidak pernah mounting dgn kredensial basi.
  // addInitScript berlaku utk SEMUA navigasi berikutnya di context ini
  // (termasuk goto('/login') di bawah), jadi race window tertutup total.
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('aamapp_token');
      sessionStorage.removeItem('aamapp_return_to');
    } catch {
      // ignore (mis. akses storage diblokir sebelum origin termuat)
    }
  });

  // Origin harus sudah dimuat sebelum localStorage bisa ditulis.
  await page.goto('/login');
  await page.evaluate((token) => {
    localStorage.setItem('aamapp_token', token);
  }, result.accessToken);
  return result;
}

/** Login sbg admin seed (peran tetap; dipakai paling sering di gelombang 1). */
export async function loginAsAdmin(page: import('@playwright/test').Page) {
  return loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}
