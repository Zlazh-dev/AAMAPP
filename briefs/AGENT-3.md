# DOKUMEN AGENT-3 (Roo Code) — AAMAPP

> Baca HANYA file ini. JANGAN membaca PROMPT_AGENT.md atau SPEC-KANON.md
> UTUH (besar → bisa loop). Semua yang kamu butuhkan ada di sini + di §
> yang dikutip. Laporan = APPEND di `## LAPORAN` bawah ini; JANGAN pernah
> menyimpan-ulang file lain secara utuh.

## Identitas & wilayah
- Kamu AGENT-3. Tool: Roo Code. Wilayah TULIS: HANYA `planning/`.
- Tugas BACA-SAJA terhadap kode + `SPEC-KANON.md` (boleh baca BAGIAN
   tertentu — cari heading §, JANGAN muat seluruh file).
- JANGAN sentuh: kode, e2e, compose, docs, deploy, scripts, briefs lain,
   PROMPT_AGENT.md, SPEC-KANON.md. DILARANG `docker compose`.
- Sebelum mulai: append `DIKERJAKAN (jam)` di `## LAPORAN` file INI.

## Konteks singkat proyek
F0+F1 selesai (data induk, kurikulum-jadwal, pengaturan). F2 (presensi
siswa per KBM) & F6 (rapor) sudah diriset (lihat
`planning/F2-RISET-PRESENSI-SISWA.md`, `planning/F6-RISET-RAPOR.md` +
`-B`). Tugasmu sekarang: riset **F3 — presensi HARIAN GURU via WAJAH**.

## TUGAS AKTIF — RISET-F3 (presensi wajah guru)
MURNI RISET DARI KODE + spec (SPEC-KANON §4 keputusan teknologi wajah, §6.3
presensi guru dua lapis, §6.7 jalur gagal, §8.4 token kiosk, §15.2 kiosk).
Tulis `planning/F3-RISET-PRESENSI-WAJAH.md`, jawab dengan bukti file:baris
(kode) + kutipan § (spec):

1. **Arsitektur wajah (§4):** @vladmandic/human di browser (deteksi +
    embedding + liveness); MATCHING di server (cosine similarity); video
    TIDAK pernah dikirim. Petakan: apa yang jalan di klien vs server;
    di mana embedding referensi disimpan (usulan entitas). Ingat prinsip
    "komputasi boleh di klien, KEPERCAYAAN harus di server" — matching &
    keputusan hadir WAJIB di server.
2. **Dua permukaan kamera (§6.3, §15.2):** KIOSK 1:N (token perangkat
    §8.4, tanpa idle timeout, hanya endpoint scan+heartbeat) vs HP 1:1
    (vs embedding sendiri). Enrollment `/admin/wajah/:guru` (3–5 capture
    pose otomatis). Semua capture OTOMATIS (tanpa tombol jepret) —
    dokumentasikan implikasi UI. Presensi HP = OVERLAY fullscreen (bukan
    route).
3. **Geofence (§6.3):** verifikasi lokasi HANYA jalur HP (kiosk tidak);
    geolokasi SEBELUM kamera; pakai `pengaturan.lokasi` {aktif,lat,lng,
    radiusMeter} yang SUDAH ada di F1. Jarak tercatat utk audit.
4. **Status & jalur gagal (§6.3, §6.7):** check-in/out, HADIR/TERLAMBAT
    dari `pengaturan.jam_presensi`; gagal 3× → manual NIP → PENDING; belum
    enroll → jalur manual; kiosk offline → antrean lokal + sinkron jam
    asli (implikasi: kiosk offline TIDAK boleh klaim identitas sebelum
    sinkron); model gagal → manual penuh. Kaitan ke jadwal_kbm (§6.5:
    ada KBM tanpa presensi = ALPHA; tanpa KBM = LIBUR).
5. **Privasi/retensi:** embedding = data biometrik di server; usulkan
    kebijakan hapus saat guru nonaktif/dihapus; token kiosk pairing 6
    digit (§8.4).
