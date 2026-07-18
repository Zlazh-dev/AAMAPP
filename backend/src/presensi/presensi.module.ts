import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresensiSesi } from './presensi-sesi.entity';
import { PresensiSiswa } from './presensi-siswa.entity';
import { PresensiService } from './presensi.service';
import {
  GuruPresensiController,
  GuruKelasRekapController,
  AdminPresensiController,
} from './presensi.controller';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { KalenderLibur } from '../kurikulum/kalender-libur.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { KesiswaanModule } from '../kesiswaan/kesiswaan.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PresensiSesi,
      PresensiSiswa,
      JadwalKbm,
      Penugasan,
      KalenderLibur,
      Siswa,
      Kelas,
      Guru,
      TahunAjaran,
      Pengaturan,
      Session,
      User,
    ]),
    AuditModule,
    forwardRef(() => KesiswaanModule),
  ],
  controllers: [
    GuruPresensiController,
    GuruKelasRekapController,
    AdminPresensiController,
  ],
  providers: [PresensiService],
  exports: [PresensiService],
})
export class PresensiModule {}
