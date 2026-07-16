import { User } from '../users/user.entity';
export declare class Session {
    id: number;
    userId: number;
    user: User;
    tokenHash: string;
    ipAddress: string;
    userAgent: string;
    deviceSummary: string;
    loginMethod: string;
    createdAt: Date;
    lastActiveAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
}
