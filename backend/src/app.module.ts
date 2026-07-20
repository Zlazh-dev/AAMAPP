import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { PresensiSesi } from './presensi/presensi-sesi.entity';
import { PresensiSiswa } from './presensi/presensi-siswa.entity';
import { PresensiHarianGuru } from './presensi-guru/presensi-harian-guru.entity';
import { IzinGuru } from './izin/izin-guru.entity';
import { IzinModule } from './izin/izin.module';
import { LaporanModule } from './laporan/laporan.module';
import { KesiswaanModule } from './kesiswaan/kesiswaan.module';
import { KatalogPelanggaran } from './kesiswaan/katalog-pelanggaran.entity';
import { Pelanggaran } from './kesiswaan/pelanggaran.entity';
import { TindakLanjut } from './kesiswaan/tindak-lanjut.entity';
import { PenilaianModule } from './penilaian/penilaian.module';
import { TujuanPembelajaran } from './penilaian/tujuan-pembelajaran.entity';
import { Penilaian } from './penilaian/penilaian.entity';
import { PenilaianTp } from './penilaian/penilaian-tp.entity';
import { Nilai } from './penilaian/nilai.entity';
import { RaporModule } from './rapor/rapor.module';
import { Rapor } from './rapor/rapor.entity';
import { RaporMapelOverride } from './rapor/rapor-mapel-override.entity';
import { KokurikulerModule } from './kokurikuler/kokurikuler.module';
import { KokurikulerKegiatan } from './kokurikuler/kokurikuler-kegiatan.entity';
import { KokurikulerTarget } from './kokurikuler/kokurikuler-target.entity';
import { KokurikulerTim } from './kokurikuler/kokurikuler-tim.entity';
import { KokurikulerAsesmen } from './kokurikuler/kokurikuler-asesmen.entity';
import { EkskulModule } from './ekskul/ekskul.module';
import { Ekskul } from './ekskul/ekskul.entity';
import { EkskulPeserta } from './ekskul/ekskul-peserta.entity';
import { EkskulTujuan } from './ekskul/ekskul-tujuan.entity';
import { EkskulNilai } from './ekskul/ekskul-nilai.entity';
import { EkskulKehadiran } from './ekskul/ekskul-kehadiran.entity';
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
import { PresensiModule } from './presensi/presensi.module';
import { PresensiGuruModule } from './presensi-guru/presensi-guru.module';
import { SessionAuthGuard } from './common/session-auth.guard';

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
          PresensiSesi,
          PresensiSiswa,
          PresensiHarianGuru,
          IzinGuru,
          KatalogPelanggaran,
          Pelanggaran,
          TindakLanjut,
          TujuanPembelajaran,
          Penilaian,
          PenilaianTp,
          Nilai,
          Rapor,
          RaporMapelOverride,
          KokurikulerKegiatan,
          KokurikulerTarget,
          KokurikulerTim,
          KokurikulerAsesmen,
          Ekskul,
          EkskulPeserta,
          EkskulTujuan,
          EkskulNilai,
          EkskulKehadiran,
        ],
        // SEC-1 Butir 3: synchronize hanya aktif di luar production.
        // Di production, skema DB TIDAK di-auto-sync oleh TypeORM lagi
        // (mencegah DROP kolom/tabel tak sengaja saat entity berubah).
        // KONSEKUENSI: perubahan skema di production HARUS dilakukan via
        // migration TypeORM eksplisit atau perintah SQL manual/seeder —
        // start aplikasi TIDAK lagi otomatis menyamakan skema dengan
        // entities. Tim deploy wajib menjalankan migration sebelum
        // rilis yang mengubah entity.
        synchronize: process.env.NODE_ENV !== 'production',
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
    PresensiModule,
    PresensiGuruModule,
    IzinModule,
    LaporanModule,
    KesiswaanModule,
    PenilaianModule,
    RaporModule,
    KokurikulerModule,
    EkskulModule,
  ],
  providers: [
    // SEC-1 Butir 2: SessionAuthGuard didaftarkan sebagai APP_GUARD
    // global — SEMUA endpoint kini butuh token valid walau controller
    // lupa memasang @UseGuards(SessionAuthGuard). Route yang sengaja
    // publik (login, auth/config, google, register-google) memakai
    // dekorator @Public() untuk melewati guard ini.
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
  ],
})
export class AppModule {}
