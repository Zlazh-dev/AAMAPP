"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const user_entity_1 = require("./user.entity");
const VALID_ROLES = ['admin', 'guru', 'kurikulum', 'kesiswaan', 'tu', 'kepsek'];
let UsersService = class UsersService {
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    toSafeUser(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            status: user.status,
            hasPassword: !!user.passwordHash,
            googleLinked: !!user.googleSub,
        };
    }
    toAdminUser(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            status: user.status,
            requestedRoles: user.requestedRoles,
            registrationNote: user.registrationNote,
            googleLinked: !!user.googleSub,
            createdAt: user.createdAt,
        };
    }
    validateRoles(roles) {
        if (!Array.isArray(roles) || roles.length === 0) {
            throw new common_1.BadRequestException('Minimal harus ada satu peran');
        }
        for (const r of roles) {
            if (!VALID_ROLES.includes(r)) {
                throw new common_1.BadRequestException(`Peran tidak valid: ${r}`);
            }
        }
    }
    async findByEmail(email) {
        return this.userRepo.findOne({
            where: { email: email.toLowerCase().trim() },
        });
    }
    async findById(id) {
        return this.userRepo.findOne({ where: { id } });
    }
    async findByIdWithPassword(id) {
        return this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.passwordHash')
            .where('u.id = :id', { id })
            .getOne();
    }
    async findAll() {
        return this.userRepo.find({ order: { createdAt: 'ASC' } });
    }
    async create(data) {
        this.validateRoles(data.roles);
        if (data.name.trim().length < 3) {
            throw new common_1.BadRequestException('Nama minimal 3 karakter');
        }
        if (data.password.length < 8) {
            throw new common_1.BadRequestException('Password minimal 8 karakter');
        }
        const email = data.email.toLowerCase().trim();
        const existing = await this.userRepo.findOne({ where: { email } });
        if (existing) {
            throw new common_1.ConflictException('Email sudah terdaftar');
        }
        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = this.userRepo.create({
            name: data.name.trim(),
            email,
            passwordHash,
            roles: data.roles,
            status: 'active',
            requestedRoles: [],
            registrationNote: null,
        });
        return this.userRepo.save(user);
    }
    async update(id, data, currentUserId) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('Akun tidak ditemukan');
        if (data.name !== undefined) {
            if (data.name.trim().length < 3) {
                throw new common_1.BadRequestException('Nama minimal 3 karakter');
            }
            user.name = data.name.trim();
        }
        if (data.email !== undefined) {
            const email = data.email.toLowerCase().trim();
            const existing = await this.userRepo
                .createQueryBuilder('u')
                .where('u.email = :email', { email })
                .andWhere('u.id != :id', { id })
                .getOne();
            if (existing) {
                throw new common_1.ConflictException('Email sudah terdaftar');
            }
            user.email = email;
        }
        if (data.password !== undefined && data.password.length > 0) {
            if (data.password.length < 8) {
                throw new common_1.BadRequestException('Password minimal 8 karakter');
            }
            user.passwordHash = await bcrypt.hash(data.password, 10);
        }
        if (data.roles !== undefined) {
            this.validateRoles(data.roles);
            if (user.roles.includes('admin') &&
                !data.roles.includes('admin') &&
                user.status === 'active') {
                const adminCount = await this.userRepo
                    .createQueryBuilder('u')
                    .where('u.roles @> :adminRole', { adminRole: JSON.stringify(['admin']) })
                    .andWhere('u.status = :status', { status: 'active' })
                    .andWhere('u.id != :id', { id })
                    .getCount();
                if (adminCount === 0) {
                    throw new common_1.BadRequestException('Minimal harus ada satu akun admin aktif');
                }
            }
            user.roles = data.roles;
        }
        return this.userRepo.save(user);
    }
    async approve(id, roles) {
        this.validateRoles(roles);
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('Akun tidak ditemukan');
        if (user.status !== 'pending') {
            throw new common_1.BadRequestException('Akun ini tidak dalam status pending');
        }
        user.status = 'active';
        user.roles = roles;
        return this.userRepo.save(user);
    }
    async delete(id, currentUserId) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('Akun tidak ditemukan');
        if (id === currentUserId) {
            throw new common_1.BadRequestException('Anda tidak dapat menghapus akun sendiri');
        }
        if (user.roles.includes('admin') && user.status === 'active') {
            const adminCount = await this.userRepo
                .createQueryBuilder('u')
                .where('u.roles @> :adminRole', { adminRole: JSON.stringify(['admin']) })
                .andWhere('u.status = :status', { status: 'active' })
                .andWhere('u.id != :id', { id })
                .getCount();
            if (adminCount === 0) {
                throw new common_1.BadRequestException('Minimal harus ada satu akun admin aktif');
            }
        }
        await this.userRepo.delete(id);
    }
    async countPending() {
        return this.userRepo
            .createQueryBuilder('u')
            .where('u.status = :status', { status: 'pending' })
            .getCount();
    }
    async findPending() {
        return this.userRepo.find({
            where: { status: 'pending' },
            order: { createdAt: 'ASC' },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map