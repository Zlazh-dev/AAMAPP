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
exports.KelasController = void 0;
const common_1 = require("@nestjs/common");
const kelas_service_1 = require("./kelas.service");
const create_kelas_dto_1 = require("./dto/create-kelas.dto");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
let KelasController = class KelasController {
    constructor(svc) {
        this.svc = svc;
    }
    list(q) {
        return this.svc.list(q);
    }
    one(id) {
        return this.svc.findOne(id);
    }
    create(body, req) {
        return this.svc.create(body, req);
    }
    update(id, body, req) {
        return this.svc.update(id, body, req);
    }
    setWali(id, body, req) {
        return this.svc.setWali(id, body, req);
    }
    remove(id, req) {
        return this.svc.remove(id, req);
    }
};
exports.KelasController = KelasController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum', 'kesiswaan', 'kepsek', 'guru'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KelasController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum', 'kesiswaan', 'kepsek', 'guru'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], KelasController.prototype, "one", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_kelas_dto_1.CreateKelasDto, Object]),
    __metadata("design:returntype", void 0)
], KelasController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_kelas_dto_1.UpdateKelasDto, Object]),
    __metadata("design:returntype", void 0)
], KelasController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/wali'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_kelas_dto_1.SetWaliDto, Object]),
    __metadata("design:returntype", void 0)
], KelasController.prototype, "setWali", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], KelasController.prototype, "remove", null);
exports.KelasController = KelasController = __decorate([
    (0, common_1.Controller)('api/admin/kelas'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [kelas_service_1.KelasService])
], KelasController);
//# sourceMappingURL=kelas.controller.js.map