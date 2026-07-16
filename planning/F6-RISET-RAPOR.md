# F6 RISET: Penilaian & Rapor

> **RISET MURNI DARI KODE + §9 — bukan implementasi.**
> Disusun sebagai bahan spesifikasi F6 oleh planner.
> Sumber: pembacaan kode aktual `backend/src/` dan `frontend/src/` per 2026-07-16
> + kutipan §9 PROMPT_AGENT.md (baris 538-616).
> Setiap klaim disertai referensi `file:baris` atau `§9:baris`.

---

## 1. Sumber Turunan Nilai

### 1.1 Daftar siswa yang dinilai untuk paket X = turunan otomatis

**Aturan §9 (baris 570-593) — USERFLOW INPUT NILAI END-TO-END:**
```
PRASYARAT (sekali per semester, oleh peran lain — guru tidak melakukan apa pun):
 1. Admin menempatkan siswa ke kelas (/admin/orang) — tiap siswa aktif di
    tepat satu kelas.
 2. Kurikulum membuat mapel → PENUGASAN paket "Guru—Mapel—Kelas"
    (/kurikulum/penugasan).

ALUR GURU MAPEL:
 3. Guru login → /guru/penilaian → paket yang ditugaskan padanya MUNCUL
    OTOMATIS sebagai kartu (turunan langsung penugasan; guru TIDAK bisa
    menambah/memilih kelas sendiri; belum ditugaskan → empty state).
 4. Buka paket → tab TP → isi tujuan pembelajaran.
 5. Tab Penilaian → "+ Tambah Penilaian" → Simpan → LANGSUNG DIARAHKAN
    ke halaman INPUT NILAI.
 6. Halaman input nilai berisi SEMUA SISWA AKTIF kelas itu OTOMATIS.
```

**Kode saat ini:**

`penugasan.entity.ts:25-69` — entitas `Penugasan`:
- `id`, `guruId` (FK Guru, NOT NULL, RESTRICT), `mapelId` (FK Mapel, RESTRICT),
  `kelasId` (FK Kelas, RESTRICT), `tahunAjaranId` (FK TahunAjaran, RESTRICT)
- `@Unique(['mapelId', 'kelasId', 'tahunAjaranId'])` — satu mapel di kelas sama per TA hanya 1 pengampu
- Komentar baris 20-21: *"Paket = guru mengajar mapel X di kelas Y — sumber turunan presensi, penilaian, & rapor."*

`siswa.entity.ts:89-97` — `kelasId` (nullable, `onDelete: SET NULL`), `status` (default `'aktif'`).

**Cara menurunkan daftar siswa untuk paket X:**
```
Penugasan.kelasId → SELECT siswa WHERE kelasId = X AND status = 'aktif' ORDER BY nama
```

Sama seperti roster F2 — **SATU sumber kebenaran** (§9 baris 596-601):
> "SEMUA daftar lain diturunkan otomatis dan TIDAK pernah di-input ulang:
> roster KBM = siswa aktif kelas sesi itu; daftar input nilai = siswa aktif
> kelas paket"

### 1.2 Kaitan ke roster/presensi F2

Daftar siswa untuk input nilai = **sama** dengan roster presensi F2:
- F2 roster = `siswa WHERE kelasId = penugasan.kelasId AND status = 'aktif'`
- F6 input nilai = `siswa WHERE kelasId = penugasan.kelasId AND status = 'aktif'`

**Aturan data turunan §9 (baris 602-616):**
- Siswa baru di tengah semester → otomatis muncul di daftar nilai (nilai kosong disorot kuning)
- Siswa pindah kelas → riwayat nilai di kelas lama TETAP tersimpan
- Siswa keluar → hilang dari daftar aktif, riwayat tetap tersimpan
- Guru paket diganti → paket + TP + penilaian + nilai TETAP UTUH (milik mapel—kelas, bukan milik guru)
- Penugasan dihapus → data historis penilaian TIDAK ikut terhapus (arsip semester)

### 1.3 Paket muncul otomatis untuk guru

Guru login → `session.userId` → `guru.userId` → dapat `guruId` → query `penugasan WHERE guruId = X AND tahunAjaranId = <TA aktif>`.

Belum ditugaskan → empty state "Anda belum ditugaskan mengajar — hubungi Staf Kurikulum" (§9 baris 583).

---

## 2. Model Penilaian §9 (dari sistem `radig/rapor`)

**§9 (baris 538-569) — struktur lengkap:**

### 2.1 TP (Tujuan Pembelajaran)

§9 baris 540: "TP per mapel (CRUD guru mapel)."

- TP dimiliki per mapel (bukan per kelas/per paket — per mapel).
- Guru mapel membuat/mengedit TP untuk mapel yang diampunya.
- TP terhubung ke penilaian Sumatif TP (1 sumatif TP terhubung ≥1 TP).

**Usulan entitas:** `tujuan_pembelajaran` {id, mapelId FK, deskripsi, urutan, createdAt, updatedAt}.

### 2.2 Jenis Penilaian

§9 baris 540-543:
```
Penilaian per mapel+kelas+semester:
  jenis: Formatif | Sumatif
  subjenis (Sumatif): Sumatif TP | Sumatif Akhir Semester | Sumatif Akhir Tahun
  bobot: int ≥ 1
  Sumatif TP terhubung ≥ 1 TP
  Nilai 0-100 per siswa
  Formatif tidak masuk rapor
```

