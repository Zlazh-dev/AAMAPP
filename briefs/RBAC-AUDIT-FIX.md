# Tabel Cacat Final RBAC — AAMAPP (dieksekusi tanpa bertanya)

Semua lokasi sudah diverifikasi baca-ulang file pada 2026-07-22. Urutan = keparahan (kebocoran akses > salah redirect > mismatch FE-BE). Kerjakan berurutan; #1 wajib dikerjakan SATU PAKET dengan #2, #3, dan #6 (pencabutan bypass membuat entri 'admin' eksplisit dan layar gembok jadi jalur aktif).

## Kelompok 1 — Logika guard/login (kebocoran akses & redirect)

| # | Lokasi | Masalah | Perbaikan PERSIS |
|---|--------|---------|------------------|
| 1 | `frontend/src/app/guards.tsx:40-41` | Bypass `admin passes all` menembus SEMUA rute termasuk `/guru/**` yang sudah guru-only. [TERKONFIRMASI planner] | **HAPUS dua baris ini** dari `RequireRole`:<br>```tsx
  // admin passes all
  if (user.roles.includes('admin')) return <>{children}</>;
```<br>Andalkan `roles.some()` saja — kelonggaran admin sudah eksplisit per-rute di App.tsx. |
| 2 | `frontend/src/app/guards.tsx:44-55` | Layar gembok statis buntu (tanpa navigasi). Setelah #1, layar ini jadi jalur aktif utk admin di `/guru/**`. [TERKONFIRMASI planner] | Ganti seluruh blok `if (!hasRole) { return ( <div ...layar gembok...> ); }` menjadi:<br>```tsx
  if (!hasRole) {
    return <Navigate to={getHomePath(user)} replace />;
  }
```<br>Tambahkan import di atas file: `import { getHomePath } from './menu';` |
| 3 | `frontend/src/app/AuthContext.tsx:66-71` | `login()` memulihkan returnTo dari sessionStorage tanpa cek hak (user apa pun mewarisi path sesi lama) DAN tanpa cek bentuk — nilai `//evil.com` membuat `window.location.href` jadi **open redirect eksternal**. [TERKONFIRMASI planner] | Ganti isi callback `login` menjadi:<br>```tsx
  const login = useCallback((token: string, u: SafeUser) => {
    setToken(token);
    setUser(u);
    const returnTo = getAndClearReturnTo();
    if (returnTo && returnTo !== '/' && isReturnToAllowed(returnTo, u)) {
      window.location.href = returnTo;
    } else {
      window.location.href = getHomePath(u);
    }
  }, []);
```<br>Tambahkan di level modul (di atas `AuthProvider`):<br>```tsx
// Cermin kontrak RequireRole di App.tsx — cukup kasar utk UX;
// penegakan sesungguhnya tetap di RequireRole.
const AREA_ACCESS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/kurikulum', roles: ['kurikulum', 'admin'] },
  { prefix: '/kesiswaan', roles: ['kesiswaan', 'admin', 'kepsek'] },
  { prefix: '/tu', roles: ['tu', 'admin', 'kepsek', 'kesiswaan'] },
  { prefix: '/guru', roles: ['guru'] },
  { prefix: '/izin/guru', roles: ['guru'] },
  { prefix: '/kokurikuler', roles: ['guru', 'admin', 'kesiswaan'] },
  { prefix: '/ekskul', roles: ['guru', 'admin', 'kesiswaan'] },
  { prefix: '/kepsek', roles: ['kepsek'] },
];

function isReturnToAllowed(path: string, u: SafeUser): boolean {
  // wajib path internal: tepat satu '/' di awal ('//evil.com' = open redirect)
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  const area = AREA_ACCESS.find(
    (a) => path === a.prefix || path.startsWith(a.prefix + '/'),
  );
  if (!area) return true; // /profil dll — auth-only
  return u.roles.some((r) => area.roles.includes(r));
}
``` |
| 4 | `frontend/src/app/AuthContext.tsx:74-83` | `logout()` tidak membersihkan `sessionStorage 'aamapp_return_to'` — path sesi lama (mis. `/admin/akun/sesi` hasil SESSION_IDLE) diwariskan ke user berikutnya di tab yang sama. | Di dalam `logout`, sebelum `clearToken();` tambahkan satu baris:<br>```tsx
    getAndClearReturnTo(); // buang return-to sisa sesi lama
