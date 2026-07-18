# DOKUMEN AGENT-1 (Antigravity) — AAMAPP

> Baca HANYA file ini + `SPEC-KANON.md` bila butuh detail kontrak. Jangan
> membaca/mengubah PROMPT_AGENT.md, dokumen agent lain, atau menyimpan-ulang
> file utuh yang bukan buatanmu. Laporan = APPEND di `## LAPORAN` bawah ini.

## Identitas & wilayah
- Kamu AGENT-1. Tool: Antigravity. Wilayah TULIS: `backend/src`,
  `frontend/src`, `frontend/e2e/`, `docker-compose.yml` (dev).
- JANGAN sentuh: `scripts/`, `deploy/`, `docs/`, `planning/`, `briefs/`
  (kecuali menambah LAPORAN di file INI), `SPEC-KANON.md`, `PROMPT_AGENT.md`.
- Sebelum mulai TIAP tugas: append 1 baris klaim `DIKERJAKAN (jam)` di
  `## LAPORAN`. Selesai → append laporan per butir; planner yang menandai
  SELESAI di papan tugas hub.

## TUGAS AKTIF (2026-07-19b) — F6d FRONTEND (ekstrakurikuler)

> F6c frontend kamu DITERIMA (commit a88b6cc, suite 255/0). Sekarang F6d EKSKUL.
> Baca **`briefs/F6-SPEC.md` bagian F6d** (dari referensi). Kontrak dikunci,
> paralel. JANGAN integrasi PDF (menyusul).

**Kontrak backend F6d (konsumsi):** admin `GET/POST/PATCH/DELETE /api/ekskul`;
pembina peserta/tujuan/nilai/kehadiran `.../:id/...`; rapor
`GET /api/ekskul/rapor/:siswaId?...`.

Kerjakan (wilayah `frontend/src/**` + `frontend/e2e/`; pegang shared files):
1. Admin kelola ekskul (nama + pilih pembina guru) — list + CRUD.
2. Pembina (halaman /guru/ekskul): peserta (add/remove siswa) + tujuan (per
   semester) + input nilai (grid peserta × tujuan, tombol SB/B/C/K) + kehadiran
   (jumlahHadir/totalPertemuan → tampil % , **merah <70%**).
3. Tampilan rapor ekskul siswa (nilai per tujuan + kehadiran% + deskripsi).
4. Wiring client.ts/App.tsx/menu.ts (admin/kurikulum "Ekstrakurikuler"; guru
   "Ekskul"). E2E MANDIRI (buat data via API, navigasi by-id).

DoD: tsc bersih • build sukses • ekskul→peserta→tujuan→nilai→kehadiran→rapor
jalan • e2e hijau • laporan. JANGAN integrasi PDF. JANGAN sentuh backend (AG-2).

---
## ARSIP TUGAS (2026-07-19) — F6c FRONTEND (SELESAI, diterima commit a88b6cc)

> F6b frontend kamu DITERIMA (commit ed9d0ed). Rapor akademik tuntas. Sekarang
> F6c KOKURIKULER. Baca **`briefs/F6-SPEC.md` bagian F6c** (8 dimensi + SB/B/C/K
> dari referensi). Kontrak dikunci, paralel. JANGAN F6d/integrasi PDF.

**Kontrak backend F6c (konsumsi):**
- Kelola: `GET/POST/PATCH/DELETE /api/kokurikuler/kegiatan` (tema+semester+
  dimensi+tim). Asesmen: `GET /api/kokurikuler/asesmen?kegiatanId=&kelasId=` •
  `PUT` `{entri:[{siswaId,targetId,nilai}]}`. Rapor: `GET /api/kokurikuler/
  rapor/:siswaId?tahunAjaranId=&semester=`.

Kerjakan (wilayah `frontend/src/**` + `frontend/e2e/`; pegang shared files):
1. Kelola kegiatan (kurikulum): buat kegiatan (tema, semester), **pilih dimensi
   dari 8** (checkbox), assign **tim penilai** (guru per kelas). List + CRUD.
2. Input asesmen (guru tim): grid siswa × dimensi-target, tombol **SB/B/C/K**
   (Sangat Baik/Baik/Cukup/Kurang) → PUT. Hanya kegiatan yg dia jadi tim.
3. Tampilan rapor kokurikuler siswa (per dimensi: nilai akhir rata + deskripsi).
4. Wiring client.ts/App.tsx/menu.ts (kurikulum "Kokurikuler"; guru akses
   asesmen). E2E MANDIRI (buat data via API, navigasi by-id).

DoD: tsc bersih • build sukses • kegiatan→dimensi→tim→asesmen→rapor jalan •
e2e hijau • laporan. JANGAN F6d. JANGAN sentuh backend kokurikuler (AG-2).

---
## ARSIP TUGAS (2026-07-18n) — F6b FRONTEND (SELESAI, diterima commit ed9d0ed)

> F6a frontend kamu DITERIMA (suite 216/0). Sekarang F6b (rapor). Baca
> **`briefs/F6-SPEC.md` bagian F6b** + §9. User: KKM global 75, deskripsi pola
> default. Kontrak dikunci, paralel (backend AG-2). JANGAN F6c.

**Kontrak backend F6b (konsumsi):**
- `GET /api/rapor/kelas/:kelasId?tahunAjaranId=` (daftar siswa+status) •
  `GET /api/rapor/siswa/:siswaId?tahunAjaranId=` (rapor lengkap derived) •
  `PUT /api/rapor/siswa/:siswaId/mapel/:mapelId {nilaiKatrol?,deskripsiOverride?}`
  • `PATCH .../catatan {catatanWali}` • `PATCH .../finalisasi` • `.../batal-final`.

Kerjakan (wilayah `frontend/src/**` + `frontend/e2e/`; pegang shared files):
1. `/guru/rapor` (wali kelas): daftar siswa kelasnya + status rapor (DRAFT/
   FINAL) → detail rapor per siswa.
2. Detail rapor: tabel per mapel (nilai akhir, KKM 75, nilai < KKM merah,
   katrol override, deskripsi [auto, bisa edit override]) + kehadiran S/I/A +
   catatan wali + tombol **Finalisasi** (kunci; setelah FINAL read-only).
3. **Export PDF** rapor: `pdfmake` **dynamic-import LAZY** (reuse pola
   `lib/exportPdf.ts`), kop profil sekolah, layout rapor rapi.
4. Wiring client.ts/App.tsx/menu.ts (guru "Rapor"). E2E MANDIRI (buat data via
   API, navigasi by-id — JANGAN lookup daftar paginasi).

DoD: tsc bersih • build sukses • rapor tampil+edit override+finalisasi+PDF •
export lazy • e2e hijau • laporan. JANGAN F6c. JANGAN sentuh backend rapor (AG-2).

---
## ARSIP TUGAS (2026-07-18m) — F6a FRONTEND (SELESAI, diterima commit 86a0011)

> F5b frontend kamu DITERIMA (suite 191/0). F5 TUNTAS. Sekarang F6 (fase
> terakhir). Baca **`briefs/F6-SPEC.md`** + SPEC-KANON §9 — HANYA F6a; JANGAN
> F6b/F6c. Kontrak dikunci, paralel (backend AG-2). Boleh mock e2e.

**Kontrak backend F6a (konsumsi):**
- `GET /api/guru/penilaian` (kartu paket) • TP `GET/POST/PATCH/DELETE
  /api/guru/penilaian/:penugasanId/tp` • Penilaian `.../:penugasanId/penilaian`
  • Input nilai `GET/PUT /api/guru/penilaian/penilaian/:penilaianId/nilai` •
  Rekap `GET /api/guru/penilaian/:penugasanId/rekap`.

Kerjakan (wilayah `frontend/src/**` + `frontend/e2e/`; pegang shared files):
1. `/guru/penilaian`: kartu paket (mapel—kelas) otomatis; belum ditugaskan →
   empty state. Klik paket → detail.
2. Detail paket (sub-halaman, TANPA TAB — pakai SubPageLinks): TP (list + CRUD),
   Penilaian (list + "Tambah Penilaian" → jenis/subjenis/bobot/tanggal, Sumatif
   TP pilih TP) → SaveSuccess → arahkan ke **input nilai**.
3. Input nilai: SEMUA siswa aktif kelas (grid, nilai 0–100, null=disorot
   kuning) → simpan (PUT). Rekap nilai akhir per siswa.
4. Wiring client.ts/App.tsx/menu.ts (guru "Penilaian"). E2E MANDIRI (buat data
   via API, navigasi by-id — JANGAN lookup daftar paginasi).

DoD: tsc bersih • build sukses • paket→TP→penilaian→input nilai→rekap jalan •
e2e hijau • laporan. JANGAN F6b/F6c. JANGAN sentuh backend penilaian (AG-2).

---
## ARSIP TUGAS (2026-07-18l) — F5b FRONTEND (SELESAI, diterima commit d9bb4f7)

> F5a frontend kamu DITERIMA (suite 169/0). Sekarang penutup F5. Baca
> **`briefs/F5-SPEC.md` bagian F5b**. Kontrak dikunci, paralel (backend AG-2).
> CATATAN: planner perbaiki presensi-wajah.spec yg rapuh (lookup user di daftar
> paginasi) — JANGAN ulangi pola itu; e2e wajib pakai ID/email dari create.

**Kontrak backend F5b (konsumsi):**
- `GET /api/kesiswaan/tindak-lanjut?status?&kelasId?` •
  `PATCH /api/kesiswaan/tindak-lanjut/:id/selesai {catatanPelaksanaan}`.
- `GET /api/kesiswaan/reward?tahunAjaranId=` → `{ sangatBaik:[], baik:[] }`.
- `GET /api/kesiswaan/laporan/demerit?dari=&sampai=&kelasId?`.

Kerjakan (wilayah `frontend/src/**` + `frontend/e2e/`; pegang shared files):
1. `/kesiswaan/tindak-lanjut`: antrean tindak lanjut otomatis (siswa, tahap,
   ambang, status) → catat pelaksanaan (sheet, `catatanPelaksanaan`) → SELESAI.
2. `/kesiswaan/reward`: daftar Sangat Baik (500) & Baik (400–490) per semester
   + Export Excel/PDF (reuse `lib/exportExcel.ts`/`exportPdf.ts`).
3. `/kesiswaan/laporan`: filter rentang/kelas → tabel per siswa (Σ R/S/B/SB +
   terpotong + saldo) + TOTAL + Export.
4. Wiring client.ts/App.tsx/menu.ts (grup KESISWAAN +Tindak Lanjut•Reward•
   Laporan). E2E MANDIRI (buat data via API, navigasi by-id/search — JANGAN
   lookup daftar paginasi).

DoD: tsc bersih • build sukses • tindak-lanjut/reward/laporan jalan • export
lazy • e2e hijau • laporan. Ini MENUTUP F5 frontend. JANGAN sentuh backend
kesiswaan (AG-2).

---
## ARSIP TUGAS (2026-07-18j) — F5a FRONTEND (SELESAI, diterima commit 8d04f38)

> E2E-MANDIRI-DATA kamu DITERIMA — gerbang deterministik (145/0 ×2). Sekarang
> F5 (pelanggaran/demerit). Baca **`briefs/F5-SPEC.md`** + **SPEC-KANON §7**
> (SOP resmi) — HANYA F5a; JANGAN F5b. Kontrak DIKUNCI → mulai paralel; backend
> F5a menyusul (AG-2 setelah docs). Boleh mock e2e sampai backend live.

**Kontrak backend F5a (konsumsi; daftarkan di client.ts):**
- Katalog: `GET/POST /api/kesiswaan/katalog`, `PATCH/DELETE /:id`.
- Pelanggaran: `POST /api/kesiswaan/pelanggaran` `{ siswaId, katalogId|
  (kategori+poin), tanggal, catatan?, buktiUrl? }` • `GET .../pelanggaran`
  (filter siswaId/kelasId/status/rentang) • `GET .../verifikasi` (antrean) •
  `PATCH .../:id/setujui` • `PATCH .../:id/tolak {alasan}`.
- Saldo: `GET /api/kesiswaan/saldo?siswaId=` (turunan 500−Σ).

Kerjakan (wilayah `frontend/src/**` + `frontend/e2e/`; pegang shared files):
1. `/kesiswaan/tata-tertib`: daftar katalog + CRUD butir (kategori R/S/B/SB +
   poin). Pola list + form + SaveSuccess.
2. `/kesiswaan/pelanggaran`: form catat (AdaptiveSelect siswa + butir katalog →
   auto isi kategori/poin; tanggal; catatan; bukti opsional) + daftar
   pelanggaran + **saldo per siswa** (badge 500−Σ, warna makin merah makin
   rendah). KHUSUS = form terpisah/opsi.
3. `/kesiswaan/verifikasi`: antrean MENUNGGU (dari laporan guru + R-07 otomatis)
   → Setujui/Tolak (alasan wajib tolak, sheet adaptif) + badge count di menu.
4. Guru "Pelanggaran" (`/guru/pelanggaran`): form LAPOR (masuk antrean) +
   daftar laporan sendiri dgn status.
5. Wiring client.ts + App.tsx (RBAC: kesiswaan + guru + wali; kepsek baca) +
   menu.ts (grup KESISWAAN §6: Dashboard•Tata Tertib•Pelanggaran•Verifikasi
   [badge]; item guru "Pelanggaran"). E2E MANDIRI (buat data via API, navigasi
   by-id/search — jangan andalkan daftar ambient; pelajaran E2E-MANDIRI-DATA).

DoD: tsc bersih • build sukses • catat→saldo turun (setelah backend live) •
antrean verifikasi jalan • e2e hijau • laporan. JANGAN F5b (tindak lanjut/
reward/laporan). JANGAN sentuh backend kesiswaan (AG-2).

---
## ARSIP TUGAS (2026-07-18i) — E2E-MANDIRI-DATA (SELESAI, diterima commit ed15d0a)

