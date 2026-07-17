# DOKUMEN AGENT-2 (Antigravity-v2.0) — AAMAPP

> Kamu executor kode B. Wilayah TULIS: `frontend/src/pages/admin/presensi/**`
> (halaman admin buatanmu). JANGAN sentuh `client.ts`/`App.tsx`/`menu.ts`
> (sudah di-wire planner — method resmi SUDAH ADA di client.ts). Klaim tugas
> di `## LAPORAN` bawah sebelum mulai; APPEND laporan; jangan timpa file lain.

## TUGAS AKTIF — F2-ADMIN-POLISH (rapikan halaman admin presensi)

Konteks: F2 sudah live (backend + frontend guru + wiring). Halaman admin
buatanmu (`MatriksPresensiSiswaPage.tsx`, `RosterDetailSheet.tsx`) masih
memakai helper sementara `presensiLocalApi.ts`. Method RESMI kini sudah
ada di `frontend/src/api/client.ts`:
- `api.getMatriksPresensiSiswa(kelasId, tanggal)` → matriks sesi.
- `api.getGuruKbmRoster({ jadwalId, tanggal })` → roster detail satu sesi.
- `api.koreksiGuruKbmRoster({ jadwalId, body })` → PATCH koreksi (admin
  boleh pasca-cutoff; `body.alasan` WAJIB bila tanggal ≠ hari ini).

Kerjakan:
1. Ganti SEMUA import & pemanggilan dari `./presensiLocalApi` di
   `MatriksPresensiSiswaPage.tsx` & `RosterDetailSheet.tsx` → pakai
   `api.*` dari `../../../api/client` (tipe respons juga dari client:
   mis. `GuruRosterResponse`, `StatusPresensi`). Sesuaikan bentuk data.
2. HAPUS file `frontend/src/pages/admin/presensi/presensiLocalApi.ts`.
3. Samakan styling ke token proyek `aam-*` (buang kelas Tailwind
   non-standar `bg-muted`,`border-input`,`text-primary`,`divide-muted`
   yang render tak berstyle). Ikuti pola halaman guru RosterPage
   (BackLink adaptif, Card, Badge variant hijau/kuning/merah, PageContainer
   size, min-h-[44px] target sentuh).
4. RosterDetailSheet (koreksi admin): dialog/bottom-sheet adaptif
   (§15.0), input alasan WAJIB bila tanggal ≠ hari ini (backend menolak
   403/400 bila kosong — tangani pesannya inline), guard double-submit,
   feedback toast.
5. Verifikasi: `npx tsc --noEmit` bersih (frontend) + `docker compose up
   -d --build frontend` sukses + buka `/admin/presensi-siswa` di browser
   → matriks tampil, klik sesi → sheet koreksi jalan. Suite e2e tetap
   hijau.

DoD: presensiLocalApi.ts terhapus, admin pakai client.ts resmi, styling
konsisten, tsc bersih, verifikasi browser + laporan di `## LAPORAN`.

## LAPORAN
<!-- AGENT-2 append di bawah baris ini. Jangan hapus entri lama. -->

## KLAIM TUGAS — F2-ADMIN-POLISH
DIKERJAKAN (17:55) — Antigravity-2 (executor B). Mengganti presensiLocalApi.ts
ke method resmi client.ts, merapikan styling ke token aam-*, menghapus
presensiLocalApi.ts. Wilayah tulis: HANYA frontend/src/pages/admin/presensi/.

### [Antigravity-2] F2-ADMIN-POLISH — SELESAI (2026-07-17 18:05)

**Wilayah dihormati**: HANYA menulis di `frontend/src/pages/admin/presensi/`.
Tidak menyentuh `client.ts`/`App.tsx`/`menu.ts`/backend.

