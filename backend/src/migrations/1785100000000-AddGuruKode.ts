import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddGuruKode — tambah kolom kode (nullable, unique) ke tabel guru.
 * Menyimpan kode guru internal (A1, A2, B1...) dari sheet KBM 7. KODE.
 * Dipakai untuk link penugasan saat import KBM (Tahap B).
 * Timestamp: 1785100000000 (setelah AddGuruFaceSnapshot).
 */
export class AddGuruKode1785100000000 implements MigrationInterface {
  name = 'AddGuruKode1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guru" ADD COLUMN IF NOT EXISTS "kode" varchar`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_guru_kode" ON "guru" ("kode") WHERE "kode" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_guru_kode"`);
    await queryRunner.query(
      `ALTER TABLE "guru" DROP COLUMN IF EXISTS "kode"`,
    );
  }
}
