import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Session } from '../sessions/session.entity';
import { User } from '../users/user.entity';
export declare class SessionAuthGuard implements CanActivate {
    private sessionRepo;
    private userRepo;
    constructor(sessionRepo: Repository<Session>, userRepo: Repository<User>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
