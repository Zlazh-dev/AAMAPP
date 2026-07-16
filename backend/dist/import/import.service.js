"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ExcelJS = __importStar(require("exceljs"));
const guru_entity_1 = require("../guru/guru.entity");
const siswa_entity_1 = require("../siswa/siswa.entity");
const kelas_entity_1 = require("../kelas/kelas.entity");
const audit_service_1 = require("../audit/audit.service");
const GURU_COLUMNS = [
    { headerKey: 'nama', entityField: 'nama', required: true, maxLength: 255 },
    { headerKey: 'nip', entityField: 'nip', required: false, maxLength: 30 },
    { headerKey: 'jk', entityField: 'jenisKelamin', required: true, kind: 'jk' },
    { headerKey: 'telepon', entityField: 'telepon', required: false, maxLength: 30 },
];
const SISWA_COLUMNS = [
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
let ImportService = class ImportService {
    constructor(guruRepo, siswaRepo, kelasRepo, audit) {
        this.guruRepo = guruRepo;
        this.siswaRepo = siswaRepo;
        this.kelasRepo = kelasRepo;
        this.audit = audit;
    }
    async generateTemplate(jenis) {
        if (jenis !== 'guru' && jenis !== 'siswa') {
            throw new common_1.BadRequestException('Parameter jenis wajib bernilai guru atau siswa');
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
        }
        else {
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
        return Buffer.from(buf);
    }
    async preview(jenis, buffer) {
        if (jenis !== 'guru' && jenis !== 'siswa') {
            throw new common_1.BadRequestException('Parameter jenis wajib bernilai guru atau siswa');
        }
        if (!buffer || buffer.length === 0) {
            throw new common_1.BadRequestException('File Excel kosong');
        }
        const cols = jenis === 'guru' ? GURU_COLUMNS : SISWA_COLUMNS;
        const wb = new ExcelJS.Workbook();
        try {
            await wb.xlsx.load(buffer);
        }
        catch (e) {
            throw new common_1.BadRequestException('File bukan Excel yang valid atau rusak: ' +
                (e?.message ?? 'kesalahan tidak diketahui'));
        }
        const sheet = wb.worksheets[0];
        if (!sheet) {
            throw new common_1.BadRequestException('Sheet tidak ditemukan dalam file');
        }
        const headerCells = {};
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            const v = String(cell.value ?? '')
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '_');
            if (v)
                headerCells[v] = colNumber;
        });
        const missingHeaders = cols
            .filter((c) => c.required)
            .filter((c) => headerCells[c.headerKey] == null)
            .map((c) => c.headerKey);
        if (missingHeaders.length > 0) {
            throw new common_1.BadRequestException('Header kolom wajib hilang: ' + missingHeaders.join(', '));
        }
        const rows = [];
        for (let r = 2; r <= sheet.rowCount; r++) {
            const row = sheet.getRow(r);
            const allEmpty = cols.every((c) => {
                const colNum = headerCells[c.headerKey];
                if (!colNum)
                    return true;
                const v = row.getCell(colNum).value;
                return v == null || String(v).trim() === '';
            });
            if (allEmpty)
                continue;
            const data = {};
            for (const c of cols) {
                const colNum = headerCells[c.headerKey];
                if (!colNum)
                    continue;
                const v = row.getCell(colNum).value;
                data[c.entityField] = v == null ? '' : String(v).trim();
            }
            rows.push({ rowNumber: r, data });
        }
        if (rows.length === 0) {
            return { valid: 0, errors: [] };
        }
        const errors = [];
        let kelasMap = new Map();
        if (jenis === 'siswa') {
            const allKelas = await this.kelasRepo.find();
            kelasMap = new Map(allKelas.map((k) => [String(k.nama).toLowerCase(), k.id]));
        }
        const seenNip = new Set();
        const seenNis = new Set();
        const seenNisn = new Set();
        const rowNip = new Map();
        const rowNis = new Map();
        const rowNisn = new Map();
        for (const { rowNumber, data } of rows) {
            for (const c of cols) {
                const raw = data[c.entityField] ?? '';
                const value = raw.trim();
                if (c.required && value === '') {
                    errors.push({
                        baris: rowNumber,
                        kolom: c.headerKey,
                        pesan: 'Wajib diisi',
                    });
                    continue;
                }
                if (value === '')
                    continue;
                if (c.maxLength && value.length > c.maxLength) {
                    errors.push({
                        baris: rowNumber,
                        kolom: c.headerKey,
                        pesan: `Maksimal ${c.maxLength} karakter`,
                    });
                }
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
                    if (!this.isValidDateString(value)) {
                        errors.push({
                            baris: rowNumber,
                            kolom: c.headerKey,
                            pesan: 'Format tanggal tidak valid (YYYY-MM-DD)',
                        });
                    }
                }
            }
            if (jenis === 'guru') {
                const nip = (data['nip'] ?? '').trim();
                if (nip) {
                    if (rowNip.has(nip)) {
                        errors.push({
                            baris: rowNumber,
                            kolom: 'nip',
                            pesan: `Duplikat dengan baris ${rowNip.get(nip)}`,
                        });
                    }
                    else {
                        rowNip.set(nip, rowNumber);
                    }
                    seenNip.add(nip);
                }
            }
            else {
                const nis = (data['nis'] ?? '').trim();
                if (nis) {
                    if (rowNis.has(nis)) {
                        errors.push({
                            baris: rowNumber,
                            kolom: 'nis',
                            pesan: `Duplikat dengan baris ${rowNis.get(nis)}`,
                        });
                    }
                    else {
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
                    }
                    else {
                        rowNisn.set(nisn, rowNumber);
                    }
                    seenNisn.add(nisn);
                }
            }
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
        if (jenis === 'guru' && seenNip.size > 0) {
            const dupes = await this.guruRepo.find({
                where: { nip: (0, typeorm_2.In)(Array.from(seenNip)) },
            });
            const nipToId = new Map(dupes.map((g) => [g.nip, g.id]));
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
                    where: { nis: (0, typeorm_2.In)(Array.from(seenNis)) },
                });
                const nisToId = new Map(dupesNis.map((s) => [s.nis, s.id]));
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
                    where: { nisn: (0, typeorm_2.In)(Array.from(seenNisn)) },
                });
                const nisnToId = new Map(dupesNisn.map((s) => [s.nisn, s.id]));
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
        const errorRows = new Set(errors.map((e) => e.baris));
        const valid = rows.filter((r) => !errorRows.has(r.rowNumber)).length;
        return { valid, errors };
    }
    async commit(jenis, buffer, req) {
        if (jenis !== 'guru' && jenis !== 'siswa') {
            throw new common_1.BadRequestException('Parameter jenis wajib bernilai guru atau siswa');
        }
        if (!buffer || buffer.length === 0) {
            throw new common_1.BadRequestException('File Excel kosong');
        }
        const cols = jenis === 'guru' ? GURU_COLUMNS : SISWA_COLUMNS;
        const wb = new ExcelJS.Workbook();
        try {
            await wb.xlsx.load(buffer);
        }
        catch (e) {
            throw new common_1.BadRequestException('File bukan Excel yang valid atau rusak: ' +
                (e?.message ?? 'kesalahan tidak diketahui'));
        }
        const sheet = wb.worksheets[0];
        if (!sheet) {
            throw new common_1.BadRequestException('Sheet tidak ditemukan dalam file');
        }
        const headerCells = {};
        sheet.getRow(1).eachCell((cell, colNumber) => {
            const v = String(cell.value ?? '')
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '_');
            if (v)
                headerCells[v] = colNumber;
        });
        const rows = [];
        for (let r = 2; r <= sheet.rowCount; r++) {
            const row = sheet.getRow(r);
            const allEmpty = cols.every((c) => {
                const colNum = headerCells[c.headerKey];
                if (!colNum)
                    return true;
                const v = row.getCell(colNum).value;
                return v == null || String(v).trim() === '';
            });
            if (allEmpty)
                continue;
            const data = {};
            for (const c of cols) {
                const colNum = headerCells[c.headerKey];
                if (!colNum)
                    continue;
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
                userAgent: req.headers['user-agent'],
                summary: `Impor ${jenis} (tersimpan=0, dilewati=0)`,
            });
            return { tersimpan: 0, dilewati: 0 };
        }
        let kelasMap = new Map();
        if (jenis === 'siswa') {
            const allKelas = await this.kelasRepo.find();
            kelasMap = new Map(allKelas.map((k) => [String(k.nama).toLowerCase(), k.id]));
        }
        const seenNipFile = new Set();
        const seenNisFile = new Set();
        const seenNisnFile = new Set();
        const nipValues = new Set();
        const nisValues = new Set();
        const nisnValues = new Set();
        for (const { data } of rows) {
            if (jenis === 'guru') {
                const nip = (data['nip'] ?? '').trim();
                if (nip) {
                    seenNipFile.add(nip);
                    nipValues.add(nip);
                }
            }
            else {
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
        const existingNip = new Set();
        const existingNis = new Set();
        const existingNisn = new Set();
        if (jenis === 'guru' && nipValues.size > 0) {
            const d = await this.guruRepo.find({ where: { nip: (0, typeorm_2.In)([...nipValues]) } });
            d.forEach((g) => g.nip && existingNip.add(g.nip));
        }
        if (jenis === 'siswa') {
            if (nisValues.size > 0) {
                const d = await this.siswaRepo.find({ where: { nis: (0, typeorm_2.In)([...nisValues]) } });
                d.forEach((s) => existingNis.add(s.nis));
            }
            if (nisnValues.size > 0) {
                const d = await this.siswaRepo.find({
                    where: { nisn: (0, typeorm_2.In)([...nisnValues]) },
                });
                d.forEach((s) => s.nisn && existingNisn.add(s.nisn));
            }
        }
        const usedNip = new Set();
        const usedNis = new Set();
        const usedNisn = new Set();
        let tersimpan = 0;
        let dilewati = 0;
        for (const { rowNumber, data } of rows) {
            let skipReason = null;
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
            if (!skipReason) {
                if (jenis === 'guru') {
                    const nip = (data['nip'] ?? '').trim();
                    if (nip) {
                        if (usedNip.has(nip) || existingNip.has(nip)) {
                            skipReason = 'NIP sudah terdaftar';
                        }
                        usedNip.add(nip);
                    }
                }
                else {
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
            try {
                if (jenis === 'guru') {
                    const e = new guru_entity_1.Guru();
                    e.nama = (data['nama'] ?? '').trim();
                    e.nip = (data['nip'] ?? '').trim() || null;
                    e.jenisKelamin = ((data['jenisKelamin'] ?? '').toUpperCase() ===
                        'P'
                        ? 'P'
                        : 'L');
                    e.telepon = (data['telepon'] ?? '').trim() || null;
                    e.status = 'aktif';
                    e.fotoUrl = '';
                    e.userId = null;
                    await this.guruRepo.save(e);
                    tersimpan++;
                }
                else {
                    const e = new siswa_entity_1.Siswa();
                    e.nama = (data['nama'] ?? '').trim();
                    e.nis = (data['nis'] ?? '').trim();
                    e.nisn = (data['nisn'] ?? '').trim() || null;
                    e.jenisKelamin = ((data['jenisKelamin'] ?? '').toUpperCase() ===
                        'P'
                        ? 'P'
                        : 'L');
                    e.status = 'aktif';
                    e.fotoUrl = '';
                    const kelas = (data['kelas'] ?? '').trim();
                    if (kelas) {
                        const id = kelasMap.get(kelas.toLowerCase());
                        e.kelasId = id ?? null;
                    }
                    else {
                        e.kelasId = null;
                    }
                    const tgl = (data['tanggalLahir'] ?? '').trim();
                    if (tgl) {
                        const parsed = this.parseDateString(tgl);
                        e.tanggalLahir = parsed;
                    }
                    else {
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
            }
            catch (err) {
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
            userAgent: req.headers['user-agent'],
            summary: `Impor ${jenis} (tersimpan=${tersimpan}, dilewati=${dilewati})`,
            details: { tersimpan, dilewati, jenis, totalBaris: rows.length },
        });
        return { tersimpan, dilewati };
    }
    isValidDateString(s) {
        if (!s)
            return false;
        const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
        if (iso.test(s)) {
            const d = new Date(s + 'T00:00:00');
            return !isNaN(d.getTime());
        }
        const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (dmy.test(s)) {
            const m = dmy.exec(s);
            if (!m)
                return false;
            const [, dd, mm, yyyy] = m;
            const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
            return !isNaN(d.getTime());
        }
        return false;
    }
    parseDateString(s) {
        const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
        if (iso.test(s)) {
            const d = new Date(s + 'T00:00:00');
            return isNaN(d.getTime()) ? null : d;
        }
        const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (dmy.test(s)) {
            const m = dmy.exec(s);
            if (!m)
                return null;
            const [, dd, mm, yyyy] = m;
            return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        }
        return null;
    }
};
exports.ImportService = ImportService;
exports.ImportService = ImportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(guru_entity_1.Guru)),
    __param(1, (0, typeorm_1.InjectRepository)(siswa_entity_1.Siswa)),
    __param(2, (0, typeorm_1.InjectRepository)(kelas_entity_1.Kelas)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService])
], ImportService);
//# sourceMappingURL=import.service.js.map