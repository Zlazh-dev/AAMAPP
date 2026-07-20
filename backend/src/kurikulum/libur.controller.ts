import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { KurikulumService } from '../kurikulum/kurikulum.service';
import { CreateLiburDto } from '../kurikulum/dto/create-libur.dto';
import { BulkLiburDto } from '../kurikulum/dto/bulk-libur.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

/**
 * T12-FIX (Butir 8): Endpoint libur hanya di /api/admin/libur
 * (sesuai PROMPT_AGENT §14.10.2). LiburPublicController di /api/libur
 * sudah dihapus — endpoint publik tersebut DUPLIKAT dengan admin dan
 * tidak diperlukan karena akses libur selalu melewati otentikasi peran.
 */
@Controller('api/admin/libur')
@UseGuards(SessionAuthGuard, RolesGuard)
export class LiburAdminController {
  constructor(private readonly kurikulum: KurikulumService) {}

  @Get()
  @Roles('admin', 'kepsek', 'kurikulum', 'kesiswaan', 'tu', 'guru')
  list() {
    return this.kurikulum.listLibur();
  }

  // T15-FIX: rute statis WAJIB didaftarkan SEBELUM ':id' agar tidak
  // tertangkap sebagai parameter dinamis.
  @Get('cek-nasional')
  @Roles('admin', 'tu')
  cekNasional() {
    return this.kurikulum.cekNasional();
  }

  @Get('impor-nasional')
  @Roles('admin', 'tu')
  imporNasional(@Query('tahun') tahun: string) {
    const t = parseInt(tahun, 10) || new Date().getFullYear();
    return this.kurikulum.importNasionalPratinjau(t);
  }

  @Post()
  @Roles('admin', 'tu')
  create(@Body() body: CreateLiburDto, @Req() req: Request) {
    return this.kurikulum.createLibur(body, req);
  }

  @Post('bulk')
  @Roles('admin', 'tu')
  bulk(@Body() body: BulkLiburDto, @Req() req: Request) {
    return this.kurikulum.bulkLibur(body, req);
  }

  @Delete(':id')
  @Roles('admin', 'tu')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.kurikulum.removeLibur(id, req);
  }
}
