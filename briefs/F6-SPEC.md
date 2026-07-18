# F6-SPEC — PENILAIAN & RAPOR (kontrak dikunci planner 2026-07-18)

> Sumber kebenaran F6. Basis: SPEC-KANON §9 + `planning/F6-RISET-RAPOR(-B).md`.
> Planner-owned. Fase TERAKHIR fitur.

## KEPUTUSAN BESAR — F6 DIFASE
- **F6a (SEKARANG)** = penilaian INTI: TP (CRUD per mapel) + penilaian
  (Formatif/Sumatif per paket) + input nilai (0–100, daftar siswa TURUNAN) +
  nilai akhir turunan `round(Σ(nilai×bobot)/Σbobot)` (sumatif saja). Sisi INPUT.
- **F6b (NANTI)** = rapor: deskripsi capaian otomatis (per TP vs KKM, top2/
  bottom2) + nilai katrol/override + ketidakhadiran S/I/A dari F2 + workflow
  DRAFT/FINAL (wali kelas finalisasi) + PDF rapor berkop (snapshot saat final).
- **F6c (NANTI)** = kokurikuler (8 dimensi, SB/B/C/K) + ekstrakurikuler.
- JANGAN kerjakan F6b/F6c di F6a.

## ⚠️ PERTANYAAN TERBUKA (untuk user — diputus sebelum F6b/F6c, TIDAK blokir F6a)
1. **KKM per-mapel vs global?** Saat ini global `{nilai:75}` di pengaturan.
   F6a TIDAK pakai KKM (nilai akhir murni bobot). F6b deskripsi pakai KKM →
   putuskan sebelum F6b.
2. **Pola kalimat deskripsi otomatis** (top2 dikuasai / bottom2 perlu
   penguatan) — perlu contoh/aturan dari user (referensi radig/rapor).
3. **8 dimensi kokurikuler** (daftar tetap) + cara rata-rata SB/B/C/K
   multi-penilai — untuk F6c.

## Prinsip inti (§9 + riset) — turunan, arsip, kepemilikan paket
- Daftar siswa dinilai = TURUNAN: `siswa WHERE kelasId=penugasan.kelasId AND
  status='aktif'` (SATU sumber kebenaran, sama dgn roster F2). Tak ada tabel
  enrollment.
- Paket guru muncul OTOMATIS: `penugasan WHERE guruId=(guru dari sesi) AND
  tahunAjaranId=TA aktif`. Belum ditugaskan → empty state.
- TP/penilaian/nilai milik **paket/mapel-kelas-semester, BUKAN guru pribadi** —
  ganti guru paket → data UTUH. Hapus penugasan → data historis TIDAK terhapus.
- Nilai akhir & (F6b) deskripsi = DITURUNKAN; simpan hanya INPUT + override
  manusia.
- Authorization di SERVICE (guru hanya paket miliknya), bukan role guard saja.

## Entitas F6a (backend/src/penilaian/)
```
tujuan_pembelajaran  id PK • mapelId FK mapel (CASCADE) • deskripsi text
                     • urutan int • aktif bool default true • createdAt/updatedAt
penilaian  id PK • penugasanId FK penugasan (CASCADE) • nama varchar
           • jenis varchar ('Formatif'|'Sumatif')
           • subjenis varchar NULL ('SUMATIF_TP'|'SUMATIF_AKHIR_SEMESTER'|
             'SUMATIF_AKHIR_TAHUN')  -- hanya bila Sumatif
           • bobot int (≥1) • tanggal date • createdAt/updatedAt
penilaian_tp  penilaianId FK • tpId FK tujuan_pembelajaran   -- junction Sumatif TP↔TP
              — PK(penilaianId, tpId)
nilai  id PK • penilaianId FK penilaian (CASCADE) • siswaId FK siswa (CASCADE)
       • nilai int (0–100) • catatan varchar NULL • diubahOleh FK guru NULL
       • createdAt/updatedAt — UNIQUE(penilaianId, siswaId)
```
Nilai akhir per siswa (TURUNAN, bukan kolom): `round(Σ(nilai×bobot)/Σ(bobot))`
atas penilaian **Sumatif** paket itu. Formatif TIDAK masuk.

## Kontrak API F6a (DIKUNCI) — guru pemilik paket; admin baca
RBAC + authorization service (guru hanya paket guruId=dia); audit mutasi; WIB;
DTO lengkap; daftar siswa/nilai anti-N+1.
- `GET /api/guru/penilaian` → kartu paket guru (dari penugasan: mapelNama,
  kelasNama, jumlahSiswa, jumlahPenilaian). Empty → "belum ditugaskan".
- **TP** (per mapel paket): `GET /api/guru/penilaian/:penugasanId/tp` •
  `POST` `{deskripsi, urutan?}` • `PATCH :tpId` • `DELETE :tpId` (soft aktif=false).
- **Penilaian**: `GET /api/guru/penilaian/:penugasanId/penilaian` •
  `POST` `{nama, jenis, subjenis?, bobot, tanggal, tpIds?[]}` (tpIds hanya
  SUMATIF_TP) • `PATCH :id` • `DELETE :id`.
- **Input nilai**: `GET /api/guru/penilaian/penilaian/:penilaianId/nilai` →
  `{ penilaian, siswa:[{siswaId,nama,nis,nilai|null,catatan}] }` (SEMUA siswa
  aktif kelas, nilai null = belum diisi/kuning). `PUT` body `{ entri:[{siswaId,
  nilai,catatan?}] }` → upsert; nilai 0–100 (IsInt 0..100); audit.
- **Rekap nilai akhir**: `GET /api/guru/penilaian/:penugasanId/rekap` → per
  siswa `{siswaId, nama, nilaiAkhir|null}` (turunan formula sumatif, BATCH).

## PEMBAGIAN WILAYAH F6a (backend vs frontend, kontrak dikunci)
- **AG-2 (backend, MEMIMPIN)**: modul `backend/src/penilaian/**` (4 entitas +
  junction, DTO, service: daftar paket guru, siswa-turunan, penilaian/TP CRUD,
  nilai upsert, nilai-akhir formula BATCH, authorization own-paket) +
  daftarkan app.module. Boot-verify + e2e mandiri (paket muncul utk guru
  ditugaskan; input nilai → rekap benar; guru lain 403; formatif tak masuk).
  Wilayah `backend/**` + `frontend/e2e/`.
- **AG-1 (frontend)**: `/guru/penilaian` (kartu paket → detail paket: TP list/
  CRUD + Penilaian list/CRUD → "Tambah Penilaian" → SaveSuccess → halaman INPUT
  NILAI semua siswa aktif [grid, null=kuning] + rekap nilai akhir). Wiring
  client.ts/App.tsx/menu.ts (guru "Penilaian"). E2E MANDIRI (buat data via API,
  navigasi by-id — JANGAN lookup daftar paginasi).

## Aturan wajib: §12.15 lazy • §12.16 filter+paginasi DB + anti-N+1 +
anti-DTO-drift • §12.17 e2e = gerbang (spec MANDIRI — buat data via API,
navigasi by-id/search) • RBAC + authorization service + audit + WIB • komponen
v0.12.x • klaim tugas • APPEND laporan • JANGAN F6b/F6c.
