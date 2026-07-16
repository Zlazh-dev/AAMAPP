# F2 RISET: Presensi Siswa per KBM

> **RISET MURNI DARI KODE — bukan implementasi.**
> Disusun sebagai bahan spesifikasi F2 oleh planner.
> Sumber: pembacaan kode aktual `backend/src/` dan `frontend/src/` per 2026-07-16.
> Setiap klaim disertai referensi `file:baris`.

---

## 1. Titik-Tempel Jadwal → Presensi

### 1.1 Identifikasi "satu sesi KBM pada tanggal T"

**Masalah inti:** Jadwal KBM (`jadwal_kbm`) adalah slot **mingguan berulang** (hari + jam), BUKAN instans pada tanggal nyata. Presensi siswa butuh **instans sesi pada tanggal konkret**. Bagaimana menjembatani?

**Kode saat ini:**

`jadwal-kbm.entity.ts:23-56` — entitas `JadwalKbm`:
- `id` (PK)
- `penugasanId` (FK → `penugasan`, `onDelete: CASCADE`) — baris 28-33
- `hari` (int, 1=Senin…6=Sabtu) — baris 36-37
- `jamMulai` (time, format HH:MM WIB) — baris 40-41
- `jamSelesai` (time, format HH:MM WIB) — baris 44-45
- `sesiKe` (int nullable, nomor urut sesi dalam hari) — baris 48-49
- `createdAt`, `updatedAt` (timestamptz)

`penugasan.entity.ts:25-69` — entitas `Penugasan`:
- `id` (PK)
- `mapelId` (FK → `mapel`, `onDelete: RESTRICT`) — baris 31-36
- `kelasId` (FK → `kelas`, `onDelete: RESTRICT`) — baris 38-43
- `tahunAjaranId` (FK → `tahun_ajaran`, `onDelete: RESTRICT`) — baris 45-50
- `guruId` (FK → `guru`, NOT NULL, `onDelete: RESTRICT`) — baris 57-62
- `@Unique(['mapelId', 'kelasId', 'tahunAjaranId'])` — baris 26

**Kesimpulan titik-tempel:**

```
JadwalKbm (slot mingguan)
  └→ Penugasan (paket: guru+mapel+kelas+TA)
       └→ Kelas
            └→ Siswa (kelasId, status='aktif') = ROSTER OTOMATIS
```

Untuk mendapat "sesi KBM pada tanggal T":
1. Ambil tanggal T → konversi ke hari (1=Senin…6=Sabtu) via `wib.util.ts:34` `todayWIB()` + `getDay()` (Minggu=0, Senin=1…Sabtu=6).
2. Cek apakah T adalah hari libur → `kalender_libur` by tanggal (`kalender-libur.entity.ts`: `tanggal` date UNIQUE). Jika libur → TIDAK ada sesi.
3. Query `jadwal_kbm` WHERE `hari = <hari-T>` AND `penugasan.tahunAjaranId = <TA aktif>` AND (`penugasan.kelasId = <kelas>` OR `penugasan.guruId = <guru>`).
4. Hasil = daftar slot jadwal yang aktif pada tanggal T.

**Tidak ada entitas "instans sesi" saat ini.** `jadwal_kbm` adalah template mingguan. Presensi F2 membutuhkan entitas baru untuk merekam status per-tanggal — lihat §6 USULAN.

### 1.2 Roster siswa satu sesi = turunan dari mana?

**Aturan §3 & §9:** TIDAK boleh duplikasi data induk. Roster = turunan.

Roster siswa untuk satu sesi KBM = **siswa aktif di kelas penugasan tersebut**:
- `siswa.entity.ts:89-94` — `kelasId` (nullable, `onDelete: SET NULL`), `status` (default `'aktif'`) baris 96-97.
- Roster = `SELECT * FROM siswa WHERE kelasId = <penugasan.kelasId> AND status = 'aktif' ORDER BY nama`.
- Siswa baru di tengah semester → otomatis muncul di roster (aturan §9).
- Siswa pindah kelas → kelasId berubah, riwayat lama tetap tersimpan.
- Siswa nonaktif → hilang dari roster aktif.

**Implikasi:** Roster TIDAK disimpan sebagai tabel terpisah — dihitung on-the-fly dari `siswa.kelasId` + `status='aktif'`. Presensi (catatan H/S/I/A/T per siswa per sesi) perlu entitas baru yang mereferensikan `siswaId` + jadwal/tanggal — lihat §6.

