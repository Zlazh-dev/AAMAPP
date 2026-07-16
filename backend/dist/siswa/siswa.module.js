"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiswaModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const siswa_entity_1 = require("./siswa.entity");
const kelas_entity_1 = require("../kelas/kelas.entity");
const siswa_service_1 = require("./siswa.service");
const siswa_controller_1 = require("./siswa.controller");
const audit_module_1 = require("../audit/audit.module");
const session_entity_1 = require("../sessions/session.entity");
const user_entity_1 = require("../users/user.entity");
let SiswaModule = class SiswaModule {
};
exports.SiswaModule = SiswaModule;
exports.SiswaModule = SiswaModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([siswa_entity_1.Siswa, kelas_entity_1.Kelas, session_entity_1.Session, user_entity_1.User]), audit_module_1.AuditModule],
        controllers: [siswa_controller_1.SiswaController],
        providers: [siswa_service_1.SiswaService],
        exports: [siswa_service_1.SiswaService],
    })
], SiswaModule);
//# sourceMappingURL=siswa.module.js.map