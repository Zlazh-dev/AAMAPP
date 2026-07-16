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
exports.KurikulumService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const mapel_entity_1 = require("./mapel.entity");
const penugasan_entity_1 = require("./penugasan.entity");
const jadwal_kbm_entity_1 = require("./jadwal-kbm.entity");
const kalender_libur_entity_1 = require("./kalender-libur.entity");
const audit_service_1 = require("../audit/audit.service");
const tahun_ajaran_service_1 = require("../tahun-ajaran/tahun-ajaran.service");
const pengaturan_service_1 = require("../pengaturan/pengaturan.service");
const guru_entity_1 = require("../guru/guru.entity");
const kelas_entity_1 = require("../kelas/kelas.entity");
const tahun_ajaran_entity_1 = require("../tahun-ajaran/tahun-ajaran.entity");
function hhmmToMin(s) {
    const [h, m] = s.split(':').map((x) => parseInt(x, 10));
    return h * 60 + m;
}
let KurikulumService = class KurikulumService {
    constructor(mapelRepo, penugasanRepo, jadwalRepo, liburRepo, guruRepo, kelasRepo, taRepo, audit, taService, pengaturanService) {
        this.mapelRepo = mapelRepo;
        this.penugasanRepo = penugasanRepo;
        this.jadwalRepo = jadwalRepo;
        this.liburRepo = liburRepo;
        this.guruRepo = guruRepo;
        this.kelasRepo = kelasRepo;
        this.taRepo = taRepo;
        this.audit = audit;
        this.taService = taService;
        this.pengaturanService = pengaturanService;
    }
    async listMapel(filter) {
        const page = Math.max(1, filter.page ?? 1);
        const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
        const where = {};
        if (filter.q) {
            where.nama = (0, typeorm_2.ILike)(`%${filter.q}%`);
        }
        const [rows, total] = await this.mapelRepo.findAndCount({
            where,
            order: { urutan: 'ASC', nama: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data: rows, total, page, limit };
    }
    async findOneMapel(id) {
        const row = await this.mapelRepo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Mata pelajaran tidak ditemukan');
        return row;
    }
    async createMapel(payload, req) {
        try {
            const saved = await this.mapelRepo.save(this.mapelRepo.create(payload));
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'CREATE_MAPEL',
                resource: 'mapel',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Membuat mata pelajaran ${saved.nama} (${saved.kode})`,
                details: payload,
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505') {
                const kode = payload?.kode ?? '';
                throw new common_1.ConflictException(`Kode mata pelajaran ${kode} sudah terdaftar`);
            }
            throw err;
        }
    }
    async updateMapel(id, payload, req) {
        const row = await this.mapelRepo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Mata pelajaran tidak ditemukan');
        Object.assign(row, payload);
        try {
            const saved = await this.mapelRepo.save(row);
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'UPDATE_MAPEL',
                resource: 'mapel',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Memperbarui mata pelajaran ${saved.nama} (${saved.kode})`,
                details: payload,
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505') {
                const kode = payload?.kode ?? row.kode;
                throw new common_1.ConflictException(`Kode mata pelajaran ${kode} sudah terdaftar`);
            }
            throw err;
        }
    }
    async removeMapel(id, req) {
        const row = await this.mapelRepo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Mata pelajaran tidak ditemukan');
        const used = await this.penugasanRepo.count({ where: { mapelId: id } });
        if (used > 0) {
            throw new common_1.ConflictException(`Mata pelajaran ${row.nama} (${row.kode}) masih digunakan di ${used} penugasan. Hapus penugasan terlebih dahulu.`);
        }
        await this.mapelRepo.remove(row);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'DELETE_MAPEL',
            resource: 'mapel',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menghapus mata pelajaran ${row.nama} (${row.kode})`,
        });
        return { ok: true };
    }
    async listPenugasan(filter) {
        const taId = filter.taId ??
            (await this.getActiveTaIdOrThrow());
        const where = { tahunAjaranId: taId };
        if (filter.guruId)
            where.guruId = filter.guruId;
        if (filter.kelasId)
            where.kelasId = filter.kelasId;
        if (filter.mapelId)
            where.mapelId = filter.mapelId;
        const rows = await this.penugasanRepo.find({
            where,
            relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
            order: { kelasId: 'ASC', mapelId: 'ASC' },
        });
        return { data: rows, taId };
    }
    async getRefNames(taId, guruId, mapelId) {
        const [guru, mapel, ta] = await Promise.all([
            this.guruRepo.findOne({ where: { id: guruId } }),
            this.mapelRepo.findOne({ where: { id: mapelId } }),
            this.taRepo.findOne({ where: { id: taId } }),
        ]);
        return {
            namaGuru: guru?.nama ?? null,
            namaMapel: mapel?.nama ?? null,
            taLabel: ta ? `${ta.nama} Sem ${ta.semester}` : null,
        };
    }
    async createPenugasan(dto, req) {
        const taId = await this.getActiveTaIdOrThrow();
        const guru = await this.guruRepo.findOne({ where: { id: dto.guruId } });
        if (!guru)
            throw new common_1.NotFoundException('Guru tidak ditemukan');
        const mapel = await this.mapelRepo.findOne({ where: { id: dto.mapelId } });
        if (!mapel)
            throw new common_1.NotFoundException('Mata pelajaran tidak ditemukan');
        const existing = await this.penugasanRepo.find({
            where: {
                mapelId: dto.mapelId,
                kelasId: (0, typeorm_2.In)(dto.kelasIds),
                tahunAjaranId: taId,
            },
            relations: ['kelas', 'guru'],
        });
        if (existing.length > 0) {
            const detail = existing
                .map((e) => `${e.kelas?.nama ?? '?'} (diampu ${e.guru?.nama ?? '?'})`)
                .join('; ');
            throw new common_1.ConflictException(`${mapel.nama} sudah terdaftar di: ${detail} pada tahun ajaran aktif`);
        }
        const kelasRows = await this.kelasRepo.find({
            where: { id: (0, typeorm_2.In)(dto.kelasIds) },
        });
        if (kelasRows.length !== dto.kelasIds.length) {
            const foundIds = new Set(kelasRows.map((k) => k.id));
            const missing = dto.kelasIds.filter((id) => !foundIds.has(id));
            throw new common_1.NotFoundException(`Kelas tidak ditemukan: ${missing.join(', ')}`);
        }
        const entities = dto.kelasIds.map((kelasId) => this.penugasanRepo.create({
            mapelId: dto.mapelId,
            kelasId,
            guruId: dto.guruId,
            tahunAjaranId: taId,
        }));
        const saved = await this.penugasanRepo.save(entities);
        const ta = await this.taRepo.findOne({ where: { id: taId } });
        const taLabel = ta ? `${ta.nama} Sem ${ta.semester}` : `TA#${taId}`;
        const kelasLabels = kelasRows
            .filter((k) => dto.kelasIds.includes(k.id))
            .map((k) => k.nama)
            .join(', ');
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'CREATE_PENUGASAN',
            resource: 'penugasan',
            resourceId: saved.map((s) => String(s.id)).join(','),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menugaskan ${guru.nama} mengajar ${mapel.nama} di ${kelasLabels} (${taLabel})`,
            details: {
                guruId: dto.guruId,
                namaGuru: guru.nama,
                mapelId: dto.mapelId,
                namaMapel: mapel.nama,
                kelasIds: dto.kelasIds,
                namaKelas: kelasLabels,
                taId,
                taLabel,
            },
        });
        return saved;
    }
    async updatePenugasan(id, dto, req) {
        const row = await this.penugasanRepo.findOne({
            where: { id },
            relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
        });
        if (!row)
            throw new common_1.NotFoundException('Penugasan tidak ditemukan');
        const guruBaru = await this.guruRepo.findOne({
            where: { id: dto.guruId },
        });
        if (!guruBaru)
            throw new common_1.NotFoundException('Guru tidak ditemukan');
        const ta = row.tahunAjaran;
        const taLabel = ta ? `${ta.nama} Sem ${ta.semester}` : `TA#${row.tahunAjaranId}`;
        const namaMapel = row.mapel?.nama ?? `mapel#${row.mapelId}`;
        const namaKelas = row.kelas?.nama ?? `kelas#${row.kelasId}`;
        const namaGuruLama = row.guru?.nama ?? `guru#${row.guruId}`;
        const before = {
            guruId: row.guruId,
            namaGuru: namaGuruLama,
        };
        await this.penugasanRepo.update({ id }, { guruId: dto.guruId });
        const updated = await this.penugasanRepo.findOne({
            where: { id },
            relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
        });
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'UPDATE_PENUGASAN',
            resource: 'penugasan',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Mengganti guru paket ${namaMapel} ${namaKelas} (${taLabel}) dari ${namaGuruLama} ke ${guruBaru.nama}`,
            details: {
                before,
                after: { guruId: guruBaru.id, namaGuru: guruBaru.nama },
            },
        });
        return updated;
    }
    async removePenugasan(id, req) {
        const row = await this.penugasanRepo.findOne({
            where: { id },
            relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
        });
        if (!row)
            throw new common_1.NotFoundException('Penugasan tidak ditemukan');
        const usedJadwal = await this.jadwalRepo.count({
            where: { penugasanId: id },
        });
        if (usedJadwal > 0) {
            const ta = row.tahunAjaran;
            const taLabel = ta ? `${ta.nama} Sem ${ta.semester}` : `TA#${row.tahunAjaranId}`;
            throw new common_1.ConflictException(`Penugasan ${row.mapel?.nama ?? 'mapel#' + row.mapelId} di kelas ${row.kelas?.nama ?? 'kelas#' + row.kelasId} (${taLabel}) masih dipakai di ${usedJadwal} jadwal. Hapus jadwalnya dulu`);
        }
        await this.penugasanRepo.remove(row);
        const taLabel = row.tahunAjaran
            ? `${row.tahunAjaran.nama} Sem ${row.tahunAjaran.semester}`
            : `TA#${row.tahunAjaranId}`;
        const namaMapel = row.mapel?.nama ?? `mapel#${row.mapelId}`;
        const namaKelas = row.kelas?.nama ?? `kelas#${row.kelasId}`;
        const namaGuru = row.guru?.nama ?? `guru#${row.guruId}`;
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'DELETE_PENUGASAN',
            resource: 'penugasan',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Membatalkan penugasan ${namaGuru} mengajar ${namaMapel} di ${namaKelas} (${taLabel})`,
            details: {
                guruId: row.guruId,
                namaGuru,
                mapelId: row.mapelId,
                namaMapel,
                kelasId: row.kelasId,
                namaKelas,
                taId: row.tahunAjaranId,
                taLabel,
            },
        });
        return { ok: true };
    }
    async countPenugasanGuruAktif(guruId, taId) {
        return this.penugasanRepo.count({
            where: { guruId, tahunAjaranId: taId },
        });
    }
    async listJadwal(filter) {
        const taId = filter.taId ?? (await this.getActiveTaIdOrThrow());
        const qb = this.jadwalRepo
            .createQueryBuilder('j')
            .innerJoinAndSelect('j.penugasan', 'p')
            .leftJoinAndSelect('p.mapel', 'm')
            .leftJoinAndSelect('p.kelas', 'k')
            .leftJoinAndSelect('p.guru', 'g')
            .where('p.tahunAjaranId = :taId', { taId });
        if (filter.kelasId)
            qb.andWhere('p.kelasId = :kelasId', { kelasId: filter.kelasId });
        if (filter.guruId)
            qb.andWhere('p.guruId = :guruId', { guruId: filter.guruId });
        qb.orderBy('j.hari', 'ASC')
            .addOrderBy('j.jamMulai', 'ASC')
            .addOrderBy('p.kelasId', 'ASC');
        const rows = await qb.getMany();
        return { data: rows, taId };
    }
    hariLabel(hari) {
        const map = {
            1: 'Senin',
            2: 'Selasa',
            3: 'Rabu',
            4: 'Kamis',
            5: 'Jumat',
            6: 'Sabtu',
        };
        return map[hari] ?? `hari#${hari}`;
    }
    async createJadwal(dto, req) {
        if (hhmmToMin(dto.jamSelesai) <= hhmmToMin(dto.jamMulai)) {
            throw new common_1.BadRequestException('jamSelesai harus setelah jamMulai');
        }
        const penugasan = await this.penugasanRepo.findOne({
            where: { id: dto.penugasanId },
            relations: ['kelas', 'mapel', 'guru', 'tahunAjaran'],
        });
        if (!penugasan) {
            throw new common_1.NotFoundException('Penugasan tidak ditemukan');
        }
        await this.assertNoOverlap({
            kelasId: penugasan.kelasId,
            guruId: penugasan.guruId,
            hari: dto.hari,
            jamMulai: dto.jamMulai,
            jamSelesai: dto.jamSelesai,
            tahunAjaranId: penugasan.tahunAjaranId,
        });
        const saved = await this.jadwalRepo.save(this.jadwalRepo.create({
            penugasanId: dto.penugasanId,
            hari: dto.hari,
            jamMulai: dto.jamMulai,
            jamSelesai: dto.jamSelesai,
            sesiKe: dto.sesiKe ?? null,
        }));
        const taLabel = penugasan.tahunAjaran
            ? `${penugasan.tahunAjaran.nama} Sem ${penugasan.tahunAjaran.semester}`
            : `TA#${penugasan.tahunAjaranId}`;
        const namaKelas = penugasan.kelas?.nama ?? `kelas#${penugasan.kelasId}`;
        const namaMapel = penugasan.mapel?.nama ?? `mapel#${penugasan.mapelId}`;
        const namaGuru = penugasan.guru?.nama ?? `guru#${penugasan.guruId}`;
        const hariName = this.hariLabel(dto.hari);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'CREATE_JADWAL',
            resource: 'jadwal_kbm',
            resourceId: String(saved.id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menambah jadwal ${namaMapel} ${namaKelas} ${hariName} ${dto.jamMulai}–${dto.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
            details: {
                penugasanId: dto.penugasanId,
                namaMapel,
                namaKelas,
                namaGuru,
                hari: dto.hari,
                hariLabel: hariName,
                jamMulai: dto.jamMulai,
                jamSelesai: dto.jamSelesai,
                taId: penugasan.tahunAjaranId,
                taLabel,
            },
        });
        return saved;
    }
    async updateJadwal(id, dto, req) {
        const row = await this.jadwalRepo.findOne({
            where: { id },
            relations: ['penugasan', 'penugasan.kelas', 'penugasan.mapel', 'penugasan.guru', 'penugasan.tahunAjaran'],
        });
        if (!row)
            throw new common_1.NotFoundException('Slot jadwal tidak ditemukan');
        const before = {
            penugasanId: row.penugasanId,
            hari: row.hari,
            jamMulai: row.jamMulai,
            jamSelesai: row.jamSelesai,
            sesiKe: row.sesiKe,
        };
        if (dto.penugasanId && dto.penugasanId !== row.penugasanId) {
            const pn = await this.penugasanRepo.findOne({
                where: { id: dto.penugasanId },
            });
            if (!pn)
                throw new common_1.NotFoundException('Penugasan tidak ditemukan');
            row.penugasanId = dto.penugasanId;
            const fresh = await this.penugasanRepo.findOne({
                where: { id: dto.penugasanId },
                relations: ['kelas', 'mapel', 'guru', 'tahunAjaran'],
            });
            if (fresh) {
                row.penugasan = fresh;
            }
        }
        if (dto.hari !== undefined)
            row.hari = dto.hari;
        if (dto.jamMulai !== undefined)
            row.jamMulai = dto.jamMulai;
        if (dto.jamSelesai !== undefined)
            row.jamSelesai = dto.jamSelesai;
        if (dto.sesiKe !== undefined)
            row.sesiKe = dto.sesiKe;
        if (hhmmToMin(row.jamSelesai) <= hhmmToMin(row.jamMulai)) {
            throw new common_1.BadRequestException('jamSelesai harus setelah jamMulai');
        }
        const pn = await this.penugasanRepo.findOne({
            where: { id: row.penugasanId },
            relations: ['kelas', 'mapel', 'guru', 'tahunAjaran'],
        });
        if (!pn)
            throw new common_1.NotFoundException('Penugasan tidak ditemukan');
        await this.assertNoOverlap({
            kelasId: pn.kelasId,
            guruId: pn.guruId,
            hari: row.hari,
            jamMulai: row.jamMulai,
            jamSelesai: row.jamSelesai,
            tahunAjaranId: pn.tahunAjaranId,
            excludeId: id,
        });
        const saved = await this.jadwalRepo.save(row);
        const taLabel = pn.tahunAjaran
            ? `${pn.tahunAjaran.nama} Sem ${pn.tahunAjaran.semester}`
            : `TA#${pn.tahunAjaranId}`;
        const namaKelas = pn.kelas?.nama ?? `kelas#${pn.kelasId}`;
        const namaMapel = pn.mapel?.nama ?? `mapel#${pn.mapelId}`;
        const namaGuru = pn.guru?.nama ?? `guru#${pn.guruId}`;
        const hariName = this.hariLabel(row.hari);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'UPDATE_JADWAL',
            resource: 'jadwal_kbm',
            resourceId: String(saved.id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Memperbarui jadwal ${namaMapel} ${namaKelas} ${hariName} ${row.jamMulai}–${row.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
            details: { before, after: { ...dto, namaMapel, namaKelas, namaGuru, hariLabel: hariName, taLabel } },
        });
        return saved;
    }
    async removeJadwal(id, req) {
        const row = await this.jadwalRepo.findOne({
            where: { id },
            relations: ['penugasan', 'penugasan.kelas', 'penugasan.mapel', 'penugasan.guru', 'penugasan.tahunAjaran'],
        });
        if (!row)
            throw new common_1.NotFoundException('Slot jadwal tidak ditemukan');
        await this.jadwalRepo.remove(row);
        const pn = row.penugasan;
        const taLabel = pn?.tahunAjaran
            ? `${pn.tahunAjaran.nama} Sem ${pn.tahunAjaran.semester}`
            : `TA#${pn?.tahunAjaranId}`;
        const namaKelas = pn?.kelas?.nama ?? `kelas#${pn?.kelasId}`;
        const namaMapel = pn?.mapel?.nama ?? `mapel#${pn?.mapelId}`;
        const namaGuru = pn?.guru?.nama ?? `guru#${pn?.guruId}`;
        const hariName = this.hariLabel(row.hari);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'DELETE_JADWAL',
            resource: 'jadwal_kbm',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menghapus jadwal ${namaMapel} ${namaKelas} ${hariName} ${row.jamMulai}–${row.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
        });
        return { ok: true };
    }
    async assertNoOverlap(opts) {
        const newStart = hhmmToMin(opts.jamMulai);
        const newEnd = hhmmToMin(opts.jamSelesai);
        const all = await this.jadwalRepo
            .createQueryBuilder('j')
            .innerJoinAndSelect('j.penugasan', 'p')
            .leftJoinAndSelect('p.mapel', 'm')
            .leftJoinAndSelect('p.kelas', 'k')
            .leftJoinAndSelect('p.guru', 'g')
            .where('p.tahunAjaranId = :taId', { taId: opts.tahunAjaranId })
            .andWhere('j.hari = :hari', { hari: opts.hari })
            .getMany();
        for (const slot of all) {
            if (opts.excludeId && slot.id === opts.excludeId)
                continue;
            const s = hhmmToMin(slot.jamMulai);
            const e = hhmmToMin(slot.jamSelesai);
            if (e <= newStart || s >= newEnd)
                continue;
            const namaMapel = slot.penugasan?.mapel?.nama ?? `mapel#${slot.penugasan?.mapelId}`;
            const namaKelas = slot.penugasan?.kelas?.nama ?? `kelas#${slot.penugasan?.kelasId}`;
            const namaGuru = slot.penugasan?.guru?.nama ?? `guru#${slot.penugasan?.guruId}`;
            if (slot.penugasan?.kelasId === opts.kelasId) {
                throw new common_1.ConflictException(`Kelas ${namaKelas} sudah ada KBM ${namaMapel} pada ${slot.jamMulai}–${slot.jamSelesai}`);
            }
            if (slot.penugasan?.guruId === opts.guruId) {
                throw new common_1.ConflictException(`${namaGuru} sudah mengajar ${namaMapel} di kelas ${namaKelas} pada ${slot.jamMulai}–${slot.jamSelesai}`);
            }
        }
    }
    async listLibur() {
        return this.liburRepo.find({ order: { tanggal: 'ASC' } });
    }
    async createLibur(dto, req) {
        try {
            const saved = await this.liburRepo.save(this.liburRepo.create(dto));
            await this.audit.log({
                actorId: req.session?.userId ?? null,
                action: 'CREATE_LIBUR',
                resource: 'kalender_libur',
                resourceId: String(saved.id),
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                summary: `Menambah hari libur ${saved.tanggal} (${saved.keterangan})`,
                details: dto,
            });
            return saved;
        }
        catch (err) {
            if (err?.code === '23505') {
                throw new common_1.ConflictException(`Libur pada tanggal ${dto.tanggal} sudah terdaftar`);
            }
            throw err;
        }
    }
    async removeLibur(id, req) {
        const row = await this.liburRepo.findOne({ where: { id } });
        if (!row)
            throw new common_1.NotFoundException('Hari libur tidak ditemukan');
        await this.liburRepo.remove(row);
        await this.audit.log({
            actorId: req.session?.userId ?? null,
            action: 'DELETE_LIBUR',
            resource: 'kalender_libur',
            resourceId: String(id),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Menghapus libur ${row.tanggal}`,
        });
        return { ok: true };
    }
    async getKkm() {
        const row = await this.pengaturanService.getOne('kkm');
        return row;
    }
    async updateKkm(dto, req) {
        const value = { nilai: dto.nilai };
        const saved = await this.pengaturanService.upsert('kkm', value, req);
        return saved;
    }
    async getActiveTaIdOrThrow() {
        const { tahunAjaran } = await this.taService.getActive();
        if (!tahunAjaran) {
            throw new common_1.ConflictException('Tidak ada tahun ajaran aktif. Aktifkan satu tahun ajaran terlebih dahulu.');
        }
        return tahunAjaran.id;
    }
};
exports.KurikulumService = KurikulumService;
exports.KurikulumService = KurikulumService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(mapel_entity_1.Mapel)),
    __param(1, (0, typeorm_1.InjectRepository)(penugasan_entity_1.Penugasan)),
    __param(2, (0, typeorm_1.InjectRepository)(jadwal_kbm_entity_1.JadwalKbm)),
    __param(3, (0, typeorm_1.InjectRepository)(kalender_libur_entity_1.KalenderLibur)),
    __param(4, (0, typeorm_1.InjectRepository)(guru_entity_1.Guru)),
    __param(5, (0, typeorm_1.InjectRepository)(kelas_entity_1.Kelas)),
    __param(6, (0, typeorm_1.InjectRepository)(tahun_ajaran_entity_1.TahunAjaran)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        tahun_ajaran_service_1.TahunAjaranService,
        pengaturan_service_1.PengaturanService])
], KurikulumService);
//# sourceMappingURL=kurikulum.service.js.map