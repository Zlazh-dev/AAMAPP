

## ZONA REKONSTRUKSI — BAGIAN 2: SEMUA KEPUTUSAN MENGIKAT v0.10–v0.12 + ATURAN BARU §12 (BERLAKU — menang atas badan v0.9 di atas)

### 2A. Aturan UI global (§15.0 versi final)

1. **TANPA TAB — seksi = SUB-HALAMAN ber-route (v0.10.4, FINAL).**
   Aplikasi tidak memakai tab bar sama sekali. Setiap "tab" di teks lama
   dibaca: sub-halaman ber-route. PENGECUALIAN SAH: pemilih hari
   segmented di jadwal (FILTER DATA dalam satu halaman — jangan dipecah
   jadi route per hari).
2. **SIDEBAR DATAR (v0.12.0, KEPUTUSAN USER).** Sidebar hanya berisi
   halaman utama per peran — TANPA grup collapsible. Sub-halaman diakses
   via deretan tautan teks `<SubPageLinks>` (+badge) di bawah header
   halaman utama (desktop) dan `<PageMenu>` ⋮ grup "Buka Halaman"
   (mobile). Seksi kerja harian membuka langsung daftar tersering
   (Data Orang → daftar Guru); seksi kumpulan alat = HUB kartu
   (Pengaturan, Laporan). Badge antrean menempel di entri utama. Setiap
   sub-halaman punya ← BackLink ke halaman utama seksinya.
3. **LARANGAN DERETAN TOMBOL (v0.12.1, KEPUTUSAN USER).** Maks SATU
   tombol aksi terlihat per halaman (aksi utama); sisanya masuk ⋮
   (destruktif merah paling bawah). Header detail = "Edit" + ⋮ berisi
   Hapus. PENGECUALIAN: Simpan/Batal form (vertikal, Simpan sticky),
   pasangan wizard Kembali/Lanjut, tombol tunggal dalam kartu, bar aksi
   seleksi-multi (pindah-multi siswa, kalender libur).
4. **⋮ ADAPTIF (v0.12.3).** Desktop = dropdown menempel tombol ⋮;
   mobile = bottom sheet. Satu komponen `<PageMenu>`; fokus kembali ke
   trigger saat tutup; link navigasi via useNavigate (SPA, tanpa reload).
5. **BOTTOM SHEET UTK SEMUA KONTROL PILIHAN DI MOBILE (v0.12.4).**
   Select form/SearchSelect/⋮/filter → mobile = bottom sheet (item
   ≥48px, centang terpilih, cari bila >8 opsi). `<select>` native
   DILARANG; komponen bersama `<AdaptiveSelect>`. Tanpa select bersarang
   dalam sheet (pakai chip/daftar). Kecuali input date/time native.
6. **DROPDOWN DESKTOP VIA PORTAL (v0.12.7).** Semua dropdown/popover
   desktop dirender portal ke body, posisi fixed dari getBoundingClientRect
   trigger (Card ber-overflow-hidden utk watermark — absolute pasti
   terpangkas); flip-atas = jangkar TEPI BAWAH panel ke atas trigger
   (bukan tinggi taksiran) + maxHeight di-clamp ruang tersedia;
   tutup/reposisi saat scroll NYATA (bandingkan posisi trigger, bukan
   event scroll jinak dari focus).
7. **`<PageContainer size>` (v0.12.8).** Konten SETIAP halaman dibungkus
   kontainer max-width + mx-auto: xl±1280 daftar/tabel; lg±1024 detail &
   form-2-kolom; md±768 wizard/form-1-kolom/hub/sukses; sm±640 fokus.
   Header ikut di dalam. Prop `bottomBar` menambah pb kompensasi bar
   sticky (konten tak boleh terkubur bar Simpan).
