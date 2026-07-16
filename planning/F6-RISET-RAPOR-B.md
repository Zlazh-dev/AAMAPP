# RISET F6 — Penilaian dan Rapor (Pemulihan)

**Pelaksana:** AGENT-3  
**Tanggal:** 2026-07-16  
**Sifat:** riset kode aktual + spesifikasi mengikat §9; seluruh rancangan di bawah adalah usulan untuk keputusan PLANNER/USER, bukan implementasi.

## 1. Ringkasan temuan

Fondasi F1 menyediakan paket mengajar, mapel, kelas, siswa, guru-akun, wali kelas, tahun ajaran, profil sekolah, dan KKM global. Belum ada entity TP, penilaian, nilai, rapor, kokurikuler, ekskul, atau PDF. Paket `penugasan` adalah aggregate root paling tepat untuk penilaian karena mengikat mapel, kelas, semester, dan guru, serta sengaja mempertahankan ID saat guru diganti.

Prinsip arsitektur F6 yang disarankan:

1. daftar paket guru diturunkan dari `penugasan.guruId` melalui tautan `guru.userId`;
2. daftar siswa paket diturunkan dari `penugasan.kelasId` + siswa aktif, tanpa tabel enrollment manual;
3. TP, penilaian, dan nilai dimiliki paket/semester, bukan guru pribadi;
4. nilai akhir dan deskripsi adalah turunan; simpan hanya input dan override yang memang keputusan manusia;
5. status Draft/Final rapor harus persisten karena merupakan keputusan workflow dan boundary penguncian;
6. finalisasi mengambil snapshot cetak minimum agar laporan historis tidak berubah saat master data/edit aturan berubah;
7. seluruh mutasi nilai dan workflow wajib menjalankan authorization atribut di service, bukan hanya role guard.

## 2. Sumber turunan daftar siswa yang dinilai

### 2.1 Rantai sumber kebenaran

`Penugasan` menyimpan FK wajib ke mapel, kelas, tahun ajaran, dan guru [`backend/src/kurikulum/penugasan.entity.ts`](backend/src/kurikulum/penugasan.entity.ts:25). Constraint unik mapel-kelas-TA serta komentar entity menyatakan paket adalah sumber turunan penilaian dan rapor [`Penugasan`](backend/src/kurikulum/penugasan.entity.ts:16). Mapel menyediakan nama, kode, kelompok, dan urutan rapor [`Mapel`](backend/src/kurikulum/mapel.entity.ts:16). Siswa menyimpan kelas aktif dan status [`Siswa.kelasId`](backend/src/siswa/siswa.entity.ts:89), [`Siswa.status`](backend/src/siswa/siswa.entity.ts:96).

Untuk paket X:

```text
penugasan X
  -> kelasId, mapelId, tahunAjaranId
  -> siswa WHERE kelasId = X.kelasId AND status = aktif
  -> ORDER BY nomor absen jika tersedia, fallback nama/NIS
```

§9 mengikat bahwa guru tidak pernah menambah siswa manual; siswa baru otomatis muncul dengan nilai kosong, siswa pindah/nonaktif hilang dari daftar aktif namun riwayat tetap terbaca [`PROMPT_AGENT.md`](PROMPT_AGENT.md:570), [`PROMPT_AGENT.md`](PROMPT_AGENT.md:595).

### 2.2 Kesenjangan aktual

- Belum ada nomor absen pada siswa; spesifikasi UI meminta urut absen. Perlu keputusan apakah menambah `nomorAbsen` pada penempatan kelas atau fallback alfabetis.
- `siswa.kelasId` hanya keadaan kini, tanpa periode efektif. Riwayat kelas lama tidak dapat direkonstruksi setelah pindah kecuali nilai menyimpan `penugasanId`, `siswaId`, dan snapshot kelas/mapel/semester.
- Hard-delete siswa saat ini masih mungkin; F6 harus membuat delete berelasi menjadi 409/nonaktif saja atau memakai `SET NULL` + snapshot. Untuk integritas akademik, `RESTRICT` lebih aman.

### 2.3 Kaitan dengan F2

F2 dan F6 memakai proyeksi roster yang sama: siswa aktif pada kelas paket. Perbedaannya:

- F2 membuat snapshot per sesi tanggal nyata;
- F6 membuat nilai per penilaian dalam semester;
- perpindahan siswa ke depan mengikuti kelas baru, tetapi nilai dan presensi lama tetap terkait paket/sesi lama.

