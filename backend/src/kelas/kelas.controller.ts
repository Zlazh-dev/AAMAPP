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
import { KelasService, KelasFilter } from './kelas.service';
import {
  CreateKelasDto,
  UpdateKelasDto,
  SetWaliDto,
} from './dto/create-kelas.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

/**
 * T11-FIX Ronde 2 (Butir 1): §8.2 — CRUD kelas = Admin saja,
 * kecuali PATCH /:id/wali = admin + kurikulum.
 * ?force dihapus dari DELETE (Butir 9).
 */
@Controller('api/admin/kelas')
@UseGuards(SessionAuthGuard, RolesGuard)
export class KelasController {
  constructor(private readonly svc: KelasService) {}

  @Get()
  @Roles('admin', 'kurikulum', 'kesiswaan', 'kepsek', 'guru')
  list(@Query() q: KelasFilter) {
    return this.svc.list(q);
  }

  @Get(':id')
  @Roles('admin', 'kurikulum', 'kesiswaan', 'kepsek', 'guru')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('admin', 'kurikulum')
  create(@Body() body: CreateKelasDto, @Req() req: Request) {
    return this.svc.create(body, req);
  }

  @Patch(':id')
  @Roles('admin', 'kurikulum')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateKelasDto,
    @Req() req: Request,
  ) {
    return this.svc.update(id, body, req);
  }

  /**
   * T11-FIX #7: ganti wali kelas (PATCH terpisah dari update umum).
   * Akses: admin + kurikulum (kepsek/operator/guru BUKAN operator data induk).
   */
  @Patch(':id/wali')
  @Roles('admin', 'kurikulum')
  setWali(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetWaliDto,
    @Req() req: Request,
  ) {
    return this.svc.setWali(id, body, req);
  }

  @Get(':id/dampak-hapus')
  @Roles('admin', 'kurikulum')
  dampakHapus(@Param('id', ParseIntPipe) id: number) {
    return this.svc.dampakHapus(id);
  }

  @Delete(':id')
  @Roles('admin', 'kurikulum')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.remove(id, req);
  }
}
