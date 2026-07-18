import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Request } from 'express';
import { TujuanPembelajaran } from './tujuan-pembelajaran.entity';
import { Penilaian } from './penilaian.entity';
import { PenilaianTp } from './penilaian-tp.entity';
import { Nilai } from './nilai.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { AuditService } from '../audit/audit.service';
import { CreateTpDto, UpdateTpDto } from './dto/tp.dto';
import { CreatePenilaianDto, UpdatePenilaianDto } from './dto/penilaian.dto';
import { UpsertNilaiDto } from './dto/nilai.dto';

@Injectable()
export class PenilaianService {
  constructor(
    @InjectRepository(TujuanPembelajaran)
    private tpRepo: Repository<TujuanPembelajaran>,
    @InjectRepository(Penilaian)
    private penilaianRepo: Repository<Penilaian>,
    @InjectRepository(PenilaianTp)
    private penilaianTpRepo: Repository<PenilaianTp>,
    @InjectRepository(Nilai)
    private nilaiRepo: Repository<Nilai>,
    @InjectRepository(Penugasan)
    private penugasanRepo: Repository<Penugasan>,
    @InjectRepository(Siswa)
    private siswaRepo: Repository<Siswa>,
    @InjectRepository(Guru)
    private guruRepo: Repository<Guru>,
    @InjectRepository(TahunAjaran)
    private taRepo: Repository<TahunAjaran>,
    private audit: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: resolve guruId from userId (sesi)
  // ─────────────────────────────────────────────────────────────────────────

  private async resolveGuruId(userId: number): Promise<number | null> {
    const guru = await this.guruRepo.findOne({
      where: { userId },
      select: ['id'],
    });
    return guru?.id ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: TA aktif
  // ─────────────────────────────────────────────────────────────────────────

  private async taAktif(): Promise<TahunAjaran> {
    const ta = await this.taRepo.findOne({ where: { aktif: true } });
    if (!ta) throw new BadRequestException('Tidak ada tahun ajaran aktif');
    return ta;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: pastikan penugasan ada dan dimiliki guru ini (atau admin)
  // ─────────────────────────────────────────────────────────────────────────

  private async ownedPenugasan(
    penugasanId: number,
    user: { id: number; roles: string[] },
  ): Promise<Penugasan> {
    const p = await this.penugasanRepo.findOne({
      where: { id: penugasanId },
      relations: ['mapel', 'kelas'],
    });
    if (!p) throw new NotFoundException('Paket penugasan tidak ditemukan');

    // Admin boleh akses semua
    if (user.roles.includes('admin')) return p;

    // Guru: cek guruId === guru user ini
    const guruId = await this.resolveGuruId(user.id);
    if (!guruId || p.guruId !== guruId) {
      throw new ForbiddenException('Anda tidak memiliki paket penugasan ini');
    }
    return p;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/guru/penilaian — kartu paket guru (dari penugasan TA aktif)
  // ─────────────────────────────────────────────────────────────────────────

  async daftarPaket(user: { id: number; roles: string[] }) {
    const ta = await this.taAktif();
    let guruId: number | null = null;

    if (!user.roles.includes('admin')) {
      guruId = await this.resolveGuruId(user.id);
      if (!guruId) return { data: [] };
    }

    const qb = this.penugasanRepo
      .createQueryBuilder('p')
      .leftJoin('p.mapel', 'm')
      .leftJoin('p.kelas', 'k')
      .select([
        'p.id', 'p.guruId', 'p.mapelId', 'p.kelasId', 'p.tahunAjaranId',
      ])
      .addSelect(['m.nama', 'm.kode'])
      .addSelect(['k.nama', 'k.tingkat'])
      .where('p.tahunAjaranId = :taId', { taId: ta.id });

    if (guruId) qb.andWhere('p.guruId = :guruId', { guruId });

    const pakets = await qb.getMany();

    // Hitung jumlahSiswa + jumlahPenilaian BATCH (anti-N+1)
    const penugasanIds = pakets.map((p) => p.id);
    if (penugasanIds.length === 0) return { data: [] };

    // Jumlah penilaian per penugasan
    const penilaianCount = await this.penilaianRepo
      .createQueryBuilder('pn')
      .select('pn.penugasanId', 'penugasanId')
      .addSelect('COUNT(*)', 'jumlah')
      .where('pn.penugasanId IN (:...ids)', { ids: penugasanIds })
      .groupBy('pn.penugasanId')
      .getRawMany();
    const penilaianMap = new Map<number, number>(
      penilaianCount.map((r) => [Number(r.penugasanId), Number(r.jumlah)]),
    );

    // Jumlah siswa per kelas
    const kelasIds = [...new Set(pakets.map((p) => p.kelasId))];
    const siswaCount = await this.siswaRepo
      .createQueryBuilder('s')
      .select('s.kelasId', 'kelasId')
      .addSelect('COUNT(*)', 'jumlah')
      .where('s.kelasId IN (:...ids)', { ids: kelasIds })
      .andWhere("s.status = 'aktif'")
      .groupBy('s.kelasId')
      .getRawMany();
    const siswaMap = new Map<number, number>(
      siswaCount.map((r) => [Number(r.kelasId), Number(r.jumlah)]),
    );

    const data = pakets.map((p) => ({
      id: p.id,
      mapelId: p.mapelId,
      mapelNama: (p as any).mapel?.nama ?? null,
      mapelKode: (p as any).mapel?.kode ?? null,
      kelasId: p.kelasId,
      kelasNama: (p as any).kelas?.nama ?? null,
      kelasTingkat: (p as any).kelas?.tingkat ?? null,
      tahunAjaranId: p.tahunAjaranId,
      jumlahSiswa: siswaMap.get(p.kelasId) ?? 0,
      jumlahPenilaian: penilaianMap.get(p.id) ?? 0,
    }));

    return { data };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TP CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async listTp(penugasanId: number, user: { id: number; roles: string[] }) {
    const p = await this.ownedPenugasan(penugasanId, user);
    const data = await this.tpRepo.find({
      where: { mapelId: p.mapelId, aktif: true },
      order: { urutan: 'ASC', id: 'ASC' },
    });
    return { mapelId: p.mapelId, data };
  }

  async createTp(
    penugasanId: number,
    dto: CreateTpDto,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    const p = await this.ownedPenugasan(penugasanId, user);
    // Urutan default: max + 1
    const maxUrutan =
      (await this.tpRepo.maximum('urutan', { mapelId: p.mapelId })) ?? 0;
    const row = this.tpRepo.create({
      mapelId: p.mapelId,
      deskripsi: dto.deskripsi,
      urutan: dto.urutan ?? maxUrutan + 1,
      aktif: true,
    });
    const saved = await this.tpRepo.save(row);
    await this.audit.log({
      actorId: user.id,
      action: 'CREATE_TP',
      resource: 'tujuan_pembelajaran',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Tambah TP mapel #${p.mapelId}: ${dto.deskripsi.slice(0, 60)}`,
    });
    return saved;
  }

  async updateTp(
    penugasanId: number,
    tpId: number,
    dto: UpdateTpDto,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    const p = await this.ownedPenugasan(penugasanId, user);
    const tp = await this.tpRepo.findOne({ where: { id: tpId, mapelId: p.mapelId } });
    if (!tp) throw new NotFoundException('Tujuan pembelajaran tidak ditemukan');
    if (dto.deskripsi !== undefined) tp.deskripsi = dto.deskripsi;
    if (dto.urutan !== undefined) tp.urutan = dto.urutan;
    const saved = await this.tpRepo.save(tp);
    await this.audit.log({
      actorId: user.id,
      action: 'UPDATE_TP',
      resource: 'tujuan_pembelajaran',
      resourceId: String(tpId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Edit TP #${tpId}`,
    });
    return saved;
  }

  async deleteTp(
    penugasanId: number,
    tpId: number,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    const p = await this.ownedPenugasan(penugasanId, user);
    const tp = await this.tpRepo.findOne({ where: { id: tpId, mapelId: p.mapelId } });
    if (!tp) throw new NotFoundException('Tujuan pembelajaran tidak ditemukan');
    tp.aktif = false;
    await this.tpRepo.save(tp);
    await this.audit.log({
      actorId: user.id,
      action: 'DELETE_TP',
      resource: 'tujuan_pembelajaran',
      resourceId: String(tpId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Hapus (soft) TP #${tpId}`,
    });
    return { ok: true, id: tpId };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Penilaian CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async listPenilaian(penugasanId: number, user: { id: number; roles: string[] }) {
    await this.ownedPenugasan(penugasanId, user);
    const data = await this.penilaianRepo.find({
      where: { penugasanId },
      relations: ['tpLinks', 'tpLinks.tp'],
      order: { tanggal: 'DESC', id: 'DESC' },
    });
    return { penugasanId, data };
  }

  async createPenilaian(
    penugasanId: number,
    dto: CreatePenilaianDto,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    await this.ownedPenugasan(penugasanId, user);

    // Validasi: SUMATIF_TP wajib tpIds; non-SUMATIF_TP tidak boleh tpIds
    if (dto.subjenis === 'SUMATIF_TP' && (!dto.tpIds || dto.tpIds.length === 0)) {
      throw new BadRequestException('SUMATIF_TP wajib menyertakan tpIds');
    }

    const row = this.penilaianRepo.create({
      penugasanId,
      nama: dto.nama,
      jenis: dto.jenis,
      subjenis: dto.subjenis ?? null,
      bobot: dto.bobot,
      tanggal: dto.tanggal,
    });
    const saved = await this.penilaianRepo.save(row);

    // Simpan junction TP jika SUMATIF_TP
    if (dto.subjenis === 'SUMATIF_TP' && dto.tpIds && dto.tpIds.length > 0) {
      const links = dto.tpIds.map((tpId) =>
        this.penilaianTpRepo.create({ penilaianId: saved.id, tpId }),
      );
      await this.penilaianTpRepo.save(links);
    }

    await this.audit.log({
      actorId: user.id,
      action: 'CREATE_PENILAIAN',
      resource: 'penilaian',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Tambah penilaian "${dto.nama}" (${dto.jenis}) di paket #${penugasanId}`,
    });

    return saved;
  }

  async updatePenilaian(
    penugasanId: number,
    penilaianId: number,
    dto: UpdatePenilaianDto,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    await this.ownedPenugasan(penugasanId, user);
    const row = await this.penilaianRepo.findOne({
      where: { id: penilaianId, penugasanId },
    });
    if (!row) throw new NotFoundException('Penilaian tidak ditemukan');

    if (dto.nama !== undefined) row.nama = dto.nama;
    if (dto.jenis !== undefined) row.jenis = dto.jenis;
    if (dto.subjenis !== undefined) row.subjenis = dto.subjenis;
    if (dto.bobot !== undefined) row.bobot = dto.bobot;
    if (dto.tanggal !== undefined) row.tanggal = dto.tanggal;
    const saved = await this.penilaianRepo.save(row);

    // Update junction TP jika tpIds disertakan
    if (dto.tpIds !== undefined) {
      await this.penilaianTpRepo.delete({ penilaianId });
      if (dto.tpIds.length > 0) {
        const links = dto.tpIds.map((tpId) =>
          this.penilaianTpRepo.create({ penilaianId, tpId }),
        );
        await this.penilaianTpRepo.save(links);
      }
    }

    await this.audit.log({
      actorId: user.id,
      action: 'UPDATE_PENILAIAN',
      resource: 'penilaian',
      resourceId: String(penilaianId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Edit penilaian #${penilaianId} di paket #${penugasanId}`,
    });
    return saved;
  }

  async deletePenilaian(
    penugasanId: number,
    penilaianId: number,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    await this.ownedPenugasan(penugasanId, user);
    const row = await this.penilaianRepo.findOne({
      where: { id: penilaianId, penugasanId },
    });
    if (!row) throw new NotFoundException('Penilaian tidak ditemukan');
    await this.penilaianRepo.remove(row);
    await this.audit.log({
      actorId: user.id,
      action: 'DELETE_PENILAIAN',
      resource: 'penilaian',
      resourceId: String(penilaianId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Hapus penilaian #${penilaianId}`,
    });
    return { ok: true, id: penilaianId };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INPUT NILAI — GET daftar siswa+nilai, PUT upsert BATCH
  // ─────────────────────────────────────────────────────────────────────────

  async getDaftarNilai(
    penilaianId: number,
    user: { id: number; roles: string[] },
  ) {
    // Resolusi penugasan dari penilaian
    const penilaian = await this.penilaianRepo.findOne({
      where: { id: penilaianId },
      relations: ['penugasan'],
    });
    if (!penilaian) throw new NotFoundException('Penilaian tidak ditemukan');
    await this.ownedPenugasan(penilaian.penugasanId, user);

    // Siswa aktif kelas (TURUNAN, anti-N+1)
    const siswaList = await this.siswaRepo.find({
      where: { kelasId: penilaian.penugasan.kelasId, status: 'aktif' },
      select: ['id', 'nama', 'nis'],
      order: { nama: 'ASC' },
    });

    if (siswaList.length === 0) {
      return { penilaian: { id: penilaianId }, siswa: [] };
    }

    // Nilai yang sudah diisi (BATCH 1 query)
    const nilaiList = await this.nilaiRepo.find({
      where: {
        penilaianId,
        siswaId: In(siswaList.map((s) => s.id)),
      },
      select: ['siswaId', 'nilai', 'catatan'],
    });
    const nilaiMap = new Map(nilaiList.map((n) => [n.siswaId, n]));

    const siswa = siswaList.map((s) => {
      const n = nilaiMap.get(s.id);
      return {
        siswaId: s.id,
        nama: s.nama,
        nis: s.nis,
        nilai: n?.nilai ?? null,
        catatan: n?.catatan ?? null,
      };
    });

    return { penilaian: { id: penilaianId, nama: penilaian.nama, jenis: penilaian.jenis, bobot: penilaian.bobot }, siswa };
  }

  async upsertNilai(
    penilaianId: number,
    dto: UpsertNilaiDto,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    const penilaian = await this.penilaianRepo.findOne({
      where: { id: penilaianId },
      relations: ['penugasan'],
    });
    if (!penilaian) throw new NotFoundException('Penilaian tidak ditemukan');
    await this.ownedPenugasan(penilaian.penugasanId, user);

    // Resolusi guruId penulis
    const guruId = await this.resolveGuruId(user.id);

    // Validasi siswaIds termasuk dalam kelas aktif
    const siswaValid = await this.siswaRepo.find({
      where: {
        kelasId: penilaian.penugasan.kelasId,
        status: 'aktif',
        id: In(dto.entri.map((e) => e.siswaId)),
      },
      select: ['id'],
    });
    const validIds = new Set(siswaValid.map((s) => s.id));

    const toSave: Partial<Nilai>[] = [];
    for (const e of dto.entri) {
      if (!validIds.has(e.siswaId)) continue; // skip siswa tidak valid
      const existing = await this.nilaiRepo.findOne({
        where: { penilaianId, siswaId: e.siswaId },
      });
      if (existing) {
        existing.nilai = e.nilai;
        existing.catatan = e.catatan ?? null;
        existing.diubahOleh = guruId;
        toSave.push(existing);
      } else {
        toSave.push(
          this.nilaiRepo.create({
            penilaianId,
            siswaId: e.siswaId,
            nilai: e.nilai,
            catatan: e.catatan ?? null,
            diubahOleh: guruId,
          }),
        );
      }
    }

    if (toSave.length > 0) {
      await this.nilaiRepo.save(toSave as Nilai[]);
    }

    await this.audit.log({
      actorId: user.id,
      action: 'UPSERT_NILAI',
      resource: 'nilai',
      resourceId: String(penilaianId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Input ${toSave.length} nilai untuk penilaian #${penilaianId}`,
    });

    return { ok: true, saved: toSave.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REKAP NILAI AKHIR — turunan formula Sumatif: round(Σ(nilai×bobot)/Σbobot)
  // BATCH: 1 query semua nilai Sumatif paket → aggregate in-memory
  // ─────────────────────────────────────────────────────────────────────────

  async rekapNilaiAkhir(
    penugasanId: number,
    user: { id: number; roles: string[] },
  ) {
    const p = await this.ownedPenugasan(penugasanId, user);

    // Siswa aktif kelas
    const siswaList = await this.siswaRepo.find({
      where: { kelasId: p.kelasId, status: 'aktif' },
      select: ['id', 'nama', 'nis'],
      order: { nama: 'ASC' },
    });
    if (siswaList.length === 0) return { penugasanId, data: [] };

    // Penilaian Sumatif paket ini
    const sumatifList = await this.penilaianRepo.find({
      where: { penugasanId, jenis: 'Sumatif' },
      select: ['id', 'bobot'],
    });
    if (sumatifList.length === 0) {
      return {
        penugasanId,
        data: siswaList.map((s) => ({ siswaId: s.id, nama: s.nama, nis: s.nis, nilaiAkhir: null })),
      };
    }

    // Ambil semua nilai Sumatif sekaligus (1 query)
    const sumatifIds = sumatifList.map((pn) => pn.id);
    const nilaiRows = await this.nilaiRepo.find({
      where: { penilaianId: In(sumatifIds) },
      select: ['siswaId', 'penilaianId', 'nilai'],
    });

    // Bobot per penilaianId
    const bobotMap = new Map<number, number>(
      sumatifList.map((pn) => [pn.id, pn.bobot]),
    );

    // Aggregate: per siswa Σ(nilai×bobot) dan Σbobot
    const aggMap = new Map<number, { sumNilaiBobot: number; sumBobot: number }>();
    for (const siswa of siswaList) {
      aggMap.set(siswa.id, { sumNilaiBobot: 0, sumBobot: 0 });
    }
    for (const n of nilaiRows) {
      const entry = aggMap.get(n.siswaId);
      if (!entry) continue;
      const bobot = bobotMap.get(n.penilaianId) ?? 0;
      entry.sumNilaiBobot += n.nilai * bobot;
      entry.sumBobot += bobot;
    }

    const data = siswaList.map((s) => {
      const agg = aggMap.get(s.id)!;
      const nilaiAkhir =
        agg.sumBobot > 0 ? Math.round(agg.sumNilaiBobot / agg.sumBobot) : null;
      return { siswaId: s.id, nama: s.nama, nis: s.nis, nilaiAkhir };
    });

    return { penugasanId, data };
  }
}