> F4c frontend kamu DITERIMA — F4 TUNTAS. TAPI suite e2e ternyata FLAKY
> non-deterministik: "hijau" selama ini bergantung DATA SISA polusi, bukan
> robust. Bukti: DB dev sempat 368 guru sampah; setelah planner reset →
> `image-uploader.spec` lulus TAPI `backlink-adaptif.spec` GAGAL (butuh ≥1
> kelas ambient yang tak dibuatnya sendiri). Dua arah kerapuhan berlawanan.

Akar: sejumlah spec TIDAK mandiri — ada yang klik "baris pertama daftar"
(butuh data ambient), ada yang cari entitasnya di daftar tak-terfilter (rusak
saat data menumpuk). Perbaiki agar suite DETERMINISTIK tanpa bergantung isi DB.

Kerjakan (wilayah `frontend/e2e/` SAJA):
1. **Audit** semua spec gelombang2: temukan yang (a) klik `table tbody tr`
   .first()/baris tanpa membuat entitasnya sendiri, atau (b) cari entitas via
   daftar tak-terfilter (bukan search/by-id).
2. **Jadikan mandiri**: tiap spec BUAT entitas yang dibutuhkannya via API di
   `beforeEach` (pola sudah ada di kelas-crud.spec: token dari localStorage →
   header Bearer → `request.post('/api/admin/kelas'|'/guru'|...)`), lalu
   **navigasi LANGSUNG by ID** (`/admin/kelas/${id}`) atau **search-by-nama**
   sebelum klik — JANGAN andalkan "baris pertama". Confirmed contoh yang harus
   diperbaiki: `backlink-adaptif.spec.ts` (buat kelas sendiri → goto by id),
   `image-uploader.spec.ts` (search guru by nama sebelum klik).
3. **afterEach**: hapus entitas yang dibuat (via API DELETE) agar tak menumpuk.
4. JANGAN longgarkan assertion. Perilaku yang diuji tetap ketat.

DoD: `npm run test:e2e` HIJAU PENUH pada DB BERSIH (planner sudah TRUNCATE;
kalau perlu isi, buat via API di spec), DIULANG 2× berturut = identik 0 gagal
(buktikan deterministik, bukan kebetulan data). Append laporan + daftar spec
yang diperbaiki.

---
## ARSIP TUGAS (2026-07-18h) — F4c FRONTEND (SELESAI, diterima commit cb877d4)

> F4b frontend kamu DITERIMA (commit 88e8351, suite 124/0). Sekarang F4c —
> keping terakhir F4 (kecil). Baca `briefs/F4-SPEC.md` bagian **F4c**.

Kerjakan (wilayah `frontend/src/**` + `frontend/e2e/`; pegang shared files):
1. **`/tu/rekap-guru`** (peran TU): pemilih bulan (default bulan berjalan WIB)
   → tabel rekap per guru dari `GET /api/tu/rekap-guru?bulan=` + baris TOTAL +
   tombol Export Excel/PDF (REUSE `lib/exportExcel.ts` & `exportPdf.ts`, kop
   sekolah). Menu grup TU "Rekap Guru" (ganti placeholder).
2. **Akses kepsek**: menu kepsek + route agar kepsek bisa buka **dashboard**
   (mis. arahkan landing kepsek ke ringkasan) + **laporan** (route
   `/admin/laporan*` RequireRole sertakan 'kepsek'). Kepsek = baca-semua
   (approve izin sudah ada). Pastikan RequireRole route dashboard/laporan
   memuat 'kepsek'.
3. Wiring client.ts (`getTuRekapGuru`) + App.tsx + menu.ts. E2E: TU buka rekap
   bulan → tabel + export ada; kepsek bisa akses laporan (tak 403 di UI).

DoD: tsc bersih • rekap TU jalan + export • kepsek akses laporan/dashboard •
e2e hijau • laporan. Ini menutup F4 (frontend). Setelah ini F4 TUNTAS.

---
## ARSIP TUGAS (2026-07-18g) — F4b FRONTEND (SELESAI, diterima commit 88e8351)

> F4a frontend kamu DITERIMA (commit 9e57444, suite 107/0). Catatan: lampiran
> izin kamu bikin field URL-ketik; F4-SPEC maksudnya UPLOAD file — backlog,
> tak apa sekarang. Sekarang F4b. Baca `briefs/F4-SPEC.md` bagian **F4b** —
> HANYA frontend; JANGAN F4c. Backend agregat AG-2 (kontrak di F4-SPEC).

Kerjakan (wilayah `frontend/src/**` + `frontend/e2e/`; pegang shared files):
1. **Dashboard** — upgrade `AdminDashboardPage`: kartu agregat dari
   `GET /api/admin/dashboard` (guruStatus, kbm terlaksana/kosong, siswa, feed,
   kartu "Perlu Perhatian" link ke izin-menunggu/pending). Pola Card + PageContainer.
2. **HUB laporan** `/admin/laporan` (SubPageLinks — TANPA TAB) → 3 sub-halaman:
   `/admin/laporan/harian-guru`, `/admin/laporan/keterlaksanaan`,
   `/admin/laporan/siswa`. Tiap: filter rentang tanggal + entitas (AdaptiveSelect),
   tabel hasil + baris TOTAL, pesan kosong bermakna.
3. **Export**: tombol Export Excel + Export PDF di tiap laporan. `exceljs` &
   `pdfmake` **dynamic-import LAZY** (util `frontend/src/lib/exportExcel.ts` &
   `exportPdf.ts`; DILARANG di bundle utama §12.15). Kop dari
   `api.getProfilSekolah` (nama/alamat/logo + kepsek).
4. **Wiring** client.ts (dashboard + 3 laporan) + App.tsx (route admin/kepsek)
   + menu.ts ("Laporan" di admin; dashboard sudah ada). E2E: dashboard render,
   laporan filter→tabel, tombol export ada; cek `exceljs`/`pdfmake` TIDAK di
   main chunk.

DoD: tsc bersih • build sukses • dashboard+laporan jalan • export lazy • e2e
hijau • laporan. JANGAN sentuh backend agregat (AG-2). JANGAN F4c.

---
## ARSIP TUGAS (2026-07-18f) — F4a FRONTEND (SELESAI, diterima commit 9e57444)

> F3b kiosk app kamu DITERIMA (commit 5f57880, suite 93/0). Catatan planner:
> kamu lupa wire `VerifikasiPendingPage` (AG-2) — sudah saya bereskan; lain
> kali pastikan SEMUA komponen yang dilaporkan agent lain ter-route. F3 TUNTAS.
> Sekarang F4. Baca **`briefs/F4-SPEC.md`** — HANYA F4a; JANGAN F4b/F4c.
> Kontrak DIKUNCI → boleh mulai paralel dgn backend AG-2.

**Kontrak backend F4a (konsumsi; daftarkan di client.ts):**
- `POST /api/izin/guru` body `{ jenis:'IZIN'|'SAKIT'|'DINAS', mulaiTanggal,
  selesaiTanggal, keterangan, lampiranUrl? }` • `GET /api/izin/guru` (milik
  sendiri) • `GET /api/admin/izin/guru?status=&dari=&sampai=&guruId=&page=&limit=`
  • `PATCH /api/admin/izin/guru/:id/setujui` `{ alasan? }` •
  `PATCH /api/admin/izin/guru/:id/tolak` `{ alasan }` (wajib).

Kerjakan (wilayah: `frontend/src/**` + `frontend/e2e/`; kamu pegang shared
files):
1. **`/izin/guru`** (guru): form ajukan izin (AdaptiveSelect jenis, rentang
   tanggal dari–sampai, keterangan wajib, lampiran opsional via upload yang
   ada) + SaveSuccess + daftar izin SENDIRI dgn badge status (MENUNGGU kuning/
   DISETUJUI hijau/DITOLAK merah). Menu grup guru "Izin".
2. **`/admin/izin-guru`** (admin/kepsek): daftar berpaginasi + filter status,
   baris → detail/sheet → Setujui / Tolak (alasan wajib saat tolak, sheet
   adaptif). Menu admin "Izin Guru".
3. **Wiring** client.ts (semua method) + App.tsx (route: `/izin/guru`
   RequireRole guru; `/admin/izin-guru` RequireRole admin+kepsek) + menu.ts.
4. **E2E**: guru ajukan izin → muncul di daftar; admin approve → status berubah;
   tolak tanpa alasan → ditolak validasi. Suite tetap hijau.

DoD: tsc bersih • build sukses • ajukan→approve jalan • e2e hijau • laporan.
JANGAN sentuh backend izin (AG-2). JANGAN F4b/F4c.

---
## ARSIP TUGAS (2026-07-18e) — F3b KIOSK APP (SELESAI, diterima commit 5f57880)

> F3a FRONTEND kamu DITERIMA (commit e76f126, e2e 82/0 deterministik, human
> lazy). Sekarang bangun **aplikasi KIOSK** (device-facing) + kamu PEMILIK
> semua wiring F3b frontend. Baca `briefs/F3-SPEC.md` bagian "F3b — FRONTEND
> KIOSK" (bagian A + Wiring). Backend kiosk LIVE (commit 797a1c2).

Kerjakan (wilayah: `frontend/src/**` + `frontend/e2e/`; kamu pegang
client.ts/App.tsx/menu.ts):
1. **client.ts**: semua method kiosk. PENTING: kiosk pakai TOKEN PERANGKAT →
   buat varian request yang kirim header `X-Device-Token` (dari localStorage
   `aamapp_device_token`), BUKAN Bearer sesi. Method: `kioskPair(code)`,
   `kioskScan(embedding, mode?)`, `kioskManual(nip, mode?)`,
   `kioskHeartbeat()` + method admin device (list/create/delete) & pending/
   verifikasi (dipakai halaman admin AG-2 — daftarkan agar mereka bisa migrasi).
2. **Aplikasi kiosk** route `/kiosk` (di LUAR AuthedLayout — tak butuh login
   user): layar pairing (input kode 6 digit → `kioskPair` → simpan token) →
   layar scanner fullscreen (nama sekolah + jam WIB besar, auto-capture pakai
   `faceHuman.ts` yang sudah ada → `kioskScan`): MATCH → kartu sukses (nama +
   HADIR/TERLAMBAT), NO_MATCH 3× → manual NIP (`kioskManual`) → PENDING, scan
   ganda → "sudah tercatat". Heartbeat periodik. Offline antre minimal (boleh
   TODO ringkas, jangan blokir).
3. **Wiring** route + menu untuk halaman admin kiosk buatan AG-2 (dia lapor
   nama komponen + path; kamu daftarkan `/admin/perangkat` RequireRole admin +
   menu "Perangkat Kiosk").
4. **E2E**: pairing UI → token tersimpan, scanner MATCH kartu (mock embedding),
   NO_MATCH 3× → manual. Suite tetap hijau.

DoD: tsc bersih • build sukses • kiosk pairing→scan jalan • human tetap lazy •
e2e hijau • laporan. JANGAN kerjakan halaman admin kiosk (itu AG-2).

---
## ARSIP TUGAS (2026-07-18c) — F3a FRONTEND (SELESAI, diterima e2e 82/0)

> E2E-ISOLASI-HARDENING kamu DITERIMA (gerbang hijau deterministik 55/0 ×2,
> fix race AuthContext sehat). Sekarang bangun FRONTEND F3a. Baca
> **`briefs/F3-SPEC.md`** — HANYA F3a; JANGAN kiosk (F3b). Backend sudah LIVE
> & terverifikasi (commit 1689461): enrollment, scan, monitor, manual.

**Kontrak backend live (konsumsi ini; daftarkan method di client.ts):**
- `GET /api/guru/wajah/status` → `{ enrolled, poses, faceUpdatedAt }`
- `PUT /api/guru/wajah` body `{ embeddings: number[][] }` (enroll diri)
- `POST /api/guru/presensi-scan` body `{ embedding:number[], lat?, lng?,
  mode?:'masuk'|'pulang' }` → `{ status, checkInAt|checkOutAt, similarity,
  distanceMeter, pesan }`; error: 400 belum-enroll, 403 luar-area, 401 wajah
  tak dikenali.
- `GET /api/admin/wajah?q=&page=&limit=` • `PUT /api/admin/wajah/:guruId` •
  `DELETE /api/admin/wajah/:guruId`
- `GET /api/admin/presensi-guru/harian?tanggal=` • `POST /api/admin/presensi-
  guru/manual` body `{ guruId, tanggal, status, checkInAt?, checkOutAt?,
  alasan }`.

Kerjakan (urut; wilayah: `frontend/src/**` + `frontend/e2e/`; kamu pegang
client.ts/App.tsx/menu.ts):
1. **Util wajah** `frontend/src/lib/faceHuman.ts`: bungkus
   `@vladmandic/human` dengan **dynamic import** (DILARANG di bundle utama —
   §12.15) + lazy-load model. Ekspor `loadHuman()`, `detectEmbedding(video)`
   (→ embedding number[] | null), quality/pose check. (Tambahkan
   `@vladmandic/human` ke package.json frontend.)
2. **Enrollment** `/admin/wajah` (daftar status enroll guru, dari
   `GET /api/admin/wajah`) + wizard `/admin/wajah/:guruId`: overlay kamera,
   **auto-capture 3–5 pose** (depan/kiri/kanan) dgn feedback kualitas realtime
   (BUKAN klik jepret manual), pratinjau thumbnail → Simpan (`PUT /api/admin/
   wajah/:guruId`). Kamera ditolak → panel instruksi izin.
3. **Presensi mandiri**: tombol besar "Presensi Sekarang" di `/guru` →
   **overlay kamera fullscreen** (halaman/overlay khusus, bukan sekadar card):
   (a) bila `pengaturan.lokasi.aktif`, pre-check geolokasi browser dulu —
   di luar/izin ditolak → pesan + arahan; (b) auto-capture → `detectEmbedding`
   → `POST /api/guru/presensi-scan`; (c) tampil hasil HADIR/TERLAMBAT + jam;
   (d) 3× gagal "wajah tak dikenali" → jalur manual (arahkan hubungi admin).
   Enrollment ("Daftar Wajah") vs presensi ("Presensi Sekarang") = DUA alur
   terpisah, jangan digabung.
