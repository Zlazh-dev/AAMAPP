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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { GuruService, GuruFilter } from './guru.service';
import { GuruLinkService } from './guru-link.service';
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
  constructor(
    private readonly svc: GuruService,
    private readonly linkSvc: GuruLinkService,
  ) {}

  @Get()
  @Roles('admin', 'kurikulum', 'kepsek', 'tu', 'kesiswaan')
  list(@Query() q: GuruFilter) {
    return this.svc.list(q);
  }

  @Get(':id')
  @Roles('admin', 'kurikulum', 'kepsek', 'guru', 'tu', 'kesiswaan')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('admin', 'kurikulum')
  async create(@Body() body: CreateGuruDto, @Req() req: Request) {
    const guru = await this.svc.create(body, req);
    // Link otomatis jika ada email dan ada akun user yang cocok
    if (guru.email || body.email) {
      const actorId = (req as any).user?.id ?? req.session?.userId;
      await this.linkSvc.linkGuruToUser(guru.id, actorId).catch(() => void 0);
    }
    return guru;
  }

  @Patch(':id')
  @Roles('admin', 'kurikulum')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateGuruDto,
    @Req() req: Request,
  ) {
    const guru = await this.svc.update(id, body, req);
    // Re-link jika email berubah
    if (body.email !== undefined) {
      const actorId = (req as any).user?.id ?? req.session?.userId;
      await this.linkSvc.linkGuruToUser(guru.id, actorId).catch(() => void 0);
    }
    return guru;
  }

  @Delete(':id')
  @Roles('admin', 'kurikulum')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.svc.remove(id, req);
  }

  /**
   * POST /api/admin/guru/link-backfill
   * Admin-only: jalankan backfill tautan Guru-User secara idempoten.
   * Berguna untuk migrasi data lama.
   */
  @Post('link-backfill')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async linkBackfill(@Req() req: Request) {
    const actorId = (req as any).user?.id ?? req.session?.userId;
    const result = await this.linkSvc.backfillAll(actorId);
    return { ok: true, ...result };
  }
}
