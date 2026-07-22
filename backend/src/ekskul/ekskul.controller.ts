import {
  Controller, Get, Post, Patch, Delete, Put, Body, Param, Query,
  Req, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { EkskulService } from './ekskul.service';
import {
  CreateEkskulDto, UpdateEkskulDto, AddPesertaDto,
  CreateTujuanDto, UpdateTujuanDto, UpsertNilaiDto, UpsertKehadiranDto,
} from './dto/ekskul.dto';

@Controller('api/ekskul')
@UseGuards(SessionAuthGuard, RolesGuard)
export class EkskulController {
  constructor(private readonly svc: EkskulService) {}

  private user(req: Request) { return (req as any).user as { id: number; roles: string[] }; }

  // ─── EKSKUL CRUD (admin) ──────────────────────────────────────────────────
  @Get()           @Roles('admin','kepsek','guru','kurikulum')  listEkskul(@Query('page') page?: string, @Query('limit') limit?: string)                         { return this.svc.listEkskul(page ? parseInt(page,10) : undefined, limit ? parseInt(limit,10) : undefined); }
  @Get(':id')      @Roles('admin','kepsek','guru','kurikulum')  getEkskul(@Param('id', ParseIntPipe) id: number)           { return this.svc.getEkskul(id); }
  @Post()          @Roles('admin','kurikulum')                  createEkskul(@Body() dto: CreateEkskulDto, @Req() req: Request)         { return this.svc.createEkskul(dto, this.user(req).id, req); }
  @Patch(':id')    @Roles('admin','kurikulum')                  updateEkskul(@Param('id',ParseIntPipe) id:number, @Body() dto:UpdateEkskulDto, @Req() req:Request) { return this.svc.updateEkskul(id,dto,this.user(req).id,req); }
  @Delete(':id')   @Roles('admin','kurikulum')                  deleteEkskul(@Param('id',ParseIntPipe) id:number, @Req() req:Request)  { return this.svc.deleteEkskul(id,this.user(req).id,req); }

  // ─── PESERTA (pembina auth) ───────────────────────────────────────────────
  @Get(':id/peserta')
  @Roles('guru','admin','kurikulum')
  listPeserta(@Param('id',ParseIntPipe) id:number, @Req() req:Request) { return this.svc.listPeserta(id, this.user(req)); }

  @Post(':id/peserta')
  @Roles('guru','admin','kurikulum')
  addPeserta(@Param('id',ParseIntPipe) id:number, @Body() dto:AddPesertaDto, @Req() req:Request) { return this.svc.addPeserta(id,dto,this.user(req),req); }

  @Delete(':id/peserta/:pesertaId')
  @Roles('guru','admin','kurikulum')
  removePeserta(@Param('id',ParseIntPipe) id:number, @Param('pesertaId',ParseIntPipe) pesertaId:number, @Req() req:Request) { return this.svc.removePeserta(id,pesertaId,this.user(req),req); }

  // ─── TUJUAN (pembina auth) ────────────────────────────────────────────────
  @Get(':id/tujuan')
  @Roles('guru','admin')
  listTujuan(@Param('id',ParseIntPipe) id:number, @Query('semester') semStr:string, @Req() req:Request) {
    const sem = semStr ? parseInt(semStr, 10) : undefined;
    return this.svc.listTujuan(id, sem, this.user(req));
  }

  @Post(':id/tujuan')
  @Roles('guru','admin')
  createTujuan(@Param('id',ParseIntPipe) id:number, @Body() dto:CreateTujuanDto, @Req() req:Request) { return this.svc.createTujuan(id,dto,this.user(req),req); }

  @Patch(':id/tujuan/:tujuanId')
  @Roles('guru')
  updateTujuan(@Param('id',ParseIntPipe) id:number, @Param('tujuanId',ParseIntPipe) tujuanId:number, @Body() dto:UpdateTujuanDto, @Req() req:Request) { return this.svc.updateTujuan(id,tujuanId,dto,this.user(req),req); }

  @Delete(':id/tujuan/:tujuanId')
  @Roles('guru')
  deleteTujuan(@Param('id',ParseIntPipe) id:number, @Param('tujuanId',ParseIntPipe) tujuanId:number, @Req() req:Request) { return this.svc.deleteTujuan(id,tujuanId,this.user(req),req); }

  // ─── NILAI (pembina auth) ─────────────────────────────────────────────────
  @Put(':id/nilai')
  @Roles('guru')
  upsertNilai(@Param('id',ParseIntPipe) id:number, @Body() dto:UpsertNilaiDto, @Req() req:Request) { return this.svc.upsertNilai(id,dto,this.user(req),req); }

  // ─── KEHADIRAN (pembina auth) ─────────────────────────────────────────────
  @Put(':id/kehadiran')
  @Roles('guru')
  upsertKehadiran(@Param('id',ParseIntPipe) id:number, @Body() dto:UpsertKehadiranDto, @Req() req:Request) { return this.svc.upsertKehadiran(id,dto,this.user(req),req); }

  // ─── RAPOR ────────────────────────────────────────────────────────────────
  @Get('rapor/:siswaId')
  @Roles('guru','admin','kepsek','kesiswaan')
  getRapor(
    @Param('siswaId',ParseIntPipe) siswaId:number,
    @Query('tahunAjaranId') taIdStr?:string,
    @Query('semester') semStr?:string,
  ) {
    const taId = taIdStr ? parseInt(taIdStr,10) : undefined;
    const sem = semStr ? parseInt(semStr,10) : undefined;
    return this.svc.getRaporSiswa(siswaId,taId,sem);
  }
}
