# F3 RISET: PRESENSI WAJAH GURU

## 1. Arsitektur wajah (§4)
- **Client-side**: `@vladmandic/human` di browser untuk deteksi wajah, ekstraksi embedding, dan liveness sederhana
- **Server-side**: Matching menggunakan cosine similarity antara embedding live dan referensi guru
- **Privasi**: Video TIDAK pernah dikirim ke server; hanya embedding yang dikirim untuk verifikasi
- **Referensi**: §4.21 (Rekognisi wajah GURU): "@vladmandic/human di browser (deteksi + embedding); matching di server (cosine similarity)"
- **Entitas**: Embedding guru disimpan di tabel `guru` sebagai kolom `faceEmbedding` (vector) dan foto referensi di `fotoUrl`

## 2. Dua permukaan kamera (§6.3, §15.2)
### KIOSK (1:N)
- Token perangkat 6 digit dari `/admin/perangkat` (§8.4)
- Hanya endpoint scan + heartbeat, tanpa idle timeout
- Kamera live fullscreen dengan overlay nama sekolah + jam WIB raksasa
- Status: sukses (slide-in foto referensi + nama besar + badge HADIR/TERLAMBAT), duplikat, gagal 3× → manual NIP → PENDING verifikasi admin
- Offline: antrean lokal + sinkron jam asli

### HP (1:1)
- Overlay kamera fullscreen bukan route (tombol besar di `/guru`)
- Verifikasi lokasi SEBELUM kamera bila aktif di `/admin/pengaturan/lokasi`
- Geser: H → T → A (tahan/klik kanan → pilihan lengkap H/T/S/I/A)
- Kartunya ber-izin/sakit terkatak = TERKUNCI (ikon gembok + sumber)
- Setelah cutoff: baca saja + badge "Terkunci — hubungi admin untuk koreksi"

### Enrollment wajah
- Path: `/admin/wajah/:guru` (wizard capture pose)
- 3–5 capture otomatis (depan/kiri/kanan) dengan progress dan pesan kualitas realtime
- Kamera ditolak → panel instruksi izin browser
- Selesai → pratinjau 3–5 thumbnail → Simpan/Ulangi

## 3. Geofence (§6.3)
- Verifikasi lokasi HANYA jalur HP (kiosk tidak butuh verifikasi lokasi karena perangkat terpasang tetap di sekolah)
- Geolokasi SEBELUM kamera: di dalam radius → lanjut verifikasi wajah; di luar radius → ditolak "Anda berada di luar area sekolah" + arahan ke kiosk
- Izin lokasi ditolak/gagal → ditolak dengan instruksi mengaktifkan lokasi + arahan kiosk
- Koordinat sekolah + radius meter + saklar dari `pengaturan.lokasi` yang SUDAH ada di F1
- Jarak tercatat di record untuk audit

## 4. Status & jalur gagal (§6.3, §6.7)
### Status presensi
- Check-in = HADIR/TERLAMBAT + menit dari `pengaturan.jam_presensi` (jam masuk/pulang global, toleransi menit)
- Jendela pulang = check-out
- Scan pertama = check-in, scan ganda → "Sudah tercatat HH:MM"
- Tanpa KBM tapi scan → "hadir di hari tanpa jadwal"

### Jalur gagal
- Wajah tidak dikenali: 3× → manual NIP → PENDING verifikasi admin
- Belum enroll: jalur manual; admin lihat daftarnya di `/admin/wajah`
- Kiosk offline: antrean lokal + sinkron jam asli
- Kamera error: instruksi pemulihan + watchdog reload
- Presensi HP di luar radius sekolah: ditolak "Anda berada di luar area sekolah" + arahan ke kiosk
- Izin lokasi HP ditolak/gagal: ditolak + instruksi mengaktifkan lokasi + arahan kiosk
- Salah kenali: ambang + margin; koreksi admin + audit
- Model gagal: mode manual penuh
- Roster tidak diisi: sesi KOSONG; siswa "tidak tercatat" (bukan alpha)
- Guru berhalangan: "guru berhalangan" → pengganti
- Jadwal bentrok: ditolak dengan pesan jelas
- Idle > 1 jam: 401 "Sesi berakhir karena tidak aktif" → login → kembali
- Salah catat pelanggaran: ubah/hapus wajib alasan; hitung ulang; audit

