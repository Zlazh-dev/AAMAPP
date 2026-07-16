# DOKUMEN AGENT-2 (Cline) — AAMAPP

> Baca HANYA file ini. JANGAN membaca PROMPT_AGENT.md atau SPEC-KANON.md
> UTUH (besar → bisa loop). Semua yang kamu butuhkan ada di sini. Laporan
> = APPEND di `## LAPORAN` bawah ini — JANGAN pernah menyimpan-ulang file
> lain secara utuh (insiden 2026-07-16: dokumen kanon tertimpa jadi 2
> baris karena klaim ditulis sebagai file-baru; APPEND saja).

## Identitas & wilayah
- Kamu AGENT-2. Tool: Cline. Wilayah TULIS: HANYA `docs/`.
- Tugas BACA-SAJA terhadap kode (boleh baca `backend/`, `frontend/`).
- JANGAN sentuh: kode, e2e, compose, scripts, deploy, planning, briefs
  lain, PROMPT_AGENT.md, SPEC-KANON.md.
- DILARANG `docker compose` apa pun. DILARANG `npm audit fix` (mengubah
  lockfile = wilayah kode).
- Sebelum mulai: append `DIKERJAKAN (jam)` di `## LAPORAN` file INI.

## TUGAS AKTIF — OPS-4 (audit npm + hardening checklist + koreksi kamus)

1. **npm audit** — jalankan `npm audit` di folder `backend/` DAN
   `frontend/` (baca-saja, TANPA fix). Tambahkan bagian "Area (i) —
   hasil npm audit" ke `docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md`: tabel
   ringkas kerentanan tingkat TINGGI/KRITIS saja (paket, versi
   terpasang, advisory/CVE, dampak singkat, apakah fix tersedia).
2. **`docs/HARDENING-CHECKLIST.md`** (BARU) — ubah backlog SEC-1 jadi
   checklist actionable; AGENT-1 akan mengeksekusinya, jadi tulis
   sepresisi mungkin. Item (semua post-F1):
   - CORS whitelist via env — `main.ts` sekitar `origin: true`.
   - APP_GUARD global SessionAuthGuard + decorator `@Public()` — `app.module.ts`.
   - `synchronize: false` utk production (NODE_ENV) — `app.module.ts`.
   - Body limit JSON 6mb → 1mb — `main.ts` (json/urlencoded limit).
   - Upload magic-byte (tambahan; MIME header-whitelist SUDAH ada di
     `uploads.controller.ts`).
   - RolesGuard fail-closed bila tanpa @Roles & bukan @Public —
     `common/roles.guard.ts`.
   Format per item: `[ ] Judul` — kondisi sekarang (file, apa yang ada)
   → perubahan pasti → env baru yang dibutuhkan → risiko bila tidak
   dikerjakan → dampak ke e2e (spec mana yang harus tetap hijau).
3. **Koreksi `docs/KAMUS-DATA.md`** — DUA "deviasi terdeteksi" TERBUKTI
   SALAH: `tahun_ajaran` PUNYA kolom `semester`
   (`backend/src/tahun-ajaran/tahun-ajaran.entity.ts`) dan `siswa` PUNYA
   kolom `agama` (`backend/src/siswa/siswa.entity.ts`). Baca ULANG semua
   `backend/src/**/*.entity.ts`, hapus/koreksi 2 deviasi palsu, dan
   pastikan seluruh kamus 100% cocok kode aktual (kolom, tipe, null/
   unique/default, FK+onDelete).
4. Verifikasi tiap file docs benar-benar ADA di repo (mis. `dir`)
   sebelum melapor.

## DoD
`docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md` (bagian npm audit ditambah),
`docs/HARDENING-CHECKLIST.md` (baru), `docs/KAMUS-DATA.md` (dikoreksi) —
ketiganya ADA & akurat + laporan per butir 1–4 di `## LAPORAN`.

## LAPORAN
<!-- AGENT-2 append di bawah baris ini. Jangan hapus entri lama. -->
