import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { DeviceKiosk } from './device-kiosk.entity';
import { PresensiHarianGuru } from '../presensi-guru/presensi-harian-guru.entity';
import { Guru } from '../guru/guru.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { AuditService } from '../audit/audit.service';
import { formatDateWIB, todayWIB, WIB } from '../common/wib.util';
import { toZonedTime } from 'date-fns-tz';
import { Request } from 'express';

// ────── Helpers (cosine, deriveStatus) ──────

function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function maxSimilarity(query: number[], refs: number[][]): number {
  return Math.max(...refs.map((r) => cosine(query, r)));
}

@Injectable()
export class KioskService {
  constructor(
    @InjectRepository(DeviceKiosk)
    private deviceRepo: Repository<DeviceKiosk>,
    @InjectRepository(PresensiHarianGuru)
    private hadrianRepo: Repository<PresensiHarianGuru>,
    @InjectRepository(Guru)
    private guruRepo: Repository<Guru>,
    @InjectRepository(Pengaturan)
    private pengaturanRepo: Repository<Pengaturan>,
    private audit: AuditService,
  ) {}

  // ────── Config helpers ──────

  private async wajahConfig(): Promise<{
    threshold: number;
    margin: number;
    minPoses: number;
  }> {
    const row = await this.pengaturanRepo.findOne({ where: { key: 'wajah' } });
    const v: any = row?.value ?? {};
    return {
      threshold: typeof v.threshold === 'number' ? v.threshold : 0.6,
      margin: typeof v.margin === 'number' ? v.margin : 0.05,
      minPoses: typeof v.minPoses === 'number' ? v.minPoses : 3,
    };
  }

  private async jamPresensiConfig(): Promise<{
    jamMasuk: string;
    toleransiMenit: number;
  }> {
    const row = await this.pengaturanRepo.findOne({
      where: { key: 'jam_presensi' },
    });
    const v: any = row?.value ?? {};
    return {
      jamMasuk: v.jamMasuk ?? '06:30',
      toleransiMenit: v.toleransiMenit ?? 15,
    };
  }

  private deriveStatus(
    checkInAt: Date,
    jamMasuk: string,
    toleransiMenit: number,
  ): 'HADIR' | 'TERLAMBAT' {
    const wib = toZonedTime(checkInAt, WIB);
    const hh = wib.getHours().toString().padStart(2, '0');
    const mm = wib.getMinutes().toString().padStart(2, '0');
    const toMenit = (j: string) => {
      const [h, m] = j.split(':').map(Number);
      return h * 60 + m;
    };
    return toMenit(`${hh}:${mm}`) <= toMenit(jamMasuk) + toleransiMenit
      ? 'HADIR'
      : 'TERLAMBAT';
  }

  // ────── Admin: device management ──────

