/**
 * SEMUA tipe & fungsi API di satu file (pola SmpProfileWeb)
 */

// ============ TYPES ============

export type UserRole = 'admin' | 'guru' | 'kurikulum' | 'kesiswaan' | 'tu' | 'kepsek';

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
  status: 'active' | 'pending';
  hasPassword: boolean;
  googleLinked: boolean;
}

export interface UserProfile extends SafeUser {
  createdAt: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
  status: 'active' | 'pending';
  requestedRoles: string[];
  registrationNote: string | null;
  googleLinked: boolean;
  createdAt: string;
}

export interface UserDetail extends AdminUser {
  sessions: SessionInfo[];
}

export interface SessionInfo {
  id: number;
  deviceSummary: string;
  ipAddress: string;
  loginMethod: string;
  createdAt: string;
  lastActiveAt: string;
  current?: boolean;
  user?: { id: number; name: string; email: string };
}

export interface ActivityLogEntry {
  id: number;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  entityLabel: string | null;
  summary: string | null;
  ipAddress: string | null;
  deviceSummary: string | null;
  createdAt: string;
}

export interface ActivityLogResponse {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthConfig {
  googleClientId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: SafeUser;
}

// ============ DATA INDUK TYPES (T13) ============

export interface Guru {
  id: number;
  nama: string;
  nip: string | null;
  jenisKelamin: 'L' | 'P';
  telepon: string | null;
  fotoUrl: string;
  status: 'aktif' | 'nonaktif';
  userId: number | null;
  punyaAkun: boolean;
  jumlahPaket: number;
  waliKelas: Kelas[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuruListResponse {
  data: Guru[];
  total: number;
  page: number;
  limit: number;
}

export interface Siswa {
  id: number;
  nama: string;
  nis: string;
  nisn: string | null;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  agama: string | null;
  statusDalamKeluarga: string | null;
  anakKe: number | null;
  alamat: string | null;
  telepon: string | null;
  sekolahAsal: string | null;
  diterimaDiKelas: string | null;
  diterimaTanggal: string | null;
  namaAyah: string | null;
  pekerjaanAyah: string | null;
  namaIbu: string | null;
  pekerjaanIbu: string | null;
  namaWali: string | null;
  alamatWali: string | null;
  teleponWali: string | null;
  pekerjaanWali: string | null;
  fotoUrl: string;
  kelasId: number | null;
  kelas: Kelas | null;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
  updatedAt: string;
}

export interface SiswaListResponse {
  data: Siswa[];
  total: number;
  page: number;
  limit: number;
}

export interface Kelas {
  id: number;
  nama: string;
  tingkat: number; // 7 | 8 | 9
  fase: 'D' | 'E' | 'F';
  waliGuruId: number | null;
  waliGuru: Guru | null;
  createdAt: string;
  updatedAt: string;
}

export interface KelasListResponse {
  data: Kelas[];
  total: number;
  page: number;
  limit: number;
}

export interface UploadResponse {
  ok: boolean;
  filename: string;
  url: string;
  size: number;
  mime: string;
}

export interface ImportPreviewResult {
  valid: any[];
  errors: { baris: number; kolom: string; pesan: string }[];
}

export interface ImportCommitResult {
  tersimpan: number;
  dilewati: number;
}

// ============ PENGATURAN TYPES (T14) ============

export interface PengaturanEntry {
  key: string;
  value: any;
  updatedByName: string | null;
  updatedAt: string;
}

export interface ProfilSekolah {
  nama: string;
  jenjang: string;
  logoUrl: string;
  kepsekNama: string;
  kepsekNip: string;
  kepsekJabatan: string;
  alamat: string;
  kabKota: string;
}

export interface JamPresensi {
  jamMasuk: string;
  jamPulang: string;
  toleransiMenit: number;
  cutoff: string;
}

export interface LokasiPengaturan {
  aktif: boolean;
  lat: number;
  lng: number;
  radiusMeter: number;
}

export interface KkmPengaturan {
  nilai: number;
}

export interface TahunAjaran {
  id: number;
  nama: string;
  semester: 1 | 2;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiburEntry {
  id: number;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  createdAt: string;
  updatedAt: string;
}

// ============ KURIKULUM TYPES (T15) ============

export interface Mapel {
  id: number;
  nama: string;
  kode: string;
  kelompok: string;
  urutan: number;
  createdAt: string;
  updatedAt: string;
}

export interface MapelListResponse {
  data: Mapel[];
  total: number;
  page: number;
  limit: number;
}

export interface Penugasan {
  id: number;
  guruId: number;
  guruNama: string;
  mapelId: number;
  mapelNama: string;
  kelasId: number;
  kelasNama: string;
  tahunAjaranId: number;
  tahunAjaranNama: string;
  createdAt: string;
  updatedAt: string;
}

export interface JadwalKbm {
  id: number;
  hari: number; // 1=Senin..6=Sabtu
  jamKe: number;
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  penugasanId: number;
  guruNama: string;
  mapelNama: string;
  kelasNama: string;
  kelasId: number;
  tahunAjaranId: number;
  createdAt: string;
  updatedAt: string;
}

// ============ F2: GURU KBM & PRESENSI SISWA TYPES ============

export type StatusPresensi = 'H' | 'S' | 'I' | 'A' | 'T';

export interface GuruKbmSesi {
  jadwalKbmId: number;
  mapel: string;
  kelas: string;
  jamMulai: string;
  jamSelesai: string;
  sesiKe: number;
  status: 'TERLAKSANA' | 'BELUM';
}

export interface GuruKbmResponse {
  tanggal: string;
  sesi: GuruKbmSesi[];
}

export interface GuruRosterSiswaEntry {
  siswaId: number;
  nama: string;
  nis: string;
  status: StatusPresensi;
}

export interface GuruRosterResponse {
  jadwalKbmId: number;
  tanggal: string;
  kelas: string | null;
  mapel: string | null;
  tersimpan: boolean;
  siswa: GuruRosterSiswaEntry[];
}

export interface GuruRekapPresensiEntry {
  siswaId: number;
  nama: string;
  nis: string;
  rekap: Record<StatusPresensi, number> | null;
}

export interface GuruRekapPresensiResponse {
  data: GuruRekapPresensiEntry[];
  total: number;
  page: number;
  limit: number;
}

// ============ CACHE LAYER (§12.16c — stale-while-revalidate) ============

const CACHE_MAX = 50; // LRU cap ±50 entri
const CACHE_TTL = 60_000; // 60 detik

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cacheMap = new Map<string, CacheEntry>();

/** Ambil dari cache bila belum kedaluwarsa */
function cacheGet(key: string): any | null {
  const entry = cacheMap.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cacheMap.delete(key);
    return null;
  }
  // LRU: pindah ke akhir (paling baru diakses)
  cacheMap.delete(key);
  cacheMap.set(key, entry);
  return entry.data;
}

/** Simpan ke cache, evict entry tertua bila cap terlampaui */
function cacheSet(key: string, data: any): void {
  if (cacheMap.size >= CACHE_MAX) {
    // Hapus entry paling lama (Map menjaga urutan insert)
    const oldest = cacheMap.keys().next().value;
    if (oldest !== undefined) cacheMap.delete(oldest);
  }
  cacheMap.set(key, { data, timestamp: Date.now() });
}

/**
 * Invalidasi cache per-prefix (§12.16c).
 * Hapus semua entry yang URL-nya berawalan prefix.
 * Dipanggil otomatis setelah mutasi (POST/PATCH/DELETE).
 */
export function invalidateCache(prefix: string): void {
  for (const key of cacheMap.keys()) {
    if (key.startsWith(prefix)) {
      cacheMap.delete(key);
    }
  }
}

const TOKEN_KEY = 'aamapp_token';
const RETURN_TO_KEY = 'aamapp_return_to';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function setReturnTo(path: string): void {
  sessionStorage.setItem(RETURN_TO_KEY, path);
}

export function getAndClearReturnTo(): string | null {
  const path = sessionStorage.getItem(RETURN_TO_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);
  return path;
}

class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.message || 'Terjadi kesalahan');
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`/api${url}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 204) {
      return undefined as T;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // Handle 401 SESSION_IDLE
      if (res.status === 401) {
        if (data?.code === 'SESSION_IDLE') {
          setReturnTo(window.location.pathname + window.location.search);
        }
        clearToken();
        // Trigger redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw new ApiError(res.status, data);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(0, { message: 'Permintaan timed out. Coba lagi.' });
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, { message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' });
  }
}

// ─── Device token helpers (F3b kiosk) ───────────────────────────────────────
const DEVICE_TOKEN_KEY = 'aamapp_device_token';
const DEVICE_NAMA_KEY  = 'aamapp_device_nama';

export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function setDeviceToken(token: string, nama: string): void {
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
  localStorage.setItem(DEVICE_NAMA_KEY, nama);
}

export function clearDeviceToken(): void {
  localStorage.removeItem(DEVICE_TOKEN_KEY);
  localStorage.removeItem(DEVICE_NAMA_KEY);
}

export function getDeviceNama(): string | null {
  return localStorage.getItem(DEVICE_NAMA_KEY);
}

/**
 * Seperti `request`, tapi:
 * - Kirim header `X-Device-Token` (dari localStorage), BUKAN Bearer sesi.
 * - 401 → clearDeviceToken (token perangkat dicabut), TIDAK redirect ke /login.
 */
async function requestDevice<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getDeviceToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['X-Device-Token'] = token;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      if (res.status === 401) clearDeviceToken();
      throw new ApiError(res.status, data);
    }
    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new ApiError(0, { message: 'Permintaan timed out.' });
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, { message: 'Tidak dapat terhubung ke server.' });
  }
}

// ============ AUTH API ============

export const api = {
  // --- Public ---
  getAuthConfig: () => request<AuthConfig>('/auth/config'),

  // --- F2: Presensi siswa per KBM (kontrak briefs/F2-SPEC.md) ---
  getGuruKbm: (p: { tanggal?: string }) =>
    request<{
      tanggal: string;
      libur?: boolean;
      keteranganLibur?: string | null;
      sesi: Array<{
        jadwalKbmId: number;
        mapel: string;
        kelas: string;
        jamMulai: string;
        jamSelesai: string;
        sesiKe: number;
        status: 'TERLAKSANA' | 'BELUM';
      }>;
    }>(`/guru/kbm${p.tanggal ? `?tanggal=${encodeURIComponent(p.tanggal)}` : ''}`),

  getGuruKbmRoster: (p: { jadwalId: number; tanggal: string }) =>
    request<{
      jadwalKbmId: number;
      tanggal: string;
      kelas: string | null;
      mapel: string | null;
      tersimpan: boolean;
      siswa: Array<{
        siswaId: number;
        nama: string;
        nis: string;
        status: 'H' | 'S' | 'I' | 'A' | 'T';
      }>;
    }>(`/guru/kbm/${p.jadwalId}/roster?tanggal=${encodeURIComponent(p.tanggal)}`),

  postGuruKbmRoster: (p: {
    jadwalId: number;
    body: {
      tanggal: string;
      entri: { siswaId: number; status: 'H' | 'S' | 'I' | 'A' | 'T' }[];
      alasan?: string;
    };
  }) =>
    request<{ ok: boolean; presensiSesiId: number; ringkasan: Record<string, number> }>(
      `/guru/kbm/${p.jadwalId}/roster`,
      { method: 'POST', body: JSON.stringify(p.body) },
    ),

  koreksiGuruKbmRoster: (p: {
    jadwalId: number;
    body: {
      tanggal: string;
      entri: { siswaId: number; status: 'H' | 'S' | 'I' | 'A' | 'T' }[];
      alasan?: string;
    };
  }) =>
    request<{ ok: boolean; presensiSesiId: number; ringkasan: Record<string, number> }>(
      `/guru/kbm/${p.jadwalId}/roster`,
      { method: 'PATCH', body: JSON.stringify(p.body) },
    ),

  getMatriksPresensiSiswa: (kelasId: number, tanggal: string) =>
    request<{
      tanggal: string;
      kelasId: number;
      sesi: Array<{
        jadwalKbmId: number;
        mapel: string | null;
        guru: string | null;
        jamMulai: string;
        jamSelesai: string;
        status: 'TERLAKSANA' | 'BELUM';
        ringkasan: Record<string, number> | null;
      }>;
    }>(
      `/admin/presensi-siswa?kelasId=${kelasId}&tanggal=${encodeURIComponent(tanggal)}`,
    ),

  // --- F2: Rekap presensi per kelas (wali kelas | admin) ---
  getGuruKelasRekapPresensi: (p: {
    kelasId: number;
    dari: string;
    sampai: string;
    page?: number;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    search.set('kelasId', String(p.kelasId));
    search.set('dari', p.dari);
    search.set('sampai', p.sampai);
    if (p.page) search.set('page', String(p.page));
    if (p.limit) search.set('limit', String(p.limit));
    return request<GuruRekapPresensiResponse>(
      `/guru/kelas/rekap-presensi?${search.toString()}`,
    );
  },

  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  loginGoogle: (credential: string) =>
    request<LoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

  registerGoogle: (
    credential: string,
    requestedRoles: string[],
    note: string | null,
    deviceConsent: boolean,
  ) =>
    request<{ message: string }>('/auth/register-google', {
      method: 'POST',
      body: JSON.stringify({ credential, requestedRoles, note, deviceConsent }),
    }),

  // --- Authenticated ---
  me: () => request<SafeUser>('/auth/me'),

  logout: () =>
    request<{ message: string }>('/auth/logout', { method: 'POST' }),

  // --- Profile ---
  getProfile: () => request<UserProfile>('/profile'),

  updateProfile: (name: string) =>
    request<SafeUser>('/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  changePassword: (
    currentPassword: string | null,
    newPassword: string,
  ) =>
    request<{ message: string }>('/profile/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  linkGoogle: (credential: string) =>
    request<SafeUser>('/profile/link-google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

  unlinkGoogle: () =>
    request<SafeUser>('/profile/link-google', { method: 'DELETE' }),

  getOwnSessions: () => request<SessionInfo[]>('/profile/sessions'),

  revokeOwnSession: (id: number) =>
    request<{ message: string }>(`/profile/sessions/${id}`, {
      method: 'DELETE',
    }),

  // --- Admin: Users ---
  adminGetUsers: (params?: { q?: string; status?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status) search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    return request<{ data: AdminUser[]; total: number; page: number; limit: number }>(
      `/admin/users?${search.toString()}`,
    );
  },

  adminGetUser: (id: number) => request<UserDetail>(`/admin/users/${id}`),

  adminCreateUser: (data: {
    name: string;
    email: string;
    password: string;
    roles: string[];
  }) =>
    request<AdminUser>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminUpdateUser: (
    id: number,
    data: { name?: string; email?: string; password?: string; roles?: string[] },
  ) =>
    request<AdminUser>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/users'); return result; }),

  adminApproveUser: (id: number, roles: string[]) =>
    request<AdminUser>(`/admin/users/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ roles }),
    })
    .then((result) => { invalidateCache('/admin/users'); return result; }),

  adminDeleteUser: (id: number) =>
    request<{ message: string }>(`/admin/users/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/admin/users'); return result; }),

  // --- Admin: Sessions ---
  adminGetSessions: (params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    return request<{ data: SessionInfo[]; total: number; page: number; limit: number }>(
      `/admin/sessions?${search.toString()}`,
    );
  },

  adminRevokeSession: (id: number) =>
    request<{ message: string }>(`/admin/sessions/${id}`, {
      method: 'DELETE',
    })
    .then((result) => { invalidateCache('/admin/sessions'); return result; }),

  // --- Admin: Pending ---
  adminGetPending: () => request<AdminUser[]>('/admin/users/pending'),

  adminCountPending: () => request<{ count: number }>('/admin/users/pending/count'),

  // --- Admin: Activities ---
  adminGetActivities: (params: {
    page?: number;
    limit?: number;
    userId?: number;
    entity?: string;
    action?: string;
  }) => {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.userId) search.set('userId', String(params.userId));
    if (params.entity) search.set('entity', params.entity);
    if (params.action) search.set('action', params.action);
    return request<ActivityLogResponse>(
      `/admin/activities?${search.toString()}`,
    );
  },

  // --- Admin: Guru ---
  adminGetGuru: (params?: { q?: string; status?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status) search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    return request<GuruListResponse>(`/admin/guru?${search.toString()}`);
  },

  adminGetGuruById: (id: number) => request<Guru>(`/admin/guru/${id}`),

  adminCreateGuru: (data: {
    nama: string;
    nip?: string | null;
    jenisKelamin: 'L' | 'P';
    telepon?: string | null;
    fotoUrl?: string;
    status?: string;
  }) =>
    request<Guru>('/admin/guru', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/guru'); return result; }),

  adminUpdateGuru: (
    id: number,
    data: {
      nama?: string;
      nip?: string | null;
      jenisKelamin?: 'L' | 'P';
      telepon?: string | null;
      fotoUrl?: string;
      status?: string;
    },
  ) =>
    request<Guru>(`/admin/guru/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/guru'); return result; }),

  adminDeleteGuru: (id: number) =>
    request<{ message: string }>(`/admin/guru/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/admin/guru'); return result; }),

  // --- Admin: Siswa ---
  adminGetSiswa: (params?: { q?: string; kelasId?: number; status?: string; jenisKelamin?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.kelasId) search.set('kelasId', String(params.kelasId));
    if (params?.status) search.set('status', params.status);
    if (params?.jenisKelamin) search.set('jenisKelamin', params.jenisKelamin);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    return request<SiswaListResponse>(`/admin/siswa?${search.toString()}`);
  },

  adminGetSiswaById: (id: number) => request<Siswa>(`/admin/siswa/${id}`),

  adminCreateSiswa: (data: Partial<Siswa>) =>
    request<Siswa>('/admin/siswa', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/siswa'); return result; }),

  adminUpdateSiswa: (id: number, data: Partial<Siswa>) =>
    request<Siswa>(`/admin/siswa/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/siswa'); return result; }),

  adminDeleteSiswa: (id: number) =>
    request<{ message: string }>(`/admin/siswa/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/admin/siswa'); return result; }),

  // --- Admin: Kelas ---
  adminGetKelas: (params?: { q?: string; tingkat?: number; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.tingkat) search.set('tingkat', String(params.tingkat));
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    return request<KelasListResponse>(`/admin/kelas?${search.toString()}`);
  },

  adminGetKelasById: (id: number) => request<Kelas>(`/admin/kelas/${id}`),

  adminGetKelasDampakHapus: (id: number) =>
    request<{
      kelas: { id: number; nama: string; tingkat: number };
      siswa: number;
      penugasan: number;
      jadwal: number;
      sesiPresensi: number;
    }>(`/admin/kelas/${id}/dampak-hapus`),

  adminCreateKelas: (data: { nama: string; tingkat: number; fase?: string }) =>
    request<Kelas>('/admin/kelas', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/kelas'); return result; }),

  adminUpdateKelas: (id: number, data: { nama?: string; tingkat?: number; fase?: string }) =>
    request<Kelas>(`/admin/kelas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/kelas'); return result; }),

  adminDeleteKelas: (id: number) =>
    request<{ message: string }>(`/admin/kelas/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/admin/kelas'); return result; }),

  adminSetWaliKelas: (id: number, data: { waliGuruId: number | null; force?: boolean }) =>
    request<Kelas>(`/admin/kelas/${id}/wali`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/kelas'); return result; }),

  // --- Admin: Upload ---
  adminUploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<UploadResponse>('/admin/uploads', {
      method: 'POST',
      body: formData,
    });
  },

  // --- Admin: Import ---
  adminImportTemplate: (jenis: 'guru' | 'siswa') =>
    `/api/admin/import/template?jenis=${jenis}`,

  adminImportPreview: (jenis: 'guru' | 'siswa', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<ImportPreviewResult>(`/admin/import/preview?jenis=${jenis}`, {
      method: 'POST',
      body: formData,
    });
  },

  adminImportCommit: (jenis: 'guru' | 'siswa', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<ImportCommitResult>(`/admin/import/commit?jenis=${jenis}`, {
      method: 'POST',
      body: formData,
    }).then((result) => { invalidateCache(`/admin/${jenis}`); return result; });
  },

  // --- Pengaturan (T14) ---
  getPengaturan: () =>
    request<PengaturanEntry[]>('/pengaturan'),

  getPengaturanByKey: (key: string) =>
    request<PengaturanEntry>(`/pengaturan/${key}`),

  adminUpdatePengaturan: (key: string, value: any) =>
    request<PengaturanEntry>(`/admin/pengaturan/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    })
    .then((result) => { invalidateCache('/pengaturan'); return result; }),

  // --- Libur (T14) ---
  adminListLibur: () =>
    request<LiburEntry[]>('/admin/libur'),

  adminCreateLibur: (data: { tanggal: string; keterangan: string }) =>
    request<LiburEntry>('/admin/libur', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/libur'); return result; }),

  adminDeleteLibur: (id: number) =>
    request<{ ok: boolean }>(`/admin/libur/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/admin/libur'); return result; }),

  // --- Libur: seleksi-multi (T15-FIX) ---
  adminBulkLibur: (data: { tanggal: string[]; keterangan?: string; aksi: 'tandai' | 'hapus' }) =>
    request<{ dibuat?: number; dihapus?: number; dilewati: number }>('/admin/libur/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/libur'); return result; }),

  adminCekLiburNasional: () =>
    request<{ baru: number }>('/admin/libur/cek-nasional'),

  adminImporLiburNasional: (tahun: number) =>
    request<{ tanggal: string; keterangan: string; sudahAda: boolean }[]>(`/admin/libur/impor-nasional?tahun=${tahun}`),

  // --- Tahun Ajaran (T14) ---
  getTahunAjaranAktif: () =>
    request<TahunAjaran | null>('/admin/tahun-ajaran/active').then(r => (r as any).tahunAjaran ?? null),

  listTahunAjaran: () =>
    request<TahunAjaran[]>('/tahun-ajaran'),

  adminListTahunAjaran: () =>
    request<TahunAjaran[]>('/admin/tahun-ajaran'),

  adminCreateTahunAjaran: (data: { nama: string; semester: 1 | 2 }) =>
    request<TahunAjaran>('/admin/tahun-ajaran', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/admin/tahun-ajaran'); return result; }),

  adminDeleteTahunAjaran: (id: number) =>
    request<{ ok: boolean }>(`/admin/tahun-ajaran/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/admin/tahun-ajaran'); return result; }),

  adminAktifkanTahunAjaran: (id: number) =>
    request<TahunAjaran>(`/admin/tahun-ajaran/${id}/aktifkan`, {
      method: 'POST',
    })
    .then((result) => { invalidateCache('/admin/tahun-ajaran'); return result; }),

  // --- Kurikulum: Mapel (T15) ---
  getMapel: (params?: { q?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    return request<MapelListResponse>(`/kurikulum/mapel?${search.toString()}`);
  },

  getMapelById: (id: number) => request<Mapel>(`/kurikulum/mapel/${id}`),

  createMapel: (data: { nama: string; kode: string; kelompok: string; urutan: number }) =>
    request<Mapel>('/kurikulum/mapel', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/kurikulum/mapel'); return result; }),

  updateMapel: (id: number, data: { nama?: string; kode?: string; kelompok?: string; urutan?: number }) =>
    request<Mapel>(`/kurikulum/mapel/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/kurikulum/mapel'); return result; }),

  deleteMapel: (id: number) =>
    request<{ message: string }>(`/kurikulum/mapel/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/kurikulum/mapel'); return result; }),

  // --- Kurikulum: Penugasan (T15) ---
  getPenugasan: (params?: { taId?: number; guruId?: number; kelasId?: number; mapelId?: number }) => {
    const search = new URLSearchParams();
    if (params?.taId) search.set('taId', String(params.taId));
    if (params?.guruId) search.set('guruId', String(params.guruId));
    if (params?.kelasId) search.set('kelasId', String(params.kelasId));
    if (params?.mapelId) search.set('mapelId', String(params.mapelId));
    return request<{ data: any[]; taId: number }>(`/kurikulum/penugasan?${search.toString()}`)
      .then((res) => res.data.map((p: any) => ({
        id: p.id,
        guruId: p.guruId,
        guruNama: p.guru?.nama ?? '—',
        mapelId: p.mapelId,
        mapelNama: p.mapel?.nama ?? '—',
        kelasId: p.kelasId,
        kelasNama: p.kelas?.nama ?? '—',
        tahunAjaranId: p.tahunAjaranId,
        tahunAjaranNama: p.tahunAjaran?.nama ?? '—',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })) as Penugasan[]);
  },

  createPenugasan: (data: { guruId: number; mapelId: number; kelasIds: number[] }) =>
    request<Penugasan[]>('/kurikulum/penugasan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/kurikulum/penugasan'); return result; }),

  updatePenugasan: (id: number, data: { guruId: number }) =>
    request<any>(`/kurikulum/penugasan/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/kurikulum/penugasan'); return result; }),

  deletePenugasan: (id: number) =>
    request<{ message: string }>(`/kurikulum/penugasan/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/kurikulum/penugasan'); return result; }),

  // --- Kurikulum: Jadwal KBM (T15) ---
  getJadwal: (params?: { taId?: number; kelasId?: number; guruId?: number }) => {
    const search = new URLSearchParams();
    if (params?.taId) search.set('taId', String(params.taId));
    if (params?.kelasId) search.set('kelasId', String(params.kelasId));
    if (params?.guruId) search.set('guruId', String(params.guruId));
    return request<{ data: any[]; taId: number }>(`/kurikulum/jadwal?${search.toString()}`)
      .then((res) => res.data.map((j: any) => ({
        id: j.id,
        hari: j.hari,
        jamKe: j.sesiKe ?? 0,
        jamMulai: j.jamMulai,
        jamSelesai: j.jamSelesai,
        penugasanId: j.penugasanId,
        guruNama: j.penugasan?.guru?.nama ?? '—',
        mapelNama: j.penugasan?.mapel?.nama ?? '—',
        kelasNama: j.penugasan?.kelas?.nama ?? '—',
        kelasId: j.penugasan?.kelasId ?? 0,
        tahunAjaranId: j.penugasan?.tahunAjaranId ?? 0,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })) as JadwalKbm[]);
  },

  createJadwal: (data: { penugasanId: number; hari: number; sesiKe?: number; jamMulai: string; jamSelesai: string }) =>
    request<JadwalKbm>('/kurikulum/jadwal', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/kurikulum/jadwal'); return result; }),

  updateJadwal: (id: number, data: { penugasanId?: number; hari?: string; jamKe?: number; jamMulai?: string; jamSelesai?: string }) =>
    request<JadwalKbm>(`/kurikulum/jadwal/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    .then((result) => { invalidateCache('/kurikulum/jadwal'); return result; }),

  deleteJadwal: (id: number) =>
    request<{ message: string }>(`/kurikulum/jadwal/${id}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/kurikulum/jadwal'); return result; }),

  // --- Kurikulum: Dashboard counts (T15) ---
  getKurikulumDashboard: () =>
    request<{ mapelCount: number; penugasanCount: number; jadwalCount: number; taAktif: TahunAjaran | null }>(`/kurikulum/dashboard`),

  // --- F3a: Guru wajah (enrollment mandiri) ---
  guruWajahStatus: () =>
    request<{ enrolled: boolean; poses: number; faceUpdatedAt: string | null }>('/guru/wajah/status'),

  guruPutWajah: (data: { embeddings: number[][] }) =>
    request<{ ok: boolean; poses: number }>('/guru/wajah', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  guruPresensiScan: (data: { embedding: number[]; lat?: number; lng?: number; mode?: 'masuk' | 'pulang' }) =>
    request<{
      status: 'HADIR' | 'TERLAMBAT';
      checkInAt?: string;
      checkOutAt?: string;
      similarity: number;
      distanceMeter?: number;
      pesan: string;
    }>('/guru/presensi-scan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // --- F3a: Admin wajah ---
  adminGetWajah: (params?: { q?: string; page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    return request<{
      data: Array<{ id: number; nama: string; email: string; enrolled: boolean; poses: number; faceUpdatedAt: string | null }>;
      total: number; page: number; limit: number;
    }>(`/admin/wajah?${search.toString()}`);
  },

  adminPutWajah: (guruId: number, data: { embeddings: number[][] }) =>
    request<{ ok: boolean; poses: number }>(`/admin/wajah/${guruId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  adminDeleteWajah: (guruId: number) =>
    request<{ message: string }>(`/admin/wajah/${guruId}`, { method: 'DELETE' })
    .then((result) => { invalidateCache('/admin/wajah'); return result; }),

  // --- F3a: Admin presensi guru harian + manual ---
  adminGetPresensiGuruHarian: (params: { tanggal: string }) =>
    request<{
      data: Array<{
        guruId: number; nama: string; email: string;
        status: 'HADIR' | 'TERLAMBAT' | 'ALPHA' | null;
        checkInAt: string | null; checkOutAt: string | null;
        source: 'HP' | 'MANUAL' | 'KIOSK' | null;
        alasan: string | null;
      }>;
    }>(`/admin/presensi-guru/harian?tanggal=${encodeURIComponent(params.tanggal)}`),

  adminPostPresensiGuruManual: (data: {
    guruId: number;
    tanggal: string;
    status: 'HADIR' | 'TERLAMBAT' | 'ALPHA';
    checkInAt?: string;
    checkOutAt?: string;
    alasan: string;
  }) =>
    request<{ ok: boolean }>('/admin/presensi-guru/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // F3b: KIOSK — device-facing (pakai X-Device-Token, BUKAN Bearer sesi)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Tukar kode pairing 6-digit → deviceToken + nama perangkat.
   * PUBLIC — tidak butuh auth apapun.
   */
  kioskPair: (pairingCode: string) =>
    requestDevice<{ deviceToken: string; nama: string }>('/kiosk/pair', {
      method: 'POST',
      body: JSON.stringify({ pairingCode }),
    }),

  /**
   * Scan wajah 1:N → HADIR/TERLAMBAT atau 404 wajah tidak dikenali.
   * Header: X-Device-Token.
   */
  kioskScan: (data: { embedding: number[]; scannedAt?: string }) =>
    requestDevice<{
      guruId: number;
      guruNama: string;
      status: 'HADIR' | 'TERLAMBAT';
      jam: string;
    }>('/kiosk/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Manual NIP — catat source=KIOSK perluVerifikasi=true.
   * Header: X-Device-Token.
   */
  kioskManual: (data: { nip: string; scannedAt?: string }) =>
    requestDevice<{ status: 'PENDING' }>('/kiosk/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Heartbeat periodik → update lastSeenAt perangkat.
   * Header: X-Device-Token.
   */
  kioskHeartbeat: () =>
    requestDevice<{ ok: boolean }>('/kiosk/heartbeat', { method: 'POST' }),

  // --- F3b: Admin device kiosk (dibutuhkan AG-2 halaman admin) ---

  /** Daftar perangkat kiosk + isOnline + status pairing. */
  adminGetDeviceKiosk: () =>
    request<{
      data: Array<{
        id: number;
        nama: string;
        pairingCode: string | null;
        pairingExpiresAt: string | null;
        lastSeenAt: string | null;
        isOnline: boolean;
      }>;
    }>('/admin/device-kiosk'),

  /** Buat perangkat baru → kode pairing 6 digit. */
  adminCreateDeviceKiosk: (nama: string) =>
    request<{
      id: number;
      nama: string;
      pairingCode: string;
      expiresAt: string;
    }>('/admin/device-kiosk', {
      method: 'POST',
      body: JSON.stringify({ nama }),
    }),

  /** Cabut perangkat (token mati). */
  adminDeleteDeviceKiosk: (id: number) =>
    request<void>(`/admin/device-kiosk/${id}`, { method: 'DELETE' }),

  // --- F3b: Admin presensi pending (verifikasi manual NIP kiosk) ---

  /** Daftar record perluVerifikasi=true. */
  adminGetPresensiPending: () =>
    request<{
      data: Array<{
        id: number;
        guruId: number;
        guruNama: string;
        nip: string | null;
        tanggal: string;
        checkInAt: string | null;
        status: string;
      }>;
    }>('/admin/presensi-guru/pending'),

  /** Terima atau tolak record pending. */
  adminVerifikasiPresensi: (id: number, data: { aksi: 'terima' | 'tolak'; status?: string; alasan?: string }) =>
    request<{ ok: boolean }>(`/admin/presensi-guru/${id}/verifikasi`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // F4a: Izin Guru (ajukan→approve/tolak)
  // ─────────────────────────────────────────────────────────────────────────

  /** Guru: ajukan izin baru (MENUNGGU). */
  guruAjukanIzin: (data: {
    jenis: 'IZIN' | 'SAKIT' | 'DINAS';
    mulaiTanggal: string;
    selesaiTanggal: string;
    keterangan: string;
    lampiranUrl?: string;
  }) =>
    request<{ id: number; status: string }>('/izin/guru', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Guru: daftar izin milik sendiri (terbaru dulu). */
  guruGetIzinSendiri: () =>
    request<{
      data: Array<{
        id: number;
        jenis: 'IZIN' | 'SAKIT' | 'DINAS';
        mulaiTanggal: string;
        selesaiTanggal: string;
        keterangan: string;
        lampiranUrl: string | null;
        status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';
        alasanKeputusan: string | null;
        disetujuiPada: string | null;
        createdAt: string;
      }>;
    }>('/izin/guru'),

  /** Admin/kepsek: daftar semua izin berpaginasi + filter. */
  adminGetIzinGuru: (params?: {
    status?: string;
    dari?: string;
    sampai?: string;
    guruId?: number;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.dari) q.set('dari', params.dari);
    if (params?.sampai) q.set('sampai', params.sampai);
    if (params?.guruId) q.set('guruId', String(params.guruId));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<{
      data: Array<{
        id: number;
        guruId: number;
        guruNama: string;
        jenis: 'IZIN' | 'SAKIT' | 'DINAS';
        mulaiTanggal: string;
        selesaiTanggal: string;
        keterangan: string;
        lampiranUrl: string | null;
        status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';
        alasanKeputusan: string | null;
        disetujuiPada: string | null;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/admin/izin/guru${qs ? `?${qs}` : ''}`);
  },

  /** Admin/kepsek: setujui izin. */
  adminSetujuiIzin: (id: number, alasan?: string) =>
    request<{ ok: boolean }>(`/admin/izin/guru/${id}/setujui`, {
      method: 'PATCH',
      body: JSON.stringify({ alasan }),
    }),

  /** Admin/kepsek: tolak izin (alasan WAJIB). */
  adminTolakIzin: (id: number, alasan: string) =>
    request<{ ok: boolean }>(`/admin/izin/guru/${id}/tolak`, {
      method: 'PATCH',
      body: JSON.stringify({ alasan }),
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // F4b: Dashboard agregat + Laporan
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Dashboard admin: kartu agregat kehadiran guru/KBM/siswa + feed + perlu perhatian.
   * GET /api/admin/dashboard?tanggal=YYYY-MM-DD
   */
  adminGetDashboard: (tanggal?: string) => {
    const qs = tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : '';
    return request<{
      guruStatus: {
        HADIR: number; TERLAMBAT: number; IZIN: number;
        SAKIT: number; DINAS: number; ALPHA: number; LIBUR: number;
      };
      kbm: { terlaksana: number; kosong: number };
      siswa: { hadir: number; alpha: number; total: number };
      perluPerhatian: { izinMenunggu: number; presensiPending: number };
      feed: Array<{ waktu: string; pesan: string; tipe: string }>;
    }>(`/admin/dashboard${qs}`);
  },

  /**
   * Laporan harian guru: Σ hadir/telat/izin/sakit/dinas/alpha/libur per guru.
   * GET /api/admin/laporan/harian-guru?dari=&sampai=&guruId?
   */
  adminGetLaporanHarianGuru: (params: { dari: string; sampai: string; guruId?: number }) => {
    const q = new URLSearchParams({ dari: params.dari, sampai: params.sampai });
    if (params.guruId) q.set('guruId', String(params.guruId));
    return request<{
      data: Array<{
        guruId: number; guruNama: string;
        hadir: number; terlambat: number; izin: number;
        sakit: number; dinas: number; alpha: number; libur: number;
        persen: number;
      }>;
    }>(`/admin/laporan/harian-guru?${q}`);
  },

  /**
   * Laporan keterlaksanaan KBM per guru/kelas/mapel.
   * GET /api/admin/laporan/keterlaksanaan-kbm?dari=&sampai=&guruId?&kelasId?&mapelId?
   */
  adminGetLaporanKeterlaksanaan: (params: {
    dari: string; sampai: string;
    guruId?: number; kelasId?: number; mapelId?: number;
  }) => {
    const q = new URLSearchParams({ dari: params.dari, sampai: params.sampai });
    if (params.guruId) q.set('guruId', String(params.guruId));
    if (params.kelasId) q.set('kelasId', String(params.kelasId));
    if (params.mapelId) q.set('mapelId', String(params.mapelId));
    return request<{
      data: Array<{
        guruId: number; guruNama: string; kelas: string; mapel: string;
        totalKbm: number; terlaksana: number; persen: number;
      }>;
    }>(`/admin/laporan/keterlaksanaan-kbm?${q}`);
  },

  /**
   * Laporan kehadiran siswa per kelas/mapel.
   * GET /api/admin/laporan/siswa?dari=&sampai=&kelasId?&mapelId?
   */
  adminGetLaporanSiswa: (params: {
    dari: string; sampai: string; kelasId?: number; mapelId?: number;
  }) => {
    const q = new URLSearchParams({ dari: params.dari, sampai: params.sampai });
    if (params.kelasId) q.set('kelasId', String(params.kelasId));
    if (params.mapelId) q.set('mapelId', String(params.mapelId));
    return request<{
      data: Array<{
        siswaId: number; siswaNama: string; kelas: string;
        hadir: number; sakit: number; izin: number; alpha: number; terlambat: number;
        persen: number;
      }>;
    }>(`/admin/laporan/siswa?${q}`);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // F4c: Rekap TU bulanan
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * TU: rekap bulanan per guru (basis gaji).
   * GET /api/tu/rekap-guru?bulan=YYYY-MM  (@Roles 'tu','admin')
   */
  getTuRekapGuru: (bulan: string) =>
    request<{
      data: Array<{
        guruId: number;
        guruNama: string;
        nip: string | null;
        hariWajib: number;
        hadir: number;
        terlambat: number;
        izin: number;
        sakit: number;
        dinas: number;
        alpha: number;
        libur: number;
        persen: number;
      }>;
    }>(`/tu/rekap-guru?bulan=${encodeURIComponent(bulan)}`),

  // ── F5a: Katalog Tata Tertib ───────────────────────────────────────────────
  getKatalog: (params?: { q?: string; kategori?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set('q', params.q);
    if (params?.kategori) q.set('kategori', params.kategori);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ data: KatalogEntry[]; total: number; page: number; limit: number }>(
      `/kesiswaan/katalog?${q}`,
    );
  },

  createKatalog: (data: { bentuk: string; kategori: KategoriPelanggaran; poin: number }) =>
    request<KatalogEntry>('/kesiswaan/katalog', { method: 'POST', body: JSON.stringify(data) }),

  updateKatalog: (id: number, data: Partial<{ bentuk: string; kategori: KategoriPelanggaran; poin: number; aktif: boolean }>) =>
    request<KatalogEntry>(`/kesiswaan/katalog/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteKatalog: (id: number) =>
    request<void>(`/kesiswaan/katalog/${id}`, { method: 'DELETE' }),

  // ── F5a: Pelanggaran ───────────────────────────────────────────────────────
  catatPelanggaran: (data: {
    siswaId: number;
    katalogId?: number;
    kategori?: KategoriPelanggaran;
    poin?: number;
    tanggal: string;
    catatan?: string;
    buktiUrl?: string;
  }) => request<PelanggaranEntry>('/kesiswaan/pelanggaran', { method: 'POST', body: JSON.stringify(data) }),

  getPelanggaran: (params?: {
    siswaId?: number; kelasId?: number; status?: StatusPelanggaran;
    dari?: string; sampai?: string; page?: number; limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.siswaId) q.set('siswaId', String(params.siswaId));
    if (params?.kelasId) q.set('kelasId', String(params.kelasId));
    if (params?.status) q.set('status', params.status);
    if (params?.dari) q.set('dari', params.dari);
    if (params?.sampai) q.set('sampai', params.sampai);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ data: PelanggaranEntry[]; total: number; page: number; limit: number }>(
      `/kesiswaan/pelanggaran?${q}`,
    );
  },

  getVerifikasiAntrean: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ data: PelanggaranEntry[]; total: number; page: number; limit: number }>(
      `/kesiswaan/verifikasi?${q}`,
    );
  },

  setujuiPelanggaran: (id: number) =>
    request<PelanggaranEntry>(`/kesiswaan/pelanggaran/${id}/setujui`, { method: 'PATCH' }),

  tolakPelanggaran: (id: number, alasan: string) =>
    request<PelanggaranEntry>(`/kesiswaan/pelanggaran/${id}/tolak`, {
      method: 'PATCH',
      body: JSON.stringify({ alasan }),
    }),

  getSaldo: (siswaId: number) =>
    request<SaldoEntry>(`/kesiswaan/saldo?siswaId=${siswaId}`),

  getSaldoBatch: (kelasId: number) =>
    request<{ data: SaldoEntry[] }>(`/kesiswaan/saldo?kelasId=${kelasId}`),

  // ── F5b: Tindak Lanjut ────────────────────────────────────────────────────
  getTindakLanjut: (status?: string, kelasId?: number) => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (kelasId) q.set('kelasId', String(kelasId));
    q.set('limit', '50');
    return request<{ data: any[]; total: number }>(`/kesiswaan/tindak-lanjut?${q}`);
  },

  selesaiTindakLanjut: (id: number, catatanPelaksanaan: string) =>
    request<any>(`/kesiswaan/tindak-lanjut/${id}/selesai`, {
      method: 'PATCH',
      body: JSON.stringify({ catatanPelaksanaan }),
    }),

  // ── F5b: Reward ────────────────────────────────────────────────────────────
  getReward: (tahunAjaranId?: number) => {
    const q = new URLSearchParams();
    if (tahunAjaranId) q.set('tahunAjaranId', String(tahunAjaranId));
    return request<{ sangatBaik: any[]; baik: any[] }>(`/kesiswaan/reward?${q}`);
  },

  // ── F5b: Laporan Demerit ──────────────────────────────────────────────────
  getLaporanDemerit: (params: { dari: string; sampai: string; kelasId?: number; limit?: number }) => {
    const q = new URLSearchParams();
    q.set('dari', params.dari);
    q.set('sampai', params.sampai);
    if (params.kelasId) q.set('kelasId', String(params.kelasId));
    if (params.limit) q.set('limit', String(params.limit));
    return request<{ data: any[]; total: number }>(`/kesiswaan/laporan/demerit?${q}`);
  },

  // ── F6a: Penilaian Guru ───────────────────────────────────────────────────
  getPenilaianPaket: () =>
    request<{ data: any[] }>('/guru/penilaian'),

  getTpList: (penugasanId: number) =>
    request<{ data: any[] }>(`/guru/penilaian/${penugasanId}/tp`),

  createTp: (penugasanId: number, body: { deskripsi: string; urutan?: number }) =>
    request<any>(`/guru/penilaian/${penugasanId}/tp`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTp: (tpId: number, body: { deskripsi?: string; urutan?: number }) =>
    request<any>(`/guru/penilaian/tp/${tpId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteTp: (tpId: number) =>
    request<any>(`/guru/penilaian/tp/${tpId}`, { method: 'DELETE' }),

  getPenilaianList: (penugasanId: number) =>
    request<{ data: any[] }>(`/guru/penilaian/${penugasanId}/penilaian`),

  createPenilaian: (penugasanId: number, body: any) =>
    request<any>(`/guru/penilaian/${penugasanId}/penilaian`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updatePenilaian: (penilaianId: number, body: any) =>
    request<any>(`/guru/penilaian/penilaian/${penilaianId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deletePenilaian: (penilaianId: number) =>
    request<any>(`/guru/penilaian/penilaian/${penilaianId}`, { method: 'DELETE' }),

  getNilaiList: (penilaianId: number) =>
    request<any>(`/guru/penilaian/penilaian/${penilaianId}/nilai`),

  putNilai: (penilaianId: number, body: { entri: { siswaId: number; nilai: number | null; catatan?: string }[] }) =>
    request<any>(`/guru/penilaian/penilaian/${penilaianId}/nilai`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getRekapNilai: (penugasanId: number) =>
    request<{ data: any[] }>(`/guru/penilaian/${penugasanId}/rekap`),

  // ── F6b: Rapor ────────────────────────────────────────────────────────────
  getRaporKelasOptions: () =>
    request<{ data: any[] }>('/rapor/kelas-options'),

  getRaporKelas: (kelasId: number, tahunAjaranId?: number) => {
    const q = new URLSearchParams();
    if (tahunAjaranId) q.set('tahunAjaranId', String(tahunAjaranId));
    return request<{ data: any[] }>(`/rapor/kelas/${kelasId}?${q}`);
  },

  getRaporSiswa: (siswaId: number, tahunAjaranId?: number) => {
    const q = new URLSearchParams();
    if (tahunAjaranId) q.set('tahunAjaranId', String(tahunAjaranId));
    return request<any>(`/rapor/siswa/${siswaId}?${q}`);
  },

  putRaporOverride: (siswaId: number, mapelId: number, body: { nilaiKatrol?: number | null; deskripsiOverride?: string | null }) =>
    request<any>(`/rapor/siswa/${siswaId}/mapel/${mapelId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patchCatatanWali: (siswaId: number, body: { catatanWali: string }) =>
    request<any>(`/rapor/siswa/${siswaId}/catatan`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  finalisasiRapor: (siswaId: number) =>
    request<any>(`/rapor/siswa/${siswaId}/finalisasi`, { method: 'PATCH' }),

  batalFinalRapor: (siswaId: number) =>
    request<any>(`/rapor/siswa/${siswaId}/batal-final`, { method: 'PATCH' }),

  // ── F6c: Kokurikuler ──────────────────────────────────────────────────────
  getKokurikulerKegiatan: () =>
    request<{ data: any[] }>('/kokurikuler/kegiatan'),

  createKokurikulerKegiatan: (body: { tema: string; semester: number; targetDimensi: string[] }) =>
    request<any>('/kokurikuler/kegiatan', { method: 'POST', body: JSON.stringify(body) }),

  updateKokurikulerKegiatan: (id: number, body: any) =>
    request<any>(`/kokurikuler/kegiatan/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteKokurikulerKegiatan: (id: number) =>
    request<any>(`/kokurikuler/kegiatan/${id}`, { method: 'DELETE' }),

  getKokurikulerTim: (kegiatanId: number) =>
    request<{ data: any[] }>(`/kokurikuler/kegiatan/${kegiatanId}/tim`),

  assignKokurikulerTim: (kegiatanId: number, body: { kelasId: number; guruIds: number[] }) =>
    request<any>(`/kokurikuler/kegiatan/${kegiatanId}/tim`, { method: 'PUT', body: JSON.stringify(body) }),

  removeKokurikulerTim: (kegiatanId: number, kelasId: number, guruId: number) =>
    request<any>(`/kokurikuler/kegiatan/${kegiatanId}/tim/${kelasId}/${guruId}`, { method: 'DELETE' }),

  getKokurikulerAsesmen: (kegiatanId: number, kelasId: number) =>
    request<any>(`/kokurikuler/asesmen?kegiatanId=${kegiatanId}&kelasId=${kelasId}`),

  putKokurikulerAsesmen: (kegiatanId: number, kelasId: number | null, body: { entri: any[] }) =>
    request<any>(`/kokurikuler/asesmen?kegiatanId=${kegiatanId}&kelasId=${kelasId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getRaporKokurikuler: (siswaId: number, semester: number) =>
    request<any>(`/kokurikuler/rapor/${siswaId}?semester=${semester}`),

  getGuruKokurikuler: () =>
    request<{ data: any[] }>('/kokurikuler/guru/kegiatan'),

  // ── F6d: Ekstrakurikuler ──────────────────────────────────────────────────
  getEkskul: () => request<{ data: any[] }>('/ekskul'),

  createEkskul: (body: { nama: string; pembinaGuruId?: number | null }) =>
    request<any>('/ekskul', { method: 'POST', body: JSON.stringify(body) }),

  updateEkskul: (id: number, body: any) =>
    request<any>(`/ekskul/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteEkskul: (id: number) =>
    request<any>(`/ekskul/${id}`, { method: 'DELETE' }),

  getEkskulDetail: (id: number, semester: number) =>
    request<any>(`/ekskul/${id}?semester=${semester}`),

  addEkskulPeserta: (id: number, body: { siswaId: number }) =>
    request<any>(`/ekskul/${id}/peserta`, { method: 'POST', body: JSON.stringify(body) }),

  removeEkskulPeserta: (id: number, pesertaId: number) =>
    request<any>(`/ekskul/${id}/peserta/${pesertaId}`, { method: 'DELETE' }),

  createEkskulTujuan: (id: number, body: { semester: number; deskripsi: string }) =>
    request<any>(`/ekskul/${id}/tujuan`, { method: 'POST', body: JSON.stringify(body) }),

  updateEkskulTujuan: (id: number, tujuanId: number, body: { deskripsi: string }) =>
    request<any>(`/ekskul/${id}/tujuan/${tujuanId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteEkskulTujuan: (id: number, tujuanId: number) =>
    request<any>(`/ekskul/${id}/tujuan/${tujuanId}`, { method: 'DELETE' }),

  putEkskulNilai: (id: number, body: { semester: number; entri: any[] }) =>
    request<any>(`/ekskul/${id}/nilai`, { method: 'PUT', body: JSON.stringify(body) }),

  putEkskulKehadiran: (id: number, body: { semester: number; entri: any[] }) =>
    request<any>(`/ekskul/${id}/kehadiran`, { method: 'PUT', body: JSON.stringify(body) }),

  getRaporEkskul: (siswaId: number, semester: number) =>
    request<any>(`/ekskul/rapor/${siswaId}?semester=${semester}`),
};


// ─────────────────────────────────────────────────────────────────────────────
// F5a: Kesiswaan / Demerit
// ─────────────────────────────────────────────────────────────────────────────

export type KategoriPelanggaran = 'R' | 'S' | 'B' | 'SB' | 'KHUSUS';
export type StatusPelanggaran = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';
export type SumberPelanggaran = 'LANGSUNG' | 'LAPORAN' | 'OTOMATIS_T';

export interface KatalogEntry {
  id: number;
  nomor: number;
  bentuk: string;
  kategori: KategoriPelanggaran;
  poin: number;
  aktif: boolean;
}

export interface PelanggaranEntry {
  id: number;
  siswaId: number;
  siswaNama: string;
  siswaNis?: string;
  katalogId: number | null;
  katalogBentuk: string | null;
  kategori: KategoriPelanggaran;
  poin: number;
  tanggal: string;
  catatan: string | null;
  buktiUrl: string | null;
  sumber: SumberPelanggaran;
  status: StatusPelanggaran;
  pelaporNama: string | null;
  verifikatorNama: string | null;
  verifikasiPada: string | null;
  alasanKeputusan: string | null;
  tahunAjaranId: number;
  createdAt: string;
}

export interface SaldoEntry {
  siswaId: number;
  saldo: number;
  terpotong: number;
  perKategori: Partial<Record<KategoriPelanggaran, number>>;
}

export { ApiError };
