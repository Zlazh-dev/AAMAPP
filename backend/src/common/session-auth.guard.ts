import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
import { getDeviceSummary, getIpAddress } from './device.util';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Anda belum masuk. Silakan login.');
    }

    const token = authHeader.substring(7);
    if (!token || token.length < 10) {
      throw new UnauthorizedException('Token tidak valid.');
    }

    // hash token
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const session = await this.sessionRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Sesi tidak ditemukan. Silakan login kembali.');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Sesi telah dicabut. Silakan login kembali.');
    }

    const now = new Date();

    // check absolute expiry
    if (session.expiresAt && now > session.expiresAt) {
      throw new UnauthorizedException({
        message: 'Sesi telah berakhir. Silakan login kembali.',
      });
    }

    // check idle timeout
    const idleMinutes = parseInt(
      process.env.SESSION_IDLE_MINUTES || '60',
      10,
    );
    const idleMs = idleMinutes * 60 * 1000;
    const idleSinceLastActive = now.getTime() - new Date(session.lastActiveAt).getTime();

    if (idleSinceLastActive > idleMs) {
      // revoke the idle session
      session.revokedAt = now;
      await this.sessionRepo.save(session);
      throw new UnauthorizedException({
        code: 'SESSION_IDLE',
        message: 'Sesi berakhir karena tidak aktif. Silakan masuk kembali.',
      });
    }

    // update lastActiveAt (throttle: only if > 60 seconds since last update)
    const secondsSinceLastUpdate =
      (now.getTime() - new Date(session.lastActiveAt).getTime()) / 1000;
    if (secondsSinceLastUpdate > 60) {
      session.lastActiveAt = now;
      await this.sessionRepo.save(session);
    }

    // attach user + session to request
    request.user = session.user;
    request.session = session;
    request.sessionToken = token;

    return true;
  }
}
