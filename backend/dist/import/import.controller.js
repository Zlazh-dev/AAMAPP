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
exports.ImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const import_service_1 = require("./import.service");
let ImportController = class ImportController {
    constructor(svc) {
        this.svc = svc;
    }
    async template(jenis, res) {
        const j = this.normalizeJenis(jenis);
        const buf = await this.svc.generateTemplate(j);
        const filename = j === 'guru' ? 'template-guru.xlsx' : 'template-siswa.xlsx';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', String(buf.length));
        res.send(buf);
    }
    async preview(jenis, file) {
        const j = this.normalizeJenis(jenis);
        if (!file)
            throw new common_1.BadRequestException('File wajib diisi');
        return this.svc.preview(j, file.buffer);
    }
    async commit(jenis, file, req) {
        const j = this.normalizeJenis(jenis);
        if (!file)
            throw new common_1.BadRequestException('File wajib diisi');
        return this.svc.commit(j, file.buffer, req);
    }
    normalizeJenis(jenis) {
        const j = String(jenis ?? '')
            .trim()
            .toLowerCase();
        if (j !== 'guru' && j !== 'siswa') {
            throw new common_1.BadRequestException('Parameter jenis wajib bernilai guru atau siswa');
        }
        return j;
    }
};
exports.ImportController = ImportController;
__decorate([
    (0, common_1.Get)('template'),
    __param(0, (0, common_1.Query)('jenis')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "template", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const okMime = file.mimetype ===
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.mimetype === 'application/vnd.ms-excel' ||
                file.mimetype === 'application/octet-stream';
            const okExt = /\.xlsx?$/i.test(file.originalname ?? '');
            if (!okMime && !okExt) {
                return cb(new common_1.BadRequestException('File wajib berformat Excel (.xlsx/.xls)'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.Query)('jenis')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)('commit'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const okMime = file.mimetype ===
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.mimetype === 'application/vnd.ms-excel' ||
                file.mimetype === 'application/octet-stream';
            const okExt = /\.xlsx?$/i.test(file.originalname ?? '');
            if (!okMime && !okExt) {
                return cb(new common_1.BadRequestException('File wajib berformat Excel (.xlsx/.xls)'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.Query)('jenis')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ImportController.prototype, "commit", null);
exports.ImportController = ImportController = __decorate([
    (0, common_1.Controller)('api/admin/import'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [import_service_1.ImportService])
], ImportController);
//# sourceMappingURL=import.controller.js.map