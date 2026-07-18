# API REFERENCE AAMAPP 
 
> Sumber: semua file *.controller.ts di backend/src/ 
> Guard: SessionAuthGuard (cek token + idle + absolute) + RolesGuard (cek @Roles) 
> Tidak ada global APP_GUARD - setiap controller pasang @UseGuards secara manual 
 
## Auth (auth.controller.ts) 
 
Method - Path - Roles - Deskripsi 
POST - /api/auth/login - publik - Login email+password 
POST - /api/auth/google - publik - Login Google ID-token 
POST - /api/auth/register-google - publik - Daftar Google 
GET - /api/auth/config - publik - {googleClientId} 
GET - /api/auth/me - auth - Profil sendiri 
POST - /api/auth/logout - auth - Revoke sesi 
 
## Profile (profile.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/profile - auth - Profil + createdAt 
PATCH - /api/profile - auth - Update nama 
POST - /api/profile/password - auth - Ganti/set password 
POST - /api/profile/link-google - auth - Tautkan Google 
DELETE - /api/profile/link-google - auth - Lepas tautan Google 
GET - /api/profile/sessions - auth - Sesi sendiri 
DELETE - /api/profile/sessions/:id - auth - Cabut sesi 
 
## Users (users.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/admin/users - admin - Daftar semua akun 
POST - /api/admin/users - admin - Buat akun 
PATCH - /api/admin/users/:id - admin - Edit akun 
PATCH - /api/admin/users/:id/approve - admin - Approve pendaftar 
DELETE - /api/admin/users/:id - admin - Hapus akun 
 
## Sessions (admin-sessions.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/admin/sessions - admin - Sesi aktif semua user 
DELETE - /api/admin/sessions/:id - admin - Cabut sesi 
 
## Audit (audit.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/admin/activities - admin - Activity log + filter + paginasi 
 
## Guru (guru.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/admin/guru - admin - Daftar guru 
POST - /api/admin/guru - admin - Buat guru 
GET - /api/admin/guru/:id - admin - Detail guru 
PATCH - /api/admin/guru/:id - admin - Edit guru 
DELETE - /api/admin/guru/:id - admin - Hapus guru 
 
## Siswa (siswa.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/admin/siswa - admin - Daftar siswa + q=nama,nis,nisn 
POST - /api/admin/siswa - admin - Buat siswa 
GET - /api/admin/siswa/:id - admin - Detail siswa 
PATCH - /api/admin/siswa/:id - admin - Edit siswa 
DELETE - /api/admin/siswa/:id - admin - Hapus siswa 
 
## Kelas (kelas.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/admin/kelas - admin - Daftar kelas 
POST - /api/admin/kelas - admin - Buat kelas 
GET - /api/admin/kelas/:id - admin - Detail kelas 
PATCH - /api/admin/kelas/:id - admin - Edit kelas 
DELETE - /api/admin/kelas/:id - admin - Hapus kelas 
 
## Kurikulum (kurikulum.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/kurikulum/mapel - admin,kurikulum - Daftar mapel 
POST - /api/kurikulum/mapel - admin,kurikulum - Buat mapel 
GET - /api/kurikulum/mapel/:id - admin,kurikulum - Detail mapel 
PATCH - /api/kurikulum/mapel/:id - admin,kurikulum - Edit mapel 
DELETE - /api/kurikulum/mapel/:id - admin,kurikulum - Hapus mapel 
GET - /api/kurikulum/penugasan - admin,kurikulum - Daftar penugasan 
POST - /api/kurikulum/penugasan - admin,kurikulum - Buat penugasan 
PATCH - /api/kurikulum/penugasan/:id - admin,kurikulum - Edit penugasan 
DELETE - /api/kurikulum/penugasan/:id - admin,kurikulum - Hapus penugasan 
GET - /api/kurikulum/jadwal - admin,kurikulum - Daftar jadwal KBM 
POST - /api/kurikulum/jadwal - admin,kurikulum - Buat jadwal KBM 
PATCH - /api/kurikulum/jadwal/:id - admin,kurikulum - Edit jadwal KBM 
DELETE - /api/kurikulum/jadwal/:id - admin,kurikulum - Hapus jadwal KBM 
GET - /api/kurikulum/kkm - admin,kurikulum - Get KKM 
PATCH - /api/kurikulum/kkm - admin,kurikulum - Update KKM 
 
