import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouteObject } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { AppLayout } from './AppLayout';
import { RequireAuth, RequireRole } from './guards';
import { ToastProvider } from '../components/Toast';
import { LoginPage } from '../pages/login/LoginPage';
import { getHomePath } from './menu';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PageSkeleton } from '../components/PageSkeleton';
import { SaveSuccess } from '../components/SaveSuccess';

// Lazy-loaded pages (§12.15a — semua route di-load malas)
const DaftarPage = React.lazy(() => import('../pages/daftar/DaftarPage').then(m => ({ default: m.DaftarPage })));
const ProfilPage = React.lazy(() => import('../pages/profil/ProfilPage').then(m => ({ default: m.ProfilPage })));
const AkunDaftarPage = React.lazy(() => import('../pages/admin/akun/AkunDaftarPage').then(m => ({ default: m.AkunDaftarPage })));
const AkunSesiPage = React.lazy(() => import('../pages/admin/akun/AkunSesiPage').then(m => ({ default: m.AkunSesiPage })));
const AkunAktivitasPage = React.lazy(() => import('../pages/admin/akun/AkunAktivitasPage').then(m => ({ default: m.AkunAktivitasPage })));
const AkunDetailPage = React.lazy(() => import('../pages/admin/akun/AkunDetailPage').then(m => ({ default: m.AkunDetailPage })));
const AkunBaruPage = React.lazy(() => import('../pages/admin/akun/AkunBaruPage').then(m => ({ default: m.AkunBaruPage })));
const AkunEditPage = React.lazy(() => import('../pages/admin/akun/AkunEditPage').then(m => ({ default: m.AkunEditPage })));
const PersetujuanPage = React.lazy(() => import('../pages/admin/akun/PersetujuanPage').then(m => ({ default: m.PersetujuanPage })));
const PersetujuanDetailPage = React.lazy(() => import('../pages/admin/akun/PersetujuanDetailPage').then(m => ({ default: m.PersetujuanDetailPage })));
const PlaceholderPage = React.lazy(() => import('../pages/placeholder/PlaceholderPage').then(m => ({ default: m.PlaceholderPage })));
const AdminDashboardPage = React.lazy(() => import('../pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const GuruListPage = React.lazy(() => import('../pages/admin/orang/GuruListPage').then(m => ({ default: m.GuruListPage })));
const GuruDetailPage = React.lazy(() => import('../pages/admin/orang/GuruDetailPage').then(m => ({ default: m.GuruDetailPage })));
const GuruFormPage = React.lazy(() => import('../pages/admin/orang/GuruFormPage').then(m => ({ default: m.GuruFormPage })));
const SiswaListPage = React.lazy(() => import('../pages/admin/orang/SiswaListPage').then(m => ({ default: m.SiswaListPage })));
const SiswaDetailPage = React.lazy(() => import('../pages/admin/orang/SiswaDetailPage').then(m => ({ default: m.SiswaDetailPage })));
const SiswaFormPage = React.lazy(() => import('../pages/admin/orang/SiswaFormPage').then(m => ({ default: m.SiswaFormPage })));
const ImportPage = React.lazy(() => import('../pages/admin/orang/ImportPage').then(m => ({ default: m.ImportPage })));
const KelasListPage = React.lazy(() => import('../pages/admin/kelas/KelasListPage').then(m => ({ default: m.KelasListPage })));
const KelasDetailPage = React.lazy(() => import('../pages/admin/kelas/KelasDetailPage').then(m => ({ default: m.KelasDetailPage })));
const KelasFormPage = React.lazy(() => import('../pages/admin/kelas/KelasFormPage').then(m => ({ default: m.KelasFormPage })));
const PengaturanHubPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanHubPage').then(m => ({ default: m.PengaturanHubPage })));
const PengaturanSekolahPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanSekolahPage').then(m => ({ default: m.PengaturanSekolahPage })));
const PengaturanJamPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanJamPage').then(m => ({ default: m.PengaturanJamPage })));
const PengaturanLokasiPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanLokasiPage').then(m => ({ default: m.PengaturanLokasiPage })));
const PengaturanLiburPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanLiburPage').then(m => ({ default: m.PengaturanLiburPage })));
const PengaturanTahunAjaranPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanTahunAjaranPage').then(m => ({ default: m.PengaturanTahunAjaranPage })));
const PengaturanTahunAjaranFormPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanTahunAjaranFormPage').then(m => ({ default: m.PengaturanTahunAjaranFormPage })));
const PengaturanKkmPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanKkmPage').then(m => ({ default: m.PengaturanKkmPage })));

// Kurikulum pages (T15)
const KurikulumDashboardPage = React.lazy(() => import('../pages/kurikulum/KurikulumDashboardPage').then(m => ({ default: m.KurikulumDashboardPage })));
const MapelListPage = React.lazy(() => import('../pages/kurikulum/MapelListPage').then(m => ({ default: m.MapelListPage })));
const MapelFormPage = React.lazy(() => import('../pages/kurikulum/MapelFormPage').then(m => ({ default: m.MapelFormPage })));
const PenugasanPage = React.lazy(() => import('../pages/kurikulum/PenugasanPage').then(m => ({ default: m.PenugasanPage })));
const PenugasanFormPage = React.lazy(() => import('../pages/kurikulum/PenugasanFormPage').then(m => ({ default: m.PenugasanFormPage })));
const WaliKelasPage = React.lazy(() => import('../pages/kurikulum/WaliKelasPage').then(m => ({ default: m.WaliKelasPage })));
const JadwalKbmPage = React.lazy(() => import('../pages/kurikulum/JadwalKbmPage').then(m => ({ default: m.JadwalKbmPage })));
// Presensi F2
const KbmHariIniPage = React.lazy(() => import('../pages/guru/KbmHariIniPage').then(m => ({ default: m.KbmHariIniPage })));
const RosterPage = React.lazy(() => import('../pages/guru/RosterPage').then(m => ({ default: m.RosterPage })));
const MatriksPresensiSiswaPage = React.lazy(() => import('../pages/admin/presensi/MatriksPresensiSiswaPage').then(m => ({ default: m.MatriksPresensiSiswaPage })));
const RekapPresensiPage = React.lazy(() => import('../pages/guru/RekapPresensiPage').then(m => ({ default: m.RekapPresensiPage })));
// F3a: Presensi wajah guru
const GuruWajahPage = React.lazy(() => import('../pages/guru/GuruWajahPage').then(m => ({ default: m.GuruWajahPage })));
const GuruEnrollWizardPage = React.lazy(() => import('../pages/guru/GuruEnrollWizardPage').then(m => ({ default: m.GuruEnrollWizardPage })));
const GuruPresensiDashboard = React.lazy(() => import('../pages/guru/GuruPresensiDashboard').then(m => ({ default: m.GuruPresensiDashboard })));
const WajahListPage = React.lazy(() => import('../pages/admin/wajah/WajahListPage').then(m => ({ default: m.WajahListPage })));
const EnrollWizardPage = React.lazy(() => import('../pages/admin/wajah/EnrollWizardPage').then(m => ({ default: m.EnrollWizardPage })));
const PresensiGuruPage = React.lazy(() => import('../pages/admin/presensi/PresensiGuruPage').then(m => ({ default: m.PresensiGuruPage })));
// F3b: Admin kiosk (AG-2)
const PerangkatKioskPage = React.lazy(() => import('../pages/admin/kiosk/PerangkatKioskPage').then(m => ({ default: m.PerangkatKioskPage })));
const VerifikasiPendingPage = React.lazy(() => import('../pages/admin/kiosk/VerifikasiPendingPage').then(m => ({ default: m.VerifikasiPendingPage })));
// F3b: Kiosk device app (AG-1) — di-mount di luar AuthedLayout
const KioskApp = React.lazy(() => import('../pages/kiosk/KioskApp').then(m => ({ default: m.KioskApp })));
// F4a: Izin guru
const IzinGuruPage = React.lazy(() => import('../pages/guru/IzinGuruPage').then(m => ({ default: m.IzinGuruPage })));
const AdminIzinGuruPage = React.lazy(() => import('../pages/admin/izin/AdminIzinGuruPage').then(m => ({ default: m.AdminIzinGuruPage })));

/** Wrap a lazy element in Suspense + ErrorBoundary */
function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/** Redirect / to user's role-based home */
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomePath(user)} replace />;
}

