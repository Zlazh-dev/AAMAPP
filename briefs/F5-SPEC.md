# F5-SPEC — KESISWAAN / DEMERIT POIN (kontrak dikunci planner 2026-07-18)

> Sumber kebenaran F5. Basis: **SPEC-KANON §7** (SOP/KESISWAAN/001/2026 —
> FINAL, katalog & ambang RESMI, jangan diubah tanpa user). Planner-owned.

## KEPUTUSAN BESAR — F5 DIFASE
- **F5a (SEKARANG)** = katalog tata tertib (seed 28 resmi + CRUD) + pencatatan
  pelanggaran (input langsung / laporan guru → antrean) + verifikasi
  (setujui/tolak) + **saldo TURUNAN** (500 − Σ poin disetujui/semester) + hook
  **R-07** (tanda T di roster → draft pelanggaran MENUNGGU, tak potong sebelum
  disetujui). Inti modul.
- **F5b (NANTI)** = tindak lanjut OTOMATIS (ambang §7.3, sekali/tahap/semester)
  + reward semester (§7.4) + laporan demerit + export. DITUNDA.
- JANGAN kerjakan F5b di F5a.

## ⚠️ SUMBER OTORITATIF = SOP asli (SOP/KESISWAAN/001/2026, dari user 2026-07-18)
SPEC-KANON §7 adalah TURUNAN dgn selisih. Yang mengikat = SOP asli. Selisih
terverifikasi:
- **Poin kategori S = 25** (DIKUNCI user 2026-07-18 — ikut tabel KATALOG;
  definisi-kategori yg tulis 20 = salah ketik). Final: R=10, **S=25**, B=50,
  SB=100. Katalog 28 butir = verbatim SOP bagian D.b (planner sudah verifikasi
  cocok §7.2). SEED boleh jalan.
- Alur: **WALI KELAS pencatat utama** (rekap tiap Sabtu → input Demerit;
  publikasi bulanan). Guru/pegawai lain hanya MELAPOR (WA/form/kotak) → wali.
  Kesiswaan/BK mengawasi. Sesuaikan RBAC: input-langsung = wali kelas &
  kesiswaan; guru lain = lapor→antrean.

## Prinsip inti (§7.1) — saldo DITURUNKAN, bukan kolom
Token **500 poin/siswa/semester**. Kategori **R=10, S=25, B=50, SB=100**
(dikunci user; katalog verbatim §7.2/SOP-D.b).
`saldo = 500 − Σ poin pelanggaran DISETUJUI siswa pada TA/semester AKTIF`
(dihitung saat query, BATCH; bukan kolom statis). Semester = `tahun_ajaran`
aktif (kolom semester 1/2 sudah ada). Reset otomatis karena scope per-TA-aktif.

## Entitas F5a (backend/src/kesiswaan/)
```
katalog_pelanggaran  id PK • nomor int • bentuk text • kategori varchar
                     ('R'|'S'|'B'|'SB') • poin int • aktif bool default true
                     — SEED 28 butir §7.2 (idempotent, jangan duplikat)
pelanggaran  id PK
  • siswaId FK siswa (CASCADE)
  • katalogId FK katalog_pelanggaran NULL (null utk KHUSUS)
  • kategori varchar ('R'|'S'|'B'|'SB'|'KHUSUS')
  • poin int                          -- SNAPSHOT dari katalog saat catat (riwayat)
  • tanggal date                      -- WIB
  • catatan text NULL • buktiUrl varchar NULL
  • sumber varchar ('LANGSUNG'|'LAPORAN'|'OTOMATIS_T')
  • status varchar ('MENUNGGU'|'DISETUJUI'|'DITOLAK')
  • pelaporId FK user NULL (SET NULL)      -- yang mencatat/melapor
  • verifikatorId FK user NULL (SET NULL)  -- yang verifikasi
  • verifikasiPada timestamptz NULL • alasanKeputusan text NULL
  • tahunAjaranId FK tahun_ajaran           -- scope semester (saldo)
  • createdAt/updatedAt
  — INDEX(siswaId, tahunAjaranId, status); R-07 auto: UNIQUE dedup
    (siswaId, tanggal, katalogId, sumber='OTOMATIS_T')
```
KHUSUS (narkoba/pidana/dll §7.2) = kategori 'KHUSUS' poin 0 → status DISETUJUI
langsung (tindak khusus F5b); tanpa potong poin.

## Alur (§7.5) & RBAC
- **Input LANGSUNG** (status DISETUJUI langsung, potong saldo): peran
  `kesiswaan` (semua siswa) ATAU wali kelas (guru yg jadi waliGuru kelas siswa).
