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

  // ─── Jadwal Matriks (JADWAL-MATRIX spec) ──────────────────────

  /** GET /api/kurikulum/jadwal/matriks?hari=N[&taId=] */
  @Get('jadwal/matriks')
  @Roles('admin', 'kurikulum')
  listJadwalMatriks(
    @Query('hari') hariStr: string,
    @Query('taId') taIdStr?: string,
  ) {
    const hari = parseInt(hariStr, 10);
    const taId = taIdStr ? parseInt(taIdStr, 10) : undefined;
    return this.svc.listJadwalMatriks({ hari, taId });
  }

  /** POST /api/kurikulum/jadwal/batch-assign */
  @Post('jadwal/batch-assign')
  @Roles('admin', 'kurikulum')
  batchAssignJadwal(@Body() body: { hari: number; slots: Array<{ kelasId: number; penugasanId: number; jamMulai: string; jamSelesai: string }> }, @Req() req: Request) {
    return this.svc.batchAssignJadwal(body, req);
  }

  /** POST /api/kurikulum/jadwal/batch-hapus
   *  Body: { ids: number[] } — transaksi semua-atau-batal, guard presensi_sesi.
   *  POST (bukan DELETE) karena body JSON wajib untuk operasi batch.
   */
  @Post('jadwal/batch-hapus')
  @Roles('admin', 'kurikulum')
  batchHapusJadwal(@Body() body: { ids: number[] }, @Req() req: Request) {
    return this.svc.batchHapusJadwal(body, req);
  }

  // ─────────────────────────────────────────────────────────────
  // JAM PELAJARAN (JADWAL-MATRIX-FIX Butir 6)
  // ─────────────────────────────────────────────────────────────

  /** GET /api/kurikulum/jam-pelajaran?hari=N[&taId=] */
  @Get('jam-pelajaran')
  @Roles('admin', 'kurikulum')
  listJamPelajaran(@Query('hari') hariStr: string, @Query('taId') taIdStr?: string) {
    const hari = parseInt(hariStr, 10);
    const taId = taIdStr ? parseInt(taIdStr, 10) : undefined;
    return this.svc.listJamPelajaran({ hari, taId });
  }

  /** POST /api/kurikulum/jam-pelajaran — tambah JP baru */
  @Post('jam-pelajaran')
  @Roles('admin', 'kurikulum')
  addJamPelajaran(
    @Body() body: { hari: number; jamMulai: string; jamSelesai: string; taId?: number },
  ) {
    return this.svc.addJamPelajaran(body);
  }

  /** PATCH /api/kurikulum/jam-pelajaran/:id — edit jam JP + geser jadwal */
  @Patch('jam-pelajaran/:id')
  @Roles('admin', 'kurikulum')
  updateJamPelajaran(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { jamMulai: string; jamSelesai: string },
  ) {
    return this.svc.updateJamPelajaran(id, body);
  }

  /** DELETE /api/kurikulum/jam-pelajaran/:id — hapus JP (guard: sel kosong) */
  @Delete('jam-pelajaran/:id')
  @Roles('admin', 'kurikulum')
  removeJamPelajaran(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeJamPelajaran(id);
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

  // ─────────────────────────────────────────────────────────────
  // MONITORING PROGRES INPUT NILAI (A3)
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/kurikulum/monitoring-nilai?tahunAjaranId=
   * Agregat progres nilai per guru-mapel-kelas.
   * Akses: kurikulum, admin, kepsek.
   */
  @Get('monitoring-nilai')
  @Roles('kurikulum', 'admin', 'kepsek')
  monitoringNilai(@Query('tahunAjaranId') taIdStr?: string) {
    const taId = taIdStr ? parseInt(taIdStr, 10) : undefined;
    return this.svc.monitoringNilai(taId);
  }
}
