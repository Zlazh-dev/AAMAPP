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
export declare class AuditService {
    private logRepo;
    constructor(logRepo: Repository<ActivityLog>);
    record(input: AuditRecordInput): Promise<void>;
    log(input: AuditLogInput): Promise<void>;
}