### 1.3 Pencarian jadwal guru

`kurikulum.service.ts:471-492` — `listJadwal()`:
```
GET /api/kurikulum/jadwal?taId=&kelasId=&guruId=
```
- QueryBuilder JOIN `penugasan` → filter by `p.tahunAjaranId`, opsional `p.kelasId`, `p.guruId`.
- Urut by `hari ASC, jamMulai ASC, kelasId ASC`.
- Return `{ data: rows, taId }`.

Pola ini bisa dipakai untuk "jadwal guru hari ini": filter `guruId` + `hari = <hari-ini>`.

---

## 2. WIB & Kalender

### 2.1 Util WIB

`backend/src/common/wib.util.ts` (59 baris) — fungsi tersedia:

| Fungsi | Baris | Kegunaan |
|--------|-------|----------|
| `WIB` (const) | 5 | `'Asia/Jakarta'` |
| `formatWIB(date, fmt)` | 10-14 | Format tanggal ke WIB (`yyyy-MM-dd HH:mm:ss` default) |
| `formatRelativeWIB(date)` | 17-31 | "baru saja" / "X menit lalu" / "X jam lalu" / "X hari lalu" / tanggal |
| `todayWIB()` | 34-35 | `toZonedTime(new Date(), WIB)` — tanggal hari ini di WIB |
| `toWIB(date)` | 39 | Konversi ke zoned WIB |

**Pemakaian F2:** `todayWIB()` untuk tentukan hari ini, `formatWIB()` untuk tampilkan jam presensi, `getDay()` pada hasil `todayWIB()` untuk dapat hari 0-6 (Minggu=0, Senin=1…Sabtu=6; jadwal_kbm pakai 1=Senin…6=Sabtu).

### 2.2 Kalender Libur

`kalender-libur.entity.ts` — entitas `KalenderLibur`:
- `id` (PK)
- `tanggal` (date, **UNIQUE**) 
- `keterangan` (varchar)
- `createdAt`, `updatedAt`

**Akses via service:** `kurikulum.service.ts:756-798`:
- `listLibur()` — `liburRepo.find({ order: { tanggal: 'ASC' } })` → semua libur.
- `createLibur(dto, req)` — buat libur (409 jika tanggal duplikat).
- `removeLibur(id, req)` — hapus libur.
- `bulkLibur(dto, req)` — tandai/hapus banyak sekaligus (baris 806-854).

**Endpoint:** `libur.controller.ts` — `@Controller('api/admin/libur')`, CRUD admin-only.

**Pemakaian F2:** Cek apakah tanggal T adalah libur: `liburRepo.findOne({ where: { tanggal: T } })`. Jika libur → tidak ada KBM, tidak ada kewajiban presensi.

### 2.3 Tahun Ajaran Aktif

`tahun-ajaran.entity.ts` — entitas `TahunAjaran`:
- `id` (PK)
- `nama` (varchar, mis. `'2026/2027'`)
- `semester` (int, 1 atau 2)
- `aktif` (bool)
- `@Unique(['nama', 'semester'])`

**Akses via service:** `kurikulum.service.ts:983-991` — `getActiveTaIdOrThrow()`:
```typescript
private async getActiveTaIdOrThrow(): Promise<number> {
  const { tahunAjaran } = await this.taService.getActive();
  if (!tahunAjaran) {
    throw new ConflictException(
      'Tidak ada tahun ajaran aktif. Aktifkan satu tahun ajaran terlebih dahulu.',
    );
  }
  return tahunAjaran.id;
}
```

`tahun-ajaran.service.ts` — `getActive()` returns `{ tahunAjaran: TahunAjaran | null }`.

**Pemakaian F2:** Semua query jadwal/presensi harus filter by TA aktif. Tanpa TA aktif → 409 dengan pesan arahan (pola `getActiveTaIdOrThrow`).

### 2.4 Aturan Cutoff §6.5

Spec §6.5:
```
CUTOFF: GURU ada KBM tanpa presensi harian tanpa izin → ALPHA;
        tanpa KBM → LIBUR.
        KBM lewat tanpa roster → KOSONG.
        SISWA alpha hanya dari A.
```

**Kode saat ini:** Belum ada implementasi cutoff. Pengaturan jam presensi ada di `pengaturan` key `'jam_presensi'` (`{jamMasuk, jamPulang, toleransiMenit, cutoff}`).

