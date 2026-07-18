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
import { Ekskul } from './ekskul.entity';
import { EkskulPeserta } from './ekskul-peserta.entity';
import { EkskulTujuan } from './ekskul-tujuan.entity';
import { EkskulNilai, NilaiEkskul } from './ekskul-nilai.entity';
import { EkskulKehadiran } from './ekskul-kehadiran.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { AuditService } from '../audit/audit.service';
import {
  CreateEkskulDto,
  UpdateEkskulDto,
  AddPesertaDto,
  CreateTujuanDto,
  UpdateTujuanDto,
  UpsertNilaiDto,
  UpsertKehadiranDto,
} from './dto/ekskul.dto';

/** Deskripsi otomatis: gabung tujuan per kualitas (pola sama F6c) */
function buildDeskripsiEkskul(
  hasilTujuan: Array<{ deskripsi: string; nilai: NilaiEkskul | null }>,
): string {
  const kualitasOrder: NilaiEkskul[] = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'];
  const joinNama = (names: string[]) => {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' dan ' + names[names.length - 1];
  };
  const parts: string[] = [];
  for (const k of kualitasOrder) {
    const desc = hasilTujuan
      .filter((h) => h.nilai === k)
      .map((h) => {
        const d = h.deskripsi.trim().replace(/\.$/, '');
        return d.charAt(0).toLowerCase() + d.slice(1);
      });
    if (desc.length > 0) {
      parts.push(`Menunjukkan capaian ${k} pada ${joinNama(desc)}.`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : 'Belum ada penilaian ekskul.';
}

@Injectable()
export class EkskulService {
  constructor(
    @InjectRepository(Ekskul)
    private ekskulRepo: Repository<Ekskul>,
    @InjectRepository(EkskulPeserta)
    private pesertaRepo: Repository<EkskulPeserta>,
    @InjectRepository(EkskulTujuan)
    private tujuanRepo: Repository<EkskulTujuan>,
    @InjectRepository(EkskulNilai)
    private nilaiRepo: Repository<EkskulNilai>,
    @InjectRepository(EkskulKehadiran)
    private kehadiranRepo: Repository<EkskulKehadiran>,
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

  /** Cek user adalah pembina ekskul ini → 403 jika tidak (admin bypass) */
  private async assertPembina(
    ekskulId: number,
    user: { id: number; roles: string[] },
  ): Promise<Ekskul> {
    const ekskul = await this.ekskulRepo.findOne({ where: { id: ekskulId } });
    if (!ekskul) throw new NotFoundException('Ekskul tidak ditemukan');
    if (user.roles.includes('admin')) return ekskul;
    const guruId = await this.resolveGuruId(user.id);
    if (!guruId || ekskul.pembinaGuruId !== guruId) {
      throw new ForbiddenException('Hanya pembina ekskul ini yang dapat melakukan aksi ini');
    }
    return ekskul;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EKSKUL CRUD (admin)
  // ─────────────────────────────────────────────────────────────────────────

  async listEkskul() {
    const list = await this.ekskulRepo.find({
      relations: ['pembina'],
      order: { nama: 'ASC' },
    });
    return { data: list, total: list.length };
  }

  async getEkskul(id: number) {
    const e = await this.ekskulRepo.findOne({
      where: { id },
      relations: ['pembina', 'tujuan', 'peserta', 'peserta.siswa'],
    });
    if (!e) throw new NotFoundException('Ekskul tidak ditemukan');
    return e;
  }

  async createEkskul(dto: CreateEkskulDto, userId: number, req: Request) {
    const e = this.ekskulRepo.create({
      nama: dto.nama,
      pembinaGuruId: dto.pembinaGuruId ?? null,
    });
    const saved = await this.ekskulRepo.save(e);
    await this.audit.log({
      actorId: userId, action: 'CREATE_EKSKUL', resource: 'ekskul',
      resourceId: String(saved.id), ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Buat ekskul: ${saved.nama}`,
    });
    return saved;
  }

  async updateEkskul(id: number, dto: UpdateEkskulDto, userId: number, req: Request) {
    const e = await this.ekskulRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Ekskul tidak ditemukan');
    if (dto.nama !== undefined) e.nama = dto.nama;
    if (dto.pembinaGuruId !== undefined) e.pembinaGuruId = dto.pembinaGuruId;
    const saved = await this.ekskulRepo.save(e);
    await this.audit.log({
      actorId: userId, action: 'UPDATE_EKSKUL', resource: 'ekskul',
      resourceId: String(id), ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Update ekskul #${id}`,
    });
    return saved;
  }

  async deleteEkskul(id: number, userId: number, req: Request) {
    const e = await this.ekskulRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Ekskul tidak ditemukan');
    await this.ekskulRepo.remove(e);
    await this.audit.log({
      actorId: userId, action: 'DELETE_EKSKUL', resource: 'ekskul',
      resourceId: String(id), ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Hapus ekskul #${id}`,
    });
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PESERTA (pembina)
  // ─────────────────────────────────────────────────────────────────────────

  async listPeserta(ekskulId: number, user: { id: number; roles: string[] }) {
    await this.assertPembina(ekskulId, user);
    const list = await this.pesertaRepo.find({
      where: { ekskulId },
      relations: ['siswa'],
      order: { id: 'ASC' },
    });
    return { ekskulId, data: list, total: list.length };
  }

  async addPeserta(ekskulId: number, dto: AddPesertaDto, user: { id: number; roles: string[] }, req: Request) {
    await this.assertPembina(ekskulId, user);
    const existing = await this.pesertaRepo.findOne({ where: { ekskulId, siswaId: dto.siswaId } });
    if (existing) throw new ConflictException('Siswa sudah terdaftar sebagai peserta ekskul ini');
    const p = this.pesertaRepo.create({ ekskulId, siswaId: dto.siswaId });
    const saved = await this.pesertaRepo.save(p);
    await this.audit.log({
      actorId: user.id, action: 'ADD_PESERTA_EKSKUL', resource: 'ekskul_peserta',
      resourceId: String(saved.id), ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Add peserta siswa #${dto.siswaId} ke ekskul #${ekskulId}`,
    });
    return saved;
  }

  async removePeserta(ekskulId: number, pesertaId: number, user: { id: number; roles: string[] }, req: Request) {
    await this.assertPembina(ekskulId, user);
    const p = await this.pesertaRepo.findOne({ where: { id: pesertaId, ekskulId } });
    if (!p) throw new NotFoundException('Peserta tidak ditemukan');
    await this.pesertaRepo.remove(p);
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TUJUAN (pembina)
  // ─────────────────────────────────────────────────────────────────────────

  async listTujuan(ekskulId: number, semester: number | undefined, user: { id: number; roles: string[] }) {
    await this.assertPembina(ekskulId, user);
    const where: any = { ekskulId };
    if (semester) where.semester = semester;
    const list = await this.tujuanRepo.find({ where, order: { semester: 'ASC', id: 'ASC' } });
    return { ekskulId, data: list, total: list.length };
  }

  async createTujuan(ekskulId: number, dto: CreateTujuanDto, user: { id: number; roles: string[] }, req: Request) {
    await this.assertPembina(ekskulId, user);
    const t = this.tujuanRepo.create({ ekskulId, semester: dto.semester, deskripsi: dto.deskripsi });
    const saved = await this.tujuanRepo.save(t);
    await this.audit.log({
      actorId: user.id, action: 'CREATE_TUJUAN_EKSKUL', resource: 'ekskul_tujuan',
      resourceId: String(saved.id), ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Buat tujuan ekskul #${ekskulId} sem ${dto.semester}`,
    });
    return saved;
  }

  async updateTujuan(ekskulId: number, tujuanId: number, dto: UpdateTujuanDto, user: { id: number; roles: string[] }, req: Request) {
    await this.assertPembina(ekskulId, user);
    const t = await this.tujuanRepo.findOne({ where: { id: tujuanId, ekskulId } });
    if (!t) throw new NotFoundException('Tujuan tidak ditemukan');
    if (dto.deskripsi !== undefined) t.deskripsi = dto.deskripsi;
    const saved = await this.tujuanRepo.save(t);
    return saved;
  }

  async deleteTujuan(ekskulId: number, tujuanId: number, user: { id: number; roles: string[] }, req: Request) {
    await this.assertPembina(ekskulId, user);
    const t = await this.tujuanRepo.findOne({ where: { id: tujuanId, ekskulId } });
    if (!t) throw new NotFoundException('Tujuan tidak ditemukan');
    await this.tujuanRepo.remove(t);
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NILAI (pembina) — PUT upsert batch
  // ─────────────────────────────────────────────────────────────────────────

  async upsertNilai(ekskulId: number, dto: UpsertNilaiDto, user: { id: number; roles: string[] }, req: Request) {
    await this.assertPembina(ekskulId, user);

    // Validasi: semua tujuanId harus milik ekskul+semester ini
    const tujuanIds = [...new Set(dto.entri.map((e) => e.tujuanId))];
    const validTujuan = await this.tujuanRepo.find({
      where: { id: In(tujuanIds), ekskulId, semester: dto.semester },
      select: ['id'],
    });
    if (validTujuan.length !== tujuanIds.length) {
      throw new BadRequestException('Beberapa tujuanId tidak valid untuk ekskul/semester ini');
    }

    // Validasi: semua pesertaId milik ekskul ini
    const pesertaIds = [...new Set(dto.entri.map((e) => e.pesertaId))];
    const validPeserta = await this.pesertaRepo.find({
      where: { id: In(pesertaIds), ekskulId },
      select: ['id'],
    });
    if (validPeserta.length !== pesertaIds.length) {
      throw new BadRequestException('Beberapa pesertaId tidak valid untuk ekskul ini');
    }

    let saved = 0;
    for (const entri of dto.entri) {
      let row = await this.nilaiRepo.findOne({
        where: { pesertaId: entri.pesertaId, tujuanId: entri.tujuanId },
      });
      if (!row) {
        row = this.nilaiRepo.create({
          pesertaId: entri.pesertaId,
          tujuanId: entri.tujuanId,
          nilai: entri.nilai,
        });
      } else {
        row.nilai = entri.nilai;
      }
      await this.nilaiRepo.save(row);
      saved++;
    }

    await this.audit.log({
      actorId: user.id, action: 'UPSERT_NILAI_EKSKUL', resource: 'ekskul_nilai',
      resourceId: String(ekskulId), ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Upsert ${saved} nilai ekskul #${ekskulId} sem ${dto.semester}`,
    });
    return { ok: true, saved };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KEHADIRAN (pembina) — PUT upsert batch
  // ─────────────────────────────────────────────────────────────────────────

  async upsertKehadiran(ekskulId: number, dto: UpsertKehadiranDto, user: { id: number; roles: string[] }, req: Request) {
    await this.assertPembina(ekskulId, user);

    const pesertaIds = [...new Set(dto.entri.map((e) => e.pesertaId))];
    const validPeserta = await this.pesertaRepo.find({
      where: { id: In(pesertaIds), ekskulId },
      select: ['id'],
    });
    if (validPeserta.length !== pesertaIds.length) {
      throw new BadRequestException('Beberapa pesertaId tidak valid untuk ekskul ini');
    }

    let saved = 0;
    for (const entri of dto.entri) {
      if (entri.jumlahHadir > entri.totalPertemuan) {
        throw new BadRequestException(`jumlahHadir (${entri.jumlahHadir}) tidak boleh > totalPertemuan (${entri.totalPertemuan})`);
      }
      let row = await this.kehadiranRepo.findOne({
        where: { pesertaId: entri.pesertaId, semester: dto.semester },
      });
      if (!row) {
        row = this.kehadiranRepo.create({
          pesertaId: entri.pesertaId,
          semester: dto.semester,
          jumlahHadir: entri.jumlahHadir,
          totalPertemuan: entri.totalPertemuan,
        });
      } else {
        row.jumlahHadir = entri.jumlahHadir;
        row.totalPertemuan = entri.totalPertemuan;
      }
      await this.kehadiranRepo.save(row);
      saved++;
    }

    await this.audit.log({
      actorId: user.id, action: 'UPSERT_KEHADIRAN_EKSKUL', resource: 'ekskul_kehadiran',
      resourceId: String(ekskulId), ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Upsert ${saved} kehadiran ekskul #${ekskulId} sem ${dto.semester}`,
    });
    return { ok: true, saved };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RAPOR PER SISWA — BATCH anti-N+1
  // ─────────────────────────────────────────────────────────────────────────

  async getRaporSiswa(siswaId: number, tahunAjaranId?: number, semester?: number) {
    // Peserta ekskul siswa (BATCH — 1 query)
    const pesertaList = await this.pesertaRepo.find({
      where: { siswaId },
      select: ['id', 'ekskulId'],
    });

    if (pesertaList.length === 0) {
      return { siswaId, ekskul: [], deskripsi: 'Tidak mengikuti ekstrakurikuler.' };
    }

    const pesertaIds = pesertaList.map((p) => p.id);
    const ekskulIds = pesertaList.map((p) => p.ekskulId);

    // BATCH: semua ekskul yang diikuti
    const ekskulList = await this.ekskulRepo.find({
      where: { id: In(ekskulIds) },
      relations: ['pembina'],
      select: ['id', 'nama', 'pembinaGuruId'],
    });

    // BATCH: tujuan (filter semester)
    const tujuanWhere: any = { ekskulId: In(ekskulIds) };
    if (semester) tujuanWhere.semester = semester;
    const tujuanAll = await this.tujuanRepo.find({
      where: tujuanWhere,
      select: ['id', 'ekskulId', 'semester', 'deskripsi'],
      order: { semester: 'ASC', id: 'ASC' },
    });

    // BATCH: nilai siswa (melalui pesertaId)
    const tujuanIds = tujuanAll.map((t) => t.id);
    const nilaiAll = tujuanIds.length > 0
      ? await this.nilaiRepo.find({
          where: { pesertaId: In(pesertaIds), tujuanId: In(tujuanIds) },
          select: ['pesertaId', 'tujuanId', 'nilai'],
        })
      : [];

    // BATCH: kehadiran siswa
    const kehadiranWhere: any = { pesertaId: In(pesertaIds) };
    if (semester) kehadiranWhere.semester = semester;
    const kehadiranAll = await this.kehadiranRepo.find({
      where: kehadiranWhere,
      select: ['pesertaId', 'semester', 'jumlahHadir', 'totalPertemuan'],
    });

    // Maps
    const pesertaByEkskul = new Map<number, number>(); // ekskulId → pesertaId
    for (const p of pesertaList) pesertaByEkskul.set(p.ekskulId, p.id);

    const nilaiMap = new Map<string, NilaiEkskul>(); // `${pesertaId}:${tujuanId}` → nilai
    for (const n of nilaiAll) nilaiMap.set(`${n.pesertaId}:${n.tujuanId}`, n.nilai);

    const kehadiranMap = new Map<string, typeof kehadiranAll[0]>(); // `${pesertaId}:${semester}` → row
    for (const k of kehadiranAll) kehadiranMap.set(`${k.pesertaId}:${k.semester}`, k);

    // Assembly per ekskul
    const ekskulData = ekskulList.map((ekskul) => {
      const pesertaId = pesertaByEkskul.get(ekskul.id)!;
      const tujuanEkskul = tujuanAll.filter((t) => t.ekskulId === ekskul.id);

      // Nilai per tujuan
      const nilaiPerTujuan = tujuanEkskul.map((t) => {
        const nilaiVal = nilaiMap.get(`${pesertaId}:${t.id}`) ?? null;
        return { tujuanId: t.id, semester: t.semester, deskripsi: t.deskripsi, nilai: nilaiVal };
      });

      // Kehadiran per semester
      const semList = semester
        ? [semester]
        : [...new Set(tujuanEkskul.map((t) => t.semester))];
      const kehadiranPerSem = semList.map((sem) => {
        const k = kehadiranMap.get(`${pesertaId}:${sem}`);
        const pct = k && k.totalPertemuan > 0
          ? Math.round((k.jumlahHadir / k.totalPertemuan) * 100)
          : null;
        return {
          semester: sem,
          jumlahHadir: k?.jumlahHadir ?? 0,
          totalPertemuan: k?.totalPertemuan ?? 0,
          persen: pct,
          flagMerah: pct !== null && pct < 70,
        };
      });

      // Deskripsi otomatis
      const deskripsi = buildDeskripsiEkskul(nilaiPerTujuan.map((n) => ({
        deskripsi: n.deskripsi,
        nilai: n.nilai,
      })));

      return {
        ekskulId: ekskul.id,
        nama: ekskul.nama,
        pesertaId,
        nilaiPerTujuan,
        kehadiran: kehadiranPerSem,
        deskripsi,
      };
    });

    return { siswaId, ekskul: ekskulData };
  }
}
