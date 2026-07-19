import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Guru } from '../guru/guru.entity';
import { Siswa } from '../siswa/siswa.entity';
import { PresensiHarianGuru } from '../presensi-guru/presensi-harian-guru.entity';
import { PresensiSesi } from '../presensi/presensi-sesi.entity';
import { PresensiSiswa } from '../presensi/presensi-siswa.entity';
import { KalenderLibur } from '../kurikulum/kalender-libur.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { IzinService, deriveStatusHarian, StatusHarian } from '../izin/izin.service';
import { IzinGuru } from '../izin/izin-guru.entity';
import { formatDateWIB, todayWIB } from '../common/wib.util';
import { ActivityLog } from '../audit/activity-log.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: generate tanggal range inklusif (YYYY-MM-DD strings)
// ─────────────────────────────────────────────────────────────────────────────
function dateRange(dari: string, sampai: string): string[] {
  const result: string[] = [];
  const cur = new Date(dari + 'T00:00:00Z');
  const end = new Date(sampai + 'T00:00:00Z');
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return result;
}

// Hari-of-week WIB dari date string YYYY-MM-DD (0=Minggu..6=Sabtu)
function hariOfTgl(tgl: string): number {
  return new Date(tgl + 'T00:00:00+07:00').getDay();
}

@Injectable()
export class LaporanService {
  constructor(
    @InjectRepository(Guru)
    private guruRepo: Repository<Guru>,
    @InjectRepository(Siswa)
    private siswaRepo: Repository<Siswa>,
    @InjectRepository(PresensiHarianGuru)
    private phgRepo: Repository<PresensiHarianGuru>,
    @InjectRepository(PresensiSesi)
    private sesiRepo: Repository<PresensiSesi>,
    @InjectRepository(PresensiSiswa)
    private pSiswaRepo: Repository<PresensiSiswa>,
    @InjectRepository(KalenderLibur)
    private liburRepo: Repository<KalenderLibur>,
    @InjectRepository(JadwalKbm)
    private jadwalRepo: Repository<JadwalKbm>,
    @InjectRepository(Penugasan)
    private penugasanRepo: Repository<Penugasan>,
    @InjectRepository(Pengaturan)
    private pengaturanRepo: Repository<Pengaturan>,
    @InjectRepository(IzinGuru)
    private izinRepo: Repository<IzinGuru>,
    @InjectRepository(ActivityLog)
    private logRepo: Repository<ActivityLog>,
    private izinService: IzinService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // GET /api/admin/dashboard?tanggal=
  // ─────────────────────────────────────────────────────────────────────────

  async dashboard(tanggal?: string) {
    const tgl = tanggal ?? formatDateWIB(todayWIB());

    // Q1: guru aktif
    const guruList = await this.guruRepo.find({
      where: { status: 'aktif' as any },
      select: ['id', 'nama', 'nip'],
      order: { nama: 'ASC' },
    });
    const guruIds = guruList.map((g) => g.id);

    // Q2: presensi_harian_guru di tanggal
    const phgRows = guruIds.length
      ? await this.phgRepo.find({ where: { guruId: In(guruIds), tanggal: tgl } })
      : [];
    const phgMap = new Map(phgRows.map((p) => [p.guruId, p]));

    // Q3: izin DISETUJUI aktif di tanggal
    const izinMap = guruIds.length
      ? await this.izinService.batchIzinAktif(guruIds, tgl)
      : new Map();

    // Q4: jadwal hari ini → punyaJadwalSet
    const hariWIB = hariOfTgl(tgl);
    const penugasanList = guruIds.length
      ? await this.penugasanRepo.find({ where: { guruId: In(guruIds) }, select: ['id', 'guruId'] })
      : [];
    const penugasanIds = penugasanList.map((p) => p.id);
    const punyaJadwalSet = new Set<number>();
    if (penugasanIds.length) {
      const jadwalRows = await this.jadwalRepo.find({
        where: { penugasanId: In(penugasanIds), hari: hariWIB },
        select: ['id', 'penugasanId'],
      });
      const pIdSet = new Set(jadwalRows.map((j) => j.penugasanId));
      for (const p of penugasanList) {
        if (pIdSet.has(p.id)) punyaJadwalSet.add(p.guruId);
      }
    }

    // Q5: libur hari ini
    const liburRow = await this.liburRepo.findOne({ where: { tanggal: tgl } as any });
    const liburSet = new Set<string>(liburRow ? [tgl] : []);

    // Derive guruStatus (BATCH, no loop query)
    const guruStatus: Record<StatusHarian, number> = {
      HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, DINAS: 0, ALPHA: 0, LIBUR: 0, KOSONG: 0,
    };
    for (const g of guruList) {
      const ph = phgMap.get(g.id) ?? null;
      const status = deriveStatusHarian(g.id, tgl, {
        liburSet,
        izinAktifMap: izinMap,
        presensiMap: ph ? new Map([[g.id, { status: ph.status }]]) : new Map(),
        punyaJadwalSet,
      });
      guruStatus[status] = (guruStatus[status] ?? 0) + 1;
    }

    // Q6: KBM — presensi_sesi di tanggal (terlaksana) vs jadwal_kbm hari itu (total dijadwalkan)
    const terlaksana = await this.sesiRepo.count({ where: { tanggal: tgl } as any });
    const totalJadwalHariIni = penugasanIds.length
      ? await this.jadwalRepo.count({ where: { penugasanId: In(penugasanIds), hari: hariWIB } })
      : 0;
    const kbm = { terlaksana, kosong: Math.max(0, totalJadwalHariIni - terlaksana), total: totalJadwalHariIni };

    // Q7: siswa presensi di tanggal (join sesi → presensi_siswa)
    const siswaAgg = await this.pSiswaRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.presensiSesi', 'sesi', 'sesi.tanggal = :tgl', { tgl })
      .select('ps.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ps.status')
      .getRawMany();

    const siswaMap: Record<string, number> = {};
    for (const r of siswaAgg) siswaMap[r.status] = Number(r.count);
    const siswa = {
      hadir: (siswaMap['H'] ?? 0) + (siswaMap['I'] ?? 0) + (siswaMap['T'] ?? 0),
      alpha: siswaMap['A'] ?? 0,
      total: Object.values(siswaMap).reduce((a, b) => a + b, 0),
    };

    // Q8: perluPerhatian — izin MENUNGGU + presensi pending verifikasi
    const izinMenunggu = await this.izinRepo.count({ where: { status: 'MENUNGGU' } });
    const presensiPending = await this.phgRepo.count({ where: { perluVerifikasi: true } as any });
    const perluPerhatian = { izinMenunggu, presensiPending };

    // Q9: feed — 10 aktivitas terbaru dari activity_logs
    const feedRows = await this.logRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'action', 'summary', 'userName', 'createdAt'],
    });
    const feed = feedRows.map((r) => ({
      id: r.id,
      tipe: r.action,
      // Frontend membaca `pesan`; fallback ke aksi+aktor bila summary kosong
      // agar item feed tidak tampil hanya berisi jam tanpa teks.
      pesan:
        r.summary ??
        `${r.action}${r.userName ? ` oleh ${r.userName}` : ''}`,
      aktor: r.userName,
      waktu: r.createdAt,
    }));

    return { tanggal: tgl, guruStatus, kbm, siswa, perluPerhatian, feed };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAPORAN HARIAN GURU
  // GET /api/admin/laporan/harian-guru?dari=&sampai=&guruId?
  // ─────────────────────────────────────────────────────────────────────────

  async laporanHarianGuru(params: {
    dari: string;
    sampai: string;
    guruId?: number;
    page?: number;
    limit?: number;
  }) {
    const { dari, sampai } = params;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const offset = (page - 1) * limit;

    // Semua guru aktif (atau satu guru tertentu)
    const guruWhere: any = { status: 'aktif' };
    if (params.guruId) guruWhere.id = params.guruId;
    const guruList = await this.guruRepo.find({
      where: guruWhere,
      select: ['id', 'nama', 'nip'],
      order: { nama: 'ASC' },
      skip: offset,
      take: limit,
    });
    const guruTotal = await this.guruRepo.count({ where: guruWhere });
    const guruIds = guruList.map((g) => g.id);
    if (guruIds.length === 0) return { total: 0, page, limit, data: [] };

    const tanggalList = dateRange(dari, sampai);

    // BATCH: presensi semua guru dalam rentang
    const phgRows = await this.phgRepo.find({
      where: { guruId: In(guruIds), tanggal: In(tanggalList) as any },
      select: ['guruId', 'tanggal', 'status'],
    });
    const phgMapKey = (gId: number, tgl: string) => `${gId}:${tgl}`;
    const phgMap = new Map(phgRows.map((p) => [phgMapKey(p.guruId, p.tanggal), p]));

    // BATCH: izin DISETUJUI dalam rentang (mulai ≤ sampai AND selesai ≥ dari)
    const izinRows = await this.izinRepo
      .createQueryBuilder('iz')
      .where('iz.guruId IN (:...guruIds)', { guruIds })
      .andWhere("iz.status = 'DISETUJUI'")
      .andWhere('iz.mulaiTanggal <= :sampai', { sampai })
      .andWhere('iz.selesaiTanggal >= :dari', { dari })
      .getMany();

    // BATCH: libur dalam rentang
    const liburRows = await this.liburRepo.find({
      where: { tanggal: In(tanggalList) as any },
      select: ['tanggal'],
    });
    const liburSet = new Set(liburRows.map((l) => l.tanggal as string));

    // BATCH: penugasan guru → jadwal_kbm
    const penugasanList = await this.penugasanRepo.find({
      where: { guruId: In(guruIds) },
      select: ['id', 'guruId'],
    });
    const penugasanIds = penugasanList.map((p) => p.id);
    const jadwalRows = penugasanIds.length
      ? await this.jadwalRepo.find({
          where: { penugasanId: In(penugasanIds) },
          select: ['id', 'penugasanId', 'hari'],
        })
      : [];

    // Build punyaJadwalSet per hari (Map<hari, Set<guruId>>)
    const hariGuruMap = new Map<number, Set<number>>();
    for (const j of jadwalRows) {
      const p = penugasanList.find((pen) => pen.id === j.penugasanId);
      if (!p) continue;
      if (!hariGuruMap.has(j.hari)) hariGuruMap.set(j.hari, new Set());
      hariGuruMap.get(j.hari)!.add(p.guruId);
    }

    // Hitung agregat per guru
    const data = guruList.map((g) => {
      const counts: Record<StatusHarian, number> = {
        HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, DINAS: 0, ALPHA: 0, LIBUR: 0, KOSONG: 0,
      };
      let hariWajib = 0;
      let hariHadir = 0;

      for (const tgl of tanggalList) {
        const hari = hariOfTgl(tgl);
        const punyaJadwalSet = hariGuruMap.get(hari) ?? new Set<number>();
        const izinAktifMap = new Map<number, IzinGuru>();
        for (const iz of izinRows) {
          if (iz.guruId === g.id && iz.mulaiTanggal <= tgl && iz.selesaiTanggal >= tgl) {
            izinAktifMap.set(g.id, iz);
          }
        }
        const ph = phgMap.get(phgMapKey(g.id, tgl)) ?? null;
        const status = deriveStatusHarian(g.id, tgl, {
          liburSet,
          izinAktifMap,
          presensiMap: ph ? new Map([[g.id, { status: ph.status }]]) : new Map(),
          punyaJadwalSet,
        });
        counts[status]++;
        if (status !== 'LIBUR') {
          hariWajib++;
          if (status === 'HADIR' || status === 'TERLAMBAT') hariHadir++;
        }
      }

      const pctHadir = hariWajib > 0 ? Math.round((hariHadir / hariWajib) * 100) : null;
      return {
        guruId: g.id,
        nama: g.nama,
        nip: g.nip,
        ...counts,
        hariWajib,
        hariHadir,
        pctHadir,
      };
    });

    return { total: guruTotal, page, limit, dari, sampai, data };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAPORAN KETERLAKSANAAN KBM
  // GET /api/admin/laporan/keterlaksanaan-kbm?dari=&sampai=&guruId?&kelasId?&mapelId?
  // ─────────────────────────────────────────────────────────────────────────

  async laporanKeterlaksanaanKbm(params: {
    dari: string;
    sampai: string;
    guruId?: number;
    kelasId?: number;
    mapelId?: number;
    page?: number;
    limit?: number;
  }) {
    const { dari, sampai } = params;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));

    // Agregat via QueryBuilder: GROUP BY penugasan (guru, kelas, mapel)
    const qb = this.sesiRepo
      .createQueryBuilder('sesi')
      .innerJoin('sesi.jadwalKbm', 'jadwal')
      .innerJoin('jadwal.penugasan', 'pen')
      .innerJoin('pen.guru', 'guru')
      .innerJoin('pen.kelas', 'kelas')
      .innerJoin('pen.mapel', 'mapel')
      .select('pen.id', 'penugasanId')
      .addSelect('guru.id', 'guruId')
      .addSelect('guru.nama', 'guruNama')
      .addSelect('kelas.id', 'kelasId')
      .addSelect('kelas.nama', 'kelasNama')
      .addSelect('mapel.id', 'mapelId')
      .addSelect('mapel.nama', 'mapelNama')
      .addSelect('COUNT(DISTINCT sesi.id)', 'terlaksana')
      .where('sesi.tanggal >= :dari', { dari })
      .andWhere('sesi.tanggal <= :sampai', { sampai })
      .groupBy('pen.id, guru.id, guru.nama, kelas.id, kelas.nama, mapel.id, mapel.nama')
      .orderBy('guru.nama', 'ASC');

    if (params.guruId) qb.andWhere('pen.guruId = :guruId', { guruId: params.guruId });
    if (params.kelasId) qb.andWhere('pen.kelasId = :kelasId', { kelasId: params.kelasId });
    if (params.mapelId) qb.andWhere('pen.mapelId = :mapelId', { mapelId: params.mapelId });

    const allRows = await qb.getRawMany();
    const total = allRows.length;

    // Total KBM dijadwalkan dalam rentang: hitung hari × jadwal hari tertentu
    const tanggalList = dateRange(dari, sampai);
    const hariCount = new Map<number, number>(); // hari → jumlah hari dalam rentang
    for (const tgl of tanggalList) {
      const h = hariOfTgl(tgl);
      hariCount.set(h, (hariCount.get(h) ?? 0) + 1);
    }

    // Untuk setiap penugasan → hitung total_jadwal
    const penugasanIdList = allRows.map((r) => Number(r.penugasanId));
    const jadwalAll = penugasanIdList.length
      ? await this.jadwalRepo.find({
          where: { penugasanId: In(penugasanIdList) },
          select: ['id', 'penugasanId', 'hari'],
        })
      : [];
    const jadwalByPen = new Map<number, number[]>();
    for (const j of jadwalAll) {
      if (!jadwalByPen.has(j.penugasanId)) jadwalByPen.set(j.penugasanId, []);
      jadwalByPen.get(j.penugasanId)!.push(j.hari);
    }

    const rows = allRows.map((r) => {
      const penId = Number(r.penugasanId);
      const hariList = jadwalByPen.get(penId) ?? [];
      const totalJadwal = hariList.reduce((sum, h) => sum + (hariCount.get(h) ?? 0), 0);
      const terlaksana = Number(r.terlaksana);
      const pct = totalJadwal > 0 ? Math.round((terlaksana / totalJadwal) * 100) : null;
      return {
        penugasanId: penId,
        guruId: Number(r.guruId),
        guruNama: r.guruNama,
        kelasId: Number(r.kelasId),
        kelasNama: r.kelasNama,
        mapelId: Number(r.mapelId),
        mapelNama: r.mapelNama,
        totalJadwal,
        terlaksana,
        kosong: Math.max(0, totalJadwal - terlaksana),
        pctTerlaksana: pct,
      };
    });

    const paginated = rows.slice((page - 1) * limit, page * limit);
    return { total, page, limit, dari, sampai, data: paginated };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAPORAN SISWA
  // GET /api/admin/laporan/siswa?dari=&sampai=&kelasId?&mapelId?
  // ─────────────────────────────────────────────────────────────────────────

  async laporanSiswa(params: {
    dari: string;
    sampai: string;
    kelasId?: number;
    mapelId?: number;
    page?: number;
    limit?: number;
  }) {
    const { dari, sampai } = params;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));

    // Agregat: JOIN presensi_siswa → presensi_sesi → jadwal_kbm → penugasan → kelas/mapel → siswa
    const qb = this.pSiswaRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.presensiSesi', 'sesi')
      .innerJoin('sesi.jadwalKbm', 'jadwal')
      .innerJoin('jadwal.penugasan', 'pen')
      .innerJoin('ps.siswa', 'siswa')
      .select('siswa.id', 'siswaId')
      .addSelect('siswa.nama', 'siswaNama')
      .addSelect('siswa.nis', 'nis')
      .addSelect('ps.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('sesi.tanggal >= :dari', { dari })
      .andWhere('sesi.tanggal <= :sampai', { sampai })
      .groupBy('siswa.id, siswa.nama, siswa.nis, ps.status')
      .orderBy('siswa.nama', 'ASC');

    if (params.kelasId) {
      qb.andWhere('pen.kelasId = :kelasId', { kelasId: params.kelasId });
    }
    if (params.mapelId) {
      qb.andWhere('pen.mapelId = :mapelId', { mapelId: params.mapelId });
    }

    const rawRows = await qb.getRawMany();

    // Pivot: per siswa
    const siswaMap = new Map<
      number,
      { siswaId: number; siswaNama: string; nis: string; H: number; S: number; I: number; A: number; T: number; total: number }
    >();

    for (const r of rawRows) {
      const id = Number(r.siswaId);
      if (!siswaMap.has(id)) {
        siswaMap.set(id, { siswaId: id, siswaNama: r.siswaNama, nis: r.nis, H: 0, S: 0, I: 0, A: 0, T: 0, total: 0 });
      }
      const entry = siswaMap.get(id)!;
      const cnt = Number(r.count);
      const st = (r.status as string).toUpperCase() as 'H' | 'S' | 'I' | 'A' | 'T';
      entry[st] = (entry[st] ?? 0) + cnt;
      entry.total += cnt;
    }

    const allData = [...siswaMap.values()].map((e) => ({
      ...e,
      pctHadir: e.total > 0 ? Math.round(((e.H + e.T + e.I) / e.total) * 100) : null,
    }));

    const total = allData.length;
    const data = allData.slice((page - 1) * limit, page * limit);
    return { total, page, limit, dari, sampai, data };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REKAP BULANAN GURU (untuk TU)
  // GET /api/tu/rekap-guru?bulan=YYYY-MM
  // Reuse laporanHarianGuru dengan dari=awal bulan, sampai=akhir bulan.
  // ─────────────────────────────────────────────────────────────────────────

  async rekapBulananGuru(params: {
    bulan: string; // format: YYYY-MM
    guruId?: number;
    page?: number;
    limit?: number;
  }) {
    // Parse YYYY-MM → dari & sampai
    const [tahun, bulanStr] = params.bulan.split('-').map(Number);
    if (!tahun || !bulanStr || bulanStr < 1 || bulanStr > 12) {
      throw new BadRequestException('Format bulan tidak valid, gunakan YYYY-MM');
    }
    const dari = `${params.bulan}-01`;
    // Akhir bulan: hari pertama bulan berikutnya - 1 hari
    const akhirDate = new Date(Date.UTC(tahun, bulanStr, 0)); // bulanStr = index bulan (1-12) → bulanStr sebagai 0-indexed = benar
    const sampai = akhirDate.toISOString().slice(0, 10);

    return this.laporanHarianGuru({
      dari,
      sampai,
      guruId: params.guruId,
      page: params.page ?? 1,
      limit: params.limit ?? 200, // TU butuh semua guru dalam satu rekap
    });
  }
}

