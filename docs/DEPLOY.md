# AAMAPP — Panduan Deploy Operasional

> Dokumen ini mencakup: cara deploy, variabel lingkungan wajib, bootstrap akun admin pertama, dan backup/restore database.

---

## 1. Prasyarat

| Kebutuhan | Versi minimum |
|-----------|--------------|
| Docker Engine | 24.x |
| Docker Compose | v2.x (`docker compose`, bukan `docker-compose`) |
| RAM | 1 GB |
| Disk | 5 GB |

---

## 2. Variabel Lingkungan (`.env`)

Salin template dan isi nilainya:

```bash
cp .env.example .env   # lalu sunting .env
```

### Wajib diisi sebelum deploy pertama

| Variabel | Keterangan | Contoh |
|---|---|---|
| `POSTGRES_DB` | Nama database | `aamapp` |
| `POSTGRES_USER` | Username PostgreSQL | `aamapp` |
| `POSTGRES_PASSWORD` | **Ganti dari default!** Password DB | `c4ngGih_s3kali!` |
| `ADMIN_NAME` | Nama tampil akun admin seed | `Administrator` |
| `ADMIN_EMAIL` | Email login admin pertama | `admin@sekolahku.sch.id` |
| `ADMIN_PASSWORD` | **Ganti dari default!** Password admin | `P@ssw0rd!MinPanjang12` |
| `ALLOWED_ORIGINS` | CSV origin produksi (CORS) | `https://app.sekolah.id` |
| `NODE_ENV` | `production` di server nyata | `production` |
| `WEB_PORT` | Port host yang dipetakan ke Nginx | `80` |
| `TZ` | Timezone server | `Asia/Jakarta` |

### Opsional

| Variabel | Default | Keterangan |
|---|---|---|
| `GOOGLE_CLIENT_ID` | (kosong) | OAuth Google Sign-In; kosongkan bila tidak dipakai |
| `SESSION_IDLE_MINUTES` | `60` | Sesi idle logout (menit) |
| `SESSION_ABSOLUTE_HOURS` | `24` | Sesi absolut logout (jam) |

> **Keamanan:** Jangan commit `.env` ke Git. File `.env.example` (tanpa nilai rahasia) yang di-commit.

---

## 3. Deploy Pertama Kali

```bash
# 1. Clone repo
git clone https://github.com/your-org/aamapp.git
cd aamapp

# 2. Buat .env dan isi (lihat tabel di atas)
cp .env.example .env

# 3. Build image
docker compose build

# 4. Jalankan semua service
docker compose up -d

# 5. Cek status
docker compose ps
docker compose logs backend --tail=30
```

Akun admin pertama **dibuat otomatis** oleh `SeedService` saat tabel `users` kosong,
menggunakan nilai `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dari `.env`.

> Setelah login pertama, segera ganti password via **Admin > Akun > Ganti Password**.

---

## 4. Bootstrap Akun Admin Pertama (manual)

Jika seed otomatis tidak berjalan (misalnya database tidak kosong):

```bash
# Masuk ke container backend
docker compose exec backend sh

# Jalankan perintah seed manual (NestJS CLI)
# (Seed dijalankan otomatis saat startup bila tabel users kosong)
```

Alternatif: **reset DB** agar seed otomatis jalan:

```bash
docker compose down -v   # HAPUS SEMUA DATA!
docker compose up -d
```

---

## 5. Update Aplikasi

```bash
git pull origin main
docker compose build
docker compose up -d
docker compose logs backend --tail=50
```

---

## 6. Backup Database

### Backup manual (dump SQL)

```bash
mkdir -p backups
docker compose exec -T db pg_dump \
  -U aamapp \
  -d aamapp \
  -Fc \
  > backups/backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore

```bash
docker compose exec -T db pg_restore \
  -U aamapp \
  -d aamapp \
  --clean \
  --if-exists \
  < backups/backup_20241201_120000.dump
```

### Backup file upload

```bash
# Backup volume uploads_data ke tar
docker run --rm \
  -v aamapp_uploads_data:/source:ro \
  -v "$(pwd)/backups":/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /source .

# Restore uploads
docker run --rm \
  -v aamapp_uploads_data:/target \
  -v "$(pwd)/backups":/backup \
  alpine sh -c "cd /target && tar xzf /backup/uploads_20241201.tar.gz"
```

---

## 7. Cek Kesehatan Sistem

```bash
docker compose ps
docker compose logs -f backend
```

---

## 8. Konfigurasi Produksi Tambahan

### Reverse Proxy + SSL (Caddy)

```caddyfile
app.sekolahku.sch.id {
    reverse_proxy localhost:80
}
```

### Backup Otomatis (cron)

```bash
# Setiap hari pukul 02:00
0 2 * * * cd /path/to/aamapp && docker compose exec -T db pg_dump -U aamapp -d aamapp -Fc > backups/db_$(date +\%Y\%m\%d).dump
```

---

## 9. Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
|---|---|---|
| Backend crash loop | DB belum siap | Cek `docker compose logs db` |
| Login gagal semua | Seed belum jalan | Cek log backend untuk pesan "Seed admin" |
| Upload foto gagal | Volume belum ada | `docker compose down && docker compose up -d` |
| CORS error di browser | `ALLOWED_ORIGINS` salah | Sesuaikan dengan domain produksi |
| `synchronize` warning | `NODE_ENV=development` di produksi | Set `NODE_ENV=production` |
