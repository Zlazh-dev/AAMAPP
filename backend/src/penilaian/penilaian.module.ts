import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TujuanPembelajaran } from './tujuan-pembelajaran.entity';
import { Penilaian } from './penilaian.entity';
import { PenilaianTp } from './penilaian-tp.entity';
import { Nilai } from './nilai.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { PenilaianService } from './penilaian.service';
import { PenilaianController } from './penilaian.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TujuanPembelajaran,
      Penilaian,
      PenilaianTp,
      Nilai,
      Penugasan,
      Siswa,
      Guru,
      TahunAjaran,
      Session,
      User,
    ]),
    AuditModule,
  ],
  controllers: [PenilaianController],
  providers: [PenilaianService],
  exports: [PenilaianService],
})
export class PenilaianModule {}
