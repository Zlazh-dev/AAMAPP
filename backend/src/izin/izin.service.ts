import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Request } from 'express';
import { IzinGuru, JenisIzin, StatusIzin } from './izin-guru.entity';
import { AjukanIzinDto } from './dto/ajukan-izin.dto';
import { KeputusanDto } from './dto/keputusan.dto';
import { Guru } from '../guru/guru.entity';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';
import { todayWIB, formatDateWIB } from '../common/wib.util';

// ────────────────────────────────────────────────────────────────────────────
// Helper: deriveStatusHarian — MURNI, tanpa query di dalam loop
// Dipanggil setelah batch-fetch keempat kumpulan data.
// ────────────────────────────────────────────────────────────────────────────

export type StatusHarian =
  | 'HADIR'
  | 'TERLAMBAT'
  | 'IZIN'
  | 'SAKIT'
  | 'DINAS'
  | 'ALPHA'
  | 'LIBUR'
  | 'KOSONG';

export interface DeriveContext {
  /** Set tanggal yang merupakan hari libur (format YYYY-MM-DD). */
  liburSet: Set<string>;
  /**
   * Map guruId → IzinGuru DISETUJUI yang mencakup tanggal.
   * Diisi dari batch-query: mulaiTanggal ≤ tanggal ≤ selesaiTanggal AND status='DISETUJUI'.
   */
  izinAktifMap: Map<number, IzinGuru>;
  /**
   * Map guruId → PresensiHarianGuru (statusnya).
   * Diisi dari batch-query presensi di tanggal tersebut.
   */
  presensiMap: Map<number, { status: string }>;
  /** Set guruId yang punya jadwal_kbm di hari itu (hariWIB). */
  punyaJadwalSet: Set<number>;
}

/**
 * Turunkan status harian satu guru untuk satu tanggal.
 * URUTAN PRIORITAS (sesuai F4-SPEC):
 * 1. tanggal ∈ liburSet → LIBUR
 * 2. guru tidak punya jadwal hari itu → LIBUR (tak wajib hadir)
 * 3. Ada izin DISETUJUI yang mencakup tanggal → IZIN|SAKIT|DINAS
 * 4. Ada baris presensi → HADIR|TERLAMBAT
 * 5. Wajib KBM, tak hadir, tak izin → ALPHA
 */
