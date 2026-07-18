import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IzinGuru } from './izin-guru.entity';
import { IzinService } from './izin.service';
import { IzinGuruController, AdminIzinGuruController } from './izin.controller';
import { Guru } from '../guru/guru.entity';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IzinGuru, Guru, User, Session]),
    AuditModule,
  ],
  controllers: [IzinGuruController, AdminIzinGuruController],
  providers: [IzinService],
  exports: [IzinService],
})
export class IzinModule {}
