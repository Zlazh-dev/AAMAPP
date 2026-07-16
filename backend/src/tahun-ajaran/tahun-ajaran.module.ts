import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TahunAjaran } from './tahun-ajaran.entity';
import { TahunAjaranService } from './tahun-ajaran.service';
import { TahunAjaranController } from './tahun-ajaran.controller';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TahunAjaran, Session, User]), AuditModule],
  controllers: [TahunAjaranController],
  providers: [TahunAjaranService],
  exports: [TahunAjaranService],
})
export class TahunAjaranModule {}
