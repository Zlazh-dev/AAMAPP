import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Request } from 'express';
import { Rapor } from './rapor.entity';
import { RaporMapelOverride } from './rapor-mapel-override.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { Penilaian } from '../penilaian/penilaian.entity';
import { Nilai } from '../penilaian/nilai.entity';
import { TujuanPembelajaran } from '../penilaian/tujuan-pembelajaran.entity';
import { PenilaianTp } from '../penilaian/penilaian-tp.entity';
import { PresensiSiswa } from '../presensi/presensi-siswa.entity';
import { AuditService } from '../audit/audit.service';
import { KokurikulerService } from '../kokurikuler/kokurikuler.service';
import { EkskulService } from '../ekskul/ekskul.service';
import { PengaturanService } from '../pengaturan/pengaturan.service';
import { OverrideMapelDto, CatatanWaliDto } from './dto/rapor.dto';

/** KKM global default = 75 (dari pengaturan; per user decision 2026-07-18) */
const KKM_DEFAULT = 75;

@Injectable()
export class RaporService {
  constructor(
    @InjectRepository(Rapor)
    private raporRepo: Repository<Rapor>,
    @InjectRepository(RaporMapelOverride)
    private overrideRepo: Repository<RaporMapelOverride>,
    @InjectRepository(Siswa)
    private siswaRepo: Repository<Siswa>,
    @InjectRepository(Kelas)
    private kelasRepo: Repository<Kelas>,
    @InjectRepository(Guru)
    private guruRepo: Repository<Guru>,
    @InjectRepository(TahunAjaran)
    private taRepo: Repository<TahunAjaran>,
    @InjectRepository(Penugasan)
    private penugasanRepo: Repository<Penugasan>,
    @InjectRepository(Penilaian)
    private penilaianRepo: Repository<Penilaian>,
    @InjectRepository(Nilai)
    private nilaiRepo: Repository<Nilai>,
    @InjectRepository(TujuanPembelajaran)
    private tpRepo: Repository<TujuanPembelajaran>,
    @InjectRepository(PenilaianTp)
    private penilaianTpRepo: Repository<PenilaianTp>,
    @InjectRepository(PresensiSiswa)
    private presensiSiswaRepo: Repository<PresensiSiswa>,
    private audit: AuditService,
    private kokurikulerService: KokurikulerService,
    private ekskulService: EkskulService,
    private pengaturanService: PengaturanService,
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
   * Cek apakah user adalah wali kelas dari kelas siswa (atau admin/kepsek).
   * waliGuru = guru yang punya waliGuruId pada kelas.
   */
  private async assertWali(
    siswaId: number,
    user: { id: number; roles: string[] },
  ): Promise<void> {
    if (user.roles.includes('admin') || user.roles.includes('kepsek')) return;
    const siswa = await this.siswaRepo.findOne({ where: { id: siswaId }, select: ['kelasId'] });
    if (!siswa) throw new NotFoundException('Siswa tidak ditemukan');
    if (!siswa.kelasId) throw new NotFoundException('Siswa tidak memiliki kelas');
    const kelas = await this.kelasRepo.findOne({ where: { id: siswa.kelasId as number }, select: ['waliGuruId'] });
    if (!kelas) throw new NotFoundException('Kelas tidak ditemukan');
    const guruId = await this.resolveGuruId(user.id);
    if (!guruId || kelas.waliGuruId !== guruId) {
      throw new ForbiddenException('Hanya wali kelas yang dapat mengakses rapor siswa ini');
    }
  }

  private async assertWaliKelas(
    kelasId: number,
    user: { id: number; roles: string[] },
  ): Promise<void> {
    // admin, kepsek, kurikulum diizinkan akses semua kelas
    if (
      user.roles.includes('admin') ||
      user.roles.includes('kepsek') ||
      user.roles.includes('kurikulum')
    ) return;

    const kelas = await this.kelasRepo.findOne({ where: { id: kelasId }, select: ['waliGuruId'] });
    // Kelas tidak ditemukan → 404 (resource genuinely tidak ada, bukan masalah otorisasi)
    if (!kelas) throw new NotFoundException('Kelas tidak ditemukan');

    const guruId = await this.resolveGuruId(user.id);
    if (!guruId || kelas.waliGuruId !== guruId) {
      // 403 dengan pesan jelas — konvensi app (sama dengan penolakan geofence presensi).
      // TIDAK pakai 404 karena route ini terdaftar dan kelas ada; menyembunyikan
      // keberadaan resource dari guru yang login tidak menambah keamanan berarti
      // dan membingungkan debugging lapangan.
      throw new ForbiddenException('Anda bukan wali kelas ini dan tidak memiliki akses ke rapor kelas ini');
    }
  }

  /**
   * GET /api/rapor/kelas-wali
   * Guru-scoped: mengembalikan hanya kelas yang di-wali-i guru login.
   * Admin/kepsek/kurikulum: kembalikan semua kelas.
   * Prinsip: area guru TIDAK BOLEH pakai adminGetKelas global.
   */
  async getKelasWali(user: { id: number; roles: string[] }) {
    if (
      user.roles.includes('admin') ||
      user.roles.includes('kepsek') ||
      user.roles.includes('kurikulum')
    ) {
      const semua = await this.kelasRepo.find({ order: { nama: 'ASC' } });
      return { data: semua };
    }
    const guruId = await this.resolveGuruId(user.id);
    if (!guruId) return { data: [] };
    const kelas = await this.kelasRepo.find({
      where: { waliGuruId: guruId },
      order: { nama: 'ASC' },
    });
    return { data: kelas };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORE: Assembly DERIVED per siswa (BATCH anti-N+1)
  // Menghitung nilai akhir, deskripsi otomatis, kehadiran S/I/A untuk
  // satu siswa pada TA tertentu, dengan override dari rapor.
  // ─────────────────────────────────────────────────────────────────────────

  /** Hitung nilai akhir Sumatif: round(Σ(nilai×bobot)/Σbobot) — reuse F6a logic */
  private computeNilaiAkhir(
    nilaiRows: Array<{ penilaianId: number; nilai: number }>,
    sumatifList: Array<{ id: number; bobot: number }>,
  ): number | null {
    const bobotMap = new Map(sumatifList.map((p) => [p.id, p.bobot]));
    let sumNB = 0;
    let sumB = 0;
    for (const n of nilaiRows) {
      const b = bobotMap.get(n.penilaianId);
      if (b === undefined) continue;
      sumNB += n.nilai * b;
      sumB += b;
    }
    return sumB > 0 ? Math.round(sumNB / sumB) : null;
  }

  /**
   * Deskripsi otomatis per mapel:
   * Rata-rata nilai per TP (dari penilaian SUMATIF_TP yang terhubung ke TP itu).
   * Dikuasai = rata ≥ KKM (≤2 teratas desc). Penguatan = rata < KKM (≤2 terbawah).
   * Bila belum ada nilai sumatif → "Belum ada nilai sumatif."
   */
  private buildDeskripsiOtomatis(
    tpList: Array<{ id: number; deskripsi: string }>,
    tpRataMap: Map<number, number>,
    kkm: number,
  ): string {
    if (tpRataMap.size === 0) return 'Belum ada nilai sumatif.';

    // Urutkan TP desc by rata
    const tpWithRata = tpList
      .filter((tp) => tpRataMap.has(tp.id))
      .map((tp) => ({ tp, rata: tpRataMap.get(tp.id)! }))
      .sort((a, b) => b.rata - a.rata);

    if (tpWithRata.length === 0) return 'Belum ada nilai sumatif.';

    const dikuasai = tpWithRata.filter((t) => t.rata >= kkm).slice(0, 2);
    const penguatan = tpWithRata.filter((t) => t.rata < kkm).slice(-2).reverse();

    const joinTP = (list: typeof tpWithRata) => {
      const names = list.map((t) => {
        const d = t.tp.deskripsi.trim().replace(/\.$/, '');
        return d.charAt(0).toLowerCase() + d.slice(1);
      });
      if (names.length === 0) return '';
      if (names.length === 1) return names[0];
      return names.slice(0, -1).join(', ') + ' dan ' + names[names.length - 1];
    };

    let deskripsi = '';
    if (dikuasai.length > 0) {
      deskripsi += `Ananda menunjukkan penguasaan baik pada ${joinTP(dikuasai)}.`;
    }
    if (penguatan.length > 0) {
      deskripsi += ` Masih memerlukan penguatan pada ${joinTP(penguatan)}.`;
    }
    if (!deskripsi) deskripsi = 'Belum ada nilai sumatif.';
    return deskripsi.trim();
  }

  /**
   * Hitung kehadiran S/I/A per siswa dari presensi_siswa (F2) untuk TA.
   * presensi_siswa.status: 'H' | 'I' | 'S' | 'A' | 'T'
   * Join: presensi_siswa → presensi_sesi → jadwal_kbm → penugasan (tahunAjaranId)
   * BATCH: 1 raw query GROUP BY siswaId.
   */
  private async hitungKehadiranBatch(
    siswaIds: number[],
    tahunAjaranId: number,
  ): Promise<Map<number, { S: number; I: number; A: number }>> {
    if (siswaIds.length === 0) return new Map();

    const rows = await this.presensiSiswaRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.presensiSesi', 'sesi')
      .innerJoin('sesi.jadwalKbm', 'jk')
      .innerJoin('jk.penugasan', 'pt')
      .select('ps.siswaId', 'siswaId')
      .addSelect("SUM(CASE WHEN ps.status = 'S' THEN 1 ELSE 0 END)", 'totalS')
      .addSelect("SUM(CASE WHEN ps.status = 'I' THEN 1 ELSE 0 END)", 'totalI')
      .addSelect("SUM(CASE WHEN ps.status = 'A' THEN 1 ELSE 0 END)", 'totalA')
      .where('ps.siswaId IN (:...ids)', { ids: siswaIds })
      .andWhere('pt.tahunAjaranId = :taId', { taId: tahunAjaranId })
      .groupBy('ps.siswaId')
      .getRawMany();

    const result = new Map<number, { S: number; I: number; A: number }>();
    for (const r of rows) {
      result.set(Number(r.siswaId), {
        S: Number(r.totalS),
        I: Number(r.totalI),
        A: Number(r.totalA),
      });
    }
    return result;
  }

  /**
   * Assembly rapor lengkap per siswa (DERIVED):
   * - Semua penugasan (mapel) di kelas siswa pada TA
   * - Nilai akhir sumatif per mapel
   * - Deskripsi otomatis (top2/bottom2 vs KKM)
   * - Override (katrol, deskripsiOverride)
   * - Kehadiran S/I/A
   * - catatanWali, status
   * BATCH-optimal: semua query di-JOIN/GROUP tanpa N+1.
   */
  private async assembleRapor(
    siswaId: number,
    tahunAjaranId: number,
    raporRow: Rapor | null,
  ): Promise<Record<string, any>> {
    // Ambil KKM dari pengaturan
    let kkmValue = KKM_DEFAULT;
    try {
      const kkmRow = await this.pengaturanService.getOne('kkm');
      if (kkmRow?.value?.nilai) {
        kkmValue = Number(kkmRow.value.nilai);
      }
    } catch {
      // Abaikan jika tidak ketemu (fallback ke KKM_DEFAULT)
    }

    // Siswa
    const siswa = await this.siswaRepo.findOne({
      where: { id: siswaId },
      select: ['id', 'nama', 'nis', 'kelasId'],
    });
    if (!siswa) throw new NotFoundException('Siswa tidak ditemukan');

    // TA
    const ta = await this.taRepo.findOne({ where: { id: tahunAjaranId } });

    if (!siswa.kelasId) {
      return {
        siswaId, siswaNama: siswa.nama, siswaNis: siswa.nis,
        tahunAjaranId, tahunAjaranNama: ta?.nama ?? '',
        status: raporRow?.status ?? 'DRAFT',
        catatanWali: raporRow?.catatanWali ?? null,
        kehadiran: { S: 0, I: 0, A: 0 },
        mapel: [],
        kkm: kkmValue,
      };
    }

    // Penugasan (mapel) untuk kelas siswa pada TA ini — semua mapel yang diajarkan
    const penugasanList = await this.penugasanRepo.find({
      where: { kelasId: siswa.kelasId as number, tahunAjaranId },
      relations: ['mapel'],
      order: { id: 'ASC' },
    });

    if (penugasanList.length === 0) {
      const kehadiran = await this.hitungKehadiranBatch([siswaId], tahunAjaranId);
      const keh = kehadiran.get(siswaId) ?? { S: 0, I: 0, A: 0 };
      return {
        siswaId, siswaNama: siswa.nama, siswaNis: siswa.nis,
        tahunAjaranId, tahunAjaranNama: ta?.nama ?? '',
        status: raporRow?.status ?? 'DRAFT',
        catatanWali: raporRow?.catatanWali ?? null,
        kehadiran: keh,
        mapel: [],
        kkm: kkmValue,
      };
    }

    const penugasanIds = penugasanList.map((p) => p.id);

    // Semua penilaian Sumatif untuk penugasan kelas ini (BATCH)
    const sumatifAll = await this.penilaianRepo.find({
      where: { penugasanId: In(penugasanIds), jenis: 'Sumatif' },
      select: ['id', 'penugasanId', 'bobot', 'subjenis'],
    });

    const sumatifIds = sumatifAll.map((p) => p.id);

    // Nilai siswa untuk semua sumatif (BATCH — 1 query)
    const nilaiRows = sumatifIds.length > 0
      ? await this.nilaiRepo.find({
          where: { penilaianId: In(sumatifIds), siswaId },
          select: ['penilaianId', 'nilai'],
        })
      : [];

    // Junction penilaian_tp untuk SUMATIF_TP (BATCH)
    const sumatifTpIds = sumatifAll
      .filter((p) => p.subjenis === 'SUMATIF_TP')
      .map((p) => p.id);
    const ptLinks = sumatifTpIds.length > 0
      ? await this.penilaianTpRepo.find({
          where: { penilaianId: In(sumatifTpIds) },
          select: ['penilaianId', 'tpId'],
        })
      : [];

    // TP aktif per mapel (BATCH)
    const mapelIds = penugasanList.map((p) => p.mapelId);
    const tpAll = await this.tpRepo.find({
      where: { mapelId: In(mapelIds), aktif: true },
      select: ['id', 'mapelId', 'deskripsi', 'urutan'],
      order: { urutan: 'ASC' },
    });

    // Override dari rapor
    const overrides = raporRow
      ? await this.overrideRepo.find({ where: { raporId: raporRow.id } })
      : [];
    const overrideMap = new Map(overrides.map((o) => [o.mapelId, o]));

    // Kehadiran (BATCH 1 query)
    const kehadiranMap = await this.hitungKehadiranBatch([siswaId], tahunAjaranId);
    const kehadiran = kehadiranMap.get(siswaId) ?? { S: 0, I: 0, A: 0 };

    // Nilai siswa per penilaianId
    const nilaiMap = new Map(nilaiRows.map((n) => [n.penilaianId, n.nilai]));

    // Assembly per mapel
    const mapelData = penugasanList.map((p) => {
      const mapelId = p.mapelId;

      // Sumatif untuk paket ini
      const sumatifPaket = sumatifAll.filter((s) => s.penugasanId === p.id);
      const nilaiPaket = nilaiRows.filter((n) =>
        sumatifPaket.some((s) => s.id === n.penilaianId),
      );

      // Nilai akhir
      const nilaiAkhirRaw = this.computeNilaiAkhir(nilaiPaket, sumatifPaket);
      const override = overrideMap.get(mapelId);
      const nilaiKatrol = override?.nilaiKatrol ?? null;
      const nilaiTampil = nilaiKatrol ?? nilaiAkhirRaw;

      // TP mapel ini
      const tpMapel = tpAll.filter((tp) => tp.mapelId === mapelId);

      // Rata nilai per TP: ambil sumatif SUMATIF_TP yang terhubung ke TP ini,
      // rata-rata nilai siswa pada penilaian tersebut
      const tpRataMap = new Map<number, number>();
      for (const tp of tpMapel) {
        const terkaitPenilaianIds = ptLinks
          .filter((lnk) => lnk.tpId === tp.id)
          .map((lnk) => lnk.penilaianId);
        if (terkaitPenilaianIds.length === 0) continue;
        const vals = terkaitPenilaianIds
          .map((pid) => nilaiMap.get(pid))
          .filter((v): v is number => v !== undefined);
        if (vals.length > 0) {
          tpRataMap.set(tp.id, vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      }

      const deskripsiOtomatis = this.buildDeskripsiOtomatis(tpMapel, tpRataMap, kkmValue);
      const deskripsi = override?.deskripsiOverride ?? deskripsiOtomatis;

      return {
        mapelId,
        mapelNama: (p as any).mapel?.nama ?? '',
        nilaiAkhir: nilaiAkhirRaw,
        nilaiKatrol,
        nilaiTampil,
        tuntas: nilaiTampil !== null ? nilaiTampil >= kkmValue : null,
        kkm: kkmValue,
        deskripsi,
        deskripsiOtomatis,
        hasOverride: !!override,
        tp: tpMapel.map((tp) => ({
          id: tp.id,
          deskripsi: tp.deskripsi,
          rata: tpRataMap.has(tp.id) ? Math.round(tpRataMap.get(tp.id)! * 10) / 10 : null,
        })),
      };
    });

    return {
      siswaId,
      siswaNama: siswa.nama,
      siswaNis: siswa.nis,
      tahunAjaranId,
      tahunAjaranNama: ta?.nama ?? '',
      status: raporRow?.status ?? 'DRAFT',
      catatanWali: raporRow?.catatanWali ?? null,
      finalisasiPada: raporRow?.finalisasiPada ?? null,
      kehadiran,
      mapel: mapelData,
      kkm: kkmValue,
      kokurikuler: await this._buildKokurikuler(siswaId, tahunAjaranId),
      ekstrakurikuler: await this._buildEkstrakurikuler(siswaId),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers integrasi — kokurikuler & ekstrakurikuler (dari services F6c/F6d)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Kokurikuler per siswa: per dimensi rata semua kegiatan TA ini.
   * Format respons: [ { namaDimensi, nilai(SB/B/C/K), deskripsi } ]
   */
  private async _buildKokurikuler(
    siswaId: number,
    tahunAjaranId: number,
  ): Promise<any[]> {
    try {
      const raw = await this.kokurikulerService.getRaporSiswa(siswaId, tahunAjaranId);
      // Flatten: per dimensi dari semua kegiatan
      const dimensiMap = new Map<string, { nilai: string | null; count: number }>();
      for (const kg of (raw.kegiatan ?? [])) {
        for (const d of (kg.dimensi ?? [])) {
          const prev = dimensiMap.get(d.namaDimensi);
          // Ambil nilai yang sudah tersedia (nilaiAkhir)
          if (d.nilaiAkhir) {
            if (!prev) {
              dimensiMap.set(d.namaDimensi, { nilai: d.nilaiAkhir, count: 1 });
            } else {
              // Jika ada lebih dari 1 kegiatan dengan dimensi sama, pakai yang terbaru
              dimensiMap.set(d.namaDimensi, { nilai: d.nilaiAkhir, count: prev.count + 1 });
            }
          }
        }
      }
      const result = [...dimensiMap.entries()].map(([namaDimensi, v]) => ({
        namaDimensi,
        nilai: v.nilai,
      }));
      return result;
    } catch {
      return [];
    }
  }

  /**
   * Ekstrakurikuler per siswa: per ekskul yang diikuti.
   * Format respons: [ { nama, kehadiranPersen, flagMerah, tujuan:[{deskripsi,nilai}], deskripsi } ]
   */
  private async _buildEkstrakurikuler(siswaId: number): Promise<any[]> {
    try {
      const raw = await this.ekskulService.getRaporSiswa(siswaId);
      return (raw.ekskul ?? []).map((ek: any) => {
        // Agregat kehadiran — ambil persen rata-rata semua semester (atau terbaru)
        const kehadiranList = ek.kehadiran ?? [];
        const kehadiranPersen = kehadiranList.length > 0
          ? Math.round(kehadiranList.reduce((sum: number, k: any) => sum + (k.persen ?? 0), 0) / kehadiranList.length)
          : null;
        const flagMerah = kehadiranPersen !== null && kehadiranPersen < 70;
        return {
          nama: ek.nama,
          kehadiranPersen,
          flagMerah,
          tujuan: (ek.nilaiPerTujuan ?? []).map((t: any) => ({
            deskripsi: t.deskripsi,
            nilai: t.nilai,
          })),
          deskripsi: ek.deskripsi ?? '',
        };
      });
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/rapor/kelas/:kelasId?tahunAjaranId= — daftar siswa + ringkasan
  // ─────────────────────────────────────────────────────────────────────────

  async listKelas(
    kelasId: number,
    tahunAjaranId: number | undefined,
    user: { id: number; roles: string[] },
  ) {
    await this.assertWaliKelas(kelasId, user);
    const ta = tahunAjaranId
      ? await this.taRepo.findOne({ where: { id: tahunAjaranId } })
      : await this.taAktif();
    if (!ta) throw new BadRequestException('Tahun ajaran tidak ditemukan');

    const siswaList = await this.siswaRepo.find({
      where: { kelasId, status: 'aktif' },
      select: ['id', 'nama', 'nis'],
      order: { nama: 'ASC' },
    });

    if (siswaList.length === 0) return { kelasId, tahunAjaranId: ta.id, data: [] };

    const siswaIds = siswaList.map((s) => s.id);

    // Rapor rows BATCH
    const raporRows = await this.raporRepo.find({
      where: { siswaId: In(siswaIds), tahunAjaranId: ta.id },
      select: ['id', 'siswaId', 'status', 'catatanWali', 'finalisasiPada'],
    });
    const raporMap = new Map(raporRows.map((r) => [r.siswaId, r]));

    // Penugasan kelas ini (untuk ringkasan jumlah mapel)
    const penugasanCount = await this.penugasanRepo.count({
      where: { kelasId, tahunAjaranId: ta.id },
    });

    const data = siswaList.map((s) => {
      const r = raporMap.get(s.id);
      return {
        siswaId: s.id,
        nama: s.nama,
        nis: s.nis,
        status: r?.status ?? 'DRAFT',
        finalisasiPada: r?.finalisasiPada ?? null,
        jumlahMapel: penugasanCount,
      };
    });

    return { kelasId, tahunAjaranId: ta.id, jumlahSiswa: siswaList.length, data };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/rapor/kelas/:kelasId/leger?tahunAjaranId= — matriks Leger Kelas
  // ─────────────────────────────────────────────────────────────────────────

  async getLegerKelas(
    kelasId: number,
    tahunAjaranId: number | undefined,
    user: { id: number; roles: string[] },
  ) {
    await this.assertWaliKelas(kelasId, user);
    const ta = tahunAjaranId
      ? await this.taRepo.findOne({ where: { id: tahunAjaranId } })
      : await this.taAktif();
    if (!ta) throw new BadRequestException('Tahun ajaran tidak ditemukan');

    const kelas = await this.kelasRepo.findOne({ where: { id: kelasId } });
    if (!kelas) throw new NotFoundException('Kelas tidak ditemukan');

    const siswaList = await this.siswaRepo.find({
      where: { kelasId, status: 'aktif' },
      select: ['id', 'nama', 'nis', 'jenisKelamin'],
      order: { nama: 'ASC' },
    });

    if (siswaList.length === 0) {
      return { kelasId, tahunAjaranId: ta.id, mapel: [], siswa: [] };
    }

    // Ambil penugasan (mapel) kelas
    const penugasanList = await this.penugasanRepo.find({
      where: { kelasId, tahunAjaranId: ta.id },
      relations: ['mapel'],
      order: { id: 'ASC' },
    });
    
    // Header mapel
    const mapelHeaders = penugasanList.map(p => ({
      mapelId: p.mapelId,
      nama: (p as any).mapel?.nama ?? 'Unknown',
    }));

    // BATCH fetch rapor per siswa using existing Promise.all over assembleRapor (since it's only ~30 students, and inner queries are optimized)
    // Wait, assembleRapor uses a loop or single queries inside. But we have getRaporSiswa which checks snapshot or uses assembleRapor.
    // Let's use getRaporSiswa for each student.
    const siswaRaporPromises = siswaList.map(s => this.getRaporSiswa(s.id, ta.id, user));
    const raporList = await Promise.all(siswaRaporPromises);

    // Compute total and mapel array per student
    const siswaData = siswaList.map((s, index) => {
      const rapor = raporList[index];
      let totalNilai = 0;
      
      const mapelValues = mapelHeaders.map(mh => {
        const mData = rapor.mapel.find((m: any) => m.mapelId === mh.mapelId);
        if (mData && mData.nilaiTampil !== null) {
          totalNilai += mData.nilaiTampil;
        }
        return {
          mapelId: mh.mapelId,
          nilai: mData?.nilaiTampil ?? null,
          isOverride: mData?.hasOverride ?? false,
          kkm: mData?.kkm ?? KKM_DEFAULT,
          tuntas: mData?.tuntas ?? null,
        };
      });

      return {
        siswaId: s.id,
        nis: s.nis,
        nama: s.nama,
        jenisKelamin: s.jenisKelamin,
        mapel: mapelValues,
        totalNilai,
        ranking: 0, // diisi nanti
      };
    });

    // Ranking (urut berdasarkan totalNilai desc)
    siswaData.sort((a, b) => b.totalNilai - a.totalNilai);
    
    let currentRank = 1;
    for (let i = 0; i < siswaData.length; i++) {
      if (i > 0 && siswaData[i].totalNilai === siswaData[i - 1].totalNilai) {
        siswaData[i].ranking = siswaData[i - 1].ranking;
      } else {
        siswaData[i].ranking = currentRank;
      }
      currentRank++;
    }

    // Kembalikan urutan abjad untuk UI (atau biarkan sorted by rank, UI bisa sort sendiri. Biasanya leger by nama abjad)
    siswaData.sort((a, b) => a.nama.localeCompare(b.nama));

    return {
      kelasId,
      kelasNama: kelas.nama,
      tahunAjaranId: ta.id,
      tahunAjaranNama: ta.nama,
      mapel: mapelHeaders,
      siswa: siswaData,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/rapor/siswa/:siswaId?tahunAjaranId= — rapor lengkap DERIVED
  // ─────────────────────────────────────────────────────────────────────────

  async getRaporSiswa(
    siswaId: number,
    tahunAjaranId: number | undefined,
    user: { id: number; roles: string[] },
  ) {
    await this.assertWali(siswaId, user);
    const ta = tahunAjaranId
      ? await this.taRepo.findOne({ where: { id: tahunAjaranId } })
      : await this.taAktif();
    if (!ta) throw new BadRequestException('Tahun ajaran tidak ditemukan');

    // Cari rapor row (buat bila belum ada)
    let raporRow = await this.raporRepo.findOne({
      where: { siswaId, tahunAjaranId: ta.id },
      relations: ['overrides'],
    });

    // Jika FINAL → gunakan snapshot
    if (raporRow?.status === 'FINAL' && raporRow.snapshot) {
      return raporRow.snapshot;
    }

    // DERIVED (DRAFT atau belum ada)
    return this.assembleRapor(siswaId, ta.id, raporRow ?? null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUT /api/rapor/siswa/:siswaId/mapel/:mapelId — override katrol/deskripsi
  // ─────────────────────────────────────────────────────────────────────────

  async upsertOverride(
    siswaId: number,
    mapelId: number,
    dto: OverrideMapelDto,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    await this.assertWali(siswaId, user);
    const ta = await this.taAktif();

    // Buat/ambil rapor row
    let raporRow = await this.raporRepo.findOne({ where: { siswaId, tahunAjaranId: ta.id } });
    if (!raporRow) {
      raporRow = this.raporRepo.create({ siswaId, tahunAjaranId: ta.id, status: 'DRAFT' });
      raporRow = await this.raporRepo.save(raporRow);
    }

    if (raporRow.status === 'FINAL') {
      throw new BadRequestException('Rapor sudah FINAL, tidak dapat diubah');
    }

    // Upsert override
    let ov = await this.overrideRepo.findOne({ where: { raporId: raporRow.id, mapelId } });
    if (!ov) {
      ov = this.overrideRepo.create({ raporId: raporRow.id, mapelId });
    }
    if (dto.nilaiKatrol !== undefined) ov.nilaiKatrol = dto.nilaiKatrol;
    if (dto.deskripsiOverride !== undefined) ov.deskripsiOverride = dto.deskripsiOverride;
    const saved = await this.overrideRepo.save(ov);

    await this.audit.log({
      actorId: user.id,
      action: 'OVERRIDE_RAPOR_MAPEL',
      resource: 'rapor_mapel_override',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Override rapor siswa #${siswaId} mapel #${mapelId}`,
    });

    return saved;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/rapor/siswa/:siswaId/catatan — catatan wali
  // ─────────────────────────────────────────────────────────────────────────

  async updateCatatan(
    siswaId: number,
    dto: CatatanWaliDto,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    await this.assertWali(siswaId, user);
    const ta = await this.taAktif();

    let raporRow = await this.raporRepo.findOne({ where: { siswaId, tahunAjaranId: ta.id } });
    if (!raporRow) {
      raporRow = this.raporRepo.create({ siswaId, tahunAjaranId: ta.id, status: 'DRAFT' });
    }
    if (raporRow.status === 'FINAL') {
      throw new BadRequestException('Rapor sudah FINAL, tidak dapat diubah');
    }

    raporRow.catatanWali = dto.catatanWali;
    const saved = await this.raporRepo.save(raporRow);

    await this.audit.log({
      actorId: user.id,
      action: 'UPDATE_CATATAN_WALI',
      resource: 'rapor',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Update catatan wali rapor siswa #${siswaId}`,
    });

    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/rapor/siswa/:siswaId/finalisasi — FINAL + snapshot
  // ─────────────────────────────────────────────────────────────────────────

  async finalisasi(
    siswaId: number,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    await this.assertWali(siswaId, user);
    const ta = await this.taAktif();

    let raporRow = await this.raporRepo.findOne({
      where: { siswaId, tahunAjaranId: ta.id },
      relations: ['overrides'],
    });
    if (!raporRow) {
      raporRow = this.raporRepo.create({ siswaId, tahunAjaranId: ta.id, status: 'DRAFT' });
      raporRow = await this.raporRepo.save(raporRow);
    }

    if (raporRow.status === 'FINAL') {
      throw new BadRequestException('Rapor sudah FINAL');
    }

    // Buat snapshot dari DERIVED
    const snapshot = await this.assembleRapor(siswaId, ta.id, raporRow);

    raporRow.status = 'FINAL';
    raporRow.snapshot = { ...snapshot, status: 'FINAL' };
    raporRow.finalisasiOleh = user.id;
    raporRow.finalisasiPada = new Date();
    const saved = await this.raporRepo.save(raporRow);

    await this.audit.log({
      actorId: user.id,
      action: 'FINALISASI_RAPOR',
      resource: 'rapor',
      resourceId: String(saved.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Finalisasi rapor siswa #${siswaId} TA #${ta.id}`,
    });

    return { ok: true, status: 'FINAL', finalisasiPada: saved.finalisasiPada };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /api/rapor/siswa/:siswaId/batal-final — kembali ke DRAFT (admin)
  // ─────────────────────────────────────────────────────────────────────────

  async batalFinal(
    siswaId: number,
    user: { id: number; roles: string[] },
    req: Request,
  ) {
    if (!user.roles.includes('admin')) {
      throw new ForbiddenException('Hanya admin yang dapat membatalkan finalisasi');
    }
    const ta = await this.taAktif();
    const raporRow = await this.raporRepo.findOne({ where: { siswaId, tahunAjaranId: ta.id } });
    if (!raporRow) throw new NotFoundException('Rapor tidak ditemukan');
    if (raporRow.status !== 'FINAL') {
      throw new BadRequestException('Rapor bukan FINAL, tidak perlu dibatalkan');
    }

    raporRow.status = 'DRAFT';
    raporRow.snapshot = null;
    raporRow.finalisasiOleh = null;
    raporRow.finalisasiPada = null;
    await this.raporRepo.save(raporRow);

    await this.audit.log({
      actorId: user.id,
      action: 'BATAL_FINAL_RAPOR',
      resource: 'rapor',
      resourceId: String(raporRow.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Batalkan finalisasi rapor siswa #${siswaId}`,
    });

    return { ok: true, status: 'DRAFT' };
  }
}
