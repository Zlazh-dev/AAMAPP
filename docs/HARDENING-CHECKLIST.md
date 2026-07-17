# HARDENING-CHECKLIST AAMAPP

Dibuat untuk menangani SEC-1 backlog. Item berikut berdasarkan temuan audit
dan perbaikan yang direkomendasikan. Format: `[ ] Judul` — kondisi sekarang
→ perubahan pasti → env baru yang dibutuhkan → risiko bila tidak dikerjakan
→ dampak ke e2e (spec mana yang harus tetap hijau).

## Item Checklist

- [ ] CORS whitelist via env — `main.ts` sekitar `origin: true`.
  → Kondisi sekarang: `origin: true, credentials: true` mengizinkan semua origin.
  → Perubahan pasti: Ganti dengan whitelist domain produksi dari env
     (`ALLOWED_ORIGINS=https://app.aamapp.id,https://admin.aamapp.id`).
  → Env baru yang dibutuhkan: `ALLOWED_ORIGINS` (CSV tanpa spasi).
  → Risiko bila tidak dikerjakan: Setiap website bisa membuat request
     terautentikasi ke API (CSRF-like, data leakage).
  → Dampak ke e2e: Spec auth/login serta endpoint terlindungi harus tetap
     berhasil dengan origin yang diizinkan; origin yang tidak terdaftar harus
     ditolak (403).

- [ ] APP_GUARD global SessionAuthGuard + decorator `@Public()` — `app.module.ts`.
  → Kondisi sekarang: Tiap controller butuh `@UseGuards(SessionAuthGuard)`
     secara manual.
  → Perubahan pasti: Daftarkan `SessionAuthGuard` sebagai `APP_GUARD`
     global di `app.module.ts`; tambahkan decorator `@Public()` untuk
     endpoint yang sengaja tidak membutuhkan auth (mis. health check).
  → Env baru yang dibutuhkan: Tidak perlu.
  → Risiko bila tidak dikerjakan: Controller yang lupa memasang guard
     mengekspos endpoint tanpa autentikasi.
  → Dampak ke e2e: Semua endpoint yang seharusnya dilindungi tetap
     membutuhkan auth; endpoint dengan `@Public()` tetap accesible tanpa
     token.

- [ ] `synchronize: false` utk production (NODE_ENV) — `app.module.ts`.
  → Kondisi sekarang: `synchronize: true` aktif tanpa memeriksa NODE_ENV.
  → Perubahan pasti: Tambahkan kondisi `synchronize: process.env.NODE_ENV !==
     'production'` atau gunakan env khusus `DB_SYNCHRONIZE=false` untuk
     production.
  → Env baru yang dibutuhkan: `DB_SYNCHRONIZE` (boolean string) atau
     cukupandalkan `NODE_ENV=production`.
  → Risiko bila tidak dikerjakan: TypeORM bisa mengubah skema otomatis
     saat aplikasi start, termasuk DROP kolom atau tabel yang dianggap
     "tidak sesuai entitas" → kehilangan data.
  → Dampak ke e2e: Skema produksi harus tetap stabil; migrasi harus
     dilakukan secara eksplisit via seeder/migration script, bukan
     synchronize.

- [ ] Body limit JSON 6mb → 1mb — `main.ts` (json/urlencoded limit).
  → Kondisi sekarang: `json({ limit: '6mb' })` dan
     `urlencoded({ limit: '6mb', extended: true })`.
  → Perubahan pasti: Ubah ke `1mb` (sesuai spec). Catatan: upload file
    (foto/Excel) TIDAK lewat json limit ini — ditangani Multer multipart
    (5mb), jadi menurunkan json ke 1mb tidak memengaruhi upload.
  → Env baru yang dibutuhkan: Tidak perlu (bisa juga
     `BODY_LIMIT=1mb` jika ingin konfigurasi).
  → Risiko bila tidak dikerjakan: Body limit terlalu besar mempermudah
     DoS melalui payload besar yang membebaskan memori/server.
  → Dampak ke e2e: Endpoint yang menerima payload (mis. upload siswa,
     nilai) harus tetap bekerja dengan ukuran yang sesuai; payload di atas
     limit harus ditolak dengan 413.

- [ ] Upload magic-byte (tambahan; MIME header-whitelist SUDAH ada di
      `uploads.controller.ts`).
  → Kondisi sekarang: Ada pemeriksaan header MIME whitelist, tetapi
     belum ada validasi magic bytes (file dapat dipalsukan ekstensi).
  → Perubahan pasti: Tambahkan fungsi yang membaca beberapa bytes awal
     file dan memeriksa signature berbasis tipe (mis. PNG: 89 50 4E 47
     0D 0A 1A 0A).
  → Env baru yang dibutuhkan: Tidak perlu.
  → Risiko bila tidak dikerjakan: File berbahaya (HTML/JS) dapat diunggah
     dengan ekstensi gambar yang diizinkan (jpg, png) dan berpotensi
     dieksekusi jika disajikan sebagai konten statis.
  → Dampak ke e2e: Fitur unggah tetap menerima file gambar/dokumen yang
     sah; file berbahaya ditolak pada tahap upload (400).

- [ ] RolesGuard fail-closed bila tanpa @Roles & bukan @Public —
      `common/roles.guard.ts`.
  → Kondisi sekarang: Jika tidak ada decorator `@Roles` atau `@Public`,
     Guard mengembalikan `true` (izin akses).
  → Perubahan pasti: Ubah logika menjadi `false` (fail-closed) ketika
     tidak ada `@Roles` dan juga tidak ada `@Public`.
  → Env baru yang dibutuhkan: Tidak perlu.
  → Risiko bila tidak dikerjakan: Developer yang lupa menambahkan
     `@Roles` pada controller yang seharusnya terbatas menyebabkan
     akses tidak terkontrol.
  → Dampak ke e2e: Endpoint yang seharusnya hanya untuk role tertentu
     tetap terlindungi; endpoint yang sengaja publik dengan `@Public()`
     tetap dapat diakses.