**Pemakaian F2:**
- Cutoff untuk SIMPAN roster: `pengaturan.jam_presensi.cutoff` (default `'15:00'`).
- Setelah cutoff → roster read-only (pesan "Terkunci — hubungi admin untuk koreksi").
- Status sesi KOSONG: jam selesai sesi < now WIB dan tidak ada roster tersimpan.

---

## 3. Status Sesi §6.4 (TERLAKSANA/BERJALAN/KOSONG/DIGANTIKAN)

Spec §6.4:
```
Status sesi: TERLAKSANA (roster disimpan) / BERJALAN / KOSONG
(jam lewat tanpa roster → merah, ditagih) / DIGANTIKAN
(pengganti mengisi roster, tercatat siapa).
```

**Data yang dibutuhkan (turunan, BUKAN kolom statis):**

| Status | Cara menghitung |
|--------|-----------------|
| **TERLAKSANA** | Roster presensi siswa untuk (jadwalId, tanggal) sudah disimpan → `exists(presensi WHERE jadwalId=T AND tanggal=D)` |
| **BERJALAN** | `now WIB` berada dalam interval `[jamMulai, jamSelesai]` dan roster belum disimpan |
| **KOSONG** | `now WIB > jamSelesai` sesi dan roster belum disimpan → merah, ditagih |
| **DIGANTIKAN** | Roster disimpan oleh guru PENGGANTI (bukan guru penugasan asli) → perlu catat `guruPenggantiId` |

**Tidak ada kolom status di `jadwal_kbm`** (slot mingguan, bukan instans). Status sesi dihitung dari:
1. Waktu sekarang WIB vs `jamMulai`/`jamSelesai` slot.
2. Existence record presensi (entitas baru F2) untuk (jadwalId, tanggal).
3. Siapa yang menyimpan roster (guru asli vs pengganti).

**Implikasi entitas baru:** Lihat §6 USULAN — perlu entitas `presensi_sesi` (header, per jadwal+tanggal) + `presensi_siswa` (detail, per siswa).

---

## 4. Hook Lintas-Modul

### 4.1 Tanda T di Roster → Draft Pelanggaran R-07 (§6.4/§7)

Spec §6.4: "tanda T → OTOMATIS draft pelanggaran R-07 (10 poin) di antrean verifikasi".
Spec §7.5: "OTOMATIS: T di roster → draft R-07 (tidak memotong poin sebelum diverifikasi)".

**Entitas/endpoint yang perlu disiapkan (JANGAN bangun di F2 — identifikasi kaitan):**

- Katalog pelanggaran §7.2 butir 7: "Terlambat masuk kelas" R 10 poin.
- Modul kesiswaan (F5) akan punya: `pelanggaran` entity, `verifikasi` antrean.
- F2 perlu: setelah roster disimpan dengan status T untuk siswa X → buat **draft** pelanggaran R-07 di antrean verifikasi.
- Draft R-07 TIDAK memotong poin sampai diverifikasi (§7.5).
- Status draft → butuh entitas pelanggaran dengan `status: 'draft' | 'menunggu_verifikasi' | 'disetujui' | 'ditolak'`.

**Pola audit yang harus diikuti:** `audit.service.ts:64-84` — `this.audit.log({ actorId, action, resource, resourceId, ip, userAgent, summary })`. F2 harus audit setiap simpan roster: `"Menyimpan presensi siswa Matematika 7A Senin 07:00–07:40 (28H 1T 1S 1I 1A)"`.

### 4.2 Ketidakhadiran S/I/A → Bahan Rapor (§9)

Spec §9: "Ketidakhadiran S/I/TK OTOMATIS dari presensi (wali boleh koreksi + alasan → audit)".

- F6 (rapor) akan menghitung S/I/A dari data presensi F2.
- "Alpha satu hari penuh" = A pada SEMUA sesi TERLAKSANA hari itu (§6.4).
- Sesi DIGANTIKAN tetap terlaksana; KOSONG tidak dihitung.
- Sesi tanpa roster → siswa "TIDAK TERCATAT" (bukan alpha).

**Implikansi F2:** Data presensi harus bisa di-query agregat per siswa per rentang tanggal, dikelompokkan per status (H/S/I/A/T), dengan filter "sesi TERLAKSANA saja". Lihat §6 USULAN struktur entitas.

---

