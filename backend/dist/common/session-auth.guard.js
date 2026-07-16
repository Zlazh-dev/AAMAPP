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
exports.SessionAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const session_entity_1 = require("../sessions/session.entity");
const user_entity_1 = require("../users/user.entity");
let SessionAuthGuard = class SessionAuthGuard {
    constructor(sessionRepo, userRepo) {
        this.sessionRepo = sessionRepo;
        this.userRepo = userRepo;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Anda belum masuk. Silakan login.');
        }
        const token = authHeader.substring(7);
        if (!token || token.length < 10) {
            throw new common_1.UnauthorizedException('Token tidak valid.');
        }
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const session = await this.sessionRepo.findOne({
            where: { tokenHash },
            relations: ['user'],
        });
        if (!session) {
            throw new common_1.UnauthorizedException('Sesi tidak ditemukan. Silakan login kembali.');
        }
        if (session.revokedAt) {
            throw new common_1.UnauthorizedException('Sesi telah dicabut. Silakan login kembali.');
        }
        const now = new Date();
        if (session.expiresAt && now > session.expiresAt) {
            throw new common_1.UnauthorizedException({
                message: 'Sesi telah berakhir. Silakan login kembali.',
            });
        }
        const idleMinutes = parseInt(process.env.SESSION_IDLE_MINUTES || '60', 10);
        const idleMs = idleMinutes * 60 * 1000;
        const idleSinceLastActive = now.getTime() - new Date(session.lastActiveAt).getTime();
        if (idleSinceLastActive > idleMs) {
            session.revokedAt = now;
            await this.sessionRepo.save(session);
            throw new common_1.UnauthorizedException({
                code: 'SESSION_IDLE',
                message: 'Sesi berakhir karena tidak aktif. Silakan masuk kembali.',
            });
        }
        const secondsSinceLastUpdate = (now.getTime() - new Date(session.lastActiveAt).getTime()) / 1000;
        if (secondsSinceLastUpdate > 60) {
            session.lastActiveAt = now;
            await this.sessionRepo.save(session);
        }
        request.user = session.user;
        request.session = session;
        request.sessionToken = token;
        return true;
    }
};
exports.SessionAuthGuard = SessionAuthGuard;
exports.SessionAuthGuard = SessionAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SessionAuthGuard);
//# sourceMappingURL=session-auth.guard.js.map