## 5. Privasi/retensi
- Embedding = data biometrik di server; usulkan kebijakan hapus saat guru nonaktif/dihapus (ON DELETE SET NULL atau trigger)
- Token kiosk pairing 6 digit (§8.4): pairing kode 6 digit (10 menit) → token perangkat (hash), hanya endpoint scan + heartbeat

## 6. Pola WAJIB (kutip kode)
- RolesGuard: Hanya peran `guru` yang boleh melakukan presensi harian diri (scan) — §8.2 baris 485
- Token perangkat: baru — beda dari session (§8.4)
- Audit: Semua mutasi memanggil `ActivityLogService.record(...)` (§14.3)
- DTO: Field yang dikirim form UI wajib ada di DTO backend (§12.16f)
- Dynamic-import: `@vladmandic/human` BERAT — WAJIB dynamic-import per halaman, DILARANG di bundle utama (§12.15)
- Endpoint scan: bisa sering → pertimbangkan paginasi/rate limiting (§12.16)
- E2E: Wajah sulit di-e2e — usulkan strategi mock embedding (§12.17)

## 7. USULAN (untuk diputuskan PLANNER)
### Entitas & relasi
- Tambah kolom `faceEmbedding` (vector) dan `faceUpdatedAt` (timestamptz) ke tabel `guru`
- Tambah tabel `device_kiosk` untuk token perangkat: `id`, `tokenHash`, `guruId` (nullable), `lastSeenAt`, `isOnline`
- Relasi: `guru.hasOne(device_kiosk)` dengan `onDelete: SET NULL`
- Tambah tabel `presensi_harian_guru` untuk riwayat: `id`, `guruId`, `checkInAt`, `checkOutAt`, `status` (HADIR/TERLAMBAT/ALPHA/LIBUR), `source` (KIOSK/HP/MANUAL), `distanceMeter` (untuk audit), `deviceId` (nullable)

### Endpoint & RBAC
- `POST /api/guru/presensi-scan` (guru): terima `{embedding, deviceId?}` → verifikasi cosine similarity → buat/update `presensi_harian_guru`
- `GET /api/admin/presensi-guru/harian` (admin): pilih tanggal → tabel guru dengan status hari ini
- `POST /api/admin/presensi-guru/manual` (admin): terima `{guruId, status, checkInAt, checkOutAt, alasan}` → buat record manual
- `GET /api/admin/device-kiosk` (admin): daftar perangkat kiosk dengan status online/offline
- `POST /api/admin/device-kiosk` (admin): terima `{nama}` → generate kode pairing 6 digit
- `DELETE /api/admin/device-kiosk/:id` (admin): cabut perangkat
- `POST /api/admin/device-kiosk/:id/heartbeat` (device): update `lastSeenAt` dan `isOnline: true`

### Halaman UI
- `/admin/perangkat` (sudah ada dari F0): tambah tab "Kiosk" untuk manage perangkat
- `/admin/wajah` (sudah ada dari F0): enrollment wajah guru
- Tombol besar di `/guru` dashboard: "Presensi Sekarang" → overlay kamera fullscreen
- `/admin/presensi-guru` (tab Harian • Verifikasi Pending): monitor presensi harian guru

### Daftar pertanyaan terbuka utk keputusan user sebelum F3 dibuka
1. Ambang cosine similarity untuk verifikasi wajah (mis. 0.6?)
2. Level liveness yang diperlukan (eye blink, head pose, dll.)
3. Retensi embedding dan foto referensi (selamanya atau hapus saat guru keluar?)
4. Jumlah pose untuk enrollment (3 pose standar atau lebih variasi?)
5. Perilaku ketika kiosk offline terlalu lama (batasi ukuran antrean lokal?)
6. Apakah izinkan presensi HP tanpa verifikasi lokasi bila geofence tidak aktif?
7. Toleransi waktu untuk check-in/check-out (mis. 15 menit tolerance sebelum/judul jam masuk/pulang?)