# Standar Desain Card & Spacing — AAMAPP

> Kontrak delegasi UX-POLISH Gel-2. Dihasilkan dari audit menyeluruh 6 area +
> primitif (workflow `w2kz342ad`) dan **diverifikasi planner** terhadap
> `tailwind.config.js`, `Card.tsx`, `PageContainer.tsx`, `Table.tsx`, `index.css`.
> Semua nilai = token yang SUDAH ada di config. Tidak ada token baru dikarang.
> Ganti perintah "rapikan" jadi kelas Tailwind **persis** di bawah.

## 0. BUG TOKEN — perbaikan sistemik (prasyarat, dikerjakan DULUAN)

`tailwind.config.js:6-21` mendefinisikan: `aam-green`, `aam-yellow`, `aam-sidebar*`,
`aam-page` (#F8FAFC), `aam-border` (#E2E8F0), `aam-text` (#0F172A),
`aam-text-muted` (#64748B). **TIDAK ADA** `aam-muted` maupun `aam-bg`.

- **`aam-muted` → `aam-text-muted`** — kelas mati, **199 kemunculan / 32 file**
  (verified). Semua `text-aam-muted` selama ini tak berwarna → hierarki hilang.
- **`aam-bg` → `aam-page`** — kelas mati, **10 kemunculan / 4 file** (verified):
  `Table.tsx` (header + zebra), `JadwalKbmPage`, `PengaturanJamPage`,
  `PengaturanLokasiPage`. Header tabel transparan, striping hilang.

Perintah aman (per folder milik masing-masing agent):
`sed -i 's/aam-muted/aam-text-muted/g; s/aam-bg/aam-page/g'` pada file .tsx di
wilayahmu. Tidak ada token valid yang mengandung substring `aam-muted`/`aam-bg`,
jadi replace aman (tidak menyentuh `aam-text-muted`/`aam-page` yang sudah benar).

## 1. Card primitive (Card.tsx — WAJIB dibaked) — pemilik: AG-2

Padding pindah ke wrapper isi + prop `flush` untuk edge-to-edge (tabel/list).

- **Root `<Tag>`:** `relative overflow-hidden rounded-md border border-aam-border bg-white shadow-sm`
- **Cabang interaktif** (`onClick || hoverable`): `transition-colors hover:border-aam-green/40 hover:shadow-md`
- **Wrapper isi `<div>`** (ganti `relative z-10`): `flush ? 'relative z-10' : 'relative z-10 p-4 sm:p-5'`
- Tambah `flush?: boolean` ke `CardProps`.

Padding baked = **16px mobile / 20px ≥sm**. Setelah ini, **semua caller `<Card>`
di seluruh app HAPUS `p-*`/`p-0`-nya**; wrapper tabel/list pakai `<Card flush>`.

## 2. Skala spacing (nilai konkret)

| Konteks | Kelas | px |
|---|---|---|
| Padding halaman | `p-4 md:p-6` (PageContainer — sudah benar) | 16 / 24 |
| Bila ada bottom-bar | `pb-24 md:pb-6` (sudah benar) | 96 / 24 |
| Antar-section | `space-y-6` | 24 |
| Isi dalam satu section | `space-y-4` | 16 |
| Grid kartu | `grid gap-4` | 16 |
| List kartu (mobile) | `space-y-3` | 12 |
| Header halaman → konten | `mb-6` | 24 |
| Judul kartu (h3) → isi | `mb-3` | 12 |
| Baris field form | `space-y-4` | 16 |

Aturan tegas:
- Kartu **tidak** membawa `mb-*` sendiri; jarak diatur induk (`space-y-*`/`gap-4`).
  Hapus `mb-4` pada kartu (mis. `RaporDetailPage:229,248,331,371`,
  `PelanggaranPage:123`).
- Header halaman satu blok: `<div className="mb-6"><h1 className="text-xl font-bold text-aam-text">…</h1><p className="text-sm text-aam-text-muted mt-1">…</p></div>`. Jangan pisah `mb-1`+`mb-6`.
- Mobile list `space-y-3` (bukan `space-y-2`; mis. `GuruListPage:173`).

## 3. Tipografi kartu (kelas persis)

| Peran | Kelas |
|---|---|
| Judul halaman (h1) | `text-xl font-bold text-aam-text` |
| Subjudul halaman | `text-sm text-aam-text-muted mt-1` |
| Judul kartu (h3) | `text-sm font-semibold text-aam-text mb-3` |
| Nilai/angka besar | `text-2xl sm:text-3xl font-bold leading-none text-aam-text` |
| Label stat | `text-sm text-aam-text-muted` |
| Sub/caption | `text-xs text-aam-text-muted` |
| Nama primer (baris list) | `font-medium text-aam-text` |

Judul kartu SELALU `font-semibold` + `text-sm` (jangan campur `font-bold`/tanpa ukuran).

## 4. StatCard — pola final

```tsx
<Card icon="groups">
  <p className="text-sm text-aam-text-muted">Total Siswa</p>
  <p className="text-2xl sm:text-3xl font-bold leading-none text-aam-text mt-1">1.240</p>
  <p className="text-xs text-aam-text-muted mt-1">+12 minggu ini</p>
</Card>
```
Tanpa `p-*` (dibaked). `leading-none` agar angka rapat.

## 5. Card judul + ikon — pola final

```tsx
<Card icon="assignment">
  <h3 className="text-sm font-semibold text-aam-text mb-3">Nilai Akademik</h3>
  … isi …
</Card>
```
Ikon lewat prop `icon` (jadi watermark), **bukan** emoji di teks judul.

## 6. Table — pola final (pakai components/Table.tsx yang SUDAH ADA)

- Semua tabel hand-rolled (±37 lokasi: `EkskulPembinaPage`, `TuRekapGuruPage`,
  `RaporDetailPage`, `GuruListPage`, `SiswaListPage`, `ImportPage:298`,
  `LaporanPages:130`, dst.) → `<Table columns data rowKey>`.
- Fix token `Table.tsx`: `bg-aam-bg`→`bg-aam-page` (71,104: `bg-aam-page/50`),
  `text-aam-muted`→`text-aam-text-muted` (76,92).
- Sel header & data `px-3 py-2.5` (tinggi baris seragam; jangan `py-2`).
- Table = surface sendiri (`rounded-md border`). **JANGAN bungkus `<Table>` di
  dalam `<Card>`** (border/radius ganda). Butuh judul → taruh judul sebagai
  elemen terpisah DI ATAS `<Table>`.

## 7. Watermark

- Hanya bila `<Card icon="…">`. Nilai TETAP: `rotate(-15deg)`, `opacity 0.07`
  (light 0.06), `120px`, offset `-20px` (`index.css:34`). Jangan bikin varian ad-hoc.
- `LoginPage.tsx:150` (300px, opacity 0.04) = hero khusus, boleh dipertahankan;
  jangan disalin ke kartu biasa.

## 8. Bottom-sheet — WAJIB adaptif (perbaikan kebocoran desktop)

Desktop = modal ter-center; mobile = sheet bawah. Pola benar:
- Overlay: `fixed inset-0 z-40 bg-black/40 flex items-end md:items-center justify-center`
- Panel: `w-full max-w-lg bg-white rounded-t-2xl md:rounded-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto`

Yang bocor (panel `fixed bottom-0 left-0 right-0 … rounded-t-2xl` tanpa `md:`):
`AdminIzinGuruPage:133`, `KelasDetailPage:474`&`:549`, `RosterDetailSheet:308`,
`GuruPelanggaranPage:132`, `TujuanPembelajaranPage:122`, `PenilaianListPage:184`,
`PelanggaranPage:172`, `TindakLanjutPage:171`, `VerifikasiPage:132`,
`EkskulAdminPage:134`, `EkskulPembinaPage:369`/`:394`, `KokurikulerKegiatanPage:154`,
`KokurikulerTimPage:124`.

## 9. Lain

- `SubPageLinks.tsx:44`: `h-4.5` (invalid) → `h-5`; `text-[10px]` → `text-xs`.
- `SubPageLinks.tsx:27`: hapus `-mt-2` (margin negatif); cukup `mb-4`.
- Dark mode TIDAK diaktifkan (`tailwind.config` tanpa `darkMode`) — jangan
  tambah kelas `dark:`.

## 10. Pembagian wilayah (tanpa tabrakan)

**AG-2** — `components/**` (Card, Table, SubPageLinks), `pages/admin/**`,
`pages/kurikulum/**`, `pages/kokurikuler/**`, `pages/kesiswaan/**`,
`pages/ekskul/**`, `pages/tu/**`, `menu.ts`. Termasuk: fix Card primitive (§1),
fix Table token+sel (§6), token rename (§0) di folder itu, hapus `p-*` caller,
spacing/tipografi, migrasi tabel, bottom-sheet, watermark, emoji→ikon, pindah
menu Ekstrakurikuler admin→kurikulum.

**AG-1** — `pages/guru/**`, `e2e/**`. Termasuk: token rename (§0) di guru, hapus
`p-*` caller guru (setelah Card §1 landas), spacing/tipografi, migrasi tabel guru
(RaporDetailPage dll), bottom-sheet `GuruPelanggaranPage`, watermark, emoji→ikon,
+ fix `rekap-presensi.spec` (login guru-wali, bukan admin).

**Sinkron:** AG-2 kerjakan **Card.tsx (§1) DULU** lalu lapor; AG-1 mulai dari
token rename + fix `rekap-presensi.spec` (tak butuh Card), baru hapus `p-*`
caller setelah Card §1 landas.
