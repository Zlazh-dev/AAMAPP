import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('api/admin/activities')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(
    @InjectRepository(ActivityLog)
    private logRepo: Repository<ActivityLog>,
  ) {}

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const qb = this.logRepo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (userId) {
      qb.andWhere('log.userId = :userId', { userId: parseInt(userId, 10) });
    }
    if (entity) {
      qb.andWhere('log.entity = :entity', { entity });
    }
    if (action) {
      qb.andWhere('log.action = :action', { action });
    }

    const total = await qb.getCount();
    const items = await qb
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getMany();

    return { items, total, page: pageNum, limit: limitNum };
  }
}