**Usulan entitas:** `penilaian` {id, penugasanId FK, nama, jenis ('Formatif'|'Sumatif'), subjenis (nullable, hanya Sumatif), bobot int ≥1, tanggal date, createdAt, updatedAt}.

- Penilaian terhubung ke `penugasan` (bukan mapel langsung) karena "per mapel+kelas+semester" = per paket.
- `penilaian_tp` junction table untuk Sumatif TP ↔ TP (many-to-many).

### 2.3 Nilai per Siswa

§9 baris 543: "Nilai 0–100 per siswa."

**Usulan entitas:** `nilai` {id, penilaianId FK, siswaId FK, nilai int 0-100, catatan varchar nullable, diubahOleh guruId FK nullable (audit penginput §9), createdAt, updatedAt, UNIQUE(penilaianId, siswaId)}.

### 2.4 Rumus Nilai Akhir

§9 baris 544: "Nilai akhir = `round(Σ(nilai×bobot)/Σ(bobot))` semua sumatif."

- Hanya sumatif yang dihitung (formatif tidak masuk rapor).
- Untuk setiap siswa: ambil semua nilai sumatif di paket itu → Σ(nilai×bobot) / Σ(bobot) → round.
- **Diturunkan** (bukan kolom statis) — dihitung on-the-fly atau cached.

### 2.5 Deskripsi Capaian Otomatis

§9 baris 545-547:
```
Deskripsi otomatis: rata-rata per TP vs KKM → top 2 dikuasai + bottom 2 perlu
penguatan (pola kalimat & pembersihan frasa persis referensi).
```

- Rata-rata nilai per TP (dari semua Sumatif TP yang terhubung ke TP itu).
- Bandingkan dengan KKM: di atas KKM = "dikuasai", di bawah = "perlu penguatan".
- Ambil top 2 (dikuasai) + bottom 2 (perlu penguatan).
- Pola kalimat & pembersihan frasa persis referensi `radig/rapor` (perlu akses ke kode referensi atau spec lebih detail dari user).
- **Bisa ditimpa manual** untuk kokurikuler (§9 baris 549: "bisa ditimpa manual (dikonfirmasi)").

### 2.6 Nilai Katrol

§9 baris 547: "Nilai katrol = override manual."

- Guru/wali bisa override nilai akhir per mapel per siswa.
- **Usulan:** kolom `nilaiKatrol` nullable di entitas rapor siswa per mapel.

### 2.7 Kokurikuler

§9 baris 548-550:
```
Kokurikuler: kegiatan (tema/semester) → 8 dimensi → asesmen SB/B/C/K
(multi-penilai dirata-rata) → deskripsi otomatis, bisa ditimpa manual.
```

- Entitas `kokurikuler_kegiatan` {id, tahunAjaranId FK, tema, semester}.
- Entitas `kokurikuler_dimensi` — 8 dimensi tetap (perlu konfirmasi user daftar 8 dimensi).
- Entitas `kokurikuler_asesmen` {kegiatanId, siswaId, dimensiId, nilai SB/B/C/K, penilaiGuruId}.
- Multi-penilai → dirata-rata (bagaimana rata-rata SB/B/C/K? perlu konfirmasi user).
- Deskripsi otomatis dari pola kalimat, bisa ditimpa manual.

### 2.8 Ekstrakurikuler

§9 baris 550-551:
```
Ekskul: peserta, tujuan per semester, SB/B/C/K, kehadiran → keterangan + %
(merah < 70%).
```

- Entitas `ekskul` {id, tahunAjaranId FK, nama, pembinaGuruId FK}.
- Entitas `ekskul_peserta` {ekskulId, siswaId}.
- Entitas `ekskul_penilaian` {ekskulId, siswaId, nilai SB/B/C/K, tujuan, kehadiranTotal int, kehadiranHadir int}.
- % kehadiran = kehadiranHadir/kehadiranTotal × 100; merah jika < 70%.

---

## 3. KKM

### 3.1 Kode saat ini

`pengaturan.service.ts` — key `'kkm'` berisi `{nilai: 75}` (§14.10.1).

`kurikulum.service.ts:963-977`:
```typescript
async getKkm() {
  const row = await this.pengaturanService.getOne('kkm');
  return row;
}
async updateKkm(dto: UpdateKkmDto, req: Request) {
  const value = { nilai: dto.nilai };
  const saved = await this.pengaturanService.upsert('kkm', value, req);
  return saved;
}
```

Endpoint: `GET /api/kurikulum/pengaturan/kkm` + `PATCH /api/kurikulum/pengaturan/kkm {nilai}` (kurikulum|admin).

### 3.2 Pemakaian di penilaian/rapor

- KKM = ambang batas untuk deskripsi capaian (di atas KKM = dikuasai, di bawah = perlu penguatan).
- KKM = ambang batas untuk indikator di rekap nilai (nilai < KKM diberi teks merah — §15.6).
- KKM global default 75 (§9 baris 544, dikonfirmasi user).

### 3.3 KKM per-mapel?

**Fase 1 (T11-FIX ronde 2):** KKM per-mapel DITOLAK — struktur `{nilai}` saja, tanpa `perMapel`.

