import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAs } from '../helpers/auth';
import { ensureActiveTahunAjaran, authHeaders } from '../helpers/api';

/**
 * F2-ADMIN-E2E — mengunci 4 perilaku dari F2-ADMIN-FIX2 (commit 5136bfb) di
 * `/admin/presensi-siswa` (MatriksPresensiSiswaPage + RosterDetailSheet),
 * supaya tidak regresi diam-diam:
 *
 * 1. Race guard: ganti kelas cepat -> matriks akhir menampilkan data kelas
 *    TERPILIH, bukan respons basi dari kelas sebelumnya.
 * 2. Role-gating: kepsek (non-admin) -> baris read-only, klik TIDAK membuka
 *    sheet koreksi; admin -> klik membuka sheet.
 * 3. Guard tanggal kosong: clear input date -> reset ke hari ini WIB, TIDAK
 *    pernah mengirim request dgn tanggal=''.
 * 4. Escape-to-close: sheet bersih (belum diubah) -> Esc menutup; sheet
 *    dirty (status diubah, belum disimpan) -> Esc diabaikan.
 *
 * Setup data murni via API (guru, mapel, kelas, siswa, penugasan, jadwal)
 * mengikuti pola `presensi-siswa.spec.ts` — nama kelas/mapel diberi suffix
 * unik per test agar bisa dipakai sbg penanda visual di assertion (mis.
 * memastikan matriks kelas B tampil, bukan kelas A, tanpa bergantung pada
 * urutan render).
 */
