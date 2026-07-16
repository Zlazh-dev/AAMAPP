import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { OAuth2Client } from 'google-auth-library';
import { getDeviceSummary, getIpAddress } from '../common/device.util';

// Simple in-memory rate limiter for login
interface LoginAttempt {
  count: number;
  firstAttempt: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

const VALID_REQUESTED_ROLES = [
  'guru',
  'kurikulum',
  'kesiswaan',
  'tu',
  'kepsek',
];

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private usersService: UsersService,
    private sessionsService: SessionsService,
    private auditService: AuditService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      this.googleClient = new OAuth2Client(clientId);
    }
  }

  getGoogleClientId(): string | null {
    return process.env.GOOGLE_CLIENT_ID || null;
  }

  private checkRateLimit(ip: string): void {
    const now = Date.now();
    const entry = loginAttempts.get(ip);

    if (entry) {
      // window of 5 minutes
      if (now - entry.firstAttempt > 5 * 60 * 1000) {
        // reset
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
      } else {
        entry.count++;
        if (entry.count > 5) {
          throw new UnauthorizedException(
            'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.',
          );
        }
      }
    } else {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
    }
  }

  private clearRateLimit(ip: string): void {
    loginAttempts.delete(ip);
  }

  async login(
    email: string,
    password: string,
    req: any,
  ): Promise<{ accessToken: string; user: any }> {
    const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress || 'unknown';
    this.checkRateLimit(ip);

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase().trim() })
      .getOne();

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (user.status === 'pending') {
      throw new ForbiddenException({
        pending: true,
        message: 'Akun Anda menunggu persetujuan admin.',
      });
    }

    this.clearRateLimit(ip);

    const { token, session } = await this.sessionsService.createSession(
      user,
      'password',
      req,
    );

    await this.auditService.record({
      user,
      action: 'login',
      entity: 'session',
      entityId: String(session.id),
      entityLabel: `Login password: ${user.name}`,
      summary: `Login berhasil via password`,
      ipAddress: session.ipAddress,
      deviceSummary: session.deviceSummary,
    });

    return {
      accessToken: token,
      user: this.usersService.toSafeUser(user),
    };
  }

  async loginGoogle(
    credential: string,
    req: any,
  ): Promise<{ accessToken: string; user: any }> {
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

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token Google tidak valid');
    }

    const email = payload.email.toLowerCase().trim();
    const googleSub = payload.sub;

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .getOne();

    if (!user) {
      throw new NotFoundException({
        unregistered: true,
        message: 'Akun belum terdaftar. Silakan lengkapi pendaftaran.',
      });
    }

    if (user.status === 'pending') {
      throw new ForbiddenException({
        pending: true,
        message: 'Akun Anda menunggu persetujuan admin.',
      });
    }

    // auto-link if not linked yet
    if (!user.googleSub) {
      user.googleSub = googleSub;
      await this.userRepo.save(user);
    }

    const { token, session } = await this.sessionsService.createSession(
      user,
      'google',
      req,
    );

    await this.auditService.record({
      user,
      action: 'login',
      entity: 'session',
      entityId: String(session.id),
      entityLabel: `Login Google: ${user.name}`,
      summary: `Login berhasil via Google`,
      ipAddress: session.ipAddress,
      deviceSummary: session.deviceSummary,
    });

    return {
      accessToken: token,
      user: this.usersService.toSafeUser(user),
    };
  }

  async registerGoogle(
    credential: string,
    requestedRoles: string[],
    note: string | null,
    deviceConsent: boolean,
    req: any,
  ): Promise<{ message: string }> {
    if (!this.googleClient) {
      throw new BadRequestException('Login Google belum dikonfigurasi');
    }

    if (!deviceConsent) {
      throw new BadRequestException(
        'Anda harus menyetujui pencatatan informasi perangkat',
      );
    }

    if (!Array.isArray(requestedRoles) || requestedRoles.length === 0) {
      throw new BadRequestException('Minimal pilih satu peran yang diajukan');
    }

    for (const r of requestedRoles) {
      if (!VALID_REQUESTED_ROLES.includes(r)) {
        throw new BadRequestException(`Peran tidak valid: ${r}`);
      }
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

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token Google tidak valid');
    }

    const email = payload.email.toLowerCase().trim();
    const googleSub = payload.sub;
    const name = payload.name || email;

    // check existing
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Akun sudah terdaftar — silakan masuk');
    }

    const existingSub = await this.userRepo.findOne({
      where: { googleSub },
    });
    if (existingSub) {
      throw new ConflictException('Akun sudah terdaftar — silakan masuk');
    }

    const user = this.userRepo.create({
      name,
      email,
      passwordHash: null,
      googleSub,
      status: 'pending',
      roles: [],
      requestedRoles,
      registrationNote: note || null,
    });
    await this.userRepo.save(user);

    // audit: consent + device + IP
    const userAgent = req.headers?.['user-agent'] || '';
    const ipAddress = getIpAddress(req);
    const deviceSummary = getDeviceSummary(userAgent);

    await this.auditService.record({
      user,
      action: 'create',
      entity: 'user',
      entityId: String(user.id),
      entityLabel: `${user.name} (${user.email})`,
      summary: `Pendaftaran Google: peran diajukan [${requestedRoles.join(', ')}], konsen perangkat: ya`,
      ipAddress,
      deviceSummary,
    });

    return {
      message: 'Pendaftaran terkirim. Akun menunggu persetujuan admin.',
    };
  }

  async logout(sessionId: number, user: User): Promise<void> {
    await this.sessionsService.revokeById(sessionId);
    await this.auditService.record({
      user,
      action: 'revoke',
      entity: 'session',
      entityId: String(sessionId),
      summary: 'Logout',
    });
  }
}
