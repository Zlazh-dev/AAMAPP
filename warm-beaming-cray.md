# T9 — Guard Navigasi: Verifikasi Visual Browser

## Konteks
T9 (Guard Navigasi pakai ConfirmDialog adaptif) sudah **selesai diimplementasi** oleh agent sebelumnya:
- `useUnsavedChanges.tsx` — hook memakai `useBlocker` + `ConfirmDialog`
- `App.tsx` & `main.tsx` — migrasi ke `createBrowserRouter`
- 4 form diintegrasikan: `AkunBaruPage`, `AkunEditPage`, `PersetujuanDetailPage`, `ProfilPage`
- Build: `tsc -b` ✅, `vite build` ✅ (285 kB / gzip 84 kB)
- Zero `window.confirm` di frontend/src
- Docker containers aktif: frontend :80, API :3000, db :5432
- **Yang belum:** verifikasi visual bahwa dialog benar-benar muncul di browser

## Lingkungan Saat Ini
- Frontend: http://localhost:80
- API: http://localhost:3000
- Backend containers running, API login OK

## Rencana Verifikasi

### Step 1: Login sebagai admin
- Buka http://localhost/login
- Login dengan kredensial admin seed

### Step 2: Buka form /admin/akun/baru
- Navigasi ke Tambah Akun
- Isi Nama + Email (trigger dirty state)
- Biarkan field lain default

### Step 3: Trigger navigasi dengan dirty form
- Klik menu sidebar
- **Harap muncul:** ConfirmDialog adaptif dengan:
  - Judul "Perubahan belum disimpan"
  - Tombol "Lanjut Mengedit" → tetap di form
  - Tombol "Buang Perubahan" (danger red) → lanjut navigasi
  - **BUKAN** dialog native `window.confirm`

### Step 4: Test cancel vs discard
- Klik "Lanjut Mengedit" → form tetap utuh
- Ulangi navigasi → klik "Buang Perubahan" → pindah halaman

### Step 5: Verifikasi di viewport mobile 375px
- Resize ke 375px width
- Ulangi langkah 2-4
- **Harap muncul:** bottom sheet dari bawah (bukan modal tengah)

### Step 6: Smoke test form lain
- `/admin/akun/:id/edit` — edit nama → navigasi → guard muncul
- `/profil` — ubah nama → navigasi → guard muncul
- `/admin/akun/persetujuan/:id` — ubah peran → navigasi → guard muncul

## Yang TIDAK perlu diubah
- Semua kode produksi sudah OK — tidak ada bug yang perlu diperbaiki
- Tidak ada perubahan source code yang diperlukan
