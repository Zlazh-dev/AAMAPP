import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class ProfileService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private sessionsService: SessionsService,
    private auditService: AuditService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      this.googleClient = new OAuth2Client(clientId);
    }
  }

  async getProfile(user: User) {
    return {
      ...this.toSafeUser(user),
      createdAt: user.createdAt,
    };
  }

  private toSafeUser(u: User) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles,
      status: u.status,
      hasPassword: !!u.passwordHash,
      googleLinked: !!u.googleSub,
    };
  }

  async updateProfile(
    user: User,
    data: { name?: string },
  ): Promise<User> {
    if (data.name !== undefined) {
      if (data.name.trim().length < 3) {
        throw new BadRequestException('Nama minimal 3 karakter');
      }
      user.name = data.name.trim();
    }
    return this.userRepo.save(user);
  }

  async changePassword(
    user: User,
    currentPassword: string | null,
    newPassword: string,
    currentSessionId: number,
  ): Promise<void> {
    const userWithPw = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: user.id })
      .getOne();

    if (!userWithPw) throw new BadRequestException('Akun tidak ditemukan');

    if (userWithPw.passwordHash) {
      // has password — current is required
      if (!currentPassword) {
        throw new BadRequestException('Password saat ini wajib diisi');
      }
      const valid = await bcrypt.compare(currentPassword, userWithPw.passwordHash);
      if (!valid) {
        throw new UnauthorizedException('Password saat ini salah');
      }
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter');
    }

    userWithPw.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(userWithPw);

    // revoke all sessions except current
    await this.sessionsService.revokeAllByUser(user.id, currentSessionId);

    await this.auditService.record({
      user: userWithPw,
      action: 'update',
      entity: 'user',
      entityId: String(user.id),
      summary: 'Mengganti password',
    });
  }

  async linkGoogle(
    user: User,
    credential: string,
  ): Promise<User> {
    if (!this.googleClient) {
      throw new BadRequestException('Login Google belum dikonfigurasi');
    }

    let payload: any;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token Google tidak valid');
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token Google tidak valid');
    }

    // check if googleSub already used by another account
    const existing = await this.userRepo.findOne({
      where: { googleSub: payload.sub },
    });
    if (existing && existing.id !== user.id) {
      throw new ConflictException('Akun Google ini sudah tertaut ke akun lain');
    }

    user.googleSub = payload.sub;
    const saved = await this.userRepo.save(user);

    await this.auditService.record({
      user: saved,
      action: 'update',
      entity: 'user',
      entityId: String(user.id),
      summary: 'Menautkan akun Google',
    });

    return saved;
  }

  async unlinkGoogle(user: User): Promise<User> {
    const userWithPw = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: user.id })
      .getOne();

    if (!userWithPw) throw new BadRequestException('Akun tidak ditemukan');

    if (!userWithPw.passwordHash) {
      throw new BadRequestException(
        'Tidak dapat melepas tautan Google tanpa password. Buat password terlebih dahulu.',
      );
    }

    if (!userWithPw.googleSub) {
      throw new BadRequestException('Akun Google belum tertaut');
    }

    userWithPw.googleSub = null;
    const saved = await this.userRepo.save(userWithPw);

    await this.auditService.record({
      user: saved,
      action: 'update',
      entity: 'user',
      entityId: String(user.id),
      summary: 'Melepas tautan akun Google',
    });

    return saved;
  }

  async getOwnSessions(userId: number) {
    return this.sessionsService.listActiveByUser(userId);
  }

  async revokeOwnSession(sessionId: number, userId: number) {
    const session = await this.sessionsService.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new BadRequestException('Sesi tidak ditemukan');
    }
    await this.sessionsService.revoke(session);
  }
}
