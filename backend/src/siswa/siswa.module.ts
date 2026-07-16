import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Siswa } from './siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { SiswaService } from './siswa.service';
import { SiswaController } from './siswa.controller';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Siswa, Kelas, Session, User]), AuditModule],
  controllers: [SiswaController],
  providers: [SiswaService],
  exports: [SiswaService],
})
export class SiswaModule {}
