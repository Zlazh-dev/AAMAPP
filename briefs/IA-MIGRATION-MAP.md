# PETA MIGRASI IA — AAMAPP (Gel-2 / Reorganisasi Area)

Sumber kebenaran yang sudah diverifikasi ulang: `D:\Codeproject\AAMAPP\frontend\src\app\App.tsx` (routes 141-300) dan `D:\Codeproject\AAMAPP\frontend\src\app\menu.ts` (MENU_GROUPS 32-101, ADMIN_EXTRA_AREAS 111).

## 0. Keputusan pondasi (baca dulu, jangan menyimpang)

1. **File TIDAK dipindah foldernya.** Hanya `path` rute + link yang berubah. `pages/admin/orang/GuruListPage.tsx` tetap di tempatnya walau rutenya jadi `/kurikulum/orang/guru`. Alasan: diff kecil, nol risiko import putus. Penataan folder = pekerjaan terpisah nanti.
2. **Halaman milik dua area → SATU path kanonik.** Kehadiran guru & izin guru dimiliki Kesiswaan + TU. Path kanonik dipilih di prefix `/tu/`, lalu **didaftarkan di menu KESISWAAN dan menu TU dengan path yang sama persis**, dan `RequireRole` menerima kedua peran. Tidak ada komponen/rute duplikat.
3. **Hub `/admin/laporan` DIBUBARKAN.** `AdminLaporanHubPage.tsx` dihapus, rute `/admin/laporan`, `/admin/laporan/*` dan `/kepsek` (yang me-mount komponen sama) dibongkar; tiap sub-laporan pindah ke area pemiliknya.
4. **Hub `/admin/pengaturan` DIBUBARKAN.** `PengaturanHubPage.tsx` dihapus. Isinya pecah: `sekolah`→admin, `tahun-ajaran`+`kkm`→kurikulum, `jam`+`lokasi`+`libur`→TU. Menu TU memuat 3 item pengaturan datar (sesuai keputusan pemilik produk), bukan hub.
5. **Validasi wajah bukan halaman.** Sudah hidup sebagai kartu di `GuruDetailPage.tsx:197-229` (`id="card-wajah-guru"`). Halaman mandiri `pages/admin/wajah/*` DIHAPUS. Karena `GuruDetailPage` sekarang berada di area kurikulum, kartu itu **wajib digating `user.roles.includes('admin')`** supaya peran kurikulum tidak bisa memvalidasi wajah (backend tetap `@Roles('admin')`).
6. **ADMIN_EXTRA_AREAS tetap `['kurikulum','kesiswaan','tu']`** — admin tetap melihat 3 area itu. **Area GURU tetap terkunci** ke peran guru (tidak masuk ADMIN_EXTRA_AREAS). Tidak ada perubahan di `menu.ts:111`.
7. **Selama migrasi, ganti catch-all `App.tsx:297`** dari `<Navigate to="/" replace />` menjadi halaman NotFound sementara, supaya dead link kelihatan. Kembalikan setelah suite hijau.

---

## 1. Tabel rute-per-rute

### 1.1 ADMIN (menyusut jadi 3 kelompok: Dashboard, Akun, Profil Sekolah)

| Path lama | Path baru | Area baru | RequireRole baru | File halaman |
|---|---|---|---|---|
| `/admin` | `/admin` (tetap) | admin | `['admin']` | `frontend/src/pages/admin/AdminDashboardPage.tsx` |
| `/admin/akun` | tetap | admin | `['admin']` | `pages/admin/akun/AkunDaftarPage.tsx` |
| `/admin/akun/sesi` | tetap | admin | `['admin']` | `pages/admin/akun/AkunSesiPage.tsx` |
| `/admin/akun/aktivitas` | tetap | admin | `['admin']` | `pages/admin/akun/AkunAktivitasPage.tsx` |
| `/admin/akun/persetujuan` | tetap | admin | `['admin']` | `pages/admin/akun/PersetujuanPage.tsx` |
| `/admin/akun/persetujuan/:id` | tetap | admin | `['admin']` | `pages/admin/akun/PersetujuanDetailPage.tsx` |
| `/admin/akun/baru` | tetap | admin | `['admin']` | `pages/admin/akun/AkunBaruPage.tsx` |
| `/admin/akun/sukses` | tetap | admin | `['admin']` | `components/SaveSuccess.tsx` |
| `/admin/akun/:id` | tetap | admin | `['admin']` | `pages/admin/akun/AkunDetailPage.tsx` |
| `/admin/akun/:id/edit` | tetap | admin | `['admin']` | `pages/admin/akun/AkunEditPage.tsx` |
| `/admin/pengaturan/sekolah` | **`/admin/sekolah`** | admin | `['admin']` | `pages/admin/pengaturan/PengaturanSekolahPage.tsx` |
| `/admin/pengaturan` (hub) | **DIHAPUS** | — | — | `pages/admin/pengaturan/PengaturanHubPage.tsx` → **hapus file** |

### 1.2 KURIKULUM (menyerap Data Orang, Kelas, Ekskul, TA, KKM)

| Path lama | Path baru | Area baru | RequireRole baru | File halaman |
|---|---|---|---|---|
| `/admin/orang` (Navigate) | `/kurikulum/orang` → `<Navigate to="/kurikulum/orang/guru" replace/>` | kurikulum | (redirect murni, tanpa guard) | — |
| `/admin/orang/guru` | `/kurikulum/orang/guru` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/GuruListPage.tsx` |
| `/admin/orang/guru/baru` | `/kurikulum/orang/guru/baru` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/GuruFormPage.tsx` |
| `/admin/orang/guru/sukses` | `/kurikulum/orang/guru/sukses` | kurikulum | `['kurikulum','admin']` | `components/SaveSuccess.tsx` (props path ikut diubah) |
| `/admin/orang/guru/:id` | `/kurikulum/orang/guru/:id` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/GuruDetailPage.tsx` (kartu wajah admin-only) |
| `/admin/orang/guru/:id/edit` | `/kurikulum/orang/guru/:id/edit` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/GuruFormPage.tsx` |
| `/admin/orang/siswa` | `/kurikulum/orang/siswa` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/SiswaListPage.tsx` |
| `/admin/orang/siswa/baru` | `/kurikulum/orang/siswa/baru` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/SiswaFormPage.tsx` |
| `/admin/orang/siswa/sukses` | `/kurikulum/orang/siswa/sukses` | kurikulum | `['kurikulum','admin']` | `components/SaveSuccess.tsx` |
| `/admin/orang/siswa/:id` | `/kurikulum/orang/siswa/:id` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/SiswaDetailPage.tsx` |
| `/admin/orang/siswa/:id/edit` | `/kurikulum/orang/siswa/:id/edit` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/SiswaFormPage.tsx` |
| `/admin/orang/import` | `/kurikulum/orang/import` | kurikulum | `['kurikulum','admin']` | `pages/admin/orang/ImportPage.tsx` |
| `/admin/kelas` | `/kurikulum/kelas` | kurikulum | `['kurikulum','admin']` | `pages/admin/kelas/KelasListPage.tsx` |
| `/admin/kelas/baru` | `/kurikulum/kelas/baru` | kurikulum | `['kurikulum','admin']` | `pages/admin/kelas/KelasFormPage.tsx` |
| `/admin/kelas/sukses` | `/kurikulum/kelas/sukses` | kurikulum | `['kurikulum','admin']` | `components/SaveSuccess.tsx` |
| `/admin/kelas/:id` | `/kurikulum/kelas/:id` | kurikulum | `['kurikulum','admin']` | `pages/admin/kelas/KelasDetailPage.tsx` |
| `/admin/kelas/:id/edit` | `/kurikulum/kelas/:id/edit` | kurikulum | `['kurikulum','admin']` | `pages/admin/kelas/KelasFormPage.tsx` |
| `/kurikulum` | tetap | kurikulum | `['kurikulum','admin']` | `pages/kurikulum/KurikulumDashboardPage.tsx` |
| `/kurikulum/mapel` (+`/baru`,`/sukses`,`/:id/edit`) | tetap | kurikulum | `['kurikulum','admin']` | `pages/kurikulum/MapelListPage.tsx`, `MapelFormPage.tsx` |
| `/kurikulum/penugasan` (+`/baru`,`/sukses`) | tetap | kurikulum | `['kurikulum','admin']` | `pages/kurikulum/PenugasanPage.tsx`, `PenugasanFormPage.tsx` |
| `/kurikulum/wali-kelas` | tetap | kurikulum | `['kurikulum','admin']` | `pages/kurikulum/WaliKelasPage.tsx` |
| `/kurikulum/jadwal` | tetap | kurikulum | `['kurikulum','admin']` | `pages/kurikulum/JadwalKbmPage.tsx` |
| `/kurikulum/kokurikuler` (+`/:kegiatanId/tim`) | tetap | kurikulum | `['kurikulum','admin']` | `pages/kokurikuler/KokurikulerKegiatanPage.tsx`, `KokurikulerTimPage.tsx` |
| `/admin/ekskul` | **`/kurikulum/ekskul`** | kurikulum | `['kurikulum','admin']` | `pages/ekskul/EkskulAdminPage.tsx` |
| `/admin/ekskul/:ekskulId` | **`/kurikulum/ekskul/:ekskulId`** | kurikulum | `['kurikulum','admin','guru']` | `pages/ekskul/EkskulPembinaPage.tsx` |
| `/admin/pengaturan/tahun-ajaran` | **`/kurikulum/tahun-ajaran`** | kurikulum | `['kurikulum','admin']` | `pages/admin/pengaturan/PengaturanTahunAjaranPage.tsx` |
| `/admin/pengaturan/tahun-ajaran/baru` | **`/kurikulum/tahun-ajaran/baru`** | kurikulum | `['kurikulum','admin']` | `pages/admin/pengaturan/PengaturanTahunAjaranFormPage.tsx` |
| `/admin/pengaturan/tahun-ajaran/sukses` | **`/kurikulum/tahun-ajaran/sukses`** | kurikulum | `['kurikulum','admin']` | `components/SaveSuccess.tsx` |
| `/admin/pengaturan/kkm` | **`/kurikulum/kkm`** | kurikulum | `['kurikulum','admin']` | `pages/admin/pengaturan/PengaturanKkmPage.tsx` |
| `/admin/laporan/keterlaksanaan` | **`/kurikulum/laporan/keterlaksanaan`** | kurikulum | `['kurikulum','admin','kepsek']` | `pages/admin/laporan/LaporanPages.tsx` (export `LaporanKeterlaksanaanPage`) |