test.describe('F2-ADMIN-FIX2 — Matriks Presensi Siswa (regresi terkunci)', () => {
  const createdGuruIds: number[] = [];
  const createdKelasIds: number[] = [];
  const createdMapelIds: number[] = [];
  const createdPenugasanIds: number[] = [];
  const createdJadwalIds: number[] = [];
  const createdSiswaIds: number[] = [];
  const createdUserIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page, request }) => {
    // Re-login sbg admin (page mungkin sudah beralih ke akun kepsek uji).
    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = authHeaders(token as string);
    for (const uid of createdUserIds) {
      await request.delete(`/api/admin/users/${uid}`, { headers }).catch(() => {});
    }
    for (const sid of createdSiswaIds) {
      await request.delete(`/api/admin/siswa/${sid}`, { headers }).catch(() => {});
    }
    for (const jid of createdJadwalIds) {
      await request.delete(`/api/kurikulum/jadwal/${jid}`, { headers }).catch(() => {});
    }
    for (const pid of createdPenugasanIds) {
      await request.delete(`/api/kurikulum/penugasan/${pid}`, { headers }).catch(() => {});
    }
    for (const mid of createdMapelIds) {
      await request.delete(`/api/kurikulum/mapel/${mid}`, { headers }).catch(() => {});
    }
    for (const kid of createdKelasIds) {
      await request.delete(`/api/admin/kelas/${kid}`, { headers }).catch(() => {});
    }
    for (const gid of createdGuruIds) {
      await request.delete(`/api/admin/guru/${gid}`, { headers }).catch(() => {});
    }
    createdUserIds.length = 0;
    createdSiswaIds.length = 0;
    createdJadwalIds.length = 0;
    createdPenugasanIds.length = 0;
    createdMapelIds.length = 0;
    createdKelasIds.length = 0;
    createdGuruIds.length = 0;
  });

  function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Setup 1 kelas + guru + mapel + 1 siswa + jadwal HARI INI (sesi KBM). */
  async function setupKelasDenganSesi(request: any, token: string, suffix: string) {
    const headers = authHeaders(token);
    await ensureActiveTahunAjaran(request, token);

    const guruRes = await request.post('/api/admin/guru', {
      headers,
      data: { nip: `E2${suffix}`.slice(0, 20), nama: `Guru E2E ${suffix}`, jenisKelamin: 'L', status: 'aktif' },
    });
    const guru = await guruRes.json();

    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers,
      data: { nama: `Mapel E2E ${suffix}`, kode: `ME${suffix}`.slice(0, 20), kelompok: 'A', urutan: 1 },
    });
    const mapel = await mapelRes.json();

    const kelasRes = await request.post('/api/admin/kelas', {
      headers,
      data: { tingkat: 7, nama: `KE-${suffix}` },
    });
    const kelas = await kelasRes.json();

    const siswaRes = await request.post('/api/admin/siswa', {
      headers,
      data: { nama: `Siswa E2E ${suffix}`, nis: `SE${suffix}`.slice(0, 20), jenisKelamin: 'L', kelasId: kelas.id, status: 'aktif' },
    });
    const siswa = await siswaRes.json();

    const penugasanRes = await request.post('/api/kurikulum/penugasan', {
      headers,
      data: { guruId: guru.id, mapelId: mapel.id, kelasIds: [kelas.id] },
    });
    const penugasan = (await penugasanRes.json())[0];

    // Hari WIB hari ini (1=Senin..6=Sabtu, jadwal tidak dijadwalkan hari 7).
    const now = new Date();
    const wibNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const jsDay = wibNow.getDay(); // 0=Minggu..6=Sabtu
    const hari = jsDay === 0 ? 1 : jsDay;

    const jadwalRes = await request.post('/api/kurikulum/jadwal', {
      headers,
      data: { penugasanId: penugasan.id, hari, jamMulai: '00:00', jamSelesai: '23:59' },
    });
    const jadwal = await jadwalRes.json();

    return { guru, mapel, kelas, siswa, jadwal };
  }

  /** Buka halaman matriks & pilih satu kelas via AdaptiveSelect. */
  async function pilihKelas(page: import('@playwright/test').Page, namaKelas: string) {
    await page.getByRole('button', { name: 'Pilih Kelas' }).click();
    await page.getByRole('option', { name: new RegExp(`^${escapeRegex(namaKelas)} `) }).click();
  }

  test('1. Race guard: ganti kelas cepat -> matriks akhir sesuai kelas TERPILIH, bukan basi', async ({ page, request }) => {
    const token = (await page.evaluate(() => localStorage.getItem('aamapp_token'))) as string;
    const suffixA = `${Date.now()}RA`;
    const suffixB = `${Date.now()}RB`;
    const a = await setupKelasDenganSesi(request, token, suffixA);
    const b = await setupKelasDenganSesi(request, token, suffixB);
    createdGuruIds.push(a.guru.id, b.guru.id);
    createdMapelIds.push(a.mapel.id, b.mapel.id);
    createdKelasIds.push(a.kelas.id, b.kelas.id);
    createdSiswaIds.push(a.siswa.id, b.siswa.id);
    createdJadwalIds.push(a.jadwal.id, b.jadwal.id);

    // Tunda HANYA respons pertama utk kelas A (bikin "basi" saat B sudah
    // dipilih). Pola sama dgn saran FIX2: intersepsi Playwright.
    let delayedOnce = false;
    await page.route('**/api/admin/presensi-siswa**', async (route) => {
      const url = route.request().url();
      if (!delayedOnce && url.includes(`kelasId=${a.kelas.id}`)) {
        delayedOnce = true;
        await new Promise((r) => setTimeout(r, 1200));
      }
      await route.continue();
    });

    await page.goto('/admin/presensi-siswa');
    await expect(page.getByRole('heading', { name: 'Matriks Presensi Siswa' })).toBeVisible();

    // Pilih kelas A dulu (request lambat mulai berjalan di background)...
    await pilihKelas(page, a.kelas.nama);
    // ...lalu SEGERA ganti ke kelas B (request cepat) sebelum respons A tiba.
    await pilihKelas(page, b.kelas.nama);

    // Tunggu lebih lama dari delay A, supaya respons basi A pasti sudah tiba
    // (menguji bahwa guard `cancelled` benar2 menahan setState basi itu).
    await page.waitForTimeout(1800);

    // Matriks HARUS menampilkan mapel kelas B (terpilih), bukan kelas A (basi).
    await expect(page.getByText(b.mapel.nama).first()).toBeVisible();
    await expect(page.getByText(a.mapel.nama)).toHaveCount(0);
  });

  test('2. Role-gating: kepsek read-only (tak buka sheet), admin bisa klik buka sheet', async ({ page, request }) => {
    const token = (await page.evaluate(() => localStorage.getItem('aamapp_token'))) as string;
    const suffix = `${Date.now()}RG`;
    const { kelas, mapel, guru, siswa, jadwal } = await setupKelasDenganSesi(request, token, suffix);
    createdGuruIds.push(guru.id);
    createdMapelIds.push(mapel.id);
    createdKelasIds.push(kelas.id);
    createdSiswaIds.push(siswa.id);
    createdJadwalIds.push(jadwal.id);

    // Buat akun kepsek uji (pola sama dgn rbac-negatif.spec.ts).
    const headers = authHeaders(token);
    const kepsekEmail = `kepsek.fix2.${suffix}@test.com`;
    const kepsekPassword = 'password123XYZ';
    const userRes = await request.post('/api/admin/users', {
      headers,
      data: { name: `Kepsek FIX2 ${suffix}`, email: kepsekEmail, password: kepsekPassword, roles: ['kepsek'] },
    });
    expect(userRes.ok(), await userRes.text()).toBeTruthy();
    const kepsekUser = await userRes.json();
    createdUserIds.push(kepsekUser.id);

    // --- Sebagai ADMIN dulu (sesi dari beforeEach, TANPA re-login) ---
    // Urutan sengaja admin→kepsek: re-login balik ke admin di tengah test
    // (setelah sesi kepsek) rapuh — app bisa redirect ke /login sebelum
    // token admin sempat dipakai. Cek admin memakai sesi awal saja.
    await page.goto('/admin/presensi-siswa');
    await expect(page.getByRole('heading', { name: 'Matriks Presensi Siswa' })).toBeVisible();
    await pilihKelas(page, kelas.nama);
    await expect(page.getByText(mapel.nama).first()).toBeVisible();
    // Klik baris sesi -> sheet koreksi TERBUKA (admin boleh koreksi).
    await page.getByText(mapel.nama).first().click();
    await expect(page.getByText(new RegExp(`Roster ${escapeRegex(mapel.nama)}`))).toBeVisible();
    await page.getByRole('button', { name: 'Batal' }).click();

    // --- Sebagai KEPSEK (turun peran, tak perlu balik ke admin lagi) ---
    await loginAs(page, kepsekEmail, kepsekPassword);
    await page.goto('/admin/presensi-siswa');
    await expect(page.getByRole('heading', { name: 'Matriks Presensi Siswa' })).toBeVisible();
    await pilihKelas(page, kelas.nama);
    await expect(page.getByText(mapel.nama).first()).toBeVisible();
    // Klik baris sesi -> TIDAK membuka sheet koreksi (read-only, tak ada 403).
    await page.getByText(mapel.nama).first().click();
    await expect(page.getByText(new RegExp(`Roster ${escapeRegex(mapel.nama)}`))).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Simpan Koreksi' })).toHaveCount(0);
  });

  test('3. Guard tanggal kosong: clear input date -> reset ke hari ini, tak kirim tanggal=""', async ({ page, request }) => {
    const token = (await page.evaluate(() => localStorage.getItem('aamapp_token'))) as string;
    const suffix = `${Date.now()}TG`;
    const { kelas, mapel, guru, siswa, jadwal } = await setupKelasDenganSesi(request, token, suffix);
    createdGuruIds.push(guru.id);
    createdMapelIds.push(mapel.id);
    createdKelasIds.push(kelas.id);
    createdSiswaIds.push(siswa.id);
    createdJadwalIds.push(jadwal.id);

    const emptyDateRequests: string[] = [];
    await page.route('**/api/admin/presensi-siswa**', async (route) => {
      const url = route.request().url();
      if (/[?&]tanggal=(&|$)/.test(url)) {
        emptyDateRequests.push(url);
      }
      await route.continue();
    });

    await page.goto('/admin/presensi-siswa');
    await pilihKelas(page, kelas.nama);
    await expect(page.getByText(mapel.nama).first()).toBeVisible();

    const dateInput = page.locator('input[type="date"]');
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    await dateInput.fill('');

    // Tidak crash: halaman & matriks tetap tampil normal.
    await expect(page.getByRole('heading', { name: 'Matriks Presensi Siswa' })).toBeVisible();
    // Direset ke hari ini WIB (bukan dibiarkan kosong).
    await expect(dateInput).toHaveValue(todayStr);
    // Tidak pernah ada request dgn tanggal='' terkirim ke backend.
    expect(emptyDateRequests).toHaveLength(0);
  });

  test('4. Escape-to-close: tutup saat sheet bersih, diam saat sheet dirty', async ({ page, request }) => {
    const token = (await page.evaluate(() => localStorage.getItem('aamapp_token'))) as string;
    const suffix = `${Date.now()}ESC`;
    const { kelas, mapel, guru, siswa, jadwal } = await setupKelasDenganSesi(request, token, suffix);
    createdGuruIds.push(guru.id);
    createdMapelIds.push(mapel.id);
    createdKelasIds.push(kelas.id);
    createdSiswaIds.push(siswa.id);
    createdJadwalIds.push(jadwal.id);

    await page.goto('/admin/presensi-siswa');
    await pilihKelas(page, kelas.nama);
    await expect(page.getByText(mapel.nama).first()).toBeVisible();
    await page.getByText(mapel.nama).first().click();

    const sheetHeading = page.getByText(new RegExp(`Roster ${escapeRegex(mapel.nama)}`));
    await expect(sheetHeading).toBeVisible();

    // Sheet BERSIH (belum ada perubahan status) -> Esc menutup.
    await page.keyboard.press('Escape');
    await expect(sheetHeading).toHaveCount(0);

    // Buka lagi, ubah status siswa (dirty) -> Esc HARUS diabaikan.
    await page.getByText(mapel.nama).first().click();
    await expect(sheetHeading).toBeVisible();
    await page.getByText(siswa.nama).first().click(); // klik baris siswa -> cycle status (dirty=true)
    await page.keyboard.press('Escape');
    await expect(sheetHeading).toBeVisible(); // masih terbuka, tidak tertutup

    // Bersihkan manual via tombol "Batal" supaya tak bocor ke test lain.
    await page.getByRole('button', { name: 'Batal' }).click();
  });
});
