import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { PresensiHarianGuru } from './presensi-harian-guru.entity';
import { Guru } from '../guru/guru.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { AuditService } from '../audit/audit.service';
import { formatDateWIB, todayWIB, WIB } from '../common/wib.util';
import { toZonedTime } from 'date-fns-tz';
import { EnrollWajahDto } from './dto/enroll-wajah.dto';
import { ScanDto } from './dto/scan.dto';
import { ManualDto } from './dto/manual.dto';

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
    };
  }

  /**
   * PUT /api/guru/wajah — enroll wajah sendiri.
   */
  async enrollDiri(req: Request, dto: EnrollWajahDto) {
    const guru = await this.guruDariReq(req);
    return this._simpanEmbeddings(guru, dto.embeddings, req, 'diri');
  }

  /**
   * GET /api/admin/wajah?q=&page=&limit= — daftar guru + status enroll (admin).
   */
  async daftarWajahAdmin(q?: string, page = 1, limit = 50) {
    const pageN = Math.max(1, page);
    const limitN = Math.min(200, Math.max(1, limit));

    const qb = this.guruRepo
      .createQueryBuilder('g')
      .select([
        'g.id',
        'g.nama',
        'g.nip',
        'g.fotoUrl',
        'g.status',
        'g.faceEmbeddings',
        'g.faceUpdatedAt',
      ])
      .orderBy('g.nama', 'ASC')
      .skip((pageN - 1) * limitN)
      .take(limitN);

    if (q && q.trim()) {
      qb.where('g.nama ILIKE :q OR g.nip ILIKE :q', { q: `%${q.trim()}%` });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((g) => ({
        id: g.id,
        nama: g.nama,
        nip: g.nip,
        fotoUrl: g.fotoUrl,
        status: g.status,
        enrolled: Array.isArray(g.faceEmbeddings) && g.faceEmbeddings.length > 0,
        poses: g.faceEmbeddings?.length ?? 0,
        faceUpdatedAt: g.faceUpdatedAt?.toISOString() ?? null,
      })),
      total,
      page: pageN,
      limit: limitN,
    };
  }

  /**
   * PUT /api/admin/wajah/:guruId — enroll wajah utk guru tertentu.
   */
  async enrollAdmin(guruId: number, dto: EnrollWajahDto, req: Request) {
    const guru = await this.guruRepo.findOne({ where: { id: guruId } });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    return this._simpanEmbeddings(guru, dto.embeddings, req, 'admin');
  }

  /**
   * DELETE /api/admin/wajah/:guruId — clear faceEmbeddings (privasi).
   */
  async hapusWajah(guruId: number, req: Request) {
    const guru = await this.guruRepo.findOne({ where: { id: guruId } });
    if (!guru) throw new NotFoundException('Guru tidak ditemukan');
    guru.faceEmbeddings = null;
    guru.faceUpdatedAt = null;
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
    aktor: 'diri' | 'admin',
  ) {
    const { minPoses } = await this.wajahConfig();
    if (embeddings.length < minPoses) {
      throw new BadRequestException(`Minimal ${minPoses} pose wajah untuk enrollment`);
    }
    guru.faceEmbeddings = embeddings;
    guru.faceUpdatedAt = new Date();
    await this.guruRepo.save(guru);
    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: 'ENROLL_WAJAH',
      resource: 'guru',
      resourceId: String(guru.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Mendaftarkan wajah ${guru.nama} (${aktor}, ${embeddings.length} pose)`,
    });
    return { ok: true, poses: embeddings.length };
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

  // ────── Monitor admin ──────

  /**
   * GET /api/admin/presensi-guru/harian?tanggal= — semua guru + status hari itu.
   * Batch query (anti N+1): LEFT JOIN presensi_harian_guru.
   */
  async monitorHarian(tanggal?: string) {
    const tgl = tanggal ?? formatDateWIB(todayWIB());

    // Batch: semua guru aktif + presensi hari itu (LEFT JOIN)
    const rows = await this.guruRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect(
        'g.presensiHarian',
        'ph',
        'ph.tanggal = :tgl',
        { tgl },
      )
      .where("g.status = 'aktif'")
      .orderBy('g.nama', 'ASC')
      .select([
        'g.id',
        'g.nama',
        'g.nip',
        'g.fotoUrl',
        'ph.id',
        'ph.tanggal',
        'ph.checkInAt',
        'ph.checkOutAt',
        'ph.status',
        'ph.source',
        'ph.distanceMeter',
        'ph.similarity',
        'ph.alasan',
      ])
      .getMany();

    return {
      tanggal: tgl,
      data: rows.map((g) => {
        const ph = (g as any).presensiHarian as PresensiHarianGuru | null;
        return {
          guruId: g.id,
          nama: g.nama,
          nip: g.nip,
          fotoUrl: g.fotoUrl,
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
