import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddGuruEmail — tambah kolom email nullable+unique ke tabel guru.
 * Dibutuhkan untuk link dua arah Guru <-> User via email (AKUN-GURU-LINK).
 * Timestamp: 1784900000000 (setelah AddGuruHadirPada: 1784800000000)
 */
export class AddGuruEmail1784900000000 implements MigrationInterface {
  name = 'AddGuruEmail1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tambah kolom email nullable agar baris existing tidak error
    await queryRunner.query(
      `ALTER TABLE "guru" ADD COLUMN IF NOT EXISTS "email" character varying(255) DEFAULT NULL`,
    );
    // Tambah unique constraint — hanya setelah semua baris ada (email null diizinkan duplikat)
    // PostgreSQL: NULL values are NOT considered equal in unique constraints — aman.
    await queryRunner.query(
      `ALTER TABLE "guru" ADD CONSTRAINT "UQ_guru_email" UNIQUE ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guru" DROP CONSTRAINT IF EXISTS "UQ_guru_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "guru" DROP COLUMN IF EXISTS "email"`,
    );
  }
}
