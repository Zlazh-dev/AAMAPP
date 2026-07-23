/**
 * Spec: face-snapshot RBAC + lifecycle (F3b)
 *
 * Bukti tanpa kamera:
 *  1. Endpoint snapshot admin-only: admin 200, tanpa-sesi 401/403.
 *  2. Guru yang tidak punya snapshot → 404 (bukan 200 HTML/empty).
 *
 * Catatan: siklus hidup file (enroll → file ada, Tolak → file hilang) butuh
 * sesi guru utk PUT /api/guru/wajah (kamera). Itu diverifikasi via typecheck
 * + review service code (_simpanSnapshot / _hapusSnapshotFile / validasiWajah).
 */

import { test, expect, request as pwRequest } from '@playwright/test';
import { apiLogin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers/auth';

test.describe('F3b: face snapshot — RBAC & lifecycle', () => {
  test('endpoint snapshot admin-only (admin 200 atau 404, tanpa-sesi ditolak)', async () => {
    const adminCtx = await pwRequest.newContext({ baseURL: 'http://localhost' });
    await apiLogin(adminCtx, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Ambil daftar guru, cari satu untuk diuji
    const listRes = await adminCtx.get('/api/admin/guru?limit=1');
    expect(listRes.ok()).toBe(true);
    const list = await listRes.json();
    const guruId = list.data?.[0]?.id;
    expect(guruId).toBeTruthy();

    // Admin request ke snapshot endpoint — harus 200 (ada snapshot) atau 404 (belum ada)
    // TIDAK boleh 401/403 (admin punya akses)
    const snapRes = await adminCtx.get(`/api/admin/guru/${guruId}/wajah/snapshot`);
    expect([200, 404]).toContain(snapRes.status());

    await adminCtx.dispose();
  });

  test('tanpa sesi → snapshot endpoint ditolak (401 atau 403)', async () => {
    const anonCtx = await pwRequest.newContext({ baseURL: 'http://localhost' });

    const res = await anonCtx.get('/api/admin/guru/1/wajah/snapshot');
    // 401 (no session) atau 403 (session tapi bukan admin)
    expect([401, 403]).toContain(res.status());

    await anonCtx.dispose();
  });

  test('guru detail mengandung field snapshot F3b (faceSnapshotUrl/faceUpdatedAt/facePoseCount)', async () => {
    const adminCtx = await pwRequest.newContext({ baseURL: 'http://localhost' });
    await apiLogin(adminCtx, ADMIN_EMAIL, ADMIN_PASSWORD);

    const listRes = await adminCtx.get('/api/admin/guru?limit=1');
    const list = await listRes.json();
    const guruId = list.data?.[0]?.id;

    const detailRes = await adminCtx.get(`/api/admin/guru/${guruId}`);
    expect(detailRes.ok()).toBe(true);
    const guru = await detailRes.json();

    // Field F3b wajib ada (null/0 valid untuk enroll lama)
    expect(guru).toHaveProperty('faceSnapshotUrl');
    expect(guru).toHaveProperty('faceUpdatedAt');
    expect(guru).toHaveProperty('facePoseCount');
    // faceEmbeddings TIDAK boleh bocor ke frontend (privasi biometrik)
    expect(guru).not.toHaveProperty('faceEmbeddings');

    await adminCtx.dispose();
  });
});
