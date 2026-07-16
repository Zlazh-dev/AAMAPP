import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
import { User } from '../users/user.entity';

export interface AuditRecordInput {
  userId?: number | null;
  user?: User | null;
  action: string;
  entity: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary?: string | null;
  ipAddress?: string | null;
  deviceSummary?: string | null;
}

/**
 * Backward-compatible input shape used by older services.
 * Field alias: actorId -> userId, resource -> entity,
 * resourceId -> entityId, ip -> ipAddress, userAgent -> deviceSummary,
 * details -> summary (JSON stringified).
 * summary -> disimpan terpisah sebagai string Indonesia (T11-FIX #15).
 */
export interface AuditLogInput {
  actorId?: number | null;
  action: string;
  resource: string;
  resourceId?: string | number | null;
  ip?: string | null;
  userAgent?: string | null;
  summary?: string | null;
  details?: any;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(ActivityLog)
    private logRepo: Repository<ActivityLog>,
  ) {}

  async record(input: AuditRecordInput): Promise<void> {
    const log = new ActivityLog();
    log.userId = input.user?.id ?? input.userId ?? null;
    log.userName = input.user?.name ?? null;
    log.userEmail = input.user?.email ?? null;
    log.action = input.action;
    log.entity = input.entity;
    log.entityId = input.entityId != null ? String(input.entityId) : null;
    log.entityLabel = input.entityLabel ?? null;
    log.summary = input.summary ?? null;
    log.ipAddress = input.ipAddress ?? null;
    log.deviceSummary = input.deviceSummary ?? null;
    await this.logRepo.save(log);
  }

  /**
   * Compatibility shim: menerima field gaya lama (actorId/resource/ip/...)
   * dan menerjemahkan ke `record()`.
   * Prioritas summary: input.summary (eksplisit) > JSON.stringify(details) > null
   */
  async log(input: AuditLogInput): Promise<void> {
    let summary: string | null = null;
    if (input.summary != null && input.summary !== '') {
      summary = input.summary;
    } else if (input.details != null) {
      summary =
        typeof input.details === 'string'
          ? input.details
          : JSON.stringify(input.details);
    }
    await this.record({
      userId: input.actorId ?? null,
      action: input.action,
      entity: input.resource,
      entityId:
        input.resourceId != null ? String(input.resourceId) : null,
      ipAddress: input.ip ?? null,
      deviceSummary: input.userAgent ?? null,
      summary,
    });
  }
}