``` |

## Kelompok 2 — Rute frontend (App.tsx)

| # | Lokasi | Masalah | Perbaikan PERSIS |
|---|--------|---------|------------------|
| 5 | `frontend/src/app/App.tsx:256, 257, 262, 264, 266, 267, 270, 279, 280, 282, 283, 287, 288` (13 rute: `/guru/roster/:jadwalId`, `/guru/rekap`, `/izin/guru`, `/guru/pelanggaran`, `/guru/penilaian`, `/guru/penilaian/nilai/:penilaianId`, `/guru/penilaian/:penugasanId` (shell + anak), `/guru/rapor`, `/guru/rapor/:siswaId`, `/guru/kokurikuler`, `/guru/kokurikuler/:kegiatanId/asesmen`, `/guru/ekskul`, `/guru/ekskul/:ekskulId`) | Kontrak tegas: `/guru/**` dan `/izin/guru` HANYA `['guru']` TANPA admin. Entri 'admin' eksplisit tetap meloloskan admin begitu bypass #1 dicabut; endpoint BE-nya pun guru-only sehingga admin hanya dapat 403. | Pada KE-13 baris tsb ganti `roles={['guru','admin']}` → `roles={['guru']}` |
| 6 | `frontend/src/app/App.tsx:237` — `/kurikulum/ekskul/:ekskulId` | `roles={['kurikulum','admin','guru']}` — kontrak `/kurikulum/**` hanya `['kurikulum','admin']`; guru pembina sudah punya jalur sendiri `/guru/ekskul/:ekskulId` (baris 288, komponen sama `EkskulPembinaPage`). | Ganti `roles={['kurikulum','admin','guru']}` → `roles={['kurikulum','admin']}` |
| 7 | `frontend/src/app/App.tsx:323` — redirect legacy `/admin/pengaturan` | Target `/admin/sekolah` sendirinya redirect legacy (baris 184) → double-hop. Kontrak: target redirect legacy harus rute baru yang sah. | Ganti `element: <Navigate to="/admin/sekolah" replace />` → `element: <Navigate to="/tu/pengaturan/sekolah" replace />` (mempertahankan tujuan akhir rantai saat ini) |

## Kelompok 3 — Backend & mismatch FE-BE

| # | Lokasi | Masalah | Perbaikan PERSIS |
|---|--------|---------|------------------|
| 8 | `backend/src/izin/izin.controller.ts:36` DAN `:45` (POST & GET `/api/izin/guru`) | `@Roles('guru', 'kepsek')` — kontrak: `/izin/guru` HANYA `['guru']` (kebocoran akses BE: kepsek bisa ajukan/lihat izin jalur guru). | Pada KEDUA baris ganti `@Roles('guru', 'kepsek')` → `@Roles('guru')` |
| 9 | `backend/src/presensi/presensi.controller.ts:80-87` (GET `/api/guru/kelas/rekap-presensi`) | Sisa bypass admin: `if (!Array.isArray(roles) || !roles.includes('admin'))` melewatkan cek wali-kelas utk akun dual-role admin+guru. | Ganti blok baris 80-87 menjadi cek tanpa pengecualian:<br>```ts
    const userId = (req as any).user?.id ?? req.session?.userId;
    const isWali = await this.svc.isWaliKelasByUserId(userId, kelasId);
    if (!isWali) {
      throw new ForbiddenException('Anda bukan wali kelas ini');
    }
```<br>(hapus variabel `roles` baris 80; komentar baris 64 boleh diubah `(wali kelas | admin)` → `(wali kelas)`) |
| 10 | `backend/src/laporan/laporan.controller.ts:18` (GET `/api/admin/dashboard`) | `@Roles('admin', 'kepsek')` padahal `TuDashboardPage.tsx:50` dan `KesiswaanDashboardPage.tsx:56` memanggil `api.adminGetDashboard` dari rute yang mengizinkan 'tu'/'kesiswaan' → halaman render tapi agregat 403. | Ganti baris 18: `@Roles('admin', 'kepsek')` → `@Roles('admin', 'kepsek', 'tu', 'kesiswaan')` (decorator method meng-override class-level baris 9 — baris 9 JANGAN diubah) |
| 11 | `backend/src/kokurikuler/kokurikuler.controller.ts:178` (GET `/api/kokurikuler/rapor/:siswaId`) | Tanpa 'kesiswaan' padahal rute FE `/kokurikuler/rapor/:siswaId` (App.tsx:285) memuat 'kesiswaan' → fetch utama 403. | Ganti `@Roles('guru', 'kurikulum', 'admin', 'kepsek')` → `@Roles('guru', 'kurikulum', 'admin', 'kepsek', 'kesiswaan')` |
| 12 | `backend/src/ekskul/ekskul.controller.ts:74` (GET `/api/ekskul/rapor/:siswaId`) | Tanpa 'kesiswaan' padahal rute FE `/ekskul/rapor/:siswaId` (App.tsx:290) memuat 'kesiswaan' → fetch utama 403. | Ganti `@Roles('guru','admin','kepsek')` → `@Roles('guru','admin','kepsek','kesiswaan')` |

## Dibuang dari daftar (bukan cacat — JANGAN dikerjakan)

- `App.tsx:240, 241, 244, 245` (`/kesiswaan`, `/kesiswaan/tata-tertib`, `/kesiswaan/verifikasi`, `/kesiswaan/tindak-lanjut` tanpa 'kepsek') dan `App.tsx:303-307` (`/tu/pengaturan*` tanpa 'kepsek') — deviasi arah LEBIH KETAT dari kontrak (kepsek ditolak, bukan bocor). Menu kepsek tidak menunjuk ke sana, jadi tidak ada yang rusak; dua slice audit sepakat ini "subset sah". Butuh keputusan pemilik produk, bukan eksekusi otomatis.
- `App.tsx:285 & 290` (`/kokurikuler/rapor/:siswaId`, `/ekskul/rapor/:siswaId` FE `['guru','admin','kesiswaan']`) — di luar area yang dikontrakkan; sisi FE dibiarkan, mismatch-nya diselesaikan di BE (#11, #12).

## Bukti cakupan — rute yang SUDAH BENAR (tidak disentuh)

- `/login`, `/daftar` publik; `/profil` auth-only tanpa RequireRole (App.tsx:156-157, 167); `/api/profile` auth-only; `/login`,`/daftar` `@Public` di BE.
- `/admin/**`: 10 rute konten (App.tsx:170-181) semua persis `['admin']`; BE `/api/admin/users|sessions|activities` class-level `@Roles('admin')`; aksi biometrik & batal-final rapor admin-only.
- `/kurikulum/**`: ~30 rute (App.tsx:187-236) persis `['kurikulum','admin']`; `/kurikulum/laporan/keterlaksanaan` (229) +kepsek sesuai pengecualian kontrak. Satu-satunya deviasi = #6.
- `/kesiswaan/**` (240-251): subset sah; `/kesiswaan/pelanggaran/:id` (243) +guru sesuai klausul kontrak; reward/laporan/presensi-siswa/laporan-kehadiran persis `['kesiswaan','admin','kepsek']`.
- `/guru/kbm` (255), `/guru/wajah` (259), `/guru/wajah/enroll` (260) sudah `['guru']` murni; `/guru` (254) redirect ke `/guru/kbm`. BE `/api/guru/**` seluruhnya `@Roles('guru')`; RolesGuard fail-closed tanpa admin-pass.
- `/tu/**` (293-307): `['tu','admin','kepsek']`; 3 kanonik bersama (296-301) +kesiswaan persis kontrak; BE kanonik TU (`/api/admin/izin/guru`, `/api/admin/presensi-guru/*`, `/api/admin/laporan/harian-guru`, `/api/tu/rekap-guru`) sesuai; PATCH pengaturan per-kunci via PATCH_ROLES sesuai.
- Redirect legacy (313-336 minus 323) semua menuju rute baru yang sah, termasuk `RedirectWithParams`; `/kepsek`→`/kesiswaan/presensi-siswa` (310); catch-all `*`→`/`→HomeRedirect sah.
- `menu.ts:112` ADMIN_EXTRA_AREAS tanpa 'guru'; semua path menu area-ekstra memuat 'admin' eksplisit → pencabutan bypass #1 TIDAK merusak menu admin; `getHomePath` (menu.ts:131-141) mendarat di rute yang diizinkan tiap peran (aman dipakai #2 dan #3).
- Rute yatim NIHIL: 76 file komponen lazy terverifikasi ada; 3 named export LaporanPages.tsx lengkap.

## Verifikasi pasca-eksekusi (checklist utk agent pelaksana)

1. `guards.tsx` masih meng-import `Navigate` (sudah ada di baris 2) dan kini `getHomePath`; hapus import `SafeUser` bila jadi unused.
2. Build FE + BE hijau (tsc), lalu smoke: (a) login admin → buka `/guru/kbm` → terlempar ke home admin, bukan layar gembok; (b) login kesiswaan setelah sesi idle admin di `/admin/akun` → mendarat di home kesiswaan; (c) dashboard `/tu` dan `/kesiswaan` memuat agregat tanpa 403; (d) kesiswaan buka `/kokurikuler/rapor/:siswaId` & `/ekskul/rapor/:siswaId` tanpa 403; (e) `/admin/pengaturan` mendarat langsung di `/tu/pengaturan/sekolah` sekali lompat.