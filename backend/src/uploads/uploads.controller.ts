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
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
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

/**
 * SEC-1 Butir 6: validasi magic bytes (file signature), sebagai
 * pelengkap pemeriksaan header MIME yang mudah dipalsukan client.
 * Referensi signature: JPEG (FF D8 FF), PNG (89 50 4E 47 0D 0A 1A 0A),
 * WEBP (RIFF....WEBP, byte 0-3 'RIFF' & byte 8-11 'WEBP').
 */
function hasValidMagicBytes(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return true;
  }
  // WEBP: 'RIFF' .... 'WEBP'
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return true;
  }
  return false;
}

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

    // SEC-1 Butir 6: verifikasi magic bytes dari file yang sudah ditulis
    // Multer ke disk. Bila tidak cocok signature gambar yang diizinkan,
    // hapus file dan tolak — mencegah file berbahaya diunggah dengan
    // MIME/ekstensi gambar yang dipalsukan.
    const savedPath = join(UPLOAD_ROOT, file.filename);
    const headBuf = readFileSync(savedPath).subarray(0, 12);
    if (!hasValidMagicBytes(headBuf)) {
      try {
        unlinkSync(savedPath);
      } catch {
        // abaikan bila gagal hapus, tetap tolak response
      }
      throw new BadRequestException(
        'Isi file tidak cocok dengan format gambar (JPG/PNG/WEBP) yang diizinkan',
      );
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
