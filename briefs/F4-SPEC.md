# F4-SPEC — IZIN GURU + STATUS TURUNAN (kontrak dikunci planner 2026-07-18)

> Sumber kebenaran F4 untuk SEMUA executor. Planner-owned. Latar:
> `planning/F4-RISET-IZIN-LAPORAN.md`. Kontrak DIKUNCI → backend & frontend
> paralel (backend vs frontend, tak bertabrakan).

## KEPUTUSAN BESAR — F4 DIFASE
- **F4a (SEKARANG)** = izin guru (ajukan→approve→auto-berhalangan) + **status
  harian guru TURUNAN** (HADIR/TERLAMBAT/IZIN/SAKIT/DINAS/ALPHA/LIBUR/KOSONG).
  Fondasi data untuk dashboard & laporan.
- **F4b (NANTI)** = dashboard agregat + HUB laporan + export Excel/PDF (pdf
  lazy). DITUNDA.
- **F4c (NANTI)** = rekap TU (bulanan, export gaji) + area kepsek baca-semua.
  DITUNDA.
- JANGAN kerjakan F4b/F4c di F4a.

## Prinsip inti — STATUS DITURUNKAN, bukan disimpan
Saat izin DISETUJUI, JANGAN pre-create baris presensi_harian_guru utk tiap
hari (bisa ratusan). Izin disimpan di tabel `izin_guru`; **status harian guru
dihitung saat query** (helper `deriveStatusHarian`) — konsisten dgn pola F2
(status sesi) & F3. Ini menuntaskan backlog KOSONG/DIGANTIKAN F2 juga.

**Urutan derivasi status harian guru (guru, tanggal):**
1. tanggal ∈ `kalender_libur` → **LIBUR**.
2. Guru tak punya `jadwal_kbm` di hari itu (hariWIB) → **LIBUR** (tak wajib).
3. Ada `izin_guru` DISETUJUI yang mencakup tanggal → **IZIN|SAKIT|DINAS**
   (sesuai `jenis`).
4. Ada baris `presensi_harian_guru` → statusnya (**HADIR|TERLAMBAT**).
5. Selain itu (wajib KBM, tak hadir, tak izin) → **ALPHA**.
- **KOSONG** (level SESI, bukan guru): KBM terjadwal tapi roster siswa kosong
  → dipakai dashboard/laporan F4b (derivasi F2 sudah ada datanya).

## Keputusan planner atas pertanyaan terbuka (F4a relevan)
1. **Jenis izin** = **IZIN / SAKIT / DINAS** (3; cukup). Tak ada CUTI di F4a.
2. **Pengganti otomatis-suggest** = TIDAK di F4a. Approval hanya menandai hari;
   pengganti tetap via mekanisme F2 (siapa yang isi roster = guruPengganti).
   Auto-suggest DITUNDA.
3. **Batas waktu ajukan** = fleksibel (boleh hari ini/mendatang; lampau boleh
   dgn keterangan — admin diskresi). Tanpa cutoff keras F4a.
4. **Persetujuan** = SATU approver (admin ATAU kepsek — salah satu cukup).
   Bukan multi-level. Guru TAK boleh approve izin sendiri.
5. **Lampiran** = OPSIONAL (`lampiranUrl?`, reuse upload yang ada); keterangan
   teks WAJIB.
6. **Notifikasi** = TIDAK di F4a (kartu "Perlu Perhatian" dashboard F4b yang
   memunculkan pending).
7. PDF lib, 8. freq TU, 9. akses kepsek = urusan F4b/F4c.
10. **Koreksi presensi** = admin boleh koreksi kapan saja + alasan + audit
    (endpoint manual F3 sudah ada). Tanpa batas keras.

> Catatan: "kunci izin SISWA" (deferred dari F2) BUKAN F4a (F4 riset =
> izin GURU). Tetap backlog terpisah.

## Entitas F4a (backend)
```
izin_guru  id PK
  • guruId FK guru (CASCADE)
  • jenis varchar ('IZIN'|'SAKIT'|'DINAS')
  • mulaiTanggal date • selesaiTanggal date        -- rentang inklusif (WIB)
  • keterangan text                                 -- WAJIB
  • lampiranUrl varchar NULL                         -- opsional (FOTO_URL pola)
  • status varchar ('MENUNGGU'|'DISETUJUI'|'DITOLAK') default 'MENUNGGU'
  • disetujuiOleh FK user NULL (SET NULL)
  • disetujuiPada timestamptz NULL
  • alasanKeputusan text NULL                        -- alasan approve/tolak
  • createdAt/updatedAt
  — INDEX(guruId, status), cek overlap saat derivasi
```
`presensi_harian_guru.status` (varchar F3) kini menerima nilai IZIN/SAKIT/
DINAS/ALPHA/LIBUR SEBAGAI TURUNAN (bukan disimpan) — tak ada perubahan skema.
Validasi: `selesaiTanggal ≥ mulaiTanggal`; jenis & status via IsIn.

