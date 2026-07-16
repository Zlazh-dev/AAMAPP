import { APIRequestContext } from '@playwright/test';

/** Header Authorization Bearer siap pakai dari accessToken. */
export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Tandai satu tanggal sbg libur via admin API (dipakai hook seed spec). */
export async function seedLibur(
  request: APIRequestContext,
  token: string,
  tanggal: string,
  keterangan: string,
) {
  const res = await request.post('/api/admin/libur', {
    headers: authHeaders(token),
    data: { tanggal, keterangan },
  });
  if (!res.ok() && res.status() !== 409) {
    throw new Error(`seedLibur gagal (${res.status()}): ${await res.text()}`);
  }
}

/** Hapus penanda libur utk daftar tanggal via endpoint bulk (bersih-bersih). */
export async function bulkHapusLibur(
  request: APIRequestContext,
  token: string,
  tanggal: string[],
) {
  if (tanggal.length === 0) return;
  await request.post('/api/admin/libur/bulk', {
    headers: authHeaders(token),
    data: { tanggal, aksi: 'hapus' },
  });
}

/** Hapus satu siswa via admin API (bersih-bersih data uji). */
export async function deleteSiswa(
  request: APIRequestContext,
  token: string,
  id: number,
): Promise<void> {
  await request.delete(`/api/admin/siswa/${id}`, { headers: authHeaders(token) });
}

/**
 * T16-SPRINT: pastikan ada satu Tahun Ajaran AKTIF, idempoten — banyak
 * halaman (penugasan, jadwal) mensyaratkan TA aktif utk berfungsi. Pada
 * DB yang benar-benar kosong (fresh start T16 poin 2) TIDAK ada TA sama
 * sekali, jadi spec yang butuh TA HARUS memanggil ini di beforeEach
 * alih-alih mengasumsikan seed sudah menyediakannya.
 */
export async function ensureActiveTahunAjaran(
  request: APIRequestContext,
  token: string,
): Promise<{ id: number; nama: string; semester: number }> {
  const headers = authHeaders(token);
  const activeRes = await request.get('/api/admin/tahun-ajaran/active', { headers });
  if (activeRes.ok()) {
    const body = await activeRes.json();
    if (body && body.tahunAjaran) return body.tahunAjaran;
  }
  // Belum ada TA aktif -> buat baru (nama unik per tahun kalender agar
  // tidak bentrok dgn TA lain yg mungkin sudah dibuat spec paralel).
  const year = new Date().getFullYear();
  const nama = `${year}/${year + 1}`;
  const createRes = await request.post('/api/admin/tahun-ajaran', {
    headers,
    data: { nama, semester: 1 },
  });
  let ta: any;
  if (createRes.ok()) {
    ta = await createRes.json();
  } else {
    // Kemungkinan sudah ada (409) dari run lain -> ambil dari daftar.
    const listRes = await request.get('/api/admin/tahun-ajaran', { headers });
    const list = await listRes.json();
    ta = (list.data ?? list).find((t: any) => t.nama === nama) ?? (list.data ?? list)[0];
  }
  await request.post(`/api/admin/tahun-ajaran/${ta.id}/aktifkan`, { headers });
  return ta;
}
