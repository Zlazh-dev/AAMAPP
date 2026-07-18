# F3-SPEC — PRESENSI WAJAH GURU (kontrak dikunci planner 2026-07-18)

> Sumber kebenaran F3 untuk SEMUA executor. Planner-owned (jangan diubah
> agent). Latar: `planning/F3-RISET-PRESENSI-WAJAH.md`. Prinsip: kontrak
> DIKUNCI → backend & frontend jalan PARALEL setelah backend live.

## KEPUTUSAN BESAR — F3 DIFASE

- **F3a (SEKARANG)** = presensi HP mandiri (1:1) + enrollment wajah +
  geofence + monitor admin + input manual. Ini INTI: guru absen sendiri
  via HP. Nilai penuh tanpa kiosk.
- **F3b (NANTI)** = KIOSK 1:N (kamera terpasang di sekolah), pairing
  perangkat (kode 6 digit → token perangkat), antrean offline. Surface
  besar & rumit — DITUNDA sampai F3a matang. JANGAN kerjakan kiosk di F3a.

## Arsitektur wajah (dikunci) — berat di device, ringan di server

- **Device (browser)**: `@vladmandic/human` mendeteksi wajah + mengekstrak
  **embedding** (vektor) + liveness ringan. Semua kerja BERAT (CNN) di sini.
- **Server**: HANYA cosine similarity (perkalian vektor — MURAH) antara
  embedding live vs embedding referensi guru. TIDAK ada analisis wajah berat
  di server. Ini menghormati keputusan user "metrik di perangkat, server
  tidak berat".
- **Privasi**: VIDEO & FOTO MENTAH tidak pernah dikirim ke server saat scan;
  hanya embedding (array angka). Enrollment boleh kirim embedding (+ opsional
  foto referensi kecil untuk UI konfirmasi, pakai `fotoUrl` guru yang sudah
  ada).
- **Batas jujur (dokumentasikan)**: karena matching client-supplied embedding,
  ini BUKAN anti-spoof kuat (klien jahat bisa kirim embedding tersimpan).
  Dapat diterima utk presensi guru sekolah (bukan model ancaman adversarial;
  kiosk F3b diawasi). Liveness F3a = RINGAN (deteksi wajah + gerak/pose
  minimal), bukan anti-foto penuh.

## Keputusan planner atas 7 pertanyaan terbuka (final)
1. **Ambang cosine** = **0.6** default, dapat dikonfigurasi via pengaturan
   `wajah.threshold` (tuning tanpa redeploy). Match bila `max(cosine vs semua
   embedding tersimpan) ≥ threshold`.
2. **Liveness** = **RINGAN** di F3a (confidence deteksi + minimal 1 tanda
   hidup: gerak kepala/kedip via `human`). Anti-spoof penuh DITUNDA.
3. **Retensi embedding** (biometrik): saat guru **dihapus** → embedding ikut
   terhapus (baris guru hilang). Saat guru **nonaktif** → CLEAR
   `faceEmbeddings` + `faceUpdatedAt` (jangan simpan biometrik guru non-aktif).
   `fotoUrl` (foto profil biasa) tetap. Sediakan `DELETE /api/admin/wajah/:id`
   utk hapus manual.
4. **Pose enrollment** = **3–5** (depan/kiri/kanan; auto-capture). Simpan
   SEMUA embedding (array of vektor) di `guru.faceEmbeddings` (jsonb) —
   matching = max similarity lintas pose (lebih robust dari 1 vektor rata2).
5. **Kiosk offline queue** = pertanyaan F3b (ditunda).
6. **Presensi HP tanpa geofence**: bila `pengaturan.lokasi.aktif=false` →
   LEWATI cek lokasi (boleh dari mana saja). Bila `aktif=true` → WAJIB
   dalam radius (haversine), di luar → tolak + arahkan ke kiosk.
7. **Toleransi check-in/out**: PAKAI `pengaturan.jam_presensi` yang SUDAH ada
   (`jamMasuk`, `jamPulang`, `toleransiMenit`). HADIR bila check-in ≤ jamMasuk
   + toleransi; TERLAMBAT bila sesudahnya. TIDAK ada config baru.

## Entitas F3a (backend)
```
ALTER guru: + faceEmbeddings jsonb NULL   -- array of number[] (per pose)
            + faceUpdatedAt timestamptz NULL

presensi_harian_guru  id PK
  • guruId FK guru (CASCADE saat guru dihapus)
  • tanggal date                      -- WIB
  • checkInAt timestamptz NULL
  • checkOutAt timestamptz NULL
  • status varchar  ('HADIR'|'TERLAMBAT'|'ALPHA')   -- ALPHA hanya via manual/derivasi
  • source varchar  ('HP'|'MANUAL')   -- 'KIOSK' menyusul di F3b
  • distanceMeter float NULL          -- jarak dari titik sekolah (audit)
  • similarity float NULL             -- skor cosine saat scan (audit)
  • alasan text NULL                  -- untuk record manual admin
  • createdAt/updatedAt
  — UNIQUE(guruId, tanggal)
```
Embedding disimpan jsonb + cosine dihitung di Node (guru sekolah ±100 =
linear scan sepele; 1:1 self-scan cuma 1 perbandingan). pgvector TIDAK perlu
di F3a (catat sebagai optimasi masa depan bila skala besar).

## Kontrak API F3a (DIKUNCI — backend implementasi & frontend konsumsi WAJIB sama)
RBAC ditegakkan server; audit tiap mutasi; WIB (wib.util.ts); error Bahasa
Indonesia bermakna. DTO memuat SEMUA field yang UI kirim (anti-DTO-drift).

