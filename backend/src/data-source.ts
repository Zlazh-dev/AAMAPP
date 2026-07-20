/**
 * TypeORM DataSource — dipakai oleh:
 *   - TypeORM CLI: npx typeorm migration:generate / migration:run
 *   - main.ts production: dataSource.runMigrations() sebelum bootstrap
 *
 * Entitas di-list eksplisit (bukan glob) agar kompatibel dengan ts-node
 * dan compiled dist (NODE_ENV=production hanya butuh dist/**\/*.entity.js).
 */
import { DataSource } from 'typeorm';
import * as path from 'path';
import 'reflect-metadata';

// ── entities (urutan sama dengan app.module.ts) ──────────────────────────────
// Saat dijalankan dari ts-node (migration:generate) kita pakai src/*.entity.ts,
// saat production (dist/) pakai compiled *.entity.js.
const isProd = process.env.NODE_ENV === 'production';
const ext = isProd ? 'js' : 'ts';
const srcDir = isProd
  ? path.join(__dirname, '..') // dist/
  : path.join(__dirname);      // src/

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'aamapp',
  password: process.env.POSTGRES_PASSWORD || 'aamapp_dev_change_me',
  database: process.env.POSTGRES_DB || 'aamapp',

  entities: [path.join(srcDir, '**', `*.entity.${ext}`)],

  // Migration files — src/migrations/*.ts (dev) atau dist/migrations/*.js (prod)
  migrations: [path.join(srcDir, 'migrations', `*.${ext}`)],

  migrationsTableName: 'typeorm_migrations',

  // TIDAK pakai synchronize — dikelola migration eksplisit
  synchronize: false,
  logging: false,
});
