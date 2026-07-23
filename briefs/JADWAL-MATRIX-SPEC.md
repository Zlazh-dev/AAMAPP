# JADWAL-MATRIX — matriks jadwal KBM interaktif (kontrak dikunci 2026-07-23)

Meniru mental model sheet "2. KBM" Excel sekolah: per-hari, kolom = kelas,
sel = kode guru. Desktop-only; tampilan mobile per-hari yang ada DIPERTAHANKAN.

## Tata letak (desktop, /kurikulum/jadwal)

> DITEGASKAN pemilik produk 2026-07-23: matriks adalah TAMPILAN DESKTOP dari
> `/kurikulum/jadwal` ITU SENDIRI — bukan sub halaman. Rute `/kurikulum/jadwal/
> matriks` + tombol "Tampilan Matriks" DIHAPUS (path lama di-redirect). Mobile
> di rute yang sama tetap tampilan per-hari yang ada.
- **Tab hari** di atas (Senin–Sabtu, dari data jadwal TA aktif).
- Tabel: kolom-1 = **Jam** (gabungan slot waktu hari itu), kolom berikut =
  **semua kelas** TA aktif (urut 7A…9I) — dinamis mengikuti jumlah kelas.
- Sel = **kode guru** (mis. A3). Hover/klik sel terisi → tooltip nama guru +
  mapel + jam.
- `table-fixed`, lebar 100% kontainer; sel menyempit mengikuti jumlah kelas.
  Di bawah lebar sel minimum → **scroll horizontal DI DALAM kontainer tabel**
  (standar CARD-DESIGN); sidebar tak terganggu, halaman tak pernah overflow.

## Interaksi
1. Klik sel = toggle pilih; drag = pilih persegi; lintas kelas boleh.
2. Ada seleksi (≥1 sel) → tombol **Assign** (+ **Hapus** bila ada sel terisi)
   muncul melayang/sticky di atas tabel + penghitung sel terpilih.
3. **Assign** → combobox `SearchSelect onSearch` berisi **PENUGASAN** kelas
   terpilih: label `Nama Guru — Mapel` (+ kode). BUKAN daftar guru mentah —
   jadwal mustahil menyimpang dari penugasan.
   - Multi-kelas: tawarkan hanya guru+mapel yang ber-penugasan di SEMUA kelas
     terpilih; resolusi per-sel memakai penugasan kelas masing-masing.
4. Simpan = **transaksi semua-atau-batal**. Konflik → 409 + daftar jujur per
   sel: "A3 sudah mengajar di 7B pada jam ini" (pakai validasi interval yang
   sudah ada). Tidak ada tulisan parsial.
5. **Hapus** seleksi → hormati RESTRICT presensi_sesi: slot yang sudah punya
   sesi tercatat ditolak dengan jumlah + alasan (pola guard removeJadwal).
6. **Kode unik otomatis**: guru tanpa `kode` di-generate saat pertama
   di-assign — 2 karakter alnum unik (utamakan pola huruf+angka spt A1),
   cek tabrakan di server, kolom sudah unique.

## Struktur jam/JP (DIKUNCI 2026-07-23 — penempatan: baris pertama matriks)

Struktur waktu ≠ pengajaran. Baris pertama (kolom jam) adalah STRUKTUR:
1. **Klik sel jam** → modal edit JP itu (jamMulai–jamSelesai; tampilkan konteks
   JP sebelum/sesudah; tolak tumpang-tindih). Mengubah jam JP = update
   transaksional semua baris jadwal hari itu di slot tsb (sesi presensi aman —
   referensinya jadwalId, bukan jam).
2. **Tombol [+ JP]** di ujung kolom jam → modal tambah: tampilkan "JP
   sebelumnya selesai HH:mm", prefill mulai = selesai-sebelumnya, selesai =
   mulai + durasi JP sebelumnya (menyesuaikan otomatis, tetap bisa diubah).
3. Struktur JP per-HARI dan berlaku untuk SEMUA kelas hari itu (lonceng
   sekolah satu) — entitas kecil `jam_pelajaran` (TA, hari, urutan, jam),
   baris matriks diturunkan dari sini, BUKAN dari baris jadwal; sel kosong =
   JP belum terisi. (Migration + seed dari slot 813 yang sudah terimpor.)
4. Hapus JP hanya bila seluruh selnya kosong; selain itu tolak dengan jumlah
   isi ("JP ini masih dipakai 12 kelas").

## Data
- SATU endpoint matriks per hari: `{ jamSlots[], kelas[], sel{kelasId,jam →
  kode,guruNama,mapel,penugasanId,jadwalId} }` — bukan 25 request.
- Peran: `['kurikulum','admin']` (rute yang ada). Guru TIDAK mengedit jadwal.

## Bukti wajib
- Spec: assign 1 sel → jadwal tertulis; multi-sel lintas kelas → semua
  tertulis; konflik guru-dobel → 409 + tak ada baris baru; hapus slot ber-sesi
  → 409; peran guru → 403. Verifikasi DB (pola dbCount yang ada).
