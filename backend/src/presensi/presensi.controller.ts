import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PresensiService } from './presensi.service';
import { SimpanRosterDto } from './dto/simpan-roster.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

/** F2 — presensi siswa per KBM oleh guru mapel. */
@Controller('api/guru/kbm')
@UseGuards(SessionAuthGuard, RolesGuard)
export class GuruPresensiController {
  constructor(private readonly svc: PresensiService) {}

  @Get()
  @Roles('guru')
  kbmHariIni(@Req() req: Request, @Query('tanggal') tanggal?: string) {
    return this.svc.kbmHariIni(req, tanggal);
  }

  @Get(':jadwalId/roster')
  @Roles('guru')
  roster(
    @Req() req: Request,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @Query('tanggal') tanggal?: string,
  ) {
    return this.svc.roster(req, jadwalId, tanggal);
  }

  @Post(':jadwalId/roster')
  @Roles('guru')
  simpan(
    @Req() req: Request,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @Body() dto: SimpanRosterDto,
  ) {
    return this.svc.simpanRoster(req, jadwalId, dto);
  }

  @Patch(':jadwalId/roster')
  @Roles('guru')
  koreksi(
    @Req() req: Request,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @Body() dto: SimpanRosterDto,
  ) {
    return this.svc.simpanRoster(req, jadwalId, dto);
  }

  /**
   * POST /api/guru/kbm/:jadwalId/hadir
   * Body: { lat?: number; lng?: number; tanggal?: string }
   * Validasi geofence → catat guruHadirPada di presensi_sesi.
   * Idempoten: panggil ulang di hari yang sama → tetap ok.
   */
  @Post(':jadwalId/hadir')
  @Roles('guru')
  hadir(
    @Req() req: Request,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @Body() body: { lat?: number; lng?: number; tanggal?: string },
  ) {
    return this.svc.hadirSesi(req, jadwalId, body.tanggal, body);
  }
}

/** F2 — rekap presensi per kelas (wali kelas | admin). */
@Controller('api/guru/kelas')
@UseGuards(SessionAuthGuard, RolesGuard)
export class GuruKelasRekapController {
  constructor(private readonly svc: PresensiService) {}

  @Get('rekap-presensi')
  @Roles('guru')
  async rekapPresensi(
    @Req() req: Request,
    @Query('kelasId', ParseIntPipe) kelasId: number,
    @Query('dari') dari: string,
    @Query('sampai') sampai: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const roles = (req as any).user?.roles ?? [];
    if (!Array.isArray(roles) || !roles.includes('admin')) {
      const userId = (req as any).user?.id ?? req.session?.userId;
      const isWali = await this.svc.isWaliKelasByUserId(userId, kelasId);
      if (!isWali) {
        throw new ForbiddenException('Anda bukan wali kelas ini');
      }
    }
    return this.svc.rekapPresensi({
      kelasId,
      dari,
      sampai,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}

/** F2 — monitor presensi siswa (admin/kepsek/kesiswaan baca). */
@Controller('api/admin/presensi-siswa')
@UseGuards(SessionAuthGuard, RolesGuard)
export class AdminPresensiController {
  constructor(private readonly svc: PresensiService) {}

  @Get()
  @Roles('admin', 'kepsek', 'kesiswaan')
  matriks(
    @Query('kelasId', ParseIntPipe) kelasId: number,
    @Query('tanggal') tanggal?: string,
  ) {
    return this.svc.matriksAdmin(kelasId, tanggal);
  }
}
