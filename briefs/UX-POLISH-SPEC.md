# UX-POLISH-SPEC — konsistensi pasca-QA (kontrak dikunci planner 2026-07-19)

> Temuan QA user + keputusan. Aturan FORMAT sudah ada di **SPEC-KANON Zona 2A**
> (sidebar datar, satu tombol aksi, SaveSuccess, AdaptiveSelect, PageContainer,
> portal dropdown, BackLink adaptif, SubPageLinks, card watermark). Spec ini =
> KEPUTUSAN BARU + perintah TERAPKAN aturan itu di seluruh app. Planner-owned.

## A. AKSES PER PERAN — KETAT (frontend + backend) [keputusan user]
- **Admin melihat: Admin + Kurikulum + Kesiswaan + TU.** TIDAK area Guru.
- **Area GURU dikunci ke peran `guru`** — bahkan admin TANPA peran guru tak
  boleh akses (halaman & API). "Milik guru" = KBM hari ini, roster, penilaian,
  rapor (input wali), izin diri, daftar wajah, presensi sekarang.
- Butuh banyak area → beri akun **banyak peran** (multi-role; sudah didukung
  RoleSelector + menu gabung). TAMBAH akun contoh multi-role.
- **Frontend:** `menu.ts` `ADMIN_EXTRA_AREAS = ['kurikulum','kesiswaan','tu']`
  (BUANG 'guru'). `RequireRole` di App.tsx: hapus `'admin'` yang cuma superuser
  di route milik-guru; hanya cantumkan peran pemilik sah.
- **Backend KETAT:** `@Roles` — endpoint milik-guru JANGAN sertakan 'admin'
  hanya sebagai superuser (admin panggil API guru → **403**). Endpoint yang
  memang dimiliki bersama (mis. laporan/izin oleh admin+kepsek) tetap.

## B. HAPUS FITUR KIOSK (F3b) SELURUHNYA [keputusan user]
Presensi guru = **self-service per guru** (F3a) saja; TIDAK ada scanner bersama.
- **Frontend:** buang menu "Perangkat Kiosk" & "Verifikasi Presensi"; route
  `/kiosk`, `/admin/perangkat`, `/admin/presensi-guru-pending`; halaman
  `pages/kiosk/**`, `pages/admin/kiosk/**`; import KioskApp; method client.ts
  kiosk; spec e2e kiosk (`kiosk-*.spec.ts`).
- **Backend:** buang modul `backend/src/kiosk/**` (device_kiosk, DeviceAuthGuard)
  + registrasi di app.module + endpoint pending/verifikasi kiosk. Kolom
  `perluVerifikasi` di presensi_harian_guru boleh dibiarkan (tak dipakai) atau
  dibuang — pilih yang aman.
- Pastikan build + suite tetap hijau setelah pembuangan.

## C. HIERARKI HALAMAN — sidebar utama vs sub-halaman [keputusan user]
Sidebar = hub/area utama; sisanya SUB-HALAMAN via SubPageLinks + BackLink.
- **Admin sidebar (6):** Dashboard · Data Orang · Kelas · **Laporan** ·
  Pengaturan · Akun.
- **Laporan = HUB** → sub-halaman (SubPageLinks/kartu, BackLink kembali):
  Presensi Siswa (real-time), Presensi Guru (real-time), Izin Guru, Laporan
  Harian Guru, Keterlaksanaan KBM, Laporan Siswa.
  (Verifikasi Presensi HILANG bersama kiosk.)
- Pindahkan item lama Presensi Siswa / Presensi Guru / Izin Guru dari sidebar
  → jadi sub-halaman Laporan. Kepsek: samakan (Izin Guru sub Laporan; dashboard/
  laporan tetap).

## D. WAJAH — guru enroll, admin VALIDASI di detail guru [keputusan user]
- Guru daftar wajah sendiri (`/guru/wajah`) → status **MENUNGGU_VALIDASI**.
- **Admin validasi (approve/tolak) DI HALAMAN DETAIL GURU**
  (`/admin/orang/guru/:id`), BUKAN halaman terpisah. Buang halaman enroll
  admin `/admin/wajah` (list boleh jadi bagian detail guru; tak ada wizard enroll
  oleh admin).
- **Backend:** tambah status validasi wajah pada guru (mis. kolom
  `faceStatus`: 'BELUM'|'MENUNGGU'|'TERVALIDASI'|'DITOLAK'), set MENUNGGU saat
  guru enroll; endpoint admin `PATCH /api/admin/guru/:id/wajah/validasi`
  `{aksi:'terima'|'tolak'}`. Scan hanya cocok bila TERVALIDASI (opsional tapi
  disarankan).

## E. NAVIGASI KONSISTEN — terapkan aturan SPEC-KANON di SEMUA halaman
- Tiap HUB/halaman induk → **SubPageLinks** (desktop hyperlink, mobile tombol)
  ke sub-halamannya.
- Tiap SUB-halaman/detail/form → **BackLink adaptif** (desktop teks atas,
  mobile tombol bawah). AUDIT semua halaman; pasang yang belum.
- **TANPA TAB** di mana pun (§ aturan lama) — pakai sub-halaman ber-route.

## F. CARD WATERMARK — semua kartu pakai prop `icon`
- `Card` sudah punya watermark ikon miring kanan-bawah via prop `icon`. AUDIT
  semua kartu (utama: StatCard dashboard, kartu statistik) — yang menaruh ikon
  sebagai lingkaran/di dalam → pindah pakai prop `icon` Card agar watermark
  konsisten.

## G. NOL EMOJI DI UI
- Audit toast/badge/teks/tombol — ganti semua emoji/emoticon → ikon standar
  `material-symbols-outlined`.