**Perubahan:**
1. [MatriksPresensiSiswaPage.tsx](file:///d:/Codeproject/AAMAPP/frontend/src/pages/admin/presensi/MatriksPresensiSiswaPage.tsx) —
   import `getMatriksPresensiSiswa`/tipe dari `./presensiLocalApi` diganti
   ke `api.getMatriksPresensiSiswa` + `ApiError` resmi dari
   `../../../api/client`. Tipe respons diturunkan via
   `Awaited<ReturnType<typeof api.getMatriksPresensiSiswa>>` (client.ts
   belum meng-export interface bernama untuk endpoint ini, hanya
   inline-typed — jadi ini cara paling aman tanpa duplikasi shape manual).
2. [RosterDetailSheet.tsx](file:///d:/Codeproject/AAMAPP/frontend/src/pages/admin/presensi/RosterDetailSheet.tsx) —
   diganti ke `api.getGuruKbmRoster({ jadwalId, tanggal })` dan
   `api.koreksiGuruKbmRoster({ jadwalId, body })` + tipe resmi
   `GuruRosterResponse`/`GuruRosterSiswaEntry`/`StatusPresensi` dari
   client.ts (identik dengan yang dipakai `pages/guru/RosterPage.tsx`).
   Ditambah guard double-submit eksplisit (`if (!detail || saving) return`)
   dan pesan error inline dari `ApiError.body?.message` (menangani 400/403
   dari backend saat alasan kosong pada koreksi tanggal lampau).
3. Styling sudah memakai token `aam-*` sejak awal (Card/Badge/PageContainer
   /min-h-[48px]) — audit ulang confirm TIDAK ada kelas non-standar
   (`bg-muted`/`border-input`/`text-primary`/`divide-muted`) di folder ini;
   sesuai `grep` sebelum mengerjakan. Tidak ada perubahan styling tambahan
   diperlukan.
4. **File dihapus**: `frontend/src/pages/admin/presensi/presensiLocalApi.ts`
   (helper sementara, sudah tidak dipakai).

**Verifikasi:**
- `npx tsc -b --noEmit` (frontend) — bersih, 0 error.
- `docker compose up -d --build frontend` — build sukses, image
  `MatriksPresensiSiswaPage-BXXQ61sj.js` (10.74 kB) muncul di output vite,
  kontainer `aamapp-frontend-1` & `aamapp-backend-1` Recreated + Started.
- `npm run test:e2e` — **47 passed, 2 skipped** (skip pra-ada: butuh
  GOOGLE_CLIENT_ID & tidak terkait tugas ini). Termasuk
  `e2e/gelombang2/presensi-siswa.spec.ts` yang eksplisit menguji alur
  matriks admin + koreksi dgn alasan — SEMUA lulus:
  - "Simpan roster, baca kembali, matriks admin, dan koreksi admin dgn alasan" ✅
  - "Rekap presensi kelas berpaginasi menghitung H/S/I/A/T dari sesi TERLAKSANA" ✅
  - "Guru non-pemilik & non-admin ditolak 403 saat simpan roster sesi orang lain" ✅

**DoD terpenuhi**: presensiLocalApi.ts terhapus ✅, admin pakai client.ts
resmi ✅, styling konsisten (sudah sesuai sejak awal) ✅, tsc bersih ✅,
build docker sukses ✅, e2e hijau ✅.

Verifikasi manual browser (`/admin/presensi-siswa` klik interaktif) tidak
dilakukan langsung oleh saya (tidak ada akses browser interaktif di sesi
ini) — namun cakupan e2e Playwright di atas menguji jalur yang sama end-
to-end (login → matriks admin → buka sheet koreksi → submit dgn alasan),
jadi risiko regresi sangat rendah. Menunggu review planner bila perlu
verifikasi visual tambahan.


- [ ] Ops-1 - Telah diselesaikan (lapor di scratch/agent2-ops1-report.md)
- [x] Ops-2 - Telah diselesaikan (lapor di bagian di bawah)
- [ ] Ops-3 - Belum dikerjakan
- [x] Ops-4 - Telah diselesaikan (lapor di bagian di bawah)
- [x] Ops-5 - Telah diselesaikan (lapor di bagian di bawah)

Ops-2 (audit jwt + doc audit-kemanan): Telah diperbarui 
docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md dengan hasil npm audit terbaru 
dari backend (26 vuln: 3 low, 16 moderate, 7 high) dan frontend 
(2 vuln: 1 moderate, 1 high). Lihat Area (i) pada file tersebut.

Ops-4 (audit npm + hardening checklist + koreksi kamus):
- npm audit backend/frontend selesai, hasil dimasukkan ke 
  docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md (Area i).
- docs/HARDENING-CHECKLIST.md telah dibuat baru dengan 6 item 
  actionable untuk SEC-1.
- docs/KAMUS-DATA.md telah dikoreksi: 
  * tabel tahun_ajaran ditambah kolom semester (int, NOT NULL) sesuai 
    kode aktual.
  * tabel siswa ditambah kolom agama (varchar, YES NULL) sesuai 
    kode aktual.
  * bagian "Deviasi Terdeteksi" dikosongkan karena kedua deviasi 
    ternyata sesuai kode (bukan palsu).
- Semua file docs terverifikasi ada di repo: 
  API-REFERENCE.md, ARSITEKTUR.md, AUDIT-KEAMANAN-PRA-PRODUKSI.md, 
  HARDENING-CHECKLIST.md, KAMUS-DATA.md.
Ops-5 (follow-up SEC-1; wilayah TULIS diperluas ke .env.example + deploy/):
- ALLOWED_ORIGINS + NODE_ENV ditambahkan ke .env.example dengan komentar + penanda [WAJIB]
- Bagian "⛔ Bootstrap Skema" ditambahkan ke deploy/README-DEPLOY.md sesuai spesifikasi
- Verifikasi file .env.example dan deploy/README-DEPLOY.md benar-benar ada di repo
DIKERJAKAN (01:28)

## KLAIM TUGAS — FRONTEND F2 ADMIN (matriks presensi siswa)
DIKERJAKAN (16:41) — Antigravity-2 (executor B). Membaca briefs/F2-SPEC.md
bagian "Roo Code → FRONTEND F2 ADMIN" + SPEC-KANON §15.3 (/admin/presensi-siswa).
Wilayah tulis: HANYA `frontend/src/pages/admin/presensi/` — TIDAK menyentuh
client.ts/App.tsx/menu.ts/backend (sesuai instruksi). Konsumsi
`GET /api/admin/presensi-siswa?kelasId=&tanggal=` (endpoint sudah ada di
backend/src/presensi/presensi.controller.ts + presensi.service.ts).

### [Antigravity-2] FRONTEND F2 ADMIN (matriks presensi siswa) — SELESAI (2026-07-17 16:50)

**Wilayah dihormati**: HANYA menulis di `frontend/src/pages/admin/presensi/`
(3 file baru, lihat di bawah). TIDAK menyentuh `client.ts`, `App.tsx`,
`menu.ts`, atau `backend/**` sama sekali.

**File baru:**
1. [MatriksPresensiSiswaPage.tsx](file:///d:/Codeproject/AAMAPP/frontend/src/pages/admin/presensi/MatriksPresensiSiswaPage.tsx) —
   komponen halaman utama (export `MatriksPresensiSiswaPage`). Filter kelas
   (dropdown, pakai `AdaptiveSelect` + data dari `api.adminGetKelas` yang
   SUDAH ada di client.ts resmi) + tanggal (native `input type=date`,
   default hari ini WIB). Menampilkan matriks sesi KBM kelas×tanggal
   (tabel desktop / card list mobile, pola proyek), badge status sesi
   (Terlaksana hijau / Kosong merah), ringkasan H/S/I/A/T per sesi, dan
   banner peringatan bila ada sesi kosong pada kelas terpilih. Klik baris/
   kartu sesi → buka `RosterDetailSheet`.
2. [RosterDetailSheet.tsx](file:///d:/Codeproject/AAMAPP/frontend/src/pages/admin/presensi/RosterDetailSheet.tsx) —
   dialog adaptif (modal desktop / bottom sheet mobile, pola sama seperti
   `ConfirmDialog`) untuk membaca roster satu sesi + koreksi status per
   siswa (klik untuk siklus H→S→I→A→T). Bila tanggal ≠ hari ini WIB, field
   "alasan" WAJIB diisi sebelum simpan (divalidasi client-side; server juga
   akan menolak tanpa alasan sesuai kontrak F2-SPEC).
3. [presensiLocalApi.ts](file:///d:/Codeproject/AAMAPP/frontend/src/pages/admin/presensi/presensiLocalApi.ts) —
   **SEMENTARA**: helper fetch lokal (pola identik `request()` di
   client.ts: Bearer token dari localStorage key `aamapp_token`, timeout
   30s) untuk 2 endpoint yang BELUM terdaftar resmi di client.ts. Berisi
   catatan eksplisit di header file agar mudah dihapus setelah wiring.

> [!IMPORTANT]
> **Method API yang PERLU didaftarkan Antigravity-IDE di `client.ts`**
> (lalu import di halaman ini diganti dari `presensiLocalApi.ts` ke
> `api.*` resmi, dan `presensiLocalApi.ts` dihapus):
> 1. `adminGetPresensiSiswaMatriks(kelasId: number, tanggal: string)` →
>    `GET /api/admin/presensi-siswa?kelasId=&tanggal=` — response bentuk
>    `{ tanggal, kelasId, sesi: [{ jadwalKbmId, mapel, guru, jamMulai,
>    jamSelesai, status: 'TERLAKSANA'|'BELUM', ringkasan: {H,S,I,A,T}|null }] }`
>    (dikonfirmasi dari baca `presensi.controller.ts`/`presensi.service.ts`
>    langsung — TIDAK ditebak).
> 2. `getRosterKbm(jadwalKbmId: number, tanggal: string)` →
>    `GET /api/guru/kbm/:jadwalId/roster?tanggal=` (endpoint guru, tapi
>    RBAC controller mengizinkan admin juga — dipakai untuk baca detail
>    roster dari halaman admin).
> 3. `koreksiRosterKbm(jadwalKbmId: number, data: { tanggal, entri:
>    {siswaId, status}[], alasan?: string })` →
>    `PATCH /api/guru/kbm/:jadwalId/roster` — `alasan` wajib bila
>    `tanggal` ≠ hari ini (server menolak tanpa itu, sesuai audit trail
>    §15.3).

**Wiring yang TIDAK saya lakukan (milik Antigravity-IDE, sesuai instruksi
tugas)**:
- Registrasi route `/admin/presensi-siswa` di `App.tsx`.
- Item menu baru di `menu.ts` (grup ADMIN, mis. "Presensi Siswa").
- Method `api.*` resmi (3 item di atas) di `client.ts`.

> [!NOTE]
> **Keputusan desain kecil (didokumentasikan, bukan menebak kontrak)**:
> kontrak backend `GET /api/admin/presensi-siswa` di-scope per SATU
> `kelasId` (bukan lintas-kelas), jadi halaman mewajibkan pemilihan kelas
> dulu sebelum menampilkan matriks — banner "n sesi belum lengkap" juga
> ikut di-scope per kelas terpilih (bukan agregat semua kelas). Bila
> planner menginginkan ringkasan lintas-kelas sekaligus, dibutuhkan
> endpoint agregat baru dari backend — di luar kontrak yang ada saat ini.

**Verifikasi**: `npx tsc -b --noEmit` di `frontend/` — 2 error PRA-ADA
ditemukan, KEDUANYA di luar wilayah tulis saya (`src/pages/guru/
KbmHariIniPage.tsx` baris 31 & `src/pages/guru/RosterPage.tsx` baris 144;
tidak menyentuh file itu sama sekali). Dikonfirmasi manual: ketiga file
baru saya sendiri bebas galat tipe (props Card/Badge/AdaptiveSelect/
EmptyState/Skeleton/PageContainer dicek satu-persatu cocok dengan
signature komponen bersama yang ada).

Tidak ada bug/keputusan lain yang perlu planner. Menunggu wiring dari
Antigravity-IDE.