**Pertanyaan terbuka untuk F6:** Apakah F6 butuh KKM per-mapel? Spec §9 mengatakan "KKM global default 75 (dikonfirmasi)" — tidak menyebut per-mapel. Tapi sistem rapor berjalan (`radig/rapor`) mungkin punya KKM per mapel.

**Usulan:** Pertahankan KKM global untuk F6; jika user memutuskan perlu KKM per-mapel, tambahkan kolom `kkm` nullable di `mapel` entity (override global). Jadikan pertanyaan terbuka — jangan asumsi.

---

## 4. Ketidakhadiran S/I/A di Rapor ← Otomatis dari Presensi (F2)

### 4.1 Ketergantungan ke entitas F2

§9 baris 552-553: "Ketidakhadiran S/I/TK OTOMATIS dari presensi (wali boleh koreksi + alasan → audit)."

F2 (dari `planning/F2-RISET-PRESENSI-SISWA.md` §6.1.1-6.1.2) menyediakan:
- `presensi_sesi` {jadwalId, tanggal, status, disimpanPada, guruPenggantiId} — header per sesi.
- `presensi_siswa` {presensiSesiId, siswaId, status H/S/I/A/T} — detail per siswa per sesi.

### 4.2 Query agregat untuk rapor

§6.4 (baris 350-352):
```
"Alpha satu hari penuh" = A pada SEMUA sesi TERLAKSANA hari itu
(sesi DIGANTIKAN tetap terlaksana; KOSONG tidak dihitung).
Sesi tanpa roster → siswa "TIDAK TERCATAT" (bukan alpha).
```

**Query untuk rapor siswa X di semester Y:**
```sql
-- Hitung S, I, A, T, TK (tidak tercatat) untuk siswa X di rentang semester
SELECT
  COUNT(CASE WHEN ps.status = 'S' THEN 1 END) AS sakit,
  COUNT(CASE WHEN ps.status = 'I' THEN 1 END) AS izin,
  COUNT(CASE WHEN ps.status = 'A' THEN 1 END) AS alpha,
  COUNT(CASE WHEN ps.status = 'T' THEN 1 END) AS terlambat
FROM presensi_siswa ps
JOIN presensi_sesi pst ON ps.presensiSesiId = pst.id
JOIN jadwal_kbm j ON pst.jadwalId = j.id
JOIN penugasan p ON j.penugasanId = p.id
WHERE ps.siswaId = X
  AND p.tahunAjaranId = Y
  AND pst.status IN ('TERLAKSANA', 'DIGANTIKAN')  -- hanya sesi terlaksana
  AND pst.tanggal BETWEEN <mulai_semester> AND <akhir_semester>
```

**"Tidak tercatat" (TK):** Sesi TERLAKSANA di kelas siswa X pada tanggal T, tapi tidak ada record `presensi_siswa` untuk siswa X → `LEFT JOIN presensi_siswa WHERE ps.id IS NULL`.

### 4.3 Koreksi wali = audit

§9 baris 553: "wali boleh koreksi + alasan → audit."

- Wali kelas bisa mengoreksi angka S/I/A/TK di rapor (override nilai dari presensi).
- Setiap koreksi wajib menyertakan alasan.
- Koreksi tercatat di audit log (pola `audit.service.ts:64-84`).

**Usulan entitas:** `rapor_ketidakhadiran_koreksi` {id, raporSiswaId FK, field ('sakit'|'izin'|'alpha'|'tk'), nilaiAsli int, nilaiKoreksi int, alasan varchar, diubahOleh userId FK, createdAt}.

Atau: kolom override nullable di entitas rapor siswa (`sakitOverride`, `izinOverride`, dll.) + audit log.

---

## 5. Finalisasi & Penguncian Rapor

### 5.1 Spec §9 (baris 556-561)

```
FINALISASI dilakukan WALI KELAS per siswa (atau "semua yang lengkap"
sekaligus) → status Final MENGUNCI seluruh nilai siswa itu pada semester
tsb. (guru mapel tidak bisa mengubah — baris input terkunci); BUKA KUNCI
hanya oleh Kurikulum/Admin dengan alasan wajib (audit log); cetak massal
oleh Kurikulum; siswa berstatus Draft tetap bisa dicetak dengan tanda
peringatan "belum final".
```

### 5.2 Data/status yang diperlukan

**Status rapor per siswa per semester:**
- `Draft` — default, nilai masih bisa diubah.
- `Final` — dikunci, nilai tidak bisa diubah oleh guru mapel.

**Siapa yang melakukan:**
- Finalisasi: **Wali kelas** (guru yang `kelas.waliGuruId`-nya = kelas siswa).
- Buka kunci: **Kurikulum/Admin** dengan alasan wajib → audit.

**Usulan entitas:** `rapor_siswa` {id, siswaId FK, kelasId FK, tahunAjaranId FK, status ('Draft'|'Final') default 'Draft', finalisasiOleh guruId FK nullable, finalisasiPada timestamptz nullable, catatanWali text nullable, createdAt, updatedAt, UNIQUE(siswaId, tahunAjaranId)}.

**Tambahan untuk buka kunci:** `rapor_buka_kunci_log` {id, raporSiswaId FK, alasan varchar, diubahOleh userId FK, createdAt} — atau cukup audit log saja.

### 5.3 Catatan wali kelas

§9 baris 553: "catatan wali."
§15.6 (/guru/kelas/rapor/:siswa): "E. Catatan Wali Kelas (textarea + panel samping konteks: ringkasan kehadiran & demerit siswa sebagai bahan)."

