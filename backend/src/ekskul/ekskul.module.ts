import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ekskul } from './ekskul.entity';
import { EkskulPeserta } from './ekskul-peserta.entity';
import { EkskulTujuan } from './ekskul-tujuan.entity';
import { EkskulNilai } from './ekskul-nilai.entity';
import { EkskulKehadiran } from './ekskul-kehadiran.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Guru } from '../guru/guru.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { EkskulService } from './ekskul.service';
import { EkskulController } from './ekskul.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ekskul, EkskulPeserta, EkskulTujuan, EkskulNilai, EkskulKehadiran,
      Siswa, Guru, TahunAjaran, Session, User,
    ]),
    AuditModule,
  ],
  controllers: [EkskulController],
  providers: [EkskulService],
  exports: [EkskulService],
})
export class EkskulModule {}
