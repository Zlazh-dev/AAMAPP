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
exports.GuruService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const guru_entity_1 = require("./guru.entity");
const kelas_entity_1 = require("../kelas/kelas.entity");
const audit_service_1 = require("../audit/audit.service");
const kurikulum_service_1 = require("../kurikulum/kurikulum.service");
const tahun_ajaran_service_1 = require("../tahun-ajaran/tahun-ajaran.service");
let GuruService = class GuruService {
    constructor(repo, kelasRepo, audit, kurikulum, ta) {
        this.repo = repo;
        this.kelasRepo = kelasRepo;
        this.audit = audit;
        this.kurikulum = kurikulum;
        this.ta = ta;
    }
    async list(filter) {
        const page = Math.max(1, filter.page ?? 1);
        const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
        const where = {};
        if (filter.status)
            where.status = filter.status;
        if (filter.q)
            where.nama = (0, typeorm_2.ILike)(`%${filter.q}%`);
        const [rows, total] = await this.repo.findAndCount({
            where,
            order: { nama: 'ASC' },
            relations: ['waliKelas', 'user'],
            skip: (page - 1) * limit,
            take: limit,
        });
        const taAktif = await this.ta.getActive();
        const taId = taAktif?.tahunAjaran?.id ?? null;
        const data = await Promise.all(rows.map(async (g) => ({
            id: g.id,
            nama: g.nama,
            nip: g.nip,
            jenisKelamin: g.jenisKelamin,
            telepon: g.telepon,
            fotoUrl: g.fotoUrl,
            status: g.status,
            userId: g.userId,
            punyaAkun: !!g.userId,
            jumlahPaket: taId != null
                ? await this.kurikulum.countPenugasanGuruAktif(g.id, taId)
                : 0,
            waliKelas: g.waliKelas,
        })));
        return { data, total, page, limit };
    }
    async findOne(id) {
        const row = await this.repo.findOne({
            where: { id },
            relations: ['waliKelas', 'user'],
        });
        if (!row)
            throw new common_1.NotFoundException('Guru tidak ditemukan');
        const taAktif = await this.ta.getActive();
        const taId = taAktif?.tahunAjaran?.id ?? null;
        return {
            ...row,
            punyaAkun: !!row.userId,
            jumlahPaket: taId != null
                ? await this.kurikulum.countPenugasanGuruAktif(row.id, taId)
                : 0,
        };
    }
    async create(payload, req) {
        try {
            const entity = this.repo.create(payload);
            const saved = await this.repo.save(entity);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'CREATE_GURU',
                resource: 'guru',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Membuat data guru ${saved.nama}`,
                details: payload,
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505')
                throw new common_1.ConflictException('NIP sudah terdaftar');
            throw err;
        }
    }
    async update(id, payload, req) {
        const row = await this.repo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Guru tidak ditemukan');
        Object.assign(row, payload);
        try {
            const saved = await this.repo.save(row);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'UPDATE_GURU',
                resource: 'guru',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Memperbarui data guru ${saved.nama}`,
                details: payload,
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505')
                throw new common_1.ConflictException('NIP sudah terdaftar');
            throw err;
        }
    }
    async remove(id, req) {
        const row = await this.repo.findOne({
            where: { id },
            relations: ['waliKelas'],
        });
        if (!row)
            throw new common_1.NotFoundException('Guru tidak ditemukan');
        if (row.waliKelas && row.waliKelas.length > 0) {
            throw new common_1.ConflictException('Guru masih memiliki data terkait — nonaktifkan saja');
        }
        const taAktif = await this.ta.getActive();
        const taId = taAktif?.tahunAjaran?.id ?? null;
        if (taId != null) {
            const used = await this.kurikulum.countPenugasanGuruAktif(id, taId);
            if (used > 0) {
                throw new common_1.ConflictException(`Guru masih memiliki ${used} penugasan pada tahun ajaran aktif — nonaktifkan saja`);
            }
        }
        await this.repo.remove(row);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'DELETE_GURU',
            resource: 'guru',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menghapus data guru ${row.nama}`,
        });
        return { ok: true };
    }
};
exports.GuruService = GuruService;
exports.GuruService = GuruService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(guru_entity_1.Guru)),
    __param(1, (0, typeorm_1.InjectRepository)(kelas_entity_1.Kelas)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        kurikulum_service_1.KurikulumService,
        tahun_ajaran_service_1.TahunAjaranService])
], GuruService);
//# sourceMappingURL=guru.service.js.map