- Kolom `catatanWali` text nullable di `rapor_siswa`.
- Wali kelas mengisi via `/guru/kelas/rapor/:siswa`.
- Panel samping menampilkan ringkasan kehadiran (dari F2) & demerit (dari F5) sebagai bahan.

### 5.4 Cetak massal oleh Kurikulum

§15.4 (/kurikulum/rapor/:kelas/cetak): "pilih siswa (semua / centang sebagian; siswa Draft ditandai kuning + peringatan 'belum final'), pilih komponen (Sampul • Identitas • Isi Rapor), tombol 'Buat PDF'."

- Kurikulum bisa cetak semua siswa di kelas sekaligus.
- Siswa Draft tetap bisa dicetak dengan tanda peringatan.
- Pilihan komponen: Sampul, Identitas, Isi Rapor.

---

## 6. Cetak PDF

### 6.1 Spec §4 (baris 124) + §9 (baris 562-566)

§4: "Cetak PDF: Render HTML template server-side → PDF (keputusan teknis final di F6)."

§9 baris 562-566:
```
Cetak PDF per siswa & massal per kelas:
  SAMPUL (logo kab, jenjang, nama sekolah, logo, kotak nama, NIS/NISN, footer kementerian)
  IDENTITAS (15 butir + foto 3×4 + ttd Kepsek)
  ISI (identitas ringkas; A. Nilai Akademik; B. Kokurikuler; C. Ekstrakurikuler;
       D. Ketidakhadiran; E. Catatan Wali; Tanggapan Orang Tua; ttd Ortu + Kepsek + Wali)
```

### 6.2 Kode saat ini

- **TIDAK ADA** library PDF di `backend/package.json` maupun `frontend/package.json`.
- **TIDAK ADA** kode PDF/template/render di backend/src atau frontend/src.
- Backend sudah punya: `exceljs` (Excel generation), `multer` (file uploads), `@nestjs/platform-express`.
- Static serving: `app.useStaticAssets(UPLOAD_DIR, {prefix: '/uploads/'})` di `main.ts`.
- nginx: `/uploads/` proxies to backend, `/api/` proxies to backend.

### 6.3 Library kandidat

| Library | Cara kerja | Berat? | Bundle §12.15 | Catatan |
|---------|-----------|--------|---------------|---------|
| **Puppeteer** | Headless Chrome → PDF dari HTML/CSS | SANGAT berat (~300MB Chromium binary) | Server-side only (OK — bukan frontend bundle) | Paling setia dengan HTML+CSS kompleks; butuh Chromium di Docker image |
| **html-pdf-node** | Wrapper Puppeteer | Sama dengan Puppeteer | Server-side only | Sama |
| **PDFKit** | Programmatic PDF (bukan dari HTML) | Ringan (~3MB) | Server-side only | Kurang setia HTML+CSS; perlu render manual |
| **jsPDF** | Client-side PDF | Ringan | Bisa di frontend (dynamic import) | Kurang setia HTML; cocok untuk PDF sederhana |
| **@react-pdf/renderer** | React components → PDF | Sedang | Bisa di frontend (dynamic import) | Hanya jika template pakai React; terbatas CSS |

### 6.4 Implikasi §12.15 (lazy/berat, dilarang di bundle utama)

Spec §4 mengatakan "Render HTML template server-side → PDF" — ini berarti:
- **PDF generation di BACKEND** (server-side), BUKAN frontend.
- Backend tidak ada "bundle utama" — §12.15 aturan lazy load berlaku untuk **frontend**.
- TAPI: jika PDF library berat (Puppeteer/Chromium), Docker image backend akan membengkak.
- Alternatif: Puppeteer di container terpisah (microservice ringan) ATAU gunakan API eksternal (mis. Browserless.io).

### 6.5 Usulan (bukan keputusan)

**Opsi A — Puppeteer di backend (rekomendasi spec §4):**
- Pro: Paling setia HTML+CSS; template bisa pakai HTML/CSS penuh.
- Kontra: Docker image backend membengkak (~300MB Chromium); butuh `puppeteer` dep + system deps.
- Implementasi: HTML template (EJS/Handlebars) → render → Puppeteer → PDF → stream ke client.

**Opsi B — PDFKit di backend:**
- Pro: Ringan; tidak butuh Chromium.
- Kontra: Render manual (bukan dari HTML); template rapor kompleks sulit dipertahankan.

**Opsi C — Client-side jsPDF:**
- Pro: Tidak bebani backend.
- Kontra: Kurang setia HTML+CSS; spec §4 mengatakan "server-side".

**Rekomendasi:** Opsi A (Puppeteer) sesuai spec §4. Library hanya di backend (tidak masuk frontend bundle — §12.15 OK). Tambahkan `puppeteer` ke `backend/package.json` + system deps di `backend/Dockerfile`. Template engine: EJS atau Handlebars (ringan, server-side).

---

## 7. Pola WAJIB (kutip dari kode)

### 7.1 RBAC peran `guru` (mapelnya) + wali kelas + kurikulum (monitor/cetak)

§8.2 matriks RBAC (baris 501-502):
```
TP, penilaian, nilai: Admin ✅ | Guru mapelnya ✅ | Wali kelas mapelnya ✅ | Kurikulum monitor ✅ | Kepsek baca ✅
Catatan wali & finalisasi rapor: Admin ✅ | Wali kelasnya ✅ | Kurikulum monitor+cetak ✅ | Kepsek baca ✅
```

