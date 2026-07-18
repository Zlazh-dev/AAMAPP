import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rapor } from './rapor.entity';
import { RaporMapelOverride } from './rapor-mapel-override.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { Penilaian } from '../penilaian/penilaian.entity';
import { Nilai } from '../penilaian/nilai.entity';
import { TujuanPembelajaran } from '../penilaian/tujuan-pembelajaran.entity';
import { PenilaianTp } from '../penilaian/penilaian-tp.entity';
import { PresensiSiswa } from '../presensi/presensi-siswa.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { RaporService } from './rapor.service';
import { RaporController } from './rapor.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rapor,
      RaporMapelOverride,
      Siswa,
      Kelas,
      Guru,
      TahunAjaran,
      Penugasan,
      Penilaian,
      Nilai,
      TujuanPembelajaran,
      PenilaianTp,
      PresensiSiswa,
      Session,
      User,
    ]),
    AuditModule,
  ],
  controllers: [RaporController],
  providers: [RaporService],
  exports: [RaporService],
})
export class RaporModule {}
