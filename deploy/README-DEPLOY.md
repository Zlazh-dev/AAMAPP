| TZ | Asia/Jakarta | Timezone |) 
 
## 3. Urutan Deploy 
 
git clone https://github.com/Zlazh-dev/AAMAPP.git && cd AAMAPP 
cp .env.example .env && nano .env 
docker compose -f deploy/docker-compose.prod.yml up -d --build 
docker compose -f deploy/docker-compose.prod.yml ps 
curl http://localhost/api/auth/config 
 
## 4. HTTPS via Reverse Proxy (Caddy) 
 
Install Caddy di Ubuntu/Debian, lalu buat /etc/caddy/Caddyfile: 
 
aamapp.smpitassyadzili.sch.id { reverse_proxy localhost:80 } 
 
sudo systemctl restart caddy && sudo systemctl enable caddy 
Caddy otomatis mengurus sertifikat HTTPS (Let's Encrypt). 
 
## 5. Jadwal Backup Otomatis 
 
Backup manual: ./scripts/backup-db.sh 
Backup tersimpan di backups/aamapp-YYYYMMDD-HHmm.dump. Retensi: 14 berkas. 
 
Cron Linux: 0 2 * * * cd /path/to/AAMAPP && ./scripts/backup-db.sh >> backups/backup.log 2>&1 
 
Task Scheduler Windows: powershell.exe -ExecutionPolicy Bypass -File scripts\backup-db.ps1 
 
Backup ke remote: rsync -az /path/to/AAMAPP/backups/ user@backup-server:/backups/aamapp/ 
 
## 6. Prosedur Restore Darurat 
 
PERINGATAN: Restore akan MENIMPA semua data! 
 
1. docker compose -f deploy/docker-compose.prod.yml stop backend 
2. ./scripts/restore-db.sh ./backups/aamapp-20260716-0200.dump 
3. docker compose -f deploy/docker-compose.prod.yml start backend 
4. curl http://localhost/api/auth/config 
 
## 7. Checklist Pra-Produksi 
 
Keamanan: 
- [ ] Ganti password admin seed 
- [ ] Ganti POSTGRES_PASSWORD di .env 
- [ ] Ganti ADMIN_PASSWORD di .env 
- [ ] .env tidak di-commit ke Git 
- [ ] Firewall: hanya port 80 & 443 
- [ ] HTTPS aktif 
 
Konfigurasi: 
- [ ] GOOGLE_CLIENT_ID diisi bila perlu 
- [ ] WEB_PORT sesuai 
- [ ] TZ=Asia/Jakarta 
 
Data dan Backup: 
- [ ] Backup pertama dijalankan 
- [ ] Jadwal backup otomatis dikonfigurasi 
- [ ] Backup disalin ke eksternal 
- [ ] Test restore berhasil 
 
Operasional: 
- [ ] Semua service healthy 
- [ ] Login admin berhasil 
- [ ] Aplikasi bisa diakses 
- [ ] User test per peran dibuat 
 
## ⛔ Bootstrap Skema (WAJIB sebelum deploy pertama)
Karena di production `synchronize` OFF & belum ada migration, deploy ke DB kosong TIDAK membuat tabel.
Dokumentasikan prosedur first-run yang aman: deploy sekali dengan
`NODE_ENV=development` (agar synchronize membentuk skema + seed
admin+pengaturan jalan) → verifikasi tabel terbentuk → ganti ke
`NODE_ENV=production` untuk operasi normal. Tandai bahwa migration
tooling resmi menyusul di fase F8.