## 5. Pola yang WAJIB Diikuti (dari Kode Aktual)

### 5.1 AuditService

**File:** `backend/src/audit/audit.service.ts:37-84`

Dua interface input:
- `AuditRecordInput` (baris 7-17): `userId, user, action, entity, entityId, entityLabel, summary, ipAddress, deviceSummary`.
- `AuditLogInput` (baris 26-35): alias gaya lama — `actorId→userId, resource→entity, resourceId→entityId, ip→ipAddress, userAgent→deviceSummary, details→summary`.

**Pemakaian di kurikulum.service.ts** (contoh `createJadwal`, baris 558-578):
```typescript
await this.audit.log({
  actorId: req.session?.userId ?? null,
  action: 'CREATE_JADWAL',
  resource: 'jadwal_kbm',
  resourceId: String(saved.id),
  ip: req.ip,
  userAgent: req.headers['user-agent'] as string,
  summary: `Menambah jadwal ${namaMapel} ${namaKelas} ${hariName} ${dto.jamMulai}–${dto.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
  details: { penugasanId, namaMapel, namaKelas, namaGuru, hari, jamMulai, jamSelesai, taId, taLabel },
});
```

**Aturan F2:** Setiap mutasi presensi (simpan roster, koreksi) WAJIB audit dengan summary Bahasa Indonesia bernama (bukan ID mentah).

### 5.2 RolesGuard + Peran `guru` + Atribut Wali Kelas

**File:** `backend/src/common/roles.guard.ts`

`RolesGuard` membaca `@Roles(...)` decorator → cek `user.roles` array → admin selalu lolos.

**Pola controller** (`kurikulum.controller.ts`):
```typescript
@Get('jadwal')
@Roles('kurikulum', 'admin')
async listJadwal(...) { ... }
```

**Wali kelas** = atribut pada `kelas.waliGuruId` (`kelas.entity.ts`: `waliGuruId` ManyToOne Guru, nullable, unique, `onDelete: SET NULL`). BUKAN peran login.

**Pemakaian F2:** 
- Endpoint presensi siswa: `@Roles('guru', 'admin')` — guru menyimpan roster kelasnya.
- Cek kepemilikan: guru hanya bisa isi roster untuk `penugasan.guruId === <guru yang login>` (perlu join `penugasan` → `guru.userId === session.userId`).
- Wali kelas bisa lihat rekap kelasnya: cek `kelas.waliGuruId` apakah guru tersebut adalah wali.
- Admin bisa koreksi semua.

**Cara menghubungkan guru login → penugasan:** `guru.entity.ts` punya `userId` (ManyToOne User, nullable, unique, `onDelete: SET NULL`). Flow: `session.userId` → `guru.userId` → dapat `guruId` → query `penugasan WHERE guruId = X`.

### 5.3 DTO + ValidationPipe (Pelajaran forbidNonWhitelisted/DTO-drift §12.16f)

**File:** `backend/src/main.ts:37-56`

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  exceptionFactory: (errors) => new BadRequestException({
    message: 'Data tidak valid',
    errors: errors.map(e => `${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`),
  }),
}));
```

**Pola DTO** (`create-jadwal.dto.ts:19-51`):
```typescript
export class CreateJadwalDto {
  @IsInt() @Min(1)
  penugasanId: number;

  @IsInt() @Min(1) @Max(6)
  hari: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'jamMulai harus HH:mm (24 jam)' })
  jamMulai: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'jamSelesai harus HH:mm (24 jam)' })
  jamSelesai: string;

  @IsOptional() @IsInt() @Min(1) @Max(20) @Type(() => Number)
  sesiKe?: number;
}
```

**ATURAN BARU §12.16f:** Setiap field yang DIKIRIM form UI → DTO backend WAJIB diperbarui pada tugas yang sama. `forbidNonWhitelisted: true` menyebabkan field asing = 400. Spec CRUD WAJIB mengirim PAYLOAD LENGKAP persis seperti form.

**Pelajaran dari T16:** Bug fotoUrl (guru + siswa) — form UI mengirim `fotoUrl` tapi DTO tidak punya field itu → 400. Spec CRUD harus mengirim payload lengkap.

### 5.4 Cache SWR Frontend

**File:** `frontend/src/hooks/useCachedList.ts`

Hook `useCachedList` — stale-while-revalidate:
- Kembali ke halaman daftar → render INSTAN dari cache → revalidasi diam-diam.
- Setiap mutasi (POST/PATCH/DELETE) → `invalidateCache(prefix)` menghapus entri cache berawalan base path resource.
- Cache dibatasi LRU ±50 entri.

**Pola API** (`frontend/src/api/client.ts`):
```typescript
// GET list
export async function adminGetGuru(q?: string) {
  return request<GuruListResponse>(`/api/admin/guru?q=${q ?? ''}`);
}

// POST create
export async function adminCreateGuru(data: CreateGuruPayload) {
  const result = await request<Guru>('/api/admin/guru', { method: 'POST', body: JSON.stringify(data) });
  invalidateCache('/api/admin/guru');
  return result;
}

// PATCH update
export async function adminUpdateGuru(id: number, data: UpdateGuruPayload) {
  const result = await request<Guru>(`/api/admin/guru/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  invalidateCache('/api/admin/guru');
  return result;
}
```

**Pemakaian F2:** API presensi → `invalidateCache('/api/presensi')` setelah simpan roster. `useCachedList` untuk daftar sesi KBM hari ini.

### 5.5 Lazy Route

**File:** `frontend/src/app/App.tsx:13-63`

Pola lazy load:
```tsx
const GuruDashboardPage = React.lazy(() =>
  import('../pages/guru/GuruDashboardPage').then(m => ({ default: m.GuruDashboardPage }))
);

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
```

Route:
```tsx
{
  path: '/guru',
  element: <RequireRole roles={['guru']}><AuthedLayout /></RequireRole>,
  children: [
    { index: true, element: <Lazy><GuruDashboardPage /></Lazy> },
    // F2: /guru/kbm, /guru/kbm/:sesi
  ],
}
```

**Pemakaian F2:** Halaman `/guru/kbm` (daftar sesi) dan `/guru/kbm/:sesi` (roster grid) harus lahir lazy.

### 5.6 Komponen v0.12.x

| Komponen | File | Props inti | Pemakaian F2 |
|----------|------|------------|--------------|
| `<PageContainer>` | `components/PageContainer.tsx` | `size: xl\|lg\|md\|sm`, `bottomBar?: boolean` | Bungkus halaman roster; `bottomBar` untuk padding saat bar Simpan sticky |
| `<ConfirmDialog>` | `components/ConfirmDialog.tsx` | `open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, variant, loading` | Konfirmasi sebelum simpan roster, konfirmasi koreksi |
| `<AdaptiveSelect>` | `components/AdaptiveSelect.tsx` | `value, options, onChange, label` (desktop dropdown portal / mobile bottom sheet) | Pilih status presensi (H/S/I/A/T) — meskipun lebih mungkin tombol cepat |
| `<PageMenu>` | `components/PageMenu.tsx` | `actions: [{label, icon, variant, onClick}]`, `links: [{label, path, badge?}]` (desktop dropdown / mobile sheet) | Header halaman KBM: aksi "Simpan" + link navigasi |
| `<FilterBar>` | `components/FilterBar.tsx` | search + filter chips (desktop inline / mobile sheet) | Filter daftar sesi by tanggal/kelas |
| `<Card>` | `components/Card.tsx` | `icon: string` (watermark) | Kartu sesi KBM, kartu siswa di roster |
| `<SearchSelect>` | `components/SearchSelect.tsx` | pencarian pilihan (desktop dropdown / mobile sheet) | Pilih guru pengganti |
| `<SaveSuccess>` | `components/SaveSuccess.tsx` | `entityName, mode, entityId, detailPathPattern` | Setelah simpan roster? (lihat catatan — mungkin tidak perlu, roster bukan entitas CRUD biasa) |
| `<UnsavedGuard>` | `app/useUnsavedChanges.tsx` | `isDirty: boolean` → returns `{ dirty, setDirty, guard }` | Roster yang belum disimpan → guard navigasi |

### 5.7 E2E Matrix

**File:** `frontend/playwright.config.ts`
- 2 project: `desktop-chromium` (1280×800), `mobile-chromium` (375×812, `*.mobile.spec.ts`).
- baseURL: `http://localhost`.
- Login via API helper: `e2e/helpers/auth.ts` — `loginAs(page, email, pw)` → POST `/api/auth/login` → set `localStorage('aamapp_token')`.
- Data uji via API: `e2e/helpers/api.ts` — `seedLibur`, `bulkHapusLibur`, `deleteSiswa`.
- Selector: `getByRole/getByLabel/getByText` label Indonesia. No blind sleep. Flaky = bug.
- Spec self-contained: data uji bernama unik, cleanup via API.

