import { ProfileService } from './profile.service';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
declare class UpdateProfileDto {
    name?: string;
}
declare class PasswordDto {
    currentPassword?: string;
    newPassword: string;
}
declare class LinkGoogleDto {
    credential: string;
}
export declare class ProfileController {
    private profileService;
    constructor(profileService: ProfileService);
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
    updateProfile(dto: UpdateProfileDto, user: User): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        hasPassword: boolean;
        googleLinked: boolean;
        createdAt: Date;
    }>;
    changePassword(dto: PasswordDto, user: User, session: Session): Promise<{
        message: string;
    }>;
    linkGoogle(dto: LinkGoogleDto, user: User): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        hasPassword: boolean;
        googleLinked: boolean;
    }>;
    unlinkGoogle(user: User): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        hasPassword: boolean;
        googleLinked: boolean;
    }>;
    ownSessions(user: User, session: Session): Promise<{
        id: number;
        deviceSummary: string;
        ipAddress: string;
        loginMethod: string;
        createdAt: Date;
        lastActiveAt: Date;
        current: boolean;
    }[]>;
    revokeOwnSession(id: string, user: User): Promise<{
        message: string;
    }>;
}
export {};
