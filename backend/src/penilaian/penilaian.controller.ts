import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { PenilaianService } from './penilaian.service';
import { CreateTpDto, UpdateTpDto } from './dto/tp.dto';
import { CreatePenilaianDto, UpdatePenilaianDto } from './dto/penilaian.dto';
import { UpsertNilaiDto } from './dto/nilai.dto';

@Controller('api/guru/penilaian')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PenilaianController {
  constructor(private readonly svc: PenilaianService) {}

  private user(req: Request) {
    return (req as any).user as { id: number; roles: string[] };
  }

  // ─── Daftar Paket ─────────────────────────────────────────────────────────

  /**
   * GET /api/guru/penilaian
   * Kartu paket guru (dari penugasan TA aktif).
   * Guru → hanya paketnya; Admin → semua.
   */
  @Get()
  @Roles('guru', 'admin')
  daftarPaket(@Req() req: Request) {
    return this.svc.daftarPaket(this.user(req));
  }

  // ─── TP ───────────────────────────────────────────────────────────────────

  /**
   * GET /api/guru/penilaian/:penugasanId/tp
   * Daftar TP mapel paket (auth: pemilik paket atau admin)
   */
  @Get(':penugasanId/tp')
  @Roles('guru', 'admin')
  listTp(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Req() req: Request,
  ) {
    return this.svc.listTp(penugasanId, this.user(req));
  }

  /**
   * POST /api/guru/penilaian/:penugasanId/tp
   * Tambah TP baru di mapel paket.
   */
  @Post(':penugasanId/tp')
  @Roles('guru', 'admin')
  createTp(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Body() dto: CreateTpDto,
    @Req() req: Request,
  ) {
    return this.svc.createTp(penugasanId, dto, this.user(req), req);
  }

  /**
   * PATCH /api/guru/penilaian/:penugasanId/tp/:tpId
   * Edit TP.
   */
  @Patch(':penugasanId/tp/:tpId')
  @Roles('guru', 'admin')
  updateTp(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Param('tpId', ParseIntPipe) tpId: number,
    @Body() dto: UpdateTpDto,
    @Req() req: Request,
  ) {
    return this.svc.updateTp(penugasanId, tpId, dto, this.user(req), req);
  }

  /**
   * DELETE /api/guru/penilaian/:penugasanId/tp/:tpId
   * Soft-delete TP (aktif=false).
   */
  @Delete(':penugasanId/tp/:tpId')
  @Roles('guru', 'admin')
  deleteTp(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Param('tpId', ParseIntPipe) tpId: number,
    @Req() req: Request,
  ) {
    return this.svc.deleteTp(penugasanId, tpId, this.user(req), req);
  }

  // ─── Penilaian ────────────────────────────────────────────────────────────

  /**
   * GET /api/guru/penilaian/:penugasanId/penilaian
   */
  @Get(':penugasanId/penilaian')
  @Roles('guru', 'admin')
  listPenilaian(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Req() req: Request,
  ) {
    return this.svc.listPenilaian(penugasanId, this.user(req));
  }

  /**
   * POST /api/guru/penilaian/:penugasanId/penilaian
   */
  @Post(':penugasanId/penilaian')
  @Roles('guru', 'admin')
  createPenilaian(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Body() dto: CreatePenilaianDto,
    @Req() req: Request,
  ) {
    return this.svc.createPenilaian(penugasanId, dto, this.user(req), req);
  }

  /**
   * PATCH /api/guru/penilaian/:penugasanId/penilaian/:id
   */
  @Patch(':penugasanId/penilaian/:id')
  @Roles('guru', 'admin')
  updatePenilaian(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePenilaianDto,
    @Req() req: Request,
  ) {
    return this.svc.updatePenilaian(penugasanId, id, dto, this.user(req), req);
  }

  /**
   * DELETE /api/guru/penilaian/:penugasanId/penilaian/:id
   */
  @Delete(':penugasanId/penilaian/:id')
  @Roles('guru', 'admin')
  deletePenilaian(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.svc.deletePenilaian(penugasanId, id, this.user(req), req);
  }

  // ─── Input Nilai ──────────────────────────────────────────────────────────

  /**
   * GET /api/guru/penilaian/penilaian/:penilaianId/nilai
   * Daftar siswa aktif kelas + nilai (null = belum diisi).
   */
  @Get('penilaian/:penilaianId/nilai')
  @Roles('guru', 'admin')
  getDaftarNilai(
    @Param('penilaianId', ParseIntPipe) penilaianId: number,
    @Req() req: Request,
  ) {
    return this.svc.getDaftarNilai(penilaianId, this.user(req));
  }

  /**
   * PUT /api/guru/penilaian/penilaian/:penilaianId/nilai
   * Upsert nilai batch: { entri: [{siswaId, nilai, catatan?}] }
   */
  @Put('penilaian/:penilaianId/nilai')
  @Roles('guru', 'admin')
  upsertNilai(
    @Param('penilaianId', ParseIntPipe) penilaianId: number,
    @Body() dto: UpsertNilaiDto,
    @Req() req: Request,
  ) {
    return this.svc.upsertNilai(penilaianId, dto, this.user(req), req);
  }

  // ─── Rekap Nilai Akhir ────────────────────────────────────────────────────

  /**
   * GET /api/guru/penilaian/:penugasanId/rekap
   * Nilai akhir per siswa: round(Σ(nilai×bobot)/Σbobot) Sumatif only.
   */
  @Get(':penugasanId/rekap')
  @Roles('guru', 'admin')
  rekap(
    @Param('penugasanId', ParseIntPipe) penugasanId: number,
    @Req() req: Request,
  ) {
    return this.svc.rekapNilaiAkhir(penugasanId, this.user(req));
  }
}