/** Root layout that wraps everything in AuthProvider + ToastProvider */
function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </AuthProvider>
  );
}

/** Authenticated layout: RequireAuth + AppLayout */
function AuthedLayout() {
  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}

const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      // Public
      { path: '/login', element: <LoginPage /> },
      { path: '/daftar', element: <Lazy><DaftarPage /></Lazy> },
      // F3b: Kiosk device app — public, no auth required
      { path: '/kiosk', element: <Lazy><KioskApp /></Lazy> },

      // Authenticated
      {
        element: <AuthedLayout />,
        children: [
          // Home redirect
          { path: '/', element: <HomeRedirect /> },

          // Profil
          { path: '/profil', element: <Lazy><ProfilPage /></Lazy> },

          // Admin
          { path: '/admin', element: <RequireRole roles={['admin']}><Lazy><AdminDashboardPage /></Lazy></RequireRole> },

          // Admin: Data Orang (T13)
          { path: '/admin/orang', element: <Navigate to="/admin/orang/guru" replace /> },
          { path: '/admin/orang/guru', element: <RequireRole roles={['admin']}><Lazy><GuruListPage /></Lazy></RequireRole> },
          { path: '/admin/orang/guru/baru', element: <RequireRole roles={['admin']}><Lazy><GuruFormPage /></Lazy></RequireRole> },
          { path: '/admin/orang/guru/sukses', element: <RequireRole roles={['admin']}><SaveSuccess entityLabel="Guru" addAgainPath="/admin/orang/guru/baru" listPath="/admin/orang/guru" detailPathPattern="/admin/orang/guru/{id}" /></RequireRole> },
          { path: '/admin/orang/guru/:id', element: <RequireRole roles={['admin']}><Lazy><GuruDetailPage /></Lazy></RequireRole> },
          { path: '/admin/orang/guru/:id/edit', element: <RequireRole roles={['admin']}><Lazy><GuruFormPage /></Lazy></RequireRole> },
          { path: '/admin/orang/siswa', element: <RequireRole roles={['admin']}><Lazy><SiswaListPage /></Lazy></RequireRole> },
          { path: '/admin/orang/siswa/baru', element: <RequireRole roles={['admin']}><Lazy><SiswaFormPage /></Lazy></RequireRole> },
          { path: '/admin/orang/siswa/sukses', element: <RequireRole roles={['admin']}><SaveSuccess entityLabel="Siswa" addAgainPath="/admin/orang/siswa/baru" listPath="/admin/orang/siswa" detailPathPattern="/admin/orang/siswa/{id}" /></RequireRole> },
          { path: '/admin/orang/siswa/:id', element: <RequireRole roles={['admin']}><Lazy><SiswaDetailPage /></Lazy></RequireRole> },
          { path: '/admin/orang/siswa/:id/edit', element: <RequireRole roles={['admin']}><Lazy><SiswaFormPage /></Lazy></RequireRole> },
          { path: '/admin/orang/import', element: <RequireRole roles={['admin']}><Lazy><ImportPage /></Lazy></RequireRole> },

          // Admin: Kelas (T13)
          { path: '/admin/kelas', element: <RequireRole roles={['admin']}><Lazy><KelasListPage /></Lazy></RequireRole> },
          { path: '/admin/kelas/baru', element: <RequireRole roles={['admin']}><Lazy><KelasFormPage /></Lazy></RequireRole> },
          { path: '/admin/kelas/sukses', element: <RequireRole roles={['admin']}><SaveSuccess entityLabel="Kelas" addAgainPath="/admin/kelas/baru" listPath="/admin/kelas" detailPathPattern="/admin/kelas/{id}" /></RequireRole> },
          { path: '/admin/kelas/:id', element: <RequireRole roles={['admin']}><Lazy><KelasDetailPage /></Lazy></RequireRole> },
          { path: '/admin/kelas/:id/edit', element: <RequireRole roles={['admin']}><Lazy><KelasFormPage /></Lazy></RequireRole> },

          // Admin: Pengaturan (T14)
          { path: '/admin/pengaturan', element: <RequireRole roles={['admin']}><Lazy><PengaturanHubPage /></Lazy></RequireRole> },
          { path: '/admin/pengaturan/sekolah', element: <RequireRole roles={['admin']}><Lazy><PengaturanSekolahPage /></Lazy></RequireRole> },
          { path: '/admin/pengaturan/jam', element: <RequireRole roles={['admin']}><Lazy><PengaturanJamPage /></Lazy></RequireRole> },
          { path: '/admin/pengaturan/lokasi', element: <RequireRole roles={['admin']}><Lazy><PengaturanLokasiPage /></Lazy></RequireRole> },
          { path: '/admin/pengaturan/libur', element: <RequireRole roles={['admin']}><Lazy><PengaturanLiburPage /></Lazy></RequireRole> },
          { path: '/admin/pengaturan/tahun-ajaran', element: <RequireRole roles={['admin']}><Lazy><PengaturanTahunAjaranPage /></Lazy></RequireRole> },
          { path: '/admin/pengaturan/tahun-ajaran/baru', element: <RequireRole roles={['admin']}><Lazy><PengaturanTahunAjaranFormPage /></Lazy></RequireRole> },
          { path: '/admin/pengaturan/tahun-ajaran/sukses', element: <RequireRole roles={['admin']}><SaveSuccess entityLabel="Tahun Ajaran" addAgainPath="/admin/pengaturan/tahun-ajaran/baru" listPath="/admin/pengaturan/tahun-ajaran" /></RequireRole> },
          { path: '/admin/pengaturan/kkm', element: <RequireRole roles={['admin']}><Lazy><PengaturanKkmPage /></Lazy></RequireRole> },

          // Admin: Akun (F0)
          { path: '/admin/akun', element: <RequireRole roles={['admin']}><Lazy><AkunDaftarPage /></Lazy></RequireRole> },
          { path: '/admin/akun/sesi', element: <RequireRole roles={['admin']}><Lazy><AkunSesiPage /></Lazy></RequireRole> },
          { path: '/admin/akun/aktivitas', element: <RequireRole roles={['admin']}><Lazy><AkunAktivitasPage /></Lazy></RequireRole> },
          { path: '/admin/akun/persetujuan', element: <RequireRole roles={['admin']}><Lazy><PersetujuanPage /></Lazy></RequireRole> },
          { path: '/admin/akun/persetujuan/:id', element: <RequireRole roles={['admin']}><Lazy><PersetujuanDetailPage /></Lazy></RequireRole> },
          { path: '/admin/akun/baru', element: <RequireRole roles={['admin']}><Lazy><AkunBaruPage /></Lazy></RequireRole> },
          { path: '/admin/akun/sukses', element: <RequireRole roles={['admin']}><SaveSuccess entityLabel="Akun" addAgainPath="/admin/akun/baru" listPath="/admin/akun" detailPathPattern="/admin/akun/{id}" /></RequireRole> },
          { path: '/admin/akun/:id', element: <RequireRole roles={['admin']}><Lazy><AkunDetailPage /></Lazy></RequireRole> },
          { path: '/admin/akun/:id/edit', element: <RequireRole roles={['admin']}><Lazy><AkunEditPage /></Lazy></RequireRole> },

          // Kurikulum (T15) — RequireRole ['kurikulum','admin'] per planner correction #7
          { path: '/kurikulum', element: <RequireRole roles={['kurikulum','admin']}><Lazy><KurikulumDashboardPage /></Lazy></RequireRole> },
          { path: '/kurikulum/mapel', element: <RequireRole roles={['kurikulum','admin']}><Lazy><MapelListPage /></Lazy></RequireRole> },
          { path: '/kurikulum/mapel/baru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><MapelFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/mapel/sukses', element: <RequireRole roles={['kurikulum','admin']}><SaveSuccess entityLabel="Mata Pelajaran" addAgainPath="/kurikulum/mapel/baru" listPath="/kurikulum/mapel" /></RequireRole> },
          { path: '/kurikulum/mapel/:id/edit', element: <RequireRole roles={['kurikulum','admin']}><Lazy><MapelFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/penugasan', element: <RequireRole roles={['kurikulum','admin']}><Lazy><PenugasanPage /></Lazy></RequireRole> },
          { path: '/kurikulum/penugasan/baru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><PenugasanFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/penugasan/sukses', element: <RequireRole roles={['kurikulum','admin']}><SaveSuccess entityLabel="Penugasan" addAgainPath="/kurikulum/penugasan/baru" listPath="/kurikulum/penugasan" /></RequireRole> },
          { path: '/kurikulum/wali-kelas', element: <RequireRole roles={['kurikulum','admin']}><Lazy><WaliKelasPage /></Lazy></RequireRole> },
          { path: '/kurikulum/jadwal', element: <RequireRole roles={['kurikulum','admin']}><Lazy><JadwalKbmPage /></Lazy></RequireRole> },

          // Kesiswaan placeholder
          { path: '/kesiswaan', element: <RequireRole roles={['kesiswaan']}><Lazy><PlaceholderPage title="Dashboard Kesiswaan" icon="dashboard" /></Lazy></RequireRole> },

          // Guru: KBM & Presensi (F2)
          { path: '/guru', element: <Navigate to="/guru/kbm" replace /> },
          { path: '/guru/kbm', element: <RequireRole roles={['guru','admin']}><Lazy><GuruPresensiDashboard /></Lazy></RequireRole> },
          { path: '/guru/roster/:jadwalId', element: <RequireRole roles={['guru','admin']}><Lazy><RosterPage /></Lazy></RequireRole> },
          { path: '/guru/rekap', element: <RequireRole roles={['guru','admin']}><Lazy><RekapPresensiPage /></Lazy></RequireRole> },
          // F3a: Guru wajah enrollment mandiri (alur TERPISAH dari presensi scan)
          { path: '/guru/wajah', element: <RequireRole roles={['guru','admin']}><Lazy><GuruWajahPage /></Lazy></RequireRole> },
          { path: '/guru/wajah/enroll', element: <RequireRole roles={['guru','admin']}><Lazy><GuruEnrollWizardPage /></Lazy></RequireRole> },

          // Admin: Presensi Siswa (F2 monitor)
          { path: '/admin/presensi-siswa', element: <RequireRole roles={['admin','kepsek','kesiswaan']}><Lazy><MatriksPresensiSiswaPage /></Lazy></RequireRole> },
          // F3a: Admin wajah enrollment + monitor presensi guru
          { path: '/admin/wajah', element: <RequireRole roles={['admin']}><Lazy><WajahListPage /></Lazy></RequireRole> },
          { path: '/admin/wajah/:guruId', element: <RequireRole roles={['admin']}><Lazy><EnrollWizardPage /></Lazy></RequireRole> },
          { path: '/admin/presensi-guru', element: <RequireRole roles={['admin','kepsek']}><Lazy><PresensiGuruPage /></Lazy></RequireRole> },
          // F3b: Admin kiosk management (AG-2 builds page; AG-1 wires route)
          { path: '/admin/perangkat', element: <RequireRole roles={['admin']}><Lazy><PerangkatKioskPage /></Lazy></RequireRole> },
          // F4a: Izin guru admin
          { path: '/admin/izin-guru', element: <RequireRole roles={['admin','kepsek']}><Lazy><AdminIzinGuruPage /></Lazy></RequireRole> },

          // Guru: F4a izin
          { path: '/izin/guru', element: <RequireRole roles={['guru','admin']}><Lazy><IzinGuruPage /></Lazy></RequireRole> },
          { path: '/admin/presensi-guru-pending', element: <RequireRole roles={['admin']}><Lazy><VerifikasiPendingPage /></Lazy></RequireRole> },

          // Kepsek placeholder
          { path: '/kepsek', element: <RequireRole roles={['kepsek']}><Lazy><PlaceholderPage title="Dashboard Kepala Sekolah" icon="dashboard" /></Lazy></RequireRole> },

          // TU placeholder
          { path: '/tu', element: <RequireRole roles={['tu']}><Lazy><PlaceholderPage title="Rekap Guru" icon="dashboard" /></Lazy></RequireRole> },
        ],
      },

      // Fallback
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(routes);

// Keep App export for potential direct usage / testing
export function App() {
  return <RootLayout />;
}
