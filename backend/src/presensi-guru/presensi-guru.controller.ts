import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PresensiGuruService } from './presensi-guru.service';
import { EnrollWajahDto } from './dto/enroll-wajah.dto';
import { ScanDto } from './dto/scan.dto';
import { ManualDto } from './dto/manual.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

/** F3a — Enrollment wajah mandiri (guru) & monitor diri. */
@Controller('api/guru/wajah')
@UseGuards(SessionAuthGuard, RolesGuard)
export class GuruWajahController {
  constructor(private readonly svc: PresensiGuruService) {}

  /** GET /api/guru/wajah/status — status enroll wajah guru sendiri. */
  @Get('status')
  @Roles('guru', 'admin')
  statusWajah(@Req() req: Request) {
    return this.svc.statusWajahDiri(req);
  }

  /** PUT /api/guru/wajah — enroll embedding wajah sendiri. */
  @Put()
  @Roles('guru', 'admin')
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
  @Roles('guru', 'admin')
  scan(@Req() req: Request, @Body() dto: ScanDto) {
    return this.svc.scan(req, dto);
  }
}

/** F3a — Admin: enroll wajah guru, delete, monitor, input manual. */
@Controller('api/admin')
@UseGuards(SessionAuthGuard, RolesGuard)
export class AdminWajahController {
  constructor(private readonly svc: PresensiGuruService) {}

  /**
   * GET /api/admin/wajah?q=&page=&limit=
   * Daftar guru + status enroll (berpaginasi, filter nama/nip).
   */
  @Get('wajah')
  @Roles('admin')
  daftarWajah(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.daftarWajahAdmin(
      q,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * PUT /api/admin/wajah/:guruId
   * Enroll embedding wajah untuk guru tertentu.
   */
  @Put('wajah/:guruId')
  @Roles('admin')
  enrollAdmin(
    @Param('guruId', ParseIntPipe) guruId: number,
    @Body() dto: EnrollWajahDto,
    @Req() req: Request,
  ) {
    return this.svc.enrollAdmin(guruId, dto, req);
  }

  /**
   * DELETE /api/admin/wajah/:guruId
   * Clear faceEmbeddings (privasi biometrik).
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
  @Roles('admin', 'kepsek')
  monitorHarian(@Query('tanggal') tanggal?: string) {
    return this.svc.monitorHarian(tanggal);
  }

  /**
   * POST /api/admin/presensi-guru/manual
   * Input manual presensi guru (alasan wajib).
   */
  @Post('presensi-guru/manual')
  @Roles('admin')
  manualAdmin(@Body() dto: ManualDto, @Req() req: Request) {
    return this.svc.manualAdmin(dto, req);
  }
}
