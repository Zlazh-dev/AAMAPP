import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

// Akun guru test â€” set via env GURU_EMAIL / GURU_PASSWORD bila tersedia
const GURU_EMAIL = process.env.GURU_EMAIL || '';
const GURU_PASSWORD = process.env.GURU_PASSWORD || '';


/**
 * model-lokal-network.spec.ts
 *
 * Bukti: halaman enroll wajah tidak melakukan SATU PUN request ke cdn.jsdelivr.net.
 * Model harus diambil dari /models/* dengan status 200 (bukan 404).
 *
 * Catatan:
 * - Spec ini TIDAK menguji kamera (tidak bisa di CI headless tanpa fake media).
 * - Yang diuji: network intercept Ã¢â‚¬â€ CDN tidak diminta, model lokal tersedia.
 * - Asumsi: ada akun guru test di lingkungan (dibuat oleh beforeAll atau data seeding).
 *   Bila tidak ada, spec menandai dirinya sebagai skip dengan pesan jelas.
 */

test.describe('Model wajah lokal Ã¢â‚¬â€ nol CDN request', () => {
  test('Halaman enroll tidak request ke cdn.jsdelivr.net, model /models/* 200', async ({ page, context }) => {
    // Kumpulkan semua URL yang diminta browser selama pengujian
    const requestedUrls: string[] = [];
    const modelResponses: { url: string; status: number }[] = [];

    context.on('request', (req) => {
      requestedUrls.push(req.url());
    });

    context.on('response', (res) => {
      if (res.url().includes('/models/')) {
        modelResponses.push({ url: res.url(), status: res.status() });
      }
    });

    // Login sebagai guru
    try {
      await loginAs(page, GURU_EMAIL, GURU_PASSWORD);
    } catch {
      test.skip(true, 'Akun guru test tidak tersedia Ã¢â‚¬â€ skip network test');
      return;
    }

    // Navigasi ke halaman enroll
    await page.goto('/guru/wajah/enroll', { waitUntil: 'networkidle', timeout: 30000 });

    // Tunggu cukup lama agar model mulai diload (script lazy import terpicu)
    // Kita tidak perlu kamera aktif Ã¢â‚¬â€ hanya perlu dynamic import() terpanggil
    await page.waitForTimeout(8000);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Assertion 1: Nol request ke CDN jsdelivr Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const cdnRequests = requestedUrls.filter((u) =>
      u.includes('cdn.jsdelivr.net') || u.includes('jsdelivr.net'),
    );
    expect(
      cdnRequests,
      `Ditemukan request ke CDN yang seharusnya nol:\n${cdnRequests.join('\n')}`,
    ).toHaveLength(0);

    // Ã¢â€â‚¬Ã¢â€â‚¬ Assertion 2: Model lokal diambil dengan status 200 Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // Minimal blazeface dan faceres harus diminta dan berhasil
    const blazefaceReqs = modelResponses.filter((r) => r.url.includes('blazeface'));
    const faceresÃ¢â‚¬â€¹Reqs = modelResponses.filter((r) => r.url.includes('faceres'));

    // Bila model belum dimuat (model load belum trigger dalam 8 detik),
    // kita periksa bahwa setidaknya file tersedia via fetch manual
    if (blazefaceReqs.length === 0 && faceresÃ¢â‚¬â€¹Reqs.length === 0) {
      // Verifikasi dengan fetch langsung ke /models/ dari context halaman
      const blazeStatus = await page.evaluate(async () => {
        try {
          const r = await fetch('/models/blazeface.json');
          return r.status;
        } catch { return 0; }
      });
      const faceresÃ¢â‚¬â€¹Status = await page.evaluate(async () => {
        try {
          const r = await fetch('/models/faceres.json');
          return r.status;
        } catch { return 0; }
      });
      expect(blazeStatus, '/models/blazeface.json harus 200 (model tidak tersedia lokal!)').toBe(200);
      expect(faceresÃ¢â‚¬â€¹Status, '/models/faceres.json harus 200 (model tidak tersedia lokal!)').toBe(200);
    } else {
      // Model sudah dimuat Ã¢â‚¬â€ verifikasi semua 200
      const nonOk = modelResponses.filter((r) => r.status !== 200 && r.status !== 206);
      expect(
        nonOk,
        `Ada model request yang gagal:\n${nonOk.map((r) => `${r.status} ${r.url}`).join('\n')}`,
      ).toHaveLength(0);
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Assertion 3: Tidak ada 404 untuk file model Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const notFound = modelResponses.filter((r) => r.status === 404);
    expect(
      notFound,
      `Model tidak ditemukan (404):\n${notFound.map((r) => r.url).join('\n')}`,
    ).toHaveLength(0);
  });

  test('GET /models/blazeface.json Ã¢â€ â€™ 200 dengan Content-Type JSON', async ({ request }) => {
    const res = await request.get('/models/blazeface.json');
    expect(res.status(), '/models/blazeface.json harus 200').toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct, 'Content-Type harus JSON').toMatch(/json/i);
  });

  test('GET /models/blazeface.bin Ã¢â€ â€™ 200 biner tersedia', async ({ request }) => {
    const res = await request.get('/models/blazeface.bin');
    expect(res.status(), '/models/blazeface.bin harus 200').toBe(200);
    const body = await res.body();
    expect(body.length, 'blazeface.bin harus > 100 KB').toBeGreaterThan(100_000);
  });

  test('GET /models/faceres.json Ã¢â€ â€™ 200', async ({ request }) => {
    const res = await request.get('/models/faceres.json');
    expect(res.status(), '/models/faceres.json harus 200').toBe(200);
  });

  test('GET /models/faceres.bin Ã¢â€ â€™ 200 biner tersedia', async ({ request }) => {
    const res = await request.get('/models/faceres.bin');
    expect(res.status(), '/models/faceres.bin harus 200').toBe(200);
    const body = await res.body();
    expect(body.length, 'faceres.bin harus > 1 MB').toBeGreaterThan(1_000_000);
  });

  test('GET /models/tidak-ada.bin Ã¢â€ â€™ 404 (endpoint bersih, tidak fallback ke index.html)', async ({ request }) => {
    const res = await request.get('/models/tidak-ada.bin');
    expect(res.status(), '/models/tidak-ada.bin harus 404, bukan 200/index.html').toBe(404);
  });

  // WASM TF.js backend tests
  test('GET /wasm/tfjs-backend-wasm.wasm - 200', async ({ request }) => {
    const res = await request.get('/wasm/tfjs-backend-wasm.wasm');
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(body.length).toBeGreaterThan(200_000);
  });

  test('GET /wasm/tfjs-backend-wasm-simd.wasm - 200', async ({ request }) => {
    const res = await request.get('/wasm/tfjs-backend-wasm-simd.wasm');
    expect(res.status()).toBe(200);
  });

  test('GET /wasm/tfjs-backend-wasm-threaded-simd.wasm - 200', async ({ request }) => {
    const res = await request.get('/wasm/tfjs-backend-wasm-threaded-simd.wasm');
    expect(res.status()).toBe(200);
  });
});

