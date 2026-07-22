import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guru } from './guru.entity';
import { Kelas } from '../kelas/kelas.entity';
import { GuruService } from './guru.service';
import { GuruLinkService } from './guru-link.service';
import { GuruController } from './guru.controller';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { KurikulumModule } from '../kurikulum/kurikulum.module';
import { TahunAjaranModule } from '../tahun-ajaran/tahun-ajaran.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guru, Kelas, Session, User]),
    AuditModule,
    KurikulumModule,
    TahunAjaranModule,
  ],
  controllers: [GuruController],
  providers: [GuruService, GuruLinkService],
  exports: [GuruService, GuruLinkService],
})
export class GuruModule {}
