import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Request } from 'express';
import { KatalogPelanggaran } from './katalog-pelanggaran.entity';
import { Pelanggaran } from './pelanggaran.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { AuditService } from '../audit/audit.service';
import { CreateKatalogDto } from './dto/create-katalog.dto';
import { CatatPelanggaranDto } from './dto/catat-pelanggaran.dto';
import { KeputusanPelanggaranDto } from './dto/keputusan-pelanggaran.dto';
import { formatDateWIB, todayWIB } from '../common/wib.util';

// ─────────────────────────────────────────────────────────────────────────────
// Seed data §7.2 — 28 butir resmi (FINAL, jangan diubah tanpa user)
// ─────────────────────────────────────────────────────────────────────────────
export const SEED_KATALOG: Array<{
  nomor: number;
  bentuk: string;
  kategori: 'R' | 'S' | 'B' | 'SB';
  poin: number;
}> = [
  { nomor: 1, bentuk: 'Tidak memakai seragam sekolah sesuai ketentuan', kategori: 'R', poin: 10 },
  { nomor: 2, bentuk: 'Memakai sandal ketika sekolah', kategori: 'R', poin: 10 },
  { nomor: 3, bentuk: 'Siswa putri tidak memakai jilbab seragam ketika sekolah', kategori: 'R', poin: 10 },
  { nomor: 4, bentuk: 'Siswa putri memakai rok di atas mata kaki', kategori: 'R', poin: 10 },
  { nomor: 5, bentuk: 'Siswa putri membawa/memakai perhiasan dan make up berlebihan', kategori: 'R', poin: 10 },
  { nomor: 6, bentuk: 'Tidak membawa buku pelajaran sesuai jadwal', kategori: 'R', poin: 10 },
  { nomor: 7, bentuk: 'Terlambat masuk kelas', kategori: 'R', poin: 10 },
  { nomor: 8, bentuk: 'Keluar kelas sebelum bel pulang berbunyi', kategori: 'R', poin: 10 },
  { nomor: 9, bentuk: 'Meninggalkan kelas tanpa izin guru yang mengajar', kategori: 'R', poin: 10 },
  { nomor: 10, bentuk: 'Piket meninggalkan ruang kelas kotor/tidak rapi', kategori: 'R', poin: 10 },
  { nomor: 11, bentuk: 'Meludah sembarangan di lingkungan sekolah', kategori: 'R', poin: 10 },
  { nomor: 12, bentuk: 'Tidak mengikuti proses belajar mengajar sesuai jadwal', kategori: 'S', poin: 25 },
  { nomor: 13, bentuk: 'Memasuki ruangan kelas lain tanpa izin', kategori: 'S', poin: 25 },
  { nomor: 14, bentuk: 'Merayap dari jendela ke jendela / antar gedung kelas', kategori: 'S', poin: 25 },
  { nomor: 15, bentuk: 'Membuang sampah tidak pada tempatnya', kategori: 'S', poin: 25 },
  { nomor: 16, bentuk: 'Mencoret-coret/merusak fasilitas kelas', kategori: 'S', poin: 25 },
  { nomor: 17, bentuk: 'Mencoret-coret fasilitas sarana sekolah', kategori: 'S', poin: 25 },
  { nomor: 18, bentuk: 'Tidak mengikuti kegiatan ekstrakurikuler', kategori: 'S', poin: 25 },
  { nomor: 19, bentuk: 'Mengadu domba, mengancam, mengintimidasi (bullying)', kategori: 'B', poin: 50 },
  { nomor: 20, bentuk: 'Berkata kotor, mengumpat, dan sejenisnya', kategori: 'B', poin: 50 },
  { nomor: 21, bentuk: 'Berbicara keras/kasar kepada guru dan pegawai', kategori: 'B', poin: 50 },
  { nomor: 22, bentuk: 'Disambangi di lingkungan sekolah saat jam pembelajaran', kategori: 'S', poin: 25 },
  { nomor: 23, bentuk: 'Memakai tindik dan tato', kategori: 'B', poin: 50 },
  { nomor: 24, bentuk: 'Membawa dan/atau merokok (sekolah/sekitar/pesantren)', kategori: 'SB', poin: 100 },
  { nomor: 25, bentuk: 'Kabur/meninggalkan sekolah saat jam sekolah', kategori: 'SB', poin: 100 },
  { nomor: 26, bentuk: 'Tindakan mengarah perkelahian dengan guru dan pegawai', kategori: 'SB', poin: 100 },
  { nomor: 27, bentuk: 'Berkelahi', kategori: 'SB', poin: 100 },
  { nomor: 28, bentuk: 'Mencuri', kategori: 'SB', poin: 100 },
];

