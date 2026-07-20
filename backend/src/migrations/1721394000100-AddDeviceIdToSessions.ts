import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tambah kolom deviceId di sessions.
 *
 * Identitas perangkat sungguhan (cookie acak httpOnly sameSite=lax umur
 * ±1 tahun), dipakai untuk dedupe sesi: login kedua dari perangkat yg sama
 * memperbarui baris yg ada, bukan menyisipkan baris baru.
 *
 * Nullable untuk baris lama (housekeeping >30 hari biarkan).
 */
export class AddDeviceIdToSessions1721394000100 implements MigrationInterface {
  name = 'AddDeviceIdToSessions1721394000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "deviceId" VARCHAR(128) NULL
    `);
    // Index untuk pencarian dedupe (userId, deviceId) aktif.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sessions_user_device"
      ON "sessions" ("userId", "deviceId")
      WHERE "revokedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_user_device"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "deviceId"`);
  }
}