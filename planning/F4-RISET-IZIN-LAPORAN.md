# F4 RISET: IZIN GURU, ALPHA/LIBUR OTOMATIS, DASHBOARD, LAPORAN/EXPORT, REKAP TU, AREA KEPSEK

## 1. Izin guru + pengganti (§6.5, §8.2)
- **Alur**: Guru mengajukan izin (IZIN/SAKIT/DINAS) → disetujui oleh Admin ATAU Kepsek → sistem otomatis menandai KBM sebagai "guru berhalangan" → pengganti (jika ada) mengisi roster tersebut
- **Entitas yang diperlukan**:
  - `izin_guru`: id, guruId, jenis (IZIN/SAKIT/DINAS), mulaiAt, selesaiAt, keterangan, lampiranUrl, status (MENUNGGU/DISETUJUI/DITOLAK), disetujuiOleh (userId), disetujuiPada
  - Relasi: izin_guru.belongsTo(guru), izin_guru.belongsTo(user as persetujuan)
  - onDelete: CASCADE untuk izin_guru saat guru dihapus
- **Siapa yang boleh approve**: Admin (peran admin) atau Kepsek (peran kepsek) berdasarkan konfigurasi RBAC §8.2
- **Kaitan ke presensi F2/F3**: Saat izin disetujui, sistem membuat entri presensi_harian_guru dengan status "IZIN" untuk hari tersebut (dari F3 riset)

## 2. Alpha/libur OTOMATIS (turunan, §6.5)
- **Definisi turunan (bukan kolom statis)**:
  - **ALPHA**: Guru memiliki KBM terjadwal (dari jadwal_kbm) tetapi TIDAK ada presensi_harian_guru untuk hari tersebut DAN tidak memiliki izin yang aktif
  - **LIBUR**: Guru TIDAK memiliki KBM terjadwal untuk hari tersebut (tidak ada entri jadwal_kbm yang cocok dengan hari ini)
  - **KOSONG**: Ada KBM terjadwal tetapi roster siswa kosong (tidak ada presensi siswa yang tercatat untuk KBM tersebut)
- **Sumber data untuk perhitungan**:
  - `jadwal_kbm` → untuk mengetahui KBM yang seharusnya ada
  - `kalender_libur` → untuk mengetahui hari libur nasional/sekolah
  - `presensi_harian_guru` (dari F3) → untuk mengetahui presensi aktual guru
  - `izin_guru` (disetujui) → untuk mengetahui izin yang aktif
  - `presensi_siswa` (dari F2) → untuk mengetahui kehadiran siswa dalam KBM
- **Logika perhitungan** (di level aplikasi, bukan disimpan sebagai field):
  1. Cek apakah hari ini adalah libur (dari kalender_libur) → jika ya → LIBUR
  2. Cek apakah ada jadwal KBM untuk guru hari ini → jika tidak ada → LIBUR
  3. Cek apakah ada izin yang aktif untuk guru hari ini → jika ya → status sesuai izin (IZIN/SAKIT/DINAS)
  4. Cek apakah ada presensi_harian_guru untuk guru hari ini → jika tidak ada → ALPHA
  5. Untuk setiap KBM, cek apakah ada presensi siswa → jika tidak ada → KOSONG
- **Implementasi**: Logika ini diterapkan dalam query agregat untuk dashboard dan laporan (patuh §12.16 - level DB untuk performa)

## 3. Koreksi presensi + verifikasi pending (§6.6, §8.2)
- **Alur koreksi manual**:
  - Admin dapat mengoreksi presensi guru melalui NIP manual
  - Form koreksi: pilih guru (via NIP), pilih tanggal, pilih status baru (HADIR/TERLAMBAT/IZIN/SAKIT/DINAS/ALPHA), isi alasan wajib
  - Sistem membuat entri baru di presensi_harian_guru atau mengupdate entri yang ada
  - Setiap koreksi memicu audit entri dengan catatan "Koreksi manual oleh [admin]"
- **Verifikasi pending**:
  - Entri presensi yang dibuat via manual NIP otomatis masuk ke status "PENDING"
  - Admin/Kepsek harus menyetujui entri pending sebelum ia berlaku
  - Antrean verifikasi pending ditampilkan di halaman khusus
  - Setiap verifikasi pending juga memicu audit
- **Audit**: Semua mutasi (buat, update, hapus presensi manual) memicu `ActivityLogService.record(...)` dengan entitas `presensi_harian_guru`

