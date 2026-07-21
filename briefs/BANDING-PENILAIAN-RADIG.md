# Laporan Banding Sistem Penilaian: radig (legacy PHP) vs AAMAPP (NestJS)

## 1. Ringkasan cara kerja penilaian radig end-to-end

**Paradigma:** murni Kurikulum Merdeka / PPA 2025 — TIDAK ada skema NH/tugas/PTS/PAS berpersentase tetap. Alurnya:

1. **TP (Tujuan Pembelajaran)** dibuat guru per mapel (fase hardcode 'D'), lalu ditugaskan ke kelas via pivot `tp_kelas` (individu/massal/oleh admin). Bisa import Excel all-or-nothing (`tp_guru_import_aksi.php`).
2. **Asesmen** dibuat guru per mapel-kelas dengan jenis `Formatif | Sumatif` dan subjenis Sumatif: `Sumatif TP` (wajib link >=1 TP), `Sumatif Tengah Semester` (STS/PTS), `Sumatif Akhir Semester`, `Sumatif Akhir Tahun`. Bobot bebas per-asesmen, min 1 (`penilaian_aksi.php:80-81`). Bisa diduplikasi massal ke kelas paralel guru yang sama (`penilaian_aksi.php:31-57`).
3. **Input nilai** manual atau via Excel (template single & batch prefilled), nilai numerik di-clamp 0-100, upsert tanpa audit (`penilaian_aksi.php:153-278`).
4. **Nilai akhir rapor** = `round( Σ(nilai × bobot) / Σ(bobot) )` atas gabungan **Sumatif TP + Sumatif Akhir Semester/Tahun saja** (`kalkulasi_nilai.php:63-84`). Formatif 100% di luar rapor; **STS tersimpan tapi tidak pernah dihitung** ke nilai akhir (celah/keputusan legacy) — STS hanya tampil di rapor PTS terpisah.
5. **Deskripsi capaian** otomatis: rata-rata sederhana per TP dibanding KKM global (default 75); TP terbaik → kalimat penguasaan, TP terlemah → kalimat penguatan, setelah dibersihkan dari kata kerja operasional. Fungsi ini **terduplikasi 4x** dengan Top-N tidak konsisten (2 vs 1).
6. **Katrol**: guru (bukan admin) mengisi nilai kebijakan per siswa yang menimpa nilai sistem — tanpa batas, tanpa approval, tanpa clamp server-side (`simpan_nilai_katrol.php:46`). Saat CETAK, katrol hanya dipakai bila `katrol > asli` (`rapor_pdf.php:354-357`) — inkonsisten dengan halaman input yang memakai katrol apa pun >0.
7. **Finalisasi** oleh wali kelas, semua-atau-tidak per kelas: upsert rapor `Final` + kunci snapshot historis kelas/wali, tulis `rapor_detail_akademik` (nilai murni **tidak pernah disnapshot penuh** — dihitung ulang on-the-fly, bisa berubah retroaktif). Batal finalisasi mempertahankan katrol.
8. **Output**: 8 dokumen — rapor akhir (A–E + keputusan naik/lulus + lampiran), rapor PTS (hitung langsung dari bank nilai), cetak massal (maks 50), leger PDF & Excel (dengan ranking), sampul, identitas sekolah & siswa. Draft ditandai watermark DRAFT.
9. **Proses akademik pendukung**: monitoring progres input nilai per guru-mapel-kelas (dgn teks siap-copy WA + PDF resmi), kenaikan kelas/kelulusan manual massal, mutasi siswa masuk/keluar + surat pindah PDF.

## 2. Tabel banding fitur

