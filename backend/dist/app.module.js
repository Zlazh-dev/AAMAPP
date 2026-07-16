"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const user_entity_1 = require("./users/user.entity");
const session_entity_1 = require("./sessions/session.entity");
const activity_log_entity_1 = require("./audit/activity-log.entity");
const guru_entity_1 = require("./guru/guru.entity");
const kelas_entity_1 = require("./kelas/kelas.entity");
const siswa_entity_1 = require("./siswa/siswa.entity");
const tahun_ajaran_entity_1 = require("./tahun-ajaran/tahun-ajaran.entity");
const pengaturan_entity_1 = require("./pengaturan/pengaturan.entity");
const mapel_entity_1 = require("./kurikulum/mapel.entity");
const penugasan_entity_1 = require("./kurikulum/penugasan.entity");
const jadwal_kbm_entity_1 = require("./kurikulum/jadwal-kbm.entity");
const kalender_libur_entity_1 = require("./kurikulum/kalender-libur.entity");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const sessions_module_1 = require("./sessions/sessions.module");
const audit_module_1 = require("./audit/audit.module");
const profile_module_1 = require("./profile/profile.module");
const seed_module_1 = require("./seed/seed.module");
const guru_module_1 = require("./guru/guru.module");
const kelas_module_1 = require("./kelas/kelas.module");
const siswa_module_1 = require("./siswa/siswa.module");
const tahun_ajaran_module_1 = require("./tahun-ajaran/tahun-ajaran.module");
const pengaturan_module_1 = require("./pengaturan/pengaturan.module");
const kurikulum_module_1 = require("./kurikulum/kurikulum.module");
const import_module_1 = require("./import/import.module");
const uploads_module_1 = require("./uploads/uploads.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: () => ({
                    type: 'postgres',
                    host: process.env.DB_HOST || 'db',
                    port: parseInt(process.env.DB_PORT || '5432', 10),
                    username: process.env.POSTGRES_USER || 'aamapp',
                    password: process.env.POSTGRES_PASSWORD || 'aamapp_dev_change_me',
                    database: process.env.POSTGRES_DB || 'aamapp',
                    entities: [
                        user_entity_1.User,
                        session_entity_1.Session,
                        activity_log_entity_1.ActivityLog,
                        guru_entity_1.Guru,
                        kelas_entity_1.Kelas,
                        siswa_entity_1.Siswa,
                        tahun_ajaran_entity_1.TahunAjaran,
                        pengaturan_entity_1.Pengaturan,
                        mapel_entity_1.Mapel,
                        penugasan_entity_1.Penugasan,
                        jadwal_kbm_entity_1.JadwalKbm,
                        kalender_libur_entity_1.KalenderLibur,
                    ],
                    synchronize: true,
                    timezone: 'Asia/Jakarta',
                    logging: false,
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, session_entity_1.Session, activity_log_entity_1.ActivityLog]),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            sessions_module_1.SessionsModule,
            audit_module_1.AuditModule,
            profile_module_1.ProfileModule,
            seed_module_1.SeedModule,
            guru_module_1.GuruModule,
            kelas_module_1.KelasModule,
            siswa_module_1.SiswaModule,
            tahun_ajaran_module_1.TahunAjaranModule,
            pengaturan_module_1.PengaturanModule,
            kurikulum_module_1.KurikulumModule,
            import_module_1.ImportModule,
            uploads_module_1.UploadsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map