export function deriveStatusHarian(
  guruId: number,
  tanggal: string,
  ctx: DeriveContext,
): StatusHarian {
  // 1. Libur nasional/kalender
  if (ctx.liburSet.has(tanggal)) return 'LIBUR';

  // 2. Tak punya jadwal hari itu (tak wajib hadir)
  if (!ctx.punyaJadwalSet.has(guruId)) return 'LIBUR';

  // 3. Izin DISETUJUI
  const izin = ctx.izinAktifMap.get(guruId);
  if (izin) return izin.jenis as StatusHarian;

  // 4. Presensi tercatat
  const presensi = ctx.presensiMap.get(guruId);
  if (presensi) return presensi.status as StatusHarian;

  // 5. Default: ALPHA
  return 'ALPHA';
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class IzinService {
  constructor(
    @InjectRepository(IzinGuru)
    private izinRepo: Repository<IzinGuru>,
    @InjectRepository(Guru)
    private guruRepo: Repository<Guru>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private audit: AuditService,
  ) {}

  // ── Helper internal ──────────────────────────────────────────────────────

  private actorIdFromReq(req: Request): number | null {
    return (req as any).user?.id ?? req.session?.userId ?? null;
  }

  private auditIp(req: Request) {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
    };
  }

  // ── Guru: ajukan izin ────────────────────────────────────────────────────

  /**
   * POST /api/izin/guru — guru mengajukan izin.
   * guruId diambil dari sesi (req.session.userId → user → guru).
   */
  async ajukan(dto: AjukanIzinDto, req: Request) {
    const actorId = this.actorIdFromReq(req);
    if (!actorId) throw new ForbiddenException('Tidak terautentikasi');

    // Dapatkan guru yang terhubung ke user sesi
    const guru = await this.guruRepo.findOne({ where: { userId: actorId } });
    if (!guru) {
      throw new ForbiddenException(
        'Akun anda tidak terhubung ke data guru. Hubungi admin.',
      );
    }

    const izin = this.izinRepo.create({
      guruId: guru.id,
      jenis: dto.jenis,
      mulaiTanggal: dto.mulaiTanggal,
      selesaiTanggal: dto.selesaiTanggal,
      keterangan: dto.keterangan,
      lampiranUrl: dto.lampiranUrl ?? null,
      status: 'MENUNGGU',
      disetujuiOleh: null,
      disetujuiPada: null,
      alasanKeputusan: null,
    });
    await this.izinRepo.save(izin);

    await this.audit.log({
      actorId,
      action: 'AJUKAN_IZIN',
      resource: 'izin_guru',
      resourceId: String(izin.id),
      ...this.auditIp(req),
      summary: `Mengajukan izin ${dto.jenis} ${dto.mulaiTanggal}–${dto.selesaiTanggal}`,
    });

    return {
      id: izin.id,
      jenis: izin.jenis,
      mulaiTanggal: izin.mulaiTanggal,
      selesaiTanggal: izin.selesaiTanggal,
      status: izin.status,
      keterangan: izin.keterangan,
      createdAt: izin.createdAt,
    };
  }

  // ── Guru: list izin sendiri ───────────────────────────────────────────────

  /**
   * GET /api/izin/guru — daftar izin milik guru yang sedang login (terbaru dulu).
   */
  async listDiri(req: Request) {
    const actorId = this.actorIdFromReq(req);
    if (!actorId) throw new ForbiddenException('Tidak terautentikasi');

    const guru = await this.guruRepo.findOne({ where: { userId: actorId } });
    if (!guru) throw new ForbiddenException('Akun tidak terhubung ke data guru');

    const rows = await this.izinRepo.find({
      where: { guruId: guru.id },
      order: { createdAt: 'DESC' },
    });

    return rows.map((r) => ({
      id: r.id,
      jenis: r.jenis,
      mulaiTanggal: r.mulaiTanggal,
      selesaiTanggal: r.selesaiTanggal,
      keterangan: r.keterangan,
      lampiranUrl: r.lampiranUrl,
      status: r.status,
      alasanKeputusan: r.alasanKeputusan,
      disetujuiPada: r.disetujuiPada,
      createdAt: r.createdAt,
    }));
  }

  // ── Admin: list izin semua guru (paginasi + filter level DB) ─────────────

  /**
   * GET /api/admin/izin/guru?status=&dari=&sampai=&guruId=&page=&limit=
   */
  async listAdmin(params: {
    status?: StatusIzin;
    dari?: string;
    sampai?: string;
    guruId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    const qb = this.izinRepo
      .createQueryBuilder('izin')
      .leftJoin('izin.guru', 'guru')
      .addSelect(['guru.id', 'guru.nama', 'guru.nip'])
      .leftJoin('izin.approver', 'approver')
      .addSelect(['approver.id', 'approver.name'])
      .orderBy('izin.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (params.status) qb.andWhere('izin.status = :status', { status: params.status });
    if (params.guruId) qb.andWhere('izin.guruId = :guruId', { guruId: params.guruId });
    if (params.dari) qb.andWhere('izin.selesaiTanggal >= :dari', { dari: params.dari });
    if (params.sampai) qb.andWhere('izin.mulaiTanggal <= :sampai', { sampai: params.sampai });

    const [rows, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      data: rows.map((r) => ({
        id: r.id,
        guruId: r.guruId,
        guruNama: (r as any).guru?.nama ?? null,
        guruNip: (r as any).guru?.nip ?? null,
        jenis: r.jenis,
        mulaiTanggal: r.mulaiTanggal,
        selesaiTanggal: r.selesaiTanggal,
        keterangan: r.keterangan,
        lampiranUrl: r.lampiranUrl,
        status: r.status,
        disetujuiOleh: r.disetujuiOleh,
        approverNama: (r as any).approver?.name ?? null,
        disetujuiPada: r.disetujuiPada,
        alasanKeputusan: r.alasanKeputusan,
        createdAt: r.createdAt,
      })),
    };
  }

  // ── Admin: setujui ────────────────────────────────────────────────────────

  /**
   * PATCH /api/admin/izin/guru/:id/setujui — admin|kepsek menyetujui.
   * Hanya dari status MENUNGGU.
   */
  async setujui(id: number, dto: KeputusanDto, req: Request) {
    const actorId = this.actorIdFromReq(req);
    if (!actorId) throw new ForbiddenException('Tidak terautentikasi');

    const izin = await this.izinRepo.findOne({
      where: { id },
      relations: ['guru'],
    });
    if (!izin) throw new NotFoundException('Izin tidak ditemukan');
    if (izin.status !== 'MENUNGGU') {
      throw new BadRequestException(
        `Izin sudah berstatus ${izin.status} — tidak dapat disetujui lagi`,
      );
    }

    // Guru TAK boleh approve sendiri
    const guru = (izin as any).guru as Guru;
    if (guru?.userId === actorId) {
      throw new ForbiddenException('Guru tidak dapat menyetujui izin sendiri');
    }

    izin.status = 'DISETUJUI';
    izin.disetujuiOleh = actorId;
    izin.disetujuiPada = new Date();
    izin.alasanKeputusan = dto.alasan?.trim() ?? null;
    await this.izinRepo.save(izin);

    await this.audit.log({
      actorId,
      action: 'SETUJUI_IZIN',
      resource: 'izin_guru',
      resourceId: String(id),
      ...this.auditIp(req),
      summary: `Menyetujui izin ${izin.jenis} guru ${guru?.nama ?? izin.guruId} ${izin.mulaiTanggal}–${izin.selesaiTanggal}`,
    });

    return {
      ok: true,
      id: izin.id,
      status: izin.status,
      disetujuiPada: izin.disetujuiPada,
    };
  }

  // ── Admin: tolak ──────────────────────────────────────────────────────────

  /**
   * PATCH /api/admin/izin/guru/:id/tolak — admin|kepsek menolak.
   * alasan WAJIB; hanya dari status MENUNGGU.
   */
  async tolak(id: number, dto: KeputusanDto, req: Request) {
    const actorId = this.actorIdFromReq(req);
    if (!actorId) throw new ForbiddenException('Tidak terautentikasi');

    if (!dto.alasan?.trim()) {
      throw new BadRequestException('alasan wajib diisi untuk penolakan');
    }

    const izin = await this.izinRepo.findOne({
      where: { id },
      relations: ['guru'],
    });
    if (!izin) throw new NotFoundException('Izin tidak ditemukan');
    if (izin.status !== 'MENUNGGU') {
      throw new BadRequestException(
        `Izin sudah berstatus ${izin.status} — tidak dapat ditolak lagi`,
      );
    }

    izin.status = 'DITOLAK';
    izin.disetujuiOleh = actorId;
    izin.disetujuiPada = new Date();
    izin.alasanKeputusan = dto.alasan.trim();
    await this.izinRepo.save(izin);

    const guru = (izin as any).guru as Guru;
    await this.audit.log({
      actorId,
      action: 'TOLAK_IZIN',
      resource: 'izin_guru',
      resourceId: String(id),
      ...this.auditIp(req),
      summary: `Menolak izin ${izin.jenis} guru ${guru?.nama ?? izin.guruId}: ${dto.alasan}`,
    });

    return {
      ok: true,
      id: izin.id,
      status: izin.status,
      alasanKeputusan: izin.alasanKeputusan,
    };
  }

  // ── Batch helpers untuk monitor harian ──────────────────────────────────

  /**
   * Ambil semua izin DISETUJUI yang mencakup tanggal tertentu,
   * dalam satu query untuk sekumpulan guruIds.
   * Returns: Map<guruId, IzinGuru>
   */
  async batchIzinAktif(
    guruIds: number[],
    tanggal: string,
  ): Promise<Map<number, IzinGuru>> {
    if (guruIds.length === 0) return new Map();

    const rows = await this.izinRepo
      .createQueryBuilder('iz')
      .where('iz.guruId IN (:...guruIds)', { guruIds })
      .andWhere('iz.status = :status', { status: 'DISETUJUI' })
      .andWhere('iz.mulaiTanggal <= :tgl', { tgl: tanggal })
      .andWhere('iz.selesaiTanggal >= :tgl', { tgl: tanggal })
      .getMany();

    const map = new Map<number, IzinGuru>();
    for (const r of rows) {
      if (!map.has(r.guruId)) map.set(r.guruId, r);
    }
    return map;
  }
}
