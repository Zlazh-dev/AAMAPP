import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Siswa } from './siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';

export interface SiswaFilter {
  q?: string;
  kelasId?: number;
  status?: 'aktif' | 'nonaktif';
  jenisKelamin?: 'L' | 'P';
  page?: number;
  limit?: number;
}

@Injectable()
export class SiswaService {
  constructor(
    @InjectRepository(Siswa) private readonly repo: Repository<Siswa>,
    @InjectRepository(Kelas) private readonly kelasRepo: Repository<Kelas>,
    private readonly audit: AuditService,
  ) {}

  async list(filter: SiswaFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(500, Math.max(1, filter.limit ?? 50));
    const base: any = {};
    if (filter.kelasId) base.kelasId = filter.kelasId;
    if (filter.status) base.status = filter.status;
    if (filter.jenisKelamin) base.jenisKelamin = filter.jenisKelamin;
    // q= mencocokkan nama ATAU nis ATAU nisn (admin/kesiswaan lazim
    // mencari siswa via NIS/NISN, bukan hanya nama).
    const where: any = filter.q
      ? [
          { ...base, nama: ILike(`%${filter.q}%`) },
          { ...base, nis: ILike(`%${filter.q}%`) },
          { ...base, nisn: ILike(`%${filter.q}%`) },
        ]
      : base;
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { nama: 'ASC' },
      relations: ['kelas'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: rows, total, page, limit };
  }

  async findOne(id: number) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['kelas'],
    });
    if (!row) throw new NotFoundException('Siswa tidak ditemukan');
    return row;
  }

  async create(payload: any, req: Request) {
    const data = this.normalizePayload(payload);
    // T11-FIX Ronde 2 (Bug Baru 2): pesan 409 pisahkan NIS vs NISN.
    await this.assertNoDuplicateSiswa(data);
    try {
      const entity = this.repo.create(data);
      const saved = await this.repo.save(entity);
      await this.audit.log({
        actorId: req.session?.userId ?? null,
        action: 'CREATE_SISWA',
        resource: 'siswa',
        resourceId: String(saved.id),
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        summary: `Membuat data siswa ${saved.nama}`,
        details: { nama: saved.nama, nis: saved.nis },
      });
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        throw this.duplicateSiswaError(err);
      }
      throw err;
    }
  }

  async update(id: number, payload: any, req: Request) {
    const row = await this.repo.findOne({
      where: { id },
      relations: ['kelas'],
    });
    if (!row) throw new NotFoundException('Siswa tidak ditemukan');
    const data = this.normalizePayload(payload);
    await this.assertNoDuplicateSiswa(data, id);

    // T11-FIX Ronde 2 (Bug Baru 3): audit pindah kelas.
    const pindahKelas =
      Object.prototype.hasOwnProperty.call(data, 'kelasId') &&
      data.kelasId !== row.kelasId;
    const beforeKelasId = row.kelasId;
    const beforeKelasNama = row.kelas?.nama ?? null;

    Object.assign(row, data);

    let afterKelasNama: string | null = null;
    if (pindahKelas) {
      if (row.kelasId != null) {
        const k = await this.kelasRepo.findOne({ where: { id: row.kelasId } });
        afterKelasNama = k?.nama ?? `(id=${row.kelasId})`;
      } else {
        afterKelasNama = '(tanpa kelas)';
      }
    }

    try {
      const saved = await this.repo.save(row);
      if (pindahKelas) {
        await this.audit.log({
          actorId: req.session?.userId ?? null,
          action: 'PINDAH_KELAS_SISWA',
          resource: 'siswa',
          resourceId: String(saved.id),
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string,
          summary: `Memindahkan ${saved.nama} dari ${beforeKelasNama ?? '(tanpa kelas)'} ke ${afterKelasNama}`,
          details: {
            fromKelasId: beforeKelasId,
            fromKelasNama: beforeKelasNama,
            toKelasId: row.kelasId,
            toKelasNama: afterKelasNama,
          },
        });
      } else {
        await this.audit.log({
          actorId: req.session?.userId ?? null,
          action: 'UPDATE_SISWA',
          resource: 'siswa',
          resourceId: String(saved.id),
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string,
          summary: `Memperbarui data siswa ${saved.nama}`,
          details: payload,
        });
      }
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        throw this.duplicateSiswaError(err);
      }
      throw err;
    }
  }

  async remove(id: number, req: Request) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Siswa tidak ditemukan');
    await this.repo.remove(row);
    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'DELETE_SISWA',
      resource: 'siswa',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menghapus data siswa ${row.nama}`,
    });
    return { ok: true };
  }

  /**
   * T11-FIX Ronde 2 (Bug Baru 2): pre-check NIS/NISN untuk pesan 409
   * yang spesifik per kolom. excludeId dipakai saat UPDATE.
   */
  private async assertNoDuplicateSiswa(
    data: Partial<Siswa>,
    excludeId?: number,
  ) {
    if (data.nis) {
      const dupNis = await this.repo.findOne({
        where: { nis: data.nis },
      });
      if (dupNis && dupNis.id !== excludeId) {
        throw new ConflictException(`NIS ${data.nis} sudah terdaftar`);
      }
    }
    if (data.nisn) {
      const dupNisn = await this.repo.findOne({
        where: { nisn: data.nisn },
      });
      if (dupNisn && dupNisn.id !== excludeId) {
        throw new ConflictException(`NISN ${data.nisn} sudah terdaftar`);
      }
    }
  }

  /**
   * Fallback bila DB yang mendeteksi duluan (race condition).
   * Coba tebak field mana dari err.detail.
   */
  private duplicateSiswaError(err: any): ConflictException {
    const detail = String(err?.detail ?? '').toLowerCase();
    if (detail.includes('nisn')) {
      return new ConflictException('NISN sudah terdaftar');
    }
    if (detail.includes('nis')) {
      return new ConflictException('NIS sudah terdaftar');
    }
    return new ConflictException('NIS atau NISN sudah terdaftar');
  }

  private normalizePayload(
    payload: Partial<Siswa> & { tanggalLahir?: any },
  ): Partial<Siswa> {
    const out: any = { ...payload };
    if (typeof out.tanggalLahir === 'string') {
      const d = new Date(out.tanggalLahir);
      out.tanggalLahir = isNaN(d.getTime()) ? null : d;
    }
    return out;
  }

}