**Pola kode** (`roles.guard.ts` + `@Roles()` decorator):
- Guru mapel: `@Roles('guru', 'admin')` + cek kepemilikan via `guru.userId === session.userId` → `penugasan.guruId`.
- Wali kelas: cek `kelas.waliGuruId` apakah guru tersebut adalah wali kelas siswa.
- Kurikulum: `@Roles('kurikulum', 'admin')` untuk monitor/cetak.
- Kepsek: `@Roles('kepsek', 'admin')` untuk baca-saja.

### 7.2 Audit

`audit.service.ts:64-84` — `this.audit.log({ actorId, action, resource, resourceId, ip, userAgent, summary })`.

Contoh untuk F6:
- "Menambah TP Matematika: Menyelesaikan operasi pecahan"
- "Menambah penilaian Matematika 7A: Ulangan Harian 1 (Sumatif TP, bobot 2)"
- "Mengisi nilai 85 untuk siswa Andi di Ulangan Harian 1 Matematika 7A"
- "Mengfinalisasi rapor Andi (7A, 2026/2027 Sem 1)"
- "Membuka kunci rapor Andi dengan alasan: nilai salah input"

### 7.3 DTO + ValidationPipe (pelajaran DTO-drift §12.16f)

`main.ts:37-56`: `forbidNonWhitelisted: true` — field form UI WAJIB ada di DTO.

Pelajaran T16: bug fotoUrl (guru+siswa) — form mengirim field yang tidak ada di DTO → 400. Spec CRUD WAJIB mengirim PAYLOAD LENGKAP.

### 7.4 Autosave input nilai (§15.6)

§15.6 (/guru/penilaian/.../nilai):
```
autosave draft per sel (indikator "tersimpan ✓");
sel kosong disorot kuning;
nilai < KKM diberi teks merah;
Enter/panah = pindah baris
```

- Frontend: debounce + PATCH per sel nilai.
- Backend: endpoint `PATCH /api/guru/penilaian/:penilaianId/nilai/:siswaId {nilai, catatan?}`.
- Indikator "tersimpan ✓" di frontend setelah respons 200.

### 7.5 Cache SWR

`useCachedList` + `invalidateCache(prefix)` setelah mutasi.
- Daftar paket penilaian: `useCachedList('/api/guru/penilaian')`.
- Setelah tambah/edit penilaian: `invalidateCache('/api/guru/penilaian')`.

### 7.6 Lazy Route

`frontend/src/app/App.tsx:13-63` — `React.lazy()` + `<Lazy>` wrapper (ErrorBoundary + Suspense + PageSkeleton).

F6 halaman yang harus lahir lazy:
- `/guru/penilaian` (daftar paket)
- `/guru/penilaian/:paket` (TP/Penilaian/Rekap)
- `/guru/penilaian/:paket/penilaian/:id/nilai` (input nilai per siswa)
- `/guru/kelas/rapor/:siswa` (rapor per siswa + finalisasi)
- `/kurikulum/rapor` (monitor matriks)
- `/kurikulum/rapor/:kelas` (status kelas + buka kunci)
- `/kurikulum/rapor/:kelas/cetak` (cetak massal)

Library berat (Puppeteer/PDF) tetap di backend (§12.15 hanya berlaku frontend bundle).

### 7.7 Komponen v0.12.x

| Komponen | Pemakaian F6 |
|----------|--------------|
| `<PageContainer>` | Bungkus halaman penilaian/rapor; `bottomBar` untuk form input nilai (bar autosave sticky) |
| `<ConfirmDialog>` | Konfirmasi finalisasi rapor ("Setelah final, semua nilai siswa ini terkunci") |
| `<AdaptiveSelect>` | Pilih jenis penilaian (Formatif/Sumatif), subjenis, SB/B/C/K kokurikuler |
| `<PageMenu>` | Header halaman penilaian: aksi "+ Tambah Penilaian" + link TP/Rekap |
| `<FilterBar>` | Filter daftar paket by mapel/kelas; monitor rapor by kelas |
| `<Card>` | Kartu paket penilaian (watermark ikon mapel); kartu siswa di input nilai |
| `<SearchSelect>` | Pilih TP untuk sumatif TP; pilih siswa di rapor |
| `<SaveSuccess>` | Setelah tambah/edit penilaian → sukses page |
| `<UnsavedGuard>` | Form TP, form penilaian, catatan wali — guard perubahan belum simpan |

### 7.8 E2E Matrix

`frontend/playwright.config.ts` — 2 project: desktop 1280×800, mobile 375×812.
Login via API helper: `loginAs(page, email, pw)`.

Spec WAJIB untuk alur kritis F6:
- CRUD TP + 409 (jika ada)
- CRUD penilaian + SaveSuccess (back tidak kembali ke form)
- Input nilai autosave per sel (ketik nilai → "tersimpan ✓")
- Finalisasi rapor (ConfirmDialog → status Final → nilai terkunci)
- Buka kunci (alasan wajib → audit)
- Cetak PDF (1 siswa → PDF terdownload; massal → progress)
- RBAC: guru hanya bisa input nilai mapelnya; wali kelas hanya bisa finalisasi kelasnya; kurikulum bisa monitor+cetak; kepsek baca-saja

