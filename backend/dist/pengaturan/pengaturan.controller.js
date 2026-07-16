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
exports.PengaturanController = exports.PengaturanPublicController = void 0;
const common_1 = require("@nestjs/common");
const pengaturan_service_1 = require("./pengaturan.service");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const VALID_KEYS = [
    'profil_sekolah',
    'jam_presensi',
    'lokasi',
    'kkm',
];
let PengaturanPublicController = class PengaturanPublicController {
    constructor(svc) {
        this.svc = svc;
    }
    list() {
        return this.svc.listAll();
    }
    one(key) {
        return this.svc.getOne(key);
    }
};
exports.PengaturanPublicController = PengaturanPublicController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'kepsek', 'kurikulum', 'kesiswaan', 'tu', 'guru'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PengaturanPublicController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':key'),
    (0, roles_decorator_1.Roles)('admin', 'kepsek', 'kurikulum', 'kesiswaan', 'tu', 'guru'),
    __param(0, (0, common_1.Param)('key', new common_1.ParseEnumPipe(VALID_KEYS))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PengaturanPublicController.prototype, "one", null);
exports.PengaturanPublicController = PengaturanPublicController = __decorate([
    (0, common_1.Controller)('api/pengaturan'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [pengaturan_service_1.PengaturanService])
], PengaturanPublicController);
let PengaturanController = class PengaturanController {
    constructor(svc) {
        this.svc = svc;
    }
    upsert(key, body, req) {
        const incoming = body?.value ?? body;
        return this.svc.upsert(key, incoming, req);
    }
};
exports.PengaturanController = PengaturanController;
__decorate([
    (0, common_1.Patch)(':key'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('key', new common_1.ParseEnumPipe(VALID_KEYS))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], PengaturanController.prototype, "upsert", null);
exports.PengaturanController = PengaturanController = __decorate([
    (0, common_1.Controller)('api/admin/pengaturan'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [pengaturan_service_1.PengaturanService])
], PengaturanController);
//# sourceMappingURL=pengaturan.controller.js.map