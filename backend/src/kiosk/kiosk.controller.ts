import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { KioskService } from './kiosk.service';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Public } from '../common/public.decorator';
import { DeviceAuthGuard } from './device-auth.guard';

// ─────────────────────────────────────────────
// Admin: manajemen perangkat kiosk
// ─────────────────────────────────────────────

@Controller('api/admin/device-kiosk')
@UseGuards(SessionAuthGuard, RolesGuard)
export class AdminDeviceKioskController {
  constructor(private readonly svc: KioskService) {}

  /** POST /api/admin/device-kiosk — buat perangkat + kode pairing. */
  @Post()
  @Roles('admin')
  create(@Body() body: { nama: string }, @Req() req: Request) {
    if (!body.nama?.trim()) throw new Error('nama wajib diisi');
    return this.svc.createDevice(body.nama.trim(), req);
  }

  /** GET /api/admin/device-kiosk — daftar perangkat + isOnline. */
  @Get()
  @Roles('admin', 'kepsek')
  list() {
    return this.svc.listDevices();
  }

  /** DELETE /api/admin/device-kiosk/:id — cabut token perangkat. */
  @Delete(':id')
  @Roles('admin')
  revoke(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.revokeDevice(id, req);
  }
}

// ─────────────────────────────────────────────
// Admin: pending verifikasi (di /api/admin/presensi-guru/...)
// ─────────────────────────────────────────────

@Controller('api/admin/presensi-guru')
@UseGuards(SessionAuthGuard, RolesGuard)
export class AdminPresensiGuruVerifikasiController {
  constructor(private readonly svc: KioskService) {}

  /** GET /api/admin/presensi-guru/pending — record perluVerifikasi=true. */
  @Get('pending')
  @Roles('admin', 'kepsek')
  pending() {
    return this.svc.listPending();
  }

  /** POST /api/admin/presensi-guru/:id/verifikasi — terima/tolak. */
  @Post(':id/verifikasi')
  @Roles('admin')
  verifikasi(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { aksi: 'terima' | 'tolak'; status?: string; alasan?: string },
    @Req() req: Request,
  ) {
    return this.svc.verifikasi(id, body.aksi, body.status, body.alasan, req);
  }
}

// ─────────────────────────────────────────────
// Kiosk: endpoint untuk perangkat kiosk
// ─────────────────────────────────────────────

/**
 * POST /api/kiosk/pair — @Public, tukar kode 6-digit → token perangkat.
 * Harus @Public karena kiosk belum punya token saat pairing.
 */
@Controller('api/kiosk')
export class KioskPairController {
  constructor(private readonly svc: KioskService) {}

  @Post('pair')
  @Public()
  pair(@Body() body: { pairingCode: string }) {
    return this.svc.pair(body.pairingCode);
  }
}

/**
 * Endpoint kiosk yang butuh DeviceAuthGuard (X-Device-Token).
 * @Public() agar SessionAuthGuard global (APP_GUARD) bypass;
 * DeviceAuthGuard tetap berjalan sebagai guard lokal.
 */
@Public()
@Controller('api/kiosk')
@UseGuards(DeviceAuthGuard)
export class KioskAuthController {
  constructor(private readonly svc: KioskService) {}

  /** POST /api/kiosk/scan — match 1:N, DeviceAuthGuard. */
  @Post('scan')
  scan(
    @Body() body: { embedding: number[]; mode?: 'masuk' | 'pulang' },
    @Req() req: Request,
  ) {
    const device = (req as any).device;
    return this.svc.scan(body.embedding, body.mode ?? 'masuk', device);
  }

  /** POST /api/kiosk/manual — NIP manual → pending. */
  @Post('manual')
  manualNip(
    @Body() body: { nip: string; mode?: 'masuk' | 'pulang' },
  ) {
    return this.svc.manualNip(body.nip, body.mode ?? 'masuk');
  }

  /** POST /api/kiosk/heartbeat — update lastSeenAt. */
  @Post('heartbeat')
  heartbeat(@Req() req: Request) {
    return this.svc.heartbeat((req as any).device);
  }
}
