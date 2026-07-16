"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuruModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const guru_entity_1 = require("./guru.entity");
const kelas_entity_1 = require("../kelas/kelas.entity");
const guru_service_1 = require("./guru.service");
const guru_controller_1 = require("./guru.controller");
const audit_module_1 = require("../audit/audit.module");
const session_entity_1 = require("../sessions/session.entity");
const user_entity_1 = require("../users/user.entity");
const kurikulum_module_1 = require("../kurikulum/kurikulum.module");
const tahun_ajaran_module_1 = require("../tahun-ajaran/tahun-ajaran.module");
let GuruModule = class GuruModule {
};
exports.GuruModule = GuruModule;
exports.GuruModule = GuruModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([guru_entity_1.Guru, kelas_entity_1.Kelas, session_entity_1.Session, user_entity_1.User]),
            audit_module_1.AuditModule,
            kurikulum_module_1.KurikulumModule,
            tahun_ajaran_module_1.TahunAjaranModule,
        ],
        controllers: [guru_controller_1.GuruController],
        providers: [guru_service_1.GuruService],
        exports: [guru_service_1.GuruService],
    })
], GuruModule);
//# sourceMappingURL=guru.module.js.map