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
var SeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const user_entity_1 = require("../users/user.entity");
const session_entity_1 = require("../sessions/session.entity");
const activity_log_entity_1 = require("../audit/activity-log.entity");
const sessions_service_1 = require("../sessions/sessions.service");
const pengaturan_service_1 = require("../pengaturan/pengaturan.service");
let SeedService = SeedService_1 = class SeedService {
    constructor(userRepo, sessionRepo, logRepo, sessionsService, pengaturanService) {
        this.userRepo = userRepo;
        this.sessionRepo = sessionRepo;
        this.logRepo = logRepo;
        this.sessionsService = sessionsService;
        this.pengaturanService = pengaturanService;
        this.logger = new common_1.Logger(SeedService_1.name);
    }
    async onModuleInit() {
        await this.seedAdmin();
        await this.pengaturanService.seedDefaults();
        await this.housekeeping();
    }
    async seedAdmin() {
        const count = await this.userRepo.count();
        if (count > 0) {
            this.logger.log('Tabel users tidak kosong — seed admin dilewati');
            return;
        }
        const name = process.env.ADMIN_NAME || 'Administrator';
        const email = (process.env.ADMIN_EMAIL || 'admin@aamapp.sch.id').toLowerCase();
        const password = process.env.ADMIN_PASSWORD || 'admin12345';
        const passwordHash = await bcrypt.hash(password, 10);
        const admin = this.userRepo.create({
            name,
            email,
            passwordHash,
            googleSub: null,
            status: 'active',
            roles: ['admin'],
            requestedRoles: [],
            registrationNote: null,
        });
        await this.userRepo.save(admin);
        this.logger.log(`Admin seed dibuat: ${email} (ganti password setelah login!)`);
        const log = new activity_log_entity_1.ActivityLog();
        log.userId = admin.id;
        log.userName = admin.name;
        log.userEmail = admin.email;
        log.action = 'create';
        log.entity = 'user';
        log.entityId = String(admin.id);
        log.entityLabel = `${admin.name} (${admin.email})`;
        log.summary = 'Admin seed otomatis';
        log.ipAddress = 'system';
        log.deviceSummary = 'System';
        await this.logRepo.save(log);
    }
    async housekeeping() {
        try {
            await this.sessionsService.housekeeping();
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 365);
            await this.logRepo
                .createQueryBuilder()
                .delete()
                .where('"createdAt" < :cutoff', { cutoff })
                .execute();
            this.logger.log('Housekeeping selesai (sesi > 30 hari, log > 365 hari)');
        }
        catch (err) {
            this.logger.warn(`Housekeeping error: ${err}`);
        }
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(2, (0, typeorm_1.InjectRepository)(activity_log_entity_1.ActivityLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        sessions_service_1.SessionsService,
        pengaturan_service_1.PengaturanService])
], SeedService);
//# sourceMappingURL=seed.service.js.map