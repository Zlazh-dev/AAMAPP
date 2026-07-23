import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddGuruFaceSnapshot — tambah kolom faceSnapshotUrl (nullable) ke tabel guru.
 * Menyimpan path relatif snapshot wajah (frame pose Depan saat enroll).
 * File disimpan di FACE_SNAPSHOT_ROOT (di luar folder publik /uploads/).
 * Timestamp: 1785000000000 (setelah AddGuruEmail).
 */
export class AddGuruFaceSnapshot1785000000000 implements MigrationInterface {
  name = 'AddGuruFaceSnapshot1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guru" ADD COLUMN IF NOT EXISTS "faceSnapshotUrl" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guru" DROP COLUMN IF EXISTS "faceSnapshotUrl"`,
    );
  }
}
