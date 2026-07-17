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
};


export { ApiError };
