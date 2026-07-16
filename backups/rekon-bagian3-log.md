

## ZONA REKONSTRUKSI — BAGIAN 3: KRONIK LOG T9→T15.9 [REKONSTRUKSI — ringkasan setia; teks asli hilang dalam insiden. Laporan T16 asli ada VERBATIM di tail dokumen ini]

- **T9–T10 (13–14 Jul):** guard navigasi ConfirmDialog adaptif; T10
  awalnya DITOLAK planner (2/5) → T10 ULANG lolos → **KEPUTUSAN USER
  v0.10.4: TANPA TAB + PageMenu ⋮ + FilterBar** → F0 TUNTAS, F1 dibuka.
- **T11 (14 Jul): DITOLAK planner.** Agent memakai spec halusinasi:
  peran hantu operator/wali/siswa, entitas wali terlarang, seed
  terlarang (MTs Ash-Sholihah!), path tanpa /api/admin, import tanpa
  preview. → **T11-FIX 16 butir**, lolos dalam 2 ronde + Fase 7
  (entitas kurikulum + /api/kurikulum/mapel + import 3-langkah +
  @Unique(nama,semester) TA + IsNull-lesson belum saat itu).
- **T12 (14–15 Jul):** backend kurikulum. Review kode planner menemukan
  8 perbaikan wajib (terbesar: bentrok GURU lintas kelas tidak ada;
  DELETE penugasan cascade diam-diam; KKM per-mapel di luar spec
  dihapus). T12-FIX + smoke 16/16 → **LOLOS**. Bug DI ImportModule
  (Session/User forFeature) ditemukan saat down -v pertama.
- **T13 (15 Jul):** frontend data induk (13 halaman, ImageUploader,
  SearchSelect, import wizard, pindah-multi ber-progress) — **LOLOS**
  terhadap spec saat dikerjakan. Disusul **T13-UX**: retrofit
  v0.12.0–0.12.4 (sidebar datar, SubPageLinks, satu tombol, SaveSuccess,
  AdaptiveSelect) — **LOLOS**.
- **T14 (15 Jul):** frontend pengaturan (hub 6 sub + updatedByName +
  TA form SaveSuccess). **T14-HOTFIX 9 butir** — bug kritis dari QA
  user: (1) bottom sheet mobile mati total (outside-click mousedown
  menutup sheet sebelum click — sheetRef whitelist); (2) ref ⋮
  tertimpa; (3) window.location.assign → useNavigate; (5) dropdown
  desktop terpangkas Card overflow-hidden → PORTAL (v0.12.7);
  (6) PageContainer (v0.12.8); (8) sesi dicabut masih tampil —
  `where {revokedAt: null as any}` DIABAIKAN TypeORM → IsNull();
  (9) dua tombol Simpan mobile + submit via hack DOM closest('.p-4')
  → atribut form= native. LOLOS PENUH (5 poin dikonfirmasi user).
- **T15 (15–16 Jul):** batch performa (0a lazy 420→257KB; 0b N+1 fix +
  paginasi users/sesi + cache SWR; 0c bottomBar; 0d peta Leaflet) +
  7 halaman kurikulum + kalender seleksi-multi + impor libur nasional.
  T15-FIX: dropdown flip melayang (tinggi taksiran → jangkar bottom) +
  klik peta mati (handler dalam kondisi lat/lng) + fitur rentang/bulk.
  T15-FIX-2: fokus input hilang per ketikan (komponen didefinisikan
  dalam body → hoist ke module scope) + tampilan rentang tergabung.
  **LOLOS** (laporan T15 lengkap + addendum diterima).
- **T15.9 (16 Jul):** setup Playwright + gelombang-1 3 spec (gate T15
  ditutup otomatis). Gelombang-2 berkembang menjadi ±38 spec.
  **LEDGER BUG PRODUKSI yang HANYA tertangkap e2e (justifikasi §12.17):**
  (1) tambah guru tanpa foto 400 (@IsOptional tak melewati '');
  (2) tambah guru dengan foto 400 (@IsUrl menolak path relatif
  /uploads/); (3) FORM SISWA MATI TOTAL — 16 field hilang dari DTO ×
  forbidNonWhitelisted; (4) edit mapel 400 (kirim state utuh berisi id/
  createdAt); (5) tombol Hapus mapel TIDAK ADA di UI (dialog kode mati);
  (6) tidak ada UI ganti guru penugasan; (7) getTahunAjaranAktif 404
  (path salah); (8) SearchSelect menutup sendiri ~3ms (scroll jinak
  dianggap scroll nyata); (9) penugasan create 400 (kontrak kelasIds
  batch vs per-kelas). SEMUA FIXED + ber-spec.
- **Paralel (16 Jul):** OPS-1 backup/restore+compose prod+runbook (lolos
  setelah koreksi README-DEPLOY yang awalnya tidak tertulis ke repo);
  OPS-2 audit keamanan (triase planner: 3 false-positive dikoreksi,
  sisanya → backlog SEC-1); OPS-3 dokumentasi (ARSITEKTUR/KAMUS-DATA/
  API-REFERENCE); OPS-4 (npm audit + hardening checklist) — status
  akhir OPS-4 belum dilaporkan ulang pasca-insiden; RISET-F2 & RISET-F6
  di planning/ (F6 dua versi akibat tabrakan — perlu MERGE planner).
- **INSIDEN (16 Jul malam):** PROMPT_AGENT.md 6.114 baris tertimpa jadi
  2 baris (klaim OPS-4 Cline ditulis sebagai file baru, bukan append).
  T16 tetap dieksekusi AGENT-1 via brief → laporan final VERBATIM ada
  di tail dokumen ini (36 passed/2 skipped ×2 dari DB kosong; 31/31
  assertion checklist; tanpa bug baru). Dokumen ini = hasil pemulihan
  17 Jul (basis v0.9 + zona rekonstruksi).
