# Hierarki Halaman V2 — Sidebar vs Sub Halaman

> Keputusan pemilik produk (2026-07-19f). Menggantikan struktur menu di
> IA-MIGRATION-MAP LAMPIRAN A. Kepemilikan area TIDAK berubah — yang berubah
> adalah mana yang jadi HALAMAN UTAMA (muncul di sidebar) dan mana yang jadi
> SUB HALAMAN (hilang dari sidebar).

## ATURAN GLOBAL (berlaku semua area)

1. **Sub halaman DILARANG muncul di menu sidebar.** Tanpa kecuali.
2. Jalan masuk ke sub halaman = **SubPageLinks** dari halaman induknya
   (desktop: hyperlink; mobile: tombol).
3. Jalan kembali = **BackLink** adaptif (desktop: tautan teks atas; mobile:
   tombol bawah) menunjuk ke **induk langsung**, bukan ke dashboard area.
4. Sub-dari-sub diperbolehkan; rantai BackLink mengikuti induk langsung.

---

## ADMIN

**Sidebar:** Dashboard · Akun

```
Akun
└── Persetujuan Akun        (sub — HAPUS dari sidebar)
└── Sesi Aktif              (sub)
    └── Aktivitas           (sub dari Sesi Aktif)
```

- **Dashboard admin hanya menampilkan AKTIVITAS AKUN.** Buang semua statistik
  kehadiran guru/siswa/KBM dari dashboard admin (StatCard kehadiran, grid status
  guru, dsb) — itu milik kesiswaan & TU.
- **Profil Sekolah PINDAH ke Pengaturan milik TU** (revisi 2026-07-20). Admin
  menyusut jadi dua item. Konsekuensi otorisasi: TU kini berwenang mengubah
  profil sekolah → endpoint pengaturan sekolah `@Roles('tu','admin')`.

## KURIKULUM

**Sidebar:** Dashboard · Data Orang · Kelas · Mata Pelajaran

```
Kelas
└── Wali Kelas                      (sub)

Mata Pelajaran
├── Penugasan Mapel                 (sub)
│   └── Jadwal KBM                  (sub dari Penugasan)
├── Kokurikuler                     (sub)
├── Ekstrakurikuler                 (sub)
└── Tahun Ajaran & KKM              (sub — DUA HALAMAN DIGABUNG JADI SATU)
```

- Tahun Ajaran dan KKM **dilebur jadi satu halaman**, lalu jadi sub Mata Pelajaran.

## KESISWAAN

**Sidebar:** Dashboard · Laporan Demerit · Presensi Siswa · Presensi Guru

```
Laporan Demerit
└── Tata Tertib                     (sub)
    └── Pelanggaran                 (sub dari Tata Tertib)
        ├── Verifikasi              (sub dari Pelanggaran)
        ├── Tindak Lanjut           (sub dari Pelanggaran)
        └── Reward                  (sub dari Pelanggaran)

Presensi Siswa
└── Laporan Kehadiran Siswa         (sub)

Presensi Guru
└── Izin Guru                       (sub)
```

- **Dashboard kesiswaan** = monitoring kehadiran **guru DAN siswa** + monitoring
  demerit siswa secara keseluruhan.

## TU

**Sidebar:** Dashboard · Presensi Guru · Pengaturan

```
Presensi Guru
├── Rekap Guru                      (sub)
├── Laporan Harian Guru             (sub)
└── Izin Guru                       (sub)

Pengaturan                          (halaman utama tersendiri)
├── Jam KBM                         (sub)
├── Hari Libur                      (sub)
├── Lokasi Presensi                 (sub)
└── Profil Sekolah                  (sub — pindahan dari admin, revisi 2026-07-20)
```

- **Dashboard TU** = monitoring **kehadiran guru saja**, dalam bentuk stats.
  (Halaman baru — TU sebelumnya mendarat langsung di Rekap Guru.)

---

## Catatan path

Path kanonik `/tu/presensi-guru` dan `/tu/izin-guru` tetap dipakai bersama oleh
menu KESISWAAN dan TU (satu komponen, satu rute, `RequireRole` menerima kedua
peran). Yang berubah hanya posisinya di hierarki: kini Izin Guru = sub dari
Presensi Guru di kedua area.

## Keputusan otorisasi — koreksi presensi siswa

**Mengoreksi presensi siswa adalah hak MURNI guru pengampu.** Kesiswaan, TU,
kepsek, dan admin **tidak boleh** mengoreksi — meskipun kepemilikan menu
"kehadiran siswa" ada di area KESISWAAN (mereka boleh MELIHAT/monitoring, tidak
mengubah). Endpoint roster presensi tetap `@Roles('guru')`
(`presensi.controller.ts:28,34,44,54,71`).

Ini keputusan sengaja, **bukan kelalaian**. Jangan menambah peran di endpoint
tersebut. Bila ada spec yang gagal 403 karena login sebagai admin, yang salah
adalah SPEC-nya — perbaiki agar login sebagai guru pengampu jadwal tersebut.
Spec lama lolos hanya karena bypass admin-superuser di `roles.guard.ts` yang
sudah dihapus (keputusan akses ketat: area guru terkunci ke peran guru).

## Regresi yang harus dikembalikan

1. `menu.ts` — "Profil Sekolah" dikembalikan ke sidebar admin.
2. `guru.service.ts:107,131` — duplikat NIP kembali ke **409 Conflict**
   (`ConflictException`), bukan 422. Baris 149/160 di file yang sama masih 409
   untuk konflik lain, jadi 422 membuat API tidak konsisten. Yang salah adalah
   daftar `expected` di spec `rbac-negatif` — perbaiki spec-nya.
3. `App.tsx` — cabut rute lama `/admin/kelas/:id` yang dihidupkan ulang demi
   spec `backlink-adaptif`; perbaiki spec-nya agar mengharap `/kurikulum/kelas/:id`.
