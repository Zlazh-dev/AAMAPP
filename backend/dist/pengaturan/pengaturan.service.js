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
exports.PengaturanService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pengaturan_entity_1 = require("./pengaturan.entity");
const audit_service_1 = require("../audit/audit.service");
function deepMerge(target, source) {
    if (target == null)
        return source;
    if (source == null)
        return target;
    const out = Array.isArray(target) ? [...target] : { ...target };
    for (const k of Object.keys(source)) {
        const sv = source[k];
        const tv = target[k];
        if (sv !== null &&
            typeof sv === 'object' &&
            !Array.isArray(sv) &&
            tv !== null &&
            typeof tv === 'object' &&
            !Array.isArray(tv)) {
            out[k] = deepMerge(tv, sv);
        }
        else if (sv !== undefined) {
            out[k] = sv;
        }
    }
    return out;
}
function deepClone(v) {
    if (v == null)
        return v;
    if (typeof v !== 'object')
        return v;
    return JSON.parse(JSON.stringify(v));
}
let PengaturanService = class PengaturanService {
    constructor(repo, audit) {
        this.repo = repo;
        this.audit = audit;
    }
    async listAll() {
        return this.repo.find({ order: { key: 'ASC' } });
    }
    async getOne(key) {
        const row = await this.repo.findOne({ where: { key } });
        if (!row)
            throw new common_1.NotFoundException(`Pengaturan '${key}' tidak ditemukan`);
        return row;
    }
    async upsert(key, value, req) {
        const existing = await this.repo.findOne({ where: { key } });
        const before = existing ? deepClone(existing.value) : null;
        let nextValue = value;
        const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
        if (existing && isObj(existing.value) && isObj(value)) {
            nextValue = deepMerge(deepClone(existing.value), value);
        }
        const saved = await this.repo.save(this.repo.create({ key, value: nextValue }));
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: existing ? 'UPDATE_PENGATURAN' : 'CREATE_PENGATURAN',
            resource: 'pengaturan',
            resourceId: key,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: existing
                ? `Memperbarui pengaturan ${key}`
                : `Membuat pengaturan ${key}`,
            details: { before, after: nextValue },
        });
        return saved;
    }
    async seedDefaults() {
        const count = await this.repo.count();
        if (count > 0)
            return;
        const defaults = [
            {
                key: 'profil_sekolah',
                value: {
                    nama: 'SMP IT Asy-Syadzili',
                    alamat: '',
                    telepon: '',
                    email: '',
                    website: '',
                    logoUrl: '',
                },
            },
            {
                key: 'jam_presensi',
                value: {
                    jamMasuk: '06:30',
                    jamPulang: '15:00',
                    toleransiMenit: 15,
                    cutoff: '15:00',
                },
            },
            {
                key: 'lokasi',
                value: {
                    aktif: false,
                    lat: 0,
                    lng: 0,
                    radiusMeter: 100,
                },
            },
            {
                key: 'kkm',
                value: {
                    nilai: 75,
                },
            },
        ];
        for (const d of defaults) {
            await this.repo.save(this.repo.create(d));
        }
    }
};
exports.PengaturanService = PengaturanService;
exports.PengaturanService = PengaturanService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(pengaturan_entity_1.Pengaturan)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_service_1.AuditService])
], PengaturanService);
//# sourceMappingURL=pengaturan.service.js.map