| Fitur | radig | AAMAPP | Keterangan |
|---|---|---|---|
| Rata-rata tertimbang Σ(n×b)/Σb, round | ✅ | ✅ | Identik (`penilaian.service.ts:548-559`) |
| Formatif di luar rapor | ✅ | ✅ | Sama, di AAMAPP by design eksplisit |
| Subjenis Sumatif TP / Akhir Sem / Akhir Tahun | ✅ | ✅ | Sama |
| Subjenis STS/PTS + Rapor PTS | ✅ (STS tercatat, rapor PTS terpisah) | ❌ | AAMAPP tak punya konsep tengah semester sama sekali |
| Sumatif TP wajib link TP | ✅ | ✅ | Sama |
| Katrol/override per mapel | ✅ (guru, tanpa clamp) | ✅ (wali kelas, DTO 0-100) | AAMAPP lebih bersih & konsisten |
| Deskripsi capaian otomatis per TP vs KKM | ✅ (4 salinan, N=1/2) | ✅ (1 sumber, N=2) | AAMAPP satu kebenaran |
| KKM dari pengaturan | ✅ (dibaca konsisten) | ⚠️ setting ada tapi **tidak dibaca RaporService** (hardcode 75, `rapor.service.ts:28`) | Disconnect di AAMAPP |
| Finalisasi wali kelas, Draft/Final | ✅ per kelas semua-atau-tidak | ✅ per siswa, snapshot jsonb beku | AAMAPP lebih baik |
| Leger kelas + ranking (PDF/Excel) | ✅ | ❌ | Nol hasil grep `leger` |
| Monitoring progres input nilai | ✅ (+WA text +PDF) | ❌ | Terdekat hanya count penilaian per paket |
| Kenaikan kelas / kelulusan | ✅ (manual massal) | ❌ | Status siswa hanya aktif/nonaktif |
| Mutasi siswa + surat pindah PDF | ✅ | ❌ | Tak ada entitas mutasi |
| Import/export nilai Excel | ✅ (single + batch prefilled) | ❌ (import modul lain ada, nilai tidak) | |
| Cetak massal rapor + sampul + identitas | ✅ (batch 50) | ❌/parsial (PDF per siswa ada di F6b) | |
| Duplikasi asesmen ke kelas paralel | ✅ | ❌ | TP sudah shared per mapel di AAMAPP, asesmen belum |
| Filter agama utk mapel agama | ✅ (substring + kolom `agama_khusus`) | ❌ | |
| Catatan wali otomatis (AJAX generator) | ✅ | ❌ (catatan wali manual ada) | |
| Transparansi rumus (string audit per siswa) | ✅ | ❌ | |
| Watermark DRAFT di PDF | ✅ | ? (perlu cek F6b) | |
| Kehadiran S/I/A di rapor | ✅ (input manual wali) | ✅ (**dihitung dari presensi nyata**) | AAMAPP lebih baik |
| Kokurikuler & ekskul di rapor | ✅ | ✅ | Setara; radig punya generator deskripsi ekskul naratif |
| Snapshot historis kelas/wali | ✅ (kolom historis, backfill via skrip tanpa auth) | ✅ (snapshot jsonb utuh) | AAMAPP lebih baik |

## 3. Fitur radig yang BELUM ada di AAMAPP (urut paling bernilai)

Prinsip pengurutan: sekolah SEDANG memakai radig setiap hari — fitur yang menyentuh siklus wajib tahunan (rapor, leger, kenaikan) dan rutinitas mingguan (import Excel, monitoring) pasti DITAGIH.

### 3.1 Leger kelas + ranking — **PALING DITAGIH**
- **Cara kerja di radig**: matriks siswa × mapel per kelas (`leger_pdf.php:441-488`, `leger_excel.php`). Smart fallback sumber nilai: katrol > `rapor_detail_akademik.nilai_akhir` > hitung langsung dari bank nilai (`leger_pdf.php:171-247`) sehingga terisi walau belum final. Ranking = arsort total nilai (`leger_pdf.php:277-316`). Excel memisahkan kolom nilai asli vs katrol. Merah <KKM, biru = katrol.
- **Nilai**: dokumen wajib administrasi (arsip dinas, rapat kenaikan, akreditasi); wali kelas & admin memakainya tiap akhir semester. AAMAPP hanya punya rekap per paket (1 mapel × 1 kelas).
- **Ukuran**: **sedang** (query agregat lintas-penugasan + PDF/Excel; jangan adopsi peleburan PABD/SBdP hardcode nama mapel — pakai flag di entitas mapel).

