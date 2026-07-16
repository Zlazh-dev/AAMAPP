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
exports.KelasService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const kelas_entity_1 = require("./kelas.entity");
const siswa_entity_1 = require("../siswa/siswa.entity");
const guru_entity_1 = require("../guru/guru.entity");
const penugasan_entity_1 = require("../kurikulum/penugasan.entity");
const audit_service_1 = require("../audit/audit.service");
let KelasService = class KelasService {
    constructor(repo, siswaRepo, guruRepo, penugasanRepo, audit) {
        this.repo = repo;
        this.siswaRepo = siswaRepo;
        this.guruRepo = guruRepo;
        this.penugasanRepo = penugasanRepo;
        this.audit = audit;
    }
    async list(filter) {
        const page = Math.max(1, filter.page ?? 1);
        const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
        const where = {};
        if (filter.tingkat)
            where.tingkat = filter.tingkat;
        if (filter.q)
            where.nama = (0, typeorm_2.ILike)(`%${filter.q}%`);
        const [rows, total] = await this.repo.findAndCount({
            where,
            order: { tingkat: 'ASC', nama: 'ASC' },
            relations: ['waliGuru'],
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data: rows, total, page, limit };
    }
    async findOne(id) {
        const row = await this.repo.findOne({
            where: { id },
            relations: ['waliGuru'],
        });
        if (!row)
            throw new common_1.NotFoundException('Kelas tidak ditemukan');
        return row;
    }
    async create(payload, req) {
        try {
            const entity = this.repo.create(payload);
            const saved = await this.repo.save(entity);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'CREATE_KELAS',
                resource: 'kelas',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Membuat kelas ${saved.nama}`,
                details: payload,
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505')
                throw new common_1.ConflictException('Nama kelas sudah digunakan');
            throw err;
        }
    }
    async update(id, payload, req) {
        const row = await this.repo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Kelas tidak ditemukan');
        const before = { ...row };
        Object.assign(row, payload);
        try {
            const saved = await this.repo.save(row);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'UPDATE_KELAS',
                resource: 'kelas',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Memperbarui kelas ${saved.nama}`,
                details: { before, after: payload },
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505')
                throw new common_1.ConflictException('Nama kelas sudah digunakan');
            throw err;
        }
    }
    async setWali(id, payload, req) {
        const row = await this.repo.findOne({
            where: { id },
            relations: ['waliGuru'],
        });
        if (!row)
            throw new common_1.NotFoundException('Kelas tidak ditemukan');
        if (payload.waliGuruId === null) {
            const beforeGuru = row.waliGuru?.nama ?? null;
            row.waliGuruId = null;
            row.waliGuru = null;
            const saved = await this.repo.save(row);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'UPDATE_KELAS_WALI',
                resource: 'kelas',
                resourceId: String(id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Menghapus wali ${beforeGuru ?? '(kosong)'} dari kelas ${row.nama}`,
                details: { before: beforeGuru, after: null },
            });
            return saved;
        }
        if (typeof payload.waliGuruId !== 'number') {
            throw new common_1.BadRequestException('waliGuruId wajib diisi (id guru atau null)');
        }
        const guru = await this.guruRepo.findOne({
            where: { id: payload.waliGuruId },
        });
        if (!guru) {
            throw new common_1.NotFoundException('Guru tidak ditemukan');
        }
        const existing = await this.repo.findOne({
            where: { waliGuruId: payload.waliGuruId },
        });
        if (existing && existing.id !== id) {
            if (!payload.force) {
                throw new common_1.ConflictException(`Guru ${guru.nama} sudah menjadi wali kelas ${existing.nama}. Lepas terlebih dahulu atau gunakan force.`);
            }
            existing.waliGuruId = null;
            existing.waliGuru = null;
            await this.repo.save(existing);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'UPDATE_KELAS_WALI',
                resource: 'kelas',
                resourceId: String(existing.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Melepas wali ${guru.nama} dari kelas ${existing.nama} (paksa untuk menugaskan ke kelas ${row.nama})`,
                details: { forced: true, toClass: row.nama },
            });
        }
        const before = row.waliGuru?.nama ?? null;
        row.waliGuruId = payload.waliGuruId;
        row.waliGuru = guru;
        const saved = await this.repo.save(row);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'UPDATE_KELAS_WALI',
            resource: 'kelas',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menugaskan ${guru.nama} sebagai wali kelas ${row.nama}`,
            details: { before, after: guru.nama, forced: !!payload.force },
        });
        return saved;
    }
    async remove(id, req) {
        const row = await this.repo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Kelas tidak ditemukan');
        const siswaAktif = await this.siswaRepo.count({
            where: { kelasId: id, status: 'aktif' },
        });
        if (siswaAktif > 0) {
            throw new common_1.ConflictException(`Kelas ${row.nama} masih memiliki ${siswaAktif} siswa aktif. Pindahkan siswa terlebih dahulu.`);
        }
        const used = await this.penugasanRepo.count({ where: { kelasId: id } });
        if (used > 0) {
            throw new common_1.ConflictException(`Kelas ${row.nama} masih memiliki ${used} penugasan mengajar. Hapus penugasan terlebih dahulu.`);
        }
        await this.repo.remove(row);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'DELETE_KELAS',
            resource: 'kelas',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menghapus kelas ${row.nama}`,
        });
        return { ok: true };
    }
};
exports.KelasService = KelasService;
exports.KelasService = KelasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(kelas_entity_1.Kelas)),
    __param(1, (0, typeorm_1.InjectRepository)(siswa_entity_1.Siswa)),
    __param(2, (0, typeorm_1.InjectRepository)(guru_entity_1.Guru)),
    __param(3, (0, typeorm_1.InjectRepository)(penugasan_entity_1.Penugasan)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService])
], KelasService);
//# sourceMappingURL=kelas.service.js.map