## Kontrak API F4a (DIKUNCI)
RBAC server; audit tiap mutasi; WIB; error Bahasa Indonesia; DTO memuat semua
field UI (anti-drift).
- `POST /api/izin/guru` (guru) body `{ jenis, mulaiTanggal, selesaiTanggal,
  keterangan, lampiranUrl? }` → buat izin MENUNGGU (guru dari SESI, bukan
  input); audit "Mengajukan izin {jenis} {rentang}".
- `GET /api/izin/guru` (guru) → daftar izin milik SENDIRI (terbaru dulu).
- `GET /api/admin/izin/guru?status=&dari=&sampai=&guruId=&page=&limit=`
  (admin|kepsek) → daftar semua izin berpaginasi + filter (level DB, §12.16).
  Item sertakan guruNama + status + rentang + keterangan.
- `PATCH /api/admin/izin/guru/:id/setujui` (admin|kepsek) body `{ alasan? }`
  → status DISETUJUI + disetujuiOleh(=user sesi)/Pada; audit. Hanya dari
  MENUNGGU.
- `PATCH /api/admin/izin/guru/:id/tolak` (admin|kepsek) body `{ alasan }`
  (WAJIB) → status DITOLAK + alasanKeputusan; audit. Hanya dari MENUNGGU.
- **UPGRADE** `GET /api/admin/presensi-guru/harian?tanggal=` (F3): status tiap
  guru kini pakai `deriveStatusHarian` (masukkan IZIN/SAKIT/DINAS/ALPHA/LIBUR),
  BATCH (anti-N+1: satu query izin-aktif In(guruIds), satu presensi, satu
  jadwal-ada). JANGAN N+1 per guru.

## Helper backend WAJIB
`deriveStatusHarian(guru, tanggal, {liburSet, izinAktifMap, presensiMap,
punyaJadwalSet})` murni (tanpa query di dalam loop) — dipanggil setelah batch
fetch. Overlap izin: `mulaiTanggal ≤ tanggal ≤ selesaiTanggal AND
status='DISETUJUI'`.

## PEMBAGIAN WILAYAH F4a (paralel: backend vs frontend)
- **AG-2 (executor B) → F4a BACKEND (MEMIMPIN)**: modul baru
  `backend/src/izin/**` (izin_guru entity, DTO, service + `deriveStatusHarian`,
  controller ajukan/list-diri/list-admin/setujui/tolak), UPGRADE
  presensi-guru monitor pakai derivasi (BATCH), daftarkan di app.module.ts.
  Boot-verify + e2e mock (ajukan→approve→monitor tampil IZIN; ALPHA saat tak
  hadir tanpa izin; LIBUR hari tanpa jadwal; tolak wajib-alasan; RBAC guru tak
  bisa approve). Wilayah: `backend/**` + `frontend/e2e/`.
- **AG-1 (executor A) → F4a FRONTEND** (kontrak dikunci, boleh mulai paralel):
  `/izin/guru` (guru: form ajukan izin — AdaptiveSelect jenis, rentang tanggal,
  keterangan, lampiran opsional + daftar izin sendiri dgn badge status) +
  `/admin/izin-guru` (admin/kepsek: daftar berpaginasi + filter status, detail
  → setujui/tolak dgn alasan, sheet adaptif) + wiring client.ts/App.tsx/menu.ts.
  Konsumsi kontrak di atas. Wilayah: `frontend/src/**` + `frontend/e2e/`.

## Aturan wajib: §12.15 lazy • §12.16 filter+paginasi DB + anti-N+1 +
anti-DTO-drift • §12.17 e2e = gerbang • RBAC server + audit + WIB • komponen
v0.12.x (sidebar datar, satu tombol aksi, SaveSuccess, AdaptiveSelect,
PageContainer, BackLink adaptif) • klaim tugas sebelum mulai • APPEND laporan
• JANGAN kerjakan F4b/F4c.
