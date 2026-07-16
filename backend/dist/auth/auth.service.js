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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const user_entity_1 = require("../users/user.entity");
const users_service_1 = require("../users/users.service");
const sessions_service_1 = require("../sessions/sessions.service");
const audit_service_1 = require("../audit/audit.service");
const google_auth_library_1 = require("google-auth-library");
const device_util_1 = require("../common/device.util");
const loginAttempts = new Map();
const VALID_REQUESTED_ROLES = [
    'guru',
    'kurikulum',
    'kesiswaan',
    'tu',
    'kepsek',
];
let AuthService = class AuthService {
    constructor(userRepo, usersService, sessionsService, auditService) {
        this.userRepo = userRepo;
        this.usersService = usersService;
        this.sessionsService = sessionsService;
        this.auditService = auditService;
        this.googleClient = null;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (clientId) {
            this.googleClient = new google_auth_library_1.OAuth2Client(clientId);
        }
    }
    getGoogleClientId() {
        return process.env.GOOGLE_CLIENT_ID || null;
    }
    checkRateLimit(ip) {
        const now = Date.now();
        const entry = loginAttempts.get(ip);
        if (entry) {
            if (now - entry.firstAttempt > 5 * 60 * 1000) {
                loginAttempts.set(ip, { count: 1, firstAttempt: now });
            }
            else {
                entry.count++;
                if (entry.count > 5) {
                    throw new common_1.UnauthorizedException('Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.');
                }
            }
        }
        else {
            loginAttempts.set(ip, { count: 1, firstAttempt: now });
        }
    }
    clearRateLimit(ip) {
        loginAttempts.delete(ip);
    }
    async login(email, password, req) {
        const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress || 'unknown';
        this.checkRateLimit(ip);
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.passwordHash')
            .where('u.email = :email', { email: email.toLowerCase().trim() })
            .getOne();
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('Email atau password salah');
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Email atau password salah');
        }
        if (user.status === 'pending') {
            throw new common_1.ForbiddenException({
                pending: true,
                message: 'Akun Anda menunggu persetujuan admin.',
            });
        }
        this.clearRateLimit(ip);
        const { token, session } = await this.sessionsService.createSession(user, 'password', req);
        await this.auditService.record({
            user,
            action: 'login',
            entity: 'session',
            entityId: String(session.id),
            entityLabel: `Login password: ${user.name}`,
            summary: `Login berhasil via password`,
            ipAddress: session.ipAddress,
            deviceSummary: session.deviceSummary,
        });
        return {
            accessToken: token,
            user: this.usersService.toSafeUser(user),
        };
    }
    async loginGoogle(credential, req) {
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
        if (!payload || !payload.email) {
            throw new common_1.UnauthorizedException('Token Google tidak valid');
        }
        const email = payload.email.toLowerCase().trim();
        const googleSub = payload.sub;
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.passwordHash')
            .where('u.email = :email', { email })
            .getOne();
        if (!user) {
            throw new common_1.NotFoundException({
                unregistered: true,
                message: 'Akun belum terdaftar. Silakan lengkapi pendaftaran.',
            });
        }
        if (user.status === 'pending') {
            throw new common_1.ForbiddenException({
                pending: true,
                message: 'Akun Anda menunggu persetujuan admin.',
            });
        }
        if (!user.googleSub) {
            user.googleSub = googleSub;
            await this.userRepo.save(user);
        }
        const { token, session } = await this.sessionsService.createSession(user, 'google', req);
        await this.auditService.record({
            user,
            action: 'login',
            entity: 'session',
            entityId: String(session.id),
            entityLabel: `Login Google: ${user.name}`,
            summary: `Login berhasil via Google`,
            ipAddress: session.ipAddress,
            deviceSummary: session.deviceSummary,
        });
        return {
            accessToken: token,
            user: this.usersService.toSafeUser(user),
        };
    }
    async registerGoogle(credential, requestedRoles, note, deviceConsent, req) {
        if (!this.googleClient) {
            throw new common_1.BadRequestException('Login Google belum dikonfigurasi');
        }
        if (!deviceConsent) {
            throw new common_1.BadRequestException('Anda harus menyetujui pencatatan informasi perangkat');
        }
        if (!Array.isArray(requestedRoles) || requestedRoles.length === 0) {
            throw new common_1.BadRequestException('Minimal pilih satu peran yang diajukan');
        }
        for (const r of requestedRoles) {
            if (!VALID_REQUESTED_ROLES.includes(r)) {
                throw new common_1.BadRequestException(`Peran tidak valid: ${r}`);
            }
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
        if (!payload || !payload.email) {
            throw new common_1.UnauthorizedException('Token Google tidak valid');
        }
        const email = payload.email.toLowerCase().trim();
        const googleSub = payload.sub;
        const name = payload.name || email;
        const existing = await this.userRepo.findOne({ where: { email } });
        if (existing) {
            throw new common_1.ConflictException('Akun sudah terdaftar — silakan masuk');
        }
        const existingSub = await this.userRepo.findOne({
            where: { googleSub },
        });
        if (existingSub) {
            throw new common_1.ConflictException('Akun sudah terdaftar — silakan masuk');
        }
        const user = this.userRepo.create({
            name,
            email,
            passwordHash: null,
            googleSub,
            status: 'pending',
            roles: [],
            requestedRoles,
            registrationNote: note || null,
        });
        await this.userRepo.save(user);
        const userAgent = req.headers?.['user-agent'] || '';
        const ipAddress = (0, device_util_1.getIpAddress)(req);
        const deviceSummary = (0, device_util_1.getDeviceSummary)(userAgent);
        await this.auditService.record({
            user,
            action: 'create',
            entity: 'user',
            entityId: String(user.id),
            entityLabel: `${user.name} (${user.email})`,
            summary: `Pendaftaran Google: peran diajukan [${requestedRoles.join(', ')}], konsen perangkat: ya`,
            ipAddress,
            deviceSummary,
        });
        return {
            message: 'Pendaftaran terkirim. Akun menunggu persetujuan admin.',
        };
    }
    async logout(sessionId, user) {
        await this.sessionsService.revokeById(sessionId);
        await this.auditService.record({
            user,
            action: 'revoke',
            entity: 'session',
            entityId: String(sessionId),
            summary: 'Logout',
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService,
        sessions_service_1.SessionsService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map