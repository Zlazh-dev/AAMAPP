# KAMUS DATA AAMAPP 
 
> Sumber: semua file *.entity.ts di backend/src/ 
 
## Relasi Antar Tabel 
 
- users 1:N sessions (onDelete CASCADE) 
- users 1:N activity_logs (onDelete SET NULL) 
- guru 1:N penugasan (onDelete CASCADE) 
- mapel 1:N penugasan (onDelete CASCADE) 
- kelas 1:N penugasan (onDelete CASCADE) 
- kelas 1:N jadwal_kbm (onDelete CASCADE) 
- penugasan 1:N jadwal_kbm (onDelete CASCADE) 
- kelas 1:N siswa (onDelete SET NULL) 
- guru 1:1 kelas (waliKelasId, onDelete SET NULL) 
- tahun_ajaran 1:N jadwal_kbm (onDelete CASCADE) 
 
## Tabel: users (user.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
name - varchar|255 - NO 
email - varchar|255 - NO - unique 
passwordHash - varchar|255 - YES - select:false 
googleSub - varchar|255 - YES - unique 
status - varchar - NO - active 
roles - jsonb - NO - [] 
requestedRoles - jsonb - NO - [] 
registrationNote - varchar|500 - YES 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: sessions (session.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
userId - int FK - NO - onDelete CASCADE 
tokenHash - char|64 - NO - sha256 hex 
ipAddress - varchar - NO 
userAgent - text - NO 
deviceSummary - varchar - NO 
loginMethod - varchar - NO 
createdAt - timestamptz - NO - auto 
lastActiveAt - timestamptz - NO - auto 
expiresAt - timestamptz - NO 
revokedAt - timestamptz - YES - null 
 
## Tabel: activity_logs (activity-log.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
userId - int FK - YES - onDelete SET NULL 
userName - varchar - NO 
userEmail - varchar - NO 
action - varchar - NO 
entity - varchar - NO 
entityId - varchar - YES 
entityLabel - varchar - YES 
summary - varchar - YES 
ipAddress - varchar - YES 
deviceSummary - varchar - YES 
createdAt - timestamptz - NO - auto 
 
## Tabel: guru (guru.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
nama - varchar - NO 
nip - varchar - YES 
email - varchar - YES 
telepon - varchar - YES 
fotoUrl - varchar - YES 
aktif - boolean - NO - true 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: siswa (siswa.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
nama - varchar - NO 
nis - varchar - YES 
nisn - varchar - YES 
kelasId - int FK - YES - onDelete SET NULL 
jenisKelamin - varchar - YES 
tempatLahir - varchar - YES 
tanggalLahir - date - YES 
alamat - varchar - YES 
fotoUrl - varchar - YES 
aktif - boolean - NO - true 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: kelas (kelas.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
nama - varchar - NO 
fase - varchar - YES 
waliKelasId - int FK guru - YES - onDelete SET NULL 
aktif - boolean - NO - true 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: tahun_ajaran (tahun-ajaran.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
nama - varchar - NO 
tanggalMulai - date - NO 
tanggalSelesai - date - NO 
aktif - boolean - NO - false 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: mapel (mapel.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
nama - varchar - NO 
kode - varchar - YES 
kelompok - varchar - YES 
urutanRapor - int - YES 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: penugasan (penugasan.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
guruId - int FK - NO - onDelete CASCADE 
mapelId - int FK - NO - onDelete CASCADE 
kelasId - int FK - NO - onDelete CASCADE 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: jadwal_kbm (jadwal-kbm.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
kelasId - int FK - NO - onDelete CASCADE 
penugasanId - int FK - NO - onDelete CASCADE 
tahunAjaranId - int FK - NO - onDelete CASCADE 
hari - varchar - NO 
jamMulai - varchar - NO 
jamSelesai - varchar - NO 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: kalender_libur (kalender-libur.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
tanggal - date - NO 
keterangan - varchar - YES 
createdAt - timestamptz - NO - auto 
 
## Tabel: pengaturan (pengaturan.entity.ts) 
 
Kolom - Tipe - Null - Default 
id - int - NO - PK auto 
key - varchar - NO - unique 
value - text - YES 
updatedAt - timestamptz - NO - auto 
 
## Deviasi Terdeteksi 
 
1. Tahun ajaran tidak punya kolom semester (spec menyebut semester aktif) 
2. Siswa tidak punya kolom agama (spec 9: mapel agama sesuai agama siswa)