## 4. Dashboard (§6.6)
- **Kartu agregat yang diperlukan**:
  - Guru hari ini: jumlah guru dengan status HADIR/TERLAMBAT/IZIN/SAKIT/DINAS/ALPHA/LIBUR
  - KBM hari ini: jumlah KBM yang terlaksana (ada presensi siswa) vs kosong (tidak ada presensi siswa)
  - Siswa hari ini: jumlah siswa yang hadir alpha vs total siswa aktif
  - Feed realtime: aktivitas terbaru (presensi masuk guru, KBM dimulai, izin disetujui, dll.)
  - "Perlu perhatian": daftar yang memerlukan tindakan (izin guru menunggu persetujuan, presensi guru pending verifikasi, KBM tanpa pengganti saat guru berhalangan, dll.)
- **Query agregat yang dibutuhkan** (patuh §12.16 - level DB):
  - Guru status hari ini: GROUP BY status dari presensi_harian_guru + izin_guru aktif + jadwal_kbm
  - KBM terlaksana/kosong: LEFT JOIN jadwal_kbm dengan presensi_siswa, GROUP BY status kehadiran
  - Siswa hari ini: agregat dari presensi_siswa per tanggal
  - Feed realtime: query terbaru dari activity_logs dengan batasan waktu
  - Perlu perhatian: UNION beberapa kondisi (izin menunggu, presensi pending, KBM tanpa pengganti)

## 5. Laporan + export (§6.6)
- **HUB laporan** → sub-halaman mandiri:
  - Laporan harian guru: persentase hadir/telat/izin/sakit/dinas/alpha/libur per guru per periode
  - Laporan per-KBM keterlaksanaan: persentase KBM yang terlaksana per guru/kelas/mapel per periode
  - Laporan siswa per mapel/kelas: persentase kehadiran siswa per mapel/kelas per periode
- **Export Excel/PDF**:
  - Excel: menggunakan library `exceljs` (sudah ada untuk fungsi import)
  - PDF: perlu menentukan library (usulan: `pdfmake` atau `jsPDF` - diperlukan lazy loading karena berat §12.15)
  - Export berkop: mencetak kop sekolah dari `pengaturan.profil_sekolah` (nama, alamat, logo)
  - Format export: satu file per siswa/kelas atau gabungan sesuai pilihan user
- **Usulan struktur laporan**:
  - Filter: rentang tanggal (WIB), kelas, guru, mapel (opsional)
  - Tampilan: tabel hasil + baris TOTAL
  - Export: tombol Excel dan PDF di kanan-atas tabel
  - Kosong: pesan "Tidak ada data pada rentang ini"

## 6. Rekap TU (§10)
- **Basis perhitungan gaji**: rekap presensi harian guru (dari F3) menjadi input untuk sistem gaji eksternal
- **Data yang diekspor**:
  - Per guru per bulan: hari wajib, hadir, terlambat, izin, sakit, dinas, alpha, libur, persentase kehadiran
  - Format: Excel/PDF berkop untuk rekap bulanan
  - Ekspor dilakukan di luar sistem (basis gaji dihitung di luar sistem per catatan spesifikasi)
- **Kaitan ke presensi harian guru F3**: Menggunakan data yang sama dari entitas `presensi_harian_guru`
- **Peran `tu`**: Hanya peran `tu` yang boleh mengakses halaman rekap TU dan melakukan export (RBAC §8.2)

## 7. Area Kepsek (§8.2)
- **Akses BACA-SEMUA**:
  - Kepsek dapat membaca semua dashboard dan laporan (tidak hanya area tertentu)
  - Termasuk: dashboard admin, dashboard guru, laporan harian guru, laporan KBM, laporan siswa, rekap TU
  - Namun tetap tidak dapat melakukan mutasi data di luar izin guru
- **Approve izin guru**:
  - Kepsek merupakan salah satu approver untuk izin guru (selain admin)
  - Alur yang sama: ajukan → verifikasi kepsek → disetujui → otomatis menandai KBM sebagai guru berhalangan
- **Nama/NIP dari profil_sekolah**:
  - Untuk dokumen cetak (laporan, rekap, dll.), nama dan NIP kepsek diambil dari `pengaturan.profil_sekolah`
  - Fields yang digunakan: `kepsekNama` dan `kepsekNip`