F6 sebaiknya memakai service/domain query bersama `ActiveStudentsByClassPort`, bukan membaca tabel detail presensi untuk menentukan peserta nilai. Presensi hanya menjadi sumber agregat S/I/A rapor.

## 3. Pemetaan model §9 ke usulan entity

§9 menetapkan TP, penilaian Formatif/Sumatif, subjenis, bobot, nilai 0–100, rumus nilai akhir, deskripsi otomatis, nilai katrol, kokurikuler, ekskul, status rapor, dan cetak [`PROMPT_AGENT.md`](PROMPT_AGENT.md:538).

### 3.1 `tujuan_pembelajaran`

| Kolom | Usulan |
|---|---|
| `id` | serial PK |
| `penugasanId` | FK `RESTRICT`; pemilik paket semester |
| `kode` | varchar opsional; unik per paket bila dipakai |
| `deskripsi` | text wajib |
| `urutan` | int default 0 |
| timestamps | timestamptz |

TP per paket lebih tepat daripada langsung per mapel global karena guru dapat merumuskan TP per kelas/semester. Bila user menghendaki reuse, tambahkan fitur salin, bukan shared mutable record.

### 3.2 `penilaian`

| Kolom | Usulan |
|---|---|
| `id` | serial PK |
| `penugasanId` | FK `RESTRICT` |
| `nama` | varchar wajib |
| `jenis` | `FORMATIF|SUMATIF` |
| `subjenis` | nullable; `SUMATIF_TP|SUMATIF_AKHIR_SEMESTER|SUMATIF_AKHIR_TAHUN` |
| `bobot` | int min 1; untuk sumatif |
| `tanggal` | date nullable/wajib sesuai keputusan |
| `aktif` | bool atau archivedAt; hindari hard-delete setelah nilai ada |
| timestamps | timestamptz |

Constraint service: Formatif tidak boleh punya subjenis rapor; Sumatif wajib subjenis dan bobot. Penilaian Sumatif TP wajib terhubung minimal satu TP.

### 3.3 `penilaian_tp`

Join table `(penilaianId, tujuanPembelajaranId)` unique, kedua FK `RESTRICT`. Service memastikan keduanya berasal dari paket yang sama. Relasi many-to-many ini diperlukan karena satu Sumatif TP dapat mencakup ≥1 TP.

### 3.4 `nilai_siswa`

| Kolom | Usulan |
|---|---|
| `id` | serial PK |
| `penilaianId` | FK `RESTRICT` |
| `siswaId` | FK `RESTRICT` |
| `nilai` | numeric/int 0–100 nullable |
| `catatan` | varchar nullable |
| `inputByUserId` | FK `SET NULL` |
| `version` | int untuk optimistic concurrency autosave |
| timestamps | timestamptz |

Unique `(penilaianId, siswaId)`. Jangan membuat row kosong massal; daftar menampilkan siswa turunan lalu left join nilai. Row lahir pada autosave pertama. Input kosong berarti belum dinilai, bukan nol.

### 3.5 Nilai akhir dan deskripsi

§9 menetapkan:

```text
nilaiAkhir = round(sum(nilaiSumatif * bobot) / sum(bobotSumatif))
```

Formatif dikecualikan [`PROMPT_AGENT.md`](PROMPT_AGENT.md:540). Bila ada sumatif kosong, pertanyaan penting adalah apakah denominator hanya nilai terisi atau seluruh bobot; rekomendasi aman: nilai akhir belum lengkap/null sampai semua sumatif wajib terisi, agar nilai kosong tidak diam-diam menguntungkan/merugikan.

Nilai akhir **tidak perlu kolom mutable**. Hitung query/service dan cache terkontrol. Untuk cetak Final, simpan snapshot hasil.

Deskripsi otomatis membutuhkan rata-rata per TP dari penilaian Sumatif TP, membandingkan KKM, memilih top 2 dan bottom 2, lalu membersihkan frasa sesuai referensi `radig/rapor`. Repo aktual tidak memuat kode referensi tersebut; algoritme/pola kalimat harus diperoleh sebelum implementasi. Simpan `deskripsiOverride` hanya jika manusia mengubah; bila null, render hasil turunan.

### 3.6 Nilai katrol

Usulan entity `nilai_akhir_override` unique `(penugasanId,siswaId)`:

