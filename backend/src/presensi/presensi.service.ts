import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Request } from 'express';
import { PresensiSesi } from './presensi-sesi.entity';
import { PresensiSiswa } from './presensi-siswa.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { KalenderLibur } from '../kurikulum/kalender-libur.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { AuditService } from '../audit/audit.service';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { formatDateWIB, todayWIB } from '../common/wib.util';
import { SimpanRosterDto } from './dto/simpan-roster.dto';

/** hari WIB: 1=Senin ... 6=Sabtu, 7=Minggu (jadwal hanya 1..6). */
function hariWIB(tanggal: string): number {
  // `tanggal` sudah berupa tanggal kalender WIB (YYYY-MM-DD) — bangun
  // Date murni UTC dari komponennya (BUKAN parse dengan offset +07:00,
  // yang justru menggeser mundur ke tanggal UTC sebelumnya & salah
  // menghitung hari-dalam-minggu untuk jam-jam dini hari WIB).
  const [y, m, d] = tanggal.split('-').map((x) => parseInt(x, 10));
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Minggu..6=Sabtu
  return js === 0 ? 7 : js;
}

function isAdmin(req: Request): boolean {
  const roles = (req as any).user?.roles ?? [];
  return Array.isArray(roles) && roles.includes('admin');
}

@Injectable()
export class PresensiService {
  constructor(
    @InjectRepository(PresensiSesi)
    private readonly sesiRepo: Repository<PresensiSesi>,
    @InjectRepository(PresensiSiswa)
    private readonly siswaPresRepo: Repository<PresensiSiswa>,
    @InjectRepository(JadwalKbm)
    private readonly jadwalRepo: Repository<JadwalKbm>,
    @InjectRepository(Penugasan)
    private readonly penugasanRepo: Repository<Penugasan>,
    @InjectRepository(KalenderLibur)
    private readonly liburRepo: Repository<KalenderLibur>,
    @InjectRepository(Siswa)
    private readonly siswaRepo: Repository<Siswa>,
    @InjectRepository(Kelas)
    private readonly kelasRepo: Repository<Kelas>,
    @InjectRepository(Guru)
    private readonly guruRepo: Repository<Guru>,
    @InjectRepository(TahunAjaran)
    private readonly taRepo: Repository<TahunAjaran>,
    @InjectRepository(Pengaturan)
    private readonly pengaturanRepo: Repository<Pengaturan>,
    private readonly audit: AuditService,
  ) {}

  private async taAktifId(): Promise<number> {
    const ta = await this.taRepo.findOne({ where: { aktif: true } });
    if (!ta)
      throw new BadRequestException(
        'Belum ada tahun ajaran aktif — buat & aktifkan di Pengaturan',
      );
    return ta.id;
  }

  private async guruDariReq(req: Request): Promise<Guru> {
    const userId = (req as any).user?.id ?? req.session?.userId;
    const guru = await this.guruRepo.findOne({ where: { userId } });
    if (!guru)
      throw new ForbiddenException('Akun Anda tidak tertaut ke data guru');
    return guru;
  }

  private async cutoffJam(): Promise<string> {
    const row = await this.pengaturanRepo.findOne({
      where: { key: 'jam_presensi' },
    });
    const v: any = row?.value ?? {};
    return v.cutoff || '15:00';
  }

