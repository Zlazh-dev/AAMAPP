import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';
import { ensureActiveTahunAjaran } from '../helpers/api';

/**
 * T16-SPRINT lanjutan â€” Matriks Jadwal KBM: Tambah slot via panel UI,
 * bentrok KELAS (409 di dalam panel), bentrok GURU lintas kelas (409 di
 * dalam panel), Hapus slot. Â§12.17e: entitas unik per run + cleanup via
 * API di afterEach.
 */
test.describe('CRUD Jadwal KBM (Matriks T16 lanjutan)', () => {
  const createdGuruIds: number[] = [];
  const createdKelasIds: number[] = [];
  const createdMapelIds: number[] = [];
  const createdPenugasanIds: number[] = [];
  const createdJadwalIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
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
    createdJadwalIds.length = 0;
    createdPenugasanIds.length = 0;
    createdMapelIds.length = 0;
    createdKelasIds.length = 0;
    createdGuruIds.length = 0;
  });

  test('Tambah slot via panel; bentrok KELAS 409; bentrok GURU lintas kelas 409; Hapus slot', async ({ page, request }) => {
    const token = await page.evaluate(() => localStorage.getItem('aamapp_token'));
    const headers = { Authorization: `Bearer ${token}` };
    await ensureActiveTahunAjaran(request, token as string);
    const suffix = Date.now();

    const guruRes = await request.post('/api/admin/guru', {
      headers, data: { nip: `JW1${suffix}`.slice(0, 20), nama: `Guru Jadwal ${suffix}`, jenisKelamin: 'L', status: 'aktif' },
    });
    const guru = await guruRes.json();
    createdGuruIds.push(guru.id);

    const mapelRes = await request.post('/api/kurikulum/mapel', {
      headers, data: { nama: `Mapel Jadwal ${suffix}`, kode: `MJ${suffix}`.slice(0, 20), kelompok: 'A', urutan: 1 },
    });
    const mapel = await mapelRes.json();
    createdMapelIds.push(mapel.id);

    const kelasARes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 7, nama: `KJA-${suffix}` } });
    const kelasA = await kelasARes.json();
    createdKelasIds.push(kelasA.id);

    const kelasBRes = await request.post('/api/admin/kelas', { headers, data: { tingkat: 7, nama: `KJB-${suffix}` } });
    const kelasB = await kelasBRes.json();
    createdKelasIds.push(kelasB.id);

    // Dua paket dengan guru yang sama, di dua kelas berbeda (utk uji
    // bentrok guru lintas kelas nanti).
    const penugasanARes = await request.post('/api/kurikulum/penugasan', {
      headers, data: { guruId: guru.id, mapelId: mapel.id, kelasIds: [kelasA.id] },
    });
    const penugasanA = (await penugasanARes.json())[0];
    createdPenugasanIds.push(penugasanA.id);

    const penugasanBRes = await request.post('/api/kurikulum/penugasan', {
      headers, data: { guruId: guru.id, mapelId: mapel.id, kelasIds: [kelasB.id] },
    });
    const penugasanB = (await penugasanBRes.json())[0];
    createdPenugasanIds.push(penugasanB.id);

    // Helper: pilih kelas via SearchSelect (bukan native select).
    const pilihKelas = async (namaKelas: string) => {
      // Buka SearchSelect: klik label "Pilih Kelas" atau tombol trigger.
      const trigger = page.locator('label:has-text("Pilih Kelas") + *').first();
      await trigger.click().catch(async () => {
        // Fallback: klik tombol dgn teks "Pilih kelas".
        await page.getByRole('button').filter({ hasText: /Pilih kelas/i }).first().click();
      });
      // Ketik di input pencarian.
      await page.waitForTimeout(300);
      const searchInput = page.getByPlaceholder(/Cari nama kelas/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill(namaKelas);
        await page.waitForTimeout(500);
        // Klik hasil.
        const results = page.locator('button').filter({ hasText: new RegExp(namaKelas) });
        await results.last().click();
      }
    };

    // 1. Tambah slot pertama via UI panel: kelas A, Senin 07:00-07:40.
    await page.goto('/kurikulum/jadwal');
    await pilihKelas(kelasA.nama);

    // Klik slot kosong pertama pada kolom Senin -- selalu pakai baris "+
    // Tambah" paling bawah (baris terakhir tbody), krn baris per-jam bisa
    // punya "+" di kolom hari lain yg membingungkan locator generik.
    await page.locator('tbody tr').last().getByRole('button', { name: '+' }).nth(0).click();
    await expect(page.getByRole('heading', { name: /Tambah Slot/ })).toBeVisible();
    await page.locator('select').last().selectOption({ value: String(penugasanA.id) });
    await page.locator('input[type="time"]').first().fill('07:00');
    await page.locator('input[type="time"]').last().fill('07:40');
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/slot jadwal ditambahkan/i)).toBeVisible();

    const listAfterFirst = await request.get(`/api/kurikulum/jadwal?kelasId=${kelasA.id}`, { headers });
    const firstJadwal = (await listAfterFirst.json()).data[0];
    createdJadwalIds.push(firstJadwal.id);

    // 2. Bentrok KELAS: tambah slot lain di kelas A, Senin, waktu overlap.
    await page.reload();
    await pilihKelas(kelasA.nama);
    await page.locator('tbody tr').last().getByRole('button', { name: '+' }).nth(0).click();
    await page.locator('select').last().selectOption({ value: String(penugasanA.id) });
    await page.locator('input[type="time"]').first().fill('07:20');
    await page.locator('input[type="time"]').last().fill('08:00');
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(/sudah ada kbm/i)).toBeVisible();

    // 3. Bentrok GURU lintas kelas: kelas B, Senin, waktu overlap dgn guru sama.
    await page.getByRole('button', { name: 'Batal' }).click();
    await page.reload();
    await pilihKelas(kelasB.nama);
    await page.locator('tbody tr').last().getByRole('button', { name: '+' }).nth(0).click();
    await page.locator('select').last().selectOption({ value: String(penugasanB.id) });
    await page.locator('input[type="time"]').first().fill('07:00');
    await page.locator('input[type="time"]').last().fill('07:40');
    await page.getByRole('button', { name: 'save Simpan' }).click();
    await expect(page.getByText(new RegExp(`${guru.nama} sudah mengajar`, 'i'))).toBeVisible();

    // 4. Hapus slot: kembali ke kelas A, klik slot terisi -> confirm dialog.
    await page.getByRole('button', { name: 'Batal' }).click();
    await page.reload();
    await pilihKelas(kelasA.nama);
    const filledSlot = page.locator('.cursor-pointer', { hasText: mapel.nama });
    await expect(filledSlot).toBeVisible({ timeout: 10000 });
    await filledSlot.click();
    await page.getByRole('button', { name: 'Hapus', exact: true }).click();
    await expect(page.getByText(/slot dihapus/i)).toBeVisible();

    const listAfterDelete = await request.get(`/api/kurikulum/jadwal?kelasId=${kelasA.id}`, { headers });
    expect((await listAfterDelete.json()).data.length).toBe(0);
    createdJadwalIds.length = 0; // sudah terhapus, jangan dobel-hapus di afterEach
  });
});

