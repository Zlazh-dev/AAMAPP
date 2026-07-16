import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
export declare class ProfileService {
    private userRepo;
    private sessionsService;
    private auditService;
    private googleClient;
    constructor(userRepo: Repository<User>, sessionsService: SessionsService, auditService: AuditService);
    getProfile(user: User): Promise<{
        createdAt: Date;
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        hasPassword: boolean;
        googleLinked: boolean;
    }>;
    private toSafeUser;
    updateProfile(user: User, data: {
        name?: string;
    }): Promise<User>;
    changePassword(user: User, currentPassword: string | null, newPassword: string, currentSessionId: number): Promise<void>;
    linkGoogle(user: User, credential: string): Promise<User>;
    unlinkGoogle(user: User): Promise<User>;
    getOwnSessions(userId: number): Promise<import("../sessions/session.entity").Session[]>;
    revokeOwnSession(sessionId: number, userId: number): Promise<void>;
}
