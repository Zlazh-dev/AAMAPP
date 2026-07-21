import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F3a BACKEND — E2E mock embedding (F3-SPEC §e2e-mock-strategy).
 *
 * Strategi: kirim embedding dummy langsung via API (lewati kamera).
 * Agar cosine match, seed guru dengan faceEmbeddings yang cosine-nya
 * ≥ 0.6 terhadap embedding uji (gunakan vektor identik → cosine=1.0).
 *
 * Setup jujur (post-refactor): semua enroll melalui jalur guru-mandiri
 * (PUT /api/guru/wajah → MENUNGGU_VALIDASI) lalu admin terima
 * (PATCH /api/admin/guru/:id/wajah/validasi → TERVALIDASI).
 * PUT /api/admin/wajah/:guruId sudah DICABUT.
 *
 * Jalur yang diuji (per F3-SPEC):
 *  1. Enrollment wajah mandiri guru (verifikasi MENUNGGU_VALIDASI)
 *  2. Belum enroll → 400 saat scan
 *  3. Scan sukses HADIR/TERLAMBAT (embedding match, geofence off)
 *  4. Tolak wajah asing (similarity < threshold) → 401
 *  5. Tolak luar radius (geofence aktif) → 403
 *  6. Idempotent scan ganda check-in
 *  7. Input manual admin (alasan wajib)
 *  8. Guard: 401 tanpa token
 *  9. DELETE wajah — bersih setelah hapus
 *  N1. Guru MENUNGGU_VALIDASI scan → 403
 *  N2. Guru TERVALIDASI scan → 200
 *  X1. PUT /api/admin/wajah/:guruId → 404 (endpoint dicabut)
 *
 * Semua murni REST-API (request fixture) — tidak ada UI yang dibuka
 * kecuali untuk mendapat token awal via loginAsAdmin helper.
 */

/** Vektor dummy normalisasi sederhana (128 dim, semua sama). */
function makeDummyEmbedding(val = 1.0, dim = 128): number[] {
  return Array(dim).fill(val);
}

