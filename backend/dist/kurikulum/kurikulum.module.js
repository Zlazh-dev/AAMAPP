"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KurikulumModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const mapel_entity_1 = require("./mapel.entity");
const penugasan_entity_1 = require("./penugasan.entity");
const jadwal_kbm_entity_1 = require("./jadwal-kbm.entity");
const kalender_libur_entity_1 = require("./kalender-libur.entity");
const kurikulum_service_1 = require("./kurikulum.service");
const kurikulum_controller_1 = require("./kurikulum.controller");
const libur_controller_1 = require("./libur.controller");
const audit_module_1 = require("../audit/audit.module");
const session_entity_1 = require("../sessions/session.entity");
const user_entity_1 = require("../users/user.entity");
const guru_entity_1 = require("../guru/guru.entity");
const kelas_entity_1 = require("../kelas/kelas.entity");
const tahun_ajaran_entity_1 = require("../tahun-ajaran/tahun-ajaran.entity");
const pengaturan_entity_1 = require("../pengaturan/pengaturan.entity");
const tahun_ajaran_module_1 = require("../tahun-ajaran/tahun-ajaran.module");
const pengaturan_module_1 = require("../pengaturan/pengaturan.module");
let KurikulumModule = class KurikulumModule {
};
exports.KurikulumModule = KurikulumModule;
exports.KurikulumModule = KurikulumModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                mapel_entity_1.Mapel,
                penugasan_entity_1.Penugasan,
                jadwal_kbm_entity_1.JadwalKbm,
                kalender_libur_entity_1.KalenderLibur,
                session_entity_1.Session,
                user_entity_1.User,
                guru_entity_1.Guru,
                kelas_entity_1.Kelas,
                tahun_ajaran_entity_1.TahunAjaran,
                pengaturan_entity_1.Pengaturan,
            ]),
            audit_module_1.AuditModule,
            tahun_ajaran_module_1.TahunAjaranModule,
            pengaturan_module_1.PengaturanModule,
        ],
        controllers: [kurikulum_controller_1.KurikulumController, libur_controller_1.LiburAdminController],
        providers: [kurikulum_service_1.KurikulumService],
        exports: [kurikulum_service_1.KurikulumService],
    })
], KurikulumModule);
//# sourceMappingURL=kurikulum.module.js.map