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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SiswaService, SiswaFilter } from './siswa.service';
import { CreateSiswaDto, UpdateSiswaDto } from './dto/create-siswa.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

/**
 * T11-FIX Ronde 2 (Butir 1): §8.2 — Data induk CRUD = Admin saja.
 * Import & template akan dipindah ke /api/admin/import/* (Butir 11).
 */
@Controller('api/admin/siswa')
@UseGuards(SessionAuthGuard, RolesGuard)
export class SiswaController {
  constructor(private readonly svc: SiswaService) {}

  @Get()
  @Roles('admin', 'kesiswaan', 'kurikulum', 'kepsek', 'guru')
  list(@Query() q: SiswaFilter) {
    return this.svc.list(q);
  }

  @Get(':id')
  @Roles('admin', 'kesiswaan', 'kurikulum', 'kepsek', 'guru')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: CreateSiswaDto, @Req() req: Request) {
    return this.svc.create(body, req);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSiswaDto,
    @Req() req: Request,
  ) {
    return this.svc.update(id, body, req);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.remove(id, req);
  }
}
