"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiswaService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const siswa_entity_1 = require("./siswa.entity");
const kelas_entity_1 = require("../kelas/kelas.entity");
const audit_service_1 = require("../audit/audit.service");
let SiswaService = class SiswaService {
    constructor(repo, kelasRepo, audit) {
        this.repo = repo;
        this.kelasRepo = kelasRepo;
        this.audit = audit;
    }
    async list(filter) {
        const page = Math.max(1, filter.page ?? 1);
        const limit = Math.min(500, Math.max(1, filter.limit ?? 50));
        const where = {};
        if (filter.kelasId)
            where.kelasId = filter.kelasId;
        if (filter.status)
            where.status = filter.status;
        if (filter.jenisKelamin)
            where.jenisKelamin = filter.jenisKelamin;
        if (filter.q) {
            where.nama = (0, typeorm_2.ILike)(`%${filter.q}%`);
        }
        const [rows, total] = await this.repo.findAndCount({
            where,
            order: { nama: 'ASC' },
            relations: ['kelas'],
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data: rows, total, page, limit };
    }
    async findOne(id) {
        const row = await this.repo.findOne({
            where: { id },
            relations: ['kelas'],
        });
        if (!row)
            throw new common_1.NotFoundException('Siswa tidak ditemukan');
        return row;
    }
    async create(payload, req) {
        const data = this.normalizePayload(payload);
        await this.assertNoDuplicateSiswa(data);
        try {
            const entity = this.repo.create(data);
            const saved = await this.repo.save(entity);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'CREATE_SISWA',
                resource: 'siswa',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Membuat data siswa ${saved.nama}`,
                details: { nama: saved.nama, nis: saved.nis },
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505') {
                throw this.duplicateSiswaError(err);
            }
            throw err;
        }
    }
    async update(id, payload, req) {
        const row = await this.repo.findOne({
            where: { id },
            relations: ['kelas'],
        });
        if (!row)
            throw new common_1.NotFoundException('Siswa tidak ditemukan');
        const data = this.normalizePayload(payload);
        await this.assertNoDuplicateSiswa(data, id);
        const pindahKelas = Object.prototype.hasOwnProperty.call(data, 'kelasId') &&
            data.kelasId !== row.kelasId;
        const beforeKelasId = row.kelasId;
        const beforeKelasNama = row.kelas?.nama ?? null;
        Object.assign(row, data);
        let afterKelasNama = null;
        if (pindahKelas) {
            if (row.kelasId != null) {
                const k = await this.kelasRepo.findOne({ where: { id: row.kelasId } });
                afterKelasNama = k?.nama ?? `(id=${row.kelasId})`;
            }
            else {
                afterKelasNama = '(tanpa kelas)';
            }
        }
        try {
            const saved = await this.repo.save(row);
            if (pindahKelas) {
                await this.audit.log({
                    actorId: req.session?.userId ?? null,
                    action: 'PINDAH_KELAS_SISWA',
                    resource: 'siswa',
                    resourceId: String(saved.id),
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    summary: `Memindahkan ${saved.nama} dari ${beforeKelasNama ?? '(tanpa kelas)'} ke ${afterKelasNama}`,
                    details: {
                        fromKelasId: beforeKelasId,
                        fromKelasNama: beforeKelasNama,
                        toKelasId: row.kelasId,
                        toKelasNama: afterKelasNama,
                    },
                });
            }
            else {
                await this.audit.log({
                    actorId: req.session?.userId ?? null,
                    action: 'UPDATE_SISWA',
                    resource: 'siswa',
                    resourceId: String(saved.id),
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    summary: `Memperbarui data siswa ${saved.nama}`,
                    details: payload,
                });
            }
            return saved;
        }
        catch (err) {
            if (err?.code === '23505') {
                throw this.duplicateSiswaError(err);
            }
            throw err;
        }
    }
    async remove(id, req) {
        const row = await this.repo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Siswa tidak ditemukan');
        await this.repo.remove(row);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'DELETE_SISWA',
            resource: 'siswa',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menghapus data siswa ${row.nama}`,
        });
        return { ok: true };
    }
    async assertNoDuplicateSiswa(data, excludeId) {
        if (data.nis) {
            const dupNis = await this.repo.findOne({
                where: { nis: data.nis },
            });
            if (dupNis && dupNis.id !== excludeId) {
                throw new common_1.ConflictException(`NIS ${data.nis} sudah terdaftar`);
            }
        }
        if (data.nisn) {
            const dupNisn = await this.repo.findOne({
                where: { nisn: data.nisn },
            });
            if (dupNisn && dupNisn.id !== excludeId) {
                throw new common_1.ConflictException(`NISN ${data.nisn} sudah terdaftar`);
            }
        }
    }
    duplicateSiswaError(err) {
        const detail = String(err?.detail ?? '').toLowerCase();
        if (detail.includes('nisn')) {
            return new common_1.ConflictException('NISN sudah terdaftar');
        }
        if (detail.includes('nis')) {
            return new common_1.ConflictException('NIS sudah terdaftar');
        }
        return new common_1.ConflictException('NIS atau NISN sudah terdaftar');
    }
    normalizePayload(payload) {
        const out = { ...payload };
        if (typeof out.tanggalLahir === 'string') {
            const d = new Date(out.tanggalLahir);
            out.tanggalLahir = isNaN(d.getTime()) ? null : d;
        }
        return out;
    }
};
exports.SiswaService = SiswaService;
exports.SiswaService = SiswaService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(siswa_entity_1.Siswa)),
    __param(1, (0, typeorm_1.InjectRepository)(kelas_entity_1.Kelas)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService])
], SiswaService);
//# sourceMappingURL=siswa.service.js.map