## H. BUG: DESKTOP MASIH PAKAI BOTTOM SHEET
- Bottom sheet HANYA mobile; desktop = dropdown/modal (anchored). AUDIT semua
  halaman (mulai **detail kelas**) — komponen adaptif (PageMenu/AdaptiveSelect/
  dialog konfirmasi) wajib render dropdown/modal di ≥md, bottom sheet di <md.

## I. BUG SISTEMIK: konten paling bawah TERTUTUP elemen fixed bawah [keputusan user 2026-07-21]
Di mobile, hampir SEMUA halaman punya tombol **BackLink** (dan/atau bar aksi/
Simpan) yang fixed/sticky di bawah → komponen paling bawah (kartu / tabel /
tombol) tertutup olehnya dan tak bisa diakses. Ini KETIGA kalinya kelas bug ini
muncul (form Simpan-bar 0c, dsb.) → perbaiki SISTEMIK, bukan per-halaman:
- Kontainer scroll halaman WAJIB menyediakan **padding-bawah = tinggi elemen
  fixed bawah + `env(safe-area-inset-bottom)` + jarak nyaman (≥16px)** sehingga
  konten terakhir selalu tampil penuh DI ATAS tombol Kembali/bar.
- Jadikan KONTRAK di komponen bersama: `PageContainer` (sudah punya `bottomBar`)
  harus juga memesan ruang untuk **BackLink mobile** — BackLink adaptif ikut
  menyumbang tinggi yang dipesan. Tidak boleh ada halaman yang memasang
  BackLink/bottom-bar tanpa reservasi ruang ini.
- AUDIT SEMUA halaman mobile (375px): scroll sampai mentok → elemen terakhir
  (kartu/tabel/tombol) tampak utuh dengan jarak, TIDAK tertutup tombol Kembali.

## J. TABEL → CARD-LIST → SUB-DETAIL (ambang keramaian data) [keputusan user 2026-07-21]
Aturan induk (tegakkan ulang + ambang baru); tujuannya: tak ada tabel/kartu
yang sesak.
1. **Mobile: JANGAN tabel data mentah → CARD-LIST** (aturan lama, banyak halaman
   belum patuh — AUDIT & terapkan menyeluruh).
2. **AMBANG SUB-DETAIL — tabel > ~4 kolom data:** bila sebuah daftar butuh LEBIH
   DARI 3–4 kolom data untuk satu baris, baris/kartu itu jadi **RINGKASAN yang
   BISA DIKLIK → menuju HALAMAN SUB-DETAIL yang relevan** (berlaku desktop &
   mobile). Tabel/kartu hanya menampilkan 2–3 kolom identitas terpenting; sisa
   kolom pindah ke halaman sub-detail. Bila halaman sub-detail relevan belum
   ada → **BUATKAN** (konteks sesuai datanya).
   - Contoh (dari user): **Kehadiran Guru** kolomnya > 3–4 (nama, status, jam
     masuk, jam pulang, menit telat, sumber, …) → daftar cukup tampil
     nama + status (+ jam) → klik → sub-detail kehadiran guru itu (rincian
     lengkap hari/periode tsb).
3. **Mobile — kartu > 3 baris data:** bila satu kartu perlu LEBIH DARI TIGA
   baris/field data, JANGAN jejalkan → tampilkan ringkasan ≤3 field + **klik →
   halaman sub-detail** relevan.
4. Sub-detail memakai pola detail yang sudah ada (mis. `/admin/orang/guru/:id`)
   bila cocok; untuk daftar tipe-laporan yang belum punya detail → buat route
   sub-detail baru (BackLink + konteks jelas). Butuh data yang belum ada di
   respons list → minta endpoint detail (koordinasi AG-2).

## PEMBAGIAN WILAYAH (difase agar rapi)
- **AG-2 (backend)** — UX-POLISH-BE: (A) `@Roles` ketat (buang admin-superuser
  di endpoint milik-guru) • (B) hapus modul kiosk + registrasi • (D) status
  validasi wajah + endpoint validasi admin. Boot-verify + e2e (admin→403 di
  API guru; wajah pending→validasi). JANGAN sentuh frontend.
- **AG-1 (frontend)** — UX-POLISH-FE (boleh dipecah 2 gelombang):
  Gel-1 (struktur): (A) ADMIN_EXTRA_AREAS + RequireRole • (B) buang frontend
  kiosk • (C) hierarki: menu 6-item + Laporan hub + pindah presensi/izin jadi
  sub + SubPageLinks • (D) validasi wajah di detail guru.
  Gel-2 (polish): (E) BackLink/SubPageLinks audit semua halaman • (F) card
  watermark • (G) emoji→ikon • (H) desktop bottom-sheet fix • **(I) fix
  sistemik konten-tertutup-elemen-bawah (reservasi ruang di PageContainer +
  BackLink) — AUDIT semua halaman mobile** • **(J) card-list mobile menyeluruh
  + ambang sub-detail (tabel >3–4 kolom / kartu >3 baris → halaman sub-detail;
  buat sub-detail baru bila perlu, mis. Kehadiran Guru).**
  Tiap gelombang: tsc + e2e hijau; e2e MANDIRI. (I) & (J) prioritas tinggi —
  keluhan langsung user; (J) yang butuh endpoint detail → koordinasi AG-2.

## Aturan wajib: patuhi SPEC-KANON Zona 2A (komponen v0.12.x) • §12.15/16/17 •
e2e = gerbang (spec mandiri) • klaim tugas • APPEND laporan • gerbang e2e
deterministik (spec presensi skip hari Minggu sudah ada).
