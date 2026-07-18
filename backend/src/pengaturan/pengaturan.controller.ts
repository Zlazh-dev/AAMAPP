import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PengaturanService, PengaturanKey } from './pengaturan.service';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

const VALID_KEYS: PengaturanKey[] = [
  'profil_sekolah',
  'jam_presensi',
  'lokasi',
  'kkm',
  'wajah', // F3a: konfigurasi pengenalan wajah guru
];

/**
 * T11-FIX Ronde 2 (Butir 4) — Pengaturan dengan 2 surface:
 *
 * 1) /api/pengaturan  → publik untuk SETIAP peran yang ber-token
 *    (admin, kepsek, kurikulum, kesiswaan, tu, guru). Siswa BUKAN
 *    pengguna sistem (A§5). BACA saja.
 *
 * 2) /api/admin/pengaturan  → tulis untuk admin.
 *    PATCH :key → upsert dengan deep-merge untuk value object.
 *
 * Struktur value mengikuti A§14.10.1 persis:
 *   jam_presensi { jamMasuk, jamPulang, toleransiMenit, cutoff }
 *   lokasi       { aktif, lat, lng, radiusMeter }
 *   kkm          { nilai }
 *
 * Key yang tersedia: profil_sekolah, jam_presensi, lokasi, kkm
 * (tahun_ajaran_aktif TIDAK ADA — sumber kebenaran tunggal = kolom `aktif`
 *  di entitas tahun_ajaran, via endpoint /api/admin/tahun-ajaran/:id/aktifkan)
 */
@Controller('api/pengaturan')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PengaturanPublicController {
  constructor(private readonly svc: PengaturanService) {}

  @Get()
  @Roles('admin', 'kepsek', 'kurikulum', 'kesiswaan', 'tu', 'guru')
  list() {
    return this.svc.listAll();
  }

  @Get(':key')
  @Roles('admin', 'kepsek', 'kurikulum', 'kesiswaan', 'tu', 'guru')
  one(@Param('key', new ParseEnumPipe(VALID_KEYS)) key: PengaturanKey) {
    return this.svc.getOne(key);
  }
}

@Controller('api/admin/pengaturan')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PengaturanController {
  constructor(private readonly svc: PengaturanService) {}

  /**
   * T11-FIX Ronde 2 (Butir 4): PATCH (merge parsial) sesuai A§14.10.2.
   * Deep-merge untuk value object. Primitive → replace.
   */
  @Patch(':key')
  @Roles('admin')
  upsert(
    @Param('key', new ParseEnumPipe(VALID_KEYS)) key: PengaturanKey,
    @Body() body: { value: any } | any,
    @Req() req: Request,
  ) {
    const incoming = body?.value ?? body;
    return this.svc.upsert(key, incoming, req);
  }
}
