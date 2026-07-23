import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not, IsNull } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Guru } from '../guru/guru.entity';
import { Kelas } from '../kelas/kelas.entity';
import { Mapel } from '../kurikulum/mapel.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { KalenderLibur } from '../kurikulum/kalender-libur.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GuruPreviewEntry {
  kode: string;
  nama: string;
  mapel: string;
}

export interface KbmPreviewResult {
  tahapA: {
    mapel: number;
    guru: number;
    kelas: number;
    guruList: GuruPreviewEntry[];
    conflicts: string[];
  };
  tahapB: { wali: number; penugasan: number; conflicts: string[] };
  tahapC: {
    jadwal: number;
    libur: number;
    liburBreakdown: Record<string, number>;
    conflicts: string[];
    jadwalSkipped?: string[];
  };
  /** TA aktif dari DB (sumber kebenaran — impor TIDAK boleh membuat TA baru) */
  taAktifNama: string | null;
  /** TA yang disebut di file Excel (1. BEBAN R4) */
  fileTaNama: string | null;
  /** true = file menyebut TA yang tak cocok dgn TA aktif → konflik */
  taKonflik: boolean;
}

export interface KbmCommitResult {
  mapel: { tersimpan: number; dilewati: number };
  guru: { tersimpan: number; dilewati: number };
  kelas: { tersimpan: number; dilewati: number };
  wali: { tersimpan: number; dilewati: number };
  penugasan: { tersimpan: number; dilewati: number };
  jadwal: { tersimpan: number; dilewati: number };
  libur: { tersimpan: number; dilewati: number };
}

// ─── Service ────────────────────────────────────────────────────────────────

const HARI_KBM = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

@Injectable()
export class KbmImportService {
  private readonly logger = new Logger(KbmImportService.name);

  constructor(
    @InjectRepository(Guru) private guruRepo: Repository<Guru>,
    @InjectRepository(Kelas) private kelasRepo: Repository<Kelas>,
    @InjectRepository(Mapel) private mapelRepo: Repository<Mapel>,
    @InjectRepository(Penugasan) private penugasanRepo: Repository<Penugasan>,
    @InjectRepository(JadwalKbm) private jadwalRepo: Repository<JadwalKbm>,
    @InjectRepository(KalenderLibur) private liburRepo: Repository<KalenderLibur>,
    @InjectRepository(TahunAjaran) private taRepo: Repository<TahunAjaran>,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── PREVIEW ──────────────────────────────────────────────────────────────

  /**
   * Ekstrak teks dari nilai sel ExcelJS.
   * ExcelJS bisa mengembalikan: string, number, Date, { text, hyperlink }, { richText: [...] }.
   * String(value) pada object → "[object Object]" — harus diuraikan eksplisit.
   */
  private _cellText(val: ExcelJS.CellValue): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    if (val instanceof Date) return val.toISOString();
    // Rich text
    if (typeof val === 'object' && 'richText' in val) {
      const rt = (val as any).richText as Array<{ text: string }>;
      return (rt || []).map((r) => r.text || '').join('').trim();
    }
    // Hyperlink
    if (typeof val === 'object' && 'text' in val) {
      return String((val as any).text || '').trim();
    }
    // Fallback
    try {
      return String(val).trim();
    } catch {
      return '';
    }
  }

