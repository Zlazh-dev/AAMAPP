import { Request } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Session } from '../sessions/session.entity';
declare class LoginDto {
    email: string;
    password: string;
}
declare class GoogleLoginDto {
    credential: string;
}
declare class RegisterGoogleDto {
    credential: string;
    requestedRoles: string[];
    note?: string;
    deviceConsent: boolean;
}
export declare class AuthController {
    private authService;
    private usersService;
    constructor(authService: AuthService, usersService: UsersService);
    getConfig(): {
        googleClientId: string | null;
    };
    login(dto: LoginDto, req: Request): Promise<{
        accessToken: string;
        user: any;
    }>;
    google(dto: GoogleLoginDto, req: Request): Promise<{
        accessToken: string;
        user: any;
    }>;
    registerGoogle(dto: RegisterGoogleDto, req: Request): Promise<{
        message: string;
    }>;
    me(user: User): Promise<{
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        hasPassword: boolean;
        googleLinked: boolean;
    }>;
    logout(session: Session, user: User): Promise<{
        message: string;
    }>;
}
export {};