  /** GET /api/guru/kbm?tanggal= — sesi KBM guru login pada hari itu. */
  async kbmHariIni(req: Request, tanggalQ?: string) {
    const guru = await this.guruDariReq(req);
    const tanggal = tanggalQ || formatDateWIB(todayWIB());
    const taId = await this.taAktifId();
    const hari = hariWIB(tanggal);

    const libur = await this.liburRepo.findOne({ where: { tanggal } });

    if (hari === 7) {
      return { tanggal, libur: false, hariMinggu: true, sesi: [] };
    }

    const jadwal = await this.jadwalRepo
      .createQueryBuilder('j')
      .innerJoinAndSelect('j.penugasan', 'p')
      .leftJoinAndSelect('p.mapel', 'm')
      .leftJoinAndSelect('p.kelas', 'k')
      .where('p.guruId = :guruId', { guruId: guru.id })
      .andWhere('p.tahunAjaranId = :taId', { taId })
      .andWhere('j.hari = :hari', { hari })
      .orderBy('j.jamMulai', 'ASC')
      .getMany();

    const sesiIds = jadwal.map((j) => j.id);
    const sesiTersimpan =
      sesiIds.length > 0
        ? await this.sesiRepo.find({
            where: { jadwalKbmId: In(sesiIds), tanggal },
          })
        : [];
    const tersimpanSet = new Set(sesiTersimpan.map((s) => s.jadwalKbmId));

    return {
      tanggal,
      libur: !!libur,
      keteranganLibur: libur?.keterangan ?? null,
      sesi: jadwal.map((j) => ({
        jadwalKbmId: j.id,
        mapel: j.penugasan?.mapel?.nama ?? null,
        kelas: j.penugasan?.kelas?.nama ?? null,
        jamMulai: j.jamMulai,
        jamSelesai: j.jamSelesai,
        sesiKe: j.sesiKe,
        status: tersimpanSet.has(j.id) ? 'TERLAKSANA' : 'BELUM',
      })),
    };
  }

  /** GET /api/guru/kbm/:jadwalId/roster?tanggal= */
  async roster(req: Request, jadwalId: number, tanggalQ?: string) {
    const tanggal = tanggalQ || formatDateWIB(todayWIB());
    const jadwal = await this.jadwalRepo.findOne({
      where: { id: jadwalId },
      relations: ['penugasan', 'penugasan.mapel', 'penugasan.kelas'],
    });
    if (!jadwal) throw new NotFoundException('Jadwal tidak ditemukan');

    const guru = await this.guruDariReq(req).catch(() => null);
    if (!isAdmin(req) && guru && jadwal.penugasan.guruId !== guru.id) {
      throw new ForbiddenException('Bukan sesi KBM Anda');
    }

    const siswaKelas = await this.siswaRepo.find({
      where: { kelasId: jadwal.penugasan.kelasId, status: 'aktif' },
      order: { nama: 'ASC' },
    });

    const sesi = await this.sesiRepo.findOne({
      where: { jadwalKbmId: jadwalId, tanggal },
    });
    const statusMap = new Map<number, string>();
    if (sesi) {
      const detail = await this.siswaPresRepo.find({
        where: { presensiSesiId: sesi.id },
      });
      for (const d of detail) statusMap.set(d.siswaId, d.status);
    }

    return {
      jadwalKbmId: jadwalId,
      tanggal,
      kelas: jadwal.penugasan?.kelas?.nama ?? null,
      mapel: jadwal.penugasan?.mapel?.nama ?? null,
      tersimpan: !!sesi,
      siswa: siswaKelas.map((s) => ({
        siswaId: s.id,
        nama: s.nama,
        nis: s.nis,
        status: statusMap.get(s.id) ?? 'H',
      })),
    };
  }