8. **`<SaveSuccess>` (v0.12.1).** Semua form tambah/edit entitas
   (guru/siswa/kelas/akun/mapel/penugasan/TA) berujung sub-halaman
   sukses: ikon centang + kalimat bernama; TAMBAH → "Tambah <Entitas>
   Lagi" + "Lihat Daftar"; EDIT → "Edit Data Lain" (→daftar) + "Lihat
   Detail". Teknis: route `/sukses` SEBELUM `/:id`; navigate REPLACE;
   UnsavedGuard dilepas dulu; tanpa state → redirect daftar.
   PENGECUALIAN: sub-halaman pengaturan (feedback inline + "Terakhir
   disimpan oleh {nama}" dari kolom updatedByName) & wizard import
   (punya ringkasan sendiri).
9. **Kalender libur = SELEKSI-MULTI lalu AKSI (KEPUTUSAN USER rev.2).**
   Klik tanggal = toggle seleksi (bukan buka dialog); bar aksi muncul di
   bawah saat seleksi ≥1 ("Tandai (n)" / "Hapus Penanda (m)" / Batal);
   "+ Rentang" MENAMBAH rentang ke seleksi; dialog keterangan satu utk
   semua; daftar libur menampilkan RENTANG TERGABUNG ("16–18 Jul 2026
   (3 hari)", groupLiburRentang — DB tetap per-tanggal) + hapus per
   baris. Impor libur nasional: tombol + banner deteksi-otomatis
   (cek diam-diam maks 1×/hari) → PRATINJAU checkbox → konfirmasi;
   TIDAK pernah auto-apply (estimasi sidang isbat/revisi SKB; kalender
   menggerakkan kewajiban presensi F2).
10. **Peta geofence = Leaflet + OpenStreetMap (KEPUTUSAN USER; Google
    Maps ditolak — butuh API key+billing).** circleMarker (ikon default
    rusak di bundler); klik peta = pindah titik (drag tidak didukung —
    tulis teks bantu); lingkaran radius live; gagal muat tile tidak
    memblokir input manual; dynamic-import hanya di halaman lokasi.

### 2B. Aturan wajib baru (§12.15–§12.17)

15. **LAZY LOAD**: semua route React.lazy + Suspense (kulit app eager);
    fallback skeleton + ErrorBoundary chunk ("Gagal memuat halaman" +
    "Muat Ulang"); library berat (Leaflet ✓; wajah F3, cetak F6, chart
    F4 nanti) WAJIB dynamic-import per halaman — dilarang di bundle
    utama; laporan tugas frontend menyertakan daftar chunk build; gzip
    nginx aktif.
16. **PERFORMA DATA**: (a) SEMUA endpoint daftar (semua modul, sekarang
    & mendatang: akun, sesi, log, presensi, demerit, nilai, rapor) =
    filter+paginasi LEVEL DB; q= dieksekusi server; dilarang find()
    tanpa where/take pada tabel bertumbuh; (b) dilarang N+1 — agregat
    per-baris = satu query GROUP BY; (c) cache frontend
    stale-while-revalidate di client.ts + hook useCachedList; mutasi
    menghapus cache ber-prefix resource; LRU ±50 entri; (d) cache
    backend in-process TTL 60 dtk utk pengaturan & TA aktif, di balik
    adapter; (e) REDIS DITUNDA (keputusan user) — revisit bila
    multi-instance/beban F2; (f) ANTI DTO-DRIFT: field yang dikirim form
    UI wajib ada di DTO backend pada tugas yang sama; spec CRUD e2e
    mengirim payload LENGKAP persis form (forbidNonWhitelisted membuat
    drift = form mati total).
17. **E2E PLAYWRIGHT (KEPUTUSAN USER)**: suite `frontend/e2e/`
    (@playwright/test, chromium; project desktop 1280 & mobile 375×812)
    = gerbang verifikasi akhir tiap fase; alur kritis baru wajib lahir
    bersama spec-nya; selector getByRole/Label/Text; dilarang sleep
    buta; test flaky = bug; login via helper API + storageState; data
    uji via API hook, self-contained (nama unik per run + cleanup),
    idempoten (lolos 2× berturut tanpa reset); MATRIKS CAKUPAN: sel
    entitas × tambah/edit/hapus/assign wajib diuji VIA UI bila ada
    halamannya (API-only hanya yang tanpa UI); sel gagal = bug
    diperbaiki, bukan test dilonggarkan.

### 2C. Protokol multi-agent (aktif sejak 2026-07-16)

- Executor: AGENT-1 = Antigravity (kuat; wilayah backend/src,
  frontend/src, e2e/, compose dev); AGENT-2 = Cline (wilayah scripts/,
  deploy/, docs/); AGENT-3 = Roo Code (wilayah planning/). Cline & Roo
  konteks kecil → WAJIB bekerja dari file brief kecil di `briefs/`
  (wilayah tulis planner) — DILARANG membaca dokumen kanon utuh.
- Tag laporan MENGIKUT TUGAS ([AGENT-T16]/[AGENT-OPS]/[AGENT-RISET]);
  prompt dari planner selalu diawali "Kamu AGENT-n".
- KLAIM TUGAS: cek log dulu; tulis 1 baris klaim "— DIKERJAKAN" sebelum
  mulai; tugas ber-status SELESAI tidak boleh diulang.
- DILARANG MENIMPA file yang bukan buatanmu — bentrok nama → sufiks -B
  + lapor. LAPORAN = APPEND di paling bawah dokumen ini (JANGAN PERNAH
  menulis-ulang/menyimpan-ulang seluruh dokumen — INSIDEN 2026-07-16:
  dokumen 6.114 baris tertimpa jadi 2 baris oleh klaim Cline yang
  ditulis sebagai file-baru).
- Verifikasi file benar-benar ada di repo sebelum melapor; klaim harus
  cocok dengan keadaan repo; planner memverifikasi silang semua klaim.

### 2D. Backlog & keputusan tertunda

- **SEC-1 (post-F1, sentuh backend/src):** CORS whitelist via env;
  APP_GUARD global; synchronize:false utk prod (NODE_ENV); body limit
  turun dari 6mb; upload magic-byte; RolesGuard fail-closed. Rincian:
  docs/HARDENING-CHECKLIST.md + docs/AUDIT-KEAMANAN-PRA-PRODUKSI.md
  (2 TINGGI, 4 SEDANG→1 direklas, 2 RENDAH; 3 false-positive sudah
  dikoreksi planner).
- **F2 & F6**: bahan riset lengkap di planning/F2-RISET-PRESENSI-SISWA.md
  dan planning/F6-RISET-RAPOR.md (+versi -B hasil pemulihan) — berisi
  usulan entitas & daftar pertanyaan terbuka utk kickoff.
- **Ops**: skrip backup/restore DB teruji (scripts/), compose prod
  (deploy/docker-compose.prod.yml) tervalidasi, runbook
  deploy/README-DEPLOY.md, .env.example lengkap.
- **GIT**: belum ada commit — disiplin commit per tugas MENUNGGU
  persetujuan user (planner sudah meminta 3×; insiden overwrite adalah
  bukti biayanya).
