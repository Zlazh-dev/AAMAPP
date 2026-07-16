import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

/**
 * Pola validasi bersama utk fotoUrl (guru & siswa): endpoint upload
 * (uploads.controller.ts) mengembalikan path RELATIF (`/uploads/<filename>`),
 * bukan URL http(s) penuh — jadi terima keduanya: path relatif `/uploads/...`
 * ATAU URL http(s) penuh. Dipakai identik di Create & Update DTO supaya
 * jalur edit tidak lebih longgar daripada jalur create (P1 — 2026-07-16).
 */
export const FOTO_URL_PATTERN = /^(https?:\/\/[^\s]+|\/uploads\/[A-Za-z0-9._-]+)$/;
export const FOTO_URL_MESSAGE =
  'fotoUrl harus path /uploads/... atau URL http/https valid';

export class CreateGuruDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama guru wajib diisi' })
  @MaxLength(255)
  nama: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[0-9A-Za-z\-_.]*$/, {
    message: 'NIP mengandung karakter tidak valid',
  })
  nip?: string;

  @IsIn(['L', 'P'], { message: 'jenisKelamin harus L atau P' })
  jenisKelamin: 'L' | 'P';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telepon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  // @IsOptional() hanya melewati validasi untuk undefined/null, BUKAN '' —
  // GuruFormPage mengirim fotoUrl: '' saat belum ada foto, jadi validasi
  // format harus dilewati eksplisit untuk string kosong.
  @ValidateIf((o) => o.fotoUrl !== undefined && o.fotoUrl !== '')
  @Matches(FOTO_URL_PATTERN, { message: FOTO_URL_MESSAGE })
  fotoUrl?: string;

  @IsOptional()
  @IsIn(['aktif', 'nonaktif'])
  status?: 'aktif' | 'nonaktif';

  @IsOptional()
  @IsInt()
  userId?: number;
}

export class UpdateGuruDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nama?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nip?: string;

  @IsOptional()
  @IsIn(['L', 'P'])
  jenisKelamin?: 'L' | 'P';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telepon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ValidateIf((o) => o.fotoUrl !== undefined && o.fotoUrl !== '')
  @Matches(FOTO_URL_PATTERN, { message: FOTO_URL_MESSAGE })
  fotoUrl?: string;

  @IsOptional()
  @IsIn(['aktif', 'nonaktif'])
  status?: 'aktif' | 'nonaktif';

  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number | null;
}

