# Graph Report - .  (2026-07-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2594 nodes · 7215 edges · 136 communities (106 shown, 30 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.76)
- Token cost: 12,920 input · 2,018 output

## Graph Freshness
- Built from commit: `123ae8be`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api
- Audit & Auth Modules
- Import Service Entities
- Guru Entity & Service
- Kelas & Activity Filter UI
- Frontend App Routes
- UI Card Components
- Audit & Katalog Entities
- Kokurikuler DTOs
- Face Enrollment DTOs
- Auth Controller
- Guru Create/Update DTOs
- Kurikulum Controller
- API Client & Cache
- Ekskul Entities
- Kokurikuler Entities
- Rapor Controller DTOs
- WIB Date Utils & Izin
- Admin Pages Collection
- Izin Guru DTOs
- Jadwal/Mapel DTOs
- E2E Test Specs
- Excel/PDF Export Utils
- Presensi Roster DTO
- Libur DTOs
- Auth Guards & Roles
- Kelas DTOs & Controller
- List Responses & Select UI
- Backend E2E Specs
- Ekskul Controller
- Tahun Ajaran Controller
- Backend Dev Dependencies
- Profile Controller
- Guru Controller
- Admin Izin Guru Page
- Frontend TS Config
- Backend TS Config
- PelanggaranPage.tsx
- Pengaturan Controller
- Penilaian Controller
- Backend Dependencies
- Ekskul DTOs
- Import Controller
- Ekskul Service
- Laporan Controller
- Penilaian Service
- Kesiswaan Service
- Auth Context & Token
- Frontend Dev Dependencies
- Kesiswaan Controller
- Frontend Dependencies
- Face Detection Utils
- Users Controller
- Pelanggaran Endpoints
- Users Service
- Izin Guru Page
- Backend Package Scripts
- Session Endpoints
- Libur Pengaturan Page
- App Layout & Session
- Scheduling E2E Specs
- Activity Log Entity
- Nilai DTOs
- Penilaian DTOs
- PNG Upload Script
- Katalog DTO
- Uploads Controller
- Rapor Detail Page
- Google Auth DTOs
- Catat Pelanggaran DTO
- Seed Service
- Tahun Ajaran DTOs
- User DTOs
- App Bootstrap & DB
- Audit Controller
- Tujuan Pembelajaran DTOs
- Admin Sessions Controller
- Navigation Menu Config
- Error Boundary
- Table & Toast UI
- Ekskul Kehadiran Entity
- Nest CLI Config
- Profile Update DTOs
- Frontend Test Scripts
- Keputusan Pelanggaran DTO
- Selesai Tindak Lanjut DTO
- Express Session Types
- Kelas Delete Spec
- RBAC & Presensi Specs
- Session Dedupe Spec
- Frontend Package Meta
- Kesiswaan Dashboard Page
- Date Range Validator
- Initial Schema Migration
- Guru Hadir Migration
- Authorization Test Spec
- Face Presensi Spec
- Siswa Pindah Kelas Spec
- Save Success Component
- Google Auth Types
- Checklist Script
- Static Check Probe
- App Router Setup
- Update Jadwal DTO
- Date Utility Library
- Security Headers Middleware
- NestJS Config Module
- NestJS Core Framework
- NestJS Mapped Types
- NestJS TypeORM Integration
- Postgres Client
- Reactive Extensions Library
- User Agent Parser
- React Library
- Class Transformer Util
- React Type Definitions
- Page Skeleton Component
- CSS Modules Types
- Database Backup Script
- Database Restore Script
- Vite React Plugin

## God Nodes (most connected - your core abstractions)
1. `Roles()` - 161 edges
2. `useToast()` - 139 edges
3. `User` - 103 edges
4. `api` - 80 edges
5. `ApiError` - 78 edges
6. `Card()` - 73 edges
7. `PageContainer()` - 73 edges
8. `Guru` - 70 edges
9. `loginAsAdmin()` - 62 edges
10. `Button` - 60 edges

