import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guru } from '../guru/guru.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { AuditModule } from '../audit/audit.module';
import { GuruModule } from '../guru/guru.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guru, Siswa, Kelas, Session, User]),
    AuditModule,
    GuruModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
