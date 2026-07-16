import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
export declare class AuditController {
    private logRepo;
    constructor(logRepo: Repository<ActivityLog>);
    findAll(page?: string, limit?: string, userId?: string, entity?: string, action?: string): Promise<{
        items: ActivityLog[];
        total: number;
        page: number;
        limit: number;
    }>;
}
