# AAMAPP — Ekosistem Sekolah SMP IT Asy-Syadzili

Platform manajemen sekolah: presensi, kurikulum, kesiswaan, dan administrasi
dalam satu aplikasi web.

## Prasyarat

- Docker Desktop (Windows) yang berjalan
- Tidak perlu Node.js/PostgreSQL terinstal di host — semuanya di container

## Cara Menjalankan

```powershell
# 1. Salin .env
Copy-Item .env.example .env

# 2. Sesuaikan .env (minimal: POSTGRES_PASSWORD, ADMIN_PASSWORD)
notepad .env

# 3. Build & jalankan
docker compose up -d --build

# 4. Buka http://localhost (atau port WEB_PORT di .env)
```

## Akun Seed

Saat tabel `users` kosong, admin pertama dibuat otomatis dari env:

| Field | Nilai default .env.example |
|-------|---------------------------|
| Email | `admin@aamapp.sch.id` |
| Password | `admin12345` |
| Peran | `admin` |

**Ganti password setelah login pertama.**

## Variabel Environment

Lihat [`.env.example`](.env.example) untuk daftar lengkap dengan komentar.

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `POSTGRES_DB` | `aamapp` | Nama database |
| `POSTGRES_USER` | `aamapp` | User database |
| `POSTGRES_PASSWORD` | — | Password database |
| `ADMIN_NAME` | `Administrator` | Nama admin seed |
| `ADMIN_EMAIL` | `admin@aamapp.sch.id` | Email admin seed |
| `ADMIN_PASSWORD` | `admin12345` | Password admin seed |
| `GOOGLE_CLIENT_ID` | (kosong) | Google OAuth Client ID untuk login Google |
| `SESSION_IDLE_MINUTES` | `60` | Timeout idle sesi (menit) |
| `SESSION_ABSOLUTE_HOURS` | `24` | Absolute timeout sesi (jam) |
| `WEB_PORT` | `80` | Port frontend di host |
| `TZ` | `Asia/Jakarta` | Timezone container |

## Arsitektur

```
Docker Compose
├── db         — PostgreSQL 16 (volume persistent)
├── backend    — NestJS 10 + TypeORM (port 3000 internal)
└── frontend   — React 18 + Vite + Nginx (port WEB_PORT)
                 proxy /api → backend:3000
```

**Stack:** NestJS 10, TypeORM, PostgreSQL 16, React 18, Vite, TypeScript,
Tailwind CSS, Docker Compose.

## F0 — Fondasi & Autentikasi

Fase saat ini mencakup:
- Autentikasi: login email/password + Google GIS
- Registrasi Google 3 langkah (akun → konsen perangkat + peran → pending)
- RBAC multi-peran (6 peran)
- Manajemen sesi (idle timeout, device tracking, revoke)
- Audit log
- Manajemen akun admin
- Layout per peran dengan sidebar adaptif desktop & mobile

## Login Google (opsional)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → Credentials
2. Buat OAuth Client ID (Web application)
3. Authorized JavaScript origins: `http://localhost` (+ domain produksi nanti)
4. Salin Client ID ke `.env` → `GOOGLE_CLIENT_ID=...`
5. Restart: `docker compose restart backend frontend`

Akun Google biasa (gratis) cukup — tidak perlu Google Workspace.

## E2E Testing (Playwright)

Test end-to-end menggunakan Playwright (chromium only).

### Prasyarat

- Node.js ≥ 18 (untuk menjalankan Playwright di host)
- Docker stack **harus sudah berjalan** (`docker compose up -d --build`)
  — spec berjalan terhadap `http://localhost`
- Instal browser sekali:
  ```powershell
  cd frontend
  npm install
  npx playwright install chromium
  ```

### Menjalankan

```powershell
cd frontend

# Semua spec desktop + mobile
npm run test:e2e

# Hanya desktop
npx playwright test --project=desktop-chromium

# UI mode (debugging interaktif)
npm run test:e2e:ui

# Spec tertentu
npx playwright test e2e/gelombang1/form-fokus.spec.ts
```

### Struktur

```
frontend/
├── e2e/
│   ├── helpers/
│   │   ├── auth.ts      — login via API (storageState, bukan ketik form)
│   │   └── api.ts       — seed & cleanup data via API
│   ├── gelombang1/
│   │   ├── form-fokus.spec.ts    — fokus input form siswa
│   │   ├── libur-rentang.spec.ts — rentang libur tergabung + hapus
│   │   └── libur-seleksi.spec.ts — seleksi-multi + tandai + rentang
│   └── gelombang2/       — T16: matriks CRUD & regresi per modul admin
│       ├── akun.spec.ts, auth.spec.ts, cabut-sesi.spec.ts
│       ├── filter-bar.spec.ts, guru-crud.spec.ts, image-uploader.spec.ts
│       ├── import-wizard.spec.ts, jadwal-crud.spec.ts, kelas-crud.spec.ts
│       ├── libur-crud.spec.ts, libur-nasional-banner.spec.ts
│       ├── mapel-crud.spec.ts, multi-checkbox.spec.ts, pengaturan.spec.ts
│       ├── penugasan-crud.spec.ts, rbac-negatif.spec.ts, search-select.spec.ts
│       ├── siswa-crud.spec.ts, tahun-ajaran.spec.ts, ui-desktop.spec.ts
│       ├── unsaved-guard.spec.ts, wali-force.spec.ts
│       └── *.mobile.spec.ts (jadwal-mobile, ui-mobile) — viewport 375×812
├── playwright.config.ts
└── package.json          — scripts: test:e2e, test:e2e:ui
```

Status suite penuh (fresh start dari DB kosong, ×2 berturut): **36 passed, 2 skipped**
(dicatat, bukan gagal):
- `akun.spec.ts` › Setujui/Tolak pendaftar — butuh `GOOGLE_CLIENT_ID` untuk seed
  via `register-google`, tidak tersedia di lingkungan dev lokal.
- `libur-nasional-banner.spec.ts` — bergantung pada hasil live provider
  `api-harilibur.vercel.app`; skip conditional bila egress diblokir atau tidak
  ada libur nasional baru yang belum diimpor saat spec berjalan.

### Catatan

- **Login helper**: semua spec login via API `POST /api/auth/login` lalu
  menulis token ke `localStorage` — TIDAK pernah mengetik form login
  (§12.17e).
- **Data uji**: dibuat/dibersihkan via API di hook spec, bukan fixture global.
- **Retries = 0**: test flaky = bug, bukan retry (§12.17c).
- **Mobile spec**: file `*.mobile.spec.ts` otomatis dijalankan di viewport
  375×812 (`mobile-chromium` project).