### 3.2 Kenaikan kelas & kelulusan — **wajib tiap akhir TA**
- **Cara kerja di radig**: manual per siswa / massal (`admin_kenaikan_kelas.php`), aksi naik/tinggal/luluskan dalam transaksi (`admin_aksi.php:25-81`); deteksi kelas akhir via substring nama kelas; keputusan dicetak di kotak rapor semester 2 (`rapor_pdf.php:872-917`, diinput manual wali).
- **Nilai**: tanpa ini AAMAPP mati di pergantian tahun ajaran — siswa tak bisa dipromosikan antar rombel, tak ada status Lulus. Sekaligus perbaiki bug radig: aksi "tinggal" mengabaikan kelas tujuan dan menaruh siswa di kelas TA lama (`admin_aksi.php:64-67`).
- **Ukuran**: **besar** (status siswa baru lulus/tinggal, wizard promosi antar TA, log riwayat — radig tak punya undo, AAMAPP wajib punya; + field keputusan di rapor).

### 3.3 Monitoring progres input nilai
- **Cara kerja di radig**: target = jml asesmen Sumatif × siswa relevan (dgn pengecualian agama); realisasi = count nilai masuk; persen di-cap 100; status Kosong/N-A/Pending/Proses/Selesai (`admin_progres_penilaian.php:84-121, 386-405`); output teks siap-copy WA per kelas + PDF resmi ber-TTD (`admin_progres_penilaian_pdf.php`).
- **Nilai**: instrumen utama admin/kurikulum "menagih" guru menjelang rapor — ritual nyata tiap akhir semester. Makin krusial di AAMAPP karena semantik nilai kosongnya (sumatif belum dinilai keluar dari pembagi) membuat nilai akhir tampak wajar padahal datanya bolong.
- **Ukuran**: **sedang** (endpoint agregat + dashboard; teks WA = kecil tapi disukai user).

### 3.4 Import/export nilai via Excel
- **Cara kerja di radig**: template single per asesmen (kolom ID tersembunyi) dan template batch matriks kelas×mapel dgn nilai lama prefilled sehingga sekaligus export/edit (`penilaian_excel_template_batch.php`); import clamp 0-100, sel kosong sah (parsial), upsert (`penilaian_aksi.php:195-287`).
- **Nilai**: kebiasaan kerja guru sehari-hari — banyak guru merekap di Excel dulu. Tanpa ini, input massal nilai satu kelas terasa mundur dibanding radig.
- **Ukuran**: **sedang** (AAMAPP sudah punya modul import lain; tambahkan validasi kepemilikan id yang di radig dipercaya mentah, dan lindungi endpoint template yang di radig tanpa auth).

### 3.5 Rapor PTS / tengah semester
- **Cara kerja di radig**: subjenis `Sumatif Tengah Semester` tercatat tapi TIDAK masuk nilai akhir; rapor PTS terpisah (`rapor_pts_pdf.php`) menghitung langsung dari bank nilai: kolom per Sumatif TP mentah + rata sederhana + nilai STS terakhir; tanpa deskripsi/final/katrol.
- **Nilai**: sekolah membagikan laporan tengah semester ke ortu — ritual nyata yang akan ditagih di bulan ke-3. AAMAPP tak punya subjenis STS sama sekali.
- **Ukuran**: **sedang** (tambah enum subjenis + satu view/PDF derived; **putuskan eksplisit** apakah STS ikut nilai akhir — di radig tidak, kemungkinan bug yang jadi kebiasaan).

### 3.6 Mutasi siswa (masuk/keluar) + surat pindah
- **Cara kerja di radig**: keluar = status Pindah/Lulus/Keluar + tanggal + alasan, `id_kelas=NULL` (`mutasi_aksi.php:97-118`); masuk = buat siswa baru + akun (username=NISN) + record mutasi; cetak PDF "Keterangan Pindah Sekolah" format buku induk (`cetak_mutasi.php`).
- **Nilai**: kejadian rutin sepanjang tahun; surat pindah adalah dokumen resmi yang wajib diterbitkan sekolah. AAMAPP hanya bisa nonaktifkan siswa tanpa jejak/alasan/dokumen.
- **Ukuran**: **sedang** (entitas mutasi multi-record — radig hanya simpan 1 record; jangan adopsi `substr(0,5)` quick_keluar dan rumus tahun pelajaran berbasis kalender yang salah utk semester genap).