**Pola spec** (`penugasan-crud.spec.ts`):
```typescript
test.describe('Penugasan CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Seed data via API
  });

  test.afterEach(async () => {
    // Cleanup via API
  });

  test('buat paket 1 guru 2 kelas', async ({ page }) => {
    // UI interaction + assertions
  });
});
```

**Pemakaian F2:** Spec WAJIB untuk alur kritis F2: simpan roster (H→T→A cycle), izin siswa terkunci, T→draft R-07 (mock atau verify via API), cutoff terkunci, koreksi admin.

---

## 6. USULAN (untuk diputuskan PLANNER, bukan final)

### 6.1 Entitas Presensi yang Diperlukan

#### 6.1.1 `presensi_sesi` (header — per jadwal + tanggal)

```
presensi_sesi
  id            serial PK
  jadwalId      FK → jadwal_kbm (onDelete CASCADE — hapus jadwal = hapus sesi presensi)
  tanggal       date (WIB, tanggal konkret)
  penugasanId   FK → penugasan (onDelete CASCADE — redundant tapi cepat untuk query)
  guruId        FK → guru (onDelete RESTRICT — guru yang menyimpan)
  guruPenggantiId FK → guru NULLABLE (onDelete SET NULL — jika DIGANTIKAN)
  status        varchar ('TERLAKSANA' | 'BERJALAN' | 'KOSONG' | 'DIGANTIKAN')
                — HINT: mungkin tidak perlu kolom, bisa diturunkan; tapi simpan utk performa
  catatan       text NULLABLE
  disimpanPada  timestamptz (kapan roster disimpan)
  createdAt     timestamptz
  updatedAt     timestamptz
  UNIQUE(jadwalId, tanggal) — satu sesi per jadwal per tanggal
```

