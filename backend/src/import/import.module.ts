import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guru } from '../guru/guru.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { Mapel } from '../kurikulum/mapel.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';
import { JadwalKbm } from '../kurikulum/jadwal-kbm.entity';
import { KalenderLibur } from '../kurikulum/kalender-libur.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { ImportService } from './import.service';
import { KbmImportService } from './kbm-import.service';
import { ImportController } from './import.controller';
import { AuditModule } from '../audit/audit.module';
import { GuruModule } from '../guru/guru.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Guru, Siswa, Kelas, Session, User,
      Mapel, Penugasan, JadwalKbm, KalenderLibur, TahunAjaran,
    ]),
    AuditModule,
    GuruModule,
  ],
  controllers: [ImportController],
  providers: [ImportService, KbmImportService],
})
export class ImportModule {}
