import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Guru, JenisKelamin as GuruJK } from '../guru/guru.entity';
import { Siswa, JenisKelamin as SiswaJK } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';

export type ImportJenis = 'guru' | 'siswa';

export interface ImportCellError {
  baris: number;
  kolom: string;
  pesan: string;
}

export interface ImportPreviewResult {
  valid: number;
  errors: ImportCellError[];
}

export interface ImportCommitResult {
  tersimpan: number;
  dilewati: number;
}

/**
 * Definisi kolom template per spec §14.10.2.
 * - headerKey = nama header persis di Excel (case-insensitive saat dibaca).
 * - required = wajib diisi (sesuai tanda *).
 * - maxLength = batas karakter (null = tidak dicek).
 */
interface ColumnDef {
  headerKey: string;
  entityField: string;
  required: boolean;
  maxLength?: number;
  /** validasi tambahan: 'jk' | 'tanggal' | null */
  kind?: 'jk' | 'tanggal';
}

const GURU_COLUMNS: ColumnDef[] = [
  { headerKey: 'nama', entityField: 'nama', required: true, maxLength: 255 },
  { headerKey: 'nip', entityField: 'nip', required: false, maxLength: 30 },
  { headerKey: 'jk', entityField: 'jenisKelamin', required: true, kind: 'jk' },
  { headerKey: 'telepon', entityField: 'telepon', required: false, maxLength: 30 },
];

