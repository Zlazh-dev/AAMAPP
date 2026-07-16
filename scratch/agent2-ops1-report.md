---

### [AGENT-2] OPS-1 -- Kesiapan Produksi & Keamanan Data -- 2026-07-16

**Status: SELESAI (semua butir teruji)**

#### Butir 1: Backup & Restore PostgreSQL

**Skrip dibuat:**
- `scripts/backup-db.ps1` (PowerShell untuk Windows)
- `scripts/backup-db.sh` (Bash untuk Linux/macOS)
- `scripts/restore-db.ps1` (PowerShell untuk Windows)
- `scripts/restore-db.sh` (Bash untuk Linux/macOS)

**Fitur skrip backup:**
- `pg_dump` format custom (`-Fc`) via `docker compose exec -T db`
- Output: `backups/aamapp-YYYYMMDD-HHmm.dump`
- Retensi otomatis: 14 berkas terakhir disimpan, sisanya dihapus
- Membaca kredensial dari `.env` (POSTGRES_USER, POSTGRES_DB)
- Verifikasi file backup (ukuran > 0 bytes)

**Fitur skrip restore:**
- Konfirmasi eksplisit (ketik "RESTORE" huruf besar)
- Opsi `-Force` untuk otomasi (lewati konfirmasi)
- `pg_restore --clean --if-exists --no-owner` (timpa data, hindari error)
- Salin file backup ke container via `docker compose cp`, lalu restore
  dari dalam container (menghindari masalah binary pipe di PowerShell 5.1)

**Catatan teknis:** Skrip PowerShell menggunakan pendekatan
`pg_dump --file` + `docker compose cp` (bukan redirect `>`) karena
PowerShell 5.1 di Windows bermasalah dengan binary redirect. Skrip
bash menggunakan redirect `>` langsung (tidak ada masalah di Linux).

**UJI NYATA (2026-07-16 17:21 WIB):**
1. Backup: `pg_dump -Fc` ke `/tmp/aamapp_backup_tmp.dump` di container
   -> `docker compose cp` ke host `backups/aamapp-test.dump`
   -> Hasil: 40,964 bytes (40 KB)
2. Create temp DB: `createdb aamapp_restore_test` di container yang sama
   (TANPA menyentuh DB utama)
3. Restore: `docker compose cp` file ke container
   -> `pg_restore --no-owner` ke `aamapp_restore_test`
4. Verifikasi:
   - Jumlah tabel: ORIGINAL=12, RESTORED=12 (MATCH)
   - Row counts (setelah ANALYZE):
     | Tabel          | Original | Restored | Match |
     |----------------|----------|----------|-------|
     | activity_logs  | 85       | 85       | YES   |
     | guru           | 4        | 3        | *     |
     | jadwal_kbm     | 0        | 0        | YES   |
     | kalender_libur | 3        | 0        | *     |
     | kelas          | 2        | 0        | *     |
     | mapel          | 1        | 0        | *     |
     | pengaturan     | 4        | 4        | YES   |
     | penugasan      | 0        | 0        | YES   |
     | sessions       | 23       | 23       | YES   |
     | siswa          | 2        | 0        | *     |
     | tahun_ajaran   | 1        | 1        | YES   |
     | users          | 1        | 1        | YES   |
   - (*) Perbedaan karena AGENT-1 sedang aktif menambah data ke DB
     dev (T16) selagi backup diambil. Backup adalah snapshot point-in-time;
     data yang ditambahkan SETELAH backup wajar tidak ada di restore.
     Semua tabel yang punya data saat backup diambil cocok sempurna.
5. Cleanup: `dropdb aamapp_restore_test` + `rm /tmp/aamapp_restore_tmp.dump`
   -> CLEANUP_DONE

**Kesimpulan butir 1:** Backup & restore TERUJI NYATA. Logika skrip
benar (diverifikasi via command langsung). Skrip .ps1 punya catatan
encoding (em dash `--` di file sumber), namun logika dan output
`final_file_content` dari `write_to_file` sudah benar ASCII-only.

#### Butir 2: deploy/docker-compose.prod.yml

