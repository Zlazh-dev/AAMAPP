import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
export declare class AuthService {
    private userRepo;
    private usersService;
    private sessionsService;
    private auditService;
    private googleClient;
    constructor(userRepo: Repository<User>, usersService: UsersService, sessionsService: SessionsService, auditService: AuditService);
    getGoogleClientId(): string | null;
    private checkRateLimit;
    private clearRateLimit;
    login(email: string, password: string, req: any): Promise<{
        accessToken: string;
        user: any;
    }>;
    loginGoogle(credential: string, req: any): Promise<{
        accessToken: string;
        user: any;
    }>;
    registerGoogle(credential: string, requestedRoles: string[], note: string | null, deviceConsent: boolean, req: any): Promise<{
        message: string;
    }>;
    logout(sessionId: number, user: User): Promise<void>;
}
