import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Request, Response } from 'express';
import { PresensiGuruService } from './presensi-guru.service';
import { ScanDto } from './dto/scan.dto';
import { ManualDto } from './dto/manual.dto';
import { EnrollWajahDto } from './dto/enroll-wajah.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

class ValidasiWajahDto {
  @IsIn(['terima', 'tolak'])
  aksi: 'terima' | 'tolak';
}

/** F3a — Enrollment wajah mandiri (guru) & monitor diri. */
@Controller('api/guru/wajah')
@UseGuards(SessionAuthGuard, RolesGuard)
export class GuruWajahController {
  constructor(private readonly svc: PresensiGuruService) {}

  /** GET /api/guru/wajah/status — status enroll wajah guru sendiri. */
  @Get('status')
  @Roles('guru')
  statusWajah(@Req() req: Request) {
    return this.svc.statusWajahDiri(req);
  }

  /** PUT /api/guru/wajah — enroll embedding wajah sendiri. */
  @Put()
  @Roles('guru')
  enrollDiri(@Req() req: Request, @Body() dto: EnrollWajahDto) {
    return this.svc.enrollDiri(req, dto);
  }
}

/** F3a — Scan presensi mandiri 1:1. */
@Controller('api/guru')
@UseGuards(SessionAuthGuard, RolesGuard)
export class GuruScanController {
  constructor(private readonly svc: PresensiGuruService) {}

  /** POST /api/guru/presensi-scan — scan wajah, alur 6 langkah F3-SPEC. */
  @Post('presensi-scan')
  @Roles('guru')
  scan(@Req() req: Request, @Body() dto: ScanDto) {
    return this.svc.scan(req, dto);
  }
}

/** F3a — Admin: hapus wajah, monitor, validasi, input manual.
 * enrollAdmin (PUT wajah/:guruId) dicabut per keputusan produk:
 * admin hanya memvalidasi, guru mendaftarkan sendiri.
 */
@Controller('api/admin')
@UseGuards(SessionAuthGuard, RolesGuard)
export class AdminWajahController {
  constructor(private readonly svc: PresensiGuruService) {}

  /**
   * DELETE /api/admin/wajah/:guruId
   * Clear faceEmbeddings (privasi biometrik — dipakai kartu wajah GuruDetailPage).
   */
  @Delete('wajah/:guruId')
  @Roles('admin')
  hapusWajah(
    @Param('guruId', ParseIntPipe) guruId: number,
    @Req() req: Request,
  ) {
    return this.svc.hapusWajah(guruId, req);
  }

  /**
   * GET /api/admin/presensi-guru/harian?tanggal=
   * Semua guru aktif + status hari itu (batch, anti-N+1).
   * Accessible: admin & kepsek.
   */
  @Get('presensi-guru/harian')
  @Roles('admin', 'kepsek', 'tu', 'kesiswaan')
  monitorHarian(@Query('tanggal') tanggal?: string) {
    return this.svc.monitorHarian(tanggal);
  }

  /**
   * GET /api/admin/presensi-guru/detail?guruId=&tanggal=
   * Sub-detail presensi satu guru untuk satu tanggal (UX-POLISH §J).
   */
  @Get('presensi-guru/detail')
  @Roles('admin', 'kepsek', 'tu', 'kesiswaan')
  detailPresensiGuru(
    @Query('guruId') guruIdStr?: string,
    @Query('tanggal') tanggal?: string,
  ) {
    const guruId = parseInt(guruIdStr || '0', 10);
    if (!guruId) throw new BadRequestException('guruId wajib diisi');
    return this.svc.detailPresensiGuru(guruId, tanggal);
  }

  /**
   * POST /api/admin/presensi-guru/manual
   * Input manual presensi guru (alasan wajib).
   */
  @Post('presensi-guru/manual')
  @Roles('admin', 'tu', 'kesiswaan')
  manualAdmin(@Body() dto: ManualDto, @Req() req: Request) {
    return this.svc.manualAdmin(dto, req);
  }

  /**
   * PATCH /api/admin/guru/:id/wajah/validasi
   * Admin setujui (terima) atau tolak embedding wajah guru.
   * UX-POLISH D.
   */
  @Patch('guru/:id/wajah/validasi')
  @Roles('admin')
  validasiWajah(
    @Param('id', ParseIntPipe) guruId: number,
    @Body() dto: ValidasiWajahDto,
    @Req() req: Request,
  ) {
    return this.svc.validasiWajah(guruId, dto.aksi, req);
  }

  /**
   * F3b — GET /api/admin/guru/:id/wajah/snapshot
   * Admin-only: stream file snapshot wajah (JPEG).
   * TIDAK tersaji dari folder publik /uploads/ — hanya lewat endpoint ini.
   * Guru & peran lain mendapat 403 (RolesGuard menolak).
   */
  @Get('guru/:id/wajah/snapshot')
  @Roles('admin')
  async getFaceSnapshot(
    @Param('id', ParseIntPipe) guruId: number,
    @Res() res: Response,
  ) {
    const { absolutePath, filename } =
      await this.svc.getFaceSnapshotPathAsync(guruId);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(absolutePath);
  }
}
