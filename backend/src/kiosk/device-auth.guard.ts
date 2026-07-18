import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceKiosk } from './device-kiosk.entity';
import { createHash } from 'crypto';

/**
 * F3b — Guard untuk endpoint kiosk.
 * Membaca header `X-Device-Token`, hash SHA-256, cocokkan
 * dengan `device_kiosk.tokenHash`. TIDAK menggunakan session user.
 *
 * Pasang `@UseGuards(DeviceAuthGuard)` pada controller kiosk.
 * Endpoint admin tetap pakai SessionAuthGuard.
 */
@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(DeviceKiosk)
    private deviceRepo: Repository<DeviceKiosk>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawToken = request.headers['x-device-token'] as string | undefined;

    if (!rawToken || rawToken.length < 10) {
      throw new UnauthorizedException(
        'Header X-Device-Token diperlukan untuk endpoint kiosk.',
      );
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const device = await this.deviceRepo.findOne({ where: { tokenHash } });
    if (!device) {
      throw new UnauthorizedException(
        'Token perangkat tidak valid atau belum ter-pair.',
      );
    }

    // Attach device ke request untuk dipakai controller/service
    request.device = device;
    return true;
  }
}
