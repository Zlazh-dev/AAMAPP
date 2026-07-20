import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration awal — menciptakan semua tabel dari entity AAMAPP.
 * Memakai IF NOT EXISTS agar idempotent (aman untuk DB yang sudah ada
 * skema dari synchronize:true masa dev).
 *
 * Urutan CREATE TABLE mengikuti dependency FK:
 *   users → sessions, activity_logs, guru, kelas, siswa, pengaturan,
 *   tahun_ajaran, mapel, penugasan, jadwal_kbm, kalender_libur,
 *   presensi_sesi, presensi_siswa, presensi_harian_guru, izin_guru,
 *   katalog_pelanggaran, pelanggaran, tindak_lanjut,
 *   tujuan_pembelajaran, penilaian, penilaian_tp, nilai,
 *   rapor, rapor_mapel_override,
 *   kokurikuler_kegiatan, kokurikuler_target, kokurikuler_tim, kokurikuler_asesmen,
 *   ekskul, ekskul_peserta, ekskul_tujuan, ekskul_nilai, ekskul_kehadiran
 */
export class InitialSchema1721394000000 implements MigrationInterface {
  name = 'InitialSchema1721394000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── users ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"               SERIAL PRIMARY KEY,
        "name"             VARCHAR(200) NOT NULL,
        "email"            VARCHAR(200) NOT NULL UNIQUE,
        "passwordHash"     VARCHAR(255),
        "googleSub"        VARCHAR(255),
        "status"           VARCHAR(20) NOT NULL DEFAULT 'pending',
        "roles"            TEXT[] NOT NULL DEFAULT '{}',
        "requestedRoles"   TEXT[] NOT NULL DEFAULT '{}',
        "registrationNote" TEXT,
        "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── sessions ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"       INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "userAgent"    TEXT,
        "ipAddress"    VARCHAR(60),
        "deviceSummary" VARCHAR(255),
        "lastActiveAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "expiresAt"    TIMESTAMPTZ NOT NULL,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sessions_userId" ON "sessions"("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sessions_expiresAt" ON "sessions"("expiresAt")`);

    // ── activity_logs ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_logs" (
        "id"           SERIAL PRIMARY KEY,
        "userId"       INTEGER NOT NULL,
        "userName"     VARCHAR(200) NOT NULL,
        "userEmail"    VARCHAR(200) NOT NULL,
        "action"       VARCHAR(50) NOT NULL,
        "entity"       VARCHAR(100) NOT NULL,
        "entityId"     VARCHAR(100),
        "entityLabel"  VARCHAR(500),
        "summary"      TEXT,
        "diff"         JSONB,
        "ipAddress"    VARCHAR(60),
        "deviceSummary" VARCHAR(255),
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_userId" ON "activity_logs"("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_createdAt" ON "activity_logs"("createdAt")`);

