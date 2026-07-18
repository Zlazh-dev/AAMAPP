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
- jadwal_kbm 1:N presensi_sesi (onDelete RESTRICT, UNIQUE jadwalKbmId+tanggal)
- guru 1:N presensi_sesi sbg guruPelaksana (onDelete RESTRICT) & guruPengganti (onDelete SET NULL, nullable)
- presensi_sesi 1:N presensi_siswa (onDelete CASCADE, UNIQUE presensiSesiId+siswaId)
- siswa 1:N presensi_siswa (onDelete CASCADE)
 
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
ipAddress = varchar - YES 
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
agama - varchar - YES 
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
semester - int - NO
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
kelasId = int FK - NO - onDelete CASCADE 
createdAt - timestamptz - NO - auto 
updatedAt - timestamptz - NO - auto 
 
## Tabel: jadwal_kbm (jadwal-kbm.entity.ts) 
 
Kolom - Tipe - Null - Default 
id = int - NO - PK auto 
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
 
## Tabel: presensi_sesi (presensi-sesi.entity.ts)

> Sumber: [presensi-sesi.entity.ts](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts)

Kolom - Tipe - Null - Default
id - int - NO - PK auto ([:28-29](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L28-L29))
jadwalKbmId - int FK jadwal_kbm - NO - onDelete RESTRICT ([:31-36](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L31-L36))
tanggal - date - NO - format YYYY-MM-DD WIB ([:38-40](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L38-L40))
guruPelaksanaId - int FK guru - NO - onDelete RESTRICT ([:42-48](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L42-L48))
guruPenggantiId - int FK guru - YES - onDelete SET NULL; terisi bila sesi DIGANTIKAN ([:50-56](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L50-L56))
disimpanPada - timestamptz - NO - kapan roster pertama disimpan ([:58-60](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L58-L60))
createdAt - timestamptz - NO - auto ([:62-63](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L62-L63))
updatedAt - timestamptz - NO - auto ([:65-66](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L65-L66))

**UNIQUE**: `(jadwalKbmId, tanggal)` ([:26](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L26)) —
satu baris per slot jadwal per tanggal pelaksanaan (jadwal_kbm = template
mingguan berulang, presensi_sesi = instans nyata satu tanggal).

> [!NOTE]
> Status sesi (`TERLAKSANA`/`KOSONG`/`DIGANTIKAN`) BUKAN kolom di tabel ini
> — DITURUNKAN saat baca ([presensi-sesi.entity.ts:19-23](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-sesi.entity.ts#L19-L23)):
> ada baris → TERLAKSANA; jam lewat & tak ada baris → KOSONG;
> `guruPenggantiId` terisi → DIGANTIKAN. Lihat implementasi turunan
> `status` aktual di service:
> [presensi.service.ts:135](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L135) dan
> [:445](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L445) — di kode berjalan
> hanya dua nilai yang benar2 diturunkan (`TERLAKSANA`/`BELUM`); label
> `KOSONG`/`DIGANTIKAN` ada di komentar desain entity tapi belum
> diproduksi controller manapun per F2 (dicek: tidak ada string tsb di
> presensi.service.ts).

## Tabel: presensi_siswa (presensi-siswa.entity.ts)

> Sumber: [presensi-siswa.entity.ts](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts)

Kolom - Tipe - Null - Default
id - int - NO - PK auto ([:26-27](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L26-L27))
presensiSesiId - int FK presensi_sesi - NO - onDelete CASCADE ([:29-34](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L29-L34))
siswaId - int FK siswa - NO - onDelete CASCADE ([:36-41](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L36-L41))
status - varchar(1) - NO - default 'H' ([:43-44](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L43-L44))
createdAt - timestamptz - NO - auto ([:46-47](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L46-L47))
updatedAt - timestamptz - NO - auto ([:49-50](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L49-L50))

**UNIQUE**: `(presensiSesiId, siswaId)` ([:24](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L24)) —
satu baris status per siswa per sesi.

**`status`** (`type StatusPresensi = 'H'|'S'|'I'|'A'|'T'`,
[:14](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L14)): varchar panjang 1, BUKAN
enum Postgres — validasi nilai dilakukan di layer DTO
(`@IsIn(['H','S','I','A','T'])`,
[simpan-roster.dto.ts:18-21](file:///d:/Codeproject/AAMAPP/backend/src/presensi/dto/simpan-roster.dto.ts#L18-L21)), bukan
constraint database. Arti kode: H=Hadir, S=Sakit, I=Izin, A=Alpha,
T=Tanpa keterangan/pelanggaran ([presensi-siswa.entity.ts:18](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L18)).

> [!NOTE]
> Tidak adanya baris `presensi_siswa` utk siswa tertentu pada sesi
> tertentu berarti "tidak tercatat" — BUKAN alpha. Rekap
> (`GET /api/guru/kelas/rekap-presensi`) memakai semantik LEFT
> JOIN/null utk kasus ini
> ([presensi-siswa.entity.ts:20-21](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi-siswa.entity.ts#L20-L21),
> [presensi.service.ts:359-361](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L359-L361)).

## Deviasi Terdeteksi  
 