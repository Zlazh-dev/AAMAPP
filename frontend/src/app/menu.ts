import { SafeUser } from '../api/client';

export interface MenuItem {
  label: string;
  /** Path tujuan ketika baris diklik di sidebar. */
  path: string;
  icon: string;
  badgeKey?: 'pendingUsers';
}

export interface MenuGroup {
  area: string;
  label: string;
  items: MenuItem[];
}

/**
 * Leaf menu item — baris sidebar final yang punya path spesifik.
 * (Pakai tipe ini saat render dan saat cari active selection.)
 */
export interface MenuLeaf {
  /** Path final */
  path: string;
  /** Icon & label dari leaf itu sendiri */
  icon: string;
  label: string;
  /** Badge key (jika ada) */
  badgeKey?: 'pendingUsers';
}

// Menu per area per §6.1.B (urutan tetap) — SIDEBAR DATAR v0.12.0
const MENU_GROUPS: Record<string, MenuGroup> = {
  admin: {
    area: 'admin',
    label: 'ADMIN',
    items: [
      { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
      { label: 'Data Orang', path: '/admin/orang', icon: 'groups' },
      { label: 'Kelas', path: '/admin/kelas', icon: 'meeting_room' },
      { label: 'Presensi Siswa', path: '/admin/presensi-siswa', icon: 'fact_check' },
      { label: 'Presensi Guru', path: '/admin/presensi-guru', icon: 'person_check' },
      { label: 'Pendaftaran Wajah', path: '/admin/wajah', icon: 'face_retouching_natural' },
      { label: 'Perangkat Kiosk', path: '/admin/perangkat', icon: 'devices' },
      { label: 'Verifikasi Presensi', path: '/admin/presensi-guru-pending', icon: 'how_to_reg' },
      { label: 'Izin Guru', path: '/admin/izin-guru', icon: 'event_available' },
      { label: 'Laporan', path: '/admin/laporan', icon: 'assessment' },
      { label: 'Pengaturan', path: '/admin/pengaturan', icon: 'settings' },
      { label: 'Akun', path: '/admin/akun', icon: 'manage_accounts', badgeKey: 'pendingUsers' },
    ],
  },
  kurikulum: {
    area: 'kurikulum',
    label: 'KURIKULUM',
    items: [
      { label: 'Dashboard', path: '/kurikulum', icon: 'dashboard' },
      { label: 'Mata Pelajaran', path: '/kurikulum/mapel', icon: 'book' },
      { label: 'Penugasan', path: '/kurikulum/penugasan', icon: 'assignment_ind' },
      { label: 'Jadwal KBM', path: '/kurikulum/jadwal', icon: 'calendar_month' },
    ],
  },
  kesiswaan: {
    area: 'kesiswaan',
    label: 'KESISWAAN',
    items: [
      { label: 'Dashboard', path: '/kesiswaan', icon: 'dashboard' },
      { label: 'Tata Tertib', path: '/kesiswaan/tata-tertib', icon: 'gavel' },
      { label: 'Pelanggaran', path: '/kesiswaan/pelanggaran', icon: 'warning' },
      { label: 'Verifikasi', path: '/kesiswaan/verifikasi', icon: 'task_alt' },
      { label: 'Tindak Lanjut', path: '/kesiswaan/tindak-lanjut', icon: 'assignment_late' },
      { label: 'Reward', path: '/kesiswaan/reward', icon: 'emoji_events' },
      { label: 'Laporan', path: '/kesiswaan/laporan', icon: 'bar_chart' },
    ],
  },
  guru: {
    area: 'guru',
    label: 'GURU',
    items: [
      { label: 'KBM Hari Ini', path: '/guru/kbm', icon: 'fact_check' },
      { label: 'Rekap Presensi', path: '/guru/rekap', icon: 'summarize' },
      { label: 'Daftar Wajah', path: '/guru/wajah', icon: 'face_retouching_natural' },
      { label: 'Izin', path: '/izin/guru', icon: 'event_available' },
      { label: 'Pelanggaran', path: '/guru/pelanggaran', icon: 'report' },
    ],
  },

  kepsek: {
    area: 'kepsek',
    label: 'KEPSEK',
    items: [
      { label: 'Dashboard / Laporan', path: '/admin/laporan', icon: 'assessment' },
      { label: 'Izin Guru', path: '/admin/izin-guru', icon: 'event_available' },
    ],
  },
  tu: {
    area: 'tu',
    label: 'TU',
    items: [{ label: 'Rekap Guru', path: '/tu/rekap-guru', icon: 'summarize' }],
  },
};

// Order per §6.1.B: Admin → Kurikulum → Kesiswaan → Guru → Kepsek → TU
const AREA_ORDER = ['admin', 'kurikulum', 'kesiswaan', 'guru', 'kepsek', 'tu'];

/**
 * FIX-MENU-ADMIN (keputusan user — admin = superuser): admin melihat
 * grup ADMIN + grup area fungsional yang HALAMANNYA SUDAH ADA (bukan
 * placeholder dashboard kosong). Saat ini hanya `kurikulum` yang punya
 * halaman nyata (mapel/penugasan/jadwal). Tambahkan area lain ke array
 * ini begitu fasenya jadi (kesiswaan/guru/kepsek/tu masih placeholder).
 */
const ADMIN_EXTRA_AREAS = ['kurikulum', 'guru', 'tu', 'kesiswaan'];

export function getMenuForUser(user: SafeUser): MenuGroup[] {
  const groups: MenuGroup[] = [];
  const isAdmin = user.roles.includes('admin' as any);
  for (const area of AREA_ORDER) {
    const hasRole = user.roles.includes(area as any);
    // Admin superuser: selain grup miliknya sendiri, tampilkan juga
    // area fungsional di ADMIN_EXTRA_AREAS walau admin tidak punya
    // peran itu secara eksplisit. Dedup otomatis via `hasRole` di atas
    // (kalau admin juga punya peran area tsb, tidak double-push).
    const isAdminExtra = isAdmin && ADMIN_EXTRA_AREAS.includes(area);
    if (hasRole || isAdminExtra) {
      groups.push(MENU_GROUPS[area]);
    }
  }
  return groups;
}

/**
 * Ambil path "home" untuk user berdasarkan peran pertama yang cocok dengan urutan AREA_ORDER.
 * Fallback ke /profil jika tidak ada peran yang cocok.
 */
export function getHomePath(user: SafeUser): string {
  for (const area of AREA_ORDER) {
    if (user.roles.includes(area as any)) {
      const group = MENU_GROUPS[area];
      if (group && group.items.length > 0) {
        return group.items[0].path;
      }
    }
  }
  return '/profil';
}

/**
 * Cari leaf menu yang sedang aktif di lokasi tertentu.
 * - Kalau path sama persis dengan item → return item.
 * - Kalau path dimulai dengan `${item.path}/` → return item (prefix match).
 *
 * Return null bila tidak ditemukan.
 */
export function findActiveLeaf(
  groups: MenuGroup[],
  pathname: string,
): MenuLeaf | null {
  let best: MenuLeaf | null = null;
  let bestLen = -1;

  for (const group of groups) {
    for (const item of group.items) {
      const matches =
        pathname === item.path ||
        (item.path !== '/' && pathname.startsWith(`${item.path}/`));
      if (matches && item.path.length > bestLen) {
        best = {
          path: item.path,
          icon: item.icon,
          label: item.label,
          badgeKey: item.badgeKey,
        };
        bestLen = item.path.length;
      }
    }
  }

  return best;
}
