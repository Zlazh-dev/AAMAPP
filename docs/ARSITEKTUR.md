# ARSITEKTUR AAMAPP 
 
> Dokumentasi dari membaca kode aktual. Sumber: backend/src/app.module.ts, semua *.module.ts, frontend/src/app/App.tsx 
 
## Topologi Modul 
 
`mermaid 
graph TD 
    APP[app.module.ts] > AUTH[auth] 
    APP > USERS[users] 
    APP > SESSIONS[sessions] 
    APP > PROFILE[profile] 
    APP > AUDIT[audit] 
    APP > GURU[guru] 
    APP > SISWA[siswa] 
    APP > KELAS[kelas] 
    APP > KURIKULUM[kurikulum] 
    APP > PENGATURAN[pengaturan] 
    APP > TA[tahun-ajaran] 
    APP > UPLOADS[uploads] 
    APP > IMPORT[import] 
    APP > SEED[seed] 
    AUTH > SESSIONS 
    AUTH > AUDIT 
    USERS > AUDIT 
    PROFILE > AUDIT 
` 
 
## Modul Backend (NestJS) 
 
| Modul | File | Tanggung Jawab | 
|------|------|----------------| 
| app | app.module.ts | Root: TypeORM config, synchronize, import semua modul | 
| auth | auth/ | Login, Google auth, register, logout, config, me | 
| users | users/ | CRUD akun, approve pendaftar, RBAC | 
| sessions | sessions/ | Sesi aktif, revoke, housekeeping | 
| profile | profile/ | Profil sendiri, ganti password, link Google | 
| audit | audit/ | Activity log, endpoint activities | 
| guru | guru/ | CRUD data guru | 
| siswa | siswa/ | CRUD data siswa | 
| kelas | kelas/ | CRUD kelas + wali kelas | 
| kurikulum | kurikulum/ | Mapel, penugasan, jadwal KBM, libur, KKM | 
| pengaturan | pengaturan/ | Pengaturan sekolah, jam, lokasi | 
| tahun-ajaran | tahun-ajaran/ | CRUD tahun ajaran + semester | 
| uploads | uploads/ | Static file serving /uploads/ | 
| import | import/ | Import Excel guru/siswa | 
| seed | seed/ | Bootstrap admin seed + housekeeping | 
 
## Alur Autentikasi 
 
`mermaid 
sequenceDiagram 
    U->> Frontend: POST /api/auth/login 
    Frontend->> Backend: POST /api/auth/login 
    Backend->> DB: Query user + passwordHash 
    Backend->> DB: bcrypt.compare 
    Backend->> DB: Create session (tokenHash sha256) 
    Backend->> DB: Record audit log 
    Backend-->>Frontend: accessToken + safeUser 
    Frontend->> Frontend: localStorage.setItem(token) 
` 
 
1. Login: email+password | Google ID-token 
2. Token: crypto.randomBytes(48).hex, hash sha256 disimpan 
3. Guard: SessionAuthGuard cek tokenHash + idle + absolute 
4. Idle: SESSION_IDLE_MINUTES (default 60), throttle 60dtk 
5. Absolute: SESSION_ABSOLUTE_HOURS (default 24) 
6. 401 SESSION_IDLE: frontend redirect login + kembali 
 
## Pola Frontend 
 
- Router: createBrowserRouter (React Router v6 data router) 
- Lazy Load: SEMUA halaman via React.lazy + ErrorBoundary 
- Auth: AuthContext menyimpan user + token di localStorage 
- Guard: RequireAuth + RequireRole components 
- Cache: SWR pattern di api/client.ts + useCachedList hook 
- 401 interceptor: redirect /login, simpan lokasi, kembali setelah login 
- Layout: AppLayout dengan sidebar gabungan peran + header jam WIB 
 
## Deviasi Terdeteksi 
 
1. synchronize: true di app.module.ts - spec tidak menyebutkan, berbahaya untuk prod 
2. Body limit 6mb - spec 14.5 mengatakan 1mb 
3. CORS origin: true - spec tidak menyebutkan, terlalu permisif 
4. Tidak ada global APP_GUARD - spec 14.3 mengasumsikan semua endpoint ter-guard
