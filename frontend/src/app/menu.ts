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

/**
 * Menu per area — IA-HIERARCHY-V2.
 * Hanya halaman UTAMA di sidebar; sub halaman lewat SubPageLinks.
 */
const MENU_GROUPS: Record<string, MenuGroup> = {
  admin: {
    area: 'admin',
    label: 'ADMIN',
    items: [
      { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
      { label: 'Akun', path: '/admin/akun', icon: 'manage_accounts', badgeKey: 'pendingUsers' },
    ],
  },
  kurikulum: {
    area: 'kurikulum',
    label: 'KURIKULUM',
    items: [
      { label: 'Dashboard', path: '/kurikulum', icon: 'dashboard' },
      { label: 'Data Orang', path: '/kurikulum/orang', icon: 'groups' },
      { label: 'Kelas', path: '/kurikulum/kelas', icon: 'meeting_room' },
      { label: 'Mata Pelajaran', path: '/kurikulum/mapel', icon: 'book' },
    ],
  },
  kesiswaan: {
    area: 'kesiswaan',
    label: 'KESISWAAN',
    items: [
      { label: 'Dashboard', path: '/kesiswaan', icon: 'dashboard' },
      { label: 'Laporan Demerit', path: '/kesiswaan/laporan', icon: 'bar_chart' },
      { label: 'Presensi Siswa', path: '/kesiswaan/presensi-siswa', icon: 'fact_check' },
      { label: 'Presensi Guru', path: '/tu/presensi-guru', icon: 'badge' },
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
      { label: 'Penilaian', path: '/guru/penilaian', icon: 'grading' },
      { label: 'Rapor', path: '/guru/rapor', icon: 'menu_book' },
      { label: 'Kokurikuler', path: '/guru/kokurikuler', icon: 'school' },
      { label: 'Ekskul', path: '/guru/ekskul', icon: 'sports' },
    ],
  },
  kepsek: {
    area: 'kepsek',
    label: 'KEPSEK',
    items: [
      { label: 'Presensi Siswa', path: '/kesiswaan/presensi-siswa', icon: 'fact_check' },
      { label: 'Presensi Guru', path: '/tu/presensi-guru', icon: 'badge' },
      { label: 'Izin Guru', path: '/tu/izin-guru', icon: 'event_available' },
      { label: 'Laporan Harian Guru', path: '/tu/laporan/harian-guru', icon: 'assessment' },
      { label: 'Keterlaksanaan KBM', path: '/kurikulum/laporan/keterlaksanaan', icon: 'checklist' },
      { label: 'Kehadiran Siswa', path: '/kesiswaan/laporan-kehadiran', icon: 'bar_chart' },
      { label: 'Laporan Demerit', path: '/kesiswaan/laporan', icon: 'report' },
    ],
  },
  tu: {
    area: 'tu',
    label: 'TU',
    items: [
      { label: 'Dashboard', path: '/tu', icon: 'dashboard' },
      { label: 'Presensi Guru', path: '/tu/presensi-guru', icon: 'badge' },
      { label: 'Pengaturan', path: '/tu/pengaturan', icon: 'settings' },
    ],
  },
};


// Order per §6.1.B: Admin → Kurikulum → Kesiswaan → Guru → Kepsek → TU
const AREA_ORDER = ['admin', 'kurikulum', 'kesiswaan', 'guru', 'kepsek', 'tu'];

/**
 * UX-POLISH-SPEC §A: ADMIN_EXTRA_AREAS = ['kurikulum','kesiswaan','tu'].
 * 'guru' DIBUANG — area guru dikunci ke peran guru saja.
 * Admin yang perlu akses area guru harus diberi peran guru eksplisit.
 */
const ADMIN_EXTRA_AREAS = ['kurikulum', 'kesiswaan', 'tu'];

export function getMenuForUser(user: SafeUser): MenuGroup[] {
  const groups: MenuGroup[] = [];
  const isAdmin = user.roles.includes('admin' as any);
  for (const area of AREA_ORDER) {
    const hasRole = user.roles.includes(area as any);
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
