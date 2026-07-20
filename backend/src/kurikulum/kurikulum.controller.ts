import {
  Body,
  Controller,
  Delete,
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
import { KurikulumService, MapelFilter } from './kurikulum.service';
import { CreateMapelDto } from './dto/create-mapel.dto';
import { UpdateMapelDto } from './dto/update-mapel.dto';
import { CreatePenugasanDto } from './dto/create-penugasan.dto';
import { UpdatePenugasanDto } from './dto/update-penugasan.dto';
import { CreateJadwalDto } from './dto/create-jadwal.dto';
import { UpdateJadwalDto } from './dto/update-jadwal.dto';
import { CreateLiburDto } from './dto/create-libur.dto';
import { UpdateKkmDto } from './dto/update-kkm.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

/**
 * T12: Satu controller untuk seluruh resource Kurikulum.
 * Prefix = /api/kurikulum/...
 *
 *   /mapel       — CRUD mata pelajaran (Fase 7)
 *   /penugasan   — CRUD paket penugasan (T12 Butir 5)
 *   /jadwal      — CRUD slot jadwal KBM (T12 Butir 5)
 *   /pengaturan/kkm — GET/PATCH KKM (T12 Butir 5)
 */
@Controller('api/kurikulum')
@UseGuards(SessionAuthGuard, RolesGuard)
export class KurikulumController {
  constructor(private readonly svc: KurikulumService) {}

  // ─────────────────────────────────────────────────────────────
  // DASHBOARD (T15)
  // ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles('admin', 'kurikulum')
  async dashboard() {
    return this.svc.getDashboard();
  }

  // ─────────────────────────────────────────────────────────────
  // MAPEL
  // ─────────────────────────────────────────────────────────────

  @Get('mapel')
  @Roles('admin', 'kurikulum', 'kepsek', 'guru')
  listMapel(@Query() q: MapelFilter) {
    return this.svc.listMapel(q);
  }

  @Get('mapel/:id')
  @Roles('admin', 'kurikulum', 'kepsek', 'guru')
  oneMapel(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOneMapel(id);
  }

  @Post('mapel')
  @Roles('admin', 'kurikulum')
  createMapel(@Body() body: CreateMapelDto, @Req() req: Request) {
    return this.svc.createMapel(body, req);
  }

  @Patch('mapel/:id')
  @Roles('admin', 'kurikulum')
  updateMapel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMapelDto,
    @Req() req: Request,
  ) {
    return this.svc.updateMapel(id, body, req);
  }

  @Delete('mapel/:id')
  @Roles('admin', 'kurikulum')
  removeMapel(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.removeMapel(id, req);
  }

  // ─────────────────────────────────────────────────────────────
  // PENUGASAN
  // ─────────────────────────────────────────────────────────────

  @Get('penugasan')
  @Roles('admin', 'kurikulum', 'kepsek', 'guru')
  listPenugasan(
    @Query('taId') taId?: string,
    @Query('guruId') guruId?: string,
    @Query('kelasId') kelasId?: string,
    @Query('mapelId') mapelId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listPenugasan({
      taId: taId ? parseInt(taId, 10) : undefined,
      guruId: guruId ? parseInt(guruId, 10) : undefined,
      kelasId: kelasId ? parseInt(kelasId, 10) : undefined,
      mapelId: mapelId ? parseInt(mapelId, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('penugasan')
  @Roles('admin', 'kurikulum')
  createPenugasan(@Body() body: CreatePenugasanDto, @Req() req: Request) {
    return this.svc.createPenugasan(body, req);
  }

  @Patch('penugasan/:id')
  @Roles('admin', 'kurikulum')
  updatePenugasan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePenugasanDto,
    @Req() req: Request,
  ) {
    return this.svc.updatePenugasan(id, body, req);
  }

  @Delete('penugasan/:id')
  @Roles('admin', 'kurikulum')
  removePenugasan(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.removePenugasan(id, req);
  }

  // ─────────────────────────────────────────────────────────────
  // JADWAL
  // ─────────────────────────────────────────────────────────────

  @Get('jadwal')
  @Roles('admin', 'kurikulum', 'kepsek', 'guru')
  listJadwal(
    @Query('taId') taId?: string,
    @Query('kelasId') kelasId?: string,
    @Query('guruId') guruId?: string,
  ) {
    return this.svc.listJadwal({
      taId: taId ? parseInt(taId, 10) : undefined,
      kelasId: kelasId ? parseInt(kelasId, 10) : undefined,
      guruId: guruId ? parseInt(guruId, 10) : undefined,
    });
  }

  @Post('jadwal')
  @Roles('admin', 'kurikulum')
  createJadwal(@Body() body: CreateJadwalDto, @Req() req: Request) {
    return this.svc.createJadwal(body, req);
  }

  @Patch('jadwal/:id')
  @Roles('admin', 'kurikulum')
  updateJadwal(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateJadwalDto,
    @Req() req: Request,
  ) {
    return this.svc.updateJadwal(id, body, req);
  }

  @Delete('jadwal/:id')
  @Roles('admin', 'kurikulum')
  removeJadwal(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.removeJadwal(id, req);
  }

  // ─────────────────────────────────────────────────────────────
  // KKM
  // ─────────────────────────────────────────────────────────────

  @Get('pengaturan/kkm')
  @Roles('admin', 'kurikulum', 'kepsek', 'guru')
  getKkm() {
    return this.svc.getKkm();
  }

  @Patch('pengaturan/kkm')
  @Roles('admin', 'kurikulum')
  updateKkm(@Body() body: UpdateKkmDto, @Req() req: Request) {
    return this.svc.updateKkm(body, req);
  }
}