const SISWA_COLUMNS: ColumnDef[] = [
  { headerKey: 'nama', entityField: 'nama', required: true, maxLength: 255 },
  { headerKey: 'nis', entityField: 'nis', required: true, maxLength: 30 },
  { headerKey: 'nisn', entityField: 'nisn', required: false, maxLength: 30 },
  { headerKey: 'jk', entityField: 'jenisKelamin', required: true, kind: 'jk' },
  { headerKey: 'kelas', entityField: 'kelas', required: false, maxLength: 100 },
  {
    headerKey: 'tanggal_lahir',
    entityField: 'tanggalLahir',
    required: false,
    kind: 'tanggal',
  },
  {
    headerKey: 'tempat_lahir',
    entityField: 'tempatLahir',
    required: false,
    maxLength: 100,
  },
  { headerKey: 'agama', entityField: 'agama', required: false, maxLength: 50 },
  { headerKey: 'alamat', entityField: 'alamat', required: false, maxLength: 500 },
  {
    headerKey: 'telepon',
    entityField: 'telepon',
    required: false,
    maxLength: 30,
  },
  {
    headerKey: 'nama_ayah',
    entityField: 'namaAyah',
    required: false,
    maxLength: 200,
  },
  {
    headerKey: 'pekerjaan_ayah',
    entityField: 'pekerjaanAyah',
    required: false,
    maxLength: 100,
  },
  {
    headerKey: 'nama_ibu',
    entityField: 'namaIbu',
    required: false,
    maxLength: 200,
  },
  {
    headerKey: 'pekerjaan_ibu',
    entityField: 'pekerjaanIbu',
    required: false,
    maxLength: 100,
  },
];

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Guru) private readonly guruRepo: Repository<Guru>,
    @InjectRepository(Siswa) private readonly siswaRepo: Repository<Siswa>,
    @InjectRepository(Kelas) private readonly kelasRepo: Repository<Kelas>,
    private readonly audit: AuditService,
  ) {}

  /**
   * GET template: hasilkan file .xlsx berisi header + 1 baris contoh.
   */
  async generateTemplate(jenis: ImportJenis): Promise<Buffer> {
    if (jenis !== 'guru' && jenis !== 'siswa') {
      throw new BadRequestException(
        'Parameter jenis wajib bernilai guru atau siswa',
      );
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(jenis === 'guru' ? 'Guru' : 'Siswa');
    const cols = jenis === 'guru' ? GURU_COLUMNS : SISWA_COLUMNS;
    ws.columns = cols.map((c) => ({
      header: c.headerKey,
      key: c.headerKey,
      width: Math.max(14, c.headerKey.length + 4),
    }));
    ws.getRow(1).font = { bold: true };

    if (jenis === 'guru') {
      ws.addRow({
        nama: 'Contoh Guru',
        nip: '198501012010012001',
        jk: 'L',
        telepon: '081234567890',
      });
    } else {
      ws.addRow({
        nama: 'Contoh Siswa',
        nis: '2324001',
        nisn: '0071234567',
        jk: 'L',
        kelas: 'VII-A',
        tanggal_lahir: '2012-05-14',
        tempat_lahir: 'Bandung',
        agama: 'Islam',
        alamat: 'Jl. Contoh No.1',
        telepon: '081234567890',
        nama_ayah: 'Contoh Ayah',
        pekerjaan_ayah: 'Wiraswasta',
        nama_ibu: 'Contoh Ibu',
        pekerjaan_ibu: 'Ibu Rumah Tangga',
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }

  /**
   * POST preview: validasi struktur + isi, kembalikan errors per baris/kolom.
   * Tidak menulis ke DB.
   */
  async preview(
    jenis: ImportJenis,
    buffer: Buffer,
  ): Promise<ImportPreviewResult> {
    if (jenis !== 'guru' && jenis !== 'siswa') {
      throw new BadRequestException(
        'Parameter jenis wajib bernilai guru atau siswa',
      );
    }
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File Excel kosong');
    }

    const cols = jenis === 'guru' ? GURU_COLUMNS : SISWA_COLUMNS;

    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer as any);
    } catch (e: any) {
      throw new BadRequestException(
        'File bukan Excel yang valid atau rusak: ' +
          (e?.message ?? 'kesalahan tidak diketahui'),
      );
    }

    const sheet = wb.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Sheet tidak ditemukan dalam file');
    }

    // ===== Bangun peta kolom dari header =====
    const headerCells: Record<string, number> = {};
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const v = String(cell.value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
      if (v) headerCells[v] = colNumber;
    });

    // Validasi header: kolom wajib harus ada (semua required)
    const missingHeaders = cols
      .filter((c) => c.required)
      .filter((c) => headerCells[c.headerKey] == null)
      .map((c) => c.headerKey);
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        'Header kolom wajib hilang: ' + missingHeaders.join(', '),
      );
    }

    // ===== Ambil baris data =====
    const rows: Array<{ rowNumber: number; data: Record<string, string> }> = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      // baris benar-benar kosong → skip (tidak dihitung valid/error)
      const allEmpty = cols.every((c) => {
        const colNum = headerCells[c.headerKey];
        if (!colNum) return true;
        const v = row.getCell(colNum).value;
        return v == null || String(v).trim() === '';
      });
      if (allEmpty) continue;
      const data: Record<string, string> = {};
      for (const c of cols) {
        const colNum = headerCells[c.headerKey];
        if (!colNum) continue;
        const v = row.getCell(colNum).value;
        data[c.entityField] = v == null ? '' : String(v).trim();
      }
      rows.push({ rowNumber: r, data });
    }

    if (rows.length === 0) {
      return { valid: 0, errors: [] };
    }

    // ===== Validasi per baris =====
    const errors: ImportCellError[] = [];

    // Untuk siswa: butuh peta kelas (case-insensitive nama)
    let kelasMap = new Map<string, number>();
    if (jenis === 'siswa') {
      const allKelas = await this.kelasRepo.find();
      kelasMap = new Map(
        allKelas.map((k) => [String(k.nama).toLowerCase(), k.id]),
      );
    }

    // Deteksi duplikat di-file (per kolom unik)
    const seenNip = new Set<string>();
    const seenNis = new Set<string>();
    const seenNisn = new Set<string>();
    const rowNip = new Map<string, number>();
    const rowNis = new Map<string, number>();
    const rowNisn = new Map<string, number>();

    for (const { rowNumber, data } of rows) {
      for (const c of cols) {
        const raw = data[c.entityField] ?? '';
        const value = raw.trim();

        // Wajib
        if (c.required && value === '') {
          errors.push({
            baris: rowNumber,
            kolom: c.headerKey,
            pesan: 'Wajib diisi',
          });
          continue;
        }
        if (value === '') continue; // kolom kosong non-required → lewati

        // Max length
        if (c.maxLength && value.length > c.maxLength) {
          errors.push({
            baris: rowNumber,
            kolom: c.headerKey,
            pesan: `Maksimal ${c.maxLength} karakter`,
          });
        }

        // Validasi jenis
        if (c.kind === 'jk') {
          const v = value.toUpperCase();
          if (!['L', 'P'].includes(v)) {
            errors.push({
              baris: rowNumber,
              kolom: c.headerKey,
              pesan: 'Harus L atau P',
            });
          }
        }
        if (c.kind === 'tanggal' && value) {
          // Izinkan YYYY-MM-DD atau DD/MM/YYYY
          if (!this.isValidDateString(value)) {
            errors.push({
              baris: rowNumber,
              kolom: c.headerKey,
              pesan: 'Format tanggal tidak valid (YYYY-MM-DD)',
            });
          }
        }
      }

      // Duplikat di-file
      if (jenis === 'guru') {
        const nip = (data['nip'] ?? '').trim();
        if (nip) {
          if (rowNip.has(nip)) {
            errors.push({
              baris: rowNumber,
              kolom: 'nip',
              pesan: `Duplikat dengan baris ${rowNip.get(nip)}`,
            });
          } else {
            rowNip.set(nip, rowNumber);
          }
          seenNip.add(nip);
        }
      } else {
        const nis = (data['nis'] ?? '').trim();
        if (nis) {
          if (rowNis.has(nis)) {
            errors.push({
              baris: rowNumber,
              kolom: 'nis',
              pesan: `Duplikat dengan baris ${rowNis.get(nis)}`,
            });
          } else {
            rowNis.set(nis, rowNumber);
          }
          seenNis.add(nis);
        }
        const nisn = (data['nisn'] ?? '').trim();
        if (nisn) {
          if (rowNisn.has(nisn)) {
            errors.push({
              baris: rowNumber,
              kolom: 'nisn',
              pesan: `Duplikat dengan baris ${rowNisn.get(nisn)}`,
            });
          } else {
            rowNisn.set(nisn, rowNumber);
          }
          seenNisn.add(nisn);
        }
      }

      // Kelas harus ditemukan di DB (untuk siswa)
      if (jenis === 'siswa') {
        const kelas = (data['kelas'] ?? '').trim();
        if (kelas && !kelasMap.has(kelas.toLowerCase())) {
          errors.push({
            baris: rowNumber,
            kolom: 'kelas',
            pesan: `Kelas "${kelas}" tidak ditemukan`,
          });
        }
      }
    }

    // ===== Validasi duplikat di-DB =====
    if (jenis === 'guru' && seenNip.size > 0) {
      const dupes = await this.guruRepo.find({
        where: { nip: In(Array.from(seenNip)) },
      });
      const nipToId = new Map(dupes.map((g) => [g.nip as string, g.id]));
      for (const { rowNumber, data } of rows) {
        const nip = (data['nip'] ?? '').trim();
        if (nip && nipToId.has(nip)) {
          errors.push({
            baris: rowNumber,
            kolom: 'nip',
            pesan: 'NIP sudah terdaftar di database',
          });
        }
      }
    }
    if (jenis === 'siswa') {
      if (seenNis.size > 0) {
        const dupesNis = await this.siswaRepo.find({
          where: { nis: In(Array.from(seenNis)) },
        });
        const nisToId = new Map(dupesNis.map((s) => [s.nis as string, s.id]));
        for (const { rowNumber, data } of rows) {
          const nis = (data['nis'] ?? '').trim();
          if (nis && nisToId.has(nis)) {
            errors.push({
              baris: rowNumber,
              kolom: 'nis',
              pesan: 'NIS sudah terdaftar di database',
            });
          }
        }
      }
      if (seenNisn.size > 0) {
        const dupesNisn = await this.siswaRepo.find({
          where: { nisn: In(Array.from(seenNisn)) },
        });
        const nisnToId = new Map(
          dupesNisn.map((s) => [s.nisn as string, s.id]),
        );
        for (const { rowNumber, data } of rows) {
          const nisn = (data['nisn'] ?? '').trim();
          if (nisn && nisnToId.has(nisn)) {
            errors.push({
              baris: rowNumber,
              kolom: 'nisn',
              pesan: 'NISN sudah terdaftar di database',
            });
          }
        }
      }
    }

    // Hitung valid = baris tanpa error SATUPUN
    const errorRows = new Set(errors.map((e) => e.baris));
    const valid = rows.filter((r) => !errorRows.has(r.rowNumber)).length;

    return { valid, errors };
  }

  /**
   * POST commit: parse + validasi ulang + insert DB (HANYA baris valid).
   */
  async commit(
    jenis: ImportJenis,
    buffer: Buffer,
    req: Request,
  ): Promise<ImportCommitResult> {
    if (jenis !== 'guru' && jenis !== 'siswa') {
      throw new BadRequestException(
        'Parameter jenis wajib bernilai guru atau siswa',
      );
    }
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File Excel kosong');
    }

    const cols = jenis === 'guru' ? GURU_COLUMNS : SISWA_COLUMNS;

    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer as any);
    } catch (e: any) {
      throw new BadRequestException(
        'File bukan Excel yang valid atau rusak: ' +
          (e?.message ?? 'kesalahan tidak diketahui'),
      );
    }

    const sheet = wb.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Sheet tidak ditemukan dalam file');
    }

    const headerCells: Record<string, number> = {};
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const v = String(cell.value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
      if (v) headerCells[v] = colNumber;
    });

    const rows: Array<{ rowNumber: number; data: Record<string, string> }> = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const allEmpty = cols.every((c) => {
        const colNum = headerCells[c.headerKey];
        if (!colNum) return true;
        const v = row.getCell(colNum).value;
        return v == null || String(v).trim() === '';
      });
      if (allEmpty) continue;
      const data: Record<string, string> = {};
      for (const c of cols) {
        const colNum = headerCells[c.headerKey];
        if (!colNum) continue;
        const v = row.getCell(colNum).value;
        data[c.entityField] = v == null ? '' : String(v).trim();
      }
      rows.push({ rowNumber: r, data });
    }

    if (rows.length === 0) {
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'IMPORT_COMMIT',
        resource: jenis,
        resourceId: '-',
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Impor ${jenis} (tersimpan=0, dilewati=0)`,
      });
      return { tersimpan: 0, dilewati: 0 };
    }

    // Pra-muat kelasMap untuk siswa
    let kelasMap = new Map<string, number>();
    if (jenis === 'siswa') {
      const allKelas = await this.kelasRepo.find();
      kelasMap = new Map(
        allKelas.map((k) => [String(k.nama).toLowerCase(), k.id]),
      );
    }

    // Duplikat di-file + cek baris valid
    const seenNipFile = new Set<string>();
    const seenNisFile = new Set<string>();
    const seenNisnFile = new Set<string>();

    // Kumpulkan nilai unik untuk cek DB
    const nipValues = new Set<string>();
    const nisValues = new Set<string>();
    const nisnValues = new Set<string>();

    for (const { data } of rows) {
      if (jenis === 'guru') {
        const nip = (data['nip'] ?? '').trim();
        if (nip) {
          seenNipFile.add(nip);
          nipValues.add(nip);
        }
      } else {
        const nis = (data['nis'] ?? '').trim();
        if (nis) {
          seenNisFile.add(nis);
          nisValues.add(nis);
        }
        const nisn = (data['nisn'] ?? '').trim();
        if (nisn) {
          seenNisnFile.add(nisn);
          nisnValues.add(nisn);
        }
      }
    }

    // Yang sudah ada di DB
    const existingNip = new Set<string>();
    const existingNis = new Set<string>();
    const existingNisn = new Set<string>();
    if (jenis === 'guru' && nipValues.size > 0) {
      const d = await this.guruRepo.find({ where: { nip: In([...nipValues]) } });
      d.forEach((g) => g.nip && existingNip.add(g.nip));
    }
    if (jenis === 'siswa') {
      if (nisValues.size > 0) {
        const d = await this.siswaRepo.find({ where: { nis: In([...nisValues]) } });
        d.forEach((s) => existingNis.add(s.nis));
      }
      if (nisnValues.size > 0) {
        const d = await this.siswaRepo.find({
          where: { nisn: In([...nisnValues]) },
        });
        d.forEach((s) => s.nisn && existingNisn.add(s.nisn));
      }
    }

    // Set kunci yang sudah dipakai per baris (untuk deteksi duplikat di file)
    const usedNip = new Set<string>();
    const usedNis = new Set<string>();
    const usedNisn = new Set<string>();

    let tersimpan = 0;
    let dilewati = 0;

    for (const { rowNumber, data } of rows) {
      // Validasi cepat: field wajib
      let skipReason: string | null = null;

      for (const c of cols) {
        if (c.required && (data[c.entityField] ?? '').trim() === '') {
          skipReason = `kolom ${c.headerKey} wajib diisi`;
          break;
        }
      }

      if (!skipReason && jenis === 'guru') {
        const jk = (data['jenisKelamin'] ?? '').toUpperCase();
        if (!['L', 'P'].includes(jk)) {
          skipReason = 'jenisKelamin harus L atau P';
        }
      }
      if (!skipReason && jenis === 'siswa') {
        const jk = (data['jenisKelamin'] ?? '').toUpperCase();
        if (!['L', 'P'].includes(jk)) {
          skipReason = 'jenisKelamin harus L atau P';
        }
        const tgl = (data['tanggalLahir'] ?? '').trim();
        if (tgl && !this.isValidDateString(tgl)) {
          skipReason = 'tanggal_lahir format tidak valid';
        }
        const kelas = (data['kelas'] ?? '').trim();
        if (kelas && !kelasMap.has(kelas.toLowerCase())) {
          skipReason = `kelas "${kelas}" tidak ditemukan`;
        }
      }

      // Duplikat file
      if (!skipReason) {
        if (jenis === 'guru') {
          const nip = (data['nip'] ?? '').trim();
          if (nip) {
            if (usedNip.has(nip) || existingNip.has(nip)) {
              skipReason = 'NIP sudah terdaftar';
            }
            usedNip.add(nip);
          }
        } else {
          const nis = (data['nis'] ?? '').trim();
          if (nis) {
            if (usedNis.has(nis) || existingNis.has(nis)) {
              skipReason = 'NIS sudah terdaftar';
            }
            usedNis.add(nis);
          }
          const nisn = (data['nisn'] ?? '').trim();
          if (nisn) {
            if (usedNisn.has(nisn) || existingNisn.has(nisn)) {
              skipReason = 'NISN sudah terdaftar';
            }
            usedNisn.add(nisn);
          }
        }
      }

      if (skipReason) {
        dilewati++;
        continue;
      }

      // Bangun entity
      try {
        if (jenis === 'guru') {
          const e = new Guru();
          e.nama = (data['nama'] ?? '').trim();
          e.nip = (data['nip'] ?? '').trim() || null;
          e.jenisKelamin = ((data['jenisKelamin'] ?? '').toUpperCase() ===
          'P'
            ? 'P'
            : 'L') as GuruJK;
          e.telepon = (data['telepon'] ?? '').trim() || null;
          e.status = 'aktif';
          e.fotoUrl = '';
          e.userId = null;
          await this.guruRepo.save(e);
          tersimpan++;
        } else {
          const e = new Siswa();
          e.nama = (data['nama'] ?? '').trim();
          e.nis = (data['nis'] ?? '').trim();
          e.nisn = (data['nisn'] ?? '').trim() || null;
          e.jenisKelamin = ((data['jenisKelamin'] ?? '').toUpperCase() ===
          'P'
            ? 'P'
            : 'L') as SiswaJK;
          e.status = 'aktif';
          e.fotoUrl = '';
          const kelas = (data['kelas'] ?? '').trim();
          if (kelas) {
            const id = kelasMap.get(kelas.toLowerCase());
            e.kelasId = id ?? null;
          } else {
            e.kelasId = null;
          }
          const tgl = (data['tanggalLahir'] ?? '').trim();
          if (tgl) {
            const parsed = this.parseDateString(tgl);
            e.tanggalLahir = parsed;
          } else {
            e.tanggalLahir = null;
          }
          e.tempatLahir = (data['tempatLahir'] ?? '').trim() || null;
          e.agama = (data['agama'] ?? '').trim() || null;
          e.alamat = (data['alamat'] ?? '').trim() || null;
          e.telepon = (data['telepon'] ?? '').trim() || null;
          e.namaAyah = (data['namaAyah'] ?? '').trim() || null;
          e.pekerjaanAyah =
            (data['pekerjaanAyah'] ?? '').trim() || null;
          e.namaIbu = (data['namaIbu'] ?? '').trim() || null;
          e.pekerjaanIbu =
            (data['pekerjaanIbu'] ?? '').trim() || null;
          await this.siswaRepo.save(e);
          tersimpan++;
        }
      } catch (err: any) {
        // Gagal insert → dilewati (misal race duplikat)
        dilewati++;
        continue;
      }
    }

    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'IMPORT_COMMIT',
      resource: jenis,
      resourceId: '-',
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Impor ${jenis} (tersimpan=${tersimpan}, dilewati=${dilewati})`,
      details: { tersimpan, dilewati, jenis, totalBaris: rows.length },
    });

    return { tersimpan, dilewati };
  }

  // ===== helpers =====
  private isValidDateString(s: string): boolean {
    if (!s) return false;
    // YYYY-MM-DD
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
    if (iso.test(s)) {
      const d = new Date(s + 'T00:00:00');
      return !isNaN(d.getTime());
    }
    // DD/MM/YYYY
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (dmy.test(s)) {
      const m = dmy.exec(s);
      if (!m) return false;
      const [, dd, mm, yyyy] = m;
      const d = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
      );
      return !isNaN(d.getTime());
    }
    return false;
  }

  private parseDateString(s: string): Date | null {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
    if (iso.test(s)) {
      const d = new Date(s + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }
    const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (dmy.test(s)) {
      const m = dmy.exec(s);
      if (!m) return null;
      const [, dd, mm, yyyy] = m;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
    return null;
  }
}
