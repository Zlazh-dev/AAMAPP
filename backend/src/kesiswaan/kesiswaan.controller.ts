import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { KesiswaanService } from './kesiswaan.service';
import { CreateKatalogDto } from './dto/create-katalog.dto';
import { CatatPelanggaranDto } from './dto/catat-pelanggaran.dto';
import { KeputusanPelanggaranDto } from './dto/keputusan-pelanggaran.dto';

@Controller('api/kesiswaan')
@UseGuards(SessionAuthGuard, RolesGuard)
export class KesiswaanController {
  constructor(private readonly svc: KesiswaanService) {}

  // ─── Katalog ───────────────────────────────────────────────────────────────

  /**
   * GET /api/kesiswaan/katalog?q=&kategori=&page=&limit=
   * Baca: kesiswaan|admin|guru|kepsek|kurikulum
   */
  @Get('katalog')
  @Roles('kesiswaan', 'admin', 'guru', 'kepsek', 'kurikulum', 'tu')
  listKatalog(
    @Query('q') q?: string,
    @Query('kategori') kategori?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listKatalog({
      q,
      kategori,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * POST /api/kesiswaan/katalog
   * Tambah butir baru: kesiswaan|admin
   */
  @Post('katalog')
  @Roles('kesiswaan', 'admin')
  createKatalog(@Body() dto: CreateKatalogDto, @Req() req: Request) {
    return this.svc.createKatalog(dto, req);
  }

  /**
   * PATCH /api/kesiswaan/katalog/:id
   * Edit butir: kesiswaan|admin
   */
  @Patch('katalog/:id')
  @Roles('kesiswaan', 'admin')
  updateKatalog(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateKatalogDto>,
    @Req() req: Request,
  ) {
    return this.svc.updateKatalog(id, dto, req);
  }

  /**
   * DELETE /api/kesiswaan/katalog/:id (soft-delete: aktif=false)
   * kesiswaan|admin
   */
  @Delete('katalog/:id')
  @Roles('kesiswaan', 'admin')
  deleteKatalog(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.svc.deleteKatalog(id, req);
  }

  // ─── Pelanggaran ───────────────────────────────────────────────────────────

  /**
   * POST /api/kesiswaan/pelanggaran
   * Catat langsung (kesiswaan/wali → DISETUJUI) atau lapor (guru lain → MENUNGGU)
   * Peran: kesiswaan|guru|admin
   */
  @Post('pelanggaran')
  @Roles('kesiswaan', 'admin', 'guru')
  catatPelanggaran(@Body() dto: CatatPelanggaranDto, @Req() req: Request) {
    return this.svc.catatPelanggaran(dto, req);
  }

  /**
   * GET /api/kesiswaan/pelanggaran?siswaId?&kelasId?&status?&dari?&sampai?&page&limit
   * kesiswaan|admin|kepsek — wali auto-filter (service handle)
   */
  @Get('pelanggaran')
  @Roles('kesiswaan', 'admin', 'kepsek', 'guru')
  listPelanggaran(
    @Query('siswaId') siswaId?: string,
    @Query('kelasId') kelasId?: string,
    @Query('status') status?: string,
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    const user = (req as any).user as { id: number; roles: string[] };
    return this.svc.listPelanggaran({
      siswaId: siswaId ? Number(siswaId) : undefined,
      kelasId: kelasId ? Number(kelasId) : undefined,
      status,
      dari,
      sampai,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      user,
    });
  }

  /**
   * GET /api/kesiswaan/verifikasi?page&limit
   * Antrean MENUNGGU; wali → hanya kelasnya
   * kesiswaan|admin|guru (wali)
   */
  @Get('verifikasi')
  @Roles('kesiswaan', 'admin', 'guru')
  listVerifikasi(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    const user = (req as any).user as { id: number; roles: string[] };
    return this.svc.listVerifikasi({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      user,
    });
  }

  /**
   * PATCH /api/kesiswaan/pelanggaran/:id/setujui
   * kesiswaan|admin|guru (wali kelas siswa)
   */
  @Patch('pelanggaran/:id/setujui')
  @Roles('kesiswaan', 'admin', 'guru')
  setujui(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.setujui(id, req);
  }

  /**
   * PATCH /api/kesiswaan/pelanggaran/:id/tolak
   * kesiswaan|admin|guru (wali), alasan wajib
   */
  @Patch('pelanggaran/:id/tolak')
  @Roles('kesiswaan', 'admin', 'guru')
  tolak(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KeputusanPelanggaranDto,
    @Req() req: Request,
  ) {
    return this.svc.tolak(id, dto, req);
  }

  /**
   * GET /api/kesiswaan/saldo?siswaId=|kelasId=
   * kesiswaan|admin|kepsek|guru (wali bisa lihat kelasnya)
   */
  @Get('saldo')
  @Roles('kesiswaan', 'admin', 'kepsek', 'guru')
  saldo(
    @Query('siswaId') siswaId?: string,
    @Query('kelasId') kelasId?: string,
  ) {
    return this.svc.saldo({
      siswaId: siswaId ? Number(siswaId) : undefined,
      kelasId: kelasId ? Number(kelasId) : undefined,
    });
  }
}
