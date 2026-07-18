import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KatalogPelanggaran } from './katalog-pelanggaran.entity';
import { Pelanggaran } from './pelanggaran.entity';
import { Siswa } from '../siswa/siswa.entity';
import { Kelas } from '../kelas/kelas.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { KesiswaanService } from './kesiswaan.service';
import { KesiswaanController } from './kesiswaan.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KatalogPelanggaran,
      Pelanggaran,
      Siswa,
      Kelas,
      TahunAjaran,
      Session,
      User,
    ]),
    AuditModule,
  ],
  controllers: [KesiswaanController],
  providers: [KesiswaanService],
  exports: [KesiswaanService],
})
export class KesiswaanModule {}
