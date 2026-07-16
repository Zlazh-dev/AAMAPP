import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pengaturan } from './pengaturan.entity';
import { PengaturanService } from './pengaturan.service';
import {
  PengaturanController,
  PengaturanPublicController,
} from './pengaturan.controller';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pengaturan, Session, User]), AuditModule],
  controllers: [PengaturanController, PengaturanPublicController],
  providers: [PengaturanService],
  exports: [PengaturanService],
})
export class PengaturanModule {}
