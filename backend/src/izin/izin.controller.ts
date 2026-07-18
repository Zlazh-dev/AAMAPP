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
import { IzinService } from './izin.service';
import { AjukanIzinDto } from './dto/ajukan-izin.dto';
import { KeputusanDto } from './dto/keputusan.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { StatusIzin } from './izin-guru.entity';

// ─────────────────────────────────────────────
// Guru: ajukan + list izin sendiri
// ─────────────────────────────────────────────

@Controller('api/izin/guru')
@UseGuards(SessionAuthGuard, RolesGuard)
export class IzinGuruController {
  constructor(private readonly svc: IzinService) {}

  /**
   * POST /api/izin/guru — guru mengajukan izin.
   * guruId dari sesi (bukan body).
   */
  @Post()
  @Roles('guru', 'admin', 'kepsek')
  ajukan(@Body() dto: AjukanIzinDto, @Req() req: Request) {
    return this.svc.ajukan(dto, req);
  }

  /**
   * GET /api/izin/guru — daftar izin milik sendiri.
   */
  @Get()
  @Roles('guru', 'admin', 'kepsek')
  listDiri(@Req() req: Request) {
    return this.svc.listDiri(req);
  }
}

// ─────────────────────────────────────────────
// Admin/Kepsek: list semua + setujui + tolak
// ─────────────────────────────────────────────

@Controller('api/admin/izin/guru')
@UseGuards(SessionAuthGuard, RolesGuard)
export class AdminIzinGuruController {
  constructor(private readonly svc: IzinService) {}

  /**
   * GET /api/admin/izin/guru?status=&dari=&sampai=&guruId=&page=&limit=
   * (admin|kepsek) — daftar semua izin berpaginasi + filter level DB.
   */
  @Get()
  @Roles('admin', 'kepsek')
  listAdmin(
    @Query('status') status?: StatusIzin,
    @Query('dari') dari?: string,
    @Query('sampai') sampai?: string,
    @Query('guruId') guruId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listAdmin({
      status,
      dari,
      sampai,
      guruId: guruId ? Number(guruId) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * PATCH /api/admin/izin/guru/:id/setujui
   * (admin|kepsek) — menyetujui izin MENUNGGU.
   * Guru TAK boleh approve sendiri (divalidasi di service).
   */
  @Patch(':id/setujui')
  @Roles('admin', 'kepsek')
  setujui(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KeputusanDto,
    @Req() req: Request,
  ) {
    return this.svc.setujui(id, dto, req);
  }

  /**
   * PATCH /api/admin/izin/guru/:id/tolak
   * (admin|kepsek) — menolak izin MENUNGGU.
   * alasan WAJIB (validasi di service).
   */
  @Patch(':id/tolak')
  @Roles('admin', 'kepsek')
  tolak(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KeputusanDto,
    @Req() req: Request,
  ) {
    return this.svc.tolak(id, dto, req);
  }
}