- `nilaiOverride` 0–100;
- `alasan` wajib;
- `setByUserId`, timestamps;
- nilai hitung tetap tersedia untuk audit/perbandingan.

Jangan menimpa nilai per penilaian. Perlu keputusan siapa yang boleh mengatrol—§15.6 menempatkannya pada wali, tetapi matriks §8.2 memberi nilai pada guru mapel/admin; ini konflik terbuka.

### 3.7 Rapor inti

`rapor_siswa` unique `(siswaId,tahunAjaranId)`:

- `status DRAFT|FINAL`;
- `kelasIdSnapshot`, `waliGuruIdSnapshot`;
- `catatanWali`;
- `ketidakhadiranOverrideS/I/A` nullable + `alasanKoreksi`;
- `finalizedAt`, `finalizedByUserId`;
- `unlockedAt`, `unlockedByUserId`, `unlockReason` atau tabel event terpisah;
- `version`;
- `snapshotJson`/versi template saat finalisasi—keputusan perlu kehati-hatian.

Status wajib kolom karena Final adalah keputusan workflow. Kelengkapan, nilai akhir, dan ketidakhadiran normal adalah turunan.

Untuk audit workflow yang kuat, usulkan `rapor_status_event(raporId, fromStatus, toStatus, actorUserId, alasan, createdAt)` append-only. Buka kunci berarti status kembali Draft + event, bukan menghapus jejak finalisasi.

### 3.8 Kokurikuler dan ekskul

Karena scope besar, pisahkan aggregate:

- `kegiatan_kokurikuler(id,tahunAjaranId,tema,kelasId?)`;
- `dimensi_kokurikuler(id,nama,urutan)` — seed delapan dimensi setelah daftar final tersedia;
- `asesmen_kokurikuler(kegiatanId,siswaId,dimensiId,penilaiUserId,predikat SB/B/C/K)` unique per penilai;
- `deskripsi_kokurikuler_override(kegiatanId,siswaId,deskripsi,alasan?,updatedBy)`;
- `ekskul`, `ekskul_peserta(ekskulId,siswaId,tahunAjaranId)`, `asesmen_ekskul(pesertaId,predikat,hadir,totalPertemuan,keterangan)`.

Rata-rata multi-penilai SB/B/C/K membutuhkan mapping ordinal yang belum ditetapkan dan aturan pembulatan/tie-break.

## 4. KKM

`PengaturanService` membatasi key menjadi empat, termasuk `kkm` [`PengaturanKey`](backend/src/pengaturan/pengaturan.service.ts:14). Seed default adalah `{nilai:75}` [`PengaturanService.seedDefaults()`](backend/src/pengaturan/pengaturan.service.ts:153). Pengaturan disimpan sebagai JSONB [`Pengaturan.value`](backend/src/pengaturan/pengaturan.entity.ts:13) dan dicache 60 detik dengan invalidasi mutasi [`PengaturanService`](backend/src/pengaturan/pengaturan.service.ts:62).

Pemakaian F6:

- tampilkan merah bila input/nilai akhir < KKM;
- deskripsi otomatis memakai KKM;
- finalisasi snapshot `kkmYangDipakai` agar perubahan KKM kemudian tidak mengubah rapor Final;
- response paket/rekap membawa KKM server-side; frontend tidak menghitung dari konstanta 75.

KKM per-mapel pernah ditolak pada F1. Jangan menambahkannya diam-diam. Pertanyaan user: apakah F6 tetap global seperti keputusan §9 atau ada kebutuhan resmi per-mapel/fase? Default riset: global.

## 5. Ketidakhadiran otomatis dari F2

Riset F2 mengusulkan `presensi_sesi` unik `(jadwalKbmId,tanggalWib)` dan `presensi_siswa` detail. Agregat rapor per siswa/semester:

```sql
SELECT ps.siswa_id,
       count(*) FILTER (WHERE ps.status='S') AS sakit,
       count(*) FILTER (WHERE ps.status='I') AS izin,
       count(*) FILTER (WHERE ps.status='A') AS alpha
FROM presensi_siswa ps
JOIN presensi_sesi sesi ON sesi.id=ps.presensi_sesi_id
WHERE sesi.tahun_ajaran_id=:taId
  AND ps.siswa_id=:siswaId
  AND sesi.voided_at IS NULL
GROUP BY ps.siswa_id;
```

