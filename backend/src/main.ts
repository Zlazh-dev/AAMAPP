import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Body limit 6MB untuk JSON (cukup untuk kebutuhan payload data induk),
  // upload file besar ditangani lewat multipart oleh Multer (batas 2/5MB per endpoint).
  app.use(json({ limit: '6mb' }));
  app.use(urlencoded({ limit: '6mb', extended: true }));

  // === Serve uploaded photos via /uploads/:filename ===
  // Disini kita mount static asset supaya nginx bisa proxy ke backend
  // dengan path /uploads/ -> backend:3000/uploads/. Dengan begitu,
  // foto guru/siswa/kelas yang di-upload lewat POST /api/uploads tetap
  // bisa diakses publik lewat http://host/uploads/xxx.png
  const UPLOAD_DIR =
    process.env.UPLOAD_ROOT || join(process.cwd(), 'uploads');
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads/' });

  app.useGlobalPipes(
    new ValidationPipe({
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
        return new BadRequestException({
          message: 'Data tidak valid',
          errors: messages,
        });
      },
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(3000);
  console.log('[AAMAPP] Backend berjalan di port 3000');
}

bootstrap();
