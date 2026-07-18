import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Mapel } from './mapel.entity';
import { Penugasan } from './penugasan.entity';
import { JadwalKbm } from './jadwal-kbm.entity';
import { KalenderLibur } from './kalender-libur.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
import { TahunAjaranService } from '../tahun-ajaran/tahun-ajaran.service';
import { PengaturanService } from '../pengaturan/pengaturan.service';
import { CreatePenugasanDto } from './dto/create-penugasan.dto';
import { UpdatePenugasanDto } from './dto/update-penugasan.dto';
import { CreateJadwalDto } from './dto/create-jadwal.dto';
import { UpdateJadwalDto } from './dto/update-jadwal.dto';
import { CreateLiburDto } from './dto/create-libur.dto';
import { UpdateKkmDto } from './dto/update-kkm.dto';
import { Guru } from '../guru/guru.entity';
import { Kelas } from '../kelas/kelas.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';

export interface MapelFilter {
  q?: string;
  page?: number;
  limit?: number;
}

/**
 * T12: Konversi 'HH:mm' → menit dari 00:00 untuk perbandingan interval.
 */
function hhmmToMin(s: string): number {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

@Injectable()
export class KurikulumService {
  constructor(
    @InjectRepository(Mapel) private readonly mapelRepo: Repository<Mapel>,
    @InjectRepository(Penugasan)
    private readonly penugasanRepo: Repository<Penugasan>,
    @InjectRepository(JadwalKbm)
    private readonly jadwalRepo: Repository<JadwalKbm>,
    @InjectRepository(KalenderLibur)
    private readonly liburRepo: Repository<KalenderLibur>,
    @InjectRepository(Guru) private readonly guruRepo: Repository<Guru>,
    @InjectRepository(Kelas) private readonly kelasRepo: Repository<Kelas>,
    @InjectRepository(TahunAjaran)
    private readonly taRepo: Repository<TahunAjaran>,
    private readonly audit: AuditService,
    private readonly taService: TahunAjaranService,
    private readonly pengaturanService: PengaturanService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // DASHBOARD (T15)
  // ─────────────────────────────────────────────────────────────

  async getDashboard() {
    const { tahunAjaran: taAktif } = await this.taService.getActive();
    const taId = taAktif?.id;
    const [mapelCount, penugasanCount, jadwalCount] = await Promise.all([
      this.mapelRepo.count(),
      taId ? this.penugasanRepo.count({ where: { tahunAjaranId: taId } }) : Promise.resolve(0),
      taId
        ? this.jadwalRepo
            .createQueryBuilder('j')
            .leftJoin('j.penugasan', 'p')
            .where('p.tahunAjaranId = :taId', { taId })
            .getCount()
        : Promise.resolve(0),
    ]);
    return {
      mapelCount,
      penugasanCount,
      jadwalCount,
      taAktif: taAktif ?? null,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // MAPEL (Fase 7)
  // ─────────────────────────────────────────────────────────────

  async listMapel(filter: MapelFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(1000, Math.max(1, filter.limit ?? 50));
    const where: any = {};
    if (filter.q) {
      where.nama = ILike(`%${filter.q}%`);
    }
    const [rows, total] = await this.mapelRepo.findAndCount({
      where,
      order: { urutan: 'ASC', nama: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: rows, total, page, limit };
  }

  async findOneMapel(id: number) {
    const row = await this.mapelRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Mata pelajaran tidak ditemukan');
    return row;
  }

  async createMapel(payload: Partial<Mapel>, req: Request) {
    try {
      const saved = await this.mapelRepo.save(this.mapelRepo.create(payload));
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'CREATE_MAPEL',
        resource: 'mapel',
        resourceId: String(saved.id),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Membuat mata pelajaran ${saved.nama} (${saved.kode})`,
        details: payload,
      });
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        const kode = (payload as any)?.kode ?? '';
        throw new ConflictException(
          `Kode mata pelajaran ${kode} sudah terdaftar`,
        );
      }
      throw err;
    }
  }

  async updateMapel(id: number, payload: Partial<Mapel>, req: Request) {
    const row = await this.mapelRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Mata pelajaran tidak ditemukan');
    Object.assign(row, payload);
    try {
      const saved = await this.mapelRepo.save(row);
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'UPDATE_MAPEL',
        resource: 'mapel',
        resourceId: String(saved.id),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Memperbarui mata pelajaran ${saved.nama} (${saved.kode})`,
        details: payload,
      });
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        const kode = (payload as any)?.kode ?? row.kode;
        throw new ConflictException(
          `Kode mata pelajaran ${kode} sudah terdaftar`,
        );
      }
      throw err;
    }
  }

  async removeMapel(id: number, req: Request) {
    const row = await this.mapelRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Mata pelajaran tidak ditemukan');

    const used = await this.penugasanRepo.count({ where: { mapelId: id } });
    if (used > 0) {
      throw new ConflictException(
        `Mata pelajaran ${row.nama} (${row.kode}) masih digunakan di ${used} penugasan. Hapus penugasan terlebih dahulu.`,
      );
    }

    await this.mapelRepo.remove(row);
    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'DELETE_MAPEL',
      resource: 'mapel',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menghapus mata pelajaran ${row.nama} (${row.kode})`,
    });
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────
  // PENUGASAN (T12 Butir 5)
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/kurikulum/penugasan?taId=&guruId=&kelasId=&mapelId=
   * Jika taId tidak diisi → default TA aktif.
   */
  async listPenugasan(filter: {
    taId?: number;
    guruId?: number;
    kelasId?: number;
    mapelId?: number;
  }) {
    const taId =
      filter.taId ??
      (await this.getActiveTaIdOrThrow());
    const where: any = { tahunAjaranId: taId };
    if (filter.guruId) where.guruId = filter.guruId;
    if (filter.kelasId) where.kelasId = filter.kelasId;
    if (filter.mapelId) where.mapelId = filter.mapelId;
    const rows = await this.penugasanRepo.find({
      where,
      relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
      order: { kelasId: 'ASC', mapelId: 'ASC' },
    });
    return { data: rows, taId };
  }

  /**
   * T12-FIX: Ambil nama-nama referensi (guru/mapel/kelas/TA) untuk pesan
   * error & audit yang informatif.
   */
  private async getRefNames(taId: number, guruId: number, mapelId: number) {
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

  /**
   * POST /api/kurikulum/penugasan
   * 1 input → N baris (1 per kelas). Semua baris share tahunAjaranId=TA aktif.
   * 409 bila mapel-kelas sudah ada di TA aktif.
   * T12-FIX: pesan duplikat menyebut NAMA MAPEL + NAMA PENGAMPU per kelas.
   */
  async createPenugasan(dto: CreatePenugasanDto, req: Request) {
    const taId = await this.getActiveTaIdOrThrow();

    // Validasi guru & mapel ada.
    const guru = await this.guruRepo.findOne({ where: { id: dto.guruId } });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    const mapel = await this.mapelRepo.findOne({ where: { id: dto.mapelId } });
    if (!mapel) throw new NotFoundException('Mata pelajaran tidak ditemukan');

    // 409: cek duplikat (mapel+kelas) yang sudah ada di TA aktif.
    const existing = await this.penugasanRepo.find({
      where: {
        mapelId: dto.mapelId,
        kelasId: In(dto.kelasIds),
        tahunAjaranId: taId,
      },
      relations: ['kelas', 'guru'],
    });
    if (existing.length > 0) {
      const detail = existing
        .map(
          (e) =>
            `${e.kelas?.nama ?? '?'} (diampu ${e.guru?.nama ?? '?'})`,
        )
        .join('; ');
      throw new ConflictException(
        `${mapel.nama} sudah terdaftar di: ${detail} pada tahun ajaran aktif`,
      );
    }

    // Validasi kelas ada (semua ID di kelasIds).
    const kelasRows = await this.kelasRepo.find({
      where: { id: In(dto.kelasIds) },
    });
    if (kelasRows.length !== dto.kelasIds.length) {
      const foundIds = new Set(kelasRows.map((k) => k.id));
      const missing = dto.kelasIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Kelas tidak ditemukan: ${missing.join(', ')}`,
      );
    }

    const entities = dto.kelasIds.map((kelasId) =>
      this.penugasanRepo.create({
        mapelId: dto.mapelId,
        kelasId,
        guruId: dto.guruId,
        tahunAjaranId: taId,
      }),
    );
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
      userAgent: req.headers['user-agent'] as string,
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

  /**
   * PATCH /api/kurikulum/penugasan/:id
   * Update hanya guruId (id paket TETAP — §14.10.2).
   * Jadwal / TP / Penilaian / Nilai TIDAK tersentuh (FK onUpdate idempotent).
   * T12-FIX: validasi guruId baru ada (404), audit bernama.
   */
  async updatePenugasan(id: number, dto: UpdatePenugasanDto, req: Request) {
    const row = await this.penugasanRepo.findOne({
      where: { id },
      relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
    });
    if (!row) throw new NotFoundException('Penugasan tidak ditemukan');

    // Validasi guru baru ada.
    const guruBaru = await this.guruRepo.findOne({
      where: { id: dto.guruId },
    });
    if (!guruBaru) throw new NotFoundException('Guru tidak ditemukan');

    const ta = row.tahunAjaran;
    const taLabel = ta ? `${ta.nama} Sem ${ta.semester}` : `TA#${row.tahunAjaranId}`;
    const namaMapel = row.mapel?.nama ?? `mapel#${row.mapelId}`;
    const namaKelas = row.kelas?.nama ?? `kelas#${row.kelasId}`;
    const namaGuruLama = row.guru?.nama ?? `guru#${row.guruId}`;

    const before = {
      guruId: row.guruId,
      namaGuru: namaGuruLama,
    };
    // Gunakan update() agar FK column guruId benar-benar tersimpan,
    // meskipun relasi guru lama masih ter-load di entity.
    await this.penugasanRepo.update({ id }, { guruId: dto.guruId });

    // Reload dengan relasi agar response konsisten.
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
      userAgent: req.headers['user-agent'] as string,
      summary: `Mengganti guru paket ${namaMapel} ${namaKelas} (${taLabel}) dari ${namaGuruLama} ke ${guruBaru.nama}`,
      details: {
        before,
        after: { guruId: guruBaru.id, namaGuru: guruBaru.nama },
      },
    });
    return updated;
  }

  /**
   * DELETE /api/kurikulum/penugasan/:id
   * T12-FIX: 409 jika sudah dipakai di jadwal_kbm (BUKAN cascade hapus jadwal).
   * Sesuai spec §14.10.2.
   */
  async removePenugasan(id: number, req: Request) {
    const row = await this.penugasanRepo.findOne({
      where: { id },
      relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
    });
    if (!row) throw new NotFoundException('Penugasan tidak ditemukan');

    // 409 jika jadwal masih ada — hapus jadwal dulu.
    const usedJadwal = await this.jadwalRepo.count({
      where: { penugasanId: id },
    });
    if (usedJadwal > 0) {
      const ta = row.tahunAjaran;
      const taLabel = ta ? `${ta.nama} Sem ${ta.semester}` : `TA#${row.tahunAjaranId}`;
      throw new ConflictException(
        `Penugasan ${row.mapel?.nama ?? 'mapel#' + row.mapelId} di kelas ${row.kelas?.nama ?? 'kelas#' + row.kelasId} (${taLabel}) masih dipakai di ${usedJadwal} jadwal. Hapus jadwalnya dulu`,
      );
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
      userAgent: req.headers['user-agent'] as string,
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

  async countPenugasanGuruAktif(guruId: number, taId: number): Promise<number> {
    return this.penugasanRepo.count({
      where: { guruId, tahunAjaranId: taId },
    });
  }

  /**
   * T15 0b: Batch count penugasan untuk multiple guru sekaligus (eliminasi N+1).
   * Mengembalikan Map<guruId, count> — satu query GROUP BY, bukan satu COUNT per baris.
   */
  async countPenugasanGuruAktifBatch(
    guruIds: number[],
    taId: number,
  ): Promise<Map<number, number>> {
    if (guruIds.length === 0) return new Map();
    const rows = await this.penugasanRepo
      .createQueryBuilder('p')
      .select('p.guruId', 'guruId')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.guruId IN (:...ids)', { ids: guruIds })
      .andWhere('p.tahunAjaranId = :taId', { taId })
      .groupBy('p.guruId')
      .getRawMany();
    const map = new Map<number, number>();
    for (const r of rows as any[]) {
      map.set(r.guruId, parseInt(r.cnt, 10));
    }
    return map;
  }

  // ─────────────────────────────────────────────────────────────
  // JADWAL KBM (T12 Butir 5)
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/kurikulum/jadwal?taId=&kelasId=&guruId=
   * Default TA aktif. Selalu kembalikan jadwal lengkap (urut by hari, jamMulai).
   */
  async listJadwal(filter: { taId?: number; kelasId?: number; guruId?: number }) {
    const taId = filter.taId ?? (await this.getActiveTaIdOrThrow());

    // Bangun query via JOIN penugasan agar filter by guruId & kelasId bisa.
    const qb = this.jadwalRepo
      .createQueryBuilder('j')
      .innerJoinAndSelect('j.penugasan', 'p')
      .leftJoinAndSelect('p.mapel', 'm')
      .leftJoinAndSelect('p.kelas', 'k')
      .leftJoinAndSelect('p.guru', 'g')
      .where('p.tahunAjaranId = :taId', { taId });

    if (filter.kelasId) qb.andWhere('p.kelasId = :kelasId', { kelasId: filter.kelasId });
    if (filter.guruId) qb.andWhere('p.guruId = :guruId', { guruId: filter.guruId });

    qb.orderBy('j.hari', 'ASC')
      .addOrderBy('j.jamMulai', 'ASC')
      .addOrderBy('p.kelasId', 'ASC');

    const rows = await qb.getMany();
    return { data: rows, taId };
  }

  /**
   * T12-FIX: mapping hari angka → label Indonesia untuk pesan & audit.
   */
  private hariLabel(hari: number): string {
    const map: Record<number, string> = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };
    return map[hari] ?? `hari#${hari}`;
  }

  /**
   * POST /api/kurikulum/jadwal
   * Aturan §14.10.2: tidak boleh ada overlap slot pada kelas+hari yang sama.
   * T12-FIX: juga cek bentrok GURU lintas kelas (guru yang sama di kelas lain
   * pada hari & interval yang sama). Lingkup tahun ajaran penugasan.
   */
  async createJadwal(dto: CreateJadwalDto, req: Request) {
    if (hhmmToMin(dto.jamSelesai) <= hhmmToMin(dto.jamMulai)) {
      throw new BadRequestException(
        'jamSelesai harus setelah jamMulai',
      );
    }

    // Resolve penugasan.
    const penugasan = await this.penugasanRepo.findOne({
      where: { id: dto.penugasanId },
      relations: ['kelas', 'mapel', 'guru', 'tahunAjaran'],
    });
    if (!penugasan) {
      throw new NotFoundException('Penugasan tidak ditemukan');
    }

    await this.assertNoOverlap({
      kelasId: penugasan.kelasId,
      guruId: penugasan.guruId,
      hari: dto.hari,
      jamMulai: dto.jamMulai,
      jamSelesai: dto.jamSelesai,
      tahunAjaranId: penugasan.tahunAjaranId,
    });

    const saved = await this.jadwalRepo.save(
      this.jadwalRepo.create({
        penugasanId: dto.penugasanId,
        hari: dto.hari,
        jamMulai: dto.jamMulai,
        jamSelesai: dto.jamSelesai,
        sesiKe: dto.sesiKe ?? null,
      }),
    );

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
      userAgent: req.headers['user-agent'] as string,
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

  /**
   * PATCH /api/kurikulum/jadwal/:id
   */
  async updateJadwal(id: number, dto: UpdateJadwalDto, req: Request) {
    const row = await this.jadwalRepo.findOne({
      where: { id },
      relations: ['penugasan', 'penugasan.kelas', 'penugasan.mapel', 'penugasan.guru', 'penugasan.tahunAjaran'],
    });
    if (!row) throw new NotFoundException('Slot jadwal tidak ditemukan');

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
      if (!pn) throw new NotFoundException('Penugasan tidak ditemukan');
      row.penugasanId = dto.penugasanId;
      // Reload with new relations.
      const fresh = await this.penugasanRepo.findOne({
        where: { id: dto.penugasanId },
        relations: ['kelas', 'mapel', 'guru', 'tahunAjaran'],
      });
      if (fresh) {
        row.penugasan = fresh;
      }
    }
    if (dto.hari !== undefined) row.hari = dto.hari;
    if (dto.jamMulai !== undefined) row.jamMulai = dto.jamMulai;
    if (dto.jamSelesai !== undefined) row.jamSelesai = dto.jamSelesai;
    if (dto.sesiKe !== undefined) row.sesiKe = dto.sesiKe;

    if (hhmmToMin(row.jamSelesai) <= hhmmToMin(row.jamMulai)) {
      throw new BadRequestException('jamSelesai harus setelah jamMulai');
    }

    // Resolve kelasId via penugasan final
    const pn = await this.penugasanRepo.findOne({
      where: { id: row.penugasanId },
      relations: ['kelas', 'mapel', 'guru', 'tahunAjaran'],
    });
    if (!pn) throw new NotFoundException('Penugasan tidak ditemukan');

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
      userAgent: req.headers['user-agent'] as string,
      summary: `Memperbarui jadwal ${namaMapel} ${namaKelas} ${hariName} ${row.jamMulai}–${row.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
      details: { before, after: { ...dto, namaMapel, namaKelas, namaGuru, hariLabel: hariName, taLabel } },
    });
    return saved;
  }

  async removeJadwal(id: number, req: Request) {
    const row = await this.jadwalRepo.findOne({
      where: { id },
      relations: ['penugasan', 'penugasan.kelas', 'penugasan.mapel', 'penugasan.guru', 'penugasan.tahunAjaran'],
    });
    if (!row) throw new NotFoundException('Slot jadwal tidak ditemukan');
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
      userAgent: req.headers['user-agent'] as string,
      summary: `Menghapus jadwal ${namaMapel} ${namaKelas} ${hariName} ${row.jamMulai}–${row.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
    });
    return { ok: true };
  }

  /**
   * T12-FIX: Cek overlap pada:
   *  (a) kelas+hari yang sama (TA yang sama) — pesan sebut kelas+mapel+jam.
   *  (b) GURU lintas kelas: guru yang sama pada hari yang sama dengan
   *      interval beririsan di kelas LAIN (TA yang sama) — pesan sebut
   *      nama guru + kelas asal.
   * Pakai TA filter agar jadwal TA lama tak memicu konflik palsu.
   */
  private async assertNoOverlap(opts: {
    kelasId: number;
    guruId: number;
    tahunAjaranId: number;
    hari: number;
    jamMulai: string;
    jamSelesai: string;
    excludeId?: number;
  }) {
    const newStart = hhmmToMin(opts.jamMulai);
    const newEnd = hhmmToMin(opts.jamSelesai);

    // Ambil semua jadwal di TA yang sama, hari yang sama (dengan relasi
    // mapel/kelas/guru/TA untuk pesan & filter).
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
      if (opts.excludeId && slot.id === opts.excludeId) continue;
      const s = hhmmToMin(slot.jamMulai);
      const e = hhmmToMin(slot.jamSelesai);
      // overlap?
      if (e <= newStart || s >= newEnd) continue;

      const namaMapel = slot.penugasan?.mapel?.nama ?? `mapel#${slot.penugasan?.mapelId}`;
      const namaKelas = slot.penugasan?.kelas?.nama ?? `kelas#${slot.penugasan?.kelasId}`;
      const namaGuru = slot.penugasan?.guru?.nama ?? `guru#${slot.penugasan?.guruId}`;

      // (a) kelas sama — bentrok kelas.
      if (slot.penugasan?.kelasId === opts.kelasId) {
        throw new ConflictException(
          `Kelas ${namaKelas} sudah ada KBM ${namaMapel} pada ${slot.jamMulai}–${slot.jamSelesai}`,
        );
      }

      // (b) guru sama di kelas lain — bentrok guru lintas kelas.
      if (slot.penugasan?.guruId === opts.guruId) {
        throw new ConflictException(
          `${namaGuru} sudah mengajar ${namaMapel} di kelas ${namaKelas} pada ${slot.jamMulai}–${slot.jamSelesai}`,
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // KALENDER LIBUR (T12 Butir 5)
  // ─────────────────────────────────────────────────────────────

  async listLibur() {
    return this.liburRepo.find({ order: { tanggal: 'ASC' } });
  }

  async createLibur(dto: CreateLiburDto, req: Request) {
    try {
      const saved = await this.liburRepo.save(this.liburRepo.create(dto));
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'CREATE_LIBUR',
        resource: 'kalender_libur',
        resourceId: String(saved.id),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Menambah hari libur ${saved.tanggal} (${saved.keterangan})`,
        details: dto,
      });
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException(
          `Libur pada tanggal ${dto.tanggal} sudah terdaftar`,
        );
      }
      throw err;
    }
  }

  async removeLibur(id: number, req: Request) {
    const row = await this.liburRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Hari libur tidak ditemukan');
    await this.liburRepo.remove(row);
    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'DELETE_LIBUR',
      resource: 'kalender_libur',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menghapus libur ${row.tanggal}`,
    });
    return { ok: true };
  }

  /**
   * T15-FIX: POST /api/admin/libur/bulk — seleksi-multi lalu aksi.
   * aksi='tandai': buat entri untuk tanggal yang BELUM libur (skip yang sudah).
   * aksi='hapus': hapus entri untuk tanggal yang SUDAH libur (skip yang belum).
   * Satu audit ringkas untuk seluruh batch (bukan per tanggal).
   */
  async bulkLibur(
    dto: { tanggal: string[]; keterangan?: string; aksi: 'tandai' | 'hapus' },
    req: Request,
  ) {
    const existing = await this.liburRepo.find({
      where: dto.tanggal.map((t) => ({ tanggal: t })),
    });
    const existingMap = new Map(existing.map((e) => [e.tanggal, e]));

    if (dto.aksi === 'tandai') {
      const toCreate = dto.tanggal.filter((t) => !existingMap.has(t));
      const dilewati = dto.tanggal.length - toCreate.length;
      const rows = toCreate.map((tanggal) =>
        this.liburRepo.create({
          tanggal,
          keterangan: dto.keterangan?.trim() || 'Libur',
        }),
      );
      const saved = rows.length > 0 ? await this.liburRepo.save(rows) : [];
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'BULK_CREATE_LIBUR',
        resource: 'kalender_libur',
        resourceId: null,
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Menandai ${saved.length} hari libur (${dilewati} dilewati — sudah ada)`,
        details: { tanggal: toCreate, keterangan: dto.keterangan },
      });
      return { dibuat: saved.length, dilewati };
    } else {
      const toDelete = existing;
      const dilewati = dto.tanggal.length - toDelete.length;
      if (toDelete.length > 0) {
        await this.liburRepo.remove(toDelete);
      }
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'BULK_DELETE_LIBUR',
        resource: 'kalender_libur',
        resourceId: null,
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Menghapus ${toDelete.length} penanda libur (${dilewati} dilewati — belum libur)`,
        details: { tanggal: toDelete.map((t) => t.tanggal) },
      });
      return { dihapus: toDelete.length, dilewati };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // IMPOR LIBUR NASIONAL (T15-FIX — KEPUTUSAN USER)
  // ─────────────────────────────────────────────────────────────

  /**
   * Cache in-process 24 jam per tahun agar tidak membebani provider pihak
   * ketiga (KEPUTUSAN USER — deteksi otomatis §14.10.2).
   */
  private nasionalCache = new Map<
    number,
    { data: { tanggal: string; keterangan: string }[]; expiresAt: number }
  >();

  /**
   * Ambil daftar libur nasional dari provider pihak ketiga untuk satu tahun.
   * Provider: api-harilibur.vercel.app (gratis, tanpa API key). Gagal jangkau
   * → lempar error yang ditangkap caller (tidak memblokir alur manual).
   */
  private async fetchNasionalTahun(
    tahun: number,
  ): Promise<{ tanggal: string; keterangan: string }[]> {
    const cached = this.nasionalCache.get(tahun);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const res = await fetch(
      `https://api-harilibur.vercel.app/api?year=${tahun}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) {
      throw new Error(`Provider libur nasional mengembalikan ${res.status}`);
    }
    const raw = (await res.json()) as Array<{
      holiday_date: string;
      holiday_name: string;
      is_national_holiday: boolean;
    }>;
    const data = raw
      .filter((r) => r.is_national_holiday)
      .map((r) => ({ tanggal: r.holiday_date, keterangan: r.holiday_name }));
    this.nasionalCache.set(tahun, {
      data,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    return data;
  }

  /**
   * GET /api/admin/libur/impor-nasional?tahun=YYYY
   * Pratinjau daftar libur nasional + flag `sudahAda` bila tanggal itu sudah
   * tercatat di kalender_libur (admin memutuskan mana yang diimpor).
   */
  async importNasionalPratinjau(tahun: number) {
    let list: { tanggal: string; keterangan: string }[];
    try {
      list = await this.fetchNasionalTahun(tahun);
    } catch {
      throw new ServiceUnavailableException(
        'Sumber data tidak terjangkau — coba lagi atau isi manual.',
      );
    }
    if (list.length === 0) return [];
    const existing = await this.liburRepo.find({
      where: list.map((l) => ({ tanggal: l.tanggal })),
    });
    const existingSet = new Set(existing.map((e) => e.tanggal));
    return list
      .map((l) => ({ ...l, sudahAda: existingSet.has(l.tanggal) }))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }

  /**
   * GET /api/admin/libur/cek-nasional
   * Deteksi diam-diam: hitung berapa libur nasional (tahun berjalan + tahun
   * berikutnya) yang BELUM ada di kalender. Gagal cek → {baru: 0} (diam,
   * tanpa error — jangan mengganggu alur admin).
   */
  async cekNasional() {
    const now = new Date();
    const tahunIni = now.getFullYear();
    try {
      const [listIni, listBerikut] = await Promise.all([
        this.fetchNasionalTahun(tahunIni),
        this.fetchNasionalTahun(tahunIni + 1),
      ]);
      const gabungan = [...listIni, ...listBerikut];
      if (gabungan.length === 0) return { baru: 0 };
      const existing = await this.liburRepo.find({
        where: gabungan.map((l) => ({ tanggal: l.tanggal })),
      });
      const existingSet = new Set(existing.map((e) => e.tanggal));
      const baru = gabungan.filter((l) => !existingSet.has(l.tanggal)).length;
      return { baru };
    } catch {
      // Gagal cek = diam (tanpa banner/error) — provider mungkin down.
      return { baru: 0 };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // KKM (T12 Butir 5)
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/kurikulum/pengaturan/kkm
   * Baca key 'kkm' dari tabel pengaturan.
   */
  async getKkm() {
    const row = await this.pengaturanService.getOne('kkm');
    return row;
  }

  /**
   * PATCH /api/kurikulum/pengaturan/kkm
   * T12-FIX: struktur = `{ nilai: number }`. Tanpa perMapel/keterangan.
   * Disimpan di key 'kkm' (satu nilai global).
   */
  async updateKkm(dto: UpdateKkmDto, req: Request) {
    const value = { nilai: dto.nilai };
    const saved = await this.pengaturanService.upsert('kkm', value, req);
    return saved;
  }

  // ─────────────────────────────────────────────────────────────
  // UTIL
  // ─────────────────────────────────────────────────────────────

  private async getActiveTaIdOrThrow(): Promise<number> {
    const { tahunAjaran } = await this.taService.getActive();
    if (!tahunAjaran) {
      throw new ConflictException(
        'Tidak ada tahun ajaran aktif. Aktifkan satu tahun ajaran terlebih dahulu.',
      );
    }
    return tahunAjaran.id;
  }
}