Hanya sesi TERLAKSANA/DIGANTIKAN yang memiliki detail; KOSONG/tidak tercatat tidak boleh menjadi alpha. T terlambat kemungkinan dianggap hadir dan tidak masuk S/I/A. §9 menyebut output rapor S/I/TK sementara presensi memakai S/I/A; mapping A→TK perlu label presentasi, bukan status baru, tetapi harus dikonfirmasi.

Wali boleh koreksi dengan alasan dan audit [`PROMPT_AGENT.md`](PROMPT_AGENT.md:552). Simpan override nullable pada rapor, tetapi pertahankan nilai otomatis dan tampilkan keduanya di audit. Mutasi koreksi hanya wali kelas siswa/admin sesuai keputusan final; jangan mengubah row presensi historis dari halaman rapor.

## 6. Finalisasi dan penguncian

### 6.1 Aturan

Wali memfinalisasi per siswa atau semua yang lengkap; Final mengunci seluruh nilai siswa pada semester; buka kunci hanya Kurikulum/Admin dengan alasan; Draft tetap dapat dicetak dengan watermark/peringatan [`PROMPT_AGENT.md`](PROMPT_AGENT.md:556).

### 6.2 Boundary transaksi

Finalisasi harus dalam transaksi database:

1. lock row rapor;
2. verifikasi aktor adalah wali kelas saat ini atau admin;
3. hitung kelengkapan semua paket kelas/semester;
4. hitung nilai akhir/deskripsi/KKM/ketidakhadiran;
5. tolak bila tidak lengkap kecuali kebijakan override disetujui;
6. simpan status Final + snapshot + event audit;
7. commit.

Semua endpoint autosave nilai wajib mengecek `rapor_siswa.status` dalam transaksi yang sama sebelum upsert. Frontend disabled bukan kontrol keamanan.

### 6.3 Snapshot vs turunan

- Draft: tampilkan turunan live dari nilai/master/presensi.
- Final: gunakan snapshot akademik/cetak agar perubahan mapel, profil, wali, KKM, atau deskripsi tidak mengubah dokumen yang telah disahkan.
- Buka kunci: kembali ke Draft live; snapshot Final lama tetap dalam revision/event untuk audit.

Usulan `rapor_revision(id,raporId,revisionNo,snapshotJson,templateVersion,createdAt,createdBy)` immutable setiap finalisasi. Ini lebih aman daripada satu `snapshotJson` yang ditimpa.

## 7. Cetak PDF server-side

Belum ada library PDF pada backend; dependency saat ini hanya mencakup Nest/TypeORM, ExcelJS, dan util lain [`backend/package.json`](backend/package.json:10). Frontend juga tidak memiliki library cetak [`frontend/package.json`](frontend/package.json:13).

Kandidat:

1. **Playwright Chromium server-side**: fidelitas HTML/CSS tinggi, header/footer, page-break baik; dependency/browser besar, image container membesar.
2. **Puppeteer**: kemampuan serupa, ekosistem umum; juga membawa Chromium dan perlu hardening sandbox/container.
3. **wkhtmltopdf**: binary terpisah dan CSS modern lebih terbatas.
4. **PDFKit/pdfmake**: ringan tanpa browser, tetapi layout rapor multi-halaman lebih manual dan kurang setia HTML.

Rekomendasi riset: Playwright/Puppeteer sebagai kandidat utama karena keputusan produk adalah HTML template server-side. Template harus menerima snapshot terstruktur, escape seluruh teks, memakai aset lokal/allowlist, font tertanam, page-break deterministic, dan menghasilkan stream PDF tanpa file temp permanen.

Implikasi lazy/performa:

- library ini berada di backend, jadi bukan bundle React utama;
- import secara lazy/dynamic di `PdfService` saat endpoint cetak dipanggil agar startup lebih ringan;
- browser dapat dikelola pool terbatas, dengan timeout dan concurrency queue;
- endpoint massal sebaiknya job async + status/download jika jumlah siswa besar;
- route preview frontend tetap `React.lazy`; jangan memasukkan generator PDF browser-side.

## 8. Pola kode aktual yang wajib diikuti

### 8.1 RBAC atribut

Tautan akun-guru memakai `guru.userId` unik [`Guru.userId`](backend/src/guru/guru.entity.ts:40). Wali kelas disimpan pada `kelas.waliGuruId` unik [`Kelas.waliGuruId`](backend/src/kelas/kelas.entity.ts:28). Maka:

