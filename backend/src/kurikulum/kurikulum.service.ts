import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { Mapel } from './mapel.entity';
import { Penugasan } from './penugasan.entity';
import { JadwalKbm } from './jadwal-kbm.entity';
import { JamPelajaran } from './jam-pelajaran.entity';
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
import { PresensiSesi } from '../presensi/presensi-sesi.entity';
import { Penilaian } from '../penilaian/penilaian.entity';
import { Nilai } from '../penilaian/nilai.entity';
import { Siswa } from '../siswa/siswa.entity';

export interface MapelFilter {
  q?: string;
  page?: number;
  limit?: number;
}

/**
 * T12: Konversi 'HH:mm' â†’ menit dari 00:00 untuk perbandingan interval.
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
    @InjectRepository(JamPelajaran)
    private readonly jpRepo: Repository<JamPelajaran>,
    @InjectRepository(KalenderLibur)
    private readonly liburRepo: Repository<KalenderLibur>,
    @InjectRepository(Guru) private readonly guruRepo: Repository<Guru>,
    @InjectRepository(Kelas) private readonly kelasRepo: Repository<Kelas>,
    @InjectRepository(TahunAjaran)
    private readonly taRepo: Repository<TahunAjaran>,
    @InjectRepository(Penilaian)
    private readonly penilaianRepo: Repository<Penilaian>,
    @InjectRepository(Nilai)
    private readonly nilaiRepo: Repository<Nilai>,
    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,
    private readonly audit: AuditService,
    private readonly taService: TahunAjaranService,
    private readonly pengaturanService: PengaturanService,
  ) {}

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // DASHBOARD (T15)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // MAPEL (Fase 7)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PENUGASAN (T12 Butir 5)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * GET /api/kurikulum/penugasan?taId=&guruId=&kelasId=&mapelId=
   * Jika taId tidak diisi â†’ default TA aktif.
   */
  async listPenugasan(filter: {
    taId?: number;
    guruId?: number;
    kelasId?: number;
    mapelId?: number;
    page?: number;
    limit?: number;
  }) {
    const taId =
      filter.taId ??
      (await this.getActiveTaIdOrThrow());
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(200, Math.max(1, filter.limit ?? 25));
    const where: any = { tahunAjaranId: taId };
    if (filter.guruId) where.guruId = filter.guruId;
    if (filter.kelasId) where.kelasId = filter.kelasId;
    if (filter.mapelId) where.mapelId = filter.mapelId;
    const [rows, total] = await this.penugasanRepo.findAndCount({
      where,
      relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
      order: { kelasId: 'ASC', mapelId: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: rows, total, page, limit, taId };
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
   * 1 input â†’ N baris (1 per kelas). Semua baris share tahunAjaranId=TA aktif.
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
   * Update hanya guruId (id paket TETAP â€” Â§14.10.2).
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
   * Sesuai spec Â§14.10.2.
   */
  async removePenugasan(id: number, req: Request) {
    const row = await this.penugasanRepo.findOne({
      where: { id },
      relations: ['mapel', 'kelas', 'guru', 'tahunAjaran'],
    });
    if (!row) throw new NotFoundException('Penugasan tidak ditemukan');

    // 409 jika jadwal masih ada â€” hapus jadwal dulu.
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
   * Mengembalikan Map<guruId, count> â€” satu query GROUP BY, bukan satu COUNT per baris.
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // JADWAL KBM (T12 Butir 5)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
   * T12-FIX: mapping hari angka â†’ label Indonesia untuk pesan & audit.
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
   * Aturan Â§14.10.2: tidak boleh ada overlap slot pada kelas+hari yang sama.
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
      summary: `Menambah jadwal ${namaMapel} ${namaKelas} ${hariName} ${dto.jamMulai}â€“${dto.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
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
      summary: `Memperbarui jadwal ${namaMapel} ${namaKelas} ${hariName} ${row.jamMulai}â€“${row.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
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

    // presensi_sesi.jadwalKbmId = onDelete RESTRICT (riwayat presensi tidak
    // boleh ikut terhapus). Periksa dulu supaya menolak dengan 409 + alasan,
    // bukan meledak jadi 500 dari constraint database.
    const sesiTerpakai = await this.jadwalRepo.manager.count(PresensiSesi, {
      where: { jadwalKbmId: id },
    });
    if (sesiTerpakai > 0) {
      throw new ConflictException(
        `Slot jadwal ini sudah dipakai pada ${sesiTerpakai} sesi presensi yang tercatat. ` +
          `Riwayat presensi tidak boleh dihapus. Ubah jadwalnya, atau hapus dari jadwal ` +
          `tahun ajaran berikutnya.`,
      );
    }

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
      summary: `Menghapus jadwal ${namaMapel} ${namaKelas} ${hariName} ${row.jamMulai}â€“${row.jamSelesai} (guru ${namaGuru}, ${taLabel})`,
    });
    return { ok: true };
  }

  /**
   * T12-FIX: Cek overlap pada:
   *  (a) kelas+hari yang sama (TA yang sama) â€” pesan sebut kelas+mapel+jam.
   *  (b) GURU lintas kelas: guru yang sama pada hari yang sama dengan
   *      interval beririsan di kelas LAIN (TA yang sama) â€” pesan sebut
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

      // (a) kelas sama â€” bentrok kelas.
      if (slot.penugasan?.kelasId === opts.kelasId) {
        throw new ConflictException(
          `Kelas ${namaKelas} sudah ada KBM ${namaMapel} pada ${slot.jamMulai}â€“${slot.jamSelesai}`,
        );
      }

      // (b) guru sama di kelas lain â€” bentrok guru lintas kelas.
      if (slot.penugasan?.guruId === opts.guruId) {
        throw new ConflictException(
          `${namaGuru} sudah mengajar ${namaMapel} di kelas ${namaKelas} pada ${slot.jamMulai}â€“${slot.jamSelesai}`,
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // JADWAL MATRIKS (JADWAL-MATRIX spec)
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/kurikulum/jadwal/matriks?hari=N[&taId=]
   * Satu request per hari. Kembalikan:
   *   { hari, taId, jamSlots[], kelas[], sel: { "<kelasId>:<jamMulai>": {...} } }
   *
   * JADWAL-KONFLIK Bug 1: jamSlots = gabungan JP terdaftar + jam jadwal yg tidak punya JP.
   * Baris asing (tanpa JP) ditandai isOrphan:true agar terlihat & bisa dibereskan.
   */
  async listJadwalMatriks(filter: { hari: number; taId?: number }) {
    const taId = filter.taId ?? (await this.getActiveTaIdOrThrow());

    // JADWAL-KELAS-BERSIH: hanya kelas ber-pola nyata (7A-9J) yang punya penugasan di TA aktif.
    const kelasIds = await this.penugasanRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.kelasId', 'kelasId')
      .innerJoin('p.kelas', 'k')
      .where('p.tahunAjaranId = :taId', { taId })
      .andWhere("k.nama ~ '^[789][A-J]$'")
      .getRawMany<{ kelasId: number }>();
    const kelasIdSet = new Set(kelasIds.map((r) => r.kelasId));
    const kelasList = kelasIdSet.size
      ? await this.kelasRepo.find({
          where: { id: In(Array.from(kelasIdSet)) },
          order: { nama: 'ASC' },
        })
      : [];

    const rows = await this.jadwalRepo
      .createQueryBuilder('j')
      .innerJoinAndSelect('j.penugasan', 'p')
      .leftJoinAndSelect('p.kelas', 'k')
      .leftJoinAndSelect('p.mapel', 'm')
      .leftJoinAndSelect('p.guru', 'g')
      .where('p.tahunAjaranId = :taId', { taId })
      .andWhere('j.hari = :hari', { hari: filter.hari })
      .orderBy('j.jamMulai', 'ASC')
      .getMany();

    const sel: Record<
      string,
      {
        kode: string | null;
        guruNama: string;
        mapelNama: string;
        penugasanId: number;
        jadwalId: number;
        guruId: number;
      }
    > = {};

    for (const r of rows) {
      const kelasId = r.penugasan?.kelasId;
      if (!kelasId) continue;
      const key = `${kelasId}:${r.jamMulai}`;
      sel[key] = {
        kode: r.penugasan?.guru?.kode ?? null,
        guruNama: r.penugasan?.guru?.nama ?? `guru#${r.penugasan?.guruId}`,
        mapelNama: r.penugasan?.mapel?.nama ?? `mapel#${r.penugasan?.mapelId}`,
        penugasanId: r.penugasanId,
        jadwalId: r.id,
        guruId: r.penugasan?.guruId ?? 0,
      };
    }

    // Ambil JP terdaftar
    const jpList = await this.jpRepo.find({
      where: { tahunAjaranId: taId, hari: filter.hari },
      order: { urutan: 'ASC' },
    });

    // Kumpulkan jam jadwal yang TIDAK punya JP ("hantu") → baris asing
    const jpJamSet = new Set(
      jpList.map((jp) => `${jp.jamMulai}|${jp.jamSelesai}`),
    );
    const orphanJamSet = new Map<string, { jamMulai: string; jamSelesai: string }>();
    for (const r of rows) {
      const key = `${r.jamMulai}|${r.jamSelesai}`;
      if (!jpJamSet.has(key)) {
        orphanJamSet.set(key, { jamMulai: r.jamMulai, jamSelesai: r.jamSelesai });
      }
    }

    // jamSlots = JP berurutan + baris asing (urutan setelah JP, sort by jamMulai)
    const jamSlots: Array<{
      id: number | null;
      urutan: number;
      jamMulai: string;
      jamSelesai: string;
      isOrphan?: boolean;
    }> = jpList.map((jp) => ({
      id: jp.id,
      urutan: jp.urutan,
      jamMulai: jp.jamMulai,
      jamSelesai: jp.jamSelesai,
    }));

    // Sisipkan baris asing di posisi terurut (by jamMulai)
    for (const orphan of Array.from(orphanJamSet.values()).sort((a, b) =>
      a.jamMulai.localeCompare(b.jamMulai),
    )) {
      jamSlots.push({
        id: null,
        urutan: 0,
        jamMulai: orphan.jamMulai,
        jamSelesai: orphan.jamSelesai,
        isOrphan: true,
      });
    }

    return {
      hari: filter.hari,
      taId,
      jamSlots,
      kelas: kelasList.map((k) => ({ id: k.id, nama: k.nama })),
      sel,
    };
  }

  // ─── Jam Pelajaran CRUD (JADWAL-MATRIX-FIX Butir 6) ─────────────────

  /** GET /api/kurikulum/jam-pelajaran?hari=N[&taId=] */
  async listJamPelajaran(filter: { hari: number; taId?: number }) {
    const taId = filter.taId ?? (await this.getActiveTaIdOrThrow());
    return this.jpRepo.find({
      where: { tahunAjaranId: taId, hari: filter.hari },
      order: { urutan: 'ASC' },
    });
  }

  /**
   * POST /api/kurikulum/jam-pelajaran
   * Tambah JP baru di akhir hari. Tolak tumpang-tindih.
   */
  /**
   * JADWAL-RAPIKAN B: Validasi rentang jam wajar (06:00–17:00).
   * Tolak JP hantu (jam < 06:00 atau > 17:00) yang meracuni prefill & overlap detection.
   */
  private _validateJamRange(jamMulai: string, jamSelesai: string): void {
    const m = hhmmToMin(jamMulai);
    const s = hhmmToMin(jamSelesai);
    const MIN = 6 * 60; // 06:00
    const MAX = 17 * 60; // 17:00
    if (s <= m) throw new BadRequestException('Jam selesai harus setelah jam mulai');
    if (m < MIN) throw new BadRequestException('Jam mulai tidak boleh sebelum 06:00 (terdeteksi JP hantu)');
    if (s > MAX) throw new BadRequestException('Jam selesai tidak boleh setelah 17:00 (terdeteksi JP hantu)');
  }

  async addJamPelajaran(dto: {
    hari: number;
    jamMulai: string;
    jamSelesai: string;
    taId?: number;
  }) {
    const taId = dto.taId ?? (await this.getActiveTaIdOrThrow());
    this._validateJamRange(dto.jamMulai, dto.jamSelesai);
    const existing = await this.jpRepo.find({
      where: { tahunAjaranId: taId, hari: dto.hari },
      order: { urutan: 'ASC' },
    });
    const newMulai = hhmmToMin(dto.jamMulai);
    const newSelesai = hhmmToMin(dto.jamSelesai);
    const overlap = existing.find((jp) => {
      const m = hhmmToMin(jp.jamMulai);
      const s = hhmmToMin(jp.jamSelesai);
      return newMulai < s && newSelesai > m;
    });
    if (overlap)
      throw new ConflictException(
        `Tumpang-tindih dengan JP ${overlap.urutan} (${overlap.jamMulai}–${overlap.jamSelesai})`,
      );
    const urutan = existing.length + 1;
    const jp = this.jpRepo.create({
      tahunAjaranId: taId,
      hari: dto.hari,
      urutan,
      jamMulai: dto.jamMulai,
      jamSelesai: dto.jamSelesai,
    });
    return this.jpRepo.save(jp);
  }

  /**
   * PATCH /api/kurikulum/jam-pelajaran/:id
   * Edit JP → update transaksional semua jadwal_kbm hari itu (jamMulai lama → baru).
   * PresensiSesi aman karena ref ke jadwalId, bukan ke jam.
   */
  async updateJamPelajaran(id: number, dto: { jamMulai: string; jamSelesai: string }) {
    const jp = await this.jpRepo.findOne({ where: { id } });
    if (!jp) throw new NotFoundException('JP tidak ditemukan');
    this._validateJamRange(dto.jamMulai, dto.jamSelesai);
    const newMulai = hhmmToMin(dto.jamMulai);
    const newSelesai = hhmmToMin(dto.jamSelesai);
    if (newSelesai <= newMulai)
      throw new BadRequestException('Jam selesai harus setelah jam mulai');
    const siblings = await this.jpRepo.find({
      where: { tahunAjaranId: jp.tahunAjaranId, hari: jp.hari },
    });
    const overlap = siblings.find((s) => {
      if (s.id === id) return false;
      const m = hhmmToMin(s.jamMulai);
      const se = hhmmToMin(s.jamSelesai);
      return newMulai < se && newSelesai > m;
    });
    if (overlap)
      throw new ConflictException(
        `Tumpang-tindih dengan JP ${overlap.urutan} (${overlap.jamMulai}–${overlap.jamSelesai})`,
      );
    const oldMulai = jp.jamMulai;
    const oldSelesai = jp.jamSelesai;
    return this.jpRepo.manager.transaction(async (em) => {
      // Geser semua jadwal_kbm di hari itu yang punya jam lama
      await em
        .createQueryBuilder()
        .update(JadwalKbm)
        .set({ jamMulai: dto.jamMulai, jamSelesai: dto.jamSelesai })
        .where('hari = :hari AND "jamMulai" = :old AND "jamSelesai" = :oldSel', {
          hari: jp.hari,
          old: oldMulai,
          oldSel: oldSelesai,
        })
        .execute();
      jp.jamMulai = dto.jamMulai;
      jp.jamSelesai = dto.jamSelesai;
      return em.save(JamPelajaran, jp);
    });
  }

  /**
   * DELETE /api/kurikulum/jam-pelajaran/:id
   * Hapus JP hanya bila seluruh selnya kosong.
   */
  async removeJamPelajaran(id: number) {
    const jp = await this.jpRepo.findOne({ where: { id } });
    if (!jp) throw new NotFoundException('JP tidak ditemukan');
    const pemakai = await this.jadwalRepo.count({
      where: { hari: jp.hari, jamMulai: jp.jamMulai },
    });
    if (pemakai > 0)
      throw new ConflictException(
        `JP ini masih dipakai ${pemakai} kelas. Hapus jadwal terkait dulu.`,
      );
    await this.jpRepo.remove(jp);
    return { ok: true };
  }

  /**
   * Generator kode guru 2-alnum unik (A1–Z9, lalu 10–99).
   * Dipanggil di dalam transaksi batch assign.
   */
  private async generateGuruKode(
    em: import('typeorm').EntityManager,
  ): Promise<string> {
    const existing = await em
      .createQueryBuilder(Guru, 'g')
      .select('g.kode', 'kode')
      .where('g.kode IS NOT NULL')
      .getRawMany<{ kode: string }>();
    const usedSet = new Set(existing.map((r) => r.kode));

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const l of letters) {
      for (let n = 1; n <= 9; n++) {
        const candidate = `${l}${n}`;
        if (!usedSet.has(candidate)) return candidate;
      }
    }
    for (let n = 10; n <= 99; n++) {
      const candidate = String(n);
      if (!usedSet.has(candidate)) return candidate;
    }
    throw new ConflictException(
      'Semua slot kode guru (A1–Z9, 10–99) sudah terpakai.',
    );
  }

  /**
   * POST /api/kurikulum/jadwal/batch-assign
   * Body: { hari, slots: [{kelasId, penugasanId, jamMulai, jamSelesai}] }
   * Transaksi semua-atau-batal. 409 + daftar konflik (bukan galat generik).
   */
  async batchAssignJadwal(
    dto: {
      hari: number;
      slots: Array<{
        kelasId: number;
        penugasanId: number;
        jamMulai: string;
        jamSelesai: string;
      }>;
    },
    req: Request,
  ) {
    if (!dto.slots || dto.slots.length === 0) {
      throw new BadRequestException('slots tidak boleh kosong');
    }
    const taId = await this.getActiveTaIdOrThrow();

    return this.jadwalRepo.manager.transaction(async (em) => {
      const penugasanIds = [...new Set(dto.slots.map((s) => s.penugasanId))];
      const penugasanList = await em.find(Penugasan, {
        where: { id: In(penugasanIds) },
        relations: ['kelas', 'mapel', 'guru', 'tahunAjaran'],
      });
      const penugasanMap = new Map(penugasanList.map((p) => [p.id, p]));

      // Validasi dasar per slot
      for (const slot of dto.slots) {
        const pn = penugasanMap.get(slot.penugasanId);
        if (!pn) throw new NotFoundException(`Penugasan #${slot.penugasanId} tidak ditemukan`);
        if (pn.tahunAjaranId !== taId) {
          throw new BadRequestException(`Penugasan #${slot.penugasanId} bukan milik TA aktif`);
        }
        if (hhmmToMin(slot.jamSelesai) <= hhmmToMin(slot.jamMulai)) {
          throw new BadRequestException(
            `Slot kelas ${pn.kelas?.nama} ${slot.jamMulai}: jamSelesai harus setelah jamMulai`,
          );
        }
      }

      // JADWAL-KONFLIK Bug 1b: validasi setiap slot harus cocok persis dengan JP terdaftar.
      // Tolak assign ke jam yang tidak ada di jam_pelajaran.
      const jpForHari = await em.find(JamPelajaran, {
        where: { tahunAjaranId: taId, hari: dto.hari },
      });
      const jpPairs = new Set(
        jpForHari.map((jp) => `${jp.jamMulai}|${jp.jamSelesai}`),
      );
      for (const slot of dto.slots) {
        const pn = penugasanMap.get(slot.penugasanId)!;
        if (!jpPairs.has(`${slot.jamMulai}|${slot.jamSelesai}`)) {
          throw new BadRequestException(
            `Jam ${slot.jamMulai}–${slot.jamSelesai} tidak terdaftar sebagai JP hari ini. ` +
            `Tambah JP terlebih dahulu atau pilih jam yang sesuai struktur JP.`,
          );
        }
      }

      // Semua jadwal hari ini di TA ini — dipakai untuk cek konflik batch
      const existingAll = await em
        .createQueryBuilder(JadwalKbm, 'j')
        .innerJoinAndSelect('j.penugasan', 'p')
        .leftJoinAndSelect('p.kelas', 'k')
        .leftJoinAndSelect('p.mapel', 'm')
        .leftJoinAndSelect('p.guru', 'g')
        .where('p.tahunAjaranId = :taId', { taId })
        .andWhere('j.hari = :hari', { hari: dto.hari })
        .getMany();

      // JADWAL-KONFLIK Bug 2: dedupe pesan konflik (kunci: kelasId+jam+mapel)
      const conflictSet = new Set<string>();
      const conflicts: string[] = [];
      const toSave: Array<{ penugasanId: number; jamMulai: string; jamSelesai: string }> = [];

      for (const slot of dto.slots) {
        const pn = penugasanMap.get(slot.penugasanId)!;
        const newStart = hhmmToMin(slot.jamMulai);
        const newEnd = hhmmToMin(slot.jamSelesai);
        // Label sel yang ditolak: "kelas NamaSel JamMulai–JamSelesai"
        const selLabel = `${pn.kelas?.nama ?? `kelas#${pn.kelasId}`} ${slot.jamMulai}–${slot.jamSelesai}`;

        let conflict: string | null = null;
        for (const ex of existingAll) {
          const s = hhmmToMin(ex.jamMulai);
          const e = hhmmToMin(ex.jamSelesai);
          if (e <= newStart || s >= newEnd) continue;

          const exKelasId = ex.penugasan?.kelasId;
          const exGuruId = ex.penugasan?.guruId;
          const exKelasNama = ex.penugasan?.kelas?.nama ?? `kelas#${exKelasId}`;

          if (exKelasId === pn.kelasId) {
            conflict = `${selLabel} → bentrok: sudah ada ${ex.penugasan?.mapel?.nama ?? 'jadwal'} pada ${ex.jamMulai}–${ex.jamSelesai}`;
            break;
          }
          if (exGuruId === pn.guruId) {
            const guruKode = pn.guru?.kode ?? pn.guru?.nama ?? `guru#${pn.guruId}`;
            conflict = `${selLabel} → ${guruKode} sudah mengajar di ${exKelasNama} pada ${ex.jamMulai}–${ex.jamSelesai}`;
            break;
          }
        }

        if (conflict) {
          // Dedupe: pesan identik tidak ditambah dua kali
          if (!conflictSet.has(conflict)) {
            conflictSet.add(conflict);
            conflicts.push(conflict);
          }
        } else {
          // Tambah ke existingAll agar konflik lintas-slot terdeteksi
          existingAll.push({
            id: -1,
            penugasanId: slot.penugasanId,
            hari: dto.hari,
            jamMulai: slot.jamMulai,
            jamSelesai: slot.jamSelesai,
            penugasan: pn as any,
            sesiKe: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as JadwalKbm);
          toSave.push({ penugasanId: slot.penugasanId, jamMulai: slot.jamMulai, jamSelesai: slot.jamSelesai });
        }
      }

      if (conflicts.length > 0) {
        throw new ConflictException({
          message: 'Konflik jadwal terdeteksi — tidak ada perubahan disimpan',
          conflicts,
        });
      }

      // Generate kode guru belum berkode (dalam transaksi)
      const guruIdsDone = new Set<number>();
      for (const slot of dto.slots) {
        const pn = penugasanMap.get(slot.penugasanId)!;
        if (!pn.guru?.kode && !guruIdsDone.has(pn.guruId)) {
          const kode = await this.generateGuruKode(em);
          await em.update(Guru, { id: pn.guruId }, { kode });
          if (pn.guru) pn.guru.kode = kode;
          guruIdsDone.add(pn.guruId);
        }
      }

      // Simpan semua slot
      const saved: JadwalKbm[] = [];
      for (const slot of toSave) {
        const created = em.create(JadwalKbm, {
          penugasanId: slot.penugasanId,
          hari: dto.hari,
          jamMulai: slot.jamMulai,
          jamSelesai: slot.jamSelesai,
        });
        saved.push(await em.save(JadwalKbm, created));
      }

      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'BATCH_ASSIGN_JADWAL',
        resource: 'jadwal_kbm',
        resourceId: saved.map((s) => s.id).join(','),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Batch assign ${saved.length} slot jadwal hari ${this.hariLabel(dto.hari)}`,
        details: { hari: dto.hari, count: saved.length },
      });

      return { ok: true, disimpan: saved.length, ids: saved.map((s) => s.id) };
    });
  }

  /**
   * DELETE /api/kurikulum/jadwal/batch-hapus
   * Body: { ids: number[] }
   * Guard presensi_sesi RESTRICT — tolak slot bermasalah + detail.
   * Semua-atau-batal.
   */
  async batchHapusJadwal(dto: { ids: number[] }, req: Request) {
    if (!dto.ids || dto.ids.length === 0) {
      throw new BadRequestException('ids tidak boleh kosong');
    }

    return this.jadwalRepo.manager.transaction(async (em) => {
      const rows = await em
        .createQueryBuilder(JadwalKbm, 'j')
        .innerJoinAndSelect('j.penugasan', 'p')
        .leftJoinAndSelect('p.kelas', 'k')
        .leftJoinAndSelect('p.mapel', 'm')
        .leftJoinAndSelect('p.guru', 'g')
        .where('j.id IN (:...ids)', { ids: dto.ids })
        .getMany();

      const notFound = dto.ids.filter((id) => !rows.find((r) => r.id === id));
      if (notFound.length > 0) {
        throw new NotFoundException(`Slot jadwal tidak ditemukan: ${notFound.join(', ')}`);
      }

      const blocked: string[] = [];
      for (const row of rows) {
        const sesiCount = await em.count(PresensiSesi, { where: { jadwalKbmId: row.id } });
        if (sesiCount > 0) {
          const namaMapel = row.penugasan?.mapel?.nama ?? `mapel#${row.penugasan?.mapelId}`;
          const namaKelas = row.penugasan?.kelas?.nama ?? `kelas#${row.penugasan?.kelasId}`;
          const guruKode = row.penugasan?.guru?.kode ?? row.penugasan?.guru?.nama ?? '';
          blocked.push(
            `${guruKode} ${namaMapel} ${namaKelas} ${row.jamMulai}–${row.jamSelesai}: ${sesiCount} sesi tercatat`,
          );
        }
      }

      if (blocked.length > 0) {
        throw new ConflictException({
          message: 'Beberapa slot sudah dipakai sesi presensi — tidak ada yang dihapus',
          blocked,
        });
      }

      await em.remove(JadwalKbm, rows);

      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'BATCH_HAPUS_JADWAL',
        resource: 'jadwal_kbm',
        resourceId: dto.ids.join(','),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Batch hapus ${rows.length} slot jadwal`,
        details: { ids: dto.ids },
      });

      return { ok: true, dihapus: rows.length };
    });
  }


  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // KALENDER LIBUR (T12 Butir 5)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
   * T15-FIX: POST /api/admin/libur/bulk â€” seleksi-multi lalu aksi.
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
        summary: `Menandai ${saved.length} hari libur (${dilewati} dilewati â€” sudah ada)`,
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
        summary: `Menghapus ${toDelete.length} penanda libur (${dilewati} dilewati â€” belum libur)`,
        details: { tanggal: toDelete.map((t) => t.tanggal) },
      });
      return { dihapus: toDelete.length, dilewati };
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // IMPOR LIBUR NASIONAL (T15-FIX â€” KEPUTUSAN USER)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Cache in-process 24 jam per tahun agar tidak membebani provider pihak
   * ketiga (KEPUTUSAN USER â€” deteksi otomatis Â§14.10.2).
   */
  private nasionalCache = new Map<
    number,
    { data: { tanggal: string; keterangan: string }[]; expiresAt: number }
  >();

  /**
   * Ambil daftar libur nasional dari provider pihak ketiga untuk satu tahun.
   * Provider: api-harilibur.vercel.app (gratis, tanpa API key). Gagal jangkau
   * â†’ lempar error yang ditangkap caller (tidak memblokir alur manual).
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
        'Sumber data tidak terjangkau â€” coba lagi atau isi manual.',
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
   * berikutnya) yang BELUM ada di kalender. Gagal cek â†’ {baru: 0} (diam,
   * tanpa error â€” jangan mengganggu alur admin).
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
      // Gagal cek = diam (tanpa banner/error) â€” provider mungkin down.
      return { baru: 0 };
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // KKM (T12 Butir 5)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // UTIL
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async getActiveTaIdOrThrow(): Promise<number> {
    const { tahunAjaran } = await this.taService.getActive();
    if (!tahunAjaran) {
      throw new ConflictException(
        'Tidak ada tahun ajaran aktif. Aktifkan satu tahun ajaran terlebih dahulu.',
      );
    }
    return tahunAjaran.id;
  }
  // ─────────────────────────────────────────────────────────────
  // MONITORING PROGRES INPUT NILAI (A3)
  // ─────────────────────────────────────────────────────────────

  async monitoringNilai(tahunAjaranId?: number) {
    const taId = tahunAjaranId ?? await this.getActiveTaIdOrThrow();

    const penugasanList = await this.penugasanRepo.find({
      where: { tahunAjaranId: taId },
      relations: ['guru', 'mapel', 'kelas'],
      order: { guruId: 'ASC', kelasId: 'ASC', mapelId: 'ASC' },
    });

    if (penugasanList.length === 0) {
      return {
        tahunAjaranId: taId,
        data: [],
        ringkasan: { total: 0, selesai: 0, proses: 0, pending: 0, kosong: 0 },
      };
    }

    const penugasanIds = penugasanList.map((p) => p.id);

    const kelasIds = [...new Set(penugasanList.map((p) => p.kelasId))];
    const siswaCountRows = await this.siswaRepo
      .createQueryBuilder('s')
      .select('s.kelasId', 'kelasId')
      .addSelect('COUNT(*)', 'jumlah')
      .where('s.kelasId IN (:...ids)', { ids: kelasIds })
      .andWhere("s.status = 'aktif'")
      .groupBy('s.kelasId')
      .getRawMany();
    const siswaMap = new Map<number, number>(
      siswaCountRows.map((r) => [Number(r.kelasId), Number(r.jumlah)]),
    );

    const sumatifCountRows = await this.penilaianRepo
      .createQueryBuilder('pn')
      .select('pn.penugasanId', 'penugasanId')
      .addSelect('COUNT(*)', 'jumlah')
      .where('pn.penugasanId IN (:...ids)', { ids: penugasanIds })
      .andWhere("pn.jenis = 'Sumatif'")
      .groupBy('pn.penugasanId')
      .getRawMany();
    const sumatifCountMap = new Map<number, number>(
      sumatifCountRows.map((r) => [Number(r.penugasanId), Number(r.jumlah)]),
    );

    // nilai kosong (NULL) TIDAK masuk pembagi formula rapor - monitoring ini
    // menampilkan angka bolong secara eksplisit agar kurikulum bisa menagih guru.
    const nilaiCountRows = await this.nilaiRepo
      .createQueryBuilder('n')
      .innerJoin('penilaian', 'pn', 'pn.id = n."penilaianId"')
      .select('pn."penugasanId"', 'penugasanId')
      .addSelect('COUNT(*)', 'jumlah')
      .where('pn."penugasanId" IN (:...ids)', { ids: penugasanIds })
      .andWhere("pn.jenis = 'Sumatif'")
      .andWhere('n.nilai IS NOT NULL')
      .groupBy('pn."penugasanId"')
      .getRawMany();
    const nilaiCountMap = new Map<number, number>(
      nilaiCountRows.map((r) => [Number(r.penugasanId), Number(r.jumlah)]),
    );

    type StatusNilai = 'Kosong' | 'Pending' | 'Proses' | 'Selesai';

    const guruMap = new Map<number, {
      guruId: number; guruNama: string;
      paket: Array<{
        penugasanId: number; mapelNama: string; kelasNama: string;
        jumlahSiswa: number; targetNilai: number; realisasiNilai: number;
        persen: number; status: StatusNilai;
      }>;
    }>();

    const ringkasan = { total: 0, selesai: 0, proses: 0, pending: 0, kosong: 0 };

    for (const p of penugasanList) {
      const jumlahSiswa = siswaMap.get(p.kelasId) ?? 0;
      const jumlahSumatif = sumatifCountMap.get(p.id) ?? 0;
      const target = jumlahSumatif * jumlahSiswa;
      const realisasi = nilaiCountMap.get(p.id) ?? 0;
      const persen = target === 0 ? 0 : Math.min(100, Math.round(realisasi / target * 100));

      let status: StatusNilai;
      if (target === 0) status = 'Kosong';
      else if (persen === 0) status = 'Pending';
      else if (persen < 100) status = 'Proses';
      else status = 'Selesai';

      ringkasan.total++;
      if (status === 'Kosong') ringkasan.kosong++;
      else if (status === 'Pending') ringkasan.pending++;
      else if (status === 'Proses') ringkasan.proses++;
      else ringkasan.selesai++;

      const guruId = p.guruId;
      const guruNama = (p as any).guru?.nama ?? `guru#${guruId}`;
      if (!guruMap.has(guruId)) guruMap.set(guruId, { guruId, guruNama, paket: [] });
      guruMap.get(guruId)!.paket.push({
        penugasanId: p.id,
        mapelNama: (p as any).mapel?.nama ?? `mapel#${p.mapelId}`,
        kelasNama: (p as any).kelas?.nama ?? `kelas#${p.kelasId}`,
        jumlahSiswa, targetNilai: target, realisasiNilai: realisasi, persen, status,
      });
    }

    const data = Array.from(guruMap.values()).map((g) => {
      const totalTarget = g.paket.reduce((s, x) => s + x.targetNilai, 0);
      const totalRealisasi = g.paket.reduce((s, x) => s + x.realisasiNilai, 0);
      const guruPersen = totalTarget === 0
        ? 0 : Math.min(100, Math.round(totalRealisasi / totalTarget * 100));

      let guruStatus: StatusNilai;
      if (totalTarget === 0) guruStatus = 'Kosong';
      else if (guruPersen === 0) guruStatus = 'Pending';
      else if (guruPersen < 100) guruStatus = 'Proses';
      else guruStatus = 'Selesai';

      const belumSelesai = g.paket.filter((x) => x.status !== 'Selesai');
      const tagihanWa = belumSelesai.length === 0 ? null
        : `*[Tagihan Nilai]* Yth. ${g.guruNama},\n` +
          `Mohon segera lengkapi input nilai Sumatif berikut:\n` +
          belumSelesai.map((x) =>
            `\u2022 ${x.mapelNama} ${x.kelasNama}: ${x.realisasiNilai}/${x.targetNilai} nilai (${x.persen}% - ${x.status})`,
          ).join('\n') +
          `\nSumber: AAMAPP - Monitoring Nilai`;

      return { guruId: g.guruId, guruNama: g.guruNama, totalTarget, totalRealisasi, guruPersen, guruStatus, tagihanWa, paket: g.paket };
    });

    return { tahunAjaranId: taId, data, ringkasan };
  }
}