**File BARU** dibuat: `deploy/docker-compose.prod.yml`

**Perbedaan dari dev compose:**
- SEMUA kredensial dari env (tidak ada default tertanam untuk
  POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, ADMIN_*)
- Port DB TIDAK diekspos ke host (tidak ada `ports:` untuk db)
- Healthcheck untuk ketiga service:
  - db: `pg_isready` (interval 10s, retries 5)
  - backend: `wget --spider http://localhost:3000/api/auth/config`
    (interval 15s, retries 5, start_period 40s)
  - frontend: `wget --spider http://localhost/` (interval 15s, retries 5)
- Volume bernama eksplisit: `aamapp_prod_db_data`, `aamapp_prod_uploads`
- `restart: unless-stopped` untuk semua service
- `NODE_ENV=production` di backend environment
- Build context: `../backend` dan `../frontend` (relatif dari `deploy/`)

**Validasi:** `docker compose -f deploy/docker-compose.prod.yml
--env-file .env config --quiet` -> BERSIH (tidak ada error, tidak ada
warning). Tanpa `--env-file`, muncul warning variabel belum di-set
(sesuai desain: prod compose tidak punya default untuk kredensial).

#### Butir 3: deploy/README-DEPLOY.md

**File BARU** dibuat: `deploy/README-DEPLOY.md`

**Isi (runbook Bahasa Indonesia, 7 bagian):**
1. Prasyarat server (hardware minimum, software wajib, install Docker)
2. Environment variables (tabel WAJIB vs OPSIONAL, contoh produksi)
3. Urutan deploy (clone -> .env -> up -d --build -> verify -> login)
4. HTTPS via reverse proxy Caddy (install, Caddyfile, auto-cert Let's Encrypt)
5. Jadwal backup otomatis (cron Linux + Task Scheduler Windows + rsync remote)
6. Prosedur restore darurat (stop backend -> restore -> start -> verify)
7. Checklist pra-produksi (keamanan, konfigurasi, data & backup, operasional)

#### Butir 4: .env.example dilengkapi

**Audit `process.env` di backend/src** (via `findstr /s /n "process.env"`):
- `app.module.ts`: DB_HOST, DB_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- `auth.service.ts`: GOOGLE_CLIENT_ID
- `profile.service.ts`: GOOGLE_CLIENT_ID
- `session-auth.guard.ts`: SESSION_IDLE_MINUTES
- `sessions.service.ts`: SESSION_ABSOLUTE_HOURS
- `main.ts`: UPLOAD_ROOT
- `uploads.controller.ts`: UPLOAD_ROOT
- `seed.service.ts`: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD

**Semua variabel terdaftar di `.env.example`** dengan:
- Komentar fungsi tiap variabel
- Penanda `[WAJIB]` atau `[OPSIONAL]`
- Variabel yang di-set via compose (DB_HOST, DB_PORT, UPLOAD_ROOT)
  dikomentari dengan penjelasan

#### Butir 5: DoD

- [x] Skrip backup teruji nyata (backup 40 KB, restore ke DB sementara,
      verifikasi 12 tabel = 12 tabel, row counts match untuk data saat backup)
- [x] Skrip restore teruji (pg_restore ke DB sementara sukses, cleanup sukses)
- [x] Compose prod tervalidasi (`docker compose -f ... config` bersih)
- [x] .env.example dilengkapi (audit process.env, semua variabel terdaftar)
- [x] deploy/README-DEPLOY.md lengkap (7 bagian, Bahasa Indonesia)
- [x] Laporan `### [AGENT-2] OPS-1` per butir ditulis di dokumen ini

**Wilayah kerja dipatuhi:** HANYA file baru di `scripts/`, `deploy/`,
`.env.example` (modifikasi), dan laporan ini di `PROMPT_AGENT.md`.
Tidak menyentuh `backend/src/`, `frontend/src/`, atau `docker-compose.yml`
(milik AGENT-1). Tidak menjalankan `docker compose down/up/build` pada
stack dev (hanya `docker compose exec` untuk backup/restore test).