import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresensiHarianGuru } from './presensi-harian-guru.entity';
import { Guru } from '../guru/guru.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { KalenderLibur } from '../kurikulum/kalender-libur.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { PresensiGuruService } from './presensi-guru.service';
import {
  GuruWajahController,
  GuruScanController,
  AdminWajahController,
} from './presensi-guru.controller';
import { AuditModule } from '../audit/audit.module';
import { IzinModule } from '../izin/izin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PresensiHarianGuru, Guru, Pengaturan, Session, User,
      KalenderLibur, JadwalKbm, Penugasan,
    ]),
    AuditModule,
    IzinModule,
  ],
  controllers: [GuruWajahController, GuruScanController, AdminWajahController],
  providers: [PresensiGuruService],
  exports: [PresensiGuruService],
})
export class PresensiGuruModule {}