## Surprising Connections (you probably didn't know these)
- `KelasDetailPage()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/admin/kelas/KelasDetailPage.tsx → frontend/src/components/Toast.tsx
- `GuruDetailPage()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/admin/orang/GuruDetailPage.tsx → frontend/src/components/Toast.tsx
- `PengaturanSekolahPage()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/admin/pengaturan/PengaturanSekolahPage.tsx → frontend/src/components/Toast.tsx
- `EkskulAdminPage()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/ekskul/EkskulAdminPage.tsx → frontend/src/components/Toast.tsx
- `RosterPage()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/pages/guru/RosterPage.tsx → frontend/src/components/Toast.tsx

## Import Cycles
- None detected.

## Communities (136 total, 30 thin omitted)

### Community 0 - "api"
Cohesion: 0.07
Nodes (52): api, ApiError, Guru, KkmPengaturan, Mapel, Penugasan, TahunAjaran, BackLink() (+44 more)

### Community 1 - "Audit & Auth Modules"
Cohesion: 0.05
Nodes (69): AuditModule, Module, AuditLogInput, AuditRecordInput, AuthModule, Module, LoginAttempt, loginAttempts (+61 more)

### Community 2 - "Import Service Entities"
Cohesion: 0.04
Nodes (87): JenisKelamin, ColumnDef, GURU_COLUMNS, ImportCellError, ImportCommitResult, ImportJenis, ImportPreviewResult, SISWA_COLUMNS (+79 more)

### Community 3 - "Guru Entity & Service"
Cohesion: 0.04
Nodes (71): Guru, GuruStatus, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany (+63 more)

### Community 4 - "Kelas & Activity Filter UI"
Cohesion: 0.12
Nodes (26): ActivityLogEntry, ActivityLogResponse, Kelas, KelasListResponse, FilterBar(), FilterBarDateField, FilterBarField, FilterBarFieldBase (+18 more)

### Community 5 - "Frontend App Routes"
Cohesion: 0.02
Nodes (78): AdminDashboardPage, AdminIzinGuruPage, AkunAktivitasPage, AkunBaruPage, AkunDaftarPage, AkunDetailPage, AkunEditPage, AkunSesiPage (+70 more)

### Community 6 - "UI Card Components"
Cohesion: 0.07
Nodes (50): GuruKbmResponse, Badge(), Card(), CardProps, EmptyState(), EmptyStateProps, TableSkeleton(), KehadiranMap (+42 more)

### Community 7 - "Audit & Katalog Entities"
Cohesion: 0.05
Nodes (54): AuditService, Injectable, InjectRepository, InjectRepository, InjectRepository, KatalogPelanggaran, Column, CreateDateColumn (+46 more)

### Community 8 - "Kokurikuler DTOs"
Cohesion: 0.07
Nodes (36): AddTargetDto, AddTimDto, AsesmenEntriDto, CreateKegiatanDto, NILAI_KUALITATIF, ArrayMinSize, IsArray, IsIn (+28 more)

### Community 9 - "Face Enrollment DTOs"
Cohesion: 0.05
Nodes (37): ArrayNotEmpty, EmbeddingVectorDto, EnrollWajahDto, ArrayMaxSize, ArrayMinSize, IsArray, IsNumber, ManualDto (+29 more)

### Community 10 - "Auth Controller"
Cohesion: 0.12
Nodes (11): AuthController, Body, Controller, Get, Post, Req, UseGuards, AuthService (+3 more)

### Community 11 - "Guru Create/Update DTOs"
Cohesion: 0.06
Nodes (37): CreateGuruDto, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength (+29 more)

### Community 12 - "Kurikulum Controller"
Cohesion: 0.08
Nodes (15): KurikulumController, Body, Controller, Delete, Get, Param, Patch, Post (+7 more)

### Community 13 - "API Client & Cache"
Cohesion: 0.05
Nodes (42): AuthConfig, CacheEntry, cacheMap, clearDeviceToken(), getDeviceToken(), GuruKbmSesi, GuruRekapPresensiResponse, GuruRosterResponse (+34 more)

### Community 14 - "Ekskul Entities"
Cohesion: 0.07
Nodes (36): Ekskul, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn (+28 more)

### Community 15 - "Kokurikuler Entities"
Cohesion: 0.07
Nodes (38): KokurikulerAsesmen, SKOR_MAP, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn (+30 more)

### Community 16 - "Rapor Controller DTOs"
Cohesion: 0.10
Nodes (19): CatatanWaliDto, OverrideMapelDto, IsInt, IsOptional, IsString, Max, Min, RaporController (+11 more)

### Community 17 - "WIB Date Utils & Izin"
Cohesion: 0.09
Nodes (24): formatDateWIB(), formatRelativeWIB(), formatTimeWIB(), formatWIB(), todayWIB(), IzinGuru, JenisIzin, Column (+16 more)

### Community 18 - "Admin Pages Collection"
Cohesion: 0.06
Nodes (36): useToast(), AkunBaruPage(), PersetujuanDetailPage(), KelasListPage(), GuruListPage(), SiswaDetailPage(), SiswaListPage(), PengaturanJamPage() (+28 more)

### Community 19 - "Izin Guru DTOs"
Cohesion: 0.08
Nodes (27): AjukanIzinDto, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, KeputusanDto (+19 more)

### Community 20 - "Jadwal/Mapel DTOs"
Cohesion: 0.06
Nodes (30): CreateJadwalDto, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength (+22 more)

### Community 22 - "Excel/PDF Export Utils"
Cohesion: 0.07
Nodes (33): ProfilSekolah, ExcelColumn, ExcelExportParams, Content, PdfColumn, PdfExportParams, RaporEkskulItem, RaporKokurikulerDimensi (+25 more)

### Community 23 - "Presensi Roster DTO"
Cohesion: 0.08
Nodes (23): EntriPresensiDto, SimpanRosterDto, STATUS_PRESENSI, IsArray, IsDateString, IsIn, IsInt, IsOptional (+15 more)

### Community 24 - "Libur DTOs"
Cohesion: 0.07
Nodes (22): BulkLiburDto, ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, Matches (+14 more)

### Community 25 - "Auth Guards & Roles"
Cohesion: 0.20
Nodes (11): Roles(), RolesGuard, Injectable, SessionAuthGuard, Injectable, ALL_WRITE_ROLES, PATCH_ROLES, VALID_KEYS (+3 more)

### Community 26 - "Kelas DTOs & Controller"
Cohesion: 0.11
Nodes (22): CreateKelasDto, SetWaliDto, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength (+14 more)

### Community 27 - "List Responses & Select UI"
Cohesion: 0.09
Nodes (26): GuruListResponse, Siswa, SiswaListResponse, useUnsavedChanges(), UseUnsavedChangesOptions, AdaptiveSelect(), AdaptiveSelectOption, AdaptiveSelectProps (+18 more)

### Community 28 - "Backend E2E Specs"
Cohesion: 0.12
Nodes (7): catatPelanggaran(), siswaIds, siswaIds, authHeaders(), bulkHapusLibur(), deleteSiswa(), seedLibur()

### Community 29 - "Ekskul Controller"
Cohesion: 0.19
Nodes (12): EkskulController, Body, Controller, Delete, Get, Param, Patch, Post (+4 more)

### Community 30 - "Tahun Ajaran Controller"
Cohesion: 0.12
Nodes (13): TahunAjaranController, Body, Controller, Delete, Get, Param, Patch, Post (+5 more)

### Community 31 - "Backend Dev Dependencies"
Cohesion: 0.07
Nodes (27): devDependencies, @nestjs/cli, @nestjs/schematics, ts-loader, ts-node, tsconfig-paths, @types/bcryptjs, @types/cookie-parser (+19 more)

### Community 32 - "Profile Controller"
Cohesion: 0.12
Nodes (12): CurrentUser, ProfileController, Body, Controller, Delete, Get, Param, Patch (+4 more)

### Community 33 - "Guru Controller"
Cohesion: 0.11
Nodes (13): GuruController, Body, Controller, Delete, Get, Param, Patch, Post (+5 more)

### Community 34 - "Admin Izin Guru Page"
Cohesion: 0.21
Nodes (12): ActionSheetProps, AdminIzinGuruPage(), formatTanggal(), hitungHari(), IzinActionSheet(), IzinAdminItem, JENIS_LABEL, JenisIzin (+4 more)

### Community 35 - "Frontend TS Config"
Cohesion: 0.08
Nodes (25): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+17 more)

### Community 36 - "Backend TS Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+16 more)

### Community 37 - "PelanggaranPage.tsx"
Cohesion: 0.09
Nodes (25): KatalogEntry, KategoriPelanggaran, PelanggaranEntry, StatusPelanggaran, FormDrawer(), FormDrawerProps, KATEGORI_VARIANT, PELANGGARAN_SUB_LINKS (+17 more)

### Community 38 - "Pengaturan Controller"
Cohesion: 0.11
Nodes (12): PengaturanController, PengaturanPublicController, Body, Controller, Get, Param, Patch, Req (+4 more)

### Community 39 - "Penilaian Controller"
Cohesion: 0.24
Nodes (11): PenilaianController, Body, Controller, Delete, Get, Param, Patch, Post (+3 more)

### Community 40 - "Backend Dependencies"
Cohesion: 0.09
Nodes (23): dependencies, bcryptjs, class-validator, cookie-parser, date-fns-tz, exceljs, google-auth-library, multer (+15 more)

### Community 41 - "Ekskul DTOs"
Cohesion: 0.19
Nodes (21): AddPesertaDto, CreateEkskulDto, CreateTujuanDto, KehadiranEntriDto, NILAI_EKSKUL, NilaiEntriDto, ArrayMinSize, IsArray (+13 more)

### Community 42 - "Import Controller"
Cohesion: 0.15
Nodes (12): ImportController, Controller, Get, Post, Query, Req, UploadedFile, UseGuards (+4 more)

### Community 43 - "Ekskul Service"
Cohesion: 0.18
Nodes (3): buildDeskripsiEkskul(), EkskulService, Injectable

### Community 44 - "Laporan Controller"
Cohesion: 0.18
Nodes (9): LaporanController, Controller, Get, Query, UseGuards, TuController, dateRange(), LaporanService (+1 more)

### Community 46 - "Kesiswaan Service"
Cohesion: 0.19
Nodes (3): KesiswaanService, Injectable, TahapTindakLanjut

### Community 47 - "Auth Context & Token"
Cohesion: 0.16
Nodes (16): clearToken(), getAndClearReturnTo(), getToken(), request(), SafeUser, setToken(), UserProfile, UserRole (+8 more)

### Community 48 - "Frontend Dev Dependencies"
Cohesion: 0.12
Nodes (17): autoprefixer, devDependencies, autoprefixer, @playwright/test, postcss, tailwindcss, @tensorflow/tfjs-backend-wasm, @types/react-dom (+9 more)

### Community 49 - "Kesiswaan Controller"
Cohesion: 0.21
Nodes (5): KesiswaanController, Controller, Get, Query, UseGuards

### Community 50 - "Frontend Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, exceljs, leaflet, pdfmake, react-dom, react-router-dom, @types/leaflet, @types/pdfmake (+9 more)

### Community 51 - "Face Detection Utils"
Cohesion: 0.16
Nodes (13): checkQuality(), DebugInfo, detectEmbedding(), FaceDetection, loadHuman(), LoadProgressCallback, GuruEnrollWizardPage(), Phase (+5 more)

### Community 52 - "Users Controller"
Cohesion: 0.18
Nodes (6): Controller, Get, Param, Query, UseGuards, UsersController

### Community 53 - "Pelanggaran Endpoints"
Cohesion: 0.27
Nodes (6): Body, Delete, Param, Patch, Post, Req

### Community 54 - "Users Service"
Cohesion: 0.20
Nodes (5): Delete, Injectable, InjectRepository, UsersService, VALID_ROLES

### Community 55 - "Izin Guru Page"
Cohesion: 0.19
Nodes (13): formatTanggal(), FormState, hitungHari(), IzinForm(), IzinGuruPage(), IzinItem, JENIS_LABEL, JENIS_OPTIONS (+5 more)

### Community 56 - "Backend Package Scripts"
Cohesion: 0.15
Nodes (12): name, private, scripts, build, migration:generate, migration:revert, migration:run, migration:show (+4 more)

### Community 57 - "Session Endpoints"
Cohesion: 0.21
Nodes (6): CurrentSession, Delete, Param, Body, Patch, Post

### Community 58 - "Libur Pengaturan Page"
Cohesion: 0.24
Nodes (12): LiburEntry, dateRange(), DAY_NAMES, diffDays(), formatDate(), groupLiburRentang(), humanDate(), humanDateRange() (+4 more)

### Community 59 - "App Layout & Session"
Cohesion: 0.19
Nodes (19): AdminUser, SessionInfo, AppLayout(), useAuth(), findActiveLeaf(), BadgeProps, BadgeVariant, roleLabel() (+11 more)

### Community 60 - "Scheduling E2E Specs"
Cohesion: 0.21
Nodes (5): escapeRegex(), pilihKelas(), setupKelasDenganSesi(), setupSesiHariIni(), ensureActiveTahunAjaran()

### Community 61 - "Activity Log Entity"
Cohesion: 0.22
Nodes (8): ActivityLog, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, InjectRepository

### Community 62 - "Nilai DTOs"
Cohesion: 0.18
Nodes (10): NilaiEntriDto, IsArray, IsInt, IsOptional, IsString, Max, Min, Type (+2 more)

### Community 63 - "Penilaian DTOs"
Cohesion: 0.33
Nodes (10): CreatePenilaianDto, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Min (+2 more)

### Community 64 - "PNG Upload Script"
Cohesion: 0.20
Nodes (8): data, file, fs, http, localPath, os, path, PNG

### Community 65 - "Katalog DTO"
Cohesion: 0.20
Nodes (7): CreateKatalogDto, IsIn, IsInt, IsString, Max, Min, MinLength

### Community 66 - "Uploads Controller"
Cohesion: 0.20
Nodes (8): hasValidMagicBytes(), Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors, UploadsController

### Community 67 - "Rapor Detail Page"
Cohesion: 0.24
Nodes (9): doExportPdf(), EkskulItem, EkskulTujuan, getProfilForPdf(), Kehadiran, KokurikulerDimensi, MapelRapor, RaporDetailPage() (+1 more)

### Community 68 - "Google Auth DTOs"
Cohesion: 0.22
Nodes (9): GoogleLoginDto, LoginDto, RegisterGoogleDto, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsOptional (+1 more)

### Community 69 - "Catat Pelanggaran DTO"
Cohesion: 0.22
Nodes (8): CatatPelanggaranDto, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min

### Community 71 - "Tahun Ajaran DTOs"
Cohesion: 0.39
Nodes (8): CreateTahunAjaranDto, IsBoolean, IsIn, IsOptional, IsString, Matches, UpdateTahunAjaranDto, Length

### Community 72 - "User DTOs"
Cohesion: 0.36
Nodes (9): ApproveUserDto, CreateUserDto, ArrayMinSize, IsArray, IsEmail, IsOptional, IsString, MinLength (+1 more)

### Community 73 - "App Bootstrap & DB"
Cohesion: 0.36
Nodes (6): AppModule, Module, AppDataSource, bootstrap(), migrLogger, runMigrations()

### Community 74 - "Audit Controller"
Cohesion: 0.25
Nodes (6): AuditController, Controller, Get, InjectRepository, Query, UseGuards

### Community 75 - "Tujuan Pembelajaran DTOs"
Cohesion: 0.43
Nodes (7): CreateTpDto, IsInt, IsOptional, IsString, Min, MinLength, UpdateTpDto

### Community 76 - "Admin Sessions Controller"
Cohesion: 0.25
Nodes (5): AdminSessionsController, Controller, Get, Query, UseGuards

### Community 77 - "Navigation Menu Config"
Cohesion: 0.29
Nodes (7): ADMIN_EXTRA_AREAS, AREA_ORDER, getMenuForUser(), MENU_GROUPS, MenuGroup, MenuItem, MenuLeaf

### Community 79 - "Table & Toast UI"
Cohesion: 0.06
Nodes (37): GuruRekapPresensiEntry, SubPageLinks(), ALIGN_CLASS, ColumnDef, Table(), TableProps, colors, icons (+29 more)

### Community 80 - "Ekskul Kehadiran Entity"
Cohesion: 0.22
Nodes (9): EkskulKehadiran, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique (+1 more)

### Community 81 - "Nest CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 82 - "Profile Update DTOs"
Cohesion: 0.47
Nodes (6): LinkGoogleDto, PasswordDto, IsOptional, IsString, MinLength, UpdateProfileDto

### Community 83 - "Frontend Test Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, preview, test:e2e, test:e2e:ui

### Community 84 - "Keputusan Pelanggaran DTO"
Cohesion: 0.40
Nodes (4): KeputusanPelanggaranDto, IsOptional, IsString, MinLength

### Community 85 - "Selesai Tindak Lanjut DTO"
Cohesion: 0.40
Nodes (3): SelesaiTindakLanjutDto, IsString, MinLength

### Community 86 - "Express Session Types"
Cohesion: 0.40
Nodes (4): Express, express-serve-static-core, Request, SessionData

### Community 87 - "Kelas Delete Spec"
Cohesion: 0.60
Nodes (3): dbCount(), dbScalar(), execDocker()

### Community 89 - "Session Dedupe Spec"
Cohesion: 0.60
Nodes (3): countActiveSessions(), execDocker(), getDeviceIdOfSession()

### Community 90 - "Frontend Package Meta"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 91 - "Kesiswaan Dashboard Page"
Cohesion: 0.70
Nodes (3): KesiswaanDashboardPage(), monthStartWIB(), todayWIB()

### Community 98 - "Save Success Component"
Cohesion: 0.50
Nodes (3): SaveSuccess(), SaveSuccessProps, SaveSuccessState

### Community 99 - "Google Auth Types"
Cohesion: 0.50
Nodes (3): GoogleAccounts, GoogleAccountsId, Window

### Community 100 - "Checklist Script"
Cohesion: 0.83
Nodes (3): log(), main(), req()

### Community 106 - "Update Jadwal DTO"
Cohesion: 0.18
Nodes (10): IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min (+2 more)

## Knowledge Gaps
- **451 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+446 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Audit & Auth Modules` to `Profile Controller`, `Import Service Entities`, `Guru Entity & Service`, `Audit & Katalog Entities`, `Auth Controller`, `Admin Sessions Controller`, `Kokurikuler Entities`, `WIB Date Utils & Izin`, `Users Controller`, `Users Service`, `Auth Guards & Roles`, `Activity Log Entity`, `Session Endpoints`?**
  _High betweenness centrality (0.340) - this node is a cross-community bridge._
