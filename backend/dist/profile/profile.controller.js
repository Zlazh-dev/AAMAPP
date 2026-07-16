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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const profile_service_1 = require("./profile.service");
const session_auth_guard_1 = require("../common/session-auth.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const user_entity_1 = require("../users/user.entity");
const session_entity_1 = require("../sessions/session.entity");
const class_validator_1 = require("class-validator");
class UpdateProfileDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "name", void 0);
class PasswordDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], PasswordDto.prototype, "newPassword", void 0);
class LinkGoogleDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LinkGoogleDto.prototype, "credential", void 0);
let ProfileController = class ProfileController {
    constructor(profileService) {
        this.profileService = profileService;
    }
    async getProfile(user) {
        return this.profileService.getProfile(user);
    }
    async updateProfile(dto, user) {
        const updated = await this.profileService.updateProfile(user, dto);
        return {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            roles: updated.roles,
            status: updated.status,
            hasPassword: !!updated.passwordHash,
            googleLinked: !!updated.googleSub,
            createdAt: updated.createdAt,
        };
    }
    async changePassword(dto, user, session) {
        await this.profileService.changePassword(user, dto.currentPassword || null, dto.newPassword, session.id);
        return { message: 'Password berhasil diubah. Sesi lain telah dicabut.' };
    }
    async linkGoogle(dto, user) {
        const updated = await this.profileService.linkGoogle(user, dto.credential);
        return {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            roles: updated.roles,
            hasPassword: !!updated.passwordHash,
            googleLinked: !!updated.googleSub,
        };
    }
    async unlinkGoogle(user) {
        const updated = await this.profileService.unlinkGoogle(user);
        return {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            roles: updated.roles,
            hasPassword: !!updated.passwordHash,
            googleLinked: !!updated.googleSub,
        };
    }
    async ownSessions(user, session) {
        const sessions = await this.profileService.getOwnSessions(user.id);
        return sessions.map((s) => ({
            id: s.id,
            deviceSummary: s.deviceSummary,
            ipAddress: s.ipAddress,
            loginMethod: s.loginMethod,
            createdAt: s.createdAt,
            lastActiveAt: s.lastActiveAt,
            current: s.id === session.id,
        }));
    }
    async revokeOwnSession(id, user) {
        await this.profileService.revokeOwnSession(parseInt(id, 10), user.id);
        return { message: 'Sesi berhasil dicabut' };
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdateProfileDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, current_user_decorator_1.CurrentSession)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PasswordDto,
        user_entity_1.User,
        session_entity_1.Session]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('link-google'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LinkGoogleDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "linkGoogle", null);
__decorate([
    (0, common_1.Delete)('link-google'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "unlinkGoogle", null);
__decorate([
    (0, common_1.Get)('sessions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, current_user_decorator_1.CurrentSession)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        session_entity_1.Session]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "ownSessions", null);
__decorate([
    (0, common_1.Delete)('sessions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "revokeOwnSession", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.Controller)('api/profile'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map