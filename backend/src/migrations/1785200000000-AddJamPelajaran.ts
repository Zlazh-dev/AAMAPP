import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddJamPelajaran — buat tabel jam_pelajaran untuk entitas JP per hari per TA.
 *
 * Baris matriks jadwal KBM diturunkan dari tabel ini (JADWAL-MATRIX-FIX Butir 6).
 * Seed awal dari slot jadwal_kbm yang sudah terimpor dilakukan via seeder
 * terpisah (SeedJamPelajaranFromJadwal) yang dipanggil di main.ts.
 *
 * Timestamp: 1785200000000
 */
export class AddJamPelajaran1785200000000 implements MigrationInterface {
  name = 'AddJamPelajaran1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "jam_pelajaran" (
        "id"             SERIAL PRIMARY KEY,
        "tahunAjaranId"  INTEGER NOT NULL REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE,
        "hari"           INTEGER NOT NULL,
        "urutan"         INTEGER NOT NULL,
        "jamMulai"       TIME    NOT NULL,
        "jamSelesai"     TIME    NOT NULL,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_jp_ta_hari_urutan"
        ON "jam_pelajaran" ("tahunAjaranId", "hari", "urutan")
    `);

    // Seed otomatis dari slot jadwal_kbm yang sudah ada:
    // kelompokkan (hari, jamMulai, jamSelesai) unik per TA → urutan = ROW_NUMBER
    await queryRunner.query(`
      INSERT INTO "jam_pelajaran" ("tahunAjaranId", "hari", "urutan", "jamMulai", "jamSelesai")
      SELECT
        sub."tahunAjaranId",
        sub."hari",
        ROW_NUMBER() OVER (PARTITION BY sub."tahunAjaranId", sub."hari" ORDER BY sub."jamMulai") AS urutan,
        sub."jamMulai",
        sub."jamSelesai"
      FROM (
        SELECT DISTINCT
          p."tahunAjaranId",
          j."hari",
          j."jamMulai",
          j."jamSelesai"
        FROM "jadwal_kbm" j
        INNER JOIN "penugasan" p ON p.id = j."penugasanId"
      ) sub
      ON CONFLICT ("tahunAjaranId", "hari", "urutan") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "jam_pelajaran" CASCADE`);
  }
}
