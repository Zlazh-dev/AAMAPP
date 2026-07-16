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
 
## Catatan Keamanan 
 
- Tidak ada global APP_GUARD - lihat audit TINGGI-2 
- Semua endpoint admin punya @Roles('admin') 
- Endpoint kurikulum punya @Roles('admin','kurikulum') 
- passwordHash tidak pernah di respons (select:false)
