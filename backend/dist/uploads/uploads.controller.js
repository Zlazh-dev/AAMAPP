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
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const session_auth_guard_1 = require("../common/session-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const audit_service_1 = require("../audit/audit.service");
const UPLOAD_ROOT = process.env.UPLOAD_ROOT ||
    (0, path_1.join)(process.cwd(), 'uploads');
const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);
const MAX_SIZE = 5 * 1024 * 1024;
let UploadsController = class UploadsController {
    constructor(audit) {
        this.audit = audit;
    }
    async upload(file, req) {
        if (!file) {
            throw new common_1.BadRequestException('File wajib diisi');
        }
        const publicUrl = `/uploads/${file.filename}`;
        const userId = req.session?.userId ?? null;
        await this.audit.log({
            actorId: userId,
            action: 'UPLOAD_FOTO',
            resource: 'uploads',
            resourceId: file.filename,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            summary: `Mengunggah foto ${file.filename}`,
            details: {
                size: file.size,
                mime: file.mimetype,
            },
        });
        return {
            ok: true,
            filename: file.filename,
            url: publicUrl,
            size: file.size,
            mime: file.mimetype,
        };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (req, file, cb) => {
                if (!(0, fs_1.existsSync)(UPLOAD_ROOT)) {
                    (0, fs_1.mkdirSync)(UPLOAD_ROOT, { recursive: true });
                }
                cb(null, UPLOAD_ROOT);
            },
            filename: (req, file, cb) => {
                const ext = (0, path_1.extname)(file.originalname || '').toLowerCase() || '.jpg';
                const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
                    ? ext
                    : '.jpg';
                const stamp = Date.now();
                const rnd = (0, crypto_1.randomBytes)(8).toString('hex');
                cb(null, `${stamp}-${rnd}${safeExt}`);
            },
        }),
        limits: { fileSize: MAX_SIZE },
        fileFilter: (req, file, cb) => {
            if (!ALLOWED_MIME.has(file.mimetype)) {
                return cb(new common_1.BadRequestException('Format file harus JPG, JPEG, PNG, atau WEBP'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "upload", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('api/admin/uploads'),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'kurikulum'),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map