import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { Request } from 'express';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AuditService } from '../audit/audit.service';

const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT ||
  join(process.cwd(), 'uploads');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB (spec §14.10.4)

@Controller('api/admin/uploads')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'kurikulum')
export class UploadsController {
  constructor(private readonly audit: AuditService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!existsSync(UPLOAD_ROOT)) {
            mkdirSync(UPLOAD_ROOT, { recursive: true });
          }
          cb(null, UPLOAD_ROOT);
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
          const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
            ? ext
            : '.jpg';
          const stamp = Date.now();
          const rnd = randomBytes(8).toString('hex');
          cb(null, `${stamp}-${rnd}${safeExt}`);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Format file harus JPG, JPEG, PNG, atau WEBP',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('File wajib diisi');
    }

    const publicUrl = `/uploads/${file.filename}`;
    const userId = req.session?.userId ?? null;

    await this.audit.log({
      actorId: userId,
      action: 'UPLOAD_FOTO',
      resource: 'uploads',
      resourceId: file.filename,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string,
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
}
