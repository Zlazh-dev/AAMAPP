# PROMPT_AGENT.md — PUSAT KOORDINASI AAMAPP (HUB)

> Proyek: AAMAPP — Ekosistem Sekolah SMP IT Asy-Syadzili
> (Presensi • Kurikulum • Kesiswaan • Administrasi).
> Dokumen ini SENGAJA RINGKAS. Instruksi kerja tiap agent ada di dokumen
> masing-masing (lihat PAPAN TUGAS). Spesifikasi & keputusan lengkap ada
> di `SPEC-KANON.md`.

## ATURAN KEPEMILIKAN (keras)

- **PLANNER (Claude)**: satu-satunya yang boleh MENGUBAH dokumen ini,
  `SPEC-KANON.md`, dan bagian TUGAS di `briefs/AGENT-*.md`.
- **AGENT**: HANYA membaca dokumen agent-nya sendiri
  (`briefs/AGENT-<n>.md`) + meng-APPEND laporan di bagian `## LAPORAN`
  dokumen agent-nya sendiri. DILARANG mengubah dokumen ini, SPEC-KANON,
  atau dokumen agent lain. DILARANG menyimpan-ulang/menulis-ulang file
  apa pun secara utuh yang bukan buatannya (insiden 2026-07-16: kanon
  6.114 baris tertimpa jadi 2 baris).
- **USER**: pemilik produk; komunikasi via chat planner; QA visual.

## STATUS PROYEK (2026-07-17)

- ✅ **F0** fondasi+auth • ✅ **F1** data induk+kurikulum-jadwal+pengaturan
  (T11–T16; e2e Playwright 36 pass/2 skip ×2 dari DB kosong).
- 🔶 Menunggu: QA visual user (T16 poin 12 & 15) → verdict F1 TUNTAS.
- ▶️ Berjalan: SEC-1 (AGENT-1), OPS-4 (AGENT-2), RISET-F3 (AGENT-3).
- ⏭️ Berikutnya: kickoff F2 presensi siswa (bahan: `planning/F2-RISET-*.md`).
- Git: aktif sejak 2026-07-17 (commit `0cd29b8`); planner commit tiap
  tugas lolos review.

## ARMADA (update 2026-07-17c — hanya 2 Antigravity; Kiro/Roo/Cline DIBUANG)

- **Antigravity-IDE** (executor A) + **Antigravity-v2.0** (executor B) =
  satu-satunya executor. Kiro/Roo/Cline tidak dipakai lagi.
- **F2 SELESAI (backend + frontend + wiring), build & typecheck bersih,
  app load 200.** Frontend guru (KbmHariIni+Roster) & admin (matriks)
  wired oleh PLANNER (executor IDE tinggalkan kode rusak → planner
  perbaiki + wire). Sisa: verifikasi end-to-end (QA user) + polish
  (lihat catatan di bawah).
- **F2-ADMIN-POLISH (AG-2) SELESAI & DITERIMA** (commit `09fb2c9`):
  admin presensi pakai `api.*` resmi, `presensiLocalApi.ts` dihapus;
  verifikasi planner tsc bersih + e2e 47 pass. Review workflow 39-agen →
  **6 temuan (2 blocker: race respons basi matriks; kepsek/kesiswaan 403
  saat klik sesi)** → ronde **F2-ADMIN-FIX2** ditulis di
  `briefs/AGENT-2.md`.
- **BACKLINK-ADAPTIF (AG-1)**: WIP ter-commit sebagai checkpoint
  `c5e29f5` — BELUM direview planner; AG-1 belum lapor. e2e hijau dgn
  tree ini, tapi jangan tandai selesai sebelum laporan + review.
- Titik file bersama frontend (`client.ts`/`App.tsx`/`menu.ts`) dipegang
  PLANNER/Antigravity-IDE. Antigravity-v2.0 hanya folder halaman baru.

## PAPAN TUGAS

| Agent | Peran | Dokumen tugas | Tugas aktif | Status |
|---|---|---|---|---|
| Antigravity-IDE | executor A | `briefs/AGENT-1.md` | ✅ **F3b KIOSK APP SELESAI** (/kiosk publik + scanner + pairing; suite 93/0). Menunggu F4 | idle |
| Antigravity-v2.0 | executor B | `briefs/AGENT-2.md` | ✅ **F3b ADMIN SELESAI** (perangkat + verifikasi pending; nit backend fixed). Menunggu F4 | idle |
| ~~Kiro/Roo/Cline~~ | — | — | tidak dipakai | — |

