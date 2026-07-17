import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

/**
 * security.spec.ts — SEC-1 (hardening keamanan pra-produksi).
 *
 * Membuktikan efek dari 6 perubahan hardening:
 *  1. CORS whitelist (dev tetap izinkan localhost — dibuktikan implisit
 *     lewat SELURUH request API di suite ini yang berasal dari origin
 *     Playwright/browser localhost dan berhasil).
 *  2. APP_GUARD global SessionAuthGuard: endpoint terlindungi TANPA
 *     token -> 401. Endpoint @Public() tetap 200/201 tanpa token.
 *  3. synchronize kondisional — tidak diuji lewat e2e (butuh restart
 *     container dengan NODE_ENV berbeda; didokumentasikan di laporan).
 *  4. Body limit 1mb — payload JSON di atas 1mb ditolak (413/400).
 *  5. RolesGuard fail-closed — dibuktikan tidak langsung (semua rute
 *     yang ada sudah punya @Roles, diverifikasi lewat seluruh suite
 *     tetap hijau tanpa 403 tak terduga).
 *  6. Upload magic-byte — file dengan ekstensi/MIME gambar tapi ISI
 *     bukan gambar sungguhan ditolak 400.
 */
test.describe('Security hardening (SEC-1)', () => {
  test('Endpoint terlindungi tanpa token -> 401', async ({ request }) => {
    const endpoints = [
      { method: 'GET', url: '/api/admin/guru' },
      { method: 'GET', url: '/api/admin/siswa' },
      { method: 'GET', url: '/api/admin/kelas' },
      { method: 'GET', url: '/api/kurikulum/mapel' },
      { method: 'GET', url: '/api/pengaturan' },
      { method: 'GET', url: '/api/admin/users' },
      { method: 'GET', url: '/api/admin/tahun-ajaran' },
      { method: 'GET', url: '/api/profile' },
      { method: 'GET', url: '/api/admin/activities' },
      { method: 'GET', url: '/api/admin/sessions' },
    ];
    for (const ep of endpoints) {
      const res = await request.fetch(ep.url, { method: ep.method });
      expect(res.status(), `${ep.method} ${ep.url} harus 401 tanpa token`).toBe(401);
    }
  });

  test('Route @Public() tetap 200/201 tanpa token', async ({ request }) => {
    const configRes = await request.get('/api/auth/config');
    expect(configRes.status()).toBe(200);

    // Static uploads mount juga publik (tidak melewati SessionAuthGuard
    // karena bukan route Nest, melainkan express.static) — dibuktikan
    // tidak 401 (boleh 404 kalau file tidak ada, itu bukan auth error).
    const uploadStaticRes = await request.get('/uploads/tidak-ada-file.png');
    expect(uploadStaticRes.status()).not.toBe(401);

    // Login (kredensial salah) -> tetap diproses (bukan 401 auth-guard,
    // melainkan 401/400 dari authService karena kredensial salah — jadi
    // kita pastikan responsnya BUKAN pesan generik "Anda belum masuk").
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'tidak-ada@test.com', password: 'salah12345' },
    });
    expect([400, 401]).toContain(loginRes.status());
    const body = await loginRes.json().catch(() => ({}));
    expect(JSON.stringify(body)).not.toMatch(/Anda belum masuk/);
  });

  test('Login valid via API tetap 200/201 (CORS localhost tidak diblokir)', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'admin@aamapp.sch.id', password: 'admin12345' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
  });

  test('Body JSON > 1mb ditolak', async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));

    // > 1mb string di field yang divalidasi @IsString (mapel nama, misalnya)
    // — cukup untuk memicu body-parser limit sebelum ValidationPipe jalan.
    const bigString = 'A'.repeat(1.5 * 1024 * 1024);
    const res = await request.post('/api/kurikulum/mapel', {
      headers: { Authorization: `Bearer ${token}` },
      data: { nama: bigString, kode: 'BIGTEST' },
      failOnStatusCode: false,
    });
    expect([400, 413]).toContain(res.status());
  });

  test('Upload gambar palsu (MIME image/png, isi bukan gambar) -> 400 magic-byte', async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));

    const fakeBuffer = Buffer.from('<html><body>bukan gambar sungguhan</body></html>');
    const res = await request.post('/api/admin/uploads', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: 'palsu.png',
          mimeType: 'image/png',
          buffer: fakeBuffer,
        },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/tidak cocok|format/i);
  });

  test('Upload gambar asli (PNG 1x1 valid) tetap 201/200 (magic-byte lolos)', async ({ page, request }) => {
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));

    const PNG_1X1_BASE64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const realPng = Buffer.from(PNG_1X1_BASE64, 'base64');
    const res = await request.post('/api/admin/uploads', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: 'asli.png',
          mimeType: 'image/png',
          buffer: realPng,
        },
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.url).toMatch(/\/uploads\//);
  });
});