### 3.7 Filter agama untuk mapel agama
- **Cara kerja di radig**: siswa di input nilai & target progres difilter `siswa.agama` — prioritas kolom `mata_pelajaran.agama_khusus`, fallback substring nama mapel (`penilaian_input_nilai.php:60-90`); rapor hanya cetak mapel agama yang cocok (`rapor_pdf.php:278-315`).
- **Nilai**: tanpa ini guru PAI melihat (dan "kekurangan nilai") siswa non-muslim, dan rapor mencetak 6 baris agama — cacat yang langsung terlihat di sekolah negeri. 
- **Ukuran**: **kecil-sedang** (kolom `agamaKhusus` di mapel + filter di daftar nilai & assembleRapor; adopsi versi kolom eksplisit, buang deteksi substring).

### 3.8 KKM dibaca dari pengaturan (perbaikan disconnect)
- **Cara kerja di radig**: KKM global dari tabel pengaturan, default 75, dipakai konsisten utk warna, tuntas, dan klasifikasi TP.
- **Nilai**: AAMAPP sudah punya setting `kkm` yang bisa diedit via `PATCH /api/kurikulum/pengaturan/kkm` tapi `RaporService` hardcode 75 (`rapor.service.ts:28`) — admin mengubah KKM tanpa efek. Ini bug/utang, bukan fitur baru.
- **Ukuran**: **kecil** (inject PengaturanService; perhatikan snapshot FINAL sudah menyimpan kkm per rapor — bagus, pertahankan).

### 3.9 Catatan wali kelas otomatis
- **Cara kerja di radig**: generator AJAX per siswa (`ajax_generate_catatan.php`): mapel terkuat + terlemah (ambang hardcode 78), dimensi kokurikuler SB/B, kalimat kehadiran (0 absen = pujian; alpha>3 = teguran), hasil masuk textarea untuk diedit wali — tidak auto-save.
- **Nilai**: menghemat jam kerja wali kelas (28+ catatan naratif per kelas). Pola "generate lalu edit" terbukti dipakai.
- **Ukuran**: **kecil-sedang** (data sudah semua ada di assembleRapor; ikat ambang ke KKM, bukan 78 mati).

### 3.10 Cetak massal rapor + sampul + identitas
- **Cara kerja di radig**: checkbox siswa → satu PDF multi-siswa page-break, maks 50/batch (`rapor_cetak_massal.php`); plus dokumen sampul dan halaman identitas sekolah/siswa.
- **Nilai**: wali kelas mencetak 28-32 rapor sekaligus; cetak satu-satu tidak realistis di akhir semester.
- **Ukuran**: **sedang** (loop atas pipeline PDF F6b yang sudah ada + template sampul/identitas).

### 3.11 Duplikasi asesmen ke kelas paralel
- **Cara kerja di radig**: saat membuat penilaian, guru centang kelas paralel lain yang ia ampu → asesmen digandakan (`penilaian_aksi.php:31-57`).
- **Nilai**: guru mapel SMP biasanya mengajar 3-6 rombel paralel dengan asesmen sama; tanpa ini input berulang 6×.
- **Ukuran**: **kecil** (copy penilaian + relasi TP ke penugasan lain milik guru yang sama; TP sudah shared per mapel di AAMAPP jadi lebih mudah dari radig).

### 3.12 Transparansi rumus (string audit)
- **Cara kerja di radig**: sistem menampilkan `"( (n1 x b1) + ... ) / ( b1 + ... ) = total / bobot ≈ nilai"` per siswa (`kalkulasi_nilai.php:95`).
- **Nilai**: senjata guru menjawab komplain ortu/siswa; membangun kepercayaan pada angka rapor.
- **Ukuran**: **kecil** (rakit string di rekapNilaiAkhir yang komponennya sudah dihitung).

