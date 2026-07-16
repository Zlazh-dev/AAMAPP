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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const sessions_service_1 = require("../sessions/sessions.service");
const audit_service_1 = require("../audit/audit.service");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const current_user_decorator_1 = require("../common/current-user.decorator");
const user_entity_1 = require("./user.entity");
const session_entity_1 = require("../sessions/session.entity");
const class_validator_1 = require("class-validator");
class CreateUserDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CreateUserDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateUserDto.prototype, "roles", void 0);
class UpdateUserDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateUserDto.prototype, "roles", void 0);
class ApproveUserDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ApproveUserDto.prototype, "roles", void 0);
let UsersController = class UsersController {
    constructor(usersService, sessionsService, auditService) {
        this.usersService = usersService;
        this.sessionsService = sessionsService;
        this.auditService = auditService;
    }
    async findAll() {
        const users = await this.usersService.findAll();
        return users.map((u) => this.usersService.toAdminUser(u));
    }
    async findPending() {
        const users = await this.usersService.findPending();
        return users.map((u) => this.usersService.toAdminUser(u));
    }
    async countPending() {
        const count = await this.usersService.countPending();
        return { count };
    }
    async create(dto, currentUser, session) {
        const user = await this.usersService.create(dto);
        await this.auditService.record({
            user: currentUser,
            action: 'create',
            entity: 'user',
            entityId: String(user.id),
            entityLabel: `${user.name} (${user.email})`,
            summary: `Membuat akun ${user.name} dengan peran [${user.roles.join(', ')}]`,
            ipAddress: session.ipAddress,
            deviceSummary: session.deviceSummary,
        });
        return this.usersService.toAdminUser(user);
    }
    async findOne(id) {
        const user = await this.usersService.findById(parseInt(id, 10));
        if (!user)
            throw new common_1.BadRequestException('Akun tidak ditemukan');
        const sessions = await this.sessionsService.listActiveByUser(user.id);
        return {
            ...this.usersService.toAdminUser(user),
            sessions: sessions.map((s) => ({
                id: s.id,
                deviceSummary: s.deviceSummary,
                ipAddress: s.ipAddress,
                loginMethod: s.loginMethod,
                createdAt: s.createdAt,
                lastActiveAt: s.lastActiveAt,
            })),
        };
    }
    async update(id, dto, currentUser, session) {
        const user = await this.usersService.update(parseInt(id, 10), dto, currentUser.id);
        await this.auditService.record({
            user: currentUser,
            action: 'update',
            entity: 'user',
            entityId: String(user.id),
            entityLabel: `${user.name} (${user.email})`,
            summary: `Mengubah akun ${user.name}`,
            ipAddress: session.ipAddress,
            deviceSummary: session.deviceSummary,
        });
        return this.usersService.toAdminUser(user);
    }
    async approve(id, dto, currentUser, session) {
        const user = await this.usersService.approve(parseInt(id, 10), dto.roles);
        await this.auditService.record({
            user: currentUser,
            action: 'approve',
            entity: 'user',
            entityId: String(user.id),
            entityLabel: `${user.name} (${user.email})`,
            summary: `Menyetujui pendaftar ${user.name} dengan peran [${user.roles.join(', ')}]`,
            ipAddress: session.ipAddress,
            deviceSummary: session.deviceSummary,
        });
        return this.usersService.toAdminUser(user);
    }
    async delete(id, currentUser, session) {
        const target = await this.usersService.findById(parseInt(id, 10));
        const label = target ? `${target.name} (${target.email})` : `ID ${id}`;
        await this.usersService.delete(parseInt(id, 10), currentUser.id);
        if (target) {
            await this.sessionsService.revokeAllByUser(target.id);
        }
        await this.auditService.record({
            user: currentUser,
            action: 'delete',
            entity: 'user',
            entityId: id,
            entityLabel: label,
            summary: `Menghapus akun ${label}`,
            ipAddress: session.ipAddress,
            deviceSummary: session.deviceSummary,
        });
        return { message: 'Akun berhasil dihapus' };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findPending", null);
__decorate([
    (0, common_1.Get)('pending/count'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "countPending", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, current_user_decorator_1.CurrentSession)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateUserDto,
        user_entity_1.User,
        session_entity_1.Session]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, current_user_decorator_1.CurrentSession)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateUserDto,
        user_entity_1.User,
        session_entity_1.Session]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, current_user_decorator_1.CurrentSession)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ApproveUserDto,
        user_entity_1.User,
        session_entity_1.Session]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "approve", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, current_user_decorator_1.CurrentSession)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User,
        session_entity_1.Session]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "delete", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('api/admin/users'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        sessions_service_1.SessionsService,
        audit_service_1.AuditService])
], UsersController);
//# sourceMappingURL=users.controller.js.map