import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouteObject, useParams } from 'react-router-dom';
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
const KesiswaanDashboardPage = React.lazy(() => import('../pages/kesiswaan/KesiswaanDashboardPage').then(m => ({ default: m.KesiswaanDashboardPage })));
const TuDashboardPage = React.lazy(() => import('../pages/tu/TuDashboardPage').then(m => ({ default: m.TuDashboardPage })));
const TuPengaturanPage = React.lazy(() => import('../pages/tu/TuPengaturanPage').then(m => ({ default: m.TuPengaturanPage })));
const TahunAjaranKkmPage = React.lazy(() => import('../pages/kurikulum/TahunAjaranKkmPage').then(m => ({ default: m.TahunAjaranKkmPage })));
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
// PengaturanHubPage DIHAPUS — hub dibubarkan per IA-MIGRATION-MAP §1.1
const PengaturanSekolahPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanSekolahPage').then(m => ({ default: m.PengaturanSekolahPage })));
const PengaturanJamPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanJamPage').then(m => ({ default: m.PengaturanJamPage })));
const PengaturanLokasiPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanLokasiPage').then(m => ({ default: m.PengaturanLokasiPage })));
const PengaturanLiburPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanLiburPage').then(m => ({ default: m.PengaturanLiburPage })));
const PengaturanTahunAjaranFormPage = React.lazy(() => import('../pages/admin/pengaturan/PengaturanTahunAjaranFormPage').then(m => ({ default: m.PengaturanTahunAjaranFormPage })));

// Kurikulum pages
const KurikulumDashboardPage = React.lazy(() => import('../pages/kurikulum/KurikulumDashboardPage').then(m => ({ default: m.KurikulumDashboardPage })));
const MapelListPage = React.lazy(() => import('../pages/kurikulum/MapelListPage').then(m => ({ default: m.MapelListPage })));
const MapelFormPage = React.lazy(() => import('../pages/kurikulum/MapelFormPage').then(m => ({ default: m.MapelFormPage })));
const PenugasanPage = React.lazy(() => import('../pages/kurikulum/PenugasanPage').then(m => ({ default: m.PenugasanPage })));
const PenugasanFormPage = React.lazy(() => import('../pages/kurikulum/PenugasanFormPage').then(m => ({ default: m.PenugasanFormPage })));
const WaliKelasPage = React.lazy(() => import('../pages/kurikulum/WaliKelasPage').then(m => ({ default: m.WaliKelasPage })));
const JadwalKbmPage = React.lazy(() => import('../pages/kurikulum/JadwalKbmPage').then(m => ({ default: m.JadwalKbmPage })));