**Enrollment wajah:**
- `GET /api/guru/wajah/status` (guru) → `{ enrolled: bool, poses: number,
  faceUpdatedAt: string|null }` (status wajah diri sendiri).
- `PUT /api/guru/wajah` (guru) body `{ embeddings: number[][] }` (3–5 pose)
  → simpan ke guru login; 200 `{ ok, poses }`; audit "Mendaftarkan wajah".
- `GET /api/admin/wajah?q=&page=&limit=` (admin) → daftar guru + status
  enroll (berpaginasi, filter server-side; sudah/belum enroll).
- `PUT /api/admin/wajah/:guruId` (admin) body `{ embeddings: number[][] }`
  → enroll utk guru tertentu; audit.
- `DELETE /api/admin/wajah/:guruId` (admin) → clear faceEmbeddings (privasi);
  audit "Menghapus data wajah {guru}".

**Scan presensi mandiri (1:1):**
- `POST /api/guru/presensi-scan` (guru) body
  `{ embedding: number[], lat?: number, lng?: number, mode?: 'masuk'|'pulang' }`
  → alur server:
  1. Ambil guru login. Bila belum enroll → 400 "Wajah Anda belum didaftarkan".
  2. Bila `lokasi.aktif` → wajib lat/lng; hitung haversine ke titik sekolah;
     di luar radius → 403 "Anda berada di luar area sekolah" (+ distanceMeter).
     Bila `lokasi.aktif=false` → lewati.
  3. cosine(embedding, faceEmbeddings) max; < threshold → 401
     "Wajah tidak dikenali" (jalur gagal; frontend hitung 3× → arahan manual).
  4. Tentukan HADIR/TERLAMBAT dari jam_presensi (WIB).
  5. Upsert `presensi_harian_guru` UNIQUE(guruId, hari): scan pertama =
     check-in; scan kedua (mode pulang / jendela pulang) = check-out; scan
     ganda check-in → 200 idempotent "Sudah tercatat {HH:MM}".
  6. Audit. Respons `{ status, checkInAt|checkOutAt, similarity, distanceMeter,
     pesan }`.

**Monitor admin:**
- `GET /api/admin/presensi-guru/harian?tanggal=` (admin|kepsek) → semua guru
  + status hari itu (LEFT JOIN; tak ada record = "belum"/ALPHA sesudah jam
  pulang), BATCH query (anti N+1).
- `POST /api/admin/presensi-guru/manual` (admin) body `{ guruId, tanggal,
  status, checkInAt?, checkOutAt?, alasan }` (alasan WAJIB) → upsert record
  manual `source='MANUAL'`; audit.

**Pengaturan:**
- Tambah key `wajah` di pengaturan (pola key-value yang sudah ada):
  `{ threshold: number (default 0.6), minPoses: number (default 3) }`.
  Baca via service; default di kode bila belum diset.

## Pola WAJIB (dari riset §6)
- `@vladmandic/human` BERAT → **dynamic-import per halaman**, DILARANG di
  bundle utama (§12.15). Model di-lazy-load, bukan di main bundle.
- Scanner = **halaman/overlay khusus** saat kamera terbuka; **auto-capture**
  (jepret otomatis saat wajah terdeteksi & stabil), BUKAN klik manual.
- Enrollment ("Daftar Wajah") BEDA dari presensi ("Presensi Sekarang") —
  dua alur terpisah, jangan digabung.
- Audit tiap mutasi (ActivityLogService.record). RBAC server (guru scan diri;
  admin monitor/manual/enroll). WIB.
- E2E wajah sulit → **strategi mock**: e2e kirim embedding dummy langsung ke
  `POST /api/guru/presensi-scan` (lewati kamera); untuk match, seed guru dgn
  `faceEmbeddings` yang cosine-nya ≥ threshold thd embedding uji. Uji jalur:
  sukses HADIR/TERLAMBAT, tolak luar-radius, tolak wajah-asing, idempotent.

## PEMBAGIAN WILAYAH F3a (AG-2 MEMIMPIN)
- **Antigravity-v2.0 (AG-2, executor B) → F3a BACKEND (fondasi, MULAI DULU)**:
  seluruh backend F3a — modul baru `backend/src/presensi-guru/**` (entitas
  presensi_harian_guru + migrasi kolom guru faceEmbeddings/faceUpdatedAt via
  entity, DTO, service dgn cosine+haversine+derivasi status, controller
  enrollment/scan/monitor/manual), daftarkan di app.module.ts, tambah key
  pengaturan `wajah`. + boot-verify (tabel terbentuk, endpoint ter-guard) +
  e2e mock embedding. WILAYAH: backend + `frontend/e2e/`. Titik bersama
  backend (app.module.ts) = AG-2 pegang untuk F3.
- **Antigravity-IDE (AG-1, executor A) → F3a FRONTEND (SETELAH backend live +
  setelah tugas E2E-ISOLASI-HARDENING selesai)**: enrollment wizard (kamera,
  human dynamic-import, 3-pose auto-capture), tombol "Presensi Sekarang" di
  `/guru` (overlay kamera fullscreen + pre-check geofence), monitor admin +
  form manual, wiring client.ts/App.tsx/menu.ts. Menunggu kontrak live.

## Aturan wajib (semua): §12.15 lazy (human WAJIB dynamic-import) • §12.16
filter+paginasi level DB + anti N+1 + anti DTO-drift • §12.17 e2e (mock
embedding) = gerbang • RBAC server + audit + WIB • klaim tugas sebelum mulai
• APPEND laporan • jangan kerjakan KIOSK (itu F3b).