---

## 8. USULAN (untuk diputuskan PLANNER, bukan final)

### 8.1 Entitas Penilaian & Rapor yang Diperlukan

#### 8.1.1 `tujuan_pembelajaran` (TP)

```
tujuan_pembelajaran
  id            serial PK
  mapelId       FK → mapel (onDelete CASCADE — hapus mapel = hapus TP)
  deskripsi     text
  urutan        int default 0
  createdAt     timestamptz
  updatedAt     timestamptz
```

#### 8.1.2 `penilaian` (jenis penilaian per paket)

```
penilaian
  id            serial PK
  penugasanId   FK → penugasan (onDelete CASCADE — hapus paket = hapus penilaian)
  nama          varchar
  jenis         varchar ('Formatif' | 'Sumatif')
  subjenis      varchar NULLABLE ('Sumatif TP' | 'Sumatif Akhir Semester' | 'Sumatif Akhir Tahun')
  bobot         int (≥ 1)
  tanggal       date
  createdAt     timestamptz
  updatedAt     timestamptz
```

#### 8.1.3 `penilaian_tp` (junction Sumatif TP ↔ TP)

```
penilaian_tp
  penilaianId   FK → penilaian (CASCADE)
  tpId          FK → tujuan_pembelajaran (CASCADE)
  PRIMARY KEY (penilaianId, tpId)
```

#### 8.1.4 `nilai` (nilai per siswa per penilaian)

```
nilai
  id            serial PK
  penilaianId   FK → penilaian (CASCADE)
  siswaId       FK → siswa (CASCADE)
  nilai         int (0-100)
  catatan       varchar NULLABLE
  diubahOleh    FK → guru NULLABLE (audit penginput §9, onDelete SET NULL)
  createdAt     timestamptz
  updatedAt     timestamptz
  UNIQUE(penilaianId, siswaId)
```

#### 8.1.5 `rapor_siswa` (header rapor per siswa per semester)

```
rapor_siswa
  id              serial PK
  siswaId         FK → siswa (CASCADE)
  kelasId         FK → kelas (RESTRICT)
  tahunAjaranId   FK → tahun_ajaran (RESTRICT)
  status          varchar ('Draft' | 'Final') default 'Draft'
  finalisasiOleh  FK → guru NULLABLE (wali kelas yang finalisasi, onDelete SET NULL)
  finalisasiPada  timestamptz NULLABLE
  catatanWali     text NULLABLE
  nilaiKatrol     jsonb NULLABLE (override nilai akhir per mapel: {mapelId: nilaiOverride})
  ketidakhadiranOverride jsonb NULLABLE ({sakit, izin, alpha, tk} override dari presensi)
  createdAt       timestamptz
  updatedAt       timestamptz
  UNIQUE(siswaId, tahunAjaranId)
```

#### 8.1.6 `rapor_buka_kunci_log` (audit buka kunci)

```
rapor_buka_kunci_log
  id            serial PK
  raporSiswaId  FK → rapor_siswa (CASCADE)
  alasan        varchar (WAJIB)
  diubahOleh    FK → users (SET NULL)
  createdAt     timestamptz
```

#### 8.1.7 `kokurikuler_kegiatan` + `kokurikuler_asesmen`

```
kokurikuler_kegiatan
  id            serial PK
  tahunAjaranId FK → tahun_ajaran (RESTRICT)
  tema          varchar
  createdAt     timestamptz
  updatedAt     timestamptz

kokurikuler_dimensi
  id            serial PK
  nama          varchar (8 dimensi tetap — perlu konfirmasi user)

kokurikuler_asesmen
  id            serial PK
  kegiatanId    FK → kokurikuler_kegiatan (CASCADE)
  siswaId       FK → siswa (CASCADE)
  dimensiId     FK → kokurikuler_dimensi (RESTRICT)
  nilai         varchar ('SB' | 'B' | 'C' | 'K')
  penilaiGuruId FK → guru (SET NULL)
  createdAt     timestamptz
  updatedAt     timestamptz
  UNIQUE(kegiatanId, siswaId, dimensiId, penilaiGuruId)
```

#### 8.1.8 `ekskul` + `ekskul_peserta` + `ekskul_penilaian`

```
ekskul
  id            serial PK
  tahunAjaranId FK → tahun_ajaran (RESTRICT)
  nama          varchar
  pembinaGuruId FK → guru (SET NULL)
  createdAt     timestamptz
  updatedAt     timestamptz

ekskul_peserta
  ekskulId      FK → ekskul (CASCADE)
  siswaId       FK → siswa (CASCADE)
  PRIMARY KEY (ekskulId, siswaId)

ekskul_penilaian
  id            serial PK
  ekskulId      FK → ekskul (CASCADE)
  siswaId       FK → siswa (CASCADE)
  nilai         varchar ('SB' | 'B' | 'C' | 'K')
  tujuan        text NULLABLE
  kehadiranTotal int
  kehadiranHadir int
  createdAt     timestamptz
  updatedAt     timestamptz
  UNIQUE(ekskulId, siswaId)
```

### 8.2 Daftar Endpoint + RBAC

