import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './session.entity';
import { SessionsService } from './sessions.service';
import { AdminSessionsController } from './admin-sessions.controller';
import { AuditModule } from '../audit/audit.module';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User]), AuditModule],
  providers: [SessionsService],
  controllers: [AdminSessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