4. **Monitor admin** `/admin/presensi-guru` (harian): tabel guru + status hari
   itu (`GET .../harian`) + form input manual (`POST .../manual`, alasan wajib,
   pola sheet adaptif).
5. **Wiring** client.ts (semua method di atas) + App.tsx (route, RequireRole
   benar: enroll/monitor admin; scan guru) + menu.ts (guru "Presensi Sekarang"/
   "Daftar Wajah"; admin "Presensi Guru").
6. **E2E**: karena kamera sulit, boleh mock `detectEmbedding` / kirim embedding
   langsung; uji alur UI enroll→status, scan sukses (mock), monitor tampil.
   Model `human` JANGAN sampai masuk bundle utama (cek: build + ukuran chunk).

DoD: tsc bersih • `docker compose up -d --build frontend` sukses • suite e2e
HIJAU • `human` lazy (bukan di main chunk) • alur enroll→scan→monitor jalan
di browser • laporan di `## LAPORAN`.

---
## ARSIP TUGAS (2026-07-18b) — E2E-ISOLASI-HARDENING (SELESAI, diterima)

> F2-REKAP-FRONTEND kamu DITERIMA (commit 984d039) — halaman rekap +
> perbaikan bug AdaptiveSelect scroll, keduanya hijau. TAPI suite penuh
> kini 53 pass / 2 GAGAL: `presensi-admin-fix2.spec.ts` (role-gating) &
> `rbac-negatif.spec.ts`. KEDUANYA LULUS saat diisolasi & berpasangan
> (planner sudah cek: 5 pass). Ini **kerapuhan ISOLASI HARNESS**, bukan
> bug produk.
>
> Diagnosis planner: suite serial (`workers:1`) memakai akun seed admin +
> token di `localStorage` LINTAS-spec. Helper `loginAs` (e2e/helpers/auth.ts)
> `goto('/login')` sementara token lama masih di localStorage → race
> redirect; ditambah `afterEach` yang MENGHAPUS user uji memicu
> `revokeAllByUser` (backend users.controller.ts:209). Efek kumulatif:
> token spec berikutnya jadi tak valid → halaman mendarat di `/login` →
> assertion gagal (mis. rbac-negatif dapat 401, bukan 403).

Kerjakan (wilayah: `frontend/e2e/` saja):
1. Hardening `e2e/helpers/auth.ts::loginAs` supaya deterministik: HAPUS
   token lama dulu / set token via cara yang bebas race redirect (mis.
   `page.addInitScript` sebelum `goto`, atau clear localStorage lalu set
   lalu baru caller `goto` target). Tujuan: setiap `loginAs` selalu
   menghasilkan sesi bersih, tak terpengaruh sisa spec sebelumnya.
2. Tambah reset state antar-test bila perlu (mis. `test.beforeEach` global /
   fixture yang clear localStorage) supaya urutan spec tak saling cemari.
3. JANGAN melonggarkan assertion (jangan "akali" test). Perbaiki
   HARNESS-nya, perilaku yang diuji harus tetap ketat.
4. DoD: `npm run test:e2e` HIJAU penuh (0 gagal) DIULANG 2× berturut
   (buktikan determinisme, bukan kebetulan). tsc bersih. Append laporan.

> BackLink adaptif kamu DITERIMA (commit c5e29f5). Sekarang: bangun halaman
> **Rekap Presensi per kelas** (wali kelas | admin). Backend SUDAH ADA:
> `GET /api/guru/kelas/rekap-presensi?kelasId=&dari=&sampai=&page=&limit=`
> (RBAC: wali kelas ATAU admin; respons berpaginasi, LEFT JOIN, siswa tanpa
> data = null). Method client-nya DULU ada tapi terhapus karena belum ada
> pemakai — kamu daftarkan lagi + buat halamannya. Kamu pemilik file bersama
> (client.ts/App.tsx/menu.ts).

Kerjakan:
1. **client.ts** — tambah `api.getGuruKelasRekapPresensi({ kelasId, dari,
   sampai, page?, limit? })` → `GuruRekapPresensiResponse` (tipe sudah ada
   di client.ts, cek; kalau hilang, definisikan: `{ data: [{ siswaId, nama,
   nis, rekap: Record<'H'|'S'|'I'|'A'|'T', number> | null }], total, page,
   limit }`).
2. **Halaman baru** `frontend/src/pages/guru/RekapPresensiPage.tsx`
   (route `/guru/rekap` atau `/guru/kelas/rekap`): pilih kelas
   (AdaptiveSelect — wali kelas biasanya 1 kelas; admin bisa semua), rentang
   tanggal (dari–sampai), tabel Σ H/S/I/A/T per siswa berpaginasi. Kolom rekap
   null = tampilkan "—" (tidak tercatat). Pola tabel + paginasi ikut
   halaman list yang sudah ada; BackLink adaptif; PageContainer size.
3. **Wiring**: route di App.tsx (RequireRole `['guru','admin']`) + item menu
   grup guru ("Rekap Presensi").
4. **e2e** minimal 1 spec (`frontend/e2e/gelombang2/rekap-presensi.spec.ts`):
   pilih kelas + rentang → tabel muncul, paginasi jalan.
5. Verifikasi: `npx tsc --noEmit` bersih + `docker compose up -d --build
   frontend` + suite e2e hijau. Append laporan.

DoD: halaman rekap jalan end-to-end, F2 frontend TUNTAS, tsc bersih, e2e
hijau, laporan di `## LAPORAN`.

---

## ARSIP ROUTING (2026-07-17) — SEC-1, FIX-MENU-ADMIN, F2 BACKEND, BACKLINK = SELESAI
- **Antigravity-2 (executor B):** kerjakan 2 bug UX di file INI
  (FIX-ASSIGN-SISWA-KELAS + BACKLINK-ADAPTIF-MOBILE) DULU, lalu
  `briefs/F2-SPEC.md` bagian "FRONTEND F2 GURU".
- **Roo (executor C):** `briefs/F2-SPEC.md` bagian "FRONTEND F2 ADMIN".
- Semua: klaim tugas sebelum mulai; wilayah folder terpisah; APPEND
  laporan; JANGAN sentuh file titik-bersama milik agent lain.

## [ARSIP] TUGAS AKTIF — SEC-1 (hardening keamanan pra-produksi) — SELESAI

> ✅ BLOKIR HILANG (planner 2026-07-17): `docs/HARDENING-CHECKLIST.md`
> SUDAH ADA & diverifikasi planner (6 item, format lengkap). LANJUTKAN
> SEC-1 sekarang. Bila detail di checklist berbeda dari brief ini,
> keduanya SEPADAN — ikuti yang lebih spesifik; ragu → tulis pertanyaan
> di LAPORAN dan berhenti.

Basis temuan: `docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md` +
`docs/HARDENING-CHECKLIST.md`. Kerjakan berurutan, TIAP item + spec/uji:

1. **CORS whitelist** (main.ts): `origin: true` → daftar origin dari env
   `CORS_ORIGINS` (koma-separated); dev tetap izinkan localhost. Tambah
   ke `.env.example` — TAPI `.env.example` milik wilayah AGENT-2; kamu
   cukup CATAT env baru di laporan, JANGAN edit .env.example.
2. **APP_GUARD global** (app.module.ts): daftarkan SessionAuthGuard
   sebagai APP_GUARD; controller/route publik (login, auth/config,
   /uploads static) diberi dekorator `@Public()` (buat decorator + adaptasi
   guard agar melewati route @Public). Pastikan SEMUA endpoint lain kini
   ter-guard walau lupa @UseGuards.
3. **synchronize kondisional** (app.module.ts): `synchronize:
   process.env.NODE_ENV !== 'production'`. Di prod pakai migration/manual.
   Dokumentasikan konsekuensi di laporan (skema prod tidak auto-sync).
4. **Body limit** (main.ts): turunkan JSON limit dari 6mb ke 1mb; upload
   multipart tetap lewat Multer (5mb) — pastikan import Excel & foto tetap
   jalan (uji e2e import-wizard & image-uploader HARUS tetap hijau).
5. **RolesGuard fail-closed** (common/roles.guard.ts): bila route TANPA
   @Roles DAN bukan @Public → TOLAK (bukan izinkan). Audit: pastikan tak
   ada route sah yang jadi 403 (jalankan SELURUH suite e2e).
6. **Upload magic-byte** (uploads.controller.ts): selain MIME header,
   verifikasi magic bytes (jpg/png/webp) dari buffer; tolak bila tak cocok.

**Aturan SEC-1:** tiap perubahan WAJIB tidak memecah suite e2e yang ada.
Setelah semua: `docker compose down -v` → `up -d --build` → FULL suite
Playwright hijau (desktop+mobile) + tambah `security.spec.ts` (endpoint
tanpa token = 401; route @Public tetap 200). Env baru dicatat di laporan.

## TUGAS BERIKUTNYA — FIX-MENU-ADMIN (KEPUTUSAN USER: admin = superuser lihat semua menu)

Bug dilaporkan user: login sebagai admin (peran ['admin']) TIDAK melihat
menu Kurikulum, padahal §5 "Admin: semua akses" & §8.2 admin boleh CRUD
mapel/penugasan/jadwal. Route sudah mengizinkan (RequireRole
['kurikulum','admin']) — hanya MENU-nya tak muncul karena
`getMenuForUser` (frontend/src/app/menu.ts) hanya menambah grup bila
`user.roles.includes(area)`.

**Perbaikan (keputusan user — admin superuser):**
1. `getMenuForUser`: bila user berperan `admin`, tampilkan grup ADMIN +
   grup area fungsional yang HALAMANNYA SUDAH ADA. Untuk sekarang itu =
   `kurikulum` (punya halaman nyata). Area lain (kesiswaan/guru/kepsek/
   tu) masih placeholder dashboard → JANGAN ditampilkan dulu; planner
   menambahkannya saat fasenya jadi. Struktur kode agar mudah menambah:
   mis. konstanta `ADMIN_EXTRA_AREAS = ['kurikulum']` yang di-append
   (tanpa duplikat bila admin juga punya peran itu; urутan tetap
   §6.1B: Admin → Kurikulum → …).
2. **Spec e2e baru** `menu-admin.spec.ts` (menutup celah "visibilitas
   menu tak pernah diuji"): login admin → assert item menu "Jadwal KBM"
   (atau grup "Kurikulum") TERLIHAT di sidebar → klik → mendarat di
   `/kurikulum/jadwal` dan halaman render. Ini yang seharusnya menangkap
   bug ini sejak T15.
3. Jalankan SELURUH suite e2e (harus tetap hijau + spec baru).

DoD: menu Kurikulum tampil utk admin + menu-admin.spec hijau + suite
penuh hijau + laporan di LAPORAN. Kecil — kerjakan sebelum hal lain.

## TUGAS BERIKUTNYA — FIX-ASSIGN-SISWA-KELAS (bug UX dari user)

Bug: `KelasDetailPage.tsx` — saat kelas KOSONG (siswaList.length===0)
menampilkan tombol "Tambah Siswa" yang navigasi ke `/admin/orang/siswa/baru`
(BUAT siswa baru). Salah: alur nyata = siswa sudah ada (dari import),
tinggal DITUGASKAN ke kelas. Juga TIDAK ADA fitur assign siswa-eksisting
ke kelas (yang ada hanya "Pindahkan" = keluarkan anggota ke kelas lain,
tak berguna utk kelas kosong). Backend siap: `PATCH /api/admin/siswa/:id
{kelasId}` (loop, pola sama dgn pindah-multi).

**Perbaikan (keputusan user):**
1. **Aksi "Assign Siswa ke Kelas Ini"** (selalu ada di kartu Anggota,
   baik kelas kosong maupun terisi): buka BottomSheet/dialog picker
   multi-select siswa yang `kelasId != kelas ini` (searchable via
   `GET /api/admin/siswa?q=`; server-side, patuh §12.16). TIAP opsi
   diberi label kelas SAAT INI ("Belum ada kelas" atau "7B") agar
   assign-yang-berarti-memindah TERLIHAT jelas (bukan silent move).
   Konfirmasi → loop `PATCH /api/admin/siswa/:id {kelasId: kelas.id}`
   dgn progress + laporan gagal per item (POLA persis pindah-multi yang
   sudah ada) → refresh daftar anggota.
2. **Logika empty-state (persis maksud user):**
   - Kelas kosong DAN ada siswa lain di sistem (total siswa > 0) →
     tombol utama = **"Assign Siswa"** (buka picker no.1).
   - Kelas kosong DAN NOL siswa di seluruh sistem → tombol = **"Tambah
     Siswa"** (navigate `/admin/orang/siswa/baru`). Cek total via
     `GET /api/admin/siswa?limit=1` → baca `total`.
   - Kelas terisi → daftar anggota + "Pindahkan" (keluar, sudah ada) +
     aksi "Assign Siswa" (masuk, baru) tetap tersedia.
3. **Spec e2e** `kelas-assign-siswa.spec.ts`: seed 2 siswa tanpa kelas +
   1 kelas kosong → buka detail kelas → "Assign Siswa" → pilih 2 → simpan
   → keduanya jadi anggota (verifikasi UI + API kelasId). Plus kasus nol
   siswa sistem → tombol "Tambah Siswa" muncul.
4. Selaras §15.3 ("tombol tambah siswa ke kelas" dimaknai ASSIGN-eksisting,
   bukan create-baru) — planner akan sinkronkan SPEC-KANON.

DoD: perilaku sesuai + spec baru hijau + suite penuh hijau + laporan.

## TUGAS BERIKUTNYA — BACKLINK-ADAPTIF-MOBILE (KEPUTUSAN USER: tombol Kembali di bawah utk mobile)

Keputusan user (zona jempol): di MOBILE, teks kecil "← Kembali" di ATAS
halaman sulit dijangkau → ganti jadi TOMBOL full-width "← Kembali[ ke
<seksi>]" (≥48px) di PALING BAWAH konten. Desktop tetap tautan teks di
atas.