> **CATATAN PENTING — DEAD LINK #1 SEMBUH SENDIRI.** `menu.ts:55` sudah menunjuk `/kurikulum/ekskul` padahal rutenya tidak ada. Setelah migrasi ini rute `/kurikulum/ekskul` NYATA ada, sehingga link sidebar itu hidup. Turunannya di `EkskulAdminPage.tsx:25,26,104` (`/kurikulum/ekskul/pembina`, `/kurikulum/ekskul/rapor`, `/kurikulum/ekskul/:id`) tetap **harus diperbaiki manual**: hanya `/kurikulum/ekskul/:id` yang punya rute; dua sisanya harus dihapus atau diarahkan ke `/kurikulum/ekskul`.

### 1.3 KESISWAAN (menyerap presensi siswa + laporan kehadiran siswa; berbagi presensi/izin guru dengan TU)

| Path lama | Path baru | Area baru | RequireRole baru | File halaman |
|---|---|---|---|---|
| `/kesiswaan` | tetap | kesiswaan | `['kesiswaan','admin']` | `pages/placeholder/PlaceholderPage.tsx` |
| `/kesiswaan/tata-tertib` | tetap | kesiswaan | `['kesiswaan','admin']` | `pages/kesiswaan/TataTertibPage.tsx` |
| `/kesiswaan/pelanggaran` | tetap | kesiswaan | `['kesiswaan','admin','kepsek']` | `pages/kesiswaan/PelanggaranPage.tsx` |
| `/kesiswaan/verifikasi` | tetap | kesiswaan | `['kesiswaan','admin']` | `pages/kesiswaan/VerifikasiPage.tsx` |
| `/kesiswaan/tindak-lanjut` | tetap | kesiswaan | `['kesiswaan','admin']` | `pages/kesiswaan/TindakLanjutPage.tsx` |
| `/kesiswaan/reward` | tetap | kesiswaan | `['kesiswaan','admin','kepsek']` | `pages/kesiswaan/RewardPage.tsx` |
| `/kesiswaan/laporan` (demerit) | tetap | kesiswaan | `['kesiswaan','admin','kepsek']` | `pages/kesiswaan/LaporanDemeritPage.tsx` |
| `/admin/presensi-siswa` | **`/kesiswaan/presensi-siswa`** | kesiswaan | `['kesiswaan','admin','kepsek']` | `pages/admin/presensi/MatriksPresensiSiswaPage.tsx` |
| `/admin/laporan/siswa` | **`/kesiswaan/laporan-kehadiran`** | kesiswaan | `['kesiswaan','admin','kepsek']` | `pages/admin/laporan/LaporanPages.tsx` (export `LaporanSiswaPage`) |
| `/admin/presensi-guru` | **`/tu/presensi-guru`** (kanonik, muncul di menu KESISWAAN & TU) | tu (kanonik) | `['tu','kesiswaan','admin','kepsek']` | `pages/admin/presensi/PresensiGuruPage.tsx` |
| `/admin/izin-guru` | **`/tu/izin-guru`** (kanonik, muncul di menu KESISWAAN & TU) | tu (kanonik) | `['tu','kesiswaan','admin','kepsek']` | `pages/admin/izin/AdminIzinGuruPage.tsx` |

> **`/kesiswaan/laporan-kehadiran`, bukan `/kesiswaan/laporan/kehadiran-siswa`.** Alasan teknis: `findActiveLeaf` (`menu.ts:154-156`) memakai prefix-match `path + '/'`. Kalau laporan kehadiran ditaruh di bawah `/kesiswaan/laporan/...`, item sidebar "Laporan Demerit" (`/kesiswaan/laporan`) akan ikut menyala. Dengan tanda hubung, `startsWith('/kesiswaan/laporan/')` bernilai false → tidak ada tabrakan penanda aktif.

### 1.4 TU (pemilik kanonik presensi guru, izin guru, dan 3 pengaturan operasional)

| Path lama | Path baru | Area baru | RequireRole baru | File halaman |
|---|---|---|---|---|
| `/tu` | tetap (landing TU = rekap guru) | tu | `['tu','admin','kepsek']` | `pages/tu/TuRekapGuruPage.tsx` |
| `/tu/rekap-guru` | tetap | tu | `['tu','admin','kepsek']` | `pages/tu/TuRekapGuruPage.tsx` |
| `/admin/presensi-guru` | **`/tu/presensi-guru`** | tu (kanonik, dipakai juga menu kesiswaan) | `['tu','kesiswaan','admin','kepsek']` | `pages/admin/presensi/PresensiGuruPage.tsx` |
| `/admin/izin-guru` | **`/tu/izin-guru`** | tu (kanonik, dipakai juga menu kesiswaan) | `['tu','kesiswaan','admin','kepsek']` | `pages/admin/izin/AdminIzinGuruPage.tsx` |
| `/admin/laporan/harian-guru` | **`/tu/laporan/harian-guru`** | tu | `['tu','kesiswaan','admin','kepsek']` | `pages/admin/laporan/LaporanPages.tsx` (export `LaporanHarianGuruPage`) |
| `/admin/pengaturan/jam` | **`/tu/pengaturan/jam`** | tu | `['tu','admin']` | `pages/admin/pengaturan/PengaturanJamPage.tsx` |
| `/admin/pengaturan/lokasi` | **`/tu/pengaturan/lokasi`** | tu | `['tu','admin']` | `pages/admin/pengaturan/PengaturanLokasiPage.tsx` |
| `/admin/pengaturan/libur` | **`/tu/pengaturan/libur`** | tu | `['tu','admin']` | `pages/admin/pengaturan/PengaturanLiburPage.tsx` |

### 1.5 GURU (TIDAK BERUBAH — area tetap terkunci peran guru)

`/guru`, `/guru/kbm`, `/guru/roster/:jadwalId`, `/guru/rekap`, `/guru/wajah`, `/guru/wajah/enroll`, `/izin/guru`, `/guru/pelanggaran`, `/guru/penilaian` (+ semua child), `/guru/rapor` (+`/:siswaId`), `/guru/kokurikuler` (+`/:kegiatanId/asesmen`), `/guru/ekskul` (+`/:ekskulId`), `/kokurikuler/rapor/:siswaId`, `/ekskul/rapor/:siswaId` — **semua path dan RequireRole dipertahankan apa adanya**. `ADMIN_EXTRA_AREAS` tetap tanpa `'guru'`.

### 1.6 KEPSEK & rute yang DIBONGKAR

| Path lama | Nasib | Keterangan |
|---|---|---|
| `/admin/laporan` | **DIHAPUS** | hub dibubarkan; `AdminLaporanHubPage.tsx` dihapus |
| `/kepsek` | **jadi redirect**: `<Navigate to="/kesiswaan/presensi-siswa" replace />` | dulu me-mount `AdminLaporanHubPage`; kini sekadar bookmark landing |
| `/admin/pengaturan` | **DIHAPUS** | hub dibubarkan; `PengaturanHubPage.tsx` dihapus |
| `pages/admin/wajah/WajahListPage.tsx`, `EnrollWizardPage.tsx` | **HAPUS FILE** | sudah orphan; fungsinya di kartu `card-wajah-guru` pada `GuruDetailPage.tsx:197-229` |
| `pages/admin/kiosk/PerangkatKioskPage.tsx`, `VerifikasiPendingPage.tsx`, `index.ts` | **HAPUS FILE** | backend kiosk sudah dihapus; tak ada importer |
| `pages/kiosk/KioskApp.tsx`, `KioskPairingPage.tsx`, `KioskScannerPage.tsx` | **HAPUS FILE** | orphan |
| import `KbmHariIniPage` di `App.tsx:54` | **HAPUS BARIS** | import mati, tak dipakai rute mana pun |

Menu KEPSEK tidak lagi punya hub, jadi diisi tautan langsung ke tujuh laporan (lihat `menuTs`). `getHomePath` untuk kepsek otomatis jadi `/kesiswaan/presensi-siswa` (item pertama grup KEPSEK).

---

## 2. Redirect legacy yang WAJIB ditambahkan

Ditaruh di `App.tsx` **di dalam** `AuthedLayout.children`, tanpa `RequireRole` (redirect murni; guard berlaku di tujuan). Hanya path statis — `<Navigate>` tidak menginterpolasi `:param`, jadi rute berparameter TIDAK bisa diredirect dan spesnya harus diubah manual.

```tsx
// === REDIRECT LEGACY IA-lama → IA-baru (hapus setelah 1 rilis) ===
{ path: '/admin/orang', element: <Navigate to="/kurikulum/orang/guru" replace /> },
{ path: '/admin/orang/guru', element: <Navigate to="/kurikulum/orang/guru" replace /> },
{ path: '/admin/orang/siswa', element: <Navigate to="/kurikulum/orang/siswa" replace /> },
{ path: '/admin/orang/import', element: <Navigate to="/kurikulum/orang/import" replace /> },
{ path: '/admin/kelas', element: <Navigate to="/kurikulum/kelas" replace /> },
{ path: '/admin/ekskul', element: <Navigate to="/kurikulum/ekskul" replace /> },
{ path: '/admin/pengaturan', element: <Navigate to="/admin/sekolah" replace /> },
{ path: '/admin/pengaturan/sekolah', element: <Navigate to="/admin/sekolah" replace /> },
{ path: '/admin/pengaturan/tahun-ajaran', element: <Navigate to="/kurikulum/tahun-ajaran" replace /> },
{ path: '/admin/pengaturan/kkm', element: <Navigate to="/kurikulum/kkm" replace /> },
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
```

**TIDAK bisa diredirect (parameter/berkas turunan) → spec & link internal harus disunting manual:**
`/admin/orang/guru/baru`, `/admin/orang/guru/:id`, `/admin/orang/guru/:id/edit`, `/admin/orang/guru/sukses`, `/admin/orang/siswa/baru`, `/admin/orang/siswa/:id`, `/admin/orang/siswa/:id/edit`, `/admin/orang/siswa/sukses`, `/admin/kelas/baru`, `/admin/kelas/:id`, `/admin/kelas/:id/edit`, `/admin/kelas/sukses`, `/admin/ekskul/:ekskulId`, `/admin/pengaturan/tahun-ajaran/baru`, `/admin/pengaturan/tahun-ajaran/sukses`.

---

## 3. Perubahan `@Roles` backend (per controller / endpoint)

