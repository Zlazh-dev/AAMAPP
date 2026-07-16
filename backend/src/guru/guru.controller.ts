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
import { GuruService, GuruFilter } from './guru.service';
import { CreateGuruDto, UpdateGuruDto } from './dto/create-guru.dto';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

/**
 * T11-FIX Ronde 2 (Butir 1): §8.2 — Data induk CRUD = Admin saja,
 * peran lain hanya BACA. (Tidak ada pengecualian di guru.)
 */
@Controller('api/admin/guru')
@UseGuards(SessionAuthGuard, RolesGuard)
export class GuruController {
  constructor(private readonly svc: GuruService) {}

  @Get()
  @Roles('admin', 'kurikulum', 'kepsek')
  list(@Query() q: GuruFilter) {
    return this.svc.list(q);
  }

  @Get(':id')
  @Roles('admin', 'kurikulum', 'kepsek', 'guru')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: CreateGuruDto, @Req() req: Request) {
    return this.svc.create(body, req);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateGuruDto,
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
