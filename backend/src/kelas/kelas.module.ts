import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kelas } from './kelas.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { KelasService } from './kelas.service';
import { KelasController } from './kelas.controller';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { Penugasan } from '../kurikulum/penugasan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Kelas,
      Siswa,
      Guru,
      Penugasan,
      Session,
      User,
    ]),
    AuditModule,
  ],
  controllers: [KelasController],
  providers: [KelasService],
  exports: [KelasService],
})
export class KelasModule {}