Prinsip: FE memindahkan kepemilikan menu → BE harus mengizinkan peran pemilik baru. `RolesGuard` **fail-closed** (`backend/src/common/roles.guard.ts:39-44`) dan `@Roles` handler **menimpa** `@Roles` kelas (getAllAndOverride) — jadi setiap perubahan harus ditulis eksplisit di level yang benar.

### 3.1 `backend/src/guru/guru.controller.ts` (Data Orang → kurikulum; guru list dipakai TU/kesiswaan untuk filter)
| Endpoint | Lama | **Baru** | Baris |
|---|---|---|---|
| `GET /api/admin/guru` | `'admin','kurikulum','kepsek'` | `'admin','kurikulum','kepsek','tu','kesiswaan'` | :30-34 |
| `GET /api/admin/guru/:id` | `'admin','kurikulum','kepsek','guru'` | `'admin','kurikulum','kepsek','guru','tu','kesiswaan'` | :36-40 |
| `POST /api/admin/guru` | `'admin'` | `'admin','kurikulum'` | :42-46 |
| `PATCH /api/admin/guru/:id` | `'admin'` | `'admin','kurikulum'` | :48-56 |
| `DELETE /api/admin/guru/:id` | `'admin'` | `'admin','kurikulum'` | :58-62 |

### 3.2 `backend/src/siswa/siswa.controller.ts`
| Endpoint | Lama | **Baru** | Baris |
|---|---|---|---|
| `POST /api/admin/siswa` | `'admin'` | `'admin','kurikulum'` | :46-50 |
| `PATCH /api/admin/siswa/:id` | `'admin'` | `'admin','kurikulum'` | :52-60 |
| `DELETE /api/admin/siswa/:id` | `'admin'` | `'admin','kurikulum'` | :62-66 |
| GET list & GET :id | sudah memuat `'kurikulum'` | **tidak berubah** | :34-44 |

Bersihkan sisa import mati `Res/UploadedFile/FileInterceptor` (`siswa.controller.ts:12-18`) sekalian.

### 3.3 `backend/src/kelas/kelas.controller.ts`
| Endpoint | Lama | **Baru** | Baris |
|---|---|---|---|
| `POST /api/admin/kelas` | `'admin'` | `'admin','kurikulum'` | :47-51 |
| `PATCH /api/admin/kelas/:id` | `'admin'` | `'admin','kurikulum'` | :53-61 |
| `DELETE /api/admin/kelas/:id` | `'admin'` | `'admin','kurikulum'` | :77-81 |
| `PATCH /api/admin/kelas/:id/wali` | `'admin','kurikulum'` | **tidak berubah** | :67-75 |

### 3.4 `backend/src/import/import.controller.ts` (import guru/siswa ikut ke kurikulum)
`@Roles('admin')` **level kelas** (:30) → `@Roles('admin','kurikulum')`. Mencakup `template`, `preview`, `commit`.

### 3.5 `backend/src/uploads/uploads.controller.ts`
Sudah `@Roles('admin','kurikulum')` level kelas (:75). **Tidak berubah** — kurikulum tetap bisa unggah foto guru/siswa. Catatan: profil sekolah (logo) diunggah admin, dan admin sudah tercakup.

### 3.6 `backend/src/tahun-ajaran/tahun-ajaran.controller.ts` (TA → kurikulum)
| Endpoint | Lama | **Baru** | Baris |
|---|---|---|---|
| `POST /api/admin/tahun-ajaran` | `'admin'` | `'admin','kurikulum'` | :49-53 |
| `PATCH /api/admin/tahun-ajaran/:id` | `'admin'` | `'admin','kurikulum'` | :55-63 |
| `POST /api/admin/tahun-ajaran/:id/aktifkan` | `'admin'` | `'admin','kurikulum'` | :69-73 |
| `DELETE /api/admin/tahun-ajaran/:id` | `'admin'` | `'admin','kurikulum'` | :75-79 |
| GET × 3 | sudah 6 peran | tidak berubah | :31-47 |

### 3.7 `backend/src/kurikulum/libur.controller.ts` (kalender libur → TU)
| Endpoint | Lama | **Baru** | Baris |
|---|---|---|---|
| `GET /api/admin/libur/cek-nasional` | `'admin'` | `'admin','tu'` | :40-44 |
| `GET /api/admin/libur/impor-nasional` | `'admin'` | `'admin','tu'` | :46-51 |
| `POST /api/admin/libur` | `'admin'` | `'admin','tu'` | :53-57 |
| `POST /api/admin/libur/bulk` | `'admin'` | `'admin','tu'` | :59-63 |
| `DELETE /api/admin/libur/:id` | `'admin'` | `'admin','tu'` | :65-69 |
| `GET /api/admin/libur` | sudah 6 peran | tidak berubah | :32-35 |

### 3.8 `backend/src/pengaturan/pengaturan.controller.ts` (jam & lokasi → TU, profil sekolah tetap admin)
`PATCH /api/admin/pengaturan/:key` (:71-80): `@Roles('admin')` → **`@Roles('admin','tu')`**, **ditambah pengecekan key di dalam handler** karena satu endpoint melayani banyak key:

```ts
// di dalam handler PATCH /api/admin/pengaturan/:key
const roles: string[] = req.user?.roles ?? [];
const TU_KEYS = ['jam_presensi', 'lokasi'];
if (!roles.includes('admin') && !TU_KEYS.includes(key)) {
  throw new ForbiddenException('Peran TU hanya boleh mengubah jam_presensi dan lokasi');
}
```
`profil_sekolah` dan `kkm` (via endpoint ini) tetap efektif admin-only. VALID_KEYS (:17-23) tidak berubah.

### 3.9 `backend/src/kurikulum/kurikulum.controller.ts`
`GET/PATCH /api/kurikulum/pengaturan/kkm` sudah `'admin','kurikulum'` (:176-186) — **tidak berubah**. Mapel/penugasan/jadwal juga tidak berubah.

### 3.10 `backend/src/laporan/laporan.controller.ts` — WAJIB pecah dari level kelas
`LaporanController` punya `@Roles('admin','kepsek')` **level kelas** (:9). Karena tiap laporan kini pindah area, tambahkan `@Roles` **per method** (menimpa kelas):

| Endpoint | Lama (kelas) | **Baru (per method)** | Baris |
|---|---|---|---|
| `GET /api/admin/dashboard` | `'admin','kepsek'` | `@Roles('admin','kepsek')` (tulis eksplisit) | :17-20 |
| `GET /api/admin/laporan/harian-guru` | `'admin','kepsek'` | `@Roles('admin','kepsek','tu','kesiswaan')` | :26-42 |
| `GET /api/admin/laporan/keterlaksanaan-kbm` | `'admin','kepsek'` | `@Roles('admin','kepsek','kurikulum')` | :48-68 |
| `GET /api/admin/laporan/siswa` | `'admin','kepsek'` | `@Roles('admin','kepsek','kesiswaan')` | :74-92 |

`TuController` (:100-102, `@Roles('tu','admin')` level kelas) → **`@Roles('tu','admin','kepsek')`** supaya kepsek bisa membaca rekap guru.

### 3.11 `backend/src/presensi-guru/presensi-guru.controller.ts`
| Endpoint | Lama | **Baru** | Baris |
|---|---|---|---|
| `GET /api/admin/presensi-guru/harian` | `'admin','kepsek'` | `'admin','kepsek','tu','kesiswaan'` | :121-125 |
| `POST /api/admin/presensi-guru/manual` | `'admin'` | `'admin','tu','kesiswaan'` | :131-135 |
| `PATCH /api/admin/guru/:id/wajah/validasi` | `'admin'` | **tetap `'admin'`** (validasi wajah admin-only) | :142-150 |
| `GET/PUT/DELETE /api/admin/wajah*` | `'admin'` | tetap `'admin'` (halaman FE-nya dihapus; endpoint dibiarkan) | :75-114 |

### 3.12 `backend/src/izin/izin.controller.ts`
`AdminIzinGuruController` — ketiga endpoint dari `'admin','kepsek'` → **`'admin','kepsek','tu','kesiswaan'`**: `GET /api/admin/izin/guru` (:64-82), `PATCH .../setujui` (:89-97), `PATCH .../tolak` (:104-112). `IzinGuruController` (guru mandiri, :35-48) tidak berubah.

### 3.13 `backend/src/presensi/presensi.controller.ts`
`GET /api/admin/presensi-siswa` sudah `'admin','kepsek','kesiswaan'` (:104-111) — **tidak berubah**. Otorisasi halus di `GET /api/guru/kelas/rekap-presensi` (:70-95) juga tidak disentuh.

### 3.14 `backend/src/ekskul/ekskul.controller.ts` (ekskul → kurikulum)
| Endpoint | Lama | **Baru** | Baris |
|---|---|---|---|
| `GET /api/ekskul` | `'admin','kepsek','guru'` | `'admin','kepsek','guru','kurikulum'` | :23 |
| `GET /api/ekskul/:id` | `'admin','kepsek','guru'` | `'admin','kepsek','guru','kurikulum'` | :24 |
| `POST /api/ekskul` | `'admin'` | `'admin','kurikulum'` | :25 |
| `PATCH /api/ekskul/:id` | `'admin'` | `'admin','kurikulum'` | :26 |
| `DELETE /api/ekskul/:id` | `'admin'` | `'admin','kurikulum'` | :27 |
| `GET/POST/DELETE /api/ekskul/:id/peserta*` | `'guru','admin'` | `'guru','admin','kurikulum'` | :30-40 |
| `PATCH/DELETE tujuan`, `PUT nilai`, `PUT kehadiran` | `'guru'` | **tetap `'guru'`** (asesmen milik pembina) | :54-70 |

### 3.15 Tidak berubah
`users`, `admin/sessions`, `admin/activities` tetap `'admin'` (Akun tetap milik admin). `auth`, `profile`, `kesiswaan`, `penilaian`, `rapor`, `kokurikuler` tidak disentuh.

---

## 4. Daftar file frontend yang harus diubah, per agent

### AG-2 — components + admin + kurikulum + kesiswaan + kokurikuler + ekskul + tu + menu.ts + App.tsx

**Router & menu (kerjakan PERTAMA, ini kontraknya):**
1. `frontend/src/app/App.tsx` — semua path baru, RequireRole baru, blok redirect legacy, hapus import `KbmHariIniPage` (:54), hapus import+rute `AdminLaporanHubPage` (:67, :246-252) dan `PengaturanHubPage` (:36, :184), ganti catch-all (:297) jadi NotFound sementara.
2. `frontend/src/app/menu.ts` — ganti `MENU_GROUPS` (baris 32-101) dengan isi di bagian `menuTs`. `AREA_ORDER` (:104) dan `ADMIN_EXTRA_AREAS` (:111) **tidak berubah**.

