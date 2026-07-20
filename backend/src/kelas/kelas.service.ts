import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, DataSource, In } from 'typeorm';
import { Kelas } from './kelas.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { PresensiSesi } from '../presensi/presensi-sesi.entity';
import { KokurikulerTim } from '../kokurikuler/kokurikuler-tim.entity';
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
    @InjectRepository(JadwalKbm)
    private readonly jadwalRepo: Repository<JadwalKbm>,
    @InjectRepository(PresensiSesi)
    private readonly sesiRepo: Repository<PresensiSesi>,
    @InjectRepository(KokurikulerTim)
    private readonly timRepo: Repository<KokurikulerTim>,
    private readonly dataSource: DataSource,
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
   * GET /api/admin/kelas/:id/dampak-hapus
   * Hitungan dampak permanen bila kelas dihapus (front-end pakai untuk
   * dialog konfirmasi "Hapus Total"). siswa SET NULL (data tetap ada);
   * penugasan + jadwal + sesi presensi DIHAPUS PERMANEN.
   */
  async dampakHapus(id: number) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Kelas tidak ditemukan');

    // Ambil id penugasan milik kelas ini, lalu jadwal & sesi yg terhubung.
    const penugasans = await this.penugasanRepo.find({
      where: { kelasId: id },
      select: { id: true },
    });
    const penugasanIds = penugasans.map((p) => p.id);
    const jadwalIds = penugasanIds.length
      ? (
          await this.jadwalRepo.find({
            where: { penugasanId: In(penugasanIds) },
            select: { id: true },
          })
        ).map((j) => j.id)
      : [];

    const [siswa, penugasan, jadwal, sesiPresensi] = await Promise.all([
      this.siswaRepo.count({ where: { kelasId: id } }),
      this.penugasanRepo.count({ where: { kelasId: id } }),
      this.jadwalRepo.count({ where: { penugasanId: In(penugasanIds.length ? penugasanIds : [0]) } }),
      this.sesiRepo.count({ where: { jadwalKbmId: In(jadwalIds.length ? jadwalIds : [0]) } }),
    ]);

    return {
      kelas: { id: row.id, nama: row.nama, tingkat: row.tingkat },
      siswa,
      penugasan,
      jadwal,
      sesiPresensi,
    };
  }

  /**
   * Hapus kelas = hapus total (opsi B, keputusan pemilik produk).
   * Menghapus permanen: penugasan, jadwal_kbm, presensi_sesi, presensi_siswa.
   * Siswa DIKELUARKAN (kelasId SET NULL) — data siswa tetap ada.
   * KokurikulerTim CASCADE otomatis saat kelas dihapus (DB-level FK).
   *
   * Urutan WAJIB dalam SATU transaksi (jika gagal di tengah, rollback total):
   *   (a) hapus presensi_sesi (jadwalnya milik penugasan kelas ini)
   *       — presensi_siswa ikut CASCADE (entity onDelete).
   *   (b) hapus penugasan (where kelasId = :id)
   *       — jadwal_kbm ikut CASCADE (entity onDelete).
   *   (c) hapus kelas
   *       — siswa.kelasId SET NULL, kokurikuler_tim CASCADE.
   *
   * onDelete di entity TIDAK diubah — kaskade di (a) & (b) adalah DB-level
   * ON DELETE CASCADE yang sudah dideklarasikan entity (presensi_siswa &
   * jadwal_kbm). onDelete di penugasan & presensi_sesi = RESTRICT, maka
   * langkah (a) & (b) di sini wajib eksplisit.
   */
  async remove(id: number, req: Request) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Kelas tidak ditemukan');

    // Hitung dampak dulu (untuk audit) — di luar transaksi (read-only).
    const dampak = await this.dampakHapus(id);

    await this.dataSource.transaction(async (em) => {
      // (a) hapus presensi_sesi yang jadwalnya milik penugasan kelas ini.
      if (dampak.penugasan > 0) {
        const penugasanIds = (
          await em.find(Penugasan, {
            where: { kelasId: id },
            select: { id: true },
          })
        ).map((p) => p.id);
        const jadwalIds = (
          await em.find(JadwalKbm, {
            where: { penugasanId: In(penugasanIds) },
            select: { id: true },
          })
        ).map((j) => j.id);
        if (jadwalIds.length > 0) {
          // presensi_siswa ikut CASCADE (entity presensi-siswa.onDelete CASCADE).
          await em.delete(PresensiSesi, { jadwalKbmId: In(jadwalIds) });
        }
        // (b) hapus penugasan — jadwal_kbm ikut CASCADE (entity jadwal-kbm.onDelete CASCADE).
        await em.delete(Penugasan, { kelasId: id });
      }

      // (c) hapus kelas — siswa.kelasId SET NULL, kokurikuler_tim CASCADE.
      await em.delete(Kelas, { id });
    });

    await this.audit.log({
      actorId: req.session?.userId ?? null,
      action: 'DELETE_KELAS',
      resource: 'kelas',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary:
        `Menghapus kelas ${row.nama} — ${dampak.siswa} siswa dikeluarkan, ` +
        `${dampak.penugasan} penugasan, ${dampak.jadwal} jadwal, ` +
        `${dampak.sesiPresensi} sesi presensi DIHAPUS PERMANEN`,
      details: {
        siswaDikeluarkan: dampak.siswa,
        penugasanDihapus: dampak.penugasan,
        jadwalDihapus: dampak.jadwal,
        sesiPresensiDihapus: dampak.sesiPresensi,
      },
    });
    return { ok: true, ...dampak };
  }
}