### 3.13 Watermark DRAFT pada PDF
- **Cara kerja di radig**: PDF bisa dicetak kapan pun; bila status Draft dicap watermark merah 120pt (`rapor_pdf.php:261-264`).
- **Nilai**: memungkinkan pemeriksaan awal rapor tanpa risiko draft beredar sebagai final.
- **Ukuran**: **kecil** (perlu cek dulu apakah F6b sudah melakukannya).

### Legacy cruft — JANGAN diadopsi
- `ALTER TABLE` pada page load (patch skema darurat di file cetak & form).
- Endpoint tanpa auth (`penilaian_excel_template.php`, `proses_mutasi.php`, `cetak_mutasi.php`, `migrasi_historis.php`) dan SQL interpolasi string.
- Dua rumus berbeda utk siswa vs rapor (rata sederhana + ambang 85/70 di `siswa_lihat_nilai.php`) — di AAMAPP tampilkan angka yang sama dengan rapor.
- Ambang hardcode 78 catatan wali; KKM dipaksa 50 oleh skrip migrasi; fase hardcode 'D'.
- Deteksi kelas akhir & mapel agama via substring nama; peleburan PABD/SBdP hardcode; `substr(0,5)` kelas mutasi; riwayat mutasi single-record.
- 4 salinan `hitungDataRaporSiswa` dengan Top-N menyimpang.
- Aturan cetak "katrol hanya bila > asli" yang bertentangan dengan halaman input — pilih satu semantik (AAMAPP: `nilaiKatrol ?? raw`, konsisten, sudah benar).

## 4. Yang di AAMAPP justru LEBIH BAIK — pertahankan, jangan mundur

1. **Satu sumber kebenaran rumus & deskripsi** — radig menduplikasi `hitungDataRaporSiswa` 4× dengan hasil menyimpang (Top-2 vs Top-1 TP); AAMAPP satu service.
2. **Snapshot FINAL jsonb beku** (`rapor.service.ts:534-547`) — nilai rapor final tidak berubah retroaktif; di radig nilai murni dihitung ulang on-the-fly dan bisa bergeser setelah finalisasi bila guru mengubah asesmen.
3. **Semantik katrol konsisten + tervalidasi**: DTO 0-100, `nilaiTampil = nilaiKatrol ?? raw`, kedua angka tersimpan & tampil (`hasOverride`) — radig tanpa clamp server, semantik input vs cetak bertentangan, dan admin justru diblokir.
4. **Batal finalisasi admin-only** — di radig wali kelas bisa bongkar-pasang final sepihak.
5. **Kehadiran rapor dihitung dari presensi nyata** (join presensi→sesi→jadwal) — di radig S/I/A diketik manual wali, rawan beda dengan presensi harian.
6. **PTS/STS tidak "diam-diam hilang"**: radig menyimpan nilai STS lalu tidak menghitungnya tanpa memberi tahu siapa pun; AAMAPP eksplisit tidak punya konsep itu — saat menambah rapor PTS, jadikan keputusan desain terbuka.
7. **Integritas data & keamanan**: TypeORM parameterized (vs SQL injection), migrasi skema resmi (vs ALTER TABLE on-load), RBAC guard konsisten (vs banyak file tanpa cek role), soft-delete TP, unique constraint nilai per (penilaian,siswa).
8. **TP melekat ke mapel & dibagi antar paket** — menghapus keruwetan pivot `tp_kelas` tiga jalur radig (salah satunya tanpa validasi kepemilikan server).

Catatan minor AAMAPP yang perlu dibereskan saat mengadopsi fitur di atas: disconnect KKM (3.8), semantik nilai kosong keluar dari pembagi (mitigasi via monitoring 3.3), hard-delete penilaian ikut menghapus nilai tanpa arsip, dan jebakan RBAC admin yang butuh role 'guru' di controller penilaian.