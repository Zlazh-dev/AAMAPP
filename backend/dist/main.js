"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const express_1 = require("express");
const path_1 = require("path");
const fs_1 = require("fs");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use((0, express_1.json)({ limit: '6mb' }));
    app.use((0, express_1.urlencoded)({ limit: '6mb', extended: true }));
    const UPLOAD_DIR = process.env.UPLOAD_ROOT || (0, path_1.join)(process.cwd(), 'uploads');
    if (!(0, fs_1.existsSync)(UPLOAD_DIR)) {
        (0, fs_1.mkdirSync)(UPLOAD_DIR, { recursive: true });
    }
    app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads/' });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: (validationErrors) => {
            const messages = validationErrors.map((err) => {
                const constraints = err.constraints
                    ? Object.values(err.constraints).join('; ')
                    : 'Validasi gagal';
                return `${err.property}: ${constraints}`;
            });
            return new common_1.BadRequestException({
                message: 'Data tidak valid',
                errors: messages,
            });
        },
    }));
    app.enableCors({
        origin: true,
        credentials: true,
    });
    await app.listen(3000);
    console.log('[AAMAPP] Backend berjalan di port 3000');
}
bootstrap();
//# sourceMappingURL=main.js.map