6. **Pola WAJIB (kutip kode):** RolesGuard peran `guru`; token perangkat
    (baru — beda dari session); audit; DTO; §12.15 (@vladmandic/human
    BERAT — WAJIB dynamic-import, DILARANG di bundle utama); §12.16
    (endpoint scan bisa sering → paginasi/rate); §12.17 e2e (tantangan:
    wajah sulit di-e2e — usulkan strategi mock embedding).
7. **USULAN (utk diputuskan PLANNER):** entitas (enrollment/embedding,
    presensi_harian_guru, perangkat_kiosk) +kolom+relasi+onDelete;
    endpoint + RBAC + token kiosk; halaman UI; **DAFTAR PERTANYAAN
    TERBUKA** utk keputusan user sebelum F3 dibuka (mis. ambang cosine,
    liveness level, retensi, jumlah pose, perilaku offline).

## DoD
`planning/F3-RISET-PRESENSI-WAJAH.md` ADA di repo (verifikasi sebelum
lapor) + laporan di `## LAPORAN`. Output = temuan + usulan + pertanyaan;
PLANNER & USER yang memutuskan. Bila konteks tak cukup memuat suatu §,
laporkan bagian yang belum terjawab — jangan mengarang.

## TUGAS BERIKUTNYA — RISET-F4 (izin, alpha/libur otomatis, dashboard, laporan/export, rekap TU, kepsek)

RISET-F3 SUDAH SELESAI & diterima. Tugas berikut: riset **F4**. MURNI
RISET DARI KODE + spec (baca BAGIAN: SPEC-KANON §6.5 izin/libur/cutoff,
§6.6 monitor & laporan, §8.2 RBAC, §10 modul TU; + KAMUS-DATA/API-REF di
`docs/` bila perlu). Tulis `planning/F4-RISET-IZIN-LAPORAN.md`, jawab
dengan bukti file:baris (kode) + kutipan § (spec):

1. **Izin guru + pengganti:** alur ajukan → approve (Admin ATAU Kepsek,
    §8.2) → KBM "guru berhalangan" → pengganti mengisi roster (kaitan ke
    presensi F2/F3). Usulan entitas izin + status; siapa boleh approve.
2. **Alpha/libur OTOMATIS (turunan, §6.5):** cutoff WIB → guru ada KBM
    tanpa presensi tanpa izin = ALPHA; tanpa KBM = LIBUR; KBM lewat tanpa
    roster = KOSONG. Petakan sumber datanya (jadwal_kbm + kalender_libur +
    presensi F2/F3 + izin) — semua TURUNAN, bukan kolom statis. Ini
    ketergantungan besar ke F2/F3 (riset di planning/F2, F3).
3. **Koreksi presensi + verifikasi pending (§6.6, §8.2):** admin koreksi
    presensi manual NIP pending; audit.
4. **Dashboard (§6.6):** kartu agregat guru (H/T/I/A/Libur), KBM
    (terlaksana/kosong), siswa hari ini; feed realtime; "perlu perhatian".
    Query agregat apa yang dibutuhkan (patuh §12.16 — level DB).
5. **Laporan + export (§6.6):** HUB laporan → sub-halaman (harian guru %,
    per-KBM keterlaksanaan, siswa per mapel/kelas). Export Excel/PDF
    berkop — identifikasi library (exceljs sudah ada utk import; PDF?
    §12.15 lazy/berat). Usulan, bukan keputusan.
6. **Rekap TU (§10):** rekap presensi harian guru → basis gaji (hitung di
    LUAR sistem) + export; peran `tu` (§8.2). Kaitan ke presensi harian
    guru F3.
7. **Area Kepsek (§8.2):** BACA-SEMUA dashboard & laporan; approve izin
    guru; nama/NIP dari profil_sekolah utk dokumen cetak.
