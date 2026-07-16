# PROMPT_AGENT.md — PUSAT KOORDINASI AAMAPP (HUB)

> Proyek: AAMAPP — Ekosistem Sekolah SMP IT Asy-Syadzili
> (Presensi • Kurikulum • Kesiswaan • Administrasi).
> Dokumen ini SENGAJA RINGKAS. Instruksi kerja tiap agent ada di dokumen
> masing-masing (lihat PAPAN TUGAS). Spesifikasi & keputusan lengkap ada
> di `SPEC-KANON.md`.

## ATURAN KEPEMILIKAN (keras)

- **PLANNER (Claude)**: satu-satunya yang boleh MENGUBAH dokumen ini,
  `SPEC-KANON.md`, dan bagian TUGAS di `briefs/AGENT-*.md`.
- **AGENT**: HANYA membaca dokumen agent-nya sendiri
  (`briefs/AGENT-<n>.md`) + meng-APPEND laporan di bagian `## LAPORAN`
  dokumen agent-nya sendiri. DILARANG mengubah dokumen ini, SPEC-KANON,
  atau dokumen agent lain. DILARANG menyimpan-ulang/menulis-ulang file
  apa pun secara utuh yang bukan buatannya (insiden 2026-07-16: kanon
  6.114 baris tertimpa jadi 2 baris).
- **USER**: pemilik produk; komunikasi via chat planner; QA visual.

## STATUS PROYEK (2026-07-17)

- ✅ **F0** fondasi+auth • ✅ **F1** data induk+kurikulum-jadwal+pengaturan
  (T11–T16; e2e Playwright 36 pass/2 skip ×2 dari DB kosong).
- 🔶 Menunggu: QA visual user (T16 poin 12 & 15) → verdict F1 TUNTAS.
- ▶️ Berjalan: SEC-1 (AGENT-1), OPS-4 (AGENT-2), RISET-F3 (AGENT-3).
- ⏭️ Berikutnya: kickoff F2 presensi siswa (bahan: `planning/F2-RISET-*.md`).
- Git: aktif sejak 2026-07-17 (commit `0cd29b8`); planner commit tiap
  tugas lolos review.

## PAPAN TUGAS

| Agent | Tool | Dokumen tugas | Tugas aktif | Status |
|---|---|---|---|---|
| AGENT-1 | Antigravity | `briefs/AGENT-1.md` | SEC-1 hardening + hutang chunk build | DITUGASKAN |
| AGENT-2 | Cline | `briefs/AGENT-2.md` | OPS-4 (npm audit + hardening checklist + koreksi kamus) | DITUGASKAN |
| AGENT-3 | Roo Code | `briefs/AGENT-3.md` | RISET-F3 (presensi wajah guru) | DITUGASKAN |

Planner memperbarui papan ini setiap ada perubahan; agent TIDAK mengubah
papan — status "SELESAI" ditulis planner setelah review laporan.

## DOKUMEN RUJUKAN

- `SPEC-KANON.md` — spesifikasi & keputusan lengkap (badan v0.9 + ZONA
  REKONSTRUKSI; bila bertentangan, zona rekonstruksi menang).
- `docs/` — arsitektur, kamus data, API reference, audit keamanan.
- `planning/` — riset F2/F6 (+F3 menyusul) & pertanyaan terbuka.
- `deploy/`, `scripts/` — produksi & backup. `backups/` — artefak pemulihan.

## ATURAN INTI LINTAS-AGENT (rincian di SPEC-KANON §12 & Zona 2)

1. KLAIM sebelum kerja: tulis 1 baris `DIKERJAKAN (jam)` di bagian
   LAPORAN dokumen agent-mu; tugas SELESAI tidak diulang.
2. Verifikasi file benar-benar ada di repo sebelum melapor; klaim harus
   cocok dengan keadaan repo.
3. Semua UI Bahasa Indonesia; error bermakna; aturan UI v0.10–v0.12
   (sidebar datar, satu tombol aksi, SaveSuccess, AdaptiveSelect,
   PageContainer, portal dropdown) — lihat SPEC-KANON Zona 2A.
4. §12.15 lazy (library berat dilarang di bundle utama) • §12.16
   performa data (filter+paginasi level DB, anti N+1, anti DTO-drift,
   cache SWR) • §12.17 e2e Playwright = gerbang tiap fase.
5. RBAC ditegakkan server; audit log tiap mutasi; WIB.
6. Jangan bekerja di luar tugas tertulis; ambigu → tulis pertanyaan di
   LAPORAN dan berhenti.

## RIWAYAT VERSI HUB

- 1.0 (2026-07-17): Hub dibentuk (usul user) — kanon lama dipindah ke
  SPEC-KANON.md; instruksi per-agent dipecah ke briefs/AGENT-{1,2,3}.md.
