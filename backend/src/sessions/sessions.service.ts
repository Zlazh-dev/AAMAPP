import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import { Session } from './session.entity';
import { User } from '../users/user.entity';
import { getDeviceSummary, getIpAddress } from '../common/device.util';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
  ) {}

  /**
   * Buat sesi baru. Token mentah dikembalikan (hanya sekali),
   * di DB hanya simpan hash sha256.
   */
  async createSession(
    user: User,
    loginMethod: string,
    req: any,
  ): Promise<{ token: string; session: Session }> {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const userAgent = req.headers?.['user-agent'] || '';
    const ipAddress = getIpAddress(req);
    const deviceSummary = getDeviceSummary(userAgent);

    const absoluteHours = parseInt(
      process.env.SESSION_ABSOLUTE_HOURS || '24',
      10,
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + absoluteHours * 60 * 60 * 1000);

    const session = this.sessionRepo.create({
      userId: user.id,
      tokenHash,
      ipAddress,
      userAgent,
      deviceSummary,
      loginMethod,
      lastActiveAt: now,
      expiresAt,
      revokedAt: null,
    });

    await this.sessionRepo.save(session);

    return { token: rawToken, session };
  }

  async findById(id: number): Promise<Session | null> {
    return this.sessionRepo.findOne({ where: { id } });
  }

  async revoke(session: Session): Promise<void> {
    session.revokedAt = new Date();
    await this.sessionRepo.save(session);
  }

  async revokeById(id: number): Promise<boolean> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) return false;
    if (session.revokedAt) return true; // already revoked
    session.revokedAt = new Date();
    await this.sessionRepo.save(session);
    return true;
  }

  async revokeAllByUser(userId: number, exceptSessionId?: number): Promise<void> {
    const qb = this.sessionRepo
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('"userId" = :userId', { userId })
      .andWhere('"revokedAt" IS NULL');
    if (exceptSessionId) {
      qb.andWhere('"id" != :exceptSessionId', { exceptSessionId });
    }
    await qb.execute();
  }

  async listActiveByUser(userId: number): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { userId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async listAllActive(): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { revokedAt: IsNull() },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * T15 0b: Paginated active sessions (§12.16a).
   */
  async listAllActivePaginated(params: {
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const [rows, total] = await this.sessionRepo.findAndCount({
      where: { revokedAt: IsNull() },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const data = rows.map((s) => ({
      id: s.id,
      deviceSummary: s.deviceSummary,
      ipAddress: s.ipAddress,
      loginMethod: s.loginMethod,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      user: s.user ? { id: s.user.id, name: s.user.name, email: s.user.email } : null,
    }));
    return { data, total, page, limit };
  }

  async housekeeping(): Promise<void> {
    // hapus sesi revoked/expired > 30 hari
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    await this.sessionRepo
      .createQueryBuilder()
      .delete()
      .where(
        '("revokedAt" IS NOT NULL AND "revokedAt" < :cutoff) OR ("expiresAt" < :cutoff)',
        { cutoff },
      )
      .execute();
  }
}
