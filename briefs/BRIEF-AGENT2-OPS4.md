# BRIEF AGENT-2 — OPS-4 (tag laporan: [AGENT-OPS])

> Briefing ringkas dari PROMPT_AGENT.md (kanon). Bila bertentangan,
> PROMPT_AGENT.md menang. JANGAN membaca seluruh PROMPT_AGENT.md —
> semua yang kamu butuhkan ada di file ini.

## Identitas & aturan
- Kamu AGENT-2. Tugas BACA-SAJA terhadap kode. Wilayah TULIS: HANYA
  `docs/`. JANGAN sentuh: `backend/src`, `frontend/src`, `e2e/`,
  `scripts/`, `deploy/`, `planning/`, `briefs/`, compose.
- DILARANG menjalankan `docker compose` apa pun (AGENT-1 sedang T16).
- DILARANG `npm audit fix` (mengubah lockfile = wilayah kode).
- SEBELUM mulai: append 1 baris klaim di PALING BAWAH PROMPT_AGENT.md:
  `### [AGENT-OPS] OPS-4 — DIKERJAKAN`.
- Catatan: tugas RISET-F6 kemarin ternyata duplikat window lain —
  JANGAN sentuh `planning/` lagi.

## Langkah
1. `npm audit` di `backend/` dan `frontend/` (baca-saja) → tambahkan
   bagian "Area (i) — npm audit" di `docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md`:
   tabel ringkas kerentanan tingkat TINGGI/KRITIS saja (paket, versi,
   CVE/advisory, dampak singkat, fix tersedia?).
2. Buat `docs/HARDENING-CHECKLIST.md` — ubah backlog SEC-1 jadi checklist
   actionable. Item SEC-1 (semua post-F1, jangan di-fix sekarang):
   (a) CORS whitelist via env (main.ts:59-60 `origin: true`);
   (b) APP_GUARD global SessionAuthGuard (app.module.ts);
   (c) `synchronize: false` utk production via NODE_ENV (app.module.ts);
   (d) body limit turunkan dari 6mb (main.ts:22-23);
   (e) upload magic-byte check (uploads.controller.ts — MIME whitelist
       header-based SUDAH ADA, ini penguatan);
   (f) RolesGuard fail-closed bila tanpa @Roles (common/roles.guard.ts).
   Format per item: [ ] nama — file:baris sekarang → perubahan pasti →
   env baru yang dibutuhkan (utk .env.example prod) → risiko bila tidak.
3. Koreksi `docs/KAMUS-DATA.md` — dua "deviasi terdeteksi" TERBUKTI
   SALAH (verifikasi planner): tahun_ajaran PUNYA kolom `semester`
   (tahun-ajaran.entity.ts:27) dan siswa PUNYA kolom `agama`
   (siswa.entity.ts:39). Baca ulang SEMUA `backend/src/**/*.entity.ts`,
   perbaiki bagian deviasi agar akurat 100% terhadap kode aktual.
4. Verifikasi semua file benar-benar ada di repo (dir/list) SEBELUM
   melapor.
5. LAPORAN — append di PALING BAWAH PROMPT_AGENT.md:
   `### [AGENT-OPS] OPS-4 — <tanggal>` per butir 1–3 + bukti.

## DoD
2 file docs diperbarui/dibuat + akurasi kamus-data diperbaiki + laporan.
