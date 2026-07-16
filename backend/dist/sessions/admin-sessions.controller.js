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
exports.AdminSessionsController = void 0;
const common_1 = require("@nestjs/common");
const sessions_service_1 = require("../sessions/sessions.service");
const audit_service_1 = require("../audit/audit.service");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const user_entity_1 = require("../users/user.entity");
const session_entity_1 = require("../sessions/session.entity");
let AdminSessionsController = class AdminSessionsController {
    constructor(sessionsService, auditService) {
        this.sessionsService = sessionsService;
        this.auditService = auditService;
    }
    async listAll(currentUser, currentSession) {
        const sessions = await this.sessionsService.listAllActive();
        return sessions.map((s) => ({
            id: s.id,
            user: s.user
                ? { id: s.user.id, name: s.user.name, email: s.user.email }
                : null,
            deviceSummary: s.deviceSummary,
            ipAddress: s.ipAddress,
            loginMethod: s.loginMethod,
            createdAt: s.createdAt,
            lastActiveAt: s.lastActiveAt,
            current: s.id === currentSession.id,
        }));
    }
    async revoke(id, currentUser, currentSession) {
        await this.sessionsService.revokeById(parseInt(id, 10));
        await this.auditService.record({
            user: currentUser,
            action: 'revoke',
            entity: 'session',
            entityId: id,
            summary: `Mencabut sesi #${id}`,
            ipAddress: currentSession.ipAddress,
            deviceSummary: currentSession.deviceSummary,
        });
        return { message: 'Sesi berhasil dicabut' };
    }
};
exports.AdminSessionsController = AdminSessionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_user_decorator_1.CurrentSession)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        session_entity_1.Session]),
    __metadata("design:returntype", Promise)
], AdminSessionsController.prototype, "listAll", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, current_user_decorator_1.CurrentSession)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User,
        session_entity_1.Session]),
    __metadata("design:returntype", Promise)
], AdminSessionsController.prototype, "revoke", null);
exports.AdminSessionsController = AdminSessionsController = __decorate([
    (0, common_1.Controller)('api/admin/sessions'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService,
        audit_service_1.AuditService])
], AdminSessionsController);
//# sourceMappingURL=admin-sessions.controller.js.map