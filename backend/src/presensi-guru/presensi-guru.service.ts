import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Request } from 'express';
import { PresensiHarianGuru } from './presensi-harian-guru.entity';
import { Guru } from '../guru/guru.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { KalenderLibur } from '../kurikulum/kalender-libur.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { AuditService } from '../audit/audit.service';
import { formatDateWIB, todayWIB, WIB } from '../common/wib.util';
import { toZonedTime } from 'date-fns-tz';
import { EnrollWajahDto } from './dto/enroll-wajah.dto';
import { ScanDto } from './dto/scan.dto';
import { ManualDto } from './dto/manual.dto';
import { IzinService, deriveStatusHarian } from '../izin/izin.service';

// ─────────────────────────────────────────────
// Pure math helpers (no deps, pure Node)
// ─────────────────────────────────────────────

/**
 * Cosine similarity antara dua vektor.
 * Return: -1..1; di atas threshold = match.
 */
function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Haversine distance (meter) antara dua titik GPS.
 */
function haversineMeter(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000; // radius bumi (meter)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable()
export class PresensiGuruService {
  constructor(
    @InjectRepository(PresensiHarianGuru)
    private readonly hadrianRepo: Repository<PresensiHarianGuru>,
    @InjectRepository(Guru)
    private readonly guruRepo: Repository<Guru>,
    @InjectRepository(Pengaturan)
    private readonly pengaturanRepo: Repository<Pengaturan>,
    @InjectRepository(KalenderLibur)
    private readonly liburRepo: Repository<KalenderLibur>,
    @InjectRepository(JadwalKbm)
    private readonly jadwalRepo: Repository<JadwalKbm>,
    @InjectRepository(Penugasan)
    private readonly penugasanRepo: Repository<Penugasan>,
    private readonly izinService: IzinService,
    private readonly audit: AuditService,
  ) {}

  // ────── Internal helpers ──────

  private async guruDariReq(req: Request): Promise<Guru> {
    const userId = (req as any).user?.id ?? req.session?.userId;
    const guru = await this.guruRepo.findOne({ where: { userId } });
    if (!guru) throw new ForbiddenException('Akun Anda tidak tertaut ke data guru');
    return guru;
  }

  private async getPengaturanValue(key: string): Promise<any> {
    const row = await this.pengaturanRepo.findOne({ where: { key } });
    return row?.value ?? null;
  }

  private async wajahConfig(): Promise<{ threshold: number; minPoses: number }> {
    const v: any = await this.getPengaturanValue('wajah');
    return {
      threshold: typeof v?.threshold === 'number' ? v.threshold : 0.6,
      minPoses: typeof v?.minPoses === 'number' ? v.minPoses : 3,
    };
  }

  private async lokasiConfig(): Promise<{
    aktif: boolean;
    lat: number;
    lng: number;
    radiusMeter: number;
  }> {
    const v: any = await this.getPengaturanValue('lokasi');
    return {
      aktif: v?.aktif ?? false,
      lat: v?.lat ?? 0,
      lng: v?.lng ?? 0,
      radiusMeter: v?.radiusMeter ?? 100,
    };
  }

  private async jamPresensiConfig(): Promise<{
    jamMasuk: string;
    toleransiMenit: number;
  }> {
    const v: any = await this.getPengaturanValue('jam_presensi');
    return {
      jamMasuk: v?.jamMasuk ?? '06:30',
      toleransiMenit: v?.toleransiMenit ?? 15,
    };
  }

  /**
   * Derivasi HADIR/TERLAMBAT dari waktu check-in WIB vs jamMasuk + toleransi.
   * checkInAt = Date (UTC); kita konversi ke WIB untuk perbandingan string HH:MM.
   */
  private deriveStatus(
    checkInAt: Date,
    jamMasuk: string,
    toleransiMenit: number,
  ): 'HADIR' | 'TERLAMBAT' {
    const wibNow = toZonedTime(checkInAt, WIB);
    const hh = wibNow.getHours().toString().padStart(2, '0');
    const mm = wibNow.getMinutes().toString().padStart(2, '0');
    const jamCheckin = `${hh}:${mm}`;

    // Batas: jamMasuk + toleransiMenit (string HH:MM → total menit)
    const toMenit = (jam: string) => {
      const [h, m] = jam.split(':').map(Number);
      return h * 60 + m;
    };
    const batasMenit = toMenit(jamMasuk) + toleransiMenit;
    const checkinMenit = toMenit(jamCheckin);
    return checkinMenit <= batasMenit ? 'HADIR' : 'TERLAMBAT';
  }

  // ────── Enrollment API ──────

  /**
   * GET /api/guru/wajah/status — status wajah diri sendiri.
   */
  async statusWajahDiri(req: Request) {
    const guru = await this.guruDariReq(req);
    return {
      enrolled: Array.isArray(guru.faceEmbeddings) && guru.faceEmbeddings.length > 0,
      poses: guru.faceEmbeddings?.length ?? 0,
      faceUpdatedAt: guru.faceUpdatedAt?.toISOString() ?? null,
      faceStatus: guru.faceStatus ?? 'BELUM',
    };
  }


  /**
   * PUT /api/guru/wajah — enroll wajah sendiri.
   */
  async enrollDiri(req: Request, dto: EnrollWajahDto) {
    const guru = await this.guruDariReq(req);
    return this._simpanEmbeddings(guru, dto.embeddings, req);
  }

  /**
   * DELETE /api/admin/wajah/:guruId — clear faceEmbeddings (privasi).
   */
  async hapusWajah(guruId: number, req: Request) {
    const guru = await this.guruRepo.findOne({ where: { id: guruId } });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    guru.faceEmbeddings = null;
    guru.faceUpdatedAt = null;
    guru.faceStatus = 'BELUM';
    await this.guruRepo.save(guru);
    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: 'HAPUS_WAJAH',
      resource: 'guru',
      resourceId: String(guruId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Menghapus data wajah ${guru.nama}`,
    });
    return { ok: true, guruId, pesan: `Data wajah ${guru.nama} berhasil dihapus` };
  }

  private async _simpanEmbeddings(
    guru: Guru,
    embeddings: number[][],
    req: Request,
  ) {
    const { minPoses } = await this.wajahConfig();
    if (embeddings.length < minPoses) {
      throw new BadRequestException(`Minimal ${minPoses} pose wajah untuk enrollment`);
    }
    guru.faceEmbeddings = embeddings;
    guru.faceUpdatedAt = new Date();
    // Enrollment mandiri selalu MENUNGGU_VALIDASI; admin validasi via PATCH.
    guru.faceStatus = 'MENUNGGU_VALIDASI';
    await this.guruRepo.save(guru);
    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: 'ENROLL_WAJAH',
      resource: 'guru',
      resourceId: String(guru.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Mendaftarkan wajah ${guru.nama} (mandiri, ${embeddings.length} pose)`,
    });
    return { ok: true, poses: embeddings.length, faceStatus: guru.faceStatus };
  }

  /**
   * UX-POLISH D — Admin validasi wajah guru.
   * PATCH /api/admin/guru/:id/wajah/validasi { aksi: 'terima' | 'tolak' }
   */
  async validasiWajah(
    guruId: number,
    aksi: 'terima' | 'tolak',
    req: Request,
  ) {
    const guru = await this.guruRepo.findOne({ where: { id: guruId } });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    if (!guru.faceEmbeddings || guru.faceEmbeddings.length === 0) {
      throw new BadRequestException('Guru belum memiliki embedding wajah untuk divalidasi');
    }
    guru.faceStatus = aksi === 'terima' ? 'TERVALIDASI' : 'DITOLAK';
    // Saat DITOLAK: kosongkan embeddings agar guru wajib enroll ulang.
    if (aksi === 'tolak') {
      guru.faceEmbeddings = null;
      guru.faceUpdatedAt = null;
    }
    await this.guruRepo.save(guru);
    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: aksi === 'terima' ? 'VALIDASI_WAJAH_TERIMA' : 'VALIDASI_WAJAH_TOLAK',
      resource: 'guru',
      resourceId: String(guruId),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Admin ${aksi === 'terima' ? 'menerima' : 'menolak'} validasi wajah ${guru.nama}`,
    });
    return { ok: true, guruId, faceStatus: guru.faceStatus };
  }

  // ────── Scan API (alur 6 langkah F3-SPEC) ──────

  /**
   * POST /api/guru/presensi-scan — scan presensi mandiri 1:1.
   */
  async scan(req: Request, dto: ScanDto) {
    // 1. Ambil guru login.
    const guru = await this.guruDariReq(req);
    if (!Array.isArray(guru.faceEmbeddings) || guru.faceEmbeddings.length === 0) {
      throw new BadRequestException('Wajah Anda belum didaftarkan');
    }

    // Guard faceStatus — hanya TERVALIDASI yang boleh scan.
    if (guru.faceStatus !== 'TERVALIDASI') {
      const pesan =
        guru.faceStatus === 'DITOLAK'
          ? 'Pendaftaran wajah Anda ditolak — daftar ulang'
          : 'Wajah Anda belum divalidasi admin';
      throw new ForbiddenException(pesan);
    }

    // 2. Geofence (jika lokasi.aktif).
    const lokasi = await this.lokasiConfig();
    let distanceMeter: number | null = null;
    if (lokasi.aktif) {
      if (dto.lat == null || dto.lng == null) {
        throw new BadRequestException(
          'Lokasi GPS diperlukan — aktifkan izin lokasi di browser Anda',
        );
      }
      distanceMeter = haversineMeter(dto.lat, dto.lng, lokasi.lat, lokasi.lng);
      if (distanceMeter > lokasi.radiusMeter) {
        throw new ForbiddenException(
          `Anda berada di luar area sekolah (${Math.round(distanceMeter)} m dari sekolah, batas ${lokasi.radiusMeter} m)`,
        );
      }
    }

    // 3. Cosine similarity max across semua pose enrollment.
    const similarity = Math.max(
      ...guru.faceEmbeddings.map((ref) => cosine(dto.embedding, ref)),
    );
    const { threshold } = await this.wajahConfig();
    if (similarity < threshold) {
      throw new UnauthorizedException(
        `Wajah tidak dikenali (skor ${similarity.toFixed(3)}, minimum ${threshold})`,
      );
    }

    // 4. Derivasi HADIR/TERLAMBAT.
    const now = new Date();
    const tanggal = formatDateWIB(todayWIB());
    const { jamMasuk, toleransiMenit } = await this.jamPresensiConfig();
    const mode = dto.mode ?? 'masuk';

    // 5. Upsert presensi_harian_guru UNIQUE(guruId, tanggal).
    let record = await this.hadrianRepo.findOne({
      where: { guruId: guru.id, tanggal },
    });

    let pesan: string;

    if (!record) {
      // Record baru — check-in
      const status = this.deriveStatus(now, jamMasuk, toleransiMenit);
      record = this.hadrianRepo.create({
        guruId: guru.id,
        tanggal,
        checkInAt: now,
        checkOutAt: null,
        status,
        source: 'HP',
        distanceMeter,
        similarity,
        alasan: null,
      });
      await this.hadrianRepo.save(record);
      const wibStr = toZonedTime(now, WIB)
        .toTimeString()
        .substring(0, 5);
      pesan = `Check-in tercatat: ${wibStr} — ${status}`;
    } else if (mode === 'pulang' || record.checkInAt) {
      // Scan ulang
      if (record.checkOutAt && mode !== 'pulang') {
        // Idempotent: sudah check-in
        const wibStr = toZonedTime(record.checkInAt!, WIB)
          .toTimeString()
          .substring(0, 5);
        return {
          status: record.status,
          checkInAt: record.checkInAt,
          checkOutAt: record.checkOutAt,
          similarity,
          distanceMeter,
          pesan: `Sudah tercatat ${wibStr}`,
        };
      }
      if (mode === 'pulang' && !record.checkOutAt) {
        record.checkOutAt = now;
        record.similarity = similarity;
        record.distanceMeter = distanceMeter;
        await this.hadrianRepo.save(record);
        const wibStr = toZonedTime(now, WIB).toTimeString().substring(0, 5);
        pesan = `Check-out tercatat: ${wibStr}`;
      } else {
        // Scan ganda check-in → idempotent
        const wibStr = toZonedTime(record.checkInAt!, WIB)
          .toTimeString()
          .substring(0, 5);
        return {
          status: record.status,
          checkInAt: record.checkInAt,
          checkOutAt: record.checkOutAt,
          similarity,
          distanceMeter,
          pesan: `Sudah tercatat ${wibStr}`,
        };
      }
    } else {
      pesan = 'Sudah tercatat';
    }

    // 6. Audit.
    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: mode === 'pulang' ? 'PRESENSI_GURU_CHECKOUT' : 'PRESENSI_GURU_CHECKIN',
      resource: 'presensi_harian_guru',
      resourceId: String(record.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `${guru.nama} — ${pesan} (similarity ${similarity.toFixed(3)})`,
    });

    return {
      status: record.status,
      checkInAt: record.checkInAt,
      checkOutAt: record.checkOutAt,
      similarity,
      distanceMeter,
      pesan,
    };
  }

  /**
   * GET /api/admin/presensi-guru/harian?tanggal= — semua guru + statusHarian turunan.
   *
   * F4a UPGRADE (anti-N+1, 4 query batch):
   * Q1. Semua guru aktif.
   * Q2. Presensi_harian_guru di tanggal → Map<guruId, ph>.
   * Q3. Izin DISETUJUI yang overlap tanggal → Map<guruId, izin>.
   * Q4. guruIds yang punya jadwal_kbm di hariWIB → Set<guruId>.
   * Lalu: kalender_libur → Set<tanggal>.
   * Helper deriveStatusHarian() dipanggil per baris (pure, tanpa query).
   */
  async monitorHarian(tanggal?: string) {
    const tgl = tanggal ?? formatDateWIB(todayWIB());

    // Q1: semua guru aktif
    const guruList = await this.guruRepo.find({
      where: { status: 'aktif' as any },
      order: { nama: 'ASC' },
      select: ['id', 'nama', 'nip', 'fotoUrl'],
    });
    const guruIds = guruList.map((g) => g.id);

    if (guruIds.length === 0) return { tanggal: tgl, data: [] };

    // Q2: presensi hari itu (batch)
    const presensiRows = await this.hadrianRepo.find({
      where: { guruId: In(guruIds), tanggal: tgl },
    });
    const presensiMap = new Map<number, PresensiHarianGuru>();
    for (const ph of presensiRows) presensiMap.set(ph.guruId, ph);

    // Q3: izin DISETUJUI overlap tanggal (batch via IzinService)
    const izinAktifMap = await this.izinService.batchIzinAktif(guruIds, tgl);

    // Q4: guru yang punya jadwal_kbm di hariWIB
    // jadwal_kbm.hari: 0=Minggu, 1=Sen, ..., 6=Sab (JS Date.getDay() style)
    const dateObj = new Date(tgl + 'T00:00:00+07:00');
    const hariWIB = dateObj.getDay(); // 0-6
    const penugasanList = await this.penugasanRepo.find({
      where: { guruId: In(guruIds) },
      select: ['id', 'guruId'],
    });
    const penugasanIds = penugasanList.map((p) => p.id);
    let punyaJadwalSet = new Set<number>();
    if (penugasanIds.length > 0) {
      const jadwalRows = await this.jadwalRepo.find({
        where: { penugasanId: In(penugasanIds), hari: hariWIB },
        select: ['id', 'penugasanId'],
      });
      const penugasanIdSet = new Set(jadwalRows.map((j) => j.penugasanId));
      for (const p of penugasanList) {
        if (penugasanIdSet.has(p.id)) punyaJadwalSet.add(p.guruId);
      }
    }

    // Q5: libur tanggal ini (satu query)
    const liburRow = await this.liburRepo.findOne({ where: { tanggal: tgl } as any });
    const liburSet = new Set<string>(liburRow ? [tgl] : []);

    // Derive status per guru (pure helper, tanpa query)
    return {
      tanggal: tgl,
      data: guruList.map((g) => {
        const ph = presensiMap.get(g.id) ?? null;
        const statusHarian = deriveStatusHarian(g.id, tgl, {
          liburSet,
          izinAktifMap,
          presensiMap: ph
            ? new Map([[g.id, { status: ph.status }]])
            : new Map(),
          punyaJadwalSet,
        });
        return {
          guruId: g.id,
          nama: g.nama,
          nip: g.nip,
          fotoUrl: g.fotoUrl,
          statusHarian,
          presensi: ph
            ? {
                id: ph.id,
                checkInAt: ph.checkInAt,
                checkOutAt: ph.checkOutAt,
                status: ph.status,
                source: ph.source,
                distanceMeter: ph.distanceMeter,
                similarity: ph.similarity,
                alasan: ph.alasan,
              }
            : null,
        };
      }),
    };
  }

  /**
   * GET /api/admin/presensi-guru/detail?guruId=&tanggal=
   * Detail presensi satu guru untuk satu tanggal: data guru, status,
   * check-in/out, jadwal KBM hari itu, izin aktif (bila ada), riwayat
   * presensi 7 hari terakhir. Untuk sub-detail mobile (UX-POLISH §J).
   */
  async detailPresensiGuru(guruId: number, tanggal?: string) {
    const tgl = tanggal ?? formatDateWIB(todayWIB());

    const guru = await this.guruRepo.findOne({
      where: { id: guruId },
      select: ['id', 'nama', 'nip', 'fotoUrl', 'status'],
    });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');

    // Presensi hari itu
    const ph = await this.hadrianRepo.findOne({
      where: { guruId, tanggal: tgl },
    });

    // Status harian (reuse deriveStatusHarian via monitorHarian untuk konsistensi)
    const monitor = await this.monitorHarian(tgl);
    const row = monitor.data.find((r) => r.guruId === guruId);
    const statusHarian = row?.statusHarian ?? 'TANPA_KBM';

    // Izin aktif
    const izinAktifMap = await this.izinService.batchIzinAktif([guruId], tgl);
    const izinAktif = izinAktifMap.get(guruId) ?? null;

    // Jadwal KBM hari itu
    const dateObj = new Date(tgl + 'T00:00:00+07:00');
    const hariWIB = dateObj.getDay();
    const penugasanList = await this.penugasanRepo.find({
      where: { guruId },
      relations: ['mapel', 'kelas'],
    });
    const jadwalRows = penugasanList.length > 0
      ? await this.jadwalRepo.find({
          where: { penugasanId: In(penugasanList.map((p) => p.id)), hari: hariWIB },
          order: { jamMulai: 'ASC' },
        })
      : [];
    const jadwalKBM = jadwalRows.map((j) => {
      const pt = penugasanList.find((p) => p.id === j.penugasanId);
      return {
        id: j.id,
        jamMulai: j.jamMulai,
        jamSelesai: j.jamSelesai,
        mapel: pt?.mapel?.nama ?? '—',
        kelas: pt?.kelas?.nama ?? '—',
      };
    });

    // Riwayat 7 hari terakhir
    const riwayat: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(dateObj.getTime() - i * 86400000);
      const tglI = formatDateWIB(d);
      const phI = await this.hadrianRepo.findOne({ where: { guruId, tanggal: tglI } });
      riwayat.push({
        tanggal: tglI,
        status: phI?.status ?? null,
        checkInAt: phI?.checkInAt ?? null,
        checkOutAt: phI?.checkOutAt ?? null,
        source: phI?.source ?? null,
      });
    }

    return {
      guru,
      tanggal: tgl,
      statusHarian,
      presensi: ph
        ? {
            id: ph.id,
            checkInAt: ph.checkInAt,
            checkOutAt: ph.checkOutAt,
            status: ph.status,
            source: ph.source,
            distanceMeter: ph.distanceMeter,
            similarity: ph.similarity,
            alasan: ph.alasan,
          }
        : null,
      izinAktif,
      jadwalKBM,
      riwayat,
    };
  }

  /**
   * POST /api/admin/presensi-guru/manual — upsert record manual admin.
   */
  async manualAdmin(dto: ManualDto, req: Request) {
    const guru = await this.guruRepo.findOne({ where: { id: dto.guruId } });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');

    let record = await this.hadrianRepo.findOne({
      where: { guruId: dto.guruId, tanggal: dto.tanggal },
    });

    if (!record) {
      record = this.hadrianRepo.create({
        guruId: dto.guruId,
        tanggal: dto.tanggal,
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
        status: dto.status,
        source: 'MANUAL',
        distanceMeter: null,
        similarity: null,
        alasan: dto.alasan,
      });
    } else {
      record.status = dto.status;
      record.source = 'MANUAL';
      record.alasan = dto.alasan;
      if (dto.checkInAt) record.checkInAt = new Date(dto.checkInAt);
      if (dto.checkOutAt) record.checkOutAt = new Date(dto.checkOutAt);
    }

    await this.hadrianRepo.save(record);

    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: 'PRESENSI_GURU_MANUAL',
      resource: 'presensi_harian_guru',
      resourceId: String(record.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Input manual presensi ${guru.nama} ${dto.tanggal}: ${dto.status} — ${dto.alasan}`,
    });

    return { ok: true, id: record.id, status: record.status };
  }
}
