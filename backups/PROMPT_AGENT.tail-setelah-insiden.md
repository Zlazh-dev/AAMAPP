
### [AGENT-OPS] OPS-4 — DIKERJAKAN

### [AGENT-T16] T16-SPRINT lanjutan — DIKERJAKAN

### [AGENT-T16] T16 — 2026-07-16

> **Catatan penting sebelum laporan ini ditulis**: file `PROMPT_AGENT.md`
> ditemukan TERTIMPA (dari ~6114 baris kanon menjadi 2 baris) oleh proses
> lain sebelum sesi ini dimulai. Repo git belum pernah commit sehingga
> tidak ada riwayat untuk restore. Satu-satunya salinan lama yang
> ditemukan (99.900 byte, 2026-07-13, sudah usang/pra-T16) ada di
> `C:\Users\ufiaz\AppData\Local\Claude-3p\local-agent-mode-sessions\f1a7388c\00000000\local_768c3f77-7e8d-4750-aee7-e434b39fba99\uploads\PROMPT_AGENT.md`.
> Sesi ini bekerja dari `briefs/BRIEF-AGENT1-T16.md` sesuai instruksi
> planner dan TIDAK mencoba merekonstruksi isi lama — perlu keputusan
> user/planner apakah akan memulihkan kanon dari salinan usang tsb atau
> menulis ulang dari nol berbasis kondisi kode saat ini.

**Hasil per poin (1–15):**

1. `q=` daftar siswa (nama\|nis\|nisn ILIKE OR): sudah ada di
   `siswa.service.ts` sebelumnya; ditambahkan assertion cari-via-NIS di
   `siswa-crud.spec.ts` — **lolos**.
2. Sel matriks tersisa dilengkapi: `jadwal-crud.spec.ts` (slot+bentrok
   kelas/guru+hapus, mobile pemilih hari), `pengaturan.spec.ts` (5 sub +
   hub), `tahun-ajaran.spec.ts`, `akun.spec.ts`, dan spec kecil
   `libur-nasional-banner.spec.ts` (conditional-skip bila egress
   diblokir/tidak ada libur baru) — **semua lolos/skip terdokumentasi**.
3. FRESH START (`docker compose down -v` → `up -d --build`) → full suite
   dijalankan 2× berturut dari DB kosong: **36 passed, 2 skipped**, 0
   gagal, kedua kali identik.
4. Checklist T16 via API (`scratch/t16-checklist.mjs`): TA 2026/2027
   Sem1+aktifkan, 3 mapel, 4 guru, 6 siswa, 2 kelas, wali+force 409,
   nonaktifkan siswa, paket 1 guru 2 kelas+duplikat 409+ganti guru, 3
   sesi jadwal+bentrok kelas 409+bentrok guru lintas kelas 409,
   pengaturan 6 sub endpoint hidup, akun uji kurikulum+guru dengan RBAC
   negatif (kurikulum 403 POST guru; guru 403 semua endpoint tulis) —
   **31/31 assertion lolos**. Import wizard xlsx (3 valid+2 rusak →
   preview error per baris → commit {tersimpan,dilewati} → audit Bahasa
   Indonesia) sudah tercakup `import-wizard.spec.ts` (lolos).
5. Bersih-bersih data uji: akun uji kurikulum & guru dihapus, siswa/
   kelas/guru/mapel/jadwal/penugasan uji dihapus; TA 2026/2027 Sem 1
   dibiarkan aktif (jadi TA satu-satunya di sistem, tidak ada TA lama
   untuk dikembalikan) — `activity_logs` tidak disentuh. README.md
   diperbarui (struktur e2e gelombang2 + status suite).
6. Laporan final ini.

**Poin 12 & 15**: menunggu QA user (perlu verifikasi visual manusia
untuk AdaptiveSelect z-index & BottomSheet mobile — otomatis sudah
lolos di `ui-desktop.spec.ts` / `ui-mobile.mobile.spec.ts` tapi
penilaian "terpotong secara visual" tetap butuh mata manusia).

**Tabel matriks (entitas × aksi → spec):**

