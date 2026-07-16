

## ZONA REKONSTRUKSI — BAGIAN 1: SPEC F1 §14.10 (verbatim, versi final pasca semua amandemen)

### 14.10 SPESIFIKASI TEKNIS F1 — DATA INDUK + KURIKULUM-JADWAL (T11–T16)

> Status 2026-07-17: SELURUH F1 sudah TERIMPLEMENTASI & teruji e2e.
> Bagian ini dipulihkan sebagai REFERENSI KONTRAK (penting utk F2–F6).

#### 14.10.1 Skema database (TypeORM synchronize; timestamps default semua)

```
guru            id PK • nama • nip varchar NULL UNIQUE • jenisKelamin ('L'|'P')
                • telepon NULL • fotoUrl default '' • status ('aktif'|'nonaktif')
                default 'aktif' • userId FK users NULL UNIQUE (tautan akun login)
siswa           id PK • nama • nis UNIQUE • nisn NULL UNIQUE • jenisKelamin
                • tempatLahir NULL • tanggalLahir date NULL • agama NULL
                • statusDalamKeluarga NULL • anakKe int NULL • alamat NULL
                • telepon NULL • sekolahAsal NULL • diterimaDiKelas NULL
                • diterimaTanggal date NULL • namaAyah/pekerjaanAyah/namaIbu/
                  pekerjaanIbu NULL • namaWali/alamatWali/teleponWali/
                  pekerjaanWali NULL (INLINE — TANPA tabel wali terpisah)
                • fotoUrl default '' • kelasId FK kelas NULL (SET NULL)
                • status ('aktif'|'nonaktif') default 'aktif'
kelas           id PK • nama UNIQUE • tingkat int (7|8|9) • fase default 'D'
                • waliGuruId FK guru NULL UNIQUE (1 guru = wali 1 kelas)
mapel           id PK • nama • kode UNIQUE • kelompok NULL • urutan int default 0
tahun_ajaran    id PK • nama ('2026/2027') • semester int (1|2) • aktif bool
                — UNIQUE(nama, semester); service MENJAMIN hanya 1 baris aktif
penugasan       id PK • guruId FK NOT NULL (ManyToOne Guru, onDelete RESTRICT)
                • mapelId FK • kelasId FK • tahunAjaranId FK
                — UNIQUE(mapelId, kelasId, tahunAjaranId); ganti guru = UPDATE
                  guruId (id paket & relasi lain TIDAK tersentuh — aturan §9)
jadwal_kbm      id PK • penugasanId FK CASCADE • hari int (1=Senin…6=Sabtu)
                • jamMulai time • jamSelesai time • sesiKe int NULL
kalender_libur  id PK • tanggal date UNIQUE • keterangan
pengaturan      key varchar PK • value jsonb • updatedByName varchar NULL —
                4 KEY SAJA:
                'profil_sekolah' {nama:'SMP IT Asy-Syadzili', jenjang, logoUrl,
                  kepsekNama, kepsekNip, kepsekJabatan, alamat, kabKota}
                'jam_presensi'   {jamMasuk '06:30', jamPulang '15:00',
                  toleransiMenit 15, cutoff '15:00'}
                'lokasi'         {aktif false, lat, lng, radiusMeter 100}
                'kkm'            {nilai 75}
```

Seed bootstrap: HANYA admin (F0) + 4 baris `pengaturan` default bila
kosong. TANPA seed tahun ajaran/kelas/orang/mapel — dibuat admin lewat
UI; halaman butuh TA aktif → arahan "Buat & aktifkan tahun ajaran dulu
di Pengaturan".

#### 14.10.2 Kontrak API (Bearer; peran di kurung; error Bahasa Indonesia)

**Data induk (mutasi = admin SAJA §8.2; GET boleh peran staf):**
- `GET /api/admin/guru?q=&status=` → daftar + `punyaAkun`, `jumlahPaket`
  (satu query GROUP BY, dilarang N+1 §12.16b). GET juga boleh kurikulum.
- `POST /api/admin/guru` {nama min 3, nip?, jenisKelamin, telepon?,
  fotoUrl?} → 201; NIP duplikat → 409 "NIP sudah terdaftar".
  fotoUrl valid: '' ATAU '/uploads/<nama-aman>' ATAU http(s) URL
  (konstanta bersama FOTO_URL_PATTERN — dipakai guru & siswa,
  create & update).
- `PATCH /api/admin/guru/:id` (partial, termasuk {status}).
- `DELETE /api/admin/guru/:id` → 409 "Guru masih memiliki data terkait —
  nonaktifkan saja" bila wali kelas/berpaket; TANPA ?force.
- `GET/POST/PATCH/DELETE /api/admin/siswa` — pola sama; q= mencocokkan
  nama|nis|nisn (ILIKE OR); pesan duplikat DIPISAH: "NIS sudah
  terdaftar" / "NISN sudah terdaftar"; DTO WAJIB memuat SEMUA field yg
  dikirim form UI (§12.16f — pelajaran 16-field-hilang);
  PATCH {kelasId} = pindah kelas → audit "Memindahkan X dari 7A ke 7B";
  PATCH {status:'nonaktif'} = mutasi keluar.
