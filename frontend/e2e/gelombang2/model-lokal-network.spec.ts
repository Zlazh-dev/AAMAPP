/**
 * Spec: model-lokal-network
 *
 * Memastikan:
 * 1. /mediapipe/face_landmarker.task → 200 + magic bytes PK (ZIP/FlatBuffer Task Bundle)
 * 2. /mediapipe/tidak-ada.task       → 404 nyaring (bukan 200 HTML dari SPA fallback)
 * 3. Nol request ke CDN eksternal saat FaceLandmarker dimuat dari lokal
 *
 * Syarat: docker compose up (stack penuh) sebelum menjalankan spec ini.
 */

import { test, expect } from '@playwright/test';

test.describe('Model lokal & network isolation', () => {
  test('face_landmarker.task tersedia lokal dan berformat valid (magic PK)', async ({ request }) => {
    const resp = await request.get('/mediapipe/face_landmarker.task');

    expect(resp.status()).toBe(200);

    // Ambil 4 byte pertama untuk verifikasi format Task Bundle MediaPipe:
    // offset 0-1: 00 00 (FlatBuffer size prefix)
    // offset 2-3: 50 4B (PK — ZIP local file header)
    const buf = await resp.body();
    expect(buf.length).toBeGreaterThan(3_000_000); // ~3.58 MB

    // Byte[2] = 0x50 ('P'), Byte[3] = 0x4B ('K')
    expect(buf[2]).toBe(0x50);
    expect(buf[3]).toBe(0x4B);
  });

  test('/mediapipe/tidak-ada.task mengembalikan 404, bukan 200 HTML', async ({ request }) => {
    const resp = await request.get('/mediapipe/tidak-ada.task');

    expect(resp.status()).toBe(404);

    // Pastikan body bukan HTML index.html (SPA fallback membisu)
    const body = await resp.text();
    expect(body).not.toContain('<!DOCTYPE html');
    expect(body).not.toContain('<html');
  });

  test('nol request CDN eksternal saat halaman scan dimuat', async ({ page }) => {
    const externalRequests: string[] = [];

    // Tangkap semua request keluar ke domain CDN MediaPipe/Google
    page.on('request', (req) => {
      const url = req.url();
      if (
        url.includes('storage.googleapis.com') ||
        url.includes('cdn.jsdelivr.net') ||
        url.includes('unpkg.com') ||
        (url.includes('mediapipe') && !url.startsWith('http://localhost') && !url.startsWith('https://localhost'))
      ) {
        externalRequests.push(url);
      }
    });

    // Muat halaman yang memuat FaceLandmarker (guru scan)
    // Halaman ini memanggil loadFaceLandmarker() yang butuh file .task
    await page.goto('/guru/scan', { waitUntil: 'networkidle' });

    expect(externalRequests).toHaveLength(0);
  });
});
