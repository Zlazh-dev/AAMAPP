# BRIEF AGENT-1 — T16-SPRINT LANJUTAN (tag laporan: [AGENT-T16])

> Briefing ringkas dari PROMPT_AGENT.md (kanon). Bila bertentangan,
> PROMPT_AGENT.md menang. JANGAN membaca seluruh PROMPT_AGENT.md —
> semua yang kamu butuhkan ada di file ini.

## Identitas & aturan
- Kamu AGENT-1. Wilayah TULIS: `backend/src`, `frontend/src`, `e2e/`,
  `docker-compose.yml` (dev). JANGAN sentuh: `scripts/`, `deploy/`,
  `docs/`, `planning/`, `briefs/`.
- SEBELUM mulai: tambahkan 1 baris klaim di PALING BAWAH PROMPT_AGENT.md:
  `### [AGENT-T16] T16-SPRINT lanjutan — DIKERJAKAN` (append saja, jangan
  membaca/mengubah bagian lain).
- DILARANG menimpa file yang bukan buatanmu (bentrok nama → sufiks `-B`).
- Test e2e: `npx playwright test` (folder `frontend/e2e/`); aturan: tanpa
  sleep buta, selector label/role, data via API hook, spec self-contained.

## Konteks posisi terakhirmu
BUG-A (tombol hapus mapel) + BUG-B (ganti guru penugasan) sudah kamu fix;
suite 22/22 hijau. Sisa pekerjaan di bawah.

## Langkah (berurutan, tanpa menunggu konfirmasi antar-poin)
1. `q=` daftar siswa: pastikan mencocokkan nama|nis|nisn (ILIKE OR di
   siswa.service) + assertion cari-via-NIS di siswa-crud.spec.
2. Spec sel matriks tersisa (viewport desktop 1280 + mobile 375 bila UI):
   - `jadwal-crud.spec`: via UI grid — tambah slot (panel, AdaptiveSelect
     paket+jam) → edit → hapus; bentrok KELAS & bentrok GURU → assert
     pesan 409 tampil DI DALAM panel; mobile: pemilih hari.
   - `pengaturan.spec`: 5 sub (sekolah/jam/lokasi/kkm/TA-list) — ubah →
     Simpan → reload → nilai memantul + teks "Terakhir disimpan oleh".
     Lokasi: klik peta → input lat/lng berubah.
   - `tahun-ajaran.spec`: tambah (berakhir di halaman sukses) → AKTIFKAN
     (ConfirmDialog) → hanya 1 aktif → hapus TA aktif = 409.
   - `akun.spec`: tambah akun (RoleSelector) → ubah peran → cabut sesi →
     baris hilang → hapus akun.
   - Libur: sudah tercakup gelombang-1 (tandai/rentang/hapus) — cukup
     petakan di tabel matriks; + spec kecil banner cek-nasional dengan
     conditional-skip bila egress diblokir.
3. FRESH START: `docker compose down -v` → `up -d --build` → jalankan
   FULL suite dari DB kosong DUA KALI berturut — semua hijau (+skip
   tercatat).
4. Eksekusi checklist T16 via API (token admin): buat TA 2026/2027 Sem 1
   + aktifkan → 3 mapel → 4 guru + 6 siswa + 2 kelas → wali + force →
   nonaktifkan 1 siswa → paket 1 guru 2 kelas + duplikat 409 + ganti
   guru → 3 sesi jadwal + bentrok kelas + bentrok guru → pengaturan 6
   sub → AKUN UJI: 1 akun `kurikulum` + 1 akun `guru` → login masing2 →
   kurikulum BISA mapel/penugasan/jadwal tapi 403 POST /api/admin/guru;
   guru 403 semua endpoint tulis → import: file xlsx uji 3 valid + 2
   rusak → preview errors per baris → commit {tersimpan:3, dilewati:2}
   → cek audit berlabel Bahasa Indonesia.
5. Bersih-bersih data uji (kecuali activity_logs; akun uji dihapus) +
   update README.
6. LAPORAN FINAL — append di PALING BAWAH PROMPT_AGENT.md:
   `### [AGENT-T16] T16 — <tanggal>` berisi: hasil PER POIN 1–15
   (poin 12 & 15 tulis "menunggu QA user"), TABEL MATRIKS (entitas ×
   tambah/edit/hapus/assign → nama spec per sel), daftar chunk build
   `vite build`, dan DAFTAR SEMUA bug yang ditemukan-diperbaiki
   sepanjang T16.

## DoD
Suite penuh hijau ×2 dari DB kosong + laporan final lengkap di
PROMPT_AGENT.md. Berhenti hanya bila menemukan bug yang butuh keputusan.