**STATUS FASE:** ✅ **F2 CLOSED** • ✅ **F3 TUNTAS PENUH** (F3a presensi wajah
HP mandiri + F3b kiosk 1:N: backend+frontend, suite 93 pass/0 gagal). ⏭️
Berikutnya: **F4** (planner susun F4-SPEC dari `planning/F4-RISET-*`). Docs F3
DITUNDA (dikerjakan sebelum pindah fase bila user mau). Arsitektur wajah:
embedding di device, server cosine.

**BACKLOG (tech-debt, non-blocker):** (1) §12.16 — dropdown tarik-semua
`limit:1000` lalu filter klien; mestinya type-ahead server-side pakai `q=`
(backend sudah dukung). (2) Model wajah dari CDN jsdelivr — self-host utk
offline/keandalan (penting utk kiosk F3b). (3) `kiosk create device` throw
`Error`→500, mestinya `BadRequestException`→400.

**BACKEND F2 LIVE (kontrak untuk frontend):** `GET /api/guru/kbm?tanggal=`
• `GET|POST|PATCH /api/guru/kbm/:jadwalId/roster` •
`GET /api/guru/kelas/rekap-presensi?kelasId=&dari=&sampai=` •
`GET /api/admin/presensi-siswa?kelasId=&tanggal=`. Bentuk respons di
`briefs/F2-SPEC.md`.

**Catatan temuan (2026-07-17):** npm audit — backend 26 vuln (7 HIGH),
frontend 2 vuln (1 HIGH). Perbaikan dependensi = kandidat item SEC-1
ke-7 (butuh `npm audit fix` = sentuh lockfile = wilayah AGENT-1) —
planner putuskan setelah SEC-1 config 1–6 lolos.

**⛔ BLOCKER DEPLOY PRODUKSI (efek SEC-1 item 3 — WAJIB sebelum F8):**
`synchronize` kini OFF di production (NODE_ENV=production di Dockerfile
& prod compose), TAPI belum ada migration/bootstrap → deploy prod ke DB
KOSONG tidak membuat tabel → crash. Konsekuensi: **soft-launch F1 ke
prod TIDAK bisa sampai ada BOOTSTRAP SKEMA.** Keputusan planner:
(a) kode kondisional dipertahankan (benar utk jangka panjang);
(b) sebelum deploy prod nyata (fase F8, atau lebih awal bila user mau
soft-launch), tambah SATU dari: TypeORM migration; ATAU prosedur
first-run terdokumentasi (deploy sekali dgn synchronize sementara ON →
seed → flip production); (c) `deploy/README-DEPLOY.md` WAJIB memuat
peringatan ini (tugas AGENT-2). Sampai itu ada, prod deploy DIBLOKIR.
KOREKSI klaim planner sebelumnya: "F1 bisa deploy hari ini" kini TIDAK
akurat — perlu bootstrap skema dulu.

Planner memperbarui papan ini setiap ada perubahan; agent TIDAK mengubah
papan — status "SELESAI" ditulis planner setelah review laporan.

## DOKUMEN RUJUKAN

- `SPEC-KANON.md` — spesifikasi & keputusan lengkap (badan v0.9 + ZONA
  REKONSTRUKSI; bila bertentangan, zona rekonstruksi menang).
- `docs/` — arsitektur, kamus data, API reference, audit keamanan.
- `planning/` — riset F2/F6 (+F3 menyusul) & pertanyaan terbuka.
- `deploy/`, `scripts/` — produksi & backup. `backups/` — artefak pemulihan.

## ATURAN INTI LINTAS-AGENT (rincian di SPEC-KANON §12 & Zona 2)

1. KLAIM sebelum kerja: tulis 1 baris `DIKERJAKAN (jam)` di bagian
   LAPORAN dokumen agent-mu; tugas SELESAI tidak diulang.
2. Verifikasi file benar-benar ada di repo sebelum melapor; klaim harus
   cocok dengan keadaan repo.
3. Semua UI Bahasa Indonesia; error bermakna; aturan UI v0.10–v0.12
   (sidebar datar, satu tombol aksi, SaveSuccess, AdaptiveSelect,
   PageContainer, portal dropdown) — lihat SPEC-KANON Zona 2A.
4. §12.15 lazy (library berat dilarang di bundle utama) • §12.16
   performa data (filter+paginasi level DB, anti N+1, anti DTO-drift,
   cache SWR) • §12.17 e2e Playwright = gerbang tiap fase.
5. RBAC ditegakkan server; audit log tiap mutasi; WIB.
6. Jangan bekerja di luar tugas tertulis; ambigu → tulis pertanyaan di
   LAPORAN dan berhenti.

## RIWAYAT VERSI HUB

- 1.0 (2026-07-17): Hub dibentuk (usul user) — kanon lama dipindah ke
  SPEC-KANON.md; instruksi per-agent dipecah ke briefs/AGENT-{1,2,3}.md.
