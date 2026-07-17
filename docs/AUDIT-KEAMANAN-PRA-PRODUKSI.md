# AUDIT KEAMANAN PRA-PRODUKSI AAMAPP 
  
> Audit baca-saja oleh AGENT-2. Tidak ada kode yang diubah. 
> Tanggal: 2026-07-16 
> Sumber: Membaca kode aktual di backend/src dan frontend/src 
  
## Ringkasan Eksekutif 
  
| Peringkat | Jumlah | 
|----------|--------| 
| KRITIS | 0 | 
| TINGGI | 2 | 
| SEDANG | 4 | 
| RENDAH | 2 | 
  
## Temuan 
  
### TINGGI-1: CORS terlalu permisif 
  
**File:** backend/src/main.ts:59-60 
**Kode:** origin: true, credentials: true 
**Dampak:** Setiap website bisa membuat request terautentikasi ke API. 
**Usulan fix:** Ganti origin: true dengan whitelist domain produksi. 
  
### TINGGI-2: Tidak ada global APP_GUARD 
  
**File:** backend/src/app.module.ts | backend/src/main.ts 
**Dampak:** Setiap controller harus pasang @UseGuards secara manual. 
Jika ada controller yang LUPA memasang guard, endpoint bisa diakses tanpa auth. 
**Usulan fix:** Daftarkan SessionAuthGuard sebagai APP_GUARD global. 
  
### SEDANG-1: Rate limit in-memory (reset saat restart) 
  
**File:** backend/src/auth/auth.service.ts 
**Dampak:** Rate limit login 5 gagal/5 menit diimplementasi dengan Map in-memory. 
Reset saat backend restart. Tidak terdistribusi antar instance. 
**Usulan fix:** Gunakan @nestjs/throttler dengan storage Redis untuk produksi. 
  
### SEDANG-2: synchronize: true di app.module.ts 
  
**File:** backend/src/app.module.ts 
**Dampak:** TypeORM synchronize: true bisa mengubah skema DB otomatis. 
Berbahaya di produksi - bisa menghapus kolom/data. 
**Usulan fix:** Set synchronize: false untuk produksi (NODE_ENV=production). 
  
### SEDANG-3: Upload tanpa validasi MIME 
  
**File:** backend/src/uploads/uploads.controller.ts 
**Dampak:** Tidak ada pemeriksaan MIME type file upload. 
File berbahaya bisa diupload dengan ekstensi yang valid. 
**Usulan fix:** Validasi MIME type berdasarkan magic bytes, bukan ekstensi.  
  
### SEDANG-4: Body limit 6mb (spec 1mb) 
  
**File:** backend/src/main.ts:22-23 
**Dampak:** Body limit 6mb lebih besar dari spec 1mb. 
Mempermudah serangan DoS via request besar. 
**Usulan fix:** Turunkan ke 1mb atau sesuaikan kebutuhan upload.  
  
### RENDAH-1: RolesGuard returns true tanpa @Roles 
  
**File:** backend/src/common/roles.guard.ts 
**Dampak:** Jika @Roles tidak dipasang, RolesGuard mengizinkan semua user terautentikasi. 
Bukan bug tapi bisa menyebabkan akses tidak diinginkan jika developer lupa. 
**Usulan fix:** Ubah RolesGuard untuk menolak akses jika tidak ada @Roles (fail-closed). 
  
### RENDAH-2: Token disimpan di localStorage 
  
**File:** frontend/src/app/AuthContext.tsx 
**Dampak:** Token di localStorage rentan XSS. 
**Usulan fix:** Pertimbangkan httpOnly cookie untuk produksi. 
  
## Positif (yang sudah benar) 
  
- passwordHash: select: false di user.entity.ts - tidak pernah bocor di query 
- Token: crypto.randomBytes(48) + sha256 hash - tidak pernah disimpan mentah 
- bcrypt untuk password hashing 
- Helmet configured dengan CORS policy 
- ValidationPipe: whitelist, forbidNonWhitelisted, transform 
- Session idle/absolute timeout sesuai spec 8.3 
- Audit log untuk setiap mutasi 
  
## Area Audit (a-i)
 
(a) Rate limit login: TERIMPLEMENTASI (in-memory Map, 5 gagal/5 menit per IP)
(b) CORS origin: true: TERLALU PERMISIF - lihat TINGGI-1
(c) Helmet: TERKONFIGURASI dengan crossOriginResourcePolicy
(d) passwordHash/token: TIDAK PERNAH BOCOR - select: false, toSafeUser strips hash
(e) Upload: TIDAK ADA validasi MIME - lihat SEDANG-3
(f) Endpoint tanpa guard: TIDAK ADA GLOBAL GUARD - lihat TINGGI-2
(g) Idle/absolute session: SESUAI SPEC - SESSION_IDLE_MINUTES, SESSION_ABSOLUTE_HOURS
(h) Secrets di kode: TIDAK DITEMUKAN - semua dari env
(i) Dependensi: npm audit backend: 26 vulnerabilitas (3 low, 16 moderate, 7 high); npm audit frontend: 2 vulnerabilitas (1 moderate, 1 high).