**Catatan:** Status `BERJALAN`/`KOSONG` bisa diturunkan (tidak perlu kolom), tapi `TERLAKSANA` dan `DIGANTIKAN` perlu dicatat saat roster disimpan. Usulan: kolom `disimpanPada` (nullable) — jika terisi = TERLAKSANA; jika `guruPenggantiId` terisi = DIGANTIKAN; jika kosong + jam lewat = KOSONG; jika kosong + jam berjalan = BERJALAN.

#### 6.1.2 `presensi_siswa` (detail — per siswa per sesi)

```
presensi_siswa
  id            serial PK
  presensiSesiId FK → presensi_sesi (onDelete CASCADE)
  siswaId       FK → siswa (onDelete CASCADE)
  status        varchar ('H' | 'S' | 'I' | 'A' | 'T')
  catatan       varchar NULLABLE
  diubahOleh    FK → guru NULLABLE (guru yang input; untuk audit penginput — §9)
  terkunci      boolean default false (izin/sakit tercatan sebelumnya → terkunci)
  sumberKunci   varchar NULLABLE ('izin_siswa' | 'koreksi_admin' | null)
  createdAt     timestamptz
  updatedAt     timestamptz
  UNIQUE(presensiSesiId, siswaId)
```

**Aturan turunan §9:**
- Roster default = HADIR untuk semua siswa aktif di kelas.
- Izin/sakit siswa tercatat sebelumnya → otomatis terkunci (status S/I, `terkunci=true`, `sumberKunci='izin_siswa'`).
- T → draft R-07 otomatis (hook ke F5, tidak langsung memotong poin).
- Editable guru sampai cutoff; setelahnya hanya admin (dengan alasan + audit).

### 6.2 Daftar Endpoint + RBAC

| Method | Path | Peran | Deskripsi |
|--------|------|-------|-----------|
| GET | `/api/guru/kbm` | guru, admin | Daftar sesi KBM hari ini untuk guru yang login |
| GET | `/api/guru/kbm/:jadwalId?tanggal=` | guru, admin | Roster siswa untuk satu sesi (default: tanggal hari ini) |
| POST | `/api/guru/kbm/:jadwalId/roster` | guru (miliknya), admin | Simpan roster presensi (body: `{ tanggal, items: [{ siswaId, status, catatan? }] }`) |
| PATCH | `/api/guru/kbm/:jadwalId/roster` | guru (miliknya, sebelum cutoff), admin | Koreksi roster (body: `{ tanggal, items: [...] }`) |
| GET | `/api/admin/presensi-siswa` | admin | Matriks kelas × sesi untuk tanggal tertentu |
| GET | `/api/admin/presensi-siswa/:sesiId` | admin | Detail roster sesi (baca) |
| PATCH | `/api/admin/presensi-siswa/:sesiId/koreksi` | admin | Koreksi per siswa (alasan wajib) |

