import { UsersService } from './users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { User } from './user.entity';
import { Session } from '../sessions/session.entity';
declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    roles: string[];
}
declare class UpdateUserDto {
    name?: string;
    email?: string;
    password?: string;
    roles?: string[];
}
declare class ApproveUserDto {
    roles: string[];
}
export declare class UsersController {
    private usersService;
    private sessionsService;
    private auditService;
    constructor(usersService: UsersService, sessionsService: SessionsService, auditService: AuditService);
    findAll(): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        requestedRoles: string[];
        registrationNote: string | null;
        googleLinked: boolean;
        createdAt: Date;
    }[]>;
    findPending(): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        requestedRoles: string[];
        registrationNote: string | null;
        googleLinked: boolean;
        createdAt: Date;
    }[]>;
    countPending(): Promise<{
        count: number;
    }>;
    create(dto: CreateUserDto, currentUser: User, session: Session): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        requestedRoles: string[];
        registrationNote: string | null;
        googleLinked: boolean;
        createdAt: Date;
    }>;
    findOne(id: string): Promise<{
        sessions: {
            id: number;
            deviceSummary: string;
            ipAddress: string;
            loginMethod: string;
            createdAt: Date;
            lastActiveAt: Date;
        }[];
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        requestedRoles: string[];
        registrationNote: string | null;
        googleLinked: boolean;
        createdAt: Date;
    }>;
    update(id: string, dto: UpdateUserDto, currentUser: User, session: Session): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        requestedRoles: string[];
        registrationNote: string | null;
        googleLinked: boolean;
        createdAt: Date;
    }>;
    approve(id: string, dto: ApproveUserDto, currentUser: User, session: Session): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        requestedRoles: string[];
        registrationNote: string | null;
        googleLinked: boolean;
        createdAt: Date;
    }>;
    delete(id: string, currentUser: User, session: Session): Promise<{
        message: string;
    }>;
}
export {};
