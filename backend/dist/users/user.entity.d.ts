import { Session } from '../sessions/session.entity';
import { ActivityLog } from '../audit/activity-log.entity';
export declare class User {
    id: number;
    name: string;
    email: string;
    passwordHash: string | null;
    googleSub: string | null;
    status: string;
    roles: string[];
    requestedRoles: string[];
    registrationNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    sessions: Session[];
    activityLogs: ActivityLog[];
    get hasPassword(): boolean;
    get googleLinked(): boolean;
}