- `GET/POST/PATCH/DELETE /api/admin/kelas`; DELETE → 409 bila ada siswa
  aktif/penugasan; TANPA ?force.
- `PATCH /api/admin/kelas/:id/wali` {guruId|null, force?} — admin &
  kurikulum; guruId invalid → 404 "Guru tidak ditemukan"; guru sudah
  wali kelas lain → 409 MENYEBUT nama kelas lamanya; {force:true} =
  lepaskan dari kelas lama + tetapkan (audit dua sisi).
- **Import Excel (admin)**: `GET /api/admin/import/template?jenis=guru|siswa`
  → .xlsx (header + 1 baris contoh) • `POST /api/admin/import/preview`
  (multipart+jenis) → {valid, errors:[{baris, kolom, pesan}]} •
  `POST /api/admin/import/commit` → {tersimpan, dilewati} + audit.
  Validasi: wajib/format/duplikat di-file & DB/kelas tak ditemukan.
- **Upload**: `POST /api/admin/uploads` (admin|kurikulum, multipart
  "file", jpg/png/webp max 5MB) → {url:'/uploads/<nama>'}; backend
  useStaticAssets prefix '/uploads/'; nginx proxy /uploads/ → backend.

**Kurikulum (kurikulum|admin):**
- `GET/POST/PATCH/DELETE /api/kurikulum/mapel` (kode unik → 409).
- `GET /api/kurikulum/penugasan?guruId=&mapelId=&kelasId=` (lingkup TA
  aktif; tanpa TA aktif → 409 "Belum ada tahun ajaran aktif — buat &
  aktifkan di Pengaturan").
- `POST /api/kurikulum/penugasan` {guruId, mapelId, kelasIds[]} → buat
  SATU baris per kelas; duplikat → 409 menyebut mapel+pengampu
  ("Matematika di 7A sudah diampu Bu Rina").
- `PATCH /api/kurikulum/penugasan/:id` {guruId} = GANTI GURU (id paket
  tetap; guru divalidasi 404; implementasi update()+reload — TypeORM
  save() tidak mempersist FK). `DELETE` → 409 bila berjadwal ("Hapus
  jadwalnya dulu") — TANPA cascade diam-diam.
- `GET /api/kurikulum/jadwal?kelasId=|guruId=`;
  `POST/PATCH/DELETE /api/kurikulum/jadwal` {penugasanId, hari 1–6,
  jamMulai, jamSelesai, sesiKe?} — kelasId DITURUNKAN dari penugasan;
  validasi server DUA LAPIS lingkup TA: bentrok KELAS → 409 "Kelas 7A
  sudah ada KBM Matematika pada 07.00–07.40"; bentrok GURU lintas kelas
  → 409 "{guru} sudah mengajar {mapel} di kelas {kelas} pada {jam}".
- `GET/PATCH /api/kurikulum/pengaturan/kkm` {nilai} (kurikulum|admin;
  mengisi updatedByName juga).

**Pengaturan & lainnya:**
- `GET /api/pengaturan(/:key)` — SEMUA peran ber-token (termasuk guru).
- `PATCH /api/admin/pengaturan/:key` (admin; DEEP-MERGE parsial;
  TANPA endpoint DELETE key; mengisi updatedByName dari user sesi).
- `GET/POST/DELETE /api/admin/libur` (admin) +
  `POST /api/admin/libur/bulk` {tanggal[] maks 62, keterangan?,
  aksi:'tandai'|'hapus'} → {dibuat|dihapus, dilewati} + SATU audit
  ringkas +
  `GET /api/admin/libur/impor-nasional?tahun=` (proxy provider publik:
  dayoffapi → api-harilibur → Nager.Date; env-overridable; timeout 5
  dtk/provider; cache per tahun; TANPA menyimpan — simpan hanya lewat
  konfirmasi pratinjau → /bulk) +
  `GET /api/admin/libur/cek-nasional` (deteksi diam-diam utk banner).
- `GET/POST/PATCH /api/admin/tahun-ajaran` (admin) +
  `POST /api/admin/tahun-ajaran/:id/aktifkan` (nonaktifkan lainnya,
  idempotent, audit); DELETE TA aktif → 409.
- Sesi: daftar sesi aktif memakai `IsNull()` (DILARANG `null as any` di
  where TypeORM — diabaikan diam-diam); users & sessions list
  berpaginasi + q= server-side (§12.16a).

#### 14.10.4 Ringkasan tugas F1 (SEMUA SELESAI)
T11 backend data induk → T12 backend kurikulum → T13 frontend data induk
→ T13-UX retrofit v0.12 → T14 pengaturan (+peta Leaflet) → T15 batch
performa + halaman kurikulum + kalender seleksi-multi + impor libur
nasional → T15.9 e2e Playwright → T16 verifikasi end-to-end (laporan
final di tail dokumen ini; poin 12 & 15 menunggu QA user).
