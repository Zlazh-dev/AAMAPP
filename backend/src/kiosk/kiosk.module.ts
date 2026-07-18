import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceKiosk } from './device-kiosk.entity';
import { PresensiHarianGuru } from '../presensi-guru/presensi-harian-guru.entity';
import { Guru } from '../guru/guru.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { KioskService } from './kiosk.service';
import {
  AdminDeviceKioskController,
  AdminPresensiGuruVerifikasiController,
  KioskPairController,
  KioskAuthController,
} from './kiosk.controller';
import { DeviceAuthGuard } from './device-auth.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceKiosk,
      PresensiHarianGuru,
      Guru,
      Pengaturan,
      Session,
      User,
    ]),
    AuditModule,
  ],
  controllers: [
    AdminDeviceKioskController,
    AdminPresensiGuruVerifikasiController,
    KioskPairController,
    KioskAuthController,
  ],
  providers: [KioskService, DeviceAuthGuard],
  exports: [KioskService],
})
export class KioskModule {}