- **LAPORAN** (guru lain): status MENUNGGU → antrean verifikasi wali ybs./
  kesiswaan → SETUJUI (potong) / TOLAK.
- **OTOMATIS_T**: hook dari F2 `presensi.simpanRoster` — tiap siswa status 'T'
  → buat pelanggaran katalog **R-07** (nomor 7 "Terlambat masuk kelas", R, 10)
  status MENUNGGU, sumber OTOMATIS_T, idempotent (dedup key di atas). TAK
  memotong poin sebelum disetujui. Bila T dikoreksi hilang & draft masih
  MENUNGGU → batalkan draft (TODO bila rumit, catat).
- `kesiswaan` + wali = verifikasi; `kepsek` baca-semua; `guru` lapor.

## Kontrak API F5a (DIKUNCI)
RBAC server; audit tiap mutasi; WIB; error Bahasa Indonesia; DTO lengkap.
**Katalog (tata tertib):**
- `GET /api/kesiswaan/katalog?q=&kategori=&page=&limit=` (kesiswaan|admin|guru
  baca) → daftar butir (filter DB).
- `POST /api/kesiswaan/katalog` (kesiswaan|admin) `{ bentuk, kategori, poin }`.
- `PATCH /api/kesiswaan/katalog/:id` • `DELETE` (soft: aktif=false) (kesiswaan|
  admin).
**Pelanggaran:**
- `POST /api/kesiswaan/pelanggaran` (kesiswaan|guru) `{ siswaId, katalogId|
  (kategori+poin utk khusus), tanggal, catatan?, buktiUrl? }` → bila pencatat
  berhak-langsung (kesiswaan/wali kelas siswa) status DISETUJUI; else (guru
  lain) MENUNGGU. Audit.
- `GET /api/kesiswaan/pelanggaran?siswaId?&kelasId?&status?&dari?&sampai?&page&
  limit` (kesiswaan|admin|kepsek; wali → auto filter kelasnya) → daftar +
  siswaNama + kategori + poin + status (filter DB, anti-N+1).
- `GET /api/kesiswaan/verifikasi?page&limit` (kesiswaan|wali) → antrean MENUNGGU
  (wali → hanya kelasnya).
- `PATCH /api/kesiswaan/pelanggaran/:id/setujui` (kesiswaan|wali kelas siswa) →
  DISETUJUI + verifikator/pada; audit. Hanya dari MENUNGGU.
- `PATCH /api/kesiswaan/pelanggaran/:id/tolak` (kesiswaan|wali) `{ alasan }`
  (wajib) → DITOLAK.
- `GET /api/kesiswaan/saldo?siswaId=` (dan/atau `?kelasId=` batch) → `{ siswaId,
  saldo, terpotong, perKategori }` — DITURUNKAN (500 − Σ disetujui TA aktif),
  BATCH anti-N+1 (jangan per-siswa query).

## Helper WAJIB
`hitungSaldoBatch(siswaIds, tahunAjaranId)` MURNI setelah satu query Σ poin
GROUP BY siswaId (status=DISETUJUI). `berhakLangsung(user, siswa)` = user punya
peran kesiswaan ATAU user=guru waliKelas dari kelas siswa.

## PEMBAGIAN WILAYAH F5a
- **AG-2 (backend, MEMIMPIN)**: modul `backend/src/kesiswaan/**` (katalog+seed
  28, pelanggaran entity, service dgn saldo batch + berhakLangsung + verifikasi,
  controller RBAC) + **hook R-07** di `presensi.service.simpanRoster` (inject
  KesiswaanService; idempotent). Daftarkan app.module. Boot-verify (tabel+seed
  28) + e2e (catat langsung potong saldo, lapor→verifikasi→potong, tolak,
  R-07 dari T muncul MENUNGGU tak potong, RBAC guru-lain tak bisa langsung).
- **AG-1 (frontend)**: `/kesiswaan/tata-tertib` (katalog CRUD) +
  `/kesiswaan/pelanggaran` (catat: AdaptiveSelect siswa+butir, list + saldo per
  siswa) + `/kesiswaan/verifikasi` (antrean setujui/tolak, badge count) + guru
  "Pelanggaran" (form lapor) + wiring client.ts/App.tsx/menu.ts (grup KESISWAAN
  + item guru). Kontrak dikunci → boleh paralel. E2E.

## Aturan wajib: §12.15 lazy • §12.16 filter+paginasi DB + anti-N+1 +
anti-DTO-drift • §12.17 e2e = gerbang (spec mandiri, buat data sendiri via API
— lihat pelajaran E2E-MANDIRI-DATA) • RBAC server + audit + WIB • komponen
v0.12.x • klaim tugas • APPEND laporan • JANGAN F5b.