| Method | Path | Peran | Deskripsi |
|--------|------|-------|-----------|
| GET | `/api/guru/penilaian` | guru, admin | Daftar paket penilaian guru yang login (TA aktif) |
| GET | `/api/guru/penilaian/:penugasanId/tp` | guru (miliknya), admin | Daftar TP untuk mapel paket itu |
| POST | `/api/guru/penilaian/:penugasanId/tp` | guru (miliknya), admin | Tambah TP |
| PATCH | `/api/guru/penilaian/tp/:id` | guru (miliknya), admin | Edit TP |
| DELETE | `/api/guru/penilaian/tp/:id` | guru (miliknya), admin | Hapus TP (409 bila dipakai di penilaian) |
| GET | `/api/guru/penilaian/:penugasanId/penilaian` | guru (miliknya), admin, kurikulum (monitor), kepsek (baca) | Daftar penilaian untuk paket |
| POST | `/api/guru/penilaian/:penugasanId/penilaian` | guru (miliknya), admin | Tambah penilaian |
| PATCH | `/api/guru/penilaian/penilaian/:id` | guru (miliknya), admin | Edit penilaian (409 bila rapor Final) |
| DELETE | `/api/guru/penilaian/penilaian/:id` | guru (miliknya), admin | Hapus penilaian (409 bila rapor Final) |
| GET | `/api/guru/penilaian/penilaian/:id/nilai` | guru (miliknya), admin | Daftar nilai per siswa (roster otomatis) |
| PATCH | `/api/guru/penilaian/penilaian/:id/nilai/:siswaId` | guru (miliknya), admin | Autosave nilai per siswa (409 bila rapor Final) |
| GET | `/api/guru/penilaian/:penugasanId/rekap` | guru (miliknya), admin, kurikulum, kepsek | Rekap nilai matriks siswa × penilaian + nilai akhir |
| GET | `/api/guru/kelas/rapor` | guru (wali kelas), admin | Status rapor kelas wali (Draft/Final per siswa) |
| GET | `/api/guru/kelas/rapor/:siswaId` | guru (wali kelasnya), admin | Pratinjau rapor siswa + ketidakhadiran + catatan wali |
| PATCH | `/api/guru/kelas/rapor/:siswaId/catatan` | guru (wali kelasnya), admin | Simpan catatan wali |
| POST | `/api/guru/kelas/rapor/:siswaId/finalisasi` | guru (wali kelasnya), admin | Finalisasi rapor (konfirmasi → status Final → kunci nilai) |
| GET | `/api/kurikulum/rapor` | kurikulum, admin, kepsek | Monitor matriks kelas × mapel (kelengkapan nilai) |
| GET | `/api/kurikulum/rapor/:kelasId` | kurikulum, admin, kepsek | Status rapor per siswa di kelas |
| POST | `/api/kurikulum/rapor/:raporSiswaId/buka-kunci` | kurikulum, admin | Buka kunci rapor Final (alasan wajib → audit) |
| POST | `/api/kurikulum/rapor/:kelasId/cetak` | kurikulum, admin | Cetak PDF massal (body: {siswaIds[], komponen[]}) |
| GET | `/api/guru/kelas/rapor/:siswaId/cetak` | guru (wali kelasnya), admin | Cetak PDF 1 siswa |

### 8.3 Halaman UI (§15.6 / §15.4)

**§15.6 — Area Guru:**
- `/guru/penilaian` — daftar PAKET saya: kartu per mapel—kelas + ringkas (jumlah penilaian, % nilai terisi, peringatan merah bila ada penilaian kosong menjelang akhir semester).
- `/guru/penilaian/:paket` — 3 sub-halaman: TP (CRUD), Penilaian (CRUD + link input nilai), Rekap Nilai (matriks siswa × penilaian sumatif + nilai akhir).
- `/guru/penilaian/:paket/penilaian/:id/nilai` — INPUT NILAI PER SISWA: tabel siswa + input angka 0-100, autosave per sel, Enter/panah pindah baris, sel kosong kuning, < KKM merah, baris terkunci jika rapor Final.
- `/guru/kelas/rapor/:siswa` — RAPOR PER SISWA: pratinjau rapor (A. Nilai Akademik, B. Kokurikuler, C. Ekstrakurikuler, D. Ketidakhadiran, E. Catatan Wali), tombol FINALISASI + Cetak PDF.

**§15.4 — Area Kurikulum:**
- `/kurikulum/rapor` — monitor: matriks kelas × mapel (persen nilai terisi; merah kurang) + status rapor per kelas.
- `/kurikulum/rapor/:kelas` — status kelas: tabel siswa (kelengkapan nilai, status Draft/Final, Buka Kunci).
- `/kurikulum/rapor/:kelas/cetak` — CETAK MASSAL: pilih siswa, pilih komponen, Buat PDF.

### 8.4 Daftar Pertanyaan Terbuka (perlu keputusan user sebelum F6 dibuka)

1. **8 dimensi kokurikuler:** Apa saja 8 dimensi yang dimaksud §9? (Perlu daftar eksplisit dari user/sistem referensi `radig/rapor`.)

2. **Rata-rata SB/B/C/K multi-penilai kokurikuler:** Bagaimana cara merata-ratakan nilai SB/B/C/K dari multiple penilai? (Konversi ke angka lalu rata-rata? Atau modus?)

3. **KKM per-mapel:** Apakah F6 butuh KKM per-mapel (override global)? Spec §9 mengatakan "KKM global default 75" — tidak menyebut per-mapel. Tapi sistem `radig/rapor` mungkin punya.

