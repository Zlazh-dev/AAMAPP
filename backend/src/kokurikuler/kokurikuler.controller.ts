import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { KokurikulerService } from './kokurikuler.service';
import {
  CreateKegiatanDto,
  UpdateKegiatanDto,
  AddTargetDto,
  AddTimDto,
  UpsertAsesmenDto,
} from './dto/kokurikuler.dto';

@Controller('api/kokurikuler')
@UseGuards(SessionAuthGuard, RolesGuard)
export class KokurikulerController {
  constructor(private readonly svc: KokurikulerService) {}

  private userId(req: Request) {
    return ((req as any).user as { id: number }).id;
  }

  // ─── KEGIATAN ────────────────────────────────────────────────────────────

  /** GET /api/kokurikuler/kegiatan?tahunAjaranId=&semester= */
  @Get('kegiatan')
  @Roles('kurikulum', 'admin', 'kepsek', 'guru')
  listKegiatan(
    @Query('tahunAjaranId') taIdStr?: string,
    @Query('semester') semStr?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const taId = taIdStr ? parseInt(taIdStr, 10) : undefined;
    const sem = semStr ? parseInt(semStr, 10) : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    return this.svc.listKegiatan(taId, sem, page, limit);
  }

  /** GET /api/kokurikuler/kegiatan/:id */
  @Get('kegiatan/:id')
  @Roles('kurikulum', 'admin', 'kepsek', 'guru')
  getKegiatan(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getKegiatan(id);
  }

  /** POST /api/kokurikuler/kegiatan */
  @Post('kegiatan')
  @Roles('kurikulum', 'admin')
  createKegiatan(@Body() dto: CreateKegiatanDto, @Req() req: Request) {
    return this.svc.createKegiatan(dto, this.userId(req), req);
  }

  /** PATCH /api/kokurikuler/kegiatan/:id */
  @Patch('kegiatan/:id')
  @Roles('kurikulum', 'admin')
  updateKegiatan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKegiatanDto,
    @Req() req: Request,
  ) {
    return this.svc.updateKegiatan(id, dto, this.userId(req), req);
  }

  /** DELETE /api/kokurikuler/kegiatan/:id */
  @Delete('kegiatan/:id')
  @Roles('kurikulum', 'admin')
  deleteKegiatan(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.deleteKegiatan(id, this.userId(req), req);
  }

  // ─── TARGET DIMENSI ──────────────────────────────────────────────────────

  /** POST /api/kokurikuler/kegiatan/:id/target */
  @Post('kegiatan/:id/target')
  @Roles('kurikulum', 'admin')
  addTarget(
    @Param('id', ParseIntPipe) kegiatanId: number,
    @Body() dto: AddTargetDto,
    @Req() req: Request,
  ) {
    return this.svc.addTarget(kegiatanId, dto, this.userId(req), req);
  }

  /** DELETE /api/kokurikuler/kegiatan/:id/target/:targetId */
  @Delete('kegiatan/:id/target/:targetId')
  @Roles('kurikulum', 'admin')
  removeTarget(
    @Param('id', ParseIntPipe) kegiatanId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Req() req: Request,
  ) {
    return this.svc.removeTarget(kegiatanId, targetId, this.userId(req), req);
  }

  // ─── TIM PENILAI ─────────────────────────────────────────────────────────

  /** POST /api/kokurikuler/kegiatan/:id/tim */
  @Post('kegiatan/:id/tim')
  @Roles('kurikulum', 'admin')
  addTim(
    @Param('id', ParseIntPipe) kegiatanId: number,
    @Body() dto: AddTimDto,
    @Req() req: Request,
  ) {
    return this.svc.addTim(kegiatanId, dto, this.userId(req), req);
  }

  /** DELETE /api/kokurikuler/kegiatan/:id/tim/:kelasId/:guruId */
  @Delete('kegiatan/:id/tim/:kelasId/:guruId')
  @Roles('kurikulum', 'admin')
  removeTim(
    @Param('id', ParseIntPipe) kegiatanId: number,
    @Param('kelasId', ParseIntPipe) kelasId: number,
    @Param('guruId', ParseIntPipe) guruId: number,
    @Req() req: Request,
  ) {
    return this.svc.removeTim(kegiatanId, kelasId, guruId, this.userId(req), req);
  }

  // ─── ASESMEN ─────────────────────────────────────────────────────────────

  /**
   * GET /api/kokurikuler/asesmen?kegiatanId=&kelasId=
   * Guru tim: daftar siswa × dimensi + nilai sendiri.
   */
  @Get('asesmen')
  @Roles('guru', 'kurikulum')
  getAsesmen(
    @Query('kegiatanId') kegiatanIdStr: string,
    @Query('kelasId') kelasIdStr: string,
    @Req() req: Request,
  ) {
    const kegiatanId = parseInt(kegiatanIdStr, 10);
    const kelasId = parseInt(kelasIdStr, 10);
    return this.svc.getAsesmen(kegiatanId, kelasId, this.userId(req));
  }

  /**
   * PUT /api/kokurikuler/asesmen?kegiatanId=&kelasId=
   * Guru tim: upsert batch asesmen.
   */
  @Put('asesmen')
  @Roles('guru', 'kurikulum')
  upsertAsesmen(
    @Query('kegiatanId') kegiatanIdStr: string,
    @Query('kelasId') kelasIdStr: string,
    @Body() dto: UpsertAsesmenDto,
    @Req() req: Request,
  ) {
    const kegiatanId = parseInt(kegiatanIdStr, 10);
    const kelasId = parseInt(kelasIdStr, 10);
    return this.svc.upsertAsesmen(kegiatanId, kelasId, dto, this.userId(req), req);
  }

  // ─── RAPOR ───────────────────────────────────────────────────────────────

  /**
   * GET /api/kokurikuler/rapor/:siswaId?tahunAjaranId=&semester=
   * Nilai akhir per dimensi (rata) + deskripsi otomatis.
   */
  @Get('rapor/:siswaId')
  @Roles('guru', 'kurikulum', 'admin', 'kepsek', 'kesiswaan')
  getRaporSiswa(
    @Param('siswaId', ParseIntPipe) siswaId: number,
    @Query('tahunAjaranId') taIdStr?: string,
    @Query('semester') semStr?: string,
  ) {
    const taId = taIdStr ? parseInt(taIdStr, 10) : undefined;
    const sem = semStr ? parseInt(semStr, 10) : undefined;
    return this.svc.getRaporSiswa(siswaId, taId, sem);
  }
}