    // ── guru ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "guru" (
        "id"          SERIAL PRIMARY KEY,
        "nama"        VARCHAR(200) NOT NULL,
        "nip"         VARCHAR(50),
        "mapelUtama"  VARCHAR(200),
        "email"       VARCHAR(200),
        "telepon"     VARCHAR(30),
        "fotoUrl"     TEXT,
        "aktif"       BOOLEAN NOT NULL DEFAULT true,
        "faceStatus"  VARCHAR(20) NOT NULL DEFAULT 'TIDAK_TERDAFTAR',
        "faceEmbedding" JSONB,
        "userId"      INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── kelas ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kelas" (
        "id"          SERIAL PRIMARY KEY,
        "nama"        VARCHAR(100) NOT NULL,
        "tingkat"     INTEGER,
        "tahunAjaranId" INTEGER,
        "waliGuruId"  INTEGER REFERENCES "guru"("id") ON DELETE SET NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── siswa ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "siswa" (
        "id"          SERIAL PRIMARY KEY,
        "nama"        VARCHAR(200) NOT NULL,
        "nis"         VARCHAR(50),
        "nisn"        VARCHAR(50),
        "kelasId"     INTEGER REFERENCES "kelas"("id") ON DELETE SET NULL,
        "tempatLahir" VARCHAR(100),
        "tanggalLahir" DATE,
        "jenisKelamin" VARCHAR(10),
        "alamat"      TEXT,
        "fotoUrl"     TEXT,
        "aktif"       BOOLEAN NOT NULL DEFAULT true,
        "userId"      INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── tahun_ajaran ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tahun_ajaran" (
        "id"       SERIAL PRIMARY KEY,
        "nama"     VARCHAR(9) NOT NULL,
        "semester" INTEGER NOT NULL DEFAULT 1,
        "aktif"    BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_tahun_ajaran_nama_semester" UNIQUE ("nama", "semester")
      )
    `);

    // FK kelas.tahunAjaranId → tahun_ajaran (add after both tables created)
    await queryRunner.query(`
      ALTER TABLE "kelas" ADD CONSTRAINT IF NOT EXISTS "FK_kelas_tahunAjaran"
        FOREIGN KEY ("tahunAjaranId") REFERENCES "tahun_ajaran"("id") ON DELETE SET NULL
    `).catch(() => { /* constraint may already exist */ });

    // ── pengaturan ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pengaturan" (
        "id"    SERIAL PRIMARY KEY,
        "key"   VARCHAR(100) NOT NULL UNIQUE,
        "value" JSONB NOT NULL DEFAULT '{}'
      )
    `);

    // ── mapel ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mapel" (
        "id"          SERIAL PRIMARY KEY,
        "nama"        VARCHAR(200) NOT NULL,
        "kode"        VARCHAR(20),
        "kelompok"    VARCHAR(100),
        "aktif"       BOOLEAN NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── penugasan ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "penugasan" (
        "id"          SERIAL PRIMARY KEY,
        "guruId"      INTEGER NOT NULL REFERENCES "guru"("id") ON DELETE CASCADE,
        "kelasId"     INTEGER NOT NULL REFERENCES "kelas"("id") ON DELETE CASCADE,
        "mapelId"     INTEGER NOT NULL REFERENCES "mapel"("id") ON DELETE CASCADE,
        "tahunAjaranId" INTEGER NOT NULL REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE,
        "semester"    INTEGER NOT NULL DEFAULT 1,
        "isWali"      BOOLEAN NOT NULL DEFAULT false,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── jadwal_kbm ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "jadwal_kbm" (
        "id"          SERIAL PRIMARY KEY,
        "penugasanId" INTEGER NOT NULL REFERENCES "penugasan"("id") ON DELETE CASCADE,
        "hariKe"      INTEGER NOT NULL,
        "jamMulai"    VARCHAR(10) NOT NULL,
        "jamSelesai"  VARCHAR(10) NOT NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── kalender_libur ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kalender_libur" (
        "id"          SERIAL PRIMARY KEY,
        "tanggal"     DATE NOT NULL UNIQUE,
        "keterangan"  VARCHAR(255),
        "jenis"       VARCHAR(50) NOT NULL DEFAULT 'nasional',
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── presensi_sesi ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "presensi_sesi" (
        "id"          SERIAL PRIMARY KEY,
        "penugasanId" INTEGER NOT NULL REFERENCES "penugasan"("id") ON DELETE CASCADE,
        "tanggal"     DATE NOT NULL,
        "jamMulai"    VARCHAR(10),
        "jamSelesai"  VARCHAR(10),
        "dilaksanakan" BOOLEAN NOT NULL DEFAULT false,
        "catatanGuru" TEXT,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── presensi_siswa ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "presensi_siswa" (
        "id"          SERIAL PRIMARY KEY,
        "sesiId"      INTEGER NOT NULL REFERENCES "presensi_sesi"("id") ON DELETE CASCADE,
        "siswaId"     INTEGER NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
        "status"      VARCHAR(20) NOT NULL DEFAULT 'H',
        "keterangan"  TEXT,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_presensi_siswa_sesi_siswa" ON "presensi_siswa"("sesiId", "siswaId")`);

    // ── presensi_harian_guru ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "presensi_harian_guru" (
        "id"          SERIAL PRIMARY KEY,
        "guruId"      INTEGER NOT NULL REFERENCES "guru"("id") ON DELETE CASCADE,
        "tanggal"     DATE NOT NULL,
        "status"      VARCHAR(20) NOT NULL DEFAULT 'HADIR',
        "waktuCheckin" TIMESTAMPTZ,
        "metode"      VARCHAR(30),
        "alasan"      TEXT,
        "fotoUrl"     TEXT,
        "latitude"    DOUBLE PRECISION,
        "longitude"   DOUBLE PRECISION,
        "approvedBy"  INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_presensi_harian_guru_guru_tanggal" ON "presensi_harian_guru"("guruId", "tanggal")`);

    // ── izin_guru ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "izin_guru" (
        "id"          SERIAL PRIMARY KEY,
        "guruId"      INTEGER NOT NULL REFERENCES "guru"("id") ON DELETE CASCADE,
        "tanggalMulai" DATE NOT NULL,
        "tanggalSelesai" DATE NOT NULL,
        "jenis"       VARCHAR(50) NOT NULL,
        "alasan"      TEXT NOT NULL,
        "status"      VARCHAR(20) NOT NULL DEFAULT 'MENUNGGU',
        "keputusan"   TEXT,
        "approvedById" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "approvedAt"  TIMESTAMPTZ,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── katalog_pelanggaran ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "katalog_pelanggaran" (
        "id"       SERIAL PRIMARY KEY,
        "kode"     VARCHAR(20) NOT NULL UNIQUE,
        "nama"     VARCHAR(300) NOT NULL,
        "poin"     INTEGER NOT NULL DEFAULT 0,
        "kategori" VARCHAR(100),
        "aktif"    BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── pelanggaran ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pelanggaran" (
        "id"           SERIAL PRIMARY KEY,
        "siswaId"      INTEGER NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
        "katalogId"    INTEGER NOT NULL REFERENCES "katalog_pelanggaran"("id") ON DELETE RESTRICT,
        "tanggal"      DATE NOT NULL,
        "catatan"      TEXT,
        "poin"         INTEGER NOT NULL DEFAULT 0,
        "status"       VARCHAR(30) NOT NULL DEFAULT 'MENUNGGU',
        "pelaporId"    INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "verifikatorId" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "verifikasiAt" TIMESTAMPTZ,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── tindak_lanjut ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tindak_lanjut" (
        "id"           SERIAL PRIMARY KEY,
        "pelanggaranId" INTEGER NOT NULL REFERENCES "pelanggaran"("id") ON DELETE CASCADE,
        "jenis"        VARCHAR(100) NOT NULL,
        "catatan"      TEXT,
        "tanggal"      DATE NOT NULL,
        "petugasId"    INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── tujuan_pembelajaran ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tujuan_pembelajaran" (
        "id"          SERIAL PRIMARY KEY,
        "penugasanId" INTEGER NOT NULL REFERENCES "penugasan"("id") ON DELETE CASCADE,
        "kode"        VARCHAR(30),
        "deskripsi"   TEXT NOT NULL,
        "bobot"       INTEGER NOT NULL DEFAULT 1,
        "semester"    INTEGER NOT NULL DEFAULT 1,
        "urutan"      INTEGER NOT NULL DEFAULT 0,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── penilaian ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "penilaian" (
        "id"          SERIAL PRIMARY KEY,
        "penugasanId" INTEGER NOT NULL REFERENCES "penugasan"("id") ON DELETE CASCADE,
        "nama"        VARCHAR(300) NOT NULL,
        "jenis"       VARCHAR(50) NOT NULL DEFAULT 'TP',
        "tanggal"     DATE,
        "semester"    INTEGER NOT NULL DEFAULT 1,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── penilaian_tp ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "penilaian_tp" (
        "id"           SERIAL PRIMARY KEY,
        "penilaianId"  INTEGER NOT NULL REFERENCES "penilaian"("id") ON DELETE CASCADE,
        "tpId"         INTEGER NOT NULL REFERENCES "tujuan_pembelajaran"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_penilaian_tp" ON "penilaian_tp"("penilaianId", "tpId")`);

    // ── nilai ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nilai" (
        "id"          SERIAL PRIMARY KEY,
        "penilaianId" INTEGER NOT NULL REFERENCES "penilaian"("id") ON DELETE CASCADE,
        "siswaId"     INTEGER NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
        "nilai"       DOUBLE PRECISION,
        "catatan"     TEXT,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_nilai_penilaian_siswa" ON "nilai"("penilaianId", "siswaId")`);

    // ── rapor ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rapor" (
        "id"           SERIAL PRIMARY KEY,
        "siswaId"      INTEGER NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
        "tahunAjaranId" INTEGER NOT NULL REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE,
        "semester"     INTEGER NOT NULL DEFAULT 1,
        "status"       VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        "catatanWali"  TEXT,
        "snapshot"     JSONB,
        "finalizedAt"  TIMESTAMPTZ,
        "finalizedById" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_rapor_siswa_ta_sem" ON "rapor"("siswaId", "tahunAjaranId", "semester")`);

    // ── rapor_mapel_override ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rapor_mapel_override" (
        "id"           SERIAL PRIMARY KEY,
        "raporId"      INTEGER NOT NULL REFERENCES "rapor"("id") ON DELETE CASCADE,
        "penugasanId"  INTEGER NOT NULL REFERENCES "penugasan"("id") ON DELETE CASCADE,
        "nilaiKatrol"  DOUBLE PRECISION,
        "deskripsiOverride" TEXT,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_rapor_mapel_override" ON "rapor_mapel_override"("raporId", "penugasanId")`);

    // ── kokurikuler_kegiatan ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kokurikuler_kegiatan" (
        "id"          SERIAL PRIMARY KEY,
        "nama"        VARCHAR(300) NOT NULL,
        "deskripsi"   TEXT,
        "tahunAjaranId" INTEGER NOT NULL REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE,
        "semester"    INTEGER NOT NULL DEFAULT 1,
        "aktif"       BOOLEAN NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── kokurikuler_target ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kokurikuler_target" (
        "id"         SERIAL PRIMARY KEY,
        "kegiatanId" INTEGER NOT NULL REFERENCES "kokurikuler_kegiatan"("id") ON DELETE CASCADE,
        "dimensi"    VARCHAR(200) NOT NULL,
        "deskripsi"  TEXT,
        "urutan"     INTEGER NOT NULL DEFAULT 0
      )
    `);

    // ── kokurikuler_tim ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kokurikuler_tim" (
        "id"         SERIAL PRIMARY KEY,
        "kegiatanId" INTEGER NOT NULL REFERENCES "kokurikuler_kegiatan"("id") ON DELETE CASCADE,
        "guruId"     INTEGER NOT NULL REFERENCES "guru"("id") ON DELETE CASCADE,
        "peran"      VARCHAR(100),
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_kokurikuler_tim" ON "kokurikuler_tim"("kegiatanId", "guruId")`);

    // ── kokurikuler_asesmen ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kokurikuler_asesmen" (
        "id"         SERIAL PRIMARY KEY,
        "kegiatanId" INTEGER NOT NULL REFERENCES "kokurikuler_kegiatan"("id") ON DELETE CASCADE,
        "siswaId"    INTEGER NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
        "targetId"   INTEGER NOT NULL REFERENCES "kokurikuler_target"("id") ON DELETE CASCADE,
        "penilaiId"  INTEGER NOT NULL REFERENCES "guru"("id") ON DELETE CASCADE,
        "nilai"      VARCHAR(5) NOT NULL DEFAULT 'B',
        "catatan"    TEXT,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_kokurikuler_asesmen" ON "kokurikuler_asesmen"("kegiatanId","siswaId","targetId","penilaiId")`);

    // ── ekskul ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ekskul" (
        "id"           SERIAL PRIMARY KEY,
        "nama"         VARCHAR(200) NOT NULL,
        "pembinaGuruId" INTEGER REFERENCES "guru"("id") ON DELETE SET NULL,
        "aktif"        BOOLEAN NOT NULL DEFAULT true,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── ekskul_peserta ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ekskul_peserta" (
        "id"        SERIAL PRIMARY KEY,
        "ekskulId"  INTEGER NOT NULL REFERENCES "ekskul"("id") ON DELETE CASCADE,
        "siswaId"   INTEGER NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
        "semester"  INTEGER NOT NULL DEFAULT 1,
        "tahunAjaranId" INTEGER NOT NULL REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ekskul_peserta" ON "ekskul_peserta"("ekskulId","siswaId","tahunAjaranId","semester")`);

    // ── ekskul_tujuan ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ekskul_tujuan" (
        "id"        SERIAL PRIMARY KEY,
        "ekskulId"  INTEGER NOT NULL REFERENCES "ekskul"("id") ON DELETE CASCADE,
        "deskripsi" TEXT NOT NULL,
        "semester"  INTEGER NOT NULL DEFAULT 1,
        "urutan"    INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── ekskul_nilai ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ekskul_nilai" (
        "id"        SERIAL PRIMARY KEY,
        "ekskulId"  INTEGER NOT NULL REFERENCES "ekskul"("id") ON DELETE CASCADE,
        "siswaId"   INTEGER NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
        "tujuanId"  INTEGER NOT NULL REFERENCES "ekskul_tujuan"("id") ON DELETE CASCADE,
        "nilai"     VARCHAR(5) NOT NULL DEFAULT 'B',
        "semester"  INTEGER NOT NULL DEFAULT 1,
        "tahunAjaranId" INTEGER NOT NULL REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ekskul_nilai" ON "ekskul_nilai"("ekskulId","siswaId","tujuanId","tahunAjaranId","semester")`);

    // ── ekskul_kehadiran ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ekskul_kehadiran" (
        "id"        SERIAL PRIMARY KEY,
        "ekskulId"  INTEGER NOT NULL REFERENCES "ekskul"("id") ON DELETE CASCADE,
        "siswaId"   INTEGER NOT NULL REFERENCES "siswa"("id") ON DELETE CASCADE,
        "tanggal"   DATE NOT NULL,
        "hadir"     BOOLEAN NOT NULL DEFAULT true,
        "keterangan" TEXT,
        "semester"  INTEGER NOT NULL DEFAULT 1,
        "tahunAjaranId" INTEGER NOT NULL REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ekskul_kehadiran" ON "ekskul_kehadiran"("ekskulId","siswaId","tanggal","tahunAjaranId","semester")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Hapus dalam urutan terbalik (FK dependency)
    const tables = [
      'ekskul_kehadiran','ekskul_nilai','ekskul_tujuan','ekskul_peserta','ekskul',
      'kokurikuler_asesmen','kokurikuler_tim','kokurikuler_target','kokurikuler_kegiatan',
      'rapor_mapel_override','rapor','nilai','penilaian_tp','penilaian',
      'tujuan_pembelajaran','tindak_lanjut','pelanggaran','katalog_pelanggaran',
      'izin_guru','presensi_harian_guru','presensi_siswa','presensi_sesi',
      'kalender_libur','jadwal_kbm','penugasan','mapel','pengaturan',
      'siswa','kelas','guru','tahun_ajaran','activity_logs','sessions','users',
    ];
    for (const t of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    }
  }
}