test.describe('F3a Backend — Presensi Wajah Guru (mock embedding)', () => {
  let adminToken: string;
  let guruId: number;
  let guruUserId: number | null = null;
  let guruEmail = '';
  let createdUserIds: number[] = [];
  let createdGuruIds: number[] = [];

  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page);
    adminToken = (await page.evaluate(() =>
      localStorage.getItem('aamapp_token'),
    )) as string;
    const headers = authHeaders(adminToken);

    // Buat guru uji + akun guru agar bisa login sbg guru
    const suffix = Date.now().toString();
    const userRes = await request.post('/api/admin/users', {
      headers,
      data: {
        name: `Guru F3a ${suffix}`,
        email: `guru.f3a.${suffix}@test.com`,
        password: 'password123XYZ',
        roles: ['guru'],
      },
    });
    expect(userRes.ok(), await userRes.text()).toBeTruthy();
    const user = await userRes.json();
    createdUserIds.push(user.id);
    guruUserId = user.id;
    guruEmail = `guru.f3a.${suffix}@test.com`;

    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: {
        nip: `F3${suffix}`.slice(0, 20),
        nama: `Guru F3a ${suffix}`,
        jenisKelamin: 'L',
        status: 'aktif',
        userId: user.id,
      },
    });
    expect(guruRes.ok(), await guruRes.text()).toBeTruthy();
    const guru = await guruRes.json();
    guruId = guru.id;
    createdGuruIds.push(guru.id);
  });

  test.afterEach(async ({ request }) => {
    const headers = authHeaders(adminToken);
    // Reset geofence ke nonaktif
    await request.patch('/api/admin/pengaturan/lokasi', {
      headers,
      data: { value: { aktif: false } },
    }).catch(() => {});
    // Hapus presensi & wajah (cascade by guru delete), lalu hapus guru & user
    for (const gid of createdGuruIds) {
      await request.delete(`/api/admin/guru/${gid}`, { headers }).catch(() => {});
    }
    for (const uid of createdUserIds) {
      await request.delete(`/api/admin/users/${uid}`, { headers }).catch(() => {});
    }
    createdGuruIds.length = 0;
    createdUserIds.length = 0;
  });

  /** Login sbg guru uji, return token. */
  async function loginAsGuru(
    request: import('@playwright/test').APIRequestContext,
    email: string,
  ) {
    const res = await request.post('/api/auth/login', {
      data: { email, password: 'password123XYZ' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    return body.accessToken as string;
  }

  /**
   * Helper setup jujur: guru enroll mandiri → admin terima → TERVALIDASI.
   * Mengembalikan token guru.
   */
  async function enrollAndValidate(
    request: import('@playwright/test').APIRequestContext,
    embeddings: number[][],
  ): Promise<string> {
    const guruToken = await loginAsGuru(request, guruEmail);
    const enrollRes = await request.put('/api/guru/wajah', {
      headers: authHeaders(guruToken),
      data: { embeddings },
    });
    expect(enrollRes.ok(), `enroll mandiri gagal: ${await enrollRes.text()}`).toBeTruthy();
    const enrollBody = await enrollRes.json();
    expect(enrollBody.faceStatus).toBe('MENUNGGU_VALIDASI');

    // Admin terima → TERVALIDASI
    const validasiRes = await request.patch(`/api/admin/guru/${guruId}/wajah/validasi`, {
      headers: authHeaders(adminToken),
      data: { aksi: 'terima' },
    });
    expect(validasiRes.ok(), `validasi admin gagal: ${await validasiRes.text()}`).toBeTruthy();
    const validasiBody = await validasiRes.json();
    expect(validasiBody.faceStatus).toBe('TERVALIDASI');

    return guruToken;
  }

  // ─────────────────────────────────────────────────────────
  // 1. Enrollment wajah mandiri guru (bukan admin)
  // ─────────────────────────────────────────────────────────
  test('1. Enrollment wajah mandiri berhasil — 3 pose, status MENUNGGU_VALIDASI', async ({
    request,
  }) => {
    const guruToken = await loginAsGuru(request, guruEmail);
    const embeddings = [
      makeDummyEmbedding(1.0),
      makeDummyEmbedding(0.9),
      makeDummyEmbedding(0.8),
    ];

    const res = await request.put('/api/guru/wajah', {
      headers: authHeaders(guruToken),
      data: { embeddings },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.poses).toBe(3);
    // Enroll mandiri → harus MENUNGGU_VALIDASI, bukan langsung TERVALIDASI
    expect(body.faceStatus).toBe('MENUNGGU_VALIDASI');

    // Cek status via GET /api/guru/wajah/status
    const statusRes = await request.get('/api/guru/wajah/status', {
      headers: authHeaders(guruToken),
    });
    expect(statusRes.ok()).toBeTruthy();
    const statusBody = await statusRes.json();
    expect(statusBody.enrolled).toBe(true);
    expect(statusBody.poses).toBe(3);
    expect(statusBody.faceStatus).toBe('MENUNGGU_VALIDASI');
  });

  // ─────────────────────────────────────────────────────────
  // 2. Belum enroll → 400 saat scan
  // ─────────────────────────────────────────────────────────
  test('2. Scan gagal 400 bila wajah belum didaftarkan', async ({
    request,
  }) => {
    const guruToken = await loginAsGuru(request, guruEmail);

    const res = await request.post('/api/guru/presensi-scan', {
      headers: authHeaders(guruToken),
      data: { embedding: makeDummyEmbedding(1.0) },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/belum didaftarkan/i);
  });

  // ─────────────────────────────────────────────────────────
  // 3. Sukses HADIR — embedding match, geofence nonaktif
  // ─────────────────────────────────────────────────────────
  test('3. Scan sukses → HADIR atau TERLAMBAT (embedding match, geofence off)', async ({
    request,
  }) => {
    const refVec = makeDummyEmbedding(1.0);

    // Setup: guru enroll → admin terima
    const guruToken = await enrollAndValidate(request, [refVec, refVec, refVec]);

    // Geofence nonaktif
    await request.patch('/api/admin/pengaturan/lokasi', {
      headers: authHeaders(adminToken),
      data: { value: { aktif: false } },
    });

    const res = await request.post('/api/guru/presensi-scan', {
      headers: authHeaders(guruToken),
      data: { embedding: refVec, mode: 'masuk' },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(['HADIR', 'TERLAMBAT']).toContain(body.status);
    expect(body.similarity).toBeGreaterThanOrEqual(0.6);
    expect(body.checkInAt).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────
  // 4. Tolak wajah asing (similarity < threshold)
  // ─────────────────────────────────────────────────────────
  test('4. Scan tolak wajah asing — similarity < threshold → 401', async ({
    request,
  }) => {
    const refVec = makeDummyEmbedding(1.0);
    // Vektor asing ortogonal: alternating ±1 (cosine ≈ 0 vs all-1 vector)
    const asingVec = Array.from({ length: 128 }, (_, i) =>
      i % 2 === 0 ? 1 : -1,
    );

    // Setup: guru enroll → admin terima
    await enrollAndValidate(request, [refVec, refVec, refVec]);

    await request.patch('/api/admin/pengaturan/lokasi', {
      headers: authHeaders(adminToken),
      data: { value: { aktif: false } },
    });

    const guruToken = await loginAsGuru(request, guruEmail);
    const res = await request.post('/api/guru/presensi-scan', {
      headers: authHeaders(guruToken),
      data: { embedding: asingVec },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toMatch(/tidak dikenali/i);
  });

  // ─────────────────────────────────────────────────────────
  // 5. Tolak luar radius — geofence aktif, koordinat jauh
  // ─────────────────────────────────────────────────────────
  test('5. Scan tolak luar area sekolah — geofence aktif → 403', async ({
    request,
  }) => {
    const refVec = makeDummyEmbedding(1.0);

    // Setup: guru enroll → admin terima
    const guruToken = await enrollAndValidate(request, [refVec, refVec, refVec]);

    // Aktifkan geofence dengan titik sekolah di Jakarta, radius 100m
    await request.patch('/api/admin/pengaturan/lokasi', {
      headers: authHeaders(adminToken),
      data: {
        value: {
          aktif: true,
          lat: -6.2, // Jakarta
          lng: 106.816,
          radiusMeter: 100,
        },
      },
    });

    // Kirim koordinat jauh (Surabaya ~700km dari Jakarta)
    const res = await request.post('/api/guru/presensi-scan', {
      headers: authHeaders(guruToken),
      data: {
        embedding: refVec,
        lat: -7.2575,
        lng: 112.7521,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/luar area sekolah/i);
  });

  // ─────────────────────────────────────────────────────────
  // 6. Idempotent — scan ganda check-in tidak error
  // ─────────────────────────────────────────────────────────
  test('6. Scan ganda check-in idempotent — sudah tercatat', async ({
    request,
  }) => {
    const refVec = makeDummyEmbedding(1.0);

    // Setup: guru enroll → admin terima
    const guruToken = await enrollAndValidate(request, [refVec, refVec, refVec]);

    await request.patch('/api/admin/pengaturan/lokasi', {
      headers: authHeaders(adminToken),
      data: { value: { aktif: false } },
    });

    // Scan pertama (check-in)
    const res1 = await request.post('/api/guru/presensi-scan', {
      headers: authHeaders(guruToken),
      data: { embedding: refVec, mode: 'masuk' },
    });
    expect(res1.ok(), await res1.text()).toBeTruthy();

    // Scan kedua (ganda check-in) → 200 idempotent
    const res2 = await request.post('/api/guru/presensi-scan', {
      headers: authHeaders(guruToken),
      data: { embedding: refVec, mode: 'masuk' },
    });
    expect(res2.ok(), await res2.text()).toBeTruthy();
    const body2 = await res2.json();
    expect(body2.pesan).toMatch(/sudah tercatat/i);
  });

  // ─────────────────────────────────────────────────────────
  // 7. Input manual admin — alasan wajib
  // ─────────────────────────────────────────────────────────
  test('7. Manual admin: alasan wajib, upsert berhasil', async ({ request }) => {
    const headers = authHeaders(adminToken);
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Jakarta',
    });

    // Tanpa alasan → 400
    const resBad = await request.post('/api/admin/presensi-guru/manual', {
      headers,
      data: {
        guruId,
        tanggal: today,
        status: 'HADIR',
      },
    });
    expect(resBad.status()).toBe(400);

    // Dengan alasan → 201 atau 200
    const resOk = await request.post('/api/admin/presensi-guru/manual', {
      headers,
      data: {
        guruId,
        tanggal: today,
        status: 'HADIR',
        alasan: 'Konfirmasi manual oleh admin e2e test',
      },
    });
    expect(resOk.ok(), await resOk.text()).toBeTruthy();
    const body = await resOk.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe('HADIR');

    // Monitor harian harus mencantumkan guru ini
    const monitorRes = await request.get(
      `/api/admin/presensi-guru/harian?tanggal=${today}`,
      { headers },
    );
    expect(monitorRes.ok(), await monitorRes.text()).toBeTruthy();
    const monitor = await monitorRes.json();
    const entry = monitor.data.find((g: any) => g.guruId === guruId);
    expect(entry, `guruId ${guruId} not found in monitor data`).toBeDefined();
    expect(entry.presensi, 'presensi should not be null after manual insert').not.toBeNull();
    expect(entry.presensi.status).toBe('HADIR');
    expect(entry.presensi.source).toBe('MANUAL');
  });

  // ─────────────────────────────────────────────────────────
  // 8. Guard: 401 tanpa token
  // ─────────────────────────────────────────────────────────
  test('8. Endpoint ter-guard — 401 tanpa token', async ({ request }) => {
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Jakarta',
    });
    const endpoints = [
      () => request.get('/api/guru/wajah/status'),
      () => request.put('/api/guru/wajah', { data: { embeddings: [[1]] } }),
      () =>
        request.post('/api/guru/presensi-scan', {
          data: { embedding: [1] },
        }),
      () =>
        request.get(
          `/api/admin/presensi-guru/harian?tanggal=${today}`,
        ),
      () =>
        request.post('/api/admin/presensi-guru/manual', {
          data: {
            guruId: 1,
            tanggal: today,
            status: 'HADIR',
            alasan: 'test',
          },
        }),
    ];
    for (const fn of endpoints) {
      const res = await fn();
      expect(res.status(), `expected 401 for ${res.url()}`).toBe(401);
    }
  });

  // ─────────────────────────────────────────────────────────
  // 9. DELETE wajah — bersih setelah hapus
  // ─────────────────────────────────────────────────────────
  test('9. DELETE /api/admin/wajah/:guruId — clear embeddings', async ({
    request,
  }) => {
    const headers = authHeaders(adminToken);
    const refVec = makeDummyEmbedding(1.0);

    // Enroll via jalur jujur guru-mandiri
    await enrollAndValidate(request, [refVec, refVec, refVec]);

    // Hapus oleh admin
    const delRes = await request.delete(`/api/admin/wajah/${guruId}`, {
      headers,
    });
    expect(delRes.ok(), await delRes.text()).toBeTruthy();
    const delBody = await delRes.json();
    expect(delBody.ok).toBe(true);

    // Cek status via GET /api/guru/wajah/status — harus enrolled=false
    const guruToken = await loginAsGuru(request, guruEmail);
    const statusRes = await request.get('/api/guru/wajah/status', {
      headers: authHeaders(guruToken),
    });
    expect(statusRes.ok()).toBeTruthy();
    const statusBody = await statusRes.json();
    expect(statusBody.enrolled).toBe(false);
    expect(statusBody.faceStatus).toBe('BELUM');
  });

  // ─────────────────────────────────────────────────────────
  // N1. MENUNGGU_VALIDASI → scan ditolak 403
  // ─────────────────────────────────────────────────────────
  test('N1. Guru MENUNGGU_VALIDASI scan → 403 (belum divalidasi admin)', async ({
    request,
  }) => {
    const refVec = makeDummyEmbedding(1.0);

    // Guru enroll mandiri → faceStatus = MENUNGGU_VALIDASI (belum divalidasi)
    const guruToken = await loginAsGuru(request, guruEmail);
    const enrollRes = await request.put('/api/guru/wajah', {
      headers: authHeaders(guruToken),
      data: { embeddings: [refVec, refVec, refVec] },
    });
    expect(enrollRes.ok(), await enrollRes.text()).toBeTruthy();
    const enrollBody = await enrollRes.json();
    expect(enrollBody.faceStatus).toBe('MENUNGGU_VALIDASI');

    // Pastikan geofence nonaktif
    await request.patch('/api/admin/pengaturan/lokasi', {
      headers: authHeaders(adminToken),
      data: { value: { aktif: false } },
    });

    // Scan saat MENUNGGU_VALIDASI → 403
    const scanRes = await request.post('/api/guru/presensi-scan', {
      headers: authHeaders(guruToken),
      data: { embedding: refVec, mode: 'masuk' },
    });
    expect(scanRes.status()).toBe(403);
    const body = await scanRes.json();
    expect(body.message).toMatch(/belum divalidasi admin/i);
  });

  // ─────────────────────────────────────────────────────────
  // N2. TERVALIDASI → scan berhasil 200
  // ─────────────────────────────────────────────────────────
  test('N2. Guru TERVALIDASI scan → 200 (setelah admin terima)', async ({
    request,
  }) => {
    const refVec = makeDummyEmbedding(1.0);

    // Setup jujur: guru enroll → admin terima → TERVALIDASI
    const guruToken = await enrollAndValidate(request, [refVec, refVec, refVec]);

    // Geofence nonaktif
    await request.patch('/api/admin/pengaturan/lokasi', {
      headers: authHeaders(adminToken),
      data: { value: { aktif: false } },
    });

    const scanRes = await request.post('/api/guru/presensi-scan', {
      headers: authHeaders(guruToken),
      data: { embedding: refVec, mode: 'masuk' },
    });
    expect(scanRes.ok(), await scanRes.text()).toBeTruthy();
    const body = await scanRes.json();
    expect(['HADIR', 'TERLAMBAT']).toContain(body.status);
    expect(body.similarity).toBeGreaterThanOrEqual(0.6);
  });

  // ─────────────────────────────────────────────────────────
  // X1. PUT /api/admin/wajah/:guruId → 404 (endpoint dicabut)
  // ─────────────────────────────────────────────────────────
  test('X1. PUT /api/admin/wajah/:guruId → 404 (endpoint dicabut per keputusan produk)', async ({
    request,
  }) => {
    const refVec = makeDummyEmbedding(1.0);
    const res = await request.put(`/api/admin/wajah/${guruId}`, {
      headers: authHeaders(adminToken),
      data: { embeddings: [refVec, refVec, refVec] },
    });
    expect(res.status()).toBe(404);
  });
});
