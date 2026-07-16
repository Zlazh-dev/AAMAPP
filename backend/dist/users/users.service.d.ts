import { Repository } from 'typeorm';
import { User } from './user.entity';
export declare class UsersService {
    private userRepo;
    constructor(userRepo: Repository<User>);
    toSafeUser(user: User): {
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        hasPassword: boolean;
        googleLinked: boolean;
    };
    toAdminUser(user: User): {
        id: number;
        name: string;
        email: string;
        roles: string[];
        status: string;
        requestedRoles: string[];
        registrationNote: string | null;
        googleLinked: boolean;
        createdAt: Date;
    };
    validateRoles(roles: string[]): void;
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    findByIdWithPassword(id: number): Promise<User | null>;
    findAll(): Promise<User[]>;
    create(data: {
        name: string;
        email: string;
        password: string;
        roles: string[];
    }): Promise<User>;
    update(id: number, data: {
        name?: string;
        email?: string;
        password?: string;
        roles?: string[];
    }, currentUserId?: number): Promise<User>;
    approve(id: number, roles: string[]): Promise<User>;
    delete(id: number, currentUserId: number): Promise<void>;
    countPending(): Promise<number>;
    findPending(): Promise<User[]>;
}