/** Saldo awal per siswa per semester (§7.1) */
const SALDO_AWAL = 500;

@Injectable()
export class KesiswaanService implements OnModuleInit {
  private readonly logger = new Logger(KesiswaanService.name);

  constructor(
    @InjectRepository(KatalogPelanggaran)
    private katalogRepo: Repository<KatalogPelanggaran>,
    @InjectRepository(Pelanggaran)
    private pelanggaranRepo: Repository<Pelanggaran>,
    @InjectRepository(Siswa)
    private siswaRepo: Repository<Siswa>,
    @InjectRepository(Kelas)
    private kelasRepo: Repository<Kelas>,
    @InjectRepository(TahunAjaran)
    private taRepo: Repository<TahunAjaran>,
    private audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.seedKatalog();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOOTSTRAP: seed 28 butir §7.2 (idempotent — cek nomor ada dulu)
  // ─────────────────────────────────────────────────────────────────────────

  async seedKatalog(): Promise<void> {
    const existing = await this.katalogRepo.find({ select: ['nomor'] });
    const existingNomor = new Set(existing.map((e) => e.nomor));
    const toInsert = SEED_KATALOG.filter((s) => !existingNomor.has(s.nomor));
    if (toInsert.length > 0) {
      const rows = toInsert.map((s) =>
        this.katalogRepo.create({ ...s, aktif: true }),
      );
      await this.katalogRepo.save(rows);
      this.logger.log(`Seed katalog pelanggaran: ${toInsert.length} butir baru ditambahkan (total ${existing.length + toInsert.length}/28)`);
    } else {
      this.logger.log(`Seed katalog pelanggaran: ${existing.length} butir sudah ada — dilewati`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: tahun ajaran aktif
  // ─────────────────────────────────────────────────────────────────────────

  private async taAktif(): Promise<TahunAjaran> {
    const ta = await this.taRepo.findOne({ where: { aktif: true } });
    if (!ta) throw new BadRequestException('Tidak ada tahun ajaran aktif');
    return ta;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: berhakLangsung(user, siswa)
  // = user punya peran kesiswaan ATAU user adalah guru wali kelas siswa
  // ─────────────────────────────────────────────────────────────────────────

  async berhakLangsung(
    user: { id: number; roles: string[] },
    siswa: Siswa,
  ): Promise<boolean> {
    if (user.roles.includes('kesiswaan') || user.roles.includes('admin')) {
      return true;
    }
    if (!siswa.kelasId) return false;
    // Cek apakah user adalah waliKelas dari kelas siswa
    const kelas = await this.kelasRepo.findOne({
      where: { id: siswa.kelasId },
      select: ['id', 'waliGuruId'],
    });
    if (!kelas?.waliGuruId) return false;
    // Cari guru berdasarkan userId
    const { Guru } = await import('../guru/guru.entity');
    // Pakai raw query lewat kelasRepo datasource agar tidak circular import
    const dataSource = (this.kelasRepo as any).manager.connection;
    const guruRow = await dataSource
      .getRepository(Guru)
      .findOne({ where: { userId: user.id }, select: ['id'] });
    return guruRow?.id === kelas.waliGuruId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: hitungSaldoBatch — MURNI 1 query GROUP BY (anti-N+1)
  // ─────────────────────────────────────────────────────────────────────────

  async hitungSaldoBatch(
    siswaIds: number[],
    tahunAjaranId: number,
  ): Promise<
    Map<
      number,
      { saldo: number; terpotong: number; perKategori: Record<string, number> }
    >
  > {
    if (siswaIds.length === 0) return new Map();

    // Satu query GROUP BY siswaId, kategori untuk semua siswa sekaligus
    const rows = await this.pelanggaranRepo
      .createQueryBuilder('p')
      .select('p.siswaId', 'siswaId')
      .addSelect('p.kategori', 'kategori')
      .addSelect('SUM(p.poin)', 'totalPoin')
      .where('p.siswaId IN (:...ids)', { ids: siswaIds })
      .andWhere('p.tahunAjaranId = :taId', { taId: tahunAjaranId })
      .andWhere("p.status = 'DISETUJUI'")
      .groupBy('p.siswaId, p.kategori')
      .getRawMany();

    // Aggregate per siswa
    const hasil = new Map<
      number,
      { saldo: number; terpotong: number; perKategori: Record<string, number> }
    >();
    for (const id of siswaIds) {
      hasil.set(id, { saldo: SALDO_AWAL, terpotong: 0, perKategori: { R: 0, S: 0, B: 0, SB: 0 } });
    }
    for (const r of rows) {
      const entry = hasil.get(Number(r.siswaId));
      if (!entry) continue;
      const poin = Number(r.totalPoin);
      entry.terpotong += poin;
      entry.perKategori[r.kategori] = (entry.perKategori[r.kategori] ?? 0) + poin;
    }
    for (const [, entry] of hasil) {
      entry.saldo = SALDO_AWAL - entry.terpotong;
    }
    return hasil;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KATALOG CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async listKatalog(params: {
    q?: string;
    kategori?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));

    const qb = this.katalogRepo
      .createQueryBuilder('k')
      .where('k.aktif = true')
      .orderBy('k.nomor', 'ASC');

    if (params.kategori) qb.andWhere('k.kategori = :kat', { kat: params.kategori });
    if (params.q) qb.andWhere('k.bentuk ILIKE :q', { q: `%${params.q}%` });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { total, page, limit, data };
  }

  async createKatalog(dto: CreateKatalogDto, req: Request) {
    const row = this.katalogRepo.create({
      nomor: (await this.katalogRepo.maximum('nomor') ?? 0) + 1,
      bentuk: dto.bentuk,
      kategori: dto.kategori,
      poin: dto.poin,
      aktif: true,
    });
    const saved = await this.katalogRepo.save(row);
    await this.audit.log({
      actorId: (req as any).user?.id ?? null,
      action: 'CREATE_KATALOG_PELANGGARAN',
      resource: 'katalog_pelanggaran',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menambah butir katalog: ${dto.bentuk} (${dto.kategori}, ${dto.poin} poin)`,
    });
    return saved;
  }

  async updateKatalog(id: number, dto: Partial<CreateKatalogDto>, req: Request) {
    const row = await this.katalogRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Butir katalog tidak ditemukan');
    if (dto.bentuk !== undefined) row.bentuk = dto.bentuk;
    if (dto.kategori !== undefined) row.kategori = dto.kategori;
    if (dto.poin !== undefined) row.poin = dto.poin;
    const saved = await this.katalogRepo.save(row);
    await this.audit.log({
      actorId: (req as any).user?.id ?? null,
      action: 'UPDATE_KATALOG_PELANGGARAN',
      resource: 'katalog_pelanggaran',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Memperbarui butir katalog #${id}`,
    });
    return saved;
  }

  async deleteKatalog(id: number, req: Request) {
    const row = await this.katalogRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Butir katalog tidak ditemukan');
    row.aktif = false;
    await this.katalogRepo.save(row);
    await this.audit.log({
      actorId: (req as any).user?.id ?? null,
      action: 'DELETE_KATALOG_PELANGGARAN',
      resource: 'katalog_pelanggaran',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menonaktifkan butir katalog #${id}: ${row.bentuk}`,
    });
    return { ok: true, id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CATAT PELANGGARAN
  // POST /api/kesiswaan/pelanggaran
  // ─────────────────────────────────────────────────────────────────────────

  async catatPelanggaran(dto: CatatPelanggaranDto, req: Request) {
    const ta = await this.taAktif();
    const user = (req as any).user as { id: number; roles: string[] };

    const siswa = await this.siswaRepo.findOne({ where: { id: dto.siswaId } });
    if (!siswa) throw new NotFoundException('Siswa tidak ditemukan');

    let kategori: 'R' | 'S' | 'B' | 'SB' | 'KHUSUS';
    let poin: number;

    if (dto.katalogId) {
      // Ambil dari katalog
      const katalog = await this.katalogRepo.findOne({ where: { id: dto.katalogId, aktif: true } });
      if (!katalog) throw new NotFoundException('Butir katalog tidak ditemukan atau tidak aktif');
      kategori = katalog.kategori;
      poin = katalog.poin;
    } else if (dto.kategori === 'KHUSUS') {
      // KHUSUS tanpa katalog
      kategori = 'KHUSUS';
      poin = 0;
    } else {
      throw new BadRequestException('katalogId atau kategori=KHUSUS wajib diisi');
    }

    // berhakLangsung → DISETUJUI; guru lain → MENUNGGU
    const langsung = await this.berhakLangsung(user, siswa);
    const sumber = langsung ? 'LANGSUNG' : 'LAPORAN';

    // KHUSUS = DISETUJUI langsung (tindak khusus), tanpa potong poin (poin=0)
    const status: 'DISETUJUI' | 'MENUNGGU' =
      kategori === 'KHUSUS' ? 'DISETUJUI' : langsung ? 'DISETUJUI' : 'MENUNGGU';

    const row = this.pelanggaranRepo.create({
      siswaId: dto.siswaId,
      katalogId: dto.katalogId ?? null,
      kategori,
      poin,
      tanggal: dto.tanggal,
      catatan: dto.catatan ?? null,
      buktiUrl: dto.buktiUrl ?? null,
      sumber,
      status,
      pelaporId: user.id,
      verifikatorId: status === 'DISETUJUI' ? user.id : null,
      verifikasiPada: status === 'DISETUJUI' ? new Date() : null,
      alasanKeputusan: null,
      tahunAjaranId: ta.id,
    });
    const saved = await this.pelanggaranRepo.save(row);

    await this.audit.log({
      actorId: user.id,
      action: status === 'DISETUJUI' ? 'CATAT_PELANGGARAN_LANGSUNG' : 'LAPOR_PELANGGARAN',
      resource: 'pelanggaran',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `${status === 'DISETUJUI' ? 'Mencatat' : 'Melaporkan'} pelanggaran siswa ${siswa.nama}: ${dto.katalogId ? `katalog#${dto.katalogId}` : 'KHUSUS'} ${poin}p → ${status}`,
    });

    return saved;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HOOK R-07 — dipanggil dari PresensiService.simpanRoster
  // Idempotent: INSERT ON CONFLICT DO NOTHING via dedup UNIQUE constraint.
  // ─────────────────────────────────────────────────────────────────────────

  async hookR07(siswaId: number, tanggal: string): Promise<void> {
    // Cari katalog R-07 (nomor=7)
    const katalog = await this.katalogRepo.findOne({ where: { nomor: 7, aktif: true } });
    if (!katalog) return; // Guard: seed belum ada

    const ta = await this.taRepo.findOne({ where: { aktif: true } });
    if (!ta) return; // Guard: TA belum aktif

    // Cek apakah sudah ada (dedup sebelum insert untuk menghindari error constraint)
    const existing = await this.pelanggaranRepo.findOne({
      where: {
        siswaId,
        tanggal,
        katalogId: katalog.id,
        sumber: 'OTOMATIS_T',
      },
    });
    if (existing) return; // Sudah ada — idempotent

    const row = this.pelanggaranRepo.create({
      siswaId,
      katalogId: katalog.id,
      kategori: katalog.kategori,
      poin: katalog.poin,
      tanggal,
      catatan: 'Dibuat otomatis dari presensi siswa status T (terlambat)',
      buktiUrl: null,
      sumber: 'OTOMATIS_T',
      status: 'MENUNGGU', // TAK memotong poin sebelum disetujui
      pelaporId: null,
      verifikatorId: null,
      verifikasiPada: null,
      alasanKeputusan: null,
      tahunAjaranId: ta.id,
    });

    try {
      await this.pelanggaranRepo.save(row);
    } catch {
      // Race condition: constraint violation — abaikan (sudah ada)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST PELANGGARAN
  // GET /api/kesiswaan/pelanggaran (filter DB, anti-N+1)
  // ─────────────────────────────────────────────────────────────────────────

  async listPelanggaran(params: {
    siswaId?: number;
    kelasId?: number;
    status?: string;
    dari?: string;
    sampai?: string;
    page?: number;
    limit?: number;
    user: { id: number; roles: string[] };
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));

    const qb = this.pelanggaranRepo
      .createQueryBuilder('p')
      .leftJoin('p.siswa', 's')
      .leftJoin('p.katalog', 'k')
      .select([
        'p.id', 'p.siswaId', 'p.katalogId', 'p.kategori', 'p.poin',
        'p.tanggal', 'p.catatan', 'p.sumber', 'p.status', 'p.createdAt',
        'p.tahunAjaranId', 'p.alasanKeputusan',
      ])
      .addSelect(['s.nama', 's.nis', 's.kelasId'])
      .addSelect(['k.nomor', 'k.bentuk'])
      .orderBy('p.tanggal', 'DESC')
      .addOrderBy('p.createdAt', 'DESC');

    if (params.siswaId) qb.andWhere('p.siswaId = :siswaId', { siswaId: params.siswaId });
    if (params.kelasId) qb.andWhere('s.kelasId = :kelasId', { kelasId: params.kelasId });
    if (params.status) qb.andWhere('p.status = :status', { status: params.status });
    if (params.dari) qb.andWhere('p.tanggal >= :dari', { dari: params.dari });
    if (params.sampai) qb.andWhere('p.tanggal <= :sampai', { sampai: params.sampai });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { total, page, limit, data };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFIKASI — antrean MENUNGGU
  // ─────────────────────────────────────────────────────────────────────────

  async listVerifikasi(params: {
    page?: number;
    limit?: number;
    user: { id: number; roles: string[] };
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));

    const qb = this.pelanggaranRepo
      .createQueryBuilder('p')
      .leftJoin('p.siswa', 's')
      .leftJoin('p.katalog', 'k')
      .select([
        'p.id', 'p.siswaId', 'p.katalogId', 'p.kategori', 'p.poin',
        'p.tanggal', 'p.catatan', 'p.sumber', 'p.status', 'p.createdAt',
        'p.tahunAjaranId',
      ])
      .addSelect(['s.nama', 's.nis', 's.kelasId'])
      .addSelect(['k.nomor', 'k.bentuk'])
      .where("p.status = 'MENUNGGU'")
      .orderBy('p.tanggal', 'ASC');

    // Wali kelas → filter kelasnya saja
    if (
      !params.user.roles.includes('kesiswaan') &&
      !params.user.roles.includes('admin')
    ) {
      // Cari kelas yang diwalii user ini
      const dataSource = (this.kelasRepo as any).manager.connection;
      const { Guru } = await import('../guru/guru.entity');
      const guru = await dataSource
        .getRepository(Guru)
        .findOne({ where: { userId: params.user.id }, select: ['id'] });
      if (guru) {
        const kelas = await this.kelasRepo.findOne({
          where: { waliGuruId: guru.id },
          select: ['id'],
        });
        if (kelas) {
          qb.andWhere('s.kelasId = :kelasId', { kelasId: kelas.id });
        } else {
          // Wali tidak punya kelas → antrean kosong
          return { total: 0, page, limit, data: [] };
        }
      }
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { total, page, limit, data };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SETUJUI pelanggaran
  // ─────────────────────────────────────────────────────────────────────────

  async setujui(id: number, req: Request) {
    const row = await this.pelanggaranRepo.findOne({
      where: { id },
      relations: ['siswa'],
    });
    if (!row) throw new NotFoundException('Pelanggaran tidak ditemukan');
    if (row.status !== 'MENUNGGU') {
      throw new BadRequestException(`Status bukan MENUNGGU (saat ini: ${row.status})`);
    }

    const user = (req as any).user as { id: number; roles: string[] };

    // Cek berhak: kesiswaan/admin ATAU wali kelas siswa
    const berhak = await this.berhakLangsung(user, row.siswa);
    if (!berhak) throw new ForbiddenException('Anda tidak berhak memverifikasi pelanggaran ini');

    row.status = 'DISETUJUI';
    row.verifikatorId = user.id;
    row.verifikasiPada = new Date();
    await this.pelanggaranRepo.save(row);

    await this.audit.log({
      actorId: user.id,
      action: 'SETUJUI_PELANGGARAN',
      resource: 'pelanggaran',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menyetujui pelanggaran #${id} siswa ${row.siswa?.nama}: ${row.poin}p dipotong`,
    });

    return row;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOLAK pelanggaran
  // ─────────────────────────────────────────────────────────────────────────

  async tolak(id: number, dto: KeputusanPelanggaranDto, req: Request) {
    const row = await this.pelanggaranRepo.findOne({
      where: { id },
      relations: ['siswa'],
    });
    if (!row) throw new NotFoundException('Pelanggaran tidak ditemukan');
    if (row.status !== 'MENUNGGU') {
      throw new BadRequestException(`Status bukan MENUNGGU (saat ini: ${row.status})`);
    }
    if (!dto.alasan || !dto.alasan.trim()) {
      throw new BadRequestException('Alasan penolakan wajib diisi');
    }

    const user = (req as any).user as { id: number; roles: string[] };
    const berhak = await this.berhakLangsung(user, row.siswa);
    if (!berhak) throw new ForbiddenException('Anda tidak berhak menolak pelanggaran ini');

    row.status = 'DITOLAK';
    row.verifikatorId = user.id;
    row.verifikasiPada = new Date();
    row.alasanKeputusan = dto.alasan.trim();
    await this.pelanggaranRepo.save(row);

    await this.audit.log({
      actorId: user.id,
      action: 'TOLAK_PELANGGARAN',
      resource: 'pelanggaran',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menolak pelanggaran #${id} siswa ${row.siswa?.nama}: ${dto.alasan}`,
    });

    return row;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SALDO — BATCH anti-N+1
  // GET /api/kesiswaan/saldo?siswaId=&kelasId=
  // ─────────────────────────────────────────────────────────────────────────

  async saldo(params: { siswaId?: number; kelasId?: number }) {
    const ta = await this.taAktif();

    let siswaIds: number[] = [];
    if (params.siswaId) {
      siswaIds = [params.siswaId];
    } else if (params.kelasId) {
      const siswaList = await this.siswaRepo.find({
        where: { kelasId: params.kelasId, status: 'aktif' },
        select: ['id', 'nama', 'nis'],
        order: { nama: 'ASC' },
      });
      siswaIds = siswaList.map((s) => s.id);
    } else {
      throw new BadRequestException('Wajib menyertakan siswaId atau kelasId');
    }

    if (siswaIds.length === 0) return { data: [] };

    const saldoMap = await this.hitungSaldoBatch(siswaIds, ta.id);

    const siswaList = await this.siswaRepo.find({
      where: { id: In(siswaIds) },
      select: ['id', 'nama', 'nis'],
    });
    const siswaMap = new Map(siswaList.map((s) => [s.id, s]));

    const data = siswaIds.map((id) => {
      const s = siswaMap.get(id);
      const sal = saldoMap.get(id) ?? { saldo: SALDO_AWAL, terpotong: 0, perKategori: { R: 0, S: 0, B: 0, SB: 0 } };
      return {
        siswaId: id,
        nama: s?.nama ?? null,
        nis: s?.nis ?? null,
        saldo: sal.saldo,
        terpotong: sal.terpotong,
        perKategori: sal.perKategori,
      };
    });

    return { tahunAjaranId: ta.id, data };
  }
}
