import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { User } from '../users/user.entity';

/**
 * SEC-1 Butir 5: fail-closed. Sebelumnya, route TANPA @Roles otomatis
 * lolos (return true) bagi siapapun yang sudah login — developer yang
 * lupa memasang @Roles bisa membuka akses tak terkontrol. Sekarang:
 * route tanpa @Roles DAN bukan @Public akan DITOLAK (403) secara
 * default. Route publik (login dll.) sudah dilewatkan oleh
 * SessionAuthGuard lebih dulu, tapi kita cek ulang @Public() di sini
 * juga supaya RolesGuard aman dipakai berdiri sendiri (defense in depth).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Fail-closed: tanpa @Roles dan bukan @Public → tolak.
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException(
        'Akses ditolak: route ini belum dikonfigurasi peran (@Roles).',
      );
    }

    const request = context.switchToHttp().getRequest();
    const user: User | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Akses ditolak');
    }

    // admin lolos semua
    if (user.roles.includes('admin')) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Anda tidak memiliki akses ke fitur ini');
    }
    return true;
  }
}