  /**
   * F3b — Baca TA dari file Excel (sheet "1. BEBAN").
   * Scan R1-R10, kolom 1-5 untuk pattern "TAHUN AJARAN 2026/2027".
   * Validasi tahun: harus dalam rentang 2000-2099 — angka di luar rentang
   * menandai sel terbaca sebagai serial-date Excel bukan tahun ajaran.
   * Return null jika tidak ditemukan (impor menempel ke TA aktif DB).
   */
  private _parseFileTa(wb: ExcelJS.Workbook): string | null {
    const ws = wb.getWorksheet('1. BEBAN');
    if (!ws) return null;

    // Scan beberapa baris dan kolom — posisi header bisa bervariasi antar versi file
    for (let r = 1; r <= 10; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= 8; c++) {
        const raw = this._cellText(row.getCell(c).value as ExcelJS.CellValue);
        if (!raw) continue;
        const m = raw.match(/(\d{4})\s*[-/]\s*(\d{4})/);
        if (m) {
          const y1 = parseInt(m[1], 10);
          const y2 = parseInt(m[2], 10);
          // Validasi tahun agar angka serial-date Excel (mis. 2144) tidak lolos
          if (y1 >= 2000 && y1 <= 2099 && y2 >= 2000 && y2 <= 2099) {
            return `${m[1]}/${m[2]}`;
          }
          // Tahun di luar rentang → kemungkinan serial-date, abaikan
          this.logger.warn(
            `_parseFileTa: tahun ${m[1]}/${m[2]} di luar rentang 2000-2099 (kemungkinan serial-date Excel). Sel R${r}C${c} diabaikan.`,
          );
        }
      }
    }
    return null;
  }

  /**
   * Cek apakah TA file cocok dengan TA aktif DB.
   * "2026/2027" cocok dengan "2026/2027 S1" atau "2026-2027".
   */
  private _taMatch(fileTa: string, dbTa: string): boolean {
    const norm = (s: string) => s.replace(/[-/]/g, '/').replace(/\s*S\d+\s*$/i, '').trim().toUpperCase();
    return norm(fileTa) === norm(dbTa);
  }

  async preview(buffer: Buffer): Promise<KbmPreviewResult> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);

    const tahapA = this._parseTahapA(wb);
    const tahapB = this._parseTahapB(wb);
    const tahapC = this._parseTahapC(wb);

    const ta = await this.taRepo.findOne({ where: { aktif: true } });
    const taAktifNama = ta ? `${ta.nama} S${ta.semester}` : null;
    const fileTaNama = this._parseFileTa(wb);
    const taKonflik = !!fileTaNama && !!taAktifNama && !this._taMatch(fileTaNama, taAktifNama);

    return {
      tahapA,
      tahapB,
      tahapC,
      taAktifNama,
      fileTaNama,
      taKonflik,
    };
  }

  // ─── COMMIT ────────────────────────────────────────────────────────────────

  async commit(
    buffer: Buffer,
    tahap: 'A' | 'B' | 'C' | 'ALL',
    req: Request,
  ): Promise<Partial<KbmCommitResult>> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);

    const ta = await this.taRepo.findOne({ where: { aktif: true } });
    if (!ta) throw new BadRequestException('Tidak ada Tahun Ajaran aktif');

    // FATAL guard: jika file menyebut TA yang tak cocok dgn TA aktif → tolak commit.
    // Mencegah penempelan data ke TA hantu (mis. 2144/2145 hasil bug seed/clock).
    const fileTaNama = this._parseFileTa(wb);
    if (fileTaNama && !this._taMatch(fileTaNama, `${ta.nama} S${ta.semester}`)) {
      throw new BadRequestException(
        `TA file ("${fileTaNama}") tidak cocok dengan TA aktif DB ("${ta.nama} S${ta.semester}"). ` +
          `Perbaiki TA aktif DB sebelum commit — impor tidak boleh membuat TA baru.`,
      );
    }

    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;

    const result: Partial<KbmCommitResult> = {};

    // Transaksi per tahap — kegagalan parsial di-rollback
    if (tahap === 'A' || tahap === 'ALL') {
      const r = await this._commitTahapA(wb, ta, actorId, req);
      result.mapel = r.mapel;
      result.guru = r.guru;
      result.kelas = r.kelas;
    }
    if (tahap === 'B' || tahap === 'ALL') {
      const r = await this._commitTahapB(wb, ta, actorId, req);
      result.wali = r.wali;
      result.penugasan = r.penugasan;
    }
    if (tahap === 'C' || tahap === 'ALL') {
      const r = await this._commitTahapC(wb, ta, actorId, req);
      result.jadwal = r.jadwal;
      result.libur = r.libur;
    }

    return result;
  }

  // ─── TAHAP A: Parse (Mapel + Guru + Kelas) ──────────────────────────────────

  private _parseTahapA(wb: ExcelJS.Workbook) {
    const mapelRows = this._parseMapel(wb);
    const guruRows = this._parseGuru(wb);
    const kelasRows = this._parseKelas(wb);

    const conflicts: string[] = [];
    // Cek duplikat kode guru dalam file (sudah didedup di _parseGuru, tapi cek konsistensi nama)
    const seenKode = new Map<string, string>();
    for (const g of guruRows) {
      if (g.kode && seenKode.has(g.kode)) {
        conflicts.push(`Kode guru duplikat: ${g.kode} (${g.nama} vs ${seenKode.get(g.kode)})`);
      } else if (g.kode) {
        seenKode.set(g.kode, g.nama);
      }
    }

    return {
      mapel: mapelRows.length,
      guru: guruRows.length,
      kelas: kelasRows.length,
      guruList: guruRows.map((g) => ({ kode: g.kode, nama: g.nama, mapel: g.mapel })),
      conflicts,
    };
  }

  /** ACUAN: parse mapel (kode, nama, JP). Baris mulai R4 (data). Dedup by kode.
   *  Kode mapel (MTK, BIN...) dipetakan ke nama lengkap via tabel singkatan standar.
   */
  private _parseMapel(wb: ExcelJS.Workbook): Array<{ kode: string; nama: string; jp: number }> {
    const ws = wb.getWorksheet('ACUAN');
    if (!ws) throw new BadRequestException('Sheet "ACUAN" tidak ditemukan');

    // Singkatan ACUAN → nama lengkap (konsisten dgn BEBAN yg pakai nama lengkap).
    // Tabel ini stabil dari tahun ke tahun (permendikbud).
    const KODE_TO_NAMA: Record<string, string> = {
      MTK: 'Matematika',
      BIN: 'Bahasa Indonesia',
      IPA: 'IPA',
      IPS: 'IPS',
      BING: 'Bahasa Inggris',
      PAI: 'PAI',
      PP: 'Pendidikan Pancasila',
      PJOK: 'PJOK',
      INF: 'Informatika',
      SBP: 'Seni Budaya',
      BADER: 'Bahasa Daerah',
      BAR: 'Bahasa Arab',
      INFORMATIKA: 'Informatika',
      KLASIKAL: 'Klasikal',
    };

    const seen = new Set<string>();
    const rows: Array<{ kode: string; nama: string; jp: number }> = [];
    for (let r = 4; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const kode = this._cellText(row.getCell(2).value as ExcelJS.CellValue); // C2
      if (!kode || kode === 'Mapel' || kode.toUpperCase() === 'NO') continue;
      if (kode.toUpperCase().includes('JUMLAH') || kode.toUpperCase().includes('TOTAL')) continue;
      const kodeUpper = kode.toUpperCase();
      if (seen.has(kodeUpper)) continue;
      seen.add(kodeUpper);
      const jpRaw = row.getCell(7).value;
      const jp = typeof jpRaw === 'number' ? jpRaw : parseInt(String(jpRaw ?? '0'), 10) || 0;
      const nama = KODE_TO_NAMA[kodeUpper] ?? kodeUpper;
      rows.push({ kode: kodeUpper, nama, jp });
    }
    return rows;
  }

  /**
   * 7. KODE: parse guru (kode, nama, mapel). Dua kolom paralel. Dedup by kode.
   * Hanya terima entri yang punya nomor urut INTEGER valid (C2 kiri / C7 kanan).
   * Baris "lanjutan" (no urut kosong atau bukan angka) = merge-cell semu → skip.
   * Baris header ("NO", "NAMA", dll.) punya nomor non-integer → skip.
   */
  private _parseGuru(wb: ExcelJS.Workbook): Array<{ kode: string; nama: string; mapel: string }> {
    const ws = wb.getWorksheet('7. KODE');
    if (!ws) throw new BadRequestException('Sheet "7. KODE" tidak ditemukan');

    const GURU_CODE_RE = /^[A-Z]\d{1,2}$/;

    const seen = new Set<string>();
    const rows: Array<{ kode: string; nama: string; mapel: string }> = [];
    for (let r = 13; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);

      // Kolom kiri: C2=nomor urut, C3=nama, C4=kode guru, C5=mapel ampu
      const noKiriRaw = row.getCell(2).value;
      // Nomor urut HARUS integer (1,2,3...) — reject string/null/non-numeric
      const noKiriNum = typeof noKiriRaw === 'number'
        ? Math.floor(noKiriRaw)
        : parseInt(this._cellText(noKiriRaw as ExcelJS.CellValue), 10);
      const namaKiri = this._cellText(row.getCell(3).value as ExcelJS.CellValue);
      const kodeKiri = this._cellText(row.getCell(4).value as ExcelJS.CellValue);
      const mapelKiri = this._cellText(row.getCell(5).value as ExcelJS.CellValue);
      if (
        !isNaN(noKiriNum) && noKiriNum > 0 &&
        GURU_CODE_RE.test(kodeKiri) && namaKiri && !seen.has(kodeKiri)
      ) {
        seen.add(kodeKiri);
        rows.push({ kode: kodeKiri, nama: namaKiri, mapel: mapelKiri });
      }

      // Kolom kanan: C7=nomor urut, C8=nama, C9=kode guru, C10=mapel ampu
      const noKananRaw = row.getCell(7).value;
      const noKananNum = typeof noKananRaw === 'number'
        ? Math.floor(noKananRaw)
        : parseInt(this._cellText(noKananRaw as ExcelJS.CellValue), 10);
      const namaKanan = this._cellText(row.getCell(8).value as ExcelJS.CellValue);
      const kodeKanan = this._cellText(row.getCell(9).value as ExcelJS.CellValue);
      const mapelKanan = this._cellText(row.getCell(10).value as ExcelJS.CellValue);
      if (
        !isNaN(noKananNum) && noKananNum > 0 &&
        GURU_CODE_RE.test(kodeKanan) && namaKanan && !seen.has(kodeKanan)
      ) {
        seen.add(kodeKanan);
        rows.push({ kode: kodeKanan, nama: namaKanan, mapel: mapelKanan });
      }
    }
    return rows;
  }

  /** 3. WALAS + 1. BEBAN "MENGAJAR KELAS": parse daftar kelas unik. */
  private _parseKelas(wb: ExcelJS.Workbook): string[] {
    const kelasSet = new Set<string>();

    // Dari 3. WALAS: kolom paralel (7A-7J, 8A-8F, 9A-9I)
    const wsWalas = wb.getWorksheet('3. WALAS');
    if (wsWalas) {
      for (let r = 1; r <= wsWalas.rowCount; r++) {
        const row = wsWalas.getRow(r);
        // Cek kolom 1, 5, 9 (3 kolom paralel) untuk kode kelas
        for (const col of [1, 5, 9]) {
          const val = this._cellText(row.getCell(col).value as ExcelJS.CellValue);
          if (val.match(/^\d[A-Z]$/)) {
            kelasSet.add(val);
          }
        }
      }
    }

    // Dari 1. BEBAN "MENGAJAR KELAS" — urai rentang
    const wsBeban = wb.getWorksheet('1. BEBAN');
    if (wsBeban) {
      for (let r = 8; r <= wsBeban.rowCount; r++) {
        const row = wsBeban.getRow(r);
        const kelasRaw = this._cellText(row.getCell(8).value as ExcelJS.CellValue); // C8 = MENGAJAR KELAS
        if (kelasRaw && kelasRaw !== '-') {
          const kelasList = this._uraiRentangKelas(kelasRaw);
          for (const k of kelasList) kelasSet.add(k);
        }
      }
    }

    return Array.from(kelasSet).sort();
  }

  // ─── TAHAP B: Parse (Wali + Penugasan) ─────────────────────────────────────

  private _parseTahapB(wb: ExcelJS.Workbook) {
    const waliRows = this._parseWali(wb);
    const penugasanRows = this._parsePenugasan(wb);

    const conflicts: string[] = [];

    return {
      wali: waliRows.length,
      penugasan: penugasanRows.length,
      conflicts,
    };
  }

  /** 3. WALAS: parse pasangan kelas:nama (3 kolom paralel). */
  private _parseWali(wb: ExcelJS.Workbook): Array<{ kelas: string; nama: string }> {
    const ws = wb.getWorksheet('3. WALAS');
    if (!ws) throw new BadRequestException('Sheet "3. WALAS" tidak ditemukan');

    const rows: Array<{ kelas: string; nama: string }> = [];
    // Data mulai R5. 3 kolom paralel: (C1=kelas, C3=nama), (C5=kelas, C7=nama), (C9=kelas, C11=nama)
    // Pattern: kode kelas di col 1/5/9, nama di col 3/7/11 (skip col 2/6/10 yang berisi ":")
    for (let r = 5; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const pairs: Array<[number, number]> = [[1, 3], [5, 7], [9, 11]];
      for (const [kelasCol, namaCol] of pairs) {
        const kelas = this._cellText(row.getCell(kelasCol).value as ExcelJS.CellValue);
        const nama = this._cellText(row.getCell(namaCol).value as ExcelJS.CellValue);
        if (kelas.match(/^\d[A-Z]$/) && nama && nama !== ':' && !nama.toUpperCase().includes('KELAS')) {
          rows.push({ kelas, nama });
        }
      }
    }
    return rows;
  }

  /** 1. BEBAN: parse penugasan (mapel × guru × daftar kelas). Merge cell → warisi. */
  private _parsePenugasan(wb: ExcelJS.Workbook): Array<{
    mapel: string; kodeGuru: string; kelas: string;
  }> {
    const ws = wb.getWorksheet('1. BEBAN');
    if (!ws) throw new BadRequestException('Sheet "1. BEBAN" tidak ditemukan');

    const rows: Array<{ mapel: string; kodeGuru: string; kelas: string }> = [];
    // Header R6: C1=MAPEL, C7=Kode, C8=MENGAJAR KELAS. Data mulai R8.
    let lastMapel = '';
    for (let r = 8; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const mapelRaw = this._cellText(row.getCell(1).value as ExcelJS.CellValue);
      // Merge cell: mapel kosong = warisan baris di atasnya
      if (mapelRaw && mapelRaw !== 'MAPEL' && !mapelRaw.toUpperCase().includes('JUMLAH')) {
        lastMapel = mapelRaw;
      }

      const kodeGuru = this._cellText(row.getCell(7).value as ExcelJS.CellValue);
      const kelasRaw = this._cellText(row.getCell(8).value as ExcelJS.CellValue);

      if (!kodeGuru || kodeGuru === 'Kode' || !lastMapel) continue;
      if (lastMapel.toUpperCase().includes('JUMLAH')) continue;
      if (!kelasRaw || kelasRaw === '-') continue;

      // Urai rentang kelas: "7A-E" → 7A,7B,7C,7D,7E; "9A-B, 9F-I" → 9A,9B,9F,9G,9H,9I
      const kelasList = this._uraiRentangKelas(kelasRaw);
      for (const kelas of kelasList) {
        rows.push({ mapel: lastMapel, kodeGuru, kelas });
      }
    }
    return rows;
  }

  // ─── TAHAP C: Parse (Jadwal + Libur) ────────────────────────────────────────

  private _parseTahapC(wb: ExcelJS.Workbook) {
    const jadwalRows = this._parseJadwal(wb);
    const liburRows = this._parseLibur(wb);

    // Breakdown by kode (mis. { LU: 56, CB: 2 }) supaya bisa diperiksa mata
    const liburBreakdown: Record<string, number> = {};
    for (const l of liburRows) {
      liburBreakdown[l.keterangan] = (liburBreakdown[l.keterangan] ?? 0) + 1;
    }

    return {
      jadwal: jadwalRows.length,
      libur: liburRows.length,
      liburBreakdown,
      conflicts: [],
      jadwalSkipped: [],
    };
  }

  /** 2. KBM: parse jadwal (kodeGuru per hari × jam × kelas). */
  private _parseJadwal(wb: ExcelJS.Workbook): Array<{
    kelas: string; hari: string; jamKe: number; kodeGuru: string;
  }> {
    const ws = wb.getWorksheet('2. KBM');
    if (!ws) throw new BadRequestException('Sheet "2. KBM" tidak ditemukan');

    const rows: Array<{ kelas: string; hari: string; jamKe: number; kodeGuru: string }> = [];

    // R8 = header: C1=Waktu, C2=Jam Ke, C3=SENIN, ... kelas names in R9
    // Each day block = ~10 rows. Days: SENIN-SABTU across columns.
    // C3+ in header row = day names. R9 = kelas names.
    // Actual KBM rows: jamKe is numeric (0,1,2,...8), skip ISTIRAHAT/Tahfidz/Kokulikuler.

    const headerRow = ws.getRow(8);
    const kelasRow = ws.getRow(9);

    // Build column→(day, kelas) mapping
    // Day changes when a new day name appears. Each day has ~9 rows of kelas columns.
    // Actually: C3-C27 in R8 = day names (SENIN spans multiple cols until SELASA starts)
    // R9 = kelas codes (7A, 7B...) per column
    // Simpler: each column 3-27 = one kelas. The "day" is determined by which block of rows.
    // KBM sheet structure: rows grouped by day. Day separator = merged cell in C1.
    // R8: C2=Jam Ke, C3=SENIN (merged across multiple kelas cols)
    // Let's parse by column: each col 3-27 = one kelas. Each row r=10+ = one jamKe.
    // Day boundaries: scan col 1 for day names OR infer from row blocks.

    // Map kelas per column
    const colKelas = new Map<number, string>();
    for (let col = 3; col <= 27; col++) {
      const kelas = this._cellText(kelasRow.getCell(col).value as ExcelJS.CellValue);
      if (kelas.match(/^\d[A-Z]$/)) {
        colKelas.set(col, kelas);
      }
    }

    // Parse rows: scan for day markers in col 3 (merged cells span day blocks)
    let currentDay = '';
    for (let r = 10; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const jamKeRaw = row.getCell(2).value;
      const jamKe = typeof jamKeRaw === 'number' ? jamKeRaw : parseInt(this._cellText(jamKeRaw as ExcelJS.CellValue), 10);

      // Detect day change: if C3 has a day name (from merged cell top-left)
      const c3val = this._cellText(row.getCell(3).value as ExcelJS.CellValue).toUpperCase();
      if (HARI_KBM.includes(c3val)) {
        currentDay = c3val;
      }

      // Skip non-numeric jamKe (ISTIRAHAT, Tahfidz, etc.)
      if (isNaN(jamKe) || !currentDay) continue;

      // For each kelas column, extract guru kode
      for (const [col, kelas] of colKelas) {
        const kodeGuru = this._cellText(row.getCell(col).value as ExcelJS.CellValue);
        if (kodeGuru && kodeGuru.match(/^[A-Z]\d{1,2}$/) ) {
          rows.push({ kelas, hari: currentDay, jamKe, kodeGuru });
        }
      }
    }

    return rows;
  }

  /**
   * 5. KALDIK: parse kalender libur (bulan × tanggal, kode LU/CB).
   *
   * Struktur sheet: R3=header, R5+ = satu baris per bulan.
   * Kolom B (col 2) = nama bulan + tahun. Kolom C-AG (col 3-33) = tanggal 1-31.
   *
   * BUG FIX (libur=0): Sel bulan di KALDIK sering disimpan Excel sebagai tipe DATE
   * (bukan string), sehingga ExcelJS mengembalikan Date object → _cellText() → ISO string
   * → regex monthMatch gagal → 0 baris. Fix: deteksi Date instance dan konversi
   * ke "BULAN YYYY" secara eksplisit sebelum match.
   *
   * Juga support: rentang libur dalam satu bulan (sel berisi "LU" berulang).
   */
  private _parseLibur(wb: ExcelJS.Workbook): Array<{ tanggal: string; keterangan: string }> {
    const ws = wb.getWorksheet('5. KALDIK');
    if (!ws) throw new BadRequestException('Sheet "5. KALDIK" tidak ditemukan');

    const rows: Array<{ tanggal: string; keterangan: string }> = [];

    const MONTH_NAMES_ID = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
    ];
    const monthMap: Record<string, number> = {};
    MONTH_NAMES_ID.forEach((m, i) => { monthMap[m] = i + 1; });

    // Kode libur yang diterima — kode kegiatan (KO, PSAJ, dll.) dibuang.
    const LIBUR_CODES = new Set(['LU', 'CB', 'LHB', 'LIBUR UMUM', 'CUTI BERSAMA']);

    /**
     * Ekstrak teks bulan dari nilai sel kolom B.
     * Sel bisa berupa: string "JULI 2026", Date (ExcelJS decode dari format date),
     * richText, atau number (serial). Harus return "NAMA_BULAN YYYY" uppercase.
     */
    const extractBulanStr = (cellVal: ExcelJS.CellValue): string => {
      // CASE: ExcelJS mengembalikan Date object (sel berformat date di Excel)
      if (cellVal instanceof Date) {
        const d = cellVal as Date;
        return `${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
      }
      // CASE: number (Excel date serial)
      if (typeof cellVal === 'number' && cellVal > 1000) {
        // Konversi Excel serial ke Date: epoch Excel = 1899-12-30
        const msPerDay = 86400000;
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(excelEpoch.getTime() + cellVal * msPerDay);
        return `${MONTH_NAMES_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      }
      // CASE: string / richText / dll
      return this._cellText(cellVal).toUpperCase();
    };

    for (let r = 5; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const bulanRaw = extractBulanStr(row.getCell(2).value as ExcelJS.CellValue);
      if (!bulanRaw) continue;

      // Extract month + year: "JULI  2026" (spasi ganda OK via \s+)
      const monthMatch = bulanRaw.match(/([A-Z]+)\s+(\d{4})/);
      if (!monthMatch) continue;
      const monthName = monthMatch[1];
      const year = parseInt(monthMatch[2], 10);
      const month = monthMap[monthName];
      if (!month) continue;
      // Validasi tahun masuk akal
      if (year < 2000 || year > 2100) continue;

      // Scan hari C3-C33 (hari ke-1 di col 3, hari ke-31 di col 33)
      for (let day = 1; day <= 31; day++) {
        const dayCell = row.getCell(day + 2);
        const rawVal = dayCell.value;

        // Jika sel Date (hari normal berformat date) → bukan kode libur
        if (rawVal instanceof Date) continue;

        const valStr = this._cellText(rawVal as ExcelJS.CellValue).toUpperCase().trim();
        if (!valStr) continue;
        // Skip angka murni (isian tanggal angka atau angka serial)
        if (/^\d+$/.test(valStr)) continue;
        // Bersihkan prefix ":" → "CUTI BERSAMA"
        const cleaned = valStr.replace(/^[:\s]+/, '').trim();
        if (!cleaned) continue;
        // Terima hanya kode libur yang valid
        if (!LIBUR_CODES.has(cleaned)) continue;

        const tanggal = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        rows.push({ tanggal, keterangan: cleaned });
      }
    }

    return rows;
  }

  // ─── COMMIT: Tahap A ──────────────────────────────────────────────────────

  private async _commitTahapA(
    wb: ExcelJS.Workbook,
    ta: TahunAjaran,
    actorId: number | null,
    req: Request,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // ── Mapel: upsert by kode (ACUAN) + tambah dari BEBAN jika belum ada ──
      const mapelRows = this._parseMapel(wb);
      let mapelTersimpan = 0, mapelDilewati = 0;
      for (const m of mapelRows) {
        const existing = await queryRunner.manager.findOne(Mapel, { where: { kode: m.kode } });
        if (existing) {
          existing.nama = m.nama;
          await queryRunner.manager.save(existing);
          mapelDilewati++;
        } else {
          await queryRunner.manager.save(Mapel, { kode: m.kode, nama: m.nama, urutan: 0 });
          mapelTersimpan++;
        }
      }
      // Tambah mapel dari BEBAN yang belum ada di ACUAN (mis. Prakarya)
      const bebanMapelNames = this._parseUniqueMapelFromBeban(wb);
      for (const nama of bebanMapelNames) {
        const norm = this._normalizeMapelNama(nama);
        // Cek apakah sudah ada (by normalized nama)
        const existing = await queryRunner.manager
          .createQueryBuilder(Mapel, 'm')
          .where('UPPER(m.nama) = :nama', { nama: norm })
          .getOne();
        if (!existing) {
          // Buat mapel baru dengan kode = nama (tidak ada kode ACUAN)
          await queryRunner.manager.save(Mapel, { kode: norm, nama, urutan: 0 });
          mapelTersimpan++;
        }
      }

      // ── Guru: upsert by kode (email kosong) ──
      const guruRows = this._parseGuru(wb);
      let guruTersimpan = 0, guruDilewati = 0;
      for (const g of guruRows) {
        if (!g.kode) continue;
        const existing = await queryRunner.manager.findOne(Guru, { where: { kode: g.kode } });
        if (existing) {
          existing.nama = g.nama;
          await queryRunner.manager.save(existing);
          guruDilewati++;
        } else {
          await queryRunner.manager.save(Guru, {
            nama: g.nama,
            kode: g.kode,
            nip: null,
            email: null,
            jenisKelamin: 'L',
            fotoUrl: '',
            status: 'aktif',
            faceStatus: 'BELUM',
          });
          guruTersimpan++;
        }
      }

      // ── Kelas: upsert by nama ──
      const kelasList = this._parseKelas(wb);
      let kelasTersimpan = 0, kelasDilewati = 0;
      for (const kelasNama of kelasList) {
        const tingkat = parseInt(kelasNama[0], 10);
        const fase = tingkat === 7 ? 'D' : tingkat === 8 ? 'E' : 'F';
        const existing = await queryRunner.manager.findOne(Kelas, { where: { nama: kelasNama } });
        if (existing) {
          kelasDilewati++;
        } else {
          await queryRunner.manager.save(Kelas, {
            nama: kelasNama,
            tingkat,
            fase,
            waliGuruId: null,
          });
          kelasTersimpan++;
        }
      }

      await queryRunner.commitTransaction();

      await this.audit.log({
        actorId,
        action: 'IMPORT_KBM_TAHAP_A',
        resource: 'import-kbm',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Tahap A: ${mapelTersimpan} mapel baru, ${guruTersimpan} guru baru, ${kelasTersimpan} kelas baru`,
      });

      return {
        mapel: { tersimpan: mapelTersimpan, dilewati: mapelDilewati },
        guru: { tersimpan: guruTersimpan, dilewati: guruDilewati },
        kelas: { tersimpan: kelasTersimpan, dilewati: kelasDilewati },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── COMMIT: Tahap B ──────────────────────────────────────────────────────

  private async _commitTahapB(
    wb: ExcelJS.Workbook,
    ta: TahunAjaran,
    actorId: number | null,
    req: Request,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // ── Wali kelas: set waliGuruId di Kelas ──
      const waliRows = this._parseWali(wb);
      let waliTersimpan = 0, waliDilewati = 0;
      // Build kode→guruId map
      const guruByNama = new Map<string, number>();
      const allGuru = await queryRunner.manager.find(Guru);
      for (const g of allGuru) {
        guruByNama.set(g.nama.toLowerCase(), g.id);
      }

      for (const w of waliRows) {
        const kelas = await queryRunner.manager.findOne(Kelas, { where: { nama: w.kelas } });
        if (!kelas) { waliDilewati++; continue; }
        // Match by nama (could be with/without gelar — try exact + partial)
        let guruId = guruByNama.get(w.nama.toLowerCase());
        if (!guruId) {
          // Try partial match (nama without gelar)
          for (const [namaKey, id] of guruByNama) {
            if (namaKey.startsWith(w.nama.toLowerCase().split(',')[0].toLowerCase())) {
              guruId = id;
              break;
            }
          }
        }
        if (guruId) {
          kelas.waliGuruId = guruId;
          await queryRunner.manager.save(kelas);
          waliTersimpan++;
        } else {
          waliDilewati++;
        }
      }

      // ── Penugasan: upsert by (mapelId, kelasId, tahunAjaranId) ──
      const penugasanRows = this._parsePenugasan(wb);
      // Build kode→guruId + mapelNama→mapelId maps
      const guruByKode = new Map<string, number>();
      for (const g of allGuru) {
        if (g.kode) guruByKode.set(g.kode, g.id);
      }
      const allMapel = await queryRunner.manager.find(Mapel);
      const mapelByNama = new Map<string, number>();
      const mapelByKode = new Map<string, number>();
      for (const m of allMapel) {
        mapelByNama.set(this._normalizeMapelNama(m.nama), m.id);
        if (m.kode) mapelByKode.set(m.kode.toUpperCase(), m.id);
      }
      const allKelas = await queryRunner.manager.find(Kelas);
      const kelasByNama = new Map<string, number>();
      for (const k of allKelas) {
        kelasByNama.set(k.nama, k.id);
      }

      let penugasanTersimpan = 0, penugasanDilewati = 0;
      for (const p of penugasanRows) {
        const guruId = guruByKode.get(p.kodeGuru);
        // Match mapel by normalized nama (BEBAN uses "I P S", "P A I", "Pendidikan Pancasila") or kode
        const normNama = this._normalizeMapelNama(p.mapel);
        const mapelId = mapelByNama.get(normNama) ?? mapelByKode.get(p.mapel.toUpperCase());
        const kelasId = kelasByNama.get(p.kelas);
        if (!guruId || !mapelId || !kelasId) {
          penugasanDilewati++;
          continue;
        }
        // Upsert by unique key (mapelId, kelasId, tahunAjaranId)
        const existing = await queryRunner.manager.findOne(Penugasan, {
          where: { mapelId, kelasId, tahunAjaranId: ta.id },
        });
        if (existing) {
          existing.guruId = guruId;
          await queryRunner.manager.save(existing);
          penugasanDilewati++;
        } else {
          await queryRunner.manager.save(Penugasan, {
            mapelId, kelasId, guruId, tahunAjaranId: ta.id,
          });
          penugasanTersimpan++;
        }
      }

      await queryRunner.commitTransaction();

      await this.audit.log({
        actorId,
        action: 'IMPORT_KBM_TAHAP_B',
        resource: 'import-kbm',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Tahap B: ${waliTersimpan} wali, ${penugasanTersimpan} penugasan baru`,
      });

      return {
        wali: { tersimpan: waliTersimpan, dilewati: waliDilewati },
        penugasan: { tersimpan: penugasanTersimpan, dilewati: penugasanDilewati },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── COMMIT: Tahap C ──────────────────────────────────────────────────────

  private async _commitTahapC(
    wb: ExcelJS.Workbook,
    ta: TahunAjaran,
    actorId: number | null,
    req: Request,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // ── Kalender libur: upsert by tanggal ──
      const liburRows = this._parseLibur(wb);
      let liburTersimpan = 0, liburDilewati = 0;
      for (const l of liburRows) {
        const existing = await queryRunner.manager.findOne(KalenderLibur, {
          where: { tanggal: l.tanggal },
        });
        if (existing) {
          existing.keterangan = l.keterangan;
          await queryRunner.manager.save(existing);
          liburDilewati++;
        } else {
          await queryRunner.manager.save(KalenderLibur, {
            tanggal: l.tanggal,
            keterangan: l.keterangan,
          });
          liburTersimpan++;
        }
      }

      // ── Jadwal KBM: upsert ──
      // NOTE: Jadwal parsing paling rumit (merge cell besar).
      // Penugasan harus sudah ada (Tahap B). Link jadwal→penugasan via (mapelNama, kelas, guru).
      // Karena 2.KBM cell berisi kodeGuru saja (mis. "A3"), kita cari penugasan
      // yang guru.kode = A3 di kelas tsb. Jika ambigu (guru ampu multiple mapel di kelas sama),
      // skip + log.
      const jadwalRows = this._parseJadwal(wb);
      const allGuru = await queryRunner.manager.find(Guru);
      const guruByKode = new Map<string, number>();
      for (const g of allGuru) {
        if (g.kode) guruByKode.set(g.kode, g.id);
      }
      const allKelas = await queryRunner.manager.find(Kelas);
      const kelasByNama = new Map<string, number>();
      for (const k of allKelas) {
        kelasByNama.set(k.nama, k.id);
      }
      const allPenugasan = await queryRunner.manager.find(Penugasan, {
        where: { tahunAjaranId: ta.id },
      });

      let jadwalTersimpan = 0, jadwalDilewati = 0;
      for (const j of jadwalRows) {
        const guruId = guruByKode.get(j.kodeGuru);
        const kelasId = kelasByNama.get(j.kelas);
        if (!guruId || !kelasId) { jadwalDilewati++; continue; }

        // Cari penugasan untuk guru+kelas ini
        const penugasan = allPenugasan.filter(
          (p) => p.guruId === guruId && p.kelasId === kelasId,
        );
        if (penugasan.length === 0) {
          jadwalDilewati++;
          continue;
        }
        if (penugasan.length > 1) {
          // Ambigu — ambil yang pertama, log warning
          this.logger.warn(`Jadwal ambigu: guru ${j.kodeGuru} kelas ${j.kelas} punya ${penugasan.length} penugasan`);
        }
        const penugasanId = penugasan[0].id;

        // Hitung jam dari jamKe (jamKe 3 = 09:30-10:00, etc.)
        const jamMulai = this._jamKeToTime(j.jamKe);
        const jamSelesai = this._jamKeToTime(j.jamKe + 1);
        const hariNum = HARI_KBM.indexOf(j.hari) + 1;

        // Upsert by (penugasanId, hari, jamMulai)
        const existing = await queryRunner.manager.findOne(JadwalKbm, {
          where: { penugasanId, hari: hariNum, jamMulai },
        });
        if (existing) {
          jadwalDilewati++;
        } else {
          await queryRunner.manager.save(JadwalKbm, {
            penugasanId,
            hari: hariNum,
            jamMulai,
            jamSelesai,
            sesiKe: j.jamKe,
          });
          jadwalTersimpan++;
        }
      }

      await queryRunner.commitTransaction();

      await this.audit.log({
        actorId,
        action: 'IMPORT_KBM_TAHAP_C',
        resource: 'import-kbm',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Tahap C: ${jadwalTersimpan} jadwal baru, ${liburTersimpan} libur baru`,
      });

      return {
        jadwal: { tersimpan: jadwalTersimpan, dilewati: jadwalDilewati },
        libur: { tersimpan: liburTersimpan, dilewati: liburDilewati },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Normalisasi nama mapel untuk matching yang robust:
   * - "I P S" → "IPS", "P A I" → "PAI"
   * - "Pend. Pancasila" → "Pendidikan Pancasila"
   * - uppercase + trim
   */
  private _normalizeMapelNama(nama: string): string {
    let s = nama.toUpperCase().trim();
    // Remove ALL spaces between single letters: "I P S" → "IPS", "P A I" → "PAI"
    s = s.replace(/([A-Z])\s+(?=[A-Z])/g, '$1');
    // Normalize abbreviations
    const aliases: Record<string, string> = {
      'PEND. PANCASILA': 'PENDIDIKAN PANCASILA',
      'PEND PANCASILA': 'PENDIDIKAN PANCASILA',
      'BK': 'BIMBINGAN KONSELING',
      'PRAKARYA': 'PRAKARYA',
      'SBP': 'SENI BUDAYA',
    };
    return aliases[s] ?? s;
  }

  /** Parse unique mapel names from 1. BEBAN (full names: "Matematika", "Prakarya"...). */
  private _parseUniqueMapelFromBeban(wb: ExcelJS.Workbook): string[] {
    const ws = wb.getWorksheet('1. BEBAN');
    if (!ws) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (let r = 8; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const mapel = this._cellText(row.getCell(1).value as ExcelJS.CellValue);
      if (!mapel || mapel === 'MAPEL' || mapel.toUpperCase().includes('JUMLAH')) continue;
      if (!seen.has(mapel.toUpperCase())) {
        seen.add(mapel.toUpperCase());
        result.push(mapel);
      }
    }
    return result;
  }

  /**
   * Urai rentang kelas: "7A-E" → [7A,7B,7C,7D,7E]; "8B-D, 9G" → [8B,8C,8D,9G]
   * Format: comma-separated, each item is either single "7A" or range "7A-E".
   */
  private _uraiRentangKelas(raw: string): string[] {
    const result: string[] = [];
    // Split by comma, semicolon, or space
    const parts = raw.split(/[,;\s]+/).filter(Boolean);
    for (const part of parts) {
      const trimmed = part.trim().toUpperCase();
      // Range pattern: "7A-E" or "7A-7E"
      const rangeMatch = trimmed.match(/^(\d)([A-Z])-([A-Z])$/);
      if (rangeMatch) {
        const tingkat = rangeMatch[1];
        const start = rangeMatch[2].charCodeAt(0);
        const end = rangeMatch[3].charCodeAt(0);
        for (let c = start; c <= end; c++) {
          result.push(`${tingkat}${String.fromCharCode(c)}`);
        }
        continue;
      }
      // Range with full end: "7A-7E"
      const rangeMatch2 = trimmed.match(/^(\d)([A-Z])-(\d)([A-Z])$/);
      if (rangeMatch2) {
        const tingkat = rangeMatch2[1];
        const start = rangeMatch2[2].charCodeAt(0);
        const end = rangeMatch2[4].charCodeAt(0);
        for (let c = start; c <= end; c++) {
          result.push(`${tingkat}${String.fromCharCode(c)}`);
        }
        continue;
      }
      // Single kelas: "7A"
      if (trimmed.match(/^\d[A-Z]$/)) {
        result.push(trimmed);
      }
    }
    return result;
  }

  /** Convert jamKe (1-8) to time string. JamKe 1=08:30, 2=09:00, 3=09:30, 4=10:00, 5=11:00, 6=11:30, 7=12:00, 8=12:30. */
  private _jamKeToTime(jamKe: number): string {
    const base = { h: 8, m: 30 };
    const slots: Record<number, string> = {
      0: '06:30', 1: '08:30', 2: '09:00', 3: '09:30', 4: '10:00',
      5: '11:00', 6: '11:30', 7: '12:00', 8: '12:30',
    };
    return slots[jamKe] ?? '00:00';
  }
}
