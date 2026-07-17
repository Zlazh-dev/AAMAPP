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

  // SEC-1 Butir 4: body limit JSON diturunkan 6mb -> 1mb (spec keamanan).
  // Upload file besar (foto/Excel) TIDAK lewat parser ini — ditangani
  // multipart oleh Multer (limit 5mb per endpoint di uploads/import),
  // jadi penurunan ini tidak memengaruhi fitur upload.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

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

  // SEC-1 Butir 1: CORS whitelist via env ALLOWED_ORIGINS (CSV, tanpa
  // spasi), bukan lagi origin: true (yang mengizinkan SEMUA origin).
  // Di luar production, localhost/127.0.0.1 (port apapun) selalu
  // diizinkan agar dev server & e2e Playwright tetap jalan tanpa perlu
  // menyetel env tsb secara eksplisit.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const isProd = process.env.NODE_ENV === 'production';
  const localhostRe = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  app.enableCors({
    origin: (origin, callback) => {
      // Request tanpa Origin header (mis. curl, server-to-server, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!isProd && localhostRe.test(origin)) return callback(null, true);
      callback(new Error('Origin tidak diizinkan oleh kebijakan CORS'), false);
    },
    credentials: true,
  });

  await app.listen(3000);
  console.log('[AAMAPP] Backend berjalan di port 3000');
}

bootstrap();