- guru mapel: role `guru` + `penugasan.guruId === guruLogin.id`;
- wali: role `guru` + `kelas.waliGuruId === guruLogin.id`;
- Kurikulum: monitor, unlock, mass print;
- Admin: akses penuh;
- Kepsek: read-only sesuai matriks.

Guru pengganti paket tetap aman karena update guru mempertahankan penugasan; TP/penilaian/nilai menempel penugasan, bukan guru.

### 8.2 Audit

`AuditService.record()` menyimpan actor, action, entity, label, summary, IP, dan perangkat [`AuditService.record()`](backend/src/audit/audit.service.ts:44). Audit F6 wajib untuk CRUD TP/penilaian, autosave nilai (batasi volume), override nilai akhir, koreksi absen, finalisasi, unlock, edit catatan/deskripsi, dan cetak.

Autosave dapat menghasilkan ribuan log; usulan: log nilai hanya bila berubah, ringkas old→new per cell, atau batch perubahan dalam jendela singkat tanpa kehilangan actor/time. Finalisasi/unlock selalu event sendiri.

### 8.3 DTO dan ValidationPipe

Global pipe menggunakan whitelist, transform, dan `forbidNonWhitelisted` [`bootstrap()`](backend/src/main.ts:37). Semua DTO nested autosave harus memakai `ValidateNested` + `Type`; field tidak dikenal ditolak. Jangan menerima field yang diabaikan. Validasi service tetap mengecek ownership, paket yang sama, range 0–100, final lock, dan concurrency.

### 8.4 Autosave

Usulan kontrak per sel:

```text
PUT /api/guru/penilaian/:penilaianId/nilai/:siswaId
{ nilai: 0..100|null, catatan?: string, version?: number }
→ { id, nilai, version, savedAt }
```

- debounce 400–800 ms setelah input stabil;
- satu siswa satu request, cancel request lama saat nilai berubah lagi;
- indikator `menyimpan / tersimpan / gagal-coba lagi` per row;
- 409 version conflict menampilkan nilai server, jangan overwrite diam-diam;
- queue perubahan belum tersimpan memicu UnsavedGuard;
- Final menghasilkan 409 `RAPOR_FINAL` dan row dikunci.

`UnsavedGuard` aktual menangani beforeunload dan dialog adaptif [`UnsavedGuard`](frontend/src/components/UnsavedGuard.tsx:12), tetapi autosave memerlukan dirty per-cell sampai respons sukses, bukan dirty seluruh form yang langsung direset saat request mulai.

### 8.5 Cache, lazy, komponen

Client memiliki LRU 50/TTL 60 detik dan invalidasi prefix [`invalidateCache()`](frontend/src/api/client.ts:285). Cache aman untuk daftar paket/monitor; halaman input nilai perlu revalidasi kuat dan versioning. Setelah autosave, invalidasi rekap paket, monitor kurikulum, dan rapor siswa terkait.

Semua page aktual lazy dan dibungkus ErrorBoundary/Suspense [`App.tsx`](frontend/src/app/App.tsx:13). Route F6 wajib mengikuti pola tersebut.

`PageContainer` menyediakan ukuran dan kompensasi bottom bar [`PageContainer`](frontend/src/components/PageContainer.tsx:21). `AdaptiveSelect` sudah menyediakan portal desktop/bottom sheet mobile dan focus return [`AdaptiveSelect`](frontend/src/components/AdaptiveSelect.tsx:22). Gunakan pula `PageMenu`, `FilterBar`, `ConfirmDialog`, `Card`, skeleton, toast, dan target sentuh v0.12.x.

Catatan: spec lama menyebut tab TP/Penilaian/Rekap, tetapi aturan global terbaru “tanpa tab” mengubahnya menjadi sub-halaman ber-route. Planner perlu menetapkan route final tanpa tab.

## 9. Usulan endpoint

### Guru mapel

- `GET /api/guru/penilaian/paket` — paket milik guru login + statistik.
- `GET /api/guru/penilaian/paket/:id` — ownership.
- CRUD `/paket/:id/tp` — ownership; admin override.
- CRUD `/paket/:id/penilaian` — ownership.
- `GET /penilaian/:id/nilai` — siswa aktif kelas left join nilai + lock status.
- `PUT /penilaian/:id/nilai/:siswaId` — autosave ownership, range, version, Final check.
- `GET /paket/:id/rekap` dan `/paket/:id/siswa/:siswaId` — hasil turunan.

### Wali kelas

