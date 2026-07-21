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

## STATUS PROYEK (2026-07-19) — SEMUA FITUR F0–F6 TUNTAS

- ✅ F0 auth • F1 data induk/kurikulum/pengaturan • F2 presensi siswa • F3
  presensi wajah+kiosk • F4 izin+dashboard+laporan+rekap TU • F5 kesiswaan/
  demerit • F6 penilaian+rapor akademik+kokurikuler+ekstrakurikuler.
- Gerbang e2e: 285 pass/12 skip/0 gagal (12 skip = 5 GOOGLE_CLIENT_ID + 7
  presensi Sunday-skip). Deterministik.
- ⏭️ Tersisa NON-fitur: (1) **INTEGRASI PDF** rapor (gabung akademik+
  kokurikuler+ekskul jadi satu dokumen berkop); (2) **DOCS** (F3–F6 satu pass);
  (3) **DEPLOY** (blocker bootstrap skema produksi); (4) backlog harness (audit
  spec lookup-paginasi).
- Git: commit tiap tugas lolos review. Referensi rapor: `D:\Codeproject\
  Smpmultipleapp\radig\rapor` (dasar F6c/F6d).

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

> **ARMADA MENYUSUT JADI 1 AGENT (2026-07-21).** AG-2 tidak dipakai lagi;
> semua pekerjaan (FE + BE) ke **AGENT-1**. Saluran kerja tunggal =
> **`briefs/AGENT-1-AKTIF.md`** (baru, bersih). `AGENT-1.md`/`AGENT-2.md` lama = arsip.

| Agent | Peran | Dokumen kerja | Tugas aktif | Status |
|---|---|---|---|---|
| **AGENT-1** | executor tunggal (FE+BE) | **`briefs/AGENT-1-AKTIF.md`** + `briefs/UX-POLISH-SPEC.md` | **UX-POLISH A–J** (gabungan FE+BE; PRIORITAS I & J = bug mobile konten-tertutup + card-list/ambang sub-detail, keluhan user 2026-07-21) | siap |

**UX-POLISH (pasca-QA user 2026-07-19; +bug user 2026-07-21):** feature-complete
tapi konsistensi UX perlu dirapikan. **BARU (I & J di UX-POLISH-SPEC, prioritas
tinggi, Gel-2 AG-1):** (I) bug sistemik konten paling bawah TERTUTUP tombol
Kembali/bar di mobile → reservasi ruang di PageContainer+BackLink, audit semua
halaman; (J) card-list mobile menyeluruh + AMBANG SUB-DETAIL (tabel >3–4 kolom
atau kartu >3 baris → klik menuju halaman sub-detail relevan; buat sub-detail
baru bila perlu, mis. Kehadiran Guru). Keputusan user dikunci di
`briefs/UX-POLISH-SPEC.md`:
akses KETAT per peran (admin=admin+kurikulum+kesiswaan+tu, BUKAN guru; area
guru dikunci ke peran guru; backend @Roles ikut ketat) • HAPUS kiosk (guru
100% self-service) • sidebar 6-item + Laporan jadi hub sub-halaman • wajah:
guru enroll→admin validasi di DETAIL GURU • + polish (SubPageLinks/BackLink,
card watermark, nol emoji, desktop bukan bottom-sheet).
| ~~Kiro/Roo/Cline~~ | — | — | tidak dipakai | — |

**STATUS FASE:** ✅ F2 • ✅ F3 • ✅ **F4 TUNTAS** (a: izin+status turunan • b:
dashboard+laporan+export • c: rekap TU + akses kepsek). Ekosistem inti lengkap.
✅ F5 • ✅ **F6a** penilaian • ✅ **F6b** rapor akademik • ✅ **F6c**
kokurikuler (8 dimensi + rata SB/B/C/K, dari referensi radig/rapor). ▶️ **F6d**
ekstrakurikuler (dari referensi yg sama) DIBUKA. Setelah F6d → **INTEGRASI PDF**
(gabung akademik+kokurikuler+ekskul) → **DOCS** (F3–F6) → **DEPLOY** (blocker
bootstrap skema). Gerbang: e2e presensi SKIP hari Minggu (produk benar).

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