**Komponen bersama:**
3. `frontend/src/components/SaveSuccess.tsx` — tidak ada perubahan kode; yang berubah adalah props `addAgainPath`/`listPath`/`detailPathPattern` di `App.tsx` (5 tempat: guru, siswa, kelas, tahun-ajaran, akun).
4. `frontend/src/components/SubPageLinks.tsx` — periksa tidak ada path hard-code (hanya penerima props); ubah bila ada.
5. `frontend/src/app/AppLayout.tsx` — cek daftar `dashboardRoot` di `SidebarRow` (~:222-233) yang memakai `end=true` untuk `'/admin','/kurikulum','/kesiswaan','/guru','/kepsek','/tu'`; `/tu` kini bukan item menu (item pertama TU adalah `/tu/rekap-guru`) — pastikan tidak ada baris yatim.

**Halaman admin:**
6. `pages/admin/AdminDashboardPage.tsx` — `:90` `/admin/izin-guru?status=MENUNGGU` → `/tu/izin-guru?status=MENUNGGU`; **`:99` hapus kartu `/admin/presensi-guru-pending`** (dead link nyata, halaman targetnya dihapus); `:209` & `:248` `/admin/laporan` → `/tu/presensi-guru` (label "Presensi Guru").
7. `pages/admin/akun/AkunDaftarPage.tsx`, `AkunSesiPage.tsx`, `AkunAktivitasPage.tsx`, `PersetujuanPage.tsx`, `PersetujuanDetailPage.tsx`, `AkunBaruPage.tsx`, `AkunDetailPage.tsx`, `AkunEditPage.tsx` — path `/admin/akun*` **tidak berubah**; hanya cek bila ada link ke `/admin/orang` atau `/admin/pengaturan`.
8. `pages/admin/orang/GuruListPage.tsx` (:83,:87,:88,:94-98,:152,:168), `GuruDetailPage.tsx` (:113,:145,:155-158 + **gating admin pada kartu wajah :197-229**), `GuruFormPage.tsx` (:93,:125,:133-136), `SiswaListPage.tsx` (:102,:106,:107,:113-117,:169,:185), `SiswaDetailPage.tsx` (:119,:149,:159-162), `SiswaFormPage.tsx` (:202,:233,:241-244), `ImportPage.tsx` (:105,:112,:113,:119-124) — `/admin/orang/...` → `/kurikulum/orang/...`.
9. `pages/admin/kelas/KelasListPage.tsx` (:81,:84-87,:123,:151), `KelasDetailPage.tsx` (:270,:289,:299-301,:361,:392,:406,:428), `KelasFormPage.tsx` (:83,:110,:118-120) — `/admin/kelas` → `/kurikulum/kelas`, `/admin/orang/siswa*` → `/kurikulum/orang/siswa*`.
10. `pages/admin/pengaturan/PengaturanSekolahPage.tsx` (:79,:88) — BackLink `/admin/pengaturan` → `/admin`.
11. `pages/admin/pengaturan/PengaturanJamPage.tsx` (:84,:93), `PengaturanLokasiPage.tsx` (:107,:116), `PengaturanLiburPage.tsx` (:354,:362) — BackLink → `/tu/rekap-guru`.
12. `pages/admin/pengaturan/PengaturanTahunAjaranPage.tsx` (:73,:81,:84), `PengaturanTahunAjaranFormPage.tsx` (:47,:62,:94), `PengaturanKkmPage.tsx` (:69,:78) — BackLink → `/kurikulum`; path TA → `/kurikulum/tahun-ajaran*`.
13. `pages/admin/pengaturan/PengaturanHubPage.tsx` — **HAPUS FILE**.
14. `pages/admin/laporan/AdminLaporanHubPage.tsx` — **HAPUS FILE**.
15. `pages/admin/laporan/LaporanPages.tsx` — BackLink `:214` → `/tu/rekap-guru` (label "TU"), `:320` → `/kurikulum` (label "Kurikulum"), `:431` → `/kesiswaan` (label "Kesiswaan").
16. `pages/admin/presensi/MatriksPresensiSiswaPage.tsx` (:152) — BackLink → `/kesiswaan`, label "Kesiswaan".
17. `pages/admin/presensi/PresensiGuruPage.tsx` (:132) — BackLink → `/tu/rekap-guru`, label "TU".
18. `pages/admin/presensi/RosterDetailSheet.tsx` — cek path internal (tidak ada rute, kemungkinan aman).
19. `pages/admin/izin/AdminIzinGuruPage.tsx` (:275) — BackLink → `/tu/rekap-guru`, label "TU".
20. **HAPUS FOLDER** `pages/admin/wajah/` (2 file) dan `pages/admin/kiosk/` (3 file), serta `pages/kiosk/` (3 file).