## 8. Pola WAJIB (kutip kode)
- **RBAC**: pola kehadiran-guru (admin/kepsek/tu + baca-saja lintas peran) §8.2
- **Audit**: Semua mutasi memanggil `ActivityLogService.record(...)` §14.3
- **Cache**: stale-while-revalidate di client.ts + hook useCachedList §12.15
- **Lazy**: semua route React.lazy + Suspense, library berat (PDF export) WAJIB dynamic-import per halaman §12.15
- **Komponen v0.12.x**: Sidebar datar, satu tombol aksi, SaveSuccess, AdaptiveSelect, PageContainer size, etc. §15.0
- **§12.16**: Agregasi level DB untuk performa (jangan find() tanpa where/take pada tabel bertumbuh)
- **§12.17**: E2E Playwright = gerbang verifikasi akhir tiap fase; alur kritis baru wajib lahir bersama spec-nya

## 9. USULAN (utk PLANNER)
### Entitas & relasi
- Tambah tabel `izin_guru` dengan kolom: id, guruId, jenis (enum: IZIN/SAKIT/DINAS), mulaiAt, selesaiAt, keterangan, lampiranUrl, status (enum: MENUNGGU/DISETUJUI/DITOLAK), disetujuiOleh (FK user), disetujuiPada
- Relasi: izin_guru.belongsTo(guru), izin_guru.belongsTo(user as persetujuan)
- onDelete: CASCADE untuk izin_guru saat guru dihapus
- Entitas `presensi_harian_guru` diasumsikan sudah ada dari F3 riset
- Entitas `jadwal_kbm` dan `kalender_libur` diasumsikan sudah ada dari F1
- Entitas `presensi_siswa` diasumsikan sudah ada dari F2 riset

### Endpoint + RBAC
- `POST /api/izin/guru` (guru): terima {jenis, mulaiAt, selesaiAt, keterangan, lampiranUrl?} → buat izin dengan status MENUNGGU
- `GET /api/admin/izin/guru` (admin/kepsek): daftar izin guru dengan filter status, tanggal, guru
- `PATCH /api/admin/izin/guru/:id/setujui` (admin/kepsek): terima {alasan} → ubah status menjadi DISETUJUI + disetujuiOleh/pada
- `PATCH /api/admin/izin/guru/:id/tolak` (admin/kepsek): terima {alasan} → ubah status menjadi DITOLAK + alasan
- `GET /api/admin/presensi-guru/harian` (admin/kepsek): sudah ada dari F3 riset
- `POST /api/admin/presensi-guru/manual` (admin/kepsek): sudah ada dari F3 riset
- Semua endpoint di atas dilindungi oleh RBAC: hanya admin dan kepsek yang boleh approve/tolak izin

### Halaman UI (§15.3/15.5/15.7)
- `/izin/guru` (guru): form ajukan izin + daftar izin pribadi dengan status
- `/admin/izin/guru` (admin/kepsek): HUB dengan tab MENUNGGU/DISETUJUI/DITOLAK + daftar lengkap
- Halaman detail izin: menampilkan semua field + tombol setujui/tolak
- Dashboard: sudah ada dari F1 riset, hanya perlu memperbarui kartu agregat
- Laporan: HUB laporan di /admin/laporan dengan sub-halaman untuk laporan harian guru, per-KBM keterlaksanaan, siswa per mapel/kelas
- Rekap TU: halaman khusus di /tu/rekap-guru dengan filter bulan + export
- Area Kepsek: tidak perlu halaman khusus, cukup akses BACA-SEMUA ke halaman yang sudah ada

### Daftar pertanyaan terbuka utk keputusan user sebelum F4 dibuka
1. Jenis izin yang diperlukan: hanya IZIN/SAKIT/DINAS atau perlu ditambah (mis. CUTI, Dinas Luar Negeri)?
2. Sistem pengganti otomatis: apakah sistem harus men-suggest pengganti berdasarkan ketersediaan guru lain pada jam yang sama?
3. Batas waktu ajukan izin: berapa jam/jam sebelum KBM mulai yang masih boleh mengajukan izin?
4. Persetujuan multi-level: apakah izin tertentu perlu persetujuan baik admin maupun kepsek?
5. Lampiran izin: apakah harus ada surat resmi atau cukup keterangan teks?
6. Notifikasi: apakah sistem harus mengirim notifikasi (email/internal) saat izin disetujui/ditolak?
7. Export PDF: library mana yang dipilih untuk export PDF (pdfmake, jsPDF, atau lain-lain) dan apakah perlu lazy loading?
8. Rekap TU frekuensi: bulanan saja atau juga mingguan/kuartalan?
9. Akses kepsek: apakah kepsek boleh melihat data mentah (activity logs) atau hanya dashboard/laporan yang sudah diagregat?
10. Koreksi presensi batas waktu: seberapa lama setelah presensi terjadi yang masih boleh dikoreksi (mis. 1 hari, 1 minggu)?