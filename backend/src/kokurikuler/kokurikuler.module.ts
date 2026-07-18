import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KokurikulerKegiatan } from './kokurikuler-kegiatan.entity';
import { KokurikulerTarget } from './kokurikuler-target.entity';
import { KokurikulerTim } from './kokurikuler-tim.entity';
import { KokurikulerAsesmen } from './kokurikuler-asesmen.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { KokurikulerService } from './kokurikuler.service';
import { KokurikulerController } from './kokurikuler.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KokurikulerKegiatan,
      KokurikulerTarget,
      KokurikulerTim,
      KokurikulerAsesmen,
      Siswa,
      Guru,
      TahunAjaran,
      Session,
      User,
    ]),
    AuditModule,
  ],
  controllers: [KokurikulerController],
  providers: [KokurikulerService],
  exports: [KokurikulerService],
})
export class KokurikulerModule {}
