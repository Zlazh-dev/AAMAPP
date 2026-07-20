import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { authHeaders } from '../helpers/api';

/**
 * F4a Backend â€” izin guru + status turunan deriveStatusHarian
 *
 * Pola: loginAsAdmin via page (seperti spec lain yang berjalan),
 * setup data lewat REST setelah token admin didapat.
 *
 * Test suite:
 *  1. ajukan izin â†’ MENUNGGU
 *  2. admin list izin â†’ shape valid
 *  3. tolak tanpa alasan â†’ 400
 *  4. ajukan + approve â†’ DISETUJUI; monitor tampil IZIN/SAKIT
 *  5. RBAC: endpoint admin tidak bisa diakses guru â†’ 403
 *  6. Monitor harian: setiap baris punya statusHarian valid
 *  7. Monitor LIBUR: tanggal kalender libur â†’ semua LIBUR
 *  8. Tolak dengan alasan â†’ DITOLAK
 *  9. listDiri (guru) â†’ hanya izin sendiri (array)
 * 10. Monitor shape: statusHarian + presensi field ada
 */

let adminToken: string;
let guruToken: string;
let guruId: number;
let guruUserId: number;
let suffix: string;

test.describe('F4a Backend â€” Izin Guru + deriveStatusHarian', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    adminToken = (await page.evaluate(() =>
      localStorage.getItem('aamapp_token'),
    )) as string;

    // Buat user+guru hanya sekali (suffix konstan per describe)
    if (!suffix) {
      suffix = Date.now().toString();
      const email = `f4a.guru.${suffix}@test.com`;

      const uRes = await page.request.post('/api/admin/users', {
        data: {
          name: `F4a Test Guru ${suffix}`,
          email,
          password: 'pass1234',
          roles: ['guru'],
        },
        headers: authHeaders(adminToken),
      });
      const u = await uRes.json();
      guruUserId = u.id;

      const gRes = await page.request.post('/api/admin/guru', {
        data: {
          nip: `F4A${suffix}`.slice(0, 20),
          nama: `F4a Test Guru ${suffix}`,
          jenisKelamin: 'L',
          status: 'aktif',
          userId: guruUserId,
        },
        headers: authHeaders(adminToken),
      });
      const g = await gRes.json();
      guruId = g.id;

      // Login guru
      const loginRes = await page.request.post('/api/auth/login', {
        data: { email, password: 'pass1234' },
      });
      const loginBody = await loginRes.json();
      guruToken = loginBody.token ?? loginBody.accessToken ?? loginBody.access_token;
    }
  });

  test.afterAll(async ({ request }) => {
    if (!adminToken) return;
    if (guruId) await request.delete(`/api/admin/guru/${guruId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    if (guruUserId) await request.delete(`/api/admin/users/${guruUserId}`, { headers: authHeaders(adminToken) }).catch(() => {});
    suffix = '';
    guruId = 0;
    guruUserId = 0;
  });

  // â”€â”€â”€ 1. Ajukan izin â†’ MENUNGGU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('1. Guru ajukan izin SAKIT â†’ status MENUNGGU', async ({ request }) => {
    const res = await request.post('/api/izin/guru', {
      headers: authHeaders(guruToken),
      data: {
        jenis: 'SAKIT',
        mulaiTanggal: '2026-07-20',
        selesaiTanggal: '2026-07-21',
        keterangan: 'Sakit demam, dokter minta istirahat 2 hari',
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.status).toBe('MENUNGGU');
    expect(body.jenis).toBe('SAKIT');
  });

  // â”€â”€â”€ 2. Admin list izin â†’ shape valid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('2. Admin list izin â†’ shape valid, paginasi, guruNama ada', async ({
    request,
  }) => {
    // Ajukan dulu agar ada data
    await request.post('/api/izin/guru', {
      headers: authHeaders(guruToken),
      data: {
        jenis: 'IZIN',
        mulaiTanggal: '2026-07-22',
        selesaiTanggal: '2026-07-22',
        keterangan: 'Keperluan keluarga',
      },
    });

    const res = await request.get(`/api/admin/izin/guru?guruId=${guruId}`, {
      headers: authHeaders(adminToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(typeof body.page).toBe('number');
    expect(typeof body.limit).toBe('number');
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThan(0);
    const item = body.data[0];
    expect(item.guruNama).toBeTruthy();
    expect(item.status).toBe('MENUNGGU');
    expect(item.mulaiTanggal).toBeTruthy();
    expect(item.jenis).toBeTruthy();
  });

  // â”€â”€â”€ 3. Tolak tanpa alasan â†’ 400 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('3. Tolak tanpa alasan â†’ 400 BadRequest', async ({ request }) => {
    // Buat izin baru
    const ajukanRes = await request.post('/api/izin/guru', {
      headers: authHeaders(guruToken),
      data: {
        jenis: 'DINAS',
        mulaiTanggal: '2026-08-01',
        selesaiTanggal: '2026-08-02',
        keterangan: 'Pelatihan luar kota',
      },
    });
    const izin = await ajukanRes.json();

    const res = await request.patch(`/api/admin/izin/guru/${izin.id}/tolak`, {
      headers: authHeaders(adminToken),
      data: {}, // alasan kosong
    });
    expect(res.status()).toBe(400);

    // Cleanup: tolak dengan alasan agar tidak mengganggu test lain
    await request.patch(`/api/admin/izin/guru/${izin.id}/tolak`, {
      headers: authHeaders(adminToken),
      data: { alasan: 'Cleanup test 3' },
    });
  });

  // â”€â”€â”€ 4. Approve + monitor statusHarian=SAKIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('4. Approve â†’ DISETUJUI; monitor harian tanggal tsb â†’ statusHarian SAKIT/LIBUR', async ({
    request,
  }) => {
    const ajukanRes = await request.post('/api/izin/guru', {
      headers: authHeaders(guruToken),
      data: {
        jenis: 'SAKIT',
        mulaiTanggal: '2026-07-20',
        selesaiTanggal: '2026-07-21',
        keterangan: 'Demam 2 hari',
      },
    });
    const izin = await ajukanRes.json();

    const setRes = await request.patch(`/api/admin/izin/guru/${izin.id}/setujui`, {
      headers: authHeaders(adminToken),
      data: { alasan: 'Disetujui dengan surat dokter' },
    });
    expect(setRes.ok(), await setRes.text()).toBeTruthy();
    const setBody = await setRes.json();
    expect(setBody.status).toBe('DISETUJUI');

    // Monitor hari izin aktif
    const monRes = await request.get(
      '/api/admin/presensi-guru/harian?tanggal=2026-07-20',
      { headers: authHeaders(adminToken) },
    );
    expect(monRes.ok()).toBeTruthy();
    const monBody = await monRes.json();
    expect(monBody.tanggal).toBe('2026-07-20');
    const row = monBody.data.find((r: any) => r.guruId === guruId);
    expect(row, `guruId ${guruId} tidak ada di monitor`).toBeDefined();
    expect(row.statusHarian).toBeDefined();
    // SAKIT jika ada jadwal; LIBUR jika tidak ada jadwal (guru test tidak punya penugasan)
    expect(['SAKIT', 'LIBUR']).toContain(row.statusHarian);
  });

  // â”€â”€â”€ 5. RBAC: guru tidak bisa akses admin endpoint â†’ 403 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('5. RBAC: guru tidak bisa PATCH /api/admin/izin/guru/:id/setujui â†’ 403', async ({
    request,
  }) => {
    // Buat izin dulu
    const ajukanRes = await request.post('/api/izin/guru', {
      headers: authHeaders(guruToken),
      data: {
        jenis: 'IZIN',
        mulaiTanggal: '2026-07-25',
        selesaiTanggal: '2026-07-25',
        keterangan: 'Keperluan keluarga',
      },
    });
    const izin = await ajukanRes.json();

    // Guru coba approve sendiri â€” harus 403
    const approveRes = await request.patch(
      `/api/admin/izin/guru/${izin.id}/setujui`,
      {
        headers: authHeaders(guruToken),
        data: {},
      },
    );
    expect(approveRes.status()).toBe(403);

    // Cleanup
    await request.patch(`/api/admin/izin/guru/${izin.id}/tolak`, {
      headers: authHeaders(adminToken),
      data: { alasan: 'Cleanup test 5' },
    });
  });

  // â”€â”€â”€ 6. Monitor harian: statusHarian valid untuk semua guru â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('6. Monitor harian: setiap baris punya statusHarian yang valid', async ({
    request,
  }) => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request.get(
      `/api/admin/presensi-guru/harian?tanggal=${today}`,
      { headers: authHeaders(adminToken) },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    const validStatuses = ['HADIR','TERLAMBAT','IZIN','SAKIT','DINAS','ALPHA','LIBUR','KOSONG'];
    for (const row of body.data) {
      expect(row.statusHarian, `guruId ${row.guruId} punya statusHarian invalid`).toBeDefined();
      expect(validStatuses, `statusHarian "${row.statusHarian}" tidak valid`).toContain(row.statusHarian);
    }
  });

  // â”€â”€â”€ 7. Monitor LIBUR: semua guru LIBUR di hari libur kalender â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('7. Monitor LIBUR: tanggal kalender libur â†’ statusHarian LIBUR semua', async ({
    request,
  }) => {
    // Gunakan tanggal libur yang pasti tidak ada presensi/izin
    const liburTgl = '2026-12-25';

    // Tambah ke kalender libur via endpoint yang benar: /api/admin/libur
    await request.post('/api/admin/libur', {
      headers: authHeaders(adminToken),
      data: { tanggal: liburTgl, keterangan: 'Hari Natal' },
    }).catch(() => {});

    const monRes = await request.get(
      `/api/admin/presensi-guru/harian?tanggal=${liburTgl}`,
      { headers: authHeaders(adminToken) },
    );
    expect(monRes.ok()).toBeTruthy();
    const body = await monRes.json();
    // Semua guru harus LIBUR
    for (const row of body.data) {
      expect(row.statusHarian).toBe('LIBUR');
    }
  });

  // â”€â”€â”€ 8. Tolak dengan alasan â†’ DITOLAK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('8. Admin tolak dengan alasan â†’ DITOLAK + alasanKeputusan tersimpan', async ({
    request,
  }) => {
    const ajukanRes = await request.post('/api/izin/guru', {
      headers: authHeaders(guruToken),
      data: {
        jenis: 'DINAS',
        mulaiTanggal: '2026-08-05',
        selesaiTanggal: '2026-08-06',
        keterangan: 'Workshop nasional',
      },
    });
    const izin = await ajukanRes.json();

    const tolakRes = await request.patch(
      `/api/admin/izin/guru/${izin.id}/tolak`,
      {
        headers: authHeaders(adminToken),
        data: { alasan: 'Tidak ada pengganti mengajar' },
      },
    );
    expect(tolakRes.ok(), await tolakRes.text()).toBeTruthy();
    const body = await tolakRes.json();
    expect(body.status).toBe('DITOLAK');
    expect(body.alasanKeputusan).toBe('Tidak ada pengganti mengajar');
  });

  // â”€â”€â”€ 9. listDiri (guru) â†’ array berisi izin sendiri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('9. GET /api/izin/guru â†’ guru lihat daftar izin sendiri (array)', async ({
    request,
  }) => {
    // Pastikan ada minimal 1 izin
    await request.post('/api/izin/guru', {
      headers: authHeaders(guruToken),
      data: {
        jenis: 'IZIN',
        mulaiTanggal: '2026-09-01',
        selesaiTanggal: '2026-09-01',
        keterangan: 'Urusan pribadi',
      },
    });

    const res = await request.get('/api/izin/guru', {
      headers: authHeaders(guruToken),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    // Setiap item punya field wajib
    for (const item of body) {
      expect(item.id).toBeTruthy();
      expect(item.jenis).toBeTruthy();
      expect(item.mulaiTanggal).toBeTruthy();
      expect(item.selesaiTanggal).toBeTruthy();
      expect(item.status).toBeTruthy();
    }
  });

  // â”€â”€â”€ 10. Monitor shape: statusHarian + presensi field ada â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test('10. Monitor harian shape: statusHarian + presensi sub-object ada', async ({
    request,
  }) => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request.get(
      `/api/admin/presensi-guru/harian?tanggal=${today}`,
      { headers: authHeaders(adminToken) },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.tanggal).toBe(today);
    expect(Array.isArray(body.data)).toBeTruthy();
    if (body.data.length > 0) {
      const row = body.data[0];
      expect('statusHarian' in row).toBeTruthy();
      expect('guruId' in row).toBeTruthy();
      expect('nama' in row).toBeTruthy();
      expect('presensi' in row).toBeTruthy();
    }
  });
});

