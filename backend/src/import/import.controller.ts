import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { ImportService } from './import.service';
import { KbmImportService } from './kbm-import.service';

/**
 * T11-FIX Ronde 2 / Fase 7 (Butir 11): Import Excel wizard 3-langkah.
 * - GET  /api/admin/import/template?jenis=guru|siswa → file .xlsx
 * - POST /api/admin/import/preview (multipart+jenis) → {valid, errors}
 * - POST /api/admin/import/commit (multipart+jenis) → {tersimpan, dilewati}
 * - POST /api/admin/import/kbm/preview → KbmPreviewResult (multi-tahap)
 * - POST /api/admin/import/kbm/commit?tahap=A|B|C|ALL → Partial<KbmCommitResult>
 *
 * RBAC: admin (mutasi data induk §8.2 + §14.10.2).
 */
@Controller('api/admin/import')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'kurikulum')
export class ImportController {
  constructor(
    private readonly svc: ImportService,
    private readonly kbmSvc: KbmImportService,
  ) {}

  @Get('template')
  async template(
    @Query('jenis') jenis: string,
    @Res() res: Response,
  ) {
    const j = this.normalizeJenis(jenis);
    const buf = await this.svc.generateTemplate(j);
    const filename =
      j === 'guru' ? 'template-guru.xlsx' : 'template-siswa.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', String(buf.length));
    res.send(buf);
  }

  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        // Excel MIME & ekstensi
        const okMime =
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.mimetype === 'application/octet-stream';
        const okExt = /\.xlsx?$/i.test(file.originalname ?? '');
        if (!okMime && !okExt) {
          return cb(
            new BadRequestException(
              'File wajib berformat Excel (.xlsx/.xls)',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async preview(
    @Query('jenis') jenis: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const j = this.normalizeJenis(jenis);
    if (!file) throw new BadRequestException('File wajib diisi');
    return this.svc.preview(j, file.buffer);
  }

  @Post('commit')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const okMime =
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.mimetype === 'application/octet-stream';
        const okExt = /\.xlsx?$/i.test(file.originalname ?? '');
        if (!okMime && !okExt) {
          return cb(
            new BadRequestException(
              'File wajib berformat Excel (.xlsx/.xls)',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async commit(
    @Query('jenis') jenis: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const j = this.normalizeJenis(jenis);
    if (!file) throw new BadRequestException('File wajib diisi');
    return this.svc.commit(j, file.buffer, req);
  }

  private normalizeJenis(jenis: string | undefined): 'guru' | 'siswa' {
    const j = String(jenis ?? '')
      .trim()
      .toLowerCase();
    if (j !== 'guru' && j !== 'siswa') {
      throw new BadRequestException(
        'Parameter jenis wajib bernilai guru atau siswa',
      );
    }
    return j;
  }

  // ─── KBM Import (multi-sheet, multi-tahap) ────────────────────────────

  @Post('kbm/preview')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const okExt = /\.xlsx?$/i.test(file.originalname ?? '');
        if (!okExt) {
          return cb(
            new BadRequestException('File KBM wajib berformat Excel (.xlsx)'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async kbmPreview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File wajib diisi');
    return this.kbmSvc.preview(file.buffer);
  }

  @Post('kbm/commit')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const okExt = /\.xlsx?$/i.test(file.originalname ?? '');
        if (!okExt) {
          return cb(
            new BadRequestException('File KBM wajib berformat Excel (.xlsx)'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async kbmCommit(
    @Query('tahap') tahap: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('File wajib diisi');
    const t = String(tahap ?? 'ALL').trim().toUpperCase();
    if (!['A', 'B', 'C', 'ALL'].includes(t)) {
      throw new BadRequestException('Parameter tahap wajib A, B, C, atau ALL');
    }
    return this.kbmSvc.commit(file.buffer, t as 'A' | 'B' | 'C' | 'ALL', req);
  }
}
