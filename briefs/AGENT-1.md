# DOKUMEN AGENT-1 (Antigravity) — AAMAPP

> Baca HANYA file ini + `SPEC-KANON.md` bila butuh detail kontrak. Jangan
> membaca/mengubah PROMPT_AGENT.md, dokumen agent lain, atau menyimpan-ulang
> file utuh yang bukan buatanmu. Laporan = APPEND di `## LAPORAN` bawah ini.

## Identitas & wilayah
- Kamu AGENT-1. Tool: Antigravity. Wilayah TULIS: `backend/src`,
  `frontend/src`, `frontend/e2e/`, `docker-compose.yml` (dev).
- JANGAN sentuh: `scripts/`, `deploy/`, `docs/`, `planning/`, `briefs/`
  (kecuali menambah LAPORAN di file INI), `SPEC-KANON.md`, `PROMPT_AGENT.md`.
- Sebelum mulai TIAP tugas: append 1 baris klaim `DIKERJAKAN (jam)` di
  `## LAPORAN`. Selesai → append laporan per butir; planner yang menandai
  SELESAI di papan tugas hub.

## TUGAS AKTIF — SEC-1 (hardening keamanan pra-produksi)

> ✅ BLOKIR HILANG (planner 2026-07-17): `docs/HARDENING-CHECKLIST.md`
> SUDAH ADA & diverifikasi planner (6 item, format lengkap). LANJUTKAN
> SEC-1 sekarang. Bila detail di checklist berbeda dari brief ini,
> keduanya SEPADAN — ikuti yang lebih spesifik; ragu → tulis pertanyaan
> di LAPORAN dan berhenti.

Basis temuan: `docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md` +
`docs/HARDENING-CHECKLIST.md`. Kerjakan berurutan, TIAP item + spec/uji:

1. **CORS whitelist** (main.ts): `origin: true` → daftar origin dari env
   `CORS_ORIGINS` (koma-separated); dev tetap izinkan localhost. Tambah
   ke `.env.example` — TAPI `.env.example` milik wilayah AGENT-2; kamu
   cukup CATAT env baru di laporan, JANGAN edit .env.example.
2. **APP_GUARD global** (app.module.ts): daftarkan SessionAuthGuard
   sebagai APP_GUARD; controller/route publik (login, auth/config,
   /uploads static) diberi dekorator `@Public()` (buat decorator + adaptasi
   guard agar melewati route @Public). Pastikan SEMUA endpoint lain kini
   ter-guard walau lupa @UseGuards.
3. **synchronize kondisional** (app.module.ts): `synchronize:
   process.env.NODE_ENV !== 'production'`. Di prod pakai migration/manual.
   Dokumentasikan konsekuensi di laporan (skema prod tidak auto-sync).
4. **Body limit** (main.ts): turunkan JSON limit dari 6mb ke 1mb; upload
   multipart tetap lewat Multer (5mb) — pastikan import Excel & foto tetap
   jalan (uji e2e import-wizard & image-uploader HARUS tetap hijau).
5. **RolesGuard fail-closed** (common/roles.guard.ts): bila route TANPA
   @Roles DAN bukan @Public → TOLAK (bukan izinkan). Audit: pastikan tak
   ada route sah yang jadi 403 (jalankan SELURUH suite e2e).
6. **Upload magic-byte** (uploads.controller.ts): selain MIME header,
   verifikasi magic bytes (jpg/png/webp) dari buffer; tolak bila tak cocok.

**Aturan SEC-1:** tiap perubahan WAJIB tidak memecah suite e2e yang ada.
Setelah semua: `docker compose down -v` → `up -d --build` → FULL suite
Playwright hijau (desktop+mobile) + tambah `security.spec.ts` (endpoint
tanpa token = 401; route @Public tetap 200). Env baru dicatat di laporan.

## HUTANG KECIL (kerjakan lebih dulu, cepat)
- `npm run build` di `frontend/` → tempel ringkasan daftar chunk + ukuran
  di laporan (§12.15d — hutang dari T16; main bundle harus ~257KB,
  leaflet chunk terpisah).

## DoD
Suite e2e penuh hijau ×2 dari DB kosong + security.spec baru + laporan
per item + daftar chunk. Env baru dilaporkan (bukan diedit ke .env.example).
Berhenti bila menemukan bug yang butuh keputusan planner.

## LAPORAN
<!-- AGENT-1 append di bawah baris ini. Jangan hapus entri lama. -->

### [AGENT-1] SEC-1 — DIKERJAKAN (2026-07-17 05:16)

**HUTANG KECIL — SELESAI.** `npm run build` di `frontend/` dijalankan
bersih (`tsc -b && vite build`, 104 modul, build 5.15s). Ringkasan
chunk (terbesar → kecil, gzip disertakan):

| Chunk | Ukuran | Gzip |
|---|---|---|
| `index-*.js` (main bundle) | 257.82 kB | 79.78 kB |
| `leaflet-src-*.js` (chunk terpisah) | 149.98 kB | 43.55 kB |
| `leaflet-*.css` | 15.04 kB | 6.38 kB |
| `index-*.css` | 29.97 kB | 6.19 kB |
| `PengaturanLiburPage-*.js` | 16.52 kB | 4.97 kB |
| `ImportPage-*.js` | 10.45 kB | 2.91 kB |
| `SiswaFormPage-*.js` | 9.98 kB | 3.24 kB |
| `JadwalKbmPage-*.js` | 9.93 kB | 3.01 kB |
| `KelasDetailPage-*.js` | 9.55 kB | 3.23 kB |
| ... 40+ chunk halaman/komponen lain, masing-masing < 8.7 kB | — | — |

Main bundle **257.82 kB** — sesuai target §12.15d (~257KB). Leaflet
sudah terpisah otomatis (code-splitting via lazy-loaded map component),
tidak membengkakkan main bundle. **Tidak ada regresi ukuran bundle.**

---

**SEC-1 (item 1–6) — DIBERHENTIKAN, MENUNGGU.** Brief ini secara
eksplisit mensyaratkan: *"Basis temuan: `docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md`
+ `docs/HARDENING-CHECKLIST.md` (dibuat AGENT-2; bila checklist belum
ada, TUNGGU — jangan menebak)."*

Saya cek `docs/`: hanya `AUDIT-KEAMANAN-PRA-PRODUKSI.md` yang ada.
**`docs/HARDENING-CHECKLIST.md` BELUM ADA** (AGENT-2 belum membuatnya).

Sesuai instruksi eksplisit brief, saya TIDAK menebak detail
implementasi 6 item SEC-1 (CORS whitelist, APP_GUARD global,
synchronize kondisional, body limit, RolesGuard fail-closed, upload
magic-byte) dan TIDAK menyentuh `backend/src` atau `frontend/src`
untuk task ini. Saya hanya membaca (tanpa mengubah)
`docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md` untuk konteks — audit tsb sudah
mengonfirmasi kembali semua 6 temuan (TINGGI-1, TINGGI-2, SEDANG-2,
SEDANG-3, SEDANG-4, RENDAH-1) yang jadi dasar item 1–6 di brief ini.

**Menunggu**: `docs/HARDENING-CHECKLIST.md` dari AGENT-2 sebelum
melanjutkan eksekusi SEC-1 item 1–6. Tidak ada bug yang butuh
keputusan planner — murni menunggu dependensi antar-agent.
