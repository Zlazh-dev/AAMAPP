import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mapel } from './mapel.entity';
import { Penugasan } from './penugasan.entity';
import { JadwalKbm } from './jadwal-kbm.entity';
import { JamPelajaran } from './jam-pelajaran.entity';
import { KalenderLibur } from './kalender-libur.entity';
import { KurikulumService } from './kurikulum.service';
import { KurikulumController } from './kurikulum.controller';
import { LiburAdminController } from './libur.controller';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { Guru } from '../guru/guru.entity';
import { Kelas } from '../kelas/kelas.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { TahunAjaranModule } from '../tahun-ajaran/tahun-ajaran.module';
import { PengaturanModule } from '../pengaturan/pengaturan.module';
import { Penilaian } from '../penilaian/penilaian.entity';
import { Nilai } from '../penilaian/nilai.entity';
import { Siswa } from '../siswa/siswa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Mapel,
      Penugasan,
      JadwalKbm,
      JamPelajaran,
      KalenderLibur,
      Session,
      User,
      Guru,
      Kelas,
      TahunAjaran,
      Pengaturan,
      Penilaian,
      Nilai,
      Siswa,
    ]),
    AuditModule,
    TahunAjaranModule,
    PengaturanModule,
  ],
  controllers: [KurikulumController, LiburAdminController],
  providers: [KurikulumService],
  exports: [KurikulumService],
})
export class KurikulumModule {}
