/**
 * Helper fetch LOKAL untuk halaman /admin/presensi-siswa.
 *
 * CATATAN PENTING (baca sebelum menghapus/mengubah):
 * Tugas ini (Roo/executor Frontend F2 Admin) DILARANG menyentuh
 * `frontend/src/api/client.ts` (pemilik: KIRO/Antigravity-1, lihat
 * briefs/F2-SPEC.md). File ini HANYA sementara agar halaman bisa langsung
 * berfungsi & diverifikasi — begitu KIRO mendaftarkan method resmi di
 * client.ts (lihat daftar di laporan agent), import di halaman ini
 * SEHARUSNYA diganti ke `api.adminGetPresensiSiswaMatriks` dkk. dan file
 * ini boleh dihapus.
 *
 * Pola auth & error mengikuti persis `request()` di client.ts (Bearer
 * token dari localStorage key yang sama, timeout 30s, redirect 401).
 */

const TOKEN_KEY = 'aamapp_token';

export class LocalApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.message || 'Terjadi kesalahan');
    this.status = status;
    this.body = body;
  }
}

async function localRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`/api${url}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new LocalApiError(res.status, data);
    }
    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new LocalApiError(0, { message: 'Permintaan timed out. Coba lagi.' });
    }
    if (err instanceof LocalApiError) throw err;
    throw new LocalApiError(0, {
      message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
    });
  }
}

// ============ TYPES (F2-SPEC kontrak DIKUNCI) ============

export type StatusPresensi = 'H' | 'S' | 'I' | 'A' | 'T';

export interface SesiMatriksRow {
  jadwalKbmId: number;
  mapel: string | null;
  guru: string | null;
  jamMulai: string;
  jamSelesai: string;
  status: 'TERLAKSANA' | 'BELUM';
  ringkasan: Record<StatusPresensi, number> | null;
}

export interface MatriksPresensiSiswaResponse {
  tanggal: string;
  kelasId: number;
  sesi: SesiMatriksRow[];
}

export interface RosterSiswaEntry {
  siswaId: number;
  nama: string;
  nis: string;
  status: StatusPresensi;
}

export interface RosterDetailResponse {
  jadwalKbmId: number;
  tanggal: string;
  kelas: string | null;
  mapel: string | null;
  tersimpan: boolean;
  siswa: RosterSiswaEntry[];
}

// ============ CALLS ============

/** GET /api/admin/presensi-siswa?kelasId=&tanggal= (admin|kepsek|kesiswaan baca) */
export function getMatriksPresensiSiswa(kelasId: number, tanggal: string) {
  const q = new URLSearchParams({ kelasId: String(kelasId), tanggal });
  return localRequest<MatriksPresensiSiswaResponse>(`/admin/presensi-siswa?${q.toString()}`);
}

/** GET /api/guru/kbm/:jadwalId/roster?tanggal= — admin juga diizinkan (RolesGuard) */
export function getRosterDetail(jadwalKbmId: number, tanggal: string) {
  const q = new URLSearchParams({ tanggal });
  return localRequest<RosterDetailResponse>(`/guru/kbm/${jadwalKbmId}/roster?${q.toString()}`);
}

/**
 * PATCH /api/guru/kbm/:jadwalId/roster — koreksi (admin boleh pasca-cutoff
 * + body.alasan WAJIB bila tanggal ≠ hari ini → audit).
 */
export function koreksiRoster(
  jadwalKbmId: number,
  data: { tanggal: string; entri: { siswaId: number; status: StatusPresensi }[]; alasan?: string },
) {
  return localRequest<{ ok: boolean; presensiSesiId: number; ringkasan: Record<string, number> }>(
    `/guru/kbm/${jadwalKbmId}/roster`,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
}