**⛔ BLOCKER DEPLOY PRODUKSI — HASIL GLADI BERSIH (2026-07-21): 3 LAPIS CACAT.**
Gladi bersih (stack terpisah `aamapp-gladi`, port 8081, volume kosong, dev
TAK tersentuh) membongkar tiga cacat bertumpuk di jalur deploy produksi.
Migration bootstrap SUDAH ada (2 migration; `runMigrations()` di `main.ts`
jalan sebelum bootstrap — urutan benar), tapi:

**LAPIS 1 — data-source path [PLANNER SUDAH FIX 2026-07-21].**
`data-source.ts:18-19` prod `srcDir = path.join(__dirname,'..')` → dari
`/app/dist` naik ke `/app` → glob migration `/app/migrations/*.js` (folder
tak ada; migration sebenarnya di `/app/dist/migrations`). Akibat: 0 migration
dijalankan, hanya `typeorm_migrations` terbentuk, seed crash. FIX terpasang:
`srcDir = __dirname`. Terbukti: setelah fix, migration MULAI dijalankan.

**LAPIS 2 — SQL InitialSchema invalid [PLANNER SUDAH FIX 2026-07-21].**
`1721394000000-InitialSchema.ts:143` `ALTER TABLE "kelas" ADD CONSTRAINT
IF NOT EXISTS ...` — Postgres TIDAK mendukung `ADD CONSTRAINT IF NOT EXISTS`
(beda dgn CREATE TABLE IF NOT EXISTS); `.catch()` JS tak menolong karena
error sintaks menggugurkan transaksi (transaction:'each'). FIX terpasang:
bungkus DO $$ cek `pg_constraint`. Terbukti: InitialSchema lolos penuh.

**LAPIS 3 — SCHEMA DRIFT migration vs entity [⚠️ BELUM DIPERBAIKI — TUGAS
AGENT, JANGAN DITAMBAL TANGAN].** Setelah lapis 1&2, migrasi ke-2
`AddDeviceIdToSessions` gagal: `column "revokedAt" does not exist`. Sebab:
InitialSchema TIDAK setia mereproduksi entity. Bukti pada tabel `sessions`
saja (bandingkan `session.entity.ts`):
| kolom/tipe | entity (benar) | InitialSchema (salah) |
|---|---|---|
| id | INTEGER (serial) | UUID gen_random_uuid() |
| tokenHash | char(64) | TIDAK ADA |
| loginMethod | varchar(50) | TIDAK ADA |
| revokedAt | timestamptz null | TIDAK ADA |
Artinya InitialSchema ditulis terhadap entity versi LAMA. Bila tabel
`sessions` sedrift ini (bahkan tipe PK salah → auth pasti rusak di prod),
~33 tabel lain TIDAK bisa dipercaya. **Remediasi wajib: REGENERASI migration
InitialSchema dari entity aktual** (bukan tambal per kolom — risiko luput).
Pendekatan disarankan: jalankan sekali DB scratch dgn `synchronize:true` →
`typeorm migration:generate` terhadap entity → jadikan InitialSchema; ATAU
dump skema referensi synchronize lalu susun ulang. LALU verifikasi kolom
per tabel = entity. Hapus/rapikan `AddDeviceIdToSessions` bila deviceId sudah
masuk skema regen.

**RE-TEST (gladi, setelah lapis 3 beres):**
`docker compose -p aamapp-gladi -f docker-compose.prod.yml --env-file <env>
down -v && ... up -d --build` → log backend "Migration selesai:
InitialSchema, AddDeviceIdToSessions" (TANPA error) → `psql \dt` = ±34 tabel
→ `SELECT count(*) FROM users` ≥ 1 (admin seed) → login admin di :8081.
Lolos → BLOCKER DICABUT. Stack dev (`aamapp`) JANGAN disentuh.

Status: lapis 1&2 fix planner (perlu di-COMMIT). Lapis 3 = tugas AGENT
backend (regen migration + verifikasi). `deploy/README-DEPLOY.md` wajib
prosedur+peringatan (AGENT-2). Sampai re-test lolos, prod deploy DIBLOKIR.

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
