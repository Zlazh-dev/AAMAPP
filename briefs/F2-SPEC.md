# F2-SPEC — PRESENSI SISWA PER KBM (kontrak dikunci planner 2026-07-17)

> Sumber kebenaran F2 untuk SEMUA executor. Planner-owned (jangan diubah
> agent). Detail latar: `planning/F2-RISET-PRESENSI-SISWA.md`.
> Prinsip: kontrak di bawah DIKUNCI → backend & frontend jalan PARALEL.

## Keputusan planner atas 8 pertanyaan terbuka (final)
1. **Status sesi DITURUNKAN**, bukan kolom. `presensi_sesi` simpan
   `disimpanPada` + `guruPenggantiId`; TERLAKSANA=ada baris, KOSONG=jam
   lewat tanpa baris, DIGANTIKAN=guruPenggantiId terisi.
2. **Koreksi = OVERWRITE** (upsert) + audit mencatat perubahan. Tanpa
   soft-delete. Guru boleh edit sampai cutoff; sesudah cutoff hanya admin
   (+ alasan di audit).
3. **Guru pengganti** = `presensi_sesi.guruPenggantiId` (jadwal asli
   TIDAK diubah). Diisi bila yang menyimpan roster ≠ guru pemilik paket.
4. **Hook R-07 DITANGGUHKAN ke F5.** F2 cukup SIMPAN status 'T' di
   `presensi_siswa.status`. F5 generate draft pelanggaran dari data 'T'.
   JANGAN buat entitas pelanggaran di F2.
5. **Kunci izin siswa DITANGGUHKAN ke F4.** F2 tanpa kunci otomatis
   (semua siswa bisa di-edit). Tandai `// TODO F4: kunci izin`.
6. **Rekap** = endpoint terpisah berpaginasi (lihat kontrak).
7. **Status sesi matriks** = SATU query batch (pola
   `countPenugasanGuruAktifBatch` kurikulum.service.ts) — dilarang N+1.
8. **Sesi tanpa roster = "tidak tercatat"** (TIDAK auto-create); rekap
   pakai LEFT JOIN, NULL = tidak tercatat.

## Entitas baru (backend/src/presensi/)
```
presensi_sesi   id PK • jadwalKbmId FK jadwal_kbm (RESTRICT) • tanggal date
                • guruPelaksanaId FK guru • guruPenggantiId FK guru NULL
                • disimpanPada timestamptz • createdAt/updatedAt
                — UNIQUE(jadwalKbmId, tanggal)
presensi_siswa  id PK • presensiSesiId FK presensi_sesi (CASCADE)
                • siswaId FK siswa • status varchar ('H'|'S'|'I'|'A'|'T')
                default 'H' — UNIQUE(presensiSesiId, siswaId)
```

## Kontrak API (DIKUNCI — implementasi backend & konsumsi frontend WAJIB sama)
RBAC: guru hanya sesi paket MILIKNYA (guruId sesi = guru login); admin
baca semua + koreksi pasca-cutoff. Semua error Bahasa Indonesia; audit
tiap mutasi; WIB (wib.util.ts).

- `GET /api/guru/kbm?tanggal=YYYY-MM-DD` (default hari ini WIB) → sesi KBM
  guru login pada hari itu:
  `{ tanggal, sesi: [{ jadwalKbmId, mapel, kelas, jamMulai, jamSelesai,
    sesiKe, status: 'TERLAKSANA'|'BELUM' }] }`
  (dari jadwal_kbm ⋈ penugasan WHERE guruId=me AND hari=hari(tanggal),
  minus kalender_libur; status TERLAKSANA bila presensi_sesi ada).
- `GET /api/guru/kbm/:jadwalId/roster?tanggal=` → roster:
  `{ jadwalKbmId, tanggal, kelas, mapel, tersimpan: bool,
    siswa: [{ siswaId, nama, nis, status }] }`
  (siswa = anggota kelas aktif; status dari presensi_siswa bila ada,
  else default 'H').
- `POST /api/guru/kbm/:jadwalId/roster` body
  `{ tanggal, entri: [{ siswaId, status }] }` → upsert presensi_sesi
  (set guruPelaksana=me, guruPengganti bila me≠pemilik paket) +
  presensi_siswa; 201; audit "Menyimpan presensi {mapel} {kelas}
  {tanggal}: {ringkasan H/S/I/A/T}". Sesudah cutoff & bukan admin → 403
  "Melewati batas waktu — hubungi admin".
- `PATCH /api/guru/kbm/:jadwalId/roster` = koreksi (sama; admin boleh
  pasca-cutoff + body.alasan wajib → audit).
- `GET /api/admin/presensi-siswa?kelasId=&tanggal=` (admin|kepsek|
  kesiswaan baca) → matriks sesi×status hari itu (BATCH query).
- `GET /api/guru/kelas/rekap-presensi?kelasId=&dari=&sampai=&page=&limit=`
  (guru wali|admin) → rekap per siswa (Σ H/S/I/A/T atas sesi TERLAKSANA;
  LEFT JOIN, NULL=tidak tercatat), berpaginasi.

## PEMBAGIAN WILAYAH (paralel; JANGAN saling sentuh)
- **Antigravity-1 → BACKEND F2**: seluruh `backend/src/presensi/**`
  (entity, dto, service, controller, module) + daftarkan module &
  entity di `backend/src/app.module.ts` (SATU titik share — hanya
  Antigravity-1 yang menyentuh app.module untuk F2). + e2e API-level
  bila perlu. Mulai SEGERA (kontrak sudah dikunci, tak perlu nunggu
  frontend).
- **Antigravity-2 → FRONTEND F2 GURU**: `frontend/src/pages/guru/**`
  (KbmHariIniPage daftar sesi, RosterPage grid presensi <30 dtk, §15.6)
  + PEMILIK perubahan `frontend/src/api/client.ts`, `App.tsx`, `menu.ts`
  untuk F2 (guru + admin route). Kerjakan SETELAH 2 bug UX antre
  (assign-siswa, backlink) selesai.
- **Roo Code → FRONTEND F2 ADMIN**: `frontend/src/pages/admin/presensi/**`
  (matriks presensi siswa, §15.3) — BUAT FILE HALAMAN di folder itu saja;
  JANGAN sentuh client.ts/App.tsx/menu.ts (Antigravity-2 yang wire —
  Roo cukup lapor nama komponen+path + method API yang dibutuhkan).
- **Cline → docs**: update `docs/API-REFERENCE.md` + `docs/KAMUS-DATA.md`
  dgn kontrak & entitas F2 di atas (baca-saja kode; tulis docs). Boleh
  mulai kapan saja (kontrak sudah final di file ini).

## Aturan wajib (semua): §12.15 lazy • §12.16 filter+paginasi level DB +
anti N+1 + anti DTO-drift + cache SWR • §12.17 e2e (spec: simpan roster,
cutoff 403, koreksi admin, matriks batch, rekap) • komponen v0.12.x •
BackLink adaptif mobile • klaim tugas sebelum mulai • APPEND laporan.