## Libur (libur.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/kurikulum/libur - admin,kurikulum - Daftar libur 
POST - /api/kurikulum/libur - admin,kurikulum - Tambah libur 
POST - /api/kurikulum/libur/bulk - admin,kurikulum - Bulk tambah libur 
DELETE - /api/kurikulum/libur/:id - admin,kurikulum - Hapus libur 
 
## Pengaturan (pengaturan.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/pengaturan - auth - Get semua pengaturan 
GET - /api/pengaturan/:key - auth - Get pengaturan by key 
PATCH - /api/pengaturan/:key - admin,kurikulum - Update pengaturan 
 
## Tahun Ajaran (tahun-ajaran.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /api/tahun-ajaran - auth - Daftar tahun ajaran 
POST - /api/tahun-ajaran - admin - Buat tahun ajaran 
PATCH - /api/tahun-ajaran/:id - admin - Edit tahun ajaran 
DELETE - /api/tahun-ajaran/:id - admin - Hapus tahun ajaran 
PATCH - /api/tahun-ajaran/:id/aktifkan - admin - Aktifkan tahun ajaran 
 
## Uploads (uploads.controller.ts) 
 
Method - Path - Roles - Deskripsi 
GET - /uploads/:filename - publik - Static file serving 
 
## Import (import.controller.ts) 
 
Method - Path - Roles - Deskripsi 
POST - /api/admin/import/guru - admin - Import Excel guru 
POST - /api/admin/import/siswa - admin - Import Excel siswa 
 
## Presensi (F2) (presensi.controller.ts)

> Sumber: `backend/src/presensi/presensi.controller.ts` (3 class controller,
> semua pakai `@UseGuards(SessionAuthGuard, RolesGuard)`), service:
> `backend/src/presensi/presensi.service.ts`, DTO:
> `backend/src/presensi/dto/simpan-roster.dto.ts`.

Method - Path - Roles - Deskripsi
GET - /api/guru/kbm - guru,admin - Sesi KBM guru login hari ini (?tanggal=)
GET - /api/guru/kbm/:jadwalId/roster - guru,admin - Baca roster siswa 1 sesi (?tanggal=)
POST - /api/guru/kbm/:jadwalId/roster - guru,admin - Simpan roster (create)
PATCH - /api/guru/kbm/:jadwalId/roster - guru,admin - Koreksi roster (upsert, sama service dgn POST)
GET - /api/guru/kelas/rekap-presensi - guru,admin - Rekap H/S/I/A/T per siswa dlm rentang tanggal (RBAC tambahan: wali kelas)
GET - /api/admin/presensi-siswa - admin,kepsek,kesiswaan - Matriks sesi × ringkasan per kelas+tanggal (baca saja)

### 1. `GET /api/guru/kbm?tanggal=` — sesi KBM guru hari ini

