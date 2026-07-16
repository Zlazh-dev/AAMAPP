import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { User } from '../users/user.entity';
export declare class SessionsService {
    private sessionRepo;
    constructor(sessionRepo: Repository<Session>);
    createSession(user: User, loginMethod: string, req: any): Promise<{
        token: string;
        session: Session;
    }>;
    findById(id: number): Promise<Session | null>;
    revoke(session: Session): Promise<void>;
    revokeById(id: number): Promise<boolean>;
    revokeAllByUser(userId: number, exceptSessionId?: number): Promise<void>;
    listActiveByUser(userId: number): Promise<Session[]>;
    listAllActive(): Promise<Session[]>;
    housekeeping(): Promise<void>;
}