**RBAC tambahan:**
- Guru hanya bisa akses `penugasan.guruId` miliknya (cek via `guru.userId === session.userId`).
- Wali kelas bisa lihat rekap kelasnya (cek `kelas.waliGuruId`).
- Kepsek/Kesiswaan baca-saja (pola kehadiran-guru §6.1A4).

### 6.3 Halaman UI (§15.6)

**`/guru/kbm` — daftar sesi hari ini:**
- Header: "KBM Hari Ini" + tanggal WIB.
- Daftar kartu sesi: jam, mapel, kelas, badge status sesi.
- Tanpa KBM hari ini → banner "Anda libur hari ini — tidak ada jadwal KBM".
- Mobile: card-list; desktop: tabel atau grid kartu.

**`/guru/kbm/:jadwalId` — roster grid (§15.6):**
- Header sticky: kelas • mapel • Sesi n • jam • hitung mundur cutoff.
- Grid kartu siswa (nama + no. absen + foto kecil), default HADIR hijau.
- Tap kartu → siklus H → T → A (tahan/klik kanan → pilihan lengkap H/T/S/I/A).
- Kartu ber-izin/sakit tercatat = TERKUNCI (ikon gembok + sumber).
- Bar bawah sticky: ringkasan "28 H • 1 T • 1 S • 1 I • 1 A" + tombol "Simpan Presensi".
- Setelah simpan: banner "Tersimpan HH:MM WIB — bisa diedit sampai cutoff".
- Tanda T → toast info "Draft pelanggaran R-07 dikirim ke verifikasi".
- Setelah cutoff → baca saja + badge "Terkunci".

**`/admin/presensi-siswa` — matriks (§15.3):**
- Pilih tanggal → matriks kelas × sesi (sel = status sesi berwarna; merah = KOSONG).
- Klik sel → detail roster (baca) + tombol Koreksi per siswa (alasan wajib).

### 6.4 Daftar Pertanyaan Terbuka (perlu keputusan user sebelum F2 dibuka)

1. **Struktur entitas `presensi_sesi`:** Apakah perlu kolom `status` eksplisit, atau cukup diturunkan dari `disimpanPada` + `guruPenggantiId` + waktu sekarang? (Usulan: kolom `disimpanPada` + `guruPenggantiId` saja — status dihitung; tapi ini pertanyaan performa vs kesederhanaan.)

2. **Soft delete vs hard delete presensi:** Jika guru mengoreksi roster setelah simpan, apakah record lama di-overwrite atau perlu riwayat perubahan? (Spec §6.4: "editable guru sampai cutoff" — implies overwrite, tapi audit log mencatat siapa-kapan-apa.)

3. **Guru pengganti:** Bagaimana alur "guru berhalangan → pengganti mengisi roster"? Apakah kurikulum/admin menugasi pengganti di jadwal (ubah `penugasan.guruId` sementara), atau ada mekanisme "sesi digantikan" terpisah? Spec §6.3 Lapis 2 menyebut "DIGANTIKAN (pengganti mengisi roster, tercatat siapa)" — apakah pengganti disimpan di `presensi_sesi.guruPenggantiId`, atau apakah jadwal `jadwal_kbm` di-clone untuk sesi pengganti? (Usulan: `presensi_sesi.guruPenggantiId` — jadwal asli tetap, pengganti dicatat di instans sesi.)

4. **Hook R-07: build di F2 atau F5?** Spec mengatakan "T → OTOMATIS draft R-07". Modul kesiswaan (F5) belum dibangun. Pilihan: (a) F2 buat entitas `pelanggaran` minimal (hanya draft R-07, tanpa verifikasi); (b) F2 hanya tandai di audit log + buat hook event, F5 yang konsumsi; (c) F2 buat tabel `pelanggaran_draft` sementara yang akan diintegrasikan saat F5. (Usulan: (a) — entitas `pelanggaran` dengan `status='draft'` + `sumber='roster_otomatis'`; F5 tinggal menambahkan verifikasi.)