  /** POST /api/admin/device-kiosk — buat perangkat + kode pairing 6 digit 10 mnt. */
  async createDevice(nama: string, req: Request) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const device = this.deviceRepo.create({
      nama,
      tokenHash: null,
      pairingCode: code,
      pairingExpiresAt: expiresAt,
      lastSeenAt: null,
    });
    await this.deviceRepo.save(device);

    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: 'CREATE_DEVICE_KIOSK',
      resource: 'device_kiosk',
      resourceId: String(device.id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Membuat perangkat kiosk "${nama}" (kode: ${code})`,
    });

    return { id: device.id, nama: device.nama, pairingCode: code, pairingExpiresAt: expiresAt };
  }

  /** GET /api/admin/device-kiosk — daftar perangkat + isOnline (< 2 mnt). */
  async listDevices() {
    const devices = await this.deviceRepo.find({ order: { nama: 'ASC' } });
    const now = Date.now();
    return devices.map((d) => ({
      id: d.id,
      nama: d.nama,
      paired: !!d.tokenHash,
      lastSeenAt: d.lastSeenAt,
      isOnline:
        d.lastSeenAt != null &&
        now - new Date(d.lastSeenAt).getTime() < 2 * 60 * 1000,
      createdAt: d.createdAt,
    }));
  }

  /** DELETE /api/admin/device-kiosk/:id — cabut perangkat (clear token). */
  async revokeDevice(id: number, req: Request) {
    const device = await this.deviceRepo.findOne({ where: { id } });
    if (!device) throw new NotFoundException('Perangkat kiosk tidak ditemukan');

    device.tokenHash = null;
    device.pairingCode = null;
    device.pairingExpiresAt = null;
    await this.deviceRepo.save(device);

    const actorId = (req as any).user?.id ?? req.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: 'REVOKE_DEVICE_KIOSK',
      resource: 'device_kiosk',
      resourceId: String(id),
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
      summary: `Mencabut perangkat kiosk "${device.nama}"`,
    });

    return { ok: true, id };
  }

  // ────── Kiosk: pairing ──────

  /**
   * POST /api/kiosk/pair (@Public) — tukar kode 6-digit → token perangkat.
   * Kode valid (tidak kadaluarsa) → generate token random → simpan hash.
   */
  async pair(pairingCode: string) {
    if (!pairingCode || pairingCode.length !== 6) {
      throw new BadRequestException('Kode pairing harus 6 digit');
    }

    const device = await this.deviceRepo.findOne({ where: { pairingCode } });
    if (!device || !device.pairingExpiresAt) {
      throw new BadRequestException('Kode pairing tidak valid');
    }
    if (new Date() > device.pairingExpiresAt) {
      throw new BadRequestException('Kode pairing sudah kadaluarsa');
    }

    // Generate token perangkat (32 byte random hex)
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    device.tokenHash = tokenHash;
    device.pairingCode = null;
    device.pairingExpiresAt = null;
    device.lastSeenAt = new Date();
    await this.deviceRepo.save(device);

    return { ok: true, deviceId: device.id, deviceToken: rawToken };
  }

  // ────── Kiosk: scan 1:N ──────

  /**
   * POST /api/kiosk/scan (DeviceAuthGuard) — match 1:N.
   * Hasil:
   *   - MATCH: best ≥ threshold DAN best−best2 ≥ margin → upsert presensi
   *   - AMBIGUOUS: best ≥ threshold TAPI gap < margin → perluVerifikasi=true
   *   - NO_MATCH: best < threshold → tolak
   */
  async scan(
    embedding: number[],
    mode: 'masuk' | 'pulang' = 'masuk',
    device: DeviceKiosk,
  ) {
    const { threshold, margin } = await this.wajahConfig();
    const { jamMasuk, toleransiMenit } = await this.jamPresensiConfig();

    // Load semua guru aktif yang sudah enroll
    const guruList = await this.guruRepo.find({
      where: { status: 'aktif' },
      select: ['id', 'nama', 'nip', 'faceEmbeddings'],
    });

    const enrolled = guruList.filter(
      (g) => Array.isArray(g.faceEmbeddings) && g.faceEmbeddings.length > 0,
    );

    if (enrolled.length === 0) {
      throw new BadRequestException('Belum ada guru yang mendaftarkan wajah');
    }

    // Hitung similarity tiap guru → ambil top-2
    const scores = enrolled.map((g) => ({
      guru: g,
      score: maxSimilarity(embedding, g.faceEmbeddings!),
    }));
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const best2 = scores[1]?.score ?? 0;
    const gap = best.score - best2;

    if (best.score < threshold) {
      return {
        hasil: 'NO_MATCH' as const,
        pesan: `Wajah tidak dikenali (skor tertinggi ${best.score.toFixed(3)}, minimum ${threshold})`,
        similarity: best.score,
      };
    }

    const now = new Date();
    const tanggal = formatDateWIB(todayWIB());

    if (gap < margin) {
      // Ambigu — simpan sebagai pending verifikasi
      const status = this.deriveStatus(now, jamMasuk, toleransiMenit);
      let record = await this.hadrianRepo.findOne({
        where: { guruId: best.guru.id, tanggal },
      });
      if (!record) {
        record = this.hadrianRepo.create({
          guruId: best.guru.id,
          tanggal,
          checkInAt: now,
          status,
          source: 'KIOSK',
          similarity: best.score,
          distanceMeter: null,
          alasan: `Ambigu: gap=${gap.toFixed(3)} < margin=${margin}`,
          perluVerifikasi: true,
        });
        await this.hadrianRepo.save(record);
      }
      return {
        hasil: 'AMBIGUOUS' as const,
        pesan: 'Wajah terdeteksi namun ambigu — menunggu verifikasi admin',
        guruId: best.guru.id,
        nama: best.guru.nama,
        similarity: best.score,
        gap,
        perluVerifikasi: true,
      };
    }

    // MATCH jelas
    let record = await this.hadrianRepo.findOne({
      where: { guruId: best.guru.id, tanggal },
    });

    let pesan: string;
    if (!record) {
      const status = this.deriveStatus(now, jamMasuk, toleransiMenit);
      record = this.hadrianRepo.create({
        guruId: best.guru.id,
        tanggal,
        checkInAt: now,
        status,
        source: 'KIOSK',
        similarity: best.score,
        distanceMeter: null,
        alasan: null,
        perluVerifikasi: false,
      });
      await this.hadrianRepo.save(record);
      const wibStr = toZonedTime(now, WIB).toTimeString().substring(0, 5);
      pesan = `Check-in ${best.guru.nama}: ${wibStr} — ${status}`;
    } else if (mode === 'pulang' && !record.checkOutAt) {
      record.checkOutAt = now;
      record.similarity = best.score;
      await this.hadrianRepo.save(record);
      const wibStr = toZonedTime(now, WIB).toTimeString().substring(0, 5);
      pesan = `Check-out ${best.guru.nama}: ${wibStr}`;
    } else {
      const wibStr = record.checkInAt
        ? toZonedTime(record.checkInAt, WIB).toTimeString().substring(0, 5)
        : '-';
      pesan = `Sudah tercatat ${wibStr}`;
    }

    return {
      hasil: 'MATCH' as const,
      guruId: best.guru.id,
      nama: best.guru.nama,
      status: record.status,
      checkInAt: record.checkInAt,
      similarity: best.score,
      gap,
      pesan,
    };
  }

  // ────── Kiosk: manual NIP ──────

  /**
   * POST /api/kiosk/manual (DeviceAuthGuard) — guru tunjukkan NIP/ketik manual.
   * Simpan sebagai perluVerifikasi=true sampai admin konfirmasi.
   */
  async manualNip(nip: string, mode: 'masuk' | 'pulang' = 'masuk') {
    const guru = await this.guruRepo.findOne({ where: { nip } });
    if (!guru) throw new NotFoundException(`Guru dengan NIP "${nip}" tidak ditemukan`);

    const now = new Date();
    const tanggal = formatDateWIB(todayWIB());
    const { jamMasuk, toleransiMenit } = await this.jamPresensiConfig();

    let record = await this.hadrianRepo.findOne({
      where: { guruId: guru.id, tanggal },
    });

    if (!record) {
      const status = this.deriveStatus(now, jamMasuk, toleransiMenit);
      record = this.hadrianRepo.create({
        guruId: guru.id,
        tanggal,
        checkInAt: now,
        status,
        source: 'KIOSK',
        similarity: null,
        distanceMeter: null,
        alasan: 'Input manual NIP via kiosk — menunggu verifikasi admin',
        perluVerifikasi: true,
      });
      await this.hadrianRepo.save(record);
    } else if (mode === 'pulang' && !record.checkOutAt) {
      record.checkOutAt = now;
      record.perluVerifikasi = true;
      record.alasan = 'Input manual NIP via kiosk — menunggu verifikasi admin';
      await this.hadrianRepo.save(record);
    }

    return {
      ok: true,
      guruId: guru.id,
      nama: guru.nama,
      perluVerifikasi: true,
      pesan: 'Presensi dicatat, menunggu verifikasi admin',
    };
  }

  // ────── Kiosk: heartbeat ──────

  /** POST /api/kiosk/heartbeat (DeviceAuthGuard) — update lastSeenAt. */
  async heartbeat(device: DeviceKiosk) {
    device.lastSeenAt = new Date();
    await this.deviceRepo.save(device);
    return { ok: true, serverTime: new Date().toISOString() };
  }

  // ────── Admin: pending & verifikasi ──────

  /**
   * GET /api/admin/presensi-guru/pending — semua record perluVerifikasi=true.
   */
  async listPending() {
    const rows = await this.hadrianRepo.find({
      where: { perluVerifikasi: true },
      relations: ['guru'],
      order: { tanggal: 'DESC', createdAt: 'DESC' },
    });
    return {
      total: rows.length,
      data: rows.map((r) => ({
        id: r.id,
        guruId: r.guruId,
        nama: (r as any).guru?.nama ?? null,
        tanggal: r.tanggal,
        checkInAt: r.checkInAt,
        checkOutAt: r.checkOutAt,
        status: r.status,
        source: r.source,
        similarity: r.similarity,
        alasan: r.alasan,
      })),
    };
  }

  /**
   * POST /api/admin/presensi-guru/:id/verifikasi
   * Admin konfirmasi/tolak record pending.
   * Body: { aksi: 'terima'|'tolak', status?, alasan? }
   */
  async verifikasi(
    id: number,
    aksi: 'terima' | 'tolak',
    status?: string,
    alasan?: string,
    req?: Request,
  ) {
    const record = await this.hadrianRepo.findOne({
      where: { id },
      relations: ['guru'],
    });
    if (!record) throw new NotFoundException('Record presensi tidak ditemukan');
    if (!record.perluVerifikasi) {
      throw new BadRequestException('Record ini tidak perlu verifikasi');
    }

    if (aksi === 'tolak') {
      // Hapus record
      await this.hadrianRepo.remove(record);
      const actorId = (req as any)?.user?.id ?? req?.session?.userId ?? null;
      await this.audit.log({
        actorId,
        action: 'VERIFIKASI_TOLAK_PRESENSI',
        resource: 'presensi_harian_guru',
        resourceId: String(id),
        ip: req?.ip,
        userAgent: req?.headers?.['user-agent'] as string,
        summary: `Menolak presensi pending ${(record as any).guru?.nama} ${record.tanggal}`,
      });
      return { ok: true, aksi: 'tolak', id };
    }

    // Terima
    record.perluVerifikasi = false;
    if (status) record.status = status as any;
    if (alasan) record.alasan = alasan;
    await this.hadrianRepo.save(record);

    const actorId = (req as any)?.user?.id ?? req?.session?.userId ?? null;
    await this.audit.log({
      actorId,
      action: 'VERIFIKASI_TERIMA_PRESENSI',
      resource: 'presensi_harian_guru',
      resourceId: String(id),
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'] as string,
      summary: `Menerima presensi pending ${(record as any).guru?.nama} ${record.tanggal}: ${record.status}`,
    });

    return { ok: true, aksi: 'terima', id, status: record.status };
  }
}
