import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tambah kolom guruHadirPada ke presensi_sesi.
 * Kolom nullable — baris lama (sebelum fitur hadir-sesi) tidak terpengaruh.
 */
export class AddGuruHadirPada1784800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "presensi_sesi"
      ADD COLUMN IF NOT EXISTS "guruHadirPada" TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "presensi_sesi"
      DROP COLUMN IF EXISTS "guruHadirPada"
    `);
  }
}
