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

## ⚠️ ROUTING BARU (2026-07-17) — armada 3 executor kode

- **Antigravity-1 (kamu, executor A):** tugas aktif = **F2 BACKEND**. Baca
  `briefs/F2-SPEC.md` bagian "Antigravity-1 → BACKEND F2". Mulai segera.
  SEC-1 & FIX-MENU-ADMIN di bawah = SUDAH SELESAI (arsip).
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

### [AGENT-1] FIX-ASSIGN-SISWA-KELAS — DIKERJAKAN (2026-07-17 13:47)