**Halaman kurikulum / kokurikuler / ekskul / tu / kesiswaan:**
21. `pages/kurikulum/PenugasanPage.tsx` — `:20` `/kurikulum/wali` → **`/kurikulum/wali-kelas`** (DEAD LINK #2), `:22` `/kurikulum/ekskul` sekarang valid (biarkan), `:153` sudah benar.
22. `pages/kurikulum/MapelListPage.tsx` (:22) — cek link `/kurikulum/ekskul` (kini valid).
23. `pages/kokurikuler/KokurikulerKegiatanPage.tsx` — `:117` `/kurikulum/kokurikuler/tim` dan `:118` `/kurikulum/kokurikuler/rapor` **dead** (butuh param): hapus atau ganti jadi tautan kontekstual per kegiatan (DEAD LINK #4 & #5).
24. `pages/ekskul/EkskulAdminPage.tsx` — `:25` `/kurikulum/ekskul/pembina` dan `:26` `/kurikulum/ekskul/rapor` **dead**: hapus; `:104` `/kurikulum/ekskul/:id` kini valid.
25. `pages/ekskul/EkskulPembinaPage.tsx` (:184) — sesuaikan back ke `/kurikulum/ekskul` atau `/guru/ekskul` sesuai konteks peran.
26. `pages/tu/TuRekapGuruPage.tsx` — tambah SubPageLinks/PageMenu ke `/tu/presensi-guru`, `/tu/izin-guru`, `/tu/laporan/harian-guru` (menggantikan jalan masuk lama lewat hub Laporan).
27. `pages/kesiswaan/*` — tambah tautan ke `/kesiswaan/presensi-siswa` dan `/kesiswaan/laporan-kehadiran` di dashboard kesiswaan (`PlaceholderPage` di `/kesiswaan` sebaiknya diganti dashboard nyata, minimal daftar kartu).

### AG-1 — pages/guru + seluruh e2e
28. `pages/guru/**` — **tidak ada path yang berubah**; tugas AG-1 adalah memastikan tidak ada link keluar ke `/admin/*` yang mati (grep `'/admin/` di `frontend/src/pages/guru/`).
29. Seluruh spec e2e di daftar bagian 5.

---

## 5. Spec e2e yang menavigasi path lama & harus disesuaikan

Lihat field `e2eTerdampak` untuk daftar path file lengkap. Rinciannya:

**Wajib disunting (navigasi UI ke path lama):**
- `gelombang1/form-fokus.spec.ts:12` — `/admin/orang/siswa/baru` → `/kurikulum/orang/siswa/baru`
- `gelombang1/libur-rentang.spec.ts:8,11,33`, `gelombang1/libur-seleksi.spec.ts:28`, `gelombang2/libur-crud.spec.ts:38,77`, `gelombang2/libur-nasional-banner.spec.ts:6,36` — `/admin/pengaturan/libur` → `/tu/pengaturan/libur`
- `gelombang2/backlink-adaptif.spec.ts:38,39` + `backlink-adaptif.mobile.spec.ts:39,40,53,58` — `/admin/kelas/:id` → `/kurikulum/kelas/:id`, `/admin/orang/guru/baru` → `/kurikulum/orang/guru/baru`; **regex `/\/admin\/kelas\/\d+$/` → `/\/kurikulum\/kelas\/\d+$/`**
- `gelombang2/kelas-crud.spec.ts:39,66,81,87,110,117,144` — semua `/admin/kelas*` → `/kurikulum/kelas*`; **`new RegExp('/admin/kelas/'+kelasId+'$')` → `/kurikulum/kelas/...`**
- `gelombang2/kelas-assign-siswa.spec.ts:59`, `search-select.spec.ts:62,90`, `ui-desktop.spec.ts:8` — `/admin/kelas*` → `/kurikulum/kelas*`
- `gelombang2/guru-crud.spec.ts:21,36,64,70,75`, `image-uploader.spec.ts:16,44,87,97`, `ui-mobile.mobile.spec.ts:7,29` — `/admin/orang/guru*` → `/kurikulum/orang/guru*`
- `gelombang2/siswa-crud.spec.ts:38,52,85`, `filter-bar.spec.ts:54,70`, `unsaved-guard.spec.ts:20,36,43,48` — `/admin/orang/siswa*` → `/kurikulum/orang/siswa*`
- `gelombang2/import-wizard.spec.ts:12` — `/admin/orang/import` → `/kurikulum/orang/import`
- `gelombang2/pengaturan.spec.ts:18,42,63,84,123,126` — `sekolah`→`/admin/sekolah`, `jam`→`/tu/pengaturan/jam`, `lokasi`→`/tu/pengaturan/lokasi`, `kkm`→`/kurikulum/kkm`; **hapus test hub `/admin/pengaturan` (:123-126) karena hub dibubarkan**
- `gelombang2/tahun-ajaran.spec.ts:36,39,54` — → `/kurikulum/tahun-ajaran` dan `/kurikulum/tahun-ajaran/baru`
- `gelombang2/presensi-admin-fix2.spec.ts:7,162,205,216,245,272` — `/admin/presensi-siswa` → `/kesiswaan/presensi-siswa`
- `gelombang2/presensi-wajah-ui.spec.ts:24,37,39,71,85` — `/admin/orang/guru/:id` → `/kurikulum/orang/guru/:id`; `/admin/presensi-guru` → `/tu/presensi-guru`; **`:85` `/admin/laporan` dihapus/diganti** (hub dibubarkan). Catatan lama masih berlaku: `:49` membuka `/guru/wajah` dengan login admin — rute itu `roles={['guru']}` dan hanya lolos karena `guards.tsx:41` mem-bypass admin.
- `gelombang2/izin-guru.spec.ts:8,133,156,181,209,244` — `/admin/izin-guru` → `/tu/izin-guru`
- `gelombang2/laporan-dashboard.spec.ts:55,65,68,91,119,142,157,182` — `/admin` tetap; **`/admin/laporan` dihapus**; `harian-guru`→`/tu/laporan/harian-guru`, `keterlaksanaan`→`/kurikulum/laporan/keterlaksanaan`, `siswa`→`/kesiswaan/laporan-kehadiran`
- `gelombang2/tu-rekap.spec.ts:9,10,106,110,119,129` — `/admin/laporan` dihapus; `/admin/izin-guru` → `/tu/izin-guru`; `/tu/rekap-guru` tetap
- `gelombang2/ekskul-f6d.spec.ts:18,19,24,29,39,40,47,52,56,57,59,63,68,75,80,87,151` — `/admin/ekskul*` → `/kurikulum/ekskul*`; **`toHaveURL('/admin/ekskul')` :59 → `/kurikulum/ekskul`**; sidebar assert :150,:155
- `gelombang2/akun.spec.ts:37,58,70,77`, `cabut-sesi.spec.ts:18` — path `/admin/akun*` **tidak berubah**; tapi `cabut-sesi.spec.ts:18` menuju `/admin/akun/1/sesi` yang **tidak pernah ada** → perbaiki jadi `/admin/akun/sesi`
- `gelombang2/auth.spec.ts:15` — `waitForURL('**/admin')` masih valid untuk admin (item pertama grup ADMIN tetap `/admin`)

**Wajib disunting karena bergantung SIDEBAR/menu.ts:**
- `gelombang2/menu-admin.spec.ts:21,24,27-29,32,37,38` — grup KURIKULUM sekarang punya 10 item; assert 'Jadwal KBM'/'Mata Pelajaran'/'Penugasan' masih valid, tambahkan assert 'Data Orang' & 'Kelas' pindah ke grup KURIKULUM
- `gelombang2/ux-polish-gel1.spec.ts` — **SPEC PALING RAPUH, hampir seluruhnya harus ditulis ulang**: `:80-118,:137` semua assert hub `/admin/laporan` GUGUR (hub dibubarkan); `:125` selektor hard-code `nav a[href="/admin/presensi-siswa"]` → `nav a[href="/kesiswaan/presensi-siswa"]`; `:132` `nav a[href="/admin/presensi-guru"]` → `nav a[href="/tu/presensi-guru"]`; `:143` `#laporan-hub-admin-presensi-siswa` gugur; `:153,:160,:171,:191` `/admin/orang/guru/1` → `/kurikulum/orang/guru/1`; `:69-74` (`/admin/perangkat` tidak ada) dan `:181-188` (`/admin/wajah` tidak ada) dan `:45-52` (`/kiosk`) **tetap dipertahankan** — rute itu memang harus tetap tidak ada; `:21-40,:54-66` assert sidebar admin harus diperbarui ke 4 item baru
- `gelombang2/rbac-negatif.spec.ts:54,55,58` — assert palsu hari ini: label 'Daftar Guru'/'Pengaturan Akun' tidak ada di `menu.ts` (yang benar 'Data Orang'/'Akun'), dan `:58` `/admin/guru` bukan rute. Perbaiki jadi assert nyata: user kurikulum **boleh** melihat 'Data Orang' (kini milik kurikulum) tapi **tidak boleh** melihat item grup ADMIN ('Akun','Profil Sekolah'), dan `page.goto('/admin/akun')` harus ditolak
- `gelombang2/kesiswaan-frontend.spec.ts:103-107,130`, `kesiswaan-f5b.spec.ts:103`, `kokurikuler-f6c.spec.ts:123,128`, `penilaian-f6a.spec.ts:131`, `rapor-f6b.spec.ts:85` — assert isi sidebar; sesuaikan dengan grup baru (kesiswaan kini 11 item, kurikulum 10 item)

**Tidak berubah (murni API `/api/admin/*`, path backend tidak dipindah):**
`helpers/api.ts`, `laporan-backend.spec.ts`, `izin-guru-backend.spec.ts`, `rekap-tu-backend.spec.ts`, `security.spec.ts`, `presensi-wajah.spec.ts`, `ux-polish-be.spec.ts`, `ekskul-f6d-backend.spec.ts`, `kokurikuler-f6c-backend.spec.ts`, `penilaian-f6a-backend.spec.ts`, `rapor-f6b-backend.spec.ts`, `rapor-integrasi-backend.spec.ts`, `kesiswaan-f5a-backend.spec.ts`, `kesiswaan-f5b-backend.spec.ts`, `presensi-siswa.spec.ts`, `nits-bad-request.spec.ts`. **Path REST tidak ikut migrasi IA** — hanya `@Roles` yang berubah, jadi spec ini tetap hijau kecuali yang menguji penolakan 403 untuk peran yang kini diizinkan (periksa `ux-polish-be.spec.ts` dan `security.spec.ts`).

**Konfigurasi runner:** `frontend/playwright.config.ts:25-39` — `*.mobile.spec.ts` hanya berjalan di proyek `mobile-chromium`. Setelah migrasi wajib jalankan **kedua** proyek, kalau tidak `backlink-adaptif.mobile.spec.ts`, `jadwal-mobile.mobile.spec.ts`, `ui-mobile.mobile.spec.ts` akan terlewat.

---

## 6. Risiko & dead-link yang harus dicek

1. **Catch-all menyembunyikan kerusakan.** `App.tsx:297` mengubah setiap path tak dikenal jadi redirect senyap ke `/`. Selama migrasi ganti dengan halaman NotFound, kalau tidak seluruh link putus akan terlihat sebagai "terlempar ke dashboard" dan lolos QA.
2. **Guard bocor untuk admin.** `guards.tsx:41` mem-bypass semua pengecekan untuk peran `admin`. Jadi `RequireRole roles={['kurikulum','admin']}` dan `roles={['kurikulum']}` berperilaku identik bagi admin. Menulis `'admin'` eksplisit di daftar (seperti tabel di atas) tetap dianjurkan supaya niatnya terbaca; jangan mengandalkan bypass.
3. **Satu path di dua grup menu.** `/tu/presensi-guru` dan `/tu/izin-guru` muncul di grup KESISWAAN dan TU. `findActiveLeaf` (`menu.ts:145-170`) memilih path terpanjang; dua kandidat berpanjang sama → yang pertama menang, dan urutan `AREA_ORDER` menaruh `kesiswaan` sebelum `tu`. Akibatnya untuk user yang punya kedua peran, sorotan sidebar muncul di grup KESISWAAN saja. Ini disengaja, jangan dianggap bug.
4. **Judul header bisa jatuh ke "AAMAPP".** `AppLayout.tsx:67-68` mengambil judul dari leaf menu aktif. Setiap rute yang dipindah lintas prefix tanpa item menu yang cocok akan kehilangan judul. Cek khusus: `/kurikulum/orang/*` (leaf `/kurikulum/orang` ada → aman), `/kesiswaan/laporan-kehadiran` (leaf ada → aman), `/tu/laporan/harian-guru` (leaf ada → aman), `/admin/sekolah` (leaf ada → aman).
5. **Komponen dipakai ulang di >1 path — pindahkan berpasangan:** `GuruFormPage` (baru/edit), `SiswaFormPage`, `KelasFormPage`, `MapelFormPage`, `TuRekapGuruPage` (`/tu` + `/tu/rekap-guru`), `EkskulAdminPage` (`/kurikulum/ekskul` + `/guru/ekskul`), `EkskulPembinaPage`. Memindah satu tanpa yang lain = link putus.
6. **`LaporanPages.tsx` memuat 3 halaman untuk 3 area berbeda.** Setelah migrasi, satu file melayani `/tu/laporan/harian-guru`, `/kurikulum/laporan/keterlaksanaan`, dan `/kesiswaan/laporan-kehadiran`. Boleh dibiarkan (import lazy tetap benar), tapi catat di komentar file supaya tidak membingungkan.
7. **Dead link yang sudah ada hari ini dan harus ditutup dalam migrasi ini:** `AdminDashboardPage.tsx:99` → `/admin/presensi-guru-pending` (target dihapus); `PenugasanPage.tsx:20` → `/kurikulum/wali` (seharusnya `/kurikulum/wali-kelas`); `KokurikulerKegiatanPage.tsx:117,118`; `EkskulAdminPage.tsx:25,26`; `WajahListPage.tsx:13,14,150,199` (file dihapus, otomatis selesai).
8. **Rute yatim yang harus punya jalan masuk setelah hub dibubarkan.** Sebelumnya `/admin/presensi-siswa`, `/admin/presensi-guru`, `/admin/izin-guru`, dan 3 sub-laporan HANYA dapat dicapai lewat `AdminLaporanHubPage`. Setelah hub dihapus, keempatnya **wajib** ada di sidebar area baru (sudah dimasukkan di `menuTs`) — kalau tidak, mereka jadi tak terjangkau meski rutenya hidup. Verifikasi setelah migrasi: setiap rute non-parameter punya minimal satu jalan masuk dari sidebar atau SubPageLinks.
9. **`/kurikulum/wali-kelas` masih yatim** (hanya dari `PenugasanPage.tsx:153`). Bukan bagian keputusan IA, tapi setelah `PenugasanPage.tsx:20` diperbaiki minimal ada dua jalan masuk yang konsisten.
10. **Backend fail-closed.** Setiap handler yang memakai `RolesGuard` tanpa `@Roles` akan 403 selamanya (`roles.guard.ts:39-44`). Saat memecah `@Roles` level-kelas `LaporanController` jadi per-method, **jangan hapus dekorator kelas sebelum keempat method punya dekorator sendiri**, atau semua laporan mati serentak.
11. **Urutan kerja yang aman:** (a) AG-2 ubah `menu.ts` + `App.tsx` + redirect legacy; (b) AG-2 ubah link internal halaman; (c) AG-2/backend ubah `@Roles`; (d) AG-1 sunting e2e; (e) jalankan `chromium` **dan** `mobile-chromium`; (f) kembalikan catch-all `*` ke `<Navigate to="/" replace />`; (g) hapus blok redirect legacy setelah satu rilis.

---

## 7. Peleburan validasi wajah (detail eksekusi)

- **Yang dihapus:** `frontend/src/pages/admin/wajah/WajahListPage.tsx` dan `frontend/src/pages/admin/wajah/EnrollWizardPage.tsx`. Keduanya sudah tidak diimpor router mana pun; rute `/admin/wajah` dan `/admin/wajah/:guruId` memang sudah tidak ada, dan `e2e/gelombang2/ux-polish-gel1.spec.ts:181-188` sudah menegaskan rute itu harus tetap tidak ada.
- **Yang dilebur ke mana:** fungsi Terima/Tolak enrolment wajah sudah hidup sebagai kartu `id="card-wajah-guru"` di `frontend/src/pages/admin/orang/GuruDetailPage.tsx:197-229`, halaman yang kini beralamat `/kurikulum/orang/guru/:id`.
- **Gating yang WAJIB ditambahkan** (karena halaman induknya kini dapat dibuka peran kurikulum):
```tsx
const { user } = useAuth();
const bolehValidasiWajah = user?.roles?.includes('admin') ?? false;
// ...
{bolehValidasiWajah && (
  <Card id="card-wajah-guru" title="Pendaftaran Wajah"> ... </Card>
)}
```
- **Backend tetap ketat:** `PATCH /api/admin/guru/:id/wajah/validasi` di `backend/src/presensi-guru/presensi-guru.controller.ts:142-150` **tidak diubah**, tetap `@Roles('admin')`. Ini pertahanan lapis kedua kalau gating FE lolos.
- **Enrolment mandiri guru tidak berubah:** `/guru/wajah` dan `/guru/wajah/enroll` tetap `roles={['guru']}` di `App.tsx:233-234`.

---

## LAMPIRAN A — MENU_GROUPS baru (siap salin ke menu.ts)

```ts
// Menu per area — IA BARU (reorganisasi kepemilikan area)
// Ganti seluruh blok MENU_GROUPS di frontend/src/app/menu.ts baris 32-101.
// AREA_ORDER (:104) dan ADMIN_EXTRA_AREAS (:111) TIDAK BERUBAH.
const MENU_GROUPS: Record<string, MenuGroup> = {
  admin: {
    area: 'admin',
    label: 'ADMIN',
    items: [
      // ADMIN menyusut: dashboard + akun + profil sekolah saja.
      { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
      { label: 'Akun', path: '/admin/akun', icon: 'manage_accounts', badgeKey: 'pendingUsers' },
      { label: 'Persetujuan Akun', path: '/admin/akun/persetujuan', icon: 'how_to_reg' },
      { label: 'Profil Sekolah', path: '/admin/sekolah', icon: 'apartment' },
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
      { label: 'Penugasan', path: '/kurikulum/penugasan', icon: 'assignment_ind' },
      { label: 'Jadwal KBM', path: '/kurikulum/jadwal', icon: 'calendar_month' },
      { label: 'Kokurikuler', path: '/kurikulum/kokurikuler', icon: 'school' },
      { label: 'Ekstrakurikuler', path: '/kurikulum/ekskul', icon: 'sports' },
      { label: 'Tahun Ajaran', path: '/kurikulum/tahun-ajaran', icon: 'event_note' },
      { label: 'KKM', path: '/kurikulum/kkm', icon: 'rule' },
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
      { label: 'Laporan Demerit', path: '/kesiswaan/laporan', icon: 'bar_chart' },
      // Kehadiran siswa (pindahan dari hub Laporan admin)
      { label: 'Presensi Siswa', path: '/kesiswaan/presensi-siswa', icon: 'fact_check' },
      { label: 'Laporan Kehadiran Siswa', path: '/kesiswaan/laporan-kehadiran', icon: 'assessment' },
      // Kehadiran & izin guru — path KANONIK milik TU, didaftarkan juga di sini.
      { label: 'Presensi Guru', path: '/tu/presensi-guru', icon: 'badge' },
      { label: 'Izin Guru', path: '/tu/izin-guru', icon: 'event_available' },
    ],
  },
  guru: {
    area: 'guru',
    label: 'GURU',
    items: [
      // §A: area guru DIKUNCI ke peran guru saja (bukan admin extra). TIDAK BERUBAH.
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
      // Hub /admin/laporan DIBUBARKAN — kepsek dapat tautan langsung ke tiap laporan.
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
      { label: 'Rekap Guru', path: '/tu/rekap-guru', icon: 'summarize' },
      // Path KANONIK presensi & izin guru (didaftarkan juga di menu KESISWAAN).
      { label: 'Presensi Guru', path: '/tu/presensi-guru', icon: 'badge' },
      { label: 'Laporan Harian Guru', path: '/tu/laporan/harian-guru', icon: 'assessment' },
      { label: 'Izin Guru', path: '/tu/izin-guru', icon: 'event_available' },
      { label: 'Jam KBM', path: '/tu/pengaturan/jam', icon: 'schedule' },
      { label: 'Lokasi Presensi', path: '/tu/pengaturan/lokasi', icon: 'location_on' },
      { label: 'Hari Libur', path: '/tu/pengaturan/libur', icon: 'event_busy' },
    ],
  },
};
```

---

## LAMPIRAN B — Daftar pemindahan rute (43)

| Path lama | Path baru | Area | Peran | File | Catatan |
|---|---|---|---|---|---|
| `/admin` | `/admin` | admin | `['admin']` | `frontend/src/pages/admin/AdminDashboardPage.tsx` | Tetap. Perbaiki link keluar: :90 /admin/izin-guru -> /tu/izin-guru; :99 HAPUS kartu /admin/presensi-guru-pending (dead); :209,:248 /admin/laporan -> /tu/presensi-guru. |
| `/admin/akun` | `/admin/akun` | admin | `['admin']` | `frontend/src/pages/admin/akun/AkunDaftarPage.tsx` | Tetap. Seluruh subtree /admin/akun/* (sesi, aktivitas, persetujuan, persetujuan/:id, baru, sukses, :id, :id/edit) tidak berubah. |
| `/admin/pengaturan/sekolah` | `/admin/sekolah` | admin | `['admin']` | `frontend/src/pages/admin/pengaturan/PengaturanSekolahPage.tsx` | Prefix 'pengaturan' dibuang karena hub dibubarkan. BackLink :79,:88 -> /admin. |
| `/admin/pengaturan` | `(DIHAPUS)` | - | `-` | `frontend/src/pages/admin/pengaturan/PengaturanHubPage.tsx` | Hub dibubarkan, HAPUS FILE. Tambah redirect legacy /admin/pengaturan -> /admin/sekolah. |
| `/admin/orang` | `/kurikulum/orang` | kurikulum | `(redirect murni, tanpa guard)` | `-` | <Navigate to="/kurikulum/orang/guru" replace/>. Ini path yang dipakai sidebar. |
| `/admin/orang/guru` | `/kurikulum/orang/guru` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/GuruListPage.tsx` | File TIDAK dipindah folder. Update link :83,:87,:88,:94-98,:152,:168. |
| `/admin/orang/guru/baru` | `/kurikulum/orang/guru/baru` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/GuruFormPage.tsx` | Komponen dipakai ulang dengan /:id/edit — pindahkan berpasangan. |
| `/admin/orang/guru/sukses` | `/kurikulum/orang/guru/sukses` | kurikulum | `['kurikulum','admin']` | `frontend/src/components/SaveSuccess.tsx` | Props addAgainPath/listPath/detailPathPattern ikut diubah ke prefix /kurikulum/orang/guru. |
| `/admin/orang/guru/:id` | `/kurikulum/orang/guru/:id` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/GuruDetailPage.tsx` | WAJIB: gating kartu wajah id=card-wajah-guru (:197-229) dengan user.roles.includes('admin'), karena halaman kini terbuka untuk peran kurikulum. |
| `/admin/orang/guru/:id/edit` | `/kurikulum/orang/guru/:id/edit` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/GuruFormPage.tsx` | Tidak bisa diredirect legacy (berparameter) — e2e harus disunting. |
| `/admin/orang/siswa` | `/kurikulum/orang/siswa` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/SiswaListPage.tsx` | Update link :102,:106,:107,:113-117,:169,:185. |
| `/admin/orang/siswa/baru` | `/kurikulum/orang/siswa/baru` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/SiswaFormPage.tsx` | Dipakai ulang dengan /:id/edit. |
| `/admin/orang/siswa/sukses` | `/kurikulum/orang/siswa/sukses` | kurikulum | `['kurikulum','admin']` | `frontend/src/components/SaveSuccess.tsx` | Props path diubah. |
| `/admin/orang/siswa/:id` | `/kurikulum/orang/siswa/:id` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/SiswaDetailPage.tsx` | BackLink :119, edit :149, PageMenu :159-162. |
| `/admin/orang/siswa/:id/edit` | `/kurikulum/orang/siswa/:id/edit` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/SiswaFormPage.tsx` | Berparameter, tanpa redirect legacy. |
| `/admin/orang/import` | `/kurikulum/orang/import` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/orang/ImportPage.tsx` | Backend: ImportController @Roles kelas 'admin' -> 'admin','kurikulum'. |
| `/admin/kelas` | `/kurikulum/kelas` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/kelas/KelasListPage.tsx` | Update :81,:84-87,:123,:151. |
| `/admin/kelas/baru` | `/kurikulum/kelas/baru` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/kelas/KelasFormPage.tsx` | Dipakai ulang dengan /:id/edit. |
| `/admin/kelas/sukses` | `/kurikulum/kelas/sukses` | kurikulum | `['kurikulum','admin']` | `frontend/src/components/SaveSuccess.tsx` | Props path diubah. |
| `/admin/kelas/:id` | `/kurikulum/kelas/:id` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/kelas/KelasDetailPage.tsx` | Link lintas-area :361,:392,:406,:428 -> /kurikulum/orang/siswa*. |
| `/admin/kelas/:id/edit` | `/kurikulum/kelas/:id/edit` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/kelas/KelasFormPage.tsx` | Berparameter, tanpa redirect legacy. |
| `/admin/ekskul` | `/kurikulum/ekskul` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/ekskul/EkskulAdminPage.tsx` | Menyembuhkan DEAD LINK menu.ts:55. Komponen sama juga di-mount di /guru/ekskul — JANGAN duplikasi, cukup ubah mount admin. Bersihkan link mati EkskulAdminPage.tsx:25,26. |
| `/admin/ekskul/:ekskulId` | `/kurikulum/ekskul/:ekskulId` | kurikulum | `['kurikulum','admin','guru']` | `frontend/src/pages/ekskul/EkskulPembinaPage.tsx` | Backend ekskul.controller: GET list/detail + peserta tambah 'kurikulum'; PATCH/DELETE tujuan & PUT nilai/kehadiran TETAP 'guru'. |
| `/admin/pengaturan/tahun-ajaran` | `/kurikulum/tahun-ajaran` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/pengaturan/PengaturanTahunAjaranPage.tsx` | BackLink :73,:81 -> /kurikulum; tombol tambah :84 -> /kurikulum/tahun-ajaran/baru. |
| `/admin/pengaturan/tahun-ajaran/baru` | `/kurikulum/tahun-ajaran/baru` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/pengaturan/PengaturanTahunAjaranFormPage.tsx` | Sukses :47 -> /kurikulum/tahun-ajaran/sukses; batal :94. |
| `/admin/pengaturan/tahun-ajaran/sukses` | `/kurikulum/tahun-ajaran/sukses` | kurikulum | `['kurikulum','admin']` | `frontend/src/components/SaveSuccess.tsx` | Tanpa detailPathPattern (sama seperti sekarang). |
| `/admin/pengaturan/kkm` | `/kurikulum/kkm` | kurikulum | `['kurikulum','admin']` | `frontend/src/pages/admin/pengaturan/PengaturanKkmPage.tsx` | BackLink :69,:78 -> /kurikulum. Backend PATCH /api/kurikulum/pengaturan/kkm sudah 'admin','kurikulum'. |
| `/admin/laporan/keterlaksanaan` | `/kurikulum/laporan/keterlaksanaan` | kurikulum | `['kurikulum','admin','kepsek']` | `frontend/src/pages/admin/laporan/LaporanPages.tsx (export LaporanKeterlaksanaanPage)` | BackLink :320 -> /kurikulum label 'Kurikulum'. Backend GET /api/admin/laporan/keterlaksanaan-kbm tambah 'kurikulum' per method. |
| `/admin/presensi-siswa` | `/kesiswaan/presensi-siswa` | kesiswaan | `['kesiswaan','admin','kepsek']` | `frontend/src/pages/admin/presensi/MatriksPresensiSiswaPage.tsx` | BackLink :152 -> /kesiswaan label 'Kesiswaan'. Backend sudah 'admin','kepsek','kesiswaan' (tidak berubah). Selektor e2e ux-polish-gel1.spec.ts:125 hard-code href WAJIB diperbarui. |
| `/admin/laporan/siswa` | `/kesiswaan/laporan-kehadiran` | kesiswaan | `['kesiswaan','admin','kepsek']` | `frontend/src/pages/admin/laporan/LaporanPages.tsx (export LaporanSiswaPage)` | Sengaja BUKAN /kesiswaan/laporan/... agar tidak menabrak prefix-match item 'Laporan Demerit' (/kesiswaan/laporan) di findActiveLeaf menu.ts:154-156. BackLink :431 -> /kesiswaan. |
| `/admin/presensi-guru` | `/tu/presensi-guru` | tu (kanonik; didaftarkan juga di menu KESISWAAN & KEPSEK) | `['tu','kesiswaan','admin','kepsek']` | `frontend/src/pages/admin/presensi/PresensiGuruPage.tsx` | SATU path, SATU komponen, tiga menu. BackLink :132 -> /tu/rekap-guru label 'TU'. Backend GET harian -> +'tu','kesiswaan'; POST manual -> 'admin','tu','kesiswaan'. Selektor e2e ux-polish-gel1.spec.ts:132 hard-code href WAJIB diperbarui. |
| `/admin/izin-guru` | `/tu/izin-guru` | tu (kanonik; didaftarkan juga di menu KESISWAAN & KEPSEK) | `['tu','kesiswaan','admin','kepsek']` | `frontend/src/pages/admin/izin/AdminIzinGuruPage.tsx` | BackLink :275 -> /tu/rekap-guru label 'TU'. Deep-link dashboard ?status=MENUNGGU ikut pindah. Backend AdminIzinGuruController ketiga endpoint -> +'tu','kesiswaan'. |
| `/admin/laporan/harian-guru` | `/tu/laporan/harian-guru` | tu | `['tu','kesiswaan','admin','kepsek']` | `frontend/src/pages/admin/laporan/LaporanPages.tsx (export LaporanHarianGuruPage)` | BackLink :214 -> /tu/rekap-guru label 'TU'. Backend tambah 'tu','kesiswaan' per method. |
| `/admin/pengaturan/jam` | `/tu/pengaturan/jam` | tu | `['tu','admin']` | `frontend/src/pages/admin/pengaturan/PengaturanJamPage.tsx` | BackLink :84,:93 -> /tu/rekap-guru. Backend PATCH /api/admin/pengaturan/:key -> @Roles('admin','tu') + cek key in-handler (TU hanya jam_presensi & lokasi). |
| `/admin/pengaturan/lokasi` | `/tu/pengaturan/lokasi` | tu | `['tu','admin']` | `frontend/src/pages/admin/pengaturan/PengaturanLokasiPage.tsx` | BackLink :107,:116 -> /tu/rekap-guru. |
| `/admin/pengaturan/libur` | `/tu/pengaturan/libur` | tu | `['tu','admin']` | `frontend/src/pages/admin/pengaturan/PengaturanLiburPage.tsx` | BackLink :354,:362 -> /tu/rekap-guru. Backend libur.controller: cek-nasional, impor-nasional, POST, POST bulk, DELETE -> tambah 'tu'. |
| `/tu` | `/tu` | tu | `['tu','admin','kepsek']` | `frontend/src/pages/tu/TuRekapGuruPage.tsx` | Tetap sebagai landing TU (komponen sama dengan /tu/rekap-guru). Backend TuController @Roles kelas 'tu','admin' -> tambah 'kepsek'. |
| `/tu/rekap-guru` | `/tu/rekap-guru` | tu | `['tu','admin','kepsek']` | `frontend/src/pages/tu/TuRekapGuruPage.tsx` | Tambah SubPageLinks ke /tu/presensi-guru, /tu/izin-guru, /tu/laporan/harian-guru — menggantikan jalan masuk lama lewat hub Laporan. |
| `/admin/laporan` | `(DIHAPUS)` | - | `-` | `frontend/src/pages/admin/laporan/AdminLaporanHubPage.tsx` | Hub dibubarkan, HAPUS FILE. Redirect legacy /admin/laporan -> /tu/presensi-guru. 6 halaman yang dulu HANYA dicapai dari hub kini wajib ada di sidebar area barunya. |
| `/kepsek` | `/kepsek (jadi redirect)` | kepsek | `(redirect murni)` | `-` | <Navigate to="/kesiswaan/presensi-siswa" replace/>. Dulu me-mount AdminLaporanHubPage yang kini dihapus. getHomePath kepsek otomatis ke item pertama grup KEPSEK. |
| `/kesiswaan/laporan` | `/kesiswaan/laporan` | kesiswaan | `['kesiswaan','admin','kepsek']` | `frontend/src/pages/kesiswaan/LaporanDemeritPage.tsx` | Tetap (label menu jadi 'Laporan Demerit'). JANGAN tambahkan child di bawah path ini — akan menabrak penanda aktif. |
| `(tidak ada rute) /admin/wajah` | `(dilebur ke /kurikulum/orang/guru/:id)` | kurikulum | `kartu digating admin-only di dalam halaman` | `HAPUS: frontend/src/pages/admin/wajah/WajahListPage.tsx dan frontend/src/pages/admin/wajah/EnrollWizardPage.tsx` | Fungsi Terima/Tolak wajah sudah hidup di GuruDetailPage.tsx:197-229 (id=card-wajah-guru). Backend PATCH /api/admin/guru/:id/wajah/validasi TETAP @Roles('admin'). e2e ux-polish-gel1.spec.ts:181-188 yang menguji rute /admin/wajah TIDAK ADA harus DIPERTAHANKAN. |
| `(tidak ada rute) /admin/perangkat, /admin/presensi-guru-pending, /kiosk` | `(DIHAPUS PERMANEN)` | - | `-` | `HAPUS: frontend/src/pages/admin/kiosk/PerangkatKioskPage.tsx, VerifikasiPendingPage.tsx, index.ts, frontend/src/pages/kiosk/KioskApp.tsx, KioskPairingPage.tsx, KioskScannerPage.tsx` | Backend kiosk sudah dihapus. AdminDashboardPage.tsx:99 yang melink /admin/presensi-guru-pending WAJIB dihapus. e2e ux-polish-gel1.spec.ts:45-52,:68-74 yang menguji rute-rute ini TIDAK ADA harus DIPERTAHANKAN. |

---

## LAMPIRAN C — E2E terdampak (45)

- frontend/e2e/gelombang1/form-fokus.spec.ts — :12 /admin/orang/siswa/baru -> /kurikulum/orang/siswa/baru
- frontend/e2e/gelombang1/libur-rentang.spec.ts — :8,:11 (komentar), :33 /admin/pengaturan/libur -> /tu/pengaturan/libur
- frontend/e2e/gelombang1/libur-seleksi.spec.ts — :28 /admin/pengaturan/libur -> /tu/pengaturan/libur
- frontend/e2e/gelombang2/libur-crud.spec.ts — :38,:77 /admin/pengaturan/libur -> /tu/pengaturan/libur
- frontend/e2e/gelombang2/libur-nasional-banner.spec.ts — :6 (komentar), :36 /admin/pengaturan/libur -> /tu/pengaturan/libur
- frontend/e2e/gelombang2/pengaturan.spec.ts — :18 sekolah -> /admin/sekolah; :42 jam -> /tu/pengaturan/jam; :63 kkm -> /kurikulum/kkm; :84 lokasi -> /tu/pengaturan/lokasi; :123-126 test hub /admin/pengaturan HARUS DIHAPUS (hub dibubarkan)
- frontend/e2e/gelombang2/tahun-ajaran.spec.ts — :36,:54 -> /kurikulum/tahun-ajaran; :39 waitForURL -> **/kurikulum/tahun-ajaran/baru
- frontend/e2e/gelombang2/guru-crud.spec.ts — :21,:70 goto; :36,:75 waitForURL **/admin/orang/guru/baru; :64 waitForURL **/admin/orang/guru — semua -> prefix /kurikulum/orang/guru
- frontend/e2e/gelombang2/image-uploader.spec.ts — :16 (komentar), :44 /admin/orang/guru/baru, :87 /admin/orang/guru/${id}, :97 waitForURL **/edit -> prefix /kurikulum/orang/guru
- frontend/e2e/gelombang2/siswa-crud.spec.ts — :38,:85 /admin/orang/siswa; :52 waitForURL **/admin/orang/siswa/baru -> prefix /kurikulum/orang/siswa
- frontend/e2e/gelombang2/filter-bar.spec.ts — :54,:70 /admin/orang/siswa -> /kurikulum/orang/siswa
- frontend/e2e/gelombang2/unsaved-guard.spec.ts — :20,:36,:48 /admin/orang/siswa/baru; :43 waitForURL **/admin/orang/siswa -> prefix /kurikulum/orang/siswa
- frontend/e2e/gelombang2/import-wizard.spec.ts — :12 /admin/orang/import -> /kurikulum/orang/import
- frontend/e2e/gelombang2/ui-mobile.mobile.spec.ts — :7 /admin/orang/guru; :29 waitForURL **/admin/orang/guru/baru -> prefix /kurikulum/orang/guru (HANYA jalan di proyek mobile-chromium)
- frontend/e2e/gelombang2/kelas-crud.spec.ts — :39,:81,:87,:110,:144 path /admin/kelas*; :66 waitForURL **/admin/kelas/baru; :117 new RegExp('/admin/kelas/'+kelasId+'$') -> semua ke /kurikulum/kelas
- frontend/e2e/gelombang2/kelas-assign-siswa.spec.ts — :59 /admin/kelas/${id} -> /kurikulum/kelas/${id}
- frontend/e2e/gelombang2/search-select.spec.ts — :62,:90 /admin/kelas/${id} -> /kurikulum/kelas/${id}
- frontend/e2e/gelombang2/ui-desktop.spec.ts — :8 /admin/kelas/baru -> /kurikulum/kelas/baru
- frontend/e2e/gelombang2/backlink-adaptif.spec.ts — :10 (komentar), :38 /admin/kelas/:id, :39 regex /\/admin\/kelas\/\d+$/ -> /kurikulum/kelas
- frontend/e2e/gelombang2/backlink-adaptif.mobile.spec.ts — :39,:40 (regex), :53 waitForURL **/admin/kelas, :58 /admin/orang/guru/baru -> /kurikulum/* (HANYA jalan di proyek mobile-chromium)
- frontend/e2e/gelombang2/ekskul-f6d.spec.ts — :18,:19,:24,:29,:39,:40,:47,:52,:56,:57,:63,:68,:75,:80,:87,:151 /admin/ekskul* -> /kurikulum/ekskul*; :59 toHaveURL('/admin/ekskul') -> '/kurikulum/ekskul'; :150,:155 assert sidebar; bagian /guru/ekskul dan /ekskul/rapor TIDAK berubah
- frontend/e2e/gelombang2/presensi-admin-fix2.spec.ts — :7 (komentar), :162,:205,:216,:245,:272 /admin/presensi-siswa -> /kesiswaan/presensi-siswa (termasuk sesi kepsek read-only di :215)
- frontend/e2e/gelombang2/presensi-wajah-ui.spec.ts — :24,:71 /admin/orang/guru/:id -> /kurikulum/orang/guru/:id; :37,:39 /admin/presensi-guru -> /tu/presensi-guru; :85 /admin/laporan DIHAPUS (hub bubar); :49 /guru/wajah dgn login admin tetap rapuh (roles=['guru'], lolos hanya karena bypass admin di guards.tsx:41)
- frontend/e2e/gelombang2/izin-guru.spec.ts — :8,:133 (komentar), :156,:181,:209,:244 /admin/izin-guru -> /tu/izin-guru
- frontend/e2e/gelombang2/laporan-dashboard.spec.ts — :55 /admin tetap; :65,:68,:182 /admin/laporan DIHAPUS; :91,:119 -> /tu/laporan/harian-guru; :142 -> /kurikulum/laporan/keterlaksanaan; :157 -> /kesiswaan/laporan-kehadiran
- frontend/e2e/gelombang2/tu-rekap.spec.ts — :9,:10,:106 (komentar), :110 /admin/laporan DIHAPUS, :119,:129 /admin/izin-guru -> /tu/izin-guru; :61,:95,:143,:147 /tu/rekap-guru TETAP
- frontend/e2e/gelombang2/cabut-sesi.spec.ts — :18 /admin/akun/1/sesi tidak pernah ada; perbaiki jadi /admin/akun/sesi (path admin tidak berubah). Blok assert :29-38 dibungkus if(countBefore>0) sehingga hijau palsu — perketat
- frontend/e2e/gelombang2/akun.spec.ts — :37,:58,:70,:77 path /admin/akun* TIDAK berubah; hanya verifikasi ulang setelah sidebar admin menyusut jadi 4 item
- frontend/e2e/gelombang2/auth.spec.ts — :15 waitForURL('**/admin') tetap valid (item pertama grup ADMIN masih /admin); :17,:20 tombol menu user tidak terdampak
- frontend/e2e/gelombang2/menu-admin.spec.ts — :21 goto /admin; :24 label grup KURIKULUM; :27-29,:32 klik 'Jadwal KBM' -> **/kurikulum/jadwal (tetap valid); :37,:38 'Mata Pelajaran'/'Penugasan'. TAMBAHKAN assert 'Data Orang' & 'Kelas' kini berada di grup KURIKULUM, bukan ADMIN
- frontend/e2e/gelombang2/ux-polish-gel1.spec.ts — SPEC PALING TERDAMPAK. :80-118,:137 seluruh assert hub /admin/laporan GUGUR; :125 selektor hard-code nav a[href="/admin/presensi-siswa"] -> "/kesiswaan/presensi-siswa"; :132 nav a[href="/admin/presensi-guru"] -> "/tu/presensi-guru"; :143 klik #laporan-hub-admin-presensi-siswa GUGUR; :153,:160,:171,:191 /admin/orang/guru/1 -> /kurikulum/orang/guru/1; :21-40 & :54-66 assert sidebar admin diperbarui ke 4 item baru; PERTAHANKAN :45-52 (/kiosk), :68-74 (/admin/perangkat), :181-188 (/admin/wajah) yang menguji rute memang TIDAK ADA
- frontend/e2e/gelombang2/rbac-negatif.spec.ts — :51 goto('/'); :54,:55 assert label 'Daftar Guru'/'Pengaturan Akun' HIJAU PALSU (label asli 'Data Orang'/'Akun'); :58 goto('/admin/guru') bukan rute apa pun. TULIS ULANG: user kurikulum HARUS melihat 'Data Orang' & 'Kelas' (kini miliknya) dan HARUS DITOLAK di /admin/akun serta /admin/sekolah
- frontend/e2e/gelombang2/kesiswaan-frontend.spec.ts — :103-107 assert sidebar kesiswaan (kini 11 item), :130 getByRole link 'Pelanggaran'; path /kesiswaan/* dan /guru/pelanggaran TIDAK berubah
- frontend/e2e/gelombang2/kesiswaan-f5b.spec.ts — :103 assert sidebar kesiswaan diperbarui (Tindak Lanjut/Reward/Laporan Demerit + Presensi Siswa/Presensi Guru/Izin Guru); path TIDAK berubah
- frontend/e2e/gelombang2/kokurikuler-f6c.spec.ts — :123,:128 assert sidebar kurikulum & guru (kurikulum kini 10 item); semua path /kurikulum/kokurikuler*, /guru/kokurikuler*, /kokurikuler/rapor/* TIDAK berubah
- frontend/e2e/gelombang2/penilaian-f6a.spec.ts — :131 assert 'Sidebar guru menampilkan item Penilaian' padahal admin tidak mendapat grup GURU (menu.ts:111); perbaiki agar menguji isi halaman, bukan sidebar. Path /guru/penilaian* TIDAK berubah
- frontend/e2e/gelombang2/rapor-f6b.spec.ts — :85-92 komentar bahwa admin tidak dapat menu guru TETAP BENAR; path /guru/rapor* TIDAK berubah
- frontend/e2e/gelombang2/rapor-integrasi.spec.ts — path /guru/rapor* TIDAK berubah; hanya jalankan ulang sebagai regresi
- frontend/e2e/gelombang2/rekap-presensi.spec.ts — :157-175 fallback loginAsAdmin lalu /guru/rekap; TIDAK berubah (RequireRole ['guru','admin'] dipertahankan)
- frontend/e2e/gelombang2/jadwal-crud.spec.ts, jadwal-mobile.mobile.spec.ts, mapel-crud.spec.ts, penugasan-crud.spec.ts, multi-checkbox.spec.ts, wali-force.spec.ts — path /kurikulum/* TIDAK berubah; jalankan ulang sebagai regresi karena RequireRole kurikulum kini menaungi lebih banyak halaman
- frontend/e2e/gelombang2/ux-polish-be.spec.ts — 9 pemanggilan /api/admin/* menguji @Roles KETAT; WAJIB DISESUAIKAN karena banyak endpoint kini menerima peran tambahan (kurikulum untuk guru/siswa/kelas/TA/import/ekskul; tu untuk libur/pengaturan/presensi-guru/izin; kesiswaan untuk presensi-guru/izin/laporan)
- frontend/e2e/gelombang2/security.spec.ts — :24-35 daftar endpoint terlindungi + :73,:88,:92,:109,:114 uji body-limit & magic-byte upload; periksa apakah ada asersi 403 untuk peran yang kini diizinkan
- frontend/e2e/gelombang2/nits-bad-request.spec.ts — :30 afterAll masih memanggil /api/admin/device-kiosk/:id padahal modul kiosk DIHAPUS; bersihkan. :56,:68,:76 /api/tu/rekap-guru tetap valid
- frontend/e2e/gelombang2/laporan-backend.spec.ts, izin-guru-backend.spec.ts, rekap-tu-backend.spec.ts, presensi-wajah.spec.ts, presensi-siswa.spec.ts, ekskul-f6d-backend.spec.ts, kokurikuler-f6c-backend.spec.ts, penilaian-f6a-backend.spec.ts, rapor-f6b-backend.spec.ts, rapor-integrasi-backend.spec.ts, kesiswaan-f5a-backend.spec.ts, kesiswaan-f5b-backend.spec.ts, helpers/api.ts — path REST /api/admin/* TIDAK ikut migrasi IA, jadi tetap hijau; hanya perlu dijalankan ulang untuk memastikan pelonggaran @Roles tidak memecahkan asersi negatif
- frontend/playwright.config.ts — :25-39 proyek 'chromium' mengabaikan *.mobile.spec.ts dan 'mobile-chromium' hanya menjalankan *.mobile.spec.ts; setelah migrasi WAJIB menjalankan KEDUA proyek
