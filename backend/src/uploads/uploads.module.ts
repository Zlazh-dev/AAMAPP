import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { AuditModule } from '../audit/audit.module';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User]), AuditModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
