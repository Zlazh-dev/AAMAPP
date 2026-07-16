import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TahunAjaranService } from './tahun-ajaran.service';
import {
  CreateTahunAjaranDto,
  UpdateTahunAjaranDto,
} from './dto/create-tahun-ajaran.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('api/admin/tahun-ajaran')
@UseGuards(SessionAuthGuard, RolesGuard)
export class TahunAjaranController {
  constructor(private readonly svc: TahunAjaranService) {}

  /**
   * Endpoint publik untuk semua role login (§8.2 — TA dipakai header).
   */
  @Get('active')
  @Roles('admin', 'guru', 'kepsek', 'kesiswaan', 'kurikulum', 'tu')
  getActive() {
    return this.svc.getActive();
  }

  @Get()
  @Roles('admin', 'guru', 'kepsek', 'kesiswaan', 'kurikulum', 'tu')
  listTa() {
    return this.svc.listTa();
  }

  @Get(':id')
  @Roles('admin', 'guru', 'kepsek', 'kesiswaan', 'kurikulum', 'tu')
  oneTa(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOneTa(id);
  }

  @Post()
  @Roles('admin')
  createTa(@Body() body: CreateTahunAjaranDto, @Req() req: Request) {
    return this.svc.createTa(body, req);
  }

  @Patch(':id')
  @Roles('admin')
  updateTa(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTahunAjaranDto,
    @Req() req: Request,
  ) {
    return this.svc.updateTa(id, body, req);
  }

  /**
   * T11-FIX Ronde 2 (Butir 3): aktifkan TA — endpoint terpisah.
   * Menjamin hanya 1 TA aktif pada satu waktu.
   */
  @Post(':id/aktifkan')
  @Roles('admin')
  activateTa(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.aktifkan(id, req);
  }

  @Delete(':id')
  @Roles('admin')
  removeTa(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.removeTa(id, req);
  }
}
