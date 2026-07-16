import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TahunAjaran } from './tahun-ajaran.entity';
import { CreateTahunAjaranDto, UpdateTahunAjaranDto } from './dto/create-tahun-ajaran.dto';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';

@Injectable()
export class TahunAjaranService {
  constructor(
    @InjectRepository(TahunAjaran)
    private readonly taRepo: Repository<TahunAjaran>,
    private readonly audit: AuditService,
  ) {}

  // T15 0b: In-process cache TTL 60 dtk utk TA aktif (§12.16d)
  private activeTaCache: { value: any; ts: number } | null = null;
  private static CACHE_TTL_MS = 60_000;

  private cacheInvalidateActive() {
    this.activeTaCache = null;
  }

  async listTa() {
    return this.taRepo.find({
      order: { nama: 'DESC' },
    });
  }

  async findOneTa(id: number) {
    const row = await this.taRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    return row;
  }

  async createTa(payload: CreateTahunAjaranDto, req: Request) {
    // Jaminan 1 TA aktif: nonaktifkan dulu yang lain jika payload.aktif = true.
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
        userAgent: req.headers['user-agent'] as string,
        summary: `Membuat tahun ajaran ${saved.nama} Semester ${saved.semester}`,
        details: payload,
      });
      this.cacheInvalidateActive();
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException(
          `Tahun ajaran ${payload.nama} Semester ${payload.semester} sudah ada`,
        );
      }
      throw err;
    }
  }

  async updateTa(id: number, payload: UpdateTahunAjaranDto, req: Request) {
    const row = await this.taRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Tahun ajaran tidak ditemukan');

    if (payload.aktif === true) {
      // Nonaktifkan yang aktif lain SEBELUM update ini.
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
        userAgent: req.headers['user-agent'] as string,
        summary: `Memperbarui tahun ajaran ${saved.nama} Semester ${saved.semester}`,
        details: { before, after: payload },
      });
      this.cacheInvalidateActive();
      return saved;
    } catch (err: any) {
      if (err?.code === '23505') {
        const detail =
          typeof err?.detail === 'string' ? err.detail.toLowerCase() : '';
        // Composite UNIQUE (nama, semester)
        if (detail.includes('nama') && detail.includes('semester')) {
          throw new ConflictException(
            `Tahun ajaran ${payload.nama ?? row.nama} Semester ${payload.semester ?? row.semester} sudah ada`,
          );
        }
        throw new ConflictException(
          `Tahun ajaran ${payload.nama ?? row.nama} Semester ${payload.semester ?? row.semester} sudah ada`,
        );
      }
      throw err;
    }
  }

  async removeTa(id: number, req: Request) {
    const row = await this.taRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    if (row.aktif) {
      throw new ConflictException(
        `Tidak dapat menghapus tahun ajaran ${row.nama} karena sedang aktif. Aktifkan tahun ajaran lain terlebih dahulu.`,
      );
    }
    await this.taRepo.remove(row);
    this.cacheInvalidateActive();
    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'DELETE_TAHUN_AJARAN',
      resource: 'tahun_ajaran',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menghapus tahun ajaran ${row.nama} Semester ${row.semester}`,
    });
    return { ok: true };
  }

  /**
   * T11-FIX Ronde 2 (Butir 3): POST /api/admin/tahun-ajaran/:id/aktifkan
   * Nonaktifkan TA aktif lain, lalu aktifkan TA target.
   */
  async aktifkan(id: number, req: Request) {
    const target = await this.taRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Tahun ajaran tidak ditemukan');
    if (target.aktif) {
      return target; // sudah aktif — idempotent
    }
    await this.taRepo.update({ aktif: true }, { aktif: false });
    target.aktif = true;
    const saved = await this.taRepo.save(target);
    this.cacheInvalidateActive();
    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'ACTIVATE_TAHUN_AJARAN',
      resource: 'tahun_ajaran',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Mengaktifkan tahun ajaran ${saved.nama} Semester ${saved.semester}`,
    });
    return saved;
  }

  async getActive() {
    // T15 0b: cek cache dulu
    if (this.activeTaCache && Date.now() - this.activeTaCache.ts < TahunAjaranService.CACHE_TTL_MS) {
      return { tahunAjaran: this.activeTaCache.value };
    }
    const ta = await this.taRepo.findOne({ where: { aktif: true } });
    this.activeTaCache = { value: ta, ts: Date.now() };
    return { tahunAjaran: ta };
  }
}
