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
exports.TahunAjaranService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tahun_ajaran_entity_1 = require("./tahun-ajaran.entity");
const audit_service_1 = require("../audit/audit.service");
let TahunAjaranService = class TahunAjaranService {
    constructor(taRepo, audit) {
        this.taRepo = taRepo;
        this.audit = audit;
    }
    async listTa() {
        return this.taRepo.find({
            order: { nama: 'DESC' },
        });
    }
    async findOneTa(id) {
        const row = await this.taRepo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Tahun ajaran tidak ditemukan');
        return row;
    }
    async createTa(payload, req) {
        if (payload.aktif) {
            await this.taRepo.update({ aktif: true }, { aktif: false });
        }
        try {
            const saved = await this.taRepo.save(this.taRepo.create(payload));
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'CREATE_TAHUN_AJARAN',
                resource: 'tahun_ajaran',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Membuat tahun ajaran ${saved.nama} Semester ${saved.semester}`,
                details: payload,
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505') {
                throw new common_1.ConflictException(`Tahun ajaran ${payload.nama} Semester ${payload.semester} sudah ada`);
            }
            throw err;
        }
    }
    async updateTa(id, payload, req) {
        const row = await this.taRepo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Tahun ajaran tidak ditemukan');
        if (payload.aktif === true) {
            await this.taRepo.update({ aktif: true }, { aktif: false });
        }
        const before = { ...row };
        Object.assign(row, payload);
        try {
            const saved = await this.taRepo.save(row);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'UPDATE_TAHUN_AJARAN',
                resource: 'tahun_ajaran',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Memperbarui tahun ajaran ${saved.nama} Semester ${saved.semester}`,
                details: { before, after: payload },
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505') {
                const detail = typeof err?.detail === 'string' ? err.detail.toLowerCase() : '';
                if (detail.includes('nama') && detail.includes('semester')) {
                    throw new common_1.ConflictException(`Tahun ajaran ${payload.nama ?? row.nama} Semester ${payload.semester ?? row.semester} sudah ada`);
                }
                throw new common_1.ConflictException(`Tahun ajaran ${payload.nama ?? row.nama} Semester ${payload.semester ?? row.semester} sudah ada`);
            }
            throw err;
        }
    }
    async removeTa(id, req) {
        const row = await this.taRepo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Tahun ajaran tidak ditemukan');
        if (row.aktif) {
            throw new common_1.ConflictException(`Tidak dapat menghapus tahun ajaran ${row.nama} karena sedang aktif. Aktifkan tahun ajaran lain terlebih dahulu.`);
        }
        await this.taRepo.remove(row);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'DELETE_TAHUN_AJARAN',
            resource: 'tahun_ajaran',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menghapus tahun ajaran ${row.nama} Semester ${row.semester}`,
        });
        return { ok: true };
    }
    async aktifkan(id, req) {
        const target = await this.taRepo.findOne({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException('Tahun ajaran tidak ditemukan');
        if (target.aktif) {
            return target;
        }
        await this.taRepo.update({ aktif: true }, { aktif: false });
        target.aktif = true;
        const saved = await this.taRepo.save(target);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'ACTIVATE_TAHUN_AJARAN',
            resource: 'tahun_ajaran',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Mengaktifkan tahun ajaran ${saved.nama} Semester ${saved.semester}`,
        });
        return saved;
    }
    async getActive() {
        const ta = await this.taRepo.findOne({ where: { aktif: true } });
        return { tahunAjaran: ta };
    }
};
exports.TahunAjaranService = TahunAjaranService;
exports.TahunAjaranService = TahunAjaranService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tahun_ajaran_entity_1.TahunAjaran)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_service_1.AuditService])
], TahunAjaranService);
//# sourceMappingURL=tahun-ajaran.service.js.map