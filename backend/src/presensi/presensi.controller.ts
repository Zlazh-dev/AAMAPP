import {
  Body,
  Controller,
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
  @Roles('guru', 'admin')
  kbmHariIni(@Req() req: Request, @Query('tanggal') tanggal?: string) {
    return this.svc.kbmHariIni(req, tanggal);
  }

  @Get(':jadwalId/roster')
  @Roles('guru', 'admin')
  roster(
    @Req() req: Request,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @Query('tanggal') tanggal?: string,
  ) {
    return this.svc.roster(req, jadwalId, tanggal);
  }

  @Post(':jadwalId/roster')
  @Roles('guru', 'admin')
  simpan(
    @Req() req: Request,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @Body() dto: SimpanRosterDto,
  ) {
    return this.svc.simpanRoster(req, jadwalId, dto);
  }

  @Patch(':jadwalId/roster')
  @Roles('guru', 'admin')
  koreksi(
    @Req() req: Request,
    @Param('jadwalId', ParseIntPipe) jadwalId: number,
    @Body() dto: SimpanRosterDto,
  ) {
    return this.svc.simpanRoster(req, jadwalId, dto);
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