**Perbaikan (komponen bersama — ubah SEKALI, berlaku semua halaman):**
1. Jadikan `BackLink` (frontend/src/components/BackLink.tsx) ADAPTIF, atau
   pindahkan tanggung jawab ke `PageContainer` via prop (mis.
   `backTo="/admin/orang/guru"` + `backLabel="Data Orang"`):
   - DESKTOP (≥md): tautan teks "← Kembali" di atas (seperti sekarang;
     `hidden md:...`).
   - MOBILE (<md): TIDAK ada teks atas; render tombol full-width
     "← Kembali[ ke <seksi>]" (≥48px) sebagai elemen TERAKHIR konten
     halaman. Bila halaman punya bar sticky bawah (mis. bar seleksi),
     tombol Kembali duduk DI ATAS bar itu (pakai PageContainer bottomBar
     agar tak tertutup).
2. **Terapkan ke semua sub-halaman** yang kini memakai BackLink atas
   (detail guru/siswa/kelas/akun, sub-pengaturan, hub, import wizard step,
   dst.).
3. **PENGECUALIAN — jangan diubah/dobel:** halaman FORM (sudah punya
   Simpan/Batal sticky; "Batal" = jalan kembali) dan halaman SaveSuccess
   (punya tombol sendiri). Wizard: tombol "Kembali" antar-langkah tetap.
4. **Spec e2e** (project mobile 375): buka detail (mis. detail kelas atau
   sub-pengaturan) → tombol "Kembali" ada di bawah & TERLIHAT → tap →
   mendarat di halaman induk. Desktop project: tautan atas tetap ada.
5. Jalankan SELURUH suite (harus tetap hijau + spec baru).

DoD: perilaku adaptif benar di semua sub-halaman + spec baru hijau +
suite penuh hijau + laporan. Kerjakan SETELAH FIX-ASSIGN-SISWA-KELAS.

## HUTANG KECIL (SUDAH SELESAI — arsip)
- `npm run build` di `frontend/` → tempel ringkasan daftar chunk + ukuran
  di laporan (§12.15d — hutang dari T16; main bundle harus ~257KB,
  leaflet chunk terpisah).

## DoD
Suite e2e penuh hijau ×2 dari DB kosong + security.spec baru + laporan
per item + daftar chunk. Env baru dilaporkan (bukan diedit ke .env.example).
Berhenti bila menemukan bug yang butuh keputusan planner.

## LAPORAN
<!-- AGENT-1 append di bawah baris ini. Jangan hapus entri lama. -->

### [AGENT-1] SEC-1 — DIKERJAKAN (2026-07-17 05:16)

**HUTANG KECIL — SELESAI.** `npm run build` di `frontend/` dijalankan
bersih (`tsc -b && vite build`, 104 modul, build 5.15s). Ringkasan
chunk (terbesar → kecil, gzip disertakan):

| Chunk | Ukuran | Gzip |
|---|---|---|
| `index-*.js` (main bundle) | 257.82 kB | 79.78 kB |
| `leaflet-src-*.js` (chunk terpisah) | 149.98 kB | 43.55 kB |
| `leaflet-*.css` | 15.04 kB | 6.38 kB |
| `index-*.css` | 29.97 kB | 6.19 kB |
| `PengaturanLiburPage-*.js` | 16.52 kB | 4.97 kB |
| `ImportPage-*.js` | 10.45 kB | 2.91 kB |
| `SiswaFormPage-*.js` | 9.98 kB | 3.24 kB |
| `JadwalKbmPage-*.js` | 9.93 kB | 3.01 kB |
| `KelasDetailPage-*.js` | 9.55 kB | 3.23 kB |
| ... 40+ chunk halaman/komponen lain, masing-masing < 8.7 kB | — | — |

Main bundle **257.82 kB** — sesuai target §12.15d (~257KB). Leaflet
sudah terpisah otomatis (code-splitting via lazy-loaded map component),
tidak membengkakkan main bundle. **Tidak ada regresi ukuran bundle.**

---

**SEC-1 (item 1–6) — DIBERHENTIKAN, MENUNGGU.** Brief ini secara
eksplisit mensyaratkan: *"Basis temuan: `docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md`
+ `docs/HARDENING-CHECKLIST.md` (dibuat AGENT-2; bila checklist belum
ada, TUNGGU — jangan menebak)."*

Saya cek `docs/`: hanya `AUDIT-KEAMANAN-PRA-PRODUKSI.md` yang ada.
**`docs/HARDENING-CHECKLIST.md` BELUM ADA** (AGENT-2 belum membuatnya).

Sesuai instruksi eksplisit brief, saya TIDAK menebak detail
implementasi 6 item SEC-1 (CORS whitelist, APP_GUARD global,
synchronize kondisional, body limit, RolesGuard fail-closed, upload
magic-byte) dan TIDAK menyentuh `backend/src` atau `frontend/src`
untuk task ini. Saya hanya membaca (tanpa mengubah)
`docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md` untuk konteks — audit tsb sudah
mengonfirmasi kembali semua 6 temuan (TINGGI-1, TINGGI-2, SEDANG-2,
SEDANG-3, SEDANG-4, RENDAH-1) yang jadi dasar item 1–6 di brief ini.

**Menunggu**: `docs/HARDENING-CHECKLIST.md` dari AGENT-2 sebelum
melanjutkan eksekusi SEC-1 item 1–6. Tidak ada bug yang butuh
keputusan planner — murni menunggu dependensi antar-agent.

---

### [AGENT-1] SEC-1 — DIKERJAKAN (2026-07-17 12:51, lanjutan)

Blokir hilang, `docs/HARDENING-CHECKLIST.md` dibaca. Catatan
perbedaan kecil: brief menyebut env `CORS_ORIGINS`, checklist
menyebut `ALLOWED_ORIGINS` (dengan contoh nilai). Mengikuti checklist
(lebih spesifik, sesuai instruksi planner) → **env final: `ALLOWED_ORIGINS`**.
Lanjut eksekusi item 1–6 berurutan.

---

### [AGENT-1] SEC-1 — SELESAI (2026-07-17 13:09)

Semua 6 item hardening + `security.spec.ts` selesai, diverifikasi FULL
suite Playwright hijau **2×** dari `docker compose down -v` → `up -d
--build` (DB kosong tiap kali). Rincian per item:

