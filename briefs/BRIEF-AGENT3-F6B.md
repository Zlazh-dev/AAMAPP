# BRIEF AGENT-3 — PEMULIHAN RISET-F6 VERSIMU (tag laporan: [AGENT-RISET])

> Briefing ringkas dari PROMPT_AGENT.md (kanon). Bila bertentangan,
> PROMPT_AGENT.md menang. JANGAN membaca seluruh PROMPT_AGENT.md —
> semua yang kamu butuhkan ada di file ini.

## Identitas & aturan
- Kamu AGENT-3. Wilayah TULIS: HANYA `planning/`. JANGAN sentuh kode,
  e2e, docs, deploy, scripts, briefs, compose. DILARANG `docker compose`.
- SEBELUM mulai: append 1 baris klaim di PALING BAWAH PROMPT_AGENT.md:
  `### [AGENT-RISET] F6-PEMULIHAN — DIKERJAKAN`.

## Konteks
File `planning/F6-RISET-RAPOR.md` VERSIMU (12 bagian: ringkasan temuan,
sumber turunan, pemetaan model §9 → entity [tujuan_pembelajaran,
penilaian, penilaian_tp, nilai_siswa, nilai akhir/deskripsi, nilai
katrol, rapor inti, kokurikuler+ekskul], KKM, ketidakhadiran dari F2,
finalisasi/penguncian [aturan, boundary transaksi, snapshot vs turunan],
PDF server-side, pola kode wajib, usulan endpoint, usulan UI, e2e matrix,
dan 27 PERTANYAAN TERBUKA — termasuk periode efektif semester, algoritme
deskripsi referensi, hak nilai katrol, aturan finalisasi tidak lengkap,
mapping A→TK, kokurikuler, kontrak PDF) — TERTIMPA oleh versi window
lain. Repo belum punya commit, jadi versimu hanya ada di konteks/memorimu.

## Langkah
1. JANGAN menimpa `planning/F6-RISET-RAPOR.md` yang ada sekarang (itu
   versi window lain — planner akan me-merge).
2. Tulis ulang VERSIMU selengkap yang bisa kamu rekonstruksi ke file
   BARU: `planning/F6-RISET-RAPOR-B.md`. Prioritas rekonstruksi:
   (a) 27 pertanyaan terbuka; (b) analisis `Penugasan` sebagai aggregate
   root + apa yang persisten vs turunan (override, status Final, alasan
   unlock, revision PDF = persisten & teraudit); (c) boundary transaksi
   finalisasi; (d) sisanya.
3. Verifikasi file ada di repo SEBELUM melapor.
4. LAPORAN — append di PALING BAWAH PROMPT_AGENT.md:
   `### [AGENT-RISET] F6-PEMULIHAN — <tanggal>` (ringkas: apa yang
   berhasil direkonstruksi, apa yang hilang permanen).

## DoD
`planning/F6-RISET-RAPOR-B.md` ada di repo + laporan. Bila ternyata
konteksmu sudah tidak memuat materi itu (tidak bisa direkonstruksi),
laporkan JUJUR "tidak dapat dipulihkan" — jangan mengarang ulang
seolah-olah itu versi asli.
