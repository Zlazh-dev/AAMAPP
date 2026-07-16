import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './users/user.entity';
import { Session } from './sessions/session.entity';
import { ActivityLog } from './audit/activity-log.entity';
import { Guru } from './guru/guru.entity';
import { Kelas } from './kelas/kelas.entity';
import { Siswa } from './siswa/siswa.entity';
import { TahunAjaran } from './tahun-ajaran/tahun-ajaran.entity';
import { Pengaturan } from './pengaturan/pengaturan.entity';
import { Mapel } from './kurikulum/mapel.entity';
import { Penugasan } from './kurikulum/penugasan.entity';
import { JadwalKbm } from './kurikulum/jadwal-kbm.entity';
import { KalenderLibur } from './kurikulum/kalender-libur.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { AuditModule } from './audit/audit.module';
import { ProfileModule } from './profile/profile.module';
import { SeedModule } from './seed/seed.module';
import { GuruModule } from './guru/guru.module';
import { KelasModule } from './kelas/kelas.module';
import { SiswaModule } from './siswa/siswa.module';
import { TahunAjaranModule } from './tahun-ajaran/tahun-ajaran.module';
import { PengaturanModule } from './pengaturan/pengaturan.module';
import { KurikulumModule } from './kurikulum/kurikulum.module';
import { ImportModule } from './import/import.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'db',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.POSTGRES_USER || 'aamapp',
        password: process.env.POSTGRES_PASSWORD || 'aamapp_dev_change_me',
        database: process.env.POSTGRES_DB || 'aamapp',
        entities: [
          User,
          Session,
          ActivityLog,
          Guru,
          Kelas,
          Siswa,
          TahunAjaran,
          Pengaturan,
          Mapel,
          Penugasan,
          JadwalKbm,
          KalenderLibur,
        ],
        synchronize: true,
        timezone: 'Asia/Jakarta',
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([User, Session, ActivityLog]),
    AuthModule,
    UsersModule,
    SessionsModule,
    AuditModule,
    ProfileModule,
    SeedModule,
    GuruModule,
    KelasModule,
    SiswaModule,
    TahunAjaranModule,
    PengaturanModule,
    KurikulumModule,
    ImportModule,
    UploadsModule,
  ],
})
export class AppModule {}
