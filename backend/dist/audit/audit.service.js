"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const activity_log_entity_1 = require("./activity-log.entity");
let AuditService = class AuditService {
    constructor(logRepo) {
        this.logRepo = logRepo;
    }
    async record(input) {
        const log = new activity_log_entity_1.ActivityLog();
        log.userId = input.user?.id ?? input.userId ?? null;
        log.userName = input.user?.name ?? null;
        log.userEmail = input.user?.email ?? null;
        log.action = input.action;
        log.entity = input.entity;
        log.entityId = input.entityId != null ? String(input.entityId) : null;
        log.entityLabel = input.entityLabel ?? null;
        log.summary = input.summary ?? null;
        log.ipAddress = input.ipAddress ?? null;
        log.deviceSummary = input.deviceSummary ?? null;
        await this.logRepo.save(log);
    }
    async log(input) {
        let summary = null;
        if (input.summary != null && input.summary !== '') {
            summary = input.summary;
        }
        else if (input.details != null) {
            summary =
                typeof input.details === 'string'
                    ? input.details
                    : JSON.stringify(input.details);
        }
        await this.record({
            userId: input.actorId ?? null,
            action: input.action,
            entity: input.resource,
            entityId: input.resourceId != null ? String(input.resourceId) : null,
            ipAddress: input.ip ?? null,
            deviceSummary: input.userAgent ?? null,
            summary,
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(activity_log_entity_1.ActivityLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditService);
//# sourceMappingURL=audit.service.js.map