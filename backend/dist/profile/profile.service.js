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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const user_entity_1 = require("../users/user.entity");
const sessions_service_1 = require("../sessions/sessions.service");
const audit_service_1 = require("../audit/audit.service");
const google_auth_library_1 = require("google-auth-library");
let ProfileService = class ProfileService {
    constructor(userRepo, sessionsService, auditService) {
        this.userRepo = userRepo;
        this.sessionsService = sessionsService;
        this.auditService = auditService;
        this.googleClient = null;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (clientId) {
            this.googleClient = new google_auth_library_1.OAuth2Client(clientId);
        }
    }
    async getProfile(user) {
        return {
            ...this.toSafeUser(user),
            createdAt: user.createdAt,
        };
    }
    toSafeUser(u) {
        return {
            id: u.id,
            name: u.name,
            email: u.email,
            roles: u.roles,
            status: u.status,
            hasPassword: !!u.passwordHash,
            googleLinked: !!u.googleSub,
        };
    }
    async updateProfile(user, data) {
        if (data.name !== undefined) {
            if (data.name.trim().length < 3) {
                throw new common_1.BadRequestException('Nama minimal 3 karakter');
            }
            user.name = data.name.trim();
        }
        return this.userRepo.save(user);
    }
    async changePassword(user, currentPassword, newPassword, currentSessionId) {
        const userWithPw = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.passwordHash')
            .where('u.id = :id', { id: user.id })
            .getOne();
        if (!userWithPw)
            throw new common_1.BadRequestException('Akun tidak ditemukan');
        if (userWithPw.passwordHash) {
            if (!currentPassword) {
                throw new common_1.BadRequestException('Password saat ini wajib diisi');
            }
            const valid = await bcrypt.compare(currentPassword, userWithPw.passwordHash);
            if (!valid) {
                throw new common_1.UnauthorizedException('Password saat ini salah');
            }
        }
        if (newPassword.length < 8) {
            throw new common_1.BadRequestException('Password baru minimal 8 karakter');
        }
        userWithPw.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.userRepo.save(userWithPw);
        await this.sessionsService.revokeAllByUser(user.id, currentSessionId);
        await this.auditService.record({
            user: userWithPw,
            action: 'update',
            entity: 'user',
            entityId: String(user.id),
            summary: 'Mengganti password',
        });
    }
    async linkGoogle(user, credential) {
        if (!this.googleClient) {
            throw new common_1.BadRequestException('Login Google belum dikonfigurasi');
        }
        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        }
        catch {
            throw new common_1.UnauthorizedException('Token Google tidak valid');
        }
        if (!payload || !payload.sub) {
            throw new common_1.UnauthorizedException('Token Google tidak valid');
        }
        const existing = await this.userRepo.findOne({
            where: { googleSub: payload.sub },
        });
        if (existing && existing.id !== user.id) {
            throw new common_1.ConflictException('Akun Google ini sudah tertaut ke akun lain');
        }
        user.googleSub = payload.sub;
        const saved = await this.userRepo.save(user);
        await this.auditService.record({
            user: saved,
            action: 'update',
            entity: 'user',
            entityId: String(user.id),
            summary: 'Menautkan akun Google',
        });
        return saved;
    }
    async unlinkGoogle(user) {
        const userWithPw = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.passwordHash')
            .where('u.id = :id', { id: user.id })
            .getOne();
        if (!userWithPw)
            throw new common_1.BadRequestException('Akun tidak ditemukan');
        if (!userWithPw.passwordHash) {
            throw new common_1.BadRequestException('Tidak dapat melepas tautan Google tanpa password. Buat password terlebih dahulu.');
        }
        if (!userWithPw.googleSub) {
            throw new common_1.BadRequestException('Akun Google belum tertaut');
        }
        userWithPw.googleSub = null;
        const saved = await this.userRepo.save(userWithPw);
        await this.auditService.record({
            user: saved,
            action: 'update',
            entity: 'user',
            entityId: String(user.id),
            summary: 'Melepas tautan akun Google',
        });
        return saved;
    }
    async getOwnSessions(userId) {
        return this.sessionsService.listActiveByUser(userId);
    }
    async revokeOwnSession(sessionId, userId) {
        const session = await this.sessionsService.findById(sessionId);
        if (!session || session.userId !== userId) {
            throw new common_1.BadRequestException('Sesi tidak ditemukan');
        }
        await this.sessionsService.revoke(session);
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        sessions_service_1.SessionsService,
        audit_service_1.AuditService])
], ProfileService);
//# sourceMappingURL=profile.service.js.map