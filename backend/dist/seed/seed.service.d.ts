import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
import { ActivityLog } from '../audit/activity-log.entity';
import { SessionsService } from '../sessions/sessions.service';
import { PengaturanService } from '../pengaturan/pengaturan.service';
export declare class SeedService implements OnModuleInit {
    private userRepo;
    private sessionRepo;
    private logRepo;
    private sessionsService;
    private pengaturanService;
    private readonly logger;
    constructor(userRepo: Repository<User>, sessionRepo: Repository<Session>, logRepo: Repository<ActivityLog>, sessionsService: SessionsService, pengaturanService: PengaturanService);
    onModuleInit(): Promise<void>;
    private seedAdmin;
    private housekeeping;
}
