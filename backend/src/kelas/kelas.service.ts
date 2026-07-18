import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Kelas } from './kelas.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';

export interface KelasFilter {
  q?: string;
  tingkat?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class KelasService {
  constructor(
    @InjectRepository(Kelas) private readonly repo: Repository<Kelas>,
    @InjectRepository(Siswa) private readonly siswaRepo: Repository<Siswa>,
    @InjectRepository(Guru) private readonly guruRepo: Repository<Guru>,
    @InjectRepository(Penugasan)
    private readonly penugasanRepo: Repository<Penugasan>,
    private readonly audit: AuditService,
  ) {}

  async list(filter: KelasFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(1000, Math.max(1, filter.limit ?? 50));
    const where: any = {};
    if (filter.tingkat) where.tingkat = filter.tingkat;
    // T11-FIX Ronde 2 (Butir 7): query `q=` bukan `search`.
    if (filter.q) where.nama = ILike(`%${filter.q}%`);
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { tingkat: 'ASC', nama: 'ASC' },
      relations: ['waliGuru'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: rows, total, page, limit };
  }

  async findOne(id: number) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['waliGuru'],
    });
    if (!row) throw new NotFoundException('Kelas tidak ditemukan');
    return row;
  }

  async create(payload: Partial<Kelas>, req: Request) {
    try {
      const entity = this.repo.create(payload);
      const saved = await this.repo.save(entity);
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'CREATE_KELAS',
        resource: 'kelas',
        resourceId: String(saved.id),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Membuat kelas ${saved.nama}`,
        details: payload,
      });
      return saved;
    } catch (err: any) {
      if (err?.code === '23505')
        throw new ConflictException('Nama kelas sudah digunakan');
      throw err;
    }
  }

  async update(id: number, payload: Partial<Kelas>, req: Request) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Kelas tidak ditemukan');
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
        userAgent: req.headers['user-agent'] as string,
        summary: `Memperbarui kelas ${saved.nama}`,
        details: { before, after: payload },
      });
      return saved;
    } catch (err: any) {
      if (err?.code === '23505')
        throw new ConflictException('Nama kelas sudah digunakan');
      throw err;
    }
  }

  /**
   * T11-FIX Ronde 2 (Butir 10): ganti wali kelas.
   * - waliGuruId = null  → unassign
   * - waliGuruId number  → cek guru valid (404), cek konflik unique (409 sebut
   *   nama kelas lama), jika force=true lepaskan kelas lama lalu set.
   */
  async setWali(
    id: number,
    payload: { waliGuruId?: number | null; force?: boolean },
    req: Request,
  ) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['waliGuru'],
    });
    if (!row) throw new NotFoundException('Kelas tidak ditemukan');

    // UNASSIGN
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
        userAgent: req.headers['user-agent'] as string,
        summary: `Menghapus wali ${beforeGuru ?? '(kosong)'} dari kelas ${row.nama}`,
        details: { before: beforeGuru, after: null },
      });
      return saved;
    }

    if (typeof payload.waliGuruId !== 'number') {
      throw new BadRequestException('waliGuruId wajib diisi (id guru atau null)');
    }

    // VALIDASI GURU
    const guru = await this.guruRepo.findOne({
      where: { id: payload.waliGuruId },
    });
    if (!guru) {
      throw new NotFoundException('Guru tidak ditemukan');
    }

    // CEK KONFLIK UNIQUE (waliGuruId sudah dipakai kelas lain)
    const existing = await this.repo.findOne({
      where: { waliGuruId: payload.waliGuruId },
    });
    if (existing && existing.id !== id) {
      if (!payload.force) {
        // Pesan persis spec: sebut nama kelas lama.
        throw new ConflictException(
          `Guru ${guru.nama} sudah menjadi wali kelas ${existing.nama}. Lepas terlebih dahulu atau gunakan force.`,
        );
      }
      // FORCE: lepaskan kelas lama, audit terpisah.
      existing.waliGuruId = null;
      existing.waliGuru = null;
      await this.repo.save(existing);
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'UPDATE_KELAS_WALI',
        resource: 'kelas',
        resourceId: String(existing.id),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
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
      userAgent: req.headers['user-agent'] as string,
      summary: `Menugaskan ${guru.nama} sebagai wali kelas ${row.nama}`,
      details: { before, after: guru.nama, forced: !!payload.force },
    });
    return saved;
  }

  /**
   * T11-FIX Ronde 2 (Butir 9): hapus kelas.
   * 409 bila ada siswa aktif ATAU kelas masih menjadi penugasan aktif.
   * Tidak ada ?force (di luar spec).
   */
  async remove(id: number, req: Request) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Kelas tidak ditemukan');

    const siswaAktif = await this.siswaRepo.count({
      where: { kelasId: id, status: 'aktif' },
    });
    if (siswaAktif > 0) {
      throw new ConflictException(
        `Kelas ${row.nama} masih memiliki ${siswaAktif} siswa aktif. Pindahkan siswa terlebih dahulu.`,
      );
    }

    // T11-FIX Ronde 2 / Fase 7 (Butir 6): cek penugasan.
    const used = await this.penugasanRepo.count({ where: { kelasId: id } });
    if (used > 0) {
      throw new ConflictException(
        `Kelas ${row.nama} masih memiliki ${used} penugasan mengajar. Hapus penugasan terlebih dahulu.`,
      );
    }

    await this.repo.remove(row);
    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'DELETE_KELAS',
      resource: 'kelas',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menghapus kelas ${row.nama}`,
    });
    return { ok: true };
  }
}
