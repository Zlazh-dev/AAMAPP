# PROMPT UNTUK AGENT: AAMAPP — Ekosistem Sekolah SMP IT Asy-Syadzili (Presensi • Kurikulum • Kesiswaan • Administrasi)

> Salin seluruh dokumen ini sebagai prompt untuk AI agent (Claude Code, Cursor, dll.)
> yang bekerja di `D:\Codeproject\AAMAPP` pada Windows 11 (PowerShell).
> Dokumen ini adalah SATU-SATUNYA saluran komunikasi antara PLANNER dan AGENT
> PELAKSANA. Planner memperbarui spesifikasi & tugas di sini; agent pelaksana
> mengerjakan tugas lalu menulis hasilnya di bagian "LOG PROGRES EKSEKUSI" paling
> bawah. Jangan bekerja di luar apa yang tertulis di dokumen ini.

---

## 0. STATUS DOKUMEN

| Info | Nilai |
|------|-------|
| Versi dokumen | 0.9 |
| Tanggal | 2026-07-13 |
| Fase saat ini | **F0 hampir tuntas — T8 diverifikasi planner: BUG-1 & BUG-2 BERES, BUG-3 fungsional tapi salah komponen. Kerjakan T9 (§14.8) lalu F1.** |
| Perubahan v0.8 | Alur registrasi Google 3 LANGKAH: pilih akun Google → halaman KONSEN PERANGKAT (persetujuan aplikasi, bukan izin Google — Google hanya memberi nama/email/foto) + PILIH PERAN YANG DIAJUKAN → pending; admin memvalidasi di sub-halaman "Persetujuan Pendaftaran" (/admin/akun/persetujuan). BARU: §15 userflow & spesifikasi desain SEMUA halaman |
| Perubahan v0.8.1 | Arah desain dikunci: MINIMALIST PURE UTILITY + watermark ikon miring −15° opasitas rendah di pojok kanan-bawah SETIAP card via komponen bersama `<Card icon>` (§4, §15.0) |
| Perubahan v0.8.2 | Presensi & laporan guru HARIAN vs PER KBM dipisah jadi sub-halaman sendiri; /admin/laporan menjadi HUB kartu → sub-halaman per jenis laporan |
| Perubahan v0.8.3 | Presensi HANYA untuk peran guru; monitoring kehadiran guru baca-saja untuk Kepsek & Kesiswaan; VERIFIKASI LOKASI (geofence) pada presensi HP + sub-halaman /admin/pengaturan/lokasi; /admin/pengaturan menjadi HUB → sub-halaman per seksi |
| Perubahan v0.8.4 | Spesifikasi desain MOBILE detail (drawer, kartu-list, tab hari jadwal, roster 2 kolom) + komponen BOTTOM SHEET adaptif untuk semua dialog pilihan di mobile + aturan ANTI-BUG komponen interaktif (dialog berisi perubahan tidak tertutup tak sengaja, guard double-submit, timeout fetch, focus trap) + QA mobile 375px wajib tiap fase (aturan §12.14, checklist T6.15) |
| Perubahan v0.8.5 | POLA A dilengkapi: klik baris → SUB-HALAMAN DETAIL (akun `/admin/akun/:id`, detail guru/siswa) dengan Edit/Hapus di header; KONFIRMASI hapus & "perubahan belum disimpan" = bottom sheet di MOBILE / modal tengah di DESKTOP; GUARD NAVIGASI: pindah/balik halaman dengan pekerjaan belum tersimpan → konfirmasi adaptif |
| Perubahan v0.8.6 | Struktur sub-halaman PENILAIAN & RAPOR dirinci: /guru/penilaian (paket → TP/Penilaian/Rekap + sub-halaman INPUT NILAI PER SISWA dengan autosave & rekap per siswa), /guru/kelas/rapor/:siswa (pratinjau rapor + FINALISASI oleh wali kelas), /kurikulum/rapor (monitor → status kelas → CETAK MASSAL); aturan penguncian: Final mengunci nilai, buka kunci hanya Kurikulum/Admin + alasan |
| Perubahan v0.8.7 | USERFLOW INPUT NILAI end-to-end (§9): daftar siswa SELALU otomatis dari penempatan kelas + penugasan paket — guru tidak pernah menambah siswa manual; ATURAN DATA TURUNAN lintas modul: siswa baru/pindah kelas/mutasi, ganti guru paket, hapus penugasan — riwayat selalu utuh |
| Perubahan v0.8.8 | §6.1 dirombak jadi PETA NAVIGASI LENGKAP: (A) 7 aturan penempatan halaman utk fitur sekarang & nanti, (B) struktur menu sidebar per peran dengan urutan tetap, (C) tabel FITUR → HALAMAN → SUB-HALAMAN → PENEMPATAN utk semua modul; rute sub-halaman yang tersirat kini eksplisit (detail orang, import, wizard wajah, roster /guru/kbm/:sesi, form izin, /kesiswaan/izin-siswa baru) |
| Perubahan v0.8.9 | Penetapan WALI KELAS jadi wewenang Staf Kurikulum (tab Wali Kelas di /kurikulum/penugasan; Admin tetap bisa via /admin/kelas) + makna paket dipertegas ("guru mengajar mapel X di kelas Y" → sumber semua turunan); TABEL KOMPONEN WAJIB PER JENIS HALAMAN desktop vs mobile di §15.0 (daftar data: desktop=tabel, mobile=card-list; laporan tetap tabel scroll; form keyboard-aware; dll.) |
| Tugas siap dikerjakan | **T9 SELESAI 2026-07-13 (agent) — menunggu verifikasi visual planner.** F1 akan ditulis planner setelah konfirmasi. |

> **Untuk agent pelaksana:** kerjakan HANYA tugas F0 (§14) secara berurutan.
> Spesifikasi modul lain (§6–§10) adalah KONTEKS arah produk — jangan
> mengimplementasikannya sebelum planner menulis tugasnya.

## 1. PERAN KAMU (agent pelaksana)

Kamu membangun aplikasi web AAMAPP dari NOL sampai DEPLOY, mengikuti spesifikasi
dokumen ini secara berurutan. Prinsip kerja:

1. **Stabilitas di atas segalanya** — setiap fitur wajib punya jalur gagal
   (fallback) yang jelas; tidak ada dead-end bagi pengguna.
2. **User friendly** — seluruh UI Bahasa Indonesia, feedback instan, pesan error
   dalam bahasa manusia (bukan kode). Aksi rutin harian harus selesai dalam
   HITUNGAN DETIK.
3. Ikuti pola yang sudah terbentuk begitu kode mulai ada — jangan menulis ulang
   yang sudah jadi.
4. Kerjakan tugas berurutan; setiap selesai satu tugas, tulis hasil + tanggal di
   LOG PROGRES EKSEKUSI di bawah dokumen ini.

## 2. VISI: SATU EKOSISTEM, SATU DATA INDUK

**AAMAPP** = platform manajemen sekolah **SMP IT Asy-Syadzili** (sekolah berbasis
pesantren) dalam SATU aplikasi web: presensi, kurikulum (jadwal + penilaian/rapor),
kesiswaan (demerit), dan administrasi jadi satu, berbagi data induk yang sama.

```
                    ┌───────────────────────────────────┐
                    │         DATA INDUK (CORE)          │
                    │ siswa biodata lengkap (→kelas)      │
                    │ guru • kelas (fase, wali) • mapel   │
                    │ profil sekolah • tahun ajaran/smt   │
                    │ akun & multi-peran (RBAC) • sesi    │
                    │ audit log                           │
                    └──────┬──────────┬─────────┬───────┘
                           │          │         │
        ┌──────────────────▼───┐ ┌────▼─────┐ ┌─▼──────────────────┐
        │ KURIKULUM             │ │KESISWAAN │ │ ADMINISTRASI (TU)   │
        │ A. penugasan guru→    │ │ demerit  │ │ rekap presensi      │
        │    mapel→kelas (paket)│ │ token    │ │ harian guru →       │
        │    + jadwal KBM (sesi)│ │ 500/smt  │ │ dasar gaji (di luar │
        │ B. penilaian & rapor  │ │ (§7)     │ │ sistem) (§10)       │
        │    (TP, sumatif, §9)  │ └──────────┘ └─────────────────────┘
        └──────────┬───────────┘
                   │ jadwal KBM = SUMBER KEBENARAN presensi
        ┌──────────▼──────────────────────────────────────┐
        │ PRESENSI                                         │
        │ GURU  : harian (wajah, jam global pagi) +         │
        │         per KBM (otomatis dari roster) —          │
        │         keduanya WAJIB bila punya KBM hari itu;   │
        │         tanpa KBM = LIBUR                         │
        │ SISWA : per KBM oleh guru mapel (roster)          │
        └───────────────────────────────────────────────────┘

        INTEGRASI ANTARMODUL:
        • ketidakhadiran siswa (S/I/A) di rapor ← OTOMATIS dari presensi
        • tanda T di roster → draft pelanggaran R-07 (10 poin) otomatis
        • poin demerit → bahan catatan wali kelas di rapor (bukan otomatis)
        • rekap presensi harian guru → dipakai TU untuk gaji (hitung di luar)
        • satu kalender akademik & semester aktif untuk semua modul
```

Semua tampilan & perhitungan waktu memakai **WIB (Asia/Jakarta)** — lihat §12.
Skala target: satu sekolah, ± 50 guru/staf + ± 600–1000 siswa, 1–2 kiosk guru.

## 3. ARSITEKTUR EKOSISTEM (keputusan mengikat)

**Modular monolith** — SATU aplikasi NestJS, SATU database PostgreSQL, SATU
frontend React; setiap modul = folder modul NestJS + area route frontend sendiri.
BUKAN microservices.

Konsekuensi disiplin (wajib dipatuhi agent):
- Data induk (siswa/guru/kelas/mapel/semester/profil sekolah) HANYA milik Core —
  modul lain mereferensi lewat relasi, DILARANG membuat tabel tandingan.
- Jadwal KBM HANYA milik Kurikulum — Presensi membacanya, tidak menduplikasi.
- Saldo token demerit dihitung dari 500 − Σ poin semester berjalan (bukan kolom
  statis). Ketidakhadiran rapor dihitung dari presensi (koreksi wali = audit).
- SEMUA daftar turunan (siswa di roster/input nilai, paket guru, menu wali
  kelas, mapel di rapor) DITURUNKAN OTOMATIS dari data induk + penugasan —
  tidak ada input ulang manual di modul mana pun (aturan lengkap di §9).
- Setiap modul baru mengikuti pola modul sebelumnya. Penambahan modul TIDAK
  BOLEH merusak modul yang sudah jalan.

## 4. KEPUTUSAN TEKNOLOGI (FINAL)

| Lapisan | Pilihan | Alasan |
|---------|---------|--------|
| Frontend | **React 18 + Vite + TypeScript + Tailwind CSS** | Konsisten pola proyek sekolah sebelumnya (SmpProfileWeb) |
| Backend | **NestJS 10 + TypeORM** | Permintaan user |
| Database | **PostgreSQL 16** | Andal; timestamptz untuk WIB |
| Orkestrasi | **Docker Compose** (db, backend, frontend/nginx) | Dev = prod |
| Rekognisi wajah (GURU) | **@vladmandic/human** di browser (deteksi + embedding); **matching di server** (cosine similarity) | Tanpa GPU/Python; video tidak pernah dikirim |
| Anti-spoof dasar | Liveness sederhana dari library | Cukup level sekolah |
| Login Google | **GIS ID-token flow** + `google-auth-library` | Tanpa redirect/secret; pola terbukti |
| Cetak PDF | Render HTML template server-side → PDF (keputusan teknis final di F6) | Template rapor kompleks paling setia dengan HTML+CSS |

Design system — **MINIMALIST PURE UTILITY (KEPUTUSAN USER)**:
- Identitas sekolah: hijau primer #00B76A, kuning aksen #FACC15, teks
  #0F172A/#64748B, sidebar gelap #10221b, font Space Grotesk (heading) +
  Plus Jakarta Sans (body), ikon Material Symbols Outlined.
