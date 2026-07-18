import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Guru, GuruStatus } from './guru.entity';
import { Kelas } from '../kelas/kelas.entity';
import { AuditService } from '../audit/audit.service';
import { KurikulumService } from '../kurikulum/kurikulum.service';
import { TahunAjaranService } from '../tahun-ajaran/tahun-ajaran.service';
import { Request } from 'express';

export interface GuruFilter {
  q?: string;
  status?: GuruStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class GuruService {
  constructor(
    @InjectRepository(Guru) private readonly repo: Repository<Guru>,
    @InjectRepository(Kelas) private readonly kelasRepo: Repository<Kelas>,
    private readonly audit: AuditService,
    private readonly kurikulum: KurikulumService,
    private readonly ta: TahunAjaranService,
  ) {}

  /**
   * T11-FIX Ronde 2 (Butir 8): GET /api/admin/guru
   * Mengembalikan punyaAkun (boolean) dan jumlahPaket (jumlah penugasan TA aktif).
   */
  async list(filter: GuruFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(1000, Math.max(1, filter.limit ?? 50));
    const where: any = {};
    if (filter.status) where.status = filter.status;
    if (filter.q) where.nama = ILike(`%${filter.q}%`);
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { nama: 'ASC' },
      relations: ['waliKelas', 'user'],
      skip: (page - 1) * limit,
      take: limit,
    });
    const taAktif = await this.ta.getActive();
    const taId = taAktif?.tahunAjaran?.id ?? null;
    // T15 0b: Eliminasi N+1 — satu query GROUP BY, bukan satu COUNT per baris
    const paketCounts = taId != null
      ? await this.kurikulum.countPenugasanGuruAktifBatch(rows.map(g => g.id), taId)
      : new Map<number, number>();
    const data = rows.map((g) => ({
      id: g.id,
      nama: g.nama,
      nip: g.nip,
      jenisKelamin: g.jenisKelamin,
      telepon: g.telepon,
      fotoUrl: g.fotoUrl,
      status: g.status,
      userId: g.userId,
      punyaAkun: !!g.userId,
      jumlahPaket: paketCounts.get(g.id) ?? 0,
      waliKelas: g.waliKelas,
    }));
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['waliKelas', 'user'],
    });
    if (!row) throw new NotFoundException('Guru tidak ditemukan');
    const taAktif = await this.ta.getActive();
    const taId = taAktif?.tahunAjaran?.id ?? null;
    return {
      ...row,
      punyaAkun: !!row.userId,
      jumlahPaket:
        taId != null
          ? await this.kurikulum.countPenugasanGuruAktif(row.id, taId)
          : 0,
    };
  }

  async create(payload: Partial<Guru>, req: Request) {
    try {
      const entity = this.repo.create(payload);
      const saved = await this.repo.save(entity);
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'CREATE_GURU',
        resource: 'guru',
        resourceId: String(saved.id),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Membuat data guru ${saved.nama}`,
        details: payload,
      });
      return saved;
    } catch (err: any) {
      if (err?.code === '23505')
        throw new ConflictException('NIP sudah terdaftar');
      throw err;
    }
  }

  async update(id: number, payload: Partial<Guru>, req: Request) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Guru tidak ditemukan');
    Object.assign(row, payload);
    try {
      const saved = await this.repo.save(row);
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'UPDATE_GURU',
        resource: 'guru',
        resourceId: String(saved.id),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Memperbarui data guru ${saved.nama}`,
        details: payload,
      });
      return saved;
    } catch (err: any) {
      if (err?.code === '23505')
        throw new ConflictException('NIP sudah terdaftar');
      throw err;
    }
  }

  /**
   * T11-FIX Ronde 2 (Butir 9): hapus guru.
   * 409 bila masih menjadi wali kelas aktif ATAU punya penugasan aktif.
   * Pesan PERSIS spec: "Guru masih memiliki data terkait — nonaktifkan saja".
   */
  async remove(id: number, req: Request) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['waliKelas'],
    });
    if (!row) throw new NotFoundException('Guru tidak ditemukan');

    if (row.waliKelas && row.waliKelas.length > 0) {
      throw new ConflictException(
        'Guru masih memiliki data terkait — nonaktifkan saja',
      );
    }

    // T11-FIX Ronde 2 / Fase 7 (Butir 6): cek penugasan.
    const taAktif = await this.ta.getActive();
    const taId = taAktif?.tahunAjaran?.id ?? null;
    if (taId != null) {
      const used = await this.kurikulum.countPenugasanGuruAktif(id, taId);
      if (used > 0) {
        throw new ConflictException(
          `Guru masih memiliki ${used} penugasan pada tahun ajaran aktif — nonaktifkan saja`,
        );
      }
    }

    await this.repo.remove(row);
    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'DELETE_GURU',
      resource: 'guru',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menghapus data guru ${row.nama}`,
    });
    return { ok: true };
  }
}
