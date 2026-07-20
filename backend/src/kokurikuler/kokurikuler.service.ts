import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Request } from 'express';
import { KokurikulerKegiatan } from './kokurikuler-kegiatan.entity';
import { KokurikulerTarget } from './kokurikuler-target.entity';
import { KokurikulerTim } from './kokurikuler-tim.entity';
import { KokurikulerAsesmen, NilaiKualitatif, SKOR_MAP } from './kokurikuler-asesmen.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { AuditService } from '../audit/audit.service';
import {
  CreateKegiatanDto,
  UpdateKegiatanDto,
  AddTargetDto,
  AddTimDto,
  UpsertAsesmenDto,
} from './dto/kokurikuler.dto';

/** Konversi skor rata ke nilai kualitatif (verbatim walikelas_proses_kokurikuler.php) */
function skorKeHuruf(rata: number): NilaiKualitatif {
  if (rata > 3.5) return 'Sangat Baik';
  if (rata > 2.5) return 'Baik';
  if (rata > 1.5) return 'Cukup';
  return 'Kurang';
}

/**
 * Deskripsi otomatis per siswa: gabung dimensi per kualitas.
 * "Menunjukkan capaian Sangat Baik pada {dimensi SB}. Baik pada {…}. …"
 * Hanya kualitas yang ada. Join pola sama F6b (", " + " dan " sebelum terakhir).
 */
