import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
export declare class AdminSessionsController {
    private sessionsService;
    private auditService;
    constructor(sessionsService: SessionsService, auditService: AuditService);
    listAll(currentUser: User, currentSession: Session): Promise<{
        id: number;
        user: {
            id: number;
            name: string;
            email: string;
        } | null;
        deviceSummary: string;
        ipAddress: string;
        loginMethod: string;
        createdAt: Date;
        lastActiveAt: Date;
        current: boolean;
    }[]>;
    revoke(id: string, currentUser: User, currentSession: Session): Promise<{
        message: string;
    }>;
}
