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
exports.KurikulumController = void 0;
const common_1 = require("@nestjs/common");
const kurikulum_service_1 = require("./kurikulum.service");
const create_mapel_dto_1 = require("./dto/create-mapel.dto");
const update_mapel_dto_1 = require("./dto/update-mapel.dto");
const create_penugasan_dto_1 = require("./dto/create-penugasan.dto");
const update_penugasan_dto_1 = require("./dto/update-penugasan.dto");
const create_jadwal_dto_1 = require("./dto/create-jadwal.dto");
const update_jadwal_dto_1 = require("./dto/update-jadwal.dto");
const update_kkm_dto_1 = require("./dto/update-kkm.dto");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
let KurikulumController = class KurikulumController {
    constructor(svc) {
        this.svc = svc;
    }
    listMapel(q) {
        return this.svc.listMapel(q);
    }
    oneMapel(id) {
        return this.svc.findOneMapel(id);
    }
    createMapel(body, req) {
        return this.svc.createMapel(body, req);
    }
    updateMapel(id, body, req) {
        return this.svc.updateMapel(id, body, req);
    }
    removeMapel(id, req) {
        return this.svc.removeMapel(id, req);
    }
    listPenugasan(taId, guruId, kelasId, mapelId) {
        return this.svc.listPenugasan({
            taId: taId ? parseInt(taId, 10) : undefined,
            guruId: guruId ? parseInt(guruId, 10) : undefined,
            kelasId: kelasId ? parseInt(kelasId, 10) : undefined,
            mapelId: mapelId ? parseInt(mapelId, 10) : undefined,
        });
    }
    createPenugasan(body, req) {
        return this.svc.createPenugasan(body, req);
    }
    updatePenugasan(id, body, req) {
        return this.svc.updatePenugasan(id, body, req);
    }
    removePenugasan(id, req) {
        return this.svc.removePenugasan(id, req);
    }
    listJadwal(taId, kelasId, guruId) {
        return this.svc.listJadwal({
            taId: taId ? parseInt(taId, 10) : undefined,
            kelasId: kelasId ? parseInt(kelasId, 10) : undefined,
            guruId: guruId ? parseInt(guruId, 10) : undefined,
        });
    }
    createJadwal(body, req) {
        return this.svc.createJadwal(body, req);
    }
    updateJadwal(id, body, req) {
        return this.svc.updateJadwal(id, body, req);
    }
    removeJadwal(id, req) {
        return this.svc.removeJadwal(id, req);
    }
    getKkm() {
        return this.svc.getKkm();
    }
    updateKkm(body, req) {
        return this.svc.updateKkm(body, req);
    }
};
exports.KurikulumController = KurikulumController;
__decorate([
    (0, common_1.Get)('mapel'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum', 'kepsek', 'guru'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "listMapel", null);
__decorate([
    (0, common_1.Get)('mapel/:id'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum', 'kepsek', 'guru'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "oneMapel", null);
__decorate([
    (0, common_1.Post)('mapel'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mapel_dto_1.CreateMapelDto, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "createMapel", null);
__decorate([
    (0, common_1.Patch)('mapel/:id'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_mapel_dto_1.UpdateMapelDto, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "updateMapel", null);
__decorate([
    (0, common_1.Delete)('mapel/:id'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "removeMapel", null);
__decorate([
    (0, common_1.Get)('penugasan'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum', 'kepsek', 'guru'),
    __param(0, (0, common_1.Query)('taId')),
    __param(1, (0, common_1.Query)('guruId')),
    __param(2, (0, common_1.Query)('kelasId')),
    __param(3, (0, common_1.Query)('mapelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "listPenugasan", null);
__decorate([
    (0, common_1.Post)('penugasan'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_penugasan_dto_1.CreatePenugasanDto, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "createPenugasan", null);
__decorate([
    (0, common_1.Patch)('penugasan/:id'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_penugasan_dto_1.UpdatePenugasanDto, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "updatePenugasan", null);
__decorate([
    (0, common_1.Delete)('penugasan/:id'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "removePenugasan", null);
__decorate([
    (0, common_1.Get)('jadwal'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum', 'kepsek', 'guru'),
    __param(0, (0, common_1.Query)('taId')),
    __param(1, (0, common_1.Query)('kelasId')),
    __param(2, (0, common_1.Query)('guruId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "listJadwal", null);
__decorate([
    (0, common_1.Post)('jadwal'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_jadwal_dto_1.CreateJadwalDto, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "createJadwal", null);
__decorate([
    (0, common_1.Patch)('jadwal/:id'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_jadwal_dto_1.UpdateJadwalDto, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "updateJadwal", null);
__decorate([
    (0, common_1.Delete)('jadwal/:id'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "removeJadwal", null);
__decorate([
    (0, common_1.Get)('pengaturan/kkm'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum', 'kepsek', 'guru'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "getKkm", null);
__decorate([
    (0, common_1.Patch)('pengaturan/kkm'),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_kkm_dto_1.UpdateKkmDto, Object]),
    __metadata("design:returntype", void 0)
], KurikulumController.prototype, "updateKkm", null);
exports.KurikulumController = KurikulumController = __decorate([
    (0, common_1.Controller)('api/kurikulum'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [kurikulum_service_1.KurikulumService])
], KurikulumController);
//# sourceMappingURL=kurikulum.controller.js.map