8. **Pola WAJIB (kutip kode):** RBAC (admin/kepsek/tu + baca-saja lintas
    peran pola kehadiran-guru), audit, cache SWR, lazy, komponen v0.12.x,
    §12.16 agregasi level DB, §12.17 e2e.
9. **USULAN (utk PLANNER):** entitas (izin, koreksi/verifikasi;
    presensi_harian_guru diasumsikan dari F3) +relasi+onDelete; endpoint +
    RBAC; halaman UI (§15.3/15.5/15.7); **DAFTAR PERTANYAAN TERBUKA**.

DoD: `planning/F4-RISET-IZIN-LAPORAN.md` ADA (verifikasi sebelum lapor) +
laporan `[AGENT-RISET] RISET-F4` di LAPORAN. Bila suatu § tak termuat di
konteks, laporkan bagian yang belum terjawab — jangan mengarang.

## LAPORAN
<!-- AGENT-3 append di bawah baris ini. Jangan hapus entri lama. -->
[AGENT-RISET-F3] 2026-07-16T22:24:00+07:00 — ✅ SELESAI
- File riset dibuat: planning/F3-RISET-PRESENSI-WAJAH.md
- Isi: arsitektur wajah (client-side @vladmandic/human, server-side cosine similarity), dua permukaan kamera (kiosk 1:N vs HP 1:1), geofence (HANYA jalur HP), status & jalur gagal (check-in/out dari jam_presensi, 3× gagal → manual NIP → PENDING), privasi/retensi (embedding biometrik, hapus saat guru nonaktif), pola wajib (RolesGuard guru, token perangkat beda dari session, audit, DTO, dynamic-import berat, paginasi/rate limiting, mock embedding untuk e2e), usulan entitas (guru.faceEmbedding, device_kiosk, presensi_harian_guru), endpoint RBAC (/api/guru/presensi-scan, /admin/presensi-guru/harian, manual, device-kiosk CRUD), halaman UI (tambah tab Kiosk di /admin/perangkat, enrollment di /admin/wajah, tombol besar di /guru, tab Harian/Verifikasi Pending di /admin/presensi-guru), pertanyaan terbuka (ambang cosine, level liveness, retensi, jumlah pose, perilaku offline kiosk, presensi HP tanpa geofence, toleransi waktu)
[AGENT-RISET-F4] 2026-07-17T06:29:00+07:00 — ✅ SELESAI
- File riset dibuat: planning/F4-RISET-IZIN-LAPORAN.md
- Isi: izin guru + pengganti (alur ajukan→approve→guru berhalangan→pengganti), alpha/libur otomatis (turunan dari jadwal_kbm+kalender_libur+presensi+izin, bukan kolom statis), koreksi presensi+verifikasi pending (manual NIP→PENDING→setujui, audit), dashboard (kartu agregat guru/KBM/siswa, feed realtime, perlu perhatian, query agregat level DB), laporan+export (HUB laporan→sub-halaman harian guru%/per-KBM keterlaksanaan/siswa per mapel/kelas, export Excel/PDF berkop, exceljs sudah ada, PDF perlu library + lazy loading), rekap TU (basis gaji dari presensi harian guru F3, export luar sistem, peran tu), area kepsek (BACA-SEMUA dashboard/laporan, approve izin, nama/NIP dari profil_sekolah), pola wajib (RBAC kehadiran-guru, audit, cache SWR, lazy, komponen v0.12.x, agregasi level DB, e2e Playwright), usulan entitas (izin_guru), endpoint RBAC (/api/izin/guru CRUD + setujui/tolak, hanya admin/kepsek), halaman UI (form izinkan guru, HUB admin/kepsek dengan tab status, detail izin, dashboard diperbarui, HUB laporan dengan sub-halaman, halaman rekap TU), pertanyaan terbuka (jenis izin, sistem pengganti otomatis, batas waktu ajukan izin, persetujuan multi-level, lampiran izin, notifikasi, export PDF library, rekap TU frekuensi, akses kepsek, koreksi presensi batas waktu)
