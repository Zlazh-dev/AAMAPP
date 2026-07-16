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
exports.LiburAdminController = void 0;
const common_1 = require("@nestjs/common");
const kurikulum_service_1 = require("../kurikulum/kurikulum.service");
const create_libur_dto_1 = require("../kurikulum/dto/create-libur.dto");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
let LiburAdminController = class LiburAdminController {
    constructor(kurikulum) {
        this.kurikulum = kurikulum;
    }
    list() {
        return this.kurikulum.listLibur();
    }
    create(body, req) {
        return this.kurikulum.createLibur(body, req);
    }
    remove(id, req) {
        return this.kurikulum.removeLibur(id, req);
    }
};
exports.LiburAdminController = LiburAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'kepsek', 'kurikulum', 'kesiswaan', 'tu', 'guru'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LiburAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_libur_dto_1.CreateLiburDto, Object]),
    __metadata("design:returntype", void 0)
], LiburAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], LiburAdminController.prototype, "remove", null);
exports.LiburAdminController = LiburAdminController = __decorate([
    (0, common_1.Controller)('api/admin/libur'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [kurikulum_service_1.KurikulumService])
], LiburAdminController);
//# sourceMappingURL=libur.controller.js.map