- **Why does `AuthProvider()` connect `Auth Context & Token` to `Auth Controller`, `Frontend App Routes`?**
  _High betweenness centrality (0.332) - this node is a cross-community bridge._
- **Why does `Roles()` connect `Auth Guards & Roles` to `Audit & Auth Modules`, `Kokurikuler DTOs`, `Face Enrollment DTOs`, `Guru Create/Update DTOs`, `Kurikulum Controller`, `Rapor Controller DTOs`, `Izin Guru DTOs`, `Jadwal/Mapel DTOs`, `Presensi Roster DTO`, `Libur DTOs`, `Kelas DTOs & Controller`, `Ekskul Controller`, `Tahun Ajaran Controller`, `Guru Controller`, `Pengaturan Controller`, `Penilaian Controller`, `Ekskul DTOs`, `Import Controller`, `Laporan Controller`, `Kesiswaan Controller`, `Users Controller`, `Pelanggaran Endpoints`, `Uploads Controller`, `Audit Controller`, `Admin Sessions Controller`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _451 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api` be split into smaller, more focused modules?**
  _Cohesion score 0.0708548479632817 - nodes in this community are weakly interconnected._
- **Should `Audit & Auth Modules` be split into smaller, more focused modules?**
  _Cohesion score 0.053744748660002895 - nodes in this community are weakly interconnected._
- **Should `Import Service Entities` be split into smaller, more focused modules?**
  _Cohesion score 0.0353628023352794 - nodes in this community are weakly interconnected._