import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
import { ActivityLog } from '../audit/activity-log.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { SeedService } from './seed.service';
import { SessionsModule } from '../sessions/sessions.module';
import { PengaturanModule } from '../pengaturan/pengaturan.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, ActivityLog, Pengaturan]),
    SessionsModule,
    PengaturanModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
