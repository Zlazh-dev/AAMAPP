import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guru } from '../guru/guru.entity';
import { Siswa } from '../siswa/siswa.entity';
import { PresensiHarianGuru } from '../presensi-guru/presensi-harian-guru.entity';
import { PresensiSesi } from '../presensi/presensi-sesi.entity';
import { PresensiSiswa } from '../presensi/presensi-siswa.entity';
import { KalenderLibur } from '../kurikulum/kalender-libur.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { IzinGuru } from '../izin/izin-guru.entity';
import { ActivityLog } from '../audit/activity-log.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { LaporanService } from './laporan.service';
import { LaporanController, TuController } from './laporan.controller';
import { AuditModule } from '../audit/audit.module';
import { IzinModule } from '../izin/izin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Guru, Siswa, PresensiHarianGuru, PresensiSesi, PresensiSiswa,
      KalenderLibur, JadwalKbm, Penugasan, Pengaturan,
      IzinGuru, ActivityLog, Session, User,
    ]),
    AuditModule,
    IzinModule,
  ],
  controllers: [LaporanController, TuController],
  providers: [LaporanService],
  exports: [LaporanService],
})
export class LaporanModule {}