4. **Pola kalimat deskripsi capaian:** Spec §9 mengatakan "pola kalimat & pembersihan frasa persis referensi." Apakah user bisa memberikan kode `radig/rapor` atau dokumentasi pola kalimatnya?

5. **Mapel agama sesuai agama siswa:** §9 baris 554: "mapel agama sesuai agama siswa." Bagaimana cara kerjanya? Apakah ada mapel "Agama Islam" dan "Agama Kristen" sebagai mapel terpisah, atau satu mapel "Agama" dengan konten berbeda per agama siswa?

6. **Seni+Prakarya digabung:** §9 baris 554-555: "Seni+Prakarya digabung 'Seni Budaya dan Prakarya'." Apakah ini penggabungan di level mapel (2 mapel → 1 di rapor) atau di level penugasan? Bagaimana jika hanya ada 1 guru untuk 1 mapel?

7. **Nilai katrol:** §9 baris 547: "Nilai katrol = override manual." Siapa yang bisa mengisi nilai katrol? Guru mapel? Wali kelas? Kurikulum? Kapan dipakai?

8. **Tanggal rentang semester:** Rapor per semester — bagaimana menentukan rentang tanggal semester? Apakah tahun_ajaran punya tanggal mulai/selesai (yang saat ini TIDAK ada di entity), atau pakai rentang kalender tetap?

9. **Tanda tangan di rapor:** §9 menyebut "ttd Kepsek" dan "ttd Ortu + Kepsek + Wali." Apakah ttd = gambar scan (upload), atau cukup nama tercetak? Profil sekolah sudah punya kepsekNama/kepsekNip — apakah perlu upload ttd image?

10. **Tanggapan Orang Tua:** §9 menyebut "Tanggapan Orang Tua" di rapor. Apakah ini field yang diisi oleh orang tua (di luar sistem)? Atau field kosong yang dicetak untuk diisi manual?

11. **Puppeteer di Docker:** Jika pakai Puppeteer (rekomendasi), Docker image backend akan membengkak (~300MB Chromium). Apakah user OK dengan ini, atau perlu pendekatan alternatif (container terpisah, API eksternal)?

12. **Koreksi ketidakhadiran:** Apakah koreksi S/I/A/TK oleh wali kelas mengubah data presensi asli (F2), atau hanya override di rapor (overlay)? Spec §9 mengatakan "koreksi wali = audit" — tapi tidak jelas apakah mengubah sumber.

---

## Ringkasan Eksekutif untuk Planner

**Yang sudah ada di kode (siap pakai F6):**
- Entitas `penugasan` (paket guru+mapel+kelas+TA — sumber turunan daftar siswa).
- Entitas `mapel` (nama, kode, kelompok, urutan).
- Entitas `siswa` (biodata lengkap + kelasId + status — untuk roster & rapor).
- Entitas `kelas` (waliGuruId — wali kelas untuk finalisasi).
- Entitas `guru` (userId — link ke login untuk RBAC).
- Entitas `tahun_ajaran` (nama, semester, aktif — per semester).
- Pengaturan KKM `{nilai: 75}` via `GET/PATCH /api/kurikulum/pengaturan/kkm`.
- AuditService dengan pola `log()` bernama.
- RolesGuard + `@Roles()`.
- ValidationPipe + DTO pattern.
- Frontend: lazy routes, useCachedList, komponen v0.12.x, e2e helpers.
- F2 riset: presensi_sesi/presensi_siswa (untuk ketidakhadiran rapor).

**Yang perlu dibangun di F6:**
- Entitas baru: `tujuan_pembelajaran`, `penilaian`, `penilaian_tp`, `nilai`, `rapor_siswa`, `rapor_buka_kunci_log`, `kokurikuler_kegiatan`, `kokurikuler_dimensi`, `kokurikuler_asesmen`, `ekskul`, `ekskul_peserta`, `ekskul_penilaian`.
- Modul NestJS: `penilaian/` (entity + service + controller + module + DTO).
- Endpoint: TP CRUD, penilaian CRUD, nilai autosave, rekap, rapor siswa, finalisasi, buka kunci, cetak PDF.
- Frontend: `/guru/penilaian` (daftar paket + TP + penilaian + input nilai + rekap), `/guru/kelas/rapor/:siswa` (rapor + finalisasi), `/kurikulum/rapor` (monitor + status + cetak massal).
- PDF library: Puppeteer (rekomendasi) + template engine (EJS/Handlebars).
- E2e spec: CRUD TP/penilaian/nilai, autosave, finalisasi, buka kunci, cetak PDF, RBAC.

**Pertanyaan yang butuh keputusan user sebelum F6 dibuka:**
1. 8 dimensi kokurikuler (daftar eksplisit).
2. Rata-rata SB/B/C/K multi-penilai.
3. KKM per-mapel (global vs per-mapel).
4. Pola kalimat deskripsi capaian (kode referensi `radig/rapor`).
5. Mapel agama sesuai agama siswa (mekanisme).
6. Seni+Prakarya digabung (level mapel vs rapor).
7. Nilai katrol (siapa, kapan).
8. Tanggal rentang semester (kolom di tahun_ajaran?).
9. Tanda tangan di rapor (scan image vs nama tercetak).
10. Tanggapan Orang Tua (field di sistem vs manual).
11. Puppeteer di Docker (OK vs alternatif).
12. Koreksi ketidakhadiran (override vs ubah sumber).