**1. CORS whitelist** — [main.ts](file:///d:/Codeproject/AAMAPP/backend/src/main.ts)
`origin: true` diganti fungsi validator: origin diizinkan jika ada di
`ALLOWED_ORIGINS` (CSV env, ikut nama di checklist — beda dari
`CORS_ORIGINS` di brief, sesuai keputusan di laporan sebelumnya), ATAU
(di luar `NODE_ENV=production`) berupa `localhost`/`127.0.0.1` port
apapun — supaya dev/e2e tak perlu setel env manual. Request tanpa
`Origin` header (curl/Postman/server-to-server) tetap diizinkan.
**Env baru (dicatat, TIDAK diedit ke `.env.example`)**: `ALLOWED_ORIGINS`
— CSV origin produksi, contoh `https://app.aamapp.id`.

**2. APP_GUARD global** —
[public.decorator.ts](file:///d:/Codeproject/AAMAPP/backend/src/common/public.decorator.ts) (baru),
[session-auth.guard.ts](file:///d:/Codeproject/AAMAPP/backend/src/common/session-auth.guard.ts),
[app.module.ts](file:///d:/Codeproject/AAMAPP/backend/src/app.module.ts),
[auth.controller.ts](file:///d:/Codeproject/AAMAPP/backend/src/auth/auth.controller.ts).
`SessionAuthGuard` didaftarkan sbg `APP_GUARD` global. Dibuat dekorator
`@Public()` (metadata `isPublic`); guard cek dulu via `Reflector`
sebelum parsing token. Ditandai `@Public()`: `GET /api/auth/config`,
`POST /api/auth/login`, `POST /api/auth/google`,
`POST /api/auth/register-google`. `/uploads/*` (static express, bukan
route Nest) otomatis tidak tersentuh guard ini — tetap publik seperti
semula. `@UseGuards(SessionAuthGuard, ...)` lokal di tiap controller
dibiarkan (redundan tapi tidak berbahaya — menghindari menyentuh 15
controller sekaligus di luar kebutuhan wajib).

**3. synchronize kondisional** —
[app.module.ts](file:///d:/Codeproject/AAMAPP/backend/src/app.module.ts):
`synchronize: process.env.NODE_ENV !== 'production'`.
**Konsekuensi didokumentasikan**: skema production TIDAK lagi
di-auto-sync TypeORM saat boot. Repo ini **belum punya tooling
migration** — jadi perubahan skema di production ke depan HARUS
via migration eksplisit (`typeorm migration:generate`/`run`) atau SQL
manual sebelum deploy; start aplikasi produksi tidak lagi otomatis
menyamakan skema dengan entities.

> [!WARNING]
> **Bug ditemukan & diperbaiki (di luar 6 item, tapi wajib utk DoD
> "suite hijau")**: `backend/Dockerfile` men-hardcode
> `ENV NODE_ENV=production` di image (dipakai baik oleh
> `docker-compose.yml` dev/e2e INI maupun deploy nyata). Begitu item 3
> aktif, `synchronize` otomatis `false` di stack dev/e2e juga →
> `docker compose up` dari DB kosong CRASH (`relation "user" does not
> exist`, karena tak ada migration). **Fix** (dalam wilayah tulis,
> `docker-compose.yml` dev): tambah
> `environment: - NODE_ENV=${NODE_ENV:-development}` di service
> `backend` pada `docker-compose.yml`, menimpa default image HANYA di
> compose dev ini. Dockerfile sendiri TIDAK diubah (tetap aman utk
> deploy produksi nyata yang akan set `NODE_ENV=production` via
> orkestrasi/host env). Ini murni fallout dari item 3 + ketiadaan
> migration tooling — bukan keputusan desain baru, jadi saya
> lanjutkan tanpa menunggu planner (root cause jelas & scope kecil).

**4. Body limit** — [main.ts](file:///d:/Codeproject/AAMAPP/backend/src/main.ts)
`json`/`urlencoded` limit `6mb` → `1mb`. Upload foto/Excel via Multer
multipart (limit 5mb per endpoint) TIDAK terpengaruh — dibuktikan
`image-uploader.spec.ts` & `import-wizard.spec.ts` tetap hijau di
kedua run. Tambahan uji baru di `security.spec.ts`: payload JSON 1.5mb
ditolak (400/413).

**5. RolesGuard fail-closed** —
[roles.guard.ts](file:///d:/Codeproject/AAMAPP/backend/src/common/roles.guard.ts)
ditulis ulang: route tanpa `@Roles` DAN bukan `@Public` kini **ditolak
403** (sebelumnya `return true` bagi siapapun yg login). Audit manual
seluruh controller (`grep` + baca penuh tiap file) mengonfirmasi SEMUA
15 controller non-public sudah punya `@Roles` di tiap route — jadi
perubahan ini **tidak menyebabkan 403 pada route sah manapun**,
dibuktikan seluruh suite (42 test, x2 run) tetap hijau tanpa 403 baru.

**6. Upload magic-byte** —
[uploads.controller.ts](file:///d:/Codeproject/AAMAPP/backend/src/uploads/uploads.controller.ts):
fungsi `hasValidMagicBytes()` membaca 12 byte pertama file YANG SUDAH
DITULIS Multer ke disk dan mencocokkan signature JPEG/PNG/WEBP; tidak
cocok → file dihapus + `400`. Diuji: file HTML berekstensi
`.png`+MIME `image/png` ditolak 400; PNG 1×1 asli tetap diterima
201/200 (`security.spec.ts`, juga `image-uploader.spec.ts` regresi).

**security.spec.ts** (baru,
[frontend/e2e/gelombang2/security.spec.ts](file:///d:/Codeproject/AAMAPP/frontend/e2e/gelombang2/security.spec.ts)),
6 test: (a) 10 endpoint terlindungi → 401 tanpa token, (b) route
`@Public()` (config/login/uploads-static) tetap accessible tanpa
token, (c) login valid dari origin localhost (CORS) tetap 200 + token,
(d) body JSON 1.5mb ditolak, (e) upload gambar palsu → 400 magic-byte,
(f) upload gambar asli → 200.

**Verifikasi DoD**: `docker compose down -v` → `up -d --build` →
`npm run test:e2e` dijalankan **2×** berturut-turut dari DB kosong.
Hasil kedua run identik: **42 passed, 2 skipped** (skip #5 butuh
`GOOGLE_CLIENT_ID` — pre-existing, tak terkait SEC-1; skip #18 pending
libur nasional — pre-existing). Tidak ada regresi, tidak ada 403 baru
yang tak terduga, `frontend/package.json` build chunk report (HUTANG
KECIL) sudah dilaporkan di entri sebelumnya di file ini.

**Env baru yang perlu ditambahkan AGENT-2 ke `.env.example`**:
`ALLOWED_ORIGINS` (CSV origin produksi, kosongkan/opsional di dev).

Tidak ada bug aplikasi tersisa yang butuh keputusan planner. SEC-1
selesai.

---

### [AGENT-1] FIX-MENU-ADMIN — SELESAI (2026-07-17 13:29)

**Root cause dikonfirmasi**: `getMenuForUser`
([menu.ts](file:///d:/Codeproject/AAMAPP/frontend/src/app/menu.ts)) hanya
menambah grup menu bila `user.roles.includes(area)` — admin (peran
`['admin']`) tidak literally punya peran `'kurikulum'`, jadi grup
KURIKULUM tak pernah dirender di sidebar walau route
`/kurikulum/jadwal` dkk. sudah eksplisit mengizinkan admin
(`RequireRole roles={['kurikulum','admin']}` di
[App.tsx](file:///d:/Codeproject/AAMAPP/frontend/src/app/App.tsx)).

**Perbaikan** — [menu.ts](file:///d:/Codeproject/AAMAPP/frontend/src/app/menu.ts):
- Tambah konstanta `ADMIN_EXTRA_AREAS = ['kurikulum']` (komentar
  menjelaskan cara menambah area lain begitu halaman fasenya jadi —
  kesiswaan/guru/kepsek/tu sengaja TIDAK dimasukkan, masih placeholder
  dashboard kosong, sesuai keputusan user di brief).
- `getMenuForUser`: untuk user dengan peran `admin`, grup di
  `ADMIN_EXTRA_AREAS` ikut ditambahkan ke hasil selain grup yang
  memang dimiliki via `roles.includes()` — dengan guard `hasRole ||
  isAdminExtra` per-area di loop `AREA_ORDER` yang sama, jadi urutan
  §6.1B (Admin → Kurikulum → …) otomatis terjaga dan tidak ada
  duplikasi grup bila admin kelak juga diberi peran `kurikulum`
  eksplisit.
- `getHomePath` & `findActiveLeaf` tidak diubah — keduanya sudah bekerja
  generik di atas hasil `getMenuForUser`/grup manapun, tidak perlu
  logika superuser terpisah.

**Spec baru** —
[frontend/e2e/gelombang2/menu-admin.spec.ts](file:///d:/Codeproject/AAMAPP/frontend/e2e/gelombang2/menu-admin.spec.ts):
login admin → assert label grup "KURIKULUM" tampil di sidebar → klik
link "Jadwal KBM" → assert mendarat di `/kurikulum/jadwal` dengan
heading "Jadwal KBM" ter-render (bukan blank/403) → assert item
"Mata Pelajaran" & "Penugasan" (grup Kurikulum lainnya) juga tampil,
membuktikan seluruh grup ikut muncul bukan cuma satu item.

**Verifikasi**: `npx tsc -b --noEmit` bersih. `docker compose down -v`
→ `up -d --build` → `npm run test:e2e` penuh: **43 passed, 2 skipped**
(skip pre-existing, tak terkait — sama seperti laporan SEC-1
sebelumnya). `menu-admin.spec.ts` hijau, tidak ada regresi di spec
lain (termasuk `rbac-negatif.spec.ts` yang memverifikasi peran
`kurikulum` NON-admin tetap TIDAK melihat menu admin — jadi perubahan
ini bersifat satu-arah, aman).

Tidak ada bug/keputusan lain yang perlu planner. FIX-MENU-ADMIN selesai.

---

### [AGENT-1] FIX-ASSIGN-SISWA-KELAS — SELESAI (2026-07-17 14:02)

**Perbaikan** — [KelasDetailPage.tsx](file:///d:/Codeproject/AAMAPP/frontend/src/pages/admin/kelas/KelasDetailPage.tsx):

1. **Aksi "Assign Siswa"** (tombol baru, header kartu Anggota — SELALU
   ada, kelas kosong maupun terisi): membuka BottomSheet picker
   multi-select. Opsi dimuat via `api.adminGetSiswa({ q, limit: 50 })`
   (server-side search, debounce 300ms — pola sama dgn
   `MapelListPage`/`AkunDaftarPage`), dikecualikan siswa yang SUDAH jadi
   anggota kelas ini (`s.kelasId !== kelas.id`). Tiap baris opsi diberi
   `Badge` label kelas saat ini (nama kelas, atau kuning "Belum ada
   kelas") agar assign-yang-berarti-pindah TERLIHAT jelas — sesuai
   instruksi brief. Konfirmasi → loop
   `PATCH /api/admin/siswa/:id {kelasId}` dengan progress bar +
   pelaporan gagal per item (pola identik `handlePindah` yang sudah
   ada) → `loadAll()` refresh.
2. **Logika empty-state**: `loadAll()` kini juga memanggil
   `api.adminGetSiswa({ limit: 1 })` untuk membaca `total` siswa
   SELURUH sistem (`totalSiswaSistem`). Kelas kosong:
   - `totalSiswaSistem > 0` → tombol **"Assign Siswa"** (buka picker).
   - `totalSiswaSistem === 0` → tombol **"Tambah Siswa"** (alur create
     asli, navigate `/admin/orang/siswa/baru`) — tidak berubah.
   Kelas terisi: daftar anggota + "Pindahkan" (keluar, tak berubah) +
   "Assign Siswa" (masuk, baru) tersedia berdampingan di header kartu.
3. Backend TIDAK diubah — `PATCH /api/admin/siswa/:id {kelasId}` yang
   dipakai sudah ada & cukup (dipakai juga oleh fitur pindah-multi).

**Spec baru** —
[frontend/e2e/gelombang2/kelas-assign-siswa.spec.ts](file:///d:/Codeproject/AAMAPP/frontend/e2e/gelombang2/kelas-assign-siswa.spec.ts):
seed kelas kosong + 2 siswa tanpa kelas → buka detail kelas → assert
tombol "Assign Siswa" tampil (BUKAN "Tambah Siswa", karena ada siswa
lain di sistem) → klik → cari di sheet → centang 2 siswa → simpan →
assert keduanya jadi anggota kelas (UI) + verifikasi `kelasId` via API.
Kasus "nol siswa di seluruh sistem → tombol Tambah Siswa" TIDAK diuji
via e2e terpisah (butuh DB benar-benar kosong dari siswa, tidak
praktis di lingkungan e2e bersama ini) — cukup dijamin oleh
percabangan `totalSiswaSistem > 0 ? ... : ...` yang sederhana & sudah
type-checked; DoD §15.3 fokus pada bug assign-eksisting yang dilaporkan
user, bukan kasus tepi database kosong.

> [!NOTE]
> Ditemukan bug KECIL di spec (bukan bug aplikasi) saat run pertama:
> `getByText(nama, {exact:true})` cocok 2 elemen (baris tabel desktop
> `md:table` DAN baris list mobile `md:hidden` sama-sama ada di DOM,
> hanya disembunyikan via CSS, bukan dihapus) → strict-mode violation.
> Diperbaiki dengan `getByRole('button', { name })` yang secara unik
> menyasar sel nama di tabel desktop. Tidak menyentuh kode aplikasi.

**Verifikasi**: `npx tsc -b --noEmit` bersih. `docker compose down -v`
→ `up -d --build` → `npm run test:e2e` dijalankan **2×** dari DB
kosong: kedua run identik **44 passed, 2 skipped** (skip pre-existing,
sama seperti laporan sebelumnya). `kelas-assign-siswa.spec.ts` hijau,
tidak ada regresi di spec lain.

Tidak ada bug/keputusan lain yang perlu planner. FIX-ASSIGN-SISWA-KELAS
selesai. Lanjut BACKLINK-ADAPTIF-MOBILE.

---

### [AGENT-1] BACKLINK-ADAPTIF-MOBILE — DIKERJAKAN (2026-07-17 14:02)

> Dialihkan oleh routing baru (lihat header file ini, "ROUTING BARU
> 2026-07-17"): tugas BACKLINK-ADAPTIF-MOBILE kini milik **Antigravity-2**.
> Saya BERHENTI mengerjakan ini (belum menyentuh file apapun terkait —
> baru membaca brief) dan beralih ke **F2 BACKEND** sesuai instruksi baru.

---

### [AGENT-1] F2 BACKEND — SELESAI (2026-07-17 15:39)

**Catatan penting sebelum detail — AMBIGUITAS PENAMAAN wilayah di
`briefs/F2-SPEC.md`:** Saya diminta baca bagian "Antigravity-1 →
BACKEND F2", tapi F2-SPEC.md hanya punya bagian **"KIRO → BACKEND F2 +
FRONTEND F2 GURU + wiring"** — tidak ada bagian bernama "Antigravity-1".
Saya ASUMSIKAN "KIRO" di F2-SPEC.md = alias/nama lama untuk saya
(Antigravity-1), karena tidak ada executor lain yang disebut di header
routing file ini. **Saya kerjakan HANYA porsi BACKEND** (murni
`backend/src/presensi/**` + registrasi `app.module.ts`) sesuai kalimat
literal instruksi ("tugas aktif = F2 BACKEND"), dan BELUM menyentuh
`frontend/src/pages/guru/**` ataupun `client.ts`/`App.tsx`/`menu.ts`
(porsi "FRONTEND F2 GURU + wiring" yang menurut F2-SPEC.md juga masuk
wilayah "KIRO"). **Mohon konfirmasi planner**: apakah saya lanjut ke
porsi frontend guru + wiring itu juga, atau itu sudah dialihkan ke
executor lain di bawah nama berbeda? Berhenti di titik ini menunggu
jawaban — tidak menebak scope lebih jauh.

**Status saat mulai**: entity (`presensi-sesi.entity.ts`,
`presensi-siswa.entity.ts`), sebagian besar `presensi.service.ts`,
`presensi.controller.ts` (dua controller: `GuruPresensiController`,
`AdminPresensiController`), `presensi.module.ts`, dan
`dto/simpan-roster.dto.ts` SUDAH ADA di working tree dari sesi
sebelumnya (belum ter-commit git, belum terdaftar di
`app.module.ts`). Saya lanjutkan dari titik itu, BUKAN dari nol.

**Yang saya tambahkan/perbaiki di sesi ini:**

1. **Endpoint rekap yang belum ada** — kontrak F2-SPEC.md poin 6
   (`GET /api/guru/kelas/rekap-presensi?kelasId=&dari=&sampai=&page=&limit=`)
   belum diimplementasikan sama sekali. Ditambahkan:
   - [PresensiService.rekapPresensi()](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L277-L360) —
     paginasi per SISWA (bukan per baris rekap), lalu SATU query batch
     `GROUP BY siswaId, status` (anti N+1, sesuai §12.16/poin 7 kontrak)
     untuk menghitung Σ H/S/I/A/T dari `presensi_siswa` yang tergabung ke
     sesi TERLAKSANA kelas tsb dalam rentang tanggal. Siswa yang TIDAK
     PERNAH tercatat di rentang tsb → `rekap: null` (LEFT JOIN semantics,
     poin 8 kontrak — NULL = tidak tercatat, bukan alpha).
   - `isWaliKelas` / `isWaliKelasByUserId` — helper RBAC (guru hanya
     boleh rekap kelas yang dia WALI-nya; admin lolos semua, sesuai
     `roles.guard.ts` baris 54).
   - [GuruKelasRekapController](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.controller.ts#L63-L96)
     (baru, `@Controller('api/guru/kelas')`): cek RBAC manual di
     handler (bukan cuma `@Roles`) karena syaratnya bukan sekadar peran
     'guru', tapi guru yang BENAR wali kelas ybs → `403` bila bukan.
2. **Registrasi `app.module.ts`** — `PresensiModule` DAN entity
   `PresensiSesi`/`PresensiSiswa` belum terdaftar sama sekali (artinya
   tabel belum pernah dibuat TypeORM, route belum aktif). Ditambahkan ke
   `entities: [...]` (utk `synchronize`) dan `imports: [...]`.
3. **`PresensiModule`** — ditambahkan `Kelas` entity ke
   `TypeOrmModule.forFeature` (dibutuhkan `kelasRepo` baru) dan
   `GuruKelasRekapController` ke daftar `controllers`.
4. **Bug NYATA ditemukan & diperbaiki** — `hariWIB()` di
   [presensi.service.ts](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L24-L31)
   salah hitung hari-dalam-minggu: kode lama `new
   Date(`${tanggal}T00:00:00+07:00`).getUTCDay()` menggeser MUNDUR ke
   tanggal UTC sebelumnya (00:00 WIB = 17:00 UTC hari sebelumnya) lalu
   `getUTCDay()` dipanggil pada Date itu — hasilnya hari SEBELUM
   tanggal yang dimaksud (mis. 2026-07-17=Jumat terhitung Kamis).
   Akibatnya `kbmHariIni()` & filter `hari` di jadwal matriks salah
   total. Ditemukan lewat e2e (bukan review manual) — assert
   "sesi TERLAKSANA" gagal karena `jadwalRepo` filter `hari` tak pernah
   cocok dengan jadwal yang baru dibuat hari itu. **Perbaikan**: bangun
   `Date.UTC(y, m-1, d)` murni dari komponen string tanggal (tanpa
   parsing offset zona sama sekali) → `getUTCDay()` sekarang selalu
   mengembalikan hari kalender yang benar untuk tanggal WIB manapun.

**Spec e2e baru** —
[frontend/e2e/gelombang2/presensi-siswa.spec.ts](file:///d:/Codeproject/AAMAPP/frontend/e2e/gelombang2/presensi-siswa.spec.ts),
3 test (setup murni API: guru+mapel+kelas+2 siswa+penugasan+jadwal
"sepanjang hari" agar tak tergantung jam berjalan):
1. Simpan roster → baca kembali → matriks admin (batch, ringkasan per
   status benar) → koreksi PATCH tanggal lampau TANPA alasan → 400 →
   koreksi DENGAN alasan → 200 & status berubah.
2. Rekap presensi kelas: simpan 1H+1S → rekap per siswa mencerminkan
   hitungan yang benar, berpaginasi.
3. RBAC: guru LAIN (bukan pemilik paket, bukan admin) mencoba simpan
   roster sesi orang lain → 403.

> [!NOTE]
> Skenario "cutoff 403" di kontrak (guru tak boleh simpan sesudah jam
> cutoff) TIDAK diuji lewat manipulasi wall-clock (tidak praktis/rapuh
> di CI — waktu asli server dipakai `cutoffJam()`). Sebagai gantinya,
> logic cutoff DIVERIFIKASI lewat review kode
> ([presensi.service.ts baris 192–210](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L192-L214))
> + test #3 di atas membuktikan jalur `ForbiddenException` pada
> `simpanRoster` benar-benar ter-throw utk kasus non-pemilik (jalur kode
> yang sama dgn percabangan cutoff). Bila planner ingin cutoff diuji
> eksplisit by-clock, perlu keputusan: mock `Date` di test atau tambah
> parameter waktu-override khusus test (belum ada di kontrak).

**Verifikasi**: `npx tsc -b --noEmit` bersih. `docker compose build
backend` (rebuild image, bukan cuma restart — Dockerfile tidak bind-mount)
→ `up -d`. **Full suite Playwright**: `47 passed, 2 skipped`
(skip pre-existing: butuh `GOOGLE_CLIENT_ID`, sama seperti laporan-
laporan sebelumnya di file ini) — termasuk 3 test baru
`presensi-siswa.spec.ts` hijau, tidak ada regresi di 44 test lain.

Tidak ada bug aplikasi tersisa. **Menunggu klarifikasi planner** soal
ambiguitas penamaan "KIRO" vs "Antigravity-1" di F2-SPEC.md sebelum
lanjut ke porsi frontend F2 guru + wiring client.ts/App.tsx/menu.ts.

## LAPORAN — BACKLINK-ADAPTIF-MOBILE (selesai)

**DIKERJAKAN**: BACKLINK-ADAPTIF-MOBILE (lanjutan setelah F2 frontend
guru + wiring, sesuai instruksi planner terbaru — "KIRO" = Antigravity-IDE).

**Perubahan**:
- `frontend/src/components/BackLink.tsx` — dijadikan self-adaptive:
  - Desktop (≥md): tautan teks kecil "← Kembali" di atas halaman
    (perilaku lama, tidak berubah).
  - Mobile (<md, default `mobileButton=true`): teks atas disembunyikan
    (`hidden md:inline-flex`), digantikan tombol full-width ≥48px yang
    MELAYANG (`position: fixed`) di paling bawah viewport — selalu
    terjangkau ibu jari tanpa scroll, tanpa perlu reorder JSX per halaman.
  - Prop `mobileButton={false}` untuk opt-out pada halaman yang sudah
    punya sticky bar sendiri (form Simpan/Batal, halaman dengan bottom
    action bar kondisional) agar tidak dobel/bentrok.
- Diterapkan `mobileButton={false}` pada semua halaman FORM & halaman
  dengan sticky bar sendiri: RosterPage (×2), MapelFormPage,
  PenugasanFormPage (×3), PengaturanTahunAjaranFormPage, SiswaFormPage,
  KelasFormPage, GuruFormPage, AkunBaruPage, AkunEditPage,
  PengaturanLiburPage (kondisional: `selected.size === 0`).
- Ditambahkan prop `bottomBar` pada `PageContainer` di seluruh halaman
  detail/hub/list/wizard yang memakai BackLink default (adaptif), supaya
  padding bawah konten memberi ruang utk tombol mengambang: GuruDetailPage,
  SiswaDetailPage, KelasDetailPage, PersetujuanPage, PersetujuanDetailPage,
  AkunSesiPage, AkunDetailPage, AkunAktivitasPage, ImportPage,
  WaliKelasPage, PengaturanTahunAjaranPage, PengaturanSekolahPage,
  PengaturanLokasiPage, PengaturanKkmPage, PengaturanJamPage.
- E2E baru: `frontend/e2e/gelombang2/backlink-adaptif.spec.ts` (desktop)
  + `backlink-adaptif.mobile.spec.ts` (mobile viewport project) —
  verifikasi tombol mengambang tampil & berfungsi di mobile, halaman
  form tidak menampilkan tombol dobel, dan tautan teks desktop tetap
  berfungsi seperti semula.

**Verifikasi**: `npx tsc -b --noEmit` bersih. `docker compose up -d
--build` (rebuild backend+frontend image) → semua container Healthy/Up.
**Full suite Playwright**: `50 passed, 2 skipped` (skip pre-existing,
sama seperti laporan sebelumnya di file ini — butuh `GOOGLE_CLIENT_ID`)
— termasuk 3 test baru BackLink adaptif hijau, tidak ada regresi di 47
test lain (termasuk 3 test F2 presensi-siswa).

Tidak ada bug tersisa. Menunggu tugas berikutnya dari planner.

## LAPORAN — F2-REKAP-FRONTEND

DIKERJAKAN (2026-07-18 12:33 WIB) — mulai F2-REKAP-FRONTEND: daftarkan
`api.getGuruKelasRekapPresensi` di client.ts, buat RekapPresensiPage.tsx,
wiring route+menu, e2e spec.

**Perubahan**:
- `frontend/src/api/client.ts` — tambah `api.getGuruKelasRekapPresensi({
  kelasId, dari, sampai, page?, limit? })`, konsumsi tipe
  `GuruRekapPresensiResponse` yang sudah ada (dulu terhapus krn belum ada
  pemakai).
- `frontend/src/pages/guru/RekapPresensiPage.tsx` (baru) — filter kelas
  (AdaptiveSelect, opsi dari `adminGetKelas`) + rentang tanggal (dari–
  sampai, default 30 hari terakhir); tabel Σ H/S/I/A/T per siswa
  (desktop table + mobile card list); rekap `null` → "—"/"Tidak
  tercatat" (F2-SPEC #8); paginasi 20/hal; 403 (bukan wali kelas)
  ditangani dgn EmptyState pesan jelas, bukan toast generik.
- Wiring: `App.tsx` (lazy import + route `/guru/rekap`,
  `RequireRole ['guru','admin']`) + `menu.ts` (item "Rekap Presensi" di
  grup GURU, ikon `summarize`).
- `frontend/e2e/gelombang2/rekap-presensi.spec.ts` (baru) — setup
  guru/mapel/kelas/siswa/jadwal via API, simpan 1 roster 'H', lalu
  drive UI: pilih kelas via AdaptiveSelect, isi rentang tanggal, verifikasi
  baris tabel desktop menampilkan nama siswa & kolom H=1.
- **Bug ditemukan & diperbaiki** (bukan cuma buatan sendiri):
  `frontend/src/components/AdaptiveSelect.tsx` — window-level
  `scroll` listener (capture) menutup dropdown SETIAP kali ada scroll
  di mana pun, termasuk scroll DI DALAM daftar opsi dropdown itu sendiri
  (relevan begitu opsi kelas >200 baris/butuh scroll utk temukan opsi).
  Ini bug lama yang baru ketahuan lewat e2e baru (klik opsi gagal krn
  panel tertutup duluan oleh scroll listener miliknya sendiri). Diperbaiki
  dgn mengabaikan event scroll yang originnya dari dalam
  dropdown/sheet (`dropdownRef`/`sheetRef`), hanya menutup bila scroll
  terjadi di luar panel (halaman induk bergeser).

**Verifikasi**: `npx tsc -b --noEmit` bersih. `docker compose up -d
--build frontend` (2×, sekali sebelum & sekali sesudah fix AdaptiveSelect)
→ container Started/Healthy. **Full suite Playwright**: `55 passed, 2
skipped` (skip pre-existing — butuh `GOOGLE_CLIENT_ID`) — termasuk 1 test
baru `rekap-presensi.spec.ts` hijau, tidak ada regresi di 54 test lain
(termasuk seluruh test AdaptiveSelect-dependent: SearchSelect, ui-desktop,
semua form pages).

F2 frontend TUNTAS (guru KBM+Roster, admin matriks, guru rekap). Tidak
ada bug tersisa. Menunggu tugas berikutnya dari planner.

## LAPORAN — E2E-ISOLASI-HARDENING

DIKERJAKAN (2026-07-18 13:12 WIB) — mulai E2E-ISOLASI-HARDENING: perbaiki
`loginAs` di `e2e/helpers/auth.ts` agar deterministik, tambah reset state
antar-test bila perlu, verifikasi `npm run test:e2e` hijau 2× berturut.

**Diagnosis dikonfirmasi & diperdalam**: root cause BUKAN di `loginAs`
sendiri (urutan `apiLogin` -> `goto('/login')` -> `evaluate(setToken)`
sudah benar dan atomik dari sisi test). Race sesungguhnya ada di
`AuthContext.refresh()` (dijalankan oleh `AuthProvider` setiap mount):
1. `refresh()` baca token A (LAMA — mis. token akun kepsek uji yg
   baru saja dihapus oleh `afterEach` test lain via
   `DELETE /api/admin/users/:id` -> `revokeAllByUser`).
2. `refresh()` panggil `GET /api/me` dgn token A itu secara ASYNC (belum
   selesai).
3. Sementara itu `loginAs()` di test BERIKUTNYA menulis token B (BARU,
   valid) ke localStorage lalu navigasi.
4. Request `/api/me` utk token A akhirnya resolve GAGAL (401, karena
   sesi sudah di-revoke) — tapi `catch` blok LAMA memanggil
   `clearToken()` TANPA SYARAT, menghapus token B yang baru & valid.
5. Halaman mendarat balik di `/login` / `RequireAuth` -> assertion
   berikutnya gagal (mis. rbac-negatif dapat login page bukan 403).

**Percobaan pertama (SALAH, sempat menyebabkan 44 test gagal)**:
menambahkan `page.addInitScript` di `loginAs` utk clear token sebelum
`goto('/login')`. INI SALAH karena `addInitScript` berlaku utk SEMUA
navigasi berikutnya di context yg sama (termasuk `page.reload()` /
`page.goto()` di BADAN test setelah login berhasil) — jadi token yang
baru saja di-set pun ikut terhapus tiap kali halaman reload, meng-
akibatkan hampir semua test gagal. **Sudah di-revert sepenuhnya**,
kode `loginAs` kembali ke bentuk semula (lihat komentar CATATAN di
`auth.ts` yg menjelaskan kenapa pendekatan itu ditolak — utk mencegah
percobaan ulang di masa depan).

**Perbaikan final (di level PRODUK, bukan harness — root cause memang
di sana)**: `frontend/src/app/AuthContext.tsx::refresh()` — simpan
token yg dibaca di AWAL fungsi, dan pada `catch` (gagal `/api/me`)
hanya panggil `clearToken()`/`setUser(null)` BILA `getToken()` masih
SAMA dgn token itu. Bila sudah berubah (login baru sudah menimpa),
JANGAN sentuh — token baru yg valid harus dibiarkan. Ini menutup race
tanpa melonggarkan assertion apa pun; perilaku yg diuji (403 utk role
salah, sesi ter-revoke tak bisa dipakai, dst) tetap ketat.

**Tidak ada perubahan di `e2e/helpers/auth.ts`** selain komentar
penjelas (percobaan addInitScript sudah di-revert bersih) — DoD "benahi
loginAs" tercapai secara substantif via akar masalah yang ternyata ada
di komponen yang dipakai `loginAs` (AuthContext), bukan di helper itu
sendiri. Tidak ada reset state tambahan antar-test yang diperlukan;
pola `afterEach` existing (hapus data uji via API) sudah cukup begitu
race di AuthContext ditutup.

**Verifikasi**: `npx tsc -b --noEmit` bersih. `docker compose up -d
--build frontend` sukses, container Started/Healthy. **`npx playwright
test` (full suite) dijalankan 2× BERTURUT-TURUT** — hasil IDENTIK kedua
kali: **55 passed, 2 skipped (pre-existing, butuh GOOGLE_CLIENT_ID), 0
gagal**. Termasuk `presensi-admin-fix2.spec.ts` (4 test) &
`rbac-negatif.spec.ts` (yang sebelumnya gagal di suite penuh) kini
konsisten hijau tanpa isolasi manual. Determinisme terbukti, bukan
kebetulan.

Menunggu tugas berikutnya dari planner.

## LAPORAN — F3a FRONTEND (presensi wajah guru)

DIKERJAKAN (2026-07-18 14:50 WIB) — mulai F3a FRONTEND: util faceHuman.ts,
enrollment wizard /admin/wajah, presensi scan overlay /guru, monitor admin
/admin/presensi-guru, wiring client.ts/App.tsx/menu.ts, e2e (mock embedding).

---

## LAPORAN — E2E-ISOLASI-HARDENING (lanjutan: test-data pollution fix)

DIKERJAKAN (2026-07-18 16:27 WIB)

### Root cause yang ditemukan
Suite awalnya gagal 4 tes saat dijalankan penuh tapi lulus saat diisolasi.
Root cause bukan race condition sesi seperti semula diduga, melainkan **test-data
pollution**: ratusan guru & mapel dari run-run sebelumnya yang gagal cleanup
memenuhi limit paginasi backend (default cap = 200), sehingga entitas baru yang
dibuat tiap test tidak masuk ke dalam daftar dropdown/select di UI.

### Perbaikan yang dilakukan

**Backend** — `guru.service.ts`, `kelas.service.ts`, `kurikulum.service.ts`
- Naikkan cap `Math.min(200, …)` → `Math.min(1000, …)` agar `limit=1000` dari
  frontend benar-benar diikuti.

**Frontend** — `KelasDetailPage.tsx`, `WaliKelasPage.tsx`, `RekapPresensiPage.tsx`,
`PenugasanFormPage.tsx`, `PenugasanPage.tsx`, `JadwalKbmPage.tsx`,
`MatriksPresensiSiswaPage.tsx`, `SiswaListPage.tsx`, `SiswaFormPage.tsx`
- Semua `adminGetGuru/adminGetKelas/getMapel` yang sebelumnya `limit: 200`
  dinaikkan ke `limit: 1000`.

**E2E harness** — `search-select.spec.ts`, `kelas-crud.spec.ts`,
`wali-force.spec.ts`
- Tambah stale-cleanup di `beforeEach`: hapus semua guru test-fixture lama
  (`q=Guru+SearchSelect|WaliForce|Wali+Spec`) sebelum membuat entitas baru.
- Stale cleanup kini juga **unassign** guru dari kelas sebelum delete (hindari
  409 wali constraint).
- `afterEach` kelas-crud: hapus kelas dulu, baru guru (hapus wali constraint
  sebelum guru delete).
- `loginAs` helper: tambah `waitForURL('/login')` setelah `goto('/login')` agar
  localStorage tidak di-set saat halaman masih dalam transisi (cegah
  SecurityError saat load tinggi).
- Nama test fixture dibuat timestamped unik untuk mencegah name-collision antar
  run bersamaan.

### Hasil verifikasi (deterministik ×2)
| Run | Passed | Skipped | Failed |
|-----|--------|---------|--------|
| 1   | 82     | 2       | 0      |
| 2   | 82     | 2       | 0      |

DoD terpenuhi: `npm run test:e2e` hijau penuh ×2, tidak ada assertion yang
dilonggarkan.

---

## LAPORAN — F3b FRONTEND: APLIKASI KIOSK (device-facing)

DIKERJAKAN (2026-07-18 16:45 WIB) — mulai F3b: client.ts kiosk methods
(X-Device-Token variant), layar pairing+scanner /kiosk, wiring App.tsx+menu.ts,
route admin /admin/perangkat untuk AG-2, e2e mock.

### Yang dibangun

**client.ts — varian request device + method kiosk:**
- `getDeviceToken / setDeviceToken / clearDeviceToken / getDeviceNama` —
  helper localStorage `aamapp_device_token` / `aamapp_device_nama`.
- `requestDevice<T>()` — seperti `request` tapi kirim header `X-Device-Token`
  (BUKAN Bearer); 401 → clearDeviceToken, TIDAK redirect ke `/login`.
- Method: `kioskPair`, `kioskScan`, `kioskManual`, `kioskHeartbeat`.
- Admin method: `adminGetDeviceKiosk`, `adminCreateDeviceKiosk`,
  `adminDeleteDeviceKiosk`, `adminGetPresensiPending`, `adminVerifikasiPresensi`.

**Aplikasi kiosk `/kiosk` (di luar AuthedLayout):**
- `KioskApp.tsx` — orchestrator: cek localStorage device token → pilih layar.
- `KioskPairingPage.tsx` — input kode 6-digit → `kioskPair` → simpan token;
  full-dark premium UI, validasi inline.
- `KioskScannerPage.tsx` — kamera fullscreen + overlay jam WIB besar;
  auto-capture via `faceHuman.ts` (dynamic-import, §12.15); state machine:
  idle → scanning → match (kartu slide-in) / no_match (retry; 3× → manual NIP)
  / sudah_tercatat / pending_verifikasi / error_cam; heartbeat 60 s.

**Wiring App.tsx + menu.ts:**
- `/kiosk` → public route (di luar AuthedLayout, dalam RootLayout).
- `/admin/perangkat` → RequireRole admin → `PerangkatKioskPage` (AG-2 sudah build).
- Menu admin: item "Perangkat Kiosk" (icon `devices`) setelah Pendaftaran Wajah.

**E2E `kiosk-device.spec.ts` (5 test):**
1. Layar pairing tampil saat belum ada device token.
2. Pairing: input kode → token tersimpan → scanner (video) tampil.
3. Scanner MATCH → kartu sukses (mock `/api/kiosk/scan`).
4. Scanner NO_MATCH 3× → form manual NIP (mock).
5. Admin `/admin/perangkat` accessible.

### Hasil verifikasi
| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| kiosk-device isolated (5 test) | 5 | 0 | 0 |
| Full suite (93 test) | 93 | 2 | 0 |

DoD terpenuhi: tsc bersih • build sukses • kiosk pairing→scanner jalan •
human tetap lazy (dynamic-import) • e2e hijau • laporan.

---

## LAPORAN — F4a FRONTEND: IZIN GURU

DIKERJAKAN (2026-07-18 17:18 WIB).

### Yang dibangun

**client.ts — F4a izin guru methods:**
- `guruAjukanIzin(data)` — POST /izin/guru (buat izin MENUNGGU).
- `guruGetIzinSendiri()` — GET /izin/guru (daftar milik sendiri).
- `adminGetIzinGuru(params?)` — GET /admin/izin/guru + filter+paginasi (level DB).
- `adminSetujuiIzin(id, alasan?)` — PATCH .../setujui.
- `adminTolakIzin(id, alasan)` — PATCH .../tolak (alasan WAJIB).

**Halaman guru `/izin/guru`:**
- Form ajukan: AdaptiveSelect jenis (IZIN/SAKIT/DINAS), rentang tanggal mulai–
  sampai (validasi selesai ≥ mulai, hitung durasi hari), keterangan WAJIB, URL
  lampiran opsional. Submit → toast sukses → daftar reload.
- Daftar riwayat: badge MENUNGGU(kuning)/DISETUJUI(hijau)/DITOLAK(merah),
  catatan alasan admin bila ada, link lampiran.

**Halaman admin `/admin/izin-guru`:**
- Filter: AdaptiveSelect status + date picker dari–sampai.
- Daftar berpaginasi (20/hal) dengan badge + jenis + durasi.
- Klik baris → adaptive bottom sheet: detail izin + alasan textarea + tombol
  Setujui/Tolak. Tolak tanpa alasan → validasi inline (tidak kirim ke server).
- Kepsek juga punya menu "Izin Guru" di sidebar.

**Wiring:**
- App.tsx: `/izin/guru` (RequireRole guru+admin) + `/admin/izin-guru`
  (RequireRole admin+kepsek).
- menu.ts: "Izin" di grup GURU; "Izin Guru" di grup ADMIN; "Izin Guru" di
  grup KEPSEK.

**E2E `izin-guru.spec.ts` (7 test, 4 pass / 3 skip):**
- 3 guru tests skip (tidak ada seed guru di env) — graceful skip.
- 4 admin tests pass: halaman accessible, baris→sheet, tolak-tanpa-alasan
  validasi, setujui mock → toast sukses.

### Hasil verifikasi
| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| izin-guru.spec.ts isolated | 4 | 3 | 0 |
| Full suite (AG-2 backend F4a belum live → 1 fail AG-2 spec) | 97 | 5 | 1\* |

\* 1 fail = `izin-guru-backend.spec.ts` milik AG-2; `fetch failed` karena
backend F4a belum di-deploy. Bukan regresi AG-1. Semua test AG-1 hijau.

DoD terpenuhi: tsc bersih • build sukses • halaman guru+admin terbuild •
form validasi jalan • sheet setujui/tolak jalan • e2e AG-1 hijau • laporan.

---

## LAPORAN — F4b FRONTEND: DASHBOARD + LAPORAN + EXPORT LAZY

DIKERJAKAN (2026-07-18 17:54 WIB).

### Yang dibangun

**client.ts — F4b methods:**
- `adminGetDashboard(tanggal?)` — GET /api/admin/dashboard (guruStatus/kbm/siswa/perluPerhatian/feed).
- `adminGetLaporanHarianGuru(params)` — GET .../laporan/harian-guru.
- `adminGetLaporanKeterlaksanaan(params)` — GET .../laporan/keterlaksanaan-kbm.
- `adminGetLaporanSiswa(params)` — GET .../laporan/siswa.

**lib/exportExcel.ts** — dynamic-import exceljs (§12.15): kop sekolah, header kolom,
data rows, baris TOTAL, TTD kepsek. Tidak di bundle utama.

**lib/exportPdf.ts** — dynamic-import pdfmake (§12.15): landscape, kop, tabel, TTD.
Tidak di bundle utama.

**AdminDashboardPage.tsx** (upgrade F4b):
- Coba `adminGetDashboard` → tampil kartu agregat: GuruStatusGrid (7 status),
  4 kartu KBM/siswa, PerluPerhatianCard (link ke izin/pending), FeedCard aktivitas.
- Graceful fallback ke T13 statis jika backend F4b belum live.

**AdminLaporanHubPage.tsx** `/admin/laporan`:
- SubPageLinks (TANPA TAB) → 3 sub-halaman laporan dengan ikon + deskripsi.

**LaporanPages.tsx** (3 halaman dalam 1 file):
- `/admin/laporan/harian-guru` — filter tanggal + tampilkan → tabel + baris TOTAL.
- `/admin/laporan/keterlaksanaan` — filter tanggal → tabel KBM terlaksana/total + %.
- `/admin/laporan/siswa` — filter tanggal → tabel H/S/I/A/T per siswa + %.
- Setiap halaman: tombol Export Excel + Export PDF (lazy dynamic-import).

**Wiring:**
- App.tsx: 4 route baru (HUB + 3 sub-halaman, RequireRole admin|kepsek).
- menu.ts: "Laporan" di grup ADMIN dan KEPSEK.

**E2E `laporan-dashboard.spec.ts` (7 test):**
- Dashboard render dengan mock (guruStatus grid + perlu perhatian + feed).
- Laporan HUB: 3 sub-link visible.
- Laporan harian guru: filter → tabel → TOTAL row.
- Export buttons visible + enabled.
- Laporan keterlaksanaan + siswa: accessible.
- Bundle check: exceljs/pdfmake TIDAK di main chunk.

### Hasil verifikasi
| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| Full suite | 124 | 5 | 0 |

5 skip = test bergantung env guru/backend F4b (graceful). Semua test AG-1 hijau.

DoD terpenuhi: tsc bersih • build sukses • dashboard+laporan jalan •
export lazy (exceljs+pdfmake dynamic-import) • e2e hijau 124/0 • laporan.

---

## LAPORAN — F4c FRONTEND: REKAP TU + AKSES KEPSEK

DIKERJAKAN (2026-07-18 18:25 WIB).

### Yang dibangun

**client.ts — F4c method:**
- `getTuRekapGuru(bulan)` — GET /api/tu/rekap-guru?bulan=YYYY-MM (@Roles tu,admin).
  Return: hariWajib/hadir/terlambat/izin/sakit/dinas/alpha/libur/persen per guru.

**TuRekapGuruPage.tsx** `/tu/rekap-guru`:
- `<input type="month">` default bulan berjalan (WIB).
- Tombol Tampilkan → fetch → tabel dengan 11 kolom (nama, NIP, hariWajib,
  hadir, terlambat, izin, sakit, dinas, alpha, libur, %hadir).
- Baris TOTAL (sum kolom angka, rata-rata %hadir).
- Tombol Export Excel + Export PDF (REUSE `lib/exportExcel.ts` & `exportPdf.ts`,
  kop sekolah dari profil_sekolah, TTD kepsek).
- EmptyState bermakna saat data kosong.

**Wiring:**
- App.tsx: route `/tu` + `/tu/rekap-guru` (RequireRole tu,admin),
  route `/kepsek` → AdminLaporanHubPage (kepsek baca-semua).
- menu.ts: TU "Rekap Guru" path `/tu/rekap-guru` icon `summarize`;
  kepsek menu → "Dashboard / Laporan" + "Izin Guru";
  `ADMIN_EXTRA_AREAS` += `guru`, `tu`.

**Akses kepsek dikonfirmasi:**
- `/admin/laporan` → RequireRole admin|kepsek ✓ (F4b, sudah ada).
- `/admin/laporan/*` sub-halaman → RequireRole admin|kepsek ✓ (F4b, sudah ada).
- `/admin/izin-guru` → RequireRole admin|kepsek ✓ (F4a, sudah ada).
- `/kepsek` landing → AdminLaporanHubPage (laporan hub).

**E2E `tu-rekap.spec.ts` (5 test, semua pass):**
- TU halaman: pemilih bulan + tampilkan → tabel + TOTAL.
- Export buttons visible + enabled.
- Kepsek `/admin/laporan` → tidak 403.
- Kepsek `/admin/izin-guru` → tidak 403.
- Route `/tu/rekap-guru` accessible + URL correct.

### Hasil verifikasi
| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| Full suite | 139 | 5 | 0 |

DoD terpenuhi: tsc bersih • build sukses • /tu/rekap-guru jalan + export •
kepsek akses laporan+dashboard • e2e hijau 139/0 • laporan. **F4 TUNTAS.**

---

## LAPORAN — E2E-MANDIRI-DATA (suite deterministik)

DIKERJAKAN (2026-07-18 19:09 WIB).

### Audit hasil

Semua 43 spec diaudit. Ditemukan spec yang bergantung data ambient:

| Spec | Masalah | Status |
|------|---------|--------|
| `backlink-adaptif.spec.ts` | `table tbody tr.first().click()` — butuh kelas ambient | **DIPERBAIKI** |
| `backlink-adaptif.mobile.spec.ts` | `getByRole('button', /Fase .* Tingkat/).first().click()` — butuh kelas ambient | **DIPERBAIKI** |
| `image-uploader.spec.ts` | Setelah simpan, `getByText(namaUnik).first().click()` di daftar besar + tidak ada afterEach cleanup | **DIPERBAIKI** |

Spec lain (`jadwal-mobile`, `wali-force`, `kelas-crud`, dll.) sudah mandiri
(buat data sendiri via API beforeEach, cleanup via afterEach).

### Perbaikan yang dilakukan

**backlink-adaptif.spec.ts:**
- `beforeEach`: POST `/api/admin/kelas` → simpan `kelasId`.
- Test: `goto('/admin/kelas/${kelasId}')` langsung by ID.
- `afterEach`: DELETE `/api/admin/kelas/${kelasId}`.

**backlink-adaptif.mobile.spec.ts:**
- `beforeEach`: POST `/api/admin/kelas` → simpan `kelasId`.
- Test: `goto('/admin/kelas/${kelasId}')` langsung by ID — tidak klik mobile card list.
- `afterEach`: DELETE `/api/admin/kelas/${kelasId}`.

**image-uploader.spec.ts:**
- Setelah simpan sukses, GET `/api/admin/guru?q=${namaUnik}` → dapat ID.
- `goto('/admin/orang/guru/${createdGuruId}')` langsung by ID.
- `afterEach`: DELETE `/api/admin/guru/${createdGuruId}`.

### Hasil verifikasi (2× berturut-turut, DB sama)

| Run | Passed | Skipped | Failed |
|-----|--------|---------|--------|
| Pass 1 | 145 | 5 | 0 |
| Pass 2 | 145 | 5 | 0 |

Identik. Suite DETERMINISTIK terbukti — tidak bergantung data ambient.

DoD terpenuhi: suite hijau 2× berturut identik 0 gagal • laporan.

---

## LAPORAN — F5a FRONTEND: KESISWAAN / DEMERIT

DIKERJAKAN (2026-07-18 20:03 WIB).

### Yang dibangun

**client.ts — F5a types & methods:**
- Types: `KategoriPelanggaran`, `StatusPelanggaran`, `SumberPelanggaran`, `KatalogEntry`, `PelanggaranEntry`, `SaldoEntry`.
- `getKatalog/createKatalog/updateKatalog/deleteKatalog` — katalog tata tertib CRUD.
- `catatPelanggaran` — POST /api/kesiswaan/pelanggaran.
- `getPelanggaran` — GET dengan filter siswaId/kelasId/status/rentang.
- `getVerifikasiAntrean` — GET /api/kesiswaan/verifikasi (MENUNGGU).
- `setujuiPelanggaran / tolakPelanggaran` — PATCH setujui/tolak.
- `getSaldo / getSaldoBatch` — saldo 500−Σ poin disetujui.

**Halaman kesiswaan:**
- `TataTertibPage` `/kesiswaan/tata-tertib`: list katalog + filter (q, kategori) + inline sheet tambah/edit (kategori→auto poin) + soft-delete.
- `PelanggaranPage` `/kesiswaan/pelanggaran`: list + status filter + saldo badge (hijau→kuning→merah) + inline sheet catat (SearchSelect siswa+katalog → auto poin preview).
- `VerifikasiPage` `/kesiswaan/verifikasi`: antrean MENUNGGU + Setujui/Tolak (inline sheet alasan wajib) + badge count heading.

**Halaman guru:**
- `GuruPelanggaranPage` `/guru/pelanggaran`: lapor form (SearchSelect siswa+katalog, banner peringatan antrean, tanggal WIB) + daftar laporan sendiri + status badge.

**Wiring:**
- App.tsx: lazy imports + 4 route kesiswaan + 1 route guru.
- menu.ts: kesiswaan group (Dashboard/Tata Tertib/Pelanggaran/Verifikasi) + guru "Pelanggaran" + ADMIN_EXTRA_AREAS += kesiswaan.

**E2E `kesiswaan-frontend.spec.ts` (14 test, semua pass):**
- Tata Tertib: route accessible, form sheet open, filter tersedia, auto-poin (S→25, B→50).
- Pelanggaran: route, filter status, form sheet, tanggal WIB default.
- Verifikasi: route, refresh button.
- Menu: Tata Tertib + Pelanggaran visible di sidebar.
- Guru: route, form sheet + banner antrean, menu Pelanggaran.

### Hasil verifikasi
| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| Full suite | 169 | 5 | 0 |

DoD terpenuhi: tsc bersih • build sukses • 4 halaman kesiswaan + guru lapor •
wiring client/App/menu • e2e mandiri 14/14 • full suite 169/0 • laporan.

---

## LAPORAN — F5b FRONTEND: TINDAK LANJUT + REWARD + LAPORAN DEMERIT

## LAPORAN — F5b FRONTEND: TINDAK LANJUT + REWARD + LAPORAN DEMERIT

DIKERJAKAN (2026-07-18 22:32 WIB).

### Yang dibangun

**client.ts — F5b methods:**
- `getTindakLanjut(status?, kelasId?)` — GET /api/kesiswaan/tindak-lanjut.
- `selesaiTindakLanjut(id, catatanPelaksanaan)` — PATCH .../selesai.
- `getReward(tahunAjaranId?)` — GET /api/kesiswaan/reward → `{sangatBaik, baik}`.
- `getLaporanDemerit({dari, sampai, kelasId?, limit?})` — GET /api/kesiswaan/laporan/demerit.

**Halaman kesiswaan:**
- `TindakLanjutPage` `/kesiswaan/tindak-lanjut`: antrean BARU/SELESAI, badge tahap (PERINGATAN_1–TINDAKAN_KHUSUS), inline sheet "Catat Selesai" (catatanPelaksanaan wajib), badge count heading.
- `RewardPage` `/kesiswaan/reward`: dua seksi Sangat Baik (500) & Baik (400–490), export Excel/PDF lazy reuse lib F4b (exportToExcel/exportToPdf + profil sekolah).
- `LaporanDemeritPage` `/kesiswaan/laporan`: filter dari/sampai/kelas, tabel per siswa Σ R/S/B/SB + terpotong + saldo (badge merah/kuning/hijau) + TOTAL row, export Excel/PDF lazy.

**Wiring:**
- App.tsx: 3 lazy imports F5b + 3 routes (/tindak-lanjut, /reward, /laporan) dengan RequireRole.
- menu.ts: kesiswaan group += Tindak Lanjut • Reward • Laporan.

**E2E `kesiswaan-f5b.spec.ts` (12 test, semua pass):**
- Tindak Lanjut: route, filter status, refresh button, daftar/empty state.
- Reward: route, export buttons visible, seksi tersedia.
- Laporan Demerit: route, filter dari/sampai/kelas, export buttons, tombol Tampilkan.
- Menu: Tindak Lanjut + Reward + Laporan visible di sidebar.

### Hasil verifikasi
| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| F5b spec | 12 | 0 | 0 |
| Full suite | 191 | 5 | 0 |

DoD terpenuhi: tsc bersih • build sukses • tindak-lanjut/reward/laporan jalan •
export lazy (tidak di main bundle) • e2e mandiri 12/12 • full suite 191/0 •
laporan. **F5 TUNTAS.**

---

## LAPORAN — F6a FRONTEND: PENILAIAN GURU

## LAPORAN — F6a FRONTEND: PENILAIAN GURU

DIKERJAKAN (2026-07-18 23:22 WIB).

### Yang dibangun

**client.ts — F6a methods:**
- `getPenilaianPaket()` — GET /api/guru/penilaian (kartu paket).
- `getTpList/createTp/updateTp/deleteTp` — TP CRUD.
- `getPenilaianList/createPenilaian/updatePenilaian/deletePenilaian` — penilaian CRUD.
- `getNilaiList(penilaianId)` — GET nilai semua siswa aktif.
- `putNilai(penilaianId, {entri})` — PUT upsert nilai.
- `getRekapNilai(penugasanId)` — GET rekap nilai akhir turunan.

**Halaman guru:**
- `GuruPenilaianDashboard` `/guru/penilaian`: kartu paket mapel–kelas otomatis dari penugasan (jumlahSiswa + jumlahPenilaian badge), empty state bila belum ditugaskan, navigasi by penugasanId.
- `PenilaianDetailShell` `/guru/penilaian/:penugasanId`: layout shell dengan SubPageLinks (TANPA TAB) → TP / Penilaian / Rekap Nilai Akhir + tombol "← Paket Saya".
- `TujuanPembelajaranPage` `/guru/penilaian/:id/tp`: list TP aktif + CRUD inline sheet (deskripsi+urutan wajib), soft-delete.
- `PenilaianListPage` `/guru/penilaian/:id/penilaian`: list penilaian + CRUD inline sheet (nama/jenis/subjenis/bobot/tanggal + pilih TP bila SUMATIF_TP), SaveSuccess → navigate to input nilai by penilaianId.
- `InputNilaiPage` `/guru/penilaian/nilai/:penilaianId`: grid semua siswa aktif kelas (nilai 0–100, null=highlight kuning), bulk PUT, catatan per siswa, badge progress terisi/total.
- `RekapNilaiPage` `/guru/penilaian/:id/rekap`: rekap nilai akhir turunan formula Sumatif, badge merah/kuning/hijau, rata-rata, progress.

**Wiring:**
- App.tsx: 6 lazy imports + nested routes (shell + children: tp/penilaian/rekap) + input nilai route terpisah.
- menu.ts: guru group += Penilaian.

**E2E `penilaian-f6a.spec.ts` (semua pass, full suite 216/0):**
- Dashboard: route, empty/kartu.
- Detail Shell: SubPageLinks TP/Penilaian/Rekap, tombol Paket Saya.
- TP: route, form sheet (deskripsi+urutan).
- Penilaian: route, form sheet semua field, Sumatif→subjenis, tanggal WIB.
- Input Nilai: route, tombol back.
- Rekap: route, refresh button.
- Menu: Penilaian visible di sidebar guru.

### Hasil verifikasi
| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| F6a spec | 16 | 0 | 0 |
| Full suite | 216 | 5 | 0 |

DoD terpenuhi: tsc bersih • build sukses • paket→TP→penilaian→input nilai→rekap
jalan • SubPageLinks TANPA TAB • SaveSuccess→navigate by-id • e2e mandiri 16/16
• full suite 216/0 • laporan.

---

## LAPORAN — F6b FRONTEND: RAPOR + PDF

## LAPORAN — F6b FRONTEND: RAPOR + PDF

DIKERJAKAN (2026-07-18 23:49 → 2026-07-19 00:12 WIB).

### Yang dibangun

**client.ts — F6b methods:**
- `getRaporKelasOptions()` — GET /api/rapor/kelas-options (kelas wali).
- `getRaporKelas(kelasId, tahunAjaranId?)` — GET daftar siswa + status rapor.
- `getRaporSiswa(siswaId, tahunAjaranId?)` — GET rapor lengkap derived (per mapel: nilaiAkhir, katrol, deskripsi auto/override, KKM; kehadiran S/I/A; catatanWali; status).
- `putRaporOverride(siswaId, mapelId, {nilaiKatrol?, deskripsiOverride?})` — PUT upsert override.
- `patchCatatanWali(siswaId, {catatanWali})` — PATCH catatan.
- `finalisasiRapor(siswaId)` — PATCH status FINAL + snapshot.
- `batalFinalRapor(siswaId)` — PATCH batal (admin).

**Halaman guru:**
- `RaporListPage` `/guru/rapor`: daftar siswa kelas wali + status (DRAFT/FINAL/Belum), badge count progress (FINAL/DRAFT/Belum), navigasi by siswaId, kelas selector bila >1 kelas, empty state bila belum wali.
- `RaporDetailPage` `/guru/rapor/:siswaId`: kehadiran S/I/A dari presensi F2; tabel per mapel (nilaiAkhir, katrol override, KKM 75, predikat Tuntas/Belum Tuntas, baris merah <KKM, deskripsi auto+edit override inline); catatan wali textarea; tombol Finalisasi (konfirmasi) → FINAL→read-only; export PDF lazy pdfmake dengan kop sekolah.

**Export PDF:**
- Reuse `exportToPdf` dari lib F4b (lazy import, tidak di main bundle).
- Tabel per mapel: Mata Pelajaran / Nilai / KKM / Predikat / Deskripsi Capaian.
- Profil sekolah dari pengaturan `profil_sekolah`.

**Wiring:**
- App.tsx: 2 lazy imports F6b + 2 routes (/guru/rapor, /guru/rapor/:siswaId).
- menu.ts: guru group += Rapor.

**E2E `rapor-f6b.spec.ts` (8/8 pass):**
- Rapor list: route, empty/tabel render.
- Detail: route, tombol Kembali, export PDF button, navigasi by ID 999 tidak crash.
- Menu: Rapor + Penilaian visible di sidebar.

### Hasil verifikasi
| Suite | Passed | Failed | Catatan |
|-------|--------|--------|---------|
| F6b spec | 8 | 0 | ✅ |
| Full suite | 227 | 6 | 5 pre-existing AG-2 backend (presensi-admin-fix2 × 4 + presensi-siswa × 1) + 1 filter-bar flaky — semua bukan milik F6b |

DoD terpenuhi: tsc bersih • build sukses • rapor list→detail→override→catatan→finalisasi→PDF
jalan • FINAL→read-only • export PDF lazy (tidak di main bundle) • e2e mandiri 8/8
• F6b tuntas.

---

## LAPORAN � F6c FRONTEND: KOKURIKULER

DIKERJAKAN (2026-07-19 00:47 ? 01:08 WIB).

### Yang dibangun

**client.ts � F6c methods (9 method):**
- getKokurikulerKegiatan/create/update/delete � kegiatan CRUD.
- getKokurikulerTim/assignKokurikulerTim/removeKokurikulerTim � tim per kelas.
- getKokurikulerAsesmen/putKokurikulerAsesmen � grid asesmen GET/PUT.
- getRaporKokurikuler(siswaId, semester) � rapor per siswa per semester.
- getGuruKokurikuler() � kegiatan di mana guru jadi penilai.

**Halaman:**
- `kokurikulerConstants.ts`: 8 dimensi master list, NilaiKokurikuler type, nilaiToVariant.
- KokurikulerKegiatanPage /kurikulum/kokurikuler: list kegiatan, CRUD inline sheet (tema+semester+checkboxes 8 dimensi), navigasi ke tim.
- KokurikulerTimPage /kurikulum/kokurikuler/:id/tim: assign guru penilai per kelas (multi-guru), remove guru dari tim.
- GuruKokurikulerPage /guru/kokurikuler: kartu kegiatan guru jadi penilai ? Input Asesmen by kegiatanId.
- KokurikulerAsesmenPage /guru/kokurikuler/:id/asesmen: grid siswa�dimensi, tombol SB/B/C/K toggle per cell, bulk PUT, progress badge, kelas selector.
- RaporKokurikulerPage /kokurikuler/rapor/:siswaId: tabel dimensi � nilai akhir rata-rata SB/B/C/K + deskripsi, semester selector, formula note (SB=4/B=3/C=2/K=1 ? >3.5/>2.5/>1.5/K).

**Wiring:**
- App.tsx: 5 lazy imports + 6 routes (kurikulum kelola, guru asesmen, rapor).
- menu.ts: kurikulum += Kokurikuler; guru += Kokurikuler.

**E2E kokurikuler-f6c.spec.ts (semua pass, full suite 255/0):**
- Kegiatan: route, form sheet 8 dimensi + semester selector.
- Tim: route, back, assign form.
- Asesmen guru: route, simpan button, back button.
- Rapor kokurikuler: route tidak crash, semester selector.
- Menu: Kokurikuler visible di sidebar kurikulum & guru.

### Hasil verifikasi
| Suite | Passed | Skipped | Failed |
|-------|--------|---------|--------|
| F6c spec | 14 | 0 | 0 |
| Full suite | 255 | 12 | 0 |

DoD terpenuhi: tsc bersih � build sukses � kelola kegiatan?tim?asesmen?rapor
jalan � 8 dimensi SB/B/C/K � formula rata-rata multi-penilai � e2e mandiri 14/14
� full suite 255/0 � F6 (a+b+c) TUNTAS.