// Presensi
const RosterPage = React.lazy(() => import('../pages/guru/RosterPage').then(m => ({ default: m.RosterPage })));
const MatriksPresensiSiswaPage = React.lazy(() => import('../pages/admin/presensi/MatriksPresensiSiswaPage').then(m => ({ default: m.MatriksPresensiSiswaPage })));
const RekapPresensiPage = React.lazy(() => import('../pages/guru/RekapPresensiPage').then(m => ({ default: m.RekapPresensiPage })));
// F3a: Presensi wajah guru (guru-only)
const GuruWajahPage = React.lazy(() => import('../pages/guru/GuruWajahPage').then(m => ({ default: m.GuruWajahPage })));
const GuruEnrollWizardPage = React.lazy(() => import('../pages/guru/GuruEnrollWizardPage').then(m => ({ default: m.GuruEnrollWizardPage })));
const GuruPresensiDashboard = React.lazy(() => import('../pages/guru/GuruPresensiDashboard').then(m => ({ default: m.GuruPresensiDashboard })));
const PresensiGuruPage = React.lazy(() => import('../pages/admin/presensi/PresensiGuruPage').then(m => ({ default: m.PresensiGuruPage })));
// F4a: Izin guru
const IzinGuruPage = React.lazy(() => import('../pages/guru/IzinGuruPage').then(m => ({ default: m.IzinGuruPage })));
const AdminIzinGuruPage = React.lazy(() => import('../pages/admin/izin/AdminIzinGuruPage').then(m => ({ default: m.AdminIzinGuruPage })));
// F4b: Laporan sub-halaman (AdminLaporanHubPage DIHAPUS — hub dibubarkan per IA-MIGRATION-MAP §1.6)
const LaporanHarianGuruPage = React.lazy(() => import('../pages/admin/laporan/LaporanPages').then(m => ({ default: m.LaporanHarianGuruPage })));
const LaporanKeterlaksanaanPage = React.lazy(() => import('../pages/admin/laporan/LaporanPages').then(m => ({ default: m.LaporanKeterlaksanaanPage })));
const LaporanSiswaPage = React.lazy(() => import('../pages/admin/laporan/LaporanPages').then(m => ({ default: m.LaporanSiswaPage })));
// F4c: TU rekap guru
const TuRekapGuruPage = React.lazy(() => import('../pages/tu/TuRekapGuruPage').then(m => ({ default: m.TuRekapGuruPage })));
// F5a: Kesiswaan
const TataTertibPage = React.lazy(() => import('../pages/kesiswaan/TataTertibPage').then(m => ({ default: m.TataTertibPage })));
const PelanggaranPage = React.lazy(() => import('../pages/kesiswaan/PelanggaranPage').then(m => ({ default: m.PelanggaranPage })));
const VerifikasiPage = React.lazy(() => import('../pages/kesiswaan/VerifikasiPage').then(m => ({ default: m.VerifikasiPage })));
const GuruPelanggaranPage = React.lazy(() => import('../pages/guru/GuruPelanggaranPage').then(m => ({ default: m.GuruPelanggaranPage })));
// F5b: Kesiswaan
const TindakLanjutPage = React.lazy(() => import('../pages/kesiswaan/TindakLanjutPage').then(m => ({ default: m.TindakLanjutPage })));
const RewardPage = React.lazy(() => import('../pages/kesiswaan/RewardPage').then(m => ({ default: m.RewardPage })));
const LaporanDemeritPage = React.lazy(() => import('../pages/kesiswaan/LaporanDemeritPage').then(m => ({ default: m.LaporanDemeritPage })));
// F6a: Penilaian Guru
const GuruPenilaianDashboard = React.lazy(() => import('../pages/guru/GuruPenilaianDashboard').then(m => ({ default: m.GuruPenilaianDashboard })));
const PenilaianDetailShell = React.lazy(() => import('../pages/guru/PenilaianDetailShell').then(m => ({ default: m.PenilaianDetailShell })));
const TujuanPembelajaranPage = React.lazy(() => import('../pages/guru/TujuanPembelajaranPage').then(m => ({ default: m.TujuanPembelajaranPage })));
const PenilaianListPage = React.lazy(() => import('../pages/guru/PenilaianListPage').then(m => ({ default: m.PenilaianListPage })));
const RekapNilaiPage = React.lazy(() => import('../pages/guru/RekapNilaiPage').then(m => ({ default: m.RekapNilaiPage })));
const InputNilaiPage = React.lazy(() => import('../pages/guru/InputNilaiPage').then(m => ({ default: m.InputNilaiPage })));
// F6b: Rapor
const RaporListPage = React.lazy(() => import('../pages/guru/RaporListPage').then(m => ({ default: m.RaporListPage })));
const RaporDetailPage = React.lazy(() => import('../pages/guru/RaporDetailPage').then(m => ({ default: m.RaporDetailPage })));
// F6c: Kokurikuler
const KokurikulerKegiatanPage = React.lazy(() => import('../pages/kokurikuler/KokurikulerKegiatanPage').then(m => ({ default: m.KokurikulerKegiatanPage })));
const KokurikulerTimPage = React.lazy(() => import('../pages/kokurikuler/KokurikulerTimPage').then(m => ({ default: m.KokurikulerTimPage })));
const KokurikulerAsesmenPage = React.lazy(() => import('../pages/kokurikuler/KokurikulerAsesmenPage').then(m => ({ default: m.KokurikulerAsesmenPage })));
const GuruKokurikulerPage = React.lazy(() => import('../pages/kokurikuler/GuruKokurikulerPage').then(m => ({ default: m.GuruKokurikulerPage })));
const RaporKokurikulerPage = React.lazy(() => import('../pages/kokurikuler/RaporKokurikulerPage').then(m => ({ default: m.RaporKokurikulerPage })));
// F6d: Ekstrakurikuler
const EkskulAdminPage = React.lazy(() => import('../pages/ekskul/EkskulAdminPage').then(m => ({ default: m.EkskulAdminPage })));
const EkskulPembinaPage = React.lazy(() => import('../pages/ekskul/EkskulPembinaPage').then(m => ({ default: m.EkskulPembinaPage })));
const RaporEkskulPage = React.lazy(() => import('../pages/ekskul/RaporEkskulPage').then(m => ({ default: m.RaporEkskulPage })));

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

