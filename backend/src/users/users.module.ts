import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Session } from '../sessions/session.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SessionsModule } from '../sessions/sessions.module';
import { AuditModule } from '../audit/audit.module';
import { GuruModule } from '../guru/guru.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session]),
    SessionsModule,
    AuditModule,
    GuruModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