[presensi.controller.ts:27-31](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.controller.ts#L27-L31),
service [presensi.service.ts:92-138](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L92-L138).

- Query: `tanggal` opsional (YYYY-MM-DD), default hari ini WIB
  ([:94](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L94)).
- Guru diambil dari akun login via tabel `guru.userId`
  ([:75-81](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L75-L81)); jika akun tak
  tertaut ke data guru → **403** `'Akun Anda tidak tertaut ke data guru'`.
- Hari Minggu (hari WIB=7) → respons langsung `{ tanggal, libur:false,
  hariMinggu:true, sesi:[] }` tanpa query jadwal
  ([:100-102](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L100-L102)).
- Response nyata ([:124-137](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L124-L137)):
  ```jsonc
  {
    "tanggal": "2026-07-18",
    "libur": false,
    "keteranganLibur": null,
    "sesi": [
      {
        "jadwalKbmId": 12,
        "mapel": "Matematika",
        "kelas": "7A",
        "jamMulai": "07:00",
        "jamSelesai": "08:30",
        "sesiKe": 1,
        "status": "BELUM" // atau "TERLAKSANA" (ada baris presensi_sesi tanggal itu)
      }
    ]
  }
  ```
- `status` per sesi DITURUNKAN saat request ini (bukan kolom): `TERLAKSANA`
  bila ada baris `presensi_sesi` utk `(jadwalKbmId, tanggal)`, selain itu
  `BELUM` ([:135](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L135)).
- Bergantung pada Tahun Ajaran aktif — bila tak ada → **400**
  `'Belum ada tahun ajaran aktif — buat & aktifkan di Pengaturan'`
  ([:66-73](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L66-L73)).

### 2. `GET /api/guru/kbm/:jadwalId/roster?tanggal=` — baca roster

[presensi.controller.ts:33-41](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.controller.ts#L33-L41),
service [presensi.service.ts:140-183](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L140-L183).

- `jadwalId` tak ditemukan → **404** `'Jadwal tidak ditemukan'`
  ([:147](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L147)).
- **RBAC bukan-pemilik**: bila requester bukan admin DAN
  `jadwal.penugasan.guruId !== guru.id` → **403** `'Bukan sesi KBM Anda'`
  ([:149-152](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L149-L152)).
- Siswa diambil dari `kelasId` penugasan, filter `status:'aktif'`, urut nama
  ([:154-157](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L154-L157)). Siswa
  tanpa entri di `presensi_siswa` mendapat status default `'H'`
  ([:180](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L180)) — ini nilai
  tampilan default form, BUKAN berarti sudah tersimpan (`tersimpan:false`
  bila sesi belum pernah disimpan).
- Response nyata ([:170-182](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L170-L182)):
  ```jsonc
  {
    "jadwalKbmId": 12,
    "tanggal": "2026-07-18",
    "kelas": "7A",
    "mapel": "Matematika",
    "tersimpan": false,
    "siswa": [
      { "siswaId": 1, "nama": "Ahmad", "nis": "1001", "status": "H" }
    ]
  }
  ```

### 3/4. `POST`/`PATCH /api/guru/kbm/:jadwalId/roster` — simpan/koreksi roster

[presensi.controller.ts:43-61](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.controller.ts#L43-L61)
— POST & PATCH memanggil service YANG SAMA
(`simpanRoster`, [presensi.service.ts:186-282](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L186-L282)),
jadi keduanya berlaku sbg upsert (tak ada beda semantik create/update).

- Body (`SimpanRosterDto`,
  [simpan-roster.dto.ts](file:///d:/Codeproject/AAMAPP/backend/src/presensi/dto/simpan-roster.dto.ts)):
  ```jsonc
  {
    "tanggal": "2026-07-18", // @IsDateString, format YYYY-MM-DD
    "entri": [
      { "siswaId": 1, "status": "H" } // status @IsIn ['H','S','I','A','T']
    ],
    "alasan": "opsional — wajib utk koreksi admin tanggal lampau"
  }
  ```
- **RBAC bukan-pemilik**: sama seperti roster GET, non-admin bukan pemilik
  penugasan → **403** `'Bukan sesi KBM Anda'`
  ([:195-197](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L195-L197)).
- **403 cutoff (guru, bukan admin)**: guru hanya boleh simpan/koreksi utk
  HARI INI dan sebelum jam cutoff (`pengaturan.jam_presensi.cutoff`,
  default `'15:00'`,
  [:83-89](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L83-L89)). Bila
  `dto.tanggal` bukan hari ini ATAU jam sekarang > cutoff → **403**
  `'Melewati batas waktu presensi — hubungi admin'`
  ([:199-212](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L199-L212)).
- **400 alasan wajib (admin)**: admin BOLEH koreksi tanggal manapun, tapi
  bila `dto.tanggal !== hariIni` DAN `dto.alasan` kosong → **400**
  `'Koreksi presensi tanggal lampau wajib menyertakan alasan'`
  ([:213-216](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L213-L216)).
- Upsert `presensi_sesi` (unique `jadwalKbmId+tanggal`) lalu upsert tiap
  `presensi_siswa` (unique `presensiSesiId+siswaId`)
  ([:227-265](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L227-L265)). Bila
  pelaksana ≠ guru pemilik penugasan → `guruPenggantiId` terisi (sesi
  DIGANTIKAN) ([:219-225](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L219-L225)).
- Ditulis ke audit log (`action:'SIMPAN_PRESENSI'`)
  ([:267-279](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L267-L279)).
- Response: `{ ok:true, presensiSesiId, ringkasan:{H,S,I,A,T} }`
  ([:281](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L281)).
- > [!NOTE]
  > TODO tercatat di kode (belum dibangun F2, jangan didokumentasikan sbg
  > perilaku aktif): status `'T'` → draft pelanggaran R-07 di F5
  > ([:263](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L263)); kunci entri
  > bila siswa punya izin F4 ([:264](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L264)).

### 5. `GET /api/guru/kelas/rekap-presensi?kelasId=&dari=&sampai=&page=&limit=`

[presensi.controller.ts:70-95](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.controller.ts#L70-L95),
service [presensi.service.ts:291-368](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L291-L368).

- **RBAC**: `@Roles('guru','admin')` di level controller, TAPI ada
  pengecekan tambahan di handler ([:80-87](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.controller.ts#L80-L87)):
  non-admin harus wali kelas dari `kelasId` tsb
  (`isWaliKelasByUserId`, [presensi.service.ts:377-385](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L377-L385)),
  selain itu → **403** `'Anda bukan wali kelas ini'`.
- `page`/`limit` opsional, default 1/50, `limit` di-clamp maks 200
  ([:298-299](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L298-L299)).
- Rekap dihitung HANYA dari sesi TERLAKSANA (ada baris `presensi_sesi`)
  dalam rentang `dari..sampai` inklusif
  ([:329](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L329)); satu query batch
  `GROUP BY siswaId, status` anti-N+1
  ([:323-339](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L323-L339)).
- Siswa yang TIDAK PERNAH tercatat di rentang tsb → `rekap: null` (BUKAN
  semua-nol) — LEFT JOIN semantics, `null` = tidak tercatat, bukan alpha
  ([:359-361](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L359-L361)).
- Response: `{ kelasId, dari, sampai, data:[{siswaId,nama,nis,rekap}],
  total, page, limit }` ([:349-367](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L349-L367)),
  `rekap` = `{H,S,I,A,T}` atau `null`.

### 6. `GET /api/admin/presensi-siswa?kelasId=&tanggal=` — matriks admin

[presensi.controller.ts:104-111](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.controller.ts#L104-L111),
service [presensi.service.ts:387-450](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L387-L450).

- `@Roles('admin','kepsek','kesiswaan')` — baca saja, tidak ada endpoint
  tulis di controller ini
  ([presensi.controller.ts:98-112](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.controller.ts#L98-L112)).
- `kelasId` wajib (`ParseIntPipe`, tanpa nilai → 400 bawaan Nest);
  `tanggal` opsional, default hari ini WIB.
- Response: matriks semua sesi jadwal kelas tsb pada hari itu, tiap sesi
  bawa `status` (`TERLAKSANA`/`BELUM`, diturunkan sama seperti #1) dan
  `ringkasan` (`{H,S,I,A,T}` atau `null` bila belum tersimpan)
  ([:434-449](file:///d:/Codeproject/AAMAPP/backend/src/presensi/presensi.service.ts#L434-L449)):
  ```jsonc
  {
    "tanggal": "2026-07-18",
    "kelasId": 3,
    "sesi": [
      {
        "jadwalKbmId": 12,
        "mapel": "Matematika",
        "guru": "Bu Sari",
        "jamMulai": "07:00",
        "jamSelesai": "08:30",
        "status": "TERLAKSANA",
        "ringkasan": { "H": 28, "S": 1, "I": 0, "A": 1, "T": 0 }
      }
    ]
  }
  ```

## Catatan Keamanan  
 
- Tidak ada global APP_GUARD - lihat audit TINGGI-2 
- Semua endpoint admin punya @Roles('admin') 
- Endpoint kurikulum punya @Roles('admin','kurikulum') 
- passwordHash tidak pernah di respons (select:false)