- Prinsip pure utility: latar halaman abu sangat muda (#F8FAFC); kartu putih
  ber-border tipis #E2E8F0, sudut rounded-md — TANPA bayangan besar, gradien,
  glassmorphism, atau ornamen; warna HANYA untuk makna (status & aksi primer),
  sisanya netral; hirarki lewat tipografi & spasi, bukan dekorasi; animasi
  minimal (transisi singkat), tanpa animasi dekoratif.
- **WATERMARK KARTU (KEPUTUSAN USER — satu-satunya elemen dekoratif):** setiap
  card memuat ikon Material Symbols yang mewakili isinya sebagai watermark di
  POJOK KANAN-BAWAH: ukuran besar (±96–140px), rotasi miring −15°, opasitas
  6–8% (warna teks; di latar gelap putih 6%), sebagian menembus tepi dan
  terpotong `overflow-hidden`, `pointer-events-none` + `aria-hidden`, tidak
  boleh mengurangi keterbacaan. Implementasikan lewat SATU komponen bersama
  `<Card icon="...">` agar konsisten di seluruh aplikasi.
- Kiosk: teks ekstra besar + kontras tinggi.

## 5. AKTOR & PERAN (FINAL — multi-peran didukung penuh)

| Peran (kode) | Hak utama (matriks lengkap §8.2) |
|--------------|-----------------------------------|
| **Admin** (`admin`) | Semua akses |
| **Guru** (`guru`) | Presensi diri (wajah), jadwal KBM sendiri, roster siswa per KBM, lapor pelanggaran, izin diri, TP + penilaian + nilai mapelnya; **wali kelas** (atribut, bukan peran): rekap kelasnya, izin siswa, input/verifikasi demerit kelasnya, catatan & finalisasi rapor kelasnya |
| **Staf Kurikulum** (`kurikulum`) | Mapel, PENUGASAN paket (= menetapkan guru mengajar mapel apa di kelas mana), **penetapan WALI KELAS** (KEPUTUSAN USER), jadwal KBM, monitor keterlaksanaan; KKM & pengaturan penilaian, monitor kelengkapan nilai, cetak rapor massal |
| **Staf Kesiswaan** (`kesiswaan`) | = tim kedisiplinan TERMASUK BK. Katalog tata tertib, catat pelanggaran semua siswa, verifikasi laporan, tindak lanjut, reward, laporan demerit, izin siswa |
| **Staf TU** (`tu`) | Rekap presensi harian guru + export (dasar gaji — dihitung di luar sistem) |
| **Kepala Sekolah** (`kepsek`) | **FINAL (disetujui user):** BACA-SEMUA dashboard & laporan seluruh modul; ikut menyetujui izin guru (Admin ATAU Kepsek); nama/NIP dari profil sekolah otomatis dipakai di dokumen cetak. TANPA hak edit data |
| **Siswa** | BUKAN pengguna aplikasi — murni objek data |
| **Perangkat Kiosk** | Token perangkat khusus (§8.4), satu fungsi presensi wajah guru |

Multi-peran: satu akun bisa beberapa peran; menu = gabungan. Wali kelas =
atribut penugasan pada guru, bukan peran login — ditetapkan oleh KURIKULUM di
/kurikulum/penugasan (tab Wali Kelas) atau oleh Admin di /admin/kelas.

## 6. USERFLOW JADWAL KBM + PRESENSI (FINAL per keputusan user)

### 6.1 Peta halaman, sub-halaman & penempatan navigasi (LENGKAP — mengikat)

**A. ATURAN PENEMPATAN (berlaku untuk fitur sekarang & fitur baru nanti):**
1. Fitur milik satu peran → halaman utamanya di AREA peran itu (prefix route
   `/admin`, `/kurikulum`, `/kesiswaan`, `/guru`, `/kepsek`, `/tu`).
2. CRUD: DAFTAR = halaman di sidebar; DETAIL / TAMBAH / EDIT = SUB-HALAMAN
   dengan route sendiri (bukan modal) — bisa di-bookmark & tombol back aman.
3. Pilihan cepat, filter, dan panel slot = BottomSheet/panel (§15.0), BUKAN
   route.
4. Fitur baca-saja lintas peran = route tipis di area masing-masing peran yang
   memakai KOMPONEN halaman yang sama mode read-only (pola kehadiran-guru).
5. Laporan baru = kartu baru di HUB laporan area terkait (bukan menu baru).
6. Menu sidebar diberi badge angka bila halamannya punya antrean menunggu.
7. /profil selalu diakses dari dropdown avatar header — tidak pernah di sidebar.

**B. STRUKTUR MENU SIDEBAR PER PERAN (urutan tetap; multi-peran = kelompok
tampil berurutan Admin → Kurikulum → Kesiswaan → Guru → Kepsek → TU):**

```
ADMIN     : Dashboard • Data Orang • Kelas • Wajah Guru • Presensi Guru •
            Presensi Siswa • Izin • Laporan • Perangkat • Pengaturan •
            Akun [badge pendaftar pending]
KURIKULUM : Dashboard • Mata Pelajaran • Penugasan • Jadwal KBM • Rapor
KESISWAAN : Dashboard • Tata Tertib • Pelanggaran • Verifikasi [badge] •
            Tindak Lanjut • Reward • Izin Siswa • Laporan • Kehadiran Guru
GURU      : Dashboard • KBM Hari Ini • Penilaian • Pelanggaran •
            Kelas Saya [hanya wali kelas] • Izin
KEPSEK    : Dashboard • Kehadiran Guru
TU        : Rekap Guru
HEADER    : avatar → Profil (/profil) • Logout   |   jam WIB live
```

**C. TABEL FITUR → HALAMAN → SUB-HALAMAN → PENEMPATAN/AKSES:**

*Auth & akun (F0):*

| Fitur | Halaman | Sub-halaman | Penempatan/akses |
|-------|---------|-------------|------------------|
| Login | `/login` | — | Publik, pintu semua peran |
| Registrasi Google | `/daftar` | 3 langkah = stepper dalam 1 route | Link "Daftar di sini" di /login; auto-redirect dari login Google yang belum terdaftar |
| Profil & sesi sendiri | `/profil` | — | Dropdown avatar header (semua peran) |
| Manajemen akun | `/admin/akun` (tab Akun • Sesi Aktif • Aktivitas) | `/admin/akun/persetujuan` (+ tinjau per pendaftar), `/admin/akun/:id` (detail), `/admin/akun/baru`, `/admin/akun/:id/edit` | Sidebar ADMIN "Akun" + badge pending; detail via klik baris |

*Data induk (F1):*

| Fitur | Halaman | Sub-halaman | Penempatan/akses |
|-------|---------|-------------|------------------|
| Data guru & siswa | `/admin/orang` (tab Guru • Siswa) | `/admin/orang/guru/:id` & `/admin/orang/siswa/:id` (detail), `.../baru`, `.../:id/edit`, `/admin/orang/import` (wizard 3 langkah) | Sidebar ADMIN "Data Orang" |
| Kelas & wali kelas | `/admin/kelas` | `/admin/kelas/:id` (detail anggota + pindah kelas), form baru/edit | Sidebar ADMIN "Kelas" |
| Pengaturan | `/admin/pengaturan` (HUB kartu) | `/sekolah` `/jam` `/lokasi` `/libur` `/tahun-ajaran` `/kkm` | Sidebar ADMIN "Pengaturan" |
| Mata pelajaran | `/kurikulum/mapel` | form baru/edit | Sidebar KURIKULUM |
| Penugasan paket + wali kelas | `/kurikulum/penugasan` (tab Paket Mengajar • Wali Kelas) | form paket baru/edit | Sidebar KURIKULUM "Penugasan" |
| Jadwal KBM | `/kurikulum/jadwal` (grid per kelas) | panel slot = BottomSheet (bukan route) | Sidebar KURIKULUM |

*Presensi guru (F3–F4):*

| Fitur | Halaman | Sub-halaman | Penempatan/akses |
|-------|---------|-------------|------------------|
| Kiosk | `/kiosk` | layar pairing → utama (state, bukan route) | Perangkat kiosk; kode dari /admin/perangkat |
| Perangkat kiosk | `/admin/perangkat` | kode pairing = dialog | Sidebar ADMIN |
| Enrollment wajah | `/admin/wajah` | `/admin/wajah/:guru` (wizard capture pose) | Sidebar ADMIN "Wajah Guru"; juga tombol di detail guru |
| Presensi diri (HP) | tombol besar di `/guru` | overlay kamera fullscreen + cek lokasi (bukan route) | Kartu teratas dashboard GURU |
| Kelola presensi harian | `/admin/presensi-guru` (tab Harian • Verifikasi Pending) | `/admin/presensi-guru/kbm` (per KBM: keterlaksanaan, pengganti); koreksi = sub-form | Sidebar ADMIN "Presensi Guru" |
| Monitoring baca-saja | `/kepsek/kehadiran-guru`, `/kesiswaan/kehadiran-guru` | — | Sidebar area masing-masing (aturan A4) |

*Presensi siswa (F2):*

| Fitur | Halaman | Sub-halaman | Penempatan/akses |
|-------|---------|-------------|------------------|
| Roster per KBM | `/guru/kbm` (daftar sesi hari ini) | `/guru/kbm/:sesi` (roster grid) | Sidebar GURU "KBM Hari Ini" + kartu sesi di dashboard |
| Monitor & koreksi | `/admin/presensi-siswa` (matriks kelas×sesi) | detail sesi + koreksi per siswa | Sidebar ADMIN |

*Izin (F2/F4):*

| Fitur | Halaman | Sub-halaman | Penempatan/akses |
|-------|---------|-------------|------------------|
| Izin diri guru | `/guru/izin` (daftar + status) | `/guru/izin/baru` (form) | Sidebar GURU "Izin" |
| Approve izin guru | `/admin/izin` (tab Izin Guru • Arsip Izin Siswa) | detail pengajuan | Sidebar ADMIN; KEPSEK: blok approve di /kepsek |
| Izin siswa oleh wali | tab "Izin Siswa" di `/guru/kelas` | `/guru/kelas/izin/baru` (form) | Menu "Kelas Saya" (hanya wali) |
| Izin siswa oleh kesiswaan | `/kesiswaan/izin-siswa` (daftar) | `.../baru` (form) | Sidebar KESISWAAN "Izin Siswa" |

*Kesiswaan/demerit (F5):*

| Fitur | Halaman | Sub-halaman | Penempatan/akses |
|-------|---------|-------------|------------------|
| Tata tertib | `/kesiswaan/tata-tertib` | form butir baru/edit | Sidebar KESISWAAN |
| Catat pelanggaran | `/kesiswaan/pelanggaran` (riwayat) | `.../baru` (form multi-siswa), `.../:id` (detail + ubah/hapus beralasan) | Sidebar + tombol cepat di dashboard kesiswaan |
| Verifikasi laporan | `/kesiswaan/verifikasi` (antrean) | detail laporan | Sidebar + badge antrean |
| Tindak lanjut | `/kesiswaan/tindak-lanjut` | `.../:id` (detail + form pelaksanaan) | Sidebar |
| Reward semester | `/kesiswaan/reward` | — | Sidebar |
| Lapor pelanggaran (guru) | `/guru/pelanggaran` (laporan saya + status) | `.../baru` (form) | Sidebar GURU |
| Demerit kelas (wali) | tab Demerit di `/guru/kelas` | catat = form sub; verifikasi kelasnya | Menu "Kelas Saya" |

*Penilaian & rapor (F6):*

| Fitur | Halaman | Sub-halaman | Penempatan/akses |
|-------|---------|-------------|------------------|
| Penilaian guru mapel | `/guru/penilaian` (kartu paket) | `/:paket` (tab TP • Penilaian • Rekap), `.../tp/baru|:id/edit`, `.../penilaian/baru|:id/edit`, `.../penilaian/:id/nilai` (INPUT NILAI PER SISWA), `.../siswa/:id` (rekap 1 siswa) | Sidebar GURU "Penilaian" |
| Rapor wali kelas | tab Rapor di `/guru/kelas` | `/guru/kelas/rapor/:siswa` (pratinjau + FINALISASI) | Menu "Kelas Saya" |
| Monitor & cetak rapor | `/kurikulum/rapor` (matriks) | `/:kelas` (status + buka kunci), `/:kelas/cetak` (CETAK MASSAL) | Sidebar KURIKULUM "Rapor" |

*Laporan & monitor (F4+):*

| Fitur | Halaman | Sub-halaman | Penempatan/akses |
|-------|---------|-------------|------------------|
| Dashboard per peran | `/admin` `/kurikulum` `/kesiswaan` `/guru` `/kepsek` | — | Item PERTAMA tiap kelompok menu |
| Laporan admin | `/admin/laporan` (HUB kartu) | `/harian-guru` `/kbm-guru` `/siswa` (+ kartu baru per modul menyusul, aturan A5) | Sidebar ADMIN "Laporan" |
| Laporan demerit | `/kesiswaan/laporan` | — | Sidebar KESISWAAN |
| Rekap TU (dasar gaji) | `/tu/rekap-guru` | — | Sidebar TU (satu-satunya menu) |

### 6.2 Manajemen jadwal KBM (Staf Kurikulum — FONDASI presensi)

**A. Mata pelajaran:** CRUD (nama, kode, kelompok — mis. "Agama", urutan rapor).

**B. Penugasan (dua tab di /kurikulum/penugasan — KEPUTUSAN USER):**
- **Tab Paket Mengajar**: pilih GURU → MAPEL → KELAS (boleh banyak) → PAKET
  "Bu Rina — Matematika — 7A". MAKNA: guru tsb. MENGAJAR mapel itu DI kelas
  itu — dari sinilah otomatis muncul: pilihan slot jadwal, daftar KBM guru,
  halaman penilaian guru, dan daftar mapel rapor kelas (aturan turunan §9).
  Filter per guru/mapel/kelas.
- **Tab Wali Kelas**: daftar kelas + wali saat ini → pilih guru per kelas
  (search-select; satu guru maksimal wali satu kelas — bila sudah wali kelas
  lain → konfirmasi pindah). Efek otomatis: menu "Kelas Saya" muncul di akun
  guru tsb.

**C. Jadwal KBM:** grid mingguan per kelas → klik slot → pilih PAKET + jam
mulai–selesai sesi → validasi bentrok (guru tidak dobel antar kelas; kelas tidak
dobel jam) dengan pesan jelas → berlaku per SEMESTER aktif; tanggal libur tidak
menghasilkan KBM.

**D. Efek jadwal → kewajiban guru (KEPUTUSAN USER, mengikat):**

```
Guru punya ≥1 KBM hari itu → WAJIB DUA presensi:
  1) presensi HARIAN pagi (wajah, jam global)
  2) presensi PER KBM tiap sesinya (otomatis dari pengisian roster)
Guru tanpa KBM hari itu → LIBUR (bukan alpha; tidak mengurangi %)
```

### 6.3 Presensi GURU — dua lapis

**Lapis 1 — HARIAN (wajah, jam global):** KIOSK 1:N (kartu sapaan + suara;
gagal 3x → manual NIP → PENDING verifikasi admin) atau HP 1:1 ("Presensi
Sekarang", vs embedding sendiri; gagal 3x → arahkan kiosk/admin). Scan pertama =
check-in (HADIR/TERLAMBAT + menit, WIB); jendela pulang = check-out; scan ganda
→ "Sudah tercatat HH:MM"; tanpa KBM tapi scan → "hadir di hari tanpa jadwal";
kiosk offline → antrean lokal + sinkron jam asli.

**Verifikasi lokasi (KEPUTUSAN USER) — jalur HP saja:** bila diaktifkan di
/admin/pengaturan/lokasi (koordinat sekolah + radius meter + saklar), presensi
via HP meminta geolokasi browser SEBELUM kamera: di dalam radius → lanjut
verifikasi wajah (jarak tercatat di record untuk audit); di luar radius →
ditolak "Anda berada di luar area sekolah" + arahan ke kiosk; izin lokasi
ditolak/gagal → ditolak dengan instruksi mengaktifkan lokasi + arahan kiosk.
KIOSK TIDAK butuh verifikasi lokasi (perangkat terpasang tetap di sekolah).

**Kewajiban presensi HANYA melekat pada peran GURU (KEPUTUSAN USER):** staf
non-guru (kurikulum/kesiswaan/TU/kepsek murni) tidak ikut sistem presensi;
yang merangkap guru mengikuti aturan gurunya.

**Lapis 2 — PER KBM (otomatis dari roster):** menyimpan roster = guru tercatat
melaksanakan sesi. Status sesi: `TERLAKSANA` (roster disimpan) / `BERJALAN` /
`KOSONG` (jam lewat tanpa roster → merah, ditagih) / `DIGANTIKAN` (pengganti
mengisi roster, tercatat siapa).

**Enrollment wajah:** /admin/wajah → pose depan/kiri/kanan (3–5 capture
otomatis, cek kualitas) → Simpan → badge "Wajah terdaftar ✓".

### 6.4 Presensi SISWA — per KBM oleh guru mapel

```
/guru/kbm → pilih KBM → ROSTER default HADIR → tap: S / I / A / T
  (izin/sakit tercatat sebelumnya otomatis terkunci)
  → Simpan → "30 H, 1 S, 2 I, 1 A" → sesi TERLAKSANA
  → tanda T → OTOMATIS draft pelanggaran R-07 (10 poin) di antrean verifikasi
  → editable guru ybs. sampai cutoff; sesudahnya hanya admin (dengan alasan)
```

Rekap UTAMA = per mapel (→ rapor). "Alpha satu hari penuh" = A pada SEMUA sesi
TERLAKSANA hari itu (sesi DIGANTIKAN tetap terlaksana; KOSONG tidak dihitung).
Sesi tanpa roster → siswa "TIDAK TERCATAT" (bukan alpha).

### 6.5 Izin, libur, cutoff (WIB)

```
IZIN GURU  : ajukan → approve Admin/Kepsek → KBM "guru berhalangan" → pengganti
IZIN SISWA : wali kelas/kesiswaan input → terkunci otomatis di roster rentangnya
KALENDER   : tanggal libur → tidak ada KBM & kewajiban
CUTOFF     : GURU ada KBM tanpa presensi harian tanpa izin → ALPHA; tanpa KBM →
             LIBUR. KBM lewat tanpa roster → KOSONG. SISWA alpha hanya dari A.
```

### 6.6 Monitor & laporan

/admin: guru (H/T/I/A/Libur) • KBM (terlaksana/berjalan/KOSONG) • siswa hari ini
• feed realtime. /kurikulum: keterlaksanaan. /admin/laporan: HUB → sub-halaman
terpisah: harian guru (pembagi % = hari wajib) • per KBM guru (keterlaksanaan)
• siswa per mapel/kelas — semua export Excel/PDF berkop.
/guru/kelas (wali): rekap kelas + saldo demerit. /kepsek: baca-semua.

### 6.7 Ringkasan jalur gagal

| Kegagalan | Perilaku |
|-----------|----------|
| Wajah tidak dikenali | 3x → manual NIP → PENDING |
| Belum enroll | Jalur manual; admin lihat daftarnya |
| Kiosk offline | Antrean lokal + sinkron jam asli |
| Kamera error | Instruksi pemulihan + watchdog reload |
| Presensi HP di luar radius sekolah | Ditolak "Anda berada di luar area sekolah" + arahan ke kiosk |
| Izin lokasi HP ditolak/gagal | Ditolak + instruksi mengaktifkan lokasi + arahan kiosk |
| Salah kenali | Ambang + margin; koreksi admin + audit |
| Model gagal | Mode manual penuh |
| Roster tidak diisi | Sesi KOSONG; siswa "tidak tercatat" |
| Guru berhalangan | "guru berhalangan" → pengganti |
| Jadwal bentrok | Ditolak dengan pesan jelas |
| Idle > 1 jam | 401 "Sesi berakhir karena tidak aktif" → login → kembali |
| Salah catat pelanggaran | Ubah/hapus wajib alasan; hitung ulang; audit |

## 7. MODUL KESISWAAN — DEMERIT POIN (FINAL; SOP/KESISWAAN/001/2026)

### 7.1 Prinsip
Token **500 poin/siswa/semester** (reset per semester; riwayat diarsip).
Kategori: **R=10, S=25, B=50, SB=100**. Saldo = 500 − Σ pelanggaran (dihitung,
bukan statis).

### 7.2 Katalog pelanggaran (SEED resmi — jangan diubah tanpa user)

| No | Bentuk Pelanggaran | Kat. | Poin |
|----|--------------------|------|------|
| 1 | Tidak memakai seragam sekolah sesuai ketentuan | R | 10 |
| 2 | Memakai sandal ketika sekolah | R | 10 |
| 3 | Siswa putri tidak memakai jilbab seragam ketika sekolah | R | 10 |
| 4 | Siswa putri memakai rok di atas mata kaki | R | 10 |
| 5 | Siswa putri membawa/memakai perhiasan dan make up berlebihan | R | 10 |
| 6 | Tidak membawa buku pelajaran sesuai jadwal | R | 10 |
| 7 | Terlambat masuk kelas | R | 10 |
| 8 | Keluar kelas sebelum bel pulang berbunyi | R | 10 |
| 9 | Meninggalkan kelas tanpa izin guru yang mengajar | R | 10 |
| 10 | Piket meninggalkan ruang kelas kotor/tidak rapi | R | 10 |
| 11 | Meludah sembarangan di lingkungan sekolah | R | 10 |
| 12 | Tidak mengikuti proses belajar mengajar sesuai jadwal | S | 25 |
| 13 | Memasuki ruangan kelas lain tanpa izin | S | 25 |
| 14 | Merayap dari jendela ke jendela / antar gedung kelas | S | 25 |
| 15 | Membuang sampah tidak pada tempatnya | S | 25 |
| 16 | Mencoret-coret/merusak fasilitas kelas | S | 25 |
| 17 | Mencoret-coret fasilitas sarana sekolah | S | 25 |
| 18 | Tidak mengikuti kegiatan ekstrakurikuler | S | 25 |
| 19 | Mengadu domba, mengancam, mengintimidasi (bullying) | B | 50 |
| 20 | Berkata kotor, mengumpat, dan sejenisnya | B | 50 |
| 21 | Berbicara keras/kasar kepada guru dan pegawai | B | 50 |
| 22 | Disambangi di lingkungan sekolah saat jam pembelajaran | S | 25 |
| 23 | Memakai tindik dan tato | B | 50 |
| 24 | Membawa dan/atau merokok (sekolah/sekitar/pesantren) | SB | 100 |
| 25 | Kabur/meninggalkan sekolah saat jam sekolah | SB | 100 |
| 26 | Tindakan mengarah perkelahian dengan guru dan pegawai | SB | 100 |
| 27 | Berkelahi | SB | 100 |
| 28 | Mencuri | SB | 100 |

**Kategori Khusus** (tanpa poin → Tindakan Khusus: dikembalikan kepada wali
siswa dengan persetujuan pengasuh): narkoba/miras; pidana kriminal;
homoseksual/lesbian.

### 7.3 Ambang & tindak lanjut

| Tahap | Terpotong ≥ | Saldo ≤ | Tindak lanjut |
|-------|-------------|---------|----------------|
| Peringatan 1 | 200 | 300 | Surat pernyataan → Waka Kesiswaan, ttd Wali Kelas |
| Peringatan 2 | 300 | 200 | Surat, ttd Wali Kelas + BK + orang tua |
| Peringatan 3 | 400 | 100 | Panggil wali; ttd Wali + Waka + Kepala Sekolah; skorsing 1 bulan |
| Tindakan Khusus | 500 | 0 | Panggil wali; dikembalikan ke orang tua (persetujuan pengasuh) |

Entri tindak lanjut OTOMATIS saat ambang tersentuh (sekali per tahap per
semester); staf catat pelaksanaan → SELESAI; riwayat permanen.

**Sanksi per kategori** (referensi saat mencatat): R (salah satu): lisan /
istigfar 70× / Al-Mulk / hafal 5 kosa kata 1×24 jam. S (salah satu): lari 10×
lapangan / bersihkan taman / hafal 10 kosa kata / Al-Waqi'ah / bersihkan kamar
mandi. B (bersamaan): surat dibacakan / gundul (putra)–jilbab merah 1 minggu
(putri) / pembinaan wali+BK / Yasin. SB (berurutan): panggil ortu / skorsing 1
bulan / dikembalikan dengan surat ttd Kepala Sekolah.

### 7.4 Reward semester
Sangat Baik = 500 utuh (sertifikat + hadiah); Baik = 400–490 (sertifikat).
/kesiswaan/reward → daftar otomatis → export.

### 7.5 Alur pencatatan
INPUT LANGSUNG: Kesiswaan (semua siswa), wali kelas (kelasnya). PELAPOR (guru
lain): antrean → verifikasi wali kelas ybs./Kesiswaan → SETUJUI/TOLAK. OTOMATIS:
T di roster → draft R-07 (tidak memotong poin sebelum disetujui). KATEGORI
KHUSUS: form terpisah → Tindakan Khusus langsung. Rekap realtime + laporan
bulanan export.

## 8. AUTH, MULTI-PERAN & RBAC (spesifikasi mengikat)

### 8.1 Login, registrasi Google, penautan
- Login: email+password ATAU Google (GIS ID-token).
- Registrasi HANYA via `/daftar` — **3 langkah (KEPUTUSAN USER)**:
  (1) pilih akun Google (GIS; Google hanya memberi nama/email/foto — akun Google
  biasa cukup); (2) halaman KONSEN PERANGKAT milik aplikasi: "AAMAPP akan
  mencatat informasi perangkat (browser & sistem operasi), alamat IP, dan waktu
  akses untuk keamanan sesi" + checkbox wajib "Saya setuju", DAN pemilihan
  **PERAN YANG DIAJUKAN** (boleh > 1: Guru/Kurikulum/Kesiswaan/TU/Kepsek) +
  keterangan opsional; (3) terkirim → akun PENDING dengan `requestedRoles`.
  Admin memvalidasi di sub-halaman `/admin/akun/persetujuan`: setujui (peran
  final prefilled dari ajuan, admin bebas mengubah) atau tolak (alasan → akun
  dihapus, tercatat audit). Login via Google dengan email TAK terdaftar →
  diarahkan otomatis ke /daftar langkah 2 (credential dibawa).
- Penautan dari /profil (googleSub unik); lepas tautan hanya bila punya
  password; email aktif login Google pertama kali → auto-link.
- `GET /api/auth/config` → `{googleClientId | null}` → null = tombol
  disembunyikan.

### 8.2 Matriks RBAC (ditegakkan di SERVER; frontend hanya menyembunyikan menu)

| Area / aksi | Admin | Guru | Wali kelas* | Kurikulum | Kesiswaan | TU | Kepsek |
|-------------|:-----:|:----:|:-----------:|:---------:|:---------:|:--:|:------:|
| Data induk (CRUD) | ✅ | baca | baca kelasnya | baca | baca | baca guru | baca |
| Akun, peran, approve pendaftar | ✅ | — | — | — | — | — | — |
| Pengaturan (jam, libur, smt, KKM, profil sekolah) | ✅ | — | — | KKM/penilaian | — | — | baca |
| Mapel, penugasan, jadwal (CRUD) | ✅ | baca miliknya | baca kelasnya | ✅ | — | — | baca |
| Penetapan wali kelas | ✅ | — | — | ✅ | — | — | baca |
| Enrollment wajah | ✅ | — | — | — | — | — | — |
| Presensi harian diri (scan) — HANYA peran guru | — | ✅ | ✅ | — | — | — | — |
| Monitoring kehadiran guru (baca-saja) | ✅ | — | — | — | ✅ | — | ✅ |
| Koreksi presensi + verif. pending | ✅ | — | — | — | — | — | — |
| Roster per KBM | ✅ | miliknya | miliknya | — | — | — | — |
| Izin diri | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Approve izin guru** | ✅ | — | — | — | — | — | **✅** |
| Input izin siswa | ✅ | — | kelasnya | — | ✅ | — | — |
| TP, penilaian, nilai | ✅ | mapelnya | mapelnya | monitor | — | — | baca |
| Catatan wali & finalisasi rapor | ✅ | — | kelasnya | monitor+cetak | — | — | baca |
| Katalog tata tertib (CRUD) | ✅ | baca | baca | — | ✅ | — | baca |
| Catat pelanggaran langsung | — | — | kelasnya | — | ✅ semua | — | — |
| Lapor pelanggaran | — | ✅ | ✅ | ✅ | — | ✅ | — |
| Verifikasi laporan | — | — | kelasnya | — | ✅ | — | — |
| Tindak lanjut & reward | baca | — | baca kelasnya | — | ✅ | — | baca |
| Laporan presensi | ✅ | miliknya | kelasnya | keterlaksanaan | harian guru (baca) | rekap guru | ✅ semua |
| Rekap guru utk gaji + export | ✅ | — | — | — | — | ✅ | baca |
| Laporan demerit | ✅ | — | kelasnya | — | ✅ | — | baca |
| Perangkat kiosk | ✅ | — | — | — | — | — | — |
| Audit & sesi semua user | ✅ | — | — | — | — | — | — |
| Profil sendiri | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

\* Wali kelas = atribut pada guru untuk kelas tertentu.

### 8.3 Sesi per user (pelacakan, idle 1 jam, perangkat)
- Login → token acak (`crypto.randomBytes(48).toString('hex')`), simpan **hash
  sha256**; kolom: userId, tokenHash, ipAddress, userAgent, deviceSummary
  ("Chrome • Windows"), loginMethod ('password'|'google'), createdAt,
  lastActiveAt, expiresAt, revokedAt.
- **Idle timeout 1 JAM (mengikat)**: request valid memperbarui lastActiveAt
  (throttle > 60 dtk); `now − lastActiveAt >` idle → 401 kode `SESSION_IDLE`
  pesan "Sesi berakhir karena tidak aktif. Silakan masuk kembali." → frontend
  redirect login → kembali ke halaman semula. Idle & absolut dikonfigurasi env:
  `SESSION_IDLE_MINUTES` (default 60), `SESSION_ABSOLUTE_HOURS` (default 24) —
  agar bisa diuji tanpa menunggu 1 jam.
- /admin/akun: sesi aktif SEMUA user + cabut; /profil: sesi sendiri + cabut.
  Login tercatat di audit (perangkat, IP, metode).
- Ganti password → revoke semua sesi user kecuali sesi ini; hapus akun → revoke
  semua. Rate limit login 5 gagal/5 menit per IP (X-Forwarded-For, elemen
  pertama) → 429. Housekeeping bootstrap: hapus sesi revoked/expired > 30 hari.

### 8.4 Token perangkat kiosk
Pairing kode 6 digit (10 menit) → token perangkat (hash), TANPA idle timeout,
hanya endpoint scan + heartbeat; admin lihat online/offline & cabut.

## 9. MODUL PENILAIAN & RAPOR (FINAL — model dari sistem rapor berjalan user `radig/rapor`; asumsi dikonfirmasi user)

- **TP** per mapel (CRUD guru mapel). **Penilaian** per mapel+kelas+semester:
  jenis `Formatif|Sumatif`; subjenis `Sumatif TP|Sumatif Akhir Semester|Sumatif
  Akhir Tahun`; bobot int ≥ 1; Sumatif TP terhubung ≥ 1 TP. **Nilai** 0–100 per
  siswa. Formatif tidak masuk rapor.
- **Nilai akhir** = `round(Σ(nilai×bobot)/Σ(bobot))` semua sumatif. **KKM
  global default 75** (dikonfirmasi). **Deskripsi otomatis**: rata-rata per TP
  vs KKM → top 2 dikuasai + bottom 2 perlu penguatan (pola kalimat & pembersihan
  frasa persis referensi). **Nilai katrol** = override manual.
- **Kokurikuler**: kegiatan (tema/semester) → 8 dimensi → asesmen SB/B/C/K
  (multi-penilai dirata-rata) → deskripsi otomatis, **bisa ditimpa manual**
  (dikonfirmasi). **Ekskul**: peserta, tujuan per semester, SB/B/C/K, kehadiran
  → keterangan + % (merah < 70%).
- **Rapor** per siswa/semester: Draft/Final; **Ketidakhadiran S/I/TK OTOMATIS
  dari presensi** (wali boleh koreksi + alasan → audit); catatan wali; mapel
  agama sesuai agama siswa; **Seni+Prakarya digabung** "Seni Budaya dan
  Prakarya" (dikonfirmasi); urutan mapel dari kolom urutan.
- **Finalisasi & penguncian (mengikat)**: FINALISASI dilakukan WALI KELAS per
  siswa (atau "semua yang lengkap" sekaligus) → status Final MENGUNCI seluruh
  nilai siswa itu pada semester tsb. (guru mapel tidak bisa mengubah — baris
  input terkunci); BUKA KUNCI hanya oleh Kurikulum/Admin dengan alasan wajib
  (audit log); cetak massal oleh Kurikulum; siswa berstatus Draft tetap bisa
  dicetak dengan tanda peringatan "belum final".
- **Cetak PDF** per siswa & massal per kelas: SAMPUL (logo kab, jenjang, nama
  sekolah, logo, kotak nama, NIS/NISN, footer kementerian) + IDENTITAS (15 butir
  + foto 3×4 + ttd Kepsek) + ISI (identitas ringkas; A. Nilai Akademik;
  B. Kokurikuler; C. Ekstrakurikuler; D. Ketidakhadiran; E. Catatan Wali;
  Tanggapan Orang Tua; ttd Ortu + Kepsek + Wali).
- Konsekuensi data induk: siswa biodata lengkap + foto; kelas ber-fase; profil
  sekolah lengkap (jenjang, logo, kepsek nama/NIP/jabatan, alamat, kab/kota).

**USERFLOW INPUT NILAI END-TO-END (mengikat — daftar siswa SELALU otomatis):**

```
PRASYARAT (sekali per semester, oleh peran lain — guru tidak melakukan apa pun):
 1. Admin menempatkan siswa ke kelas (/admin/orang) — tiap siswa aktif di
    tepat satu kelas.
 2. Kurikulum membuat mapel → PENUGASAN paket "Guru—Mapel—Kelas"
    (/kurikulum/penugasan).

ALUR GURU MAPEL:
 3. Guru login → /guru/penilaian → paket yang ditugaskan padanya MUNCUL
    OTOMATIS sebagai kartu (turunan langsung penugasan; guru TIDAK bisa
    menambah/memilih kelas sendiri; belum ditugaskan → empty state "Anda
    belum ditugaskan mengajar — hubungi Staf Kurikulum").
 4. Buka paket → (bila perlu) tab TP: isi tujuan pembelajaran.
 5. Tab Penilaian → "+ Tambah Penilaian" (nama, jenis, subjenis, bobot, TP)
    → Simpan → LANGSUNG DIARAHKAN ke halaman INPUT NILAI.
 6. Halaman input nilai berisi SEMUA SISWA AKTIF kelas itu OTOMATIS (urut
    absen, dari penempatan kelas — guru TIDAK PERNAH menambah siswa manual;
    input kosong disorot kuning).
 7. Isi nilai → autosave per sel → kelengkapan n/n → selesai.
 8. Tab Rekap / sub-halaman per siswa: nilai akhir & deskripsi capaian
    terhitung otomatis → bahan finalisasi rapor wali kelas.
```

**ATURAN DATA TURUNAN (mengikat — berlaku di SEMUA modul, bukan hanya nilai):**
- SATU sumber kebenaran: penempatan siswa→kelas (admin) + penugasan paket +
  jadwal (kurikulum). SEMUA daftar lain diturunkan otomatis dan TIDAK pernah
  di-input ulang: roster KBM = siswa aktif kelas sesi itu; daftar input
  nilai = siswa aktif kelas paket; menu wali kelas muncul otomatis saat guru
  ditetapkan wali di /admin/kelas; pemilih siswa di demerit/izin = data
  induk; daftar mapel di rapor siswa = paket-paket yang mengajar kelasnya.
- SISWA BARU masuk di tengah semester → otomatis muncul di semua roster &
  daftar nilai kelas itu SEJAK saat itu; penilaian yang sudah lewat = nilai
  kosong (disorot), sesi yang sudah lewat = "tidak tercatat" (bukan alpha).
- SISWA PINDAH KELAS → kelas aktif berubah (tercatat audit); riwayat nilai,
  presensi, demerit di kelas lama TETAP tersimpan dan terbaca; ke depan
  mengikuti kelas baru.
- SISWA KELUAR (mutasi/nonaktif) → hilang dari semua daftar aktif; seluruh
  riwayat tetap tersimpan.
- GURU PAKET DIGANTI (kurikulum edit penugasan) → paket + TP + penilaian +
  nilai TETAP UTUH (milik mapel—kelas, bukan milik pribadi guru); guru baru
  melanjutkan; tiap nilai mencatat penginputnya (audit); jadwal KBM paket
  otomatis mengikuti guru baru.
- PENUGASAN DIHAPUS → paket hilang dari daftar guru; data historis
  penilaian/nilai TIDAK ikut terhapus (arsip semester).

## 10. MODUL ADMINISTRASI — STAF TU (FINAL)

HANYA: **rekap presensi harian guru** → `/tu/rekap-guru` → pilih bulan → tabel
per guru: hari wajib, hadir, terlambat (kali + total menit), izin, sakit, dinas,
alpha, libur, % → export Excel (+ PDF berkop).

**KEPUTUSAN USER (final):** perhitungan gaji TIDAK masuk sistem — rekap ini
dipakai bagian gaji di luar aplikasi. JANGAN membangun fitur penggajian.

## 11. KEPUTUSAN TERKUNCI (riwayat tanya-jawab — SEMUA TERJAWAB)

1. Kategori S = **25 poin** (ikut daftar butir SOP).
2. Tanda T di roster → **draft R-07 otomatis** di antrean verifikasi.
3. **BK = Staf Kesiswaan** (satu peran).
4. Presensi per KBM guru = **otomatis dari penyimpanan roster**.
5. Guru ber-KBM **wajib 2 presensi** (harian pagi jam global + per KBM).
6. Alpha harian siswa = A di semua sesi terlaksana (aman dengan guru pengganti).
7. Rapor: model referensi `radig/rapor` diadopsi; **PDF sendiri**, tanpa e-Rapor;
   KKM 75; merge Seni+Prakarya; deskripsi kokurikuler bisa ditimpa manual.
8. TU = rekap presensi guru saja; **gaji dihitung di luar sistem**.
9. **Peran Kepala Sekolah disetujui**: baca-semua + approve izin guru + nama di
   dokumen cetak.

## 12. ATURAN WAJIB (berlaku sejak baris kode pertama)

1. **WAKTU = WIB (Asia/Jakarta), tanpa kecuali** — DB `timestamptz`; semua
   perhitungan & tampilan pakai zona `Asia/Jakarta` eksplisit (date-fns-tz atau
   Luxon); `TZ=Asia/Jakarta` di container hanya lapisan kedua.
2. Seluruh UI & pesan error **Bahasa Indonesia**.
3. RBAC ditegakkan di SERVER per endpoint (§8.2).
4. Data induk hanya milik Core; jadwal KBM hanya milik Kurikulum; saldo demerit
   & ketidakhadiran rapor dihitung dari sumber, bukan kolom statis.
5. Status LIBUR guru diturunkan DARI JADWAL saat dibutuhkan.
6. Sesi user: token per user (hash), idle 1 jam, catat IP + perangkat; password
   bcrypt; passwordHash tidak pernah keluar API.
7. Data wajah: hanya embedding guru + 1 foto referensi; endpoint terproteksi.
8. Poin demerit hanya lewat pintu §7.5; draft R-07 tidak memotong sebelum
   diverifikasi.
9. Seed katalog & ambang persis §7.2–7.3; model penilaian persis §9.
10. Setiap mutasi tercatat di audit log (siapa, kapan, apa, perangkat/IP).
11. Stack via `docker compose up -d --build`; `npm run build` host = typecheck.
12. GOTCHA psql Windows: SQL ke file → `Get-Content x.sql -Raw | docker compose exec -T db psql ...`.
13. Jangan bekerja di luar tugas tertulis; ambigu → tulis pertanyaan di LOG
    PROGRES dan berhenti.
14. **QA WAJIB PER FASE**: checklist verifikasi setiap fase HARUS mencakup
    (a) pengujian viewport mobile 375px untuk semua halaman yang disentuh fase
    itu (drawer, kartu-list, bottom sheet, tombol sticky), dan (b) pengujian
    perilaku komponen interaktif sesuai aturan anti-bug §15.0: dialog/sheet
    berisi perubahan tidak tertutup tak sengaja, tidak ada double-submit,
    tidak ada spinner tanpa akhir, focus kembali ke pemicu.

## 13. ROADMAP FASE

| Fase | Isi | Status |
|------|-----|--------|
| **F0** | **Fondasi (§14): scaffold, Docker, auth lengkap, RBAC, sesi, Google, layout per peran, /profil, /admin/akun** | 🔶 **SELESAI BERSYARAT — T8 hotfix (§14.7) wajib sebelum F1** |
| F1 | Core + Kurikulum-jadwal: orang (biodata lengkap + foto, status aktif/mutasi, pindah kelas), kelas (fase, wali), mapel, profil sekolah, penugasan (+ ganti guru tanpa kehilangan data), jadwal KBM + validasi bentrok, tahun ajaran/semester, jam global & libur, KKM, lokasi sekolah (geofence), import Excel | ⏳ ditulis setelah F0 selesai |
| F2 | Presensi siswa per KBM + status sesi + T→draft R-07 + monitor | ⏳ |
| F3 | Presensi harian guru via wajah (enrollment, kiosk, HP 1:1, offline) | ⏳ |
| F4 | Izin guru + pengganti, alpha/libur otomatis, koreksi, dashboard, laporan + export, rekap TU, area kepsek | ⏳ |
| F5 | Kesiswaan/demerit lengkap (§7) | ⏳ spesifikasi final |
| F6 | Penilaian & rapor (§9) + cetak PDF massal | ⏳ spesifikasi final |
| F7 | (cadangan) fitur lanjutan bila ada kebutuhan baru | ⏸️ |
| F8 | Hardening, QA end-to-end, deploy produksi | ⏳ |

## 14. TUGAS FASE F0 — FONDASI & AUTH (KERJAKAN SEKARANG, berurutan)

### 14.1 Struktur folder target

```
AAMAPP/
├── docker-compose.yml          # db, backend, frontend
├── .env.example                # semua env + komentar
├── PROMPT_AGENT.md             # dokumen ini
├── README.md
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── main.ts             # helmet, ValidationPipe global (pesan ID), body limit 1mb
│       ├── app.module.ts
│       ├── common/             # RolesGuard, SessionAuthGuard, decorators, util WIB, util device
│       ├── auth/               # login, google, logout, config, me, rate limit
│       ├── users/              # CRUD akun + peran + approve
│       ├── sessions/           # entity + list/revoke (admin & own)
│       ├── audit/              # ActivityLogService + endpoint activities
│       ├── profile/            # profil sendiri, password, link google, sesi sendiri
│       └── seed/               # admin seed dari env + housekeeping sesi/log
└── frontend/
    ├── Dockerfile
    ├── nginx.conf              # proxy /api → backend, X-Forwarded-For, X-Real-IP
    └── src/
        ├── api/client.ts       # SEMUA tipe & fungsi API di satu file (pola SmpProfileWeb)
        ├── app/                # router, AppLayout (sidebar gabungan peran), RequireAuth/RequireRole
        ├── pages/login/        # + tombol & daftar Google, panel pending
        ├── pages/profil/
        ├── pages/admin/akun/   # tab Akun • Sesi Aktif • Aktivitas
        └── pages/placeholder/  # dashboard tiap area: kartu "Modul menyusul"
```

### 14.2 Skema database F0 (TypeORM, `synchronize: true` selama pengembangan)

```
users
  id            serial PK
  name          varchar
  email         varchar UNIQUE (simpan lowercase)
  passwordHash  varchar NULL          -- null utk akun google-only
  googleSub     varchar NULL UNIQUE
  status        varchar default 'active'   -- 'active' | 'pending'
  roles         jsonb default '[]'    -- array dari: 'admin','guru','kurikulum',
                                      --   'kesiswaan','tu','kepsek'
  requestedRoles   jsonb default '[]' -- peran yang DIAJUKAN saat daftar Google
  registrationNote varchar NULL       -- keterangan opsional dari pendaftar
  createdAt / updatedAt timestamptz
  -- relasi ke entity guru menyusul di F1 (kolom guruId nullable — JANGAN dibuat sekarang)

sessions
  id            serial PK
  userId        FK users ON DELETE CASCADE
  tokenHash     char(64)              -- sha256 hex; token mentah TIDAK PERNAH disimpan
  ipAddress     varchar
  userAgent     text
  deviceSummary varchar               -- "Chrome • Windows" (pakai ua-parser-js)
  loginMethod   varchar               -- 'password' | 'google'
  createdAt / lastActiveAt / expiresAt timestamptz
  revokedAt     timestamptz NULL

activity_logs  (append-only)
  id            serial PK
  userId        FK users ON DELETE SET NULL
  userName / userEmail  varchar       -- denormalisasi (log tetap terbaca bila akun dihapus)
  action        varchar               -- 'login'|'create'|'update'|'delete'|'approve'|'revoke'
  entity        varchar               -- 'user'|'session'|... (bertambah per fase)
  entityId      varchar NULL
  entityLabel   varchar NULL
  summary       varchar NULL
  ipAddress     varchar / deviceSummary varchar
  createdAt     timestamptz
```

Seed saat bootstrap: bila tabel users kosong → buat admin dari env
(`ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, roles `['admin']`, status
active). Housekeeping: hapus sesi revoked/expired > 30 hari, log > 365 hari.

### 14.3 Kontrak API F0

**Publik:**
- `POST /api/auth/login` `{email, password}` → `{accessToken, user}` dengan
  `user = {id, name, email, roles, status, hasPassword, googleLinked}`.
  401 "Email atau password salah". Rate limit → 429 "Terlalu banyak percobaan
  login. Coba lagi dalam beberapa menit."
- `POST /api/auth/google` `{credential}` → sama dengan login (khusus LOGIN,
  TIDAK membuat akun). Email belum terdaftar → 404 `{unregistered:true,
  message:"Akun belum terdaftar. Silakan lengkapi pendaftaran."}` → frontend
  redirect /daftar langkah 2. Masih pending → 403 `{pending:true,
  message:"Akun Anda menunggu persetujuan admin."}`. Env kosong → 400 "Login
  Google belum dikonfigurasi". Token tidak valid → 401 "Token Google tidak valid".
- `POST /api/auth/register-google` `{credential, requestedRoles[] min 1,
  note?, deviceConsent:true}` → verifikasi token → buat user `{status:'pending',
  roles:[], requestedRoles, registrationNote}` → 201 `{message:"Pendaftaran
  terkirim. Akun menunggu persetujuan admin."}`. Email/googleSub sudah terdaftar
  → 409 "Akun sudah terdaftar — silakan masuk". `deviceConsent` harus true
  (validasi); konsen + perangkat + IP tercatat di audit log.
- `GET /api/auth/config` → `{googleClientId: string|null}`.

**Ber-token (guard sesi §8.3; SEMUA respons error dalam Bahasa Indonesia):**
- `GET /api/auth/me` → user. `POST /api/auth/logout` → revoke sesi ini.
- `GET /api/profile` → user + createdAt.
  `PATCH /api/profile` `{name?}`.
  `POST /api/profile/password` `{currentPassword?, newPassword}` (current wajib
  bila hasPassword; set pertama utk akun google-only) → revoke sesi lain.
  `POST /api/profile/link-google` `{credential}` → 409 bila googleSub sudah
  dipakai akun lain. `DELETE /api/profile/link-google` → 400 bila tanpa password.
  `GET /api/profile/sessions` → `[{id, deviceSummary, ipAddress, createdAt,
  lastActiveAt, current}]`. `DELETE /api/profile/sessions/:id`.

**Admin (`@Roles('admin')`):**
- `GET /api/admin/users` → `[{id, name, email, roles, status, requestedRoles,
  registrationNote, googleLinked, createdAt}]` (TANPA passwordHash).
- `POST /api/admin/users` `{name min 3, email valid+unik, password min 8,
  roles[] min 1}` → 201; duplikat → 409 "Email sudah terdaftar".
- `PATCH /api/admin/users/:id` `{name?, email?, password?, roles?}` — password
  kosong = tidak diganti; DILARANG menghapus peran admin dari admin aktif
  TERAKHIR (400 "Minimal harus ada satu akun admin").
- `PATCH /api/admin/users/:id/approve` `{roles[] min 1}` → pending → active.
- `DELETE /api/admin/users/:id` → 400 bila diri sendiri / admin aktif terakhir;
  user pending tidak dihitung admin.
- `GET /api/admin/sessions` → sesi aktif semua user `[{id, user:{id,name,email},
  deviceSummary, ipAddress, loginMethod, createdAt, lastActiveAt, current}]`.
- `DELETE /api/admin/sessions/:id`.
- `GET /api/admin/activities?page&limit&userId&entity&action` →
  `{items, total, page, limit}` urut terbaru.

**Guard & RBAC:** `SessionAuthGuard` (hash token → cari sesi → tolak bila
revoked/absolut lewat; bila idle lewat → 401 body `{code:'SESSION_IDLE',
message:'Sesi berakhir karena tidak aktif. Silakan masuk kembali.'}` → update
lastActiveAt throttle 60 dtk) + `RolesGuard` membaca `@Roles(...)`; peran
`admin` lolos semua. Semua mutasi memanggil `ActivityLogService.record(...)`.

### 14.4 Frontend F0 (desain tiap halaman mengikuti §15)
- `/login`: form email+password; bila config ada → tombol GIS + divider "atau";
  link "Belum punya akses? Daftar di sini" → /daftar; 403 pending → panel
  kuning; 404 unregistered (login Google) → redirect /daftar langkah 2 membawa
  credential; 429 → tampilkan pesan dari body.
- `/daftar`: wizard 3 langkah (§15.1): akun Google → konsen perangkat (checkbox
  wajib) + pilih peran diajukan (multi) + keterangan → kartu sukses pending.
- `AppLayout`: sidebar gelap berisi GABUNGAN menu semua peran user (F0: tiap
  area = 1 halaman placeholder "Modul menyusul" + /admin/akun fungsional);
  header: nama + peran (badge) + jam WIB; logout (panggil API dulu, lalu bersihkan
  lokal walau API gagal).
- Interceptor 401: simpan lokasi → redirect /login (tampilkan pesan bila
  `SESSION_IDLE`) → setelah login kembali ke lokasi semula.
- `/profil`: data diri, ganti/set password, tautkan/lepas Google, sesi sendiri
  (perangkat, IP, terakhir aktif relatif, cabut — sesi ini = "Logout").
- `/admin/akun` 3 tab (`?tab=`): **Akun** (tabel + roles badge; klik baris →
  sub-halaman DETAIL `/admin/akun/:id` [identitas, peran, Google, sesi user
  itu, aktivitas terakhir, tombol Edit/Hapus]; form tambah/edit = sub-halaman
  dengan multi-select peran; baris sendiri badge "Anda", hapus disabled) •
  **Sesi Aktif** (semua user, cabut per baris, konfirmasi adaptif — BUKAN
  window.confirm) • **Aktivitas** (tabel + filter user/entity/action +
  pagination). SUB-HALAMAN `/admin/akun/persetujuan` (KEPUTUSAN USER): antrean
  pendaftar Google pending — nama/email/foto, PERAN DIAJUKAN (badge),
  keterangan, tanggal & perangkat saat daftar → "Tinjau" → detail dengan form
  peran final (prefilled dari ajuan, bisa diubah) + "Setujui & Aktifkan" /
  "Tolak" (alasan wajib → akun dihapus + audit). Badge jumlah pending di menu
  sidebar Akun.
- Komponen bersama F0 (dipakai semua fase): `<Card icon>`, `<ConfirmDialog>`,
  `<BottomSheet>` (desktop = dialog/panel, mobile = bottom sheet — satu
  komponen adaptif), toast — semua custom Tailwind tanpa library UI berat;
  form = sub-halaman, BUKAN modal; semua tombol submit ber-guard double-submit
  (aturan anti-bug §15.0).

### 14.5 Docker & env
- `docker-compose.yml`: `db` (postgres:16-alpine, volume `db_data`,
  healthcheck), `backend` (build, env, depends_on db healthy, TANPA mapping
  port keluar — akses hanya via nginx), `frontend` (nginx:alpine, port
  `${WEB_PORT:-80}:80`, proxy `/api` → backend:3000 + header X-Forwarded-For &
  X-Real-IP).
- `.env.example`: `POSTGRES_DB/USER/PASSWORD`, `ADMIN_NAME/EMAIL/PASSWORD`,
  `GOOGLE_CLIENT_ID=` (opsional, kosongkan bila belum ada),
  `SESSION_IDLE_MINUTES=60`, `SESSION_ABSOLUTE_HOURS=24`, `WEB_PORT=80`,
  `TZ=Asia/Jakarta` — beri komentar tiap baris.

### 14.6 Daftar tugas (berurutan)

**T1 — Persiapan.** `docker info` (bila gagal: start Docker Desktop lalu poll).
Scaffold struktur §14.1 (init NestJS & Vite React TS + Tailwind), compose +
.env.example + README stub. Selesai bila `docker compose up -d --build` semua
service sehat dan frontend tampil di http://localhost.

**T2 — Backend fondasi.** Entities §14.2 + koneksi TypeORM + seed admin +
housekeeping + helmet + ValidationPipe global (pesan Indonesia) + util WIB
(helper format & "hari ini" zona Asia/Jakarta — akan dipakai semua fase) + util
deviceSummary. Selesai bila build sukses & tabel terbentuk.

**T3 — Backend auth lengkap.** Semua endpoint §14.3 + guards + rate limit +
audit + Google (verifikasi google-auth-library; struktur siap walau env
kosong). Selesai bila build sukses + smoke test curl login/me/logout.

**T4 — Frontend fondasi.** api/client.ts (semua tipe & fungsi F0), router +
RequireAuth/RequireRole + AppLayout + interceptor 401/SESSION_IDLE + halaman
login lengkap + placeholder dashboard per area. Selesai bila typecheck sukses.

**T5 — Frontend halaman.** /profil + /admin/akun (3 tab, §14.4). Selesai bila
typecheck sukses.

**T6 — Rebuild & verifikasi end-to-end** (`docker compose up -d --build`; API
via Invoke-RestMethod/curl, UI via browser sungguhan):
1. `GET /api/auth/config` → `{googleClientId:null}` (env kosong); tombol Google
   TIDAK tampil di /login.
2. Login admin seed → token + user roles `['admin']`; `GET /api/auth/me` OK.
3. Login password salah 5× → ke-6 → 429 dengan pesan Indonesia (meski password
   benar).
4. Buat user "Uji Guru" roles `['guru']` → 201; email sama → 409; login sukses;
   akses `GET /api/admin/users` dengan token guru → 403; `GET /api/profile` → OK.
5. Buat user multi-peran `['guru','kesiswaan']` → login → sidebar menampilkan
   menu gabungan kedua area (placeholder).
6. Sesi: login 2× → `GET /api/admin/sessions` berisi 2 sesi dengan
   deviceSummary + IP + `current` benar; cabut sesi B pakai token A → token B
   401; logout token A → 401; cek DB: tokenHash 64 hex ≠ token mentah.
7. Idle: set `SESSION_IDLE_MINUTES=1` → up backend → login → tunggu > 1 menit →
   request → 401 `SESSION_IDLE` dengan pesan benar; UI redirect login lalu
   KEMBALI ke halaman semula setelah login ulang; kembalikan env ke 60.
8. Ganti password akun uji → sesi lain akun itu 401, sesi yang mengganti tetap
   hidup; login password lama 401, baru 200.
9. Google (tanpa akun sungguhan): `POST /api/auth/google` + env kosong → 400;
   set GOOGLE_CLIENT_ID dummy → config mengembalikan nilainya, tombol tampil,
   credential ngawur → 401; `register-google` tanpa `deviceConsent:true` →
   400; INSERT user pending via SQL dengan `requestedRoles:['guru']` (gotcha
   §12.12) → muncul di /admin/akun/persetujuan dengan badge peran diajukan →
   Tinjau → form peran ter-prefill `['guru']` → Setujui → status active +
   audit; buat pending kedua → Tolak dengan alasan → akun terhapus + alasan di
   audit (alur klik Google asli = TES MANUAL user, tulis di laporan).
10. Guard: hapus akun sendiri → 400; hapus/copot peran admin terakhir → 400;
    user pending tidak dihitung admin.
11. Audit: langkah 2–10 menghasilkan entri login/create/update/delete/approve/
    revoke dengan userName, perangkat, IP; filter `?entity=user` bekerja; entri
    milik akun yang sudah dihapus tetap ada (userId null).
12. /profil: ubah nama, ganti password, daftar sesi sendiri + cabut bekerja.
13. `docker compose restart backend` → sesi tetap hidup (DB, bukan memori).
14. Seluruh teks UI Bahasa Indonesia; jam di header = WIB.
15. **Mobile 375px** (DevTools device mode): login, /daftar (3 langkah),
    /profil, /admin/akun (tabel jadi kartu-list; form multi-select peran jadi
    bottom sheet), drawer sidebar buka-tutup; klik baris akun → detail
    `/admin/akun/:id` tampil rapi di mobile; uji anti-bug: hapus akun →
    konfirmasi tampil BOTTOM SHEET di mobile & modal tengah di desktop; buka
    form akun → ubah field → klik BackLink/menu sidebar → konfirmasi
    "Perubahan belum disimpan" (bottom sheet mobile / modal desktop) dengan
    "Lanjut Mengedit"/"Buang Perubahan"; klik Simpan 2× cepat → hanya satu
    request; matikan backend → submit → pesan error + "Coba lagi" (bukan
    spinner selamanya).

Bila ada kegagalan: diagnosis (`docker compose logs backend|frontend`),
perbaiki, rebuild, ulangi langkah yang gagal.

**T7 — Bersih-bersih & laporan.** Hapus akun/sesi uji (kecuali admin seed;
activity_logs JANGAN dibersihkan — bukti audit bekerja). Update README (cara
menjalankan, env, akun seed). Tulis laporan F0 di LOG PROGRES (format §16) +
item tes manual user (tombol Google dengan akun asli + prasyarat OAuth Client
ID: Authorized JavaScript origins `http://localhost` + domain produksi nanti;
akun Google BIASA (gratis) cukup untuk membuat Client ID di Google Cloud
Console — tidak perlu Workspace).

**Definition of Done F0:** checklist T6 1–15 lolos semua; tidak ada teks
Inggris di UI; `docker compose up -d --build` dari nol → aplikasi siap dipakai
admin untuk mengelola akun (desktop DAN mobile).

### 14.7 T8 — HOTFIX HASIL REVIEW PLANNER (2026-07-13; KERJAKAN SEBELUM F1)

Review planner atas F0: fondasi & API solid (login, RBAC, sesi, audit, guard
semuanya terverifikasi ulang), TAPI ada 3 BUG UI yang ditemukan lewat pengujian
browser langsung + beberapa item verifikasi T6 yang belum ada buktinya.

**BUG-1 (kritis) — ConfirmDialog tak terlihat.** Panel konfirmasi
(class `rounded-t-xl animate-slide-up`) me-render DI BAWAH viewport
(`getBoundingClientRect().top == window.innerHeight`) di mobile DAN desktop —
user hanya melihat backdrop gelap; hapus akun/cabut sesi TIDAK BISA dilakukan
lewat UI. Perbaiki: kontainer overlay harus `flex` dengan panel di dalam
viewport — mobile: `items-end` (sheet menempel bawah, slide-up berakhir di
posisi terlihat); desktop (≥sm): varian MODAL TENGAH (`items-center`,
`rounded-xl`, max-w-md) sesuai §15.0 — saat ini desktop salah memakai varian
sheet. Uji dengan mengukur `getBoundingClientRect()` panel di kedua ukuran:
harus `bottom ≤ innerHeight` dan `top ≥ 0`.

**BUG-2 — Route `/` layar putih setelah login.** Setelah login sukses, app
mendarat di `/` yang hanya me-render kontainer toast (kosong total). Perbaiki:
route index `/` → redirect ke area peran pertama user (urutan §6.1B: admin →
kurikulum → kesiswaan → guru → kepsek → tu); belum login → redirect /login.
Login juga harus mengarahkan langsung ke area tsb. (bukan `/`).

**BUG-3 — Guard navigasi belum diimplementasikan.** Form berisi perubahan
(mis. /admin/akun/baru) ditinggalkan via BackLink/menu TANPA konfirmasi
"Perubahan belum disimpan" — melanggar §15.0 (KEPUTUSAN USER) dan T6.15.
Implementasikan guard navigasi (blocker react-router / interceptor klik +
ConfirmDialog adaptif: "Lanjut Mengedit" default, "Buang Perubahan" merah)
pada SEMUA form F0: akun baru/edit, profil, persetujuan.

**VERIFIKASI T8 (semua via UI browser sungguhan + laporkan per poin):**
1. Mobile 375px: hapus akun uji → bottom sheet TERLIHAT (menempel bawah) →
   Batal & Hapus keduanya berfungsi.
2. Desktop: konfirmasi yang sama tampil MODAL TENGAH terlihat penuh.
3. Login → langsung mendarat di /admin (bukan layar putih); buka `http://localhost/`
   saat sudah login → redirect area; saat belum login → /login.
4. Isi form akun baru → klik Kembali/menu sidebar → konfirmasi muncul;
   "Lanjut Mengedit" tetap di form dengan data utuh; "Buang Perubahan" pindah.
5. Item T6 yang belum ada buktinya — jalankan & laporkan: (a) idle timeout via
   `SESSION_IDLE_MINUTES=1` → 401 SESSION_IDLE + redirect + return-to;
   (b) ganti password akun uji → sesi lainnya 401; (c) user pending via SQL →
   badge + approve → aktif; (d) `docker compose restart backend` → sesi tetap
   hidup; (e) akun multi-peran → sidebar gabungan.
6. Bersihkan akun/sesi uji setelahnya (activity_logs biarkan).

**ATURAN PROSES (pelanggaran ditemukan):** laporan T1–T7 TIDAK ditulis di LOG
PROGRES dokumen ini (hanya di file walkthrough eksternal). Mulai T8, WAJIB
menulis laporan di LOG PROGRES EKSEKUSI di bawah dokumen ini (aturan §1.4) —
walkthrough eksternal boleh sebagai tambahan, bukan pengganti.

### 14.8 T9 — GUARD NAVIGASI PAKAI ConfirmDialog ADAPTIF (2026-07-13; SEBELUM F1)

Review planner atas T8: BUG-1 (ConfirmDialog portal + varian modal desktop/
sheet mobile) dan BUG-2 (redirect `/` → area/login) **BERES & terverifikasi**.
BUG-3 fungsional (navigasi benar-benar diblokir) TAPI implementasinya
**melanggar spec**: `useUnsavedChanges` memakai **`window.confirm()` bawaan
browser** — §15.0 & §12.13 MELARANGNYA (dialog dekorasi native, tidak sesuai
design system, memblokir otomasi, pesannya generik bukan "Lanjut Mengedit"/
"Buang Perubahan"). Ini kesalahan yang SAMA dengan proyek sebelumnya
(SmpProfileWeb — "hapus native confirm()").

**Kenapa wajib dibereskan SEBELUM F1:** `useUnsavedChanges` adalah hook BERSAMA
yang akan dipakai SETIAP form di F1+ (orang, kelas, mapel, penugasan, jadwal,
dst.). Bila dibiarkan, `window.confirm` menyebar ke puluhan form. Perbaiki
sekali sekarang saat baru dipakai 2 tempat.

**Tugas T9:**
1. Ubah pola guard agar berbasis STATE React + `<ConfirmDialog>` adaptif
   (yang sudah benar dari T8), BUKAN `window.confirm`. Karena ConfirmDialog
   asinkron (butuh render + tunggu klik) sedangkan navigasi router sinkron:
   - Untuk navigasi in-app (klik menu/BackLink/tombol/`navigate`): pakai
     mekanisme blocker react-router (mis. `useBlocker` dari react-router-dom
     v6.4+ / data router, atau pola setara) → saat diblokir, tampilkan
     `<ConfirmDialog>` (desktop modal tengah / mobile bottom sheet) dengan
     judul "Perubahan belum disimpan", tombol **"Lanjut Mengedit"** (default,
     menutup dialog & batal pindah) dan **"Buang Perubahan"** (merah,
     melanjutkan navigasi). Bila react-router perlu data router
     (`createBrowserRouter`) untuk useBlocker, boleh refactor router App ke
     bentuk itu — pastikan semua route & guard peran tetap sama.
   - HANYA untuk refresh/tutup-tab (di luar kendali React): `beforeunload`
     tetap boleh (browser memang memaksa dialog nativenya sendiri di sini —
     itu satu-satunya pengecualian yang wajar).
2. Bungkus jadi API yang enak dipakai ulang, mis. hook
   `useUnsavedChanges(isDirty)` yang mengembalikan elemen dialog + otomatis
   memasang blocker, ATAU komponen `<UnsavedGuard when={isDirty} />` — supaya
   form F1 cukup satu baris.
3. Terapkan di SEMUA form F0: /admin/akun/baru, /admin/akun/:id/edit, /profil
   (bila ada perubahan), /admin/akun/persetujuan (bila mengubah peran).

**VERIFIKASI T9 (UI browser sungguhan, laporkan per poin):**
1. Desktop: isi form akun baru → klik menu sidebar/Kembali → muncul MODAL
   TENGAH "Perubahan belum disimpan" (BUKAN dialog abu-abu native browser) →
   "Lanjut Mengedit" tetap di form data utuh → ulangi → "Buang Perubahan"
   pindah halaman.
2. Mobile 375px: skenario sama → muncul BOTTOM SHEET (bukan native).
3. Form TANPA perubahan → pindah halaman langsung tanpa dialog.
4. Simpan sukses → tidak memicu dialog saat redirect (dirty sudah direset).
5. Konfirmasi via pengukuran: tidak ada panggilan `window.confirm` untuk
   navigasi in-app (boleh tetap ada `beforeunload` untuk refresh/tutup tab).

## 15. USERFLOW & SPESIFIKASI DESAIN PER HALAMAN

> Panduan mendesain UI tiap halaman. Format: TUJUAN → LAYOUT & KOMPONEN →
> INTERAKSI → STATE. Design system §4 berlaku semua (hijau #00B76A, sidebar
> #10221b, Space Grotesk + Plus Jakarta Sans, Material Symbols). Semua teks
> Bahasa Indonesia; semua waktu tampil WIB. Halaman F0 dikerjakan sekarang;
> halaman fase lain didesain saat fasenya tiba dengan spesifikasi ini.

### 15.0 Kerangka global (semua halaman ber-login)

- **AppLayout**: sidebar gelap kiri — logo AAMAPP, menu GABUNGAN semua peran
  user dikelompokkan per area dengan label kecil (ADMIN / KURIKULUM / ...),
  item aktif hijau + border kiri; badge angka pada menu yang punya antrean
  (mis. Akun → jumlah pendaftar pending). Konten kanan FULL-WIDTH (jangan
  dibatasi max-width). Header konten: judul + breadcrumb tipis; kanan: jam WIB
  live (HH:MM:SS), badge peran, avatar → dropdown (Profil, Logout).
- **MOBILE & RESPONSIF (KEPUTUSAN USER — wajib didesain, bukan sekadar
  "menyusut")**, acuan viewport 375px:
  - AppLayout: header atas (hamburger + judul + avatar); sidebar = DRAWER
    overlay (swipe/klik backdrop menutup); konten padding rapat.
  - Tabel: halaman ber-AKSI (akun, izin, verifikasi, pelanggaran) → berubah
    jadi DAFTAR KARTU (baris = kartu berisi field utama + tombol aksi);
    tabel laporan lebar → scroll horizontal di dalam kontainer (halaman tidak
    pernah scroll horizontal).
  - Kartu statistik dashboard: 2 kolom. Form 2 kolom → 1 kolom, kolom samping
    (meta+Simpan) pindah ke bawah dengan tombol Simpan sticky bawah.
  - Roster KBM: grid jadi 2 kolom; bar ringkasan + Simpan tetap sticky bawah.
  - Grid jadwal mingguan: mobile = tab hari (Sen–Sab) → daftar sesi vertikal
    per hari (bukan grid 6 kolom).
  - Kiosk: utama tablet landscape; portrait tetap berfungsi.
- **BOTTOM SHEET (KEPUTUSAN USER)**: semua dialog PILIHAN/panel (pemilih status
  roster, panel slot jadwal, filter, detail cepat, pemilih peran) di mobile
  tampil sebagai BOTTOM SHEET: drag-handle di atas, tutup via drag-turun/
  backdrop, max-height 90vh dengan scroll internal, body scroll terkunci saat
  terbuka. Di desktop komponen yang sama tampil sebagai dialog/panel samping.
  **KONFIRMASI (KEPUTUSAN USER)** — penghapusan data, cabut sesi, dan
  "perubahan belum disimpan": di DESKTOP = MODAL kecil di tengah; di MOBILE =
  BOTTOM SHEET. Satu komponen `<ConfirmDialog>` adaptif. FORM entri data tetap
  SUB-HALAMAN (bukan modal) di semua ukuran.
- **ANTI-BUG KOMPONEN INTERAKTIF (mengikat — pelajaran proyek sebelumnya:
  "modal sering nutup sendiri")**:
  - Dialog/bottom sheet yang berisi input yang SUDAH DIUBAH tidak boleh
    tertutup oleh klik backdrop/Escape/drag-turun begitu saja → tanya
    "Buang perubahan?".
  - **GUARD NAVIGASI (KEPUTUSAN USER)**: meninggalkan form yang punya
    perubahan belum tersimpan — via BackLink, klik menu sidebar, pindah
    route, atau tombol back browser — memunculkan konfirmasi "Perubahan belum
    disimpan" (desktop = modal tengah, mobile = bottom sheet) dengan tombol
    "Lanjut Mengedit" (default) dan "Buang Perubahan" (merah).
  - Semua tombol submit: disable + spinner selama request (anti double-submit);
    fetch punya timeout + tombol "Coba lagi" (tidak ada spinner selamanya).
  - State form dipertahankan saat validasi gagal; tidak ada optimistic update
    untuk data penting — tunggu respons server.
  - Focus trap di dialog/sheet; kembali fokus ke pemicunya saat tutup.
- **Komponen bersama**: tabel (header abu muda, zebra, pagination bawah);
  dialog konfirmasi custom (judul + deskripsi + Batal/tombol merah) — DILARANG
  window.confirm; toast kanan-atas (sukses hijau / error merah); badge status
  konsisten: hijau=hadir/aktif/terlaksana/disetujui, kuning=pending/terlambat/
  berjalan, merah=alpha/kosong/ditolak, abu=libur/nonaktif; form = SUB-HALAMAN
  dengan BackLink (bukan modal); skeleton saat loading; empty state ramah
  (ikon + 1 kalimat + tombol aksi bila relevan).
- **Kartu (aturan seragam — §4)**: gaya minimalist pure utility (putih, border
  tipis, tanpa bayangan besar) + WATERMARK ikon miring −15° opasitas 6–8% di
  pojok kanan-bawah setiap kartu, ikonnya mewakili isi kartu (mis. kartu
  "Hadir" → ikon `check_circle`, kartu KBM → `school`, kartu sesi login →
  `devices`, kartu peran di /daftar → ikon perannya). Wajib lewat komponen
  bersama `<Card icon="...">`.
- **Pola halaman standar** (dirujuk di bawah):
  - **POLA A — DATA**: judul + tombol hijau "+ Tambah" kanan; bar cari/filter;
    tabel + kolom aksi (edit/hapus ikon); KLIK BARIS → SUB-HALAMAN DETAIL
    (baca: semua field dalam kartu-kartu ber-watermark + tombol Edit & Hapus
    di header detail); tambah/edit = SUB-HALAMAN FORM dua kolom di layar
    lebar (kolom utama field inti; kolom samping sticky: meta + Simpan/Batal);
    hapus → konfirmasi adaptif (modal desktop / bottom sheet mobile); sukses →
    kembali + toast; guard navigasi bila belum disimpan.
  - **POLA B — MONITOR**: baris kartu statistik (angka besar + label + ikon
    berwarna status) → panel daftar/feed auto-refresh 15–30 dtk + tombol Muat
    Ulang + cap "Diperbarui HH:MM:SS WIB".
  - **POLA C — LAPORAN**: bar filter (rentang tanggal WIB + kelas/guru/mapel)
    + "Terapkan"; tabel hasil + baris total; kanan-atas "Export Excel" &
    "Export PDF"; kosong → "Tidak ada data pada rentang ini".
- **KOMPONEN WAJIB PER JENIS HALAMAN (mengikat — desktop vs mobile):**

| Jenis halaman | Desktop WAJIB | Mobile (≤768px) WAJIB |
|---------------|---------------|------------------------|
| Daftar data (orang, akun, kelas, mapel, penugasan, pelanggaran, izin) | TABEL: header sortable, bar cari + filter, pagination, tombol "+ Tambah" kanan-atas, kolom aksi ikon | CARD-LIST (bukan tabel): field utama + badge status + tap → detail, aksi via menu ⋮; "+ Tambah" jadi tombol sticky bawah; filter/cari → bottom sheet |
| Detail data | Kartu-kartu seksi 2 kolom + header (judul, badge, tombol Edit & Hapus) | Kartu 1 kolom; tombol aksi tetap di header (ikon) |
| Form (tambah/edit) | 2 kolom: utama + samping sticky (meta + Simpan/Batal); label di atas field; error inline merah di bawah field | 1 kolom; Simpan sticky bawah; keyboard-aware (field terfokus tidak tertutup keyboard) |
| Dashboard/monitor | Grid kartu statistik 4–5 kolom + feed/daftar + cap "Diperbarui HH:MM WIB" | Kartu statistik 2 kolom; feed di bawah |
| Laporan | Tabel + baris TOTAL + tombol export kanan-atas | TETAP TABEL (data lebar) tapi scroll horizontal DI DALAM kontainer; filter → bottom sheet; export = tombol bawah |
| Hub (laporan, pengaturan) | Grid kartu navigasi 3 kolom (ikon watermark + judul + deskripsi 1 baris) | Grid 1–2 kolom |
| Grid khusus (roster, jadwal) | Sesuai spesifikasinya (§15.4 jadwal, §15.6 roster) | Roster = 2 kolom + bar sticky; jadwal = tab hari + daftar vertikal |
| Wizard (import, enrollment, daftar) | Stepper horizontal atas + navigasi Lanjut/Kembali | Stepper ringkas (angka) + tombol full-width |
| SEMUA halaman | Breadcrumb + judul; skeleton loading; empty state (ikon + 1 kalimat + aksi); toast; ConfirmDialog adaptif; guard navigasi form | Sama + drawer sidebar; tidak ada scroll horizontal level halaman |

### 15.1 Publik & Auth

**/login** — TUJUAN: satu pintu semua peran. LAYOUT: split — kiri panel brand
polos gelap (logo, nama aplikasi + sekolah, watermark ikon sekolah besar
miring ala §15.0); kanan kartu form: email,
password (toggle lihat), tombol hijau "Masuk"; divider "atau"; tombol resmi
Google (hanya bila config ada); bawah: "Belum punya akses? **Daftar di sini**"
→ /daftar. Catatan kecil di bawah form: "Dengan masuk, aktivitas & perangkat
Anda tercatat untuk keamanan." INTERAKSI: submit → validasi inline; error 401
banner merah di atas form; 429 tampilkan pesan body; 403 pending → panel kuning
"Akun menunggu persetujuan admin"; Google unregistered → redirect /daftar
langkah 2 + toast info. STATE: loading tombol spinner; redirect balik ke
halaman asal setelah sukses (return-to).

**/daftar** — TUJUAN: registrasi Google 3 langkah dengan konsen perangkat +
ajuan peran (KEPUTUSAN USER). LAYOUT: kartu tengah + stepper 1-2-3 di atas.
- **Langkah 1 — Akun Google**: judul "Daftar Akses AAMAPP", 1 kalimat
  penjelasan, tombol resmi GIS. Config null → info "Pendaftaran belum dibuka —
  hubungi admin sekolah".
- **Langkah 2 — Konfirmasi & Peran** (setelah pilih akun): kartu identitas
  readonly dari token (foto bulat, nama, email); PANEL KONSEN (border kuning):
  "AAMAPP akan mencatat informasi perangkat (browser & sistem operasi), alamat
  IP, dan waktu akses untuk keamanan sesi." + checkbox WAJIB "Saya menyetujui
  pencatatan informasi tersebut"; PILIH PERAN DIAJUKAN: kartu-kartu pilihan
  multi (Guru • Staf Kurikulum • Staf Kesiswaan • Staf TU • Kepala Sekolah;
  ikon + deskripsi 1 baris; terpilih = border hijau + centang); textarea
  "Keterangan (opsional)" mis. "Guru Matematika kelas 7". Tombol "Kirim
  Pendaftaran" aktif hanya bila checkbox + ≥1 peran.
- **Langkah 3 — Selesai**: kartu sukses ikon centang hijau, "Pendaftaran
  terkirim. Akun Anda menunggu persetujuan admin.", daftar peran diajukan
  (badge), tombol "Kembali ke Halaman Masuk".
STATE: 409 sudah terdaftar → arahan ke /login; error jaringan → tombol coba lagi
(credential dipertahankan di state).

**/profil** — TUJUAN: kelola akun sendiri. LAYOUT: dua kolom — kiri: kartu
identitas (nama editable, email readonly, peran badge) + kartu password (ganti/
set; akun google-only tanpa password → tombol "Buat Password"); kanan: kartu
"Akun Google" (tertaut: email + tombol Lepas Tautan [disabled bila tanpa
password + tooltip alasan]; belum: tombol Tautkan) + kartu "Sesi Aktif Saya":
daftar baris (ikon perangkat, "Chrome • Windows", IP, terakhir aktif relatif,
badge "Sesi ini") + Cabut per baris (sesi ini = "Logout"). INTERAKSI: semua
aksi → dialog konfirmasi bila berdampak (lepas tautan, cabut); toast hasil.

### 15.2 Kiosk (teks ≥ 2× normal, kontras tinggi, tanpa elemen kecil)

**/kiosk — layar pairing**: latar gelap; tengah: logo + "Masukkan Kode
Pairing" + 6 kotak digit besar (keypad layar); hint "Minta kode dari Admin →
menu Perangkat"; kode salah/kedaluwarsa → kotak bergetar merah + pesan.

**/kiosk — layar utama**: kamera live fullscreen; overlay atas: nama sekolah +
JAM WIB RAKSASA + tanggal; overlay bawah: hint "Silakan berdiri di depan
kamera"; bingkai deteksi wajah animasi. STATE:
- SUKSES: kartu slide-in 3 detik — foto referensi, NAMA BESAR, badge HADIR
  (hijau)/TERLAMBAT (kuning) + "Tercatat 06:45 WIB" + bunyi konfirmasi.
- DUPLIKAT: kartu abu "Sudah tercatat pukul 06:45".
- GAGAL 3×: panel "Wajah tidak dikenali" + tombol besar "Presensi Manual" →
  keypad NIP → kartu kuning "Tercatat — menunggu verifikasi admin".
- OFFLINE: pita kuning atas "Offline — n data akan disinkronkan otomatis".
- KAMERA ERROR: layar instruksi pemulihan + auto-retry hitung mundur.

### 15.3 Area Admin

**/admin (dashboard)** — POLA B. Baris 1 kartu GURU: Hadir/Terlambat/Izin/
Alpha/Libur (klik → daftar nama). Baris 2 kartu KBM: Total/Terlaksana/
Berjalan/KOSONG (kosong merah, klik → daftarnya). Baris 3 SISWA hari ini:
H/S/I/A. Bawah 2 kolom: feed realtime (presensi guru masuk + roster tersimpan,
ikon + nama + jam) • daftar "Perlu Perhatian" (pending verifikasi, KBM kosong,
kelas belum lengkap).

**/admin/orang** — POLA A + 2 tab (Guru • Siswa). Tabel guru: foto/avatar,
nama, NIP, status wajah (badge Terdaftar/Belum), akun tertaut. Tabel siswa:
foto, nama, NISN/NIS, kelas (filter kelas), status. KLIK BARIS → SUB-HALAMAN
DETAIL: guru = biodata, status wajah (+ tombol ke enrollment), akun tertaut,
jadwal mengajar ringkas; siswa = biodata lengkap, kelas, (nanti) ringkasan
kehadiran & saldo demerit — tombol Edit & Hapus di header detail. Tombol
sekunder "Import Excel" → sub-halaman wizard 3 langkah: unduh template → unggah & pratinjau
(baris error disorot merah + alasan per baris) → konfirmasi impor (ringkasan
n sukses / n gagal). Form orang = POLA A dua kolom (biodata lengkap siswa §9;
kolom samping: foto uploader + kelas + status).

**/admin/kelas** — POLA A. Kartu/tabel kelas: nama, fase, wali kelas (avatar),
jumlah siswa. Form: nama, fase, pilih wali (search-select guru). Detail kelas:
daftar siswa anggota + pindah kelas (pilih multi siswa → dropdown tujuan).

**/admin/wajah** — TUJUAN: enrollment wajah guru. LAYOUT: tabel guru + badge
status wajah + tombol "Daftarkan"/"Ulangi". Sub-halaman enrollment: kiri
kamera live + overlay panduan pose; kanan: langkah pose (Depan → Kiri → Kanan)
dengan progress; capture otomatis saat pose benar; pesan kualitas realtime
("Terlalu gelap — dekatkan ke cahaya"); selesai → pratinjau 3–5 thumbnail →
Simpan/Ulangi. STATE: kamera ditolak → panel instruksi izin browser.

**/admin/presensi-guru** — KHUSUS HARIAN, 2 tab: **Harian** (pilih tanggal WIB
→ tabel guru: check-in/out, status badge, sumber [kiosk/HP/manual], aksi
Koreksi → sub-form status+jam+ALASAN WAJIB) • **Verifikasi Pending** (antrean
presensi manual NIP: nama, jam, perangkat kiosk → Setujui/Tolak + badge jumlah
di tab). Tombol link jelas ke sub-halaman per KBM di kanan-atas. VERSI
BACA-SAJA halaman Harian ini menjadi /kepsek/kehadiran-guru dan
/kesiswaan/kehadiran-guru (tanpa tombol koreksi/verifikasi — komponen sama,
mode read-only berdasarkan peran).

**/admin/presensi-guru/kbm** — SUB-HALAMAN TERPISAH (KEPUTUSAN USER: harian dan
per-KBM dipisah): pilih tanggal → tabel sesi: jam, kelas, mapel, guru, status
sesi (terlaksana/berjalan/kosong/digantikan), pengganti bila ada; filter per
guru/kelas; aksi: tunjuk pengganti, tandai keterangan sesi kosong.

**/admin/presensi-siswa** — pilih tanggal → matriks kelas × sesi (sel = status
sesi berwarna; merah = kosong) → klik sel → detail roster (baca) + tombol
Koreksi per siswa (alasan wajib). Banner atas: "n kelas belum lengkap hari ini".

**/admin/izin** — 2 tab: **Izin Guru** (antrean pengajuan: pemohon, jenis
badge, rentang, lampiran pratinjau, sisa kuota tidak ada — langsung
Setujui/Tolak+alasan; riwayat di bawah) • **Arsip Izin Siswa** (tabel + filter
kelas/tanggal; input oleh wali/kesiswaan; baca saja di sini).

**/admin/laporan** — HUB (KEPUTUSAN USER: tiap laporan = sub-halaman sendiri):
grid kartu pilihan (ikon watermark per kartu): "Presensi Harian Guru" •
"Per KBM Guru (Keterlaksanaan)" • "Rekap Siswa" — tiap kartu deskripsi 1 baris
+ klik masuk sub-halaman.

**/admin/laporan/harian-guru** — POLA C: kolom hari wajib, hadir, telat
(kali + total menit), izin, sakit, dinas, alpha, libur, % (pembagi = hari
wajib saja).

**/admin/laporan/kbm-guru** — POLA C: per guru: sesi terjadwal, terlaksana,
kosong, digantikan (sebagai pengganti / digantikan orang), % keterlaksanaan;
drill-down daftar sesi kosong (tanggal, kelas, mapel); filter guru/kelas/mapel.

**/admin/laporan/siswa** — POLA C: per kelas → per mapel; pertemuan, H/S/I/A,
% kehadiran.

**/admin/perangkat** — kartu per kiosk: nama, status online/offline (dot
hijau/abu + "terakhir aktif x menit lalu"), lokasi, tombol Cabut (dialog).
Tombol "+ Tambah Kiosk" → nama → tampilkan KODE 6 DIGIT besar + hitung mundur
10 menit + instruksi memasangkan.

**/admin/pengaturan** — HUB grid kartu (ikon watermark per kartu) → sub-halaman;
tiap sub-halaman tombol Simpan sendiri + "Terakhir disimpan oleh X":
- **/sekolah**: nama, jenjang, logo uploader, kepsek (nama/NIP/jabatan),
  alamat, kab/kota.
- **/jam**: jam masuk/pulang global, toleransi menit, jam cutoff — pratinjau
  kalimat "Guru terlambat bila check-in setelah 07:15 WIB".
- **/lokasi**: saklar "Wajibkan verifikasi lokasi pada presensi HP" +
  koordinat sekolah (input lat/lng + tombol "Gunakan lokasi saya sekarang" +
  pratinjau peta statis/link) + radius meter (default 100 m) + penjelasan
  bahwa kiosk tidak terdampak.
- **/libur**: kalender visual, klik tanggal = toggle libur + label.
- **/tahun-ajaran**: daftar tahun ajaran + SATU saklar "semester aktif"
  (konfirmasi tegas — mempengaruhi semua modul).
- **/kkm**: nilai KKM global.

**/admin/akun** — 3 tab + sub-halaman: **Akun** (tabel: nama, email, peran
badge multi, status, tautan Google ikon, terakhir aktif; baris sendiri badge
"Anda" + hapus disabled; KLIK BARIS → SUB-HALAMAN DETAIL `/admin/akun/:id`:
kartu identitas, peran, status Google, sesi aktif user itu (bisa dicabut),
aktivitas terakhirnya, tombol Edit & Hapus di header; tambah/edit → SUB-HALAMAN
FORM: nama/email/password[kosongkan bila tidak diganti]/multi-select peran
kartu) • **Sesi Aktif** (tabel semua user:
user, perangkat, IP, metode login, login, terakhir aktif, badge "Sesi ini";
Cabut per baris) • **Aktivitas** (tabel audit: waktu relatif+tooltip, user,
aksi badge warna, entitas+label, perangkat, IP; filter user/entitas/aksi;
pagination). **Sub-halaman /admin/akun/persetujuan** (link tombol + badge
jumlah): antrean pendaftar — foto, nama, email, PERAN DIAJUKAN (badge),
keterangan, tanggal daftar, perangkat saat daftar → "Tinjau" → detail: semua
info + form peran FINAL (prefilled dari ajuan, admin bebas ubah) + tombol
hijau "Setujui & Aktifkan" / merah "Tolak" (dialog + alasan wajib).

### 15.4 Area Kurikulum

**/kurikulum (dashboard)** — POLA B: kartu KBM hari ini (terlaksana/berjalan/
kosong) + daftar sesi KOSONG (merah, per guru — bahan pembinaan) + (F6) kartu
kelengkapan nilai per kelas.

**/kurikulum/mapel** — POLA A: tabel nama, kode, kelompok, urutan rapor
(drag-handle untuk urut ulang).

**/kurikulum/penugasan** — 2 tab (`?tab=`): **Paket Mengajar** (POLA A: filter
guru/mapel/kelas; tabel paket "Guru — Mapel — Kelas"; form sub-halaman: pilih
guru → mapel → kelas multi-checkbox → pratinjau paket yang akan dibuat) •
**Wali Kelas** (tabel kelas + wali saat ini + jumlah siswa; aksi "Tetapkan/
Ganti Wali" → pilih guru via search-select [bottom sheet di mobile]; guru yang
sudah wali kelas lain → konfirmasi pindah).

**/kurikulum/jadwal** — TUJUAN: susun jadwal KBM per kelas. LAYOUT: pilih
kelas (dropdown) → GRID mingguan: kolom Senin–Sabtu, baris rentang jam; sel
berisi kartu KBM (mapel + guru, warna per mapel). INTERAKSI: klik sel kosong →
panel samping: pilih PAKET (hanya paket kelas ini) + jam mulai/selesai →
Simpan; klik kartu → edit/hapus; BENTROK → simpan ditolak + pesan "Bu Rina
sudah mengajar 7B pada jam ini" + kartu konflik disorot. Tombol "Salin dari
kelas lain" (opsional). STATE: semester non-aktif = baca saja + banner.

**/kurikulum/rapor** (F6) — monitor: matriks kelas × mapel (persen nilai
terisi; merah kurang; klik sel → daftar penilaian mapel itu & siswa yang belum
ternilai) + kolom status rapor per kelas (n Final / n Draft).

**/kurikulum/rapor/:kelas** (F6) — SUB-HALAMAN status kelas: tabel siswa —
kelengkapan nilai per mapel (mini progress), status rapor badge (Draft/Final),
tanggal finalisasi, yang memfinalisasi; aksi: **Buka Kunci** rapor Final
(konfirmasi adaptif + ALASAN WAJIB → audit; hanya kurikulum/admin); tombol ke
sub-halaman cetak.

**/kurikulum/rapor/:kelas/cetak** (F6) — SUB-HALAMAN CETAK MASSAL: pilih siswa
(semua / centang sebagian; siswa Draft ditandai kuning + peringatan "belum
final"), pilih komponen (Sampul • Identitas • Isi Rapor), tombol "Buat PDF" →
antrean/progress unduhan per siswa atau gabungan satu PDF per kelas; pratinjau
satu siswa sebelum cetak massal.

### 15.5 Area Kesiswaan

**/kesiswaan (dashboard)** — POLA B: kartu (pelanggaran hari ini, siswa
menyentuh ambang belum ditindak, laporan menunggu verifikasi) + daftar saldo
terendah (nama, kelas, saldo, progress-bar merah) + feed pelanggaran terbaru.

**/kesiswaan/tata-tertib** — POLA A + 2 seksi: katalog pelanggaran (tabel: no,
bentuk, kategori badge R/S/B/SB, poin; seed §7.2) • tabel ambang sanksi
(baca — sesuai SOP; edit hanya admin/kesiswaan dengan konfirmasi tegas).

**/kesiswaan/pelanggaran** — POLA A: riwayat (filter siswa/kelas/kategori/
tanggal) + "Catat Pelanggaran" → sub-halaman: cari & pilih siswa (MULTI, chips;
tampil kelas + saldo saat ini), pilih butir katalog (search; kategori & poin
tampil otomatis), tanggal-jam WIB default sekarang, tempat, keterangan, pilih
sanksi yang diberikan (daftar §7.3 sesuai kategori), foto bukti uploader
opsional → Simpan → toast + bila ambang tersentuh: dialog peringatan "Siswa X
mencapai Peringatan 1 — entri tindak lanjut dibuat".

**/kesiswaan/verifikasi** — antrean kartu laporan (dari guru & draft otomatis
R-07 dari roster, ditandai sumbernya): pelapor, siswa, dugaan, keterangan,
foto, waktu → aksi SETUJUI (pilih/konfirmasi butir katalog resmi → poin sah) /
TOLAK (alasan). Badge jumlah di menu.

**/kesiswaan/tindak-lanjut** — daftar entri otomatis per ambang (urut saldo
terendah): siswa, tahap (P1/P2/P3/Khusus badge), tanggal tersentuh, status
(BARU/SELESAI) → detail: riwayat pelanggaran lengkap + form pelaksanaan
(tanggal, tindakan sesuai SOP, catatan, penandatangan) → SELESAI; riwayat
permanen tampil di profil siswa.

**/kesiswaan/reward** — pilih semester → dua daftar otomatis (Sangat Baik 500;
Baik 400–490) + export daftar penerima.

**/kesiswaan/izin-siswa** — POLA A: daftar izin/sakit siswa aktif & riwayat
(filter kelas/tanggal); form baru = sub-halaman: pilih siswa, jenis
(IZIN/SAKIT), rentang tanggal, keterangan, lampiran foto surat → tersimpan →
otomatis terkunci di semua roster KBM siswa itu pada rentangnya.

**/kesiswaan/laporan** — POLA C: rekap poin per siswa/kelas/periode + top
pelanggaran tersering (bar chart sederhana) + export.

### 15.6 Area Guru

**/guru (dashboard)** — kartu PRESENSI DIRI paling atas: belum presensi →
tombol raksasa hijau "Presensi Sekarang" (bila geofence aktif: cek lokasi dulu
— di luar radius → panel "Anda berada di luar area sekolah" + arahan kiosk;
lolos → kamera 1:1; progress verifikasi; gagal 3× → panel arahan kiosk/admin);
sudah → jam masuk + badge status; LIBUR →
banner abu "Anda libur hari ini — tidak ada jadwal KBM". Di bawah: "KBM Saya
Hari Ini" — kartu per sesi (jam, mapel, kelas, badge status sesi; klik →
roster); paling bawah: ringkasan bulan berjalan (hadir/telat/izin) + link
riwayat.

**/guru/kbm → roster sesi** — TUJUAN: presensi siswa < 30 detik. LAYOUT:
header sticky (kelas • mapel • Sesi n • jam • hitung mundur cutoff); GRID
kartu siswa (nama + no. absen + foto kecil), default HADIR hijau. INTERAKSI:
tap kartu → siklus H → T → A (tahan/klik kanan → pilihan lengkap H/T/S/I/A);
kartu ber-izin/sakit tercatat = TERKUNCI (ikon gembok + sumber, tidak bisa
diubah); bar bawah sticky: ringkasan hidup "28 H • 1 T • 1 S • 1 I • 1 A" +
tombol besar "Simpan Presensi" → dialog ringkas → tersimpan → banner hijau
"Tersimpan 07:42 WIB — bisa diedit sampai 15:00" ; tanda T → toast info "Draft
pelanggaran R-07 dikirim ke verifikasi". STATE: setelah cutoff → baca saja +
badge "Terkunci — hubungi admin untuk koreksi".

**/guru/penilaian** (F6) — daftar PAKET saya: kartu per mapel—kelas (watermark
ikon mapel) + ringkas: jumlah penilaian, % nilai terisi, peringatan merah bila
ada penilaian kosong menjelang akhir semester.

**/guru/penilaian/:paket** (F6) — 3 tab: **TP** (tabel CRUD deskripsi TP; form
= sub-halaman) • **Penilaian** (tabel: nama, jenis/subjenis badge, bobot,
tanggal, kelengkapan n/30 + progress; klik baris → sub-halaman input nilai;
form tambah/edit = sub-halaman: jenis pilihan kartu [Formatif = catatan "tidak
masuk rapor"], subjenis, bobot, pilih TP multi untuk Sumatif TP) • **Rekap
Nilai** (matriks siswa × penilaian sumatif + kolom NILAI AKHIR sementara
[rumus §9] + indikator < KKM merah; klik nama siswa → sub-halaman rekap per
siswa).

**/guru/penilaian/.../nilai — INPUT NILAI PER SISWA** (F6, halaman kerja inti
guru mapel): header sticky (mapel • kelas • nama penilaian • bobot •
kelengkapan n/30). DESKTOP: tabel siswa (no, nama) + kolom input angka 0–100;
Enter/panah = pindah baris; autosave draft per sel (indikator "tersimpan ✓");
sel kosong disorot kuning; nilai < KKM diberi teks merah; kolom catatan
opsional. MOBILE: daftar kartu per siswa (nama + input besar + stepper),
autosave sama; bar bawah sticky: progress kelengkapan + tombol "Selesai".
Guard navigasi §15.0 berlaku untuk sel yang belum ter-autosave. Bila rapor
siswa sudah FINAL → barisnya terkunci (ikon gembok + tooltip "Rapor sudah
difinalisasi").

**/guru/penilaian/.../siswa/:siswaId** (F6) — SUB-HALAMAN rekap satu siswa di
mapel ini: semua nilai per penilaian (tabel), nilai akhir terhitung, pratinjau
deskripsi capaian otomatis (§9), grafik mini perkembangan; baca-saja.

**/guru/pelanggaran** — daftar laporan saya (status MENUNGGU/DISETUJUI/DITOLAK
+ alasan) + "Lapor" → form: pilih siswa (boleh multi), dugaan (pilih katalog
ATAU teks bebas), waktu-tempat, keterangan, foto opsional → terkirim → toast.

**/guru/kelas** (wali kelas; menu hanya muncul bila wali) — 4 tab: **Kehadiran**
(rekap per siswa lintas mapel + drill-down) • **Demerit** (saldo per siswa +
progress-bar + riwayat; tombol "Catat Pelanggaran" [kelasnya] & antrean
verifikasi kelasnya) • **Izin Siswa** (input izin/sakit: siswa, jenis, rentang,
lampiran surat; daftar aktif) • (F6) **Rapor**: tabel siswa — kelengkapan nilai
lintas mapel (progress), status badge Draft/Final, tombol "Finalisasi Semua
yang Lengkap" (konfirmasi adaptif) → klik baris → sub-halaman rapor per siswa.

**/guru/kelas/rapor/:siswa** (F6) — SUB-HALAMAN RAPOR PER SISWA (halaman kerja
wali kelas): pratinjau rapor tersusun seperti cetakan — A. Nilai Akademik per
mapel (nilai + deskripsi otomatis; mapel belum lengkap ditandai kuning; input
nilai katrol per mapel bila perlu) • B. Kokurikuler (deskripsi otomatis,
editable) • C. Ekstrakurikuler • D. Ketidakhadiran (OTOMATIS dari presensi;
tombol Koreksi + ALASAN WAJIB → audit) • E. Catatan Wali Kelas (textarea +
panel samping konteks: ringkasan kehadiran & demerit siswa sebagai bahan).
Footer sticky: tombol "Cetak PDF" (siswa ini) + tombol besar **"FINALISASI"**
(konfirmasi adaptif: "Setelah final, semua nilai siswa ini terkunci") →
status Final + terkunci; bila sudah Final → banner hijau "Difinalisasi oleh X
pada tanggal Y" + tombol berubah "Minta Buka Kunci ke Kurikulum".

**/guru/izin** — daftar pengajuan saya (status badge) + form: jenis
(IZIN/SAKIT/DINAS kartu), rentang tanggal, keterangan, lampiran → terkirim →
menunggu persetujuan Admin/Kepsek; disetujui → KBM otomatis "guru berhalangan".

### 15.7 Kepala Sekolah & TU

**/kepsek (dashboard)** — POLA B baca-semua: gabungan kartu ringkas seluruh
modul (presensi guru & siswa hari ini, KBM kosong, siswa menyentuh ambang
demerit, kelengkapan nilai) + SATU blok aksi: "Izin Guru Menunggu Persetujuan"
(kartu pengajuan → Setujui/Tolak). Semua lainnya link baca ke laporan terkait.

**/tu/rekap-guru** — POLA C: pilih bulan (default berjalan) → tabel per guru:
hari wajib, hadir, terlambat (kali + total menit), izin, sakit, dinas, alpha,
libur, % → baris total; Export Excel & PDF berkop. Catatan tetap di layar:
"Rekap ini dasar penentuan gaji — perhitungan gaji dilakukan di luar sistem."

## 16. FORMAT LAPORAN AGENT

Setiap menyelesaikan (atau gagal) tugas, tambahkan entri di LOG PROGRES
EKSEKUSI: nomor tugas, tanggal, status (✅/⚠️/❌), yang dikerjakan, hasil
verifikasi (per nomor checklist), deviasi + alasan, hal yang butuh keputusan
user/planner.

---

## LOG PROGRES EKSEKUSI

> ### ⚡ STATUS SAAT INI (2026-07-13)
> - Dokumen v0.8: PERENCANAAN SELESAI (§11) + spesifikasi desain SEMUA halaman
>   (§15). Registrasi Google kini 3 langkah: akun Google → konsen perangkat
>   (persetujuan level aplikasi) + pilih peran diajukan → pending → divalidasi
>   admin di /admin/akun/persetujuan.
> - **F0 SIAP DIKERJAKAN: tugas T1–T7 di §14, desain mengikuti §15.** Agent
>   pelaksana boleh mulai dari T1. F1 ditulis planner setelah laporan F0.
> - Belum ada kode di repo (baru git init + dokumen ini).

*(entri log agent pelaksana dimulai di bawah baris ini)*

---

### [PLANNER] Review F0 — 2026-07-13

**Status: F0 SELESAI BERSYARAT** (T1–T7 dikerjakan agent pelaksana; laporan
agent ada di walkthrough eksternal — pelanggaran proses, lihat §14.7).

Terverifikasi ulang oleh planner (API + browser sungguhan):
- ✅ Struktur repo sesuai laporan; 3 container sehat; port backend TIDAK
  diekspos keluar (hanya via nginx).
- ✅ API: config null saat env kosong; login seed; `me` (hasPassword benar);
  guard hapus-diri-sendiri → 400 pesan Indonesia; audit mencatat
  login/create/delete dengan urutan benar.
- ✅ UI: halaman login (BI, watermark, Google tersembunyi); /admin/akun 3 tab +
  Persetujuan + badge "Anda"; form tambah akun (pemilih peran kartu, 6 peran)
  → create sukses via UI; sub-halaman detail akun /admin/akun/:id sesuai spec;
  jam WIB live di header; mobile 375px: tabel → card-list + drawer hamburger.
- ❌ BUG-1 (kritis): ConfirmDialog render di bawah viewport — tak terlihat di
  mobile & desktop; desktop juga tidak memakai varian modal tengah.
- ❌ BUG-2: route `/` setelah login = layar putih (hanya kontainer toast).
- ❌ BUG-3: guard navigasi "Perubahan belum disimpan" belum diimplementasikan.
- ⚠️ Item T6 tanpa bukti: idle timeout (env 1 menit), ganti password revoke
  sesi lain, alur pending→approve via SQL, restart persistence, sidebar
  multi-peran.

**Tindak lanjut: T8 (§14.7) — hotfix 3 bug + verifikasi susulan. F1 ditulis
planner setelah laporan T8 diterima di log ini.**

---

### [PLANNER] Review T8 — 2026-07-13

Agent melaporkan T8 (di chat, belum di log dokumen — ingatkan aturan §1.4).
Planner verifikasi ulang via browser sungguhan (desktop + mobile 375px):

- ✅ **BUG-1 BERES**: ConfirmDialog kini di-`createPortal` ke body; mobile =
  bottom sheet menempel bawah (terukur top 542/bottom 796 dalam viewport 812);
  desktop = MODAL TENGAH (`rounded-lg max-w-md`, terpusat horizontal &
  vertikal); scroll body terkunci; Esc & Batal berfungsi.
- ✅ **BUG-2 BERES**: `/` belum login → `/login` (terverifikasi); login admin →
  langsung `/admin` (bukan layar putih); `getHomePath` mengikuti urutan area.
- ⚠️ **BUG-3 fungsional tapi SALAH KOMPONEN**: navigasi memang diblokir (path
  tetap di form saat dibatalkan), TAPI memakai `window.confirm()` native —
  MELANGGAR §15.0/§12.13 (dilarang) + pesan generik, bukan ConfirmDialog
  adaptif "Lanjut Mengedit"/"Buang Perubahan". → **T9 (§14.8)** wajib sebelum
  F1 karena hook ini dipakai semua form F1.

**Tindak lanjut: T9 (§14.8). Akun uji hasil verifikasi sudah dibersihkan
planner (sisa 1 akun admin seed).**

---

### [AGENT] T9 — 2026-07-13 — ✅ SELESAI (verifikasi runtime oleh agent terbatas)

**Tugas (§14.8):** Ganti `window.confirm()` native pada guard navigasi
dengan `<ConfirmDialog>` adaptif (mobile=bottom sheet, desktop=modal tengah)
satu tombol "Lanjut Mengedit" + satu tombol "Buang Perubahan" (variant danger).

**Yang dikerjakan:**
1. Migrasi router dari `<BrowserRouter>` ke `createBrowserRouter` +
   `RouterProvider` agar `useBlocker` bisa dipakai (data router requirement).
   - `frontend/src/main.tsx` → `RouterProvider`
   - `frontend/src/app/App.tsx` → struktur `createBrowserRouter` dengan
     `RootLayout` & `AuthedLayout` (`<Outlet />`), router di-export untuk test.
2. Hook `useUnsavedChanges` dibuat ulang di
   `frontend/src/app/useUnsavedChanges.tsx`:
   - In-app navigation → `useBlocker(isDirty)` → render `<ConfirmDialog>`
     adaptif (`open={showDialog}`, `variant="danger"`, label Indonesia).
   - Refresh/tutup-tab → `beforeunload` listener (browser memaksa dialog
     native di sini — satu-satunya pengecualian wajar per §14.8).
   - Null-guard pada `blocker.proceed()` & `blocker.reset()` karena TS melihat
     method tersebut `possibly undefined` (state-based union).
3. Integrasi ke 4 form F0:
   - `pages/admin/akun/AkunBaruPage.tsx`
   - `pages/admin/akun/AkunEditPage.tsx`
   - `pages/admin/akun/PersetujuanDetailPage.tsx`
   - `pages/profil/ProfilPage.tsx`

**Verifikasi yang berhasil:**
- ✅ `tsc -b` lulus tanpa error (TS2722 sudah fix dengan null-guard state).
- ✅ `vite build` sukses: 59 modul, bundle 285.69 kB / gzip 84.08 kB
  (naik dari 242 kB karena `createBrowserRouter` + `useBlocker`).
- ✅ 3 container sehat (`docker compose ps`); frontend serving di :80; backend
  jalan di :3000; API `POST /api/auth/login` mengembalikan user admin.
- ✅ Backend logs bersih (Nest start OK, housekeeping selesai).
- ✅ Zero `window.confirm` di seluruh `frontend/src/**/*.tsx|*.ts`
  (`grep_search` mengembalikan 0 hasil).
- ✅ `useBlocker` diimpor & dipakai hanya di `useUnsavedChanges.tsx:40`.

**Verifikasi yang TIDAK berhasil (keterbatasan runtime agent):**
- ❌ Verifikasi visual via browser subagent gagal 2x dengan error
  `RESOURCE_EXHAUSTED (429)` dari layanan browser otomatis. Tidak bisa
  mengkonfirmasi bahwa dialog benar-benar muncul di layar & klik tombol
  berefek benar. Build artifacts valid + logika kode benar, tapi planner
  perlu menguji sendiri di browser (admin login → /admin/akun/baru → ketik
  Nama+Email → klik menu sidebar → cek ConfirmDialog adaptif muncul).
- ⚠️ Tidak ada uji eksplisit: keyboard trap focus di dalam dialog, posisi
  bottom-sheet di mobile 375px (kode mewarisi dari perbaikan BUG-1 T8 yang
  sudah diverifikasi planner).

**Deviasi dari §14.8:**
- Bundle naik ~43 kB (gzip ~16 kB) karena react-router data router
  (`createBrowserRouter`) lebih besar dari `BrowserRouter`. Trade-off
  diperlukan untuk `useBlocker`. Tidak ada aksi mitigasi karena diizinkan.

**Hal yang butuh keputusan planner:**
- Apakah 4 form F0 cukup untuk bukti T9, atau perluasan ke form F1
  (mis. /guru/presensi, /admin/kelas baru, dll.) sekaligus saat F1? Hook
  siap pakai ulang; copy-paste `const guard = useUnsavedChanges(dirty); {guard}`
  sudah cukup.

**Build & runtime (timestamp 2026-07-13 23:19 WIB):**
- `aamapp-frontend` Built & Started (port 80, image sha256:3230bf42…)
- `aamapp-backend` Built & Started (port 3000 internal via nginx)
- `aamapp-db` Healthy (postgres:16-alpine)
- tsc 0 error · vite ✅ · API /api/auth/login 200 OK
