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
exports.TahunAjaranController = void 0;
const common_1 = require("@nestjs/common");
const tahun_ajaran_service_1 = require("./tahun-ajaran.service");
const create_tahun_ajaran_dto_1 = require("./dto/create-tahun-ajaran.dto");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
let TahunAjaranController = class TahunAjaranController {
    constructor(svc) {
        this.svc = svc;
    }
    getActive() {
        return this.svc.getActive();
    }
    listTa() {
        return this.svc.listTa();
    }
    oneTa(id) {
        return this.svc.findOneTa(id);
    }
    createTa(body, req) {
        return this.svc.createTa(body, req);
    }
    updateTa(id, body, req) {
        return this.svc.updateTa(id, body, req);
    }
    activateTa(id, req) {
        return this.svc.aktifkan(id, req);
    }
    removeTa(id, req) {
        return this.svc.removeTa(id, req);
    }
};
exports.TahunAjaranController = TahunAjaranController;
__decorate([
    (0, common_1.Get)('active'),
    (0, roles_decorator_1.Roles)('admin', 'guru', 'kepsek', 'kesiswaan', 'kurikulum', 'tu'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TahunAjaranController.prototype, "getActive", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'guru', 'kepsek', 'kesiswaan', 'kurikulum', 'tu'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TahunAjaranController.prototype, "listTa", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('admin', 'guru', 'kepsek', 'kesiswaan', 'kurikulum', 'tu'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], TahunAjaranController.prototype, "oneTa", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tahun_ajaran_dto_1.CreateTahunAjaranDto, Object]),
    __metadata("design:returntype", void 0)
], TahunAjaranController.prototype, "createTa", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_tahun_ajaran_dto_1.UpdateTahunAjaranDto, Object]),
    __metadata("design:returntype", void 0)
], TahunAjaranController.prototype, "updateTa", null);
__decorate([
    (0, common_1.Post)(':id/aktifkan'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], TahunAjaranController.prototype, "activateTa", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], TahunAjaranController.prototype, "removeTa", null);
exports.TahunAjaranController = TahunAjaranController = __decorate([
    (0, common_1.Controller)('api/admin/tahun-ajaran'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [tahun_ajaran_service_1.TahunAjaranService])
], TahunAjaranController);
//# sourceMappingURL=tahun-ajaran.controller.js.map