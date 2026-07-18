import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresensiHarianGuru } from './presensi-harian-guru.entity';
import { Guru } from '../guru/guru.entity';
import { Pengaturan } from '../pengaturan/pengaturan.entity';
import { PresensiGuruService } from './presensi-guru.service';
import {
  GuruWajahController,
  GuruScanController,
  AdminWajahController,
} from './presensi-guru.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PresensiHarianGuru, Guru, Pengaturan]),
    AuditModule,
  ],
  controllers: [GuruWajahController, GuruScanController, AdminWajahController],
  providers: [PresensiGuruService],
  exports: [PresensiGuruService],
})
export class PresensiGuruModule {}