| Entitas | Tambah | Edit | Hapus | Assign/Lainnya |
|---|---|---|---|---|
| Siswa | siswa-crud.spec.ts | siswa-crud.spec.ts | siswa-crud.spec.ts | filter-bar.spec.ts (cari q=) |
| Guru | guru-crud.spec.ts | guru-crud.spec.ts | guru-crud.spec.ts (409 NIP) | — |
| Kelas | kelas-crud.spec.ts | kelas-crud.spec.ts (auto-fase) | kelas-crud.spec.ts (409 siswa aktif) | wali-force.spec.ts, kelas-crud.spec.ts (wali force) |
| Mapel | mapel-crud.spec.ts | mapel-crud.spec.ts | mapel-crud.spec.ts (409 dipakai) | — |
| Penugasan | penugasan-crud.spec.ts | penugasan-crud.spec.ts (ganti guru) | penugasan-crud.spec.ts (409 dipakai jadwal) | multi-checkbox.spec.ts |
| Jadwal KBM | jadwal-crud.spec.ts | jadwal-crud.spec.ts | jadwal-crud.spec.ts | jadwal-mobile.mobile.spec.ts (bentrok kelas/guru 409) |
| Libur | libur-crud.spec.ts, libur-rentang.spec.ts | — | libur-crud.spec.ts | libur-seleksi.spec.ts, libur-nasional-banner.spec.ts |
| Tahun Ajaran | tahun-ajaran.spec.ts | — | tahun-ajaran.spec.ts (409 aktif via API) | tahun-ajaran.spec.ts (aktifkan, ConfirmDialog) |
| Akun | akun.spec.ts | akun.spec.ts (ubah peran) | akun.spec.ts (cabut sesi→hilang) | cabut-sesi.spec.ts |
| Pengaturan | — | pengaturan.spec.ts (5 sub) | — | pengaturan.spec.ts (hub navigasi) |
| Import Wizard | import-wizard.spec.ts | — | — | — |
| RBAC | — | — | — | rbac-negatif.spec.ts |

**Daftar chunk build `vite build`**: belum dijalankan pada sesi ini
(tidak diminta secara eksplisit oleh brief; dev server dipakai untuk
seluruh verifikasi). Jalankan `npm run build` di `frontend/` bila
laporan chunk build produksi dibutuhkan.

**Daftar bug ditemukan-diperbaiki sepanjang T16 (sesi ini):**
- Tidak ada bug baru ditemukan pada kode aplikasi selama sesi ini —
  seluruh "kegagalan" awal berasal dari skrip uji checklist
  (`scratch/t16-checklist.mjs`) sendiri, bukan backend:
  - Kredensial login skrip salah (memakai email/password contoh,
    bukan seed asli `admin@aamapp.sch.id` / `admin12345`).
  - Nama field token salah diasumsikan `token`, padahal API
    mengembalikan `accessToken`.
  - Endpoint wali kelas diasumsikan `PATCH /admin/kelas/:id`, padahal
    endpoint sebenarnya `PATCH /admin/kelas/:id/wali`.
  - Body jadwal diasumsikan `hari` string ('SENIN') + `kelasId`,
    padahal skema asli `hari` integer 1–6 dan kelas diturunkan dari
    `penugasanId`.
  - Endpoint pengaturan diasumsikan di bawah `/kurikulum/pengaturan/*`,
    padahal rute sebenarnya `/pengaturan/:key` (profil_sekolah,
    jam_presensi, lokasi, kkm).
  - Uji bentrok-guru awal keliru memakai dua guru berbeda (tidak ada
    konflik nyata) — diperbaiki dengan membuat 2 paket eksplisit
    memakai guru yang sama di 2 kelas berbeda pada jam yang sama.
- BUG-A (tombol hapus mapel) dan BUG-B (ganti guru penugasan) dari
  sesi sebelumnya tetap terverifikasi fix (suite 22/22 → sekarang
  36/38 dengan penambahan spec baru, 2 skip terdokumentasi, 0 gagal).

**DoD**: Suite penuh hijau ×2 dari DB kosong ✅. Laporan final lengkap
di `PROMPT_AGENT.md` ✅ (dengan catatan insiden overwrite di atas).