- `GET /api/guru/kelas/rapor` — hanya kelas yang diwali.
- `GET /api/guru/kelas/rapor/:siswaId` — preview lengkap.
- `PATCH .../:siswaId/catatan`.
- `PATCH .../:siswaId/ketidakhadiran` — alasan wajib.
- `PATCH .../:siswaId/nilai-override` — hanya jika role diputuskan.
- `POST .../:siswaId/finalisasi`.
- `POST .../finalisasi-lengkap` — transaksi per siswa, response sukses/gagal terinci.
- `GET .../:siswaId/pdf`.

### Kurikulum/Admin/Kepsek

- `GET /api/kurikulum/rapor?kelasId=&taId=&page=&limit=` — monitor DB-level.
- `GET /api/kurikulum/rapor/:kelasId`.
- `POST /api/kurikulum/rapor/:raporId/buka-kunci` — Kurikulum/Admin, alasan wajib.
- `POST /api/kurikulum/rapor/:kelasId/cetak` — Kurikulum/Admin; job bila massal.
- `GET /api/kurikulum/rapor/jobs/:id` dan download.
- Kepsek memakai endpoint read-only terpisah/shared service, tanpa mutasi.

## 10. Usulan halaman UI

### Guru mapel

- `/guru/penilaian`: kartu paket otomatis, empty state bila belum ditugaskan.
- `/guru/penilaian/:paket`: hub/subpage links, bukan tab.
- `/guru/penilaian/:paket/tp`, `/penilaian`, `/rekap`.
- form TP/penilaian sebagai subroute.
- `/guru/penilaian/:paket/penilaian/:id/nilai`: tabel desktop, kartu mobile, keyboard navigation, autosave, progress, KKM, row Final locked, `PageContainer bottomBar`.
- `/guru/penilaian/:paket/siswa/:siswaId`: rekap read-only.

### Wali kelas

- `/guru/kelas/rapor`: daftar siswa, kelengkapan lintas mapel, status.
- `/guru/kelas/rapor/:siswaId`: preview A–E, catatan, konteks presensi/demerit, finalisasi, PDF.

### Kurikulum

- `/kurikulum/rapor`: matriks kelas×mapel, filter TA/kelas, progress.
- `/kurikulum/rapor/:kelasId`: status siswa, unlock beralasan.
- `/kurikulum/rapor/:kelasId/cetak`: pilihan siswa, preview/job progress/download.

## 11. E2E matrix minimum

Playwright saat ini menjalankan desktop 1280 dan mobile 375, tanpa retry [`playwright.config.ts`](frontend/playwright.config.ts:11). Spec aktual membuat data unik, login API, dan cleanup API [`kelas-crud.spec.ts`](frontend/e2e/gelombang2/kelas-crud.spec.ts:9).

Matrix F6:

1. paket guru muncul otomatis; paket guru lain tersembunyi dan API 403;
2. siswa aktif kelas muncul otomatis; nonaktif/pindah mengikuti aturan riwayat;
3. CRUD TP + validasi Sumatif TP minimal satu TP;
4. Formatif tidak masuk nilai akhir;
5. rumus bobot dan rounding benar pada boundary;
6. nilai kosong bukan nol; kelengkapan n/n benar;
7. autosave sukses, gagal-retry, double edit/cancel request, konflik 409 dua tab;
8. KKM global ditampilkan; perubahan KKM memengaruhi Draft tetapi tidak snapshot Final;
9. guru pengganti paket melanjutkan nilai lama;
10. finalisasi mengunci seluruh endpoint nilai siswa, bukan hanya UI;
11. wali kelas lain 403; Kurikulum/Admin unlock dengan alasan; audit ada;
12. agregat S/I/A dari F2 benar, KOSONG tidak dihitung, koreksi wali tidak mengubah presensi;
13. nilai katrol menampilkan nilai hitung dan override serta audit;
14. PDF satu siswa memuat sampul/identitas/A–E dan Draft warning;
15. cetak massal menghasilkan semua siswa terpilih dan state gagal terpulihkan;
16. desktop keyboard navigation dan mobile input card/sticky bar/unsaved guard;
17. DB query monitor terpaginasikan dan tidak N+1.

## 12. Pertanyaan terbuka untuk USER/PLANNER