  /** POST/PATCH /api/guru/kbm/:jadwalId/roster — upsert roster. */
  async simpanRoster(req: Request, jadwalId: number, dto: SimpanRosterDto) {
    const jadwal = await this.jadwalRepo.findOne({
      where: { id: jadwalId },
      relations: ['penugasan', 'penugasan.mapel', 'penugasan.kelas'],
    });
    if (!jadwal) throw new NotFoundException('Jadwal tidak ditemukan');

    const admin = isAdmin(req);
    const guru = admin ? null : await this.guruDariReq(req);
    if (!admin && guru && jadwal.penugasan.guruId !== guru.id) {
      throw new ForbiddenException('Bukan sesi KBM Anda');
    }

    // Cutoff: guru hanya boleh simpan/koreksi hari ini sebelum cutoff.
    const hariIni = formatDateWIB(todayWIB());
    if (!admin) {
      const cutoff = await this.cutoffJam();
      const jamSekarang = formatDateWIB(todayWIB()) === dto.tanggal
        ? new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta' })
        : null;
      const lewatHari = dto.tanggal !== hariIni;
      const lewatJam = jamSekarang !== null && jamSekarang > cutoff;
      if (lewatHari || lewatJam) {
        throw new ForbiddenException(
          'Melewati batas waktu presensi — hubungi admin',
        );
      }
    } else if (dto.tanggal !== hariIni && !dto.alasan) {
      throw new BadRequestException(
        'Koreksi presensi tanggal lampau wajib menyertakan alasan',
      );
    }

    const pelaksana = guru
      ? guru
      : await this.guruRepo.findOne({ where: { id: jadwal.penugasan.guruId } });
    const guruPenggantiId =
      pelaksana && pelaksana.id !== jadwal.penugasan.guruId
        ? pelaksana.id
        : null;

    // Upsert presensi_sesi
    let sesi = await this.sesiRepo.findOne({
      where: { jadwalKbmId: jadwalId, tanggal: dto.tanggal },
    });
    if (!sesi) {
      sesi = this.sesiRepo.create({
        jadwalKbmId: jadwalId,
        tanggal: dto.tanggal,
        guruPelaksanaId: pelaksana?.id ?? jadwal.penugasan.guruId,
        guruPenggantiId,
        disimpanPada: new Date(),
      });
    } else {
      sesi.disimpanPada = new Date();
      if (pelaksana) sesi.guruPelaksanaId = pelaksana.id;
      sesi.guruPenggantiId = guruPenggantiId;
    }
    sesi = await this.sesiRepo.save(sesi);

    // Upsert presensi_siswa per entri
    const ringkas: Record<string, number> = { H: 0, S: 0, I: 0, A: 0, T: 0 };
    for (const e of dto.entri) {
      ringkas[e.status] = (ringkas[e.status] ?? 0) + 1;
      let row = await this.siswaPresRepo.findOne({
        where: { presensiSesiId: sesi.id, siswaId: e.siswaId },
      });
      if (!row) {
        row = this.siswaPresRepo.create({
          presensiSesiId: sesi.id,
          siswaId: e.siswaId,
          status: e.status,
        });
      } else {
        row.status = e.status;
      }
      await this.siswaPresRepo.save(row);
      // TODO F5: status 'T' → draft pelanggaran R-07 (dibangun di F5).
      // TODO F4: kunci entri bila siswa punya izin pada tanggal ini.
    }

    await this.audit.log({
      actorId: (req as any).user?.id ?? req.session?.userId ?? null,
      action: 'SIMPAN_PRESENSI',
      resource: 'presensi_sesi',
      resourceId: String(sesi.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menyimpan presensi ${jadwal.penugasan?.mapel?.nama ?? ''} ${
        jadwal.penugasan?.kelas?.nama ?? ''
      } ${dto.tanggal}: ${ringkas.H}H ${ringkas.S}S ${ringkas.I}I ${
        ringkas.A
      }A ${ringkas.T}T${dto.alasan ? ` (alasan: ${dto.alasan})` : ''}`,
    });

    return { ok: true, presensiSesiId: sesi.id, ringkasan: ringkas };
  }

  /**
   * GET /api/guru/kelas/rekap-presensi?kelasId=&dari=&sampai=&page=&limit=
   * Rekap per siswa: Σ H/S/I/A/T atas sesi TERLAKSANA saja dalam rentang.
   * Sesi tanpa roster (jadwal ada tapi tak pernah disimpan) TIDAK dihitung
   * sama sekali untuk siswa manapun — LEFT JOIN semantics (F2-SPEC #8):
   * NULL = tidak tercatat, bukan alpha. Berpaginasi per siswa (§12.16).
   */
  async rekapPresensi(params: {
    kelasId: number;
    dari: string;
    sampai: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));

    const [siswaRows, totalSiswa] = await this.siswaRepo.findAndCount({
      where: { kelasId: params.kelasId, status: 'aktif' },
      order: { nama: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (siswaRows.length === 0) {
      return {
        kelasId: params.kelasId,
        dari: params.dari,
        sampai: params.sampai,
        data: [],
        total: totalSiswa,
        page,
        limit,
      };
    }

    // Satu query batch: semua presensi_siswa milik sesi TERLAKSANA
    // (jadwal kelas ini) dalam rentang tanggal — anti N+1 (F2-SPEC #7).
    const siswaIds = siswaRows.map((s) => s.id);
    const rows = await this.siswaPresRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.presensiSesi', 'sesi')
      .innerJoin('sesi.jadwalKbm', 'j')
      .innerJoin('j.penugasan', 'p')
      .where('p.kelasId = :kelasId', { kelasId: params.kelasId })
      .andWhere('sesi.tanggal BETWEEN :dari AND :sampai', {
        dari: params.dari,
        sampai: params.sampai,
      })
      .andWhere('ps.siswaId IN (:...siswaIds)', { siswaIds })
      .select('ps.siswaId', 'siswaId')
      .addSelect('ps.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('ps.siswaId')
      .addGroupBy('ps.status')
      .getRawMany();

    const rekapMap = new Map<number, Record<string, number>>();
    for (const r of rows as any[]) {
      const sid = parseInt(r.siswaId, 10);
      const rekap = rekapMap.get(sid) ?? { H: 0, S: 0, I: 0, A: 0, T: 0 };
      rekap[r.status as string] = parseInt(r.cnt, 10);
      rekapMap.set(sid, rekap);
    }

    return {
      kelasId: params.kelasId,
      dari: params.dari,
      sampai: params.sampai,
      data: siswaRows.map((s) => {
        const rekap = rekapMap.get(s.id);
        return {
          siswaId: s.id,
          nama: s.nama,
          nis: s.nis,
          // NULL bila siswa TIDAK PERNAH tercatat sama sekali di rentang ini
          // (semua sesi kelasnya belum ada roster) — F2-SPEC #8.
          rekap: rekap ?? null,
        };
      }),
      total: totalSiswa,
      page,
      limit,
    };
  }

  /** Cek apakah guru adalah wali kelas tsb (untuk RBAC rekap). */
  async isWaliKelas(guruId: number, kelasId: number): Promise<boolean> {
    const kelas = await this.kelasRepo.findOne({ where: { id: kelasId } });
    return !!kelas && kelas.waliGuruId === guruId;
  }

  /** Sama seperti isWaliKelas tapi mulai dari userId sesi login. */
  async isWaliKelasByUserId(
    userId: number | undefined,
    kelasId: number,
  ): Promise<boolean> {
    if (!userId) return false;
    const guru = await this.guruRepo.findOne({ where: { userId } });
    if (!guru) return false;
    return this.isWaliKelas(guru.id, kelasId);
  }

  /** GET /api/admin/presensi-siswa?kelasId=&tanggal= — matriks batch. */
  async matriksAdmin(kelasId: number, tanggalQ?: string) {
    const tanggal = tanggalQ || formatDateWIB(todayWIB());
    const taId = await this.taAktifId();
    const hari = hariWIB(tanggal);

    const jadwal = await this.jadwalRepo
      .createQueryBuilder('j')
      .innerJoinAndSelect('j.penugasan', 'p')
      .leftJoinAndSelect('p.mapel', 'm')
      .leftJoinAndSelect('p.guru', 'g')
      .where('p.kelasId = :kelasId', { kelasId })
      .andWhere('p.tahunAjaranId = :taId', { taId })
      .andWhere('j.hari = :hari', { hari })
      .orderBy('j.jamMulai', 'ASC')
      .getMany();

    const sesiIds = jadwal.map((j) => j.id);
    const sesiRows =
      sesiIds.length > 0
        ? await this.sesiRepo.find({
            where: { jadwalKbmId: In(sesiIds), tanggal },
          })
        : [];
    const sesiMap = new Map(sesiRows.map((s) => [s.jadwalKbmId, s]));

    // batch ambil ringkasan status per sesi
    const presIds = sesiRows.map((s) => s.id);
    const detail =
      presIds.length > 0
        ? await this.siswaPresRepo.find({
            where: { presensiSesiId: In(presIds) },
          })
        : [];
    const ringkasPerSesi = new Map<number, Record<string, number>>();
    for (const d of detail) {
      const r = ringkasPerSesi.get(d.presensiSesiId) ?? {
        H: 0,
        S: 0,
        I: 0,
        A: 0,
        T: 0,
      };
      r[d.status] = (r[d.status] ?? 0) + 1;
      ringkasPerSesi.set(d.presensiSesiId, r);
    }

    return {
      tanggal,
      kelasId,
      sesi: jadwal.map((j) => {
        const s = sesiMap.get(j.id);
        return {
          jadwalKbmId: j.id,
          mapel: j.penugasan?.mapel?.nama ?? null,
          guru: j.penugasan?.guru?.nama ?? null,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          status: s ? 'TERLAKSANA' : 'BELUM',
          ringkasan: s ? ringkasPerSesi.get(s.id) ?? null : null,
        };
      }),
    };
  }
}
