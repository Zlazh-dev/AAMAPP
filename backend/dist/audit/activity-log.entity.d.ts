import { User } from '../users/user.entity';
export declare class ActivityLog {
    id: number;
    userId: number | null;
    user: User | null;
    userName: string | null;
    userEmail: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    entityLabel: string | null;
    summary: string | null;
    ipAddress: string | null;
    deviceSummary: string | null;
    createdAt: Date;
}