1. Apakah nomor absen perlu kolom resmi per siswa-kelas-semester?
2. Bagaimana periode efektif tahun ajaran ditentukan jika entity TA belum punya tanggal mulai/akhir?
3. TP dimiliki paket per kelas/semester atau mapel dan dapat dipakai lintas kelas?
4. Penilaian Formatif memerlukan bobot/tanggal/catatan, dan apakah ikut deskripsi TP walau tidak masuk nilai akhir?
5. Untuk nilai sumatif kosong, apakah nilai akhir null sampai lengkap atau denominator hanya nilai terisi?
6. Aturan rounding tepat: JavaScript/SQL round biasa, banker's rounding, dan berapa digit antara?
7. Mohon akses kode/pola kalimat `radig/rapor` untuk algoritme deskripsi dan pembersihan frasa persis.
8. Bagaimana menangani TP dengan data kurang dari dua top/bottom atau nilai sama?
9. KKM tetap global atau F6 membutuhkan per-mapel/fase? Rekomendasi: tetap global sampai keputusan baru eksplisit.
10. Siapa berhak memberi nilai katrol: guru mapel, wali, Kurikulum, atau Admin? Apakah alasan wajib dan batasnya?
11. Apakah nilai katrol mengganti nilai akhir saja atau ikut menentukan deskripsi?
12. Apakah A presensi dicetak sebagai TK; apakah T terlambat dianggap hadir?
13. Rentang tanggal presensi semester berasal dari mana?
14. Bolehkah finalisasi bila ada nilai/mapel/kokurikuler/ekskul belum lengkap? Siapa boleh override?
15. Saat siswa pindah kelas, kelas/wali mana yang memfinalisasi rapor semester berjalan?
16. Apakah buka kunci membuka seluruh rapor siswa atau bisa per mapel?
17. Setelah unlock dan finalisasi ulang, apakah PDF lama harus tetap dapat diunduh sebagai revision?
18. Delapan dimensi kokurikuler apa saja dan mapping numerik SB/B/C/K untuk rata-rata?
19. Aturan tie/pembulatan asesmen multi-penilai kokurikuler?
20. Struktur ekskul: siapa penilai, sumber total pertemuan, dan apakah siswa dapat multi-ekskul?
21. Mapel agama “sesuai agama siswa”: apakah ada mapping mapel→agama yang perlu kolom baru?
22. Penggabungan Seni+Prakarya: bagaimana bila hanya satu paket ada atau guru/nilai berbeda?
23. Format kop/footer kementerian, logo kabupaten, ukuran kertas, margin, dan tanda tangan basah/digital?
24. Apakah PDF massal satu file gabungan atau ZIP PDF per siswa?
25. Apakah cetak Draft dibolehkan semua role atau hanya wali/Kurikulum/Admin?
26. Route final tanpa tab: setujukah TP/Penilaian/Rekap menjadi sub-halaman sesuai aturan global terbaru?
27. Retensi audit autosave: log setiap sel atau batch terkontrol?

## 13. Urutan implementasi yang disarankan

1. Putuskan pertanyaan model akademik, KKM, rounding, override, periode TA, dan template PDF.
2. Tetapkan schema TP/penilaian/nilai + constraint ownership dan historical retention.
3. Implementasikan kalkulator nilai/deskripsi sebagai pure domain service dengan unit test tabel.
4. Implementasikan endpoint paket/TP/penilaian/autosave + optimistic concurrency dan Final lock.
5. Implementasikan UI guru lazy/responsif dan E2E autosave/RBAC.
6. Integrasikan agregat presensi F2.
7. Implementasikan rapor Draft/Final/revision/unlock dan UI wali/Kurikulum.
8. Implementasikan kokurikuler/ekskul setelah aturan rinci diputuskan.
9. Implementasikan template HTML + PDF single, lalu job cetak massal.
10. Jalankan matrix E2E desktop/mobile, audit, performa DB, dan validasi snapshot historis.

## 14. Kesimpulan

F6 sebaiknya berpusat pada `penugasan` sebagai paket akademik stabil. Siswa selalu diproyeksikan dari kelas aktif, sementara nilai yang telah dibuat tetap mengikat siswa+paket untuk sejarah. Nilai akhir/deskripsi/absen normal adalah turunan; override, catatan, status Final, alasan unlock, dan revision PDF adalah keputusan manusia yang harus persisten dan teraudit. Risiko desain terbesar sebelum implementasi adalah periode efektif semester, algoritme referensi deskripsi, hak nilai katrol, kelengkapan finalisasi, kokurikuler, dan kontrak template PDF.