function buildDeskripsiKokurikuler(
  hasilDimensi: Array<{ namaDimensi: string; nilaiAkhir: NilaiKualitatif | null }>,
): string {
  const kualitasOrder: NilaiKualitatif[] = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'];

  const joinNama = (names: string[]) => {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' dan ' + names[names.length - 1];
  };

  const parts: string[] = [];
  for (const kualitas of kualitasOrder) {
    const dimensi = hasilDimensi
      .filter((h) => h.nilaiAkhir === kualitas)
      .map((h) => h.namaDimensi);
    if (dimensi.length > 0) {
      parts.push(`Menunjukkan capaian ${kualitas} pada ${joinNama(dimensi)}.`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : 'Belum ada asesmen kokurikuler.';
}

@Injectable()
export class KokurikulerService {
  constructor(
    @InjectRepository(KokurikulerKegiatan)
    private kegiatanRepo: Repository<KokurikulerKegiatan>,
    @InjectRepository(KokurikulerTarget)
    private targetRepo: Repository<KokurikulerTarget>,
    @InjectRepository(KokurikulerTim)
    private timRepo: Repository<KokurikulerTim>,
    @InjectRepository(KokurikulerAsesmen)
    private asesmenRepo: Repository<KokurikulerAsesmen>,
    @InjectRepository(Siswa)
    private siswaRepo: Repository<Siswa>,
    @InjectRepository(Guru)
    private guruRepo: Repository<Guru>,
    @InjectRepository(TahunAjaran)
    private taRepo: Repository<TahunAjaran>,
    private audit: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async taAktif(): Promise<TahunAjaran> {
    const ta = await this.taRepo.findOne({ where: { aktif: true } });
    if (!ta) throw new BadRequestException('Tidak ada tahun ajaran aktif');
    return ta;
  }

  private async resolveGuruId(userId: number): Promise<number | null> {
    const g = await this.guruRepo.findOne({ where: { userId }, select: ['id'] });
    return g?.id ?? null;
  }

  /**
   * Cek apakah guruId adalah anggota tim kegiatan ini untuk kelasId.
   * authorization = anggota tim → 403 jika tidak.
   */
  private async assertTimMember(
    kegiatanId: number,
    kelasId: number,
    guruId: number,
  ): Promise<void> {
    const member = await this.timRepo.findOne({
      where: { kegiatanId, kelasId, guruId },
    });
    if (!member) {
      throw new ForbiddenException('Anda bukan anggota tim penilai kegiatan ini untuk kelas ini');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KEGIATAN CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async listKegiatan(tahunAjaranId?: number, semester?: number, page?: number, limit?: number) {
    const taId = tahunAjaranId ?? (await this.taAktif()).id;
    const where: any = { tahunAjaranId: taId };
    if (semester) where.semester = semester;
    const pageNum = Math.max(1, page ?? 1);
    const limitNum = Math.min(100, Math.max(1, limit ?? 25));
    const [list, total] = await this.kegiatanRepo.findAndCount({
      where,
      relations: ['targets', 'tim'],
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    return { data: list, total, page: pageNum, limit: limitNum };
  }

  async getKegiatan(id: number) {
    const k = await this.kegiatanRepo.findOne({
      where: { id },
      relations: ['targets', 'tim', 'tim.kelas', 'tim.guru'],
    });
    if (!k) throw new NotFoundException('Kegiatan tidak ditemukan');
    return k;
  }

  async createKegiatan(dto: CreateKegiatanDto, userId: number, req: Request) {
    const taId = dto.tahunAjaranId ?? (await this.taAktif()).id;
    const kegiatan = this.kegiatanRepo.create({
      tahunAjaranId: taId,
      semester: dto.semester,
      tema: dto.tema,
    });
    const saved = await this.kegiatanRepo.save(kegiatan);
    await this.audit.log({
      actorId: userId,
      action: 'CREATE_KEGIATAN_KOKURIKULER',
      resource: 'kokurikuler_kegiatan',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Buat kegiatan kokurikuler tema: ${saved.tema}`,
    });
    return saved;
  }

  async updateKegiatan(id: number, dto: UpdateKegiatanDto, userId: number, req: Request) {
    const k = await this.kegiatanRepo.findOne({ where: { id } });
    if (!k) throw new NotFoundException('Kegiatan tidak ditemukan');
    if (dto.tema !== undefined) k.tema = dto.tema;
    if (dto.semester !== undefined) k.semester = dto.semester;
    const saved = await this.kegiatanRepo.save(k);
    await this.audit.log({
      actorId: userId,
      action: 'UPDATE_KEGIATAN_KOKURIKULER',
      resource: 'kokurikuler_kegiatan',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Update kegiatan kokurikuler #${id}`,
    });
    return saved;
  }

  async deleteKegiatan(id: number, userId: number, req: Request) {
    const k = await this.kegiatanRepo.findOne({ where: { id } });
    if (!k) throw new NotFoundException('Kegiatan tidak ditemukan');
    await this.kegiatanRepo.remove(k);
    await this.audit.log({
      actorId: userId,
      action: 'DELETE_KEGIATAN_KOKURIKULER',
      resource: 'kokurikuler_kegiatan',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Hapus kegiatan kokurikuler #${id}`,
    });
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TARGET DIMENSI
  // ─────────────────────────────────────────────────────────────────────────

  async addTarget(kegiatanId: number, dto: AddTargetDto, userId: number, req: Request) {
    const k = await this.kegiatanRepo.findOne({ where: { id: kegiatanId } });
    if (!k) throw new NotFoundException('Kegiatan tidak ditemukan');

    const existing = await this.targetRepo.findOne({
      where: { kegiatanId, namaDimensi: dto.namaDimensi },
    });
    if (existing) throw new ConflictException('Dimensi sudah ada di kegiatan ini');

    const target = this.targetRepo.create({ kegiatanId, namaDimensi: dto.namaDimensi });
    const saved = await this.targetRepo.save(target);
    await this.audit.log({
      actorId: userId,
      action: 'ADD_TARGET_KOKURIKULER',
      resource: 'kokurikuler_target',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Add target dimensi ${dto.namaDimensi} ke kegiatan #${kegiatanId}`,
    });
    return saved;
  }

  async removeTarget(kegiatanId: number, targetId: number, userId: number, req: Request) {
    const t = await this.targetRepo.findOne({ where: { id: targetId, kegiatanId } });
    if (!t) throw new NotFoundException('Target tidak ditemukan');
    await this.targetRepo.remove(t);
    await this.audit.log({
      actorId: userId,
      action: 'REMOVE_TARGET_KOKURIKULER',
      resource: 'kokurikuler_target',
      resourceId: String(targetId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Hapus target #${targetId} dari kegiatan #${kegiatanId}`,
    });
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIM PENILAI
  // ─────────────────────────────────────────────────────────────────────────

  async addTim(kegiatanId: number, dto: AddTimDto, userId: number, req: Request) {
    const k = await this.kegiatanRepo.findOne({ where: { id: kegiatanId } });
    if (!k) throw new NotFoundException('Kegiatan tidak ditemukan');

    const existing = await this.timRepo.findOne({
      where: { kegiatanId, kelasId: dto.kelasId, guruId: dto.guruId },
    });
    if (existing) throw new ConflictException('Guru sudah ada dalam tim untuk kelas ini');

    const tim = this.timRepo.create({
      kegiatanId,
      kelasId: dto.kelasId,
      guruId: dto.guruId,
    });
    const saved = await this.timRepo.save(tim);
    await this.audit.log({
      actorId: userId,
      action: 'ADD_TIM_KOKURIKULER',
      resource: 'kokurikuler_tim',
      resourceId: `${kegiatanId}:${dto.kelasId}:${dto.guruId}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Add guru #${dto.guruId} tim kegiatan #${kegiatanId} kelas #${dto.kelasId}`,
    });
    return saved;
  }

  async removeTim(kegiatanId: number, kelasId: number, guruId: number, userId: number, req: Request) {
    const t = await this.timRepo.findOne({ where: { kegiatanId, kelasId, guruId } });
    if (!t) throw new NotFoundException('Anggota tim tidak ditemukan');
    await this.timRepo.remove(t);
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ASESMEN — guru tim input nilai
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET asesmen: daftar siswa × dimensi target untuk kegiatan+kelas.
   * Menampilkan nilai PENILAI (guru sesi sendiri), bukan rata.
   */
  async getAsesmen(kegiatanId: number, kelasId: number, userId: number) {
    const guruId = await this.resolveGuruId(userId);
    if (!guruId) throw new ForbiddenException('User bukan guru');

    await this.assertTimMember(kegiatanId, kelasId, guruId);

    // Targets dimensi kegiatan
    const targets = await this.targetRepo.find({
      where: { kegiatanId },
      order: { id: 'ASC' },
    });

    // Siswa aktif di kelas
    const siswaList = await this.siswaRepo.find({
      where: { kelasId, status: 'aktif' },
      select: ['id', 'nama', 'nis'],
      order: { nama: 'ASC' },
    });

    if (targets.length === 0 || siswaList.length === 0) {
      return { kegiatanId, kelasId, targets, siswa: [] };
    }

    // Asesmen penilai ini (BATCH)
    const targetIds = targets.map((t) => t.id);
    const siswaIds = siswaList.map((s) => s.id);
    const asesmenRows = await this.asesmenRepo.find({
      where: {
        targetId: In(targetIds),
        siswaId: In(siswaIds),
        penilaiGuruId: guruId,
      },
      select: ['targetId', 'siswaId', 'nilai'],
    });

    // Map (targetId, siswaId) → nilai
    const asesmenMap = new Map<string, NilaiKualitatif>();
    for (const a of asesmenRows) {
      asesmenMap.set(`${a.targetId}:${a.siswaId}`, a.nilai);
    }

    const siswaData = siswaList.map((s) => ({
      siswaId: s.id,
      nama: s.nama,
      nis: s.nis,
      dimensi: targets.map((t) => ({
        targetId: t.id,
        namaDimensi: t.namaDimensi,
        nilai: asesmenMap.get(`${t.id}:${s.id}`) ?? null,
      })),
    }));

    return { kegiatanId, kelasId, targets, siswa: siswaData };
  }

  /**
   * PUT asesmen: upsert batch nilai (penilai = guru sesi).
   * authorization = anggota tim kegiatan untuk kelas siswa.
   */
  async upsertAsesmen(
    kegiatanId: number,
    kelasId: number,
    dto: UpsertAsesmenDto,
    userId: number,
    req: Request,
  ) {
    const guruId = await this.resolveGuruId(userId);
    if (!guruId) throw new ForbiddenException('User bukan guru');

    await this.assertTimMember(kegiatanId, kelasId, guruId);

    // Validasi semua targetId milik kegiatan ini
    const targetIds = [...new Set(dto.entri.map((e) => e.targetId))];
    const validTargets = await this.targetRepo.find({
      where: { id: In(targetIds), kegiatanId },
      select: ['id'],
    });
    if (validTargets.length !== targetIds.length) {
      throw new BadRequestException('Beberapa targetId tidak valid untuk kegiatan ini');
    }

    // Upsert per entri
    let saved = 0;
    for (const entri of dto.entri) {
      let row = await this.asesmenRepo.findOne({
        where: {
          targetId: entri.targetId,
          siswaId: entri.siswaId,
          penilaiGuruId: guruId,
        },
      });
      if (!row) {
        row = this.asesmenRepo.create({
          targetId: entri.targetId,
          siswaId: entri.siswaId,
          penilaiGuruId: guruId,
          nilai: entri.nilai,
        });
      } else {
        row.nilai = entri.nilai;
      }
      await this.asesmenRepo.save(row);
      saved++;
    }

    await this.audit.log({
      actorId: userId,
      action: 'UPSERT_ASESMEN_KOKURIKULER',
      resource: 'kokurikuler_asesmen',
      resourceId: String(kegiatanId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Guru #${guruId} upsert ${saved} asesmen kegiatan #${kegiatanId} kelas #${kelasId}`,
    });

    return { ok: true, saved };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RAPOR PER SISWA — BATCH anti-N+1
  // Nilai akhir per dimensi = rata-rata skor semua penilai
  // ─────────────────────────────────────────────────────────────────────────

  async getRaporSiswa(siswaId: number, tahunAjaranId?: number, semester?: number) {
    const taId = tahunAjaranId ?? (await this.taAktif()).id;

    // Kegiatan di TA ini (+ filter semester)
    const kegiatanList = await this.kegiatanRepo.find({
      where: {
        tahunAjaranId: taId,
        ...(semester ? { semester } : {}),
      },
      relations: ['targets'],
      order: { semester: 'ASC', id: 'ASC' },
    });

    if (kegiatanList.length === 0) {
      return { siswaId, tahunAjaranId: taId, kegiatan: [], deskripsi: 'Belum ada asesmen kokurikuler.' };
    }

    // Semua target dari semua kegiatan
    const allTargetIds = kegiatanList.flatMap((k) => k.targets.map((t) => t.id));

    if (allTargetIds.length === 0) {
      return { siswaId, tahunAjaranId: taId, kegiatan: [], deskripsi: 'Belum ada asesmen kokurikuler.' };
    }

    // BATCH: semua asesmen siswa ini untuk semua target (1 query)
    const asesmenRows = await this.asesmenRepo.find({
      where: { targetId: In(allTargetIds), siswaId },
      select: ['targetId', 'nilai'],
    });

    // Group by targetId → array nilai
    const asesmenByTarget = new Map<number, NilaiKualitatif[]>();
    for (const a of asesmenRows) {
      if (!asesmenByTarget.has(a.targetId)) asesmenByTarget.set(a.targetId, []);
      asesmenByTarget.get(a.targetId)!.push(a.nilai);
    }

    // Assembly per kegiatan → per dimensi
    const kegiatanData = kegiatanList.map((k) => {
      const dimensiData = k.targets.map((t) => {
        const nilaiList = asesmenByTarget.get(t.id) ?? [];
        let nilaiAkhir: NilaiKualitatif | null = null;
        let rata: number | null = null;
        if (nilaiList.length > 0) {
          const sumSkor = nilaiList.reduce((acc, v) => acc + SKOR_MAP[v], 0);
          rata = sumSkor / nilaiList.length;
          nilaiAkhir = skorKeHuruf(rata);
        }
        return {
          targetId: t.id,
          namaDimensi: t.namaDimensi,
          jumlahPenilai: nilaiList.length,
          rata: rata !== null ? Math.round(rata * 100) / 100 : null,
          nilaiAkhir,
        };
      });
      return {
        kegiatanId: k.id,
        tema: k.tema,
        semester: k.semester,
        dimensi: dimensiData,
      };
    });

    // Deskripsi otomatis: gabung semua dimensi dari semua kegiatan
    const allDimensiHasil = kegiatanData.flatMap((k) =>
      k.dimensi.map((d) => ({ namaDimensi: d.namaDimensi, nilaiAkhir: d.nilaiAkhir })),
    );
    const deskripsi = buildDeskripsiKokurikuler(allDimensiHasil);

    return { siswaId, tahunAjaranId: taId, kegiatan: kegiatanData, deskripsi };
  }
}
