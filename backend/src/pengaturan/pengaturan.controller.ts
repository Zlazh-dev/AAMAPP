import {
  Body,
  Controller,
  ForbiddenException,
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
import { User } from '../users/user.entity';

const VALID_KEYS: PengaturanKey[] = [
  'profil_sekolah',
  'jam_presensi',
  'lokasi',
  'kkm',
  'wajah', // F3a: konfigurasi pengenalan wajah guru
];

/**
 * Peta otorisasi per-kunci untuk PATCH (tulis pengaturan).
 * Keputusan sebenarnya ada di sini — @Roles di level method hanya
 * saringan kasar (gabungan semua peran). Bila tidak cocok → 403
 * dengan pesan jelas (kunci mana, peran apa yg dibutuhkan).
 */
const PATCH_ROLES: Record<PengaturanKey, string[]> = {
  profil_sekolah: ['admin', 'tu'],
  jam_presensi: ['admin', 'tu'],
  lokasi: ['admin', 'tu'],
  kkm: ['admin', 'kurikulum'],
  wajah: ['admin'],
};

/** Semua peran yg boleh menulis setidaknya satu kunci — saringan kasar. */
const ALL_WRITE_ROLES = Array.from(
  new Set(Object.values(PATCH_ROLES).flat()),
);

/**
 * T11-FIX Ronde 2 (Butir 4) — Pengaturan dengan 2 surface:
 *
 * 1) /api/pengaturan  → publik untuk SETIAP peran yang ber-token
 *    (admin, kepsek, kurikulum, kesiswaan, tu, guru). Siswa BUKAN
 *    pengguna sistem (A§5). BACA saja.
 *
 * 2) /api/admin/pengaturan  → tulis dengan otorisasi per-kunci.
 *    PATCH :key → upsert dengan deep-merge untuk value object.
 *    @Roles di level method = saringan kasar; keputusan sebenarnya
 *    ada di peta PATCH_ROLES di handler.
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
   * PATCH (merge parsial) sesuai A§14.10.2.
   * Deep-merge untuk value object. Primitive → replace.
   *
   * Otorisasi per-kunci: @Roles di level method adalah saringan kasar
   * (gabungan semua peran yg boleh menulis setidaknya satu kunci).
   * Keputusan sebenarnya ada di peta PATCH_ROLES — bila peran pengguna
   * tidak termasuk daftar untuk kunci ini → 403 dgn pesan jelas.
   */
  @Patch(':key')
  @Roles(...ALL_WRITE_ROLES)
  upsert(
    @Param('key', new ParseEnumPipe(VALID_KEYS)) key: PengaturanKey,
    @Body() body: { value: any } | any,
    @Req() req: Request,
  ) {
    const user = (req as any).user as User | undefined;
    const userRoles: string[] = user?.roles ?? [];
    const allowed = PATCH_ROLES[key];
    const ok = allowed.some((r) => userRoles.includes(r));
    if (!ok) {
      throw new ForbiddenException(
        `Menulis pengaturan "${key}" memerlukan peran: ${allowed.join(', ')}. ` +
          `Peran Anda: ${userRoles.join(', ') || '(tidak ada)'}.`,
      );
    }
    const incoming = body?.value ?? body;
    return this.svc.upsert(key, incoming, req);
  }
}