/** Redirect yang membawa URL param :id ke path baru */
function RedirectWithParams({ base }: { base: string }) {
  const params = useParams();
  const id = params.id ?? '';
  return <Navigate to={`${base}/${id}`} replace />;
}

const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      // Public
      { path: '/login', element: <LoginPage /> },
      { path: '/daftar', element: <Lazy><DaftarPage /></Lazy> },

      // Authenticated
      {
        element: <AuthedLayout />,
        children: [
          // Home redirect
          { path: '/', element: <HomeRedirect /> },

          // Profil
          { path: '/profil', element: <Lazy><ProfilPage /></Lazy> },

          // ── ADMIN (hanya dashboard + akun + profil sekolah) ──────────────
          { path: '/admin', element: <RequireRole roles={['admin']}><Lazy><AdminDashboardPage /></Lazy></RequireRole> },

          // Admin: Akun (F0) — tetap di /admin/akun
          { path: '/admin/akun', element: <RequireRole roles={['admin']}><Lazy><AkunDaftarPage /></Lazy></RequireRole> },
          { path: '/admin/akun/sesi', element: <RequireRole roles={['admin']}><Lazy><AkunSesiPage /></Lazy></RequireRole> },
          { path: '/admin/akun/aktivitas', element: <RequireRole roles={['admin']}><Lazy><AkunAktivitasPage /></Lazy></RequireRole> },
          { path: '/admin/akun/persetujuan', element: <RequireRole roles={['admin']}><Lazy><PersetujuanPage /></Lazy></RequireRole> },
          { path: '/admin/akun/persetujuan/:id', element: <RequireRole roles={['admin']}><Lazy><PersetujuanDetailPage /></Lazy></RequireRole> },
          { path: '/admin/akun/baru', element: <RequireRole roles={['admin']}><Lazy><AkunBaruPage /></Lazy></RequireRole> },
          { path: '/admin/akun/sukses', element: <RequireRole roles={['admin']}><SaveSuccess entityLabel="Akun" addAgainPath="/admin/akun/baru" listPath="/admin/akun" detailPathPattern="/admin/akun/{id}" /></RequireRole> },
          { path: '/admin/akun/:id', element: <RequireRole roles={['admin']}><Lazy><AkunDetailPage /></Lazy></RequireRole> },
          { path: '/admin/akun/:id/edit', element: <RequireRole roles={['admin']}><Lazy><AkunEditPage /></Lazy></RequireRole> },

          // Admin: Profil Sekolah (baru: /admin/sekolah)
          { path: '/admin/sekolah', element: <RequireRole roles={['admin']}><Lazy><PengaturanSekolahPage /></Lazy></RequireRole> },

          // ── KURIKULUM (menyerap Data Orang, Kelas, Ekskul, TA, KKM) ────
          { path: '/kurikulum', element: <RequireRole roles={['kurikulum','admin']}><Lazy><KurikulumDashboardPage /></Lazy></RequireRole> },

          // Kurikulum: Data Orang (pindahan dari /admin/orang/*)
          { path: '/kurikulum/orang', element: <Navigate to="/kurikulum/orang/guru" replace /> },
          { path: '/kurikulum/orang/guru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><GuruListPage /></Lazy></RequireRole> },
          { path: '/kurikulum/orang/guru/baru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><GuruFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/orang/guru/sukses', element: <RequireRole roles={['kurikulum','admin']}><SaveSuccess entityLabel="Guru" addAgainPath="/kurikulum/orang/guru/baru" listPath="/kurikulum/orang/guru" detailPathPattern="/kurikulum/orang/guru/{id}" /></RequireRole> },
          { path: '/kurikulum/orang/guru/:id', element: <RequireRole roles={['kurikulum','admin']}><Lazy><GuruDetailPage /></Lazy></RequireRole> },
          { path: '/kurikulum/orang/guru/:id/edit', element: <RequireRole roles={['kurikulum','admin']}><Lazy><GuruFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/orang/siswa', element: <RequireRole roles={['kurikulum','admin']}><Lazy><SiswaListPage /></Lazy></RequireRole> },
          { path: '/kurikulum/orang/siswa/baru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><SiswaFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/orang/siswa/sukses', element: <RequireRole roles={['kurikulum','admin']}><SaveSuccess entityLabel="Siswa" addAgainPath="/kurikulum/orang/siswa/baru" listPath="/kurikulum/orang/siswa" detailPathPattern="/kurikulum/orang/siswa/{id}" /></RequireRole> },
          { path: '/kurikulum/orang/siswa/:id', element: <RequireRole roles={['kurikulum','admin']}><Lazy><SiswaDetailPage /></Lazy></RequireRole> },
          { path: '/kurikulum/orang/siswa/:id/edit', element: <RequireRole roles={['kurikulum','admin']}><Lazy><SiswaFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/orang/import', element: <RequireRole roles={['kurikulum','admin']}><Lazy><ImportPage /></Lazy></RequireRole> },

          // Kurikulum: Kelas (pindahan dari /admin/kelas/*)
          { path: '/kurikulum/kelas', element: <RequireRole roles={['kurikulum','admin']}><Lazy><KelasListPage /></Lazy></RequireRole> },
          { path: '/kurikulum/kelas/baru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><KelasFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/kelas/sukses', element: <RequireRole roles={['kurikulum','admin']}><SaveSuccess entityLabel="Kelas" addAgainPath="/kurikulum/kelas/baru" listPath="/kurikulum/kelas" detailPathPattern="/kurikulum/kelas/{id}" /></RequireRole> },
          { path: '/kurikulum/kelas/:id', element: <RequireRole roles={['kurikulum','admin']}><Lazy><KelasDetailPage /></Lazy></RequireRole> },
          { path: '/kurikulum/kelas/:id/edit', element: <RequireRole roles={['kurikulum','admin']}><Lazy><KelasFormPage /></Lazy></RequireRole> },

          // Kurikulum: Mapel, Penugasan, Jadwal, Wali
          { path: '/kurikulum/mapel', element: <RequireRole roles={['kurikulum','admin']}><Lazy><MapelListPage /></Lazy></RequireRole> },
          { path: '/kurikulum/mapel/baru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><MapelFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/mapel/sukses', element: <RequireRole roles={['kurikulum','admin']}><SaveSuccess entityLabel="Mata Pelajaran" addAgainPath="/kurikulum/mapel/baru" listPath="/kurikulum/mapel" /></RequireRole> },
          { path: '/kurikulum/mapel/:id/edit', element: <RequireRole roles={['kurikulum','admin']}><Lazy><MapelFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/penugasan', element: <RequireRole roles={['kurikulum','admin']}><Lazy><PenugasanPage /></Lazy></RequireRole> },
          { path: '/kurikulum/penugasan/baru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><PenugasanFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/penugasan/sukses', element: <RequireRole roles={['kurikulum','admin']}><SaveSuccess entityLabel="Penugasan" addAgainPath="/kurikulum/penugasan/baru" listPath="/kurikulum/penugasan" /></RequireRole> },
          { path: '/kurikulum/wali-kelas', element: <RequireRole roles={['kurikulum','admin']}><Lazy><WaliKelasPage /></Lazy></RequireRole> },
          { path: '/kurikulum/jadwal', element: <RequireRole roles={['kurikulum','admin']}><Lazy><JadwalKbmPage /></Lazy></RequireRole> },

          // Kurikulum: Tahun Ajaran & KKM digabung (sub Mapel, IA-HIERARCHY-V2)
          { path: '/kurikulum/tahun-ajaran-kkm', element: <RequireRole roles={['kurikulum','admin']}><Lazy><TahunAjaranKkmPage /></Lazy></RequireRole> },
          { path: '/kurikulum/tahun-ajaran', element: <Navigate to="/kurikulum/tahun-ajaran-kkm" replace /> },
          { path: '/kurikulum/tahun-ajaran/baru', element: <RequireRole roles={['kurikulum','admin']}><Lazy><PengaturanTahunAjaranFormPage /></Lazy></RequireRole> },
          { path: '/kurikulum/tahun-ajaran/sukses', element: <RequireRole roles={['kurikulum','admin']}><SaveSuccess entityLabel="Tahun Ajaran" addAgainPath="/kurikulum/tahun-ajaran/baru" listPath="/kurikulum/tahun-ajaran-kkm" /></RequireRole> },
          { path: '/kurikulum/kkm', element: <Navigate to="/kurikulum/tahun-ajaran-kkm" replace /> },

          // Kurikulum: Laporan keterlaksanaan (pindahan dari /admin/laporan/keterlaksanaan)
          { path: '/kurikulum/laporan/keterlaksanaan', element: <RequireRole roles={['kurikulum','admin','kepsek']}><Lazy><LaporanKeterlaksanaanPage /></Lazy></RequireRole> },

          // Kurikulum: Kokurikuler
          { path: '/kurikulum/kokurikuler', element: <RequireRole roles={['kurikulum','admin']}><Lazy><KokurikulerKegiatanPage /></Lazy></RequireRole> },
          { path: '/kurikulum/kokurikuler/:kegiatanId/tim', element: <RequireRole roles={['kurikulum','admin']}><Lazy><KokurikulerTimPage /></Lazy></RequireRole> },

          // Kurikulum: Ekskul (pindahan dari /admin/ekskul)
          { path: '/kurikulum/ekskul', element: <RequireRole roles={['kurikulum','admin']}><Lazy><EkskulAdminPage /></Lazy></RequireRole> },
          { path: '/kurikulum/ekskul/:ekskulId', element: <RequireRole roles={['kurikulum','admin','guru']}><Lazy><EkskulPembinaPage /></Lazy></RequireRole> },

          // ── KESISWAAN ───────────────────────────────────────────────────
          { path: '/kesiswaan', element: <RequireRole roles={['kesiswaan','admin']}><Lazy><KesiswaanDashboardPage /></Lazy></RequireRole> },
          { path: '/kesiswaan/tata-tertib', element: <RequireRole roles={['kesiswaan','admin']}><Lazy><TataTertibPage /></Lazy></RequireRole> },
          { path: '/kesiswaan/pelanggaran', element: <RequireRole roles={['kesiswaan','admin','kepsek']}><Lazy><PelanggaranPage /></Lazy></RequireRole> },
          { path: '/kesiswaan/verifikasi', element: <RequireRole roles={['kesiswaan','admin']}><Lazy><VerifikasiPage /></Lazy></RequireRole> },
          { path: '/kesiswaan/tindak-lanjut', element: <RequireRole roles={['kesiswaan','admin']}><Lazy><TindakLanjutPage /></Lazy></RequireRole> },
          { path: '/kesiswaan/reward', element: <RequireRole roles={['kesiswaan','admin','kepsek']}><Lazy><RewardPage /></Lazy></RequireRole> },
          { path: '/kesiswaan/laporan', element: <RequireRole roles={['kesiswaan','admin','kepsek']}><Lazy><LaporanDemeritPage /></Lazy></RequireRole> },
          // Kehadiran siswa (pindahan dari /admin/presensi-siswa)
          { path: '/kesiswaan/presensi-siswa', element: <RequireRole roles={['kesiswaan','admin','kepsek']}><Lazy><MatriksPresensiSiswaPage /></Lazy></RequireRole> },
          // Laporan kehadiran siswa (pindahan dari /admin/laporan/siswa)
          { path: '/kesiswaan/laporan-kehadiran', element: <RequireRole roles={['kesiswaan','admin','kepsek']}><Lazy><LaporanSiswaPage /></Lazy></RequireRole> },

          // ── GURU (tidak berubah) ─────────────────────────────────────────
          { path: '/guru', element: <Navigate to="/guru/kbm" replace /> },
          { path: '/guru/kbm', element: <RequireRole roles={['guru','admin']}><Lazy><GuruPresensiDashboard /></Lazy></RequireRole> },
          { path: '/guru/roster/:jadwalId', element: <RequireRole roles={['guru','admin']}><Lazy><RosterPage /></Lazy></RequireRole> },
          { path: '/guru/rekap', element: <RequireRole roles={['guru','admin']}><Lazy><RekapPresensiPage /></Lazy></RequireRole> },
          // F3a: Guru wajah enrollment mandiri (guru ONLY per §A)
          { path: '/guru/wajah', element: <RequireRole roles={['guru']}><Lazy><GuruWajahPage /></Lazy></RequireRole> },
          { path: '/guru/wajah/enroll', element: <RequireRole roles={['guru']}><Lazy><GuruEnrollWizardPage /></Lazy></RequireRole> },
          // F4a: Izin guru
          { path: '/izin/guru', element: <RequireRole roles={['guru','admin']}><Lazy><IzinGuruPage /></Lazy></RequireRole> },
          // F5a: Guru pelanggaran
          { path: '/guru/pelanggaran', element: <RequireRole roles={['guru','admin']}><Lazy><GuruPelanggaranPage /></Lazy></RequireRole> },
          // F6a: Penilaian Guru
          { path: '/guru/penilaian', element: <RequireRole roles={['guru','admin']}><Lazy><GuruPenilaianDashboard /></Lazy></RequireRole> },
          { path: '/guru/penilaian/nilai/:penilaianId', element: <RequireRole roles={['guru','admin']}><Lazy><InputNilaiPage /></Lazy></RequireRole> },
          {
            path: '/guru/penilaian/:penugasanId',
            element: <RequireRole roles={['guru','admin']}><Lazy><PenilaianDetailShell /></Lazy></RequireRole>,
            children: [
              { index: true, element: <Navigate to="tp" replace /> },
              { path: 'tp', element: <Lazy><TujuanPembelajaranPage /></Lazy> },
              { path: 'penilaian', element: <Lazy><PenilaianListPage /></Lazy> },
              { path: 'rekap', element: <Lazy><RekapNilaiPage /></Lazy> },
            ],
          },
          // F6b: Rapor
          { path: '/guru/rapor', element: <RequireRole roles={['guru','admin']}><Lazy><RaporListPage /></Lazy></RequireRole> },
          { path: '/guru/rapor/:siswaId', element: <RequireRole roles={['guru','admin']}><Lazy><RaporDetailPage /></Lazy></RequireRole> },
          // F6c: Kokurikuler (guru)
          { path: '/guru/kokurikuler', element: <RequireRole roles={['guru','admin']}><Lazy><GuruKokurikulerPage /></Lazy></RequireRole> },
          { path: '/guru/kokurikuler/:kegiatanId/asesmen', element: <RequireRole roles={['guru','admin']}><Lazy><KokurikulerAsesmenPage /></Lazy></RequireRole> },
          // F6c: Rapor kokurikuler
          { path: '/kokurikuler/rapor/:siswaId', element: <RequireRole roles={['guru','admin','kesiswaan']}><Lazy><RaporKokurikulerPage /></Lazy></RequireRole> },
          // F6d: Ekskul (guru pembina)
          { path: '/guru/ekskul', element: <RequireRole roles={['guru','admin']}><Lazy><EkskulAdminPage /></Lazy></RequireRole> },
          { path: '/guru/ekskul/:ekskulId', element: <RequireRole roles={['guru','admin']}><Lazy><EkskulPembinaPage /></Lazy></RequireRole> },
          // F6d: Rapor ekskul
          { path: '/ekskul/rapor/:siswaId', element: <RequireRole roles={['guru','admin','kesiswaan']}><Lazy><RaporEkskulPage /></Lazy></RequireRole> },

          // ── TU (dashboard + presensi guru + pengaturan hub) ──────────────
          { path: '/tu', element: <RequireRole roles={['tu','admin','kepsek']}><Lazy><TuDashboardPage /></Lazy></RequireRole> },
          { path: '/tu/rekap-guru', element: <RequireRole roles={['tu','admin','kepsek']}><Lazy><TuRekapGuruPage /></Lazy></RequireRole> },
          // Presensi guru (path kanonik, dipakai juga menu kesiswaan)
          { path: '/tu/presensi-guru', element: <RequireRole roles={['tu','kesiswaan','admin','kepsek']}><Lazy><PresensiGuruPage /></Lazy></RequireRole> },
          // Izin guru admin (path kanonik)
          { path: '/tu/izin-guru', element: <RequireRole roles={['tu','kesiswaan','admin','kepsek']}><Lazy><AdminIzinGuruPage /></Lazy></RequireRole> },
          // Laporan harian guru (pindahan dari /admin/laporan/harian-guru)
          { path: '/tu/laporan/harian-guru', element: <RequireRole roles={['tu','kesiswaan','admin','kepsek']}><Lazy><LaporanHarianGuruPage /></Lazy></RequireRole> },
          // Pengaturan operasional TU — hub + 3 sub (IA-HIERARCHY-V2)
          { path: '/tu/pengaturan', element: <RequireRole roles={['tu','admin']}><Lazy><TuPengaturanPage /></Lazy></RequireRole> },
          { path: '/tu/pengaturan/jam', element: <RequireRole roles={['tu','admin']}><Lazy><PengaturanJamPage /></Lazy></RequireRole> },
          { path: '/tu/pengaturan/lokasi', element: <RequireRole roles={['tu','admin']}><Lazy><PengaturanLokasiPage /></Lazy></RequireRole> },
          { path: '/tu/pengaturan/libur', element: <RequireRole roles={['tu','admin']}><Lazy><PengaturanLiburPage /></Lazy></RequireRole> },

          // ── Kepsek: sekarang redirect saja ──────────────────────────────
          { path: '/kepsek', element: <Navigate to="/kesiswaan/presensi-siswa" replace /> },

          // ── REDIRECT LEGACY IA-lama → IA-baru (hapus setelah 1 rilis) ───
          { path: '/admin/orang', element: <Navigate to="/kurikulum/orang/guru" replace /> },
          { path: '/admin/orang/guru', element: <Navigate to="/kurikulum/orang/guru" replace /> },
          { path: '/admin/orang/siswa', element: <Navigate to="/kurikulum/orang/siswa" replace /> },
          { path: '/admin/orang/siswa/baru', element: <Navigate to="/kurikulum/orang/siswa/baru" replace /> },
          { path: '/admin/orang/siswa/:id', element: <RedirectWithParams base="/kurikulum/orang/siswa" /> },
          { path: '/admin/orang/guru/baru', element: <Navigate to="/kurikulum/orang/guru/baru" replace /> },
          { path: '/admin/orang/guru/:id', element: <RedirectWithParams base="/kurikulum/orang/guru" /> },
          { path: '/admin/orang/import', element: <Navigate to="/kurikulum/orang/import" replace /> },
          { path: '/admin/kelas', element: <Navigate to="/kurikulum/kelas" replace /> },
          { path: '/admin/ekskul', element: <Navigate to="/kurikulum/ekskul" replace /> },
          { path: '/admin/pengaturan', element: <Navigate to="/admin/sekolah" replace /> },
          { path: '/admin/pengaturan/sekolah', element: <Navigate to="/admin/sekolah" replace /> },
          { path: '/admin/pengaturan/tahun-ajaran', element: <Navigate to="/kurikulum/tahun-ajaran-kkm" replace /> },
          { path: '/admin/pengaturan/kkm', element: <Navigate to="/kurikulum/tahun-ajaran-kkm" replace /> },
          { path: '/admin/pengaturan/jam', element: <Navigate to="/tu/pengaturan/jam" replace /> },
          { path: '/admin/pengaturan/lokasi', element: <Navigate to="/tu/pengaturan/lokasi" replace /> },
          { path: '/admin/pengaturan/libur', element: <Navigate to="/tu/pengaturan/libur" replace /> },
          { path: '/admin/presensi-siswa', element: <Navigate to="/kesiswaan/presensi-siswa" replace /> },
          { path: '/admin/presensi-guru', element: <Navigate to="/tu/presensi-guru" replace /> },
          { path: '/admin/izin-guru', element: <Navigate to="/tu/izin-guru" replace /> },
          { path: '/admin/laporan', element: <Navigate to="/tu/presensi-guru" replace /> },
          { path: '/admin/laporan/harian-guru', element: <Navigate to="/tu/laporan/harian-guru" replace /> },
          { path: '/admin/laporan/keterlaksanaan', element: <Navigate to="/kurikulum/laporan/keterlaksanaan" replace /> },
          { path: '/admin/laporan/siswa', element: <Navigate to="/kesiswaan/laporan-kehadiran" replace /> },
        ],
      },

      // Fallback — sementara (kembalikan ke <Navigate to="/" replace /> setelah suite hijau)
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(routes);

// Keep App export for potential direct usage / testing
export function App() {
  return <RootLayout />;
}
