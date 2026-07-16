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
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = __importStar(require("crypto"));
const session_entity_1 = require("./session.entity");
const device_util_1 = require("../common/device.util");
let SessionsService = class SessionsService {
    constructor(sessionRepo) {
        this.sessionRepo = sessionRepo;
    }
    async createSession(user, loginMethod, req) {
        const rawToken = crypto.randomBytes(48).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const userAgent = req.headers?.['user-agent'] || '';
        const ipAddress = (0, device_util_1.getIpAddress)(req);
        const deviceSummary = (0, device_util_1.getDeviceSummary)(userAgent);
        const absoluteHours = parseInt(process.env.SESSION_ABSOLUTE_HOURS || '24', 10);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + absoluteHours * 60 * 60 * 1000);
        const session = this.sessionRepo.create({
            userId: user.id,
            tokenHash,
            ipAddress,
            userAgent,
            deviceSummary,
            loginMethod,
            lastActiveAt: now,
            expiresAt,
            revokedAt: null,
        });
        await this.sessionRepo.save(session);
        return { token: rawToken, session };
    }
    async findById(id) {
        return this.sessionRepo.findOne({ where: { id } });
    }
    async revoke(session) {
        session.revokedAt = new Date();
        await this.sessionRepo.save(session);
    }
    async revokeById(id) {
        const session = await this.sessionRepo.findOne({ where: { id } });
        if (!session)
            return false;
        if (session.revokedAt)
            return true;
        session.revokedAt = new Date();
        await this.sessionRepo.save(session);
        return true;
    }
    async revokeAllByUser(userId, exceptSessionId) {
        const qb = this.sessionRepo
            .createQueryBuilder()
            .update()
            .set({ revokedAt: new Date() })
            .where('"userId" = :userId', { userId })
            .andWhere('"revokedAt" IS NULL');
        if (exceptSessionId) {
            qb.andWhere('"id" != :exceptSessionId', { exceptSessionId });
        }
        await qb.execute();
    }
    async listActiveByUser(userId) {
        return this.sessionRepo.find({
            where: { userId, revokedAt: null },
            order: { createdAt: 'DESC' },
        });
    }
    async listAllActive() {
        return this.sessionRepo.find({
            where: { revokedAt: null },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }
    async housekeeping() {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        await this.sessionRepo
            .createQueryBuilder()
            .delete()
            .where('("revokedAt" IS NOT NULL AND "revokedAt" < :cutoff) OR ("expiresAt" < :cutoff)', { cutoff })
            .execute();
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SessionsService);
//# sourceMappingURL=sessions.service.js.map