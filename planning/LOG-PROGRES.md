# LOG PROGRES

### [AGENT-3] RISET-F2 — 2026-07-16

**Status:** SELESAI.

- Membaca penugasan RISET-F2 dan kode aktual lintas backend, frontend, serta E2E tanpa mengubah wilayah kerja agent lain.
- Menghasilkan `planning/F2-RISET-PRESENSI-SISWA.md` berisi bukti file:baris tentang titik-tempel jadwal→presensi, identitas instans sesi tanggal nyata, roster turunan siswa aktif, WIB/kalender/TA/cutoff, status sesi turunan, hook R-07 dan rapor, pola audit/RBAC/DTO/cache/lazy/UI/E2E, usulan entitas/API/UI, serta pertanyaan terbuka.
- Temuan inti: `jadwal_kbm` saat ini hanya pola mingguan; usulan identitas instans adalah unique `(jadwalKbmId, tanggalWib)`, dengan record pelaksanaan dibuat saat roster disimpan dan status dihitung dari jadwal, waktu WIB, libur, serta bukti submit.
- Verifikasi keberadaan dilakukan setelah penulisan: `planning/F2-RISET-PRESENSI-SISWA.md` terdaftar nyata di folder `planning/`.
- Tidak menjalankan Docker Compose dan tidak mengubah backend/src, frontend/src, e2e, docs, deploy, scripts, atau compose.

### [AGENT-3] RISET-F6 — 2026-07-16

**Status:** SELESAI.

- Membaca tugas RISET-F6, §9, spesifikasi halaman guru/kurikulum, serta kode aktual backend, frontend, dan E2E tanpa menyentuh wilayah agent lain.
- Menghasilkan `planning/F6-RISET-RAPOR.md` dengan bukti file:baris dan pemetaan paket→siswa, TP, penilaian, nilai, rumus akhir, deskripsi, KKM global, agregat presensi F2, rapor Draft/Final, penguncian, revision, kokurikuler, ekskul, PDF server-side, RBAC atribut, audit, DTO, autosave, cache, lazy route, komponen v0.12.x, endpoint, UI, dan E2E matrix.
- Temuan inti: `penugasan` paling tepat menjadi aggregate root akademik stabil; daftar siswa selalu diproyeksikan dari kelas aktif, nilai historis mengikat siswa+paket, hasil hitung tetap turunan, sedangkan override/status Final/alasan unlock/revision PDF harus persisten dan teraudit.
- Mengidentifikasi 27 pertanyaan terbuka untuk keputusan USER/PLANNER, terutama periode efektif semester, algoritme deskripsi referensi, hak nilai katrol, finalisasi tidak lengkap, kokurikuler, mapping A→TK, dan kontrak PDF.
- Verifikasi keberadaan dilakukan sebelum laporan: `planning/F6-RISET-RAPOR.md` terdaftar nyata di folder `planning/`.
- Tidak menjalankan Docker Compose dan tidak mengubah backend/src, frontend/src, e2e, docs, deploy, scripts, atau compose.

### [AGENT-T16] T16-SPRINT lanjutan — DIKERJAKAN (mulai 2026-07-16 21:19 WIB)

