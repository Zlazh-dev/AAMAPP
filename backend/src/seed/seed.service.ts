import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
import { ActivityLog } from '../audit/activity-log.entity';
import { TahunAjaran } from '../tahun-ajaran/tahun-ajaran.entity';
import { SessionsService } from '../sessions/sessions.service';
import { PengaturanService } from '../pengaturan/pengaturan.service';

/**
 * SeedService — bootstrap DB kosong:
 *   1. Admin user pertama (dari env ADMIN_*)
 *   2. Pengaturan defaults (profil sekolah, jam, dll.)
 *   3. Tahun Ajaran aktif pertama (dari env SEED_TA_NAMA / SEED_TA_SEMESTER)
 *   4. Housekeeping (expired sessions, old logs)
 *
 * Setiap seed bersifat idempotent — di-skip jika data sudah ada.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    @InjectRepository(ActivityLog)
    private logRepo: Repository<ActivityLog>,
    @InjectRepository(TahunAjaran)
    private taRepo: Repository<TahunAjaran>,
    private sessionsService: SessionsService,
    private pengaturanService: PengaturanService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
    // e2e-admin HANYA di non-production (atau SEED_E2E_ADMIN=true eksplisit utk CI).
    if (process.env.NODE_ENV !== 'production' || process.env.SEED_E2E_ADMIN === 'true') {
      await this.seedE2EAdmin();
    }
    await this.pengaturanService.seedDefaults();
    await this.seedTahunAjaran();
    await this.housekeeping();
  }

  // ── 1. Admin seed ──────────────────────────────────────────────────────────
  private async seedAdmin() {
    const count = await this.userRepo.count();
    if (count > 0) {
      this.logger.log('Tabel users tidak kosong — seed admin dilewati');
      return;
    }

    const name = process.env.ADMIN_NAME || 'Administrator';
    const email = (process.env.ADMIN_EMAIL || 'admin@aamapp.sch.id').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'admin12345';

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = this.userRepo.create({
      name,
      email,
      passwordHash,
      googleSub: null,
      status: 'active',
      roles: ['admin'],
      requestedRoles: [],
      registrationNote: null,
    });
    await this.userRepo.save(admin);
    this.logger.warn(
      `Admin seed dibuat: ${email} — GANTI PASSWORD SETELAH LOGIN!`,
    );

    const log = this.logRepo.create({
      userId: admin.id,
      userName: admin.name,
      userEmail: admin.email,
      action: 'create',
      entity: 'user',
      entityId: String(admin.id),
      entityLabel: `${admin.name} (${admin.email})`,
      summary: 'Admin seed otomatis',
      ipAddress: 'system',
      deviceSummary: 'System',
    });
    await this.logRepo.save(log);
  }

  // ── 1b. E2E admin terpisah ──────────────────────────────────────────────────
  // Akun admin khusus tes otomatis, TERPISAH dari admin pemilik produk.
  // Supaya suite e2e tidak mengotori daftar sesi admin sungguhan.
  private async seedE2EAdmin() {
    const E2E_EMAIL = 'e2e-admin@aamapp.sch.id';
    const E2E_PASSWORD = 'e2e-admin-pass';
    const existing = await this.userRepo.findOne({ where: { email: E2E_EMAIL } });
    if (existing) return; // idempotent
    const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
    const e2eAdmin = this.userRepo.create({
      name: 'E2E Test Admin',
      email: E2E_EMAIL,
      passwordHash,
      googleSub: null,
      status: 'active',
      roles: ['admin'],
      requestedRoles: [],
      registrationNote: 'Akun khusus tes otomatis — jangan dipakai produksi',
    });
    await this.userRepo.save(e2eAdmin);
    this.logger.log(`E2E admin dibuat: ${E2E_EMAIL}`);
  }

  // ── 2. Tahun Ajaran aktif ──────────────────────────────────────────────────
  private async seedTahunAjaran() {
    const count = await this.taRepo.count();
    if (count > 0) {
      this.logger.log('Tabel tahun_ajaran tidak kosong — seed TA dilewati');
      return;
    }

    // Hitung tahun ajaran dari tanggal sekarang:
    // Jika bulan >= Juli → semester ganjil tahun ini/tahun+1
    // Jika bulan < Juli  → semester genap tahun lalu/tahun ini
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-based

    let nama: string;
    let semester: 1 | 2;
    if (month >= 7) {
      nama = `${year}/${year + 1}`;
      semester = 1;
    } else {
      nama = `${year - 1}/${year}`;
      semester = 2;
    }

    // Env override
    if (process.env.SEED_TA_NAMA) nama = process.env.SEED_TA_NAMA;
    if (process.env.SEED_TA_SEMESTER) {
      semester = parseInt(process.env.SEED_TA_SEMESTER, 10) as 1 | 2;
    }

    const ta = this.taRepo.create({ nama, semester, aktif: true });
    await this.taRepo.save(ta);
    this.logger.log(
      `Tahun Ajaran seed dibuat: ${nama} Semester ${semester} (aktif)`,
    );
  }

  // ── 3. Housekeeping ────────────────────────────────────────────────────────
  private async housekeeping() {
    try {
      await this.sessionsService.housekeeping();

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 365);
      await this.logRepo
        .createQueryBuilder()
        .delete()
        .where('"createdAt" < :cutoff', { cutoff })
        .execute();

      this.logger.log('Housekeeping selesai (sesi > 30 hari, log > 365 hari)');
    } catch (err) {
      this.logger.warn(`Housekeeping error: ${err}`);
    }
  }
}
