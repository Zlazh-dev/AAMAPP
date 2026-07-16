import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
import { ActivityLog } from '../audit/activity-log.entity';
import { SessionsService } from '../sessions/sessions.service';
import { PengaturanService } from '../pengaturan/pengaturan.service';

/**
 * T11-FIX Ronde 2 (Butir 13): seed service WUJUD tapi HANYA untuk admin + 4
 * baris pengaturan. Lembaga di-seed profil_sekolah oleh PengaturanService.
 * TIDAK ada seed tahun ajaran, kelas, atau guru (§14.10.1 eksplisit).
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
    private sessionsService: SessionsService,
    private pengaturanService: PengaturanService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
    await this.pengaturanService.seedDefaults();
    await this.housekeeping();
  }

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

    this.logger.log(`Admin seed dibuat: ${email} (ganti password setelah login!)`);

    const log = new ActivityLog();
    log.userId = admin.id;
    log.userName = admin.name;
    log.userEmail = admin.email;
    log.action = 'create';
    log.entity = 'user';
    log.entityId = String(admin.id);
    log.entityLabel = `${admin.name} (${admin.email})`;
    log.summary = 'Admin seed otomatis';
    log.ipAddress = 'system';
    log.deviceSummary = 'System';
    await this.logRepo.save(log);
  }

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
