"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/user.entity");
const session_entity_1 = require("../sessions/session.entity");
const activity_log_entity_1 = require("../audit/activity-log.entity");
const pengaturan_entity_1 = require("../pengaturan/pengaturan.entity");
const seed_service_1 = require("./seed.service");
const sessions_module_1 = require("../sessions/sessions.module");
const pengaturan_module_1 = require("../pengaturan/pengaturan.module");
let SeedModule = class SeedModule {
};
exports.SeedModule = SeedModule;
exports.SeedModule = SeedModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, session_entity_1.Session, activity_log_entity_1.ActivityLog, pengaturan_entity_1.Pengaturan]),
            sessions_module_1.SessionsModule,
            pengaturan_module_1.PengaturanModule,
        ],
        providers: [seed_service_1.SeedService],
    })
], SeedModule);
//# sourceMappingURL=seed.module.js.map