import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LaporanService } from './laporan.service';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('api/admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'kepsek')
export class LaporanController {
  constructor(private readonly svc: LaporanService) {}

  /**
   * GET /api/admin/dashboard?tanggal=YYYY-MM-DD
   * Agregat hari ini: guruStatus, kbm, siswa, perluPerhatian, feed.
   */
  @Get('dashboard')
  dashboard(@Query('tanggal') tanggal?: string) {
    return this.svc.dashboard(tanggal);
  }

  /**
   * GET /api/admin/laporan/harian-guru?dari=&sampai=&guruId?&page?&limit?
   * Σ status per guru + %hadir atas hari wajib.
   */
  @Get('laporan/harian-guru')
  laporanHarianGuru(
    @Query('dari') dari = '',
    @Query('sampai') sampai = '',
    @Query('guruId') guruId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    return this.svc.laporanHarianGuru({
      dari: dari || today,
      sampai: sampai || today,
      guruId: guruId ? Number(guruId) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * GET /api/admin/laporan/keterlaksanaan-kbm?dari=&sampai=&guruId?&kelasId?&mapelId?&page?&limit?
   * Total KBM dijadwalkan vs terlaksana + %.
   */
  @Get('laporan/keterlaksanaan-kbm')
  laporanKeterlaksanaan(
    @Query('dari') dari = '',
    @Query('sampai') sampai = '',
    @Query('guruId') guruId?: string,
    @Query('kelasId') kelasId?: string,
    @Query('mapelId') mapelId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    return this.svc.laporanKeterlaksanaanKbm({
      dari: dari || today,
      sampai: sampai || today,
      guruId: guruId ? Number(guruId) : undefined,
      kelasId: kelasId ? Number(kelasId) : undefined,
      mapelId: mapelId ? Number(mapelId) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * GET /api/admin/laporan/siswa?dari=&sampai=&kelasId?&mapelId?&page?&limit?
   * Σ H/S/I/A/T per siswa + %hadir.
   */
  @Get('laporan/siswa')
  laporanSiswa(
    @Query('dari') dari = '',
    @Query('sampai') sampai = '',
    @Query('kelasId') kelasId?: string,
    @Query('mapelId') mapelId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    return this.svc.laporanSiswa({
      dari: dari || today,
      sampai: sampai || today,
      kelasId: kelasId ? Number(kelasId) : undefined,
      mapelId: mapelId ? Number(mapelId) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}

/**
 * TU (Tata Usaha) Controller
 * GET /api/tu/rekap-guru?bulan=YYYY-MM — rekap bulanan kehadiran guru.
 * @Roles('tu','admin'): TU bisa akses, admin bisa akses, kepsek/guru tidak.
 */
@Controller('api/tu')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('tu', 'admin')
export class TuController {
  constructor(private readonly svc: LaporanService) {}

  /**
   * GET /api/tu/rekap-guru?bulan=YYYY-MM&guruId?&page?&limit?
   * Rekap kehadiran bulanan per guru (hariWajib, hadir, terlambat, izin,
   * sakit, dinas, alpha, libur, pctHadir). Reuse laporanHarianGuru scope bulan.
   */
  @Get('rekap-guru')
  rekapGuru(
    @Query('bulan') bulan?: string,
    @Query('guruId') guruId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Default: bulan ini
    const defaultBulan = new Date().toISOString().slice(0, 7);
    return this.svc.rekapBulananGuru({
      bulan: bulan || defaultBulan,
      guruId: guruId ? Number(guruId) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}