5. **Izin siswa terkunci:** Spec §6.4 "izin/sakit tercatat sebelumnya otomatis terkunci". Modul izin siswa (F4, `/guru/kelas/izin` dan `/kesiswaan/izin-siswa`) belum dibangun. Bagaimana F2 menangani siswa ber-izin jika entitas izin belum ada? Pilihan: (a) F2 buat entitas `izin_siswa` minimal (siswaId, jenis, rentang tanggal); (b) F2 tidak ada kunci otomatis dulu (semua siswa bisa di-edit), fitur kunci hadir saat F4; (c) F2 hardcode cek dari API yang akan dibangun F4. (Usulan: (b) — F2 tanpa kunci otomatis, tambahkan saat F4 dibangun; catat sebagai TODO.)

6. **Paginasi presensi_siswa:** Roster satu sesi biasanya 20-40 siswa — tidak perlu paginasi. Tapi query agregat rekap (untuk rapor/wali kelas) bisa besar. Apakah perlu endpoint rekap terpisah dengan paginasi, atau cukup query langsung? (Usulan: endpoint rekap `/api/guru/kelas/rekap-presensi` dengan filter rentang tanggal + paginasi.)

7. **Performa query status sesi:** Untuk matriks admin `/admin/presensi-siswa` (kelas × sesi per tanggal), cara menghitung status tiap sel: (a) query `presensi_sesi` per (jadwalId, tanggal) — bisa N query; (b) satu query batch dengan `WHERE jadwalId IN (...) AND tanggal = T` lalu map di service. (Usulan: (b) — pola batch seperti `countPenugasanGuruAktifBatch` di `kurikulum.service.ts:443-461`.)

8. **Sesi tanpa roster:** Spec §6.4 "Sesi tanpa roster → siswa TIDAK TERCATAT (bukan alpha)". Apakah ini berarti jika guru tidak menyimpan roster sama sekali, SEMUA siswa di sesi itu tidak punya record presensi? Atau apakah sistem auto-create record "tidak tercatat"? (Usulan: tidak auto-create — jika `presensi_sesi` tidak ada (roster belum disimpan), siswa di sesi itu = "tidak tercatat". Query rekap cukup cek `LEFT JOIN presensi_siswa` dan treat NULL = tidak tercatat.)

---

## Ringkasan Eksekutif untuk Planner

**Yang sudah ada di kode (siap pakai F2):**
- Entitas `jadwal_kbm` (slot mingguan), `penugasan` (paket guru+mapel+kelas+TA), `siswa` (kelasId+status), `kalender_libur`, `tahun_ajaran`.
- Service `kurikulum.service.ts` dengan `listJadwal`, `getActiveTaIdOrThrow`, `listLibur`.
- Util `wib.util.ts` (todayWIB, formatWIB).
- AuditService dengan pola `log()` bernama.
- RolesGuard + `@Roles()`.
- ValidationPipe + DTO pattern.
- Frontend: lazy routes, useCachedList, komponen v0.12.x, e2e helpers.

**Yang perlu dibangun di F2:**
- Entitas baru: `presensi_sesi` (header) + `presensi_siswa` (detail).
- Modul NestJS: `presensi/` (entity + service + controller + module + DTO).
- Endpoint: `/api/guru/kbm` (GET sesi hari ini), `/api/guru/kbm/:jadwalId/roster` (GET+POST+PATCH), `/api/admin/presensi-siswa` (GET matriks + detail + koreksi).
- Frontend: `/guru/kbm` (daftar sesi), `/guru/kbm/:jadwalId` (roster grid), `/admin/presensi-siswa` (matriks).
- Hook R-07: entitas `pelanggaran` minimal (draft otomatis dari T).
- E2e spec: roster simpan, izin terkunci, T→R-07, cutoff, koreksi admin.

**Pertanyaan yang butuh keputusan user sebelum F2 dibuka:**
1. Struktur `presensi_sesi.status` (kolom vs diturunkan).
2. Soft delete vs hard delete presensi saat koreksi.
3. Mekanisme guru pengganti.
4. Hook R-07: build minimal di F2 atau tangguh ke F5.
5. Izin siswa terkunci: tangguh ke F4 atau buat minimal di F2.
6. Paginasi rekap presensi.
7. Performa query status sesi (batch).
8. Sesi tanpa roster = "tidak tercatat" (no auto-create).
