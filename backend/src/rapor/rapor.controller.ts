import {
  Controller,
  Get,
  Put,
  Patch,
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
import { RaporService } from './rapor.service';
import { OverrideMapelDto, CatatanWaliDto } from './dto/rapor.dto';

@Controller('api/rapor')
@UseGuards(SessionAuthGuard, RolesGuard)
export class RaporController {
  constructor(private readonly svc: RaporService) {}

  private user(req: Request) {
    return (req as any).user as { id: number; roles: string[] };
  }

  /**
   * GET /api/rapor/kelas/:kelasId?tahunAjaranId=
   * Daftar siswa kelas + status rapor. Akses: wali kelas, admin, kepsek.
   */
  @Get('kelas/:kelasId')
  @Roles('guru', 'admin', 'kepsek')
  listKelas(
    @Param('kelasId', ParseIntPipe) kelasId: number,
    @Query('tahunAjaranId') taIdStr?: string,
    @Req() req?: Request,
  ) {
    const taId = taIdStr ? parseInt(taIdStr, 10) : undefined;
    return this.svc.listKelas(kelasId, taId, this.user(req!));
  }

  /**
   * GET /api/rapor/kelas/:kelasId/leger?tahunAjaranId=
   * Matriks Leger Kelas (Nilai per siswa per mapel, total, ranking).
   * Akses: wali kelas, kurikulum, admin, kepsek.
   */
  @Get('kelas/:kelasId/leger')
  @Roles('guru', 'kurikulum', 'admin', 'kepsek')
  getLegerKelas(
    @Param('kelasId', ParseIntPipe) kelasId: number,
    @Query('tahunAjaranId') taIdStr?: string,
    @Req() req?: Request,
  ) {
    const taId = taIdStr ? parseInt(taIdStr, 10) : undefined;
    return this.svc.getLegerKelas(kelasId, taId, this.user(req!));
  }
  /**
   * GET /api/rapor/siswa/:siswaId?tahunAjaranId=
   * Rapor lengkap DERIVED (atau snapshot jika FINAL).
   */
  @Get('siswa/:siswaId')
  @Roles('guru', 'admin', 'kepsek')
  getRaporSiswa(
    @Param('siswaId', ParseIntPipe) siswaId: number,
    @Query('tahunAjaranId') taIdStr?: string,
    @Req() req?: Request,
  ) {
    const taId = taIdStr ? parseInt(taIdStr, 10) : undefined;
    return this.svc.getRaporSiswa(siswaId, taId, this.user(req!));
  }

  /**
   * PUT /api/rapor/siswa/:siswaId/mapel/:mapelId
   * Override nilaiKatrol dan/atau deskripsiOverride. Wali only.
   */
  @Put('siswa/:siswaId/mapel/:mapelId')
  @Roles('guru')
  upsertOverride(
    @Param('siswaId', ParseIntPipe) siswaId: number,
    @Param('mapelId', ParseIntPipe) mapelId: number,
    @Body() dto: OverrideMapelDto,
    @Req() req: Request,
  ) {
    return this.svc.upsertOverride(siswaId, mapelId, dto, this.user(req), req);
  }

  /**
   * PATCH /api/rapor/siswa/:siswaId/catatan
   * Update catatan wali. Wali only.
   */
  @Patch('siswa/:siswaId/catatan')
  @Roles('guru')
  updateCatatan(
    @Param('siswaId', ParseIntPipe) siswaId: number,
    @Body() dto: CatatanWaliDto,
    @Req() req: Request,
  ) {
    return this.svc.updateCatatan(siswaId, dto, this.user(req), req);
  }

  /**
   * PATCH /api/rapor/siswa/:siswaId/finalisasi
   * Finalisasi rapor → status FINAL + snapshot. Wali only.
   */
  @Patch('siswa/:siswaId/finalisasi')
  @Roles('guru')
  finalisasi(
    @Param('siswaId', ParseIntPipe) siswaId: number,
    @Req() req: Request,
  ) {
    return this.svc.finalisasi(siswaId, this.user(req), req);
  }

  /**
   * PATCH /api/rapor/siswa/:siswaId/batal-final
   * Batalkan finalisasi → kembali ke DRAFT. Admin only.
   */
  @Patch('siswa/:siswaId/batal-final')
  @Roles('admin')
  batalFinal(
    @Param('siswaId', ParseIntPipe) siswaId: number,
    @Req() req: Request,
  ) {
    return this.svc.batalFinal(siswaId, this.user(req), req);
  }
}
